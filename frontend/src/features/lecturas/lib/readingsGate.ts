import { Device } from '@/types';

/**
 * Semántica efectiva del kill switch, la misma que aplica el backend: se consulta al conector
 * solo si el dispositivo tiene las lecturas activas y, cuando es SENSOR, además el interruptor
 * general está encendido.
 *
 * Un dispositivo VIRTUAL sale a la red por su controlador, así que hereda su pausa. `findDevice`
 * resuelve `controlledByDeviceId` contra la lista que ya tiene la pantalla, porque las secciones
 * traen el id del controlador sin la fila entera.
 */
export function isReadingPaused(
  device: Device,
  sensorsEnabled: boolean,
  findDevice?: (id: string) => Device | undefined
): boolean {
  if (device.readingsEnabled === false) return true;
  if (device.type === 'SENSOR' && !sensorsEnabled) return true;

  if (device.connector === 'VIRTUAL') {
    const controller =
      device.controlledBy ??
      (device.controlledByDeviceId ? findDevice?.(device.controlledByDeviceId) : undefined);
    if (controller) {
      // Un solo salto: el controlador de un virtual es un aparato real, nunca otro virtual.
      if (controller.readingsEnabled === false) return true;
      if (controller.type === 'SENSOR' && !sensorsEnabled) return true;
    }
  }

  return false;
}
