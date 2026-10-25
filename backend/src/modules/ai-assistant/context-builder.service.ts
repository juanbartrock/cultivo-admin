import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIContextType, AIMemoryType, DeviceType, ActionType, Connector } from '@prisma/client';

// ==================== INTERFACES ====================

/** Capacidades de una sección del sistema */
export interface SectionCapabilities {
  sectionId: string;
  sectionName: string;
  sensors: Array<{
    deviceId: string;
    deviceName: string;
    canMeasure: string[];
  }>;
  controllableDevices: Array<{
    deviceId: string;
    deviceName: string;
    type: string;
    supportedActions: string[];
    hasAutomation: boolean;
    automationNames: string[];
  }>;
  cameras: Array<{
    deviceId: string;
    deviceName: string;
    canCapture: boolean;
  }>;
  gaps: Array<{
    deviceId: string;
    deviceName: string;
    type: string;
    issue: 'no_automation' | 'automation_disabled' | 'partial_coverage';
    suggestion: string;
  }>;
}

/** Resumen de capacidades del sistema */
export interface SystemCapabilities {
  sections: SectionCapabilities[];
  summary: {
    totalControllableDevices: number;
    devicesWithAutomation: number;
    devicesWithoutAutomation: number;
    totalSensors: number;
  };
}

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
  /** Capacidades del sistema para proponer automatizaciones */
  capabilities?: SystemCapabilities;
}

@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);

  // Tipos de dispositivos que pueden ser controlados (ON/OFF)
  private readonly CONTROLLABLE_TYPES: DeviceType[] = [
    DeviceType.LUZ,
    DeviceType.EXTRACTOR,
    DeviceType.VENTILADOR,
    DeviceType.HUMIDIFICADOR,
    DeviceType.DESHUMIDIFICADOR,
    DeviceType.AIRE_ACONDICIONADO,
    DeviceType.BOMBA_RIEGO,
    DeviceType.CALEFACTOR,
    DeviceType.ENCHUFE,
  ];

  // Acciones soportadas por tipo de dispositivo
  private readonly ACTIONS_BY_TYPE: Record<DeviceType, ActionType[]> = {
    [DeviceType.SENSOR]: [],
    [DeviceType.LUZ]: [ActionType.TURN_ON, ActionType.TURN_OFF, ActionType.TOGGLE],
    [DeviceType.EXTRACTOR]: [ActionType.TURN_ON, ActionType.TURN_OFF, ActionType.TOGGLE],
    [DeviceType.VENTILADOR]: [ActionType.TURN_ON, ActionType.TURN_OFF, ActionType.TOGGLE],
    [DeviceType.HUMIDIFICADOR]: [ActionType.TURN_ON, ActionType.TURN_OFF, ActionType.TOGGLE],
    [DeviceType.DESHUMIDIFICADOR]: [ActionType.TURN_ON, ActionType.TURN_OFF, ActionType.TOGGLE],
    [DeviceType.AIRE_ACONDICIONADO]: [ActionType.TURN_ON, ActionType.TURN_OFF, ActionType.TOGGLE],
    [DeviceType.BOMBA_RIEGO]: [ActionType.TURN_ON, ActionType.TURN_OFF, ActionType.TRIGGER_IRRIGATION],
    [DeviceType.CALEFACTOR]: [ActionType.TURN_ON, ActionType.TURN_OFF, ActionType.TOGGLE],
    [DeviceType.CAMARA]: [ActionType.CAPTURE_PHOTO],
    [DeviceType.ENCHUFE]: [ActionType.TURN_ON, ActionType.TURN_OFF, ActionType.TOGGLE],
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Construye el contexto COMPLETO para enviar a OpenAI
   * @param contextType Tipo de contexto
   * @param contextId ID del contexto (opcional)
   * @param userId ID del usuario para filtrar datos (opcional)
   * @param includeCapabilities Si true, incluye análisis de capacidades para proponer automatizaciones
   */
  async buildContext(
    contextType: AIContextType,
    contextId?: string,
    userId?: string,
    includeCapabilities = false,
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

    // Obtener TODO el contexto de la aplicación (filtrado por userId si se proporciona)
    context.rooms = await this.getRoomsOverview(userId);
    context.allPlants = await this.getAllPlantsWithDetails(userId);
    context.feedingPlansDetailed = await this.getFeedingPlansDetailed(userId);
    context.preventionPlansDetailed = await this.getPreventionPlansDetailed(userId);
    context.automations = await this.getAllAutomations(userId);
    context.devices = await this.getAllDevices(userId);
    context.memories = await this.getRelevantMemories(contextType, contextId, userId);

    // Incluir capacidades del sistema si se solicita
    if (includeCapabilities && userId) {
      context.capabilities = await this.analyzeSystemCapabilities(userId);
    }

    return context;
  }

  /**
   * Obtiene resumen de salas y secciones
   */
  private async getRoomsOverview(userId?: string) {
    const rooms = await this.prisma.room.findMany({
      where: userId ? { userId } : undefined,
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
  private async getAllPlantsWithDetails(userId?: string) {
    const plants = await this.prisma.plant.findMany({
      where: userId ? { section: { room: { userId } } } : undefined,
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
      sectionName: plant.section?.name ?? 'Sin sección',
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
  private async getFeedingPlansDetailed(userId?: string) {
    const plans = await this.prisma.feedingPlan.findMany({
      where: userId ? { userId } : undefined,
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
  private async getPreventionPlansDetailed(userId?: string) {
    const plans = await this.prisma.preventionPlan.findMany({
      where: userId ? { userId } : undefined,
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
  private async getAllAutomations(userId?: string) {
    const automations = await this.prisma.automation.findMany({
      where: userId ? { section: { room: { userId } } } : undefined,
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
      actions: auto.actions.map((a) => `${a.actionType} ${a.device?.name || 'N/A'}${a.duration ? ` por ${a.duration}min` : ''}`),
    }));
  }

  /**
   * Obtiene TODOS los dispositivos
   */
  private async getAllDevices(userId?: string) {
    const devices = await this.prisma.device.findMany({
      where: userId ? { section: { room: { userId } } } : undefined,
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
  private async getRelevantMemories(contextType: AIContextType, contextId?: string, userId?: string) {
    const memories = await this.prisma.aIMemory.findMany({
      where: {
        ...(userId && { userId }),
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

  // ==================== ANÁLISIS DE CAPACIDADES ====================

  /**
   * Analiza las capacidades del sistema para saber qué puede automatizar la IA
   * Retorna información sobre sensores, dispositivos controlables y gaps
   */
  async analyzeSystemCapabilities(userId: string): Promise<SystemCapabilities> {
    // Obtener secciones con sus dispositivos y automatizaciones
    const sections = await this.prisma.section.findMany({
      where: { room: { userId } },
      include: {
        devices: true,
        automations: {
          where: {
            status: { in: ['ACTIVE', 'PAUSED'] },
          },
          include: {
            actions: { include: { device: true } },
            conditions: { include: { device: true } },
          },
        },
      },
    });

    const sectionCapabilities: SectionCapabilities[] = [];
    let totalControllable = 0;
    let withAutomation = 0;
    let withoutAutomation = 0;
    let totalSensors = 0;

    for (const section of sections) {
      // Mapear qué dispositivos ya tienen automatización
      const devicesWithAutomation = new Map<string, string[]>();

      for (const automation of section.automations) {
        for (const action of automation.actions) {
          if (action.deviceId) {
            const existing = devicesWithAutomation.get(action.deviceId) || [];
            existing.push(automation.name);
            devicesWithAutomation.set(action.deviceId, existing);
          }
        }
      }

      // Clasificar dispositivos
      const sensors: SectionCapabilities['sensors'] = [];
      const controllableDevices: SectionCapabilities['controllableDevices'] = [];
      const cameras: SectionCapabilities['cameras'] = [];
      const gaps: SectionCapabilities['gaps'] = [];

      for (const device of section.devices) {
        if (device.type === DeviceType.SENSOR) {
          totalSensors++;
          sensors.push({
            deviceId: device.id,
            deviceName: device.name,
            canMeasure: this.inferSensorCapabilities(device.connector, device.metadata),
          });
        } else if (device.type === DeviceType.CAMARA) {
          cameras.push({
            deviceId: device.id,
            deviceName: device.name,
            canCapture: true,
          });
        } else if (this.CONTROLLABLE_TYPES.includes(device.type)) {
          totalControllable++;
          const hasAuto = devicesWithAutomation.has(device.id);

          if (hasAuto) {
            withAutomation++;
          } else {
            withoutAutomation++;
            // Este es un GAP - dispositivo sin automatización
            gaps.push({
              deviceId: device.id,
              deviceName: device.name,
              type: device.type,
              issue: 'no_automation',
              suggestion: this.generateGapSuggestion(device.type, sensors),
            });
          }

          controllableDevices.push({
            deviceId: device.id,
            deviceName: device.name,
            type: device.type,
            supportedActions: this.ACTIONS_BY_TYPE[device.type]?.map(a => a.toString()) || [],
            hasAutomation: hasAuto,
            automationNames: devicesWithAutomation.get(device.id) || [],
          });
        }
      }

      sectionCapabilities.push({
        sectionId: section.id,
        sectionName: section.name,
        sensors,
        controllableDevices,
        cameras,
        gaps,
      });
    }

    return {
      sections: sectionCapabilities,
      summary: {
        totalControllableDevices: totalControllable,
        devicesWithAutomation: withAutomation,
        devicesWithoutAutomation: withoutAutomation,
        totalSensors,
      },
    };
  }

  /**
   * Infiere qué puede medir un sensor según su conector y metadata
   */
  private inferSensorCapabilities(connector: Connector, metadata: any): string[] {
    const capabilities: string[] = [];

    // La mayoría de sensores Sonoff/Tuya miden temp y humedad
    if (connector === Connector.SONOFF || connector === Connector.TUYA) {
      capabilities.push('temperature', 'humidity');
    }

    // Algunos sensores Tuya también miden CO2
    if (connector === Connector.TUYA && metadata?.hasCO2) {
      capabilities.push('co2');
    }

    // ESP32 puede medir varias cosas según configuración
    if (connector === Connector.ESP32) {
      capabilities.push('temperature', 'humidity');
    }

    return capabilities;
  }

  /**
   * Genera una sugerencia de automatización para un gap detectado
   */
  private generateGapSuggestion(type: DeviceType, sensors: SectionCapabilities['sensors']): string {
    const hasTempSensor = sensors.some(s => s.canMeasure.includes('temperature'));
    const hasHumiditySensor = sensors.some(s => s.canMeasure.includes('humidity'));

    switch (type) {
      case DeviceType.HUMIDIFICADOR:
        return hasHumiditySensor
          ? 'Podría automatizarse para encender cuando humedad < X%'
          : 'Necesita sensor de humedad para automatizar por condición, o usar horario';
      case DeviceType.DESHUMIDIFICADOR:
        return hasHumiditySensor
          ? 'Podría automatizarse para encender cuando humedad > X%'
          : 'Necesita sensor de humedad para automatizar por condición, o usar horario';
      case DeviceType.EXTRACTOR:
        return hasTempSensor
          ? 'Podría automatizarse para control de temperatura o renovación de aire'
          : 'Podría automatizarse con horario fijo para renovación de aire';
      case DeviceType.VENTILADOR:
        return hasTempSensor
          ? 'Podría automatizarse para circulación de aire según temperatura'
          : 'Podría automatizarse con horario fijo para circulación';
      case DeviceType.CALEFACTOR:
        return hasTempSensor
          ? 'Podría automatizarse para encender cuando temperatura < X°C'
          : 'Necesita sensor de temperatura para automatizar por condición';
      case DeviceType.LUZ:
        return 'Podría automatizarse con fotoperiodo (rango horario de encendido/apagado)';
      case DeviceType.BOMBA_RIEGO:
        return 'Podría automatizarse con horarios o intervalos de riego';
      case DeviceType.AIRE_ACONDICIONADO:
        return hasTempSensor
          ? 'Podría automatizarse para control de clima cuando temperatura > X°C'
          : 'Necesita sensor de temperatura para automatizar por condición';
      case DeviceType.ENCHUFE:
        return 'Podría automatizarse con horario fijo de encendido y apagado';
      default:
        return 'Dispositivo controlable sin automatización';
    }
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

    // Agregar sección de capacidades si está disponible
    if (context.capabilities) {
      prompt += this.buildCapabilitiesPrompt(context.capabilities);
    }

    return prompt;
  }

  /**
   * Construye la sección del prompt que describe las capacidades del sistema
   * Esto le dice al LLM qué puede y qué no puede automatizar
   */
  buildCapabilitiesPrompt(capabilities: SystemCapabilities): string {
    let prompt = `
## 🎛️ CAPACIDADES DEL SISTEMA (Lo que PUEDES automatizar)

### Resumen Global
- Dispositivos controlables: ${capabilities.summary.totalControllableDevices}
- Ya automatizados: ${capabilities.summary.devicesWithAutomation}
- SIN automatización: ${capabilities.summary.devicesWithoutAutomation} ${capabilities.summary.devicesWithoutAutomation > 0 ? '⚠️' : '✅'}
- Sensores disponibles: ${capabilities.summary.totalSensors}

### Por Sección
`;

    for (const section of capabilities.sections) {
      prompt += `
**${section.sectionName}:**

📊 SENSORES (para usar como CONDICIONES):
${section.sensors.length > 0
  ? section.sensors.map(s => `  - ${s.deviceName} [ID: ${s.deviceId}]: mide ${s.canMeasure.join(', ')}`).join('\n')
  : '  - ❌ Sin sensores - SOLO puedes crear automatizaciones por HORARIO en esta sección'}

🎛️ DISPOSITIVOS CONTROLABLES:
${section.controllableDevices.length > 0
  ? section.controllableDevices.map(d => {
      const autoStatus = d.hasAutomation
        ? `✅ Ya automatizado (${d.automationNames.join(', ')})`
        : '⚠️ SIN automatización';
      return `  - ${d.deviceName} [ID: ${d.deviceId}] (${d.type}): ${autoStatus}
      Acciones posibles: ${d.supportedActions.join(', ')}`;
    }).join('\n')
  : '  - ❌ Sin dispositivos controlables en esta sección'}

📸 CÁMARAS:
${section.cameras.length > 0
  ? section.cameras.map(c => `  - ${c.deviceName} [ID: ${c.deviceId}]: puede CAPTURE_PHOTO`).join('\n')
  : '  - Sin cámaras'}

⚠️ OPORTUNIDADES DE AUTOMATIZACIÓN (GAPS):
${section.gaps.length > 0
  ? section.gaps.map(g => `  - ${g.deviceName} [ID: ${g.deviceId}]: ${g.suggestion}`).join('\n')
  : '  - ✅ Todos los dispositivos tienen automatización'}
`;
    }

    prompt += `
### 📋 REGLAS PARA PROPONER AUTOMATIZACIONES
1. SOLO puedes proponer automatizaciones para dispositivos listados en "DISPOSITIVOS CONTROLABLES"
2. SOLO puedes usar condiciones de sensores listados en "SENSORES"
3. Si NO hay sensor de temperatura en una sección, NO propongas condiciones de temperatura para esa sección
4. Si NO hay sensor de humedad en una sección, NO propongas condiciones de humedad para esa sección
5. Las automatizaciones por HORARIO (SCHEDULED) no requieren sensores
6. Si un dispositivo ya tiene automatización, evalúa si realmente necesita otra o si la existente es suficiente
7. USA los IDs de dispositivos proporcionados, no inventes IDs
8. Prioriza cubrir los GAPS identificados antes de duplicar automatizaciones existentes
`;

    return prompt;
  }
}
