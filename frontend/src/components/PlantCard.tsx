'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Plant, PlantStage, PlantSex, PlantHealthStatus, PlantZone, PlantZoneDto, PlantPPFDResult } from '@/types';
import {
  Leaf,
  Calendar,
  Sprout,
  Flower2,
  Wind,
  Archive,
  Tag,
  Plus,
  History,
  MoreVertical,
  CalendarPlus,
  RefreshCw,
  Check,
  Loader2,
  X,
  HeartPulse,
  Biohazard,
  Skull,
  Activity,
  Package,
  ArrowRightLeft,
  MapPin,
  Sun,
  Edit
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { plantService } from '@/services/growService';
import { sectionService } from '@/services/locationService';
import { useToast } from '@/contexts/ToastContext';
import { Section } from '@/types';
import Portal from './Portal';

// Iconos por etapa
const stageIcons: Record<PlantStage, { icon: React.ElementType; color: string; bg: string }> = {
  GERMINACION: { icon: Sprout, color: 'text-lime-400', bg: 'bg-lime-500/20' },
  VEGETATIVO: { icon: Leaf, color: 'text-green-400', bg: 'bg-green-500/20' },
  PRE_FLORA: { icon: Flower2, color: 'text-pink-400', bg: 'bg-pink-500/20' },
  FLORACION: { icon: Flower2, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  SECADO: { icon: Wind, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  CURADO: { icon: Archive, color: 'text-amber-400', bg: 'bg-amber-500/20' },
};

const stageLabels: Record<PlantStage, string> = {
  GERMINACION: 'Germinación',
  VEGETATIVO: 'Vegetativo',
  PRE_FLORA: 'Pre-Flora',
  FLORACION: 'Floración',
  SECADO: 'Secado',
  CURADO: 'Curado',
};

const sexLabels: Record<PlantSex, string> = {
  FEM: 'Feminizada',
  REG: 'Regular',
  AUTO: 'Autofloreciente',
  UNKNOWN: 'Desconocido',
};

const healthIcons: Record<PlantHealthStatus, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  HEALTHY: { icon: HeartPulse, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Sana' },
  INFECTED: { icon: Biohazard, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Infectada' },
  DEAD: { icon: Skull, color: 'text-zinc-400', bg: 'bg-zinc-500/20', label: 'Muerta' },
};

interface PlantCardProps {
  plant: Plant;
  delay?: number;
  isSelected?: boolean;
  onRegisterEvent?: (plant: Plant) => void;
  onStageChange?: (plant: Plant, newStage: PlantStage) => void;
  onMoved?: (plant: Plant, newSectionId: string) => void;
  onClick?: (plant: Plant) => void;
}

export default function PlantCard({ plant, delay = 0, isSelected = false, onRegisterEvent, onStageChange, onMoved, onClick }: PlantCardProps) {
  const { toast } = useToast();
  const [currentPlant, setCurrentPlant] = useState(plant);
  const stageConfig = stageIcons[currentPlant.stage] || stageIcons.VEGETATIVO;
  const StageIcon = stageConfig.icon;
  const [showMenu, setShowMenu] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [isChangingStage, setIsChangingStage] = useState(false);
  const [isChangingHealth, setIsChangingHealth] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [selectedStage, setSelectedStage] = useState<PlantStage | null>(null);
  const [selectedHealth, setSelectedHealth] = useState<PlantHealthStatus | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [stageDate, setStageDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [showZonesModal, setShowZonesModal] = useState(false);
  const [plantPPFD, setPlantPPFD] = useState<PlantPPFDResult | null>(null);
  const [loadingPPFD, setLoadingPPFD] = useState(false);
  const [selectedZones, setSelectedZones] = useState<PlantZoneDto[]>([]);
  const [isSavingZones, setIsSavingZones] = useState(false);

  // Cargar PPFD cuando la planta tiene zonas asignadas
  useEffect(() => {
    if (currentPlant.zones && currentPlant.zones.length > 0) {
      loadPlantPPFD();
    } else {
      setPlantPPFD(null);
    }
  }, [currentPlant.id, currentPlant.zones]);

  async function loadPlantPPFD() {
    setLoadingPPFD(true);
    try {
      const ppfdData = await plantService.getPPFD(currentPlant.id);
      setPlantPPFD(ppfdData);
    } catch (err) {
      console.error('Error loading plant PPFD:', err);
    } finally {
      setLoadingPPFD(false);
    }
  }

  // Inicializar zonas seleccionadas cuando se abre el modal
  useEffect(() => {
    if (showZonesModal) {
      setSelectedZones(
        currentPlant.zones?.map(z => ({ zone: z.zone, coverage: z.coverage })) || []
      );
    }
  }, [showZonesModal, currentPlant.zones]);

  async function handleSaveZones() {
    setIsSavingZones(true);
    try {
      const updatedPlant = await plantService.update(currentPlant.id, {
        zones: selectedZones
      });
      setCurrentPlant(updatedPlant);
      setShowZonesModal(false);
      toast.success('Zonas actualizadas correctamente');
    } catch (err) {
      console.error('Error saving zones:', err);
      toast.error('Error al guardar las zonas');
    } finally {
      setIsSavingZones(false);
    }
  }

  const currentHealth = currentPlant.healthStatus || 'HEALTHY';
  const healthConfig = healthIcons[currentHealth];
  const HealthIcon = healthConfig.icon;

  // Calcular días en la etapa actual o desde el inicio del ciclo
  // Prioridad: stageStartDate > startDate > cycle.startDate > createdAt
  const hasStageStartDate = !!currentPlant.stageStartDate;
  const dateForCalc = currentPlant.stageStartDate
    || currentPlant.startDate
    || currentPlant.cycle?.startDate
    || currentPlant.createdAt;

  const daysInStage = Math.max(0, Math.floor(
    (new Date().getTime() - new Date(dateForCalc).getTime()) / (1000 * 60 * 60 * 24)
  ));
  const weeksInStage = Math.floor(daysInStage / 7);

  // Determinar si tiene fecha de inicio configurada (propia o del ciclo)
  const hasStartDate = !!(currentPlant.startDate || currentPlant.cycle?.startDate);

  // Función para confirmar el cambio de etapa
  const handleStageChange = async () => {
    if (!selectedStage || selectedStage === currentPlant.stage) {
      setShowStageModal(false);
      setSelectedStage(null);
      return;
    }

    setIsChangingStage(true);
    try {
      const updatedPlant = await plantService.move(currentPlant.id, {
        stage: selectedStage,
        stageDate: stageDate
      });
      setCurrentPlant(updatedPlant);
      onStageChange?.(updatedPlant, selectedStage);
      setShowStageModal(false);
      setSelectedStage(null);
      toast.success('Etapa actualizada correctamente');
    } catch (err) {
      console.error('Error cambiando etapa:', err);
      toast.error('Error al cambiar la etapa de la planta');
    } finally {
      setIsChangingStage(false);
    }
  };

  // Función para cambiar estado de salud
  const handleHealthChange = async () => {
    if (!selectedHealth || selectedHealth === currentHealth) {
      setShowHealthModal(false);
      setSelectedHealth(null);
      return;
    }

    setIsChangingHealth(true);
    try {
      const updatedPlant = await plantService.update(currentPlant.id, {
        healthStatus: selectedHealth
      });
      setCurrentPlant(updatedPlant);
      setShowHealthModal(false);
      setSelectedHealth(null);
      toast.success(`Estado de salud actualizado a ${healthIcons[selectedHealth].label}`);
    } catch (err) {
      console.error('Error cambiando salud:', err);
      toast.error('Error al actualizar estado de salud');
    } finally {
      setIsChangingHealth(false);
    }
  };

  // Función para abrir el modal de cambio de etapa
  const openStageModal = () => {
    setSelectedStage(null);
    setStageDate(new Date().toISOString().split('T')[0]);
    setShowStageModal(true);
  };

  // Función para cargar secciones y abrir el modal de mover
  const openMoveModal = async () => {
    setShowMoveModal(true);
    setSelectedSectionId(null);
    setLoadingSections(true);
    try {
      const allSections = await sectionService.getAll();
      // Filtrar la sección actual
      setSections(allSections.filter(s => s.id !== currentPlant.sectionId));
    } catch (err) {
      console.error('Error cargando secciones:', err);
      toast.error('Error al cargar las secciones disponibles');
    } finally {
      setLoadingSections(false);
    }
  };

  // Función para mover la planta a otra sección
  const handleMovePlant = async () => {
    if (!selectedSectionId) {
      setShowMoveModal(false);
      return;
    }

    setIsMoving(true);
    try {
      const updatedPlant = await plantService.move(currentPlant.id, {
        sectionId: selectedSectionId
      });
      setCurrentPlant(updatedPlant);
      onMoved?.(updatedPlant, selectedSectionId);
      setShowMoveModal(false);
      toast.success('Planta movida correctamente');
    } catch (err) {
      console.error('Error moviendo planta:', err);
      toast.error('Error al mover la planta');
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05 }}
      onClick={() => onClick?.(currentPlant)}
      className={`bg-zinc-800/50 backdrop-blur-sm border rounded-xl p-4 transition-all cursor-pointer ${isSelected
        ? 'border-cultivo-green-500 ring-2 ring-cultivo-green-500/30'
        : 'border-zinc-700/50 hover:border-cultivo-green-600/30'
        } ${showStageModal || showMenu ? 'relative z-[100]' : 'relative'}`}
    >
      <div className="flex items-start gap-4">
        {/* Icono de etapa */}
        <div className={`p-3 rounded-xl ${stageConfig.bg} flex-shrink-0`}>
          <StageIcon className={`w-8 h-8 ${stageConfig.color}`} />
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-zinc-500" />
              <h3 className="font-bold text-white text-lg">{currentPlant.tagCode}</h3>

              {/* Health Badge */}
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${healthConfig.bg} ${healthConfig.color} border-${healthConfig.color.replace('text-', '')}/30`}
                title={`Estado: ${healthConfig.label}`}
              >
                <HealthIcon className="w-3 h-3" />
                <span className="hidden sm:inline">{healthConfig.label}</span>
              </div>
            </div>

            {/* Menú de acciones */}
            <div className={`relative ${showMenu ? 'z-[100]' : ''}`}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1 rounded-lg hover:bg-zinc-700/50 transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-zinc-400" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-[9998]"
                    onClick={() => {
                      setShowMenu(false);
                    }}
                  />
                  <div 
                    className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-[9999] min-w-[180px] py-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        openStageModal();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 text-amber-400" />
                      Cambiar Etapa
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setSelectedHealth(currentHealth);
                        setShowHealthModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                    >
                      <Activity className="w-4 h-4 text-red-400" />
                      Reportar Salud
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowZonesModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                    >
                      <MapPin className="w-4 h-4 text-purple-400" />
                      Asignar Zonas
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        openMoveModal();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                    >
                      <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                      Mudar a otra sección
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onRegisterEvent?.(currentPlant);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-cultivo-green-400" />
                      Registrar Evento
                    </button>
                    <Link
                      href={`/seguimientos?plant=${currentPlant.id}`}
                      onClick={() => {
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                    >
                      <History className="w-4 h-4 text-blue-400" />
                      Ver Historial
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Genética */}
          <p className="text-cultivo-green-400 font-medium mb-2">
            {currentPlant.strain?.name || 'Sin genética asignada'}
          </p>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Etapa - Clickeable */}
            <button
              onClick={() => openStageModal()}
              className={`text-xs px-2 py-1 rounded-full ${stageConfig.bg} ${stageConfig.color} hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1`}
              title="Cambiar etapa"
            >
              {stageLabels[currentPlant.stage]}
              <RefreshCw className="w-3 h-3" />
            </button>

            {/* Sexo */}
            <span className="text-xs px-2 py-1 rounded-full bg-zinc-700 text-zinc-300">
              {sexLabels[currentPlant.sex]}
            </span>

            {/* Días en etapa */}
            <span
              className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${hasStageStartDate
                ? 'bg-cultivo-green-500/20 text-cultivo-green-400'
                : hasStartDate
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-amber-500/20 text-amber-400'
                }`}
              title={hasStageStartDate
                ? `En ${stageLabels[currentPlant.stage]} desde: ${new Date(currentPlant.stageStartDate!).toLocaleDateString()}`
                : hasStartDate
                  ? `Desde inicio del ciclo: ${new Date(currentPlant.startDate || currentPlant.cycle?.startDate || currentPlant.createdAt).toLocaleDateString()}`
                  : 'Días desde creación (sin fecha de etapa)'
              }
            >
              {hasStageStartDate ? (
                <Calendar className="w-3 h-3" />
              ) : (
                <CalendarPlus className="w-3 h-3" />
              )}
              {daysInStage}d ({weeksInStage}sem)
            </span>

            {/* Maceta final */}
            {currentPlant.potSizeFinal && (
              <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 flex items-center gap-1" title="Maceta final">
                <Package className="w-3 h-3" />
                {currentPlant.potSizeFinal}
              </span>
            )}

            {/* Zonas asignadas */}
            {currentPlant.zones && currentPlant.zones.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowZonesModal(true);
                }}
                className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1 hover:bg-purple-500/30 transition-colors"
                title="Zonas asignadas"
              >
                <MapPin className="w-3 h-3" />
                {currentPlant.zones.length} zona{currentPlant.zones.length > 1 ? 's' : ''}
              </button>
            )}
          </div>

          {/* PPFD promedio ponderado */}
          {plantPPFD && plantPPFD.averagePPFD !== null && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <Sun className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-yellow-400 font-medium">
                PPFD: {Math.round(plantPPFD.averagePPFD)} µmol/m²/s
              </span>
              <span className="text-zinc-600">
                (promedio ponderado)
              </span>
            </div>
          )}
          {loadingPPFD && (
            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Cargando PPFD...</span>
            </div>
          )}

          {/* Notas si existen */}
          {currentPlant.notes && (
            <p className="text-sm text-zinc-500 mt-3 line-clamp-2">
              {currentPlant.notes}
            </p>
          )}

          {/* Sección */}
          {currentPlant.section && (
            <p className="text-xs text-zinc-600 mt-2">
              📍 {currentPlant.section.name}
            </p>
          )}
        </div>

        {/* Foto si existe */}
        {currentPlant.photo && (
          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-700">
            <img
              src={currentPlant.photo}
              alt={currentPlant.tagCode}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Acciones rápidas en la parte inferior */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-700/50">
        <button
          onClick={() => openStageModal()}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Etapa
        </button>
        <button
          onClick={() => onRegisterEvent?.(currentPlant)}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-cultivo-green-400 bg-cultivo-green-500/10 hover:bg-cultivo-green-500/20 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Evento
        </button>
        <Link
          href={`/seguimientos?plant=${currentPlant.id}`}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          Historial
        </Link>
      </div>

      {/* Modal de Cambio de Etapa */}
      {showStageModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowStageModal(false);
              setSelectedStage(null);
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
              <h3 className="text-lg font-semibold text-white">Cambiar Etapa</h3>
              <p className="text-sm text-zinc-400 mt-1">
                {currentPlant.tagCode} - {currentPlant.strain?.name || 'Sin genética'}
              </p>
            </div>

            <div className="p-4 space-y-2">
              {(Object.entries(stageLabels) as [PlantStage, string][]).map(([stage, label]) => {
                const config = stageIcons[stage];
                const IconComponent = config.icon;
                const isCurrentStage = stage === currentPlant.stage;
                const isSelected = stage === selectedStage;

                return (
                  <button
                    key={stage}
                    onClick={() => setSelectedStage(stage)}
                    disabled={isChangingStage || isCurrentStage}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${isCurrentStage
                      ? `${config.bg} border-${config.color.replace('text-', '')}/50 opacity-60`
                      : isSelected
                        ? `${config.bg} border-cultivo-green-500 ring-2 ring-cultivo-green-500/30`
                        : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                      } ${isChangingStage ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`p-2 rounded-lg ${config.bg}`}>
                      <IconComponent className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <span className={`flex-1 text-left font-medium ${isCurrentStage || isSelected ? config.color : 'text-zinc-300'}`}>
                      {label}
                    </span>
                    {isCurrentStage && (
                      <span className="text-xs px-2 py-0.5 bg-zinc-700 rounded-full text-zinc-400">
                        Actual
                      </span>
                    )}
                    {isSelected && !isCurrentStage && (
                      <Check className="w-5 h-5 text-cultivo-green-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Fecha del cambio de etapa */}
            {selectedStage && selectedStage !== currentPlant.stage && (
              <div className="px-4 pb-4">
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Fecha del cambio de etapa
                </label>
                <input
                  type="date"
                  value={stageDate}
                  onChange={(e) => setStageDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cultivo-green-600"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Si no se cambió hoy, ingresa la fecha real del cambio
                </p>
              </div>
            )}

            <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowStageModal(false);
                  setSelectedStage(null);
                }}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              {selectedStage && selectedStage !== currentPlant.stage && (
                <button
                  onClick={handleStageChange}
                  disabled={isChangingStage}
                  className="flex items-center gap-2 px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isChangingStage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cambiando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirmar
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
      {/* Modal de Estado de Salud */}
      {showHealthModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowHealthModal(false);
              setSelectedHealth(null);
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
              <h3 className="text-lg font-semibold text-white">Reportar Estado de Salud</h3>
              <p className="text-sm text-zinc-400 mt-1">
                {currentPlant.tagCode} - Selecciona el estado actual
              </p>
            </div>

            <div className="p-4 space-y-2">
              {(Object.entries(healthIcons) as [PlantHealthStatus, typeof healthIcons['HEALTHY']][]).map(([status, config]) => {
                const IconComponent = config.icon;
                const isCurrentStatus = status === currentHealth;
                const isSelected = status === selectedHealth;

                return (
                  <button
                    key={status}
                    onClick={() => setSelectedHealth(status)}
                    disabled={isChangingHealth || isCurrentStatus}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${isCurrentStatus
                      ? `${config.bg} border-${config.color.replace('text-', '')}/50 opacity-60`
                      : isSelected
                        ? `${config.bg} border-${config.color.replace('text-', '')} ring-2 ring-${config.color.replace('text-', '')}/30`
                        : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                      } ${isChangingHealth ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`p-2 rounded-lg ${config.bg}`}>
                      <IconComponent className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <span className={`flex-1 text-left font-medium ${isCurrentStatus || isSelected ? config.color : 'text-zinc-300'}`}>
                      {config.label}
                    </span>
                    {isSelected && !isCurrentStatus && (
                      <Check className={`w-5 h-5 ${config.color}`} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowHealthModal(false);
                  setSelectedHealth(null);
                }}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                disabled={isChangingHealth}
              >
                Cancelar
              </button>
              {selectedHealth && selectedHealth !== currentHealth && (
                <button
                  onClick={handleHealthChange}
                  disabled={isChangingHealth}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isChangingHealth ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirmar
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Mudar Planta */}
      {showMoveModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMoveModal(false);
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
              <h3 className="text-lg font-semibold text-white">Mudar Planta</h3>
              <p className="text-sm text-zinc-400 mt-1">
                {currentPlant.tagCode} - Selecciona la sección destino
              </p>
            </div>

            <div className="p-4">
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
                      disabled={isMoving}
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
                  setShowMoveModal(false);
                  setSelectedSectionId(null);
                }}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                disabled={isMoving}
              >
                Cancelar
              </button>
              {selectedSectionId && (
                <button
                  onClick={handleMovePlant}
                  disabled={isMoving}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isMoving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Moviendo...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-4 h-4" />
                      Mudar
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Asignar Zonas - usando Portal para renderizar fuera del componente */}
      {showZonesModal && (
        <Portal>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowZonesModal(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-md max-h-[80vh] flex flex-col relative z-[10000]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header fijo */}
              <div className="p-4 border-b border-zinc-800 flex-shrink-0">
                <h3 className="text-lg font-semibold text-white">Asignar Zonas</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  {currentPlant.tagCode} - Selecciona las zonas que ocupa esta planta
                </p>
              </div>

              {/* Contenido scrolleable */}
              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                {/* Grilla de zonas */}
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((zone) => {
                    const zoneData = selectedZones.find(z => z.zone === zone);
                    const isSelected = !!zoneData;

                    return (
                      <button
                        key={zone}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedZones(selectedZones.filter(z => z.zone !== zone));
                          } else {
                            setSelectedZones([...selectedZones, { zone, coverage: 100 }]);
                          }
                        }}
                        className={`p-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-purple-500/20 border-purple-500 ring-2 ring-purple-500/30'
                            : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                        }`}
                      >
                        <div className="text-xs text-zinc-500 mb-1">Zona {zone}</div>
                        {isSelected ? (
                          <>
                            <Check className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                            <div className="text-xs text-purple-400 font-medium">
                              {zoneData.coverage}%
                            </div>
                          </>
                        ) : (
                          <Plus className="w-5 h-5 text-zinc-600 mx-auto" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Lista de zonas seleccionadas con coverage */}
                {selectedZones.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium text-zinc-300">Ajustar Coverage:</h4>
                    {selectedZones.map((zoneData, index) => (
                      <div key={zoneData.zone} className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg">
                        <span className="text-sm text-zinc-300 w-16">Zona {zoneData.zone}:</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={zoneData.coverage}
                          onChange={(e) => {
                            const newZones = [...selectedZones];
                            newZones[index].coverage = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                            setSelectedZones(newZones);
                          }}
                          className="flex-1 px-3 py-1.5 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white text-sm"
                        />
                        <span className="text-sm text-zinc-500 w-8">%</span>
                        <button
                          onClick={() => {
                            setSelectedZones(selectedZones.filter(z => z.zone !== zoneData.zone));
                          }}
                          className="p-1 hover:bg-zinc-700 rounded-lg"
                        >
                          <X className="w-4 h-4 text-zinc-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {selectedZones.length === 0 && (
                  <div className="text-center py-8 text-zinc-500 text-sm">
                    Selecciona al menos una zona para asignar a la planta
                  </div>
                )}
              </div>

              {/* Footer fijo con botones */}
              <div className="p-4 border-t border-zinc-800 flex justify-end gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setShowZonesModal(false);
                    setSelectedZones([]);
                  }}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                  disabled={isSavingZones}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveZones}
                  disabled={isSavingZones || selectedZones.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isSavingZones ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </Portal>
      )}
    </motion.div>
  );
}
