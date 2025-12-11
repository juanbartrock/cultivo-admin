'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import {
  Thermometer,
  Droplets,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Wind,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api } from '@/services/apiService';
import { SensorReading, SensorStats } from '@/types';

interface SensorHistoryChartProps {
  deviceId: string;
  deviceName?: string;
}

type MetricKey = 'temperature' | 'humidity' | 'co2';

interface MetricConfig {
  key: MetricKey;
  label: string;
  color: string;
  icon: React.ElementType;
  unit: string;
}

const METRICS: MetricConfig[] = [
  { key: 'temperature', label: 'Temperatura', color: '#fb923c', icon: Thermometer, unit: '°C' },
  { key: 'humidity', label: 'Humedad', color: '#22d3ee', icon: Droplets, unit: '%' },
  { key: 'co2', label: 'CO₂', color: '#34d399', icon: Wind, unit: 'ppm' },
];

export default function SensorHistoryChart({ deviceId, deviceName }: SensorHistoryChartProps) {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [stats, setStats] = useState<SensorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hours, setHours] = useState(6);
  const [showModal, setShowModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleMetrics, setVisibleMetrics] = useState<Set<MetricKey>>(() => new Set<MetricKey>(['temperature', 'humidity']));

  const toggleMetric = (key: MetricKey) => {
    setVisibleMetrics(prev => {
      const newSet = new Set<MetricKey>(prev);
      if (newSet.has(key)) {
        // No permitir desactivar todas las métricas
        if (newSet.size > 1) {
          newSet.delete(key);
        }
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Determinar qué métricas están disponibles en los datos
  const availableMetrics = METRICS.filter(m => {
    if (readings.length === 0) return m.key !== 'co2'; // Por defecto mostrar temp y humedad
    return readings.some(r => r[m.key] !== null && r[m.key] !== undefined);
  });

  useEffect(() => {
    loadData();
  }, [deviceId, hours]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [historyData, statsData] = await Promise.all([
        api.get<SensorReading[]>(`/devices/${deviceId}/history?hours=${hours}`),
        api.get<SensorStats>(`/devices/${deviceId}/history/stats?hours=${hours}`),
      ]);
      setReadings(historyData);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading sensor history:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const chartData = readings.map((r) => ({
    time: new Date(r.recordedAt).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    fullTime: new Date(r.recordedAt).toLocaleString('es-AR'),
    temperature: r.temperature,
    humidity: r.humidity,
    co2: r.co2,
  }));

  const getTrendIcon = (current: number, avg: number) => {
    const diff = current - avg;
    if (diff > 1) return <TrendingUp className="w-3 h-3 text-red-400" />;
    if (diff < -1) return <TrendingDown className="w-3 h-3 text-blue-400" />;
    return <Minus className="w-3 h-3 text-zinc-400" />;
  };

  if (isLoading && readings.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (readings.length === 0) {
    return (
      <div className="text-center py-6">
        <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        <p className="text-sm text-zinc-500">Sin historial disponible</p>
        <p className="text-xs text-zinc-600 mt-1">
          Asegúrate de que el dispositivo tenga &quot;Registrar historial&quot; activado
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-zinc-300">
            Historial {deviceName && `- ${deviceName}`}
          </h4>
          <select
            value={hours}
            onChange={(e) => setHours(parseInt(e.target.value))}
            className="text-xs px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white"
          >
            <option value={1}>1 hora</option>
            <option value={6}>6 horas</option>
            <option value={12}>12 horas</option>
            <option value={24}>24 horas</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          {/* Selector de métricas */}
          {availableMetrics.map((metric) => {
            const Icon = metric.icon;
            const isActive = visibleMetrics.has(metric.key);
            return (
              <button
                key={metric.key}
                onClick={() => toggleMetric(metric.key)}
                title={`${isActive ? 'Ocultar' : 'Mostrar'} ${metric.label}`}
                className={`
                  p-1.5 rounded-lg transition-all
                  ${isActive 
                    ? 'bg-zinc-700' 
                    : 'bg-zinc-800/50 opacity-50 hover:opacity-75'
                  }
                `}
                style={{ borderColor: isActive ? metric.color : 'transparent', borderWidth: isActive ? 2 : 0 }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: metric.color }} />
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-xs text-cyan-400 hover:text-cyan-300"
        >
          Ver más...
        </button>
      </div>

      {/* Stats resumidas */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          {stats.temperature && (
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Thermometer className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-zinc-400">Temperatura</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-white">
                  {stats.temperature.current}°C
                </span>
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                  {getTrendIcon(stats.temperature.current, stats.temperature.avg)}
                  <span>
                    {stats.temperature.min}° - {stats.temperature.max}°
                  </span>
                </div>
              </div>
            </div>
          )}
          {stats.humidity && (
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Droplets className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-zinc-400">Humedad</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-white">
                  {stats.humidity.current}%
                </span>
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                  {getTrendIcon(stats.humidity.current, stats.humidity.avg)}
                  <span>
                    {stats.humidity.min}% - {stats.humidity.max}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gráfico compacto */}
      <div
        className={`bg-zinc-800/30 rounded-lg p-3 cursor-pointer transition-all ${
          isExpanded ? 'h-64' : 'h-32'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-500">{readings.length} lecturas</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#71717a' }}
              tickLine={false}
              axisLine={false}
            />
            {isExpanded && (
              <YAxis
                tick={{ fontSize: 10, fill: '#71717a' }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelFormatter={(_, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullTime;
                }
                return '';
              }}
            />
            {isExpanded && <Legend />}
            {availableMetrics.map((metric) => 
              visibleMetrics.has(metric.key) && (
                <Line
                  key={metric.key}
                  type="monotone"
                  dataKey={metric.key}
                  name={`${metric.label} (${metric.unit})`}
                  stroke={metric.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Modal para vista completa */}
      {showModal && (
        <HistoryModal
          deviceId={deviceId}
          deviceName={deviceName}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// Modal de historial completo
function HistoryModal({
  deviceId,
  deviceName,
  onClose,
}: {
  deviceId: string;
  deviceName?: string;
  onClose: () => void;
}) {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [visibleMetrics, setVisibleMetrics] = useState<Set<MetricKey>>(() => new Set<MetricKey>(['temperature', 'humidity']));

  const toggleMetric = (key: MetricKey) => {
    setVisibleMetrics(prev => {
      const newSet = new Set<MetricKey>(prev);
      if (newSet.has(key)) {
        if (newSet.size > 1) newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const availableMetrics = METRICS.filter(m => {
    if (readings.length === 0) return m.key !== 'co2';
    return readings.some(r => r[m.key] !== null && r[m.key] !== undefined);
  });

  useEffect(() => {
    loadHistory();
  }, [dateFrom, dateTo]);

  async function loadHistory() {
    setIsLoading(true);
    try {
      const data = await api.get<SensorReading[]>(
        `/devices/${deviceId}/history?from=${dateFrom}T00:00:00&to=${dateTo}T23:59:59`,
      );
      setReadings(data);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const chartData = readings.map((r) => ({
    time: new Date(r.recordedAt).toLocaleString('es-AR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    temperature: r.temperature,
    humidity: r.humidity,
    co2: r.co2,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-zinc-800 rounded-2xl border border-zinc-700 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            Historial de Sensores {deviceName && `- ${deviceName}`}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded-lg">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Filtros de fecha y selector de métricas */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm"
              />
            </div>
            <div className="text-sm text-zinc-500 mt-5">
              {readings.length} lecturas
            </div>
          </div>
          
          {/* Selector de métricas */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Mostrar:</span>
            {availableMetrics.map((metric) => {
              const Icon = metric.icon;
              const isActive = visibleMetrics.has(metric.key);
              return (
                <button
                  key={metric.key}
                  onClick={() => toggleMetric(metric.key)}
                  className={`
                    flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all text-xs
                    ${isActive 
                      ? 'bg-zinc-700 text-white' 
                      : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: metric.color }} />
                  <span>{metric.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Gráfico grande */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : readings.length > 0 ? (
          <div className="h-96 bg-zinc-800/30 rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                {availableMetrics.map((metric) => 
                  visibleMetrics.has(metric.key) && (
                    <Line
                      key={metric.key}
                      type="monotone"
                      dataKey={metric.key}
                      name={`${metric.label} (${metric.unit})`}
                      stroke={metric.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  )
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-16">
            <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-500">Sin lecturas en el período seleccionado</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}



