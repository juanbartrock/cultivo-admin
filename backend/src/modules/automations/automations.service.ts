import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DevicesService } from '../devices/devices.service';
import { 
  CreateAutomationDto, 
  UpdateAutomationDto,
  CreateConditionDto,
  CreateActionDto 
} from './dto/automation.dto';
import { 
  AutomationStatus, 
  ExecutionStatus,
  ConditionOperator,
  ActionType,
  TriggerType,
  ScheduleType,
  Prisma 
} from '@prisma/client';

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    private prisma: PrismaService,
    private devicesService: DevicesService,
  ) {}

  /**
   * Lista todas las automatizaciones
   */
  async findAll(sectionId?: string) {
    return this.prisma.automation.findMany({
      where: sectionId ? { sectionId } : undefined,
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
        dependsOn: true,
        _count: {
          select: { executions: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Obtiene una automatización por ID
   */
  async findById(id: string) {
    const automation = await this.prisma.automation.findUnique({
      where: { id },
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
        dependsOn: true,
        dependents: true,
        executions: {
          take: 10,
          orderBy: { startedAt: 'desc' },
          include: {
            effectivenessChecks: {
              orderBy: { checkedAt: 'desc' },
            },
          },
        },
      },
    });

    if (!automation) {
      throw new NotFoundException(`Automation with ID ${id} not found`);
    }

    return automation;
  }

  /**
   * Crea una nueva automatización
   */
  async create(data: CreateAutomationDto) {
    // Verificar que la sección existe
    const section = await this.prisma.section.findUnique({
      where: { id: data.sectionId },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${data.sectionId} not found`);
    }

    // Verificar que los dispositivos de las condiciones existen (solo si tienen deviceId)
    if (data.conditions) {
      for (const condition of data.conditions) {
        if (condition.deviceId) {
          await this.devicesService.findById(condition.deviceId);
        }
      }
    }

    // Verificar que los dispositivos de las acciones existen
    for (const action of data.actions) {
      await this.devicesService.findById(action.deviceId);
    }

    // Verificar dependencia si existe
    if (data.dependsOnId) {
      await this.findById(data.dependsOnId);
    }

    const triggerType = data.triggerType || TriggerType.CONDITION;

    return this.prisma.automation.create({
      data: {
        name: data.name,
        description: data.description,
        section: { connect: { id: data.sectionId } },
        triggerType,
        scheduleType: data.scheduleType,
        activeStartTime: data.activeStartTime,
        activeEndTime: data.activeEndTime,
        intervalMinutes: data.intervalMinutes,
        actionDuration: data.actionDuration,
        specificTimes: data.specificTimes || [],
        daysOfWeek: data.daysOfWeek || [],
        interval: data.evaluationInterval || 5, // Usar campo existente 'interval'
        startTime: data.startTime,
        endTime: data.endTime,
        priority: data.priority || 0,
        allowOverlap: data.allowOverlap ?? true,
        notifications: data.notifications ?? true,
        ...(data.dependsOnId && {
          dependsOn: { connect: { id: data.dependsOnId } },
        }),
        ...(data.conditions && data.conditions.length > 0 && {
          conditions: {
            create: data.conditions.map((c, index) => ({
              device: { connect: { id: c.deviceId } },
              property: c.property,
              operator: c.operator,
              value: c.value ?? 0,
              valueMax: c.valueMax,
              timeValue: c.timeValue,
              timeValueMax: c.timeValueMax,
              logicOperator: c.logicOperator || 'AND',
              order: c.order ?? index,
            })),
          },
        }),
        actions: {
          create: data.actions.map((a, index) => ({
            device: { connect: { id: a.deviceId } },
            actionType: a.actionType,
            duration: a.duration,
            delayMinutes: a.delayMinutes,
            value: a.value,
            order: a.order ?? index,
          })),
        },
      },
      include: {
        section: true,
        conditions: { include: { device: true } },
        actions: { include: { device: true } },
      },
    });
  }

  /**
   * Actualiza una automatización
   */
  async update(id: string, data: UpdateAutomationDto) {
    await this.findById(id);

    // Si se actualizan condiciones, eliminar las existentes y crear nuevas
    if (data.conditions) {
      await this.prisma.automationCondition.deleteMany({
        where: { automationId: id },
      });
    }

    // Si se actualizan acciones, eliminar las existentes y crear nuevas
    if (data.actions) {
      await this.prisma.automationAction.deleteMany({
        where: { automationId: id },
      });
    }

    return this.prisma.automation.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status && { status: data.status }),
        ...(data.triggerType && { triggerType: data.triggerType }),
        ...(data.scheduleType !== undefined && { scheduleType: data.scheduleType }),
        ...(data.activeStartTime !== undefined && { activeStartTime: data.activeStartTime }),
        ...(data.activeEndTime !== undefined && { activeEndTime: data.activeEndTime }),
        ...(data.intervalMinutes !== undefined && { intervalMinutes: data.intervalMinutes }),
        ...(data.actionDuration !== undefined && { actionDuration: data.actionDuration }),
        ...(data.specificTimes && { specificTimes: data.specificTimes }),
        ...(data.daysOfWeek && { daysOfWeek: data.daysOfWeek }),
        ...(data.evaluationInterval !== undefined && { interval: data.evaluationInterval }),
        ...(data.startTime !== undefined && { startTime: data.startTime }),
        ...(data.endTime !== undefined && { endTime: data.endTime }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.allowOverlap !== undefined && { allowOverlap: data.allowOverlap }),
        ...(data.notifications !== undefined && { notifications: data.notifications }),
        ...(data.dependsOnId !== undefined && {
          dependsOn: data.dependsOnId 
            ? { connect: { id: data.dependsOnId } }
            : { disconnect: true },
        }),
        ...(data.conditions && {
          conditions: {
            create: data.conditions.map((c, index) => ({
              device: { connect: { id: c.deviceId } },
              property: c.property,
              operator: c.operator,
              value: c.value ?? 0,
              valueMax: c.valueMax,
              timeValue: c.timeValue,
              timeValueMax: c.timeValueMax,
              logicOperator: c.logicOperator || 'AND',
              order: c.order ?? index,
            })),
          },
        }),
        ...(data.actions && {
          actions: {
            create: data.actions.map((a, index) => ({
              device: { connect: { id: a.deviceId } },
              actionType: a.actionType,
              duration: a.duration,
              delayMinutes: a.delayMinutes,
              value: a.value,
              order: a.order ?? index,
            })),
          },
        }),
      },
      include: {
        section: true,
        conditions: { include: { device: true } },
        actions: { include: { device: true } },
      },
    });
  }

  /**
   * Elimina una automatización
   */
  async delete(id: string) {
    await this.findById(id);
    return this.prisma.automation.delete({ where: { id } });
  }

  /**
   * Cambia el estado de una automatización (activar/pausar/deshabilitar)
   */
  async setStatus(id: string, status: AutomationStatus) {
    await this.findById(id);
    return this.prisma.automation.update({
      where: { id },
      data: { status },
      include: {
        section: true,
        conditions: { include: { device: true } },
        actions: { include: { device: true } },
      },
    });
  }

  /**
   * Verifica si el horario actual está dentro del rango de la automatización
   */
  private isWithinSchedule(automation: {
    daysOfWeek: number[];
    startTime?: string | null;
    endTime?: string | null;
  }): boolean {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Verificar día de la semana
    if (automation.daysOfWeek.length > 0 && !automation.daysOfWeek.includes(currentDay)) {
      return false;
    }

    // Verificar hora de inicio/fin
    if (automation.startTime && currentTime < automation.startTime) {
      return false;
    }
    if (automation.endTime && currentTime > automation.endTime) {
      return false;
    }

    return true;
  }

  /**
   * Verifica si es momento de ejecutar una automatización programada
   */
  private shouldExecuteScheduled(automation: {
    scheduleType: ScheduleType | null;
    activeStartTime?: string | null;
    activeEndTime?: string | null;
    intervalMinutes?: number | null;
    specificTimes: string[];
    lastEvaluatedAt?: Date | null;
  }): { shouldExecute: boolean; actionType: 'on' | 'off' | null } {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    switch (automation.scheduleType) {
      case ScheduleType.TIME_RANGE: {
        // Determinar si debe estar ON u OFF basado en el rango horario
        const isWithinRange = automation.activeStartTime && automation.activeEndTime
          ? currentTime >= automation.activeStartTime && currentTime < automation.activeEndTime
          : false;
        
        return { shouldExecute: true, actionType: isWithinRange ? 'on' : 'off' };
      }

      case ScheduleType.INTERVAL: {
        // Verificar si pasó el intervalo desde la última ejecución
        if (!automation.intervalMinutes) return { shouldExecute: false, actionType: null };
        
        if (automation.lastEvaluatedAt) {
          const minutesSinceLastEval = (now.getTime() - automation.lastEvaluatedAt.getTime()) / (1000 * 60);
          if (minutesSinceLastEval < automation.intervalMinutes) {
            return { shouldExecute: false, actionType: null };
          }
        }
        return { shouldExecute: true, actionType: 'on' };
      }

      case ScheduleType.SPECIFIC_TIMES: {
        // Verificar si la hora actual coincide con alguna hora específica
        const matchedTime = automation.specificTimes.find(time => {
          // Comparar con un margen de 1 minuto
          const [h, m] = time.split(':').map(Number);
          const [ch, cm] = currentTime.split(':').map(Number);
          return h === ch && Math.abs(m - cm) <= 1;
        });
        
        if (matchedTime) {
          // Verificar que no se haya ejecutado recientemente (últimos 2 minutos)
          if (automation.lastEvaluatedAt) {
            const minutesSinceLastEval = (now.getTime() - automation.lastEvaluatedAt.getTime()) / (1000 * 60);
            if (minutesSinceLastEval < 2) {
              return { shouldExecute: false, actionType: null };
            }
          }
          return { shouldExecute: true, actionType: 'on' };
        }
        return { shouldExecute: false, actionType: null };
      }

      default:
        return { shouldExecute: false, actionType: null };
    }
  }

  /**
   * Evalúa si las condiciones de una automatización se cumplen
   */
  async evaluateConditions(automationId: string): Promise<{
    allMet: boolean;
    results: Array<{
      conditionId: string;
      deviceId: string | null;
      property: string;
      operator: ConditionOperator;
      expectedValue: number;
      actualValue: number | null;
      met: boolean;
    }>;
  }> {
    const automation = await this.findById(automationId);
    const results: Array<{
      conditionId: string;
      deviceId: string | null;
      property: string;
      operator: ConditionOperator;
      expectedValue: number;
      actualValue: number | null;
      met: boolean;
    }> = [];

    // Si no hay condiciones, se considera que todas están cumplidas
    if (automation.conditions.length === 0) {
      return { allMet: true, results: [] };
    }

    let previousResult = true;
    let previousLogicOperator = 'AND';

    for (const condition of automation.conditions) {
      let actualValue: number | null = null;
      let met = false;

      try {
        // Condición de tiempo
        if (condition.property === 'time') {
          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          actualValue = currentMinutes;

          if (condition.timeValue) {
            const [h, m] = condition.timeValue.split(':').map(Number);
            const targetMinutes = h * 60 + m;
            
            switch (condition.operator) {
              case ConditionOperator.GREATER_THAN:
                met = currentMinutes > targetMinutes;
                break;
              case ConditionOperator.LESS_THAN:
                met = currentMinutes < targetMinutes;
                break;
              case ConditionOperator.EQUALS:
                met = Math.abs(currentMinutes - targetMinutes) <= 1; // Margen de 1 minuto
                break;
              case ConditionOperator.BETWEEN:
                if (condition.timeValueMax) {
                  const [h2, m2] = condition.timeValueMax.split(':').map(Number);
                  const maxMinutes = h2 * 60 + m2;
                  met = currentMinutes >= targetMinutes && currentMinutes <= maxMinutes;
                }
                break;
            }
          }
        }
        // Condición de dispositivo
        else if (condition.deviceId) {
          const { status } = await this.devicesService.getDeviceStatus(condition.deviceId);
          
          // Extraer el valor de la propiedad
          if (condition.property === 'temperature' && status.temperature !== undefined) {
            actualValue = status.temperature;
          } else if (condition.property === 'humidity' && status.humidity !== undefined) {
            actualValue = status.humidity;
          } else if (condition.property === 'state') {
            actualValue = status.state === 'on' ? 1 : 0;
          }

          // Evaluar la condición
          if (actualValue !== null) {
            switch (condition.operator) {
              case ConditionOperator.GREATER_THAN:
                met = actualValue > condition.value;
                break;
              case ConditionOperator.LESS_THAN:
                met = actualValue < condition.value;
                break;
              case ConditionOperator.EQUALS:
                met = actualValue === condition.value;
                break;
              case ConditionOperator.NOT_EQUALS:
                met = actualValue !== condition.value;
                break;
              case ConditionOperator.BETWEEN:
                met = actualValue >= condition.value && 
                      actualValue <= (condition.valueMax ?? condition.value);
                break;
              case ConditionOperator.OUTSIDE:
                met = actualValue < condition.value || 
                      actualValue > (condition.valueMax ?? condition.value);
                break;
            }
          }
        }
      } catch (error) {
        this.logger.error(`Error evaluating condition ${condition.id}: ${error.message}`);
      }

      // Aplicar operador lógico
      if (previousLogicOperator === 'AND') {
        previousResult = previousResult && met;
      } else {
        previousResult = previousResult || met;
      }

      previousLogicOperator = condition.logicOperator;

      results.push({
        conditionId: condition.id,
        deviceId: condition.deviceId,
        property: condition.property,
        operator: condition.operator,
        expectedValue: condition.value,
        actualValue,
        met,
      });
    }

    return {
      allMet: previousResult,
      results,
    };
  }

  /**
   * Ejecuta las acciones de una automatización
   */
  async executeActions(automationId: string, skipConditions = false, forceActionType?: 'on' | 'off'): Promise<{
    executionId: string;
    success: boolean;
    results: Array<{
      actionId: string;
      deviceId: string;
      actionType: ActionType;
      success: boolean;
      error?: string;
    }>;
  }> {
    const automation = await this.findById(automationId);

    // Crear registro de ejecución
    const execution = await this.prisma.automationExecution.create({
      data: {
        automation: { connect: { id: automationId } },
        status: ExecutionStatus.RUNNING,
      },
    });

    const actionResults: Array<{
      actionId: string;
      deviceId: string;
      actionType: ActionType;
      success: boolean;
      error?: string;
    }> = [];

    // Verificar condiciones primero (si no se omiten)
    let conditionResults = null;
    if (!skipConditions && automation.conditions.length > 0) {
      conditionResults = await this.evaluateConditions(automationId);
      
      if (!conditionResults.allMet) {
        // Actualizar ejecución como cancelada
        await this.prisma.automationExecution.update({
          where: { id: execution.id },
          data: {
            status: ExecutionStatus.CANCELLED,
            endedAt: new Date(),
            triggeredConditions: conditionResults.results as unknown as Prisma.InputJsonValue,
            errorMessage: 'Conditions not met',
          },
        });

        return {
          executionId: execution.id,
          success: false,
          results: [],
        };
      }
    }

    // Ejecutar cada acción
    for (const action of automation.actions) {
      try {
        // Si hay un delay, esperar
        if (action.delayMinutes && action.delayMinutes > 0) {
          await new Promise(resolve => setTimeout(resolve, (action.delayMinutes ?? 0) * 60 * 1000));
        }

        let success = false;
        let effectiveActionType = action.actionType;

        // Si se fuerza un tipo de acción (para TIME_RANGE), sobreescribir
        if (forceActionType) {
          effectiveActionType = forceActionType === 'on' ? ActionType.TURN_ON : ActionType.TURN_OFF;
        }

        switch (effectiveActionType) {
          case ActionType.TURN_ON:
            await this.devicesService.controlDevice(action.deviceId, 'on');
            success = true;
            
            // Si tiene duración, programar apagado
            if (action.duration || automation.actionDuration) {
              const durationMinutes = action.duration || automation.actionDuration;
              setTimeout(async () => {
                try {
                  await this.devicesService.controlDevice(action.deviceId, 'off');
                  this.logger.log(`Device ${action.deviceId} turned off after ${durationMinutes} minutes`);
                } catch (error) {
                  this.logger.error(`Error turning off device ${action.deviceId}: ${error.message}`);
                }
              }, (durationMinutes ?? 0) * 60 * 1000);
            }
            break;
          case ActionType.TURN_OFF:
            await this.devicesService.controlDevice(action.deviceId, 'off');
            success = true;
            break;
          case ActionType.TOGGLE:
            const { status } = await this.devicesService.getDeviceStatus(action.deviceId);
            const newState = status.state === 'on' ? 'off' : 'on';
            await this.devicesService.controlDevice(action.deviceId, newState);
            success = true;
            break;
          case ActionType.CAPTURE_PHOTO:
            await this.devicesService.captureSnapshot(action.deviceId);
            success = true;
            break;
          case ActionType.TRIGGER_IRRIGATION:
            await this.devicesService.controlDevice(action.deviceId, 'on');
            success = true;
            
            // Si tiene duración, apagar después
            if (action.duration) {
              setTimeout(async () => {
                try {
                  await this.devicesService.controlDevice(action.deviceId, 'off');
                  this.logger.log(`Irrigation device ${action.deviceId} turned off after ${action.duration} minutes`);
                } catch (error) {
                  this.logger.error(`Error turning off irrigation ${action.deviceId}: ${error.message}`);
                }
              }, action.duration * 60 * 1000);
            }
            break;
        }

        actionResults.push({
          actionId: action.id,
          deviceId: action.deviceId,
          actionType: effectiveActionType,
          success,
        });
      } catch (error) {
        actionResults.push({
          actionId: action.id,
          deviceId: action.deviceId,
          actionType: action.actionType,
          success: false,
          error: error.message,
        });
      }
    }

    const allSuccessful = actionResults.every(r => r.success);

    // Actualizar registro de ejecución
    await this.prisma.automationExecution.update({
      where: { id: execution.id },
      data: {
        status: allSuccessful ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED,
        endedAt: new Date(),
        triggeredConditions: conditionResults?.results as unknown as Prisma.InputJsonValue,
        executedActions: actionResults as unknown as Prisma.InputJsonValue,
        errorMessage: allSuccessful ? null : 'Some actions failed',
      },
    });

    // Actualizar última evaluación
    await this.prisma.automation.update({
      where: { id: automationId },
      data: { lastEvaluatedAt: new Date() },
    });

    return {
      executionId: execution.id,
      success: allSuccessful,
      results: actionResults,
    };
  }

  /**
   * Obtiene el historial de ejecuciones
   */
  async getExecutions(automationId: string, limit = 50, from?: Date, to?: Date) {
    await this.findById(automationId);

    return this.prisma.automationExecution.findMany({
      where: {
        automationId,
        ...(from || to ? {
          startedAt: {
            ...(from && { gte: from }),
            ...(to && { lte: to }),
          },
        } : {}),
      },
      include: {
        effectivenessChecks: {
          orderBy: { checkedAt: 'asc' },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Calcula estadísticas de efectividad
   */
  async getEffectivenessStats(automationId: string, days = 30) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const executions = await this.prisma.automationExecution.findMany({
      where: {
        automationId,
        startedAt: { gte: fromDate },
      },
      include: {
        effectivenessChecks: true,
      },
    });

    const totalExecutions = executions.length;
    const completedExecutions = executions.filter(e => e.status === ExecutionStatus.COMPLETED).length;
    const failedExecutions = executions.filter(e => e.status === ExecutionStatus.FAILED).length;
    
    // Calcular efectividad basada en los checks
    const allChecks = executions.flatMap(e => e.effectivenessChecks);
    const checksWithGoalMet = allChecks.filter(c => c.conditionMet).length;
    const effectivenessRate = allChecks.length > 0 
      ? (checksWithGoalMet / allChecks.length) * 100 
      : 0;

    return {
      period: `${days} days`,
      totalExecutions,
      completedExecutions,
      failedExecutions,
      cancelledExecutions: totalExecutions - completedExecutions - failedExecutions,
      totalEffectivenessChecks: allChecks.length,
      checksWithGoalMet,
      effectivenessRate: Math.round(effectivenessRate * 100) / 100,
    };
  }

  /**
   * Obtiene automatizaciones activas que deben evaluarse
   */
  async getAutomationsToEvaluate(): Promise<Array<{
    id: string;
    name: string;
    triggerType: TriggerType;
    scheduleType: ScheduleType | null;
    interval: number;
    lastEvaluatedAt: Date | null;
    shouldExecute: boolean;
    actionType: 'on' | 'off' | null;
  }>> {
    const now = new Date();

    const automations = await this.prisma.automation.findMany({
      where: {
        status: AutomationStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        triggerType: true,
        scheduleType: true,
        interval: true,
        lastEvaluatedAt: true,
        daysOfWeek: true,
        startTime: true,
        endTime: true,
        activeStartTime: true,
        activeEndTime: true,
        intervalMinutes: true,
        specificTimes: true,
      },
    });

    return automations.map(automation => {
      // Primero verificar si está dentro del horario permitido
      if (!this.isWithinSchedule(automation)) {
        return {
          id: automation.id,
          name: automation.name,
          triggerType: automation.triggerType,
          scheduleType: automation.scheduleType,
          interval: automation.interval,
          lastEvaluatedAt: automation.lastEvaluatedAt,
          shouldExecute: false,
          actionType: null,
        };
      }

      // Según el tipo de trigger
      if (automation.triggerType === TriggerType.SCHEDULED) {
        const { shouldExecute, actionType } = this.shouldExecuteScheduled(automation);
        return {
          id: automation.id,
          name: automation.name,
          triggerType: automation.triggerType,
          scheduleType: automation.scheduleType,
          interval: automation.interval,
          lastEvaluatedAt: automation.lastEvaluatedAt,
          shouldExecute,
          actionType,
        };
      }

      // Para CONDITION y HYBRID, verificar intervalo de evaluación
      if (automation.lastEvaluatedAt) {
        const minutesSinceLastEval = (now.getTime() - automation.lastEvaluatedAt.getTime()) / (1000 * 60);
        if (minutesSinceLastEval < automation.interval) {
          return {
            id: automation.id,
            name: automation.name,
            triggerType: automation.triggerType,
            scheduleType: automation.scheduleType,
            interval: automation.interval,
            lastEvaluatedAt: automation.lastEvaluatedAt,
            shouldExecute: false,
            actionType: null,
          };
        }
      }

      return {
        id: automation.id,
        name: automation.name,
        triggerType: automation.triggerType,
        scheduleType: automation.scheduleType,
        interval: automation.interval,
        lastEvaluatedAt: automation.lastEvaluatedAt,
        shouldExecute: true,
        actionType: null,
      };
    }).filter(a => a.shouldExecute);
  }
}
