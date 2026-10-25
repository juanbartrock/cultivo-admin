import { Device, DeviceStatus, SectionDashboard, StageRange } from '@/types';
import {
  calculateVPD,
  RangeMetric,
  isDeviceOn,
  metricRange,
  readingStatus,
  sectionReadings,
} from '@/features/home/lib/readings';

export type LiveMode = 'cultivo' | 'ambiente' | 'equipos';
export type SceneLayers = { structure: boolean; nets: boolean; wiring: boolean };

export interface LiveMetric {
  key: RangeMetric;
  label: string;
  shortLabel: string;
  value: number | null;
  unit: string;
  decimals: number;
}

export function liveMetrics(
  section: SectionDashboard,
  getStatus: (deviceId: string) => DeviceStatus | null,
): LiveMetric[] {
  const readings = sectionReadings(section, getStatus);
  const co2Sensor = (section.devices ?? []).find((device) => {
    if (device.type !== 'SENSOR') return false;
    const status = getStatus(device.id);
    return status?.online !== false && !status?.readingsPaused && Number.isFinite(status?.co2);
  });
  const co2 = co2Sensor ? getStatus(co2Sensor.id)?.co2 as number : null;
  return [
    { key: 'temperature', label: 'Temperatura', shortLabel: 'TEMP', value: readings.temperature, unit: '°C', decimals: 1 },
    { key: 'humidity', label: 'Humedad', shortLabel: 'HR', value: readings.humidity, unit: '%', decimals: 0 },
    { key: 'vpd', label: 'Déficit de presión de vapor', shortLabel: 'VPD', value: readings.vpd ?? calculateVPD(readings.temperature, readings.humidity), unit: ' kPa', decimals: 2 },
    { key: 'co2', label: 'Dióxido de carbono', shortLabel: 'CO₂', value: co2, unit: ' ppm', decimals: 0 },
  ];
}

export function rangeLabel(range: StageRange | null | undefined, metric: RangeMetric) {
  const limits = metricRange(range, metric);
  if (!limits) return 'Rango no disponible';
  return `Ideal ${limits.idealMin}–${limits.idealMax}`;
}

export interface AttentionItem {
  id: string;
  title: string;
  detail: string;
  severity: 'warn' | 'danger';
  selection: { kind: 'device'; id: string };
}

export function attentionItems(
  section: SectionDashboard,
  getStatus: (deviceId: string) => DeviceStatus | null,
  range: StageRange | null | undefined,
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const readings = sectionReadings(section, getStatus);
  if (readings.sensor && readings.sensorOffline) {
    items.push({
      id: `${readings.sensor.id}-offline`,
      title: 'Sensor sin respuesta',
      detail: 'Las condiciones actuales no están disponibles.',
      severity: 'warn',
      selection: { kind: 'device', id: readings.sensor.id },
    });
  }
  for (const metric of liveMetrics(section, getStatus)) {
    const status = readingStatus(metric.key, metric.value, range);
    if (status === 'warn' || status === 'danger') {
      items.push({
        id: `metric-${metric.key}`,
        title: `${metric.label} ${status === 'danger' ? 'fuera de rango' : 'en observación'}`,
        detail: rangeLabel(range, metric.key),
        severity: status,
        selection: readings.sensor ? { kind: 'device', id: readings.sensor.id } : { kind: 'device', id: '' },
      });
    }
  }
  for (const device of section.devices ?? []) {
    if (device.type === 'SENSOR' || device.type === 'CAMARA') continue;
    const status = getStatus(device.id);
    if (status?.online === false && !status.readingsPaused) {
      items.push({
        id: `${device.id}-offline`,
        title: `${device.name} sin conexión`,
        detail: isDeviceOn(status, device) ? 'Figura encendido; verificá el equipo.' : 'Revisá conexión y alimentación.',
        severity: 'warn',
        selection: { kind: 'device', id: device.id },
      });
    }
  }
  return items.filter((item) => item.selection.id);
}

export const MODE_LABELS: Record<LiveMode, string> = {
  cultivo: 'Cultivo',
  ambiente: 'Ambiente',
  equipos: 'Equipos',
};

export const DEVICE_MODE: Partial<Record<Device['type'], LiveMode>> = {
  SENSOR: 'ambiente',
  LUZ: 'equipos',
  EXTRACTOR: 'equipos',
  VENTILADOR: 'equipos',
  HUMIDIFICADOR: 'equipos',
  DESHUMIDIFICADOR: 'equipos',
  AIRE_ACONDICIONADO: 'equipos',
  BOMBA_RIEGO: 'equipos',
  CALEFACTOR: 'equipos',
  ENCHUFE: 'equipos',
};
