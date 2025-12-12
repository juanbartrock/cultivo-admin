'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Plant, PlantStage, PlantSex } from '@/types';
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
  Loader2
} from 'lucide-react';
import { useState } from 'react';
import { plantService } from '@/services/growService';
import { useToast } from '@/contexts/ToastContext';

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

interface PlantCardProps {
  plant: Plant;
  delay?: number;
  isSelected?: boolean;
  onRegisterEvent?: (plant: Plant) => void;
  onStageChange?: (plant: Plant, newStage: PlantStage) => void;
  onClick?: (plant: Plant) => void;
}

export default function PlantCard({ plant, delay = 0, isSelected = false, onRegisterEvent, onStageChange, onClick }: PlantCardProps) {
  const { toast } = useToast();
  const [currentPlant, setCurrentPlant] = useState(plant);
  const stageConfig = stageIcons[currentPlant.stage] || stageIcons.VEGETATIVO;
  const StageIcon = stageConfig.icon;
  const [showMenu, setShowMenu] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [isChangingStage, setIsChangingStage] = useState(false);
  const [selectedStage, setSelectedStage] = useState<PlantStage | null>(null);
  const [stageDate, setStageDate] = useState<string>(new Date().toISOString().split('T')[0]);

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

  // Función para abrir el modal de cambio de etapa
  const openStageModal = () => {
    setSelectedStage(null);
    setStageDate(new Date().toISOString().split('T')[0]);
    setShowStageModal(true);
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
        } ${showStageModal ? 'relative z-50' : 'relative'}`}
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
            </div>

            {/* Menú de acciones */}
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
                  <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 min-w-[180px] py-1">
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
                        onRegisterEvent?.(currentPlant);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-cultivo-green-400" />
                      Registrar Evento
                    </button>
                    <Link
                      href={`/seguimientos?plant=${currentPlant.id}`}
                      onClick={() => setShowMenu(false)}
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
          </div>

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
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
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
            className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-sm"
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
    </motion.div>
  );
}
