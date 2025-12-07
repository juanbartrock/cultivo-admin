import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  IsNumber,
  IsDateString,
  ValidateNested,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PlantStage, ApplicationType, PreventionTarget } from '@prisma/client';

// DTO para producto dentro de una aplicación
export class PreventionProductDto {
  @ApiProperty({
    description: 'Nombre del producto',
    example: 'Aceite de Neem',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Dosis del producto',
    example: '5',
  })
  @IsString()
  @IsNotEmpty()
  dose: string;

  @ApiProperty({
    description: 'Unidad de medida',
    example: 'ml/L',
  })
  @IsString()
  @IsNotEmpty()
  unit: string;
}

// DTO para aplicación del plan
export class PreventionPlanApplicationDto {
  @ApiProperty({
    description: 'Día de aplicación (1, 7, 14...)',
    example: 1,
  })
  @IsNumber()
  @Min(1)
  dayNumber: number;

  @ApiProperty({
    description: 'Lista de productos y dosis',
    type: [PreventionProductDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreventionProductDto)
  products: PreventionProductDto[];

  @ApiPropertyOptional({
    description: 'Tipo de aplicación',
    enum: ApplicationType,
    example: ApplicationType.FOLIAR,
  })
  @IsEnum(ApplicationType)
  @IsOptional()
  applicationType?: ApplicationType;

  @ApiPropertyOptional({
    description: 'Objetivo de la aplicación',
    enum: PreventionTarget,
    example: PreventionTarget.PLAGAS,
  })
  @IsEnum(PreventionTarget)
  @IsOptional()
  target?: PreventionTarget;

  @ApiPropertyOptional({
    description: 'Notas adicionales',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

// DTO para importar plan desde JSON
export class ImportPreventionPlanDto {
  @ApiProperty({
    description: 'Nombre del plan',
    example: 'Preventivo Floración 21 días',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción del plan',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Etapa para la cual aplica el plan',
    enum: PlantStage,
    example: PlantStage.FLORACION,
  })
  @IsEnum(PlantStage)
  stage: PlantStage;

  @ApiProperty({
    description: 'Duración total del ciclo en días (el plan se repite)',
    example: 21,
  })
  @IsNumber()
  @Min(1)
  totalDays: number;

  @ApiProperty({
    description: 'Aplicaciones del plan',
    type: [PreventionPlanApplicationDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreventionPlanApplicationDto)
  applications: PreventionPlanApplicationDto[];
}

// DTO para crear plan manualmente
export class CreatePreventionPlanDto {
  @ApiProperty({
    description: 'Nombre del plan',
    example: 'Preventivo Floración 21 días',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción del plan',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Etapa para la cual aplica el plan',
    enum: PlantStage,
    example: PlantStage.FLORACION,
  })
  @IsEnum(PlantStage)
  stage: PlantStage;

  @ApiProperty({
    description: 'Duración total del ciclo en días',
    example: 21,
  })
  @IsNumber()
  @Min(1)
  totalDays: number;
}

// DTO para actualizar plan
export class UpdatePreventionPlanDto extends PartialType(CreatePreventionPlanDto) {}

// DTO para asignar plan a planta
export class AssignPreventionPlanDto {
  @ApiProperty({
    description: 'ID del plan de prevención',
  })
  @IsUUID()
  @IsNotEmpty()
  preventionPlanId: string;

  @ApiProperty({
    description: 'Fecha de inicio del plan',
    example: '2025-01-15',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;
}

// DTO para agregar/actualizar aplicación
export class AddApplicationDto {
  @ApiProperty({
    description: 'Día de aplicación',
    example: 1,
  })
  @IsNumber()
  @Min(1)
  dayNumber: number;

  @ApiProperty({
    description: 'Lista de productos y dosis',
    type: [PreventionProductDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreventionProductDto)
  products: PreventionProductDto[];

  @ApiPropertyOptional({
    description: 'Tipo de aplicación',
    enum: ApplicationType,
  })
  @IsEnum(ApplicationType)
  @IsOptional()
  applicationType?: ApplicationType;

  @ApiPropertyOptional({
    description: 'Objetivo de la aplicación',
    enum: PreventionTarget,
  })
  @IsEnum(PreventionTarget)
  @IsOptional()
  target?: PreventionTarget;

  @ApiPropertyOptional({
    description: 'Notas adicionales',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
