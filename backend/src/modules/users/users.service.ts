import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, UpdateProfileDto, SubscriptionLimitsDto } from './dto/user.dto';
import { SubscriptionTier, User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Límites por nivel de suscripción
const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimitsDto> = {
  [SubscriptionTier.BASIC]: {
    maxRooms: 1,
    maxSectionsPerRoom: 2,
    maxAutomations: 0,
    maxDevices: 3,
    hasAIAssistant: false,
    aiAssistantLevel: 'none',
  },
  [SubscriptionTier.PRO]: {
    maxRooms: 3,
    maxSectionsPerRoom: 5,
    maxAutomations: 10,
    maxDevices: 10,
    hasAIAssistant: true,
    aiAssistantLevel: 'limited',
  },
  [SubscriptionTier.PREMIUM]: {
    maxRooms: Infinity,
    maxSectionsPerRoom: Infinity,
    maxAutomations: Infinity,
    maxDevices: Infinity,
    hasAIAssistant: true,
    aiAssistantLevel: 'full',
  },
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lista todos los usuarios (solo admin)
   */
  async findAll(includeStats = false) {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionTier: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        ...(includeStats && {
          _count: {
            select: {
              rooms: true,
              devices: true,
              cycles: true,
            },
          },
        }),
      },
    });
  }

  /**
   * Busca un usuario por ID
   */
  async findById(id: string, includeStats = false) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionTier: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        ...(includeStats && {
          _count: {
            select: {
              rooms: true,
              devices: true,
              cycles: true,
              iotCredentials: true,
            },
          },
        }),
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return user;
  }

  /**
   * Busca un usuario por email
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Busca un usuario por Supabase ID
   */
  async findBySupabaseId(supabaseId: string) {
    return this.prisma.user.findUnique({
      where: { supabaseId },
    });
  }

  /**
   * Crea un nuevo usuario (solo admin)
   */
  async create(data: CreateUserDto) {
    // Verificar si ya existe un usuario con ese email
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException(`Ya existe un usuario con el email ${data.email}`);
    }

    // Hashear la contraseña si se proporciona
    let passwordHash: string | undefined;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 10);
    }

    // Remover password del data antes de crear
    const { password, ...userData } = data;

    return this.prisma.user.create({
      data: {
        ...userData,
        passwordHash,
        supabaseId: data.supabaseId || `local-${Date.now()}`, // ID para usuarios locales
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionTier: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Actualiza un usuario (solo admin)
   */
  async update(id: string, data: UpdateUserDto) {
    await this.findById(id);

    // Si se intenta cambiar el email, verificar que no exista
    if (data.email) {
      const existingUser = await this.findByEmail(data.email);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException(`Ya existe un usuario con el email ${data.email}`);
      }
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionTier: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Actualiza el perfil del usuario actual
   */
  async updateProfile(userId: string, data: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionTier: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Desactiva un usuario (soft delete)
   */
  async deactivate(id: string, currentUser: User) {
    const userToDeactivate = await this.findById(id);

    // No permitir desactivar al propio usuario
    if (userToDeactivate.id === currentUser.id) {
      throw new ForbiddenException('No puedes desactivar tu propia cuenta');
    }

    // No permitir desactivar a otros admins si no eres admin
    if (userToDeactivate.role === UserRole.ADMIN && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permisos para desactivar administradores');
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });
  }

  /**
   * Reactiva un usuario
   */
  async reactivate(id: string) {
    await this.findById(id);

    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });
  }

  /**
   * Obtiene los límites de suscripción de un usuario
   */
  getSubscriptionLimits(tier: SubscriptionTier): SubscriptionLimitsDto {
    return SUBSCRIPTION_LIMITS[tier];
  }

  /**
   * Verifica si el usuario puede crear más recursos según su suscripción
   */
  async canCreateResource(
    userId: string,
    resourceType: 'room' | 'section' | 'automation' | 'device',
    parentId?: string, // roomId para secciones
  ): Promise<{ allowed: boolean; reason?: string; current: number; limit: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            rooms: true,
            devices: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const limits = this.getSubscriptionLimits(user.subscriptionTier);

    switch (resourceType) {
      case 'room': {
        const currentRooms = user._count.rooms;
        return {
          allowed: currentRooms < limits.maxRooms,
          current: currentRooms,
          limit: limits.maxRooms,
          reason: currentRooms >= limits.maxRooms
            ? `Has alcanzado el límite de ${limits.maxRooms} sala(s) para tu plan ${user.subscriptionTier}`
            : undefined,
        };
      }

      case 'section': {
        if (!parentId) {
          throw new Error('roomId es requerido para verificar límite de secciones');
        }
        const sectionsInRoom = await this.prisma.section.count({
          where: { roomId: parentId },
        });
        return {
          allowed: sectionsInRoom < limits.maxSectionsPerRoom,
          current: sectionsInRoom,
          limit: limits.maxSectionsPerRoom,
          reason: sectionsInRoom >= limits.maxSectionsPerRoom
            ? `Has alcanzado el límite de ${limits.maxSectionsPerRoom} sección(es) por sala para tu plan ${user.subscriptionTier}`
            : undefined,
        };
      }

      case 'automation': {
        const automationsCount = await this.prisma.automation.count({
          where: {
            section: {
              room: { userId },
            },
          },
        });
        return {
          allowed: automationsCount < limits.maxAutomations,
          current: automationsCount,
          limit: limits.maxAutomations,
          reason: automationsCount >= limits.maxAutomations
            ? `Has alcanzado el límite de ${limits.maxAutomations} automatización(es) para tu plan ${user.subscriptionTier}`
            : undefined,
        };
      }

      case 'device': {
        const currentDevices = user._count.devices;
        return {
          allowed: currentDevices < limits.maxDevices,
          current: currentDevices,
          limit: limits.maxDevices,
          reason: currentDevices >= limits.maxDevices
            ? `Has alcanzado el límite de ${limits.maxDevices} dispositivo(s) para tu plan ${user.subscriptionTier}`
            : undefined,
        };
      }

      default:
        return { allowed: true, current: 0, limit: Infinity };
    }
  }
}




