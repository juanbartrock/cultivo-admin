import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { 
  CurrentWeatherDto, 
  WeatherAlertDto, 
  CultivationImpactAlertDto,
  ForecastDayDto 
} from './dto/weather.dto';
import { NotificationPriority, NotificationType } from '@prisma/client';

/**
 * Respuesta de Open-Meteo API
 * https://open-meteo.com/en/docs
 */
interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    pressure_msl: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
  };
}

/**
 * Códigos WMO de clima a descripción e icono
 */
const WMO_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: 'Cielo despejado', icon: '01d' },
  1: { description: 'Mayormente despejado', icon: '02d' },
  2: { description: 'Parcialmente nublado', icon: '03d' },
  3: { description: 'Nublado', icon: '04d' },
  45: { description: 'Niebla', icon: '50d' },
  48: { description: 'Niebla con escarcha', icon: '50d' },
  51: { description: 'Llovizna ligera', icon: '09d' },
  53: { description: 'Llovizna moderada', icon: '09d' },
  55: { description: 'Llovizna intensa', icon: '09d' },
  56: { description: 'Llovizna helada ligera', icon: '09d' },
  57: { description: 'Llovizna helada intensa', icon: '09d' },
  61: { description: 'Lluvia ligera', icon: '10d' },
  63: { description: 'Lluvia moderada', icon: '10d' },
  65: { description: 'Lluvia intensa', icon: '10d' },
  66: { description: 'Lluvia helada ligera', icon: '13d' },
  67: { description: 'Lluvia helada intensa', icon: '13d' },
  71: { description: 'Nevada ligera', icon: '13d' },
  73: { description: 'Nevada moderada', icon: '13d' },
  75: { description: 'Nevada intensa', icon: '13d' },
  77: { description: 'Granizo fino', icon: '13d' },
  80: { description: 'Chubascos ligeros', icon: '09d' },
  81: { description: 'Chubascos moderados', icon: '09d' },
  82: { description: 'Chubascos intensos', icon: '09d' },
  85: { description: 'Nevada con chubascos ligera', icon: '13d' },
  86: { description: 'Nevada con chubascos intensa', icon: '13d' },
  95: { description: 'Tormenta eléctrica', icon: '11d' },
  96: { description: 'Tormenta con granizo ligero', icon: '11d' },
  99: { description: 'Tormenta con granizo intenso', icon: '11d' },
};

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly latitude: number;
  private readonly longitude: number;
  private readonly locationName: string;
  private readonly baseUrl = 'https://api.open-meteo.com/v1/forecast';

  // Umbrales para alertas de impacto al cultivo
  private readonly THRESHOLDS = {
    TEMP_LOW: 5,        // °C - Temperatura muy baja
    TEMP_HIGH: 35,      // °C - Temperatura muy alta
    FROST: 0,           // °C - Helada
    HUMIDITY_HIGH: 85,  // % - Humedad muy alta
    WIND_STRONG: 50,    // km/h - Viento fuerte
  };

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
    private realtimeGateway: RealtimeGateway,
  ) {
    this.latitude = parseFloat(this.configService.get<string>('WEATHER_LATITUDE') || '-34.6037');
    this.longitude = parseFloat(this.configService.get<string>('WEATHER_LONGITUDE') || '-58.3816');
    this.locationName = this.configService.get<string>('WEATHER_LOCATION_NAME') || 'Buenos Aires, Argentina';

    this.logger.log(`Weather service initialized for ${this.locationName} (${this.latitude}, ${this.longitude})`);
  }

  /**
   * Convierte código WMO a descripción e icono
   */
  private getWeatherInfo(code: number): { description: string; icon: string } {
    return WMO_CODES[code] || { description: 'Desconocido', icon: '01d' };
  }

  /**
   * Obtiene el clima actual desde Open-Meteo (GRATIS, sin API key)
   */
  async fetchCurrentWeather(): Promise<CurrentWeatherDto | null> {
    try {
      const params = new URLSearchParams({
        latitude: this.latitude.toString(),
        longitude: this.longitude.toString(),
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,pressure_msl',
        timezone: 'America/Argentina/Buenos_Aires',
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Open-Meteo API error: ${response.status}`);
      }

      const data: OpenMeteoResponse = await response.json();
      
      if (!data.current) {
        throw new Error('No current weather data available');
      }

      const weatherInfo = this.getWeatherInfo(data.current.weather_code);
      
      return {
        temperature: Math.round(data.current.temperature_2m * 10) / 10,
        feelsLike: Math.round(data.current.apparent_temperature * 10) / 10,
        humidity: data.current.relative_humidity_2m,
        pressure: data.current.pressure_msl,
        windSpeed: Math.round(data.current.wind_speed_10m * 10) / 10,
        windDeg: data.current.wind_direction_10m,
        clouds: data.current.cloud_cover,
        visibility: undefined, // Open-Meteo no proporciona visibilidad en el plan gratuito
        description: weatherInfo.description,
        icon: weatherInfo.icon,
        location: this.locationName,
        latitude: this.latitude,
        longitude: this.longitude,
        recordedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error fetching current weather: ${error.message}`);
      return null;
    }
  }

  /**
   * Obtiene el pronóstico de 7 días desde Open-Meteo
   */
  async fetchForecast(): Promise<ForecastDayDto[]> {
    try {
      const params = new URLSearchParams({
        latitude: this.latitude.toString(),
        longitude: this.longitude.toString(),
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
        timezone: 'America/Argentina/Buenos_Aires',
        forecast_days: '7',
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Open-Meteo API error: ${response.status}`);
      }

      const data: OpenMeteoResponse = await response.json();
      
      if (!data.daily) {
        return [];
      }

      return data.daily.time.map((date, index) => {
        const weatherInfo = this.getWeatherInfo(data.daily!.weather_code[index]);
        return {
          date,
          tempMin: Math.round(data.daily!.temperature_2m_min[index] * 10) / 10,
          tempMax: Math.round(data.daily!.temperature_2m_max[index] * 10) / 10,
          humidity: 0, // Open-Meteo no da humedad diaria promedio, se podría calcular con hourly
          description: weatherInfo.description,
          icon: weatherInfo.icon,
          pop: data.daily!.precipitation_probability_max[index] || 0,
        };
      });
    } catch (error) {
      this.logger.error(`Error fetching forecast: ${error.message}`);
      return [];
    }
  }

  /**
   * Open-Meteo no tiene alertas oficiales, pero analizamos el pronóstico
   * para detectar condiciones extremas
   */
  async fetchOfficialAlerts(): Promise<WeatherAlertDto[]> {
    const alerts: WeatherAlertDto[] = [];
    
    try {
      const forecast = await this.fetchForecast();
      const now = Date.now();

      for (const day of forecast) {
        // Detectar heladas
        if (day.tempMin <= 0) {
          alerts.push({
            event: 'Helada',
            sender: 'Open-Meteo Analysis',
            start: Math.floor(new Date(day.date).getTime() / 1000),
            end: Math.floor(new Date(day.date).getTime() / 1000) + 86400,
            description: `Temperatura mínima de ${day.tempMin}°C prevista para ${day.date}`,
          });
        }

        // Detectar tormentas (códigos 95-99)
        if (day.description.toLowerCase().includes('tormenta')) {
          alerts.push({
            event: 'Tormenta',
            sender: 'Open-Meteo Analysis',
            start: Math.floor(new Date(day.date).getTime() / 1000),
            end: Math.floor(new Date(day.date).getTime() / 1000) + 86400,
            description: `${day.description} prevista para ${day.date}`,
          });
        }

        // Detectar lluvia intensa
        if (day.description.toLowerCase().includes('intens') && day.description.toLowerCase().includes('lluvia')) {
          alerts.push({
            event: 'Lluvia intensa',
            sender: 'Open-Meteo Analysis',
            start: Math.floor(new Date(day.date).getTime() / 1000),
            end: Math.floor(new Date(day.date).getTime() / 1000) + 86400,
            description: `${day.description} prevista para ${day.date}. Probabilidad: ${day.pop}%`,
          });
        }
      }
    } catch (error) {
      this.logger.debug(`Error analyzing forecast for alerts: ${error.message}`);
    }

    return alerts;
  }

  /**
   * Analiza las condiciones climáticas para generar alertas de impacto al cultivo
   */
  analyzeCultivationImpact(weather: CurrentWeatherDto): CultivationImpactAlertDto[] {
    const alerts: CultivationImpactAlertDto[] = [];

    // Alerta de helada
    if (weather.temperature <= this.THRESHOLDS.FROST) {
      alerts.push({
        type: 'FROST',
        severity: 'critical',
        message: `Helada detectada: ${weather.temperature}°C`,
        recommendation: 'Verificar calefacción interior y evitar ventilación exterior',
        value: weather.temperature,
        threshold: this.THRESHOLDS.FROST,
      });
    }
    // Alerta de temperatura muy baja
    else if (weather.temperature < this.THRESHOLDS.TEMP_LOW) {
      alerts.push({
        type: 'TEMPERATURE_EXTREME',
        severity: 'warning',
        message: `Temperatura exterior baja: ${weather.temperature}°C`,
        recommendation: 'Posible impacto en temperatura interior si ventilas',
        value: weather.temperature,
        threshold: this.THRESHOLDS.TEMP_LOW,
      });
    }

    // Alerta de temperatura muy alta
    if (weather.temperature > this.THRESHOLDS.TEMP_HIGH) {
      alerts.push({
        type: 'TEMPERATURE_EXTREME',
        severity: 'warning',
        message: `Temperatura exterior alta: ${weather.temperature}°C`,
        recommendation: 'Posible dificultad para enfriar el interior',
        value: weather.temperature,
        threshold: this.THRESHOLDS.TEMP_HIGH,
      });
    }

    // Alerta de humedad alta
    if (weather.humidity > this.THRESHOLDS.HUMIDITY_HIGH) {
      alerts.push({
        type: 'HIGH_HUMIDITY',
        severity: 'warning',
        message: `Humedad exterior alta: ${weather.humidity}%`,
        recommendation: 'Evitar ventilación exterior para no aumentar humedad interior',
        value: weather.humidity,
        threshold: this.THRESHOLDS.HUMIDITY_HIGH,
      });
    }

    // Alerta de viento fuerte
    if (weather.windSpeed > this.THRESHOLDS.WIND_STRONG) {
      alerts.push({
        type: 'STRONG_WIND',
        severity: 'info',
        message: `Viento fuerte: ${weather.windSpeed} km/h`,
        recommendation: 'Evitar ventilación exterior si hay riesgo de daño',
        value: weather.windSpeed,
        threshold: this.THRESHOLDS.WIND_STRONG,
      });
    }

    // Detectar tormenta por descripción
    const stormKeywords = ['tormenta', 'thunder', 'storm', 'granizo', 'hail'];
    if (stormKeywords.some(keyword => weather.description.toLowerCase().includes(keyword))) {
      alerts.push({
        type: 'STORM',
        severity: 'critical',
        message: `Alerta de tormenta: ${weather.description}`,
        recommendation: 'Evitar ventilación exterior y verificar equipos',
        value: 0,
        threshold: 0,
      });
    }

    return alerts;
  }

  /**
   * Persiste los datos del clima en la base de datos
   */
  async persistWeatherData(weather: CurrentWeatherDto, forecast?: ForecastDayDto[]): Promise<void> {
    try {
      await this.prisma.weatherData.create({
        data: {
          temperature: weather.temperature,
          feelsLike: weather.feelsLike,
          humidity: weather.humidity,
          pressure: weather.pressure,
          windSpeed: weather.windSpeed,
          windDeg: weather.windDeg,
          clouds: weather.clouds,
          visibility: weather.visibility,
          description: weather.description,
          icon: weather.icon,
          alerts: weather.alerts as any,
          forecastDaily: forecast as any,
          location: weather.location,
          latitude: weather.latitude,
          longitude: weather.longitude,
        },
      });

      this.logger.debug(`Weather data persisted: ${weather.temperature}°C, ${weather.humidity}%`);
    } catch (error) {
      this.logger.error(`Error persisting weather data: ${error.message}`);
    }
  }

  /**
   * Crea notificaciones para alertas significativas
   */
  async createAlertNotifications(
    cultivationAlerts: CultivationImpactAlertDto[],
    officialAlerts: WeatherAlertDto[],
  ): Promise<void> {
    // Solo crear notificaciones para alertas críticas o warning
    const significantAlerts = cultivationAlerts.filter(
      (a) => a.severity === 'critical' || a.severity === 'warning',
    );

    for (const alert of significantAlerts) {
      const priority = alert.severity === 'critical' 
        ? NotificationPriority.CRITICAL 
        : NotificationPriority.HIGH;

      await this.notificationsService.create({
        type: NotificationType.WEATHER,
        priority,
        title: `⛈️ Alerta Climática: ${alert.type}`,
        message: `${alert.message}. ${alert.recommendation}`,
        metadata: {
          alertType: alert.type,
          value: alert.value,
          threshold: alert.threshold,
        },
      });
    }

    // También crear notificaciones para alertas del pronóstico
    for (const alert of officialAlerts) {
      await this.notificationsService.create({
        type: NotificationType.WEATHER,
        priority: NotificationPriority.HIGH,
        title: `🌩️ Pronóstico: ${alert.event}`,
        message: alert.description.substring(0, 500),
        metadata: {
          sender: alert.sender,
          start: alert.start,
          end: alert.end,
        },
      });
    }
  }

  /**
   * Emite actualización de clima en tiempo real
   */
  emitWeatherUpdate(weather: CurrentWeatherDto): void {
    this.realtimeGateway.server?.emit('weather_update', {
      ...weather,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Obtiene el último registro de clima
   */
  async getLatest(): Promise<CurrentWeatherDto | null> {
    const latest = await this.prisma.weatherData.findFirst({
      orderBy: { recordedAt: 'desc' },
    });

    if (!latest) {
      return null;
    }

    return {
      temperature: latest.temperature,
      feelsLike: latest.feelsLike,
      humidity: latest.humidity,
      pressure: latest.pressure,
      windSpeed: latest.windSpeed,
      windDeg: latest.windDeg ?? undefined,
      clouds: latest.clouds ?? undefined,
      visibility: latest.visibility ?? undefined,
      description: latest.description,
      icon: latest.icon,
      location: latest.location,
      latitude: latest.latitude,
      longitude: latest.longitude,
      recordedAt: latest.recordedAt,
      alerts: (latest.alerts as unknown) as WeatherAlertDto[] | undefined,
      forecast: (latest.forecastDaily as unknown) as ForecastDayDto[] | undefined,
    };
  }

  /**
   * Obtiene historial de clima
   */
  async getHistory(from?: Date, to?: Date, limit = 100) {
    const where: any = {};

    if (from || to) {
      where.recordedAt = {};
      if (from) where.recordedAt.gte = from;
      if (to) where.recordedAt.lte = to;
    }

    return this.prisma.weatherData.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Obtiene alertas activas actuales
   */
  async getActiveAlerts(): Promise<{
    cultivation: CultivationImpactAlertDto[];
    official: WeatherAlertDto[];
  }> {
    const weather = await this.fetchCurrentWeather();
    if (!weather) {
      return { cultivation: [], official: [] };
    }

    const cultivationAlerts = this.analyzeCultivationImpact(weather);
    const officialAlerts = await this.fetchOfficialAlerts();

    return {
      cultivation: cultivationAlerts,
      official: officialAlerts,
    };
  }

  /**
   * El servicio siempre está configurado (Open-Meteo no requiere API key)
   */
  isConfigured(): boolean {
    return true;
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig() {
    return {
      configured: true,
      provider: 'Open-Meteo (Free)',
      latitude: this.latitude,
      longitude: this.longitude,
      locationName: this.locationName,
    };
  }
}
