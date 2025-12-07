import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ImportPreventionPlanDto,
  CreatePreventionPlanDto,
  UpdatePreventionPlanDto,
  AssignPreventionPlanDto,
  AddApplicationDto,
} from './dto/prevention-plan.dto';
import { PlantStage } from '@prisma/client';

@Injectable()
export class PreventionPlansService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // PREVENTION PLANS
  // ============================================

  /**
   * Obtener todos los planes de prevención
   */
  async findAll(stage?: PlantStage) {
    return this.prisma.preventionPlan.findMany({
      where: stage ? { stage } : undefined,
      include: {
        applications: {
          orderBy: { dayNumber: 'asc' },
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
    const plan = await this.prisma.preventionPlan.findUnique({
      where: { id },
      include: {
        applications: {
          orderBy: { dayNumber: 'asc' },
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
      throw new NotFoundException(`Prevention plan with ID ${id} not found`);
    }

    return plan;
  }

  /**
   * Crear plan vacío (sin aplicaciones)
   */
  async create(data: CreatePreventionPlanDto) {
    return this.prisma.preventionPlan.create({
      data,
      include: {
        applications: true,
      },
    });
  }

  /**
   * Importar plan completo desde JSON (con aplicaciones)
   */
  async import(data: ImportPreventionPlanDto) {
    const { applications, ...planData } = data;

    return this.prisma.preventionPlan.create({
      data: {
        ...planData,
        applications: {
          create: applications.map((app) => ({
            dayNumber: app.dayNumber,
            products: JSON.parse(JSON.stringify(app.products)),
            applicationType: app.applicationType,
            target: app.target,
            notes: app.notes,
          })),
        },
      },
      include: {
        applications: {
          orderBy: { dayNumber: 'asc' },
        },
      },
    });
  }

  /**
   * Actualizar plan
   */
  async update(id: string, data: UpdatePreventionPlanDto) {
    await this.findById(id);
    return this.prisma.preventionPlan.update({
      where: { id },
      data,
      include: {
        applications: {
          orderBy: { dayNumber: 'asc' },
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
        `Cannot delete prevention plan with ${plan.plants.length} assigned plants`,
      );
    }

    return this.prisma.preventionPlan.delete({ where: { id } });
  }

  /**
   * Agregar o actualizar aplicación en un plan
   */
  async addOrUpdateApplication(planId: string, data: AddApplicationDto) {
    await this.findById(planId);

    return this.prisma.preventionPlanApplication.upsert({
      where: {
        preventionPlanId_dayNumber: {
          preventionPlanId: planId,
          dayNumber: data.dayNumber,
        },
      },
      update: {
        products: JSON.parse(JSON.stringify(data.products)),
        applicationType: data.applicationType,
        target: data.target,
        notes: data.notes,
      },
      create: {
        preventionPlanId: planId,
        dayNumber: data.dayNumber,
        products: JSON.parse(JSON.stringify(data.products)),
        applicationType: data.applicationType,
        target: data.target,
        notes: data.notes,
      },
    });
  }

  /**
   * Eliminar aplicación de un plan
   */
  async deleteApplication(planId: string, dayNumber: number) {
    await this.findById(planId);

    const application = await this.prisma.preventionPlanApplication.findUnique({
      where: {
        preventionPlanId_dayNumber: {
          preventionPlanId: planId,
          dayNumber,
        },
      },
    });

    if (!application) {
      throw new NotFoundException(
        `Application for day ${dayNumber} not found in plan ${planId}`,
      );
    }

    return this.prisma.preventionPlanApplication.delete({
      where: { id: application.id },
    });
  }

  // ============================================
  // PLANT-PLAN ASSIGNMENTS
  // ============================================

  /**
   * Asignar plan a una planta
   * NOTA: Solo puede haber UN plan de prevención por planta.
   * Si la planta ya tiene un plan asignado, se desasigna automáticamente.
   */
  async assignToPlant(plantId: string, data: AssignPreventionPlanDto) {
    // Verificar que existe la planta
    const plant = await this.prisma.plant.findUnique({
      where: { id: plantId },
    });
    if (!plant) {
      throw new NotFoundException(`Plant with ID ${plantId} not found`);
    }

    // Verificar que existe el plan
    const plan = await this.findById(data.preventionPlanId);

    // Verificar que el plan es para la etapa actual de la planta
    if (plan.stage !== plant.stage) {
      throw new BadRequestException(
        `Prevention plan is for stage ${plan.stage}, but plant is in stage ${plant.stage}`,
      );
    }

    // Eliminar cualquier plan de prevención anterior de esta planta
    await this.prisma.plantPreventionPlan.deleteMany({
      where: { plantId },
    });

    // Crear la nueva asignación
    return this.prisma.plantPreventionPlan.create({
      data: {
        plantId,
        preventionPlanId: data.preventionPlanId,
        startDate: new Date(data.startDate),
      },
      include: {
        preventionPlan: {
          include: {
            applications: {
              orderBy: { dayNumber: 'asc' },
            },
          },
        },
      },
    });
  }

  /**
   * Desasignar plan de una planta
   */
  async unassignFromPlant(plantId: string, preventionPlanId: string) {
    const assignment = await this.prisma.plantPreventionPlan.findUnique({
      where: {
        plantId_preventionPlanId: {
          plantId,
          preventionPlanId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Assignment not found for plant ${plantId} and plan ${preventionPlanId}`,
      );
    }

    return this.prisma.plantPreventionPlan.delete({
      where: { id: assignment.id },
    });
  }

  // ============================================
  // SECTION PREVENTION PLANS (Para la vista de carpa)
  // ============================================

  /**
   * Obtener planes de prevención de una sección con info de día actual
   */
  async getSectionPreventionPlans(sectionId: string) {
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
        preventionPlans: {
          include: {
            preventionPlan: {
              include: {
                applications: {
                  orderBy: { dayNumber: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    // Procesar cada planta y calcular día actual
    const now = new Date();
    const plantsWithDayInfo = plants.map((plant) => {
      const preventionPlansWithDays = plant.preventionPlans.map((pp) => {
        const plan = pp.preventionPlan;
        const currentDay = this.calculateCurrentDay(pp.startDate, now, plan.totalDays);
        const totalDays = plan.totalDays;

        // Obtener aplicaciones anterior, actual y siguiente
        const { previousApplication, currentApplication, nextApplication } = 
          this.getAdjacentApplications(plan.applications, currentDay, totalDays);

        return {
          id: pp.id,
          preventionPlanId: plan.id,
          preventionPlanName: plan.name,
          stage: plan.stage,
          startDate: pp.startDate,
          currentDay,
          totalDays,
          previousApplication: previousApplication
            ? {
                dayNumber: previousApplication.dayNumber,
                products: previousApplication.products,
                applicationType: previousApplication.applicationType,
                target: previousApplication.target,
                notes: previousApplication.notes,
              }
            : null,
          currentApplication: currentApplication
            ? {
                dayNumber: currentApplication.dayNumber,
                products: currentApplication.products,
                applicationType: currentApplication.applicationType,
                target: currentApplication.target,
                notes: currentApplication.notes,
              }
            : null,
          nextApplication: nextApplication
            ? {
                dayNumber: nextApplication.dayNumber,
                products: nextApplication.products,
                applicationType: nextApplication.applicationType,
                target: nextApplication.target,
                notes: nextApplication.notes,
              }
            : null,
        };
      });

      return {
        id: plant.id,
        tagCode: plant.tagCode,
        strain: plant.strain,
        stage: plant.stage,
        preventionPlans: preventionPlansWithDays,
      };
    });

    return {
      sectionId,
      sectionName: section.name,
      plants: plantsWithDayInfo,
    };
  }

  /**
   * Calcular día actual basándose en fecha de inicio (con ciclo repetitivo)
   */
  private calculateCurrentDay(startDate: Date, now: Date, totalDays: number): number {
    const diffTime = now.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    // Día actual dentro del ciclo (1 a totalDays)
    return (diffDays % totalDays) + 1;
  }

  /**
   * Obtener aplicaciones adyacentes (anterior, actual, siguiente)
   */
  private getAdjacentApplications(
    applications: any[],
    currentDay: number,
    totalDays: number,
  ) {
    if (applications.length === 0) {
      return { previousApplication: null, currentApplication: null, nextApplication: null };
    }

    // Encontrar la aplicación actual o la más cercana anterior
    let currentApplication = applications.find((a) => a.dayNumber === currentDay);
    
    // Si no hay aplicación para hoy, buscar la más cercana pasada
    let previousApplication = null;
    let nextApplication = null;

    if (currentApplication) {
      // Hay aplicación hoy
      const currentIndex = applications.indexOf(currentApplication);
      previousApplication = currentIndex > 0 ? applications[currentIndex - 1] : null;
      nextApplication = currentIndex < applications.length - 1 ? applications[currentIndex + 1] : null;
    } else {
      // No hay aplicación hoy, buscar anterior y siguiente
      const sortedApps = [...applications].sort((a, b) => a.dayNumber - b.dayNumber);
      
      for (let i = 0; i < sortedApps.length; i++) {
        if (sortedApps[i].dayNumber > currentDay) {
          nextApplication = sortedApps[i];
          previousApplication = i > 0 ? sortedApps[i - 1] : sortedApps[sortedApps.length - 1];
          break;
        }
        previousApplication = sortedApps[i];
      }

      // Si no se encontró siguiente, es la primera del próximo ciclo
      if (!nextApplication && sortedApps.length > 0) {
        nextApplication = sortedApps[0];
      }
    }

    return { previousApplication, currentApplication, nextApplication };
  }
}
