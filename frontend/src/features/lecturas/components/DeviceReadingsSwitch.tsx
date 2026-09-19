'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { deviceService } from '@/services/deviceService';
import { Device } from '@/types';
import { cn } from '@/lib/utils';
import { useReadingsSettings } from '../hooks/useReadingsSettings';

interface DeviceReadingsSwitchProps {
  device: Device;
  /** Etiqueta al lado del interruptor. En `null` el interruptor va solo. */
  label?: string | null;
  /** Se llama después de guardar, para que la pantalla recargue su lista. */
  onChanged?: () => void;
  className?: string;
}

/**
 * Interruptor de lecturas de un dispositivo. Aplica a cualquier tipo: en un SENSOR corta la
 * lectura, en una luz o una bomba corta el poll de estado.
 */
export function DeviceReadingsSwitch({
  device,
  label = 'Lecturas',
  onChanged,
  className,
}: DeviceReadingsSwitchProps) {
  const queryClient = useQueryClient();
  const { sensorsEnabled } = useReadingsSettings();
  const [enabled, setEnabled] = useState(device.readingsEnabled !== false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(device.readingsEnabled !== false);
  }, [device.readingsEnabled]);

  const handleChange = useCallback(
    async (checked: boolean) => {
      if (saving) return;
      setSaving(true);
      setEnabled(checked);
      try {
        await deviceService.update(device.id, { readingsEnabled: checked });
        // Las carpas y la home leen los dispositivos de las secciones: se repintan solas.
        void queryClient.invalidateQueries({ queryKey: ['home'] });
        void queryClient.invalidateQueries({ queryKey: ['sala'] });
        void queryClient.invalidateQueries({ queryKey: ['carpa'] });
        onChanged?.();
      } catch {
        setEnabled(!checked);
      } finally {
        setSaving(false);
      }
    },
    [device.id, onChanged, queryClient, saving]
  );

  const switchId = `lecturas-${device.id}`;
  /** El aparato tiene sus lecturas activas y lo frena el interruptor general de sensores. */
  const frenadoPorGeneral = enabled && device.type === 'SENSOR' && !sensorsEnabled;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label ? (
        <label
          htmlFor={switchId}
          className={cn('whitespace-nowrap text-xs', enabled ? 'text-fg-muted' : 'text-offline')}
        >
          {label}
        </label>
      ) : null}
      <Switch
        id={switchId}
        checked={enabled}
        disabled={saving}
        onCheckedChange={handleChange}
        aria-label={`Lecturas de ${device.name}`}
      />
      {frenadoPorGeneral ? (
        <span className="whitespace-nowrap text-xs text-offline">General off</span>
      ) : null}
    </div>
  );
}
