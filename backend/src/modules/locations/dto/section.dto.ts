import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength, IsBoolean, Matches } from 'class-validator';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateSectionDto {
  @ApiProperty({
    description: 'Nombre de la sección/carpa',
    example: 'Carpa Floración',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Dimensiones de la carpa',
    example: '120x120x200',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  dimensions?: string;

  @ApiPropertyOptional({
    description: 'URL de la imagen de la carpa',
    example: '/images/carpa-flora.png',
  })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({
    description: 'Descripción de la sección',
    example: 'Carpa para etapa de floración con luz HPS 600W',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'ID de la sala donde se ubica la sección',
    example: 'uuid-de-la-sala',
  })
  @IsUUID()
  @IsNotEmpty()
  roomId: string;

  @ApiPropertyOptional({
    description: 'Si la sección está activa/en uso',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Encendido del timer de luz (HH:MM, hora local)', example: '18:00' })
  @Matches(HHMM, { message: 'lightsOn tiene que ser HH:MM' })
  @IsOptional()
  lightsOn?: string | null;

  @ApiPropertyOptional({ description: 'Apagado del timer de luz (HH:MM, hora local)', example: '10:00' })
  @Matches(HHMM, { message: 'lightsOff tiene que ser HH:MM' })
  @IsOptional()
  lightsOff?: string | null;
}

export class UpdateSectionDto extends PartialType(CreateSectionDto) {}
