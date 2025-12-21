import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { JobStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class GetJobsQueryDto {
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class JobResponseDto {
  id: string;
  type: string;
  deviceId: string;
  automationId?: string;
  executionId?: string;
  runAt: Date;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export class JobStatsDto {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  dead: number;
  cancelled: number;
}




