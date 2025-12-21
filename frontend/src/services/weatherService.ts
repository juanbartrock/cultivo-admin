/**
 * Weather Service - Servicio para consultar el clima exterior
 */

import { api } from './apiService';

export interface WeatherAlert {
  event: string;
  sender: string;
  start: number;
  end: number;
  description: string;
  tags?: string[];
}

export interface CultivationImpactAlert {
  type: 'TEMPERATURE_EXTREME' | 'HIGH_HUMIDITY' | 'STRONG_WIND' | 'FROST' | 'STORM';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  recommendation: string;
  value: number;
  threshold: number;
}

export interface ForecastDay {
  date: string;
  tempMin: number;
  tempMax: number;
  humidity: number;
  description: string;
  icon: string;
  pop: number;
}

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDeg?: number;
  clouds?: number;
  visibility?: number;
  description: string;
  icon: string;
  location: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
  alerts?: WeatherAlert[];
  cultivationAlerts?: CultivationImpactAlert[];
  forecast?: ForecastDay[];
}

export interface WeatherConfig {
  configured: boolean;
  provider?: string;
  latitude: number;
  longitude: number;
  locationName: string;
}

export interface WeatherStatus {
  configured: boolean;
  isPolling: boolean;
  activeAlertHashes: string[];
  config: WeatherConfig;
}

export interface WeatherHistoryItem {
  id: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDeg?: number;
  clouds?: number;
  visibility?: number;
  description: string;
  icon: string;
  location: string;
  recordedAt: string;
}

export const weatherService = {
  /**
   * Obtiene el clima actual
   */
  getCurrent: () => api.get<CurrentWeather>('/weather/current'),

  /**
   * Obtiene el pronóstico de 7 días
   */
  getForecast: () => api.get<{ forecast: ForecastDay[]; location: string; fetchedAt: string }>('/weather/forecast'),

  /**
   * Obtiene el historial de clima
   */
  getHistory: (params?: { from?: string; to?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.append('from', params.from);
    if (params?.to) searchParams.append('to', params.to);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return api.get<{ count: number; data: WeatherHistoryItem[] }>(`/weather/history${query}`);
  },

  /**
   * Obtiene las alertas activas
   */
  getAlerts: () => api.get<{
    cultivation: CultivationImpactAlert[];
    official: WeatherAlert[];
    totalAlerts: number;
    fetchedAt: string;
  }>('/weather/alerts'),

  /**
   * Fuerza una actualización del clima
   */
  refresh: () => api.post<{ success: boolean; data: CurrentWeather | null; message: string }>('/weather/refresh', {}),

  /**
   * Obtiene el estado del servicio
   */
  getStatus: () => api.get<WeatherStatus>('/weather/status'),

  /**
   * Obtiene la configuración del servicio
   */
  getConfig: () => api.get<WeatherConfig>('/weather/config'),

  /**
   * Obtiene el emoji correspondiente al código de clima
   */
  getWeatherEmoji: (iconCode: string): string => {
    const emojiMap: Record<string, string> = {
      '01d': '☀️', '01n': '🌙',  // Despejado
      '02d': '🌤️', '02n': '☁️',  // Parcialmente nublado
      '03d': '☁️', '03n': '☁️',  // Nublado
      '04d': '☁️', '04n': '☁️',  // Muy nublado
      '09d': '🌧️', '09n': '🌧️',  // Llovizna
      '10d': '🌦️', '10n': '🌧️',  // Lluvia
      '11d': '⛈️', '11n': '⛈️',  // Tormenta
      '13d': '❄️', '13n': '❄️',  // Nieve
      '50d': '🌫️', '50n': '🌫️',  // Niebla
    };
    return emojiMap[iconCode] || '🌡️';
  },

  /**
   * Obtiene el color de severidad para alertas
   */
  getSeverityColor: (severity: 'info' | 'warning' | 'critical'): string => {
    const colors = {
      info: 'blue',
      warning: 'yellow',
      critical: 'red',
    };
    return colors[severity];
  },

  /**
   * Formatea la temperatura para mostrar
   */
  formatTemperature: (temp: number): string => `${Math.round(temp)}°C`,

  /**
   * Formatea la velocidad del viento
   */
  formatWindSpeed: (speed: number): string => `${Math.round(speed)} km/h`,
};

export default weatherService;
