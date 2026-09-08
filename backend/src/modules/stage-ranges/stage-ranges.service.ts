import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RangeStage, StageRange } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PatchStageRangeDto, UpdateStageRangeDto } from './dto/stage-range.dto';
import {
  METRIC_LABELS,
  RANGE_METRICS,
  RANGE_STAGES,
  RangeMetric,
  SEED_RANGE_VALUES,
  StageRangeValues,
} from './stage-range.constants';

@Injectable()
export class StageRangesService {
  private readonly logger = new Logger(StageRangesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Las 7 filas en orden de etapa. Si falta alguna (base sembrada a mano, etapa nueva) la crea
   * con los valores de siembra: `skipDuplicates` la hace idempotente y nunca pisa una existente.
   */
  async findAll(): Promise<StageRange[]> {
    const existing = await this.prisma.stageRange.findMany();

    if (existing.length < RANGE_STAGES.length) {
      const missing = RANGE_STAGES.filter(
        (stage) => !existing.some((row) => row.stage === stage),
      );
      this.logger.warn(`Sembrando rangos faltantes: ${missing.join(', ')}`);
      await this.prisma.stageRange.createMany({
        data: missing.map((stage) => ({ stage, ...SEED_RANGE_VALUES })),
        skipDuplicates: true,
      });
      return this.sorted(await this.prisma.stageRange.findMany());
    }

    return this.sorted(existing);
  }

  async findOne(stage: RangeStage): Promise<StageRange> {
    const rows = await this.findAll();
    return rows.find((row) => row.stage === stage) as StageRange;
  }

  /** PUT: reemplaza los 16 valores de una etapa. */
  async update(stage: RangeStage, data: UpdateStageRangeDto): Promise<StageRange> {
    this.validate(data);
    await this.findOne(stage); // asegura que la fila exista antes del upsert
    return this.prisma.stageRange.update({ where: { stage }, data });
  }

  /** PATCH: mezcla con lo que ya hay y valida el resultado completo. */
  async patch(stage: RangeStage, data: PatchStageRangeDto): Promise<StageRange> {
    const current = await this.findOne(stage);
    const merged = { ...this.toValues(current), ...data } as StageRangeValues;
    this.validate(merged);
    return this.prisma.stageRange.update({ where: { stage }, data });
  }

  private sorted(rows: StageRange[]): StageRange[] {
    return [...rows].sort(
      (a, b) => RANGE_STAGES.indexOf(a.stage) - RANGE_STAGES.indexOf(b.stage),
    );
  }

  private toValues(row: StageRange): StageRangeValues {
    const values = {} as StageRangeValues;
    for (const metric of RANGE_METRICS) {
      for (const key of this.keysOf(metric)) {
        values[key] = row[key];
      }
    }
    return values;
  }

  private keysOf(metric: RangeMetric): (keyof StageRangeValues)[] {
    return [
      `${metric}IdealMin`,
      `${metric}IdealMax`,
      `${metric}WideMin`,
      `${metric}WideMax`,
    ] as (keyof StageRangeValues)[];
  }

  /**
   * Cada métrica necesita min < max en los dos rangos y que el amplio contenga al ideal:
   * si no, el color de una lectura dejaría de significar algo.
   */
  private validate(values: StageRangeValues): void {
    for (const metric of RANGE_METRICS) {
      const [idealMinKey, idealMaxKey, wideMinKey, wideMaxKey] = this.keysOf(metric);
      const idealMin = values[idealMinKey];
      const idealMax = values[idealMaxKey];
      const wideMin = values[wideMinKey];
      const wideMax = values[wideMaxKey];
      const label = METRIC_LABELS[metric];

      for (const [key, value] of [
        [idealMinKey, idealMin],
        [idealMaxKey, idealMax],
        [wideMinKey, wideMin],
        [wideMaxKey, wideMax],
      ] as [string, number][]) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw new BadRequestException(`${key} tiene que ser un número finito`);
        }
      }

      if (idealMin >= idealMax) {
        throw new BadRequestException(
          `El mínimo ideal de ${label} (${idealMin}) tiene que ser menor que el máximo (${idealMax})`,
        );
      }
      if (wideMin >= wideMax) {
        throw new BadRequestException(
          `El mínimo amplio de ${label} (${wideMin}) tiene que ser menor que el máximo (${wideMax})`,
        );
      }
      if (wideMin > idealMin || wideMax < idealMax) {
        throw new BadRequestException(
          `El rango amplio de ${label} (${wideMin}-${wideMax}) tiene que contener al ideal (${idealMin}-${idealMax})`,
        );
      }
    }
  }
}
