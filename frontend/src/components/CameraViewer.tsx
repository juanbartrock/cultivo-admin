'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Video, 
  Camera, 
  RefreshCw, 
  Maximize2, 
  Minimize2,
  Loader2,
  AlertCircle,
  Clock,
  Download
} from 'lucide-react';
import { Device, DeviceStatus } from '@/types';
import { deviceService } from '@/services/deviceService';

interface CameraViewerProps {
  device: Device;
  status: DeviceStatus | null;
  loading?: boolean;
}

export default function CameraViewer({ device, status, loading = false }: CameraViewerProps) {
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Obtener la URL del tapo service desde el status
  const tapoServiceUrl = (status as Record<string, unknown>)?.tapoServiceUrl as string | undefined;

  // Función para capturar un snapshot
  const captureSnapshot = useCallback(async () => {
    if (capturing) return;
    
    setCapturing(true);
    setError(null);

    try {
      const result = await deviceService.captureSnapshot(device.id);
      
      if (result.success && result.filename && tapoServiceUrl) {
        // Agregar timestamp para evitar caché
        const url = `${tapoServiceUrl}/snapshots/${result.filename}?t=${Date.now()}`;
        setSnapshotUrl(url);
        setLastUpdate(new Date());
      } else {
        setError('No se pudo capturar el snapshot');
      }
    } catch (err) {
      console.error('Error capturando snapshot:', err);
      setError('Error al conectar con la cámara');
    } finally {
      setCapturing(false);
    }
  }, [device.id, capturing, tapoServiceUrl]);

  // Cargar el último snapshot disponible al montar
  const loadLatestSnapshot = useCallback(async () => {
    if (!tapoServiceUrl) return;

    try {
      const result = await deviceService.listSnapshots(device.id);
      
      if (result.snapshots && result.snapshots.length > 0) {
        const latest = result.snapshots[0];
        setSnapshotUrl(`${latest.url}?t=${Date.now()}`);
        setLastUpdate(new Date(latest.created));
      } else {
        // Si no hay snapshots, capturar uno nuevo
        await captureSnapshot();
      }
    } catch (err) {
      console.error('Error cargando snapshots:', err);
      // Intentar capturar uno nuevo
      await captureSnapshot();
    }
  }, [device.id, tapoServiceUrl, captureSnapshot]);

  // Cargar snapshot inicial
  useEffect(() => {
    if (tapoServiceUrl) {
      loadLatestSnapshot();
    }
  }, [tapoServiceUrl]);

  // Auto-refresh cada 30 segundos si está habilitado
  useEffect(() => {
    if (!autoRefresh || !tapoServiceUrl) return;

    const interval = setInterval(() => {
      captureSnapshot();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, captureSnapshot, tapoServiceUrl]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  // Escuchar cambios de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Estado de carga inicial
  if (loading && !snapshotUrl) {
    return (
      <div className="aspect-video bg-zinc-900/50 rounded-lg flex flex-col items-center justify-center gap-3 border border-zinc-700/50">
        <Loader2 className="w-8 h-8 text-cultivo-green-500 animate-spin" />
        <span className="text-sm text-zinc-400">Conectando con la cámara...</span>
      </div>
    );
  }

  // Si no hay tapoServiceUrl, la cámara no está configurada correctamente
  if (!tapoServiceUrl) {
    return (
      <div className="aspect-video bg-zinc-900/50 rounded-lg flex flex-col items-center justify-center gap-3 border border-zinc-700/50">
        <AlertCircle className="w-8 h-8 text-yellow-500/60" />
        <span className="text-sm text-zinc-400">Cámara no configurada</span>
        <span className="text-xs text-zinc-500">Verifica la conexión con el servicio TAPO</span>
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`relative rounded-lg overflow-hidden border border-zinc-700/50 bg-zinc-900 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* Vista de la cámara */}
      <div className={`relative ${isFullscreen ? 'h-full' : 'aspect-video'}`}>
        {snapshotUrl ? (
          <img
            src={snapshotUrl}
            alt={`Vista de ${device.name}`}
            className="w-full h-full object-contain bg-black"
            onError={() => setError('Error al cargar la imagen')}
          />
        ) : error ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-zinc-900">
            <AlertCircle className="w-10 h-10 text-red-400/60" />
            <span className="text-sm text-zinc-400">{error}</span>
            <button
              onClick={captureSnapshot}
              className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-zinc-300 transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-zinc-900">
            <Video className="w-10 h-10 text-zinc-600" />
            <span className="text-sm text-zinc-400">Sin imagen disponible</span>
          </div>
        )}

        {/* Overlay de carga */}
        {capturing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-zinc-800 px-4 py-2 rounded-lg">
              <Loader2 className="w-4 h-4 text-cultivo-green-500 animate-spin" />
              <span className="text-sm text-white">Capturando...</span>
            </div>
          </div>
        )}

        {/* Indicador de conexión */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status?.online !== false ? 'bg-cultivo-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-xs text-white/80 bg-black/50 px-2 py-0.5 rounded">
            {device.name}
          </span>
        </div>

        {/* Timestamp */}
        {lastUpdate && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded">
            <Clock className="w-3 h-3 text-white/60" />
            <span className="text-xs text-white/80">
              {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Controles */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Botón capturar */}
            <button
              onClick={captureSnapshot}
              disabled={capturing}
              className="flex items-center gap-1.5 bg-black/60 hover:bg-black/80 px-3 py-1.5 rounded-lg text-white text-sm transition-colors disabled:opacity-50"
              title="Capturar snapshot"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Capturar</span>
            </button>

            {/* Botón refresh */}
            <button
              onClick={captureSnapshot}
              disabled={capturing}
              className="flex items-center justify-center w-8 h-8 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors disabled:opacity-50"
              title="Actualizar imagen"
            >
              <RefreshCw className={`w-4 h-4 ${capturing ? 'animate-spin' : ''}`} />
            </button>

            {/* Toggle auto-refresh */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                autoRefresh 
                  ? 'bg-cultivo-green-600/80 text-white' 
                  : 'bg-black/60 hover:bg-black/80 text-white/80'
              }`}
              title={autoRefresh ? 'Auto-refresh activo' : 'Auto-refresh desactivado'}
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">Auto</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Descargar */}
            {snapshotUrl && (
              <a
                href={snapshotUrl}
                download={`${device.name}-${Date.now()}.jpg`}
                className="flex items-center justify-center w-8 h-8 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors"
                title="Descargar imagen"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="flex items-center justify-center w-8 h-8 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
