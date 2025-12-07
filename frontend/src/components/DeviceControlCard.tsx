'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Device, DeviceType, DeviceStatus } from '@/types';
import { useDeviceControl } from '@/hooks/useDeviceStatus';
import CameraViewer from './CameraViewer';
import { 
  Thermometer, 
  Lightbulb, 
  Wind, 
  Fan, 
  Droplets, 
  Droplet, 
  Snowflake, 
  Flame, 
  Activity,
  Video,
  Wifi,
  WifiOff,
  Power,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

// Mapa de iconos por tipo de dispositivo
const iconMap: Record<DeviceType, React.ElementType> = {
  SENSOR: Thermometer,
  LUZ: Lightbulb,
  EXTRACTOR: Wind,
  VENTILADOR: Fan,
  HUMIDIFICADOR: Droplets,
  DESHUMIDIFICADOR: Droplet,
  AIRE_ACONDICIONADO: Snowflake,
  BOMBA_RIEGO: Droplets,
  CALEFACTOR: Flame,
  CAMARA: Video,
};

// Colores por tipo
const typeColors: Record<DeviceType, { icon: string; bg: string; border: string }> = {
  SENSOR: { icon: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  LUZ: { icon: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  EXTRACTOR: { icon: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  VENTILADOR: { icon: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  HUMIDIFICADOR: { icon: 'text-blue-300', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  DESHUMIDIFICADOR: { icon: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  AIRE_ACONDICIONADO: { icon: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
  BOMBA_RIEGO: { icon: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30' },
  CALEFACTOR: { icon: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  CAMARA: { icon: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
};

// Labels
const typeLabels: Record<DeviceType, string> = {
  SENSOR: 'Sensor',
  LUZ: 'Luz',
  EXTRACTOR: 'Extractor',
  VENTILADOR: 'Ventilador',
  HUMIDIFICADOR: 'Humidificador',
  DESHUMIDIFICADOR: 'Deshumidificador',
  AIRE_ACONDICIONADO: 'Aire Acond.',
  BOMBA_RIEGO: 'Riego',
  CALEFACTOR: 'Calefactor',
  CAMARA: 'Cámara',
};

// Tipos de dispositivos que típicamente se pueden controlar (on/off)
const CONTROLLABLE_TYPES: DeviceType[] = [
  'LUZ', 'EXTRACTOR', 'VENTILADOR', 'HUMIDIFICADOR', 
  'DESHUMIDIFICADOR', 'AIRE_ACONDICIONADO', 'BOMBA_RIEGO', 'CALEFACTOR'
];

// Detectar si un dispositivo tiene capacidad de control basado en el status
function hasControlCapability(status: DeviceStatus | null, deviceType: DeviceType): boolean {
  // Siempre controlable si es un tipo controlable
  if (CONTROLLABLE_TYPES.includes(deviceType)) return true;
  
  // También controlable si el status tiene un campo 'switch' o 'state' (sensores con relé)
  if (status) {
    const hasSwitch = 'switch' in status && status.switch !== undefined;
    const hasState = 'state' in status && status.state !== undefined;
    return hasSwitch || hasState;
  }
  
  return false;
}

interface DeviceControlCardProps {
  device: Device;
  status: DeviceStatus | null;
  loading?: boolean;
  onStatusChange?: () => void;
  delay?: number;
}

export default function DeviceControlCard({ 
  device, 
  status, 
  loading = false,
  onStatusChange,
  delay = 0 
}: DeviceControlCardProps) {
  const Icon = iconMap[device.type] || Activity;
  const colors = typeColors[device.type] || { icon: 'text-cultivo-green-400', bg: 'bg-cultivo-green-500/10', border: 'border-cultivo-green-500/30' };
  
  const { toggle, controlling } = useDeviceControl(device.id);
  const [optimisticState, setOptimisticState] = useState<boolean | null>(null);

  const isOnline = status?.online !== false;
  
  // Detectar estado ON/OFF - puede venir como 'state' o 'switch' (SONOFF usa 'switch')
  const switchState = status?.switch as string | undefined;
  const stateValue = status?.state as string | undefined;
  const currentState = switchState || stateValue;
  const isOn = optimisticState ?? (currentState === 'on');
  
  // Detectar si este dispositivo puede controlarse
  const isControllable = hasControlCapability(status, device.type);

  // Reset optimistic state when status updates
  useEffect(() => {
    if (status?.state) {
      setOptimisticState(null);
    }
  }, [status?.state]);

  const handleToggle = useCallback(async () => {
    if (controlling || !isOnline) return;
    
    // Optimistic update
    setOptimisticState(!isOn);
    
    const success = await toggle(isOn);
    
    if (success) {
      // Notificar para refrescar
      onStatusChange?.();
    } else {
      // Revertir si falla
      setOptimisticState(null);
    }
  }, [controlling, isOnline, isOn, toggle, onStatusChange]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05 }}
      className={`
        relative overflow-hidden
        bg-zinc-800/50 backdrop-blur-sm 
        border ${isOn && isControllable ? 'border-cultivo-green-500/50' : 'border-zinc-700/50'} 
        rounded-xl p-4 
        hover:border-cultivo-green-600/30 transition-all duration-300
        ${isOn && isControllable ? 'shadow-lg shadow-cultivo-green-500/10' : ''}
      `}
    >
      {/* Glow effect cuando está encendido */}
      {isOn && isControllable && (
        <div className="absolute inset-0 bg-gradient-to-br from-cultivo-green-500/5 to-transparent pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3 relative">
        <div className={`p-2.5 rounded-xl ${colors.bg} ${colors.border} border`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Status indicator */}
          {loading ? (
            <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
          ) : isOnline ? (
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-cultivo-green-400" />
              <span className="w-2 h-2 rounded-full bg-cultivo-green-400 animate-pulse" />
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5 text-zinc-500" />
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
            </div>
          )}
        </div>
      </div>

      {/* Device info */}
      <h3 className="font-semibold text-white mb-0.5 truncate" title={device.name}>
        {device.name}
      </h3>
      
      <p className="text-xs text-zinc-500 mb-3">
        {typeLabels[device.type]} • {device.connector}
      </p>

      {/* Sensor values */}
      {device.type === 'SENSOR' && status && (
        <div className="space-y-2 mb-3">
          {/* Temperatura */}
          {status.temperature !== undefined && (
            <div className="flex items-center justify-between bg-zinc-900/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-zinc-400">Temperatura</span>
              </div>
              <span className="text-lg font-bold text-white">
                {parseFloat(String(status.temperature)).toFixed(1)}°C
              </span>
            </div>
          )}
          
          {/* Humedad */}
          {status.humidity !== undefined && (
            <div className="flex items-center justify-between bg-zinc-900/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-zinc-400">Humedad</span>
              </div>
              <span className="text-lg font-bold text-white">
                {parseFloat(String(status.humidity)).toFixed(0)}%
              </span>
            </div>
          )}

          {/* CO2 si existe */}
          {status.co2 !== undefined && (
            <div className="flex items-center justify-between bg-zinc-900/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-zinc-400">CO₂</span>
              </div>
              <span className="text-lg font-bold text-white">
                {parseFloat(String(status.co2)).toFixed(0)} ppm
              </span>
            </div>
          )}

          {/* Si no hay valores */}
          {status.temperature === undefined && status.humidity === undefined && (
            <div className="flex items-center justify-center gap-2 py-4 text-zinc-500">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">Sin datos del sensor</span>
            </div>
          )}
        </div>
      )}

      {/* Control buttons for controllable devices */}
      {isControllable && (
        <button
          onClick={handleToggle}
          disabled={controlling || !isOnline}
          className={`
            w-full flex items-center justify-center gap-2 
            py-2.5 rounded-lg font-medium text-sm
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
              <span>Procesando...</span>
            </>
          ) : (
            <>
              <Power className={`w-4 h-4 ${isOn ? 'text-white' : 'text-zinc-400'}`} />
              <span>{isOn ? 'Encendido' : 'Apagado'}</span>
            </>
          )}
        </button>
      )}

      {/* Camera viewer */}
      {device.type === 'CAMARA' && (
        <CameraViewer 
          device={device} 
          status={status} 
          loading={loading}
        />
      )}
    </motion.div>
  );
}
