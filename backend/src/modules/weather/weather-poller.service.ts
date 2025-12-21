import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WeatherService } from './weather.service';
import { CultivationImpactAlertDto, WeatherAlertDto } from './dto/weather.dto';

@Injectable()
export class WeatherPollerService implements OnModuleInit {
  private readonly logger = new Logger(WeatherPollerService.name);
  private isPolling = false;
  private lastAlertHashes = new Set<string>();

  constructor(private weatherService: WeatherService) {}

  /**
   * Al iniciar el módulo, hacer una primera consulta si está configurado
   */
  async onModuleInit() {
    if (this.weatherService.isConfigured()) {
      this.logger.log('Weather service configured. Starting initial poll...');
      // Esperar 10 segundos antes de la primera consulta para que todo esté listo
      setTimeout(() => this.pollWeather(), 10000);
    } else {
      this.logger.warn('Weather service not configured. Set OPENWEATHERMAP_API_KEY to enable.');
    }
  }

  /**
   * Cron job que se ejecuta cada 30 minutos para consultar el clima
   */
  @Cron('0 */30 * * * *')
  async pollWeather() {
    if (!this.weatherService.isConfigured()) {
      return;
    }

    if (this.isPolling) {
      this.logger.debug('Weather polling already running, skipping...');
      return;
    }

    this.isPolling = true;

    try {
      this.logger.debug('Polling weather data...');

      // 1. Obtener clima actual
      const weather = await this.weatherService.fetchCurrentWeather();
      if (!weather) {
        this.logger.warn('Could not fetch current weather');
        return;
      }

      // 2. Obtener pronóstico
      const forecast = await this.weatherService.fetchForecast();

      // 3. Obtener alertas oficiales
      const officialAlerts = await this.weatherService.fetchOfficialAlerts();

      // 4. Analizar impacto al cultivo
      const cultivationAlerts = this.weatherService.analyzeCultivationImpact(weather);

      // 5. Persistir datos
      await this.weatherService.persistWeatherData(weather, forecast);

      // 6. Crear notificaciones solo para alertas NUEVAS
      const newCultivationAlerts = this.filterNewAlerts(cultivationAlerts);
      const newOfficialAlerts = this.filterNewOfficialAlerts(officialAlerts);

      if (newCultivationAlerts.length > 0 || newOfficialAlerts.length > 0) {
        await this.weatherService.createAlertNotifications(newCultivationAlerts, newOfficialAlerts);
        
        this.logger.log(
          `Weather alerts created: ${newCultivationAlerts.length} cultivation, ${newOfficialAlerts.length} official`,
        );
      }

      // 7. Emitir actualización en tiempo real
      this.weatherService.emitWeatherUpdate({
        ...weather,
        alerts: officialAlerts,
        cultivationAlerts,
        forecast,
      });

      this.logger.log(
        `Weather polled: ${weather.temperature}°C, ${weather.humidity}% humidity, ` +
        `${weather.description}, ${cultivationAlerts.length} cultivation alerts`,
      );
    } catch (error) {
      this.logger.error(`Error in weather polling cycle: ${error.message}`);
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Filtra alertas de cultivo que no hemos notificado recientemente
   * Usa un hash simple para evitar notificaciones duplicadas
   */
  private filterNewAlerts(alerts: CultivationImpactAlertDto[]): CultivationImpactAlertDto[] {
    const newAlerts: CultivationImpactAlertDto[] = [];
    const currentHashes = new Set<string>();

    for (const alert of alerts) {
      const hash = `${alert.type}-${alert.severity}`;
      currentHashes.add(hash);

      if (!this.lastAlertHashes.has(hash)) {
        newAlerts.push(alert);
      }
    }

    // Actualizar hashes para próxima iteración
    this.lastAlertHashes = currentHashes;

    return newAlerts;
  }

  /**
   * Filtra alertas oficiales nuevas
   */
  private filterNewOfficialAlerts(alerts: WeatherAlertDto[]): WeatherAlertDto[] {
    const newAlerts: WeatherAlertDto[] = [];

    for (const alert of alerts) {
      const hash = `official-${alert.event}-${alert.start}`;

      if (!this.lastAlertHashes.has(hash)) {
        newAlerts.push(alert);
        this.lastAlertHashes.add(hash);
      }
    }

    return newAlerts;
  }

  /**
   * Fuerza una consulta inmediata del clima
   */
  async forceRefresh() {
    // Limpiar alertas anteriores para permitir re-notificación
    this.lastAlertHashes.clear();
    await this.pollWeather();
    return this.weatherService.getLatest();
  }

  /**
   * Obtiene el estado del servicio
   */
  getStatus() {
    return {
      configured: this.weatherService.isConfigured(),
      isPolling: this.isPolling,
      activeAlertHashes: Array.from(this.lastAlertHashes),
      config: this.weatherService.getConfig(),
    };
  }
}
