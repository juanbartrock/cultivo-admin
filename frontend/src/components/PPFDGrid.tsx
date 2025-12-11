'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Ruler, Calculator, Plus, Loader2, X, Info, Clock } from 'lucide-react';
import { api } from '@/services/apiService';
import { PPFDReading, DLIResult } from '@/types';

interface PPFDGridProps {
  sectionId: string;
  sectionName?: string;
}

export default function PPFDGrid({ sectionId, sectionName }: PPFDGridProps) {
  const [readings, setReadings] = useState<Array<{ zone: number; reading: PPFDReading | null }>>([]);
  const [dli, setDli] = useState<DLIResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [lightHours, setLightHours] = useState(18); // Default 18/6

  useEffect(() => {
    loadData();
  }, [sectionId, lightHours]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [readingsData, dliData] = await Promise.all([
        api.get<Array<{ zone: number; reading: PPFDReading | null }>>(`/sections/${sectionId}/ppfd/latest`),
        api.get<DLIResult>(`/sections/${sectionId}/dli?lightHours=${lightHours}`),
      ]);
      setReadings(readingsData);
      setDli(dliData);
    } catch (err) {
      console.error('Error loading PPFD data:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleZoneClick(zone: number) {
    setSelectedZone(zone);
    setShowModal(true);
  }

  async function handleSaveReading(zone: number, ppfdValue: number, lightHeight: number) {
    try {
      await api.post(`/sections/${sectionId}/ppfd`, {
        zone,
        ppfdValue,
        lightHeight,
      });
      await loadData();
      setShowModal(false);
      setSelectedZone(null);
    } catch (err) {
      console.error('Error saving PPFD reading:', err);
      alert('Error al guardar la lectura');
    }
  }

  const getZoneColor = (ppfd: number | null | undefined) => {
    if (ppfd === null || ppfd === undefined) return 'bg-zinc-800/50 border-zinc-700';
    if (ppfd < 200) return 'bg-blue-900/30 border-blue-700/50';
    if (ppfd < 400) return 'bg-green-900/30 border-green-700/50';
    if (ppfd < 600) return 'bg-yellow-900/30 border-yellow-700/50';
    if (ppfd < 800) return 'bg-orange-900/30 border-orange-700/50';
    return 'bg-red-900/30 border-red-700/50';
  };

  const getPPFDLevel = (ppfd: number | null | undefined) => {
    if (ppfd === null || ppfd === undefined) return { label: 'Sin datos', color: 'text-zinc-500' };
    if (ppfd < 200) return { label: 'Muy bajo', color: 'text-blue-400' };
    if (ppfd < 400) return { label: 'Bajo', color: 'text-green-400' };
    if (ppfd < 600) return { label: 'Óptimo', color: 'text-yellow-400' };
    if (ppfd < 800) return { label: 'Alto', color: 'text-orange-400' };
    return { label: 'Muy alto', color: 'text-red-400' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sun className="w-5 h-5 text-yellow-400" />
          <h4 className="text-sm font-medium text-zinc-300">
            PPFD por Zona {sectionName && `- ${sectionName}`}
          </h4>
        </div>
        <div className="flex items-center gap-3">
          {/* Selector de horas de luz */}
          <div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg px-2 py-1 border border-zinc-700/50">
            <Clock className="w-3.5 h-3.5 text-yellow-400" />
            <select
              value={lightHours}
              onChange={(e) => setLightHours(parseInt(e.target.value))}
              className="bg-transparent text-xs text-zinc-300 border-none focus:outline-none cursor-pointer"
            >
              <option value={24}>24/0</option>
              <option value={20}>20/4</option>
              <option value={18}>18/6</option>
              <option value={16}>16/8</option>
              <option value={14}>14/10</option>
              <option value={13}>13/11</option>
              <option value={12}>12/12</option>
            </select>
          </div>
          <div className="group relative">
            <Info className="w-4 h-4 text-zinc-500 cursor-help" />
            <div className="absolute right-0 top-full mt-1 w-64 p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              <p className="font-medium text-white mb-1">Niveles de PPFD recomendados:</p>
              <ul className="space-y-0.5">
                <li>&lt;200: Germinación/Esquejes</li>
                <li>200-400: Vegetativo temprano</li>
                <li>400-600: Vegetativo tardío</li>
                <li>600-800: Floración</li>
                <li>&gt;800: Floración intensiva</li>
              </ul>
              <p className="font-medium text-white mt-2 mb-1">DLI recomendado:</p>
              <ul className="space-y-0.5">
                <li>15-25: Vegetativo</li>
                <li>35-45: Floración temprana</li>
                <li>45-65: Floración plena</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Grilla 2x3 */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6].map((zone) => {
          const zoneData = readings.find((r) => r.zone === zone);
          const ppfd = zoneData?.reading?.ppfdValue;
          const height = zoneData?.reading?.lightHeight;
          const level = getPPFDLevel(ppfd);

          return (
            <motion.button
              key={zone}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleZoneClick(zone)}
              className={`p-3 rounded-lg border transition-colors ${getZoneColor(ppfd)} hover:border-yellow-500/50`}
            >
              <div className="text-xs text-zinc-500 mb-1">Zona {zone}</div>
              {ppfd !== null && ppfd !== undefined ? (
                <>
                  <div className="text-lg font-bold text-white">{ppfd}</div>
                  <div className="text-xs text-zinc-500">µmol/m²/s</div>
                  <div className={`text-xs mt-1 ${level.color}`}>{level.label}</div>
                  {height && (
                    <div className="text-xs text-zinc-600 mt-0.5">{height}cm</div>
                  )}
                </>
              ) : (
                <div className="py-2">
                  <Plus className="w-5 h-5 text-zinc-600 mx-auto" />
                  <div className="text-xs text-zinc-600 mt-1">Agregar</div>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* DLI calculado */}
      {dli && dli.dli !== null && (
        <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg p-4 border border-yellow-700/30">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-400">DLI Teórico</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{dli.dli}</div>
              <div className="text-xs text-zinc-500">mol/m²/día</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-zinc-300">{dli.avgPPFD}</div>
              <div className="text-xs text-zinc-500">PPFD prom.</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-zinc-300">{dli.lightHoursPerDay}h</div>
              <div className="text-xs text-zinc-500">de luz</div>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-3">
            DLI = PPFD × horas de luz × 0.0036 | Basado en {dli.zonesWithData} zonas con datos
          </p>
        </div>
      )}

      {/* Modal para agregar/editar lectura */}
      {showModal && selectedZone && (
        <PPFDModal
          zone={selectedZone}
          currentReading={readings.find((r) => r.zone === selectedZone)?.reading}
          onClose={() => {
            setShowModal(false);
            setSelectedZone(null);
          }}
          onSave={handleSaveReading}
        />
      )}
    </div>
  );
}

// Modal para agregar lectura PPFD
function PPFDModal({
  zone,
  currentReading,
  onClose,
  onSave,
}: {
  zone: number;
  currentReading: PPFDReading | null | undefined;
  onClose: () => void;
  onSave: (zone: number, ppfdValue: number, lightHeight: number) => void;
}) {
  const [ppfdValue, setPpfdValue] = useState(currentReading?.ppfdValue?.toString() || '');
  const [lightHeight, setLightHeight] = useState(currentReading?.lightHeight?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit() {
    if (!ppfdValue || !lightHeight) {
      alert('Completa todos los campos');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(zone, parseFloat(ppfdValue), parseFloat(lightHeight));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-zinc-800 rounded-2xl border border-zinc-700 p-6 w-full max-w-sm shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Zona {zone}</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded-lg">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-1">
              <Sun className="w-4 h-4 text-yellow-400" />
              PPFD (µmol/m²/s)
            </label>
            <input
              type="number"
              value={ppfdValue}
              onChange={(e) => setPpfdValue(e.target.value)}
              placeholder="Ej: 450"
              min={0}
              max={2000}
              className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-1">
              <Ruler className="w-4 h-4 text-cyan-400" />
              Altura de la luz (cm desde el follaje)
            </label>
            <input
              type="number"
              value={lightHeight}
              onChange={(e) => setLightHeight(e.target.value)}
              placeholder="Ej: 30"
              min={0}
              max={200}
              className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white"
            />
          </div>

          {currentReading && (
            <p className="text-xs text-zinc-500">
              Última lectura:{' '}
              {new Date(currentReading.recordedAt).toLocaleString('es-AR')}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !ppfdValue || !lightHeight}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-zinc-700 text-white rounded-lg"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

