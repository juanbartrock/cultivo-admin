'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { PageHeader } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { RANGE_STAGE_LABELS } from '@/features/home/lib/readings';
import { StageRange, StageRangeValues } from '@/types';
import { StageRangeDialog } from '../components/StageRangeDialog';
import { useStageRanges, useUpdateStageRange } from '../hooks/useStageRanges';
import { METRIC_FIELDS } from '../lib/metrics';

function MetricCell({ range, metricIndex }: { range: StageRange; metricIndex: number }) {
  const metric = METRIC_FIELDS[metricIndex];
  const [idealMin, idealMax, wideMin, wideMax] = metric.keys.map((key) => range[key]);

  return (
    <div className="tabular-nums">
      <p className="text-fg">
        {idealMin}–{idealMax}
      </p>
      <p className="text-xs text-fg-faint">
        {wideMin}–{wideMax}
      </p>
    </div>
  );
}

export default function RangosPage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { ranges, query } = useStageRanges();
  const updateMutation = useUpdateStageRange();

  const [editing, setEditing] = useState<StageRange | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.push('/');
  }, [authLoading, isAdmin, router]);

  const handleSave = (values: StageRangeValues) => {
    if (!editing) return;
    updateMutation.mutate(
      { stage: editing.stage, values },
      {
        onSuccess: () => {
          toast.success(`Rangos de ${RANGE_STAGE_LABELS[editing.stage]} guardados`);
          setEditing(null);
        },
        onError: (error: unknown) => {
          toast.error(error instanceof Error ? error.message : 'No se pudieron guardar los rangos');
        },
      }
    );
  };

  if (authLoading || !isAdmin) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rangos de sensores"
        subtitle="Dentro del ideal: en rango · entre ideal y amplio: al límite · fuera: fuera de rango"
      />

      {query.isError ? (
        <div className="rounded-md border border-warn/30 bg-warn/10 p-4 text-sm text-warn">
          Sin respuesta del servicio de rangos.{' '}
          <button className="underline" onClick={() => void query.refetch()}>
            Reintentar
          </button>
        </div>
      ) : query.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          {/* Desktop: una fila por etapa */}
          <div className="hidden rounded-md border border-edge bg-surface md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-edge">
                  <TableHead className="text-fg-muted">Etapa</TableHead>
                  {METRIC_FIELDS.map((metric) => (
                    <TableHead key={metric.key} className="text-fg-muted">
                      {metric.label} <span className="text-fg-faint">({metric.unit})</span>
                    </TableHead>
                  ))}
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranges.map((range) => (
                  <TableRow key={range.id} className="border-edge">
                    <TableCell className="font-medium text-fg">
                      {RANGE_STAGE_LABELS[range.stage]}
                    </TableCell>
                    {METRIC_FIELDS.map((metric, index) => (
                      <TableCell key={metric.key}>
                        <MetricCell range={range} metricIndex={index} />
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditing(range)}
                        aria-label={`Editar rangos de ${RANGE_STAGE_LABELS[range.stage]}`}
                      >
                        <Pencil />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Móvil: una tarjeta por etapa, sin scroll horizontal */}
          <div className="space-y-3 md:hidden">
            {ranges.map((range) => (
              <div key={range.id} className="rounded-md border border-edge bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-fg">{RANGE_STAGE_LABELS[range.stage]}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditing(range)}
                    aria-label={`Editar rangos de ${RANGE_STAGE_LABELS[range.stage]}`}
                  >
                    <Pencil />
                    Editar
                  </Button>
                </div>
                <dl className="mt-3 space-y-2">
                  {METRIC_FIELDS.map((metric, index) => (
                    <div key={metric.key} className="flex items-baseline justify-between gap-3">
                      <dt className="text-xs text-fg-muted">
                        {metric.label} <span className="text-fg-faint">({metric.unit})</span>
                      </dt>
                      <dd className="text-right text-sm">
                        <MetricCell range={range} metricIndex={index} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </>
      )}

      <StageRangeDialog
        range={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSave={handleSave}
        saving={updateMutation.isPending}
      />
    </div>
  );
}
