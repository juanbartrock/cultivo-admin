import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIContextType, AIMemoryType } from '@prisma/client';

interface FullContext {
  rooms: Array<{
    id: string;
    name: string;
    sections: Array<{
      id: string;
      name: string;
      dimensions?: string;
      plantsCount: number;
      devicesCount: number;
    }>;
  }>;
  allPlants: Array<{
    id: string;
    tagCode: string;
    strain: string;
    strainType: string;
    stage: string;
    healthStatus: string;
    sectionName: string;
    cycleName: string;
    daysInStage: number;
    startDate?: string;
    feedingPlans: Array<{
      planName: string;
      currentWeek: number;
      stageStartDate: string;
    }>;
    preventionPlans: Array<{
      planName: string;
      planId: string;
      currentDay: number;
      startDate: string;
    }>;
  }>;
  feedingPlansDetailed: Array<{
    id: string;
    name: string;
    description?: string;
    stage: string;
    assignedPlants: string[];
    weeks: Array<{
      weekNumber: number;
      ph?: number;
      ec?: number;
      notes?: string;
      products: Array<{ name: string; dose: string; unit: string }>;
    }>;
  }>;
  preventionPlansDetailed: Array<{
    id: string;
    name: string;
    description?: string;
    stage: string;
    totalDays: number;
    assignedPlants: string[];
    applications: Array<{
      dayNumber: number;
      applicationType?: string;
      target?: string;
      notes?: string;
      products: Array<{ name: string; dose: string; unit: string }>;
    }>;
  }>;
  automations: Array<{
    id: string;
    name: string;
    description?: string;
    sectionName: string;
    status: string;
    triggerType: string;
    conditions: string[];
    actions: string[];
  }>;
  devices: Array<{
    id: string;
    name: string;
    type: string;
    sectionName?: string;
    connector: string;
  }>;
  memories: Array<{
    type: string;
    summary: string;
    importance: number;
  }>;
}

@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Construye el contexto COMPLETO para enviar a OpenAI
   */
  async buildContext(
    contextType: AIContextType,
    contextId?: string,
  ): Promise<FullContext> {
    const context: FullContext = {
      rooms: [],
      allPlants: [],
      feedingPlansDetailed: [],
      preventionPlansDetailed: [],
      automations: [],
      devices: [],
      memories: [],
    };

    // Obtener TODO el contexto de la aplicación
    context.rooms = await this.getRoomsOverview();
    context.allPlants = await this.getAllPlantsWithDetails();
    context.feedingPlansDetailed = await this.getFeedingPlansDetailed();
    context.preventionPlansDetailed = await this.getPreventionPlansDetailed();
    context.automations = await this.getAllAutomations();
    context.devices = await this.getAllDevices();
    context.memories = await this.getRelevantMemories(contextType, contextId);

    return context;
  }

  /**
   * Obtiene resumen de salas y secciones
   */
  private async getRoomsOverview() {
    const rooms = await this.prisma.room.findMany({
      include: {
        sections: {
          include: {
            _count: {
              select: {
                plants: true,
                devices: true,
              },
            },
          },
        },
      },
    });

    return rooms.map((room) => ({
      id: room.id,
      name: room.name,
      sections: room.sections.map((section) => ({
        id: section.id,
        name: section.name,
        dimensions: section.dimensions || undefined,
        plantsCount: section._count.plants,
        devicesCount: section._count.devices,
      })),
    }));
  }

  /**
   * Obtiene TODAS las plantas con detalles completos
   */
  private async getAllPlantsWithDetails() {
    const plants = await this.prisma.plant.findMany({
      include: {
        strain: true,
        section: true,
        cycle: true,
        feedingPlans: {
          include: {
            feedingPlan: true,
          },
        },
        preventionPlans: {
          include: {
            preventionPlan: true,
          },
        },
      },
    });

    return plants.map((plant) => ({
      id: plant.id,
      tagCode: plant.tagCode,
      strain: plant.strain.name,
      strainType: plant.strain.type,
      stage: plant.stage,
      healthStatus: plant.healthStatus,
      sectionName: plant.section.name,
      cycleName: plant.cycle.name,
      daysInStage: plant.stageStartDate
        ? Math.floor((Date.now() - plant.stageStartDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0,
      startDate: plant.startDate?.toISOString(),
      feedingPlans: plant.feedingPlans.map((pfp) => {
        const daysSinceStart = pfp.stageStartDate
          ? Math.floor((Date.now() - pfp.stageStartDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        return {
          planName: pfp.feedingPlan.name,
          currentWeek: Math.floor(daysSinceStart / 7) + 1,
          stageStartDate: pfp.stageStartDate.toISOString(),
        };
      }),
      preventionPlans: plant.preventionPlans.map((ppp) => {
        const daysSinceStart = ppp.startDate
          ? Math.floor((Date.now() - ppp.startDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        return {
          planName: ppp.preventionPlan.name,
          planId: ppp.preventionPlan.id,
          currentDay: (daysSinceStart % ppp.preventionPlan.totalDays) + 1,
          startDate: ppp.startDate.toISOString(),
        };
      }),
    }));
  }

  /**
   * Obtiene TODOS los planes de alimentación con detalles completos
   */
  private async getFeedingPlansDetailed() {
    const plans = await this.prisma.feedingPlan.findMany({
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
        },
        plants: {
          include: {
            plant: true,
          },
        },
      },
    });

    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description || undefined,
      stage: plan.stage,
      assignedPlants: plan.plants.map((p) => p.plant.tagCode),
      weeks: plan.weeks.map((week) => ({
        weekNumber: week.weekNumber,
        ph: week.ph || undefined,
        ec: week.ec || undefined,
        notes: week.notes || undefined,
        products: (week.products as Array<{ name: string; dose: string; unit: string }>) || [],
      })),
    }));
  }

  /**
   * Obtiene TODOS los planes de prevención con detalles completos
   */
  private async getPreventionPlansDetailed() {
    const plans = await this.prisma.preventionPlan.findMany({
      include: {
        applications: {
          orderBy: { dayNumber: 'asc' },
        },
        plants: {
          include: {
            plant: true,
          },
        },
      },
    });

    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description || undefined,
      stage: plan.stage,
      totalDays: plan.totalDays,
      assignedPlants: plan.plants.map((p) => p.plant.tagCode),
      applications: plan.applications.map((app) => ({
        dayNumber: app.dayNumber,
        applicationType: app.applicationType || undefined,
        target: app.target || undefined,
        notes: app.notes || undefined,
        products: (app.products as Array<{ name: string; dose: string; unit: string }>) || [],
      })),
    }));
  }

  /**
   * Obtiene TODAS las automatizaciones
   */
  private async getAllAutomations() {
    const automations = await this.prisma.automation.findMany({
      include: {
        section: true,
        conditions: {
          include: { device: true },
        },
        actions: {
          include: { device: true },
        },
      },
    });

    return automations.map((auto) => ({
      id: auto.id,
      name: auto.name,
      description: auto.description || undefined,
      sectionName: auto.section.name,
      status: auto.status,
      triggerType: auto.triggerType,
      conditions: auto.conditions.map(
        (c) => `${c.device.name} ${c.property} ${c.operator} ${c.value}${c.valueMax ? `-${c.valueMax}` : ''}`,
      ),
      actions: auto.actions.map((a) => `${a.actionType} ${a.device.name}${a.duration ? ` por ${a.duration}min` : ''}`),
    }));
  }

  /**
   * Obtiene TODOS los dispositivos
   */
  private async getAllDevices() {
    const devices = await this.prisma.device.findMany({
      include: {
        section: true,
      },
    });

    return devices.map((device) => ({
      id: device.id,
      name: device.name,
      type: device.type,
      sectionName: device.section?.name,
      connector: device.connector,
    }));
  }

  /**
   * Obtiene memorias relevantes para el contexto actual
   */
  private async getRelevantMemories(contextType: AIContextType, contextId?: string) {
    const memories = await this.prisma.aIMemory.findMany({
      where: {
        OR: [
          { type: AIMemoryType.CONVERSATION },
          ...(contextId ? [{ contextId }] : []),
        ],
      },
      orderBy: [{ importance: 'desc' }, { updatedAt: 'desc' }],
      take: 10,
    });

    return memories.map((memory) => ({
      type: memory.type,
      summary: memory.summary,
      importance: memory.importance,
    }));
  }

  /**
   * Genera el prompt del sistema con el contexto COMPLETO
   */
  buildSystemPrompt(context: FullContext): string {
    let prompt = `Eres un consultor experto en cultivo indoor de cannabis. Tienes acceso COMPLETO al sistema de gestión del usuario.

## TU ROL
- Experto en cultivo de cannabis indoor
- Conocedor de nutrición vegetal, control de plagas/hongos, automatización
- Asesor en tecnología IoT para cultivo
- Siempre basas tus respuestas en datos y evidencia científica

## REGLAS
- Responde siempre en español
- Sé conciso pero completo
- SIEMPRE usa los datos del contexto para responder - tienes acceso a todo
- Si ves problemas potenciales, menciónalos proactivamente
- Refiere a datos específicos cuando sea relevante

## CONTEXTO COMPLETO DEL SISTEMA

### Espacios de Cultivo
${context.rooms.length > 0
  ? context.rooms.map((room) =>
      `**${room.name}:**
${room.sections.map((s) => `  - ${s.name} (${s.dimensions || 'sin dims'}): ${s.plantsCount} plantas, ${s.devicesCount} dispositivos`).join('\n')}`
    ).join('\n\n')
  : 'No hay espacios configurados'}

### Todas las Plantas (${context.allPlants.length} total)
${context.allPlants.map((p) =>
  `- **${p.tagCode}** (${p.strain}, ${p.strainType}): ${p.stage} (${p.daysInStage} días), salud: ${p.healthStatus}, sección: ${p.sectionName}, ciclo: ${p.cycleName}${
    p.preventionPlans.length > 0
      ? `\n  Planes prevención: ${p.preventionPlans.map((pp) => `${pp.planName} (día ${pp.currentDay})`).join(', ')}`
      : ''
  }${
    p.feedingPlans.length > 0
      ? `\n  Planes alimentación: ${p.feedingPlans.map((fp) => `${fp.planName} (semana ${fp.currentWeek})`).join(', ')}`
      : ''
  }`
).join('\n')}

### Planes de Prevención (${context.preventionPlansDetailed.length} total)
${context.preventionPlansDetailed.map((pp) =>
  `**${pp.name}** (${pp.stage}, ciclo ${pp.totalDays} días)
  Plantas asignadas: ${pp.assignedPlants.length > 0 ? pp.assignedPlants.join(', ') : 'ninguna'}
  ${pp.description ? `Descripción: ${pp.description}` : ''}
  Aplicaciones:
${pp.applications.map((app) =>
  `    Día ${app.dayNumber}: ${app.products.map((p) => `${p.name} ${p.dose}${p.unit}`).join(', ')}${app.applicationType ? ` (${app.applicationType})` : ''}${app.target ? ` - Target: ${app.target}` : ''}${app.notes ? ` - Nota: ${app.notes}` : ''}`
).join('\n')}`
).join('\n\n')}

### Planes de Alimentación (${context.feedingPlansDetailed.length} total)
${context.feedingPlansDetailed.map((fp) =>
  `**${fp.name}** (${fp.stage})
  Plantas asignadas: ${fp.assignedPlants.length > 0 ? fp.assignedPlants.join(', ') : 'ninguna'}
  Semanas:
${fp.weeks.map((w) =>
  `    Semana ${w.weekNumber}: ${w.products.map((p) => `${p.name} ${p.dose}${p.unit}`).join(', ')}${w.ph ? ` | pH: ${w.ph}` : ''}${w.ec ? ` | EC: ${w.ec}` : ''}${w.notes ? ` | ${w.notes}` : ''}`
).join('\n')}`
).join('\n\n')}

### Automatizaciones (${context.automations.length} total)
${context.automations.map((a) =>
  `- **${a.name}** (${a.sectionName}): ${a.status}, tipo: ${a.triggerType}${a.description ? ` - ${a.description}` : ''}
    Condiciones: ${a.conditions.join(', ') || 'ninguna'}
    Acciones: ${a.actions.join(', ')}`
).join('\n')}

### Dispositivos (${context.devices.length} total)
${context.devices.map((d) =>
  `- ${d.name} (${d.type}): ${d.sectionName || 'sin asignar'}, conector: ${d.connector}`
).join('\n')}
`;

    if (context.memories.length > 0) {
      prompt += `
### Memorias y Conocimiento Previo
${context.memories.map((m) => `- [${m.type}] ${m.summary}`).join('\n')}
`;
    }

    return prompt;
  }
}
