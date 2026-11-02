import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CycleStatus, DeviceType, EventType, Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { effectiveStage } from '../stage-ranges/effective-stage';
import {
  DEFAULT_TIME_ZONE,
  calendarDateKey,
  dateKeyToDb,
  daysBetween,
  dbDateKey,
  localDateKey,
  startOfLocalDay,
} from './agenda-time';
import {
  ExecutionGroup,
  decimal,
  PlanPlant,
  PreventionGroup,
  automationActivity,
  feedingToday,
  lightPeriods,
  nextFeedingWeeks,
  preventionBetween,
  productsLabel,
  summarizeReadings,
} from './agenda.logic';
import {
  CompletePreventionDto,
  CompleteTaskDto,
  CreateTaskDto,
  RegisterWateringDto,
  UpdateTaskDto,
} from './dto/agenda.dto';

/** Días hacia adelante que mira "Próximo". */
const UPCOMING_DAYS = 30;
const UPCOMING_PREVENTION_DAYS = 14;
const UPCOMING_LIMIT = 8;
/** Riegos a menos de este margen del último cuentan como la misma tanda. */
const WATERING_BATCH_MS = 60 * 60_000;

const APPLICATION_LABEL: Record<string, string> = {
  FOLIAR: 'Foliar',
  RIEGO: 'Al riego',
  PREVENTIVO: 'Preventivo',
};

const TARGET_LABEL: Record<string, string> = {
  HONGOS: 'hongos',
  PLAGAS: 'plagas',
  AMBOS: 'hongos y plagas',
  PREVENTIVO: 'preventivo',
};

const PLAN_INCLUDE = {
  cycle: true,
  feedingPlans: { include: { feedingPlan: { include: { weeks: true } } } },
  preventionPlans: { include: { preventionPlan: { include: { applications: true } } } },
} satisfies Prisma.PlantInclude;

type SectionPlant = Prisma.PlantGetPayload<{ include: typeof PLAN_INCLUDE }>;

const AUTOMATION_SELECT = { id: true, sectionId: true, name: true, triggerType: true, interval: true } satisfies Prisma.AutomationSelect;

@Injectable()
export class AgendaService {
  private readonly timeZone: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.timeZone = config.get<string>('CULTIVO_TZ') || DEFAULT_TIME_ZONE;
  }

  // ============================================
  // HOY
  // ============================================

  /** Bloque "Hoy" de cada carpa con plantas de un ciclo activo. */
  async today(userId?: string, now = new Date()) {
    const today = localDateKey(now, this.timeZone);
    const todayStart = startOfLocalDay(today, this.timeZone);

    const { sections, ranges } = await this.loadActiveSections(userId, todayStart);

    const blocks = await Promise.all(
      sections.map(async (section) => {
        const stage = effectiveStage(section.plants);
        const range = ranges.find((row) => row.stage === stage) ?? ranges.find((row) => row.stage === 'DEFAULT') ?? null;
        const plants = section.plants;
        const plantIds = plants.map((plant) => plant.id);
        const tagOf = new Map(plants.map((plant) => [plant.id, plant.tagCode]));
        const plantRefs = (ids: string[]) =>
          ids.filter((id) => tagOf.has(id)).map((id) => ({ id, tagCode: tagOf.get(id) as string }));

        // Períodos de luz y lecturas del sensor principal.
        const periods = lightPeriods(now, section.lightsOn, section.lightsOff, this.timeZone);
        const since = periods.reduce((min, period) => (period.start < min ? period.start : min), now);
        const sensor = section.devices.find((device) => device.type === DeviceType.SENSOR) ?? null;
        const camera = section.devices.find((device) => device.type === DeviceType.CAMARA) ?? null;

        const [readings, executions, photo, waterings, todayEvents] = await Promise.all([
          sensor
            ? this.prisma.sensorReading.findMany({
                where: { deviceId: sensor.id, recordedAt: { gte: since, lte: now } },
                select: { recordedAt: true, temperature: true, humidity: true, vpd: true },
                orderBy: { recordedAt: 'asc' },
              })
            : Promise.resolve([]),
          Promise.all(
            periods.map((period) =>
              this.prisma.automationExecution.groupBy({
                by: ['automationId', 'status'],
                where: { automation: { sectionId: section.id }, startedAt: { gte: period.start, lte: period.end } },
                _count: { _all: true },
                _min: { startedAt: true },
                _max: { startedAt: true },
              }),
            ),
          ),
          camera
            ? this.prisma.event.findFirst({
                where: {
                  type: EventType.FOTO,
                  OR: [{ sectionId: section.id }, { plantId: { in: plantIds } }],
                  createdAt: { gte: new Date(now.getTime() - 36 * 3_600_000) },
                },
                orderBy: { createdAt: 'desc' },
              })
            : Promise.resolve(null),
          this.prisma.event.findMany({
            where: { type: EventType.RIEGO, plantId: { in: plantIds } },
            orderBy: { createdAt: 'desc' },
            take: plantIds.length * 2 || 1,
          }),
          this.prisma.event.findMany({
            where: {
              type: { in: [EventType.RIEGO, EventType.NOTA] },
              plantId: { in: plantIds },
              createdAt: { gte: todayStart },
            },
            select: { type: true, plantId: true, createdAt: true, data: true },
          }),
        ]);

        const automationOf = new Map(section.automations.map((automation) => [automation.id, automation]));
        const executionGroups = (index: number): ExecutionGroup[] =>
          executions[index].flatMap((row) => {
            const automation = automationOf.get(row.automationId);
            if (!automation || !row._min.startedAt || !row._max.startedAt) return [];
            return [
              {
                automationId: row.automationId,
                automationName: automation.name,
                triggerType: automation.triggerType,
                interval: automation.interval,
                status: row.status,
                count: row._count._all,
                first: row._min.startedAt,
                last: row._max.startedAt,
              },
            ];
          });

        const periodBlocks = periods.map((period, index) => {
          const summary = summarizeReadings(readings, period, range);
          return {
            kind: period.kind,
            start: period.start,
            end: period.end,
            plannedEnd: period.plannedEnd,
            ongoing: period.ongoing,
            readings: summary.count,
            lastReadingAt: summary.last,
            metrics: summary.metrics,
            automations: automationActivity(executionGroups(index), period).slice(0, 4),
          };
        });

        // Último riego: la tanda más reciente (riegos a menos de una hora del último).
        const lastWatering = waterings[0]
          ? (() => {
              const batch = waterings.filter(
                (event) => waterings[0].createdAt.getTime() - event.createdAt.getTime() <= WATERING_BATCH_MS,
              );
              const data = (waterings[0].data ?? {}) as Record<string, unknown>;
              return {
                at: waterings[0].createdAt,
                plants: plantRefs([...new Set(batch.map((event) => event.plantId as string))]),
                ph: typeof data.ph === 'number' ? data.ph : null,
                ec: typeof data.ec === 'number' ? data.ec : null,
                liters: typeof data.liters === 'number' ? data.liters : null,
                nutrients: Array.isArray(data.nutrients) ? data.nutrients : [],
                notes: typeof data.notes === 'string' ? data.notes : null,
              };
            })()
          : null;

        const riegosHoy = todayEvents.filter((event) => event.type === EventType.RIEGO);
        const feeding = feedingToday(plants, now, this.timeZone).map((group) => {
          const watered = riegosHoy.filter((event) => group.plantIds.includes(event.plantId as string));
          return {
            ...group,
            plants: plantRefs(group.plantIds),
            wateredToday: {
              plants: plantRefs([...new Set(watered.map((event) => event.plantId as string))]),
              lastAt: watered.reduce<Date | null>((max, event) => (!max || event.createdAt > max ? event.createdAt : max), null),
            },
          };
        });

        // Tareas de hoy: aplicaciones del preventivo y tareas manuales.
        const notasHoy = todayEvents.filter((event) => event.type === EventType.NOTA);
        const preventionTasks = preventionBetween(plants, now, this.timeZone, 0, 0).map(
          (group) => {
            const done = notasHoy.filter(
              (event) =>
                (event.data as Record<string, unknown> | null)?.taskKey === group.key &&
                group.plantIds.includes(event.plantId as string),
            );
            const donePlants = new Set(done.map((event) => event.plantId as string));
            const complete = donePlants.size >= group.plantIds.length;
            return {
              key: group.key,
              source: 'PREVENCION' as const,
              taskId: null,
              title: this.preventionTitle(group),
              detail: group.notes,
              dueDate: today,
              status: complete ? TaskStatus.DONE : TaskStatus.PENDING,
              doneAt: complete
                ? done.reduce<Date | null>((max, event) => (!max || event.createdAt > max ? event.createdAt : max), null)
                : null,
              eventType: EventType.NOTA,
              plants: plantRefs(group.plantIds),
              donePlants: plantRefs([...donePlants]),
              products: group.products,
              planName: group.planName,
              day: group.day,
            };
          },
        );

        const manualToday = section.tasks.filter((task) => {
          const due = dbDateKey(task.dueDate);
          return task.status === TaskStatus.DONE || !due || due <= today;
        });
        const manualTasks = manualToday.map((task) => ({
          key: `task:${task.id}`,
          source: 'MANUAL' as const,
          taskId: task.id,
          title: task.title,
          detail: task.detail,
          dueDate: dbDateKey(task.dueDate),
          status: task.status,
          doneAt: task.doneAt,
          eventType: task.eventType,
          plants: plantRefs(task.plantIds),
          donePlants: [],
          products: [],
          planName: null,
          day: null,
        }));

        const tasks = [...preventionTasks, ...manualTasks].sort((a, b) => {
          if (a.status !== b.status) return a.status === TaskStatus.PENDING ? -1 : 1;
          return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
        });

        // Próximo: preventivo, cambio de semana de alimentación y tareas con fecha futura.
        const upcoming = [
          ...preventionBetween(plants, now, this.timeZone, 1, UPCOMING_PREVENTION_DAYS).map(
            (group) => ({
              date: group.date,
              source: 'PREVENCION' as const,
              title: this.preventionTitle(group),
              detail: group.notes,
              taskId: null,
            }),
          ),
          ...nextFeedingWeeks(plants, now, this.timeZone, UPCOMING_DAYS).map((change) => ({
            date: change.date,
            source: 'ALIMENTACION' as const,
            title: `Semana ${change.week}: ${productsLabel(change.products) || 'agua sola'}`,
            detail: [change.ph ? `pH ${decimal(change.ph)}` : null, change.ec ? `EC ${decimal(change.ec)}` : null]
              .filter(Boolean)
              .join(' · ') || null,
            taskId: null,
          })),
          ...section.tasks
            .filter((task) => {
              const due = dbDateKey(task.dueDate);
              return task.status === TaskStatus.PENDING && due && due > today && daysBetween(today, due) <= UPCOMING_DAYS;
            })
            .map((task) => ({
              date: dbDateKey(task.dueDate) as string,
              source: 'MANUAL' as const,
              title: task.title,
              detail: task.detail,
              taskId: task.id,
            })),
        ]
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, UPCOMING_LIMIT);

        const cycle = plants[0]?.cycle ?? null;

        return {
          section: {
            id: section.id,
            name: section.name,
            lightsOn: section.lightsOn,
            lightsOff: section.lightsOff,
            effectiveStage: stage,
          },
          cycle: cycle
            ? {
                id: cycle.id,
                name: cycle.name,
                startDate: cycle.startDate,
                day: daysBetween(calendarDateKey(cycle.startDate, this.timeZone), today) + 1,
              }
            : null,
          plants: plants.map((plant) => ({ id: plant.id, tagCode: plant.tagCode, stage: plant.stage })),
          sensor: sensor ? { id: sensor.id, name: sensor.name, readingsEnabled: sensor.readingsEnabled } : null,
          periods: periodBlocks,
          photo:
            camera && photo && typeof (photo.data as Record<string, unknown>)?.filename === 'string'
              ? {
                  deviceId: camera.id,
                  filename: (photo.data as Record<string, unknown>).filename as string,
                  takenAt: photo.createdAt,
                }
              : null,
          lastWatering,
          feeding,
          tasks,
          upcoming,
        };
      }),
    );

    return { date: today, timeZone: this.timeZone, generatedAt: now, sections: blocks };
  }

  /**
   * Carpas con plantas de un ciclo activo, con dispositivos, automatizaciones, tareas y planes.
   * La base está lejos (~280 ms por consulta) y un `include` anidado va nivel por nivel: acá cada
   * tabla sale en su propia consulta, todas a la vez, y las relaciones se arman en memoria.
   */
  private async loadActiveSections(userId: string | undefined, todayStart: Date) {
    const sectionWhere: Prisma.SectionWhereInput = {
      ...(userId ? { room: { userId } } : {}),
      plants: { some: { cycle: { status: CycleStatus.ACTIVE } } },
    };

    const [sections, devices, automations, tasks, plants, ranges] = await Promise.all([
      this.prisma.section.findMany({ where: sectionWhere, orderBy: { createdAt: 'asc' } }),
      this.prisma.device.findMany({
        where: { section: sectionWhere },
        orderBy: [{ primarySensor: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.automation.findMany({ where: { section: sectionWhere }, select: AUTOMATION_SELECT }),
      this.prisma.task.findMany({
        where: {
          section: sectionWhere,
          OR: [{ status: TaskStatus.PENDING }, { status: TaskStatus.DONE, doneAt: { gte: todayStart } }],
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      }),
      this.loadPlanPlants({ cycle: { status: CycleStatus.ACTIVE }, section: sectionWhere }),
      this.prisma.stageRange.findMany(),
    ]);

    return {
      ranges,
      sections: sections.map((section) => ({
        ...section,
        devices: devices.filter((device) => device.sectionId === section.id),
        automations: automations.filter((automation) => automation.sectionId === section.id),
        tasks: tasks.filter((task) => task.sectionId === section.id),
        plants: plants.filter((plant) => plant.sectionId === section.id),
      })),
    };
  }

  /** Plantas con su ciclo y sus planes de alimentación y prevención, en consultas paralelas. */
  private async loadPlanPlants(where: Prisma.PlantWhereInput): Promise<SectionPlant[]> {
    const [plants, cycles, feedingAssignments, feedingPlans, preventionAssignments, preventionPlans] =
      await Promise.all([
        this.prisma.plant.findMany({ where, orderBy: { tagCode: 'asc' } }),
        this.prisma.cycle.findMany({ where: { plants: { some: where } } }),
        this.prisma.plantFeedingPlan.findMany({ where: { plant: where } }),
        this.prisma.feedingPlan.findMany({
          where: { plants: { some: { plant: where } } },
          include: { weeks: true },
        }),
        this.prisma.plantPreventionPlan.findMany({ where: { plant: where } }),
        this.prisma.preventionPlan.findMany({
          where: { plants: { some: { plant: where } } },
          include: { applications: true },
        }),
      ]);

    const cycleOf = new Map(cycles.map((cycle) => [cycle.id, cycle]));
    const feedingOf = new Map(feedingPlans.map((plan) => [plan.id, plan]));
    const preventionOf = new Map(preventionPlans.map((plan) => [plan.id, plan]));

    return plants.map((plant) => ({
      ...plant,
      cycle: cycleOf.get(plant.cycleId) as SectionPlant['cycle'],
      feedingPlans: feedingAssignments
        .filter((assignment) => assignment.plantId === plant.id && feedingOf.has(assignment.feedingPlanId))
        .map((assignment) => ({ ...assignment, feedingPlan: feedingOf.get(assignment.feedingPlanId)! })),
      preventionPlans: preventionAssignments
        .filter((assignment) => assignment.plantId === plant.id && preventionOf.has(assignment.preventionPlanId))
        .map((assignment) => ({ ...assignment, preventionPlan: preventionOf.get(assignment.preventionPlanId)! })),
    }));
  }

  private preventionTitle(group: PreventionGroup): string {
    const kind = APPLICATION_LABEL[group.applicationType ?? ''] ?? 'Aplicación';
    const target = group.target ? ` (${TARGET_LABEL[group.target] ?? group.target.toLowerCase()})` : '';
    return `${kind}: ${productsLabel(group.products) || 'sin productos'}${target}`;
  }

  // ============================================
  // TAREAS MANUALES
  // ============================================

  private async assertSection(sectionId: string, userId?: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { room: true, plants: { select: { id: true, cycleId: true } } },
    });
    if (!section) throw new NotFoundException(`Carpa ${sectionId} no encontrada`);
    if (userId && section.room?.userId && section.room.userId !== userId) {
      throw new ForbiddenException('No tenés acceso a esta carpa');
    }
    return section;
  }

  private assertPlantsInSection(plantIds: string[] | undefined, section: { plants: { id: string }[] }) {
    if (!plantIds?.length) return;
    const allowed = new Set(section.plants.map((plant) => plant.id));
    const outside = plantIds.filter((id) => !allowed.has(id));
    if (outside.length) {
      throw new BadRequestException(`Plantas fuera de la carpa: ${outside.join(', ')}`);
    }
  }

  private async findTask(id: string, userId?: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException(`Tarea ${id} no encontrada`);
    const section = await this.assertSection(task.sectionId, userId);
    return { task, section };
  }

  async createTask(dto: CreateTaskDto, userId?: string) {
    const section = await this.assertSection(dto.sectionId, userId);
    this.assertPlantsInSection(dto.plantIds, section);
    return this.prisma.task.create({
      data: {
        sectionId: dto.sectionId,
        title: dto.title.trim(),
        detail: dto.detail?.trim() || null,
        dueDate: dto.dueDate ? dateKeyToDb(dto.dueDate) : null,
        plantIds: dto.plantIds ?? [],
        eventType: dto.eventType ?? null,
        userId: userId ?? null,
      },
    });
  }

  async updateTask(id: string, dto: UpdateTaskDto, userId?: string) {
    const { task, section } = await this.findTask(id, userId);
    if (task.status === TaskStatus.DONE) {
      throw new BadRequestException('La tarea ya está hecha y su evento quedó en la bitácora');
    }
    if (dto.sectionId && dto.sectionId !== task.sectionId) {
      throw new BadRequestException('Una tarea no cambia de carpa');
    }
    this.assertPlantsInSection(dto.plantIds, section);

    return this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.detail !== undefined ? { detail: dto.detail?.trim() || null } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate ? dateKeyToDb(dto.dueDate) : null } : {}),
        ...(dto.plantIds !== undefined ? { plantIds: dto.plantIds } : {}),
        ...(dto.eventType !== undefined ? { eventType: dto.eventType } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  async deleteTask(id: string, userId?: string) {
    await this.findTask(id, userId);
    await this.prisma.task.delete({ where: { id } });
    return { id, deleted: true };
  }

  /**
   * Marca la tarea hecha. Con `eventType` escribe ese evento en cada planta de la tarea o, sin
   * plantas, en la carpa; todo en una transacción para no dejar la tarea hecha sin su evento.
   */
  async completeTask(id: string, dto: CompleteTaskDto, userId?: string) {
    const { task, section } = await this.findTask(id, userId);
    if (task.status === TaskStatus.DONE) {
      throw new BadRequestException('La tarea ya está hecha');
    }

    const note = dto.note?.trim() || null;
    const content = [task.title, task.detail, note].filter(Boolean).join(' · ');
    const cycleOf = new Map(section.plants.map((plant) => [plant.id, plant.cycleId]));
    const sectionCycle = section.plants[0]?.cycleId ?? null;

    return this.prisma.$transaction(async (tx) => {
      const eventIds: string[] = [];
      if (task.eventType) {
        const targets = task.plantIds.length ? task.plantIds : [null];
        for (const plantId of targets) {
          const event = await tx.event.create({
            data: {
              type: task.eventType,
              plantId,
              cycleId: plantId ? cycleOf.get(plantId) ?? sectionCycle : sectionCycle,
              sectionId: section.id,
              data: { content, notes: note, taskId: task.id, tags: ['tarea'] },
            },
          });
          eventIds.push(event.id);
        }
      }
      return tx.task.update({
        where: { id: task.id },
        data: { status: TaskStatus.DONE, doneAt: new Date(), eventIds },
      });
    });
  }

  // ============================================
  // RIEGO Y PREVENTIVO
  // ============================================

  /** Un RIEGO por planta, con los datos del drenaje en `notes` para que se lean en la bitácora. */
  async registerWatering(dto: RegisterWateringDto, userId?: string) {
    const section = await this.assertSection(dto.sectionId, userId);
    if (!dto.plantIds.length) throw new BadRequestException('Elegí al menos una planta');
    this.assertPlantsInSection(dto.plantIds, section);
    const cycleOf = new Map(section.plants.map((plant) => [plant.id, plant.cycleId]));

    const drain = [
      dto.drainPh !== undefined ? `pH ${dto.drainPh}` : null,
      dto.drainEc !== undefined ? `EC ${dto.drainEc}` : null,
    ].filter(Boolean);
    const notes = [dto.notes?.trim(), drain.length ? `Drenaje: ${drain.join(' · ')}` : null]
      .filter(Boolean)
      .join(' · ');

    const data: Prisma.InputJsonValue = {
      ...(dto.ph !== undefined ? { ph: dto.ph } : {}),
      ...(dto.ec !== undefined ? { ec: dto.ec } : {}),
      ...(dto.liters !== undefined ? { liters: dto.liters } : {}),
      nutrients: (dto.nutrients ?? []).map((nutrient) => ({ name: nutrient.name, dose: nutrient.dose })),
      ...(notes ? { notes } : {}),
      ...(dto.drainPh !== undefined ? { drainPh: dto.drainPh } : {}),
      ...(dto.drainEc !== undefined ? { drainEc: dto.drainEc } : {}),
      ...(dto.taskKey ? { taskKey: dto.taskKey } : {}),
    };

    const events = await this.prisma.$transaction(
      dto.plantIds.map((plantId) =>
        this.prisma.event.create({
          data: { type: EventType.RIEGO, plantId, cycleId: cycleOf.get(plantId), sectionId: section.id, data },
        }),
      ),
    );
    return { created: events.length, eventIds: events.map((event) => event.id) };
  }

  /**
   * Registra la aplicación del preventivo de hoy como NOTA en cada planta del plan (no hay tipo
   * de evento foliar). La clave se recalcula acá: si ya no es la de hoy, no se registra.
   */
  async completePrevention(dto: CompletePreventionDto, userId?: string, now = new Date()) {
    const section = await this.assertSection(dto.sectionId, userId);
    const plants = await this.loadPlanPlants({ sectionId: section.id, cycle: { status: CycleStatus.ACTIVE } });

    const group = preventionBetween(plants, now, this.timeZone, 0, 0).find(
      (candidate) => candidate.key === dto.key,
    );
    if (!group) {
      throw new BadRequestException('Esa aplicación no corresponde a hoy');
    }

    const note = dto.note?.trim();
    const content = [
      `${this.preventionTitle(group)} · día ${group.day} de "${group.planName}"`,
      note,
    ]
      .filter(Boolean)
      .join(' · ');
    const cycleOf = new Map(plants.map((plant) => [plant.id, plant.cycleId]));

    const todayStart = startOfLocalDay(localDateKey(now, this.timeZone), this.timeZone);
    const already = await this.prisma.event.findMany({
      where: { type: EventType.NOTA, plantId: { in: group.plantIds }, createdAt: { gte: todayStart } },
      select: { plantId: true, data: true },
    });
    const done = new Set(
      already
        .filter((event) => (event.data as Record<string, unknown> | null)?.taskKey === group.key)
        .map((event) => event.plantId),
    );
    const pending = group.plantIds.filter((plantId) => !done.has(plantId));

    const events = await this.prisma.$transaction(
      pending.map((plantId) =>
        this.prisma.event.create({
          data: {
            type: EventType.NOTA,
            plantId,
            cycleId: cycleOf.get(plantId),
            sectionId: section.id,
            data: { content, tags: ['preventivo', (group.applicationType ?? 'aplicacion').toLowerCase()], taskKey: group.key },
          },
        }),
      ),
    );
    return { created: events.length, eventIds: events.map((event) => event.id) };
  }
}
