import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  MaxLength,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PlantStage, PlantSex, PlantHealthStatus } from '@prisma/client';

export class PlantZoneDto {
  @ApiProperty({
    description: 'Zona dentro de la sección (1-6, grilla 2x3)',
    example: 1,
    minimum: 1,
    maximum: 6,
  })
  @IsInt()
  @Min(1)
  @Max(6)
  zone: number;

  @ApiPropertyOptional({
    description: 'Porcentaje de ocupación de la zona (0-100)',
    example: 100,
    minimum: 0,
    maximum: 100,
    default: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  coverage?: number;
}

export class CreatePlantDto {
  @ApiProperty({
    description: 'Código único o nombre de la planta',
    example: 'BD-001',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tagCode: string;

  @ApiProperty({
    description: 'ID de la genética',
  })
  @IsUUID()
  @IsNotEmpty()
  strainId: string;

  @ApiProperty({
    description: 'ID del ciclo/seguimiento',
  })
  @IsUUID()
  @IsNotEmpty()
  cycleId: string;

  @ApiProperty({
    description: 'ID de la sección donde está ubicada',
  })
  @IsUUID()
  @IsNotEmpty()
  sectionId: string;

  @ApiPropertyOptional({
    description: 'Zonas asignadas a la planta dentro de la sección',
    type: [PlantZoneDto],
    example: [{ zone: 1, coverage: 100 }, { zone: 2, coverage: 50 }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlantZoneDto)
  @IsOptional()
  zones?: PlantZoneDto[];

  @ApiPropertyOptional({
    description: 'Etapa actual de la planta',
    enum: PlantStage,
    default: PlantStage.GERMINACION,
  })
  @IsEnum(PlantStage)
  @IsOptional()
  stage?: PlantStage;

  @ApiPropertyOptional({
    description: 'Sexo de la planta',
    enum: PlantSex,
    default: PlantSex.UNKNOWN,
  })
  @IsEnum(PlantSex)
  @IsOptional()
  sex?: PlantSex;

  @ApiPropertyOptional({
    description: 'Estado de salud de la planta',
    enum: PlantHealthStatus,
    default: PlantHealthStatus.HEALTHY,
  })
  @IsEnum(PlantHealthStatus)
  @IsOptional()
  healthStatus?: PlantHealthStatus;

  @ApiPropertyOptional({
    description: 'URL de foto principal',
  })
  @IsString()
  @IsOptional()
  photo?: string;

  @ApiPropertyOptional({
    description: 'Notas sobre la planta',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Fecha de inicio (germinación/plantado)',
    example: '2025-01-15',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Tamaño de maceta final',
    example: '11L',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  potSizeFinal?: string;
}

export class UpdatePlantDto extends PartialType(CreatePlantDto) { }

export class MovePlantDto {
  @ApiPropertyOptional({
    description: 'Nueva sección donde mover la planta',
  })
  @IsUUID()
  @IsOptional()
  sectionId?: string;

  @ApiPropertyOptional({
    description: 'Zonas asignadas a la planta dentro de la sección',
    type: [PlantZoneDto],
    example: [{ zone: 1, coverage: 100 }, { zone: 2, coverage: 50 }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlantZoneDto)
  @IsOptional()
  zones?: PlantZoneDto[];

  @ApiPropertyOptional({
    description: 'Nueva etapa de la planta',
    enum: PlantStage,
  })
  @IsEnum(PlantStage)
  @IsOptional()
  stage?: PlantStage;

  @ApiPropertyOptional({
    description: 'Fecha del cambio de etapa (si no se proporciona, se usa la fecha actual)',
    example: '2025-01-15',
  })
  @IsDateString()
  @IsOptional()
  stageDate?: string;
}
