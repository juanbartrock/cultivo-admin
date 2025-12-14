import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCycleDto, UpdateCycleDto } from './dto/cycle.dto';
import { CreatePlantDto, UpdatePlantDto, MovePlantDto } from './dto/plant.dto';
import { CreateStrainDto, UpdateStrainDto } from './dto/strain.dto';
import { CycleStatus } from '@prisma/client';

@Injectable()
export class GrowService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // STRAINS (Genéticas)
  // ============================================

  async findAllStrains() {
    return this.prisma.strain.findMany({
      include: {
        _count: {
          select: { plants: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findStrainById(id: string) {
    const strain = await this.prisma.strain.findUnique({
      where: { id },
      include: {
        plants: {
          include: {
            cycle: true,
            section: true,
          },
        },
      },
    });

    if (!strain) {
      throw new NotFoundException(`Strain with ID ${id} not found`);
    }

    return strain;
  }

  async createStrain(data: CreateStrainDto) {
    return this.prisma.strain.create({ data });
  }

  async updateStrain(id: string, data: UpdateStrainDto) {
    await this.findStrainById(id);
    return this.prisma.strain.update({
      where: { id },
      data,
    });
  }

  async deleteStrain(id: string) {
    const strain = await this.findStrainById(id);

    // Verificar que no tenga plantas asociadas
    if (strain.plants.length > 0) {
      throw new BadRequestException(
        `Cannot delete strain with ${strain.plants.length} associated plants`,
      );
    }

    return this.prisma.strain.delete({ where: { id } });
  }

  // ============================================
  // CYCLES (Seguimientos)
  // ============================================

  async findAllCycles(status?: CycleStatus) {
    return this.prisma.cycle.findMany({
      where: status ? { status } : undefined,
      include: {
        _count: {
          select: {
            plants: true,
            events: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findCycleById(id: string) {
    const cycle = await this.prisma.cycle.findUnique({
      where: { id },
      include: {
        plants: {
          include: {
            strain: true,
            section: {
              include: {
                room: true,
              },
            },
          },
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!cycle) {
      throw new NotFoundException(`Cycle with ID ${id} not found`);
    }

    // Agrupar plantas por etapa
    const plantsByStage = cycle.plants.reduce(
      (acc, plant) => {
        acc[plant.stage] = (acc[plant.stage] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      ...cycle,
      summary: {
        totalPlants: cycle.plants.length,
        totalEvents: cycle.events.length,
        plantsByStage,
      },
    };
  }

  async createCycle(data: CreateCycleDto) {
    return this.prisma.cycle.create({
      data: {
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        notes: data.notes,
        status: CycleStatus.ACTIVE,
      },
    });
  }

  async updateCycle(id: string, data: UpdateCycleDto) {
    await this.findCycleById(id);
    return this.prisma.cycle.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async deleteCycle(id: string) {
    await this.findCycleById(id);
    return this.prisma.cycle.delete({ where: { id } });
  }

  async completeCycle(id: string) {
    await this.findCycleById(id);
    return this.prisma.cycle.update({
      where: { id },
      data: {
        status: CycleStatus.COMPLETED,
        endDate: new Date(),
      },
    });
  }

  // ============================================
  // PLANTS (Plantas)
  // ============================================

  async findAllPlants(cycleId?: string, sectionId?: string) {
    return this.prisma.plant.findMany({
      where: {
        ...(cycleId && { cycleId }),
        ...(sectionId && { sectionId }),
      },
      include: {
        strain: true,
        cycle: true,
        section: {
          include: {
            room: true,
          },
        },
        zones: true,
        _count: {
          select: { events: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPlantById(id: string) {
    const plant = await this.prisma.plant.findUnique({
      where: { id },
      include: {
        strain: true,
        cycle: true,
        section: {
          include: {
            room: true,
          },
        },
        zones: true,
        events: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!plant) {
      throw new NotFoundException(`Plant with ID ${id} not found`);
    }

    return plant;
  }

  async createPlant(data: CreatePlantDto) {
    // Verificar que existe la genética
    const strain = await this.prisma.strain.findUnique({
      where: { id: data.strainId },
    });
    if (!strain) {
      throw new NotFoundException(`Strain with ID ${data.strainId} not found`);
    }

    // Verificar que existe el ciclo
    const cycle = await this.prisma.cycle.findUnique({
      where: { id: data.cycleId },
    });
    if (!cycle) {
      throw new NotFoundException(`Cycle with ID ${data.cycleId} not found`);
    }

    // Verificar que existe la sección
    const section = await this.prisma.section.findUnique({
      where: { id: data.sectionId },
    });
    if (!section) {
      throw new NotFoundException(`Section with ID ${data.sectionId} not found`);
    }

    // Validar zonas si se proporcionan
    if (data.zones) {
      for (const zoneData of data.zones) {
        if (zoneData.zone < 1 || zoneData.zone > 6) {
          throw new BadRequestException('Zone must be between 1 and 6');
        }
        if (zoneData.coverage !== undefined && (zoneData.coverage < 0 || zoneData.coverage > 100)) {
          throw new BadRequestException('Coverage must be between 0 and 100');
        }
      }
    }

    // Verificar que el tagCode es único
    const existing = await this.prisma.plant.findUnique({
      where: { tagCode: data.tagCode },
    });
    if (existing) {
      throw new BadRequestException(`Plant with tag code ${data.tagCode} already exists`);
    }

    // Separar datos de la planta de las zonas
    const { zones, ...plantData } = data;

    const plant = await this.prisma.plant.create({
      data: plantData,
      include: {
        strain: true,
        cycle: true,
        section: true,
        zones: true,
      },
    });

    // Crear las zonas si se proporcionaron
    if (zones && zones.length > 0) {
      await this.prisma.plantZone.createMany({
        data: zones.map(z => ({
          plantId: plant.id,
          zone: z.zone,
          coverage: z.coverage ?? 100.0,
        })),
      });

      // Recargar la planta con las zonas
      return this.prisma.plant.findUnique({
        where: { id: plant.id },
        include: {
          strain: true,
          cycle: true,
          section: true,
          zones: true,
        },
      });
    }

    return plant;
  }

  async updatePlant(id: string, data: UpdatePlantDto) {
    const plant = await this.findPlantById(id);

    // Si se cambia la sección, validar que existe
    if (data.sectionId && data.sectionId !== plant.sectionId) {
      const section = await this.prisma.section.findUnique({
        where: { id: data.sectionId },
      });
      if (!section) {
        throw new NotFoundException(`Section with ID ${data.sectionId} not found`);
      }
    }

    // Validar zonas si se proporcionan
    if (data.zones) {
      for (const zoneData of data.zones) {
        if (zoneData.zone < 1 || zoneData.zone > 6) {
          throw new BadRequestException('Zone must be between 1 and 6');
        }
        if (zoneData.coverage !== undefined && (zoneData.coverage < 0 || zoneData.coverage > 100)) {
          throw new BadRequestException('Coverage must be between 0 and 100');
        }
      }
    }

    // Separar datos de la planta de las zonas
    const { zones, ...plantData } = data;

    // Actualizar la planta
    const updatedPlant = await this.prisma.plant.update({
      where: { id },
      data: plantData,
      include: {
        strain: true,
        cycle: true,
        section: true,
        zones: true,
      },
    });

    // Si se proporcionaron zonas, actualizar las zonas (eliminar las existentes y crear las nuevas)
    if (zones !== undefined) {
      // Eliminar todas las zonas existentes
      await this.prisma.plantZone.deleteMany({
        where: { plantId: id },
      });

      // Crear las nuevas zonas si se proporcionaron
      if (zones.length > 0) {
        await this.prisma.plantZone.createMany({
          data: zones.map(z => ({
            plantId: id,
            zone: z.zone,
            coverage: z.coverage ?? 100.0,
          })),
        });
      }

      // Recargar la planta con las zonas actualizadas
      return this.prisma.plant.findUnique({
        where: { id },
        include: {
          strain: true,
          cycle: true,
          section: true,
          zones: true,
        },
      });
    }

    return updatedPlant;
  }

  async deletePlant(id: string) {
    await this.findPlantById(id);
    return this.prisma.plant.delete({ where: { id } });
  }

  /**
   * Mover planta de sección o cambiar etapa
   */
  async movePlant(id: string, data: MovePlantDto) {
    const plant = await this.findPlantById(id);

    // Si se proporciona sectionId, verificar que existe
    if (data.sectionId) {
      const section = await this.prisma.section.findUnique({
        where: { id: data.sectionId },
      });
      if (!section) {
        throw new NotFoundException(`Section with ID ${data.sectionId} not found`);
      }
    }

    // Crear evento de transplante si cambia de sección
    if (data.sectionId && data.sectionId !== plant.sectionId) {
      await this.prisma.event.create({
        data: {
          type: 'TRANSPLANTE',
          plantId: id,
          cycleId: plant.cycleId,
          sectionId: data.sectionId,
          data: {
            fromSectionId: plant.sectionId,
            toSectionId: data.sectionId,
            stage: data.stage || plant.stage,
          },
        },
      });
    }

    // Crear evento de cambio de etapa si cambia
    // Usar la fecha proporcionada o la fecha actual
    const stageChangeDate = data.stageDate ? new Date(data.stageDate) : new Date();
    
    if (data.stage && data.stage !== plant.stage) {
      await this.prisma.event.create({
        data: {
          type: 'CAMBIO_FOTOPERIODO',
          plantId: id,
          cycleId: plant.cycleId,
          sectionId: data.sectionId || plant.sectionId,
          data: {
            fromStage: plant.stage,
            toStage: data.stage,
            stageDate: stageChangeDate.toISOString(),
          },
          createdAt: stageChangeDate, // Usar la fecha del cambio como fecha del evento
        },
      });
    }

    // Validar zonas si se proporcionan
    if (data.zones) {
      for (const zoneData of data.zones) {
        if (zoneData.zone < 1 || zoneData.zone > 6) {
          throw new BadRequestException('Zone must be between 1 and 6');
        }
        if (zoneData.coverage !== undefined && (zoneData.coverage < 0 || zoneData.coverage > 100)) {
          throw new BadRequestException('Coverage must be between 0 and 100');
        }
      }
    }

    // Separar datos de la planta de las zonas
    const { zones, ...plantData } = data;

    // Actualizar la planta
    const updatedPlant = await this.prisma.plant.update({
      where: { id },
      data: {
        ...(plantData.sectionId && { sectionId: plantData.sectionId }),
        ...(plantData.stage && { stage: plantData.stage }),
        // Actualizar stageStartDate cuando cambia la etapa (con la fecha proporcionada)
        ...(plantData.stage && plantData.stage !== plant.stage && { stageStartDate: stageChangeDate }),
      },
      include: {
        strain: true,
        cycle: true,
        section: {
          include: {
            room: true,
          },
        },
        zones: true,
      },
    });

    // Si se proporcionaron zonas, actualizar las zonas (eliminar las existentes y crear las nuevas)
    if (zones !== undefined) {
      // Eliminar todas las zonas existentes
      await this.prisma.plantZone.deleteMany({
        where: { plantId: id },
      });

      // Crear las nuevas zonas si se proporcionaron
      if (zones.length > 0) {
        await this.prisma.plantZone.createMany({
          data: zones.map(z => ({
            plantId: id,
            zone: z.zone,
            coverage: z.coverage ?? 100.0,
          })),
        });
      }

      // Recargar la planta con las zonas actualizadas
      return this.prisma.plant.findUnique({
        where: { id },
        include: {
          strain: true,
          cycle: true,
          section: {
            include: {
              room: true,
            },
          },
          zones: true,
        },
      });
    }

    return updatedPlant;
  }

  /**
   * Obtiene el PPFD actual de las zonas asignadas a una planta
   * Calcula un promedio ponderado basado en el coverage de cada zona
   */
  async getPlantPPFD(plantId: string) {
    const plant = await this.findPlantById(plantId);

    if (!plant.zones || plant.zones.length === 0) {
      return null; // La planta no tiene zonas asignadas
    }

    // Obtener las últimas lecturas de PPFD de todas las zonas asignadas
    const readings = await Promise.all(
      plant.zones.map(async (plantZone) => {
        const reading = await this.prisma.pPFDReading.findFirst({
          where: {
            sectionId: plant.sectionId,
            zone: plantZone.zone,
          },
          orderBy: { recordedAt: 'desc' },
        });
        return {
          zone: plantZone.zone,
          coverage: plantZone.coverage ?? 100.0,
          reading,
        };
      }),
    );

    // Calcular promedio ponderado de PPFD
    let totalWeightedPPFD = 0;
    let totalCoverage = 0;
    const zoneReadings: Array<{
      zone: number;
      coverage: number;
      ppfdValue: number | null;
      lightHeight: number | null;
      recordedAt: Date | null;
    }> = [];

    for (const item of readings) {
      const coverage = item.coverage;
      totalCoverage += coverage;

      if (item.reading) {
        const weightedPPFD = item.reading.ppfdValue * coverage;
        totalWeightedPPFD += weightedPPFD;
        zoneReadings.push({
          zone: item.zone,
          coverage,
          ppfdValue: item.reading.ppfdValue,
          lightHeight: item.reading.lightHeight,
          recordedAt: item.reading.recordedAt,
        });
      } else {
        zoneReadings.push({
          zone: item.zone,
          coverage,
          ppfdValue: null,
          lightHeight: null,
          recordedAt: null,
        });
      }
    }

    const averagePPFD = totalCoverage > 0 ? totalWeightedPPFD / totalCoverage : null;

    return {
      plantId: plant.id,
      averagePPFD,
      totalCoverage,
      zoneReadings,
      hasAllReadings: readings.every((r) => r.reading !== null),
    };
  }
}
