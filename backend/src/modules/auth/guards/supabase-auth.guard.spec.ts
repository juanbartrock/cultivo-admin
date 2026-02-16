import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../../../prisma/prisma.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

type ConfigMap = Record<string, string | undefined>;

describe('SupabaseAuthGuard', () => {
  let configValues: ConfigMap;
  let configService: ConfigService;
  let prisma: PrismaService;
  let reflector: Reflector;
  let jwtService: JwtService;

  const prismaUserMock = {
    findUnique: jest.fn(),
    create: jest.fn(),
  };

  const createDbUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-1',
    supabaseId: 'supabase-user-1',
    email: 'user@example.com',
    name: 'Test User',
    passwordHash: null,
    role: 'USER',
    subscriptionTier: 'BASIC',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createContext = (request: { headers: { authorization?: string }; user?: unknown }): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();

    configValues = {
      JWT_SECRET: 'test-jwt-secret-that-is-long-enough-1234567890',
    };

    configService = {
      get: jest.fn((key: string) => configValues[key]),
      getOrThrow: jest.fn((key: string) => {
        const value = configValues[key];
        if (!value) {
          throw new Error(`Missing config: ${key}`);
        }
        return value;
      }),
    } as unknown as ConfigService;

    prisma = {
      user: prismaUserMock,
    } as unknown as PrismaService;

    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;

    jwtService = {
      verify: jest.fn(),
    } as unknown as JwtService;
  });

  it('accepts a valid local JWT token', async () => {
    const request: { headers: { authorization: string }; user?: unknown } = {
      headers: { authorization: 'Bearer local-token' },
    };
    const context = createContext(request);
    const user = createDbUser({ id: 'local-user-id', email: 'local@example.com' });

    (jwtService.verify as jest.Mock).mockReturnValue({
      sub: 'local-user-id',
      username: 'local',
    });
    prismaUserMock.findUnique.mockResolvedValue(user);

    const guard = new SupabaseAuthGuard(configService, prisma, reflector, jwtService);
    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request.user).toMatchObject({
      id: 'local-user-id',
      email: 'local@example.com',
    });
  });

  it('rejects an invalid token when Supabase is not configured', async () => {
    const request = { headers: { authorization: 'Bearer invalid-token' } };
    const context = createContext(request);

    (jwtService.verify as jest.Mock).mockImplementation(() => {
      throw new Error('invalid token');
    });

    const guard = new SupabaseAuthGuard(configService, prisma, reflector, jwtService);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a valid Supabase token when local JWT fails', async () => {
    configValues.SUPABASE_URL = 'https://example.supabase.co';
    configValues.SUPABASE_KEY = 'supabase-service-key';

    const request: { headers: { authorization: string }; user?: unknown } = {
      headers: { authorization: 'Bearer supabase-token' },
    };
    const context = createContext(request);
    const createdUser = createDbUser({
      id: 'db-user-2',
      supabaseId: 'supabase-id-2',
      email: 'supabase@example.com',
    });

    (jwtService.verify as jest.Mock).mockImplementation(() => {
      throw new Error('local verification failed');
    });

    (createClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'supabase-id-2',
              email: 'supabase@example.com',
              user_metadata: { name: 'Supabase User' },
            },
          },
          error: null,
        }),
      },
    });

    prismaUserMock.findUnique.mockResolvedValue(null);
    prismaUserMock.create.mockResolvedValue(createdUser);

    const guard = new SupabaseAuthGuard(configService, prisma, reflector, jwtService);
    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(prismaUserMock.create).toHaveBeenCalledTimes(1);
    expect(request.user).toMatchObject({
      id: 'db-user-2',
      email: 'supabase@example.com',
    });
  });

  it('rejects requests without authorization header', async () => {
    const request = { headers: {} };
    const context = createContext(request);
    const guard = new SupabaseAuthGuard(configService, prisma, reflector, jwtService);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
