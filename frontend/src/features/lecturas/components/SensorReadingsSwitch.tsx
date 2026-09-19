'use client';

import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useReadingsSettings, useUpdateReadingsSettings } from '../hooks/useReadingsSettings';

interface SensorReadingsSwitchProps {
  className?: string;
}

/**
 * Interruptor general de lecturas de sensores. El mismo dato en `/artefactos` y en la home.
 * Solo ADMIN lo mueve; el resto ve el estado.
 */
export function SensorReadingsSwitch({ className }: SensorReadingsSwitchProps) {
  const { isAdmin } = useAuth();
  const { sensorsEnabled, isLoading } = useReadingsSettings();
  const mutation = useUpdateReadingsSettings();

  const pending = isLoading || mutation.isPending;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border border-edge bg-surface px-3 py-1.5',
        className
      )}
    >
      <label
        htmlFor="lecturas-sensores"
        className="whitespace-nowrap text-xs font-medium text-fg-muted"
      >
        Lecturas de sensores
      </label>
      <span
        className={cn(
          'whitespace-nowrap text-xs tabular-nums',
          sensorsEnabled ? 'text-fg' : 'text-offline'
        )}
      >
        {sensorsEnabled ? 'Activas' : 'Desactivadas'}
      </span>
      {isAdmin ? (
        <Switch
          id="lecturas-sensores"
          checked={sensorsEnabled}
          disabled={pending}
          onCheckedChange={(checked) => mutation.mutate(checked)}
          aria-label="Lecturas de sensores"
        />
      ) : null}
    </div>
  );
}
