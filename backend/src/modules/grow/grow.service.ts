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

    // Validar zona si se proporciona
    if (data.zone !== undefined && (data.zone < 1 || data.zone > 6)) {
      throw new BadRequestException('Zone must be between 1 and 6');
    }

    // Verificar que el tagCode es único
    const existing = await this.prisma.plant.findUnique({
      where: { tagCode: data.tagCode },
    });
    if (existing) {
      throw new BadRequestException(`Plant with tag code ${data.tagCode} already exists`);
    }

    return this.prisma.plant.create({
      data,
      include: {
        strain: true,
        cycle: true,
        section: true,
      },
    });
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

    // Validar zona si se proporciona
    if (data.zone !== undefined && (data.zone < 1 || data.zone > 6)) {
      throw new BadRequestException('Zone must be between 1 and 6');
    }

    return this.prisma.plant.update({
      where: { id },
      data,
      include: {
        strain: true,
        cycle: true,
        section: true,
      },
    });
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

    // Validar zona si se proporciona
    if (data.zone !== undefined && (data.zone < 1 || data.zone > 6)) {
      throw new BadRequestException('Zone must be between 1 and 6');
    }

    return this.prisma.plant.update({
      where: { id },
      data: {
        ...(data.sectionId && { sectionId: data.sectionId }),
        ...(data.zone !== undefined && { zone: data.zone }),
        ...(data.stage && { stage: data.stage }),
        // Actualizar stageStartDate cuando cambia la etapa (con la fecha proporcionada)
        ...(data.stage && data.stage !== plant.stage && { stageStartDate: stageChangeDate }),
      },
      include: {
        strain: true,
        cycle: true,
        section: {
          include: {
            room: true,
          },
        },
      },
    });
  }

  /**
   * Obtiene el PPFD actual de la zona asignada a una planta
   */
  async getPlantPPFD(plantId: string) {
    const plant = await this.findPlantById(plantId);

    if (!plant.zone) {
      return null; // La planta no tiene zona asignada
    }

    // Obtener la última lectura de PPFD de la zona asignada
    const reading = await this.prisma.pPFDReading.findFirst({
      where: {
        sectionId: plant.sectionId,
        zone: plant.zone,
      },
      orderBy: { recordedAt: 'desc' },
    });

    return reading;
  }
}
