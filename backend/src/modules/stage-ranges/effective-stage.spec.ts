import { PlantStage, RangeStage } from '@prisma/client';
import { effectiveStage } from './effective-stage';

const plant = (stage: PlantStage) => ({ stage });

describe('effectiveStage', () => {
  it('sin plantas usa la fila DEFAULT', () => {
    expect(effectiveStage([])).toBe(RangeStage.DEFAULT);
    expect(effectiveStage(undefined)).toBe(RangeStage.DEFAULT);
  });

  it('toma la etapa más frecuente', () => {
    const plants = [
      plant(PlantStage.VEGETATIVO),
      plant(PlantStage.VEGETATIVO),
      plant(PlantStage.FLORACION),
    ];
    expect(effectiveStage(plants)).toBe(RangeStage.VEGETATIVO);
  });

  it('ante empate se queda con la más avanzada', () => {
    const plants = [plant(PlantStage.SECADO), plant(PlantStage.CURADO)];
    expect(effectiveStage(plants)).toBe(RangeStage.CURADO);
    expect(effectiveStage([...plants].reverse())).toBe(RangeStage.CURADO);
  });

  it('una sola planta manda su etapa', () => {
    expect(effectiveStage([plant(PlantStage.PRE_FLORA)])).toBe(RangeStage.PRE_FLORA);
  });
});
