/**
 * Cálculos puros del bloque "Hoy": períodos de luz, resumen de lecturas contra los rangos de la
 * etapa, actividad de automatizaciones y tareas que salen de los planes. Sin Prisma ni Nest, para
 * poder testearlos con datos fijos.
 */
import { StageRange, TriggerType } from '@prisma/client';
import { addDays, calendarDateKey, daysBetween, isHHMM, localDateKey, zonedInstant } from './agenda-time';

// ============================================
// RANGOS
// ============================================

export type ReadingStatus = 'ok' | 'warn' | 'danger';
export type RangeMetric = 'temperature' | 'humidity' | 'vpd';

const RANGE_PREFIX: Record<RangeMetric, 'temp' | 'humidity' | 'vpd'> = {
  temperature: 'temp',
  humidity: 'humidity',
  vpd: 'vpd',
};

/** Mismo criterio que `readingStatus` del frontend: ideal = ok, amplio = warn, fuera = danger. */
export function readingStatus(metric: RangeMetric, value: number, range: StageRange): ReadingStatus {
  const prefix = RANGE_PREFIX[metric];
  const idealMin = range[`${prefix}IdealMin`];
  const idealMax = range[`${prefix}IdealMax`];
  const wideMin = range[`${prefix}WideMin`];
  const wideMax = range[`${prefix}WideMax`];
  if (value >= idealMin && value <= idealMax) return 'ok';
  if (value >= wideMin && value <= wideMax) return 'warn';
  return 'danger';
}

/** Déficit de presión de vapor en kPa (Tetens), igual que el frontend. */
export function vpdOf(temperature: number, humidity: number): number {
  const svp = 0.6108 * Math.exp((17.27 * temperature) / (temperature + 237.3));
  return Math.round(svp * (1 - humidity / 100) * 100) / 100;
}

// ============================================
// PERÍODOS DE LUZ
// ============================================

export type PeriodKind = 'LUZ' | 'OSCURIDAD' | 'VENTANA';

export interface Period {
  kind: PeriodKind;
  start: Date;
  /** Fin efectivo: `now` si el período sigue en curso. */
  end: Date;
  /** Fin según el horario, aunque todavía no llegó. */
  plannedEnd: Date;
  ongoing: boolean;
}

/**
 * El período en curso y el anterior según el timer de la carpa (el primero es el actual).
 * Sin horario cargado, o con encendido y apagado a la misma hora, devuelve una ventana de las
 * últimas `fallbackHours` horas.
 */
export function lightPeriods(
  now: Date,
  lightsOn: string | null | undefined,
  lightsOff: string | null | undefined,
  timeZone: string,
  fallbackHours = 12,
): Period[] {
  if (!isHHMM(lightsOn) || !isHHMM(lightsOff) || lightsOn === lightsOff) {
    return [
      {
        kind: 'VENTANA',
        start: new Date(now.getTime() - fallbackHours * 3_600_000),
        end: now,
        plannedEnd: now,
        ongoing: true,
      },
    ];
  }

  const today = localDateKey(now, timeZone);
  const boundaries: { at: Date; kind: 'LUZ' | 'OSCURIDAD' }[] = [];
  for (let offset = -3; offset <= 1; offset++) {
    const day = addDays(today, offset);
    boundaries.push({ at: zonedInstant(day, lightsOn, timeZone), kind: 'LUZ' });
    boundaries.push({ at: zonedInstant(day, lightsOff, timeZone), kind: 'OSCURIDAD' });
  }
  boundaries.sort((a, b) => a.at.getTime() - b.at.getTime());

  let currentIndex = 0;
  boundaries.forEach((boundary, index) => {
    if (boundary.at.getTime() <= now.getTime()) currentIndex = index;
  });
  const current = boundaries[currentIndex];
  const next = boundaries[currentIndex + 1];
  const previous = boundaries[currentIndex - 1];

  return [
    { kind: current.kind, start: current.at, end: now, plannedEnd: next.at, ongoing: true },
    { kind: previous.kind, start: previous.at, end: current.at, plannedEnd: current.at, ongoing: false },
  ];
}

// ============================================
// RESUMEN DE LECTURAS
// ============================================

export interface ReadingPoint {
  recordedAt: Date;
  temperature: number | null;
  humidity: number | null;
  vpd: number | null;
}

export interface MetricSummary {
  min: number;
  max: number;
  avg: number;
  last: number;
  /** Horas en cada estado contra el rango de la etapa; `null` sin rangos. */
  hours: Record<ReadingStatus, number> | null;
  /** Peor estado con tiempo registrado; `null` sin rangos. */
  status: ReadingStatus | null;
}

export interface PeriodReadings {
  count: number;
  first: Date | null;
  last: Date | null;
  metrics: Record<RangeMetric, MetricSummary | null>;
}

/** Hueco máximo que se le atribuye a una lectura: si el sensor se cortó, no se inventa el resto. */
export const MAX_READING_GAP_MS = 10 * 60_000;

const round = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/** Min, máx, media y horas por estado de cada métrica dentro del período. */
export function summarizeReadings(
  readings: ReadingPoint[],
  period: Pick<Period, 'start' | 'end'>,
  range: StageRange | null,
): PeriodReadings {
  const inside = readings
    .filter((reading) => reading.recordedAt >= period.start && reading.recordedAt <= period.end)
    .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

  const valueOf = (reading: ReadingPoint, metric: RangeMetric): number | null => {
    if (metric === 'vpd') {
      if (reading.vpd !== null && Number.isFinite(reading.vpd)) return reading.vpd;
      if (reading.temperature === null || reading.humidity === null) return null;
      return vpdOf(reading.temperature, reading.humidity);
    }
    const value = reading[metric];
    return value !== null && Number.isFinite(value) ? value : null;
  };

  const summarize = (metric: RangeMetric): MetricSummary | null => {
    const points = inside
      .map((reading, index) => ({ reading, index, value: valueOf(reading, metric) }))
      .filter((point): point is { reading: ReadingPoint; index: number; value: number } => point.value !== null);
    if (!points.length) return null;

    const values = points.map((point) => point.value);
    const hours = range ? { ok: 0, warn: 0, danger: 0 } : null;
    if (hours && range) {
      for (const point of points) {
        const nextAt = inside[point.index + 1]?.recordedAt ?? period.end;
        const span = Math.min(Math.max(nextAt.getTime() - point.reading.recordedAt.getTime(), 0), MAX_READING_GAP_MS);
        hours[readingStatus(metric, point.value, range)] += span / 3_600_000;
      }
    }

    const digits = metric === 'vpd' ? 2 : 1;
    const status: ReadingStatus | null = hours
      ? hours.danger > 0
        ? 'danger'
        : hours.warn > 0
          ? 'warn'
          : 'ok'
      : null;

    return {
      min: round(Math.min(...values), digits),
      max: round(Math.max(...values), digits),
      avg: round(values.reduce((sum, value) => sum + value, 0) / values.length, digits),
      last: round(values[values.length - 1], digits),
      hours: hours
        ? { ok: round(hours.ok, 1), warn: round(hours.warn, 1), danger: round(hours.danger, 1) }
        : null,
      status,
    };
  };

  return {
    count: inside.length,
    first: inside[0]?.recordedAt ?? null,
    last: inside[inside.length - 1]?.recordedAt ?? null,
    metrics: {
      temperature: summarize('temperature'),
      humidity: summarize('humidity'),
      vpd: summarize('vpd'),
    },
  };
}

// ============================================
// AUTOMATIZACIONES
// ============================================

/** Ejecuciones de una automatización en un período, agrupadas por estado en la base. */
export interface ExecutionGroup {
  automationId: string;
  automationName: string;
  triggerType: TriggerType;
  /** Minutos entre evaluaciones de una automatización por condición. */
  interval: number;
  status: string;
  count: number;
  first: Date;
  last: Date;
}

export interface AutomationActivity {
  automationId: string;
  name: string;
  triggerType: TriggerType;
  runs: number;
  /** Salteadas por precedencia: quedan CANCELLED con "Salteada: <motivo>". */
  skipped: number;
  failed: number;
  first: Date;
  last: Date;
  /** Por condición: minutos con la condición cumplida (corridas × intervalo). */
  conditionMinutes: number | null;
}

/** Qué automatizaciones corrieron en el período, ordenadas por actividad. */
export function automationActivity(
  groups: ExecutionGroup[],
  period: Pick<Period, 'start' | 'end'>,
): AutomationActivity[] {
  const byAutomation = new Map<string, AutomationActivity>();
  const periodMinutes = Math.round((period.end.getTime() - period.start.getTime()) / 60_000);

  for (const group of groups) {
    const entry =
      byAutomation.get(group.automationId) ??
      ({
        automationId: group.automationId,
        name: group.automationName,
        triggerType: group.triggerType,
        runs: 0,
        skipped: 0,
        failed: 0,
        first: group.first,
        last: group.last,
        conditionMinutes: null,
      } satisfies AutomationActivity);

    if (group.status === 'COMPLETED') entry.runs += group.count;
    else if (group.status === 'FAILED') entry.failed += group.count;
    else if (group.status === 'CANCELLED') entry.skipped += group.count;

    if (group.first < entry.first) entry.first = group.first;
    if (group.last > entry.last) entry.last = group.last;
    if (group.triggerType === TriggerType.CONDITION) {
      entry.conditionMinutes = Math.min(entry.runs * Math.max(group.interval, 1), periodMinutes);
    }
    byAutomation.set(group.automationId, entry);
  }

  return [...byAutomation.values()]
    .filter((entry) => entry.runs + entry.skipped + entry.failed > 0)
    .sort((a, b) => (b.conditionMinutes ?? b.runs) - (a.conditionMinutes ?? a.runs));
}

// ============================================
// PLANES
// ============================================

export interface PlanProduct {
  name: string;
  dose: string;
  unit: string;
}

interface FeedingWeekRow {
  weekNumber: number;
  products: unknown;
  ph: number | null;
  ec: number | null;
  notes: string | null;
}

interface ApplicationRow {
  dayNumber: number;
  products: unknown;
  applicationType: string | null;
  target: string | null;
  notes: string | null;
}

export interface PlanPlant {
  id: string;
  tagCode: string;
  stage: string;
  feedingPlans: {
    stageStartDate: Date;
    feedingPlan: { id: string; name: string; stage: string; weeks: FeedingWeekRow[] };
  }[];
  preventionPlans: {
    startDate: Date;
    preventionPlan: { id: string; name: string; stage: string; totalDays: number; applications: ApplicationRow[] };
  }[];
}

/**
 * Semana del plan de alimentación en un día local, contando días de calendario desde el inicio
 * (S1 = días 1 a 7). `FeedingPlansService.calculateCurrentWeek` cuenta milisegundos y, con el
 * inicio guardado a medianoche UTC, adelanta el cambio de semana a las 21:00 del día anterior.
 */
export function feedingWeekOn(startKey: string, dayKey: string): number {
  return Math.floor(daysBetween(startKey, dayKey) / 7) + 1;
}

/** Día del preventivo en un día local (1 a `totalDays`, y vuelve a empezar), por calendario. */
export function preventionDayOn(startKey: string, dayKey: string, totalDays: number): number {
  return (daysBetween(startKey, dayKey) % totalDays) + 1;
}

export function planProducts(products: unknown): PlanProduct[] {
  if (!Array.isArray(products)) return [];
  return products
    .filter((product): product is Record<string, unknown> => typeof product === 'object' && product !== null)
    .map((product) => ({
      name: String(product.name ?? ''),
      dose: String(product.dose ?? ''),
      unit: String(product.unit ?? ''),
    }))
    .filter((product) => product.name);
}

export interface FeedingGroup {
  key: string;
  planId: string;
  planName: string;
  week: number;
  products: PlanProduct[];
  ph: number | null;
  ec: number | null;
  notes: string | null;
  plantIds: string[];
}

/** Semana de alimentación vigente de cada plan aplicado a plantas en su etapa. */
export function feedingToday(plants: PlanPlant[], now: Date, timeZone: string): FeedingGroup[] {
  const today = localDateKey(now, timeZone);
  const groups = new Map<string, FeedingGroup>();
  for (const plant of plants) {
    for (const assignment of plant.feedingPlans) {
      const plan = assignment.feedingPlan;
      if (plan.stage !== plant.stage) continue;
      const startKey = calendarDateKey(assignment.stageStartDate, timeZone);
      if (daysBetween(startKey, today) < 0) continue;
      const week = feedingWeekOn(startKey, today);
      const row = plan.weeks.find((candidate) => candidate.weekNumber === week);
      if (!row) continue;
      const key = `feeding:${plan.id}:${week}`;
      const group =
        groups.get(key) ??
        ({
          key,
          planId: plan.id,
          planName: plan.name,
          week,
          products: planProducts(row.products),
          ph: row.ph,
          ec: row.ec,
          notes: row.notes,
          plantIds: [],
        } satisfies FeedingGroup);
      group.plantIds.push(plant.id);
      groups.set(key, group);
    }
  }
  return [...groups.values()];
}

export interface PreventionGroup {
  key: string;
  planId: string;
  planName: string;
  day: number;
  /** Día local en que toca la aplicación. */
  date: string;
  products: PlanProduct[];
  applicationType: string | null;
  target: string | null;
  notes: string | null;
  plantIds: string[];
}

/** Aplicaciones del preventivo entre `fromOffset` y `toOffset` días desde hoy (0 = hoy). */
export function preventionBetween(
  plants: PlanPlant[],
  now: Date,
  timeZone: string,
  fromOffset: number,
  toOffset: number,
): PreventionGroup[] {
  const today = localDateKey(now, timeZone);
  const groups = new Map<string, PreventionGroup>();
  for (let offset = fromOffset; offset <= toOffset; offset++) {
    const date = addDays(today, offset);
    for (const plant of plants) {
      for (const assignment of plant.preventionPlans) {
        const plan = assignment.preventionPlan;
        if (plan.stage !== plant.stage || plan.totalDays <= 0) continue;
        const startKey = calendarDateKey(assignment.startDate, timeZone);
        if (daysBetween(startKey, date) < 0) continue;
        const day = preventionDayOn(startKey, date, plan.totalDays);
        const application = plan.applications.find((candidate) => candidate.dayNumber === day);
        if (!application) continue;
        const key = `prevention:${plan.id}:${day}:${date}`;
        const group =
          groups.get(key) ??
          ({
            key,
            planId: plan.id,
            planName: plan.name,
            day,
            date,
            products: planProducts(application.products),
            applicationType: application.applicationType,
            target: application.target,
            notes: application.notes,
            plantIds: [],
          } satisfies PreventionGroup);
        group.plantIds.push(plant.id);
        groups.set(key, group);
      }
    }
  }
  return [...groups.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export interface FeedingWeekChange {
  date: string;
  planName: string;
  week: number;
  products: PlanProduct[];
  ph: number | null;
  ec: number | null;
}

/** Próximo cambio de semana de cada plan de alimentación dentro del horizonte. */
export function nextFeedingWeeks(
  plants: PlanPlant[],
  now: Date,
  timeZone: string,
  horizonDays: number,
): FeedingWeekChange[] {
  const today = localDateKey(now, timeZone);
  const changes = new Map<string, FeedingWeekChange>();
  for (const plant of plants) {
    for (const assignment of plant.feedingPlans) {
      const plan = assignment.feedingPlan;
      if (plan.stage !== plant.stage) continue;
      const startKey = calendarDateKey(assignment.stageStartDate, timeZone);
      if (daysBetween(startKey, today) < 0) continue;
      const week = feedingWeekOn(startKey, today);
      const row = plan.weeks.find((candidate) => candidate.weekNumber === week + 1);
      if (!row) continue;
      const date = addDays(startKey, week * 7);
      const offset = daysBetween(today, date);
      if (offset <= 0 || offset > horizonDays) continue;
      const key = `${plan.id}:${week + 1}`;
      if (changes.has(key)) continue;
      changes.set(key, {
        date,
        planName: plan.name,
        week: week + 1,
        products: planProducts(row.products),
        ph: row.ph,
        ec: row.ec,
      });
    }
  }
  return [...changes.values()];
}

/** Número con coma decimal, como se lee en Argentina. */
export function decimal(value: number | string): string {
  return String(value).replace('.', ',');
}

/** "Mamboretá Oil 85E 2 ml/L · Powder Feeding Grow 0,5 g/L" */
export function productsLabel(products: PlanProduct[]): string {
  return products.map((product) => `${product.name} ${decimal(product.dose)} ${product.unit}`.trim()).join(' · ');
}
