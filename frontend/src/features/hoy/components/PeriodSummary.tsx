'use client';

import { Clock, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgendaMetricSummary, AgendaPeriod } from '@/types';
import { PERIOD_LABEL, decimal, formatMinutes, formatTime } from '../lib/format';

const STATUS_TONE = {
  ok: 'text-fg',
  warn: 'text-warn',
  danger: 'text-danger',
} as const;

const PERIOD_ICON = { LUZ: Sun, OSCURIDAD: Moon, VENTANA: Clock } as const;

const fixed = (value: number, digits: number) => value.toFixed(digits).replace('.', ',');

function MetricCell({
  label,
  summary,
  unit,
  digits,
}: {
  label: string;
  summary: AgendaMetricSummary | null;
  unit: string;
  digits: number;
}) {
  if (!summary) {
    return (
      <div className="min-w-0">
        <p className="text-xs text-fg-faint">{label}</p>
        <p className="font-display mt-0.5 text-sm font-semibold text-fg-faint sm:text-base">—</p>
      </div>
    );
  }

  const tone = summary.status ? STATUS_TONE[summary.status] : 'text-fg';
  return (
    <div className="min-w-0">
      <p className="text-xs text-fg-faint">{label}</p>
      <p className={cn('font-display mt-0.5 whitespace-nowrap text-sm font-semibold tabular-nums sm:text-base', tone)}>
        {summary.min === summary.max
          ? fixed(summary.min, digits)
          : `${fixed(summary.min, digits)}–${fixed(summary.max, digits)}`}
        <span className="ml-0.5 text-xs font-normal text-fg-faint">{unit}</span>
      </p>
      <p className="text-xs tabular-nums text-fg-faint">media {fixed(summary.avg, digits)}</p>
    </div>
  );
}

const METRICS = [
  { key: 'temperature', label: 'Temp.', name: 'temperatura', unit: '°C', digits: 1 },
  { key: 'humidity', label: 'Humedad', name: 'humedad', unit: '%', digits: 0 },
  { key: 'vpd', label: 'VPD', name: 'VPD', unit: 'kPa', digits: 2 },
] as const;

/** "humedad 6,3 h · VPD 0,2 h" de las métricas con tiempo en ese estado. */
function hoursIn(period: AgendaPeriod, status: 'warn' | 'danger'): string | null {
  const parts = METRICS.flatMap((metric) => {
    const hours = period.metrics[metric.key]?.hours?.[status] ?? 0;
    return hours > 0 ? [`${metric.name} ${decimal(hours)} h`] : [];
  });
  return parts.length ? parts.join(' · ') : null;
}

/** Horas fuera de rango y fuera del ideal; sin rangos cargados no dice nada. */
function RangeHours({ period }: { period: AgendaPeriod }) {
  const withRanges = METRICS.some((metric) => period.metrics[metric.key]?.hours);
  if (!withRanges) return null;
  const danger = hoursIn(period, 'danger');
  const warn = hoursIn(period, 'warn');
  return (
    <div className="mt-2 space-y-0.5 text-xs tabular-nums">
      {danger ? <p className="text-danger">Fuera de rango: {danger}</p> : null}
      {warn ? <p className="text-warn">Fuera del ideal: {warn}</p> : null}
      {!danger && !warn ? <p className="text-fg-faint">Todo el período en rango</p> : null}
    </div>
  );
}

interface PeriodSummaryProps {
  period: AgendaPeriod;
  timeZone: string;
  /** Mensaje cuando el período no tiene lecturas (sin sensor o lecturas pausadas). */
  emptyLabel: string;
}

/** Un período del timer de luz: rango de cada métrica, horas fuera de rango y automatizaciones. */
export function PeriodSummary({ period, timeZone, emptyLabel }: PeriodSummaryProps) {
  const Icon = PERIOD_ICON[period.kind];
  const span = `${formatTime(period.start, timeZone)} → ${
    period.ongoing ? `ahora (hasta ${formatTime(period.plannedEnd, timeZone)})` : formatTime(period.end, timeZone)
  }`;

  return (
    <div className="rounded-md border border-edge bg-surface-2/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-fg">
          <Icon className="h-4 w-4 shrink-0 text-fg-muted" />
          <span>{PERIOD_LABEL[period.kind]}</span>
          <span className="text-xs font-normal tabular-nums text-fg-faint">{span}</span>
        </p>
        <span className="text-xs tabular-nums text-fg-faint">{period.readings} lecturas</span>
      </div>

      {period.readings ? (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
            {METRICS.map((metric) => (
              <MetricCell
                key={metric.key}
                label={metric.label}
                summary={period.metrics[metric.key]}
                unit={metric.unit}
                digits={metric.digits}
              />
            ))}
          </div>
          <RangeHours period={period} />
        </>
      ) : (
        <p className="mt-2 text-sm text-fg-faint">{emptyLabel}</p>
      )}

      {period.automations.length ? (
        <ul className="mt-3 space-y-1 border-t border-edge pt-2 text-xs text-fg-muted">
          {period.automations.map((automation) => (
            <li key={automation.automationId} className="flex flex-col sm:flex-row sm:justify-between sm:gap-x-3">
              <span className="min-w-0">{automation.name}</span>
              <span className="tabular-nums text-fg-faint">
                {automation.conditionMinutes !== null
                  ? `condición cumplida ${formatMinutes(automation.conditionMinutes)}`
                  : `${automation.runs} ${automation.runs === 1 ? 'corrida' : 'corridas'}`}
                {automation.skipped ? ` · ${automation.skipped} salteadas` : ''}
                {automation.failed ? <span className="text-danger"> · {automation.failed} fallidas</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
