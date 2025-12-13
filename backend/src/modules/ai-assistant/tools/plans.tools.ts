import { PrismaService } from '../../../prisma/prisma.service';
import { ToolDefinition } from './types';

/**
 * Crea las herramientas relacionadas con planes de prevención y alimentación
 */
export function createPlanTools(prisma: PrismaService): ToolDefinition[] {
  return [
    // ==================== GET_PREVENTION_PLAN ====================
    {
      name: 'get_prevention_plan',
      description: 'Obtiene un plan de prevención completo con todos sus productos, aplicaciones y plantas asignadas',
      parameters: {
        type: 'object',
        properties: {
          plan_name: {
            type: 'string',
            description: 'Nombre del plan de prevención (puede ser parcial)',
          },
        },
        required: ['plan_name'],
      },
      handler: async (params) => {
        const planName = params.plan_name as string;

        const plan = await prisma.preventionPlan.findFirst({
          where: {
            name: { contains: planName, mode: 'insensitive' },
          },
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
          // Buscar planes similares
          const allPlans = await prisma.preventionPlan.findMany({
            select: { name: true },
          });
          return {
            error: `No se encontró el plan "${planName}"`,
            availablePlans: allPlans.map((p) => p.name),
          };
        }

        // Procesar plantas asignadas con su día actual
        const assignedPlants = plan.plants.map((pp) => {
          const daysSinceStart = pp.startDate
            ? Math.floor((Date.now() - pp.startDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          const currentDay = (daysSinceStart % plan.totalDays) + 1;

          return {
            tagCode: pp.plant.tagCode,
            strain: pp.plant.strain.name,
            section: pp.plant.section.name,
            stage: pp.plant.stage,
            startDate: pp.startDate?.toISOString().split('T')[0],
            currentDay,
            daysInPlan: daysSinceStart,
          };
        });

        return {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          stage: plan.stage,
          totalDays: plan.totalDays,
          applications: plan.applications.map((app) => ({
            dayNumber: app.dayNumber,
            products: app.products as Array<{ name: string; dose: string; unit: string }>,
            applicationType: app.applicationType,
            target: app.target,
            notes: app.notes,
          })),
          assignedPlants,
          totalPlantsAssigned: assignedPlants.length,
        };
      },
    },

    // ==================== GET_FEEDING_PLAN ====================
    {
      name: 'get_feeding_plan',
      description: 'Obtiene un plan de alimentación completo con todas sus semanas, productos y plantas asignadas',
      parameters: {
        type: 'object',
        properties: {
          plan_name: {
            type: 'string',
            description: 'Nombre del plan de alimentación (puede ser parcial)',
          },
        },
        required: ['plan_name'],
      },
      handler: async (params) => {
        const planName = params.plan_name as string;

        const plan = await prisma.feedingPlan.findFirst({
          where: {
            name: { contains: planName, mode: 'insensitive' },
          },
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
          const allPlans = await prisma.feedingPlan.findMany({
            select: { name: true },
          });
          return {
            error: `No se encontró el plan "${planName}"`,
            availablePlans: allPlans.map((p) => p.name),
          };
        }

        // Procesar plantas asignadas con su semana actual
        const assignedPlants = plan.plants.map((pp) => {
          const daysSinceStart = pp.stageStartDate
            ? Math.floor((Date.now() - pp.stageStartDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          const currentWeek = Math.floor(daysSinceStart / 7) + 1;

          return {
            tagCode: pp.plant.tagCode,
            strain: pp.plant.strain.name,
            section: pp.plant.section.name,
            stage: pp.plant.stage,
            stageStartDate: pp.stageStartDate?.toISOString().split('T')[0],
            currentWeek,
            daysInStage: daysSinceStart,
          };
        });

        return {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          stage: plan.stage,
          totalWeeks: plan.weeks.length,
          weeks: plan.weeks.map((week) => ({
            weekNumber: week.weekNumber,
            products: week.products as Array<{ name: string; dose: string; unit: string }>,
            ph: week.ph,
            ec: week.ec,
            notes: week.notes,
          })),
          assignedPlants,
          totalPlantsAssigned: assignedPlants.length,
        };
      },
    },

    // ==================== LIST_PLANS ====================
    {
      name: 'list_plans',
      description: 'Lista todos los planes disponibles (prevención o alimentación)',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Tipo de plan',
            enum: ['prevention', 'feeding', 'all'],
          },
          stage: {
            type: 'string',
            description: 'Filtrar por etapa',
            enum: ['GERMINACION', 'VEGETATIVO', 'PRE_FLORA', 'FLORACION', 'SECADO', 'CURADO'],
          },
        },
        required: [],
      },
      handler: async (params) => {
        const type = (params.type as string) || 'all';
        const result: any = {};

        if (type === 'prevention' || type === 'all') {
          const preventionPlans = await prisma.preventionPlan.findMany({
            where: params.stage ? { stage: params.stage as any } : undefined,
            include: {
              _count: { select: { plants: true, applications: true } },
            },
          });

          result.preventionPlans = preventionPlans.map((p) => ({
            name: p.name,
            stage: p.stage,
            totalDays: p.totalDays,
            applicationsCount: p._count.applications,
            plantsAssigned: p._count.plants,
            description: p.description,
          }));
        }

        if (type === 'feeding' || type === 'all') {
          const feedingPlans = await prisma.feedingPlan.findMany({
            where: params.stage ? { stage: params.stage as any } : undefined,
            include: {
              _count: { select: { plants: true, weeks: true } },
            },
          });

          result.feedingPlans = feedingPlans.map((p) => ({
            name: p.name,
            stage: p.stage,
            weeksCount: p._count.weeks,
            plantsAssigned: p._count.plants,
            description: p.description,
          }));
        }

        return result;
      },
    },

    // ==================== GET_PLANTS_BY_PLAN ====================
    {
      name: 'get_plants_by_plan',
      description: 'Obtiene todas las plantas asignadas a un plan específico',
      parameters: {
        type: 'object',
        properties: {
          plan_name: {
            type: 'string',
            description: 'Nombre del plan (prevención o alimentación)',
          },
        },
        required: ['plan_name'],
      },
      handler: async (params) => {
        const planName = params.plan_name as string;

        // Buscar en planes de prevención
        const preventionPlan = await prisma.preventionPlan.findFirst({
          where: { name: { contains: planName, mode: 'insensitive' } },
          include: {
            plants: {
              include: {
                plant: {
                  include: { strain: true, section: true },
                },
              },
            },
          },
        });

        if (preventionPlan) {
          return {
            planType: 'prevention',
            planName: preventionPlan.name,
            plants: preventionPlan.plants.map((pp) => {
              const daysSinceStart = pp.startDate
                ? Math.floor((Date.now() - pp.startDate.getTime()) / (1000 * 60 * 60 * 24))
                : 0;
              return {
                tagCode: pp.plant.tagCode,
                strain: pp.plant.strain.name,
                stage: pp.plant.stage,
                section: pp.plant.section.name,
                healthStatus: pp.plant.healthStatus,
                currentDay: (daysSinceStart % preventionPlan.totalDays) + 1,
                startDate: pp.startDate?.toISOString().split('T')[0],
              };
            }),
          };
        }

        // Buscar en planes de alimentación
        const feedingPlan = await prisma.feedingPlan.findFirst({
          where: { name: { contains: planName, mode: 'insensitive' } },
          include: {
            plants: {
              include: {
                plant: {
                  include: { strain: true, section: true },
                },
              },
            },
          },
        });

        if (feedingPlan) {
          return {
            planType: 'feeding',
            planName: feedingPlan.name,
            plants: feedingPlan.plants.map((pp) => {
              const daysSinceStart = pp.stageStartDate
                ? Math.floor((Date.now() - pp.stageStartDate.getTime()) / (1000 * 60 * 60 * 24))
                : 0;
              return {
                tagCode: pp.plant.tagCode,
                strain: pp.plant.strain.name,
                stage: pp.plant.stage,
                section: pp.plant.section.name,
                healthStatus: pp.plant.healthStatus,
                currentWeek: Math.floor(daysSinceStart / 7) + 1,
                stageStartDate: pp.stageStartDate?.toISOString().split('T')[0],
              };
            }),
          };
        }

        return { error: `No se encontró ningún plan con nombre "${planName}"` };
      },
    },
  ];
}
