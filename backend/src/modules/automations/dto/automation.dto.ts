import { IsString, IsOptional, IsArray, IsInt, IsBoolean, IsEnum, ValidateNested, IsNumber, Min, Max, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { AutomationStatus, ConditionOperator, ActionType, TriggerType, ScheduleType } from '@prisma/client';

// DTO para crear una condición
export class CreateConditionDto {
  @IsString()
  deviceId: string; // ID del dispositivo sensor (requerido)

  @IsString()
  property: string; // "temperature", "humidity", "state"

  @IsEnum(ConditionOperator)
  operator: ConditionOperator;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsNumber()
  valueMax?: number; // Para BETWEEN/OUTSIDE

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'timeValue debe tener formato HH:MM' })
  timeValue?: string; // Para condiciones de tiempo "HH:MM"

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'timeValueMax debe tener formato HH:MM' })
  timeValueMax?: string; // Para condiciones de tiempo BETWEEN

  @IsOptional()
  @IsString()
  logicOperator?: string; // "AND" | "OR"

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

// DTO para crear una acción
export class CreateActionDto {
  @IsString()
  deviceId: string;

  @IsEnum(ActionType)
  actionType: ActionType;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number; // Duración en minutos

  @IsOptional()
  @IsInt()
  @Min(0)
  delayMinutes?: number; // Retraso antes de ejecutar

  @IsOptional()
  @IsNumber()
  value?: number; // Valor opcional (brillo, velocidad, etc.)

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

// DTO para crear automatización
export class CreateAutomationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  sectionId: string;

  // Tipo de trigger
  @IsOptional()
  @IsEnum(TriggerType)
  triggerType?: TriggerType;

  // Configuración de programación horaria
  @IsOptional()
  @IsEnum(ScheduleType)
  scheduleType?: ScheduleType;

  // Para TIME_RANGE: horario de activación/desactivación
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'activeStartTime debe tener formato HH:MM' })
  activeStartTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'activeEndTime debe tener formato HH:MM' })
  activeEndTime?: string;

  // Para INTERVAL: repetir cada X tiempo
  @IsOptional()
  @IsInt()
  @Min(1)
  intervalMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  actionDuration?: number;

  // Para SPECIFIC_TIMES: horas específicas del día
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specificTimes?: string[];

  // Días de la semana
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  // Ventana de evaluación (para CONDITION y HYBRID)
  @IsOptional()
  @IsInt()
  @Min(1)
  evaluationInterval?: number; // Cada cuántos minutos evaluar

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'startTime debe tener formato HH:MM' })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'endTime debe tener formato HH:MM' })
  endTime?: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  allowOverlap?: boolean;

  @IsOptional()
  @IsBoolean()
  notifications?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  plantIds?: string[]; // IDs de plantas para registrar eventos (ej: para fotos)

  @IsOptional()
  @IsString()
  dependsOnId?: string;

  // Condiciones (opcionales para SCHEDULED)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConditionDto)
  conditions?: CreateConditionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateActionDto)
  actions: CreateActionDto[];
}

// DTO para actualizar automatización
export class UpdateAutomationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AutomationStatus)
  status?: AutomationStatus;

  @IsOptional()
  @IsEnum(TriggerType)
  triggerType?: TriggerType;

  @IsOptional()
  @IsEnum(ScheduleType)
  scheduleType?: ScheduleType;

  @IsOptional()
  @IsString()
  activeStartTime?: string;

  @IsOptional()
  @IsString()
  activeEndTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  intervalMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  actionDuration?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specificTimes?: string[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  evaluationInterval?: number;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  allowOverlap?: boolean;

  @IsOptional()
  @IsBoolean()
  notifications?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  plantIds?: string[]; // IDs de plantas para registrar eventos (ej: para fotos)

  @IsOptional()
  @IsString()
  dependsOnId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConditionDto)
  conditions?: CreateConditionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateActionDto)
  actions?: CreateActionDto[];
}

// DTO para ejecutar manualmente
export class ExecuteAutomationDto {
  @IsOptional()
  @IsBoolean()
  skipConditions?: boolean; // Ejecutar sin verificar condiciones
}

// DTO para filtrar ejecuciones
export class GetExecutionsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  from?: string; // ISO date string

  @IsOptional()
  @IsString()
  to?: string; // ISO date string
}
