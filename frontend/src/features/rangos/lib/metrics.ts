import { StageRange, StageRangeValues } from '@/types';

export interface MetricField {
  key: 'temp' | 'humidity' | 'vpd' | 'co2';
  label: string;
  unit: string;
  /** Claves de la fila, en orden: ideal mín, ideal máx, amplio mín, amplio máx. */
  keys: [
    keyof StageRangeValues,
    keyof StageRangeValues,
    keyof StageRangeValues,
    keyof StageRangeValues,
  ];
}

/** Las cuatro métricas configurables, en el orden en que se muestran y se editan. */
export const METRIC_FIELDS: MetricField[] = [
  {
    key: 'temp',
    label: 'Temperatura',
    unit: '°C',
    keys: ['tempIdealMin', 'tempIdealMax', 'tempWideMin', 'tempWideMax'],
  },
  {
    key: 'humidity',
    label: 'Humedad',
    unit: '%',
    keys: ['humidityIdealMin', 'humidityIdealMax', 'humidityWideMin', 'humidityWideMax'],
  },
  {
    key: 'vpd',
    label: 'VPD',
    unit: 'kPa',
    keys: ['vpdIdealMin', 'vpdIdealMax', 'vpdWideMin', 'vpdWideMax'],
  },
  {
    key: 'co2',
    label: 'CO₂',
    unit: 'ppm',
    keys: ['co2IdealMin', 'co2IdealMax', 'co2WideMin', 'co2WideMax'],
  },
];

/** Los 16 valores editables de una fila, sin id ni fechas. */
export function valuesOf(range: StageRange): StageRangeValues {
  const values = {} as StageRangeValues;
  for (const metric of METRIC_FIELDS) {
    for (const key of metric.keys) values[key] = range[key];
  }
  return values;
}
