import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AnalysisType, EventType, NotificationPriority, NotificationType } from '@prisma/client';

interface AnalysisConfig {
  analysisType: AnalysisType;
  includePhotos: boolean;
  includeFeedingPlans: boolean;
  includePreventionPlans: boolean;
  includeEvents: boolean;
  customPrompt?: string;
}

interface PlantData {
  plant: {
    id: string;
    tagCode: string;
    stage: string;
    healthStatus: string;
    startDate?: Date;
    stageStartDate?: Date;
    notes?: string;
    potSizeFinal?: string;
  };
  strain: {
    name: string;
    type: string;
    floweringDaysExpected?: number;
  };
  section?: {
    name: string;
    dimensions?: string;
  };
  cycle: {
    name: string;
    startDate: Date;
  };
  photos: Array<{
    url: string;
    caption?: string;
    date: Date;
  }>;
  feedingPlans: Array<{
    planName: string;
    currentWeek: number;
    weekData?: {
      products: Array<{ name: string; dose: string; unit: string }>;
      ph?: number;
      ec?: number;
    };
  }>;
  preventionPlans: Array<{
    planName: string;
    currentDay: number;
    applicationData?: {
      products: Array<{ name: string; dose: string; unit: string }>;
      applicationType?: string;
      target?: string;
    };
  }>;
  recentEvents: Array<{
    type: string;
    date: Date;
    data: unknown;
  }>;
  daysInStage: number;
  totalDays: number;
}

interface AnalysisResult {
  success: boolean;
  eventId?: string;
  analysis?: string;
  summary?: string;
  recommendations?: string[];
  error?: string;
}

@Injectable()
export class PlantAnalysisService {
  private readonly logger = new Logger(PlantAnalysisService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Ejecuta análisis IA de una planta
   */
  async analyzePlant(params: {
    plantId: string;
    automationId?: string;
    automationName?: string;
    config: AnalysisConfig;
    userId?: string;
  }): Promise<AnalysisResult> {
    const { plantId, automationId, automationName, config, userId } = params;

    try {
      this.logger.log(`Starting ${config.analysisType} analysis for plant ${plantId}`);

      // 1. Recopilar información de la planta
      const plantData = await this.gatherPlantData(plantId, config);

      if (!plantData) {
        return { success: false, error: 'Plant not found' };
      }

      // 2. Construir prompt según tipo de análisis
      const prompt = this.buildAnalysisPrompt(plantData, config);

      // 3. Preparar imágenes si están incluidas
      const imageUrls = config.includePhotos ? plantData.photos.map(p => p.url).slice(0, 5) : [];

      // 4. Enviar al LLM (OpenAI)
      const analysis = await this.callLLM(prompt, imageUrls);

      if (!analysis) {
        return { success: false, error: 'Failed to get analysis from LLM' };
      }

      // 5. Parsear la respuesta
      const parsedAnalysis = this.parseAnalysisResponse(analysis);

      // 6. Guardar como evento de tipo AI_ANALYSIS en la planta
      const event = await this.saveAnalysisEvent(
        plantId,
        parsedAnalysis,
        config,
        automationId,
        automationName,
        plantData,
      );

      // 7. Crear notificación si hay problemas detectados
      if (parsedAnalysis.recommendations && parsedAnalysis.recommendations.length > 0) {
        await this.createAnalysisNotification(
          plantData.plant.tagCode,
          parsedAnalysis,
          config.analysisType,
          userId,
        );
      }

      this.logger.log(`Analysis completed for plant ${plantId}: ${parsedAnalysis.summary}`);

      return {
        success: true,
        eventId: event.id,
        analysis: parsedAnalysis.fullAnalysis,
        summary: parsedAnalysis.summary,
        recommendations: parsedAnalysis.recommendations,
      };
    } catch (error) {
      this.logger.error(`Error analyzing plant ${plantId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Recopila toda la información de la planta según la configuración
   */
  private async gatherPlantData(plantId: string, config: AnalysisConfig): Promise<PlantData | null> {
    const plant = await this.prisma.plant.findUnique({
      where: { id: plantId },
      include: {
        strain: true,
        section: true,
        cycle: true,
        feedingPlans: {
          include: {
            feedingPlan: {
              include: { weeks: true },
            },
          },
        },
        preventionPlans: {
          include: {
            preventionPlan: {
              include: { applications: true },
            },
          },
        },
      },
    });

    if (!plant) {
      return null;
    }

    // Obtener fotos recientes
    let photos: PlantData['photos'] = [];
    if (config.includePhotos) {
      const photoEvents = await this.prisma.event.findMany({
        where: {
          plantId,
          type: EventType.FOTO,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      photos = photoEvents.map(event => {
        const data = event.data as { url?: string; caption?: string };
        return {
          url: data.url || '',
          caption: data.caption,
          date: event.createdAt,
        };
      }).filter(p => p.url);
    }

    // Obtener eventos recientes
    let recentEvents: PlantData['recentEvents'] = [];
    if (config.includeEvents) {
      const events = await this.prisma.event.findMany({
        where: { plantId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      recentEvents = events.map(event => ({
        type: event.type,
        date: event.createdAt,
        data: event.data,
      }));
    }

    // Calcular días en etapa y totales
    const daysInStage = plant.stageStartDate
      ? Math.floor((Date.now() - plant.stageStartDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const totalDays = plant.startDate
      ? Math.floor((Date.now() - plant.startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Procesar planes de alimentación
    const feedingPlans: PlantData['feedingPlans'] = config.includeFeedingPlans
      ? plant.feedingPlans.map(pfp => {
          const daysSinceStart = pfp.stageStartDate
            ? Math.floor((Date.now() - pfp.stageStartDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          const currentWeek = Math.floor(daysSinceStart / 7) + 1;
          const weekData = pfp.feedingPlan.weeks.find((w) => w.weekNumber === currentWeek);

          return {
            planName: pfp.feedingPlan.name,
            currentWeek,
            weekData: weekData
              ? {
                  products: weekData.products as Array<{ name: string; dose: string; unit: string }>,
                  ph: weekData.ph ?? undefined,
                  ec: weekData.ec ?? undefined,
                }
              : undefined,
          };
        })
      : [];

    // Procesar planes de prevención
    const preventionPlans: PlantData['preventionPlans'] = config.includePreventionPlans
      ? plant.preventionPlans.map(ppp => {
          const daysSinceStart = ppp.startDate
            ? Math.floor((Date.now() - ppp.startDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          const currentDay = (daysSinceStart % ppp.preventionPlan.totalDays) + 1;
          const appData = ppp.preventionPlan.applications.find((a) => a.dayNumber === currentDay);

          return {
            planName: ppp.preventionPlan.name,
            currentDay,
            applicationData: appData
              ? {
                  products: appData.products as Array<{ name: string; dose: string; unit: string }>,
                  applicationType: appData.applicationType ?? undefined,
                  target: appData.target ?? undefined,
                }
              : undefined,
          };
        })
      : [];

    return {
      plant: {
        id: plant.id,
        tagCode: plant.tagCode,
        stage: plant.stage,
        healthStatus: plant.healthStatus,
        startDate: plant.startDate ?? undefined,
        stageStartDate: plant.stageStartDate ?? undefined,
        notes: plant.notes ?? undefined,
        potSizeFinal: plant.potSizeFinal ?? undefined,
      },
      strain: {
        name: plant.strain.name,
        type: plant.strain.type,
        floweringDaysExpected: plant.strain.floweringDaysExpected ?? undefined,
      },
      section: plant.section ? {
        name: plant.section.name,
        dimensions: plant.section.dimensions ?? undefined,
      } : undefined,
      cycle: {
        name: plant.cycle.name,
        startDate: plant.cycle.startDate,
      },
      photos,
      feedingPlans,
      preventionPlans,
      recentEvents,
      daysInStage,
      totalDays,
    };
  }

  /**
   * Construye el prompt para el LLM según el tipo de análisis
   */
  private buildAnalysisPrompt(data: PlantData, config: AnalysisConfig): string {
    const analysisPrompts: Record<AnalysisType, string> = {
      NUTRICION: `Analiza el estado nutricional de esta planta de cannabis. Evalúa:
- Coloración de las hojas (amarillamiento, manchas, puntas quemadas)
- Signos de deficiencias o excesos de nutrientes
- Compatibilidad del plan de alimentación actual con la etapa
- pH y EC recomendados vs actuales`,

      PREVENCION: `Evalúa el estado fitosanitario de esta planta. Analiza:
- Signos de plagas (ácaros, trips, mosca blanca, pulgones)
- Signos de hongos (oídio, botrytis, fusarium)
- Estrés ambiental
- Efectividad del plan de prevención actual`,

      VEGETATIVO: `Analiza el desarrollo vegetativo de esta planta. Evalúa:
- Estructura y ramificación
- Vigor general
- Espaciado internodal
- Desarrollo de raíces (si visible)
- Técnicas de entrenamiento recomendadas (LST, topping, etc.)`,

      FLORACION: `Evalúa el desarrollo en floración de esta planta. Analiza:
- Desarrollo de cogollos
- Densidad de tricomas
- Coloración de pistilos
- Estimación de madurez
- Tiempo estimado hasta cosecha`,

      GENERAL: `Realiza un análisis general completo del estado de esta planta. Evalúa:
- Estado de salud general
- Nutrición
- Signos de plagas/enfermedades
- Desarrollo según su etapa
- Recomendaciones de mejora`,
    };

    let prompt = `# Análisis de Planta: ${data.plant.tagCode}

## Tipo de Análisis
${analysisPrompts[config.analysisType]}

## Información de la Planta
- **Genética**: ${data.strain.name} (${data.strain.type})
- **Etapa**: ${data.plant.stage}
- **Días en etapa**: ${data.daysInStage}
- **Días totales**: ${data.totalDays}
- **Estado de salud registrado**: ${data.plant.healthStatus}
${data.section ? `- **Sección**: ${data.section.name}` : '- **Sección**: Sin sección asignada'}
- **Ciclo**: ${data.cycle.name}
${data.plant.potSizeFinal ? `- **Maceta**: ${data.plant.potSizeFinal}` : ''}
${data.plant.notes ? `- **Notas**: ${data.plant.notes}` : ''}
`;

    if (config.includeFeedingPlans && data.feedingPlans.length > 0) {
      prompt += `\n## Plan de Alimentación Actual\n`;
      for (const fp of data.feedingPlans) {
        prompt += `- **${fp.planName}** (Semana ${fp.currentWeek})\n`;
        if (fp.weekData) {
          prompt += `  - Productos: ${fp.weekData.products.map(p => `${p.name} ${p.dose}${p.unit}`).join(', ')}\n`;
          if (fp.weekData.ph) prompt += `  - pH objetivo: ${fp.weekData.ph}\n`;
          if (fp.weekData.ec) prompt += `  - EC objetivo: ${fp.weekData.ec}\n`;
        }
      }
    }

    if (config.includePreventionPlans && data.preventionPlans.length > 0) {
      prompt += `\n## Plan de Prevención Actual\n`;
      for (const pp of data.preventionPlans) {
        prompt += `- **${pp.planName}** (Día ${pp.currentDay})\n`;
        if (pp.applicationData) {
          prompt += `  - Productos: ${pp.applicationData.products.map(p => `${p.name} ${p.dose}${p.unit}`).join(', ')}\n`;
          if (pp.applicationData.applicationType) prompt += `  - Tipo: ${pp.applicationData.applicationType}\n`;
          if (pp.applicationData.target) prompt += `  - Objetivo: ${pp.applicationData.target}\n`;
        }
      }
    }

    if (config.includeEvents && data.recentEvents.length > 0) {
      prompt += `\n## Eventos Recientes (últimos 20)\n`;
      for (const event of data.recentEvents.slice(0, 10)) {
        const dateStr = new Date(event.date).toLocaleDateString('es');
        prompt += `- ${dateStr}: ${event.type}\n`;
      }
    }

    if (config.customPrompt) {
      prompt += `\n## Instrucciones Adicionales\n${config.customPrompt}\n`;
    }

    prompt += `
## Formato de Respuesta
Responde en el siguiente formato JSON:
{
  "summary": "Resumen de 1-2 líneas del estado de la planta",
  "analysis": "Análisis detallado de 2-4 párrafos",
  "recommendations": ["Recomendación 1", "Recomendación 2", "..."],
  "healthScore": 1-10,
  "urgentIssues": ["Problema urgente 1", "..."] o []
}
`;

    return prompt;
  }

  /**
   * Llama al LLM (OpenAI) con el prompt y las imágenes
   */
  private async callLLM(prompt: string, imageUrls: string[]): Promise<string | null> {
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Construir mensajes con imágenes
      const content: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string; detail: 'high' } }
      > = [{ type: 'text', text: prompt }];

      for (const url of imageUrls) {
        content.push({
          type: 'image_url',
          image_url: { url, detail: 'high' },
        });
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en cultivo de cannabis indoor con años de experiencia. 
Analizas plantas y proporcionas diagnósticos precisos basados en imágenes y datos.
Responde SIEMPRE en español y en el formato JSON solicitado.`,
          },
          {
            role: 'user',
            content,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      return response.choices[0]?.message?.content || null;
    } catch (error) {
      this.logger.error(`Error calling LLM: ${error.message}`);
      return null;
    }
  }

  /**
   * Parsea la respuesta del LLM
   */
  private parseAnalysisResponse(response: string): {
    fullAnalysis: string;
    summary: string;
    recommendations: string[];
    healthScore?: number;
    urgentIssues?: string[];
  } {
    try {
      // Intentar extraer JSON de la respuesta
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          fullAnalysis: parsed.analysis || response,
          summary: parsed.summary || 'Análisis completado',
          recommendations: parsed.recommendations || [],
          healthScore: parsed.healthScore,
          urgentIssues: parsed.urgentIssues || [],
        };
      }
    } catch (error) {
      this.logger.debug('Could not parse JSON from response, using raw text');
    }

    // Si no se puede parsear, usar la respuesta como texto
    return {
      fullAnalysis: response,
      summary: response.substring(0, 100) + '...',
      recommendations: [],
    };
  }

  /**
   * Guarda el análisis como evento en la planta
   */
  private async saveAnalysisEvent(
    plantId: string,
    analysis: {
      fullAnalysis: string;
      summary: string;
      recommendations: string[];
      healthScore?: number;
      urgentIssues?: string[];
    },
    config: AnalysisConfig,
    automationId?: string,
    automationName?: string,
    plantData?: PlantData,
  ) {
    return this.prisma.event.create({
      data: {
        type: EventType.AI_ANALYSIS,
        plantId,
        data: {
          analysisType: config.analysisType,
          analysis: analysis.fullAnalysis,
          summary: analysis.summary,
          recommendations: analysis.recommendations,
          healthScore: analysis.healthScore,
          urgentIssues: analysis.urgentIssues,
          automationId,
          automationName,
          model: 'gpt-4o',
          inputData: {
            photosIncluded: config.includePhotos ? (plantData?.photos.length || 0) : 0,
            feedingPlansIncluded: config.includeFeedingPlans,
            preventionPlansIncluded: config.includePreventionPlans,
            eventsIncluded: config.includeEvents ? (plantData?.recentEvents.length || 0) : 0,
          },
          analyzedAt: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Crea una notificación si hay problemas detectados
   */
  private async createAnalysisNotification(
    plantTag: string,
    analysis: {
      summary: string;
      recommendations: string[];
      urgentIssues?: string[];
    },
    analysisType: AnalysisType,
    userId?: string,
  ) {
    const hasUrgentIssues = analysis.urgentIssues && analysis.urgentIssues.length > 0;
    
    const priority = hasUrgentIssues 
      ? NotificationPriority.HIGH 
      : NotificationPriority.MEDIUM;

    const title = hasUrgentIssues
      ? `⚠️ Problemas detectados en ${plantTag}`
      : `📊 Análisis completado: ${plantTag}`;

    const message = hasUrgentIssues
      ? `${analysis.summary}\n\nProblemas urgentes: ${analysis.urgentIssues!.join(', ')}`
      : `${analysis.summary}\n\nRecomendaciones: ${analysis.recommendations.slice(0, 2).join(', ')}`;

    await this.notificationsService.create({
      type: NotificationType.SYSTEM,
      priority,
      title,
      message: message.substring(0, 500),
      metadata: {
        plantTag,
        analysisType,
        hasUrgentIssues,
        recommendationsCount: analysis.recommendations.length,
      },
    });
  }
}
