'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { deviceService } from '@/services/deviceService';
import { useToast } from '@/contexts/ToastContext';
import type { Device, DeviceStatus, ManualHoldState } from '@/types';
import { activeHoldUntil, knownHoldUntil } from '../lib/manualHold';

export interface ManualHoldControl {
  active: boolean;
  holdUntil: string | null;
  remainingMs: number;
  releasing: boolean;
  release: () => Promise<void>;
  /** Toma la retención que devolvió `POST /devices/:id/control`. */
  applyControl: (hold?: ManualHoldState) => void;
}

/**
 * Retención manual de un dispositivo con cuenta regresiva. La fuente es `status.manualHold`
 * cuando el backend lo informó y `metadata.manualHold` si no; un control o una liberación hechos
 * en esta pantalla se ven al instante, sin esperar el próximo poll.
 */
export function useManualHold(
  device: Device | null | undefined,
  status?: DeviceStatus | null,
  onChanged?: () => void
): ManualHoldControl {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const server = device ? knownHoldUntil(device, status) : null;
  const deviceId = device?.id;
  const [holdUntil, setHoldUntil] = useState<string | null>(server);
  const [now, setNow] = useState(() => Date.now());
  const [releasing, setReleasing] = useState(false);

  useEffect(() => {
    setHoldUntil(server);
  }, [server]);

  useEffect(() => {
    if (!holdUntil) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [holdUntil]);

  const remainingMs = holdUntil ? Date.parse(holdUntil) - now : 0;
  const active = remainingMs > 0;

  const refreshLists = useCallback(() => {
    // Home, sala y carpa leen `metadata` de las secciones: se repintan con la retención nueva.
    void queryClient.invalidateQueries({ queryKey: ['home'] });
    void queryClient.invalidateQueries({ queryKey: ['sala'] });
    void queryClient.invalidateQueries({ queryKey: ['carpa'] });
  }, [queryClient]);

  const applyControl = useCallback(
    (hold?: ManualHoldState) => {
      if (!hold) return;
      setHoldUntil(activeHoldUntil(hold));
      refreshLists();
    },
    [refreshLists]
  );

  const release = useCallback(async () => {
    if (releasing || !deviceId) return;
    setReleasing(true);
    try {
      const state = await deviceService.releaseManualHold(deviceId);
      setHoldUntil(activeHoldUntil(state));
      refreshLists();
      onChanged?.();
    } catch (err) {
      toast.error(`No se pudo liberar: ${(err as Error).message}`);
    } finally {
      setReleasing(false);
    }
  }, [deviceId, onChanged, refreshLists, releasing, toast]);

  return {
    active,
    holdUntil: active ? holdUntil : null,
    remainingMs: active ? remainingMs : 0,
    releasing,
    release,
    applyControl,
  };
}
