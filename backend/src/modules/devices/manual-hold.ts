/**
 * Retención manual: un control hecho desde la app deja al dispositivo físico fuera del alcance
 * de automatizaciones y jobs durante un rato. Se guarda en `devices.metadata.manualHold`, sin
 * columna propia, y se lee de forma perezosa: una retención vencida es lo mismo que ninguna.
 */

/** Clave de `devices.metadata` donde vive la retención. */
export const MANUAL_HOLD_KEY = 'manualHold';
/** Clave de `devices.metadata` que fija la duración de la retención para ese dispositivo. */
export const MANUAL_HOLD_MINUTES_KEY = 'manualHoldMinutes';
/** Duración cuando ni el dispositivo ni `MANUAL_HOLD_MINUTES` dicen otra cosa. */
export const DEFAULT_MANUAL_HOLD_MINUTES = 60;

export interface ManualHold {
  holdUntil: string;
  setAt: string;
  action: 'on' | 'off';
  minutes: number;
}

/** Lo que devuelve la API: activa o no, con los minutos que faltan. */
export interface ManualHoldState {
  /** Dispositivo físico que guarda la retención (el controlador, si se pidió por un VIRTUAL). */
  deviceId: string;
  active: boolean;
  holdUntil: string | null;
  remainingMinutes: number;
  action: 'on' | 'off' | null;
  setAt: string | null;
  /** Minutos que dura la próxima retención manual de este dispositivo. */
  holdMinutes: number;
}

type Metadata = Record<string, unknown>;

function asObject(metadata: unknown): Metadata {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Metadata)
    : {};
}

function asMinutes(value: unknown): number | null {
  const minutes = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof minutes === 'number' && Number.isInteger(minutes) && minutes >= 0 ? minutes : null;
}

/**
 * Minutos de retención: primero el dispositivo (`metadata.manualHoldMinutes`, `0` la desactiva),
 * después `MANUAL_HOLD_MINUTES` del entorno y por último el default.
 */
export function holdMinutesFor(metadatas: unknown[], envValue = process.env.MANUAL_HOLD_MINUTES): number {
  for (const metadata of metadatas) {
    const minutes = asMinutes(asObject(metadata)[MANUAL_HOLD_MINUTES_KEY]);
    if (minutes !== null) return minutes;
  }
  return asMinutes(envValue) ?? DEFAULT_MANUAL_HOLD_MINUTES;
}

/** La retención guardada si sigue vigente a `now`; vencida o mal formada, `null`. */
export function readHold(metadata: unknown, now = new Date()): ManualHold | null {
  const raw = asObject(metadata)[MANUAL_HOLD_KEY];
  if (!raw || typeof raw !== 'object') return null;
  const hold = raw as Partial<ManualHold>;
  const until = typeof hold.holdUntil === 'string' ? new Date(hold.holdUntil) : null;
  if (!until || Number.isNaN(until.getTime()) || until.getTime() <= now.getTime()) return null;
  return {
    holdUntil: until.toISOString(),
    setAt: typeof hold.setAt === 'string' ? hold.setAt : until.toISOString(),
    action: hold.action === 'off' ? 'off' : 'on',
    minutes: typeof hold.minutes === 'number' ? hold.minutes : 0,
  };
}

export function holdState(
  deviceId: string,
  metadata: unknown,
  holdMinutes: number,
  now = new Date(),
): ManualHoldState {
  const hold = readHold(metadata, now);
  return {
    deviceId,
    active: hold !== null,
    holdUntil: hold?.holdUntil ?? null,
    remainingMinutes: hold
      ? Math.ceil((new Date(hold.holdUntil).getTime() - now.getTime()) / 60_000)
      : 0,
    action: hold?.action ?? null,
    setAt: hold?.setAt ?? null,
    holdMinutes,
  };
}

export function buildHold(action: 'on' | 'off', minutes: number, now = new Date()): ManualHold {
  return {
    holdUntil: new Date(now.getTime() + minutes * 60_000).toISOString(),
    setAt: now.toISOString(),
    action,
    minutes,
  };
}

export function withHold(metadata: unknown, hold: ManualHold): Metadata {
  return { ...asObject(metadata), [MANUAL_HOLD_KEY]: hold };
}

export function withoutHold(metadata: unknown): Metadata {
  const { [MANUAL_HOLD_KEY]: _removed, ...rest } = asObject(metadata);
  return rest;
}

/**
 * Un `PUT /devices/:id` con `metadata` reemplaza el objeto entero: sin esto, editar el
 * dispositivo durante una retención la borraba sin que nadie la liberara.
 */
export function preserveHold(existing: unknown, incoming: unknown): unknown {
  const current = asObject(existing)[MANUAL_HOLD_KEY];
  if (current === undefined) return incoming;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return incoming;
  if (MANUAL_HOLD_KEY in (incoming as Metadata)) return incoming;
  return { ...(incoming as Metadata), [MANUAL_HOLD_KEY]: current };
}

/** Texto del motivo de salto, para logs, ejecuciones y jobs. */
export function holdReason(state: ManualHoldState): string {
  const until = state.holdUntil
    ? new Date(state.holdUntil).toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: process.env.TZ || 'America/Argentina/Buenos_Aires',
      })
    : '';
  return `Retención manual hasta ${until} (quedan ${state.remainingMinutes} min)`;
}
