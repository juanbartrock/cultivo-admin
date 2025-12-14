import { PrismaService } from '../../../prisma/prisma.service';
import { ToolDefinition } from './types';

/**
 * Crea las herramientas relacionadas con automatizaciones
 * Todas filtran por userId para aislamiento de datos
 */
export function createAutomationTools(prisma: PrismaService): ToolDefinition[] {
  return [
    // ==================== GET_AUTOMATION ====================
    {
      name: 'get_automation',
      description: 'Obtiene detalles completos de una automatización por nombre',
      parameters: {
        type: 'object',
        properties: {
          automation_name: {
            type: 'string',
            description: 'Nombre de la automatización (puede ser parcial)',
          },
        },
        required: ['automation_name'],
      },
      handler: async (params) => {
        const userId = params._userId;
        const automationName = params.automation_name as string;

        // Solo automatizaciones del usuario
        const automation = await prisma.automation.findFirst({
          where: {
            name: { contains: automationName, mode: 'insensitive' },
            section: {
              room: { userId },
            },
          },
          include: {
            section: true,
            conditions: {
              include: { device: true },
              orderBy: { order: 'asc' },
            },
            actions: {
              include: { device: true },
              orderBy: { order: 'asc' },
            },
            executions: {
              orderBy: { startedAt: 'desc' },
              take: 10,
            },
          },
        });

        if (!automation) {
          const allAutomations = await prisma.automation.findMany({
            where: {
              section: {
                room: { userId },
              },
            },
            select: { name: true, section: { select: { name: true } } },
          });
          return {
            error: `No se encontró la automatización "${automationName}" en tu sistema`,
            availableAutomations: allAutomations.map((a) => ({
              name: a.name,
              section: a.section.name,
            })),
          };
        }

        return {
          id: automation.id,
          name: automation.name,
          description: automation.description,
          section: automation.section.name,
          status: automation.status,
          triggerType: automation.triggerType,
          scheduleType: automation.scheduleType,
          schedule: {
            activeStartTime: automation.activeStartTime,
            activeEndTime: automation.activeEndTime,
            intervalMinutes: automation.intervalMinutes,
            actionDuration: automation.actionDuration,
            specificTimes: automation.specificTimes,
            daysOfWeek: automation.daysOfWeek,
          },
          conditions: automation.conditions.map((c) => ({
            device: c.device.name,
            deviceType: c.device.type,
            property: c.property,
            operator: c.operator,
            value: c.value,
            valueMax: c.valueMax,
            timeValue: c.timeValue,
            logicOperator: c.logicOperator,
          })),
          actions: automation.actions.map((a) => ({
            device: a.device.name,
            deviceType: a.device.type,
            actionType: a.actionType,
            duration: a.duration,
            delayMinutes: a.delayMinutes,
            value: a.value,
          })),
          recentExecutions: automation.executions.map((e) => ({
            status: e.status,
            startedAt: e.startedAt.toISOString(),
            endedAt: e.endedAt?.toISOString(),
            errorMessage: e.errorMessage,
          })),
          lastEvaluatedAt: automation.lastEvaluatedAt?.toISOString(),
          priority: automation.priority,
          notifications: automation.notifications,
        };
      },
    },

    // ==================== LIST_AUTOMATIONS ====================
    {
      name: 'list_automations',
      description: 'Lista todas las automatizaciones, opcionalmente filtradas por sección o estado',
      parameters: {
        type: 'object',
        properties: {
          section_name: {
            type: 'string',
            description: 'Nombre de la sección para filtrar',
          },
          status: {
            type: 'string',
            description: 'Estado de la automatización',
            enum: ['ACTIVE', 'PAUSED', 'DISABLED'],
          },
        },
        required: [],
      },
      handler: async (params) => {
        const userId = params._userId;
        const where: any = {
          section: {
            room: { userId },
          },
        };

        if (params.section_name) {
          const section = await prisma.section.findFirst({
            where: { 
              name: { contains: params.section_name as string, mode: 'insensitive' },
              room: { userId },
            },
          });
          if (section) {
            where.sectionId = section.id;
          }
        }

        if (params.status) {
          where.status = params.status;
        }

        const automations = await prisma.automation.findMany({
          where,
          include: {
            section: true,
            _count: {
              select: { conditions: true, actions: true, executions: true },
            },
          },
          orderBy: [{ status: 'asc' }, { priority: 'desc' }],
        });

        return {
          count: automations.length,
          automations: automations.map((a) => ({
            name: a.name,
            section: a.section.name,
            status: a.status,
            triggerType: a.triggerType,
            scheduleType: a.scheduleType,
            description: a.description,
            conditionsCount: a._count.conditions,
            actionsCount: a._count.actions,
            executionsCount: a._count.executions,
            lastEvaluatedAt: a.lastEvaluatedAt?.toISOString(),
          })),
        };
      },
    },

    // ==================== GET_AUTOMATION_EXECUTIONS ====================
    {
      name: 'get_automation_executions',
      description: 'Obtiene el historial de ejecuciones de una automatización',
      parameters: {
        type: 'object',
        properties: {
          automation_name: {
            type: 'string',
            description: 'Nombre de la automatización',
          },
          limit: {
            type: 'string',
            description: 'Número máximo de ejecuciones (default: 20)',
          },
          status: {
            type: 'string',
            description: 'Filtrar por estado de ejecución',
            enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'],
          },
        },
        required: ['automation_name'],
      },
      handler: async (params) => {
        const userId = params._userId;
        const automationName = params.automation_name as string;
        const limit = parseInt(params.limit as string) || 20;

        // Solo automatizaciones del usuario
        const automation = await prisma.automation.findFirst({
          where: {
            name: { contains: automationName, mode: 'insensitive' },
            section: {
              room: { userId },
            },
          },
        });

        if (!automation) {
          return { error: `No se encontró la automatización "${automationName}" en tu sistema` };
        }

        const where: any = { automationId: automation.id };
        if (params.status) {
          where.status = params.status;
        }

        const executions = await prisma.automationExecution.findMany({
          where,
          include: {
            effectivenessChecks: true,
          },
          orderBy: { startedAt: 'desc' },
          take: limit,
        });

        // Calcular estadísticas
        const stats = {
          total: executions.length,
          completed: executions.filter((e) => e.status === 'COMPLETED').length,
          failed: executions.filter((e) => e.status === 'FAILED').length,
          cancelled: executions.filter((e) => e.status === 'CANCELLED').length,
        };

        return {
          automationName: automation.name,
          stats,
          executions: executions.map((e) => ({
            status: e.status,
            startedAt: e.startedAt.toISOString(),
            endedAt: e.endedAt?.toISOString(),
            durationMinutes: e.endedAt
              ? Math.round((e.endedAt.getTime() - e.startedAt.getTime()) / 60000)
              : null,
            triggeredConditions: e.triggeredConditions,
            executedActions: e.executedActions,
            errorMessage: e.errorMessage,
            effectivenessChecks: e.effectivenessChecks.map((ec) => ({
              conditionMet: ec.conditionMet,
              valueAtCheck: ec.valueAtCheck,
              targetValue: ec.targetValue,
              checkedAt: ec.checkedAt.toISOString(),
            })),
          })),
        };
      },
    },
  ];
}
