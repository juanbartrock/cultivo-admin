import { User } from '@prisma/client';

export type AuthenticatedUser = Omit<User, 'passwordHash'>;

export interface LocalAuthUser {
  userId: string;
  username: string;
  role: User['role'];
}

export interface JwtPayload {
  sub: string;
  username: string;
  role?: User['role'];
}
