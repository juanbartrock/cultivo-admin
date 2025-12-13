import { IsString, IsOptional, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { AIContextType, AIMemoryType } from '@prisma/client';

/**
 * DTO para enviar un mensaje al asistente
 */
export class SendMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsEnum(AIContextType)
  contextType?: AIContextType;

  @IsOptional()
  @IsString()
  contextId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageBase64?: string[]; // Imágenes en base64 (capturas de pantalla)
}

/**
 * DTO para crear una nueva conversación
 */
export class CreateConversationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(AIContextType)
  contextType?: AIContextType;

  @IsOptional()
  @IsString()
  contextId?: string;
}

/**
 * DTO para filtrar conversaciones
 */
export class GetConversationsQueryDto {
  @IsOptional()
  @IsEnum(AIContextType)
  contextType?: AIContextType;

  @IsOptional()
  @IsString()
  contextId?: string;

  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;
}

/**
 * DTO para filtrar memorias
 */
export class GetMemoriesQueryDto {
  @IsOptional()
  @IsEnum(AIMemoryType)
  type?: AIMemoryType;

  @IsOptional()
  @IsString()
  contextId?: string;
}

/**
 * DTO para crear/actualizar una memoria manualmente
 */
export class CreateMemoryDto {
  @IsEnum(AIMemoryType)
  type: AIMemoryType;

  @IsOptional()
  @IsString()
  contextId?: string;

  @IsString()
  summary: string;

  @IsOptional()
  keyFacts?: Array<{ fact: string; importance: number }>;

  @IsOptional()
  importance?: number;
}

/**
 * Respuesta del chat
 */
export interface ChatResponseDto {
  conversationId: string;
  message: {
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  };
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

/**
 * Contexto construido para OpenAI
 */
export interface AIContextDto {
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
  currentSection?: {
    id: string;
    name: string;
    plants: Array<{
      id: string;
      tagCode: string;
      strain: string;
      stage: string;
      healthStatus: string;
      daysInStage: number;
      feedingPlan?: string;
      lastEvents: Array<{
        type: string;
        date: string;
        summary: string;
      }>;
    }>;
    devices: Array<{
      id: string;
      name: string;
      type: string;
      status: string;
    }>;
    automations: Array<{
      id: string;
      name: string;
      status: string;
      description?: string;
    }>;
  };
  currentCycle?: {
    id: string;
    name: string;
    status: string;
    startDate: string;
    plantsCount: number;
  };
  currentPlant?: {
    id: string;
    tagCode: string;
    strain: string;
    stage: string;
    healthStatus: string;
    startDate?: string;
    feedingPlans: Array<{
      name: string;
      currentWeek: number;
      products: Array<{ name: string; dose: string }>;
    }>;
    preventionPlans: Array<{
      name: string;
      currentDay: number;
    }>;
    recentPhotos: string[];
    events: Array<{
      type: string;
      date: string;
      data: unknown;
    }>;
  };
  feedingPlans: Array<{
    id: string;
    name: string;
    stage: string;
    weeksCount: number;
  }>;
  preventionPlans: Array<{
    id: string;
    name: string;
    stage: string;
    totalDays: number;
  }>;
  memories: Array<{
    type: string;
    summary: string;
    importance: number;
  }>;
}
