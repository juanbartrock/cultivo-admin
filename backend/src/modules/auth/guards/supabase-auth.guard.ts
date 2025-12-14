import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private supabase: SupabaseClient | null = null;
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn('Supabase URL or Key not configured - using local auth only');
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verificar si la ruta es pública
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No authorization header provided');
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // 1. Primero intentar validar como JWT local (admin login)
    const localUser = await this.validateLocalJwt(token);
    if (localUser) {
      request.user = localUser;
      return true;
    }

    // 2. Si falla, intentar validar con Supabase
    if (this.supabase) {
      const supabaseResult = await this.validateSupabaseToken(token);
      if (supabaseResult) {
        request.user = supabaseResult;
        return true;
      }
    }

    throw new UnauthorizedException('Invalid or expired token');
  }

  /**
   * Valida un JWT local generado por nuestro auth/login
   */
  private async validateLocalJwt(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token);
      
      if (!payload.sub) {
        return null;
      }

      // Buscar usuario por ID
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        return null;
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account is disabled');
      }

      this.logger.debug(`Local JWT validated for user: ${user.email}`);
      return user;
    } catch (error) {
      // Token no es un JWT local válido
      return null;
    }
  }

  /**
   * Valida un token de Supabase
   */
  private async validateSupabaseToken(token: string): Promise<any> {
    try {
      const { data: { user: supabaseUser }, error } = await this.supabase!.auth.getUser(token);

      if (error || !supabaseUser) {
        this.logger.debug(`Invalid Supabase token: ${error?.message}`);
        return null;
      }

      // Buscar o crear usuario en nuestra BD
      let user = await this.prisma.user.findUnique({
        where: { supabaseId: supabaseUser.id },
      });

      if (!user) {
        // Crear usuario en nuestra BD (primera vez que hace login)
        user = await this.prisma.user.create({
          data: {
            supabaseId: supabaseUser.id,
            email: supabaseUser.email!,
            name: supabaseUser.user_metadata?.name || 
                  supabaseUser.user_metadata?.full_name || 
                  supabaseUser.email?.split('@')[0] || 
                  'Usuario',
          },
        });
        this.logger.log(`New user created: ${user.email}`);
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account is disabled');
      }

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Supabase auth error: ${error.message}`);
      return null;
    }
  }
}
