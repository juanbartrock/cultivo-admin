import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AIAssistantService } from './ai-assistant.service';
import { MemoryService } from './memory.service';
import {
  SendMessageDto,
  CreateConversationDto,
  GetConversationsQueryDto,
  GetMemoriesQueryDto,
  CreateMemoryDto,
} from './dto/ai-assistant.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AIContextType, AIMemoryType } from '@prisma/client';

@Controller('ai-assistant')
@UseGuards(JwtAuthGuard)
export class AIAssistantController {
  constructor(
    private readonly aiService: AIAssistantService,
    private readonly memoryService: MemoryService,
  ) {}

  // ==================== CHAT ====================

  /**
   * Envía un mensaje al asistente
   */
  @Post('chat')
  async sendMessage(@Body() dto: SendMessageDto) {
    return this.aiService.sendMessage(dto);
  }

  // ==================== CONVERSATIONS ====================

  /**
   * Crea una nueva conversación
   */
  @Post('conversations')
  async createConversation(@Body() dto: CreateConversationDto) {
    return this.aiService.createConversation(dto);
  }

  /**
   * Lista conversaciones
   */
  @Get('conversations')
  async getConversations(@Query() query: GetConversationsQueryDto) {
    return this.aiService.getConversations(
      query.contextType,
      query.contextId,
      query.activeOnly ?? true,
    );
  }

  /**
   * Obtiene una conversación por ID
   */
  @Get('conversations/:id')
  async getConversation(@Param('id') id: string) {
    return this.aiService.getConversation(id);
  }

  /**
   * Elimina una conversación (soft delete)
   */
  @Delete('conversations/:id')
  async deleteConversation(@Param('id') id: string) {
    return this.aiService.deleteConversation(id);
  }

  /**
   * Elimina permanentemente una conversación
   */
  @Delete('conversations/:id/permanent')
  async hardDeleteConversation(@Param('id') id: string) {
    return this.aiService.hardDeleteConversation(id);
  }

  // ==================== MEMORIES ====================

  /**
   * Obtiene memorias
   */
  @Get('memories')
  async getMemories(@Query() query: GetMemoriesQueryDto) {
    return this.memoryService.getMemories(query.type, query.contextId);
  }

  /**
   * Crea una memoria manualmente
   */
  @Post('memories')
  async createMemory(@Body() dto: CreateMemoryDto) {
    return this.memoryService.createMemory(
      dto.type,
      dto.contextId || null,
      dto.summary,
      dto.keyFacts,
      dto.importance,
    );
  }

  /**
   * Elimina una memoria
   */
  @Delete('memories/:id')
  async deleteMemory(@Param('id') id: string) {
    return this.memoryService.deleteMemory(id);
  }

  /**
   * Limpia memorias antiguas
   */
  @Post('memories/cleanup')
  async cleanupMemories(
    @Query('keepDays') keepDays?: number,
    @Query('minImportance') minImportance?: number,
  ) {
    const deleted = await this.memoryService.cleanupMemories(
      keepDays || 90,
      minImportance || 2,
    );
    return { deleted };
  }

  // ==================== CONTEXT HELPERS ====================

  /**
   * Obtiene fotos de una planta para referenciar
   */
  @Get('plants/:plantId/photos')
  async getPlantPhotos(@Param('plantId') plantId: string) {
    return this.aiService.getPlantPhotos(plantId);
  }

  /**
   * Obtiene plan de alimentación en JSON
   */
  @Get('feeding-plans/:planId')
  async getFeedingPlan(@Param('planId') planId: string) {
    return this.aiService.getFeedingPlanJson(planId);
  }

  /**
   * Obtiene automatizaciones de una sección
   */
  @Get('sections/:sectionId/automations')
  async getSectionAutomations(@Param('sectionId') sectionId: string) {
    return this.aiService.getSectionAutomations(sectionId);
  }
}
