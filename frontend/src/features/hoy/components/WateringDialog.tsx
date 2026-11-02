'use client';

import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AgendaFeeding, AgendaPlantRef, WateringInput } from '@/types';
import { decimal, parseDecimal } from '../lib/format';

interface WateringDialogProps {
  open: boolean;
  sectionId: string;
  plants: AgendaPlantRef[];
  /** Semana de alimentación vigente: precarga nutrientes, pH y EC. */
  feeding: AgendaFeeding | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: WateringInput) => void;
}

interface Draft {
  plantIds: string[];
  liters: string;
  ph: string;
  ec: string;
  nutrients: { name: string; dose: string }[];
  drainPh: string;
  drainEc: string;
  notes: string;
}

const NUMBER_FIELDS = [
  { key: 'liters', label: 'Litros por planta', min: 0, max: 100 },
  { key: 'ph', label: 'pH', min: 0, max: 14 },
  { key: 'ec', label: 'EC', min: 0, max: 10 },
  { key: 'drainPh', label: 'pH drenaje', min: 0, max: 14 },
  { key: 'drainEc', label: 'EC drenaje', min: 0, max: 10 },
] as const;

function initialDraft(plants: AgendaPlantRef[], feeding: AgendaFeeding | null): Draft {
  return {
    plantIds: (feeding?.plants.length ? feeding.plants : plants).map((plant) => plant.id),
    liters: '',
    ph: feeding?.ph ? decimal(feeding.ph, 2) : '',
    ec: feeding?.ec ? decimal(feeding.ec, 2) : '',
    nutrients: (feeding?.products ?? []).map((product) => ({
      name: product.name,
      dose: `${decimal(product.dose, 2)} ${product.unit}`.trim(),
    })),
    drainPh: '',
    drainEc: '',
    notes: '',
  };
}

/** Registro de un riego: un RIEGO por planta, con el drenaje si se midió. */
export function WateringDialog({ open, sectionId, plants, feeding, saving, onOpenChange, onSave }: WateringDialogProps) {
  // El padre lo monta al abrir: el borrador se arma una vez y el refresco de la agenda no lo pisa.
  const [draft, setDraft] = useState<Draft>(() => initialDraft(plants, feeding));

  const errors = useMemo(() => {
    const result: Record<string, string> = {};
    for (const field of NUMBER_FIELDS) {
      const value = parseDecimal(draft[field.key]);
      if (value === undefined) continue;
      if (!Number.isFinite(value) || value < field.min || value > field.max) result[field.key] = 'Número inválido';
    }
    if (!draft.plantIds.length) result.plantIds = 'Elegí al menos una planta';
    return result;
  }, [draft]);

  const valid = Object.keys(errors).length === 0;

  const submit = () => {
    if (!valid) return;
    const number = (raw: string) => parseDecimal(raw);
    onSave({
      sectionId,
      plantIds: draft.plantIds,
      liters: number(draft.liters),
      ph: number(draft.ph),
      ec: number(draft.ec),
      nutrients: draft.nutrients.filter((nutrient) => nutrient.name.trim()).map((nutrient) => ({
        name: nutrient.name.trim(),
        dose: nutrient.dose.trim(),
      })),
      drainPh: number(draft.drainPh),
      drainEc: number(draft.drainEc),
      notes: draft.notes.trim() || undefined,
      taskKey: feeding?.key,
    });
  };

  const setField = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const allSelected = draft.plantIds.length === plants.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg flex-col gap-0 overflow-hidden p-0"
        aria-describedby={undefined}
      >
        <DialogHeader className="shrink-0 border-b border-edge px-4 py-3 text-left">
          <DialogTitle>Registrar riego{feeding ? ` · semana ${feeding.week}` : ''}</DialogTitle>
        </DialogHeader>

        <form
          id="riego-form"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <fieldset className="space-y-2">
            <div className="flex items-center justify-between">
              <legend className="text-xs text-fg-muted">Plantas regadas</legend>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setDraft((current) => ({ ...current, plantIds: allSelected ? [] : plants.map((plant) => plant.id) }))
                }
              >
                {allSelected ? 'Ninguna' : 'Todas'}
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {plants.map((plant) => (
                <label
                  key={plant.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-edge px-3 py-2 text-sm tabular-nums text-fg hover:border-edge-strong"
                >
                  <Checkbox
                    checked={draft.plantIds.includes(plant.id)}
                    onCheckedChange={() =>
                      setDraft((current) => ({
                        ...current,
                        plantIds: current.plantIds.includes(plant.id)
                          ? current.plantIds.filter((id) => id !== plant.id)
                          : [...current.plantIds, plant.id],
                      }))
                    }
                  />
                  {plant.tagCode}
                </label>
              ))}
            </div>
            {errors.plantIds ? <p className="text-xs text-danger">{errors.plantIds}</p> : null}
          </fieldset>

          <div className="grid grid-cols-3 gap-3">
            {NUMBER_FIELDS.slice(0, 3).map((field) => (
              <div key={field.key} className="space-y-1">
                <Label htmlFor={`riego-${field.key}`} className="text-xs text-fg-muted">
                  {field.label}
                </Label>
                <Input
                  id={`riego-${field.key}`}
                  inputMode="decimal"
                  value={draft[field.key]}
                  onChange={(event) => setField(field.key, event.target.value)}
                  aria-invalid={Boolean(errors[field.key]) || undefined}
                  className={errors[field.key] ? 'border-danger' : undefined}
                />
              </div>
            ))}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs text-fg-muted">Nutrientes</legend>
            {draft.nutrients.length ? (
              draft.nutrients.map((nutrient, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    aria-label="Producto"
                    value={nutrient.name}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        nutrients: current.nutrients.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)),
                      }))
                    }
                    className="min-w-0 flex-1"
                  />
                  <Input
                    aria-label="Dosis"
                    value={nutrient.dose}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        nutrients: current.nutrients.map((item, i) => (i === index ? { ...item, dose: event.target.value } : item)),
                      }))
                    }
                    className="w-28"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Quitar ${nutrient.name || 'nutriente'}`}
                    onClick={() =>
                      setDraft((current) => ({ ...current, nutrients: current.nutrients.filter((_, i) => i !== index) }))
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-fg-faint">Agua sola</p>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDraft((current) => ({ ...current, nutrients: [...current.nutrients, { name: '', dose: '' }] }))}
            >
              <Plus className="h-4 w-4" />
              Nutriente
            </Button>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            {NUMBER_FIELDS.slice(3).map((field) => (
              <div key={field.key} className="space-y-1">
                <Label htmlFor={`riego-${field.key}`} className="text-xs text-fg-muted">
                  {field.label}
                </Label>
                <Input
                  id={`riego-${field.key}`}
                  inputMode="decimal"
                  value={draft[field.key]}
                  onChange={(event) => setField(field.key, event.target.value)}
                  aria-invalid={Boolean(errors[field.key]) || undefined}
                  className={errors[field.key] ? 'border-danger' : undefined}
                />
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label htmlFor="riego-notas" className="text-xs text-fg-muted">
              Notas
            </Label>
            <Input
              id="riego-notas"
              value={draft.notes}
              onChange={(event) => setField('notes', event.target.value)}
              placeholder="% de drenaje, cómo pesaban"
              maxLength={1000}
            />
          </div>
        </form>

        <DialogFooter className="shrink-0 gap-2 border-t border-edge bg-surface-3 px-4 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="riego-form" disabled={!valid || saving}>
            {saving ? 'Guardando…' : `Registrar en ${draft.plantIds.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
