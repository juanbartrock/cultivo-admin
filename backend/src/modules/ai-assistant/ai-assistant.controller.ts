import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { AIAssistantService } from './ai-assistant.service';
import { MemoryService } from './memory.service';
import {
  SendMessageDto,
  CreateConversationDto,
  GetConversationsQueryDto,
  GetMemoriesQueryDto,
  CreateMemoryDto,
} from './dto/ai-assistant.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('ai-assistant')
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
  async sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser() user: User,
  ) {
    return this.aiService.sendMessage(dto, user.id);
  }

  // ==================== CONVERSATIONS ====================

  /**
   * Crea una nueva conversación
   */
  @Post('conversations')
  async createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: User,
  ) {
    return this.aiService.createConversation(dto, user.id);
  }

  /**
   * Lista conversaciones del usuario actual
   */
  @Get('conversations')
  async getConversations(
    @Query() query: GetConversationsQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.aiService.getConversations(
      user.id,
      query.contextType,
      query.contextId,
      query.activeOnly ?? true,
    );
  }

  /**
   * Obtiene una conversación por ID (solo si pertenece al usuario)
   */
  @Get('conversations/:id')
  async getConversation(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.aiService.getConversation(id, user.id);
  }

  /**
   * Elimina una conversación (soft delete)
   */
  @Delete('conversations/:id')
  async deleteConversation(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.aiService.deleteConversation(id, user.id);
  }

  /**
   * Elimina permanentemente una conversación
   */
  @Delete('conversations/:id/permanent')
  async hardDeleteConversation(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.aiService.hardDeleteConversation(id, user.id);
  }

  // ==================== MEMORIES ====================

  /**
   * Obtiene memorias del usuario actual
   */
  @Get('memories')
  async getMemories(
    @Query() query: GetMemoriesQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.memoryService.getMemories(query.type, query.contextId, user.id);
  }

  /**
   * Crea una memoria manualmente
   */
  @Post('memories')
  async createMemory(
    @Body() dto: CreateMemoryDto,
    @CurrentUser() user: User,
  ) {
    return this.memoryService.createMemory(
      dto.type,
      dto.contextId || null,
      dto.summary,
      dto.keyFacts,
      dto.importance,
      user.id,
    );
  }

  /**
   * Elimina una memoria del usuario actual
   */
  @Delete('memories/:id')
  async deleteMemory(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.memoryService.deleteMemory(id, user.id);
  }

  /**
   * Limpia memorias antiguas del usuario actual
   */
  @Post('memories/cleanup')
  async cleanupMemories(
    @Query('keepDays') keepDays?: number,
    @Query('minImportance') minImportance?: number,
    @CurrentUser() user?: User,
  ) {
    const deleted = await this.memoryService.cleanupMemories(
      keepDays || 90,
      minImportance || 2,
      user?.id,
    );
    return { deleted };
  }

  // ==================== CONTEXT HELPERS ====================

  /**
   * Obtiene fotos de una planta para referenciar
   */
  @Get('plants/:plantId/photos')
  async getPlantPhotos(
    @Param('plantId') plantId: string,
    @CurrentUser() user: User,
  ) {
    return this.aiService.getPlantPhotos(plantId, user.id);
  }

  /**
   * Obtiene plan de alimentación en JSON
   */
  @Get('feeding-plans/:planId')
  async getFeedingPlan(
    @Param('planId') planId: string,
    @CurrentUser() user: User,
  ) {
    return this.aiService.getFeedingPlanJson(planId, user.id);
  }

  /**
   * Obtiene automatizaciones de una sección
   */
  @Get('sections/:sectionId/automations')
  async getSectionAutomations(
    @Param('sectionId') sectionId: string,
    @CurrentUser() user: User,
  ) {
    return this.aiService.getSectionAutomations(sectionId, user.id);
  }
}
