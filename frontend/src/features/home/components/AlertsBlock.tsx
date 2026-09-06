'use client';

import Link from 'next/link';
import { AlertTriangle, PlugZap, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionAlert } from '../hooks/useHomeDashboard';

const SEVERITY = {
  danger: { tone: 'text-danger', border: 'border-danger/30', bg: 'bg-danger/10', icon: AlertTriangle },
  warn: { tone: 'text-warn', border: 'border-warn/30', bg: 'bg-warn/10', icon: AlertTriangle },
  offline: { tone: 'text-offline', border: 'border-edge', bg: 'bg-surface-2', icon: PlugZap },
} as const;

interface AlertsBlockProps {
  alerts: SectionAlert[];
}

export function AlertsBlock({ alerts }: AlertsBlockProps) {
  if (!alerts.length) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-edge bg-surface px-4 py-3 text-sm text-fg-muted">
        <ShieldCheck className="h-4 w-4 text-ok" />
        Todo en rango
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
                'flex items-center gap-3 rounded-md border px-4 py-3 transition-colors hover:border-edge-strong',
                config.border,
                config.bg
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', config.tone)} />
              <span className="min-w-0 flex-1 truncate text-sm text-fg">
                {alert.sectionName}
                <span className="text-fg-faint"> · {alert.label}</span>
              </span>
              <span className={cn('shrink-0 text-sm font-medium tabular-nums', config.tone)}>
                {alert.detail}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
