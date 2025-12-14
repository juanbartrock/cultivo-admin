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
  Power,
  History,
  ArrowRightLeft,
  MoreVertical,
  Check
} from 'lucide-react';
import { deviceService } from '@/services/deviceService';
import { sectionService } from '@/services/locationService';
import { Section } from '@/types';
import { useToast } from '@/contexts/ToastContext';

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
  /** Callback cuando se reasigna el dispositivo */
  onReassign?: () => void;
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
  onRefresh,
  onReassign
}: EnvironmentPanelProps) {
  const { toast } = useToast();
  // Hook de control (solo se usa si hay device)
  const { toggle, controlling } = useDeviceControl(device?.id || '');
  const [optimisticState, setOptimisticState] = useState<boolean | null>(null);
  const [recordHistory, setRecordHistory] = useState<boolean>(device?.recordHistory ?? false);
  const [togglingHistory, setTogglingHistory] = useState(false);
  
  // Estados para reasignación
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isReassigning, setIsReassigning] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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

  const handleToggleRecordHistory = useCallback(async () => {
    if (togglingHistory || !device) return;
    setTogglingHistory(true);
    const newValue = !recordHistory;
    setRecordHistory(newValue); // Optimistic
    
    try {
      await deviceService.update(device.id, { recordHistory: newValue });
      onRefresh?.();
    } catch (err) {
      console.error('Error toggling recordHistory:', err);
      setRecordHistory(!newValue); // Revert
    } finally {
      setTogglingHistory(false);
    }
  }, [togglingHistory, recordHistory, device, onRefresh]);

  // Función para abrir modal de reasignación
  const openReassignModal = useCallback(async () => {
    if (!device) return;
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
  }, [device, toast]);

  // Función para reasignar el dispositivo
  const handleReassign = useCallback(async () => {
    if (!device || !selectedSectionId) return;

    setIsReassigning(true);
    try {
      await deviceService.update(device.id, { sectionId: selectedSectionId });
      setShowReassignModal(false);
      setSelectedSectionId(null);
      toast.success('Dispositivo reasignado correctamente');
      onReassign?.();
      onRefresh?.();
    } catch (err) {
      console.error('Error reasignando dispositivo:', err);
      toast.error('Error al reasignar el dispositivo');
    } finally {
      setIsReassigning(false);
    }
  }, [device, selectedSectionId, toast, onReassign, onRefresh]);

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
      {(sensorName || lastUpdate || device) && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {sensorName && (
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-cultivo-green-500" />
                <span className="text-sm font-medium text-zinc-300">{sensorName}</span>
              </div>
            )}
            {/* Toggle registrar historial */}
            {device && (
              <button
                onClick={handleToggleRecordHistory}
                disabled={togglingHistory}
                title={recordHistory ? 'Historial habilitado' : 'Habilitar registro de historial'}
                className={`
                  flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all
                  ${togglingHistory ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                  ${recordHistory 
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30' 
                    : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 hover:bg-zinc-700/50 hover:text-zinc-300'
                  }
                `}
              >
                <History className="w-3.5 h-3.5" />
                <span>{recordHistory ? 'Historial ON' : 'Historial OFF'}</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-xs text-zinc-500">
                Actualizado: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            {/* Menú de opciones para reasignar */}
            {device && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 rounded-lg hover:bg-zinc-700/50 transition-colors"
                  title="Opciones del sensor"
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
            )}
          </div>
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
                {/* Mostrar dispositivo controlado si existe */}
                {device.controlledDevices && device.controlledDevices.length > 0 && (
                  <p className="text-xs text-cyan-400 mt-1">
                    → Controla: {device.controlledDevices.map(d => d.name).join(', ')}
                  </p>
                )}
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

      {/* Modal de Reasignación de Dispositivo */}
      {showReassignModal && device && (
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
                      } ${isReassigning ? 'opacity-50 cursor-not-allowed' : ''}`}
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
