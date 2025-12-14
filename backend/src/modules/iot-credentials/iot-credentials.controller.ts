import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { IoTCredentialsService } from './iot-credentials.service';
import {
  UpsertCredentialDto,
  CredentialResponseDto,
  TestCredentialResultDto,
  CredentialInstructionsDto,
} from './dto/iot-credential.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { User, Connector } from '@prisma/client';

@ApiTags('IoT Credentials')
@ApiBearerAuth()
@Controller('iot-credentials')
export class IoTCredentialsController {
  constructor(private readonly credentialsService: IoTCredentialsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las credenciales IoT del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de credenciales', type: [CredentialResponseDto] })
  async findAll(@CurrentUser() user: User) {
    return this.credentialsService.findAllByUser(user.id);
  }

  @Get('instructions')
  @Public()
  @ApiOperation({ summary: 'Obtener instrucciones para todos los conectores' })
  @ApiResponse({ status: 200, description: 'Lista de instrucciones', type: [CredentialInstructionsDto] })
  getAllInstructions() {
    return this.credentialsService.getAllInstructions();
  }

  @Get('instructions/:connector')
  @Public()
  @ApiOperation({ summary: 'Obtener instrucciones para un conector específico' })
  @ApiParam({ name: 'connector', enum: ['SONOFF', 'TUYA', 'TAPO', 'ESP32'] })
  @ApiResponse({ status: 200, description: 'Instrucciones del conector', type: CredentialInstructionsDto })
  getInstructions(@Param('connector') connector: string) {
    return this.credentialsService.getInstructions(connector as Connector);
  }

  @Get(':connector')
  @ApiOperation({ summary: 'Obtener credenciales de un conector específico' })
  @ApiParam({ name: 'connector', enum: ['SONOFF', 'TUYA', 'TAPO', 'ESP32'] })
  @ApiResponse({ status: 200, description: 'Credenciales del conector', type: CredentialResponseDto })
  @ApiResponse({ status: 404, description: 'Credenciales no encontradas' })
  async findByConnector(
    @CurrentUser() user: User,
    @Param('connector') connector: string,
  ) {
    const credential = await this.credentialsService.findByConnector(
      user.id,
      connector as Connector,
    );
    
    if (!credential) {
      return {
        configured: false,
        connector,
        message: 'No hay credenciales configuradas para este conector',
      };
    }

    return {
      configured: true,
      ...credential,
    };
  }

  @Post(':connector')
  @ApiOperation({ summary: 'Configurar credenciales para un conector' })
  @ApiParam({ name: 'connector', enum: ['SONOFF', 'TUYA', 'TAPO', 'ESP32'] })
  @ApiResponse({ status: 200, description: 'Credenciales guardadas', type: CredentialResponseDto })
  @ApiResponse({ status: 400, description: 'Conector inválido' })
  async upsert(
    @CurrentUser() user: User,
    @Param('connector') connector: string,
    @Body() data: UpsertCredentialDto,
  ) {
    return this.credentialsService.upsert(user.id, connector as Connector, data);
  }

  @Delete(':connector')
  @ApiOperation({ summary: 'Eliminar credenciales de un conector' })
  @ApiParam({ name: 'connector', enum: ['SONOFF', 'TUYA', 'TAPO', 'ESP32'] })
  @ApiResponse({ status: 200, description: 'Credenciales eliminadas' })
  @ApiResponse({ status: 404, description: 'Credenciales no encontradas' })
  async delete(
    @CurrentUser() user: User,
    @Param('connector') connector: string,
  ) {
    return this.credentialsService.delete(user.id, connector as Connector);
  }

  @Post(':connector/test')
  @ApiOperation({ summary: 'Probar credenciales de un conector' })
  @ApiParam({ name: 'connector', enum: ['SONOFF', 'TUYA', 'TAPO', 'ESP32'] })
  @ApiResponse({ status: 200, description: 'Resultado de la prueba', type: TestCredentialResultDto })
  @ApiResponse({ status: 404, description: 'Credenciales no encontradas' })
  async testCredentials(
    @CurrentUser() user: User,
    @Param('connector') connector: string,
  ): Promise<TestCredentialResultDto> {
    return this.credentialsService.testCredentials(user.id, connector as Connector);
  }
}
