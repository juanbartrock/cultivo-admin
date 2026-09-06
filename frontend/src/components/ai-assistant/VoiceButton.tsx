'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Clave para localStorage
const TTS_ENABLED_KEY = 'ai-assistant-tts-enabled';
const LAST_SPOKEN_MESSAGE_ID_KEY = 'ai-assistant-last-spoken-id';

// Tiempo de silencio antes de enviar el mensaje (en ms)
const SILENCE_TIMEOUT_MS = 2500;

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  onSpeakText?: (text: string) => void;
  disabled?: boolean;
  lastAssistantMessage?: string;
  lastAssistantMessageId?: string;
  ttsEnabled?: boolean;
  onToggleTts?: () => void;
}

// Tipos para Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: Event & { error: string }) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function VoiceButton({ 
  onTranscript, 
  disabled,
  lastAssistantMessage,
  lastAssistantMessageId,
  ttsEnabled = true,
  onToggleTts,
}: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpokenMessageIdRef = useRef<string>('');
  const [ttsAvailable, setTtsAvailable] = useState(true);
  const hasJustOpenedRef = useRef(true);

  // Verificar soporte del navegador y cargar configuración
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
      
      // Cargar el último mensaje leído desde localStorage
      const storedLastSpokenId = localStorage.getItem(LAST_SPOKEN_MESSAGE_ID_KEY);
      if (storedLastSpokenId) {
        lastSpokenMessageIdRef.current = storedLastSpokenId;
      }
      
      // Verificar si el TTS de Gemini está disponible
      checkTTSStatus();
      
      // Marcar que acabamos de abrir - después de un momento, permitir TTS
      const timer = setTimeout(() => {
        hasJustOpenedRef.current = false;
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Verificar estado del TTS en el backend
  const checkTTSStatus = async () => {
    console.log('🔍 [TTS] Verificando estado del TTS...');
    console.log('🔍 [TTS] API_URL:', API_URL);
    
    try {
      const token = localStorage.getItem('access_token');
      console.log('🔍 [TTS] Token presente:', !!token);
      
      const url = `${API_URL}/ai-assistant/tts/status`;
      console.log('🔍 [TTS] URL de status:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('🔍 [TTS] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [TTS] Status response:', data);
        setTtsAvailable(data.available);
      } else {
        const errorText = await response.text();
        console.error('❌ [TTS] Status check failed:', response.status, errorText);
        setTtsAvailable(false);
      }
    } catch (error) {
      console.error('❌ [TTS] Status check error:', error);
      setTtsAvailable(false);
    }
  };

  // Fallback a Web Speech API (voz robótica de Windows) - Debe declararse antes de speakText
  const fallbackToWebSpeech = useCallback((text: string) => {
    if (!window.speechSynthesis) return;

    const cleanText = text
      .replace(/```[\s\S]*?```/g, '') 
      .replace(/`[^`]+`/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#+\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[-•]\s/g, '')
      .replace(/\n+/g, '. ')
      .trim()
      .substring(0, 300);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-ES';
    utterance.rate = 1.1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  // Función para hablar texto usando Gemini TTS
  const speakText = useCallback(async (text: string) => {
    console.log('🎤 [TTS] speakText llamado');
    console.log('🎤 [TTS] texto:', text?.substring(0, 50) + '...');
    console.log('🎤 [TTS] ttsAvailable:', ttsAvailable);
    
    if (!text) {
      console.log('❌ [TTS] No hay texto, saliendo');
      return;
    }

    // Detener audio anterior si existe
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Si TTS de Gemini no está disponible, usar fallback directamente
    if (!ttsAvailable) {
      console.log('⚠️ [TTS] Gemini TTS no disponible, usando Web Speech API');
      fallbackToWebSpeech(text);
      return;
    }

    setIsSpeaking(true);

    try {
      const token = localStorage.getItem('access_token');
      const url = `${API_URL}/ai-assistant/tts`;
      console.log('🎤 [TTS] Llamando a:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      console.log('🎤 [TTS] Response status:', response.status);
      console.log('🎤 [TTS] Content-Type:', response.headers.get('content-type'));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [TTS] Error response:', errorText);
        throw new Error(`TTS request failed: ${response.status}`);
      }

      // Verificar si es audio
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('audio')) {
        console.error('❌ [TTS] Respuesta no es audio:', contentType);
        const text = await response.text();
        console.error('❌ [TTS] Contenido:', text);
        throw new Error('Response is not audio');
      }

      // Obtener el audio como blob
      const audioBlob = await response.blob();
      console.log('✅ [TTS] Audio blob recibido:', audioBlob.size, 'bytes');
      
      const audioUrl = URL.createObjectURL(audioBlob);

      // Crear y reproducir el audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        console.log('✅ [TTS] Audio terminó de reproducirse');
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audio.onerror = (e) => {
        console.error('❌ [TTS] Error reproduciendo audio:', e);
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      console.log('🎤 [TTS] Reproduciendo audio...');
      await audio.play();
    } catch (error) {
      console.error('❌ [TTS] Error en TTS:', error);
      setIsSpeaking(false);
      
      // Fallback a Web Speech API si Gemini falla
      console.log('⚠️ [TTS] Usando fallback Web Speech API');
      fallbackToWebSpeech(text);
    }
  }, [ttsAvailable, fallbackToWebSpeech]);

  // Hablar automáticamente cuando hay un nuevo mensaje del asistente
  useEffect(() => {
    // No reproducir si:
    // - TTS está deshabilitado
    // - No hay mensaje o ID
    // - Ya se leyó este mensaje (por ID)
    // - Ya está hablando
    // - El panel acaba de abrirse (evitar reproducir al abrir)
    if (!ttsEnabled || 
        !lastAssistantMessage || 
        !lastAssistantMessageId ||
        lastAssistantMessageId === lastSpokenMessageIdRef.current || 
        isSpeaking ||
        hasJustOpenedRef.current) {
      return;
    }
    
    // Guardar el ID del mensaje que vamos a leer
    lastSpokenMessageIdRef.current = lastAssistantMessageId;
    localStorage.setItem(LAST_SPOKEN_MESSAGE_ID_KEY, lastAssistantMessageId);
    
    // Reproducir el mensaje
    speakText(lastAssistantMessage);
  }, [lastAssistantMessage, lastAssistantMessageId, isSpeaking, speakText, ttsEnabled]);

  // Detener habla
  const stopSpeaking = useCallback(() => {
    // Detener audio de Gemini
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // También detener Web Speech API por si acaso
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // Limpiar timeout de silencio
  const clearSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  // Resetear timeout de silencio (llamar cada vez que hay actividad de voz)
  const resetSilenceTimeout = useCallback((accumulatedTranscript: string) => {
    clearSilenceTimeout();
    
    silenceTimeoutRef.current = setTimeout(() => {
      // Tiempo de silencio alcanzado, enviar transcripción acumulada
      if (accumulatedTranscript.trim()) {
        onTranscript(accumulatedTranscript.trim());
      }
      // Detener el reconocimiento
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setInterimTranscript('');
      setFinalTranscript('');
    }, SILENCE_TIMEOUT_MS);
  }, [clearSilenceTimeout, onTranscript]);

  // Iniciar reconocimiento de voz
  const startListening = useCallback(() => {
    if (!isSupported || disabled) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Detener habla si está hablando
    stopSpeaking();

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Modo continuo para no cortar en pausas cortas
    recognition.interimResults = true;
    recognition.lang = 'es-ES';

    let accumulatedFinal = '';

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript('');
      setFinalTranscript('');
      setPermissionDenied(false);
      accumulatedFinal = '';
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let newFinal = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinal += transcript;
        } else {
          interim += transcript;
        }
      }

      // Acumular texto final
      if (newFinal) {
        accumulatedFinal += (accumulatedFinal ? ' ' : '') + newFinal;
        setFinalTranscript(accumulatedFinal);
      }

      setInterimTranscript(interim);

      // Resetear el timeout cada vez que hay actividad
      // El texto completo es lo acumulado más lo que está en proceso
      const fullText = accumulatedFinal + (interim ? ' ' + interim : '');
      resetSilenceTimeout(fullText.trim() || accumulatedFinal);
    };

    recognition.onerror = (event: Event & { error: string }) => {
      console.error('Speech recognition error:', event.error);
      clearSilenceTimeout();
      setIsListening(false);
      setFinalTranscript('');
      if (event.error === 'not-allowed') {
        setPermissionDenied(true);
      }
    };

    recognition.onend = () => {
      clearSilenceTimeout();
      setIsListening(false);
      setInterimTranscript('');
      setFinalTranscript('');
    };

    recognitionRef.current = recognition;
    recognition.start();
    
    // Iniciar timeout inicial (por si el usuario no dice nada)
    resetSilenceTimeout('');
  }, [isSupported, disabled, stopSpeaking, resetSilenceTimeout, clearSilenceTimeout]);

  // Detener reconocimiento y enviar lo acumulado
  const stopListening = useCallback(() => {
    clearSilenceTimeout();
    
    // Enviar transcripción acumulada si hay algo
    const currentTranscript = finalTranscript + (interimTranscript ? ' ' + interimTranscript : '');
    if (currentTranscript.trim()) {
      onTranscript(currentTranscript.trim());
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setInterimTranscript('');
    setFinalTranscript('');
  }, [clearSilenceTimeout, finalTranscript, interimTranscript, onTranscript]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  if (!isSupported) {
    return (
      <button
        disabled
        className="p-2 rounded-lg text-gray-600 cursor-not-allowed"
        title="Tu navegador no soporta reconocimiento de voz"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364L5.636 5.636" />
        </svg>
      </button>
    );
  }

  if (permissionDenied) {
    return (
      <button
        onClick={() => setPermissionDenied(false)}
        className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
        title="Permiso de micrófono denegado. Haz clic para reintentar."
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {/* Botón de micrófono */}
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        className={`p-2 rounded-lg transition-all duration-200 ${
          isListening 
            ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50' 
            : 'text-gray-400 hover:text-white hover:bg-surface'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isListening ? 'Detener grabación' : 'Hablar con el asistente'}
      >
        {isListening ? (
          // Icono de detener/onda de audio
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          // Icono de micrófono
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      {/* Botón de detener habla (cuando está hablando) */}
      {isSpeaking && (
        <button
          type="button"
          onClick={stopSpeaking}
          className="p-2 rounded-lg bg-amber-500 text-white animate-pulse shadow-lg shadow-amber-500/50 transition-all"
          title="Detener lectura"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 0112.728 0" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364L5.636 5.636" />
          </svg>
        </button>
      )}

      {/* Botón de toggle TTS */}
      {onToggleTts && (
        <button
          type="button"
          onClick={onToggleTts}
          className={`p-2 rounded-lg transition-all duration-200 ${
            ttsEnabled 
              ? 'text-emerald-400 hover:bg-emerald-500/20' 
              : 'text-gray-500 hover:bg-gray-500/20'
          }`}
          title={ttsEnabled ? 'Desactivar voz del asistente' : 'Activar voz del asistente'}
        >
          {ttsEnabled ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          )}
        </button>
      )}

      {/* Indicador de transcripción en tiempo real */}
      {(interimTranscript || finalTranscript) && isListening && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-surface rounded-lg px-3 py-2 text-sm text-gray-300 shadow-lg border border-edge min-w-[200px]">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mt-1.5 flex-shrink-0" />
            <div className="flex-1">
              {finalTranscript && (
                <span className="text-white">{finalTranscript}</span>
              )}
              {interimTranscript && (
                <span className="italic text-gray-400">{finalTranscript ? ' ' : ''}{interimTranscript}</span>
              )}
            </div>
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            Pulsa ■ para enviar o espera {SILENCE_TIMEOUT_MS / 1000}s de silencio
          </div>
        </div>
      )}
    </div>
  );
}

