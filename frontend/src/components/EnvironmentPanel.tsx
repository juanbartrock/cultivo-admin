'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DeviceStatus, Device } from '@/types';
import { useDeviceControl } from '@/hooks/useDeviceStatus';
import { 
  Thermometer, 
  Droplets, 
  Wind,
  Gauge,
  CloudRain,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Power
} from 'lucide-react';

interface EnvironmentData {
  temperature?: number;
  humidity?: number;
  co2?: number;
  vpd?: number;
  lightIntensity?: number;
}

interface EnvironmentPanelProps {
  /** Dispositivo sensor (opcional, para controles) */
  device?: Device;
  /** Nombre del sensor o sección */
  sensorName?: string;
  /** Datos del ambiente desde el status del dispositivo */
  status: DeviceStatus | null;
  /** Si está cargando */
  loading?: boolean;
  /** Última actualización */
  lastUpdate?: Date;
  /** Callback para refrescar */
  onRefresh?: () => void;
}

// Rangos óptimos para cultivo
const OPTIMAL_RANGES = {
  temperature: { min: 20, max: 28, unit: '°C' },
  humidity: { min: 40, max: 70, unit: '%' },
  co2: { min: 400, max: 1500, unit: 'ppm' },
  vpd: { min: 0.8, max: 1.2, unit: 'kPa' },
};

function getValueStatus(value: number | undefined, type: keyof typeof OPTIMAL_RANGES): 'low' | 'optimal' | 'high' | 'unknown' {
  if (value === undefined) return 'unknown';
  const range = OPTIMAL_RANGES[type];
  if (!range) return 'unknown';
  
  if (value < range.min) return 'low';
  if (value > range.max) return 'high';
  return 'optimal';
}

function getStatusColor(status: 'low' | 'optimal' | 'high' | 'unknown') {
  switch (status) {
    case 'optimal': return 'text-cultivo-green-400';
    case 'low': return 'text-blue-400';
    case 'high': return 'text-orange-400';
    default: return 'text-zinc-500';
  }
}

function getStatusBg(status: 'low' | 'optimal' | 'high' | 'unknown') {
  switch (status) {
    case 'optimal': return 'bg-cultivo-green-500/10 border-cultivo-green-500/30';
    case 'low': return 'bg-blue-500/10 border-blue-500/30';
    case 'high': return 'bg-orange-500/10 border-orange-500/30';
    default: return 'bg-zinc-800/50 border-zinc-700/50';
  }
}

function StatusIcon({ status }: { status: 'low' | 'optimal' | 'high' | 'unknown' }) {
  switch (status) {
    case 'optimal': return <Minus className="w-3 h-3" />;
    case 'low': return <TrendingDown className="w-3 h-3" />;
    case 'high': return <TrendingUp className="w-3 h-3" />;
    default: return null;
  }
}

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value?: number;
  unit: string;
  type?: keyof typeof OPTIMAL_RANGES;
  decimals?: number;
  iconColor: string;
}

function MetricCard({ icon: Icon, label, value, unit, type, decimals = 1, iconColor }: MetricCardProps) {
  const status = type ? getValueStatus(value, type) : 'unknown';
  const hasValue = value !== undefined && !isNaN(value);
  
  return (
    <div className={`
      relative overflow-hidden
      rounded-xl p-4 border
      ${hasValue ? getStatusBg(status) : 'bg-zinc-800/30 border-zinc-700/50'}
      transition-all duration-300
    `}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg bg-zinc-900/50`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          {hasValue && type && (
            <div className={`flex items-center gap-1 text-xs ${getStatusColor(status)}`}>
              <StatusIcon status={status} />
              <span className="capitalize">{status === 'optimal' ? 'Óptimo' : status === 'low' ? 'Bajo' : status === 'high' ? 'Alto' : ''}</span>
            </div>
          )}
        </div>
        
        <p className="text-xs text-zinc-500 mb-1">{label}</p>
        
        {hasValue ? (
          <p className={`text-3xl font-bold ${getStatusColor(status)}`}>
            {typeof value === 'number' ? value.toFixed(decimals) : value}
            <span className="text-lg font-normal text-zinc-500 ml-1">{unit}</span>
          </p>
        ) : (
          <p className="text-2xl font-bold text-zinc-600">--</p>
        )}
        
        {/* Range indicator */}
        {hasValue && type && OPTIMAL_RANGES[type] && (
          <p className="text-[10px] text-zinc-600 mt-2">
            Óptimo: {OPTIMAL_RANGES[type].min}-{OPTIMAL_RANGES[type].max} {OPTIMAL_RANGES[type].unit}
          </p>
        )}
      </div>
    </div>
  );
}

export default function EnvironmentPanel({ 
  device,
  sensorName,
  status, 
  loading = false,
  lastUpdate,
  onRefresh 
}: EnvironmentPanelProps) {
  // Hook de control (solo se usa si hay device)
  const { toggle, controlling } = useDeviceControl(device?.id || '');
  const [optimisticState, setOptimisticState] = useState<boolean | null>(null);

  // Extraer y parsear valores del status (pueden venir como string o number)
  const temperature = status?.temperature !== undefined 
    ? parseFloat(String(status.temperature)) 
    : undefined;
  const humidity = status?.humidity !== undefined 
    ? parseFloat(String(status.humidity)) 
    : undefined;
  const co2 = status?.co2 !== undefined 
    ? parseFloat(String(status.co2)) 
    : undefined;
  
  // Calcular VPD si tenemos temp y humedad válidos
  const vpd = temperature !== undefined && humidity !== undefined && !isNaN(temperature) && !isNaN(humidity)
    ? calculateVPD(temperature, humidity)
    : undefined;

  const hasAnyData = temperature !== undefined || humidity !== undefined || co2 !== undefined;
  
  // Detectar si tiene capacidad de control (switch o state en el status)
  const switchState = status?.switch as string | undefined;
  const stateValue = status?.state as string | undefined;
  const currentState = switchState || stateValue;
  const hasControlCapability = currentState !== undefined;
  const isOn = optimisticState ?? (currentState === 'on');
  const isOnline = status?.online !== false;

  // Reset optimistic state cuando cambia el status
  useEffect(() => {
    if (currentState) {
      setOptimisticState(null);
    }
  }, [currentState]);

  const handleToggle = useCallback(async () => {
    if (controlling || !isOnline || !device) return;
    
    setOptimisticState(!isOn);
    
    const success = await toggle(isOn);
    
    if (success) {
      onRefresh?.();
    } else {
      setOptimisticState(null);
    }
  }, [controlling, isOnline, device, isOn, toggle, onRefresh]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-zinc-800/30 rounded-2xl p-8 border border-zinc-700/50"
      >
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-cultivo-green-500 animate-spin" />
          <p className="text-sm text-zinc-400">Obteniendo datos del sensor...</p>
        </div>
      </motion.div>
    );
  }

  if (!hasAnyData) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-zinc-800/30 rounded-2xl p-8 border border-zinc-700/50"
      >
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle className="w-10 h-10 text-yellow-500/60" />
          <div>
            <p className="text-zinc-300 font-medium">Sin datos ambientales</p>
            <p className="text-sm text-zinc-500 mt-1">
              El sensor no está enviando datos o no está configurado correctamente
            </p>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="mt-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-zinc-300 transition-colors"
            >
              Reintentar
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header con nombre del sensor y última actualización */}
      {(sensorName || lastUpdate) && (
        <div className="flex items-center justify-between">
          {sensorName && (
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-cultivo-green-500" />
              <span className="text-sm font-medium text-zinc-300">{sensorName}</span>
            </div>
          )}
          {lastUpdate && (
            <span className="text-xs text-zinc-500">
              Actualizado: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Grid de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Thermometer}
          label="Temperatura"
          value={temperature}
          unit="°C"
          type="temperature"
          iconColor="text-orange-400"
        />
        
        <MetricCard
          icon={Droplets}
          label="Humedad"
          value={humidity}
          unit="%"
          type="humidity"
          decimals={0}
          iconColor="text-blue-400"
        />
        
        <MetricCard
          icon={Wind}
          label="CO₂"
          value={co2}
          unit="ppm"
          type="co2"
          decimals={0}
          iconColor="text-emerald-400"
        />
        
        <MetricCard
          icon={CloudRain}
          label="VPD"
          value={vpd}
          unit="kPa"
          type="vpd"
          decimals={2}
          iconColor="text-purple-400"
        />
      </div>

      {/* Control del sensor si tiene capacidad */}
      {hasControlCapability && device && (
        <div className="mt-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`
                w-3 h-3 rounded-full 
                ${isOn ? 'bg-cultivo-green-400 animate-pulse' : 'bg-zinc-600'}
              `} />
              <div>
                <p className="text-sm font-medium text-white">
                  Control del Sensor
                </p>
                <p className="text-xs text-zinc-500">
                  {isOn ? 'Salida activa' : 'Salida inactiva'} • {device.connector}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleToggle}
              disabled={controlling || !isOnline}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                transition-all duration-200
                ${isOn 
                  ? 'bg-cultivo-green-600 hover:bg-cultivo-green-700 text-white' 
                  : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                }
                ${(!isOnline || controlling) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {controlling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>...</span>
                </>
              ) : (
                <>
                  <Power className={`w-4 h-4 ${isOn ? 'text-white' : 'text-zinc-400'}`} />
                  <span>{isOn ? 'ON' : 'OFF'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Calcula el Déficit de Presión de Vapor (VPD)
 * Fórmula: VPD = SVP × (1 - RH/100)
 * Donde SVP = 0.6108 × exp((17.27 × T) / (T + 237.3))
 */
function calculateVPD(temperature: number, humidity: number): number | undefined {
  // Validar que los valores sean números válidos
  if (typeof temperature !== 'number' || typeof humidity !== 'number' ||
      isNaN(temperature) || isNaN(humidity) ||
      !isFinite(temperature) || !isFinite(humidity)) {
    return undefined;
  }
  const svp = 0.6108 * Math.exp((17.27 * temperature) / (temperature + 237.3));
  const vpd = svp * (1 - humidity / 100);
  // Validar resultado
  return isNaN(vpd) || !isFinite(vpd) ? undefined : vpd;
}
