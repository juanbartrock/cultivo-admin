'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  AIContextType,
  AIConversation,
  AIMessage,
  SendMessageDto,
  sendMessage as apiSendMessage,
  getConversation,
  getConversations,
  deleteConversation as apiDeleteConversation,
  getCache,
  setActiveConversation,
  setContextCache,
  clearActiveConversation,
  getPlantPhotos,
  PlantPhoto,
} from '@/services/aiAssistantService';

// Clave para localStorage
const TTS_ENABLED_KEY = 'ai-assistant-tts-enabled';

interface AIAssistantState {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  conversations: AIConversation[];
  activeConversation: AIConversation | null;
  messages: AIMessage[];
  contextType: AIContextType;
  contextId?: string;
  contextLabel?: string;
  attachedImages: string[];
  plantPhotos: PlantPhoto[];
  ttsEnabled: boolean;
}

interface AIAssistantContextType extends AIAssistantState {
  // UI Actions
  openAssistant: () => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  
  // Context Actions
  setContext: (type: AIContextType, id?: string, label?: string) => void;
  
  // Conversation Actions
  sendMessage: (message: string) => Promise<void>;
  startNewConversation: () => void;
  loadConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  
  // Image Actions
  addImage: (imageUrl: string) => void;
  removeImage: (index: number) => void;
  clearImages: () => void;
  loadPlantPhotos: (plantId: string) => Promise<void>;
  
  // TTS Actions
  toggleTts: () => void;
  
  // Error handling
  clearError: () => void;
}

const AIAssistantContext = createContext<AIAssistantContextType | null>(null);

export function AIAssistantProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AIAssistantState>(() => {
    // Cargar TTS habilitado desde localStorage (default: true)
    let ttsEnabled = true;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(TTS_ENABLED_KEY);
      ttsEnabled = stored !== 'false'; // Solo false si explícitamente es 'false'
    }
    
    return {
      isOpen: false,
      isLoading: false,
      error: null,
      conversations: [],
      activeConversation: null,
      messages: [],
      contextType: 'GENERAL',
      attachedImages: [],
      plantPhotos: [],
      ttsEnabled,
    };
  });

  // Cargar cache al iniciar
  useEffect(() => {
    const cache = getCache();
    if (cache.contextType) {
      setState(prev => ({
        ...prev,
        contextType: cache.contextType!,
        contextId: cache.contextId,
      }));
    }
    
    // Cargar conversación activa si existe
    if (cache.activeConversationId) {
      loadConversation(cache.activeConversationId).catch(() => {
        clearActiveConversation();
      });
    }
  }, []);

  // ==================== UI ACTIONS ====================

  const openAssistant = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: true }));
  }, []);

  const closeAssistant = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const toggleAssistant = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  // ==================== CONTEXT ACTIONS ====================

  const setContext = useCallback((type: AIContextType, id?: string, label?: string) => {
    setState(prev => ({
      ...prev,
      contextType: type,
      contextId: id,
      contextLabel: label,
    }));
    setContextCache(type, id);
  }, []);

  // ==================== CONVERSATION ACTIONS ====================

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() && state.attachedImages.length === 0) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const dto: SendMessageDto = {
        message: message.trim(),
        conversationId: state.activeConversation?.id,
        contextType: state.contextType,
        contextId: state.contextId,
        imageUrls: state.attachedImages.filter(img => img.startsWith('http')),
        imageBase64: state.attachedImages
          .filter(img => img.startsWith('data:'))
          .map(img => {
            const base64Index = img.indexOf('base64,');
            return base64Index !== -1 ? img.substring(base64Index + 7) : '';
          })
          .filter(Boolean),
      };

      // Agregar mensaje del usuario optimistamente
      const tempUserMessage: AIMessage = {
        id: `temp-${Date.now()}`,
        conversationId: state.activeConversation?.id || '',
        role: 'USER',
        content: message,
        imageUrls: state.attachedImages,
        createdAt: new Date().toISOString(),
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, tempUserMessage],
        attachedImages: [], // Limpiar imágenes adjuntas
      }));

      const response = await apiSendMessage(dto);

      // Actualizar con la respuesta real
      const assistantMessage: AIMessage = {
        id: response.message.id,
        conversationId: response.conversationId,
        role: 'ASSISTANT',
        content: response.message.content,
        imageUrls: [],
        createdAt: response.message.createdAt,
      };

      setState(prev => {
        // Reemplazar mensaje temporal y agregar respuesta
        const messages = prev.messages.filter(m => !m.id.startsWith('temp-'));
        const userMessage: AIMessage = {
          ...tempUserMessage,
          id: `user-${Date.now()}`,
          conversationId: response.conversationId,
        };

        return {
          ...prev,
          isLoading: false,
          messages: [...messages, userMessage, assistantMessage],
          activeConversation: prev.activeConversation || {
            id: response.conversationId,
            contextType: prev.contextType,
            contextId: prev.contextId,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
      });

      // Guardar en cache
      setActiveConversation(response.conversationId);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al enviar mensaje';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        // Remover mensaje temporal en caso de error
        messages: prev.messages.filter(m => !m.id.startsWith('temp-')),
      }));
    }
  }, [state.activeConversation?.id, state.contextType, state.contextId, state.attachedImages]);

  const startNewConversation = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeConversation: null,
      messages: [],
      attachedImages: [],
      error: null,
    }));
    clearActiveConversation();
  }, []);

  const loadConversation = useCallback(async (conversationId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const conversation = await getConversation(conversationId);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        activeConversation: conversation,
        messages: conversation.messages || [],
        contextType: conversation.contextType,
        contextId: conversation.contextId,
      }));

      setActiveConversation(conversationId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar conversación';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      await apiDeleteConversation(conversationId);
      
      setState(prev => ({
        ...prev,
        conversations: prev.conversations.filter(c => c.id !== conversationId),
        ...(prev.activeConversation?.id === conversationId ? {
          activeConversation: null,
          messages: [],
        } : {}),
      }));

      if (state.activeConversation?.id === conversationId) {
        clearActiveConversation();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar conversación';
      setState(prev => ({ ...prev, error: errorMessage }));
    }
  }, [state.activeConversation?.id]);

  const loadConversations = useCallback(async () => {
    try {
      const conversations = await getConversations({
        contextType: state.contextType,
        contextId: state.contextId,
      });
      
      setState(prev => ({ ...prev, conversations }));
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  }, [state.contextType, state.contextId]);

  // ==================== IMAGE ACTIONS ====================

  const addImage = useCallback((imageUrl: string) => {
    setState(prev => ({
      ...prev,
      attachedImages: [...prev.attachedImages, imageUrl],
    }));
  }, []);

  const removeImage = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      attachedImages: prev.attachedImages.filter((_, i) => i !== index),
    }));
  }, []);

  const clearImages = useCallback(() => {
    setState(prev => ({ ...prev, attachedImages: [] }));
  }, []);

  const loadPlantPhotos = useCallback(async (plantId: string) => {
    try {
      const photos = await getPlantPhotos(plantId);
      setState(prev => ({ ...prev, plantPhotos: photos }));
    } catch (err) {
      console.error('Error loading plant photos:', err);
    }
  }, []);

  // ==================== TTS ACTIONS ====================

  const toggleTts = useCallback(() => {
    setState(prev => {
      const newTtsEnabled = !prev.ttsEnabled;
      // Persistir en localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(TTS_ENABLED_KEY, String(newTtsEnabled));
      }
      return { ...prev, ttsEnabled: newTtsEnabled };
    });
  }, []);

  // ==================== ERROR HANDLING ====================

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value: AIAssistantContextType = {
    ...state,
    openAssistant,
    closeAssistant,
    toggleAssistant,
    setContext,
    sendMessage,
    startNewConversation,
    loadConversation,
    deleteConversation,
    loadConversations,
    addImage,
    removeImage,
    clearImages,
    loadPlantPhotos,
    toggleTts,
    clearError,
  };

  return (
    <AIAssistantContext.Provider value={value}>
      {children}
    </AIAssistantContext.Provider>
  );
}

export function useAIAssistant() {
  const context = useContext(AIAssistantContext);
  if (!context) {
    throw new Error('useAIAssistant must be used within an AIAssistantProvider');
  }
  return context;
}
