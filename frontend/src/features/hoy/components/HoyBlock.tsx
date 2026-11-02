'use client';

import { CalendarCheck } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { BlockError } from '@/features/home/components/BlockError';
import { HomeSection } from '@/features/home/components/HomeSection';
import { useAgendaHoy } from '../hooks/useAgendaHoy';
import { formatDay } from '../lib/format';
import { HoyCard } from './HoyCard';

/** Primer bloque de Inicio: una tarjeta "Hoy" por carpa con ciclo activo. */
export function HoyBlock() {
  const query = useAgendaHoy();
  const data = query.data;

  return (
    <HomeSection title="Hoy" meta={data ? <span className="tabular-nums">{formatDay(data.date)}</span> : null}>
      {query.isError ? (
        <BlockError message="Sin respuesta de la agenda." onRetry={() => void query.refetch()} />
      ) : query.isLoading || !data ? (
        <Skeleton className="h-80 w-full" />
      ) : data.sections.length ? (
        <div className="space-y-4">
          {data.sections.map((entry) => (
            <HoyCard key={entry.section.id} entry={entry} today={data.date} timeZone={data.timeZone} />
          ))}
        </div>
      ) : (
        <EmptyState icon={CalendarCheck} title="Sin ciclos activos" />
      )}
    </HomeSection>
  );
}
