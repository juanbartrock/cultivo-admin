'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Droplets, 
  FlaskConical, 
  ChevronLeft, 
  ChevronRight,
  Beaker,
  Leaf,
  Users,
  X,
  Loader2
} from 'lucide-react';
import { PlantFeedingPlan, FeedingPlanWeek, PlantStage } from '@/types';

// Colores por etapa
const stageColors: Record<PlantStage, { bg: string; border: string; text: string }> = {
  GERMINACION: { bg: 'bg-lime-500/10', border: 'border-lime-500/30', text: 'text-lime-400' },
  VEGETATIVO: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
  PRE_FLORA: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400' },
  FLORACION: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
  SECADO: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
  CURADO: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
};

// Tipo para planta con plan (solo necesitamos el nombre de la genética)
interface PlantWithPlan {
  id: string;
  tagCode: string;
  strain?: { name: string };
  stage: PlantStage;
  feedingPlan: PlantFeedingPlan;
}

interface WeekViewProps {
  week: FeedingPlanWeek | null;
  label: string;
  isCurrent?: boolean;
  weekNumber?: number;
}

function WeekView({ week, label, isCurrent = false, weekNumber }: WeekViewProps) {
  if (!week) {
    return (
      <div className={`flex-1 p-3 rounded-lg ${isCurrent ? 'bg-zinc-700/50' : 'bg-zinc-800/30'} border border-zinc-700/30`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-medium ${isCurrent ? 'text-white' : 'text-zinc-500'}`}>
            {label}
          </span>
          {weekNumber && (
            <span className="text-xs text-zinc-600">Sem. {weekNumber}</span>
          )}
        </div>
        <p className="text-xs text-zinc-600 text-center py-4">
          {label === 'Anterior' ? 'Sin datos' : label === 'Siguiente' ? 'Fin del plan' : 'No disponible'}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex-1 p-3 rounded-lg ${isCurrent ? 'bg-zinc-700/50 ring-1 ring-cultivo-green-500/50' : 'bg-zinc-800/30'} border border-zinc-700/30`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-medium ${isCurrent ? 'text-cultivo-green-400' : 'text-zinc-500'}`}>
          {label}
        </span>
        <span className={`text-xs ${isCurrent ? 'text-white font-bold' : 'text-zinc-400'}`}>
          Sem. {week.weekNumber}
        </span>
      </div>

      {/* pH y EC */}
      <div className="flex gap-2 mb-3">
        {week.ph !== undefined && week.ph !== null && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded text-xs">
            <Droplets className="w-3 h-3 text-blue-400" />
            <span className="text-blue-300">pH {week.ph}</span>
          </div>
        )}
        {week.ec !== undefined && week.ec !== null && (
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 rounded text-xs">
            <FlaskConical className="w-3 h-3 text-amber-400" />
            <span className="text-amber-300">EC {week.ec}</span>
          </div>
        )}
      </div>

      {/* Productos */}
      <div className="space-y-1.5">
        {week.products.map((product, idx) => (
          <div 
            key={idx}
            className="flex items-center justify-between text-xs bg-zinc-800/50 px-2 py-1.5 rounded"
          >
            <span className="text-zinc-300 truncate flex-1">{product.name}</span>
            <span className="text-cultivo-green-400 font-medium ml-2">
              {product.dose} {product.unit}
            </span>
          </div>
        ))}
      </div>

      {/* Notas */}
      {week.notes && (
        <p className="text-xs text-zinc-500 mt-2 italic line-clamp-2">
          {week.notes}
        </p>
      )}
    </div>
  );
}

interface FeedingPlanCardProps {
  plants: PlantWithPlan[];
  delay?: number;
  onUnassign?: (plantId: string, feedingPlanId: string) => Promise<void>;
}

export default function FeedingPlanCard({ 
  plants,
  delay = 0,
  onUnassign
}: FeedingPlanCardProps) {
  const [unassigningPlantId, setUnassigningPlantId] = useState<string | null>(null);
  const [confirmUnassign, setConfirmUnassign] = useState<{ plantId: string; plantTag: string } | null>(null);

  const handleUnassign = async (plantId: string) => {
    if (!onUnassign) return;
    
    setUnassigningPlantId(plantId);
    try {
      await onUnassign(plantId, feedingPlan.feedingPlanId);
    } finally {
      setUnassigningPlantId(null);
      setConfirmUnassign(null);
    }
  };
  if (plants.length === 0) return null;
  
  // Usar el primer plan como referencia (todos tienen el mismo plan)
  const feedingPlan = plants[0].feedingPlan;
  const plantStage = feedingPlan.stage;
  const stageStyle = stageColors[plantStage] || stageColors.VEGETATIVO;
  const progress = feedingPlan.totalWeeks > 0 
    ? Math.min((feedingPlan.currentWeek / feedingPlan.totalWeeks) * 100, 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05 }}
      className={`${stageStyle.bg} border ${stageStyle.border} rounded-xl p-4`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-800/50 rounded-lg">
            <Beaker className={`w-5 h-5 ${stageStyle.text}`} />
          </div>
          <div>
            <h4 className="font-bold text-white">{feedingPlan.feedingPlanName}</h4>
            <p className="text-sm text-zinc-400">{plantStage}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-zinc-400">
            <Users className="w-4 h-4" />
            <span className="text-sm">{plants.length} planta{plants.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Plantas asignadas */}
      <div className="mb-4">
        <p className="text-xs text-zinc-500 mb-2">Plantas asignadas:</p>
        <div className="flex flex-wrap gap-2">
          {plants.map((plant) => (
            <div
              key={plant.id}
              className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded-lg text-xs group"
            >
              <Leaf className={`w-3 h-3 ${stageStyle.text}`} />
              <span className="text-white font-medium">{plant.tagCode}</span>
              {plant.strain && (
                <span className="text-zinc-500">({plant.strain.name})</span>
              )}
              {onUnassign && (
                <button
                  onClick={() => setConfirmUnassign({ plantId: plant.id, plantTag: plant.tagCode })}
                  disabled={unassigningPlantId === plant.id}
                  className="ml-1 p-0.5 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Desasignar plan"
                >
                  {unassigningPlantId === plant.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal de confirmación */}
      {confirmUnassign && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-sm"
          >
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Beaker className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Desasignar Plan</h3>
                  <p className="text-sm text-zinc-400">
                    ¿Desasignar <strong className="text-white">{feedingPlan.feedingPlanName}</strong> de <strong className="text-white">{confirmUnassign.plantTag}</strong>?
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setConfirmUnassign(null)} 
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleUnassign(confirmUnassign.plantId)}
                  disabled={unassigningPlantId !== null}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  {unassigningPlantId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Desasignar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Barra de progreso */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
          <span>Progreso del plan</span>
          <span>Semana {feedingPlan.currentWeek} de {feedingPlan.totalWeeks}</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cultivo-green-600 to-cultivo-green-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Vista de semanas */}
      <div className="flex gap-2">
        <div className="flex items-center text-zinc-600">
          <ChevronLeft className="w-4 h-4" />
        </div>
        
        <WeekView 
          week={feedingPlan.previousWeek} 
          label="Anterior"
          weekNumber={feedingPlan.currentWeek - 1}
        />
        
        <WeekView 
          week={feedingPlan.currentWeekData} 
          label="Actual" 
          isCurrent 
        />
        
        <WeekView 
          week={feedingPlan.nextWeek} 
          label="Siguiente"
          weekNumber={feedingPlan.currentWeek + 1}
        />
        
        <div className="flex items-center text-zinc-600">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* Fecha de inicio de etapa */}
      <p className="text-xs text-zinc-500 mt-3 text-center">
        Inicio de etapa: {new Date(feedingPlan.stageStartDate).toLocaleDateString()}
      </p>
    </motion.div>
  );
}
