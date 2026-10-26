import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { CreateSectionDto, UpdateSectionDto } from './dto/section.dto';
import { UpdateSectionLayoutDto, DEFAULT_LAYOUT_CONFIG } from './dto/layout.dto';
import { CreatePPFDReadingDto } from './dto/ppfd.dto';
import { effectiveStage } from '../stage-ranges/effective-stage';
import { Prisma } from '@prisma/client';

// El sensor principal va primero: home, /sala, la carpa y la vista 3D toman el primer SENSOR.
// Cada dispositivo viaja con su controlador para que la tarjeta de un VIRTUAL diga de quién depende.
const SECTION_DEVICES = {
  orderBy: [{ primarySensor: 'desc' }, { createdAt: 'asc' }],
  include: { controlledBy: true },
} satisfies Prisma.Section$devicesArgs;

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // ROOMS
  // ============================================

  async findAllRooms(userId?: string) {
    return this.prisma.room.findMany({
      where: userId ? { userId } : undefined,
      include: {
        sections: {
          include: {
            _count: {
              select: {
                devices: true,
                plants: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findRoomById(id: string, userId?: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            devices: SECTION_DEVICES,
            plants: {
              include: {
                strain: true,
              },
            },
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    // Verificar que el usuario tiene acceso
    if (userId && room.userId && room.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta sala');
    }

    return room;
  }

  async createRoom(data: CreateRoomDto, userId: string) {
    return this.prisma.room.create({
      data: {
        ...data,
        userId,
      },
      include: {
        sections: true,
      },
    });
  }

  async updateRoom(id: string, data: UpdateRoomDto, userId?: string) {
    await this.findRoomById(id, userId);

    return this.prisma.room.update({
      where: { id },
      data,
      include: {
        sections: true,
      },
    });
  }

  async deleteRoom(id: string, userId?: string) {
    await this.findRoomById(id, userId);

    return this.prisma.room.delete({
      where: { id },
    });
  }

  /**
   * Carpas de una sala. Devuelve lo mismo que `findAllSections` (dispositivos, plantas y
   * `effectiveStage`) para que /sala pinte las lecturas con la misma fuente que la home.
   */
  async getRoomSections(roomId: string, userId?: string) {
    await this.findRoomById(roomId, userId);

    const sections = await this.prisma.section.findMany({
      where: { roomId },
      include: {
        devices: SECTION_DEVICES,
        plants: true,
        _count: {
          select: {
            devices: true,
            plants: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return sections.map((section) => ({
      ...section,
      effectiveStage: effectiveStage(section.plants),
    }));
  }

  // ============================================
  // SECTIONS
  // ============================================

  /**
   * Listado de carpas. Cada una viaja con `effectiveStage`: la etapa cuyos rangos de sensores
   * aplican, derivada de sus plantas, para que el frontend no la recalcule.
   */
  async findAllSections(userId?: string) {
    const sections = await this.prisma.section.findMany({
      where: userId ? { room: { userId } } : undefined,
      include: {
        room: true,
        devices: SECTION_DEVICES,
        plants: true,
        _count: {
          select: {
            devices: true,
            plants: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return sections.map((section) => ({
      ...section,
      effectiveStage: effectiveStage(section.plants),
    }));
  }

  async findSectionById(id: string, userId?: string) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: {
        room: true,
        devices: SECTION_DEVICES,
        plants: {
          include: {
            strain: true,
          },
        },
      },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    // Verificar acceso a través del room
    if (userId && section.room?.userId && section.room.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta sección');
    }

    return { ...section, effectiveStage: effectiveStage(section.plants) };
  }

  async createSection(data: CreateSectionDto, userId?: string) {
    // Verificar que la room existe y pertenece al usuario
    const room = await this.prisma.room.findUnique({
      where: { id: data.roomId },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${data.roomId} not found`);
    }

    if (userId && room.userId && room.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta sala');
    }

    return this.prisma.section.create({
      data,
      include: {
        room: true,
      },
    });
  }

  async updateSection(id: string, data: UpdateSectionDto, userId?: string) {
    await this.findSectionById(id, userId);

    return this.prisma.section.update({
      where: { id },
      data,
      include: {
        room: true,
      },
    });
  }

  async deleteSection(id: string, userId?: string) {
    await this.findSectionById(id, userId);

    return this.prisma.section.delete({
      where: { id },
    });
  }

  /**
   * Dashboard de una sección
   * Devuelve datos de la carpa, dispositivos asignados y resumen de plantas
   */
  async getSectionDashboard(id: string, userId?: string) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: {
        room: true,
        devices: SECTION_DEVICES,
        plants: {
          include: {
            strain: true,
            cycle: true,
            zones: true,
          },
          where: {
            sectionId: id, // Filtrar solo plantas que realmente pertenecen a esta sección
            stage: {
              notIn: ['CURADO'],
            },
          },
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    // Verificar acceso a través del room
    if (userId && section.room?.userId && section.room.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta sección');
    }

    // Agrupar plantas por etapa
    const plantsByStage = section.plants.reduce(
      (acc, plant) => {
        acc[plant.stage] = (acc[plant.stage] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // La etapa efectiva sale de todas las plantas asignadas a la carpa, incluidas las que el
    // dashboard no lista (CURADO): son las que están adentro y fijan el clima que se busca.
    const assignedPlants = await this.prisma.plant.findMany({
      where: { sectionId: id },
      select: { stage: true },
    });

    return {
      ...section,
      effectiveStage: effectiveStage(assignedPlants),
      summary: {
        totalPlants: section.plants.length,
        totalDevices: section.devices.length,
        plantsByStage,
      },
    };
  }

  // ============================================
  // PPFD / DLI
  // ============================================

  /**
   * Registra una lectura de PPFD para una zona de la sección
   */
  async createPPFDReading(sectionId: string, data: CreatePPFDReadingDto) {
    await this.findSectionById(sectionId);

    return this.prisma.pPFDReading.create({
      data: {
        section: { connect: { id: sectionId } },
        zone: data.zone,
        ppfdValue: data.ppfdValue,
        lightHeight: data.lightHeight,
      },
    });
  }

  /**
   * Obtiene las últimas lecturas de PPFD por zona
   */
  async getLatestPPFDReadings(sectionId: string) {
    await this.findSectionById(sectionId);

    // Obtener la última lectura de cada zona (1-6)
    const zones = [1, 2, 3, 4, 5, 6];
    const readings = await Promise.all(
      zones.map(async (zone) => {
        const reading = await this.prisma.pPFDReading.findFirst({
          where: { sectionId, zone },
          orderBy: { recordedAt: 'desc' },
        });
        return { zone, reading };
      }),
    );

    return readings;
  }

  /**
   * Obtiene el historial de PPFD de una zona específica
   */
  async getPPFDHistory(sectionId: string, zone?: number, limit = 50) {
    await this.findSectionById(sectionId);

    return this.prisma.pPFDReading.findMany({
      where: {
        sectionId,
        ...(zone && { zone }),
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Calcula el DLI teórico basado en PPFD y horas de luz
   * DLI = PPFD × horas de luz × 0.0036
   */
  async calculateDLI(sectionId: string, lightHoursPerDay = 18) {
    const latestReadings = await this.getLatestPPFDReadings(sectionId);
    
    // Calcular promedio de PPFD de todas las zonas con lectura
    const validReadings = latestReadings
      .filter(r => r.reading !== null)
      .map(r => r.reading!.ppfdValue);

    if (validReadings.length === 0) {
      return {
        sectionId,
        avgPPFD: null,
        lightHoursPerDay,
        dli: null,
        message: 'No hay lecturas de PPFD registradas',
      };
    }

    const avgPPFD = validReadings.reduce((a, b) => a + b, 0) / validReadings.length;
    const dli = avgPPFD * lightHoursPerDay * 0.0036;

    return {
      sectionId,
      avgPPFD: Math.round(avgPPFD * 100) / 100,
      lightHoursPerDay,
      dli: Math.round(dli * 100) / 100,
      zonesWithData: validReadings.length,
      readings: latestReadings,
    };
  }

  // ============================================
  // SECTION LAYOUT
  // ============================================

  /**
   * Obtiene la configuración de layout de una sección
   * Si no existe, devuelve la configuración por defecto
   */
  async getSectionLayout(sectionId: string) {
    await this.findSectionById(sectionId);

    const layout = await this.prisma.sectionLayout.findUnique({
      where: { sectionId },
    });

    if (!layout) {
      return {
        sectionId,
        config: DEFAULT_LAYOUT_CONFIG,
        isDefault: true,
      };
    }

    return {
      ...layout,
      isDefault: false,
    };
  }

  /**
   * Actualiza la configuración de layout de una sección
   * Si no existe, la crea
   */
  async updateSectionLayout(sectionId: string, data: UpdateSectionLayoutDto) {
    await this.findSectionById(sectionId);

    // Convertir a formato JSON compatible con Prisma (serializar y deserializar)
    const config = JSON.parse(JSON.stringify({ sections: data.sections }));

    const layout = await this.prisma.sectionLayout.upsert({
      where: { sectionId },
      create: {
        sectionId,
        config,
      },
      update: {
        config,
      },
    });

    return {
      ...layout,
      isDefault: false,
    };
  }
}
