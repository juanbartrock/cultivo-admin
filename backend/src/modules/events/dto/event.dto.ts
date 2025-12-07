import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsArray,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

// Base DTO para targets de eventos
class BaseEventTargetDto {
  @ApiPropertyOptional({
    description: 'ID de la planta (opcional)',
  })
  @IsUUID()
  @IsOptional()
  plantId?: string;

  @ApiPropertyOptional({
    description: 'ID del ciclo (opcional)',
  })
  @IsUUID()
  @IsOptional()
  cycleId?: string;

  @ApiPropertyOptional({
    description: 'ID de la sección (opcional)',
  })
  @IsUUID()
  @IsOptional()
  sectionId?: string;
}

export class CreateWaterEventDto extends BaseEventTargetDto {
  @ApiPropertyOptional({
    description: 'pH del agua de riego',
    example: 6.2,
  })
  @IsNumber()
  @Min(0)
  @Max(14)
  @IsOptional()
  ph?: number;

  @ApiPropertyOptional({
    description: 'EC (Electroconductividad) del agua',
    example: 1.2,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  ec?: number;

  @ApiPropertyOptional({
    description: 'Temperatura del agua en °C',
    example: 20,
  })
  @IsNumber()
  @IsOptional()
  waterTemperature?: number;

  @ApiPropertyOptional({
    description: 'Cantidad de litros',
    example: 5,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  liters?: number;

  @ApiPropertyOptional({
    description: 'Lista de nutrientes aplicados',
    example: [{ name: 'Bio Grow', dose: '2ml/L' }],
  })
  @IsArray()
  @IsOptional()
  nutrients?: { name: string; dose: string }[];

  @ApiPropertyOptional({
    description: 'Notas adicionales',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class CreateNoteEventDto extends BaseEventTargetDto {
  @ApiProperty({
    description: 'Contenido de la nota',
    example: 'Las plantas muestran signos de deficiencia de nitrógeno',
  })
  @IsString()
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({
    description: 'Tags o etiquetas para la nota',
    example: ['deficiencia', 'nitrógeno'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class CreatePhotoEventDto extends BaseEventTargetDto {
  @ApiPropertyOptional({
    description: 'Descripción o pie de foto',
    example: 'Semana 3 de floración',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  caption?: string;
}

export class CreateEnvironmentEventDto extends BaseEventTargetDto {
  @ApiPropertyOptional({
    description: 'Temperatura en °C',
    example: 24,
  })
  @IsNumber()
  @IsOptional()
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Humedad relativa en %',
    example: 60,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  humidity?: number;

  @ApiPropertyOptional({
    description: 'Nivel de CO2 en ppm',
    example: 800,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  co2?: number;

  @ApiPropertyOptional({
    description: 'Intensidad de luz en PPFD',
    example: 600,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  lightIntensity?: number;

  @ApiPropertyOptional({
    description: 'Notas adicionales',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
