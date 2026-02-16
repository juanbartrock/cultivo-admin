import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from './storage.service';
import { CreateWaterEventDto, CreateNoteEventDto, CreatePhotoEventDto, CreateEnvironmentEventDto, CreateGenericEventDto } from './dto/event.dto';
import { CycleStatus, EventType, Prisma } from '@prisma/client';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  /**
   * Lista eventos con filtros opcionales
   */
  async findAll(options: {
    plantId?: string;
    cycleId?: string;
    sectionId?: string;
    type?: EventType;
    limit?: number;
  }) {
    const { plantId, cycleId, sectionId, type, limit = 50 } = options;

    return this.prisma.event.findMany({
      where: {
        ...(plantId && { plantId }),
        ...(cycleId && { cycleId }),
        ...(sectionId && { sectionId }),
        ...(type && { type }),
      },
      include: {
        plant: {
          include: {
            strain: true,
          },
        },
        cycle: true,
        section: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Obtiene un evento por ID
   */
  async findById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        plant: {
          include: {
            strain: true,
          },
        },
        cycle: true,
        section: true,
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  /**
   * Registra un evento de riego
   */
  async createWaterEvent(data: CreateWaterEventDto) {
    await this.validateEventTargets(data);

    const eventData: Prisma.InputJsonValue = {
      ph: data.ph,
      ec: data.ec,
      waterTemperature: data.waterTemperature,
      liters: data.liters,
      nutrients: data.nutrients,
      notes: data.notes,
    };

    return this.prisma.event.create({
      data: {
        type: EventType.RIEGO,
        plantId: data.plantId,
        cycleId: data.cycleId,
        sectionId: data.sectionId,
        data: eventData,
      },
      include: {
        plant: true,
        cycle: true,
        section: true,
      },
    });
  }

  /**
   * Registra una nota de texto
   */
  async createNoteEvent(data: CreateNoteEventDto) {
    await this.validateEventTargets(data);

    const eventData: Prisma.InputJsonValue = {
      content: data.content,
      tags: data.tags,
    };

    return this.prisma.event.create({
      data: {
        type: EventType.NOTA,
        plantId: data.plantId,
        cycleId: data.cycleId,
        sectionId: data.sectionId,
        data: eventData,
      },
      include: {
        plant: true,
        cycle: true,
        section: true,
      },
    });
  }

  /**
   * Registra un evento con foto
   */
  async createPhotoEvent(
    data: CreatePhotoEventDto,
    file: Express.Multer.File,
  ) {
    // Validar que el archivo existe y tiene datos
    if (!file || !file.buffer) {
      throw new BadRequestException('No se recibiÃ³ el archivo de imagen');
    }

    await this.validateEventTargets(data);

    // Subir foto a Supabase Storage o guardar como base64
    let photoData: { url: string; path: string };
    let uploadedRemotePath: string | null = null;

    try {
      if (this.storageService.isAvailable()) {
        photoData = await this.storageService.uploadFile(file, 'photos');
        uploadedRemotePath = photoData.path;
      } else {
        // Fallback: guardar como base64 (no recomendado para producciÃ³n)
        // Limitar tamaÃ±o para base64 (mÃ¡ximo 5MB para evitar problemas de DB)
        if (file.size > 5 * 1024 * 1024) {
          throw new BadRequestException(
            'El archivo es demasiado grande para almacenamiento local. Configura Supabase Storage.',
          );
        }
        photoData = {
          url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          path: `local/${Date.now()}-${file.originalname}`,
        };
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Error al procesar la imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
    }

    const eventData: Prisma.InputJsonValue = {
      url: photoData.url,
      path: photoData.path,
      caption: data.caption,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };

    try {
      return await this.prisma.event.create({
        data: {
          type: EventType.FOTO,
          plantId: data.plantId || null,
          cycleId: data.cycleId || null,
          sectionId: data.sectionId || null,
          data: eventData,
        },
        include: {
          plant: true,
          cycle: true,
          section: true,
        },
      });
    } catch (error) {
      if (uploadedRemotePath && this.storageService.isAvailable()) {
        try {
          await this.storageService.deleteFile(uploadedRemotePath);
          this.logger.warn(`Rolled back orphaned uploaded file: ${uploadedRemotePath}`);
        } catch (cleanupError) {
          const cleanupMessage =
            cleanupError instanceof Error ? cleanupError.message : 'Unknown cleanup error';
          this.logger.error(`Failed to rollback uploaded file ${uploadedRemotePath}: ${cleanupMessage}`);
        }
      }
      throw error;
    }
  }

  /**
   * Registra parÃ¡metros ambientales
   */
  async createEnvironmentEvent(data: CreateEnvironmentEventDto) {
    await this.validateEventTargets(data);

    // Calcular VPD si hay temperatura y humedad
    let vpd: number | undefined;
    if (data.temperature !== undefined && data.humidity !== undefined) {
      vpd = this.calculateVPD(data.temperature, data.humidity);
    }

    const eventData: Prisma.InputJsonValue = {
      temperature: data.temperature,
      humidity: data.humidity,
      vpd,
      co2: data.co2,
      lightIntensity: data.lightIntensity,
      notes: data.notes,
    };

    return this.prisma.event.create({
      data: {
        type: EventType.PARAMETRO_AMBIENTAL,
        plantId: data.plantId,
        cycleId: data.cycleId,
        sectionId: data.sectionId,
        data: eventData,
      },
      include: {
        plant: true,
        cycle: true,
        section: true,
      },
    });
  }

  /**
   * Crea un evento genÃ©rico (para tipos como CAMBIO_MACETA, etc.)
   */
  async createGenericEvent(data: CreateGenericEventDto) {
    await this.validateEventTargets(data);

    return this.prisma.event.create({
      data: {
        type: data.type,
        plantId: data.plantId,
        cycleId: data.cycleId,
        sectionId: data.sectionId,
        data: data.data as Prisma.InputJsonValue,
      },
      include: {
        plant: true,
        cycle: true,
        section: true,
      },
    });
  }

  /**
   * Crea un evento genÃ©rico
   */
  async createEvent(type: EventType, data: {
    plantId?: string;
    cycleId?: string;
    sectionId?: string;
    eventData: Prisma.InputJsonValue;
  }) {
    await this.validateEventTargets(data);

    return this.prisma.event.create({
      data: {
        type,
        plantId: data.plantId,
        cycleId: data.cycleId,
        sectionId: data.sectionId,
        data: data.eventData,
      },
      include: {
        plant: true,
        cycle: true,
        section: true,
      },
    });
  }

  /**
   * Elimina un evento
   */
  async deleteEvent(id: string) {
    const event = await this.findById(id);

    // Si es una foto, eliminar del storage
    if (event.type === EventType.FOTO && this.storageService.isAvailable()) {
      const eventData = event.data as { path?: string };
      if (eventData.path && !eventData.path.startsWith('local/')) {
        try {
          await this.storageService.deleteFile(eventData.path);
        } catch {
          // Ignorar errores de eliminaciÃ³n de archivo
        }
      }
    }

    return this.prisma.event.delete({ where: { id } });
  }

  /**
   * Obtiene estadÃ­sticas de eventos
   */
  async getStats(options: {
    cycleId?: string;
    sectionId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { cycleId, sectionId, startDate, endDate } = options;

    const events = await this.prisma.event.groupBy({
      by: ['type'],
      where: {
        ...(cycleId && { cycleId }),
        ...(sectionId && { sectionId }),
        ...(startDate && endDate && {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
      },
      _count: true,
    });

    return events.reduce(
      (acc, event) => {
        acc[event.type] = event._count;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Valida que los targets del evento existan
   */
  private async validateEventTargets(data: {
    plantId?: string;
    cycleId?: string;
    sectionId?: string;
  }) {
    // Al menos un target debe estar definido
    if (!data.plantId && !data.cycleId && !data.sectionId) {
      throw new BadRequestException(
        'At least one of plantId, cycleId, or sectionId must be provided',
      );
    }

    let resolvedCycleId = data.cycleId;

    if (data.plantId) {
      const plant = await this.prisma.plant.findUnique({
        where: { id: data.plantId },
        select: { id: true, cycleId: true },
      });
      if (!plant) {
        throw new NotFoundException(`Plant with ID ${data.plantId} not found`);
      }
      if (!resolvedCycleId) {
        resolvedCycleId = plant.cycleId;
      }
    }

    if (resolvedCycleId) {
      const cycle = await this.prisma.cycle.findUnique({
        where: { id: resolvedCycleId },
        select: { id: true, status: true },
      });
      if (!cycle) {
        throw new NotFoundException(`Cycle with ID ${resolvedCycleId} not found`);
      }
      if (cycle.status === CycleStatus.CURED) {
        throw new BadRequestException(
          'El ciclo estÃ¡ finalizado en curado y no permite nuevos eventos',
        );
      }
    }

    if (data.sectionId) {
      const section = await this.prisma.section.findUnique({
        where: { id: data.sectionId },
      });
      if (!section) {
        throw new NotFoundException(`Section with ID ${data.sectionId} not found`);
      }
    }
  }

  /**
   * Calcula el VPD (Vapor Pressure Deficit)
   */
  private calculateVPD(tempC: number, humidityPercent: number): number {
    // FÃ³rmula de Tetens para presiÃ³n de vapor de saturaciÃ³n
    const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    // PresiÃ³n de vapor actual
    const avp = svp * (humidityPercent / 100);
    // VPD
    return Math.round((svp - avp) * 100) / 100;
  }
}
