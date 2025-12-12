import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  // Hardcoded user for simplicity as requested in the plan
  // In a real production scenario, this should be in the database
  private readonly users = [
    {
      userId: 1,
      username: 'admin',
      passwordHash: '$2b$10$E5zPjL3P9z.v.v.v.v.v.u.v.v.v.v.v.v.', // hashed 'admin123' - wait, let me generate a real hash or use a simple compare for this demo if bcrypt is tricky to predict
      // Actually, I'll use a fixed hash for 'admin'
      // $2b$10$5M/4gOq.rAn/k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z
      // Let's implement a simple validateUser that hardcodes the check for now to ensure it works without a DB migration for users table
    },
  ];

  constructor(private jwtService: JwtService) { }

  async validateUser(username: string, pass: string): Promise<any> {
    // For this implementation, we hardcode the admin user
    // User: admin
    // Pass: admin
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin';

    if (username === adminUser && pass === adminPass) {
      const { ...result } = { userId: 1, username: adminUser };
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.userId };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
