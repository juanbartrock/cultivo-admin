'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AgendaTask } from '@/types';
import { TASK_EVENT_LABEL } from '../lib/format';

interface CompleteTaskDialogProps {
  task: AgendaTask | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (note: string) => void;
}

/** Confirmación de una tarea que escribe en la bitácora: dice qué evento y en qué plantas. */
export function CompleteTaskDialog({ task, saving, onOpenChange, onConfirm }: CompleteTaskDialogProps) {
  // El padre lo monta con `key` por tarea: la nota arranca vacía en cada una.
  const [note, setNote] = useState('');

  if (!task) return null;

  const eventLabel = task.eventType ? TASK_EVENT_LABEL[task.eventType] ?? task.eventType : null;
  const pending = task.plants.filter((plant) => !task.donePlants.some((done) => done.id === plant.id));
  const targets = pending.length ? pending : task.plants;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md gap-0 p-0" aria-describedby={undefined}>
        <DialogHeader className="border-b border-edge px-4 py-3 text-left">
          <DialogTitle>Marcar hecha</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-4 py-4">
          <p className="text-sm text-fg">{task.title}</p>
          {eventLabel ? (
            <p className="text-sm text-fg-muted">
              Se registra <span className="text-fg">{eventLabel}</span>{' '}
              {targets.length ? (
                <>
                  en <span className="tabular-nums text-fg">{targets.map((plant) => plant.tagCode).join(' · ')}</span>
                </>
              ) : (
                'en la carpa'
              )}
              .
            </p>
          ) : null}
          <div className="space-y-1">
            <Label htmlFor="tarea-nota" className="text-xs text-fg-muted">
              Nota (opcional)
            </Label>
            <Input
              id="tarea-nota"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Dosis, hora, lo que notaste"
              maxLength={1000}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 border-t border-edge bg-surface-3 px-4 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(note.trim())} disabled={saving}>
            {saving ? 'Guardando…' : 'Hecho'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
