/**
 * Hook para obtener y actualizar estados de dispositivos en tiempo real
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { deviceService } from '@/services/deviceService';
import { Device, DeviceStatus } from '@/types';
import { useSocket } from '@/contexts/SocketContext';

interface DeviceWithStatus {
  device: Device;
  status: DeviceStatus | null;
  loading: boolean;
  error: string | null;
}

interface UseDeviceStatusOptions {
  /** Intervalo de polling en ms (default: 30000 = 30s) */
  pollingInterval?: number;
  /** Si es true, hace polling automático */
  autoRefresh?: boolean;
}

/**
 * Hook para obtener el estado de un dispositivo individual
 */
export function useDeviceStatus(
  deviceId: string,
  options: UseDeviceStatusOptions = {}
) {
  const { pollingInterval = 30000, autoRefresh = true } = options;

  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await deviceService.getStatus(deviceId);
      setStatus(response.status);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchStatus();

    if (autoRefresh && pollingInterval > 0) {
      const interval = setInterval(fetchStatus, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStatus, autoRefresh, pollingInterval]);

  return { status, loading, error, refresh: fetchStatus };
}

interface UseDevicesStatusOptionsWithSection extends UseDeviceStatusOptions {
  /** ID de la sección para suscribirse a actualizaciones via WebSocket */
  sectionId?: string;
}

/**
 * Hook para obtener estados de múltiples dispositivos
 * Ahora soporta suscripción a rooms de sección para recibir actualizaciones en tiempo real
 */
export function useDevicesStatus(
  devices: Device[],
  options: UseDevicesStatusOptionsWithSection = {}
) {
  const { pollingInterval = 30000, autoRefresh = true, sectionId } = options;
  const { socket, isConnected, joinSection, leaveSection } = useSocket();

  const [statuses, setStatuses] = useState<Map<string, DeviceStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchAllStatuses = useCallback(async () => {
    if (devices.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // Hacer todas las peticiones en paralelo para estado inicial
      const results = await Promise.allSettled(
        devices.map(async (device) => {
          const response = await deviceService.getStatus(device.id);
          return { id: device.id, status: response.status };
        })
      );

      if (!isMounted.current) return;

      const newStatuses = new Map<string, DeviceStatus>();

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          newStatuses.set(result.value.id, result.value.status);
        } else {
          // Si falla, usar estado anterior o marcar offline
          const prev = statuses.get(devices[index].id);
          if (prev) {
            newStatuses.set(devices[index].id, prev);
          } else {
            newStatuses.set(devices[index].id, { online: false });
          }
        }
      });

      setStatuses((prev) => {
        return newStatuses;
      });
      setError(null);
    } catch (err) {
      if (isMounted.current) {
        setError((err as Error).message);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [devices]);

  // Efecto para suscribirse a la sección via WebSocket
  useEffect(() => {
    if (!sectionId || !isConnected) return;

    // Unirse a la room de la sección para recibir actualizaciones
    joinSection(sectionId);

    return () => {
      // Salir de la room al desmontar
      leaveSection(sectionId);
    };
  }, [sectionId, isConnected, joinSection, leaveSection]);

  // Efecto para Socket.IO - escuchar actualizaciones
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleDeviceUpdate = (data: { deviceId: string; status: DeviceStatus; sectionId?: string }) => {
      // Solo actualizar si el dispositivo está en nuestra lista
      const deviceIds = devices.map(d => d.id);
      if (deviceIds.includes(data.deviceId)) {
        setStatuses((prev) => {
          const newMap = new Map(prev);
          newMap.set(data.deviceId, data.status);
          return newMap;
        });
      }
    };

    const handleSensorUpdate = (data: { deviceId: string; reading: any; sectionId?: string }) => {
      // Actualizar el status con los datos del sensor
      const deviceIds = devices.map(d => d.id);
      if (deviceIds.includes(data.deviceId)) {
        setStatuses((prev) => {
          const newMap = new Map(prev);
          const currentStatus = prev.get(data.deviceId) || { online: true };
          newMap.set(data.deviceId, {
            ...currentStatus,
            online: true,
            temperature: data.reading.temperature,
            humidity: data.reading.humidity,
            co2: data.reading.co2,
            vpd: data.reading.vpd,
          });
          return newMap;
        });
      }
    };

    socket.on('device_update', handleDeviceUpdate);
    socket.on('sensor_update', handleSensorUpdate);

    return () => {
      socket.off('device_update', handleDeviceUpdate);
      socket.off('sensor_update', handleSensorUpdate);
    };
  }, [socket, isConnected, devices]);

  // Efecto para Polling (carga inicial + backup si socket no está conectado)
  useEffect(() => {
    isMounted.current = true;

    // Siempre carga inicial
    fetchAllStatuses();

    let interval: NodeJS.Timeout | null = null;

    if (autoRefresh && pollingInterval > 0) {
      // Si hay socket conectado, reducir frecuencia de polling (solo como backup)
      const effectiveInterval = isConnected ? pollingInterval * 2 : pollingInterval;
      interval = setInterval(fetchAllStatuses, effectiveInterval);
    }

    return () => {
      isMounted.current = false;
      if (interval) clearInterval(interval);
    };
  }, [fetchAllStatuses, autoRefresh, pollingInterval, isConnected]);

  const getStatus = useCallback(
    (deviceId: string): DeviceStatus | null => {
      return statuses.get(deviceId) || null;
    },
    [statuses]
  );

  return { statuses, getStatus, loading, error, refresh: fetchAllStatuses };
}

/**
 * Hook para controlar un dispositivo (on/off)
 */
export function useDeviceControl(deviceId: string) {
  const [controlling, setControlling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const control = useCallback(
    async (action: 'on' | 'off') => {
      setControlling(true);
      setError(null);

      try {
        const result = await deviceService.control(deviceId, action);
        return result.result.success;
      } catch (err) {
        setError((err as Error).message);
        return false;
      } finally {
        setControlling(false);
      }
    },
    [deviceId]
  );

  const turnOn = useCallback(() => control('on'), [control]);
  const turnOff = useCallback(() => control('off'), [control]);
  const toggle = useCallback(
    async (currentState: boolean) => {
      return control(currentState ? 'off' : 'on');
    },
    [control]
  );

  return { control, turnOn, turnOff, toggle, controlling, error };
}

export default useDeviceStatus;
