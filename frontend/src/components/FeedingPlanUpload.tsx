'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  FileJson, 
  X, 
  Check, 
  AlertCircle,
  Loader2,
  Download
} from 'lucide-react';
import { feedingPlanService } from '@/services/feedingPlanService';
import { ImportFeedingPlanDto, FeedingPlan, PlantStage } from '@/types';

// Ejemplo de JSON para el usuario
const EXAMPLE_JSON: ImportFeedingPlanDto = {
  name: "BioBizz Floración",
  description: "Plan de floración con productos BioBizz",
  stage: "FLORACION" as PlantStage,
  weeks: [
    {
      weekNumber: 1,
      ph: 6.2,
      ec: 1.2,
      products: [
        { name: "Bio-Bloom", dose: "2", unit: "ml/L" },
        { name: "Top-Max", dose: "1", unit: "ml/L" }
      ]
    },
    {
      weekNumber: 2,
      ph: 6.3,
      ec: 1.4,
      products: [
        { name: "Bio-Bloom", dose: "3", unit: "ml/L" },
        { name: "Top-Max", dose: "2", unit: "ml/L" },
        { name: "Bio-Heaven", dose: "2", unit: "ml/L" }
      ]
    }
  ]
};

interface FeedingPlanUploadProps {
  onClose: () => void;
  onSuccess: (plan: FeedingPlan) => void;
}

export default function FeedingPlanUpload({ onClose, onSuccess }: FeedingPlanUploadProps) {
  const [jsonContent, setJsonContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ImportFeedingPlanDto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manejar archivo seleccionado
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setJsonContent(text);
      validateAndPreview(text);
    } catch {
      setError('Error al leer el archivo');
    }
  };

  // Validar y mostrar preview
  const validateAndPreview = (content: string) => {
    setError(null);
    setParsedPreview(null);

    if (!content.trim()) {
      return;
    }

    try {
      const parsed = JSON.parse(content);
      
      // Validaciones básicas
      if (!parsed.name || typeof parsed.name !== 'string') {
        throw new Error('El campo "name" es requerido y debe ser texto');
      }
      if (!parsed.stage || !['GERMINACION', 'VEGETATIVO', 'PRE_FLORA', 'FLORACION', 'SECADO', 'CURADO'].includes(parsed.stage)) {
        throw new Error('El campo "stage" debe ser una etapa válida (GERMINACION, VEGETATIVO, PRE_FLORA, FLORACION, SECADO, CURADO)');
      }
      if (!Array.isArray(parsed.weeks) || parsed.weeks.length === 0) {
        throw new Error('El campo "weeks" debe ser un array con al menos una semana');
      }

      // Validar cada semana
      for (const week of parsed.weeks) {
        if (typeof week.weekNumber !== 'number' || week.weekNumber < 1) {
          throw new Error('Cada semana debe tener un "weekNumber" válido (número >= 1)');
        }
        if (!Array.isArray(week.products)) {
          throw new Error(`La semana ${week.weekNumber} debe tener un array de "products"`);
        }
        for (const product of week.products) {
          if (!product.name || !product.dose || !product.unit) {
            throw new Error(`Los productos de la semana ${week.weekNumber} deben tener name, dose y unit`);
          }
        }
      }

      setParsedPreview(parsed as ImportFeedingPlanDto);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('JSON inválido. Verifica la sintaxis del archivo.');
      } else if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  // Importar plan
  const handleImport = async () => {
    if (!parsedPreview) return;

    setIsUploading(true);
    setError(null);

    try {
      const plan = await feedingPlanService.import(parsedPreview);
      onSuccess(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar el plan');
    } finally {
      setIsUploading(false);
    }
  };

  // Descargar ejemplo
  const downloadExample = () => {
    const blob = new Blob([JSON.stringify(EXAMPLE_JSON, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plan-alimentacion-ejemplo.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Cargar ejemplo en el textarea
  const loadExample = () => {
    const exampleStr = JSON.stringify(EXAMPLE_JSON, null, 2);
    setJsonContent(exampleStr);
    validateAndPreview(exampleStr);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <FileJson className="w-5 h-5 text-cultivo-green-500" />
            <h3 className="text-lg font-semibold text-white">Importar Plan de Alimentación</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Botones de archivo */}
          <div className="flex flex-wrap gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              Seleccionar archivo JSON
            </button>
            <button
              onClick={loadExample}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
            >
              <FileJson className="w-4 h-4" />
              Cargar ejemplo
            </button>
            <button
              onClick={downloadExample}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar ejemplo
            </button>
          </div>

          {/* Editor de JSON */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Contenido JSON
            </label>
            <textarea
              value={jsonContent}
              onChange={(e) => {
                setJsonContent(e.target.value);
                validateAndPreview(e.target.value);
              }}
              placeholder="Pega aquí el JSON del plan de alimentación..."
              rows={12}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white font-mono text-sm placeholder:text-zinc-600 focus:outline-none focus:border-cultivo-green-600 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Preview */}
          {parsedPreview && (
            <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Check className="w-5 h-5 text-cultivo-green-400" />
                <h4 className="font-medium text-white">Vista previa</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-500">Nombre</p>
                  <p className="text-white font-medium">{parsedPreview.name}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Etapa</p>
                  <p className="text-cultivo-green-400 font-medium">{parsedPreview.stage}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Semanas</p>
                  <p className="text-white">{parsedPreview.weeks.length}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Productos únicos</p>
                  <p className="text-white">
                    {new Set(parsedPreview.weeks.flatMap(w => w.products.map(p => p.name))).size}
                  </p>
                </div>
              </div>

              {parsedPreview.description && (
                <div className="mt-3">
                  <p className="text-zinc-500 text-sm">Descripción</p>
                  <p className="text-zinc-300 text-sm">{parsedPreview.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 pt-2">
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={!parsedPreview || isUploading}
              className="flex items-center gap-2 px-4 py-2 bg-cultivo-green-600 hover:bg-cultivo-green-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Importar Plan
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
