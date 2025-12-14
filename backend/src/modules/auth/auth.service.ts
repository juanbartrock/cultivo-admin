import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * Valida credenciales locales
   * Soporta:
   * 1. Usuarios con passwordHash en la BD
   * 2. Admin hardcodeado como fallback
   */
  async validateUser(username: string, pass: string): Promise<any> {
    // 1. Primero buscar usuario por email en la BD
    const userInDb = await this.prisma.user.findFirst({
      where: { email: username },
    });

    if (userInDb) {
      // Si el usuario tiene passwordHash, validar contra él
      if (userInDb.passwordHash) {
        const isValidPassword = await bcrypt.compare(pass, userInDb.passwordHash);
        if (isValidPassword) {
          if (!userInDb.isActive) {
            this.logger.warn(`Inactive user tried to login: ${username}`);
            return null;
          }
          this.logger.log(`User logged in: ${username}`);
          return {
            userId: userInDb.id,
            username: userInDb.email,
            role: userInDb.role,
          };
        }
      }
      // Si es el admin y tiene credenciales hardcodeadas
      const adminUser = process.env.ADMIN_USER || 'admin';
      const adminPass = process.env.ADMIN_PASSWORD || 'admin';
      
      if (username === adminUser && pass === adminPass && userInDb.role === 'ADMIN') {
        this.logger.log(`Admin logged in with default credentials`);
        return {
          userId: userInDb.id,
          username: userInDb.email,
          role: userInDb.role,
        };
      }
    }

    // 2. Fallback: crear admin si no existe y las credenciales son correctas
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin';

    if (username === adminUser && pass === adminPass) {
      // Crear admin si no existe
      const adminInDb = await this.prisma.user.create({
        data: {
          supabaseId: 'local-admin',
          email: adminUser,
          name: 'Administrador',
          role: 'ADMIN',
          subscriptionTier: 'PREMIUM',
        },
      });
      this.logger.log('Admin user created in database');

      return {
        userId: adminInDb.id,
        username: adminInDb.email,
        role: adminInDb.role,
      };
    }

    return null;
  }

  /**
   * Genera token JWT local (para login de admin)
   */
  async login(user: any) {
    const payload = {
      username: user.username,
      sub: user.userId,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   * Obtiene el usuario desde un token de Supabase
   */
  async getUserFromSupabaseToken(token: string): Promise<User | null> {
    if (!this.supabase) {
      this.logger.warn('Supabase client not initialized');
      return null;
    }

    try {
      const { data: { user: supabaseUser }, error } = await this.supabase.auth.getUser(token);

      if (error || !supabaseUser) {
        return null;
      }

      // Buscar usuario en nuestra BD
      const user = await this.prisma.user.findUnique({
        where: { supabaseId: supabaseUser.id },
      });

      return user;
    } catch (error) {
      this.logger.error(`Error getting user from Supabase token: ${error.message}`);
      return null;
    }
  }

  /**
   * Obtiene el usuario por ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * Obtiene el usuario por email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }
}
