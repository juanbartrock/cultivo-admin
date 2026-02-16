import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../types/authenticated-user.type';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private supabase: SupabaseClient | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn('Supabase URL or Key not configured - using local auth only');
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: AuthenticatedUser;
    }>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No authorization header provided');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const localUser = await this.validateLocalJwt(token);
    if (localUser) {
      request.user = localUser;
      return true;
    }

    if (this.supabase) {
      const supabaseUser = await this.validateSupabaseToken(token);
      if (supabaseUser) {
        request.user = supabaseUser;
        return true;
      }
    }

    throw new UnauthorizedException('Invalid or expired token');
  }

  private async validateLocalJwt(token: string): Promise<AuthenticatedUser | null> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });

      if (!payload.sub) {
        return null;
      }

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
      return this.toAuthenticatedUser(user);
    } catch {
      return null;
    }
  }

  private async validateSupabaseToken(token: string): Promise<AuthenticatedUser | null> {
    try {
      const {
        data: { user: supabaseUser },
        error,
      } = await this.supabase!.auth.getUser(token);

      if (error || !supabaseUser) {
        this.logger.debug(`Invalid Supabase token: ${error?.message}`);
        return null;
      }

      let user = await this.prisma.user.findUnique({
        where: { supabaseId: supabaseUser.id },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            supabaseId: supabaseUser.id,
            email: supabaseUser.email!,
            name:
              supabaseUser.user_metadata?.name ||
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

      return this.toAuthenticatedUser(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown Supabase auth error';
      this.logger.error(`Supabase auth error: ${message}`);
      return null;
    }
  }

  private toAuthenticatedUser(user: User): AuthenticatedUser {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
