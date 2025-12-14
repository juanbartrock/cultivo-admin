import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Connector } from '@prisma/client';

// DTOs para credenciales específicas de cada conector
export class SonoffCredentialsDto {
  @ApiProperty({ description: 'Email de cuenta eWeLink', example: 'usuario@email.com' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'Contraseña de cuenta eWeLink' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'Región', example: 'us', default: 'us' })
  @IsOptional()
  @IsString()
  region?: string;
}

export class TuyaCredentialsDto {
  @ApiProperty({ description: 'Access ID de Tuya IoT Platform' })
  @IsString()
  accessId: string;

  @ApiProperty({ description: 'Access Secret de Tuya IoT Platform' })
  @IsString()
  accessSecret: string;

  @ApiPropertyOptional({ description: 'Región', example: 'us', default: 'us' })
  @IsOptional()
  @IsString()
  region?: string;
}

export class TapoCredentialsDto {
  @ApiProperty({ description: 'IP de la cámara Tapo', example: '192.168.1.100' })
  @IsString()
  cameraIp: string;

  @ApiProperty({ description: 'Usuario configurado en la cámara' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Contraseña configurada en la cámara' })
  @IsString()
  password: string;
}

export class Esp32CredentialsDto {
  @ApiProperty({ description: 'IP del dispositivo ESP32', example: '192.168.1.50' })
  @IsString()
  deviceIp: string;

  @ApiPropertyOptional({ description: 'Puerto del servidor HTTP', default: '80' })
  @IsOptional()
  @IsString()
  port?: string;
}

// DTO genérico para crear/actualizar credenciales
export class UpsertCredentialDto {
  @ApiProperty({
    description: 'Credenciales según el tipo de conector',
    oneOf: [
      { $ref: '#/components/schemas/SonoffCredentialsDto' },
      { $ref: '#/components/schemas/TuyaCredentialsDto' },
      { $ref: '#/components/schemas/TapoCredentialsDto' },
      { $ref: '#/components/schemas/Esp32CredentialsDto' },
    ],
  })
  @IsObject()
  credentials: SonoffCredentialsDto | TuyaCredentialsDto | TapoCredentialsDto | Esp32CredentialsDto;

  @ApiPropertyOptional({ description: 'Si el servicio está habilitado', default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

// DTO de respuesta
export class CredentialResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['SONOFF', 'TUYA', 'TAPO', 'ESP32', 'VIRTUAL'] })
  connector: Connector;

  @ApiProperty({ description: 'Si el servicio está habilitado' })
  isEnabled: boolean;

  @ApiProperty({ description: 'Si las credenciales fueron verificadas como válidas' })
  isValid: boolean | null;

  @ApiProperty({ description: 'Última verificación' })
  lastChecked: Date | null;

  @ApiProperty({ description: 'Credenciales (solo campos no sensibles)' })
  credentials: {
    // Sonoff: solo email y región
    email?: string;
    region?: string;
    // Tuya: solo región
    accessId?: string;
    // Tapo: solo IP
    cameraIp?: string;
    // ESP32: IP y puerto
    deviceIp?: string;
    port?: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class TestCredentialResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional({ description: 'Detalles adicionales de la prueba' })
  details?: Record<string, any>;
}

// Instrucciones para obtener credenciales
export class CredentialInstructionsDto {
  @ApiProperty({ enum: ['SONOFF', 'TUYA', 'TAPO', 'ESP32'] })
  connector: Connector;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [String] })
  steps: string[];

  @ApiPropertyOptional()
  helpUrl?: string;
}
