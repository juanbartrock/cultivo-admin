'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LightScheduleDialogProps {
  sectionName: string;
  lightsOn: string | null;
  lightsOff: string | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (lightsOn: string | null, lightsOff: string | null) => void;
}

/** Horario del timer de luz de la carpa. Arma los períodos "Con luz" y "Sin luz" del bloque. */
export function LightScheduleDialog({
  sectionName,
  lightsOn,
  lightsOff,
  saving,
  onOpenChange,
  onSave,
}: LightScheduleDialogProps) {
  const [on, setOn] = useState(lightsOn ?? '');
  const [off, setOff] = useState(lightsOff ?? '');
  const valid = Boolean(on && off && on !== off);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm gap-0 p-0" aria-describedby={undefined}>
        <DialogHeader className="border-b border-edge px-4 py-3 text-left">
          <DialogTitle>Horario de luz · {sectionName}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 px-4 py-4">
          <div className="space-y-1">
            <Label htmlFor="luz-on" className="text-xs text-fg-muted">
              Enciende
            </Label>
            <Input id="luz-on" type="time" value={on} onChange={(event) => setOn(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="luz-off" className="text-xs text-fg-muted">
              Apaga
            </Label>
            <Input id="luz-off" type="time" value={off} onChange={(event) => setOff(event.target.value)} />
          </div>
          {on && off && on === off ? (
            <p className="col-span-2 text-xs text-danger">Encendido y apagado no pueden coincidir</p>
          ) : null}
        </div>
        <DialogFooter className="gap-2 border-t border-edge bg-surface-3 px-4 py-3">
          {lightsOn || lightsOff ? (
            <Button variant="ghost" className="sm:mr-auto" onClick={() => onSave(null, null)} disabled={saving}>
              Quitar horario
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(on, off)} disabled={!valid || saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
