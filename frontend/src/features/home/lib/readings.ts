import { Device, DeviceStatus, PlantStage, RangeStage, Section, StageRange } from '@/types';

/** Estado de una lectura contra su rango operativo. `unknown` = sin dato. */
export type ReadingStatus = 'ok' | 'warn' | 'danger' | 'unknown';

export const READING_TONE: Record<ReadingStatus, string> = {
  ok: 'text-fg',
  warn: 'text-warn',
  danger: 'text-danger',
  unknown: 'text-fg-faint',
};

/** Métricas con rango configurable por etapa. */
export type RangeMetric = 'temperature' | 'humidity' | 'vpd' | 'co2';

/** Prefijo de las columnas de cada métrica en una fila de rangos. */
const METRIC_PREFIX: Record<RangeMetric, 'temp' | 'humidity' | 'vpd' | 'co2'> = {
  temperature: 'temp',
  humidity: 'humidity',
  vpd: 'vpd',
  co2: 'co2',
};

export interface MetricRange {
  idealMin: number;
  idealMax: number;
  wideMin: number;
  wideMax: number;
}

/** Los cuatro umbrales de una métrica dentro de una fila de rangos. */
export function metricRange(
  range: StageRange | null | undefined,
  metric: RangeMetric
): MetricRange | null {
  if (!range) return null;
  const prefix = METRIC_PREFIX[metric];
  return {
    idealMin: range[`${prefix}IdealMin`],
    idealMax: range[`${prefix}IdealMax`],
    wideMin: range[`${prefix}WideMin`],
    wideMax: range[`${prefix}WideMax`],
  };
}

/**
 * Estado de una lectura contra los rangos de la etapa que aplica. Los rangos vienen de la base
 * (`GET /stage-ranges`): sin rangos cargados el estado es `unknown` y la lectura va sin color,
 * nunca contra un valor por defecto escrito en el frontend.
 */
export function readingStatus(
  metric: RangeMetric,
  value: number | null | undefined,
  range: StageRange | null | undefined
): ReadingStatus {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'unknown';
  const limits = metricRange(range, metric);
  if (!limits) return 'unknown';
  if (value >= limits.idealMin && value <= limits.idealMax) return 'ok';
  if (value >= limits.wideMin && value <= limits.wideMax) return 'warn';
  return 'danger';
}

/** Déficit de presión de vapor en kPa (Tetens). */
export function calculateVPD(
  temperature: number | null | undefined,
  humidity: number | null | undefined
): number | null {
  if (
    temperature === null ||
    temperature === undefined ||
    humidity === null ||
    humidity === undefined ||
    !Number.isFinite(temperature) ||
    !Number.isFinite(humidity)
  ) {
    return null;
  }

  const svp = 0.6108 * Math.exp((17.27 * temperature) / (temperature + 237.3));
  const avp = (humidity / 100) * svp;
  const vpd = Math.round((svp - avp) * 100) / 100;
  return Number.isFinite(vpd) ? vpd : null;
}

/** Valor formateado o guion largo: nunca un cero que no se midió. */
export function formatReading(value: number | null | undefined, unit: string, decimals = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${Number(value.toFixed(decimals))}${unit}`;
}

export function isDeviceOn(status: DeviceStatus | null | undefined, device?: Device): boolean {
  if (status) {
    return status.state === 'on' || status.switch === 'on' || status.power === true;
  }
  const metadata = device?.metadata;
  return metadata?.state === 'on' || metadata?.switch === 'on' || metadata?.power === true;
}

export const STAGE_LABELS: Record<PlantStage, string> = {
  GERMINACION: 'Germinación',
  VEGETATIVO: 'Vegetativo',
  PRE_FLORA: 'Pre-flora',
  FLORACION: 'Floración',
  SECADO: 'Secado',
  CURADO: 'Curado',
};

/** Etiqueta de la fila de rangos que está aplicando. */
export const RANGE_STAGE_LABELS: Record<RangeStage, string> = {
  DEFAULT: 'Por defecto',
  ...STAGE_LABELS,
};

export interface SectionReadings {
  temperature: number | null;
  humidity: number | null;
  vpd: number | null;
  /** Sensor de la carpa, si tiene uno asignado. */
  sensor: Device | null;
  /** El sensor existe y el backend lo informa sin respuesta: no hay lectura viva. */
  sensorOffline: boolean;
  /** El sensor tiene las lecturas desactivadas: nadie lo consultó, no está caído. */
  sensorPaused: boolean;
}

/**
 * Lecturas vivas de la carpa. Sólo salen del `status` que devuelve el conector ahora: un
 * sensor sin respuesta, o sin `status`, no tiene lectura y las tres métricas quedan en
 * `null`. `sensor.metadata` es el último valor guardado en la base, sin antigüedad ni forma
 * de saber de cuándo es; pintarlo con color de estado miente sobre el presente.
 *
 * Un sensor con las lecturas desactivadas queda en `sensorPaused`: tampoco hay dato, y la
 * diferencia con `sensorOffline` importa porque un aparato pausado no genera alerta.
 */
export function sectionReadings(
  section: Section,
  getStatus: (deviceId: string) => DeviceStatus | null
): SectionReadings {
  const sensor = section.devices?.find((device) => device.type === 'SENSOR') ?? null;
  if (!sensor) {
    return {
      temperature: null,
      humidity: null,
      vpd: null,
      sensor: null,
      sensorOffline: false,
      sensorPaused: false,
    };
  }

  const status = getStatus(sensor.id);

  // Lecturas desactivadas: nadie preguntó. Es un estado neutro, sin alerta.
  if (status?.readingsPaused) {
    return {
      temperature: null,
      humidity: null,
      vpd: null,
      sensor,
      sensorOffline: false,
      sensorPaused: true,
    };
  }

  if (status?.online === false) {
    return {
      temperature: null,
      humidity: null,
      vpd: null,
      sensor,
      sensorOffline: true,
      sensorPaused: false,
    };
  }

  const temperature = (status?.temperature as number | undefined) ?? null;
  const humidity = (status?.humidity as number | undefined) ?? null;

  return {
    temperature,
    humidity,
    vpd: calculateVPD(temperature, humidity),
    sensor,
    sensorOffline: false,
    sensorPaused: false,
  };
}

/** Días transcurridos desde una fecha ISO. */
export function daysSince(isoDate: string): number {
  const start = new Date(isoDate).getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / 86_400_000));
}
