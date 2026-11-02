'use client';

import { Droplets, ListTodo, ShieldCheck } from 'lucide-react';
import { AgendaUpcoming } from '@/types';
import { relativeDay } from '../lib/format';

const SOURCE_ICON = {
  PREVENCION: ShieldCheck,
  ALIMENTACION: Droplets,
  MANUAL: ListTodo,
} as const;

/** Lo que viene en los próximos días: preventivo, cambio de semana y tareas con fecha. */
export function UpcomingList({ items, today }: { items: AgendaUpcoming[]; today: string }) {
  if (!items.length) return <p className="text-sm text-fg-faint">Nada en los próximos 30 días</p>;

  return (
    <ul className="divide-y divide-edge">
      {items.map((item, index) => {
        const Icon = SOURCE_ICON[item.source];
        return (
          <li key={`${item.date}-${item.source}-${index}`} className="flex gap-3 py-2">
            <span className="w-20 shrink-0 pt-0.5 text-xs tabular-nums text-fg-muted">{relativeDay(item.date, today)}</span>
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-fg-faint" />
            <div className="min-w-0">
              <p className="text-sm text-fg">{item.title}</p>
              {item.detail ? <p className="line-clamp-1 text-xs text-fg-faint">{item.detail}</p> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
