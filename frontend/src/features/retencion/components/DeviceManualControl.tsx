'use client';

import { useState } from 'react';
import { Power } from 'lucide-react';
import { deviceService } from '@/services/deviceService';
import { useToast } from '@/contexts/ToastContext';
import type { Device } from '@/types';
import { useManualHold } from '../hooks/useManualHold';
import { controlToastMessage } from '../lib/manualHold';
import { ManualHoldBadge } from './ManualHoldBadge';

/** ON/OFF de una fila de `/artefactos` con la retención manual que deja el control. */
export function DeviceManualControl({ device }: { device: Device }) {
  const { toast } = useToast();
  const hold = useManualHold(device);
  const [controlling, setControlling] = useState(false);

  async function handleControl(action: 'on' | 'off') {
    setControlling(true);
    try {
      const response = await deviceService.control(device.id, action);
      if (!response.result.success) {
        toast.error(`${device.name}: el conector rechazó el comando`);
        return;
      }
      hold.applyControl(response.manualHold);
      toast.success(controlToastMessage(device.name, action, response.manualHold));
    } catch (error) {
      toast.error('Error al controlar: ' + (error as Error).message);
    } finally {
      setControlling(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleControl('on')}
          disabled={controlling}
          className="flex items-center gap-1 px-2 py-1 text-xs text-cultivo-green-400 hover:bg-cultivo-green-500/10 rounded transition-colors disabled:opacity-50"
        >
          <Power className="w-3 h-3" /> ON
        </button>
        <button
          onClick={() => handleControl('off')}
          disabled={controlling}
          className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-500/10 rounded transition-colors disabled:opacity-50"
        >
          <Power className="w-3 h-3" /> OFF
        </button>
      </div>
      <ManualHoldBadge hold={hold} compact />
    </div>
  );
}
