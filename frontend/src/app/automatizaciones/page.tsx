'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Plus,
  Play,
  Pause,
  Settings,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Activity,
  Loader2,
  RefreshCw,
  BarChart3,
  Calendar,
  Power,
  Thermometer,
  Droplets,
  X,
  Timer,
  Repeat,
  Sun,
  Moon,
  CalendarClock,
  Sparkles,
  Target,
  Camera,
  CheckSquare,
} from 'lucide-react';
import { automationService, EffectivenessStats } from '@/services/automationService';
import { sectionService } from '@/services/locationService';
import { deviceService } from '@/services/deviceService';
import { plantService } from '@/services/growService';
import {
  Automation,
  AutomationStatus,
  Section,
  Device,
  Plant,
  AutomationExecution,
  CreateAutomationDto,
  ConditionOperator,
  ActionType,
  TriggerType,
  ScheduleType,
} from '@/types';

const statusConfig: Record<AutomationStatus, { label: string; color: string; icon: React.ElementType }> = {
  ACTIVE: { label: 'Activa', color: 'text-green-400 bg-green-500/20 border-green-500/30', icon: Play },
  PAUSED: { label: 'Pausada', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30', icon: Pause },
  DISABLED: { label: 'Deshabilitada', color: 'text-zinc-400 bg-zinc-500/20 border-zinc-500/30', icon: XCircle },
};

const executionStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'text-zinc-400' },
  RUNNING: { label: 'Ejecutando', color: 'text-blue-400' },
  COMPLETED: { label: 'Completada', color: 'text-green-400' },
  FAILED: { label: 'Fallida', color: 'text-red-400' },
  CANCELLED: { label: 'Cancelada', color: 'text-yellow-400' },
};

const operatorLabels: Record<ConditionOperator, string> = {
  GREATER_THAN: 'Mayor que',
  LESS_THAN: 'Menor que',
  EQUALS: 'Igual a',
  NOT_EQUALS: 'Diferente de',
  BETWEEN: 'Entre',
  OUTSIDE: 'Fuera de',
};

const actionLabels: Record<ActionType, string> = {
  TURN_ON: 'Encender',
  TURN_OFF: 'Apagar',
  TOGGLE: 'Alternar',
  CAPTURE_PHOTO: 'Capturar foto',
  TRIGGER_IRRIGATION: 'Activar riego',
};

const triggerTypeLabels: Record<TriggerType, { label: string; desc: string; icon: React.ElementType }> = {
  SCHEDULED: { label: 'Programada', desc: 'Basada solo en horarios', icon: CalendarClock },
  CONDITION: { label: 'Por condición', desc: 'Basada en sensores', icon: Target },
  HYBRID: { label: 'Híbrida', desc: 'Horarios + condiciones', icon: Sparkles },
};

const scheduleTypeLabels: Record<ScheduleType, { label: string; desc: string; icon: React.ElementType }> = {
  TIME_RANGE: { label: 'Rango horario', desc: 'ON desde X hasta Y', icon: Sun },
  INTERVAL: { label: 'Intervalo', desc: 'Cada X horas', icon: Repeat },
  SPECIFIC_TIMES: { label: 'Horas específicas', desc: 'A las 8:00, 14:00, etc.', icon: Clock },
};

const daysOfWeekLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function AutomatizacionesPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);
  const [effectiveness, setEffectiveness] = useState<EffectivenessStats | null>(null);
  const [automationPlants, setAutomationPlants] = useState<Plant[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionsPage, setExecutionsPage] = useState(1);
  const executionsPerPage = 5;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedAutomation) {
      loadAutomationDetails(selectedAutomation.id);
    }
  }, [selectedAutomation?.id]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const [automationsData, sectionsData, devicesData] = await Promise.all([
        automationService.getAll(),
        sectionService.getAll(),
        deviceService.getAll(),
      ]);
      setAutomations(automationsData);
      setSections(sectionsData);
      setDevices(devicesData);
      
      if (automationsData.length > 0 && !selectedAutomation) {
        setSelectedAutomation(automationsData[0]);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar los datos. Verifica que el backend esté corriendo.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAutomationDetails(id: string) {
    setIsLoadingDetails(true);
    try {
      const [executionsData, effectivenessData] = await Promise.all([
        automationService.getExecutions(id, { limit: 50 }),
        automationService.getEffectiveness(id, 30),
      ]);
      setExecutions(executionsData);
      setEffectiveness(effectivenessData);
      setExecutionsPage(1); // Resetear a la primera página cuando cambia la automatización
      
      // Cargar plantas asociadas si existen
      if (selectedAutomation?.plantIds && selectedAutomation.plantIds.length > 0) {
        try {
          const plantsData = await Promise.all(
            selectedAutomation.plantIds.map(plantId => plantService.getById(plantId))
          );
          setAutomationPlants(plantsData);
        } catch (err) {
          console.error('Error loading automation plants:', err);
          setAutomationPlants([]);
        }
      } else {
        setAutomationPlants([]);
      }
    } catch (err) {
      console.error('Error loading automation details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  }

  async function handleStatusChange(automation: Automation, newStatus: AutomationStatus) {
    try {
      const updated = await automationService.setStatus(automation.id, newStatus);
      setAutomations(automations.map(a => a.id === updated.id ? updated : a));
      if (selectedAutomation?.id === updated.id) {
        setSelectedAutomation(updated);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Error al cambiar el estado');
    }
  }

  async function handleExecute(automation: Automation) {
    try {
      const result = await automationService.execute(automation.id, true);
      if (result.success) {
        alert('Automatización ejecutada correctamente');
        loadAutomationDetails(automation.id);
      } else {
        alert('Algunas acciones fallaron');
      }
    } catch (err) {
      console.error('Error executing automation:', err);
      alert('Error al ejecutar la automatización');
    }
  }

  async function handleDelete(automation: Automation) {
    if (!confirm(`¿Estás seguro de eliminar "${automation.name}"?`)) return;
    
    try {
      await automationService.delete(automation.id);
      setAutomations(automations.filter(a => a.id !== automation.id));
      if (selectedAutomation?.id === automation.id) {
        setSelectedAutomation(automations[0] || null);
      }
    } catch (err) {
      console.error('Error deleting automation:', err);
      alert('Error al eliminar la automatización');
    }
  }

  async function handleCreateAutomation(data: CreateAutomationDto) {
    try {
      const newAutomation = await automationService.create(data);
      setAutomations([newAutomation, ...automations]);
      setSelectedAutomation(newAutomation);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating automation:', err);
      alert('Error al crear la automatización');
    }
  }

  async function handleUpdateAutomation(data: Partial<CreateAutomationDto>) {
    if (!selectedAutomation) return;
    
    try {
      const updated = await automationService.update(selectedAutomation.id, data);
      setAutomations(automations.map(a => a.id === updated.id ? updated : a));
      setSelectedAutomation(updated);
      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating automation:', err);
      alert('Error al actualizar la automatización');
    }
  }

  function formatTriggerInfo(automation: Automation): string {
    if (automation.triggerType === 'SCHEDULED') {
      if (automation.scheduleType === 'TIME_RANGE') {
        return `${automation.activeStartTime} → ${automation.activeEndTime}`;
      }
      if (automation.scheduleType === 'INTERVAL') {
        const hours = Math.floor((automation.intervalMinutes || 0) / 60);
        const mins = (automation.intervalMinutes || 0) % 60;
        return hours > 0 ? `Cada ${hours}h${mins > 0 ? ` ${mins}m` : ''}` : `Cada ${mins}m`;
      }
      if (automation.scheduleType === 'SPECIFIC_TIMES') {
        return automation.specificTimes?.slice(0, 3).join(', ') + (automation.specificTimes?.length > 3 ? '...' : '');
      }
    }
    return `Cada ${automation.interval} min`;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
        <p className="text-zinc-400">Cargando automatizaciones...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Error de conexión</h1>
        <p className="text-zinc-400 mb-4">{error}</p>
        <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Zap className="w-8 h-8 text-purple-500" />
            Automatizaciones
          </h1>
          <p className="text-zinc-400 mt-1">
            Configura reglas para automatizar el control de tus dispositivos
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Automatización
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de automatizaciones */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 p-4">
            <h2 className="text-lg font-semibold text-white mb-4">
              Automatizaciones ({automations.length})
            </h2>

            {automations.length > 0 ? (
              <div className="space-y-2">
                {automations.map((automation) => {
                  const statusInfo = statusConfig[automation.status];
                  const StatusIcon = statusInfo.icon;
                  const TriggerIcon = triggerTypeLabels[automation.triggerType]?.icon || Clock;
                  
                  return (
                    <button
                      key={automation.id}
                      onClick={() => setSelectedAutomation(automation)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedAutomation?.id === automation.id
                          ? 'bg-purple-600/20 border-purple-600/50'
                          : 'bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white truncate">{automation.name}</span>
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${statusInfo.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <TriggerIcon className="w-3 h-3" />
                          {formatTriggerInfo(automation)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {automation._count?.executions || 0}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Zap className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">No hay automatizaciones</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-3 text-sm text-purple-400 hover:text-purple-300"
                >
                  Crear la primera
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Panel de detalles */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 space-y-6"
        >
          {selectedAutomation ? (
            <>
              {/* Header de la automatización */}
              <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedAutomation.name}</h2>
                    {selectedAutomation.description && (
                      <p className="text-sm text-zinc-400 mt-1">{selectedAutomation.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                      <span>Sección: {selectedAutomation.section?.name || 'No asignada'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {(() => {
                          const TriggerIcon = triggerTypeLabels[selectedAutomation.triggerType]?.icon || Clock;
                          return <TriggerIcon className="w-3 h-3" />;
                        })()}
                        {triggerTypeLabels[selectedAutomation.triggerType]?.label || 'Condición'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleExecute(selectedAutomation)}
                      className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors"
                      title="Ejecutar ahora"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStatusChange(
                        selectedAutomation,
                        selectedAutomation.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
                      )}
                      className="p-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded-lg transition-colors"
                      title={selectedAutomation.status === 'ACTIVE' ? 'Pausar' : 'Activar'}
                    >
                      {selectedAutomation.status === 'ACTIVE' ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(selectedAutomation)}
                      className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Configuración de programación */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {selectedAutomation.triggerType === 'SCHEDULED' && selectedAutomation.scheduleType === 'TIME_RANGE' && (
                    <>
                      <div className="bg-zinc-800/50 rounded-lg p-3">
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                          <Sun className="w-3 h-3" /> Encender
                        </p>
                        <p className="text-lg font-semibold text-white">{selectedAutomation.activeStartTime}</p>
                      </div>
                      <div className="bg-zinc-800/50 rounded-lg p-3">
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                          <Moon className="w-3 h-3" /> Apagar
                        </p>
                        <p className="text-lg font-semibold text-white">{selectedAutomation.activeEndTime}</p>
                      </div>
                    </>
                  )}
                  {selectedAutomation.triggerType === 'SCHEDULED' && selectedAutomation.scheduleType === 'INTERVAL' && (
                    <>
                      <div className="bg-zinc-800/50 rounded-lg p-3">
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                          <Repeat className="w-3 h-3" /> Intervalo
                        </p>
                        <p className="text-lg font-semibold text-white">
                          {(() => {
                            const hours = Math.floor((selectedAutomation.intervalMinutes || 0) / 60);
                            const mins = (selectedAutomation.intervalMinutes || 0) % 60;
                            return hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;
                          })()}
                        </p>
                      </div>
                      {selectedAutomation.actionDuration && (
                        <div className="bg-zinc-800/50 rounded-lg p-3">
                          <p className="text-xs text-zinc-500 flex items-center gap-1">
                            <Timer className="w-3 h-3" /> Duración
                          </p>
                          <p className="text-lg font-semibold text-white">{selectedAutomation.actionDuration} min</p>
                        </div>
                      )}
                    </>
                  )}
                  {selectedAutomation.triggerType === 'SCHEDULED' && selectedAutomation.scheduleType === 'SPECIFIC_TIMES' && (
                    <div className="col-span-2 bg-zinc-800/50 rounded-lg p-3">
                      <p className="text-xs text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Horas programadas
                      </p>
                      <p className="text-sm font-semibold text-white">{selectedAutomation.specificTimes?.join(', ')}</p>
                    </div>
                  )}
                  {(selectedAutomation.triggerType === 'CONDITION' || selectedAutomation.triggerType === 'HYBRID') && (
                    <div className="bg-zinc-800/50 rounded-lg p-3">
                      <p className="text-xs text-zinc-500">Evaluar cada</p>
                      <p className="text-lg font-semibold text-white">{selectedAutomation.interval} min</p>
                    </div>
                  )}
                  {selectedAutomation.startTime && (
                    <div className="bg-zinc-800/50 rounded-lg p-3">
                      <p className="text-xs text-zinc-500">Horario activo</p>
                      <p className="text-lg font-semibold text-white">
                        {selectedAutomation.startTime} - {selectedAutomation.endTime}
                      </p>
                    </div>
                  )}
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Días</p>
                    <p className="text-sm font-semibold text-white">
                      {selectedAutomation.daysOfWeek.length === 0
                        ? 'Todos'
                        : selectedAutomation.daysOfWeek.map(d => daysOfWeekLabels[d]).join(', ')}
                    </p>
                  </div>
                </div>

                {/* Condiciones */}
                {selectedAutomation.conditions.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-zinc-400 mb-2">Condiciones</h3>
                    <div className="space-y-2">
                      {selectedAutomation.conditions.map((condition, idx) => (
                        <div key={condition.id} className="flex items-center gap-2 text-sm">
                          {idx > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded">
                              {selectedAutomation.conditions[idx - 1]?.logicOperator || 'AND'}
                            </span>
                          )}
                          <div className="p-1.5 bg-cyan-500/20 rounded">
                            {condition.property === 'temperature' ? (
                              <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
                            ) : condition.property === 'time' ? (
                              <Clock className="w-3.5 h-3.5 text-cyan-400" />
                            ) : (
                              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                            )}
                          </div>
                          <span className="text-zinc-300">
                            {condition.property === 'time' 
                              ? 'Hora' 
                              : condition.device?.name || 'Dispositivo'}
                          </span>
                          <span className="text-zinc-500">→</span>
                          <span className="text-zinc-400">
                            {condition.property === 'time'
                              ? `${operatorLabels[condition.operator]} ${condition.timeValue}${condition.timeValueMax ? ` - ${condition.timeValueMax}` : ''}`
                              : `${condition.property} ${operatorLabels[condition.operator]} ${condition.value}${condition.valueMax != null ? ` - ${condition.valueMax}` : ''}`
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acciones */}
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Acciones</h3>
                  <div className="space-y-2">
                    {selectedAutomation.actions.map((action) => (
                      <div key={action.id} className="flex items-center gap-2 text-sm">
                        <div className="p-1.5 bg-purple-500/20 rounded">
                          {action.actionType === 'CAPTURE_PHOTO' ? (
                            <Camera className="w-3.5 h-3.5 text-purple-400" />
                          ) : (
                            <Power className="w-3.5 h-3.5 text-purple-400" />
                          )}
                        </div>
                        <span className="text-zinc-300">
                          {action.device?.name || 'Dispositivo'}
                        </span>
                        <span className="text-zinc-500">→</span>
                        <span className="text-purple-400">{actionLabels[action.actionType]}</span>
                        {action.duration && (
                          <span className="text-zinc-500 flex items-center gap-1">
                            <Timer className="w-3 h-3" /> {action.duration} min
                          </span>
                        )}
                        {action.delayMinutes && (
                          <span className="text-zinc-500 text-xs">(retraso: {action.delayMinutes}m)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plantas asociadas (si hay acción CAPTURE_PHOTO) */}
                {selectedAutomation.actions.some(a => a.actionType === 'CAPTURE_PHOTO') && selectedAutomation.plantIds && selectedAutomation.plantIds.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-cyan-400" />
                      Plantas asociadas ({selectedAutomation.plantIds.length})
                    </h3>
                    {automationPlants.length > 0 ? (
                      <div className="space-y-1">
                        {automationPlants.map((plant) => (
                          <div key={plant.id} className="flex items-center gap-2 text-sm">
                            <span className="text-zinc-300">
                              {plant.tagCode}
                              {plant.strain && (
                                <span className="text-zinc-500 ml-2">({plant.strain.name})</span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">Cargando plantas...</p>
                    )}
                  </div>
                )}
              </div>

              {/* Estadísticas de efectividad */}
              {effectiveness && (
                <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 p-4">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    Efectividad ({effectiveness.period})
                  </h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-white">{effectiveness.totalExecutions}</p>
                      <p className="text-xs text-zinc-500">Ejecuciones</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-400">{effectiveness.completedExecutions}</p>
                      <p className="text-xs text-zinc-500">Completadas</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-400">{effectiveness.failedExecutions}</p>
                      <p className="text-xs text-zinc-500">Fallidas</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-purple-400">{effectiveness.effectivenessRate}%</p>
                      <p className="text-xs text-zinc-500">Efectividad</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Historial de ejecuciones */}
              <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  Historial de Ejecuciones
                </h3>
                
                {isLoadingDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  </div>
                ) : executions.length > 0 ? (
                  <>
                    {/* Ejecuciones paginadas */}
                    <div className="space-y-2">
                      {executions
                        .slice((executionsPage - 1) * executionsPerPage, executionsPage * executionsPerPage)
                        .map((execution) => {
                          const statusInfo = executionStatusConfig[execution.status];
                          return (
                            <div
                              key={execution.id}
                              className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                {execution.status === 'COMPLETED' ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                                ) : execution.status === 'FAILED' ? (
                                  <XCircle className="w-4 h-4 text-red-400" />
                                ) : (
                                  <Clock className="w-4 h-4 text-zinc-400" />
                                )}
                                <div>
                                  <p className={`text-sm font-medium ${statusInfo.color}`}>
                                    {statusInfo.label}
                                  </p>
                                  <p className="text-xs text-zinc-500">
                                    {new Date(execution.startedAt).toLocaleString('es-AR')}
                                  </p>
                                </div>
                              </div>
                              {execution.effectivenessChecks && execution.effectivenessChecks.length > 0 && (
                                <div className="text-right">
                                  <p className="text-xs text-zinc-400">
                                    {execution.effectivenessChecks.filter(c => c.conditionMet).length}/
                                    {execution.effectivenessChecks.length} checks OK
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>

                    {/* Controles de paginación */}
                    {executions.length > executionsPerPage && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-700/50">
                        <p className="text-sm text-zinc-400">
                          Mostrando {((executionsPage - 1) * executionsPerPage) + 1} - {Math.min(executionsPage * executionsPerPage, executions.length)} de {executions.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExecutionsPage(prev => Math.max(1, prev - 1))}
                            disabled={executionsPage === 1}
                            className="p-2 bg-zinc-800/50 hover:bg-zinc-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-400 rounded-lg transition-colors"
                            title="Página anterior"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-sm text-zinc-400 px-2">
                            {executionsPage} / {Math.ceil(executions.length / executionsPerPage)}
                          </span>
                          <button
                            onClick={() => setExecutionsPage(prev => Math.min(Math.ceil(executions.length / executionsPerPage), prev + 1))}
                            disabled={executionsPage >= Math.ceil(executions.length / executionsPerPage)}
                            className="p-2 bg-zinc-800/50 hover:bg-zinc-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-400 rounded-lg transition-colors"
                            title="Página siguiente"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <Activity className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">Sin ejecuciones registradas</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 p-12 text-center">
              <Zap className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Selecciona una automatización</h2>
              <p className="text-zinc-400 mb-4">
                Selecciona una automatización del panel izquierdo o crea una nueva
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                <Plus className="w-4 h-4" />
                Crear Automatización
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal de creación */}
      {showCreateModal && (
        <CreateAutomationModal
          sections={sections}
          devices={devices}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreateAutomation}
        />
      )}

      {/* Modal de edición */}
      {showEditModal && selectedAutomation && (
        <EditAutomationModal
          automation={selectedAutomation}
          onClose={() => setShowEditModal(false)}
          onUpdated={handleUpdateAutomation}
        />
      )}
    </div>
  );
}

// =====================================================
// MODAL DE CREACIÓN DE AUTOMATIZACIÓN - WIZARD
// =====================================================

type WizardStep = 'type' | 'schedule' | 'conditions' | 'actions' | 'review';

function CreateAutomationModal({
  sections,
  devices,
  onClose,
  onCreated,
}: {
  sections: Section[];
  devices: Device[];
  onClose: () => void;
  onCreated: (data: CreateAutomationDto) => void;
}) {
  const [step, setStep] = useState<WizardStep>('type');
  const [isCreating, setIsCreating] = useState(false);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlantIds, setSelectedPlantIds] = useState<string[]>([]);

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    sectionId: sections[0]?.id || '',
    triggerType: 'SCHEDULED' as TriggerType,
    scheduleType: 'TIME_RANGE' as ScheduleType,
    activeStartTime: '08:00',
    activeEndTime: '20:00',
    intervalMinutes: 120,
    actionDuration: 30,
    specificTimes: ['08:00', '14:00', '20:00'] as string[],
    daysOfWeek: [] as number[],
    evaluationInterval: 5,
    startTime: '',
    endTime: '',
    notifications: true,
  });

  // Cargar plantas cuando cambia la sección
  useEffect(() => {
    if (form.sectionId) {
      plantService.getAll({ sectionId: form.sectionId })
        .then(setPlants)
        .catch(err => {
          console.error('Error loading plants:', err);
          setPlants([]);
        });
    } else {
      setPlants([]);
    }
    setSelectedPlantIds([]); // Resetear selección al cambiar sección
  }, [form.sectionId]);

  const [conditions, setConditions] = useState<Array<{
    deviceId: string;
    property: string;
    operator: ConditionOperator;
    value: number;
    valueMax?: number;
    logicOperator: string;
  }>>([]);

  const [actions, setActions] = useState<Array<{
    deviceId: string;
    actionType: ActionType;
    duration?: number;
    delayMinutes?: number;
  }>>([]);

  const sensorDevices = devices.filter(d => d.type === 'SENSOR');
  const controllableDevices = devices.filter(d => 
    ['LUZ', 'EXTRACTOR', 'VENTILADOR', 'HUMIDIFICADOR', 'DESHUMIDIFICADOR', 'BOMBA_RIEGO', 'CALEFACTOR', 'AIRE_ACONDICIONADO', 'CAMARA'].includes(d.type)
  );

  const steps: { key: WizardStep; label: string }[] = [
    { key: 'type', label: 'Tipo' },
    { key: 'schedule', label: 'Programación' },
    { key: 'conditions', label: 'Condiciones' },
    { key: 'actions', label: 'Acciones' },
    { key: 'review', label: 'Revisar' },
  ];

  function getStepIndex(s: WizardStep): number {
    return steps.findIndex(st => st.key === s);
  }

  function canProceed(): boolean {
    switch (step) {
      case 'type':
        return !!form.name && !!form.sectionId;
      case 'schedule':
        if (form.triggerType === 'SCHEDULED') {
          if (form.scheduleType === 'TIME_RANGE') {
            return !!form.activeStartTime && !!form.activeEndTime;
          }
          if (form.scheduleType === 'INTERVAL') {
            return form.intervalMinutes > 0;
          }
          if (form.scheduleType === 'SPECIFIC_TIMES') {
            return form.specificTimes.length > 0;
          }
        }
        return true;
      case 'conditions':
        // Para SCHEDULED, las condiciones son opcionales
        if (form.triggerType === 'SCHEDULED') return true;
        return conditions.length > 0;
      case 'actions':
        return actions.length > 0;
      case 'review':
        return true;
      default:
        return true;
    }
  }

  function nextStep() {
    const currentIndex = getStepIndex(step);
    // Skip conditions step for SCHEDULED type
    if (step === 'schedule' && form.triggerType === 'SCHEDULED') {
      setStep('actions');
      return;
    }
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1].key);
    }
  }

  function prevStep() {
    const currentIndex = getStepIndex(step);
    // Skip conditions step for SCHEDULED type
    if (step === 'actions' && form.triggerType === 'SCHEDULED') {
      setStep('schedule');
      return;
    }
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1].key);
    }
  }

  function addCondition() {
    if (sensorDevices.length === 0) return;
    setConditions([...conditions, {
      deviceId: sensorDevices[0].id,
      property: 'temperature',
      operator: 'GREATER_THAN',
      value: 25,
      logicOperator: 'AND',
    }]);
  }

  function addAction() {
    if (controllableDevices.length === 0) return;
    setActions([...actions, {
      deviceId: controllableDevices[0].id,
      actionType: 'TURN_ON',
    }]);
  }

  function addSpecificTime() {
    setForm({ ...form, specificTimes: [...form.specificTimes, '12:00'] });
  }

  async function handleSubmit() {
    if (!canProceed()) return;
    
    setIsCreating(true);
    try {
      const data: CreateAutomationDto = {
        name: form.name,
        description: form.description || undefined,
        sectionId: form.sectionId,
        triggerType: form.triggerType,
        scheduleType: form.triggerType === 'SCHEDULED' ? form.scheduleType : undefined,
        activeStartTime: form.scheduleType === 'TIME_RANGE' ? form.activeStartTime : undefined,
        activeEndTime: form.scheduleType === 'TIME_RANGE' ? form.activeEndTime : undefined,
        intervalMinutes: form.scheduleType === 'INTERVAL' ? form.intervalMinutes : undefined,
        actionDuration: form.scheduleType === 'INTERVAL' ? form.actionDuration : undefined,
        specificTimes: form.scheduleType === 'SPECIFIC_TIMES' ? form.specificTimes : undefined,
        daysOfWeek: form.daysOfWeek.length > 0 ? form.daysOfWeek : undefined,
        evaluationInterval: form.triggerType !== 'SCHEDULED' ? form.evaluationInterval : undefined,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        notifications: form.notifications,
        plantIds: selectedPlantIds.length > 0 ? selectedPlantIds : undefined,
        conditions: conditions.length > 0 ? conditions.map((c, i) => ({ ...c, order: i })) : undefined,
        actions: actions.map((a, i) => ({ ...a, order: i })),
      };

      await onCreated(data);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-zinc-900 rounded-2xl border border-zinc-700 w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl"
      >
        {/* Header con pasos */}
        <div className="border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              Nueva Automatización
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded-lg">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
          
          {/* Progress steps */}
          <div className="flex items-center gap-2">
            {steps.map((s, idx) => {
              // Skip showing conditions step for SCHEDULED
              if (s.key === 'conditions' && form.triggerType === 'SCHEDULED') return null;
              
              const isCurrent = s.key === step;
              const isPast = getStepIndex(step) > getStepIndex(s.key);
              
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${isCurrent ? 'bg-purple-600 text-white' : isPast ? 'bg-green-600/20 text-green-400' : 'bg-zinc-800 text-zinc-500'}
                  `}>
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`text-sm ${isCurrent ? 'text-white' : 'text-zinc-500'}`}>
                    {s.label}
                  </span>
                  {idx < steps.length - 1 && !(s.key === 'schedule' && form.triggerType === 'SCHEDULED') && (
                    <ChevronRight className="w-4 h-4 text-zinc-600 mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <AnimatePresence mode="wait">
            {/* Step 1: Type */}
            {step === 'type' && (
              <motion.div
                key="type"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Ej: Luz de crecimiento 18h"
                      className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Descripción</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={2}
                      placeholder="Describe qué hace esta automatización..."
                      className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white resize-none focus:border-purple-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Sección *</label>
                    <select
                      value={form.sectionId}
                      onChange={(e) => setForm({ ...form, sectionId: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
                    >
                      {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-3">Tipo de automatización *</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(Object.keys(triggerTypeLabels) as TriggerType[]).map((type) => {
                      const { label, desc, icon: Icon } = triggerTypeLabels[type];
                      const isSelected = form.triggerType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setForm({ ...form, triggerType: type })}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? 'border-purple-500 bg-purple-500/10'
                              : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/30'
                          }`}
                        >
                          <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-purple-400' : 'text-zinc-400'}`} />
                          <p className={`font-medium ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{label}</p>
                          <p className="text-xs text-zinc-500 mt-1">{desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Toggle de alertas */}
                <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    <div>
                      <label className="block text-sm font-medium text-zinc-300">Enviar alertas</label>
                      <p className="text-xs text-zinc-500">Recibir notificaciones cuando se ejecute esta automatización</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, notifications: !form.notifications })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.notifications ? 'bg-purple-600' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.notifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Schedule */}
            {step === 'schedule' && (
              <motion.div
                key="schedule"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {form.triggerType === 'SCHEDULED' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-3">Tipo de programación *</label>
                      <div className="grid grid-cols-3 gap-3">
                        {(Object.keys(scheduleTypeLabels) as ScheduleType[]).map((type) => {
                          const { label, desc, icon: Icon } = scheduleTypeLabels[type];
                          const isSelected = form.scheduleType === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setForm({ ...form, scheduleType: type })}
                              className={`p-4 rounded-xl border-2 text-left transition-all ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-500/10'
                                  : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/30'
                              }`}
                            >
                              <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-purple-400' : 'text-zinc-400'}`} />
                              <p className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{label}</p>
                              <p className="text-xs text-zinc-500 mt-1">{desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* TIME_RANGE config */}
                    {form.scheduleType === 'TIME_RANGE' && (
                      <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-800/30 rounded-xl">
                        <div>
                          <label className="block text-sm font-medium text-zinc-300 mb-1 flex items-center gap-2">
                            <Sun className="w-4 h-4 text-yellow-400" /> Hora de encendido
                          </label>
                          <input
                            type="time"
                            value={form.activeStartTime}
                            onChange={(e) => setForm({ ...form, activeStartTime: e.target.value })}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-300 mb-1 flex items-center gap-2">
                            <Moon className="w-4 h-4 text-blue-400" /> Hora de apagado
                          </label>
                          <input
                            type="time"
                            value={form.activeEndTime}
                            onChange={(e) => setForm({ ...form, activeEndTime: e.target.value })}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* INTERVAL config */}
                    {form.scheduleType === 'INTERVAL' && (
                      <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-800/30 rounded-xl">
                        <div>
                          <label className="block text-sm font-medium text-zinc-300 mb-1 flex items-center gap-2">
                            <Repeat className="w-4 h-4 text-purple-400" /> Repetir cada (minutos)
                          </label>
                          <input
                            type="number"
                            value={form.intervalMinutes}
                            onChange={(e) => setForm({ ...form, intervalMinutes: parseInt(e.target.value) || 0 })}
                            min={1}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                          />
                          <p className="text-xs text-zinc-500 mt-1">
                            = {Math.floor(form.intervalMinutes / 60)}h {form.intervalMinutes % 60}m
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-300 mb-1 flex items-center gap-2">
                            <Timer className="w-4 h-4 text-green-400" /> Duración encendido (min)
                          </label>
                          <input
                            type="number"
                            value={form.actionDuration}
                            onChange={(e) => setForm({ ...form, actionDuration: parseInt(e.target.value) || 0 })}
                            min={1}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* SPECIFIC_TIMES config */}
                    {form.scheduleType === 'SPECIFIC_TIMES' && (
                      <div className="p-4 bg-zinc-800/30 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-cyan-400" /> Horas específicas
                          </label>
                          <button
                            type="button"
                            onClick={addSpecificTime}
                            className="text-xs px-2 py-1 bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/30"
                          >
                            + Agregar hora
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {form.specificTimes.map((time, idx) => (
                            <div key={idx} className="flex items-center gap-1 bg-zinc-800 rounded-lg px-2 py-1">
                              <input
                                type="time"
                                value={time}
                                onChange={(e) => {
                                  const updated = [...form.specificTimes];
                                  updated[idx] = e.target.value;
                                  setForm({ ...form, specificTimes: updated });
                                }}
                                className="bg-transparent text-white text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setForm({ ...form, specificTimes: form.specificTimes.filter((_, i) => i !== idx) });
                                }}
                                className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Para CONDITION y HYBRID */}
                {(form.triggerType === 'CONDITION' || form.triggerType === 'HYBRID') && (
                  <div className="p-4 bg-zinc-800/30 rounded-xl space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Evaluar condiciones cada (min)</label>
                      <input
                        type="number"
                        value={form.evaluationInterval}
                        onChange={(e) => setForm({ ...form, evaluationInterval: parseInt(e.target.value) || 5 })}
                        min={1}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Evaluar desde (opcional)</label>
                        <input
                          type="time"
                          value={form.startTime}
                          onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Evaluar hasta (opcional)</label>
                        <input
                          type="time"
                          value={form.endTime}
                          onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Días de la semana (para todos) */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Días de la semana
                    <span className="text-xs text-zinc-500">(vacío = todos los días)</span>
                  </label>
                  <div className="flex gap-2">
                    {daysOfWeekLabels.map((day, idx) => {
                      const isSelected = form.daysOfWeek.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setForm({ ...form, daysOfWeek: form.daysOfWeek.filter(d => d !== idx) });
                            } else {
                              setForm({ ...form, daysOfWeek: [...form.daysOfWeek, idx].sort() });
                            }
                          }}
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-purple-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Conditions (solo para CONDITION y HYBRID) */}
            {step === 'conditions' && (
              <motion.div
                key="conditions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-300">Condiciones</label>
                  <button
                    type="button"
                    onClick={addCondition}
                    disabled={sensorDevices.length === 0}
                    className="text-xs px-3 py-1.5 bg-cyan-600/20 text-cyan-400 rounded hover:bg-cyan-600/30 disabled:opacity-50 flex items-center gap-1"
                  >
                    <Thermometer className="w-3 h-3" /> + Agregar condición
                  </button>
                </div>

                {conditions.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-zinc-700 rounded-xl">
                    <Target className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm">Agrega al menos una condición</p>
                    <p className="text-zinc-600 text-xs mt-1">Las condiciones determinan cuándo se ejecuta la automatización</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conditions.map((condition, index) => (
                      <div key={index} className="p-4 bg-zinc-800/50 rounded-xl space-y-3">
                        {index > 0 && (
                          <div className="flex justify-center -mt-6 mb-2">
                            <select
                              value={conditions[index - 1].logicOperator}
                              onChange={(e) => {
                                const updated = [...conditions];
                                updated[index - 1].logicOperator = e.target.value;
                                setConditions(updated);
                              }}
                              className="px-3 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm text-white"
                            >
                              <option value="AND">Y (AND)</option>
                              <option value="OR">O (OR)</option>
                            </select>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <select
                            value={condition.deviceId}
                            onChange={(e) => {
                              const updated = [...conditions];
                              updated[index].deviceId = e.target.value;
                              setConditions(updated);
                            }}
                            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                          >
                            {sensorDevices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                          <select
                            value={condition.property}
                            onChange={(e) => {
                              const updated = [...conditions];
                              updated[index].property = e.target.value;
                              setConditions(updated);
                            }}
                            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                          >
                            <option value="temperature">Temperatura</option>
                            <option value="humidity">Humedad</option>
                            <option value="state">Estado</option>
                          </select>
                          <select
                            value={condition.operator}
                            onChange={(e) => {
                              const updated = [...conditions];
                              updated[index].operator = e.target.value as ConditionOperator;
                              setConditions(updated);
                            }}
                            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                          >
                            <option value="GREATER_THAN">&gt;</option>
                            <option value="LESS_THAN">&lt;</option>
                            <option value="EQUALS">=</option>
                            <option value="BETWEEN">Entre</option>
                          </select>
                          <input
                            type="number"
                            value={condition.value}
                            onChange={(e) => {
                              const updated = [...conditions];
                              updated[index].value = parseFloat(e.target.value) || 0;
                              setConditions(updated);
                            }}
                            className="w-20 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                          />
                          {condition.operator === 'BETWEEN' && (
                            <>
                              <span className="text-zinc-500">-</span>
                              <input
                                type="number"
                                value={condition.valueMax ?? 0}
                                onChange={(e) => {
                                  const updated = [...conditions];
                                  updated[index].valueMax = parseFloat(e.target.value) || 0;
                                  setConditions(updated);
                                }}
                                className="w-20 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                              />
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setConditions(conditions.filter((_, i) => i !== index))}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Actions */}
            {step === 'actions' && (
              <motion.div
                key="actions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-300">Acciones *</label>
                  <button
                    type="button"
                    onClick={addAction}
                    disabled={controllableDevices.length === 0}
                    className="text-xs px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/30 disabled:opacity-50"
                  >
                    + Agregar acción
                  </button>
                </div>

                {actions.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-zinc-700 rounded-xl">
                    <Power className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm">Agrega al menos una acción</p>
                    <p className="text-zinc-600 text-xs mt-1">Las acciones definen qué hacer cuando se cumplan las condiciones</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {actions.map((action, index) => (
                      <div key={index} className="p-4 bg-zinc-800/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-500/20 rounded">
                            <Power className="w-4 h-4 text-purple-400" />
                          </div>
                          <select
                            value={action.deviceId}
                            onChange={(e) => {
                              const updated = [...actions];
                              updated[index].deviceId = e.target.value;
                              setActions(updated);
                            }}
                            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                          >
                            {controllableDevices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                          <select
                            value={action.actionType}
                            onChange={(e) => {
                              const updated = [...actions];
                              updated[index].actionType = e.target.value as ActionType;
                              setActions(updated);
                            }}
                            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                          >
                            <option value="TURN_ON">Encender</option>
                            <option value="TURN_OFF">Apagar</option>
                            <option value="TOGGLE">Alternar</option>
                            <option value="CAPTURE_PHOTO">Capturar foto</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => setActions(actions.filter((_, i) => i !== index))}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Opciones avanzadas */}
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-700/50">
                          <div className="flex items-center gap-2">
                            <Timer className="w-4 h-4 text-zinc-500" />
                            <label className="text-xs text-zinc-500">Duración (min)</label>
                            <input
                              type="number"
                              value={action.duration || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[index].duration = parseInt(e.target.value) || undefined;
                                setActions(updated);
                              }}
                              placeholder="∞"
                              className="w-16 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-zinc-500" />
                            <label className="text-xs text-zinc-500">Retraso (min)</label>
                            <input
                              type="number"
                              value={action.delayMinutes || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[index].delayMinutes = parseInt(e.target.value) || undefined;
                                setActions(updated);
                              }}
                              placeholder="0"
                              className="w-16 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selector de plantas para acciones CAPTURE_PHOTO */}
                {actions.some(a => a.actionType === 'CAPTURE_PHOTO') && (
                  <div className="mt-6 p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Camera className="w-5 h-5 text-cyan-400" />
                      <label className="text-sm font-medium text-zinc-300">
                        Plantas asociadas (opcional)
                      </label>
                    </div>
                    <p className="text-xs text-zinc-500 mb-3">
                      Selecciona las plantas para registrar las fotos en su historial. Deja vacío para no registrar en ninguna planta.
                    </p>
                    
                    {plants.length === 0 ? (
                      <p className="text-sm text-zinc-500 text-center py-4">
                        No hay plantas en esta sección
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedPlantIds.length === plants.length) {
                                setSelectedPlantIds([]);
                              } else {
                                setSelectedPlantIds(plants.map(p => p.id));
                              }
                            }}
                            className="text-xs px-2 py-1 bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/30"
                          >
                            {selectedPlantIds.length === plants.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                          </button>
                        </div>
                        {plants.map((plant) => {
                          const isSelected = selectedPlantIds.includes(plant.id);
                          return (
                            <label
                              key={plant.id}
                              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-purple-600/20 border border-purple-600/50'
                                  : 'bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPlantIds([...selectedPlantIds, plant.id]);
                                  } else {
                                    setSelectedPlantIds(selectedPlantIds.filter(id => id !== plant.id));
                                  }
                                }}
                                className="w-4 h-4 text-purple-600 bg-zinc-800 border-zinc-600 rounded focus:ring-purple-500"
                              />
                              <span className="text-sm text-zinc-300 flex-1">
                                {plant.tagCode}
                                {plant.strain && (
                                  <span className="text-xs text-zinc-500 ml-2">
                                    ({plant.strain.name})
                                  </span>
                                )}
                              </span>
                              {isSelected && (
                                <CheckSquare className="w-4 h-4 text-purple-400" />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 5: Review */}
            {step === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="p-4 bg-zinc-800/30 rounded-xl">
                  <h3 className="font-semibold text-white mb-3">{form.name}</h3>
                  {form.description && <p className="text-sm text-zinc-400 mb-3">{form.description}</p>}
                  
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                      {triggerTypeLabels[form.triggerType].label}
                    </span>
                    {form.triggerType === 'SCHEDULED' && (
                      <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded">
                        {scheduleTypeLabels[form.scheduleType].label}
                      </span>
                    )}
                    <span className="px-2 py-1 bg-zinc-700 text-zinc-300 rounded">
                      {sections.find(s => s.id === form.sectionId)?.name}
                    </span>
                  </div>
                </div>

                {/* Schedule summary */}
                <div className="p-4 bg-zinc-800/30 rounded-xl">
                  <h4 className="text-sm font-medium text-zinc-300 mb-2">Programación</h4>
                  <div className="text-sm text-zinc-400 space-y-1">
                    {form.triggerType === 'SCHEDULED' && form.scheduleType === 'TIME_RANGE' && (
                      <p>ON de {form.activeStartTime} a {form.activeEndTime}</p>
                    )}
                    {form.triggerType === 'SCHEDULED' && form.scheduleType === 'INTERVAL' && (
                      <p>Cada {form.intervalMinutes} min por {form.actionDuration} min</p>
                    )}
                    {form.triggerType === 'SCHEDULED' && form.scheduleType === 'SPECIFIC_TIMES' && (
                      <p>A las {form.specificTimes.join(', ')}</p>
                    )}
                    {form.daysOfWeek.length > 0 ? (
                      <p>Días: {form.daysOfWeek.map(d => daysOfWeekLabels[d]).join(', ')}</p>
                    ) : (
                      <p>Todos los días</p>
                    )}
                  </div>
                </div>

                {/* Conditions summary */}
                {conditions.length > 0 && (
                  <div className="p-4 bg-zinc-800/30 rounded-xl">
                    <h4 className="text-sm font-medium text-zinc-300 mb-2">Condiciones ({conditions.length})</h4>
                    <div className="space-y-1">
                      {conditions.map((c, idx) => (
                        <p key={idx} className="text-sm text-zinc-400">
                          {idx > 0 && <span className="text-cyan-400">{conditions[idx-1].logicOperator} </span>}
                          {sensorDevices.find(d => d.id === c.deviceId)?.name} {c.property} {operatorLabels[c.operator]} {c.value}{c.valueMax ? `-${c.valueMax}` : ''}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions summary */}
                <div className="p-4 bg-zinc-800/30 rounded-xl">
                  <h4 className="text-sm font-medium text-zinc-300 mb-2">Acciones ({actions.length})</h4>
                  <div className="space-y-1">
                    {actions.map((a, idx) => (
                      <p key={idx} className="text-sm text-zinc-400 flex items-center gap-2">
                        <Power className="w-3 h-3 text-purple-400" />
                        {actionLabels[a.actionType]} {controllableDevices.find(d => d.id === a.deviceId)?.name}
                        {a.duration && <span className="text-zinc-500">({a.duration} min)</span>}
                        {a.delayMinutes && <span className="text-zinc-500">(retraso: {a.delayMinutes}m)</span>}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Notifications summary */}
                <div className="p-4 bg-zinc-800/30 rounded-xl">
                  <h4 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    Alertas
                  </h4>
                  <p className="text-sm text-zinc-400">
                    {form.notifications ? (
                      <span className="text-green-400">✓ Las alertas están activadas</span>
                    ) : (
                      <span className="text-zinc-500">✗ Las alertas están desactivadas</span>
                    )}
                  </p>
                </div>

                {/* Plants summary (si hay acción CAPTURE_PHOTO) */}
                {actions.some(a => a.actionType === 'CAPTURE_PHOTO') && (
                  <div className="p-4 bg-zinc-800/30 rounded-xl">
                    <h4 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-cyan-400" />
                      Plantas asociadas
                    </h4>
                    {selectedPlantIds.length > 0 ? (
                      <div className="space-y-1">
                        {selectedPlantIds.map(plantId => {
                          const plant = plants.find(p => p.id === plantId);
                          return plant ? (
                            <p key={plantId} className="text-sm text-zinc-400">
                              • {plant.tagCode}
                              {plant.strain && (
                                <span className="text-zinc-500 ml-2">({plant.strain.name})</span>
                              )}
                            </p>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500">No se registrarán fotos en el historial de plantas</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-6 py-4 flex justify-between">
          <button
            onClick={step === 'type' ? onClose : prevStep}
            className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 'type' ? 'Cancelar' : 'Anterior'}
          </button>
          
          {step === 'review' ? (
            <button
              onClick={handleSubmit}
              disabled={isCreating || !canProceed()}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Crear Automatización
                </>
              )}
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// =====================================================
// MODAL DE EDICIÓN DE AUTOMATIZACIÓN
// =====================================================

function EditAutomationModal({
  automation,
  onClose,
  onUpdated,
}: {
  automation: Automation;
  onClose: () => void;
  onUpdated: (data: Partial<CreateAutomationDto>) => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [form, setForm] = useState({
    name: automation.name,
    description: automation.description || '',
    notifications: automation.notifications,
  });

  async function handleSubmit() {
    if (!form.name.trim()) {
      alert('El nombre es requerido');
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdated({
        name: form.name,
        description: form.description || undefined,
        notifications: form.notifications,
      });
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-zinc-900 rounded-2xl border border-zinc-700 w-full max-w-md overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-400" />
              Editar Automatización
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded-lg">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Luz de crecimiento 18h"
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Describe qué hace esta automatización..."
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white resize-none focus:border-purple-500"
            />
          </div>

          {/* Toggle de alertas */}
          <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <div>
                <label className="block text-sm font-medium text-zinc-300">Enviar alertas</label>
                <p className="text-xs text-zinc-500">Recibir notificaciones cuando se ejecute esta automatización</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, notifications: !form.notifications })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.notifications ? 'bg-purple-600' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUpdating || !form.name.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
