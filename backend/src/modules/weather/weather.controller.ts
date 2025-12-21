import { Controller, Get, Post, Query } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { WeatherPollerService } from './weather-poller.service';
import { WeatherHistoryQueryDto } from './dto/weather.dto';

@Controller('weather')
export class WeatherController {
  constructor(
    private weatherService: WeatherService,
    private weatherPollerService: WeatherPollerService,
  ) {}

  /**
   * GET /weather/current
   * Obtiene el clima actual (último registro o consulta en vivo)
   */
  @Get('current')
  async getCurrent() {
    // Primero intentar obtener el último registro de la BD
    const latest = await this.weatherService.getLatest();
    
    // Si el registro es muy antiguo (más de 35 minutos), obtener datos frescos
    if (latest) {
      const age = Date.now() - new Date(latest.recordedAt).getTime();
      if (age < 35 * 60 * 1000) {
        // Agregar alertas actuales
        const alerts = await this.weatherService.getActiveAlerts();
        return {
          ...latest,
          cultivationAlerts: alerts.cultivation,
          alerts: alerts.official,
        };
      }
    }

    // Obtener datos frescos
    const weather = await this.weatherService.fetchCurrentWeather();
    if (!weather) {
      return {
        error: 'Weather service not configured or unavailable',
        configured: this.weatherService.isConfigured(),
      };
    }

    const cultivationAlerts = this.weatherService.analyzeCultivationImpact(weather);
    const officialAlerts = await this.weatherService.fetchOfficialAlerts();

    return {
      ...weather,
      cultivationAlerts,
      alerts: officialAlerts,
    };
  }

  /**
   * GET /weather/forecast
   * Obtiene el pronóstico de los próximos 7 días
   */
  @Get('forecast')
  async getForecast() {
    const forecast = await this.weatherService.fetchForecast();
    
    return {
      forecast,
      location: this.weatherService.getConfig().locationName,
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * GET /weather/history
   * Obtiene el historial de clima con filtros opcionales
   */
  @Get('history')
  async getHistory(@Query() query: WeatherHistoryQueryDto) {
    const history = await this.weatherService.getHistory(
      query.from,
      query.to,
      query.limit || 100,
    );

    return {
      count: history.length,
      data: history,
    };
  }

  /**
   * GET /weather/alerts
   * Obtiene las alertas climáticas activas
   */
  @Get('alerts')
  async getAlerts() {
    const alerts = await this.weatherService.getActiveAlerts();
    
    return {
      cultivation: alerts.cultivation,
      official: alerts.official,
      totalAlerts: alerts.cultivation.length + alerts.official.length,
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * POST /weather/refresh
   * Fuerza una actualización inmediata del clima
   */
  @Post('refresh')
  async refresh() {
    const weather = await this.weatherPollerService.forceRefresh();
    
    return {
      success: !!weather,
      data: weather,
      message: weather 
        ? 'Weather data refreshed successfully' 
        : 'Could not refresh weather data',
    };
  }

  /**
   * GET /weather/status
   * Obtiene el estado del servicio de clima
   */
  @Get('status')
  getStatus() {
    return this.weatherPollerService.getStatus();
  }

  /**
   * GET /weather/config
   * Obtiene la configuración actual del servicio
   */
  @Get('config')
  getConfig() {
    return this.weatherService.getConfig();
  }
}
