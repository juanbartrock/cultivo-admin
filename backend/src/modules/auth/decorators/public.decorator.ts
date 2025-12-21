import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator para marcar rutas como públicas (sin autenticación)
 * Uso: @Public() en un controlador o método
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);




