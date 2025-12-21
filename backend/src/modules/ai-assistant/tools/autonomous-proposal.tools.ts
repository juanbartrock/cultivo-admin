import { PrismaService } from '../../../prisma/prisma.service';
import { ToolDefinition } from './types';
import { AutomationStatus, TriggerType, ScheduleType, ActionType, ConditionOperator } from '@prisma/client';

/**
 * Crea las herramientas para proponer automatizaciones de forma autónoma
 * Las automatizaciones se crean con estado PENDING_APPROVAL para que el usuario las revise
 */
export function createAutonomousProposalTools(prisma: PrismaService): ToolDefinition[] {
  return [
    // ==================== PROPOSE_AUTOMATION ====================
    {
      name: 'propose_automation',
      description: `Propone una nueva automatización para aprobación del usuario.
La automatización se creará en estado PENDING_APPROVAL y el usuario deberá aprobarla antes de que se active.

IMPORTANTE:
- SOLO usa deviceIds de dispositivos que existan en el sistema (los IDs te fueron proporcionados en las capacidades)
- SOLO propón condiciones con sensores que realmente existen en esa sección
- Si no hay sensor de temperatura en una sección, NO propongas condiciones de temperatura
- Las automatizaciones SCHEDULED no requieren condiciones ni sensores`,
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nombre descriptivo de la automatización (ej: "Control Humedad Floración")',
          },
          description: {
            type: 'string',
            description: 'Descripción detallada de qué hace la automatización y por qué se propone',
          },
          section_id: {
            type: 'string',
            description: 'ID de la sección donde se aplicará (usa el ID exacto proporcionado)',
          },
          trigger_type: {
            type: 'string',
            description: 'Tipo de trigger: SCHEDULED (por horario), CONDITION (por sensor), HYBRID (ambos)',
            enum: ['SCHEDULED', 'CONDITION', 'HYBRID'],
          },
          schedule_type: {
            type: 'string',
            description: 'Tipo de programación (solo para SCHEDULED o HYBRID): TIME_RANGE (rango horario), INTERVAL (cada X minutos), SPECIFIC_TIMES (horas específicas)',
            enum: ['TIME_RANGE', 'INTERVAL', 'SPECIFIC_TIMES'],
          },
          active_start_time: {
            type: 'string',
            description: 'Hora de inicio en formato HH:MM (para TIME_RANGE)',
          },
          active_end_time: {
            type: 'string',
            description: 'Hora de fin en formato HH:MM (para TIME_RANGE)',
          },
          interval_minutes: {
            type: 'string',
            description: 'Intervalo en minutos (para INTERVAL)',
          },
          specific_times: {
            type: 'string',
            description: 'Horas específicas separadas por coma, formato HH:MM (para SPECIFIC_TIMES). Ej: "08:00,14:00,20:00"',
          },
          action_duration: {
            type: 'string',
            description: 'Duración de la acción en minutos (opcional, para encender por X minutos y apagar)',
          },
          days_of_week: {
            type: 'string',
            description: 'Días de la semana separados por coma (0=Dom, 1=Lun, ..., 6=Sab). Vacío = todos los días. Ej: "1,2,3,4,5"',
          },
          conditions: {
            type: 'string',
            description: `JSON array de condiciones (solo para CONDITION o HYBRID). Formato:
[{"device_id": "uuid", "property": "temperature|humidity|co2|state", "operator": "GREATER_THAN|LESS_THAN|EQUALS|BETWEEN|OUTSIDE", "value": 28, "value_max": 30, "logic_operator": "AND|OR"}]`,
          },
          actions: {
            type: 'string',
            description: `JSON array de acciones a ejecutar. Formato:
[{"device_id": "uuid", "action_type": "TURN_ON|TURN_OFF|TOGGLE", "duration": 30, "delay_minutes": 0}]`,
          },
          reason: {
            type: 'string',
            description: 'Justificación detallada de por qué propones esta automatización. Explica el problema que resuelve.',
          },
          confidence: {
            type: 'string',
            description: 'Nivel de confianza de 0 a 1 (ej: 0.85). Usa valores altos solo si estás muy seguro.',
          },
        },
        required: ['name', 'description', 'section_id', 'trigger_type', 'actions', 'reason', 'confidence'],
      },
      handler: async (params) => {
        const userId = params._userId;

        try {
          // Validar que la sección existe y pertenece al usuario
          const section = await prisma.section.findFirst({
            where: {
              id: params.section_id as string,
              room: { userId },
            },
            include: {
              devices: true,
            },
          });

          if (!section) {
            return {
              success: false,
              error: `La sección con ID "${params.section_id}" no existe o no te pertenece`,
            };
          }

          // Parsear acciones
          let actions: Array<{
            device_id: string;
            action_type: string;
            duration?: number;
            delay_minutes?: number;
          }>;
          
          try {
            actions = JSON.parse(params.actions as string);
          } catch {
            return {
              success: false,
              error: 'El formato de "actions" no es un JSON válido',
            };
          }

          if (!actions || actions.length === 0) {
            return {
              success: false,
              error: 'Debes proporcionar al menos una acción',
            };
          }

          // Validar que los dispositivos de las acciones existen
          for (const action of actions) {
            const device = section.devices.find(d => d.id === action.device_id);
            if (!device) {
              return {
                success: false,
                error: `El dispositivo "${action.device_id}" no existe en la sección "${section.name}"`,
              };
            }
          }

          // Parsear condiciones si existen
          let conditions: Array<{
            device_id: string;
            property: string;
            operator: string;
            value: number;
            value_max?: number;
            logic_operator?: string;
          }> = [];

          if (params.conditions) {
            try {
              conditions = JSON.parse(params.conditions as string);
            } catch {
              return {
                success: false,
                error: 'El formato de "conditions" no es un JSON válido',
              };
            }

            // Validar que los dispositivos de las condiciones existen
            for (const condition of conditions) {
              const device = section.devices.find(d => d.id === condition.device_id);
              if (!device) {
                return {
                  success: false,
                  error: `El dispositivo "${condition.device_id}" para condición no existe en la sección "${section.name}"`,
                };
              }
            }
          }

          // Parsear días de la semana
          const daysOfWeek = params.days_of_week
            ? (params.days_of_week as string).split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d))
            : [];

          // Parsear horas específicas
          const specificTimes = params.specific_times
            ? (params.specific_times as string).split(',').map(t => t.trim())
            : [];

          // Construir el contexto que tenía la IA cuando propuso esto
          const contextSnapshot = {
            proposedAt: new Date().toISOString(),
            sectionName: section.name,
            devicesInSection: section.devices.map(d => ({ id: d.id, name: d.name, type: d.type })),
            conditionsCount: conditions.length,
            actionsCount: actions.length,
          };

          // Crear la automatización con estado PENDING_APPROVAL
          const automation = await prisma.automation.create({
            data: {
              name: params.name as string,
              description: params.description as string,
              sectionId: section.id,
              status: AutomationStatus.PENDING_APPROVAL,
              triggerType: params.trigger_type as TriggerType,
              scheduleType: params.schedule_type ? (params.schedule_type as ScheduleType) : null,
              activeStartTime: params.active_start_time as string || null,
              activeEndTime: params.active_end_time as string || null,
              intervalMinutes: params.interval_minutes ? parseInt(params.interval_minutes as string) : null,
              specificTimes,
              actionDuration: params.action_duration ? parseInt(params.action_duration as string) : null,
              daysOfWeek,
              interval: 5, // Intervalo de evaluación por defecto
              priority: 0,
              notifications: true,
              // Campos de propuesta IA
              proposedByAI: true,
              aiReason: params.reason as string,
              aiConfidence: parseFloat(params.confidence as string) || 0.5,
              aiContextSnapshot: contextSnapshot,
              proposedAt: new Date(),
              // Crear condiciones
              ...(conditions.length > 0 && {
                conditions: {
                  create: conditions.map((c, index) => ({
                    deviceId: c.device_id,
                    property: c.property,
                    operator: c.operator as ConditionOperator,
                    value: c.value,
                    valueMax: c.value_max,
                    logicOperator: c.logic_operator || 'AND',
                    order: index,
                  })),
                },
              }),
              // Crear acciones
              actions: {
                create: actions.map((a, index) => ({
                  deviceId: a.device_id,
                  actionType: a.action_type as ActionType,
                  duration: a.duration,
                  delayMinutes: a.delay_minutes,
                  order: index,
                })),
              },
            },
            include: {
              section: true,
              conditions: { include: { device: true } },
              actions: { include: { device: true } },
            },
          });

          return {
            success: true,
            message: `Automatización "${automation.name}" propuesta exitosamente. Está pendiente de aprobación.`,
            automation: {
              id: automation.id,
              name: automation.name,
              description: automation.description,
              section: automation.section.name,
              status: automation.status,
              triggerType: automation.triggerType,
              scheduleType: automation.scheduleType,
              conditions: automation.conditions.map(c => ({
                device: c.device.name,
                property: c.property,
                operator: c.operator,
                value: c.value,
                valueMax: c.valueMax,
              })),
              actions: automation.actions.map(a => ({
                device: a.device?.name,
                actionType: a.actionType,
                duration: a.duration,
              })),
              aiReason: automation.aiReason,
              aiConfidence: automation.aiConfidence,
            },
            nextSteps: 'El usuario debe revisar y aprobar esta automatización en la sección de Automatizaciones de la aplicación.',
          };
        } catch (error) {
          return {
            success: false,
            error: `Error al crear la propuesta: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          };
        }
      },
    },

    // ==================== GET_PENDING_PROPOSALS ====================
    {
      name: 'get_pending_proposals',
      description: 'Obtiene las automatizaciones propuestas por IA que están pendientes de aprobación',
      parameters: {
        type: 'object',
        properties: {
          section_name: {
            type: 'string',
            description: 'Filtrar por nombre de sección (opcional)',
          },
        },
        required: [],
      },
      handler: async (params) => {
        const userId = params._userId;

        // Construir filtro de sección
        const sectionFilter: { room: { userId: string }; name?: { contains: string; mode: 'insensitive' } } = {
          room: { userId },
        };
        if (params.section_name) {
          sectionFilter.name = { contains: params.section_name as string, mode: 'insensitive' as const };
        }

        const pendingAutomations = await prisma.automation.findMany({
          where: {
            status: AutomationStatus.PENDING_APPROVAL,
            proposedByAI: true,
            section: sectionFilter,
          },
          include: {
            section: true,
            conditions: { include: { device: true } },
            actions: { include: { device: true } },
          },
          orderBy: { proposedAt: 'desc' },
        });

        return {
          count: pendingAutomations.length,
          proposals: pendingAutomations.map(auto => ({
            id: auto.id,
            name: auto.name,
            description: auto.description,
            section: auto.section.name,
            triggerType: auto.triggerType,
            scheduleType: auto.scheduleType,
            aiReason: auto.aiReason,
            aiConfidence: auto.aiConfidence,
            proposedAt: auto.proposedAt?.toISOString(),
            conditions: auto.conditions.map(c => `${c.device.name} ${c.property} ${c.operator} ${c.value}`),
            actions: auto.actions.map(a => `${a.actionType} ${a.device?.name || 'N/A'}`),
          })),
        };
      },
    },

    // ==================== GET_SYSTEM_CAPABILITIES ====================
    {
      name: 'get_system_capabilities',
      description: `Obtiene las capacidades del sistema para saber qué dispositivos puedes automatizar.
SIEMPRE usa esta herramienta ANTES de proponer automatizaciones para conocer:
- Qué sensores hay disponibles y qué pueden medir
- Qué dispositivos son controlables
- Qué dispositivos ya tienen automatización
- Qué oportunidades (gaps) hay para nuevas automatizaciones`,
      parameters: {
        type: 'object',
        properties: {
          section_name: {
            type: 'string',
            description: 'Filtrar por nombre de sección (opcional)',
          },
        },
        required: [],
      },
      handler: async (params) => {
        const userId = params._userId;

        // Importar dinámicamente para evitar dependencia circular
        const { ContextBuilderService } = await import('../context-builder.service');
        const contextBuilder = new ContextBuilderService(prisma);
        
        const capabilities = await contextBuilder.analyzeSystemCapabilities(userId);

        // Filtrar por sección si se especifica
        if (params.section_name) {
          const sectionName = (params.section_name as string).toLowerCase();
          capabilities.sections = capabilities.sections.filter(
            s => s.sectionName.toLowerCase().includes(sectionName)
          );
        }

        return capabilities;
      },
    },
  ];
}

