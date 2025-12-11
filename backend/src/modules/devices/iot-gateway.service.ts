import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError, timeout } from 'rxjs';
import { Connector } from '@prisma/client';

export interface ConnectorDevice {
  id: string;
  name: string;
  online: boolean;
  category?: string;
  model?: string;
  brand?: string;
  ip?: string;
}

export interface DeviceStatus {
  online: boolean;
  state?: 'on' | 'off';
  temperature?: number;
  humidity?: number;
  [key: string]: unknown;
}

export interface CameraStreamInfo {
  cameraIp: string;
  streamUrl: string;
  snapshotUrl: string;
  quality: 'high' | 'low';
}

@Injectable()
export class IoTGatewayService {
  private readonly logger = new Logger(IoTGatewayService.name);
  private readonly connectorUrls: Record<Connector, string>;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.connectorUrls = {
      [Connector.SONOFF]: this.configService.get<string>('MS_SONOFF_URL', 'http://sonoff-service:3000'),
      [Connector.TUYA]: this.configService.get<string>('MS_TUYA_URL', 'http://tuya-service:3000'),
      [Connector.TAPO]: this.configService.get<string>('MS_TAPO_URL', 'http://tapo-service:3000'),
      [Connector.ESP32]: this.configService.get<string>('MS_ESP32_URL', 'http://esp32-service:3000'),
      [Connector.VIRTUAL]: '', // Dispositivos virtuales no tienen microservicio propio
    };
  }

  /**
   * Obtiene la URL base del microservicio según el conector
   */
  private getConnectorUrl(connector: Connector): string {
    return this.connectorUrls[connector];
  }

  /**
   * Escanea todos los dispositivos de un conector específico
   */
  async scanConnector(connector: Connector): Promise<ConnectorDevice[]> {
    // VIRTUAL no tiene microservicio, no se puede escanear
    if (connector === Connector.VIRTUAL) {
      return [];
    }

    const baseUrl = this.getConnectorUrl(connector);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/devices`).pipe(
          timeout(8000),
          catchError((error) => {
            this.logger.warn(`Error scanning ${connector}: ${error.message}`);
            throw error;
          }),
        ),
      );

      const devices = response.data.devices || [];

      return devices.map((device: Record<string, unknown>) => ({
        id: String(device.id || device.deviceid || device.device_id),
        name: String(device.name || device.deviceName || 'Unknown'),
        online: Boolean(device.online ?? device.isOnline ?? true),
        category: device.category ? String(device.category) : undefined,
        model: device.model ? String(device.model) : (device.productModel ? String(device.productModel) : undefined),
        brand: device.brand ? String(device.brand) : (device.brandName ? String(device.brandName) : undefined),
        ip: device.ip ? String(device.ip) : undefined,
      }));
    } catch {
      this.logger.error(`Failed to scan ${connector} devices`);
      return [];
    }
  }

  /**
   * Escanea todos los conectores y devuelve los dispositivos encontrados
   */
  async scanAllConnectors(): Promise<{ connector: Connector; devices: ConnectorDevice[] }[]> {
    const connectors = Object.values(Connector);

    const results = await Promise.all(
      connectors.map(async (connector) => {
        const devices = await this.scanConnector(connector);
        return { connector, devices };
      }),
    );

    return results;
  }

  /**
   * Obtiene el estado de un dispositivo específico
   */
  async getDeviceStatus(connector: Connector, externalId: string): Promise<DeviceStatus> {
    const baseUrl = this.getConnectorUrl(connector);

    try {
      let url: string;

      switch (connector) {
        case Connector.SONOFF:
          // Sonoff usa un endpoint genérico
          url = `${baseUrl}/device/status`;
          break;
        case Connector.TUYA:
          url = `${baseUrl}/device/${externalId}/status`;
          break;
        case Connector.TAPO:
          // Tapo es para cámaras, diferente endpoint
          url = `${baseUrl}/camera`;
          break;
        case Connector.ESP32:
          // ESP32 usa deviceId como path parameter
          url = `${baseUrl}/device/${externalId}/status`;
          break;
        case Connector.VIRTUAL:
          // Dispositivos virtuales no tienen estado propio, dependen del controlador
          return { online: true, state: undefined };
        default:
          throw new Error(`Unknown connector: ${connector}`);
      }

      const response = await firstValueFrom(
        this.httpService.get(url).pipe(
          timeout(5000),
          catchError((error) => {
            this.logger.warn(`Error getting status for ${connector}/${externalId}: ${error.message}`);
            throw error;
          }),
        ),
      );

      // Para dispositivos SONOFF, parsear los valores del sensor
      if (connector === Connector.SONOFF) {
        return this.parseSonoffData(response.data);
      }

      // Para dispositivos TUYA, parsear los valores del sensor
      if (connector === Connector.TUYA && response.data.status) {
        return this.parseTuyaSensorData(response.data);
      }

      // Para dispositivos ESP32, extraer datos de sensores
      if (connector === Connector.ESP32) {
        return this.parseEsp32Data(response.data);
      }

      return {
        online: response.data.success !== false,
        ...response.data,
      };
    } catch {
      return { online: false };
    }
  }

  /**
   * Parsea los datos de un dispositivo SONOFF (eWeLink)
   * Convierte valores null a undefined para compatibilidad con el servicio de historial
   */
  private parseSonoffData(data: Record<string, unknown>): DeviceStatus {
    // Sonoff devuelve: { deviceId, name, online, switch, temperature, humidity, unit }
    const temperature = data.temperature !== null && data.temperature !== undefined 
      ? Number(data.temperature) 
      : undefined;
    const humidity = data.humidity !== null && data.humidity !== undefined 
      ? Number(data.humidity) 
      : undefined;

    this.logger.debug(`Parsed SONOFF device: temp=${temperature}, humidity=${humidity}, switch=${data.switch}`);

    return {
      online: data.online !== false && data.success !== false,
      state: data.switch === 'on' ? 'on' : data.switch === 'off' ? 'off' : undefined,
      switch: data.switch as string | undefined,
      temperature,
      humidity,
    };
  }

  /**
   * Parsea los datos de un dispositivo ESP32
   */
  private parseEsp32Data(data: Record<string, unknown>): DeviceStatus {
    const sensors = data.sensors as Record<string, unknown> || {};
    const relays = data.relays as Record<string, unknown> || {};
    
    return {
      online: data.online !== false,
      temperature: sensors.temperature as number | undefined,
      humidity: sensors.humidity as number | undefined,
      heatIndex: sensors.heatIndex as number | undefined,
      relay1: relays.relay1 as boolean | undefined,
      relay2: relays.relay2 as boolean | undefined,
      uptime: data.uptime as number | undefined,
    };
  }

  /**
   * Parsea los datos de un dispositivo TUYA para extraer estado on/off, temperatura, humedad, CO2, etc.
   */
  private parseTuyaSensorData(data: Record<string, unknown>): DeviceStatus {
    const status = data.status as Record<string, unknown> || {};
    
    // Códigos posibles para estado on/off (switches, enchufes, luces)
    const switchCodes = ['switch', 'switch_1', 'switch_led', 'led_switch', 'power'];
    
    // Códigos posibles para cada métrica en sensores Tuya
    const tempCodes = ['va_temperature', 'temp_current', 'temperature', 'temp'];
    const humidityCodes = ['va_humidity', 'humidity_value', 'humidity', 'humi'];
    const co2Codes = ['co2_value', 'co2', 'carbon_dioxide'];
    const pm25Codes = ['pm25_value', 'pm25', 'pm2_5'];
    const pm10Codes = ['pm10_value', 'pm10'];
    const vocCodes = ['voc_value', 'voc', 'tvoc'];
    const hchoCodes = ['ch2o_value', 'hcho', 'formaldehyde'];

    // Función para encontrar valor por códigos (numérico)
    const findValue = (codes: string[]): number | undefined => {
      for (const code of codes) {
        if (status[code] !== undefined) {
          return Number(status[code]);
        }
      }
      return undefined;
    };

    // Función para encontrar estado on/off (boolean)
    const findSwitchState = (codes: string[]): 'on' | 'off' | undefined => {
      for (const code of codes) {
        if (status[code] !== undefined) {
          // Puede venir como boolean (true/false) o string ('on'/'off')
          const value = status[code];
          if (typeof value === 'boolean') {
            return value ? 'on' : 'off';
          }
          if (typeof value === 'string') {
            return value.toLowerCase() === 'true' || value.toLowerCase() === 'on' ? 'on' : 'off';
          }
        }
      }
      return undefined;
    };

    // Extraer estado del switch
    const state = findSwitchState(switchCodes);

    // Extraer valores de sensores
    let temperature = findValue(tempCodes);
    const humidity = findValue(humidityCodes);
    const co2 = findValue(co2Codes);
    const pm25 = findValue(pm25Codes);
    const pm10 = findValue(pm10Codes);
    const voc = findValue(vocCodes);
    const hcho = findValue(hchoCodes);

    // Algunos sensores Tuya envían temperatura * 10 (352 = 35.2°C)
    if (temperature !== undefined && temperature > 100) {
      temperature = temperature / 10;
    }

    this.logger.debug(`Parsed TUYA device: state=${state}, temp=${temperature}, humidity=${humidity}, co2=${co2}`);

    return {
      online: data.online !== false,
      state, // Estado on/off del dispositivo
      temperature,
      humidity,
      co2,
      pm25,
      pm10,
      voc,
      hcho,
      // Incluir status raw para debugging
      rawStatus: status,
    };
  }

  /**
   * Controla el encendido/apagado de un dispositivo
   */
  async controlDevice(
    connector: Connector,
    externalId: string,
    action: 'on' | 'off',
  ): Promise<{ success: boolean; message?: string }> {
    const baseUrl = this.getConnectorUrl(connector);

    try {
      let url: string;

      switch (connector) {
        case Connector.SONOFF:
          url = `${baseUrl}/device/power`;
          break;
        case Connector.TUYA:
          url = `${baseUrl}/device/${externalId}/power`;
          break;
        case Connector.TAPO:
          // Las cámaras Tapo no tienen control on/off típico
          return { success: false, message: 'Tapo cameras do not support power control' };
        case Connector.ESP32:
          // ESP32 controla relays individualmente (relay 1 por defecto)
          url = `${baseUrl}/device/${externalId}/relay/1/power`;
          break;
        case Connector.VIRTUAL:
          // Dispositivos virtuales no se controlan directamente, se controlan a través del dispositivo controlador
          return { success: false, message: 'Virtual devices are controlled through their parent device' };
        default:
          return { success: false, message: `Unknown connector: ${connector}` };
      }

      const response = await firstValueFrom(
        this.httpService.post(url, { state: action }).pipe(
          timeout(5000),
          catchError((error) => {
            this.logger.warn(`Error controlling ${connector}/${externalId}: ${error.message}`);
            throw error;
          }),
        ),
      );

      return {
        success: response.data.success !== false,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verifica la salud de un conector
   */
  async checkConnectorHealth(connector: Connector): Promise<boolean> {
    // VIRTUAL siempre está "healthy" ya que no tiene microservicio
    if (connector === Connector.VIRTUAL) {
      return true;
    }

    const baseUrl = this.getConnectorUrl(connector);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/health`).pipe(
          timeout(3000),
          catchError(() => {
            throw new Error('Health check failed');
          }),
        ),
      );

      return response.data.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Verifica la salud de todos los conectores
   */
  async checkAllConnectorsHealth(): Promise<Record<Connector, boolean>> {
    const connectors = Object.values(Connector);

    const results = await Promise.all(
      connectors.map(async (connector) => {
        const healthy = await this.checkConnectorHealth(connector);
        return { connector, healthy };
      }),
    );

    return results.reduce(
      (acc, { connector, healthy }) => {
        acc[connector] = healthy;
        return acc;
      },
      {} as Record<Connector, boolean>,
    );
  }

  /**
   * Obtiene la información del stream de una cámara TAPO
   */
  async getCameraStreamInfo(quality: 'high' | 'low' = 'high'): Promise<CameraStreamInfo | null> {
    const baseUrl = this.getConnectorUrl(Connector.TAPO);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/stream?quality=${quality}`).pipe(
          timeout(5000),
          catchError((error) => {
            this.logger.warn(`Error getting camera stream info: ${error.message}`);
            throw error;
          }),
        ),
      );

      return {
        cameraIp: response.data.cameraIp,
        streamUrl: response.data.url,
        snapshotUrl: `${baseUrl}/snapshots`,
        quality,
      };
    } catch {
      this.logger.error('Failed to get camera stream info');
      return null;
    }
  }

  /**
   * Captura un snapshot de la cámara TAPO
   */
  async captureSnapshot(quality: 'high' | 'low' = 'high'): Promise<{ success: boolean; filename?: string; downloadUrl?: string }> {
    const baseUrl = this.getConnectorUrl(Connector.TAPO);

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${baseUrl}/snapshot`, { quality }).pipe(
          timeout(30000), // Los snapshots pueden tardar
          catchError((error) => {
            this.logger.warn(`Error capturing snapshot: ${error.message}`);
            throw error;
          }),
        ),
      );

      return {
        success: response.data.success,
        filename: response.data.filename,
        downloadUrl: response.data.downloadUrl,
      };
    } catch {
      this.logger.error('Failed to capture snapshot');
      return { success: false };
    }
  }

  /**
   * Obtiene la lista de snapshots disponibles
   */
  async listSnapshots(): Promise<{ filename: string; size: number; created: string }[]> {
    const baseUrl = this.getConnectorUrl(Connector.TAPO);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/snapshots`).pipe(
          timeout(5000),
          catchError((error) => {
            this.logger.warn(`Error listing snapshots: ${error.message}`);
            throw error;
          }),
        ),
      );

      return response.data.snapshots || [];
    } catch {
      this.logger.error('Failed to list snapshots');
      return [];
    }
  }

  /**
   * Obtiene la URL del tapo-service para acceder a snapshots
   * Devuelve la URL pública para que el navegador pueda acceder
   */
  getTapoServiceUrl(): string {
    // Usar la URL pública para el navegador (no la interna de Docker)
    return this.configService.get<string>('MS_TAPO_PUBLIC_URL', 'http://localhost:3003');
  }
}
