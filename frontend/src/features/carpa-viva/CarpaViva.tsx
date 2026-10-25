'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {
  AlertTriangle,
  Box,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Fan,
  Grid2X2,
  History,
  Layers3,
  Leaf,
  RotateCcw,
  Scan,
  Settings2,
  Thermometer,
  Wind,
} from 'lucide-react';
import { Device, DeviceStatus, Plant, PlantStage, SectionDashboard, StageRange } from '@/types';
import { cn } from '@/lib/utils';
import SensorHistoryChart from '@/components/SensorHistoryChart';
import { sectionReadings } from '@/features/home/lib/readings';
import { resolvePlantSlots, SceneSelection, SceneView } from './lib/scene-config';
import { attentionItems, DEVICE_MODE, LiveMode, MODE_LABELS, SceneLayers } from './lib/operations';
import { SceneMetrics } from './components/SceneMetrics';
import { SceneInspector } from './components/SceneInspector';
import { SceneErrorBoundary, SceneFallback } from './components/SceneErrorBoundary';

const SceneCanvas = dynamic(() => import('./components/SceneCanvas'), {
  ssr: false,
  loading: () => <div className="flex h-full min-h-[480px] items-center justify-center bg-[#090c0b] text-sm text-fg-muted">Preparando la réplica…</div>,
});

const VIEW_OPTIONS: Array<{ id: SceneView; label: string; icon: typeof Box }> = [
  { id: 'perspective', label: 'Perspectiva', icon: Box },
  { id: 'front', label: 'Frontal', icon: Scan },
  { id: 'top', label: 'Cenital', icon: Grid2X2 },
];
const MODE_ICONS = { cultivo: Leaf, ambiente: Thermometer, equipos: Fan } as const;

export default function CarpaViva({
  section,
  getStatus,
  statusLoading,
  range,
  lastUpdate,
  onRefresh,
  onStatusChange,
  onRegisterEvent,
  onPlantStageChange,
}: {
  section: SectionDashboard;
  getStatus: (deviceId: string) => DeviceStatus | null;
  statusLoading: boolean;
  range: StageRange | null | undefined;
  lastUpdate?: Date;
  onRefresh: () => void;
  onStatusChange: () => void;
  onRegisterEvent: (plant: Plant) => void;
  onPlantStageChange: (plant: Plant, stage: PlantStage) => void;
}) {
  const [mode, setMode] = useState<LiveMode>('cultivo');
  const [view, setView] = useState<SceneView>('perspective');
  const [resetSignal, setResetSignal] = useState(0);
  const [selection, setSelection] = useState<SceneSelection>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [layers, setLayers] = useState<SceneLayers>({ structure: true, nets: true, wiring: true });
  const plants = useMemo(() => resolvePlantSlots(section.plants ?? []), [section.plants]);
  const devices = useMemo(() => section.devices ?? [], [section.devices]);
  const readings = sectionReadings(section, getStatus);
  const issues = attentionItems(section, getStatus, range);
  const autoFocused = useRef(false);

  useEffect(() => {
    if (autoFocused.current || plants.length === 0) return;
    autoFocused.current = true;
    setSelection({ kind: 'plant', id: plants[0].plant.id });
  }, [plants]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (selection?.kind === 'plant' && !section.plants.some((plant) => plant.id === selection.id)) setSelection(null);
    if (selection?.kind === 'device' && !devices.some((device) => device.id === selection.id)) setSelection(null);
  }, [devices, section.plants, selection]);

  function select(next: SceneSelection) {
    setSelection(next);
    setShowPhoto(false);
    if (next?.kind === 'device') {
      const device = devices.find((item) => item.id === next.id);
      const nextMode = device ? DEVICE_MODE[device.type] : undefined;
      if (nextMode) setMode(nextMode);
    }
    if (next?.kind === 'plant') setMode('cultivo');
  }

  const issueFree = issues.length === 0 && !readings.sensorPaused;
  return (
    <div className="overflow-hidden rounded-2xl border border-edge bg-surface shadow-[0_32px_100px_rgba(0,0,0,0.3)]">
      <header className="border-b border-edge px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', issueFree ? 'border-accent/25 bg-accent-soft text-accent' : 'border-warn/25 bg-warn/10 text-warn')}>
              {issueFree ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Carpa viva</h2>
                <span className="text-[10px] uppercase tracking-[0.16em] text-fg-faint">Réplica de referencia</span>
              </div>
              <p className="mt-0.5 text-xs text-fg-muted">
                {readings.sensorPaused ? 'Lecturas desactivadas · control disponible' : issues.length ? `${issues.length} ${issues.length === 1 ? 'punto requiere' : 'puntos requieren'} atención` : 'Condiciones y equipos bajo control'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-edge bg-bg p-1" role="tablist" aria-label="Capa operativa">
            {(Object.keys(MODE_LABELS) as LiveMode[]).map((item) => {
              const Icon = MODE_ICONS[item];
              return (
                <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => { setMode(item); setSelection(null); setShowPhoto(false); }} className={cn('flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors lg:flex-none', mode === item ? 'bg-surface-3 text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}>
                  <Icon className={cn('h-3.5 w-3.5', mode === item && 'text-accent')} />{MODE_LABELS[item]}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <SceneMetrics section={section} getStatus={getStatus} range={range} lastUpdate={lastUpdate} loading={statusLoading} />

      <div className="grid xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 border-b border-edge xl:border-b-0 xl:border-r">
          <div className="relative h-[560px] overflow-hidden bg-[#090c0b] sm:h-[660px] xl:h-[720px]">
            {showPhoto ? (
              <div className="relative h-full w-full" data-testid="reference-photo">
                <Image src="/images/carpa-flora-referencia.webp" alt="Fotografía frontal real de la carpa Flora, tomada como referencia para la réplica" fill className="object-cover" sizes="(max-width: 1280px) 100vw, 70vw" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-5 pb-5 pt-16 text-xs text-white/80">Foto real de referencia · Imagen estática del 24/10</div>
              </div>
            ) : (
              <SceneErrorBoundary>
                <SceneCanvas
                  view={view}
                  resetSignal={resetSignal}
                  plants={plants}
                  devices={devices}
                  getStatus={getStatus}
                  selected={selection}
                  onSelect={select}
                  reducedMotion={reducedMotion}
                  mode={mode}
                  layers={layers}
                  range={range}
                  fallback={<SceneFallback />}
                />
              </SceneErrorBoundary>
            )}

            <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] gap-2">
              <div className="flex rounded-lg border border-white/10 bg-[#0a0e0c]/90 p-1 shadow-float">
                {VIEW_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return <button key={option.id} type="button" disabled={showPhoto} onClick={() => setView(option.id)} aria-label={option.label} aria-pressed={view === option.id} className={cn('flex min-h-8 items-center gap-1.5 rounded-md px-2.5 text-xs transition-colors disabled:opacity-40', view === option.id && !showPhoto ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white')}><Icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{option.label}</span></button>;
                })}
              </div>
              <button type="button" onClick={() => setShowPhoto((current) => !current)} aria-pressed={showPhoto} className={cn('flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs', showPhoto ? 'border-accent/40 bg-accent-soft text-accent' : 'border-white/10 bg-[#0a0e0c]/90 text-white/65 hover:text-white')}><Camera className="h-4 w-4" /><span className="hidden sm:inline">{showPhoto ? 'Volver al 3D' : 'Foto real'}</span></button>
            </div>

            <div className="absolute right-3 top-3 flex gap-2">
              <div className="relative">
                <button type="button" aria-label="Capas de la escena" aria-expanded={showLayers} disabled={showPhoto} onClick={() => setShowLayers((current) => !current)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#0a0e0c]/90 text-white/65 hover:text-white disabled:opacity-40"><Layers3 className="h-4 w-4" /></button>
                {showLayers && !showPhoto ? (
                  <div className="absolute right-0 top-12 w-48 rounded-xl border border-white/10 bg-[#0a0e0c]/95 p-3 shadow-float">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-white/40">Capas visibles</p>
                    {([['structure', 'Estructura'], ['nets', 'Redes SCROG'], ['wiring', 'Cableado']] as const).map(([key, label]) => (
                      <button key={key} type="button" role="switch" aria-checked={layers[key]} onClick={() => setLayers((current) => ({ ...current, [key]: !current[key] }))} className="flex min-h-9 w-full items-center justify-between text-xs text-white/75"><span>{label}</span><span className={cn('relative h-4 w-7 rounded-full transition-colors', layers[key] ? 'bg-accent' : 'bg-white/15')}><span className={cn('absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform', layers[key] ? 'translate-x-3.5' : 'translate-x-0.5')} /></span></button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button type="button" aria-label="Restablecer cámara" disabled={showPhoto} onClick={() => { setView('perspective'); setSelection(null); setResetSignal((current) => current + 1); }} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#0a0e0c]/90 text-white/65 hover:text-white disabled:opacity-40"><RotateCcw className="h-4 w-4" /></button>
            </div>

            <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-white/10 bg-[#0a0e0c]/85 px-3 py-2 text-[10px] text-white/45">Arrastrá para orbitar · Seleccioná un marcador para actuar</div>
            <div className="pointer-events-none absolute bottom-3 right-3 hidden rounded-md border border-white/10 bg-[#0a0e0c]/85 px-3 py-2 text-[10px] text-white/45 sm:block">1,20 × 1,20 × 2,00 m</div>
          </div>

          <div className="border-t border-edge bg-bg/40 p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-fg-faint">Mapa de la carpa</span>
              <span className="text-[10px] text-fg-faint">Acceso directo</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin" aria-label="Seleccionar un elemento">
              {mode === 'cultivo' ? plants.map(({ plant }) => (
                <button key={plant.id} type="button" aria-label={plant.strain?.name ?? plant.tagCode} onClick={() => select({ kind: 'plant', id: plant.id })} aria-pressed={selection?.kind === 'plant' && selection.id === plant.id} className={cn('min-h-10 shrink-0 rounded-lg border px-3 text-left text-xs transition-colors', selection?.kind === 'plant' && selection.id === plant.id ? 'border-accent/50 bg-accent-soft text-accent' : 'border-edge bg-surface text-fg-muted hover:border-edge-strong hover:text-fg')}>
                  <span className="block font-medium">{plant.strain?.name ?? plant.tagCode}</span><span className="mt-0.5 block text-[10px] opacity-60">#{plant.tagCode}</span>
                </button>
              )) : devices.filter((device) => mode === 'ambiente' ? device.type === 'SENSOR' : device.type !== 'SENSOR' && device.type !== 'CAMARA').map((device: Device) => (
                <button key={device.id} type="button" onClick={() => select({ kind: 'device', id: device.id })} aria-pressed={selection?.kind === 'device' && selection.id === device.id} className={cn('flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-xs transition-colors', selection?.kind === 'device' && selection.id === device.id ? 'border-accent/50 bg-accent-soft text-accent' : 'border-edge bg-surface text-fg-muted hover:border-edge-strong hover:text-fg')}>
                  {device.type === 'SENSOR' ? <Thermometer className="h-3.5 w-3.5" /> : <Fan className="h-3.5 w-3.5" />}{device.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="min-w-0 bg-surface xl:max-h-[810px] xl:overflow-y-auto">
          {!selection && issues.length > 0 ? (
            <section className="border-b border-edge p-4 sm:p-5" aria-label="Requiere atención">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-warn"><AlertTriangle className="h-3.5 w-3.5" /> Requiere atención</div>
              <div className="space-y-2">
                {issues.map((issue) => <button key={issue.id} type="button" onClick={() => select(issue.selection)} className="w-full rounded-xl border border-warn/20 bg-warn/5 p-3 text-left transition hover:border-warn/40"><span className={cn('block text-xs font-medium', issue.severity === 'danger' ? 'text-danger' : 'text-warn')}>{issue.title}</span><span className="mt-1 block text-[11px] leading-4 text-fg-muted">{issue.detail}</span></button>)}
              </div>
            </section>
          ) : null}
          <SceneInspector selection={selection} plants={section.plants} devices={devices} getStatus={getStatus} statusLoading={statusLoading} onStatusChange={onStatusChange} onRegisterEvent={onRegisterEvent} onPlantStageChange={onPlantStageChange} onClose={() => setSelection(null)} />
          <div className="border-t border-edge p-4 sm:p-5">
            <button type="button" onClick={() => readings.sensor && setShowHistory((current) => !current)} disabled={!readings.sensor} aria-expanded={showHistory} className="flex min-h-10 w-full items-center justify-between rounded-lg border border-edge bg-surface-2 px-3 text-xs font-medium text-fg-muted hover:text-fg disabled:opacity-50">
              <span className="flex items-center gap-2"><History className="h-4 w-4" /> Evolución ambiental</span>{showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showHistory && readings.sensor ? <div className="mt-3 overflow-hidden rounded-xl border border-edge"><SensorHistoryChart deviceId={readings.sensor.id} deviceName={readings.sensor.name} /></div> : null}
            <button type="button" onClick={onRefresh} className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg text-xs text-fg-faint transition hover:bg-surface-2 hover:text-fg"><Settings2 className="h-3.5 w-3.5" /> Actualizar lecturas y estados</button>
          </div>
        </aside>
      </div>
      <footer className="flex flex-col gap-1 border-t border-edge bg-bg/40 px-4 py-3 text-[10px] leading-4 text-fg-faint sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <span>Morfología y alturas representadas a partir de las fotos del 24/10.</span>
        <span className="flex items-center gap-1.5"><Wind className="h-3 w-3" /> Lecturas y estados: datos reales de la aplicación</span>
      </footer>
    </div>
  );
}
