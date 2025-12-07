/**
 * Device Service - Servicio para gestionar dispositivos IoT
 * 
 * Ahora todas las operaciones pasan por el backend NestJS (puerto 4000)
 * que se encarga de comunicarse con los microservicios individuales.
 */

import { api } from './apiService';
import {
  Device,
  ScannedDevice,
  Connector,
  DeviceType,
  DeviceStatus,
  AssignDeviceDto,
  // Legacy types para compatibilidad temporal
  DispositivoConector,
  TipoConector,
  connectorToTipoConector,
} from '@/types';

// ============================================
// TIPOS DE RESPUESTA
// ============================================

export interface DeviceScanResult {
  dispositivos: ScannedDevice[];
  errores: { conector: string; error: string }[];
  timestamp: string;
}

interface DeviceControlResponse {
  device: Device;
  action: string;
  result: { success: boolean };
}

interface DeviceStatusResponse {
  device: Device;
  status: DeviceStatus;
}

interface CameraStreamInfo {
  cameraIp: string;
  streamUrl: string;
  snapshotUrl: string;
  quality: 'high' | 'low';
}

interface SnapshotResponse {
  success: boolean;
  filename?: string;
  downloadUrl?: string;
}

interface SnapshotListResponse {
  device: Device;
  snapshots: {
    filename: string;
    size: number;
    created: string;
    url: string;
  }[];
}

// ============================================
// SERVICIO PRINCIPAL
// ============================================

export const deviceService = {
  /**
   * Lista todos los dispositivos registrados en la DB
   */
  getAll: () => api.get<Device[]>('/devices'),

  /**
   * Escanea todos los conectores IoT y devuelve dispositivos detectados
   * El backend consulta en paralelo Sonoff, Tuya y Tapo
   */
  scan: async (): Promise<DeviceScanResult> => {
    try {
      const devices = await api.get<ScannedDevice[]>('/devices/scan');
      return {
        dispositivos: devices,
        errores: [],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        dispositivos: [],
        errores: [{ conector: 'backend', error: (error as Error).message }],
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * Verifica el estado de salud de los conectores
   */
  getConnectorsHealth: () => api.get<Record<Connector, boolean>>('/devices/health'),

  /**
   * Obtiene un dispositivo por ID
   */
  getById: (id: string) => api.get<Device>(`/devices/${id}`),

  /**
   * Obtiene el estado en tiempo real de un dispositivo
   * Consulta al microservicio correspondiente
   */
  getStatus: (id: string) => api.get<DeviceStatusResponse>(`/devices/${id}/status`),

  /**
   * Asigna un dispositivo escaneado a una sección
   * Persiste el dispositivo en la base de datos
   */
  assign: (data: AssignDeviceDto) => api.post<Device>('/devices/assign', data),

  /**
   * Controla un dispositivo (encender/apagar)
   */
  control: (id: string, action: 'on' | 'off') =>
    api.post<DeviceControlResponse>(`/devices/${id}/control`, { action }),

  /**
   * Actualiza un dispositivo
   */
  update: (id: string, data: Partial<Device>) =>
    api.put<Device>(`/devices/${id}`, data),

  /**
   * Elimina un dispositivo de la DB
   */
  delete: (id: string) => api.delete(`/devices/${id}`),

  // ============================================
  // MÉTODOS PARA CÁMARAS
  // ============================================

  /**
   * Obtiene información del stream de una cámara TAPO
   */
  getStreamInfo: (id: string) => api.get<CameraStreamInfo | null>(`/devices/${id}/stream`),

  /**
   * Captura un snapshot de la cámara
   */
  captureSnapshot: (id: string) => api.post<SnapshotResponse>(`/devices/${id}/snapshot`),

  /**
   * Lista los snapshots disponibles de una cámara
   */
  listSnapshots: (id: string) => api.get<SnapshotListResponse>(`/devices/${id}/snapshots`),
};

// ============================================
// FUNCIONES LEGACY - Para compatibilidad temporal
// ============================================

/**
 * Escanear dispositivos - Wrapper legacy
 * @deprecated Usar deviceService.scan() directamente
 */
export async function fetchAllDevices(): Promise<{
  dispositivos: DispositivoConector[];
  errores: { conector: TipoConector; error: string }[];
  timestamp: string;
}> {
  const result = await deviceService.scan();
  
  // Convertir ScannedDevice a DispositivoConector (legacy)
  const dispositivos: DispositivoConector[] = result.dispositivos.map(d => ({
    id: d.id,
    nombre: d.name,
    conector: connectorToTipoConector(d.connector),
    online: d.online,
    categoria: d.category,
    modelo: d.model,
    marca: d.brand,
    ip: d.ip,
  }));

  return {
    dispositivos,
    errores: result.errores.map(e => ({
      conector: e.conector.toLowerCase() as TipoConector,
      error: e.error,
    })),
    timestamp: result.timestamp,
  };
}

/**
 * Obtener estado de dispositivo - Wrapper legacy
 * @deprecated Usar deviceService.getStatus() directamente
 */
export async function fetchDeviceStatus(
  conector: TipoConector,
  deviceId: string
): Promise<{ online: boolean; data?: Record<string, unknown> }> {
  try {
    // Buscar el dispositivo en la DB por externalId
    const devices = await deviceService.getAll();
    const device = devices.find(
      d => d.externalId === deviceId && d.connector.toLowerCase() === conector
    );

    if (!device) {
      return { online: false };
    }

    const response = await deviceService.getStatus(device.id);
    return {
      online: response.status.online,
      data: response.status,
    };
  } catch {
    return { online: false };
  }
}

/**
 * Controlar encendido/apagado - Wrapper legacy
 * @deprecated Usar deviceService.control() directamente
 */
export async function setDevicePower(
  conector: TipoConector,
  deviceId: string,
  state: 'on' | 'off'
): Promise<{ success: boolean; message?: string }> {
  try {
    // Buscar el dispositivo en la DB por externalId
    const devices = await deviceService.getAll();
    const device = devices.find(
      d => d.externalId === deviceId && d.connector.toLowerCase() === conector
    );

    if (!device) {
      return { success: false, message: 'Dispositivo no encontrado' };
    }

    const response = await deviceService.control(device.id, state);
    return {
      success: response.result.success,
      message: response.result.success ? 'OK' : 'Error al controlar dispositivo',
    };
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message,
    };
  }
}

export default deviceService;
