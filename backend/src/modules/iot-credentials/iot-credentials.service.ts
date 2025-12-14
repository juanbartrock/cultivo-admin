import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { Connector } from '@prisma/client';
import {
  UpsertCredentialDto,
  CredentialResponseDto,
  TestCredentialResultDto,
  CredentialInstructionsDto,
} from './dto/iot-credential.dto';

// Instrucciones para obtener credenciales por conector
const CREDENTIAL_INSTRUCTIONS: Record<string, CredentialInstructionsDto> = {
  SONOFF: {
    connector: Connector.SONOFF,
    title: 'Configurar Sonoff/eWeLink',
    description: 'Usa las mismas credenciales que usas en la app eWeLink',
    steps: [
      '1. Descarga la app eWeLink en tu celular (iOS o Android)',
      '2. Crea una cuenta o inicia sesión',
      '3. Asegúrate de que tus dispositivos Sonoff estén vinculados a tu cuenta',
      '4. Usa el email y contraseña de eWeLink aquí',
      '5. La región suele ser "us" para América, "eu" para Europa, "cn" para China',
    ],
    helpUrl: 'https://ewelink.cc/',
  },
  TUYA: {
    connector: Connector.TUYA,
    title: 'Configurar Tuya/Smart Life',
    description: 'Necesitas crear un proyecto en Tuya IoT Platform para obtener las credenciales',
    steps: [
      '1. Ve a https://iot.tuya.com y crea una cuenta',
      '2. En Cloud → Development, crea un nuevo proyecto "Cloud Development"',
      '3. Selecciona "Smart Home" como industria',
      '4. En tu proyecto, ve a Devices → Link Tuya App Account',
      '5. Escanea el QR desde la app Tuya/Smart Life para vincular tus dispositivos',
      '6. En Overview, copia el Access ID y Access Secret',
    ],
    helpUrl: 'https://developer.tuya.com/en/docs/iot/quick-start1?id=K95ztz9u9t89n',
  },
  TAPO: {
    connector: Connector.TAPO,
    title: 'Configurar Cámara TP-Link Tapo',
    description: 'Necesitas configurar el acceso RTSP en tu cámara Tapo',
    steps: [
      '1. Abre la app Tapo en tu celular',
      '2. Selecciona tu cámara',
      '3. Ve a Configuración (ícono de engranaje)',
      '4. Ve a Avanzado → Cuenta de cámara',
      '5. Crea un usuario y contraseña para acceso local',
      '6. Obtén la IP de tu cámara desde la app o tu router',
      '7. Usa esa IP, usuario y contraseña aquí',
    ],
    helpUrl: 'https://www.tapo.com/',
  },
  ESP32: {
    connector: Connector.ESP32,
    title: 'Configurar Dispositivo ESP32',
    description: 'Configura la conexión a tu dispositivo ESP32 personalizado',
    steps: [
      '1. Asegúrate de que tu ESP32 esté conectado a tu red WiFi',
      '2. Obtén la IP del dispositivo (puedes verla en el Serial Monitor)',
      '3. El puerto por defecto es 80 para HTTP',
      '4. Verifica que el ESP32 tenga el firmware correcto instalado',
    ],
  },
};

@Injectable()
export class IoTCredentialsService {
  private readonly logger = new Logger(IoTCredentialsService.name);
  private readonly connectorUrls: Record<string, string>;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.connectorUrls = {
      SONOFF: this.configService.get<string>('MS_SONOFF_URL', 'http://sonoff-service:3000'),
      TUYA: this.configService.get<string>('MS_TUYA_URL', 'http://tuya-service:3000'),
      TAPO: this.configService.get<string>('MS_TAPO_URL', 'http://tapo-service:3000'),
      ESP32: this.configService.get<string>('MS_ESP32_URL', 'http://esp32-service:3000'),
    };
  }

  /**
   * Obtiene todas las credenciales de un usuario
   */
  async findAllByUser(userId: string): Promise<CredentialResponseDto[]> {
    const credentials = await this.prisma.userIoTCredential.findMany({
      where: { userId },
      orderBy: { connector: 'asc' },
    });

    return credentials.map((cred) => this.sanitizeCredential(cred));
  }

  /**
   * Obtiene las credenciales de un conector específico
   */
  async findByConnector(userId: string, connector: Connector) {
    const credential = await this.prisma.userIoTCredential.findUnique({
      where: {
        userId_connector: { userId, connector },
      },
    });

    if (!credential) {
      return null;
    }

    return this.sanitizeCredential(credential);
  }

  /**
   * Obtiene las credenciales RAW (con datos sensibles) para uso interno
   */
  async getRawCredentials(userId: string, connector: Connector) {
    const credential = await this.prisma.userIoTCredential.findUnique({
      where: {
        userId_connector: { userId, connector },
      },
    });

    if (!credential || !credential.isEnabled) {
      return null;
    }

    return credential.credentials as Record<string, any>;
  }

  /**
   * Crea o actualiza las credenciales de un conector
   */
  async upsert(userId: string, connector: Connector, data: UpsertCredentialDto) {
    // Validar que el conector no sea VIRTUAL
    if (connector === Connector.VIRTUAL) {
      throw new BadRequestException('No se pueden configurar credenciales para dispositivos virtuales');
    }

    const result = await this.prisma.userIoTCredential.upsert({
      where: {
        userId_connector: { userId, connector },
      },
      create: {
        userId,
        connector,
        credentials: data.credentials as any,
        isEnabled: data.isEnabled ?? true,
      },
      update: {
        credentials: data.credentials as any,
        isEnabled: data.isEnabled,
        isValid: null, // Reset validation status
        lastChecked: null,
      },
    });

    this.logger.log(`Credentials updated for user ${userId}, connector ${connector}`);

    return this.sanitizeCredential(result);
  }

  /**
   * Elimina las credenciales de un conector
   */
  async delete(userId: string, connector: Connector) {
    const existing = await this.prisma.userIoTCredential.findUnique({
      where: {
        userId_connector: { userId, connector },
      },
    });

    if (!existing) {
      throw new NotFoundException(`No hay credenciales configuradas para ${connector}`);
    }

    await this.prisma.userIoTCredential.delete({
      where: {
        userId_connector: { userId, connector },
      },
    });

    this.logger.log(`Credentials deleted for user ${userId}, connector ${connector}`);

    return { success: true, message: `Credenciales de ${connector} eliminadas` };
  }

  /**
   * Prueba las credenciales de un conector
   */
  async testCredentials(userId: string, connector: Connector): Promise<TestCredentialResultDto> {
    const credential = await this.prisma.userIoTCredential.findUnique({
      where: {
        userId_connector: { userId, connector },
      },
    });

    if (!credential) {
      throw new NotFoundException(`No hay credenciales configuradas para ${connector}`);
    }

    const credentials = credential.credentials as Record<string, any>;
    const baseUrl = this.connectorUrls[connector];

    if (!baseUrl) {
      return {
        success: false,
        message: `Servicio ${connector} no configurado`,
      };
    }

    try {
      // Preparar headers con credenciales
      const headers = this.buildCredentialHeaders(connector, credentials);

      // Probar conexión al servicio
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/health`, { headers }).pipe(
          timeout(10000),
          catchError((error) => {
            throw new Error(error.message);
          }),
        ),
      );

      const isValid = response.data?.status === 'ok';

      // Actualizar estado de validación
      await this.prisma.userIoTCredential.update({
        where: { id: credential.id },
        data: {
          isValid,
          lastChecked: new Date(),
        },
      });

      return {
        success: isValid,
        message: isValid 
          ? `Conexión exitosa con ${connector}` 
          : `Error de conexión con ${connector}`,
        details: response.data,
      };
    } catch (error) {
      // Actualizar estado de validación como fallido
      await this.prisma.userIoTCredential.update({
        where: { id: credential.id },
        data: {
          isValid: false,
          lastChecked: new Date(),
        },
      });

      return {
        success: false,
        message: `Error al conectar con ${connector}: ${error.message}`,
      };
    }
  }

  /**
   * Obtiene las instrucciones para configurar un conector
   */
  getInstructions(connector: Connector): CredentialInstructionsDto {
    const instructions = CREDENTIAL_INSTRUCTIONS[connector];
    
    if (!instructions) {
      throw new NotFoundException(`No hay instrucciones disponibles para ${connector}`);
    }

    return instructions;
  }

  /**
   * Obtiene todas las instrucciones disponibles
   */
  getAllInstructions(): CredentialInstructionsDto[] {
    return Object.values(CREDENTIAL_INSTRUCTIONS);
  }

  /**
   * Construye los headers de credenciales para enviar al microservicio
   */
  buildCredentialHeaders(connector: Connector, credentials: Record<string, any>): Record<string, string> {
    switch (connector) {
      case Connector.SONOFF:
        return {
          'X-Ewelink-Email': credentials.email || '',
          'X-Ewelink-Password': credentials.password || '',
          'X-Ewelink-Region': credentials.region || 'us',
        };

      case Connector.TUYA:
        return {
          'X-Tuya-Access-Id': credentials.accessId || '',
          'X-Tuya-Access-Secret': credentials.accessSecret || '',
          'X-Tuya-Region': credentials.region || 'us',
        };

      case Connector.TAPO:
        return {
          'X-Tapo-Camera-Ip': credentials.cameraIp || '',
          'X-Tapo-Username': credentials.username || '',
          'X-Tapo-Password': credentials.password || '',
        };

      case Connector.ESP32:
        return {
          'X-Esp32-Device-Ip': credentials.deviceIp || '',
          'X-Esp32-Port': credentials.port || '80',
        };

      default:
        return {};
    }
  }

  /**
   * Sanitiza las credenciales para no exponer datos sensibles
   */
  private sanitizeCredential(credential: any): CredentialResponseDto {
    const creds = credential.credentials as Record<string, any>;
    let sanitizedCreds: Record<string, any> = {};

    switch (credential.connector) {
      case Connector.SONOFF:
        sanitizedCreds = {
          email: creds.email,
          region: creds.region,
          // password NO se incluye
        };
        break;

      case Connector.TUYA:
        sanitizedCreds = {
          accessId: creds.accessId ? `${creds.accessId.substring(0, 8)}...` : undefined,
          region: creds.region,
          // accessSecret NO se incluye
        };
        break;

      case Connector.TAPO:
        sanitizedCreds = {
          cameraIp: creds.cameraIp,
          // username y password NO se incluyen
        };
        break;

      case Connector.ESP32:
        sanitizedCreds = {
          deviceIp: creds.deviceIp,
          port: creds.port,
        };
        break;
    }

    return {
      id: credential.id,
      connector: credential.connector,
      isEnabled: credential.isEnabled,
      isValid: credential.isValid,
      lastChecked: credential.lastChecked,
      credentials: sanitizedCreds,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    };
  }
}
