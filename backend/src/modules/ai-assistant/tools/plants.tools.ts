import { PrismaService } from '../../../prisma/prisma.service';
import { ToolDefinition } from './types';

/**
 * Crea las herramientas relacionadas con plantas
 * Todas filtran por userId para aislamiento de datos
 */
export function createPlantTools(prisma: PrismaService): ToolDefinition[] {
  return [
    // ==================== GET_PLANT_DETAILS ====================
    {
      name: 'get_plant_details',
      description: 'Obtiene detalles completos de una planta por su código/tag. Incluye genética, etapa, planes asignados, eventos recientes y fotos.',
      parameters: {
        type: 'object',
        properties: {
          plant_tag: {
            type: 'string',
            description: 'Código de la planta (ej: "048", "069", "041"). Puede ser con o sin ceros iniciales.',
          },
        },
        required: ['plant_tag'],
      },
      handler: async (params) => {
        const userId = params._userId;
        const tag = String(params.plant_tag).padStart(3, '0');
        
        // Filtrar plantas que pertenecen al usuario (via section -> room -> userId)
        const plant = await prisma.plant.findFirst({
          where: {
            OR: [
              { tagCode: tag },
              { tagCode: params.plant_tag as string },
              { tagCode: { contains: params.plant_tag as string } },
            ],
            // FILTRO POR USUARIO
            section: {
              room: { userId },
            },
          },
          include: {
            strain: true,
            section: { include: { room: true } },
            cycle: true,
            feedingPlans: {
              include: {
                feedingPlan: {
                  include: { weeks: true },
                },
              },
            },
            preventionPlans: {
              include: {
                preventionPlan: {
                  include: { applications: true },
                },
              },
            },
            events: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        });

        if (!plant) {
          return { error: `No se encontró la planta con código "${params.plant_tag}" en tu sistema` };
        }

        // Calcular días en etapa
        const daysInStage = plant.stageStartDate
          ? Math.floor((Date.now() - plant.stageStartDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        // Procesar planes de prevención
        const preventionPlans = plant.preventionPlans.map((pp) => {
          const daysSinceStart = pp.startDate
            ? Math.floor((Date.now() - pp.startDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          const currentDay = (daysSinceStart % pp.preventionPlan.totalDays) + 1;

          return {
            name: pp.preventionPlan.name,
            stage: pp.preventionPlan.stage,
            totalDays: pp.preventionPlan.totalDays,
            currentDay,
            startDate: pp.startDate?.toISOString().split('T')[0],
            applications: pp.preventionPlan.applications.map((app) => ({
              day: app.dayNumber,
              products: app.products,
              type: app.applicationType,
              target: app.target,
              notes: app.notes,
            })),
          };
        });

        // Procesar planes de alimentación
        const feedingPlans = plant.feedingPlans.map((fp) => {
          const daysSinceStart = fp.stageStartDate
            ? Math.floor((Date.now() - fp.stageStartDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          const currentWeek = Math.floor(daysSinceStart / 7) + 1;

          return {
            name: fp.feedingPlan.name,
            stage: fp.feedingPlan.stage,
            currentWeek,
            stageStartDate: fp.stageStartDate?.toISOString().split('T')[0],
            weeks: fp.feedingPlan.weeks.map((w) => ({
              week: w.weekNumber,
              products: w.products,
              ph: w.ph,
              ec: w.ec,
              notes: w.notes,
            })),
          };
        });

        // Procesar eventos recientes
        const events = plant.events.map((e) => ({
          type: e.type,
          date: e.createdAt.toISOString().split('T')[0],
          data: e.data,
        }));

        // Obtener fotos recientes
        const photos = plant.events
          .filter((e) => e.type === 'FOTO')
          .slice(0, 5)
          .map((e) => {
            const data = e.data as { url?: string; caption?: string };
            return { url: data.url, caption: data.caption };
          });

        return {
          id: plant.id,
          tagCode: plant.tagCode,
          strain: {
            name: plant.strain.name,
            type: plant.strain.type,
            breeder: plant.strain.breeder,
            floweringDays: plant.strain.floweringDaysExpected,
          },
          stage: plant.stage,
          daysInStage,
          healthStatus: plant.healthStatus,
          section: plant.section?.name ?? 'Sin sección',
          cycle: plant.cycle.name,
          startDate: plant.startDate?.toISOString().split('T')[0],
          notes: plant.notes,
          preventionPlans,
          feedingPlans,
          recentEvents: events,
          recentPhotos: photos,
        };
      },
    },

    // ==================== SEARCH_PLANTS ====================
    {
      name: 'search_plants',
      description: 'Busca plantas por diferentes criterios (etapa, sección, salud, genética, plan asignado)',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Texto de búsqueda (nombre de genética, código, etc.)',
          },
          stage: {
            type: 'string',
            description: 'Filtrar por etapa',
            enum: ['GERMINACION', 'VEGETATIVO', 'PRE_FLORA', 'FLORACION', 'SECADO', 'CURADO'],
          },
          section: {
            type: 'string',
            description: 'Nombre de la sección/carpa',
          },
          health: {
            type: 'string',
            description: 'Estado de salud',
            enum: ['HEALTHY', 'INFECTED', 'DEAD'],
          },
          plan_name: {
            type: 'string',
            description: 'Nombre del plan de prevención o alimentación asignado',
          },
        },
        required: [],
      },
      handler: async (params) => {
        const userId = params._userId;
        const where: any = {
          // FILTRO POR USUARIO
          section: {
            room: { userId },
          },
        };

        if (params.stage) {
          where.stage = params.stage;
        }
        if (params.health) {
          where.healthStatus = params.health;
        }
        if (params.section) {
          where.section = { 
            ...where.section,
            name: { contains: params.section as string, mode: 'insensitive' },
          };
        }
        if (params.query) {
          where.OR = [
            { tagCode: { contains: params.query as string, mode: 'insensitive' } },
            { strain: { name: { contains: params.query as string, mode: 'insensitive' } } },
            { notes: { contains: params.query as string, mode: 'insensitive' } },
          ];
        }

        let plants = await prisma.plant.findMany({
          where,
          include: {
            strain: true,
            section: true,
            preventionPlans: { include: { preventionPlan: true } },
            feedingPlans: { include: { feedingPlan: true } },
          },
          take: 50,
        });

        // Filtrar por nombre de plan si se especificó
        if (params.plan_name) {
          const planName = (params.plan_name as string).toLowerCase();
          plants = plants.filter((p) =>
            p.preventionPlans.some((pp) =>
              pp.preventionPlan.name.toLowerCase().includes(planName),
            ) ||
            p.feedingPlans.some((fp) =>
              fp.feedingPlan.name.toLowerCase().includes(planName),
            ),
          );
        }

        return {
          count: plants.length,
          plants: plants.map((p) => ({
            tagCode: p.tagCode,
            strain: p.strain.name,
            stage: p.stage,
            healthStatus: p.healthStatus,
            section: p.section?.name ?? 'Sin sección',
            preventionPlans: p.preventionPlans.map((pp) => pp.preventionPlan.name),
            feedingPlans: p.feedingPlans.map((fp) => fp.feedingPlan.name),
          })),
        };
      },
    },

    // ==================== GET_PLANT_PHOTOS ====================
    {
      name: 'get_plant_photos',
      description: 'Obtiene las fotos de una planta',
      parameters: {
        type: 'object',
        properties: {
          plant_tag: {
            type: 'string',
            description: 'Código de la planta',
          },
          limit: {
            type: 'string',
            description: 'Número máximo de fotos a retornar (default: 10)',
          },
        },
        required: ['plant_tag'],
      },
      handler: async (params) => {
        const userId = params._userId;
        const tag = String(params.plant_tag).padStart(3, '0');
        const limit = parseInt(params.limit as string) || 10;

        // Verificar que la planta pertenece al usuario
        const plant = await prisma.plant.findFirst({
          where: {
            OR: [
              { tagCode: tag },
              { tagCode: params.plant_tag as string },
            ],
            section: {
              room: { userId },
            },
          },
        });

        if (!plant) {
          return { error: `No se encontró la planta con código "${params.plant_tag}" en tu sistema` };
        }

        const events = await prisma.event.findMany({
          where: {
            plantId: plant.id,
            type: 'FOTO',
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        return {
          plantTag: plant.tagCode,
          photos: events.map((e) => {
            const data = e.data as { url?: string; caption?: string };
            return {
              date: e.createdAt.toISOString().split('T')[0],
              url: data.url,
              caption: data.caption,
            };
          }),
        };
      },
    },

    // ==================== GET_PLANT_EVENTS ====================
    {
      name: 'get_plant_events',
      description: 'Obtiene el historial de eventos de una planta (riegos, podas, notas, etc.)',
      parameters: {
        type: 'object',
        properties: {
          plant_tag: {
            type: 'string',
            description: 'Código de la planta',
          },
          event_type: {
            type: 'string',
            description: 'Tipo de evento a filtrar',
            enum: ['RIEGO', 'PODA', 'TRANSPLANTE', 'NOTA', 'FOTO', 'PARAMETRO_AMBIENTAL', 'CAMBIO_FOTOPERIODO'],
          },
          limit: {
            type: 'string',
            description: 'Número máximo de eventos (default: 20)',
          },
        },
        required: ['plant_tag'],
      },
      handler: async (params) => {
        const userId = params._userId;
        const tag = String(params.plant_tag).padStart(3, '0');
        const limit = parseInt(params.limit as string) || 20;

        // Verificar que la planta pertenece al usuario
        const plant = await prisma.plant.findFirst({
          where: {
            OR: [
              { tagCode: tag },
              { tagCode: params.plant_tag as string },
            ],
            section: {
              room: { userId },
            },
          },
        });

        if (!plant) {
          return { error: `No se encontró la planta con código "${params.plant_tag}" en tu sistema` };
        }

        const where: any = { plantId: plant.id };
        if (params.event_type) {
          where.type = params.event_type;
        }

        const events = await prisma.event.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        return {
          plantTag: plant.tagCode,
          events: events.map((e) => ({
            type: e.type,
            date: e.createdAt.toISOString(),
            data: e.data,
          })),
        };
      },
    },
  ];
}
