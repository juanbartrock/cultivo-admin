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

/**
 * Hook para obtener estados de múltiples dispositivos
 */
export function useDevicesStatus(
  devices: Device[],
  options: UseDeviceStatusOptions = {}
) {
  const { pollingInterval = 30000, autoRefresh = true } = options;
  const { socket, isConnected } = useSocket();

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
        // Merge logic if needed, but for now full replace is safer for "refresh"
        // However, preserving unknown states might be better?
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
  }, [devices]); // Removed statuses dependency to avoid loops

  // Efecto para Socket.IO
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleDeviceUpdate = (data: { deviceId: string; status: DeviceStatus }) => {
      setStatuses((prev) => {
        const newMap = new Map(prev);
        newMap.set(data.deviceId, data.status);
        return newMap;
      });
    };

    // Subscribirse a actualizaciones de dispositivos
    // En el futuro, podríamos suscribirnos solo a los `devices` de la lista,
    // pero por ahora escuchamos todos los eventos globales de 'device_update'
    socket.on('device_update', handleDeviceUpdate);

    return () => {
      socket.off('device_update', handleDeviceUpdate);
    };
  }, [socket, isConnected]);

  // Efecto para Polling (solo si no hay socket o para carga inicial)
  useEffect(() => {
    isMounted.current = true;

    // Siempre carga inicial
    fetchAllStatuses();

    // Setup polling only if socket is NOT connected or if explicit polling requested
    // Strategy: If socket is connected, we might still want polling as backup, 
    // but typically we can relax it. For now, let's keep polling but maybe less frequent?
    // Or strictly: if (autoRefresh && !isConnected)

    let interval: NodeJS.Timeout | null = null;

    if (autoRefresh && pollingInterval > 0) {
      // Si hay socket, podríamos aumentar el intervalo o desactivarlo.
      // E.g. cada 5 min para sincronizar por si acaso.
      // Por simplicidad, mantenemos polling pero el socket actualizará más rápido.
      interval = setInterval(fetchAllStatuses, pollingInterval);
    }

    return () => {
      isMounted.current = false;
      if (interval) clearInterval(interval);
    };
  }, [fetchAllStatuses, autoRefresh, pollingInterval]); // Removed isConnected dependency to prevent double fetch on connect

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
