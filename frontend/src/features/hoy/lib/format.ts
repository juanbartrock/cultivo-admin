import { AgendaPeriodKind, AgendaProduct, EventType } from '@/types';

/** Número con coma decimal y sin ceros de más: 26.40 → "26,4". */
export function decimal(value: number | string | null | undefined, digits = 1): string {
  if (value === null || value === undefined || value === '') return '—';
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return String(value).replace('.', ',');
  return String(Number(number.toFixed(digits))).replace('.', ',');
}

/** "18:00" en la zona del cultivo. */
export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es-AR', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(
    new Date(iso)
  );
}

/** "jue 05/11" de un día `YYYY-MM-DD`. */
export function formatDay(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', weekday: 'short' })
    .format(date)
    .replace('.', '');
  const [, month, day] = dateKey.split('-');
  return `${weekday} ${day}/${month}`;
}

/** Día local `YYYY-MM-DD` de un instante. */
export function dateKeyOf(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(iso)
  );
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** "hoy", "mañana", "ayer" o "jue 05/11". */
export function relativeDay(dateKey: string, today: string): string {
  const diff = daysBetween(today, dateKey);
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'mañana';
  if (diff === -1) return 'ayer';
  return formatDay(dateKey);
}

/** "hoy 08:20", "ayer 08:20" o "sáb 31/10 08:20". */
export function formatWhen(iso: string, today: string, timeZone: string): string {
  return `${relativeDay(dateKeyOf(iso, timeZone), today)} ${formatTime(iso, timeZone)}`;
}

/** "14 h 9 min", "45 min". */
export function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export const PERIOD_LABEL: Record<AgendaPeriodKind, string> = {
  LUZ: 'Con luz',
  OSCURIDAD: 'Sin luz',
  VENTANA: 'Últimas 12 h',
};

/** "Powder Feeding Grow 0,5 g/L · Calcium 0,1 g/L" */
export function productsLabel(products: AgendaProduct[]): string {
  return products.map((product) => `${product.name} ${decimal(product.dose, 2)} ${product.unit}`.trim()).join(' · ');
}

/** Lo que queda escrito en la bitácora al completar una tarea. */
export const TASK_EVENT_LABEL: Partial<Record<EventType, string>> = {
  PODA: 'Poda',
  NOTA: 'Nota',
  CAMBIO_MACETA: 'Cambio de maceta',
  TRANSPLANTE: 'Transplante',
  CAMBIO_FOTOPERIODO: 'Cambio de fotoperiodo',
};

/** Texto con coma o punto a número; vacío = `undefined`, inválido = `NaN`. */
export function parseDecimal(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return Number(trimmed.replace(',', '.'));
}
