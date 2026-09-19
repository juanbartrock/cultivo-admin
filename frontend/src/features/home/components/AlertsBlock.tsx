'use client';

import Link from 'next/link';
import { AlertTriangle, PlugZap, PowerOff, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionAlert } from '../hooks/useHomeDashboard';
import { useTimeAgo } from '../lib/timeAgo';

const SEVERITY = {
  danger: { tone: 'text-danger', border: 'border-danger/30', bg: 'bg-danger/10', icon: AlertTriangle },
  warn: { tone: 'text-warn', border: 'border-warn/30', bg: 'bg-warn/10', icon: AlertTriangle },
  offline: { tone: 'text-offline', border: 'border-edge', bg: 'bg-surface-2', icon: PlugZap },
} as const;

interface AlertsBlockProps {
  alerts: SectionAlert[];
  /** Momento de la última consulta de estados; da la antigüedad del "todo en rango". */
  updatedAt: Date | null;
  /** Todas las carpas con sensor están pausadas: no hay lectura contra la cual estar en rango. */
  readingsPaused?: boolean;
}

export function AlertsBlock({ alerts, updatedAt, readingsPaused = false }: AlertsBlockProps) {
  const updatedAgo = useTimeAgo(updatedAt);

  // Sin lecturas vivas no se afirma nada sobre los rangos: estado neutro, sin el ícono ok.
  if (!alerts.length && readingsPaused) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-edge bg-surface px-4 py-3 text-sm text-offline">
        <PowerOff className="h-4 w-4 shrink-0" />
        <span className="min-w-0">Lecturas desactivadas</span>
      </div>
    );
  }

  if (!alerts.length) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-edge bg-surface px-4 py-3 text-sm text-fg-muted">
        <ShieldCheck className="h-4 w-4 shrink-0 text-ok" />
        <span className="min-w-0">
          Todo en rango
          {updatedAgo ? <span className="text-fg-faint"> · actualizado {updatedAgo}</span> : null}
        </span>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {alerts.map((alert, index) => {
        const config = SEVERITY[alert.severity];
        const Icon = config.icon;

        return (
          <li key={`${alert.sectionId}-${alert.label}-${index}`}>
            <Link
              href={`/sala/carpa/${alert.sectionId}`}
              className={cn(
                'flex items-start gap-3 rounded-md border px-4 py-3 transition-colors hover:border-edge-strong sm:items-center',
                config.border,
                config.bg
              )}
            >
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0 sm:mt-0', config.tone)} />
              <div className="flex min-w-0 flex-1 flex-col gap-x-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0 text-sm text-fg">
                  {alert.sectionName}
                  <span className="text-fg-faint"> · {alert.label}</span>
                </span>
                <span className={cn('text-sm font-medium tabular-nums sm:shrink-0', config.tone)}>
                  {alert.detail}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
