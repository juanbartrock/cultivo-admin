import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator para especificar roles requeridos
 * Uso: @Roles(UserRole.ADMIN) en un controlador o método
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);




