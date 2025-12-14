import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { MemoryService } from './memory.service';
import { 
  SendMessageDto, 
  CreateConversationDto, 
  ChatResponseDto,
} from './dto/ai-assistant.dto';
import { AIContextType, AIMessageRole } from '@prisma/client';

// Colores para logs
const LOG = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  bgCyan: '\x1b[46m',
  white: '\x1b[37m',
};

@Injectable()
export class AIAssistantService {
  private readonly logger = new Logger(AIAssistantService.name);
  private requestCount = 0;

  constructor(
    private prisma: PrismaService,
    private orchestrator: AgentOrchestratorService,
    private memoryService: MemoryService,
  ) {}

  /**
   * Envía un mensaje al asistente usando el orquestador de agentes
   */
  async sendMessage(dto: SendMessageDto, userId: string): Promise<ChatResponseDto> {
    const requestId = ++this.requestCount;
    const startTime = Date.now();

    // ==================== LOG ENTRADA ====================
    console.log(`\n${LOG.bgCyan}${LOG.white}${LOG.bright}`);
    console.log(`╔${'═'.repeat(58)}╗`);
    console.log(`║  📨 NUEVA SOLICITUD AL ASISTENTE IA #${requestId}`.padEnd(59) + '║');
    console.log(`╚${'═'.repeat(58)}╝${LOG.reset}`);
    
    console.log(`${LOG.cyan}📅 Timestamp:${LOG.reset} ${new Date().toISOString()}`);
    console.log(`${LOG.cyan}👤 Usuario:${LOG.reset} ${userId}`);
    console.log(`${LOG.cyan}💬 Mensaje:${LOG.reset} "${dto.message}"`);
    console.log(`${LOG.cyan}🆔 Conversación existente:${LOG.reset} ${dto.conversationId || 'Nueva'}`);
    console.log(`${LOG.cyan}🏷️  Tipo de contexto:${LOG.reset} ${dto.contextType || 'GENERAL'}`);
    console.log(`${LOG.cyan}🖼️  Imágenes:${LOG.reset} ${(dto.imageUrls?.length || 0) + (dto.imageBase64?.length || 0)}`);
    
    // Obtener o crear conversación
    let conversation;
    if (dto.conversationId) {
      conversation = await this.getConversation(dto.conversationId, userId);
      console.log(`${LOG.green}✓ Conversación encontrada:${LOG.reset} ${conversation.title || 'Sin título'}`);
    } else {
      conversation = await this.createConversation({
        contextType: dto.contextType || AIContextType.GENERAL,
        contextId: dto.contextId,
      }, userId);
      console.log(`${LOG.green}✓ Nueva conversación creada:${LOG.reset} ${conversation.id}`);
    }

    // Preparar imágenes
    const allImages = [
      ...(dto.imageUrls || []),
      ...(dto.imageBase64 || []).map((b64) => `data:image/png;base64,${b64}`),
    ];

    // Guardar mensaje del usuario
    const userMessage = await this.prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: AIMessageRole.USER,
        content: dto.message,
        imageUrls: allImages,
      },
    });
    console.log(`${LOG.green}✓ Mensaje del usuario guardado:${LOG.reset} ${userMessage.id}`);

    try {
      console.log(`\n${LOG.yellow}⏳ Delegando al orquestador de agentes...${LOG.reset}\n`);
      
      // Procesar con el orquestador de agentes - PASAMOS EL userId
      const agentResponse = await this.orchestrator.processMessage(
        dto.message,
        conversation.id,
        userId,  // <-- NUEVO: Pasamos el userId al orquestador
        allImages,
      );

      const duration = Date.now() - startTime;

      // Guardar respuesta del asistente
      const assistantMessage = await this.prisma.aIMessage.create({
        data: {
          conversationId: conversation.id,
          role: AIMessageRole.ASSISTANT,
          content: agentResponse.content,
          metadata: {
            toolsUsed: agentResponse.toolsUsed,
            iterations: agentResponse.iterations,
            tokensUsed: agentResponse.tokensUsed,
          },
        },
      });

      // Actualizar timestamp de conversación
      await this.prisma.aIConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      // Generar título si es el primer mensaje real
      const messageCount = await this.prisma.aIMessage.count({
        where: { conversationId: conversation.id },
      });
      
      if (messageCount <= 2) {
        this.generateConversationTitle(conversation.id, dto.message).catch((err) =>
          this.logger.error(`Error generating title: ${err.message}`),
        );
      }

      // ==================== LOG RESUMEN FINAL ====================
      console.log(`\n${LOG.bgCyan}${LOG.white}${LOG.bright}`);
      console.log(`╔${'═'.repeat(58)}╗`);
      console.log(`║  📊 RESUMEN DE LA SOLICITUD #${requestId}`.padEnd(59) + '║');
      console.log(`╚${'═'.repeat(58)}╝${LOG.reset}`);
      
      console.log(`${LOG.green}✓ Estado:${LOG.reset} COMPLETADO`);
      console.log(`${LOG.cyan}⏱️  Duración total:${LOG.reset} ${duration}ms (${(duration/1000).toFixed(2)}s)`);
      console.log(`${LOG.cyan}🔄 Iteraciones del agente:${LOG.reset} ${agentResponse.iterations}`);
      console.log(`${LOG.cyan}🔧 Herramientas utilizadas:${LOG.reset} ${agentResponse.toolsUsed.length > 0 ? agentResponse.toolsUsed.join(', ') : 'Ninguna'}`);
      
      if (agentResponse.tokensUsed) {
        console.log(`${LOG.cyan}🎫 Tokens:${LOG.reset}`);
        console.log(`   - Prompt: ${agentResponse.tokensUsed.prompt}`);
        console.log(`   - Completion: ${agentResponse.tokensUsed.completion}`);
        console.log(`   - Total: ${agentResponse.tokensUsed.total}`);
      }
      
      console.log(`${LOG.cyan}💾 Mensaje guardado:${LOG.reset} ${assistantMessage.id}`);
      console.log(`${'─'.repeat(60)}\n`);

      return {
        conversationId: conversation.id,
        message: {
          id: assistantMessage.id,
          role: 'assistant',
          content: agentResponse.content,
          createdAt: assistantMessage.createdAt,
        },
        tokensUsed: agentResponse.tokensUsed,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.log(`\n${LOG.red}${LOG.bright}`);
      console.log(`╔${'═'.repeat(58)}╗`);
      console.log(`║  ❌ ERROR EN SOLICITUD #${requestId}`.padEnd(59) + '║');
      console.log(`╚${'═'.repeat(58)}╝${LOG.reset}`);
      
      console.log(`${LOG.red}Error:${LOG.reset} ${error.message}`);
      console.log(`${LOG.cyan}Duración hasta error:${LOG.reset} ${duration}ms`);
      if (error.stack) {
        console.log(`${LOG.red}Stack:${LOG.reset}`);
        error.stack.split('\n').slice(0, 5).forEach((line: string) => {
          console.log(`  ${line}`);
        });
      }
      console.log(`${'─'.repeat(60)}\n`);

      // Guardar mensaje de error
      const errorMessage = await this.prisma.aIMessage.create({
        data: {
          conversationId: conversation.id,
          role: AIMessageRole.ASSISTANT,
          content: `Lo siento, hubo un error al procesar tu mensaje: ${error.message}`,
          metadata: { error: true },
        },
      });

      return {
        conversationId: conversation.id,
        message: {
          id: errorMessage.id,
          role: 'assistant',
          content: errorMessage.content,
          createdAt: errorMessage.createdAt,
        },
      };
    }
  }

  /**
   * Crea una nueva conversación para un usuario
   */
  async createConversation(dto: CreateConversationDto, userId: string) {
    return this.prisma.aIConversation.create({
      data: {
        title: dto.title,
        contextType: dto.contextType || AIContextType.GENERAL,
        contextId: dto.contextId,
        userId, // <-- Asociar al usuario
      },
    });
  }

  /**
   * Obtiene una conversación por ID (verificando que pertenece al usuario)
   */
  async getConversation(id: string, userId: string) {
    const conversation = await this.prisma.aIConversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    // Verificar que la conversación pertenece al usuario
    if (conversation.userId && conversation.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta conversación');
    }

    return conversation;
  }

  /**
   * Lista conversaciones con filtros (solo del usuario)
   */
  async getConversations(
    userId: string,
    contextType?: AIContextType,
    contextId?: string,
    activeOnly = true,
  ) {
    return this.prisma.aIConversation.findMany({
      where: {
        userId, // <-- Solo conversaciones del usuario
        ...(contextType && { contextType }),
        ...(contextId && { contextId }),
        ...(activeOnly && { isActive: true }),
      },
      include: {
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Elimina una conversación (soft delete)
   */
  async deleteConversation(id: string, userId: string) {
    await this.getConversation(id, userId); // Verifica pertenencia

    // Procesar memorias antes de desactivar
    await this.memoryService.processConversationEnd(id, userId);

    return this.prisma.aIConversation.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Elimina permanentemente una conversación
   */
  async hardDeleteConversation(id: string, userId: string) {
    await this.getConversation(id, userId); // Verifica pertenencia

    return this.prisma.aIConversation.delete({
      where: { id },
    });
  }

  /**
   * Genera título automático para conversación
   */
  private async generateConversationTitle(
    conversationId: string,
    firstMessage: string,
  ) {
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Genera un título corto (máximo 5 palabras) para una conversación de cultivo. Responde SOLO el título, sin comillas.',
          },
          {
            role: 'user',
            content: firstMessage,
          },
        ],
        max_completion_tokens: 20,
        temperature: 0.5,
      });

      const title = response.choices[0]?.message?.content?.trim() || 'Nueva conversación';

      await this.prisma.aIConversation.update({
        where: { id: conversationId },
        data: { title: title.substring(0, 100) },
      });
    } catch (error) {
      this.logger.error(`Error generating title: ${error.message}`);
    }
  }

  /**
   * Obtiene fotos de una planta (verificando acceso del usuario)
   */
  async getPlantPhotos(plantId: string, userId: string) {
    // Verificar que la planta pertenece al usuario
    const plant = await this.prisma.plant.findUnique({
      where: { id: plantId },
      include: {
        section: {
          include: { room: true },
        },
      },
    });

    if (!plant) {
      throw new NotFoundException(`Plant ${plantId} not found`);
    }

    if (plant.section?.room?.userId && plant.section.room.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta planta');
    }

    const events = await this.prisma.event.findMany({
      where: {
        plantId,
        type: 'FOTO',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return events.map((event) => {
      const data = event.data as { url?: string; caption?: string };
      return {
        id: event.id,
        url: data.url,
        caption: data.caption,
        date: event.createdAt,
      };
    });
  }

  /**
   * Obtiene el plan de alimentación (verificando acceso del usuario)
   */
  async getFeedingPlanJson(planId: string, userId: string) {
    const plan = await this.prisma.feedingPlan.findUnique({
      where: { id: planId },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Feeding plan ${planId} not found`);
    }

    // Verificar que el plan pertenece al usuario
    if (plan.userId && plan.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este plan');
    }

    return plan;
  }

  /**
   * Obtiene automatizaciones de una sección (verificando acceso del usuario)
   */
  async getSectionAutomations(sectionId: string, userId: string) {
    // Verificar que la sección pertenece al usuario
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { room: true },
    });

    if (!section) {
      throw new NotFoundException(`Section ${sectionId} not found`);
    }

    if (section.room?.userId && section.room.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta sección');
    }

    return this.prisma.automation.findMany({
      where: { sectionId },
      include: {
        conditions: {
          include: { device: true },
        },
        actions: {
          include: { device: true },
        },
      },
    });
  }
}
