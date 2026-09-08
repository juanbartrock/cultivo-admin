import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
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
export class StageRangesService implements OnModuleInit {
  private readonly logger = new Logger(StageRangesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Siembra al arrancar las filas que falten (base sembrada a mano, etapa nueva). Va acá y no
   * en el GET para que leer los rangos no escriba en la base; la migración ya las crea y
   * `skipDuplicates` nunca pisa una fila existente.
   */
  async onModuleInit(): Promise<void> {
    try {
      const existing = await this.prisma.stageRange.findMany({ select: { stage: true } });
      const missing = RANGE_STAGES.filter(
        (stage) => !existing.some((row) => row.stage === stage),
      );
      if (!missing.length) return;

      this.logger.warn(`Sembrando rangos faltantes: ${missing.join(', ')}`);
      await this.prisma.stageRange.createMany({
        data: missing.map((stage) => ({ stage, ...SEED_RANGE_VALUES })),
        skipDuplicates: true,
      });
    } catch (error) {
      // Que la base no responda al arrancar no puede tumbar el proceso: el GET falla solo.
      this.logger.error(`No se pudieron sembrar los rangos: ${(error as Error).message}`);
    }
  }

  /** Las 7 filas en orden de etapa. Sólo lee. */
  async findAll(): Promise<StageRange[]> {
    return this.sorted(await this.prisma.stageRange.findMany());
  }

  async findOne(stage: RangeStage): Promise<StageRange> {
    const row = await this.prisma.stageRange.findUnique({ where: { stage } });
    if (!row) {
      throw new NotFoundException(`No hay rangos cargados para la etapa ${stage}`);
    }
    return row;
  }

  /** PUT: reemplaza los 16 valores de una etapa. */
  async update(stage: RangeStage, data: UpdateStageRangeDto): Promise<StageRange> {
    this.validate(data);
    await this.findOne(stage); // 404 claro si la fila no existe, en vez del P2025 de Prisma
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
