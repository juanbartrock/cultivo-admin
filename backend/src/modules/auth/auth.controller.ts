import { Controller, Request, Post, UseGuards, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ApiTags, ApiBody, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { User } from '@prisma/client';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @ApiOperation({ summary: 'Login with username and password (local auth)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', example: 'admin' },
        password: { type: 'string', example: 'admin' },
      },
    },
  })
  async login(@Request() req: any) {
    return this.authService.login(req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current profile (JWT protected)' })
  getProfile(@Request() req: any) {
    return req.user;
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user (Supabase or JWT protected)' })
  async getMe(@CurrentUser() user: User) {
    if (!user) {
      return { authenticated: false };
    }
    // No devolver campos sensibles
    const { supabaseId, ...safeUser } = user;
    return {
      authenticated: true,
      user: safeUser,
    };
  }
}
