import { PrismaService } from '../../../prisma/prisma.service';
import { ToolDefinition } from './types';

/**
 * Crea las herramientas relacionadas con infraestructura (secciones, dispositivos, sensores)
 * Todas filtran por userId para aislamiento de datos
 */
export function createInfrastructureTools(prisma: PrismaService): ToolDefinition[] {
  return [
    // ==================== GET_SYSTEM_OVERVIEW ====================
    {
      name: 'get_system_overview',
      description: 'Obtiene un resumen general del sistema: salas, secciones, plantas activas y ciclos',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      handler: async (params) => {
        const userId = params._userId;
        
        // Solo salas del usuario
        const rooms = await prisma.room.findMany({
          where: { userId },
          include: {
            sections: {
              include: {
                _count: {
                  select: { plants: true, devices: true, automations: true },
                },
              },
            },
          },
        });

        // Solo ciclos del usuario (Cycle tiene userId directo)
        const activeCycles = await prisma.cycle.findMany({
          where: { 
            status: 'ACTIVE',
            userId,
          },
          include: {
            _count: { select: { plants: true } },
          },
        });

        // Plantas del usuario
        const plantsByStage = await prisma.plant.groupBy({
          by: ['stage'],
          where: {
            section: {
              room: { userId },
            },
          },
          _count: { _all: true },
        });

        const totalPlants = await prisma.plant.count({
          where: {
            section: {
              room: { userId },
            },
          },
        });

        const totalDevices = await prisma.device.count({
          where: {
            section: {
              room: { userId },
            },
          },
        });

        return {
          rooms: rooms.map((r) => ({
            name: r.name,
            sections: r.sections.map((s) => ({
              name: s.name,
              dimensions: s.dimensions,
              plantsCount: s._count.plants,
              devicesCount: s._count.devices,
              automationsCount: s._count.automations,
            })),
          })),
          activeCycles: activeCycles.map((c) => ({
            name: c.name,
            startDate: c.startDate.toISOString().split('T')[0],
            plantsCount: c._count.plants,
          })),
          plantsByStage: plantsByStage.reduce((acc, p) => {
            acc[p.stage] = p._count._all;
            return acc;
          }, {} as Record<string, number>),
          totals: {
            plants: totalPlants,
            devices: totalDevices,
            rooms: rooms.length,
            sections: rooms.reduce((acc, r) => acc + r.sections.length, 0),
          },
        };
      },
    },

    // ==================== GET_SECTION_DETAILS ====================
    {
      name: 'get_section_details',
      description: 'Obtiene detalles completos de una sección/carpa incluyendo plantas, dispositivos y automatizaciones',
      parameters: {
        type: 'object',
        properties: {
          section_name: {
            type: 'string',
            description: 'Nombre de la sección (ej: "Floración 120x120", "Vegetativo")',
          },
        },
        required: ['section_name'],
      },
      handler: async (params) => {
        const userId = params._userId;
        const sectionName = params.section_name as string;

        // Solo secciones del usuario
        const section = await prisma.section.findFirst({
          where: {
            name: { contains: sectionName, mode: 'insensitive' },
            room: { userId },
          },
          include: {
            room: true,
            plants: {
              include: {
                strain: true,
                preventionPlans: { include: { preventionPlan: true } },
                feedingPlans: { include: { feedingPlan: true } },
              },
            },
            devices: true,
            automations: {
              include: {
                conditions: { include: { device: true } },
                actions: { include: { device: true } },
              },
            },
          },
        });

        if (!section) {
          const allSections = await prisma.section.findMany({
            where: { room: { userId } },
            select: { name: true },
          });
          return {
            error: `No se encontró la sección "${sectionName}" en tu sistema`,
            availableSections: allSections.map((s) => s.name),
          };
        }

        return {
          id: section.id,
          name: section.name,
          room: section.room.name,
          dimensions: section.dimensions,
          description: section.description,
          plants: section.plants.map((p) => ({
            tagCode: p.tagCode,
            strain: p.strain.name,
            stage: p.stage,
            healthStatus: p.healthStatus,
            daysInStage: p.stageStartDate
              ? Math.floor((Date.now() - p.stageStartDate.getTime()) / (1000 * 60 * 60 * 24))
              : 0,
            preventionPlans: p.preventionPlans.map((pp) => pp.preventionPlan.name),
            feedingPlans: p.feedingPlans.map((fp) => fp.feedingPlan.name),
          })),
          devices: section.devices.map((d) => ({
            name: d.name,
            type: d.type,
            connector: d.connector,
          })),
          automations: section.automations.map((a) => ({
            name: a.name,
            status: a.status,
            triggerType: a.triggerType,
            description: a.description,
          })),
          counts: {
            plants: section.plants.length,
            devices: section.devices.length,
            automations: section.automations.length,
          },
        };
      },
    },

    // ==================== GET_SECTION_DEVICES ====================
    {
      name: 'get_section_devices',
      description: 'Obtiene todos los dispositivos de una sección',
      parameters: {
        type: 'object',
        properties: {
          section_name: {
            type: 'string',
            description: 'Nombre de la sección',
          },
        },
        required: ['section_name'],
      },
      handler: async (params) => {
        const userId = params._userId;
        const sectionName = params.section_name as string;

        const section = await prisma.section.findFirst({
          where: {
            name: { contains: sectionName, mode: 'insensitive' },
            room: { userId },
          },
          include: {
            devices: {
              include: {
                controlledBy: true,
                controlledDevices: true,
              },
            },
          },
        });

        if (!section) {
          return { error: `No se encontró la sección "${sectionName}" en tu sistema` };
        }

        return {
          sectionName: section.name,
          devices: section.devices.map((d) => ({
            name: d.name,
            type: d.type,
            connector: d.connector,
            externalId: d.externalId,
            recordHistory: d.recordHistory,
            controlledBy: d.controlledBy?.name,
            controls: d.controlledDevices.map((cd) => cd.name),
            metadata: d.metadata,
          })),
        };
      },
    },

    // ==================== GET_SENSOR_READINGS ====================
    {
      name: 'get_sensor_readings',
      description: 'Obtiene las lecturas históricas de un sensor (temperatura, humedad, CO2)',
      parameters: {
        type: 'object',
        properties: {
          device_name: {
            type: 'string',
            description: 'Nombre del dispositivo sensor',
          },
          period: {
            type: 'string',
            description: 'Período de tiempo',
            enum: ['1h', '6h', '24h', '7d'],
          },
        },
        required: ['device_name'],
      },
      handler: async (params) => {
        const userId = params._userId;
        const deviceName = params.device_name as string;
        const period = (params.period as string) || '24h';

        // Solo sensores del usuario
        const device = await prisma.device.findFirst({
          where: {
            name: { contains: deviceName, mode: 'insensitive' },
            type: 'SENSOR',
            section: {
              room: { userId },
            },
          },
        });

        if (!device) {
          return { error: `No se encontró el sensor "${deviceName}" en tu sistema` };
        }

        // Calcular fecha de inicio según período
        const now = new Date();
        let startDate: Date;
        switch (period) {
          case '1h':
            startDate = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case '6h':
            startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
            break;
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          default: // 24h
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        const readings = await prisma.sensorReading.findMany({
          where: {
            deviceId: device.id,
            recordedAt: { gte: startDate },
          },
          orderBy: { recordedAt: 'desc' },
          take: 100,
        });

        if (readings.length === 0) {
          return {
            deviceName: device.name,
            period,
            message: 'No hay lecturas en el período especificado',
          };
        }

        // Calcular estadísticas
        const temps = readings.filter((r) => r.temperature !== null).map((r) => r.temperature!);
        const humidities = readings.filter((r) => r.humidity !== null).map((r) => r.humidity!);

        return {
          deviceName: device.name,
          period,
          readingsCount: readings.length,
          temperature: temps.length > 0 ? {
            current: temps[0],
            min: Math.min(...temps),
            max: Math.max(...temps),
            avg: temps.reduce((a, b) => a + b, 0) / temps.length,
          } : null,
          humidity: humidities.length > 0 ? {
            current: humidities[0],
            min: Math.min(...humidities),
            max: Math.max(...humidities),
            avg: humidities.reduce((a, b) => a + b, 0) / humidities.length,
          } : null,
          lastReading: readings[0]?.recordedAt.toISOString(),
        };
      },
    },

    // ==================== GET_ACTIVE_CYCLE ====================
    {
      name: 'get_active_cycle',
      description: 'Obtiene información del ciclo de cultivo activo',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      handler: async (params) => {
        const userId = params._userId;
        
        // Solo ciclos del usuario (Cycle tiene userId directo)
        const cycles = await prisma.cycle.findMany({
          where: { 
            status: 'ACTIVE',
            userId,
          },
          include: {
            plants: {
              include: {
                strain: true,
                section: true,
              },
            },
            _count: { select: { events: true } },
          },
        });

        if (cycles.length === 0) {
          return { message: 'No hay ciclos activos en tu sistema' };
        }

        return {
          activeCycles: cycles.map((c) => ({
            name: c.name,
            status: c.status,
            startDate: c.startDate.toISOString().split('T')[0],
            daysSinceStart: Math.floor((Date.now() - c.startDate.getTime()) / (1000 * 60 * 60 * 24)),
            notes: c.notes,
            plantsCount: c.plants.length,
            eventsCount: c._count.events,
            plantsByStage: c.plants.reduce((acc: Record<string, number>, p) => {
              acc[p.stage] = (acc[p.stage] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            plantsBySectionAndStrain: c.plants.map((p) => ({
              tagCode: p.tagCode,
              strain: p.strain.name,
              stage: p.stage,
              section: p.section?.name ?? 'Sin sección',
            })),
          })),
        };
      },
    },
  ];
}
