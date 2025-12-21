'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Droplets,
  Thermometer,
  AlertTriangle,
  RefreshCw,
  Loader2,
  MapPin,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  CloudOff,
} from 'lucide-react';
import { weatherService, CurrentWeather, CultivationImpactAlert, ForecastDay } from '@/services/weatherService';

interface WeatherWidgetProps {
  /** Si mostrar el pronóstico expandido */
  showForecast?: boolean;
  /** Si mostrar las alertas de cultivo */
  showAlerts?: boolean;
  /** Clase CSS adicional */
  className?: string;
  /** Modo compacto (solo datos básicos) */
  compact?: boolean;
}

const WEATHER_ICONS: Record<string, React.ReactNode> = {
  '01d': <Sun className="w-8 h-8 text-yellow-400" />,
  '01n': <Sun className="w-8 h-8 text-yellow-300" />,
  '02d': <Cloud className="w-8 h-8 text-zinc-400" />,
  '02n': <Cloud className="w-8 h-8 text-zinc-500" />,
  '03d': <Cloud className="w-8 h-8 text-zinc-400" />,
  '03n': <Cloud className="w-8 h-8 text-zinc-500" />,
  '04d': <Cloud className="w-8 h-8 text-zinc-500" />,
  '04n': <Cloud className="w-8 h-8 text-zinc-600" />,
  '09d': <CloudRain className="w-8 h-8 text-blue-400" />,
  '09n': <CloudRain className="w-8 h-8 text-blue-500" />,
  '10d': <CloudRain className="w-8 h-8 text-blue-400" />,
  '10n': <CloudRain className="w-8 h-8 text-blue-500" />,
  '11d': <CloudLightning className="w-8 h-8 text-yellow-500" />,
  '11n': <CloudLightning className="w-8 h-8 text-yellow-400" />,
  '13d': <CloudSnow className="w-8 h-8 text-cyan-300" />,
  '13n': <CloudSnow className="w-8 h-8 text-cyan-400" />,
  '50d': <Cloud className="w-8 h-8 text-zinc-400" />,
  '50n': <Cloud className="w-8 h-8 text-zinc-500" />,
};

function getWeatherIcon(iconCode: string) {
  return WEATHER_ICONS[iconCode] || <Cloud className="w-8 h-8 text-zinc-400" />;
}

function getSeverityStyles(severity: 'info' | 'warning' | 'critical') {
  switch (severity) {
    case 'critical':
      return 'bg-red-500/20 border-red-500/50 text-red-300';
    case 'warning':
      return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300';
    case 'info':
    default:
      return 'bg-blue-500/20 border-blue-500/50 text-blue-300';
  }
}

function getSeverityIcon(severity: 'info' | 'warning' | 'critical') {
  switch (severity) {
    case 'critical':
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    case 'info':
    default:
      return <AlertTriangle className="w-4 h-4 text-blue-400" />;
  }
}

export default function WeatherWidget({
  showForecast = true,
  showAlerts = true,
  className = '',
  compact = false,
}: WeatherWidgetProps) {
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchWeather = useCallback(async () => {
    try {
      const data = await weatherService.getCurrent();
      if ('error' in data) {
        setError(data.error as string);
        setWeather(null);
      } else {
        setWeather(data);
        setError(null);
      }
    } catch (err) {
      setError('No se pudo obtener el clima');
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    // Actualizar cada 5 minutos
    const interval = setInterval(fetchWeather, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await weatherService.refresh();
      await fetchWeather();
    } catch (err) {
      console.error('Error refreshing weather:', err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/50 ${className}`}>
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 text-cultivo-green-400 animate-spin" />
          <span className="text-sm text-zinc-400">Cargando clima...</span>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className={`bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/50 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <CloudOff className="w-5 h-5" />
            <span className="text-sm">{error || 'Servicio de clima no disponible'}</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg hover:bg-zinc-700/50 transition-colors"
            title="Reintentar"
          >
            <RefreshCw className={`w-4 h-4 text-zinc-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  const hasAlerts = (weather.cultivationAlerts?.length ?? 0) > 0;
  const criticalAlerts = weather.cultivationAlerts?.filter(a => a.severity === 'critical') || [];
  const warningAlerts = weather.cultivationAlerts?.filter(a => a.severity === 'warning') || [];

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`bg-zinc-800/30 rounded-xl p-3 border border-zinc-700/50 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getWeatherIcon(weather.icon)}
            <div>
              <p className="text-2xl font-bold text-white">
                {weatherService.formatTemperature(weather.temperature)}
              </p>
              <p className="text-xs text-zinc-400 capitalize">{weather.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasAlerts && (
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                criticalAlerts.length > 0 
                  ? 'bg-red-500/20 text-red-300' 
                  : 'bg-yellow-500/20 text-yellow-300'
              }`}>
                {weather.cultivationAlerts?.length} alerta{weather.cultivationAlerts?.length !== 1 ? 's' : ''}
              </div>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg hover:bg-zinc-700/50 transition-colors"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              )}
            </button>
          </div>
        </div>

        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-zinc-700/50"
          >
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <Droplets className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                <p className="text-sm font-medium text-white">{weather.humidity}%</p>
                <p className="text-[10px] text-zinc-500">Humedad</p>
              </div>
              <div>
                <Wind className="w-4 h-4 mx-auto text-cyan-400 mb-1" />
                <p className="text-sm font-medium text-white">{weatherService.formatWindSpeed(weather.windSpeed)}</p>
                <p className="text-[10px] text-zinc-500">Viento</p>
              </div>
              <div>
                <Thermometer className="w-4 h-4 mx-auto text-orange-400 mb-1" />
                <p className="text-sm font-medium text-white">{weatherService.formatTemperature(weather.feelsLike)}</p>
                <p className="text-[10px] text-zinc-500">Sensación</p>
              </div>
            </div>

            {showAlerts && hasAlerts && (
              <div className="mt-3 space-y-1">
                {weather.cultivationAlerts?.slice(0, 2).map((alert, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${getSeverityStyles(alert.severity)}`}
                  >
                    {getSeverityIcon(alert.severity)}
                    <span>{alert.message}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-zinc-800/30 rounded-2xl border border-zinc-700/50 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cultivo-green-400" />
            <span className="text-sm text-zinc-300">{weather.location}</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg hover:bg-zinc-700/50 transition-colors"
            title="Actualizar clima"
          >
            <RefreshCw className={`w-4 h-4 text-zinc-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Current Weather */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-900/50 rounded-xl">
              {getWeatherIcon(weather.icon)}
            </div>
            <div>
              <p className="text-4xl font-bold text-white">
                {weatherService.formatTemperature(weather.temperature)}
              </p>
              <p className="text-sm text-zinc-400 capitalize mt-1">{weather.description}</p>
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="flex items-center gap-2 justify-end">
              <Thermometer className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-zinc-300">
                Sensación: {weatherService.formatTemperature(weather.feelsLike)}
              </span>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Droplets className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-zinc-300">Humedad: {weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Wind className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-zinc-300">
                Viento: {weatherService.formatWindSpeed(weather.windSpeed)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cultivation Alerts */}
      {showAlerts && hasAlerts && (
        <div className="px-6 pb-4">
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
            Impacto en Cultivo
          </h4>
          <div className="space-y-2">
            {weather.cultivationAlerts?.map((alert, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-xl border ${getSeverityStyles(alert.severity)}`}
              >
                {getSeverityIcon(alert.severity)}
                <div className="flex-1">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs opacity-80 mt-0.5">{alert.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forecast */}
      {showForecast && weather.forecast && weather.forecast.length > 0 && (
        <div className="px-6 pb-6">
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
            Pronóstico
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {weather.forecast.slice(0, 3).map((day, idx) => (
              <div
                key={idx}
                className="bg-zinc-900/30 rounded-xl p-3 text-center"
              >
                <p className="text-xs text-zinc-400 mb-2">
                  {new Date(day.date).toLocaleDateString('es', { weekday: 'short' })}
                </p>
                <div className="flex justify-center mb-2">
                  {getWeatherIcon(day.icon)}
                </div>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="text-orange-400 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    {Math.round(day.tempMax)}°
                  </span>
                  <span className="text-blue-400 flex items-center gap-0.5">
                    <TrendingDown className="w-3 h-3" />
                    {Math.round(day.tempMin)}°
                  </span>
                </div>
                {day.pop > 0 && (
                  <p className="text-xs text-blue-300 mt-1">
                    <CloudRain className="w-3 h-3 inline mr-0.5" />
                    {day.pop}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-2 bg-zinc-900/30 border-t border-zinc-700/30">
        <p className="text-[10px] text-zinc-500 text-center">
          Última actualización: {new Date(weather.recordedAt).toLocaleTimeString('es')}
        </p>
      </div>
    </motion.div>
  );
}
