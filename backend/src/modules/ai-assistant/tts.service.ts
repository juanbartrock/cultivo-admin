import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TTSService {
  private readonly logger = new Logger(TTSService.name);
  private readonly apiKey: string | null;
  private readonly isConfigured: boolean;

  // Google Cloud TTS API endpoint
  private readonly TTS_API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

  constructor() {
    // Usar GOOGLE_CLOUD_TTS_API_KEY, fallback a GEMINI_API_KEY para compatibilidad
    this.apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY || process.env.GEMINI_API_KEY || null;
    this.isConfigured = !!this.apiKey;
    
    this.logger.log('========================================');
    this.logger.log('🔧 INICIALIZANDO SERVICIO TTS (Google Cloud)');
    this.logger.log(`📍 API Key presente: ${this.isConfigured ? 'SÍ' : 'NO'}`);
    
    if (this.apiKey) {
      this.logger.log(`📍 API Key (primeros 10 chars): ${this.apiKey.substring(0, 10)}...`);
      this.logger.log('✅ Google Cloud TTS configurado con Chirp3-HD');
    } else {
      this.logger.warn('⚠️ GOOGLE_CLOUD_TTS_API_KEY no configurada - TTS no disponible');
    }
    this.logger.log('========================================');
  }

  /**
   * Genera audio a partir de texto usando Google Cloud TTS con Chirp3-HD
   */
  async generateSpeech(text: string): Promise<Buffer | null> {
    this.logger.log('----------------------------------------');
    this.logger.log('🎤 SOLICITUD TTS RECIBIDA');
    this.logger.log(`📍 Texto (${text.length} chars): "${text.substring(0, 100)}..."`);
    this.logger.log(`📍 isConfigured: ${this.isConfigured}`);

    if (!this.isConfigured || !this.apiKey) {
      this.logger.warn('❌ TTS no disponible - API key no configurada');
      return null;
    }

    try {
      const cleanText = this.cleanTextForTTS(text);
      
      if (!cleanText || cleanText.length < 2) {
        this.logger.warn('❌ Texto muy corto o vacío para TTS');
        return null;
      }

      this.logger.log(`📍 Texto limpio (${cleanText.length} chars): "${cleanText.substring(0, 80)}..."`);
      this.logger.log('📍 Usando Google Cloud TTS con voz Chirp3-HD');

      // Configuración para Google Cloud TTS con Chirp3-HD
      const requestBody = {
        input: {
          text: cleanText,
        },
        voice: {
          languageCode: 'es-US',
          name: 'es-US-Chirp3-HD-Kore', // Voz Chirp3-HD masculina natural
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0,
          effectsProfileId: ['small-bluetooth-speaker-class-device'],
        },
      };

      this.logger.log(`📍 Request body: ${JSON.stringify(requestBody).substring(0, 200)}...`);

      const response = await fetch(`${this.TTS_API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      this.logger.log(`📍 Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`❌ Error de Google Cloud TTS: ${response.status}`);
        this.logger.error(`📍 Error body: ${errorText}`);
        
        // Si falla Chirp3-HD, intentar con WaveNet como fallback
        return await this.generateSpeechFallback(cleanText);
      }

      const data = await response.json();
      
      if (!data.audioContent) {
        this.logger.error('❌ No se recibió audioContent en la respuesta');
        return null;
      }

      const audioBuffer = Buffer.from(data.audioContent, 'base64');
      this.logger.log(`✅ Audio generado exitosamente: ${audioBuffer.length} bytes`);
      
      return audioBuffer;

    } catch (error: any) {
      this.logger.error('========================================');
      this.logger.error('❌ ERROR EN TTS');
      this.logger.error(`📍 Mensaje: ${error.message}`);
      this.logger.error(`📍 Stack: ${error.stack?.substring(0, 500)}`);
      this.logger.error('========================================');
      
      return null;
    }
  }

  /**
   * Fallback a voz WaveNet si Chirp3-HD falla
   */
  private async generateSpeechFallback(text: string): Promise<Buffer | null> {
    this.logger.log('📍 Intentando fallback con voz WaveNet...');

    try {
      const requestBody = {
        input: {
          text: text,
        },
        voice: {
          languageCode: 'es-ES',
          name: 'es-ES-Wavenet-B', // Voz WaveNet masculina
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0,
        },
      };

      const response = await fetch(`${this.TTS_API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`❌ Fallback WaveNet también falló: ${response.status}`);
        this.logger.error(`📍 Error: ${errorText}`);
        return null;
      }

      const data = await response.json();
      
      if (!data.audioContent) {
        return null;
      }

      const audioBuffer = Buffer.from(data.audioContent, 'base64');
      this.logger.log(`✅ Audio generado con WaveNet (fallback): ${audioBuffer.length} bytes`);
      
      return audioBuffer;

    } catch (error: any) {
      this.logger.error(`❌ Error en fallback WaveNet: ${error.message}`);
      return null;
    }
  }

  /**
   * Limpia el texto para TTS (elimina markdown, código, etc.)
   */
  private cleanTextForTTS(text: string): string {
    return text
      // Eliminar bloques de código
      .replace(/```[\s\S]*?```/g, ' ')
      // Eliminar código inline
      .replace(/`[^`]+`/g, '')
      // Eliminar negrita
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      // Eliminar itálica
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Eliminar headers markdown
      .replace(/#{1,6}\s/g, '')
      // Convertir links a solo texto
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Eliminar listas
      .replace(/^[-•*]\s/gm, '')
      .replace(/^\d+\.\s/gm, '')
      // Convertir saltos de línea a pausas
      .replace(/\n+/g, '. ')
      // Normalizar espacios
      .replace(/\s+/g, ' ')
      // Limitar longitud (Google Cloud TTS permite hasta 5000 caracteres)
      .substring(0, 1000)
      .trim();
  }

  /**
   * Verifica si el servicio está disponible
   */
  isAvailable(): boolean {
    this.logger.log(`📍 isAvailable() llamado: ${this.isConfigured}`);
    return this.isConfigured;
  }
}
