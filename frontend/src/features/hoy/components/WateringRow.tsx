'use client';

import { CheckCircle2, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AgendaFeeding, AgendaLastWatering } from '@/types';
import { decimal, formatTime, formatWhen, productsLabel } from '../lib/format';

interface WateringRowProps {
  feeding: AgendaFeeding | null;
  lastWatering: AgendaLastWatering | null;
  plantsTotal: number;
  today: string;
  timeZone: string;
  onWater: () => void;
}

/** Alimento de la semana, último riego y el botón para registrar el de hoy. */
export function WateringRow({ feeding, lastWatering, plantsTotal, today, timeZone, onWater }: WateringRowProps) {
  const wateredToday = feeding?.wateredToday;
  const plan = feeding
    ? [
        productsLabel(feeding.products) || 'Agua sola',
        feeding.ph ? `pH ${decimal(feeding.ph, 2)}` : null,
        feeding.ec ? `EC ${decimal(feeding.ec, 2)}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  const last = lastWatering
    ? [
        formatWhen(lastWatering.at, today, timeZone),
        `${lastWatering.plants.length} ${lastWatering.plants.length === 1 ? 'planta' : 'plantas'}`,
        lastWatering.nutrients.length
          ? lastWatering.nutrients.map((nutrient) => [nutrient.name, nutrient.dose].filter(Boolean).join(' ')).join(' · ')
          : 'agua sola',
        lastWatering.ph !== null ? `pH ${decimal(lastWatering.ph, 2)}` : null,
        lastWatering.liters !== null ? `${decimal(lastWatering.liters, 2)} L` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <div className="rounded-md border border-edge p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="flex items-center gap-1.5 text-sm font-medium text-fg">
            <Droplets className="h-4 w-4 shrink-0 text-info" />
            Riego{feeding ? ` · semana ${feeding.week}` : ''}
          </p>
          {plan ? <p className="text-sm text-fg-muted">{plan}</p> : null}
          <p className="text-xs text-fg-faint">{last ? `Último: ${last}` : 'Sin riegos registrados'}</p>
          {wateredToday?.plants.length && wateredToday.lastAt ? (
            <p className="flex items-center gap-1 text-xs text-ok">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Regado hoy {formatTime(wateredToday.lastAt, timeZone)} · {wateredToday.plants.length}/
              {feeding?.plants.length ?? plantsTotal}
            </p>
          ) : null}
        </div>
        <Button variant="secondary" size="sm" className="shrink-0" onClick={onWater}>
          Regué
        </Button>
      </div>
      {feeding?.notes ? <p className="mt-2 line-clamp-2 text-xs text-fg-faint">{feeding.notes}</p> : null}
    </div>
  );
}
