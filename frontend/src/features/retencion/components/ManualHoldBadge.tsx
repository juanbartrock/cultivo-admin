'use client';

import { Hand, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ManualHoldControl } from '../hooks/useManualHold';
import { formatClock, formatCountdown } from '../lib/manualHold';

interface ManualHoldBadgeProps {
  hold: ManualHoldControl;
  /** Una línea corta para filas de tabla. */
  compact?: boolean;
  className?: string;
}

/** Retención manual vigente: cuenta regresiva y botón para devolverle el mando a las automatizaciones. */
export function ManualHoldBadge({ hold, compact = false, className }: ManualHoldBadgeProps) {
  if (!hold.active || !hold.holdUntil) return null;
  const until = formatClock(hold.holdUntil);

  return (
    <div
      data-testid="manual-hold"
      className={cn(
        'flex items-center justify-between gap-2 rounded-md border border-info/30 bg-info/10 text-info',
        compact ? 'max-w-full gap-1 px-1.5 py-0.5' : 'px-3 py-2',
        className
      )}
    >
      <span
        className="flex min-w-0 items-center gap-1.5 text-xs"
        title={`Retención manual: automatizaciones y jobs en pausa hasta ${until}`}
      >
        <Hand className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {compact ? <span className="sr-only">Retención manual</span> : <span>Retención manual</span>}
        <span className="font-mono tabular-nums" aria-label={`hasta ${until}`}>
          {formatCountdown(hold.remainingMs)}
        </span>
      </span>
      <button
        type="button"
        onClick={hold.release}
        disabled={hold.releasing}
        className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-fg hover:bg-info/20 disabled:opacity-50"
      >
        {hold.releasing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Liberando" /> : 'Liberar'}
      </button>
    </div>
  );
}
