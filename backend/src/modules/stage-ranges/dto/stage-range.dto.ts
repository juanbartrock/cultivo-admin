import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

const NUMBER_RULES = { allowNaN: false, allowInfinite: false } as const;

/** Los 16 valores de una fila: rango ideal y rango amplio de cada métrica. */
export class UpdateStageRangeDto {
  @ApiProperty({ description: 'Temperatura ideal mínima (°C)' })
  @IsNumber(NUMBER_RULES)
  tempIdealMin: number;

  @ApiProperty({ description: 'Temperatura ideal máxima (°C)' })
  @IsNumber(NUMBER_RULES)
  tempIdealMax: number;

  @ApiProperty({ description: 'Temperatura amplia mínima (°C)' })
  @IsNumber(NUMBER_RULES)
  tempWideMin: number;

  @ApiProperty({ description: 'Temperatura amplia máxima (°C)' })
  @IsNumber(NUMBER_RULES)
  tempWideMax: number;

  @ApiProperty({ description: 'Humedad ideal mínima (%)' })
  @IsNumber(NUMBER_RULES)
  humidityIdealMin: number;

  @ApiProperty({ description: 'Humedad ideal máxima (%)' })
  @IsNumber(NUMBER_RULES)
  humidityIdealMax: number;

  @ApiProperty({ description: 'Humedad amplia mínima (%)' })
  @IsNumber(NUMBER_RULES)
  humidityWideMin: number;

  @ApiProperty({ description: 'Humedad amplia máxima (%)' })
  @IsNumber(NUMBER_RULES)
  humidityWideMax: number;

  @ApiProperty({ description: 'VPD ideal mínimo (kPa)' })
  @IsNumber(NUMBER_RULES)
  vpdIdealMin: number;

  @ApiProperty({ description: 'VPD ideal máximo (kPa)' })
  @IsNumber(NUMBER_RULES)
  vpdIdealMax: number;

  @ApiProperty({ description: 'VPD amplio mínimo (kPa)' })
  @IsNumber(NUMBER_RULES)
  vpdWideMin: number;

  @ApiProperty({ description: 'VPD amplio máximo (kPa)' })
  @IsNumber(NUMBER_RULES)
  vpdWideMax: number;

  @ApiProperty({ description: 'CO2 ideal mínimo (ppm)' })
  @IsNumber(NUMBER_RULES)
  co2IdealMin: number;

  @ApiProperty({ description: 'CO2 ideal máximo (ppm)' })
  @IsNumber(NUMBER_RULES)
  co2IdealMax: number;

  @ApiProperty({ description: 'CO2 amplio mínimo (ppm)' })
  @IsNumber(NUMBER_RULES)
  co2WideMin: number;

  @ApiProperty({ description: 'CO2 amplio máximo (ppm)' })
  @IsNumber(NUMBER_RULES)
  co2WideMax: number;
}

/** PATCH: los valores que no vienen conservan lo que hay en la base. */
export class PatchStageRangeDto extends PartialType(UpdateStageRangeDto) {}
