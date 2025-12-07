/**
 * Hook para obtener y actualizar estados de dispositivos en tiempo real
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { deviceService } from '@/services/deviceService';
import { Device, DeviceStatus } from '@/types';

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
      // Hacer todas las peticiones en paralelo
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
          // Si falla, marcar como offline
          newStatuses.set(devices[index].id, { online: false });
        }
      });

      setStatuses(newStatuses);
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

  useEffect(() => {
    isMounted.current = true;
    fetchAllStatuses();

    if (autoRefresh && pollingInterval > 0) {
      const interval = setInterval(fetchAllStatuses, pollingInterval);
      return () => {
        isMounted.current = false;
        clearInterval(interval);
      };
    }

    return () => {
      isMounted.current = false;
    };
  }, [fetchAllStatuses, autoRefresh, pollingInterval]);

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
