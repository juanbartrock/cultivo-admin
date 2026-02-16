import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CreatePPFDReadingDto {
  @ApiProperty({ description: 'Zona de la sección', example: 1, minimum: 1, maximum: 6 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  zone: number;

  @ApiProperty({ description: 'Valor PPFD medido', example: 650 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ppfdValue: number;

  @ApiProperty({ description: 'Altura de luz en cm', example: 35 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lightHeight: number;
}

export class GetPPFDHistoryQueryDto {
  @ApiProperty({
    required: false,
    description: 'Filtrar por zona de secci\u00f3n',
    example: 2,
    minimum: 1,
    maximum: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  zone?: number;

  @ApiProperty({
    required: false,
    description: 'Cantidad m\u00e1xima de lecturas a devolver',
    example: 50,
    minimum: 1,
    maximum: 500,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class CalculateDLIQueryDto {
  @ApiProperty({
    required: false,
    description: 'Horas de luz diarias',
    example: 18,
    minimum: 0,
    maximum: 24,
    default: 18,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(24)
  lightHours?: number;
}
