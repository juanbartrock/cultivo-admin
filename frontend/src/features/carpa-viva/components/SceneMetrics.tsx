'use client';

import { DeviceStatus, SectionDashboard, StageRange } from '@/types';
import { formatReading, RANGE_STAGE_LABELS, READING_TONE, readingStatus, sectionReadings } from '@/features/home/lib/readings';
import { liveMetrics, rangeLabel } from '../lib/operations';
import { cn } from '@/lib/utils';

export function SceneMetrics({
  section,
  getStatus,
  range,
  lastUpdate,
  loading,
}: {
  section: SectionDashboard;
  getStatus: (deviceId: string) => DeviceStatus | null;
  range: StageRange | null | undefined;
  lastUpdate?: Date;
  loading: boolean;
}) {
  const readings = sectionReadings(section, getStatus);
  const metrics = liveMetrics(section, getStatus);
  return (
    <section aria-label="Condiciones actuales" className="border-b border-edge bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 text-[10px] uppercase tracking-[0.14em] text-fg-faint sm:px-5">
        <span>Rangos · {RANGE_STAGE_LABELS[section.effectiveStage ?? 'DEFAULT']}</span>
        <span className="flex items-center gap-1.5 normal-case tracking-normal">
          <span className={cn('h-1.5 w-1.5 rounded-full', loading ? 'animate-pulse bg-warn' : 'bg-accent')} />
          {lastUpdate ? lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : 'Monitoreo activo'}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {metrics.map((metric) => {
          const status = readingStatus(metric.key, metric.value, range);
          return (
            <div key={metric.key} className="border-r border-edge px-4 py-4 last:border-r-0 sm:px-5 [&:nth-child(2)]:border-r-0 sm:[&:nth-child(2)]:border-r">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-medium tracking-[0.14em] text-fg-muted">{metric.shortLabel}</span>
                <span className={cn('h-1.5 w-1.5 rounded-full', status === 'ok' && 'bg-ok', status === 'warn' && 'bg-warn', status === 'danger' && 'bg-danger', status === 'unknown' && 'bg-offline')} />
              </div>
              <p className={cn('mt-2 font-display text-2xl font-medium tabular-nums tracking-tight', READING_TONE[status])} title={metric.label}>
                {formatReading(metric.value, metric.unit, metric.decimals)}
              </p>
              <p className="mt-1 truncate text-[10px] text-fg-faint">
                {readings.sensorPaused ? 'Lecturas desactivadas' : readings.sensorOffline ? 'Sin respuesta' : rangeLabel(range, metric.key)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
