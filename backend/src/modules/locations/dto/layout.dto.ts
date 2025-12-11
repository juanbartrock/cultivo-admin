import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNumber, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class SectionLayoutItemDto {
  @ApiProperty({
    description: 'Clave única de la sección',
    example: 'environment',
  })
  @IsString()
  key: string;

  @ApiProperty({
    description: 'Si la sección está habilitada',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    description: 'Orden de la sección (0 = primera)',
    example: 0,
  })
  @IsNumber()
  order: number;
}

export class UpdateSectionLayoutDto {
  @ApiProperty({
    description: 'Configuración de secciones del layout',
    type: [SectionLayoutItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionLayoutItemDto)
  sections: SectionLayoutItemDto[];
}

// Configuración por defecto del layout
export const DEFAULT_LAYOUT_CONFIG = {
  sections: [
    { key: 'environment', enabled: true, order: 0 },
    { key: 'sensors', enabled: true, order: 1 },
    { key: 'controllables', enabled: true, order: 2 },
    { key: 'cameras', enabled: true, order: 3 },
    { key: 'ppfd', enabled: true, order: 4 },
    { key: 'sensorHistory', enabled: true, order: 5 },
    { key: 'feedingPlans', enabled: true, order: 6 },
    { key: 'preventionPlans', enabled: true, order: 7 },
    { key: 'plants', enabled: true, order: 8 },
  ],
};


