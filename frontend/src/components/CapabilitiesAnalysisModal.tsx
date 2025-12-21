'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Brain, Loader2, ThermometerSun, Droplets, Wind,
  Zap, AlertTriangle, CheckCircle2, Lightbulb, Camera,
  ChevronDown, ChevronRight, Sparkles, MessageSquare
} from 'lucide-react';
import { automationService, SystemCapabilities, SectionCapabilities } from '@/services/automationService';
import { useAIAssistant } from '@/contexts/AIAssistantContext';

interface CapabilitiesAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const deviceTypeIcons: Record<string, any> = {
  HUMIDIFICADOR: Droplets,
  DESHUMIDIFICADOR: Droplets,
  EXTRACTOR: Wind,
  VENTILADOR: Wind,
  LUZ: Lightbulb,
  CALEFACTOR: ThermometerSun,
  AIRE_ACONDICIONADO: ThermometerSun,
  BOMBA_RIEGO: Droplets,
  CAMARA: Camera,
};

const deviceTypeLabels: Record<string, string> = {
  HUMIDIFICADOR: 'Humidificador',
  DESHUMIDIFICADOR: 'Deshumidificador',
  EXTRACTOR: 'Extractor',
  VENTILADOR: 'Ventilador',
  LUZ: 'Luz',
  CALEFACTOR: 'Calefactor',
  AIRE_ACONDICIONADO: 'Aire Acondicionado',
  BOMBA_RIEGO: 'Bomba de Riego',
  CAMARA: 'Cámara',
};

export default function CapabilitiesAnalysisModal({ isOpen, onClose }: CapabilitiesAnalysisModalProps) {
  const { openAssistant, sendMessage } = useAIAssistant();
  
  const [capabilities, setCapabilities] = useState<SystemCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [requestingAI, setRequestingAI] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCapabilities();
    }
  }, [isOpen]);

  const loadCapabilities = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await automationService.analyzeCapabilities();
      setCapabilities(data);
      // Auto-expandir secciones con gaps
      const sectionsWithGaps = new Set(
        data.sections.filter(s => s.gaps.length > 0).map(s => s.sectionId)
      );
      setExpandedSections(sectionsWithGaps);
    } catch (err) {
      console.error('Error loading capabilities:', err);
      setError('Error al analizar el sistema');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleRequestAISuggestions = async () => {
    if (!capabilities) return;
    
    setRequestingAI(true);
    
    // Construir un mensaje con los gaps encontrados
    const gapsDescription = capabilities.sections
      .filter(s => s.gaps.length > 0)
      .map(s => `${s.sectionName}: ${s.gaps.map(g => g.deviceName).join(', ')}`)
      .join('; ');
    
    const message = gapsDescription
      ? `Analicé el sistema y encontré estos dispositivos sin automatización: ${gapsDescription}. ¿Podés proponer automatizaciones para ellos?`
      : `Analicé el sistema y todos los dispositivos tienen automatización. ¿Hay alguna mejora que puedas sugerir?`;
    
    // Abrir el asistente y enviar el mensaje
    openAssistant();
    onClose();
    
    // Pequeño delay para que se abra el chat
    setTimeout(() => {
      sendMessage(message);
    }, 300);
    
    setRequestingAI(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/20 rounded-lg">
                <Brain className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Análisis de Capacidades
                </h2>
                <p className="text-sm text-zinc-400">
                  Dispositivos disponibles para automatizar
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
                <p className="text-zinc-400">Analizando sistema...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={loadCapabilities}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg"
                >
                  Reintentar
                </button>
              </div>
            ) : capabilities ? (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white">
                      {capabilities.summary.totalControllableDevices}
                    </div>
                    <div className="text-xs text-zinc-400">Controlables</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {capabilities.summary.devicesWithAutomation}
                    </div>
                    <div className="text-xs text-zinc-400">Automatizados</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-amber-400">
                      {capabilities.summary.devicesWithoutAutomation}
                    </div>
                    <div className="text-xs text-zinc-400">Sin Automatizar</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {capabilities.summary.totalSensors}
                    </div>
                    <div className="text-xs text-zinc-400">Sensores</div>
                  </div>
                </div>

                {/* Sections */}
                <div className="space-y-3">
                  {capabilities.sections.map(section => (
                    <SectionCard
                      key={section.sectionId}
                      section={section}
                      isExpanded={expandedSections.has(section.sectionId)}
                      onToggle={() => toggleSection(section.sectionId)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          {capabilities && capabilities.summary.devicesWithoutAutomation > 0 && (
            <div className="px-6 py-4 border-t border-zinc-700 bg-zinc-800/50">
              <button
                onClick={handleRequestAISuggestions}
                disabled={requestingAI}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-50"
              >
                {requestingAI ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Pedir a la IA que proponga automatizaciones</span>
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Componente para cada sección
function SectionCard({ 
  section, 
  isExpanded, 
  onToggle 
}: { 
  section: SectionCapabilities; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  const hasGaps = section.gaps.length > 0;
  
  return (
    <div className={`border rounded-lg overflow-hidden ${
      hasGaps ? 'border-amber-500/30 bg-amber-500/5' : 'border-zinc-700 bg-zinc-800/30'
    }`}>
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          )}
          <span className="font-medium text-white">{section.sectionName}</span>
          
          {/* Badges */}
          <div className="flex items-center gap-2">
            {section.sensors.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                {section.sensors.length} sensores
              </span>
            )}
            {section.controllableDevices.length > 0 && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                {section.controllableDevices.length} controlables
              </span>
            )}
            {hasGaps && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {section.gaps.length} sin automatizar
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Section Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-zinc-700/50"
          >
            <div className="p-4 grid md:grid-cols-2 gap-4">
              {/* Sensors */}
              <div>
                <h4 className="text-xs uppercase text-zinc-500 mb-2 flex items-center gap-1">
                  <ThermometerSun className="w-3 h-3" />
                  Sensores (condiciones)
                </h4>
                {section.sensors.length > 0 ? (
                  <div className="space-y-1">
                    {section.sensors.map(sensor => (
                      <div key={sensor.deviceId} className="text-sm text-zinc-300 flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-blue-400" />
                        <span>{sensor.deviceName}</span>
                        <span className="text-xs text-zinc-500">
                          ({sensor.canMeasure.join(', ')})
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 italic">
                    Sin sensores - solo automatizaciones por horario
                  </p>
                )}
              </div>

              {/* Controllable Devices */}
              <div>
                <h4 className="text-xs uppercase text-zinc-500 mb-2 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Dispositivos controlables
                </h4>
                {section.controllableDevices.length > 0 ? (
                  <div className="space-y-1">
                    {section.controllableDevices.map(device => {
                      const Icon = deviceTypeIcons[device.type] || Zap;
                      return (
                        <div key={device.deviceId} className="text-sm flex items-center gap-2">
                          <Icon className={`w-3 h-3 ${device.hasAutomation ? 'text-green-400' : 'text-amber-400'}`} />
                          <span className={device.hasAutomation ? 'text-zinc-300' : 'text-amber-300'}>
                            {device.deviceName}
                          </span>
                          {device.hasAutomation ? (
                            <span className="text-xs text-green-500">✓</span>
                          ) : (
                            <span className="text-xs text-amber-500">sin auto</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 italic">Sin dispositivos controlables</p>
                )}
              </div>

              {/* Gaps (if any) */}
              {hasGaps && (
                <div className="md:col-span-2 mt-2 pt-3 border-t border-zinc-700/50">
                  <h4 className="text-xs uppercase text-amber-500 mb-2 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    Oportunidades de automatización
                  </h4>
                  <div className="space-y-2">
                    {section.gaps.map(gap => {
                      const Icon = deviceTypeIcons[gap.type] || Zap;
                      return (
                        <div key={gap.deviceId} className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-4 h-4 text-amber-400" />
                            <span className="font-medium text-amber-300">{gap.deviceName}</span>
                            <span className="text-xs text-zinc-500">
                              ({deviceTypeLabels[gap.type] || gap.type})
                            </span>
                          </div>
                          <p className="text-sm text-zinc-400 ml-6">
                            💡 {gap.suggestion}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

