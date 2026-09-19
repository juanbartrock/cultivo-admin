'use client';

import Link from 'next/link';
import { Droplets, Gauge, Leaf, Thermometer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SectionSummary } from '../hooks/useHomeDashboard';
import {
  RANGE_STAGE_LABELS,
  READING_TONE,
  formatReading,
  readingStatus,
} from '../lib/readings';

interface CarpaStatusCardProps {
  summary: SectionSummary;
}

function Reading({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Thermometer;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-xs text-fg-faint">
        <Icon className="h-3.5 w-3.5" />
        <span className="truncate">{label}</span>
      </div>
      <p className={cn('font-display mt-0.5 text-xl font-semibold tabular-nums', tone)}>{value}</p>
    </div>
  );
}

export function CarpaStatusCard({ summary }: CarpaStatusCardProps) {
  const { section, readings, devicesOn, plantsCount, stage, range } = summary;

  return (
    <Link
      href={`/sala/carpa/${section.id}`}
      className={cn(
        'flex flex-col gap-4 rounded-md border border-edge bg-surface p-4 transition-colors hover:border-edge-strong hover:bg-surface-2',
        section.enabled === false && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fg">{section.name}</p>
          <p className="truncate text-xs text-fg-faint">{section.room?.name ?? '—'}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {section.enabled === false ? <Badge variant="offline">Inactiva</Badge> : null}
          {readings.sensorPaused ? <Badge variant="offline">Lecturas desactivadas</Badge> : null}
          {readings.sensorOffline ? <Badge variant="offline">Sensor sin respuesta</Badge> : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Reading
          icon={Thermometer}
          label="Temp."
          value={formatReading(readings.temperature, ' °C')}
          tone={READING_TONE[readingStatus('temperature', readings.temperature, range)]}
        />
        <Reading
          icon={Droplets}
          label="Humedad"
          value={formatReading(readings.humidity, ' %', 0)}
          tone={READING_TONE[readingStatus('humidity', readings.humidity, range)]}
        />
        <Reading
          icon={Gauge}
          label="VPD"
          value={formatReading(readings.vpd, ' kPa', 2)}
          tone={READING_TONE[readingStatus('vpd', readings.vpd, range)]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-edge pt-3">
        <span className="flex items-center gap-1 text-xs text-fg-muted">
          <Leaf className="h-3.5 w-3.5" />
          <span className="tabular-nums">{plantsCount}</span>
        </span>
        <Badge variant="neutral" title="Etapa cuyos rangos se aplican">
          Rangos: {RANGE_STAGE_LABELS[stage]}
        </Badge>
        {devicesOn.map((device) => (
          <Badge key={device.id} variant="accent">
            {device.name}
          </Badge>
        ))}
      </div>
    </Link>
  );
}
