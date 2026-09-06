'use client';

import Link from 'next/link';
import { Droplets, Gauge, Leaf, Thermometer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SectionSummary } from '../hooks/useHomeDashboard';
import {
  READING_TONE,
  STAGE_LABELS,
  dominantStage,
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
  const { section, readings, devicesOn, plantsCount } = summary;
  const stage = dominantStage(section.plants);

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
        {section.enabled === false ? <Badge variant="offline">Inactiva</Badge> : null}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Reading
          icon={Thermometer}
          label="Temp."
          value={formatReading(readings.temperature, ' °C')}
          tone={READING_TONE[readingStatus('temperature', readings.temperature)]}
        />
        <Reading
          icon={Droplets}
          label="Humedad"
          value={formatReading(readings.humidity, ' %', 0)}
          tone={READING_TONE[readingStatus('humidity', readings.humidity)]}
        />
        <Reading
          icon={Gauge}
          label="VPD"
          value={formatReading(readings.vpd, ' kPa', 2)}
          tone={READING_TONE[readingStatus('vpd', readings.vpd)]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-edge pt-3">
        <span className="flex items-center gap-1 text-xs text-fg-muted">
          <Leaf className="h-3.5 w-3.5" />
          <span className="tabular-nums">{plantsCount}</span>
        </span>
        {stage ? <Badge variant="neutral">{STAGE_LABELS[stage]}</Badge> : null}
        {devicesOn.map((device) => (
          <Badge key={device.id} variant="accent">
            {device.name}
          </Badge>
        ))}
      </div>
    </Link>
  );
}
