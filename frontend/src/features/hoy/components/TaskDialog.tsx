'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AgendaPlantRef, AgendaTask, TaskEventType, TaskInput } from '@/types';
import { TASK_EVENT_LABEL } from '../lib/format';

const NO_EVENT = 'NINGUNO';
const EVENT_OPTIONS: TaskEventType[] = ['PODA', 'NOTA', 'CAMBIO_MACETA', 'TRANSPLANTE', 'CAMBIO_FOTOPERIODO'];

interface TaskDialogProps {
  open: boolean;
  /** Tarea a editar; `null` para crear una nueva. */
  task: AgendaTask | null;
  sectionId: string;
  plants: AgendaPlantRef[];
  today: string;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: TaskInput) => void;
}

interface Draft {
  title: string;
  detail: string;
  dueDate: string;
  plantIds: string[];
  eventType: TaskEventType | typeof NO_EVENT;
}

/** Alta y edición de una tarea manual: lo que no sale de un plan. */
export function TaskDialog({ open, task, sectionId, plants, today, saving, onOpenChange, onSave }: TaskDialogProps) {
  // El padre lo monta al abrir: el borrador se arma una vez y el refresco de la agenda no lo pisa.
  const [draft, setDraft] = useState<Draft>(() =>
    task
      ? {
          title: task.title,
          detail: task.detail ?? '',
          dueDate: task.dueDate ?? '',
          plantIds: task.plants.map((plant) => plant.id),
          eventType: (task.eventType as TaskEventType | null) ?? NO_EVENT,
        }
      : { title: '', detail: '', dueDate: today, plantIds: [], eventType: NO_EVENT }
  );

  const togglePlant = (id: string) =>
    setDraft((current) => ({
      ...current,
      plantIds: current.plantIds.includes(id)
        ? current.plantIds.filter((plantId) => plantId !== id)
        : [...current.plantIds, id],
    }));

  const allSelected = plants.length > 0 && draft.plantIds.length === plants.length;
  const valid = draft.title.trim().length > 0;

  const submit = () => {
    if (!valid) return;
    onSave({
      sectionId,
      title: draft.title.trim(),
      detail: draft.detail.trim() || null,
      dueDate: draft.dueDate || null,
      plantIds: draft.plantIds,
      eventType: draft.eventType === NO_EVENT ? null : draft.eventType,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg flex-col gap-0 overflow-hidden p-0"
        aria-describedby={undefined}
      >
        <DialogHeader className="shrink-0 border-b border-edge px-4 py-3 text-left">
          <DialogTitle>{task ? 'Editar tarea' : 'Nueva tarea'}</DialogTitle>
        </DialogHeader>

        <form
          id="tarea-form"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="tarea-titulo" className="text-xs text-fg-muted">
              Qué
            </Label>
            <Input
              id="tarea-titulo"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Topping, comprar sustrato, medir PPFD"
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="tarea-detalle" className="text-xs text-fg-muted">
              Detalle
            </Label>
            <Input
              id="tarea-detalle"
              value={draft.detail}
              onChange={(event) => setDraft((current) => ({ ...current, detail: event.target.value }))}
              maxLength={1000}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="tarea-fecha" className="text-xs text-fg-muted">
              Día
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="tarea-fecha"
                type="date"
                value={draft.dueDate}
                onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))}
                className="w-44"
              />
              {draft.dueDate ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraft((current) => ({ ...current, dueDate: '' }))}
                >
                  Sin fecha
                </Button>
              ) : (
                <span className="text-xs text-fg-faint">sin fecha: queda en Hoy hasta resolverla</span>
              )}
            </div>
          </div>

          {plants.length ? (
            <fieldset className="space-y-2">
              <div className="flex items-center justify-between">
                <legend className="text-xs text-fg-muted">Plantas</legend>
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
                    <Checkbox checked={draft.plantIds.includes(plant.id)} onCheckedChange={() => togglePlant(plant.id)} />
                    {plant.tagCode}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="tarea-evento" className="text-xs text-fg-muted">
              Al marcarla hecha, registrar en la bitácora
            </Label>
            <Select
              value={draft.eventType}
              onValueChange={(value) => setDraft((current) => ({ ...current, eventType: value as Draft['eventType'] }))}
            >
              <SelectTrigger id="tarea-evento" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_EVENT}>Nada</SelectItem>
                {EVENT_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TASK_EVENT_LABEL[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {draft.eventType !== NO_EVENT ? (
              <p className="text-xs text-fg-faint">
                {draft.plantIds.length ? `Un evento por planta (${draft.plantIds.length}).` : 'Un evento en la carpa.'}
              </p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="shrink-0 gap-2 border-t border-edge bg-surface-3 px-4 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="tarea-form" disabled={!valid || saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
