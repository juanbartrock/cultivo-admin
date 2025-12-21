'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { AIAssistantMessage } from './AIAssistantMessage';
import { AIAssistantInput } from './AIAssistantInput';
import { AIContextType } from '@/services/aiAssistantService';

const CONTEXT_LABELS: Record<AIContextType, string> = {
  GENERAL: 'General',
  CYCLE: 'Ciclo',
  SECTION: 'Sección',
  PLANT: 'Planta',
};

export function AIAssistantChat() {
  const {
    isOpen,
    closeAssistant,
    isLoading,
    error,
    messages,
    activeConversation,
    contextType,
    contextLabel,
    conversations,
    sendMessage,
    startNewConversation,
    loadConversation,
    deleteConversation,
    loadConversations,
    setContext,
    clearError,
    ttsEnabled,
    toggleTts,
  } = useAIAssistant();

  const [showHistory, setShowHistory] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Obtener el último mensaje del asistente para lectura de voz
  const lastAssistantMsg = messages
    .filter(m => m.role === 'ASSISTANT')
    .slice(-1)[0];
  const lastAssistantMessage = lastAssistantMsg?.content;
  const lastAssistantMessageId = lastAssistantMsg?.id;

  // Scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Cargar historial de conversaciones cuando se abre
  useEffect(() => {
    if (isOpen && showHistory) {
      loadConversations();
    }
  }, [isOpen, showHistory, loadConversations]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-y-0 right-0 w-full sm:w-96 md:w-[420px] bg-cultivo-darker shadow-2xl z-50 flex flex-col"
      id="ai-assistant-container"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h2 className="text-white font-semibold">Asistente de Cultivo</h2>
            <p className="text-emerald-100 text-xs">
              Contexto: {contextLabel || CONTEXT_LABELS[contextType]}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Botón historial */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-lg transition-colors ${
              showHistory ? 'bg-white/20' : 'hover:bg-white/10'
            }`}
            title="Historial de conversaciones"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Botón nueva conversación */}
          <button
            onClick={startNewConversation}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Nueva conversación"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Botón cerrar */}
          <button
            onClick={closeAssistant}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Selector de contexto */}
      <div className="bg-cultivo-dark px-4 py-2 border-b border-cultivo-darker">
        <div className="relative">
          <button
            onClick={() => setShowContextMenu(!showContextMenu)}
            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            <span>Cambiar contexto</span>
            <svg className={`w-4 h-4 transition-transform ${showContextMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showContextMenu && (
            <div className="absolute top-full left-0 mt-1 bg-cultivo-darker rounded-lg shadow-lg border border-cultivo-dark py-1 min-w-[150px] z-10">
              {(['GENERAL', 'CYCLE', 'SECTION', 'PLANT'] as AIContextType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setContext(type);
                    setShowContextMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-cultivo-dark transition-colors ${
                    contextType === type ? 'text-emerald-400' : 'text-gray-300'
                  }`}
                >
                  {CONTEXT_LABELS[type]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panel de historial */}
      {showHistory && (
        <div className="bg-cultivo-dark border-b border-cultivo-darker max-h-48 overflow-y-auto">
          <div className="px-4 py-2 text-xs text-gray-400 border-b border-cultivo-darker">
            Conversaciones recientes
          </div>
          {conversations.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No hay conversaciones anteriores
            </div>
          ) : (
            <div className="divide-y divide-cultivo-darker">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`px-4 py-2 flex items-center justify-between hover:bg-cultivo-darker transition-colors cursor-pointer ${
                    activeConversation?.id === conv.id ? 'bg-emerald-600/10' : ''
                  }`}
                  onClick={() => {
                    loadConversation(conv.id);
                    setShowHistory(false);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">
                      {conv.title || 'Sin título'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(conv.updatedAt).toLocaleDateString('es-ES')} · {conv._count?.messages || 0} mensajes
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <div className="w-16 h-16 bg-cultivo-dark rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm mb-2">¡Hola! Soy tu asistente de cultivo.</p>
            <p className="text-xs text-gray-600 max-w-[250px]">
              Puedo ayudarte con planes de alimentación, diagnóstico de problemas, 
              automatizaciones y más. ¡Pregúntame lo que necesites!
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <AIAssistantMessage key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-3">
                <div className="bg-cultivo-dark rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-2 flex items-center justify-between">
          <span className="text-red-300 text-sm">{error}</span>
          <button onClick={clearError} className="text-red-300 hover:text-red-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Input */}
      <AIAssistantInput 
        onSend={sendMessage} 
        disabled={isLoading} 
        lastAssistantMessage={lastAssistantMessage}
        lastAssistantMessageId={lastAssistantMessageId}
        ttsEnabled={ttsEnabled}
        onToggleTts={toggleTts}
      />
    </div>
  );
}
