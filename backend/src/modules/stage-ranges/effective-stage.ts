import { PlantStage, RangeStage } from '@prisma/client';
import { PLANT_STAGE_TO_RANGE, STAGE_ORDER } from './stage-range.constants';

/**
 * Etapa efectiva de una carpa: la etapa más frecuente entre sus plantas activas y, ante empate,
 * la más avanzada. Sin plantas activas devuelve `DEFAULT`, la fila de rangos para carpas sin
 * etapa determinable.
 */
export function effectiveStage(plants: { stage: PlantStage }[] | undefined | null): RangeStage {
  if (!plants?.length) return RangeStage.DEFAULT;

  const counts = new Map<PlantStage, number>();
  for (const plant of plants) {
    counts.set(plant.stage, (counts.get(plant.stage) ?? 0) + 1);
  }

  let winner: PlantStage | null = null;
  for (const [stage, count] of counts) {
    if (!winner) {
      winner = stage;
      continue;
    }
    const best = counts.get(winner) as number;
    if (count > best) {
      winner = stage;
    } else if (count === best && STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf(winner)) {
      winner = stage;
    }
  }

  return winner ? PLANT_STAGE_TO_RANGE[winner] : RangeStage.DEFAULT;
}
