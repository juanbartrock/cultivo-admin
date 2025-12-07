import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { PlantStage, PlantSex } from '@prisma/client';

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
}

export class UpdatePlantDto extends PartialType(CreatePlantDto) {}

export class MovePlantDto {
  @ApiPropertyOptional({
    description: 'Nueva sección donde mover la planta',
  })
  @IsUUID()
  @IsOptional()
  sectionId?: string;

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
