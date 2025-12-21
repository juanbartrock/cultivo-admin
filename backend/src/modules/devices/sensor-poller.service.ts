import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { IoTGatewayService } from './iot-gateway.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { DeviceType } from '@prisma/client';

interface SensorReading {
  temperature?: number;
  humidity?: number;
  co2?: number;
  vpd?: number;
}

interface SensorDevice {
  id: string;
  name: string;
  connector: string;
  externalId: string;
  sectionId: string | null;
}

@Injectable()
export class SensorPollerService {
  private readonly logger = new Logger(SensorPollerService.name);

  // Configuración
  private readonly PERSIST_EVERY_N_READINGS = 10; // Persistir cada 10 lecturas (~5 min con polling cada 30s)
  private readonly CHANGE_THRESHOLD = {
    temp: 0.3,      // °C
    humidity: 1,    // %
    co2: 30,        // ppm
  };

  // Estado en memoria
  private lastEmittedValues = new Map<string, SensorReading>();
  private readingCounters = new Map<string, number>();
  private isPolling = false;

  constructor(
    private prisma: PrismaService,
    private iotGateway: IoTGatewayService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  /**
   * Cron job que se ejecuta cada 30 segundos para leer sensores
   */
  @Cron('*/30 * * * * *')
  async pollSensors() {
    if (this.isPolling) {
      this.logger.debug('Sensor polling already running, skipping...');
      return;
    }

    this.isPolling = true;

    try {
      const sensors = await this.getSensorsToRead();

      if (sensors.length === 0) {
        return;
      }

      this.logger.debug(`Polling ${sensors.length} sensors...`);

      for (const sensor of sensors) {
        await this.processSensor(sensor);
      }
    } catch (error) {
      this.logger.error(`Error in sensor polling cycle: ${error.message}`);
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Obtiene los sensores que deben ser leídos
   */
  private async getSensorsToRead(): Promise<SensorDevice[]> {
    return this.prisma.device.findMany({
      where: {
        type: DeviceType.SENSOR,
        // Solo sensores que tienen sección asignada o recordHistory activo
        OR: [
          { sectionId: { not: null } },
          { recordHistory: true },
        ],
      },
      select: {
        id: true,
        name: true,
        connector: true,
        externalId: true,
        sectionId: true,
      },
    }) as Promise<SensorDevice[]>;
  }

  /**
   * Procesa un sensor individual: lee, emite y persiste según corresponda
   */
  private async processSensor(sensor: SensorDevice) {
    try {
      // Leer el sensor
      const rawReading = await this.readSensor(sensor);
      if (!rawReading) return;

      // Calcular VPD si tenemos temp y humidity
      const reading: SensorReading = {
        ...rawReading,
        vpd: this.calculateVPD(rawReading.temperature, rawReading.humidity),
      };

      // Emitir solo si hay cambio significativo (histeresis)
      if (this.hasSignificantChange(sensor.id, reading)) {
        this.emitReading(sensor, reading);
        this.lastEmittedValues.set(sensor.id, reading);
      }

      // Persistir cada N lecturas
      const count = (this.readingCounters.get(sensor.id) || 0) + 1;
      if (count >= this.PERSIST_EVERY_N_READINGS) {
        await this.persistReading(sensor, reading);
        this.readingCounters.set(sensor.id, 0);
      } else {
        this.readingCounters.set(sensor.id, count);
      }
    } catch (error) {
      this.logger.error(`Error processing sensor ${sensor.name}: ${error.message}`);
    }
  }

  /**
   * Lee el estado actual de un sensor desde el IoT Gateway
   */
  private async readSensor(sensor: SensorDevice): Promise<SensorReading | null> {
    try {
      const status = await this.iotGateway.getDeviceStatus(
        sensor.connector as any,
        sensor.externalId,
      );

      const temperature = this.parseNumber(status.temperature);
      const humidity = this.parseNumber(status.humidity);
      const co2 = this.parseNumber(status.co2);

      // Verificar que al menos un valor es válido
      if (temperature === undefined && humidity === undefined && co2 === undefined) {
        return null;
      }

      return { temperature, humidity, co2 };
    } catch (error) {
      this.logger.debug(`Error reading sensor ${sensor.name}: ${error.message}`);
      return null;
    }
  }

  /**
   * Convierte un valor a número, retorna undefined si no es válido
   */
  private parseNumber(value: unknown): number | undefined {
    if (value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Calcula el VPD (Vapor Pressure Deficit)
   * Fórmula de Tetens para calcular la presión de vapor de saturación
   */
  private calculateVPD(temp?: number, humidity?: number): number | undefined {
    if (temp === undefined || humidity === undefined) return undefined;

    // Presión de vapor de saturación (SVP) usando fórmula de Tetens
    const svp = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
    
    // Presión de vapor actual (AVP)
    const avp = svp * (humidity / 100);
    
    // VPD = SVP - AVP
    const vpd = svp - avp;
    
    // Redondear a 2 decimales
    return Math.round(vpd * 100) / 100;
  }

  /**
   * Verifica si hay un cambio significativo respecto a la última lectura emitida
   * Implementa histeresis para evitar ruido en los dashboards
   */
  private hasSignificantChange(deviceId: string, current: SensorReading): boolean {
    const last = this.lastEmittedValues.get(deviceId);
    
    // Primera lectura siempre se emite
    if (!last) return true;

    // Verificar cada métrica
    const tempDiff = Math.abs((current.temperature ?? 0) - (last.temperature ?? 0));
    const humDiff = Math.abs((current.humidity ?? 0) - (last.humidity ?? 0));
    const co2Diff = Math.abs((current.co2 ?? 0) - (last.co2 ?? 0));

    return (
      tempDiff >= this.CHANGE_THRESHOLD.temp ||
      humDiff >= this.CHANGE_THRESHOLD.humidity ||
      co2Diff >= this.CHANGE_THRESHOLD.co2
    );
  }

  /**
   * Emite la lectura a través del gateway de realtime
   */
  private emitReading(sensor: SensorDevice, reading: SensorReading) {
    this.realtimeGateway.emitSensorUpdate(sensor.id, sensor.sectionId, {
      ...reading,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(
      `Emitted reading for ${sensor.name}: temp=${reading.temperature}°C, ` +
      `humidity=${reading.humidity}%, co2=${reading.co2}ppm, vpd=${reading.vpd}kPa`,
    );
  }

  /**
   * Persiste la lectura en la base de datos
   */
  private async persistReading(sensor: SensorDevice, reading: SensorReading) {
    try {
      await this.prisma.sensorReading.create({
        data: {
          device: { connect: { id: sensor.id } },
          sectionId: sensor.sectionId,
          temperature: reading.temperature,
          humidity: reading.humidity,
          co2: reading.co2,
          vpd: reading.vpd,
        },
      });

      this.logger.log(
        `Persisted reading for ${sensor.name}: temp=${reading.temperature}°C, ` +
        `humidity=${reading.humidity}%, vpd=${reading.vpd}kPa`,
      );
    } catch (error) {
      this.logger.error(`Error persisting reading for ${sensor.name}: ${error.message}`);
    }
  }

  /**
   * Fuerza una lectura inmediata de todos los sensores (útil para testing/debug)
   */
  async forceReadAll(): Promise<Map<string, SensorReading>> {
    const sensors = await this.getSensorsToRead();
    const results = new Map<string, SensorReading>();

    for (const sensor of sensors) {
      const reading = await this.readSensor(sensor);
      if (reading) {
        reading.vpd = this.calculateVPD(reading.temperature, reading.humidity);
        results.set(sensor.id, reading);
      }
    }

    return results;
  }

  /**
   * Obtiene el estado del servicio
   */
  getStatus() {
    return {
      isPolling: this.isPolling,
      trackedSensors: this.lastEmittedValues.size,
      persistCounters: Object.fromEntries(this.readingCounters),
      thresholds: this.CHANGE_THRESHOLD,
      persistEveryN: this.PERSIST_EVERY_N_READINGS,
    };
  }
}




