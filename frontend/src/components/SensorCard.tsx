'use client';

import { motion } from 'framer-motion';
import { Device, DeviceType } from '@/types';
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
  WifiOff
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
const typeColors: Record<DeviceType, string> = {
  SENSOR: 'text-orange-400',
  LUZ: 'text-yellow-400',
  EXTRACTOR: 'text-blue-400',
  VENTILADOR: 'text-cyan-400',
  HUMIDIFICADOR: 'text-blue-300',
  DESHUMIDIFICADOR: 'text-purple-400',
  AIRE_ACONDICIONADO: 'text-sky-400',
  BOMBA_RIEGO: 'text-teal-400',
  CALEFACTOR: 'text-red-400',
  CAMARA: 'text-emerald-400',
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

interface SensorCardProps {
  device: Device;
  delay?: number;
}

export default function SensorCard({ device, delay = 0 }: SensorCardProps) {
  const Icon = iconMap[device.type] || Activity;
  const color = typeColors[device.type] || 'text-cultivo-green-400';
  
  // Extraer valores del metadata si existen
  const temperature = device.metadata?.temperature as number | undefined;
  const humidity = device.metadata?.humidity as number | undefined;
  const isOnline = device.metadata?.online !== false; // Por defecto true si no existe
  const state = device.metadata?.state as string | undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05 }}
      className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-4 hover:border-cultivo-green-600/30 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg bg-zinc-700/50`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="flex items-center gap-1">
          {isOnline ? (
            <Wifi className="w-3 h-3 text-cultivo-green-400" />
          ) : (
            <WifiOff className="w-3 h-3 text-zinc-500" />
          )}
          {state && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              state === 'on' 
                ? 'bg-cultivo-green-500/20 text-cultivo-green-400' 
                : 'bg-zinc-700 text-zinc-400'
            }`}>
              {state.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <h3 className="font-medium text-white mb-1 truncate" title={device.name}>
        {device.name}
      </h3>
      
      <p className="text-xs text-zinc-500 mb-2">
        {typeLabels[device.type]}
      </p>

      {/* Mostrar valores si es un sensor */}
      {device.type === 'SENSOR' && (temperature !== undefined || humidity !== undefined) && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-700/50">
          {temperature !== undefined && (
            <div className="flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-orange-400" />
              <span className="text-sm font-medium text-white">{temperature}°C</span>
            </div>
          )}
          {humidity !== undefined && (
            <div className="flex items-center gap-1">
              <Droplets className="w-3 h-3 text-blue-400" />
              <span className="text-sm font-medium text-white">{humidity}%</span>
            </div>
          )}
        </div>
      )}

      {/* Info del conector */}
      <div className="mt-2 text-xs text-zinc-600">
        {device.connector}
      </div>
    </motion.div>
  );
}
