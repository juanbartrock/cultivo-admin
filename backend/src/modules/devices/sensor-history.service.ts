import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { IoTGatewayService } from './iot-gateway.service';
import { DeviceType } from '@prisma/client';

@Injectable()
export class SensorHistoryService {
  private readonly logger = new Logger(SensorHistoryService.name);
  private isRecording = false;

  constructor(
    private prisma: PrismaService,
    private iotGateway: IoTGatewayService,
  ) {}

  /**
   * Cron job que se ejecuta cada 15 minutos para registrar lecturas de sensores
   */
  @Cron('*/15 * * * *') // Cada 15 minutos
  async recordSensorReadings() {
    if (this.isRecording) {
      this.logger.debug('Sensor recording already running, skipping...');
      return;
    }

    this.isRecording = true;
    this.logger.log('🔄 Starting sensor recording cycle...');

    try {
      // Obtener dispositivos con recordHistory = true (incluir sectionId)
      const devices = await this.prisma.device.findMany({
        where: {
          recordHistory: true,
          type: DeviceType.SENSOR, // Solo sensores
        },
        select: {
          id: true,
          name: true,
          connector: true,
          externalId: true,
          sectionId: true, // Incluir para guardar en las lecturas
        },
      });

      this.logger.log(`📊 Found ${devices.length} devices with recordHistory=true`);

      if (devices.length === 0) {
        // Log para ayudar a diagnosticar - listar todos los sensores
        const allSensors = await this.prisma.device.findMany({
          where: { type: DeviceType.SENSOR },
          select: { id: true, name: true, connector: true, recordHistory: true },
        });
        this.logger.warn(`⚠️ No devices with recordHistory=true. Total sensors: ${allSensors.length}`);
        allSensors.forEach(s => {
          this.logger.debug(`  - ${s.name} (${s.connector}): recordHistory=${s.recordHistory}`);
        });
      }

      for (const device of devices) {
        try {
          this.logger.debug(`📡 Getting status for ${device.name} (${device.connector}/${device.externalId})`);
          
          // Obtener estado actual del dispositivo
          const status = await this.iotGateway.getDeviceStatus(
            device.connector,
            device.externalId,
          );

          this.logger.debug(`📡 Raw status for ${device.name}: ${JSON.stringify(status)}`);

          // Extraer temperatura y humedad - convertir null a undefined
          const temperature = status.temperature !== null && status.temperature !== undefined 
            ? Number(status.temperature) 
            : undefined;
          const humidity = status.humidity !== null && status.humidity !== undefined 
            ? Number(status.humidity) 
            : undefined;
          const co2 = status.co2 !== null && status.co2 !== undefined 
            ? Number(status.co2) 
            : undefined;

          // Validar que los números sean válidos
          const validTemp = temperature !== undefined && !isNaN(temperature) ? temperature : undefined;
          const validHumidity = humidity !== undefined && !isNaN(humidity) ? humidity : undefined;
          const validCo2 = co2 !== undefined && !isNaN(co2) ? co2 : undefined;

          // Solo registrar si hay al menos un valor válido
          if (validTemp !== undefined || validHumidity !== undefined || validCo2 !== undefined) {
            await this.prisma.sensorReading.create({
              data: {
                device: { connect: { id: device.id } },
                sectionId: device.sectionId, // Guardar la sección actual para mantener historial
                temperature: validTemp,
                humidity: validHumidity,
                co2: validCo2,
              },
            });

            this.logger.log(
              `✅ Recorded reading for ${device.name}: temp=${validTemp}°C, humidity=${validHumidity}%, co2=${validCo2}ppm (section: ${device.sectionId || 'none'})`,
            );
          } else {
            this.logger.warn(
              `⚠️ No valid sensor data for ${device.name}: temp=${temperature}, humidity=${humidity}, co2=${co2}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `❌ Error recording sensor ${device.name} (${device.id}): ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error in sensor recording cycle: ${error.message}`);
    } finally {
      this.isRecording = false;
      this.logger.log('🔄 Sensor recording cycle completed');
    }
  }

  /**
   * Obtiene el historial de un dispositivo por horas
   */
  async getHistory(deviceId: string, hours = 6) {
    const fromDate = new Date();
    fromDate.setHours(fromDate.getHours() - hours);

    return this.prisma.sensorReading.findMany({
      where: {
        deviceId,
        recordedAt: { gte: fromDate },
      },
      orderBy: { recordedAt: 'asc' },
    });
  }

  /**
   * Obtiene el historial de un dispositivo por rango de fechas
   */
  async getHistoryByRange(deviceId: string, from: Date, to: Date) {
    return this.prisma.sensorReading.findMany({
      where: {
        deviceId,
        recordedAt: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { recordedAt: 'asc' },
    });
  }

  /**
   * Obtiene el historial de una sección por horas
   * Útil para ver el historial completo de una sección aunque los dispositivos hayan cambiado
   */
  async getHistoryBySection(sectionId: string, hours = 6) {
    const fromDate = new Date();
    fromDate.setHours(fromDate.getHours() - hours);

    return this.prisma.sensorReading.findMany({
      where: {
        sectionId,
        recordedAt: { gte: fromDate },
      },
      include: {
        device: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { recordedAt: 'asc' },
    });
  }

  /**
   * Obtiene las últimas lecturas de un dispositivo
   */
  async getLatestReadings(deviceId: string, limit = 10) {
    return this.prisma.sensorReading.findMany({
      where: { deviceId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Obtiene estadísticas del historial
   */
  async getStats(deviceId: string, hours = 24) {
    const fromDate = new Date();
    fromDate.setHours(fromDate.getHours() - hours);

    const readings = await this.prisma.sensorReading.findMany({
      where: {
        deviceId,
        recordedAt: { gte: fromDate },
      },
    });

    if (readings.length === 0) {
      return {
        period: `${hours} hours`,
        count: 0,
        temperature: null,
        humidity: null,
        co2: null,
      };
    }

    // Calcular estadísticas de temperatura
    const temps = readings.filter(r => r.temperature !== null).map(r => r.temperature!);
    const humidities = readings.filter(r => r.humidity !== null).map(r => r.humidity!);
    const co2Values = readings.filter(r => r.co2 !== null).map(r => r.co2!);

    const calcStats = (values: number[]) => {
      if (values.length === 0) return null;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      return {
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        avg: Math.round(avg * 100) / 100,
        current: values[values.length - 1],
      };
    };

    return {
      period: `${hours} hours`,
      count: readings.length,
      temperature: calcStats(temps),
      humidity: calcStats(humidities),
      co2: calcStats(co2Values),
    };
  }

  /**
   * Limpia lecturas antiguas
   */
  async cleanup(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.sensorReading.deleteMany({
      where: {
        recordedAt: { lt: cutoffDate },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old sensor readings`);
    return result;
  }

  /**
   * Obtiene el estado del servicio
   */
  getStatus() {
    return {
      isRecording: this.isRecording,
      lastCheck: new Date(),
    };
  }
}



