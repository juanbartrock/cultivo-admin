import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from './modules/auth/decorators/public.decorator';

@ApiTags('health')
@Controller()
export class HealthController {
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check del servicio' })
  @ApiResponse({ status: 200, description: 'Servicio funcionando correctamente' })
  health() {
    return {
      status: 'ok',
      service: 'cultivo-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
