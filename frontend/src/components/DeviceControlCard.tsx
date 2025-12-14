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
  AlertCircle,
  History,
  ArrowRightLeft,
  Check,
  MoreVertical
} from 'lucide-react';
import { deviceService } from '@/services/deviceService';
import { sectionService } from '@/services/locationService';
import { Section } from '@/types';
import { useToast } from '@/contexts/ToastContext';

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
  onReassign?: (device: Device, newSectionId: string) => void;
  delay?: number;
}

export default function DeviceControlCard({ 
  device, 
  status, 
  loading = false,
  onStatusChange,
  onReassign,
  delay = 0 
}: DeviceControlCardProps) {
  const { toast } = useToast();
  const Icon = iconMap[device.type] || Activity;
  const colors = typeColors[device.type] || { icon: 'text-cultivo-green-400', bg: 'bg-cultivo-green-500/10', border: 'border-cultivo-green-500/30' };
  
  const { toggle, controlling } = useDeviceControl(device.id);
  const [optimisticState, setOptimisticState] = useState<boolean | null>(null);
  const [recordHistory, setRecordHistory] = useState<boolean>(device.recordHistory ?? false);
  const [togglingHistory, setTogglingHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isReassigning, setIsReassigning] = useState(false);

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

  const handleToggleRecordHistory = useCallback(async () => {
    if (togglingHistory) return;
    setTogglingHistory(true);
    const newValue = !recordHistory;
    setRecordHistory(newValue); // Optimistic
    
    try {
      await deviceService.update(device.id, { recordHistory: newValue });
      onStatusChange?.();
    } catch (err) {
      console.error('Error toggling recordHistory:', err);
      setRecordHistory(!newValue); // Revert
    } finally {
      setTogglingHistory(false);
    }
  }, [togglingHistory, recordHistory, device.id, onStatusChange]);

  // Función para cargar secciones y abrir modal de reasignación
  const openReassignModal = async () => {
    setShowMenu(false);
    setShowReassignModal(true);
    setSelectedSectionId(null);
    setLoadingSections(true);
    try {
      const allSections = await sectionService.getAll();
      // Filtrar la sección actual
      setSections(allSections.filter(s => s.id !== device.sectionId));
    } catch (err) {
      console.error('Error cargando secciones:', err);
      toast.error('Error al cargar las secciones disponibles');
    } finally {
      setLoadingSections(false);
    }
  };

  // Función para reasignar el dispositivo a otra sección
  const handleReassign = async () => {
    if (!selectedSectionId) {
      setShowReassignModal(false);
      return;
    }

    setIsReassigning(true);
    try {
      await deviceService.update(device.id, { sectionId: selectedSectionId });
      onReassign?.(device, selectedSectionId);
      setShowReassignModal(false);
      toast.success('Dispositivo reasignado correctamente');
      onStatusChange?.();
    } catch (err) {
      console.error('Error reasignando dispositivo:', err);
      toast.error('Error al reasignar el dispositivo');
    } finally {
      setIsReassigning(false);
    }
  };

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

          {/* Menu de opciones */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-lg hover:bg-zinc-700/50 transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-zinc-400" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 min-w-[150px] py-1">
                  <button
                    onClick={openReassignModal}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                    Reasignar sección
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Device info */}
      <h3 className="font-semibold text-white mb-0.5 truncate" title={device.name}>
        {device.name}
      </h3>
      
      <p className="text-xs text-zinc-500 mb-1">
        {typeLabels[device.type]} • {device.connector}
      </p>
      
      {/* Mostrar controlador para dispositivos virtuales */}
      {device.connector === 'VIRTUAL' && (
        <p className="text-xs text-cyan-400 mb-3">
          {device.controlledBy 
            ? `→ Controlado por: ${device.controlledBy.name}` 
            : '⚠️ Sin controlador asignado'
          }
        </p>
      )}

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

          {/* Toggle registrar historial */}
          <button
            onClick={handleToggleRecordHistory}
            disabled={togglingHistory}
            className={`
              w-full flex items-center justify-between 
              bg-zinc-900/50 rounded-lg px-3 py-2
              hover:bg-zinc-800/80 transition-colors
              ${togglingHistory ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center gap-2">
              <History className={`w-4 h-4 ${recordHistory ? 'text-purple-400' : 'text-zinc-500'}`} />
              <span className="text-xs text-zinc-400">Registrar historial</span>
            </div>
            <div className={`
              w-8 h-4 rounded-full transition-colors relative
              ${recordHistory ? 'bg-purple-500' : 'bg-zinc-700'}
            `}>
              <div className={`
                absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform
                ${recordHistory ? 'translate-x-4' : 'translate-x-0.5'}
              `} />
            </div>
          </button>

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

      {/* Modal de Reasignación de Dispositivo */}
      {showReassignModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowReassignModal(false);
              setSelectedSectionId(null);
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-sm relative z-[10000]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-white">Reasignar Dispositivo</h3>
              <p className="text-sm text-zinc-400 mt-1">
                {device.name} - Selecciona la nueva sección
              </p>
            </div>

            <div className="p-4">
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-xs text-amber-400">
                  ⚠️ El historial de lecturas permanecerá asociado a la sección actual.
                </p>
              </div>

              {loadingSections ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-cultivo-green-400 animate-spin" />
                </div>
              ) : sections.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  No hay otras secciones disponibles
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setSelectedSectionId(section.id)}
                      disabled={isReassigning}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        selectedSectionId === section.id
                          ? 'bg-cyan-500/20 border-cyan-500 ring-2 ring-cyan-500/30'
                          : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <ArrowRightLeft className={`w-5 h-5 ${selectedSectionId === section.id ? 'text-cyan-400' : 'text-zinc-500'}`} />
                      <div className="flex-1 text-left">
                        <span className={`font-medium ${selectedSectionId === section.id ? 'text-cyan-400' : 'text-zinc-300'}`}>
                          {section.name}
                        </span>
                        {section.dimensions && (
                          <span className="text-xs text-zinc-500 ml-2">({section.dimensions})</span>
                        )}
                      </div>
                      {selectedSectionId === section.id && (
                        <Check className="w-5 h-5 text-cyan-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowReassignModal(false);
                  setSelectedSectionId(null);
                }}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                disabled={isReassigning}
              >
                Cancelar
              </button>
              {selectedSectionId && (
                <button
                  onClick={handleReassign}
                  disabled={isReassigning}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isReassigning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Reasignando...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-4 h-4" />
                      Reasignar
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
