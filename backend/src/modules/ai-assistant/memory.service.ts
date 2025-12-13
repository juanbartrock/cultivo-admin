import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIMemoryType, AIContextType, Prisma } from '@prisma/client';
import OpenAI from 'openai';

interface KeyFact {
  fact: string;
  importance: number;
}

// Helper para convertir KeyFact[] a Prisma JSON
function keyFactsToJson(facts: KeyFact[]): Prisma.InputJsonValue {
  return facts as unknown as Prisma.InputJsonValue;
}

// Helper para convertir Prisma JSON a KeyFact[]
function jsonToKeyFacts(json: Prisma.JsonValue | null): KeyFact[] {
  if (!json || !Array.isArray(json)) return [];
  return json as unknown as KeyFact[];
}

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);
  private openai: OpenAI;

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Obtiene memorias por tipo y contexto
   */
  async getMemories(type?: AIMemoryType, contextId?: string) {
    return this.prisma.aIMemory.findMany({
      where: {
        ...(type && { type }),
        ...(contextId && { contextId }),
      },
      orderBy: [{ importance: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  /**
   * Obtiene memorias relevantes para un contexto de conversación
   */
  async getRelevantMemories(
    contextType: AIContextType,
    contextId?: string,
    limit = 10,
  ) {
    const whereConditions = [];

    // Siempre incluir memorias de conversación generales
    whereConditions.push({ type: AIMemoryType.CONVERSATION });

    // Agregar memorias específicas según el contexto
    if (contextId) {
      switch (contextType) {
        case AIContextType.PLANT:
          whereConditions.push({
            type: AIMemoryType.PLANT,
            contextId,
          });
          break;

        case AIContextType.SECTION:
          whereConditions.push({
            type: AIMemoryType.SECTION,
            contextId,
          });
          break;

        case AIContextType.CYCLE:
          whereConditions.push({
            type: AIMemoryType.CYCLE,
            contextId,
          });
          break;
      }
    }

    return this.prisma.aIMemory.findMany({
      where: {
        OR: whereConditions,
      },
      orderBy: [{ importance: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    });
  }

  /**
   * Crea o actualiza una memoria
   */
  async upsertMemory(
    type: AIMemoryType,
    contextId: string | null,
    summary: string,
    keyFacts?: KeyFact[],
    importance = 3,
  ) {
    // Buscar memoria existente
    const existing = await this.prisma.aIMemory.findFirst({
      where: {
        type,
        contextId: contextId || undefined,
      },
    });

    if (existing) {
      // Combinar key facts existentes con nuevos
      const existingFacts = jsonToKeyFacts(existing.keyFacts);
      const combinedFacts = [...existingFacts];

      if (keyFacts) {
        for (const newFact of keyFacts) {
          const existingIndex = combinedFacts.findIndex(
            (f) => f.fact.toLowerCase() === newFact.fact.toLowerCase(),
          );
          if (existingIndex >= 0) {
            // Actualizar importancia si es mayor
            if (newFact.importance > combinedFacts[existingIndex].importance) {
              combinedFacts[existingIndex].importance = newFact.importance;
            }
          } else {
            combinedFacts.push(newFact);
          }
        }
      }

      // Mantener solo los 20 hechos más importantes
      combinedFacts.sort((a, b) => b.importance - a.importance);
      const trimmedFacts = combinedFacts.slice(0, 20);

      return this.prisma.aIMemory.update({
        where: { id: existing.id },
        data: {
          summary: `${existing.summary}\n\n${summary}`.substring(0, 5000),
          keyFacts: keyFactsToJson(trimmedFacts),
          importance: Math.max(existing.importance, importance),
        },
      });
    }

    return this.prisma.aIMemory.create({
      data: {
        type,
        contextId,
        summary,
        keyFacts: keyFactsToJson(keyFacts || []),
        importance,
      },
    });
  }

  /**
   * Genera un resumen de conversación usando GPT
   */
  async generateConversationSummary(
    messages: Array<{ role: string; content: string }>,
  ): Promise<{ summary: string; keyFacts: KeyFact[] }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5.2',
        messages: [
          {
            role: 'system',
            content: `Eres un asistente que resume conversaciones sobre cultivo de cannabis.
Genera un resumen conciso y extrae los hechos clave mencionados.
Responde SOLO en formato JSON:
{
  "summary": "resumen de la conversación en 2-3 oraciones",
  "keyFacts": [
    {"fact": "hecho importante mencionado", "importance": 1-5}
  ]
}`,
          },
          {
            role: 'user',
            content: `Resume esta conversación:\n\n${messages
              .map((m) => `${m.role}: ${m.content}`)
              .join('\n')}`,
          },
        ],
        temperature: 0.3,
        max_completion_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || '{}';
      
      // Intentar parsear JSON
      try {
        const parsed = JSON.parse(content);
        return {
          summary: parsed.summary || 'Sin resumen disponible',
          keyFacts: parsed.keyFacts || [],
        };
      } catch {
        return {
          summary: content.substring(0, 500),
          keyFacts: [],
        };
      }
    } catch (error) {
      this.logger.error(`Error generating summary: ${error.message}`);
      return {
        summary: 'Error al generar resumen',
        keyFacts: [],
      };
    }
  }

  /**
   * Procesa una conversación finalizada y extrae memorias
   */
  async processConversationEnd(conversationId: string) {
    const conversation = await this.prisma.aIConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation || conversation.messages.length < 4) {
      // No procesar conversaciones muy cortas
      return;
    }

    // Generar resumen
    const messages = conversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const { summary, keyFacts } = await this.generateConversationSummary(messages);

    // Determinar tipo de memoria según contexto
    let memoryType: AIMemoryType;
    switch (conversation.contextType) {
      case AIContextType.PLANT:
        memoryType = AIMemoryType.PLANT;
        break;
      case AIContextType.SECTION:
        memoryType = AIMemoryType.SECTION;
        break;
      case AIContextType.CYCLE:
        memoryType = AIMemoryType.CYCLE;
        break;
      default:
        memoryType = AIMemoryType.CONVERSATION;
    }

    // Guardar memoria
    await this.upsertMemory(
      memoryType,
      conversation.contextId,
      summary,
      keyFacts,
      3,
    );

    this.logger.log(
      `Processed conversation ${conversationId}, created ${memoryType} memory`,
    );
  }

  /**
   * Elimina memorias antiguas o de baja importancia
   */
  async cleanupMemories(keepDays = 90, minImportance = 2) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    const deleted = await this.prisma.aIMemory.deleteMany({
      where: {
        AND: [
          { updatedAt: { lt: cutoffDate } },
          { importance: { lt: minImportance } },
        ],
      },
    });

    this.logger.log(`Cleaned up ${deleted.count} old memories`);
    return deleted.count;
  }

  /**
   * Crea una memoria manualmente
   */
  async createMemory(
    type: AIMemoryType,
    contextId: string | null,
    summary: string,
    keyFacts?: KeyFact[],
    importance = 3,
  ) {
    return this.prisma.aIMemory.create({
      data: {
        type,
        contextId,
        summary,
        keyFacts: keyFactsToJson(keyFacts || []),
        importance,
      },
    });
  }

  /**
   * Elimina una memoria
   */
  async deleteMemory(id: string) {
    return this.prisma.aIMemory.delete({
      where: { id },
    });
  }
}
