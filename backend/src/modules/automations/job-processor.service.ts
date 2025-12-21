import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { DevicesService } from '../devices/devices.service';
import { JobStatus, JobType, ScheduledJob, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class JobProcessorService {
  private readonly logger = new Logger(JobProcessorService.name);
  private readonly workerId = randomUUID();
  private readonly BATCH_SIZE = 10;
  private readonly LOCK_TTL_MS = 60000; // 60 segundos
  private isProcessing = false;

  constructor(
    private prisma: PrismaService,
    private devicesService: DevicesService,
  ) {
    this.logger.log(`JobProcessor initialized with workerId: ${this.workerId}`);
  }

  /**
   * Cron job que se ejecuta cada 10 segundos para procesar jobs pendientes
   */
  @Cron('*/10 * * * * *')
  async processJobs() {
    if (this.isProcessing) {
      this.logger.debug('Job processing already running, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      // Primero, liberar locks expirados (por si un worker murió)
      await this.releaseExpiredLocks();

      // Claim y procesar jobs
      const jobs = await this.claimJobs();
      
      if (jobs.length > 0) {
        this.logger.log(`Processing ${jobs.length} jobs...`);
      }

      for (const job of jobs) {
        await this.processJob(job);
      }
    } catch (error) {
      this.logger.error(`Error in job processing cycle: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Reclama jobs pendientes usando SELECT FOR UPDATE SKIP LOCKED
   * para evitar que múltiples workers procesen el mismo job
   */
  private async claimJobs(): Promise<ScheduledJob[]> {
    const now = new Date();
    
    // Usamos una transacción con raw SQL para el patrón claim
    const jobs = await this.prisma.$queryRaw<ScheduledJob[]>`
      UPDATE scheduled_jobs
      SET 
        status = 'RUNNING'::"JobStatus",
        locked_at = ${now},
        locked_by = ${this.workerId},
        started_at = COALESCE(started_at, ${now}),
        attempts = attempts + 1
      WHERE id IN (
        SELECT id FROM scheduled_jobs
        WHERE status = 'PENDING'::"JobStatus"
          AND run_at <= ${now}
        ORDER BY run_at ASC
        LIMIT ${this.BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `;

    return jobs;
  }

  /**
   * Libera locks que han expirado (por workers que murieron)
   */
  private async releaseExpiredLocks() {
    const expiredBefore = new Date(Date.now() - this.LOCK_TTL_MS);

    const result = await this.prisma.scheduledJob.updateMany({
      where: {
        status: JobStatus.RUNNING,
        lockedAt: { lt: expiredBefore },
      },
      data: {
        status: JobStatus.PENDING,
        lockedAt: null,
        lockedBy: null,
      },
    });

    if (result.count > 0) {
      this.logger.warn(`Released ${result.count} expired locks`);
    }
  }

  /**
   * Procesa un job individual
   */
  private async processJob(job: ScheduledJob) {
    this.logger.debug(`Processing job ${job.id}: ${job.type} for device ${job.deviceId}`);

    try {
      await this.executeJob(job);
      await this.markCompleted(job.id);
      this.logger.log(`Job ${job.id} completed successfully`);
    } catch (error) {
      await this.handleFailure(job, error);
    }
  }

  /**
   * Ejecuta la acción del job según su tipo
   */
  private async executeJob(job: ScheduledJob) {
    switch (job.type) {
      case JobType.DEVICE_ON:
        await this.devicesService.controlDevice(job.deviceId, 'on');
        break;

      case JobType.DEVICE_OFF:
        await this.devicesService.controlDevice(job.deviceId, 'off');
        break;

      case JobType.DEVICE_TOGGLE:
        const { status } = await this.devicesService.getDeviceStatus(job.deviceId);
        const newState = status.state === 'on' ? 'off' : 'on';
        await this.devicesService.controlDevice(job.deviceId, newState);
        break;

      case JobType.CAPTURE_PHOTO:
        await this.devicesService.captureSnapshot(job.deviceId);
        break;

      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  /**
   * Marca un job como completado
   */
  private async markCompleted(jobId: string) {
    await this.prisma.scheduledJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  /**
   * Maneja un fallo en la ejecución del job
   * Implementa backoff exponencial para reintentos
   */
  private async handleFailure(job: ScheduledJob, error: Error) {
    const isMaxAttemptsReached = job.attempts >= job.maxAttempts;
    const nextStatus = isMaxAttemptsReached ? JobStatus.DEAD : JobStatus.PENDING;

    // Backoff exponencial: 1min, 2min, 4min, 8min...
    const backoffMinutes = Math.pow(2, job.attempts - 1);
    const nextRunAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

    await this.prisma.scheduledJob.update({
      where: { id: job.id },
      data: {
        status: nextStatus,
        lastError: error.message,
        lockedAt: null,
        lockedBy: null,
        ...(nextStatus === JobStatus.PENDING && { runAt: nextRunAt }),
        ...(nextStatus === JobStatus.DEAD && { completedAt: new Date() }),
      },
    });

    if (isMaxAttemptsReached) {
      this.logger.error(
        `Job ${job.id} marked as DEAD after ${job.attempts} attempts. Last error: ${error.message}`,
      );
    } else {
      this.logger.warn(
        `Job ${job.id} failed (attempt ${job.attempts}/${job.maxAttempts}), will retry at ${nextRunAt.toISOString()}. Error: ${error.message}`,
      );
    }
  }

  /**
   * Cron para limpiar jobs antiguos (3am cada día)
   */
  @Cron('0 3 * * *')
  async cleanupOldJobs() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.prisma.scheduledJob.deleteMany({
      where: {
        status: { in: [JobStatus.COMPLETED, JobStatus.CANCELLED] },
        completedAt: { lt: thirtyDaysAgo },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} old jobs`);
    }
  }

  // ============================================
  // MÉTODOS PÚBLICOS PARA OBSERVABILIDAD
  // ============================================

  /**
   * Obtiene jobs con filtros opcionales
   */
  async getJobs(params: { status?: JobStatus; limit?: number }) {
    return this.prisma.scheduledJob.findMany({
      where: params.status ? { status: params.status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 50,
    });
  }

  /**
   * Obtiene un job por ID
   */
  async getJobById(id: string) {
    return this.prisma.scheduledJob.findUnique({
      where: { id },
    });
  }

  /**
   * Reintenta un job fallido o muerto
   */
  async retryJob(id: string) {
    const job = await this.prisma.scheduledJob.findUnique({
      where: { id },
    });

    if (!job) {
      throw new Error(`Job ${id} not found`);
    }

    if (job.status !== JobStatus.FAILED && job.status !== JobStatus.DEAD) {
      throw new Error(`Cannot retry job ${id} with status ${job.status}`);
    }

    return this.prisma.scheduledJob.update({
      where: { id },
      data: {
        status: JobStatus.PENDING,
        attempts: 0,
        lastError: null,
        runAt: new Date(),
        completedAt: null,
      },
    });
  }

  /**
   * Cancela un job pendiente
   */
  async cancelJob(id: string) {
    const job = await this.prisma.scheduledJob.findUnique({
      where: { id },
    });

    if (!job) {
      throw new Error(`Job ${id} not found`);
    }

    if (job.status !== JobStatus.PENDING) {
      throw new Error(`Cannot cancel job ${id} with status ${job.status}`);
    }

    return this.prisma.scheduledJob.update({
      where: { id },
      data: {
        status: JobStatus.CANCELLED,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Obtiene estadísticas de jobs
   */
  async getStats() {
    const stats = await this.prisma.scheduledJob.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const result = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      dead: 0,
      cancelled: 0,
    };

    for (const stat of stats) {
      const key = stat.status.toLowerCase() as keyof typeof result;
      result[key] = stat._count.status;
    }

    return result;
  }

  /**
   * Obtiene el estado del procesador
   */
  getProcessorStatus() {
    return {
      workerId: this.workerId,
      isProcessing: this.isProcessing,
      batchSize: this.BATCH_SIZE,
      lockTtlMs: this.LOCK_TTL_MS,
    };
  }
}




