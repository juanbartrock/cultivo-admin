import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { EventType, TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Eventos que puede escribir una tarea manual al completarse. */
export const TASK_EVENT_TYPES = [
  EventType.PODA,
  EventType.NOTA,
  EventType.CAMBIO_MACETA,
  EventType.TRANSPLANTE,
  EventType.CAMBIO_FOTOPERIODO,
] as const;

export class CreateTaskDto {
  @ApiProperty({ description: 'Carpa de la tarea' })
  @IsUUID()
  sectionId: string;

  @ApiProperty({ example: 'Topping 043, 061, 049, 067 y 045' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'La 068 solo LST' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  detail?: string | null;

  @ApiPropertyOptional({ description: 'Día en que toca (YYYY-MM-DD, hora local)', example: '2026-11-02' })
  @Matches(DATE_KEY, { message: 'dueDate tiene que ser YYYY-MM-DD' })
  @IsOptional()
  dueDate?: string | null;

  @ApiPropertyOptional({ description: 'Plantas a las que se les escribe el evento' })
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMaxSize(50)
  @IsOptional()
  plantIds?: string[];

  @ApiPropertyOptional({ enum: TASK_EVENT_TYPES, description: 'Evento que escribe al completarse' })
  @IsIn(TASK_EVENT_TYPES)
  @IsOptional()
  eventType?: EventType | null;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({ enum: [TaskStatus.PENDING, TaskStatus.SKIPPED], description: 'Reabrir u omitir' })
  @IsIn([TaskStatus.PENDING, TaskStatus.SKIPPED])
  @IsOptional()
  status?: TaskStatus;
}

export class CompleteTaskDto {
  @ApiPropertyOptional({ example: 'Corte arriba del 5.º nudo' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  note?: string;
}

export class CompletePreventionDto {
  @ApiProperty({ description: 'Carpa' })
  @IsUUID()
  sectionId: string;

  @ApiProperty({ description: 'Clave de la aplicación de hoy, tal como la devuelve GET /agenda/today' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  key: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  note?: string;
}

export class WateringNutrientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(50)
  dose: string;
}

export class RegisterWateringDto {
  @ApiProperty({ description: 'Carpa' })
  @IsUUID()
  sectionId: string;

  @ApiProperty({ description: 'Plantas regadas' })
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMaxSize(50)
  plantIds: string[];

  @ApiPropertyOptional({ description: 'Litros por planta', example: 1.5 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  liters?: number;

  @ApiPropertyOptional({ example: 6.3 })
  @IsNumber()
  @Min(0)
  @Max(14)
  @IsOptional()
  ph?: number;

  @ApiPropertyOptional({ example: 0.8 })
  @IsNumber()
  @Min(0)
  @Max(10)
  @IsOptional()
  ec?: number;

  @ApiPropertyOptional({ type: [WateringNutrientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WateringNutrientDto)
  @IsOptional()
  nutrients?: WateringNutrientDto[];

  @ApiPropertyOptional({ description: 'pH del drenaje', example: 6.4 })
  @IsNumber()
  @Min(0)
  @Max(14)
  @IsOptional()
  drainPh?: number;

  @ApiPropertyOptional({ description: 'EC del drenaje', example: 1.1 })
  @IsNumber()
  @Min(0)
  @Max(10)
  @IsOptional()
  drainEc?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Semana de alimentación que se cumple con este riego' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  taskKey?: string;
}

