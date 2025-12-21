'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { useScreenCapture, dataUrlToBase64, resizeImage } from '@/hooks/useScreenCapture';
import { VoiceButton } from './VoiceButton';

interface AIAssistantInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  lastAssistantMessage?: string;
  lastAssistantMessageId?: string;
  ttsEnabled?: boolean;
  onToggleTts?: () => void;
}

export function AIAssistantInput({ 
  onSend, 
  disabled, 
  lastAssistantMessage,
  lastAssistantMessageId,
  ttsEnabled,
  onToggleTts,
}: AIAssistantInputProps) {
  const [message, setMessage] = useState('');
  const [showImageOptions, setShowImageOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handler para cuando se recibe una transcripción de voz
  const handleVoiceTranscript = useCallback((transcript: string) => {
    // Enviar directamente el mensaje de voz
    if (transcript.trim()) {
      onSend(transcript);
    }
  }, [onSend]);

  const { 
    attachedImages, 
    addImage, 
    removeImage, 
    plantPhotos,
    contextType,
    contextId,
    loadPlantPhotos,
  } = useAIAssistant();

  const { capturing, captureScreen } = useScreenCapture();

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (message.trim() || attachedImages.length > 0) {
      onSend(message);
      setMessage('');
    }
  }, [message, attachedImages.length, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const dataUrl = event.target?.result as string;
          // Redimensionar para reducir tamaño
          const resized = await resizeImage(dataUrl, 1024, 768, 0.8);
          addImage(resized);
        };
        reader.readAsDataURL(file);
      }
    }

    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowImageOptions(false);
  }, [addImage]);

  const handleScreenCapture = useCallback(async () => {
    setShowImageOptions(false);
    const result = await captureScreen();
    if (result) {
      addImage(result.dataUrl);
    }
  }, [captureScreen, addImage]);

  const handleSelectPlantPhoto = useCallback((photoUrl: string) => {
    addImage(photoUrl);
    setShowImageOptions(false);
  }, [addImage]);

  // Cargar fotos de la planta cuando es contexto de planta
  React.useEffect(() => {
    if (contextType === 'PLANT' && contextId) {
      loadPlantPhotos(contextId);
    }
  }, [contextType, contextId, loadPlantPhotos]);

  return (
    <div className="border-t border-cultivo-dark bg-cultivo-darker p-3">
      {/* Imágenes adjuntas */}
      {attachedImages.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachedImages.map((img, index) => (
            <div key={index} className="relative group">
              <img
                src={img}
                alt={`Adjunto ${index + 1}`}
                className="w-16 h-16 object-cover rounded-lg"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Opciones de imagen */}
      {showImageOptions && (
        <div className="mb-2 bg-cultivo-dark rounded-lg p-2 space-y-2">
          <div className="text-xs text-gray-400 mb-1">Adjuntar imagen:</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-3 py-1.5 bg-cultivo-darker rounded-lg text-sm hover:bg-emerald-600/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Subir foto
            </button>
            
            <button
              onClick={handleScreenCapture}
              disabled={capturing}
              className="flex items-center gap-1 px-3 py-1.5 bg-cultivo-darker rounded-lg text-sm hover:bg-emerald-600/20 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {capturing ? 'Capturando...' : 'Capturar pantalla'}
            </button>
          </div>

          {/* Fotos de la planta */}
          {contextType === 'PLANT' && plantPhotos.length > 0 && (
            <div className="mt-2">
              <div className="text-xs text-gray-400 mb-1">Fotos de la planta:</div>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {plantPhotos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => handleSelectPlantPhoto(photo.url)}
                    className="w-12 h-12 rounded-lg overflow-hidden hover:ring-2 hover:ring-emerald-500 transition-all"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Foto de planta'}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input principal */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {/* Botón adjuntar */}
        <button
          type="button"
          onClick={() => setShowImageOptions(!showImageOptions)}
          className={`p-2 rounded-lg transition-colors ${
            showImageOptions 
              ? 'bg-emerald-600 text-white' 
              : 'text-gray-400 hover:text-white hover:bg-cultivo-dark'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        {/* Botón de voz */}
        <div className="relative">
          <VoiceButton
            onTranscript={handleVoiceTranscript}
            disabled={disabled}
            lastAssistantMessage={lastAssistantMessage}
            lastAssistantMessageId={lastAssistantMessageId}
            ttsEnabled={ttsEnabled}
            onToggleTts={onToggleTts}
          />
        </div>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            disabled={disabled}
            rows={1}
            className="w-full bg-cultivo-dark rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 max-h-32"
            style={{
              minHeight: '42px',
              height: 'auto',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
            }}
          />
        </div>

        {/* Botón enviar */}
        <button
          type="submit"
          disabled={disabled || (!message.trim() && attachedImages.length === 0)}
          className="p-2.5 bg-emerald-600 rounded-xl text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>

      {/* Input de archivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
