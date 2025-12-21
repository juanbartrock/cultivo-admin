'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Check, X, Clock, Loader2, ChevronDown, ChevronUp,
  Zap, AlertCircle, Sparkles, ThermometerSun, Droplets, Timer
} from 'lucide-react';
import { automationService } from '@/services/automationService';
import { Automation, TriggerType, ScheduleType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/DialogContext';

interface AIProposalsPanelProps {
  onApproved?: () => void; // Callback cuando se aprueba una propuesta
  className?: string;
}

const triggerTypeIcons: Record<TriggerType, any> = {
  SCHEDULED: Timer,
  CONDITION: Zap,
  HYBRID: Sparkles,
};

const triggerTypeLabels: Record<TriggerType, string> = {
  SCHEDULED: 'Programada',
  CONDITION: 'Condicional',
  HYBRID: 'Híbrida',
};

export default function AIProposalsPanel({ onApproved, className = '' }: AIProposalsPanelProps) {
  const { toast } = useToast();
  const confirm = useConfirm();

  const [proposals, setProposals] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      const data = await automationService.getPendingProposals();
      setProposals(data);
    } catch (error) {
      console.error('Error loading proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (proposal: Automation) => {
    const confirmed = await confirm({
      title: `¿Aprobar la automatización "${proposal.name}"?`,
      message: 'Esta automatización se activará inmediatamente.',
      variant: 'info',
    });
    
    if (!confirmed) return;
    
    setProcessingId(proposal.id);
    try {
      await automationService.approveProposal(proposal.id);
      toast.success(`Automatización "${proposal.name}" aprobada y activada`);
      setProposals(prev => prev.filter(p => p.id !== proposal.id));
      onApproved?.();
    } catch (error) {
      toast.error('Error al aprobar la propuesta');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (proposal: Automation) => {
    const confirmed = await confirm({
      title: `¿Rechazar la propuesta "${proposal.name}"?`,
      message: 'Esta propuesta será eliminada permanentemente.',
      variant: 'danger',
    });
    
    if (!confirmed) return;
    
    setProcessingId(proposal.id);
    try {
      await automationService.rejectProposal(proposal.id);
      toast.info(`Propuesta "${proposal.name}" rechazada`);
      setProposals(prev => prev.filter(p => p.id !== proposal.id));
    } catch (error) {
      toast.error('Error al rechazar la propuesta');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className={`bg-zinc-900/50 border border-violet-500/20 rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Cargando propuestas...</span>
        </div>
      </div>
    );
  }

  if (proposals.length === 0) {
    return null; // No mostrar nada si no hay propuestas
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-violet-900/20 to-purple-900/20 border border-violet-500/30 rounded-xl overflow-hidden ${className}`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-violet-500/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/20 rounded-lg">
            <Brain className="w-5 h-5 text-violet-400" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-violet-200">
              Propuestas de IA
              <span className="ml-2 px-2 py-0.5 bg-violet-500/30 rounded-full text-xs">
                {proposals.length}
              </span>
            </h3>
            <p className="text-xs text-violet-300/60">
              Automatizaciones sugeridas pendientes de aprobación
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-violet-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-violet-400" />
        )}
      </button>

      {/* Proposals List */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-violet-500/20"
          >
            <div className="p-4 space-y-3">
              {proposals.map(proposal => {
                const TriggerIcon = triggerTypeIcons[proposal.triggerType] || Zap;
                const isProcessing = processingId === proposal.id;

                return (
                  <motion.div
                    key={proposal.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-4"
                  >
                    {/* Proposal Header */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <TriggerIcon className="w-4 h-4 text-violet-400" />
                          <h4 className="font-medium text-white">
                            {proposal.name}
                          </h4>
                          <span className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300">
                            {triggerTypeLabels[proposal.triggerType]}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400">
                          {proposal.description}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(proposal)}
                          disabled={isProcessing}
                          className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
                          title="Aprobar"
                        >
                          {isProcessing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleReject(proposal)}
                          disabled={isProcessing}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                          title="Rechazar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* AI Reason */}
                    {proposal.aiReason && (
                      <div className="mb-3 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-violet-200">
                            {proposal.aiReason}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {/* Conditions */}
                      {proposal.conditions.length > 0 && (
                        <div>
                          <p className="text-xs text-zinc-500 uppercase mb-1">Condiciones</p>
                          <div className="space-y-1">
                            {proposal.conditions.map(cond => (
                              <div key={cond.id} className="flex items-center gap-2 text-zinc-300">
                                {cond.property === 'temperature' ? (
                                  <ThermometerSun className="w-3 h-3 text-amber-400" />
                                ) : cond.property === 'humidity' ? (
                                  <Droplets className="w-3 h-3 text-blue-400" />
                                ) : (
                                  <AlertCircle className="w-3 h-3 text-zinc-400" />
                                )}
                                <span className="text-xs">
                                  {cond.device?.name || 'Sensor'}: {cond.property} {cond.operator.toLowerCase().replace('_', ' ')} {cond.value}
                                  {cond.valueMax && ` - ${cond.valueMax}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div>
                        <p className="text-xs text-zinc-500 uppercase mb-1">Acciones</p>
                        <div className="space-y-1">
                          {proposal.actions.map(action => (
                            <div key={action.id} className="flex items-center gap-2 text-zinc-300">
                              <Zap className="w-3 h-3 text-yellow-400" />
                              <span className="text-xs">
                                {action.actionType} {action.device?.name || 'Dispositivo'}
                                {action.duration && ` (${action.duration}min)`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-700/50 text-xs text-zinc-500">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>
                          Propuesta {proposal.proposedAt
                            ? new Date(proposal.proposedAt).toLocaleDateString('es-AR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'recientemente'
                          }
                        </span>
                      </div>
                      {proposal.aiConfidence && (
                        <div className="flex items-center gap-1">
                          <span>Confianza:</span>
                          <span className={`font-medium ${
                            proposal.aiConfidence >= 0.8 ? 'text-green-400' :
                            proposal.aiConfidence >= 0.6 ? 'text-yellow-400' : 'text-orange-400'
                          }`}>
                            {Math.round(proposal.aiConfidence * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

