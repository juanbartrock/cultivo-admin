/**
 * Seguidores: un dispositivo con `metadata.followsDeviceId` copia cada on/off que el backend le
 * manda a otro (el intractor de Floración sigue al extractor). Vale para todo control que pase
 * por `DevicesService.controlDevice`: automatizaciones, jobs y la app. Lo que se mueva desde la
 * app de Tuya o el botón del enchufe no pasa por el backend y no se copia.
 */

/** Clave de `devices.metadata` con el id del dispositivo al que sigue. */
export const FOLLOWS_KEY = 'followsDeviceId';

/**
 * Las automatizaciones de condición repiten el mismo comando cada minuto mientras se cumplen.
 * Al seguidor se le reenvía el mismo estado como mucho cada este intervalo, que alcanza para
 * corregirlo si alguien lo movió a mano, sin duplicar las llamadas a la nube del conector.
 */
export const FOLLOW_RESYNC_MS = 10 * 60_000;

export interface MirrorRecord {
  action: 'on' | 'off';
  at: number;
}

/** Lo que devuelve el control del líder por cada seguidor. */
export interface FollowerResult {
  id: string;
  name: string;
  action: 'on' | 'off';
  /** `sent`: comando aceptado · `recent`: mismo estado reenviado hace menos de 10 min · `held`: retención manual propia · `failed`: el conector no lo aceptó. */
  outcome: 'sent' | 'recent' | 'held' | 'failed';
  message?: string;
}

type Metadata = Record<string, unknown>;

function asObject(metadata: unknown): Metadata {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Metadata)
    : {};
}

/** Id del dispositivo al que sigue, o `null`. */
export function readFollows(metadata: unknown): string | null {
  const value = asObject(metadata)[FOLLOWS_KEY];
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/** Reenviar si cambió el estado, si nunca se mandó o si pasó el intervalo de resincronización. */
export function shouldMirror(last: MirrorRecord | undefined, action: 'on' | 'off', now: number): boolean {
  return !last || last.action !== action || now - last.at >= FOLLOW_RESYNC_MS;
}

/**
 * Igual que la retención: un `PUT /devices/:id` con `metadata` reemplaza el objeto entero, así
 * que si el pedido no nombra la clave se conserva la que había. Para dejar de seguir se manda
 * `followsDeviceId: null`.
 */
export function preserveFollows(existing: unknown, incoming: unknown): unknown {
  const current = asObject(existing)[FOLLOWS_KEY];
  if (current === undefined) return incoming;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return incoming;
  if (FOLLOWS_KEY in (incoming as Metadata)) return incoming;
  return { ...(incoming as Metadata), [FOLLOWS_KEY]: current };
}
