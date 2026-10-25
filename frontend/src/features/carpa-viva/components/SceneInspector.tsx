'use client';

import { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, Camera, Clock3, Droplets, FileText, Loader2, MapPin, Package, X } from 'lucide-react';
import DeviceControlCard from '@/components/DeviceControlCard';
import PlantCard from '@/components/PlantCard';
import { eventService, formatEventDate } from '@/services/eventService';
import { Device, DeviceStatus, GrowEvent, Plant, PlantStage } from '@/types';
import { SceneSelection } from '../lib/scene-config';

const EVENT_ICONS = { RIEGO: Droplets, FOTO: Camera, CAMBIO_MACETA: Package, TRANSPLANTE: Package } as const;

function PlantActivity({ plant }: { plant: Plant }) {
  const [events, setEvents] = useState<GrowEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    eventService.getPlantHistory(plant.id, 4)
      .then((items) => { if (active) setEvents(items); })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [plant.id]);

  return (
    <section className="mt-4 border-t border-edge pt-4" aria-label="Actividad reciente">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">
          <Clock3 className="h-3.5 w-3.5" /> Actividad reciente
        </h4>
        <span className="text-[10px] text-fg-faint">Últimos registros</span>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-fg-muted"><Loader2 className="h-4 w-4 animate-spin" /> Consultando bitácora…</div>
      ) : failed ? (
        <p className="rounded-lg border border-warn/20 bg-warn/5 p-3 text-xs text-warn">No se pudo cargar la actividad.</p>
      ) : events.length === 0 ? (
        <p className="rounded-lg border border-dashed border-edge-strong p-3 text-xs leading-5 text-fg-muted">Todavía no hay eventos. Registrá el primero para empezar el seguimiento.</p>
      ) : (
        <ol className="space-y-1">
          {events.map((event) => {
            const Icon = EVENT_ICONS[event.type as keyof typeof EVENT_ICONS] ?? FileText;
            return (
              <li key={event.id} className="flex gap-3 rounded-lg px-2 py-2 hover:bg-surface-2">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-3 text-fg-muted"><Icon className="h-3.5 w-3.5" /></span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-fg">{event.type.replaceAll('_', ' ').toLowerCase()}</p>
                  <p className="mt-0.5 text-[11px] text-fg-faint">{formatEventDate(event.createdAt)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export function SceneInspector({
  selection,
  plants,
  devices,
  getStatus,
  statusLoading,
  onStatusChange,
  onRegisterEvent,
  onPlantStageChange,
  onClose,
}: {
  selection: SceneSelection;
  plants: Plant[];
  devices: Device[];
  getStatus: (deviceId: string) => DeviceStatus | null;
  statusLoading: boolean;
  onStatusChange: () => void;
  onRegisterEvent: (plant: Plant) => void;
  onPlantStageChange: (plant: Plant, stage: PlantStage) => void;
  onClose: () => void;
}) {
  const plant = selection?.kind === 'plant' ? plants.find((item) => item.id === selection.id) : undefined;
  const device = selection?.kind === 'device' ? devices.find((item) => item.id === selection.id) : undefined;

  return (
    <section aria-label="Detalle del elemento" className="p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">
          <MapPin className="h-3.5 w-3.5 text-accent" />
          {plant ? 'Planta seleccionada' : device ? 'Equipo seleccionado' : 'Puesto de operación'}
        </div>
        {selection ? (
          <button type="button" onClick={onClose} aria-label="Cerrar detalle" className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {plant ? (
        <>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="font-display text-2xl font-medium tracking-tight text-fg">{plant.strain?.name ?? 'Sin genética'}</p>
              <p className="mt-1 text-xs text-fg-muted">#{plant.tagCode} · {plant.potSizeFinal ?? '500 ml'} · Esqueje</p>
            </div>
            <button type="button" onClick={() => onRegisterEvent(plant)} className="flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-accent px-3 text-xs font-semibold text-[#07150d] transition hover:bg-accent-strong">
              Registrar <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          <PlantCard plant={plant} isSelected onRegisterEvent={onRegisterEvent} onStageChange={onPlantStageChange} />
          <PlantActivity plant={plant} />
        </>
      ) : device ? (
        <>
          <div className="mb-4">
            <p className="font-display text-2xl font-medium tracking-tight text-fg">{device.name}</p>
            <p className="mt-1 text-xs text-fg-muted">{device.type.replaceAll('_', ' ')} · {device.connector}</p>
          </div>
          <DeviceControlCard device={device} status={getStatus(device.id)} loading={statusLoading} onStatusChange={onStatusChange} />
          <p className="mt-4 flex gap-2 text-[11px] leading-5 text-fg-faint"><Activity className="mt-0.5 h-3.5 w-3.5 shrink-0" /> El estado y los comandos se aplican al dispositivo real asignado a esta carpa.</p>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-edge-strong bg-surface-2/40 p-5">
          <p className="text-sm font-medium text-fg">Explorá la carpa</p>
          <p className="mt-2 text-xs leading-5 text-fg-muted">Tocá una planta o un equipo para enfocarlo, consultar su contexto y actuar sin salir de esta vista.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-fg-faint">
            <span>{plants.length} plantas identificadas</span>
            <span>{devices.length} dispositivos vinculados</span>
          </div>
        </div>
      )}
    </section>
  );
}
