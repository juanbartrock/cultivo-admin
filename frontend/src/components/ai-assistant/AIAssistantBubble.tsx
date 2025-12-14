'use client';

import React from 'react';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { AIAssistantChat } from './AIAssistantChat';

export function AIAssistantBubble() {
  const { isOpen, toggleAssistant, messages, isLoading } = useAIAssistant();

  // Contar mensajes no leídos (últimos mensajes del asistente cuando está cerrado)
  const hasNewMessages = !isOpen && messages.length > 0 && 
    messages[messages.length - 1]?.role === 'ASSISTANT';

  return (
    <>
      {/* Chat Panel */}
      <AIAssistantChat />

      {/* Overlay cuando está abierto en móvil */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={toggleAssistant}
        />
      )}

      {/* Floating Bubble */}
      <button
        onClick={toggleAssistant}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center group ${
          isOpen 
            ? 'bg-gray-700 scale-90 opacity-0 sm:opacity-100' 
            : 'bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 hover:scale-110'
        }`}
        style={{
          boxShadow: isOpen 
            ? '0 4px 15px rgba(0, 0, 0, 0.2)' 
            : '0 4px 20px rgba(16, 185, 129, 0.4)',
        }}
      >
        {/* Icono principal */}
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180 scale-0' : 'rotate-0 scale-100'}`}>
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
            />
          </svg>
        </div>

        {/* Icono de cerrar */}
        <div className={`absolute transition-transform duration-300 ${isOpen ? 'rotate-0 scale-100' : 'rotate-180 scale-0'}`}>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        {/* Indicador de nuevo mensaje */}
        {hasNewMessages && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-pulse">
            !
          </span>
        )}

        {/* Indicador de cargando */}
        {isLoading && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </span>
        )}

        {/* Pulse effect */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-25" />
        )}
      </button>

      {/* Tooltip */}
      {!isOpen && (
        <div className="fixed bottom-24 right-6 z-40 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-gray-800 text-white text-sm px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
            Asistente de Cultivo
            <div className="absolute -bottom-1 right-6 w-2 h-2 bg-gray-800 rotate-45" />
          </div>
        </div>
      )}
    </>
  );
}
