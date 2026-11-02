import { RangeStage, StageRange, TriggerType } from '@prisma/client';
import { addDays, calendarDateKey, localDateKey, zonedInstant } from './agenda-time';
import {
  ExecutionGroup,
  PlanPlant,
  automationActivity,
  feedingToday,
  lightPeriods,
  nextFeedingWeeks,
  preventionBetween,
  summarizeReadings,
} from './agenda.logic';

const TZ = 'America/Argentina/Buenos_Aires';
const at = (iso: string) => new Date(iso);

const VEGE: StageRange = {
  id: 'r',
  stage: RangeStage.VEGETATIVO,
  tempIdealMin: 22,
  tempIdealMax: 28,
  tempWideMin: 18,
  tempWideMax: 30,
  humidityIdealMin: 55,
  humidityIdealMax: 70,
  humidityWideMin: 45,
  humidityWideMax: 80,
  vpdIdealMin: 0.8,
  vpdIdealMax: 1.2,
  vpdWideMin: 0.6,
  vpdWideMax: 1.4,
  co2IdealMin: 400,
  co2IdealMax: 1500,
  co2WideMin: 300,
  co2WideMax: 2000,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

describe('agenda-time', () => {
  it('ubica las 18:00 de Buenos Aires a las 21:00 UTC', () => {
    expect(zonedInstant('2026-11-01', '18:00', TZ).toISOString()).toBe('2026-11-01T21:00:00.000Z');
  });

  it('el día local cambia a las 03:00 UTC', () => {
    expect(localDateKey(at('2026-11-02T02:59:00Z'), TZ)).toBe('2026-11-01');
    expect(localDateKey(at('2026-11-02T03:00:00Z'), TZ)).toBe('2026-11-02');
  });

  it('una fecha guardada como día se lee por su fecha UTC; una con hora, en hora local', () => {
    expect(calendarDateKey(at('2026-10-24T00:00:00Z'), TZ)).toBe('2026-10-24');
    expect(calendarDateKey(at('2026-10-24T01:30:00Z'), TZ)).toBe('2026-10-23');
  });

  it('suma días cruzando el mes', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
  });
});

describe('lightPeriods', () => {
  it('a las 07:45 con luz 18:00–10:00 el período actual es la luz que empezó ayer a las 18', () => {
    const now = at('2026-11-02T10:45:00Z'); // 07:45 local
    const [current, previous] = lightPeriods(now, '18:00', '10:00', TZ);

    expect(current.kind).toBe('LUZ');
    expect(current.start.toISOString()).toBe('2026-11-01T21:00:00.000Z');
    expect(current.end).toBe(now);
    expect(current.plannedEnd.toISOString()).toBe('2026-11-02T13:00:00.000Z');
    expect(current.ongoing).toBe(true);

    expect(previous.kind).toBe('OSCURIDAD');
    expect(previous.start.toISOString()).toBe('2026-11-01T13:00:00.000Z');
    expect(previous.end.toISOString()).toBe('2026-11-01T21:00:00.000Z');
    expect(previous.ongoing).toBe(false);
  });

  it('a las 14:00 el período actual es la oscuridad y el anterior la noche con luz', () => {
    const [current, previous] = lightPeriods(at('2026-11-02T17:00:00Z'), '18:00', '10:00', TZ);
    expect(current.kind).toBe('OSCURIDAD');
    expect(current.start.toISOString()).toBe('2026-11-02T13:00:00.000Z');
    expect(previous.kind).toBe('LUZ');
    expect(previous.start.toISOString()).toBe('2026-11-01T21:00:00.000Z');
  });

  it('con 12/12 sin cruzar medianoche también arma los dos períodos', () => {
    const [current, previous] = lightPeriods(at('2026-11-25T03:30:00Z'), '06:00', '18:00', TZ); // 00:30 local
    expect(current.kind).toBe('OSCURIDAD');
    expect(current.start.toISOString()).toBe('2026-11-24T21:00:00.000Z');
    expect(previous.kind).toBe('LUZ');
    expect(previous.start.toISOString()).toBe('2026-11-24T09:00:00.000Z');
  });

  it('sin horario usa las últimas 12 h', () => {
    const now = at('2026-11-02T10:45:00Z');
    const periods = lightPeriods(now, null, '10:00', TZ);
    expect(periods).toHaveLength(1);
    expect(periods[0].kind).toBe('VENTANA');
    expect(now.getTime() - periods[0].start.getTime()).toBe(12 * 3_600_000);
  });

  it('encendido y apagado a la misma hora no es un horario', () => {
    expect(lightPeriods(at('2026-11-02T10:45:00Z'), '10:00', '10:00', TZ)[0].kind).toBe('VENTANA');
  });
});

describe('summarizeReadings', () => {
  const period = { start: at('2026-11-02T00:00:00Z'), end: at('2026-11-02T01:00:00Z') };
  const reading = (minute: number, temperature: number, humidity: number, vpd: number | null = null) => ({
    recordedAt: new Date(period.start.getTime() + minute * 60_000),
    temperature,
    humidity,
    vpd,
  });

  it('calcula min, máx, media y horas por estado pesando el tiempo de cada lectura', () => {
    const summary = summarizeReadings(
      [reading(0, 26, 70, 1), reading(30, 27, 81, 0.7)],
      period,
      VEGE,
    );
    expect(summary.count).toBe(2);
    // La primera vale 10 min (tope de hueco) y la segunda hasta el fin del período, también 10 min.
    expect(summary.metrics.humidity).toMatchObject({ min: 70, max: 81, avg: 75.5, last: 81, status: 'danger' });
    expect(summary.metrics.humidity?.hours).toEqual({ ok: 0.2, warn: 0, danger: 0.2 });
    expect(summary.metrics.temperature?.status).toBe('ok');
    expect(summary.metrics.vpd).toMatchObject({ min: 0.7, max: 1, status: 'warn' });
  });

  it('sin VPD guardado lo calcula de temperatura y humedad', () => {
    const summary = summarizeReadings([reading(5, 26.4, 80)], period, VEGE);
    expect(summary.metrics.vpd?.last).toBeCloseTo(0.69, 2);
  });

  it('deja afuera las lecturas fuera del período', () => {
    const summary = summarizeReadings([reading(-5, 30, 50), reading(90, 30, 50)], period, VEGE);
    expect(summary.count).toBe(0);
    expect(summary.metrics.temperature).toBeNull();
  });

  it('sin rangos no hay estado', () => {
    const summary = summarizeReadings([reading(0, 26, 70)], period, null);
    expect(summary.metrics.temperature).toMatchObject({ hours: null, status: null });
  });
});

describe('automationActivity', () => {
  const period = { start: at('2026-11-01T21:00:00Z'), end: at('2026-11-02T10:45:00Z') };
  const group = (overrides: Partial<ExecutionGroup>): ExecutionGroup => ({
    automationId: 'hum',
    automationName: 'Extractor por humedad: prender',
    triggerType: TriggerType.CONDITION,
    interval: 1,
    status: 'COMPLETED',
    count: 1,
    first: period.start,
    last: period.end,
    ...overrides,
  });

  it('cuenta corridas, salteadas y minutos con la condición cumplida', () => {
    const renovacion = { automationId: 'ren', automationName: 'Renovación de aire', triggerType: TriggerType.SCHEDULED, interval: 60 };
    const activity = automationActivity(
      [
        group({ count: 120 }),
        group({ ...renovacion, count: 1 }),
        group({ ...renovacion, status: 'CANCELLED', count: 1 }),
      ],
      period,
    );
    expect(activity[0]).toMatchObject({ automationId: 'hum', runs: 120, conditionMinutes: 120 });
    expect(activity[1]).toMatchObject({ automationId: 'ren', runs: 1, skipped: 1, conditionMinutes: null });
  });

  it('los minutos con condición no pasan la duración del período', () => {
    const [entry] = automationActivity([group({ count: 5000 })], period);
    expect(entry.conditionMinutes).toBe(825);
  });
});

describe('planes', () => {
  const start = at('2026-10-24T00:00:00Z'); // 24/10 guardado como día, como el ciclo Octubre 2026
  const plant = (id: string, stage = 'VEGETATIVO'): PlanPlant => ({
    id,
    tagCode: id,
    stage,
    feedingPlans: [
      {
        stageStartDate: start,
        feedingPlan: {
          id: 'fp',
          name: 'Vege',
          stage: 'VEGETATIVO',
          weeks: [
            { weekNumber: 2, products: [{ name: 'Grow', dose: '0.5', unit: 'g/L' }], ph: 6.3, ec: 0.8, notes: null },
            { weekNumber: 3, products: [{ name: 'Grow', dose: '0.6', unit: 'g/L' }], ph: 6.3, ec: 1, notes: null },
          ],
        },
      },
    ],
    preventionPlans: [
      {
        startDate: start,
        preventionPlan: {
          id: 'pp',
          name: 'Preventivo',
          stage: 'VEGETATIVO',
          totalDays: 31,
          applications: [
            { dayNumber: 13, products: [{ name: 'Mamboretá', dose: '2', unit: 'ml/L' }], applicationType: 'FOLIAR', target: 'PLAGAS', notes: null },
          ],
        },
      },
    ],
  });
  const now = at('2026-11-02T10:45:00Z'); // día 10, semana 2

  it('agrupa la semana de alimentación vigente', () => {
    const groups = feedingToday([plant('043'), plant('061')], now, TZ);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ week: 2, ph: 6.3, ec: 0.8, plantIds: ['043', '061'] });
    expect(groups[0].products[0]).toEqual({ name: 'Grow', dose: '0.5', unit: 'g/L' });
  });

  it('ignora planes de otra etapa', () => {
    expect(feedingToday([plant('043', 'FLORACION')], now, TZ)).toHaveLength(0);
  });

  it('ubica el día 13 del preventivo el 05/11 y no hoy', () => {
    expect(preventionBetween([plant('043')], now, TZ, 0, 0)).toHaveLength(0);
    const upcoming = preventionBetween([plant('043'), plant('061')], now, TZ, 1, 14);
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0]).toMatchObject({ date: '2026-11-05', day: 13, plantIds: ['043', '061'] });
  });

  it('el 04/11 a las 22:00 todavía no es el día 13', () => {
    expect(preventionBetween([plant('043')], at('2026-11-05T01:00:00Z'), TZ, 0, 0)).toHaveLength(0);
  });

  it('el 05/11 la aplicación es de hoy', () => {
    const groups = preventionBetween([plant('043')], at('2026-11-05T11:00:00Z'), TZ, 0, 0);
    expect(groups[0]).toMatchObject({ day: 13, date: '2026-11-05', key: 'prevention:pp:13:2026-11-05' });
  });

  it('anuncia el cambio a la semana 3 el 07/11', () => {
    expect(nextFeedingWeeks([plant('043')], now, TZ, 30)).toEqual([
      expect.objectContaining({ date: '2026-11-07', week: 3 }),
    ]);
  });
});
