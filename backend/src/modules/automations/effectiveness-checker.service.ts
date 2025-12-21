import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { DevicesService } from '../devices/devices.service';
import { ExecutionStatus, ConditionOperator } from '@prisma/client';

@Injectable()
export class EffectivenessCheckerService {
  private readonly logger = new Logger(EffectivenessCheckerService.name);
  private isRunning = false;

  constructor(
    private prisma: PrismaService,
    private devicesService: DevicesService,
  ) {}

  /**
   * Cron job que se ejecuta cada 15 minutos para verificar efectividad
   */
  @Cron('*/15 * * * *') // Cada 15 minutos
  async checkEffectiveness() {
    if (this.isRunning) {
      this.logger.debug('Effectiveness check already running, skipping...');
      return;
    }

    this.isRunning = true;
    this.logger.debug('Starting effectiveness check cycle...');

    try {
      // Obtener ejecuciones completadas en las últimas 2 horas sin verificación reciente
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      const fifteenMinutesAgo = new Date();
      fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

      const executionsToCheck = await this.prisma.automationExecution.findMany({
        where: {
          status: ExecutionStatus.COMPLETED,
          startedAt: { gte: twoHoursAgo },
          // Excluir las que ya tienen un check reciente
          effectivenessChecks: {
            none: {
              checkedAt: { gte: fifteenMinutesAgo },
            },
          },
        },
        include: {
          automation: {
            include: {
              conditions: {
                include: { device: true },
              },
            },
          },
        },
      });

      this.logger.debug(`Found ${executionsToCheck.length} executions to check`);

      for (const execution of executionsToCheck) {
        try {
          await this.checkExecutionEffectiveness(execution);
        } catch (error) {
          this.logger.error(
            `Error checking effectiveness for execution ${execution.id}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error in effectiveness check cycle: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Verifica la efectividad de una ejecución específica
   */
  private async checkExecutionEffectiveness(
    execution: {
      id: string;
      automation: {
        id: string;
        name: string;
        conditions: Array<{
          id: string;
          deviceId: string;
          property: string;
          operator: ConditionOperator;
          value: number;
          valueMax: number | null;
          device: { id: string; name: string };
        }>;
      };
    },
  ) {
    this.logger.debug(
      `Checking effectiveness for execution ${execution.id} of automation ${execution.automation.name}`,
    );

    // Para cada condición, verificar si el objetivo se cumplió
    for (const condition of execution.automation.conditions) {
      try {
        const { status } = await this.devicesService.getDeviceStatus(condition.deviceId);
        
        let currentValue: number | null = null;
        
        // Extraer el valor actual según la propiedad
        if (condition.property === 'temperature' && status.temperature !== undefined) {
          currentValue = status.temperature;
        } else if (condition.property === 'humidity' && status.humidity !== undefined) {
          currentValue = status.humidity;
        } else if (condition.property === 'state') {
          currentValue = status.state === 'on' ? 1 : 0;
        }

        // Determinar si el objetivo se cumplió
        // La lógica es inversa: si la automatización se disparó porque X > 70,
        // queremos verificar que ahora X <= 70 (el objetivo se cumplió)
        let conditionMet = false;
        let targetValue = condition.value;

        if (currentValue !== null) {
          switch (condition.operator) {
            case ConditionOperator.GREATER_THAN:
              // Si se disparó porque temp > 30, el objetivo es temp <= 30
              conditionMet = currentValue <= condition.value;
              break;
            case ConditionOperator.LESS_THAN:
              // Si se disparó porque temp < 20, el objetivo es temp >= 20
              conditionMet = currentValue >= condition.value;
              break;
            case ConditionOperator.EQUALS:
              // Si se disparó porque era igual a X, verificar que sigue igual
              conditionMet = currentValue === condition.value;
              break;
            case ConditionOperator.NOT_EQUALS:
              // Si se disparó porque no era X, verificar que ahora es X
              conditionMet = currentValue === condition.value;
              break;
            case ConditionOperator.BETWEEN:
              // Si se disparó porque estaba dentro del rango, verificar que salió
              conditionMet = currentValue < condition.value || 
                            currentValue > (condition.valueMax ?? condition.value);
              break;
            case ConditionOperator.OUTSIDE:
              // Si se disparó porque estaba fuera del rango, verificar que entró
              conditionMet = currentValue >= condition.value && 
                            currentValue <= (condition.valueMax ?? condition.value);
              targetValue = (condition.value + (condition.valueMax ?? condition.value)) / 2;
              break;
          }
        }

        // Crear registro de verificación
        await this.prisma.effectivenessCheck.create({
          data: {
            execution: { connect: { id: execution.id } },
            conditionMet,
            valueAtCheck: currentValue,
            targetValue,
            notes: `Check for ${condition.property} on device ${condition.device.name}`,
          },
        });

        this.logger.debug(
          `Effectiveness check for ${condition.property}: current=${currentValue}, target=${targetValue}, met=${conditionMet}`,
        );
      } catch (error) {
        this.logger.error(
          `Error checking device ${condition.deviceId}: ${error.message}`,
        );

        // Registrar el check como fallido
        await this.prisma.effectivenessCheck.create({
          data: {
            execution: { connect: { id: execution.id } },
            conditionMet: false,
            notes: `Error checking device: ${error.message}`,
          },
        });
      }
    }
  }

  /**
   * Obtiene el estado del checker
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheck: new Date(),
    };
  }
}









