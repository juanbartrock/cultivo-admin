import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsObject,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Connector, DeviceType } from '@prisma/client';

export class CreateDeviceDto {
  @ApiProperty({
    description: 'Nombre del dispositivo',
    example: 'Sensor de temperatura carpa 1',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Conector del dispositivo',
    enum: Connector,
    example: Connector.SONOFF,
  })
  @IsEnum(Connector)
  connector: Connector;

  @ApiProperty({
    description: 'ID externo del dispositivo en el servicio del conector',
    example: '1000123456',
  })
  @IsString()
  @IsNotEmpty()
  externalId: string;

  @ApiProperty({
    description: 'Tipo de dispositivo',
    enum: DeviceType,
    example: DeviceType.SENSOR,
  })
  @IsEnum(DeviceType)
  type: DeviceType;

  @ApiPropertyOptional({
    description: 'ID de la sección donde se asigna el dispositivo',
  })
  @IsUUID()
  @IsOptional()
  sectionId?: string;

  @ApiPropertyOptional({
    description: 'Metadatos adicionales (IP, modelo, etc.)',
    example: { ip: '192.168.1.100', model: 'SNZB-02' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'ID del dispositivo que controla a este (dependencia). Ej: un Sonoff que controla un extractor',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  controlledByDeviceId?: string;

  @ApiPropertyOptional({
    description: 'Si el dispositivo debe registrar historial (solo para sensores)',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  recordHistory?: boolean;
}

export class UpdateDeviceDto extends PartialType(CreateDeviceDto) {}

export class AssignDeviceDto {
  @ApiProperty({
    description: 'Conector del dispositivo',
    enum: Connector,
    example: Connector.TUYA,
  })
  @IsEnum(Connector)
  connector: Connector;

  @ApiProperty({
    description: 'ID externo del dispositivo',
    example: 'bf1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  externalId: string;

  @ApiProperty({
    description: 'ID de la sección donde asignar',
  })
  @IsUUID()
  @IsNotEmpty()
  sectionId: string;

  @ApiPropertyOptional({
    description: 'Nombre personalizado para el dispositivo',
    example: 'Luz LED principal',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Tipo de dispositivo',
    enum: DeviceType,
    example: DeviceType.LUZ,
  })
  @IsEnum(DeviceType)
  @IsOptional()
  type?: DeviceType;

  @ApiPropertyOptional({
    description: 'Metadatos adicionales',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'ID del dispositivo que controla a este (dependencia). Ej: un Sonoff que controla un extractor',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  controlledByDeviceId?: string;
}

export class ControlDeviceDto {
  @ApiProperty({
    description: 'Acción a realizar',
    enum: ['on', 'off'],
    example: 'on',
  })
  @IsEnum(['on', 'off'])
  action: 'on' | 'off';
}
