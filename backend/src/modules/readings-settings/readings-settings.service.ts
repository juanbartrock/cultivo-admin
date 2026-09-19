import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DeviceType, ReadingsSettings } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateReadingsSettingsDto } from './dto/readings-settings.dto';

/** Id de la fila única: la tabla es un singleton, no una lista de configuraciones. */
export const READINGS_SETTINGS_ID = 'singleton';

/** Lo mínimo que hace falta de un dispositivo para decidir si se lo consulta. */
export interface ReadableDevice {
  type: DeviceType;
  readingsEnabled?: boolean;
}

@Injectable()
export class ReadingsSettingsService implements OnModuleInit {
  private readonly logger = new Logger(ReadingsSettingsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Siembra la fila única al arrancar si falta (base sembrada a mano). La migración ya la crea;
   * esto cubre el caso de una base creada con `db push`. Sin fila el interruptor se lee como
   * encendido, que es el comportamiento histórico.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.prisma.readingsSettings.upsert({
        where: { id: READINGS_SETTINGS_ID },
        update: {},
        create: { id: READINGS_SETTINGS_ID, sensorsEnabled: true },
      });
    } catch (error) {
      // Que la base no responda al arrancar no puede tumbar el proceso.
      this.logger.error(
        `No se pudo sembrar el interruptor de lecturas: ${(error as Error).message}`,
      );
    }
  }

  /**
   * La fila única. Leer no escribe: si la fila falta devuelve el default en memoria, porque la
   * migración y `onModuleInit` ya son los dos lugares que siembran.
   */
  async get(): Promise<ReadingsSettings> {
    const existing = await this.prisma.readingsSettings.findUnique({
      where: { id: READINGS_SETTINGS_ID },
    });
    if (existing) return existing;

    const now = new Date();
    return {
      id: READINGS_SETTINGS_ID,
      sensorsEnabled: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  /** Cambia el interruptor general. Solo admin llega acá (guard del controller). */
  async update(data: UpdateReadingsSettingsDto): Promise<ReadingsSettings> {
    const row = await this.prisma.readingsSettings.upsert({
      where: { id: READINGS_SETTINGS_ID },
      update: { sensorsEnabled: data.sensorsEnabled },
      create: { id: READINGS_SETTINGS_ID, sensorsEnabled: data.sensorsEnabled },
    });

    this.logger.log(
      `Lecturas de sensores: ${row.sensorsEnabled ? 'activadas' : 'desactivadas'}`,
    );

    return row;
  }

  /** Estado del interruptor general. Ante error de base devuelve `true`: sin dato se lee. */
  async sensorsEnabled(): Promise<boolean> {
    try {
      const row = await this.prisma.readingsSettings.findUnique({
        where: { id: READINGS_SETTINGS_ID },
      });
      return row?.sensorsEnabled ?? true;
    } catch (error) {
      this.logger.debug(
        `No se pudo leer el interruptor de lecturas: ${(error as Error).message}`,
      );
      return true;
    }
  }

  /**
   * Semántica efectiva: se consulta al conector solo si el dispositivo tiene las lecturas
   * activas y, cuando es SENSOR, también el interruptor general está encendido.
   */
  isDeviceReadable(device: ReadableDevice, sensorsEnabled: boolean): boolean {
    if (device.readingsEnabled === false) return false;
    if (device.type === DeviceType.SENSOR && !sensorsEnabled) return false;
    return true;
  }
}
