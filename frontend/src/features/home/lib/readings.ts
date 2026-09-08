import { Device, DeviceStatus, Plant, PlantStage, Section } from '@/types';

/** Estado de una lectura contra su rango operativo. `unknown` = sin dato. */
export type ReadingStatus = 'ok' | 'warn' | 'danger' | 'unknown';

export const READING_TONE: Record<ReadingStatus, string> = {
  ok: 'text-fg',
  warn: 'text-warn',
  danger: 'text-danger',
  unknown: 'text-fg-faint',
};

/**
 * Rangos operativos de cultivo indoor. Fuera del rango amplio es `danger`;
 * entre el rango amplio y el ideal, `warn`.
 */
const RANGES = {
  temperature: { ideal: [18, 28], wide: [15, 30] },
  humidity: { ideal: [40, 65], wide: [30, 75] },
  vpd: { ideal: [0.8, 1.4], wide: [0.4, 1.6] },
} as const;

export function readingStatus(
  metric: keyof typeof RANGES,
  value: number | null | undefined
): ReadingStatus {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'unknown';
  const { ideal, wide } = RANGES[metric];
  if (value >= ideal[0] && value <= ideal[1]) return 'ok';
  if (value >= wide[0] && value <= wide[1]) return 'warn';
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

/** Etapa con más plantas en la carpa. */
export function dominantStage(plants: Plant[] | undefined): PlantStage | null {
  if (!plants?.length) return null;
  const counts = plants.reduce<Partial<Record<PlantStage, number>>>((acc, plant) => {
    acc[plant.stage] = (acc[plant.stage] ?? 0) + 1;
    return acc;
  }, {});

  const entries = Object.entries(counts) as [PlantStage, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? null;
}

export interface SectionReadings {
  temperature: number | null;
  humidity: number | null;
  vpd: number | null;
  /** Sensor de la carpa, si tiene uno asignado. */
  sensor: Device | null;
  /** El sensor existe y el backend lo informa sin respuesta: no hay lectura viva. */
  sensorOffline: boolean;
}

/**
 * Lecturas vivas de la carpa. Sólo salen del `status` que devuelve el conector ahora: un
 * sensor sin respuesta, o sin `status`, no tiene lectura y las tres métricas quedan en
 * `null`. `sensor.metadata` es el último valor guardado en la base, sin antigüedad ni forma
 * de saber de cuándo es; pintarlo con color de estado miente sobre el presente.
 */
export function sectionReadings(
  section: Section,
  getStatus: (deviceId: string) => DeviceStatus | null
): SectionReadings {
  const sensor = section.devices?.find((device) => device.type === 'SENSOR') ?? null;
  if (!sensor) {
    return { temperature: null, humidity: null, vpd: null, sensor: null, sensorOffline: false };
  }

  const status = getStatus(sensor.id);
  if (status?.online === false) {
    return { temperature: null, humidity: null, vpd: null, sensor, sensorOffline: true };
  }

  const temperature = (status?.temperature as number | undefined) ?? null;
  const humidity = (status?.humidity as number | undefined) ?? null;

  return {
    temperature,
    humidity,
    vpd: calculateVPD(temperature, humidity),
    sensor,
    sensorOffline: false,
  };
}

/** Días transcurridos desde una fecha ISO. */
export function daysSince(isoDate: string): number {
  const start = new Date(isoDate).getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / 86_400_000));
}
