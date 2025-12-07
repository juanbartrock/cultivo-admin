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
import { PlantStage } from '@prisma/client';

// DTO para producto dentro de una semana
export class FeedingProductDto {
  @ApiProperty({
    description: 'Nombre del producto',
    example: 'Bio-Bloom',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Dosis del producto',
    example: '2',
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

// DTO para semana del plan
export class FeedingPlanWeekDto {
  @ApiProperty({
    description: 'Número de semana (1, 2, 3...)',
    example: 1,
  })
  @IsNumber()
  @Min(1)
  weekNumber: number;

  @ApiProperty({
    description: 'Lista de productos y dosis',
    type: [FeedingProductDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeedingProductDto)
  products: FeedingProductDto[];

  @ApiPropertyOptional({
    description: 'pH recomendado',
    example: 6.2,
  })
  @IsNumber()
  @IsOptional()
  ph?: number;

  @ApiPropertyOptional({
    description: 'EC recomendada',
    example: 1.2,
  })
  @IsNumber()
  @IsOptional()
  ec?: number;

  @ApiPropertyOptional({
    description: 'Notas adicionales',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

// DTO para importar plan desde JSON
export class ImportFeedingPlanDto {
  @ApiProperty({
    description: 'Nombre del plan',
    example: 'BioBizz Floración',
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
    description: 'Semanas del plan',
    type: [FeedingPlanWeekDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeedingPlanWeekDto)
  weeks: FeedingPlanWeekDto[];
}

// DTO para crear plan manualmente
export class CreateFeedingPlanDto {
  @ApiProperty({
    description: 'Nombre del plan',
    example: 'BioBizz Floración',
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
}

// DTO para actualizar plan
export class UpdateFeedingPlanDto extends PartialType(CreateFeedingPlanDto) {}

// DTO para asignar plan a planta
export class AssignFeedingPlanDto {
  @ApiProperty({
    description: 'ID del plan de alimentación',
  })
  @IsUUID()
  @IsNotEmpty()
  feedingPlanId: string;

  @ApiProperty({
    description: 'Fecha en que la planta entró en la etapa del plan',
    example: '2025-01-15',
  })
  @IsDateString()
  @IsNotEmpty()
  stageStartDate: string;
}

// DTO para agregar/actualizar semana
export class AddWeekDto {
  @ApiProperty({
    description: 'Número de semana',
    example: 1,
  })
  @IsNumber()
  @Min(1)
  weekNumber: number;

  @ApiProperty({
    description: 'Lista de productos y dosis',
    type: [FeedingProductDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeedingProductDto)
  products: FeedingProductDto[];

  @ApiPropertyOptional({
    description: 'pH recomendado',
    example: 6.2,
  })
  @IsNumber()
  @IsOptional()
  ph?: number;

  @ApiPropertyOptional({
    description: 'EC recomendada',
    example: 1.2,
  })
  @IsNumber()
  @IsOptional()
  ec?: number;

  @ApiPropertyOptional({
    description: 'Notas adicionales',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
