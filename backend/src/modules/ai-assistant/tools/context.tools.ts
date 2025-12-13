import { PrismaService } from '../../../prisma/prisma.service';
import { ToolDefinition } from './types';

/**
 * Crea las herramientas de contexto y memorias
 */
export function createContextTools(prisma: PrismaService): ToolDefinition[] {
  return [
    // ==================== SEARCH_MEMORIES ====================
    {
      name: 'search_memories',
      description: 'Busca en las memorias del asistente sobre conversaciones anteriores y conocimiento aprendido',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Término de búsqueda',
          },
          type: {
            type: 'string',
            description: 'Tipo de memoria',
            enum: ['CONVERSATION', 'CYCLE', 'SECTION', 'PLANT'],
          },
        },
        required: ['query'],
      },
      handler: async (params) => {
        const query = params.query as string;
        const where: any = {
          OR: [
            { summary: { contains: query, mode: 'insensitive' } },
          ],
        };

        if (params.type) {
          where.type = params.type;
        }

        const memories = await prisma.aIMemory.findMany({
          where,
          orderBy: [{ importance: 'desc' }, { updatedAt: 'desc' }],
          take: 10,
        });

        return {
          count: memories.length,
          memories: memories.map((m) => ({
            type: m.type,
            summary: m.summary,
            importance: m.importance,
            keyFacts: m.keyFacts,
            updatedAt: m.updatedAt.toISOString().split('T')[0],
          })),
        };
      },
    },

    // ==================== GET_CONVERSATION_HISTORY ====================
    {
      name: 'get_conversation_history',
      description: 'Obtiene el historial de la conversación actual o de conversaciones anteriores',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'string',
            description: 'Número máximo de conversaciones anteriores',
          },
        },
        required: [],
      },
      handler: async (params) => {
        const limit = parseInt(params.limit as string) || 5;

        const conversations = await prisma.aIConversation.findMany({
          where: { isActive: true },
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 3,
            },
            _count: { select: { messages: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: limit,
        });

        return {
          recentConversations: conversations.map((c) => ({
            id: c.id,
            title: c.title,
            contextType: c.contextType,
            messagesCount: c._count.messages,
            lastMessage: c.messages[0]?.content.substring(0, 100),
            updatedAt: c.updatedAt.toISOString(),
          })),
        };
      },
    },

    // ==================== GET_RECENT_EVENTS ====================
    {
      name: 'get_recent_events',
      description: 'Obtiene los eventos recientes del sistema (riegos, podas, fotos, etc.)',
      parameters: {
        type: 'object',
        properties: {
          event_type: {
            type: 'string',
            description: 'Tipo de evento',
            enum: ['RIEGO', 'PODA', 'TRANSPLANTE', 'NOTA', 'FOTO', 'PARAMETRO_AMBIENTAL'],
          },
          section_name: {
            type: 'string',
            description: 'Filtrar por sección',
          },
          days: {
            type: 'string',
            description: 'Número de días hacia atrás (default: 7)',
          },
        },
        required: [],
      },
      handler: async (params) => {
        const days = parseInt(params.days as string) || 7;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const where: any = {
          createdAt: { gte: startDate },
        };

        if (params.event_type) {
          where.type = params.event_type;
        }

        if (params.section_name) {
          const section = await prisma.section.findFirst({
            where: { name: { contains: params.section_name as string, mode: 'insensitive' } },
          });
          if (section) {
            where.sectionId = section.id;
          }
        }

        const events = await prisma.event.findMany({
          where,
          include: {
            plant: { include: { strain: true } },
            section: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });

        // Agrupar por tipo
        const byType = events.reduce((acc, e) => {
          if (!acc[e.type]) acc[e.type] = [];
          acc[e.type].push({
            date: e.createdAt.toISOString(),
            plant: e.plant?.tagCode,
            strain: e.plant?.strain.name,
            section: e.section?.name,
            data: e.data,
          });
          return acc;
        }, {} as Record<string, any[]>);

        return {
          period: `Últimos ${days} días`,
          totalEvents: events.length,
          eventsByType: byType,
        };
      },
    },
  ];
}
