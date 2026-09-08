import { PlantStage, RangeStage } from '@prisma/client';

/** Las 7 filas de rangos, en el orden en que se muestran y se siembran. */
export const RANGE_STAGES: RangeStage[] = [
  RangeStage.DEFAULT,
  RangeStage.GERMINACION,
  RangeStage.VEGETATIVO,
  RangeStage.PRE_FLORA,
  RangeStage.FLORACION,
  RangeStage.SECADO,
  RangeStage.CURADO,
];

/** Orden de avance del cultivo: desempata la etapa efectiva de una carpa. */
export const STAGE_ORDER: PlantStage[] = [
  PlantStage.GERMINACION,
  PlantStage.VEGETATIVO,
  PlantStage.PRE_FLORA,
  PlantStage.FLORACION,
  PlantStage.SECADO,
  PlantStage.CURADO,
];

export interface StageRangeValues {
  tempIdealMin: number;
  tempIdealMax: number;
  tempWideMin: number;
  tempWideMax: number;
  humidityIdealMin: number;
  humidityIdealMax: number;
  humidityWideMin: number;
  humidityWideMax: number;
  vpdIdealMin: number;
  vpdIdealMax: number;
  vpdWideMin: number;
  vpdWideMax: number;
  co2IdealMin: number;
  co2IdealMax: number;
  co2WideMin: number;
  co2WideMax: number;
}

/**
 * Valores de siembra: los que estaban hardcodeados en el frontend antes de mover los rangos a
 * la base. Sólo se usan para crear una fila que falte; nunca pisan una fila existente.
 */
export const SEED_RANGE_VALUES: StageRangeValues = {
  tempIdealMin: 18,
  tempIdealMax: 28,
  tempWideMin: 15,
  tempWideMax: 30,
  humidityIdealMin: 40,
  humidityIdealMax: 65,
  humidityWideMin: 30,
  humidityWideMax: 75,
  vpdIdealMin: 0.8,
  vpdIdealMax: 1.4,
  vpdWideMin: 0.4,
  vpdWideMax: 1.6,
  co2IdealMin: 400,
  co2IdealMax: 1500,
  co2WideMin: 300,
  co2WideMax: 2000,
};

/** Cada etapa de planta apunta a su fila de rangos. */
export const PLANT_STAGE_TO_RANGE: Record<PlantStage, RangeStage> = {
  [PlantStage.GERMINACION]: RangeStage.GERMINACION,
  [PlantStage.VEGETATIVO]: RangeStage.VEGETATIVO,
  [PlantStage.PRE_FLORA]: RangeStage.PRE_FLORA,
  [PlantStage.FLORACION]: RangeStage.FLORACION,
  [PlantStage.SECADO]: RangeStage.SECADO,
  [PlantStage.CURADO]: RangeStage.CURADO,
};

/** Métricas con rango configurable y el prefijo de sus columnas. */
export const RANGE_METRICS = ['temp', 'humidity', 'vpd', 'co2'] as const;
export type RangeMetric = (typeof RANGE_METRICS)[number];

export const METRIC_LABELS: Record<RangeMetric, string> = {
  temp: 'temperatura',
  humidity: 'humedad',
  vpd: 'VPD',
  co2: 'CO2',
};
