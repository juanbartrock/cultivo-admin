import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JobType, JobStatus, Prisma } from '@prisma/client';

export interface ScheduleJobParams {
  type: JobType;
  deviceId: string;
  delayMinutes: number;
  automationId?: string;
  executionId?: string;
  payload?: Record<string, unknown>;
  maxAttempts?: number;
}

@Injectable()
export class JobSchedulerService {
  private readonly logger = new Logger(JobSchedulerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Programa un job para apagar un dispositivo después de X minutos
   */
  async scheduleDeviceOff(params: {
    deviceId: string;
    delayMinutes: number;
    automationId?: string;
    executionId?: string;
  }) {
    return this.scheduleJob({
      type: JobType.DEVICE_OFF,
      deviceId: params.deviceId,
      delayMinutes: params.delayMinutes,
      automationId: params.automationId,
      executionId: params.executionId,
    });
  }

  /**
   * Programa un job para encender un dispositivo después de X minutos
   */
  async scheduleDeviceOn(params: {
    deviceId: string;
    delayMinutes: number;
    automationId?: string;
    executionId?: string;
  }) {
    return this.scheduleJob({
      type: JobType.DEVICE_ON,
      deviceId: params.deviceId,
      delayMinutes: params.delayMinutes,
      automationId: params.automationId,
      executionId: params.executionId,
    });
  }

  /**
   * Programa un job genérico con delay
   */
  async scheduleJob(params: ScheduleJobParams) {
    const runAt = new Date(Date.now() + params.delayMinutes * 60 * 1000);
    
    // Generar clave de idempotencia para evitar duplicados
    // Basada en: tipo + dispositivo + ejecución (si existe)
    const idempotencyKey = params.executionId
      ? `${params.type}-${params.deviceId}-${params.executionId}`
      : `${params.type}-${params.deviceId}-${runAt.getTime()}`;

    try {
      const job = await this.prisma.scheduledJob.upsert({
        where: { idempotencyKey },
        create: {
        type: params.type,
        deviceId: params.deviceId,
        automationId: params.automationId,
        executionId: params.executionId,
        runAt,
        maxAttempts: params.maxAttempts ?? 3,
        payload: params.payload as Prisma.InputJsonValue ?? Prisma.JsonNull,
        idempotencyKey,
      },
        update: {}, // Si ya existe, no hacer nada (idempotencia)
      });

      this.logger.log(
        `Scheduled job ${job.id}: ${params.type} for device ${params.deviceId} at ${runAt.toISOString()}`,
      );

      return job;
    } catch (error) {
      this.logger.error(`Error scheduling job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancela un job pendiente por su ID
   */
  async cancelJob(jobId: string) {
    const job = await this.prisma.scheduledJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== JobStatus.PENDING) {
      throw new Error(`Cannot cancel job ${jobId} with status ${job.status}`);
    }

    return this.prisma.scheduledJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.CANCELLED,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Cancela todos los jobs pendientes para un dispositivo específico
   */
  async cancelJobsForDevice(deviceId: string) {
    const result = await this.prisma.scheduledJob.updateMany({
      where: {
        deviceId,
        status: JobStatus.PENDING,
      },
      data: {
        status: JobStatus.CANCELLED,
        completedAt: new Date(),
      },
    });

    this.logger.log(`Cancelled ${result.count} pending jobs for device ${deviceId}`);
    return result;
  }

  /**
   * Cancela todos los jobs pendientes para una ejecución de automatización
   */
  async cancelJobsForExecution(executionId: string) {
    const result = await this.prisma.scheduledJob.updateMany({
      where: {
        executionId,
        status: JobStatus.PENDING,
      },
      data: {
        status: JobStatus.CANCELLED,
        completedAt: new Date(),
      },
    });

    this.logger.log(`Cancelled ${result.count} pending jobs for execution ${executionId}`);
    return result;
  }

  /**
   * Obtiene jobs pendientes para un dispositivo
   */
  async getPendingJobsForDevice(deviceId: string) {
    return this.prisma.scheduledJob.findMany({
      where: {
        deviceId,
        status: JobStatus.PENDING,
      },
      orderBy: { runAt: 'asc' },
    });
  }
}
