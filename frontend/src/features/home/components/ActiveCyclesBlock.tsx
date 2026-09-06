'use client';

import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { formatEventDate, getEventTypeInfo } from '@/services/eventService';
import { CycleWithCount, GrowEvent } from '@/types';
import { daysSince } from '../lib/readings';

interface ActiveCyclesBlockProps {
  cycles: CycleWithCount[];
  lastEventByCycle: Map<string, GrowEvent>;
}

export function ActiveCyclesBlock({ cycles, lastEventByCycle }: ActiveCyclesBlockProps) {
  if (!cycles.length) {
    return <EmptyState icon={ClipboardList} title="Sin ciclos activos" />;
  }

  return (
    <ul className="space-y-2">
      {cycles.map((cycle) => {
        const lastEvent = lastEventByCycle.get(cycle.id);

        return (
          <li key={cycle.id}>
            <Link
              href="/seguimientos"
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-edge bg-surface px-4 py-3 transition-colors hover:border-edge-strong hover:bg-surface-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-fg">{cycle.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-fg-muted">
                {daysSince(cycle.startDate)} días
              </span>
              <span className="shrink-0 text-xs tabular-nums text-fg-muted">
                {cycle._count.plants} plantas
              </span>
              <span className="w-full truncate text-xs text-fg-faint sm:w-auto sm:shrink-0">
                {lastEvent
                  ? `${getEventTypeInfo(lastEvent.type).label} · ${formatEventDate(lastEvent.createdAt)}`
                  : 'Sin eventos'}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
