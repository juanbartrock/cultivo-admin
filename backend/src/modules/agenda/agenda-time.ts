/**
 * Fechas y horas locales del bloque "Hoy". El cultivo vive en una zona horaria (`CULTIVO_TZ`,
 * por defecto Buenos Aires) y el servidor corre en UTC: el día, el horario de luz y las fechas
 * de las tareas se calculan en la zona del cultivo.
 */

export const DEFAULT_TIME_ZONE = 'America/Argentina/Buenos_Aires';

const DAY_MS = 24 * 60 * 60 * 1000;
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isHHMM(value: unknown): value is string {
  return typeof value === 'string' && HHMM.test(value);
}

/** Minutos de diferencia entre la hora local de `timeZone` y UTC en un instante dado. */
export function tzOffsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  }).formatToParts(at);
  const name = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

/** Día local (`YYYY-MM-DD`) de un instante. */
export function localDateKey(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/** Suma días a un día local `YYYY-MM-DD`. */
export function addDays(dateKey: string, days: number): string {
  const base = Date.parse(`${dateKey}T00:00:00Z`);
  return new Date(base + days * DAY_MS).toISOString().slice(0, 10);
}

/** Instante UTC de un día local a una hora local `HH:MM`. */
export function zonedInstant(dateKey: string, hhmm: string, timeZone: string): Date {
  const naive = Date.parse(`${dateKey}T${hhmm}:00Z`);
  // Primera aproximación con el offset del instante "naive" y ajuste con el del resultado,
  // por si el día cruza un cambio de horario.
  let instant = naive - tzOffsetMinutes(new Date(naive), timeZone) * 60_000;
  instant = naive - tzOffsetMinutes(new Date(instant), timeZone) * 60_000;
  return new Date(instant);
}

/** Inicio del día local `dateKey` como instante. */
export function startOfLocalDay(dateKey: string, timeZone: string): Date {
  return zonedInstant(dateKey, '00:00', timeZone);
}

/** `Date` de una columna `@db.Date` (medianoche UTC) a `YYYY-MM-DD`. */
export function dbDateKey(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/** `YYYY-MM-DD` a la `Date` que Prisma guarda en una columna `@db.Date`. */
export function dateKeyToDb(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00Z`);
}

/**
 * Día de calendario de una fecha de inicio de plan o de ciclo. El frontend las guarda como día
 * (`2026-10-24` → medianoche UTC): esas se leen por su fecha UTC, porque pasadas a hora local
 * caerían el día anterior a las 21:00. Una fecha con hora se lee en la zona del cultivo.
 */
export function calendarDateKey(value: Date, timeZone: string): string {
  const isUtcMidnight =
    value.getUTCHours() === 0 && value.getUTCMinutes() === 0 && value.getUTCSeconds() === 0 && value.getUTCMilliseconds() === 0;
  return isUtcMidnight ? value.toISOString().slice(0, 10) : localDateKey(value, timeZone);
}

/** Días locales completos entre dos días `YYYY-MM-DD` (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}
