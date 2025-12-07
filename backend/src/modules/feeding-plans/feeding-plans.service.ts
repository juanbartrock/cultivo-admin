import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ImportFeedingPlanDto,
  CreateFeedingPlanDto,
  UpdateFeedingPlanDto,
  AssignFeedingPlanDto,
  AddWeekDto,
} from './dto/feeding-plan.dto';
import { PlantStage } from '@prisma/client';

@Injectable()
export class FeedingPlansService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // FEEDING PLANS
  // ============================================

  /**
   * Obtener todos los planes de alimentación
   */
  async findAll(stage?: PlantStage) {
    return this.prisma.feedingPlan.findMany({
      where: stage ? { stage } : undefined,
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
        },
        _count: {
          select: { plants: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Obtener un plan por ID
   */
  async findById(id: string) {
    const plan = await this.prisma.feedingPlan.findUnique({
      where: { id },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
        },
        plants: {
          include: {
            plant: {
              include: {
                strain: true,
                section: true,
              },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Feeding plan with ID ${id} not found`);
    }

    return plan;
  }

  /**
   * Crear plan vacío (sin semanas)
   */
  async create(data: CreateFeedingPlanDto) {
    return this.prisma.feedingPlan.create({
      data,
      include: {
        weeks: true,
      },
    });
  }

  /**
   * Importar plan completo desde JSON (con semanas)
   */
  async import(data: ImportFeedingPlanDto) {
    const { weeks, ...planData } = data;

    return this.prisma.feedingPlan.create({
      data: {
        ...planData,
        weeks: {
          create: weeks.map((week) => ({
            weekNumber: week.weekNumber,
            products: JSON.parse(JSON.stringify(week.products)),
            ph: week.ph,
            ec: week.ec,
            notes: week.notes,
          })),
        },
      },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
        },
      },
    });
  }

  /**
   * Actualizar plan
   */
  async update(id: string, data: UpdateFeedingPlanDto) {
    await this.findById(id);
    return this.prisma.feedingPlan.update({
      where: { id },
      data,
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
        },
      },
    });
  }

  /**
   * Eliminar plan
   */
  async delete(id: string) {
    const plan = await this.findById(id);

    // Verificar que no tenga plantas asignadas
    if (plan.plants.length > 0) {
      throw new BadRequestException(
        `Cannot delete feeding plan with ${plan.plants.length} assigned plants`,
      );
    }

    return this.prisma.feedingPlan.delete({ where: { id } });
  }

  /**
   * Agregar o actualizar semana en un plan
   */
  async addOrUpdateWeek(planId: string, data: AddWeekDto) {
    await this.findById(planId);

    return this.prisma.feedingPlanWeek.upsert({
      where: {
        feedingPlanId_weekNumber: {
          feedingPlanId: planId,
          weekNumber: data.weekNumber,
        },
      },
      update: {
        products: JSON.parse(JSON.stringify(data.products)),
        ph: data.ph,
        ec: data.ec,
        notes: data.notes,
      },
      create: {
        feedingPlanId: planId,
        weekNumber: data.weekNumber,
        products: JSON.parse(JSON.stringify(data.products)),
        ph: data.ph,
        ec: data.ec,
        notes: data.notes,
      },
    });
  }

  /**
   * Eliminar semana de un plan
   */
  async deleteWeek(planId: string, weekNumber: number) {
    await this.findById(planId);

    const week = await this.prisma.feedingPlanWeek.findUnique({
      where: {
        feedingPlanId_weekNumber: {
          feedingPlanId: planId,
          weekNumber,
        },
      },
    });

    if (!week) {
      throw new NotFoundException(
        `Week ${weekNumber} not found in plan ${planId}`,
      );
    }

    return this.prisma.feedingPlanWeek.delete({
      where: { id: week.id },
    });
  }

  // ============================================
  // PLANT-PLAN ASSIGNMENTS
  // ============================================

  /**
   * Asignar plan a una planta
   * NOTA: Solo puede haber UN plan de alimentación por planta.
   * Si la planta ya tiene un plan asignado, se desasigna automáticamente.
   */
  async assignToPlant(plantId: string, data: AssignFeedingPlanDto) {
    // Verificar que existe la planta
    const plant = await this.prisma.plant.findUnique({
      where: { id: plantId },
    });
    if (!plant) {
      throw new NotFoundException(`Plant with ID ${plantId} not found`);
    }

    // Verificar que existe el plan
    const plan = await this.findById(data.feedingPlanId);

    // Verificar que el plan es para la etapa actual de la planta
    if (plan.stage !== plant.stage) {
      throw new BadRequestException(
        `Feeding plan is for stage ${plan.stage}, but plant is in stage ${plant.stage}`,
      );
    }

    // Eliminar cualquier plan de alimentación anterior de esta planta
    await this.prisma.plantFeedingPlan.deleteMany({
      where: { plantId },
    });

    // Crear la nueva asignación
    return this.prisma.plantFeedingPlan.create({
      data: {
        plantId,
        feedingPlanId: data.feedingPlanId,
        stageStartDate: new Date(data.stageStartDate),
      },
      include: {
        feedingPlan: {
          include: {
            weeks: {
              orderBy: { weekNumber: 'asc' },
            },
          },
        },
      },
    });
  }

  /**
   * Desasignar plan de una planta
   */
  async unassignFromPlant(plantId: string, feedingPlanId: string) {
    const assignment = await this.prisma.plantFeedingPlan.findUnique({
      where: {
        plantId_feedingPlanId: {
          plantId,
          feedingPlanId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Assignment not found for plant ${plantId} and plan ${feedingPlanId}`,
      );
    }

    return this.prisma.plantFeedingPlan.delete({
      where: { id: assignment.id },
    });
  }

  // ============================================
  // SECTION FEEDING PLANS (Para la vista de carpa)
  // ============================================

  /**
   * Obtener planes de alimentación de una sección con info de semana actual
   */
  async getSectionFeedingPlans(sectionId: string) {
    // Verificar que existe la sección
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });
    if (!section) {
      throw new NotFoundException(`Section with ID ${sectionId} not found`);
    }

    // Obtener todas las plantas de la sección con sus planes asignados
    const plants = await this.prisma.plant.findMany({
      where: { sectionId },
      include: {
        strain: true,
        feedingPlans: {
          include: {
            feedingPlan: {
              include: {
                weeks: {
                  orderBy: { weekNumber: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    // Procesar cada planta y calcular semana actual
    const now = new Date();
    const plantsWithWeekInfo = plants.map((plant) => {
      const feedingPlansWithWeeks = plant.feedingPlans.map((pf) => {
        const currentWeek = this.calculateCurrentWeek(pf.stageStartDate, now);
        const plan = pf.feedingPlan;
        const totalWeeks = plan.weeks.length;

        // Obtener semanas anterior, actual y siguiente
        const previousWeek = plan.weeks.find(
          (w) => w.weekNumber === currentWeek - 1,
        );
        const currentWeekData = plan.weeks.find(
          (w) => w.weekNumber === currentWeek,
        );
        const nextWeek = plan.weeks.find(
          (w) => w.weekNumber === currentWeek + 1,
        );

        return {
          id: pf.id,
          feedingPlanId: plan.id,
          feedingPlanName: plan.name,
          stage: plan.stage,
          stageStartDate: pf.stageStartDate,
          currentWeek,
          totalWeeks,
          previousWeek: previousWeek
            ? {
                weekNumber: previousWeek.weekNumber,
                products: previousWeek.products,
                ph: previousWeek.ph,
                ec: previousWeek.ec,
                notes: previousWeek.notes,
              }
            : null,
          currentWeekData: currentWeekData
            ? {
                weekNumber: currentWeekData.weekNumber,
                products: currentWeekData.products,
                ph: currentWeekData.ph,
                ec: currentWeekData.ec,
                notes: currentWeekData.notes,
              }
            : null,
          nextWeek: nextWeek
            ? {
                weekNumber: nextWeek.weekNumber,
                products: nextWeek.products,
                ph: nextWeek.ph,
                ec: nextWeek.ec,
                notes: nextWeek.notes,
              }
            : null,
        };
      });

      return {
        id: plant.id,
        tagCode: plant.tagCode,
        strain: plant.strain,
        stage: plant.stage,
        feedingPlans: feedingPlansWithWeeks,
      };
    });

    return {
      sectionId,
      sectionName: section.name,
      plants: plantsWithWeekInfo,
    };
  }

  /**
   * Calcular semana actual basándose en fecha de inicio de etapa
   */
  private calculateCurrentWeek(stageStartDate: Date, now: Date): number {
    const diffTime = now.getTime() - stageStartDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1; // Semana 1 es la primera
  }
}
