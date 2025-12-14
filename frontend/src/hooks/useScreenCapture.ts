import { useState, useCallback } from 'react';

interface ScreenCaptureResult {
  dataUrl: string;
  blob: Blob;
}

interface UseScreenCaptureReturn {
  capturing: boolean;
  error: string | null;
  captureScreen: () => Promise<ScreenCaptureResult | null>;
  captureElement: (element: HTMLElement) => Promise<ScreenCaptureResult | null>;
}

/**
 * Hook para capturar pantalla usando html2canvas
 */
export function useScreenCapture(): UseScreenCaptureReturn {
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureScreen = useCallback(async (): Promise<ScreenCaptureResult | null> => {
    setCapturing(true);
    setError(null);

    try {
      // Importar html2canvas dinámicamente
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#1a1a2e', // Color de fondo de la app
        scale: 1, // Escala 1:1 para reducir tamaño
        logging: false,
        // Ignorar elementos que no queremos capturar
        ignoreElements: (element) => {
          // Ignorar el propio asistente de IA
          if (element.id === 'ai-assistant-container') return true;
          // Ignorar modales/overlays
          if (element.classList.contains('ai-assistant-overlay')) return true;
          return false;
        },
      });

      const dataUrl = canvas.toDataURL('image/png', 0.8);
      
      // Convertir a Blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      setCapturing(false);
      return { dataUrl, blob };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al capturar pantalla';
      setError(message);
      setCapturing(false);
      console.error('Screen capture error:', err);
      return null;
    }
  }, []);

  const captureElement = useCallback(async (element: HTMLElement): Promise<ScreenCaptureResult | null> => {
    setCapturing(true);
    setError(null);

    try {
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 1,
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png', 0.8);
      
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      setCapturing(false);
      return { dataUrl, blob };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al capturar elemento';
      setError(message);
      setCapturing(false);
      console.error('Element capture error:', err);
      return null;
    }
  }, []);

  return {
    capturing,
    error,
    captureScreen,
    captureElement,
  };
}

/**
 * Extrae base64 de un dataUrl
 */
export function dataUrlToBase64(dataUrl: string): string {
  const base64Index = dataUrl.indexOf('base64,');
  if (base64Index === -1) return dataUrl;
  return dataUrl.substring(base64Index + 7);
}

/**
 * Redimensiona una imagen para reducir tamaño
 */
export async function resizeImage(
  dataUrl: string,
  maxWidth = 1024,
  maxHeight = 768,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Calcular nuevas dimensiones manteniendo proporción
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Crear canvas y dibujar imagen redimensionada
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo obtener contexto del canvas'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = () => reject(new Error('Error al cargar imagen'));
    img.src = dataUrl;
  });
}
