import { PrismaService } from '../../../prisma/prisma.service';
import { ToolDefinition } from './types';

/**
 * Crea las herramientas relacionadas con planes de prevenci?n y alimentaci?n
 * Todas filtran por userId para aislamiento de datos
 */
export function createPlanTools(prisma: PrismaService): ToolDefinition[] {
  return [
    // ==================== GET_PREVENTION_PLAN ====================
    {
      name: 'get_prevention_plan',
      description: 'Obtiene un plan de prevenci?n completo con todos sus productos, aplicaciones y plantas asignadas',
      parameters: {
        type: 'object',
        properties: {
          plan_name: {
            type: 'string',
            description: 'Nombre del plan de prevenci?n (puede ser parcial)',
          },
        },
        required: ['plan_name'],
      },
      handler: async (params) => {
        const userId = params._userId;
        const planName = params.plan_name as string;

        // Buscar plan del usuario
        const plan = await prisma.preventionPlan.findFirst({
          where: {
            name: { contains: planName, mode: 'insensitive' },
            userId, // FILTRO POR USUARIO
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
          // Buscar planes del usuario disponibles
          const allPlans = await prisma.preventionPlan.findMany({
            where: { userId },
            select: { name: true },
          });
          return {
            error: `No se encontr? el plan "${planName}" en tu sistema`,
            availablePlans: allPlans.map((p) => p.name),
          };
        }

        // Procesar plantas asignadas con su d?a actual
        const assignedPlants = plan.plants.map((pp) => {
          const daysSinceStart = pp.startDate
            ? Math.floor((Date.now() - pp.startDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          const currentDay = (daysSinceStart % plan.totalDays) + 1;

          return {
            tagCode: pp.plant.tagCode,
            strain: pp.plant.strain.name,
            section: pp.plant.section?.name ?? 'Sin secci?n',
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
      description: 'Obtiene un plan de alimentaci?n completo con todas sus semanas, productos y plantas asignadas',
      parameters: {
        type: 'object',
        properties: {
          plan_name: {
            type: 'string',
            description: 'Nombre del plan de alimentaci?n (puede ser parcial)',
          },
        },
        required: ['plan_name'],
      },
      handler: async (params) => {
        const userId = params._userId;
        const planName = params.plan_name as string;

        const plan = await prisma.feedingPlan.findFirst({
          where: {
            name: { contains: planName, mode: 'insensitive' },
            userId, // FILTRO POR USUARIO
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
            where: { userId },
            select: { name: true },
          });
          return {
            error: `No se encontr? el plan "${planName}" en tu sistema`,
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
            section: pp.plant.section?.name ?? 'Sin secci?n',
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
      description: 'Lista todos los planes disponibles (prevenci?n o alimentaci?n)',
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
        const userId = params._userId;
        const type = (params.type as string) || 'all';
        const result: any = {};

        if (type === 'prevention' || type === 'all') {
          const preventionPlans = await prisma.preventionPlan.findMany({
            where: {
              userId, // FILTRO POR USUARIO
              ...(params.stage ? { stage: params.stage as any } : {}),
            },
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
            where: {
              userId, // FILTRO POR USUARIO
              ...(params.stage ? { stage: params.stage as any } : {}),
            },
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
      description: 'Obtiene todas las plantas asignadas a un plan espec?fico',
      parameters: {
        type: 'object',
        properties: {
          plan_name: {
            type: 'string',
            description: 'Nombre del plan (prevenci?n o alimentaci?n)',
          },
        },
        required: ['plan_name'],
      },
      handler: async (params) => {
        const userId = params._userId;
        const planName = params.plan_name as string;

        // Buscar en planes de prevenci?n del usuario
        const preventionPlan = await prisma.preventionPlan.findFirst({
          where: { 
            name: { contains: planName, mode: 'insensitive' },
            userId, // FILTRO POR USUARIO
          },
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
                section: pp.plant.section?.name ?? 'Sin secci?n',
                healthStatus: pp.plant.healthStatus,
                currentDay: (daysSinceStart % preventionPlan.totalDays) + 1,
                startDate: pp.startDate?.toISOString().split('T')[0],
              };
            }),
          };
        }

        // Buscar en planes de alimentaci?n del usuario
        const feedingPlan = await prisma.feedingPlan.findFirst({
          where: { 
            name: { contains: planName, mode: 'insensitive' },
            userId, // FILTRO POR USUARIO
          },
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
                section: pp.plant.section?.name ?? 'Sin sección',
                healthStatus: pp.plant.healthStatus,
                currentWeek: Math.floor(daysSinceStart / 7) + 1,
                stageStartDate: pp.stageStartDate?.toISOString().split('T')[0],
              };
            }),
          };
        }

        return { error: `No se encontr? ning?n plan con nombre "${planName}" en tu sistema` };
      },
    },
  ];
}
