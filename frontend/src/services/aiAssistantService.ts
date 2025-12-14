/**
 * AI Assistant Service - Cliente para comunicación con el backend
 */

import { api } from './apiService';

// ==================== TYPES ====================

export type AIContextType = 'GENERAL' | 'CYCLE' | 'SECTION' | 'PLANT';
export type AIMessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';
export type AIMemoryType = 'CONVERSATION' | 'CYCLE' | 'SECTION' | 'PLANT';

export interface AIMessage {
  id: string;
  conversationId: string;
  role: AIMessageRole;
  content: string;
  imageUrls: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AIConversation {
  id: string;
  title?: string;
  contextType: AIContextType;
  contextId?: string;
  messages?: AIMessage[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
  };
}

export interface AIMemory {
  id: string;
  type: AIMemoryType;
  contextId?: string;
  summary: string;
  keyFacts?: Array<{ fact: string; importance: number }>;
  importance: number;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageDto {
  message: string;
  conversationId?: string;
  contextType?: AIContextType;
  contextId?: string;
  imageUrls?: string[];
  imageBase64?: string[];
}

export interface ChatResponse {
  conversationId: string;
  message: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  };
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface PlantPhoto {
  id: string;
  url: string;
  caption?: string;
  date: string;
}

// ==================== API FUNCTIONS ====================

/**
 * Envía un mensaje al asistente
 */
export async function sendMessage(dto: SendMessageDto): Promise<ChatResponse> {
  return api.post<ChatResponse>('/ai-assistant/chat', dto);
}

/**
 * Crea una nueva conversación
 */
export async function createConversation(data: {
  title?: string;
  contextType?: AIContextType;
  contextId?: string;
}): Promise<AIConversation> {
  return api.post<AIConversation>('/ai-assistant/conversations', data);
}

/**
 * Obtiene todas las conversaciones
 */
export async function getConversations(params?: {
  contextType?: AIContextType;
  contextId?: string;
  activeOnly?: boolean;
}): Promise<AIConversation[]> {
  const queryParams = new URLSearchParams();
  if (params?.contextType) queryParams.set('contextType', params.contextType);
  if (params?.contextId) queryParams.set('contextId', params.contextId);
  if (params?.activeOnly !== undefined) queryParams.set('activeOnly', String(params.activeOnly));
  
  const query = queryParams.toString();
  return api.get<AIConversation[]>(`/ai-assistant/conversations${query ? `?${query}` : ''}`);
}

/**
 * Obtiene una conversación por ID
 */
export async function getConversation(id: string): Promise<AIConversation> {
  return api.get<AIConversation>(`/ai-assistant/conversations/${id}`);
}

/**
 * Elimina una conversación
 */
export async function deleteConversation(id: string): Promise<void> {
  return api.delete(`/ai-assistant/conversations/${id}`);
}

/**
 * Obtiene memorias
 */
export async function getMemories(params?: {
  type?: AIMemoryType;
  contextId?: string;
}): Promise<AIMemory[]> {
  const queryParams = new URLSearchParams();
  if (params?.type) queryParams.set('type', params.type);
  if (params?.contextId) queryParams.set('contextId', params.contextId);
  
  const query = queryParams.toString();
  return api.get<AIMemory[]>(`/ai-assistant/memories${query ? `?${query}` : ''}`);
}

/**
 * Crea una memoria
 */
export async function createMemory(data: {
  type: AIMemoryType;
  contextId?: string;
  summary: string;
  keyFacts?: Array<{ fact: string; importance: number }>;
  importance?: number;
}): Promise<AIMemory> {
  return api.post<AIMemory>('/ai-assistant/memories', data);
}

/**
 * Elimina una memoria
 */
export async function deleteMemory(id: string): Promise<void> {
  return api.delete(`/ai-assistant/memories/${id}`);
}

/**
 * Obtiene fotos de una planta
 */
export async function getPlantPhotos(plantId: string): Promise<PlantPhoto[]> {
  return api.get<PlantPhoto[]>(`/ai-assistant/plants/${plantId}/photos`);
}

/**
 * Obtiene plan de alimentación
 */
export async function getFeedingPlan(planId: string): Promise<unknown> {
  return api.get(`/ai-assistant/feeding-plans/${planId}`);
}

/**
 * Obtiene automatizaciones de una sección
 */
export async function getSectionAutomations(sectionId: string): Promise<unknown[]> {
  return api.get(`/ai-assistant/sections/${sectionId}/automations`);
}

// ==================== LOCAL STORAGE HELPERS ====================

const STORAGE_KEY = 'ai_assistant_cache';

interface AIAssistantCache {
  activeConversationId?: string;
  recentConversations: string[];
  contextType?: AIContextType;
  contextId?: string;
}

/**
 * Obtiene el cache del asistente
 */
export function getCache(): AIAssistantCache {
  if (typeof window === 'undefined') {
    return { recentConversations: [] };
  }
  
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    return cached ? JSON.parse(cached) : { recentConversations: [] };
  } catch {
    return { recentConversations: [] };
  }
}

/**
 * Guarda el cache del asistente
 */
export function setCache(cache: AIAssistantCache): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Error saving AI assistant cache:', e);
  }
}

/**
 * Actualiza el cache con la conversación activa
 */
export function setActiveConversation(conversationId: string): void {
  const cache = getCache();
  cache.activeConversationId = conversationId;
  
  // Agregar a recientes si no está
  if (!cache.recentConversations.includes(conversationId)) {
    cache.recentConversations.unshift(conversationId);
    // Mantener solo las últimas 10
    cache.recentConversations = cache.recentConversations.slice(0, 10);
  }
  
  setCache(cache);
}

/**
 * Actualiza el contexto en cache
 */
export function setContextCache(contextType: AIContextType, contextId?: string): void {
  const cache = getCache();
  cache.contextType = contextType;
  cache.contextId = contextId;
  setCache(cache);
}

/**
 * Limpia la conversación activa
 */
export function clearActiveConversation(): void {
  const cache = getCache();
  cache.activeConversationId = undefined;
  setCache(cache);
}
