'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Thermometer,
  Gauge,
  Power,
  Video,
  Sun,
  LineChart,
  Beaker,
  Shield,
  Leaf,
  Loader2,
  Check,
  RotateCcw,
  Eye,
  EyeOff,
  Settings2,
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import {
  SectionLayoutItem,
  SectionLayoutConfig,
  SectionLayoutKey,
  SECTION_LAYOUT_META,
  DEFAULT_SECTION_LAYOUT,
} from '@/types';
import { sectionService } from '@/services/locationService';

// Iconos para cada sección
const SECTION_ICONS: Record<SectionLayoutKey, React.ElementType> = {
  environment: Thermometer,
  sensors: Gauge,
  controllables: Power,
  cameras: Video,
  ppfd: Sun,
  sensorHistory: LineChart,
  feedingPlans: Beaker,
  preventionPlans: Shield,
  plants: Leaf,
};

// Colores para cada sección
const SECTION_COLORS: Record<SectionLayoutKey, { text: string; bg: string; border: string }> = {
  environment: { text: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
  sensors: { text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
  controllables: { text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
  cameras: { text: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
  ppfd: { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  sensorHistory: { text: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
  feedingPlans: { text: 'text-teal-400', bg: 'bg-teal-500/20', border: 'border-teal-500/30' },
  preventionPlans: { text: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  plants: { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' },
};

interface SectionLayoutEditorProps {
  sectionId: string;
  sectionName?: string;
  onClose: () => void;
  onSave: (config: SectionLayoutConfig) => void;
}

export default function SectionLayoutEditor({
  sectionId,
  sectionName,
  onClose,
  onSave,
}: SectionLayoutEditorProps) {
  const { toast } = useToast();
  const [sections, setSections] = useState<SectionLayoutItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSections, setOriginalSections] = useState<SectionLayoutItem[]>([]);

  useEffect(() => {
    loadLayout();
  }, [sectionId]);

  async function loadLayout() {
    setIsLoading(true);
    try {
      const layout = await sectionService.getLayout(sectionId);
      const sortedSections = [...layout.config.sections].sort((a, b) => a.order - b.order);
      setSections(sortedSections);
      setOriginalSections(sortedSections);
    } catch (error) {
      console.error('Error cargando layout:', error);
      // Usar configuración por defecto si hay error
      const defaultSections = [...DEFAULT_SECTION_LAYOUT.sections];
      setSections(defaultSections);
      setOriginalSections(defaultSections);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleSection(key: SectionLayoutKey) {
    setSections(prev => {
      const updated = prev.map(s =>
        s.key === key ? { ...s, enabled: !s.enabled } : s
      );
      setHasChanges(true);
      return updated;
    });
  }

  function moveSection(index: number, direction: 'up' | 'down') {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sections.length - 1)
    ) {
      return;
    }

    setSections(prev => {
      const newSections = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      // Intercambiar posiciones
      [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];

      // Actualizar órdenes
      const reordered = newSections.map((s, i) => ({ ...s, order: i }));
      setHasChanges(true);
      return reordered;
    });
  }

  function resetToDefault() {
    const defaultSections = [...DEFAULT_SECTION_LAYOUT.sections];
    setSections(defaultSections);
    setHasChanges(true);
  }

  function cancelChanges() {
    setSections([...originalSections]);
    setHasChanges(false);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const config: SectionLayoutConfig = { sections };
      await sectionService.updateLayout(sectionId, config);
      setOriginalSections(sections);
      setHasChanges(false);
      onSave(config);
      onClose();
      toast.success('Layout guardado correctamente');
    } catch (error) {
      console.error('Error guardando layout:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  }

  const enabledCount = sections.filter(s => s.enabled).length;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cultivo-green-500/20 rounded-lg">
              <Settings2 className="w-5 h-5 text-cultivo-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Configurar Layout</h3>
              {sectionName && (
                <p className="text-sm text-zinc-400">{sectionName}</p>
              )}
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
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-cultivo-green-400 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-zinc-400">
                  {enabledCount} de {sections.length} secciones visibles
                </p>
                <button
                  onClick={resetToDefault}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurar
                </button>
              </div>

              {sections.map((section, index) => {
                const Icon = SECTION_ICONS[section.key];
                const colors = SECTION_COLORS[section.key];
                const meta = SECTION_LAYOUT_META[section.key];

                return (
                  <motion.div
                    key={section.key}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${section.enabled
                        ? `bg-zinc-800/50 ${colors.border}`
                        : 'bg-zinc-800/20 border-zinc-800 opacity-60'
                      }`}
                  >
                    {/* Drag handle visual */}
                    <div className="text-zinc-600">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${section.enabled ? colors.bg : 'bg-zinc-800'}`}>
                      <Icon className={`w-4 h-4 ${section.enabled ? colors.text : 'text-zinc-500'}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${section.enabled ? 'text-white' : 'text-zinc-500'}`}>
                        {meta.label}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {meta.description}
                      </p>
                    </div>

                    {/* Position badge */}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${section.enabled ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-800 text-zinc-600'
                      }`}>
                      #{index + 1}
                    </span>

                    {/* Move buttons */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveSection(index, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                      >
                        <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                      </button>
                      <button
                        onClick={() => moveSection(index, 'down')}
                        disabled={index === sections.length - 1}
                        className="p-1 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                      </button>
                    </div>

                    {/* Toggle button */}
                    <button
                      onClick={() => toggleSection(section.key)}
                      className={`p-2 rounded-lg transition-all ${section.enabled
                          ? 'bg-cultivo-green-500/20 text-cultivo-green-400 hover:bg-cultivo-green-500/30'
                          : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                        }`}
                    >
                      {section.enabled ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <button
                onClick={cancelChanges}
                className="px-3 py-2 text-zinc-400 hover:text-white transition-colors text-sm"
              >
                Descartar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex items-center gap-2 px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isSaving ? (
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
        </div>
      </motion.div>
    </div>
  );
}


