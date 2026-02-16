import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Connector } from '@prisma/client';
import { IoTGatewayService } from './modules/devices/iot-gateway.service';
import { Public } from './modules/auth/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly iotGatewayService: IoTGatewayService,
  ) {}

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

  @Public()
  @Get('health/live')
  @ApiOperation({ summary: 'Liveness probe del servicio' })
  @ApiResponse({ status: 200, description: 'Servicio vivo' })
  live() {
    return {
      status: 'alive',
      service: 'cultivo-backend',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness probe con chequeo de dependencias' })
  @ApiResponse({ status: 200, description: 'Servicio listo para recibir tráfico' })
  @ApiResponse({ status: 503, description: 'Dependencias críticas no disponibles' })
  async ready() {
    const dbReady = await this.checkDatabase();
    const connectors = await this.checkConnectors();

    const criticalConnectors: Connector[] = [
      Connector.SONOFF,
      Connector.TUYA,
      Connector.TAPO,
    ];
    const healthyConnectors = criticalConnectors.filter(
      (connector) => connectors[connector] === true,
    );
    const iotReady = healthyConnectors.length > 0;
    const ready = dbReady && iotReady;

    const payload = {
      status: ready ? 'ready' : 'not_ready',
      checks: {
        database: dbReady,
        connectors,
      },
      timestamp: new Date().toISOString(),
    };

    if (!ready) {
      throw new ServiceUnavailableException(payload);
    }

    return payload;
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checkConnectors(): Promise<Record<Connector, boolean>> {
    try {
      return await this.iotGatewayService.checkAllConnectorsHealth();
    } catch {
      return {
        [Connector.SONOFF]: false,
        [Connector.TUYA]: false,
        [Connector.TAPO]: false,
        [Connector.ESP32]: false,
        [Connector.VIRTUAL]: true,
      };
    }
  }
}
