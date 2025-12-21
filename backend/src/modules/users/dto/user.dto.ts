import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MinLength,
} from 'class-validator';
import { SubscriptionTier, UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ description: 'Email del usuario', example: 'usuario@ejemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Nombre del usuario', example: 'Juan Pérez' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ description: 'Contraseña para login local (mínimo 6 caracteres)', example: '123456' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({
    description: 'Rol del usuario',
    enum: UserRole,
    default: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Nivel de suscripción',
    enum: SubscriptionTier,
    default: SubscriptionTier.BASIC,
  })
  @IsOptional()
  @IsEnum(SubscriptionTier)
  subscriptionTier?: SubscriptionTier;

  @ApiPropertyOptional({ description: 'ID de Supabase Auth (se genera automáticamente)' })
  @IsOptional()
  @IsString()
  supabaseId?: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ description: 'Si el usuario está activo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Nombre del usuario' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty({ enum: SubscriptionTier })
  subscriptionTier: SubscriptionTier;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Estadísticas opcionales
  @ApiPropertyOptional()
  _count?: {
    rooms: number;
    devices: number;
    cycles: number;
  };
}

export class SubscriptionLimitsDto {
  @ApiProperty({ description: 'Máximo de salas permitidas' })
  maxRooms: number;

  @ApiProperty({ description: 'Máximo de secciones por sala' })
  maxSectionsPerRoom: number;

  @ApiProperty({ description: 'Máximo de automatizaciones' })
  maxAutomations: number;

  @ApiProperty({ description: 'Máximo de dispositivos IoT' })
  maxDevices: number;

  @ApiProperty({ description: 'Si tiene acceso al asistente IA' })
  hasAIAssistant: boolean;

  @ApiProperty({ description: 'Nivel de acceso al asistente IA' })
  aiAssistantLevel: 'none' | 'limited' | 'full';
}




