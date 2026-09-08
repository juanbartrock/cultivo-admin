'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RANGE_STAGE_LABELS } from '@/features/home/lib/readings';
import { StageRange, StageRangeValues } from '@/types';
import { METRIC_FIELDS, MetricField, valuesOf } from '../lib/metrics';

interface StageRangeDialogProps {
  range: StageRange | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: StageRangeValues) => void;
  saving: boolean;
}

type Draft = Record<keyof StageRangeValues, string>;

function toDraft(range: StageRange): Draft {
  const values = valuesOf(range);
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, String(value)])
  ) as Draft;
}

/** Valida igual que el backend: números finitos, min < max y el amplio conteniendo al ideal. */
function validate(draft: Draft): { errors: Record<string, string>; values: StageRangeValues | null } {
  const errors: Record<string, string> = {};
  const parsed = {} as StageRangeValues;

  for (const metric of METRIC_FIELDS) {
    for (const key of metric.keys) {
      const raw = draft[key].trim().replace(',', '.');
      const value = raw === '' ? NaN : Number(raw);
      if (!Number.isFinite(value)) {
        errors[key] = 'Número inválido';
      }
      parsed[key] = value;
    }

    const [idealMin, idealMax, wideMin, wideMax] = metric.keys.map((key) => parsed[key]);
    if ([idealMin, idealMax, wideMin, wideMax].every(Number.isFinite)) {
      if (idealMin >= idealMax) errors[metric.key] = 'El mínimo ideal tiene que ser menor que el máximo';
      else if (wideMin >= wideMax) errors[metric.key] = 'El mínimo amplio tiene que ser menor que el máximo';
      else if (wideMin > idealMin || wideMax < idealMax)
        errors[metric.key] = 'El rango amplio tiene que contener al ideal';
    }
  }

  return { errors, values: Object.keys(errors).length ? null : parsed };
}

function MetricFields({
  metric,
  draft,
  errors,
  onChange,
}: {
  metric: MetricField;
  draft: Draft;
  errors: Record<string, string>;
  onChange: (key: keyof StageRangeValues, value: string) => void;
}) {
  const [idealMin, idealMax, wideMin, wideMax] = metric.keys;
  const labels: [keyof StageRangeValues, string][] = [
    [idealMin, 'Ideal mín.'],
    [idealMax, 'Ideal máx.'],
    [wideMin, 'Amplio mín.'],
    [wideMax, 'Amplio máx.'],
  ];

  return (
    <fieldset className="rounded-md border border-edge p-3">
      <legend className="px-1 text-sm font-medium text-fg">
        {metric.label} <span className="text-fg-faint">({metric.unit})</span>
      </legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {labels.map(([key, label]) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={key} className="text-xs text-fg-muted">
              {label}
            </Label>
            <Input
              id={key}
              name={key}
              inputMode="decimal"
              value={draft[key]}
              onChange={(event) => onChange(key, event.target.value)}
              aria-invalid={Boolean(errors[key]) || undefined}
              aria-describedby={errors[key] ? `${key}-error` : undefined}
              className={errors[key] ? 'border-danger' : undefined}
            />
            {errors[key] ? (
              <p id={`${key}-error`} role="alert" className="text-xs text-danger">
                {errors[key]}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      {errors[metric.key] ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {errors[metric.key]}
        </p>
      ) : null}
    </fieldset>
  );
}

export function StageRangeDialog({ range, open, onOpenChange, onSave, saving }: StageRangeDialogProps) {
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    setDraft(range ? toDraft(range) : null);
  }, [range, open]);

  const { errors, values } = useMemo(
    () => (draft ? validate(draft) : { errors: {}, values: null }),
    [draft]
  );

  if (!range || !draft) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Alto acotado y cuerpo con scroll propio: en móvil Guardar y Cancelar quedan siempre
          a la vista, sin tener que recorrer los 16 campos. */}
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-edge px-4 py-3 text-left sm:px-6">
          <DialogTitle>Rangos · {RANGE_STAGE_LABELS[range.stage]}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
          {METRIC_FIELDS.map((metric) => (
            <MetricFields
              key={metric.key}
              metric={metric}
              draft={draft}
              errors={errors}
              onChange={(key, value) => setDraft((current) => (current ? { ...current, [key]: value } : current))}
            />
          ))}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-edge bg-surface-3 px-4 py-3 sm:px-6">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => values && onSave(values)} disabled={!values || saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
