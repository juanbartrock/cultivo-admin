import type { Device, DeviceStatus, ManualHoldState } from '@/types';

/** `holdUntil` de una retención vigente; vencida o inactiva, `null`. */
export function activeHoldUntil(
  hold: ManualHoldState | null | undefined,
  now = Date.now()
): string | null {
  if (!hold?.active || !hold.holdUntil) return null;
  return Date.parse(hold.holdUntil) > now ? hold.holdUntil : null;
}

/**
 * Retención guardada en `metadata.manualHold` del relé físico: el controlador si el dispositivo
 * es VIRTUAL. Sirve cuando no hay status (lecturas pausadas o pantallas sin polling).
 */
export function metadataHoldUntil(device: Device, now = Date.now()): string | null {
  const physical =
    device.connector === 'VIRTUAL' && device.controlledBy ? device.controlledBy : device;
  const raw = physical.metadata?.manualHold as { holdUntil?: unknown } | undefined;
  const until = typeof raw?.holdUntil === 'string' ? raw.holdUntil : null;
  return until && Date.parse(until) > now ? until : null;
}

/** La del status si el backend la informó; si no, la de metadata. */
export function knownHoldUntil(device: Device, status?: DeviceStatus | null): string | null {
  if (status && status.manualHold !== undefined) return activeHoldUntil(status.manualHold);
  return metadataHoldUntil(device);
}

/** `42:13` o `1:00:00`. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Aviso después de prender o apagar a mano: `flora-extractor encendido · retenido 60 min`. */
export function controlToastMessage(
  name: string,
  action: 'on' | 'off',
  hold?: ManualHoldState
): string {
  const verb = action === 'on' ? 'encendido' : 'apagado';
  return hold?.active
    ? `${name} ${verb} · retenido ${hold.remainingMinutes} min`
    : `${name} ${verb}`;
}
