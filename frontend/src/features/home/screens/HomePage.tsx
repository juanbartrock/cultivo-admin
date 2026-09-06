'use client';

import { RefreshCw, Tent } from 'lucide-react';
import { PageHeader } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ActiveCyclesBlock } from '../components/ActiveCyclesBlock';
import { AlertsBlock } from '../components/AlertsBlock';
import { BlockError } from '../components/BlockError';
import { CarpaStatusCard } from '../components/CarpaStatusCard';
import { DeviceIssuesBlock } from '../components/DeviceIssuesBlock';
import { HomeSection } from '../components/HomeSection';
import { OutdoorWeatherBlock } from '../components/OutdoorWeatherBlock';
import { useHomeDashboard } from '../hooks/useHomeDashboard';

export default function HomePage() {
  const {
    summaries,
    alerts,
    deviceIssues,
    cycles,
    lastEventByCycle,
    statusLoading,
    refreshStatuses,
    sectionsQuery,
    cyclesQuery,
  } = useHomeDashboard();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inicio"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void sectionsQuery.refetch();
              void cyclesQuery.refetch();
              void refreshStatuses();
            }}
          >
            <RefreshCw className={statusLoading ? 'animate-spin' : undefined} />
            Actualizar
          </Button>
        }
      />

      <HomeSection title="Alertas">
        {sectionsQuery.isError ? (
          <BlockError
            message="Sin respuesta del servicio de carpas."
            onRetry={() => void sectionsQuery.refetch()}
          />
        ) : sectionsQuery.isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <AlertsBlock alerts={alerts} />
        )}
      </HomeSection>

      <HomeSection title="Carpas">
        {sectionsQuery.isError ? (
          <BlockError
            message="Sin respuesta del servicio de carpas."
            onRetry={() => void sectionsQuery.refetch()}
          />
        ) : sectionsQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-44 w-full" />
            ))}
          </div>
        ) : summaries.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {summaries.map((summary) => (
              <CarpaStatusCard key={summary.section.id} summary={summary} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Tent} title="Sin carpas cargadas" />
        )}
      </HomeSection>

      <HomeSection title="Ciclos activos">
        {cyclesQuery.isError ? (
          <BlockError
            message="Sin respuesta del servicio de ciclos."
            onRetry={() => void cyclesQuery.refetch()}
          />
        ) : cyclesQuery.isLoading ? (
          <Skeleton className="h-14 w-full" />
        ) : (
          <ActiveCyclesBlock cycles={cycles} lastEventByCycle={lastEventByCycle} />
        )}
      </HomeSection>

      {deviceIssues.length ? (
        <HomeSection title="Dispositivos con problema">
          <DeviceIssuesBlock issues={deviceIssues} />
        </HomeSection>
      ) : null}

      <HomeSection title="Clima exterior">
        <OutdoorWeatherBlock />
      </HomeSection>
    </div>
  );
}
