import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AutomationsService } from './automations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationPriority, ExecutionStatus } from '@prisma/client';

@Injectable()
export class AutomationSchedulerService {
  private readonly logger = new Logger(AutomationSchedulerService.name);
  private isRunning = false;

  constructor(
    private prisma: PrismaService,
    private automationsService: AutomationsService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Cron job que se ejecuta cada minuto para evaluar automatizaciones
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async evaluateAutomations() {
    if (this.isRunning) {
      this.logger.debug('Automation evaluation already running, skipping...');
      return;
    }

    this.isRunning = true;
    this.logger.debug('Starting automation evaluation cycle...');

    try {
      // Obtener automatizaciones que deben evaluarse
      const automationsToEvaluate = await this.automationsService.getAutomationsToEvaluate();
      
      this.logger.debug(`Found ${automationsToEvaluate.length} automations to evaluate`);

      for (const automation of automationsToEvaluate) {
        try {
          this.logger.debug(`Evaluating automation: ${automation.name} (${automation.id})`);
          
          // Evaluar condiciones
          const evaluation = await this.automationsService.evaluateConditions(automation.id);
          
          if (evaluation.allMet) {
            this.logger.log(`Conditions met for automation: ${automation.name}, executing actions...`);
            
            // Ejecutar acciones
            const result = await this.automationsService.executeActions(automation.id, true);
            
            if (result.success) {
              this.logger.log(`Automation ${automation.name} executed successfully`);
              
              // Crear notificación si está habilitada
              const fullAutomation = await this.automationsService.findById(automation.id);
              if (fullAutomation.notifications) {
                await this.notificationsService.create({
                  type: NotificationType.AUTOMATION,
                  priority: NotificationPriority.LOW,
                  title: `Automatización ejecutada: ${automation.name}`,
                  message: `La automatización "${automation.name}" se ejecutó correctamente.`,
                  actionUrl: `/automatizaciones?id=${automation.id}`,
                  metadata: {
                    automationId: automation.id,
                    executionId: result.executionId,
                  },
                });
              }
            } else {
              this.logger.warn(`Automation ${automation.name} execution had failures`);
              
              // Crear notificación de error
              await this.notificationsService.create({
                type: NotificationType.ALERT,
                priority: NotificationPriority.HIGH,
                title: `Error en automatización: ${automation.name}`,
                message: `Algunas acciones de la automatización "${automation.name}" fallaron.`,
                actionUrl: `/automatizaciones?id=${automation.id}`,
                metadata: {
                  automationId: automation.id,
                  executionId: result.executionId,
                  failedActions: result.results.filter(r => !r.success),
                },
              });
            }
          } else {
            // Actualizar última evaluación aunque no se hayan cumplido las condiciones
            await this.prisma.automation.update({
              where: { id: automation.id },
              data: { lastEvaluatedAt: new Date() },
            });
          }
        } catch (error) {
          this.logger.error(`Error evaluating automation ${automation.id}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error in automation evaluation cycle: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Obtiene el estado del scheduler
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheck: new Date(),
    };
  }
}




