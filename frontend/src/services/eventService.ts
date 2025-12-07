/**
 * Event Service - Servicio para gestionar eventos/bitácora
 * 
 * Registra todas las actividades del cultivo:
 * - Riegos
 * - Notas
 * - Fotos
 * - Parámetros ambientales
 * - Podas, transplantes, etc.
 */

import { api } from './apiService';
import {
  GrowEvent,
  EventType,
  WaterEventDto,
  NoteEventDto,
  EnvironmentEventDto,
  PhotoEventDto,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// ============================================
// TIPOS DE FILTROS
// ============================================

export interface EventFilters {
  plantId?: string;
  cycleId?: string;
  sectionId?: string;
  type?: EventType;
  limit?: number;
  offset?: number;
}

// ============================================
// EVENT SERVICE
// ============================================

export const eventService = {
  /**
   * Lista eventos con filtros opcionales
   */
  getAll: (filters?: EventFilters) => {
    const params = new URLSearchParams();
    if (filters?.plantId) params.set('plantId', filters.plantId);
    if (filters?.cycleId) params.set('cycleId', filters.cycleId);
    if (filters?.sectionId) params.set('sectionId', filters.sectionId);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.limit) params.set('limit', filters.limit.toString());
    if (filters?.offset) params.set('offset', filters.offset.toString());
    const query = params.toString();
    return api.get<GrowEvent[]>(`/events${query ? `?${query}` : ''}`);
  },

  /**
   * Obtiene un evento por ID
   */
  getById: (id: string) => api.get<GrowEvent>(`/events/${id}`),

  /**
   * Obtiene estadísticas de eventos
   */
  getStats: (filters?: { cycleId?: string; sectionId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.cycleId) params.set('cycleId', filters.cycleId);
    if (filters?.sectionId) params.set('sectionId', filters.sectionId);
    const query = params.toString();
    return api.get<Record<string, number>>(`/events/stats${query ? `?${query}` : ''}`);
  },

  /**
   * Registra un evento de riego
   */
  createWaterEvent: (data: WaterEventDto) =>
    api.post<GrowEvent>('/events/water', data),

  /**
   * Crea una nota
   */
  createNoteEvent: (data: NoteEventDto) =>
    api.post<GrowEvent>('/events/note', data),

  /**
   * Registra parámetros ambientales
   */
  createEnvironmentEvent: (data: EnvironmentEventDto) =>
    api.post<GrowEvent>('/events/environment', data),

  /**
   * Sube una foto
   * Usa FormData porque incluye archivo
   */
  createPhotoEvent: async (data: PhotoEventDto, file: File): Promise<GrowEvent> => {
    const formData = new FormData();
    formData.append('file', file);
    if (data.plantId) formData.append('plantId', data.plantId);
    if (data.cycleId) formData.append('cycleId', data.cycleId);
    if (data.sectionId) formData.append('sectionId', data.sectionId);
    if (data.caption) formData.append('caption', data.caption);

    const response = await fetch(`${API_BASE}/events/photo`, {
      method: 'POST',
      body: formData,
      // No incluir Content-Type, el browser lo pone automáticamente con boundary
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },

  /**
   * Crea un evento genérico
   */
  create: (data: {
    type: EventType;
    plantId?: string;
    cycleId?: string;
    sectionId?: string;
    data: Record<string, unknown>;
  }) => api.post<GrowEvent>('/events', data),

  /**
   * Elimina un evento
   */
  delete: (id: string) => api.delete(`/events/${id}`),

  // ============================================
  // MÉTODOS DE CONVENIENCIA
  // ============================================

  /**
   * Obtiene los últimos eventos de una planta
   */
  getPlantHistory: (plantId: string, limit = 10) =>
    eventService.getAll({ plantId, limit }),

  /**
   * Obtiene los últimos eventos de un ciclo
   */
  getCycleHistory: (cycleId: string, limit = 20) =>
    eventService.getAll({ cycleId, limit }),

  /**
   * Obtiene los últimos eventos de una sección
   */
  getSectionHistory: (sectionId: string, limit = 20) =>
    eventService.getAll({ sectionId, limit }),

  /**
   * Obtiene solo eventos de riego
   */
  getWaterEvents: (filters?: Omit<EventFilters, 'type'>) =>
    eventService.getAll({ ...filters, type: 'RIEGO' }),

  /**
   * Obtiene solo notas
   */
  getNotes: (filters?: Omit<EventFilters, 'type'>) =>
    eventService.getAll({ ...filters, type: 'NOTA' }),

  /**
   * Obtiene solo fotos
   */
  getPhotos: (filters?: Omit<EventFilters, 'type'>) =>
    eventService.getAll({ ...filters, type: 'FOTO' }),
};

// ============================================
// UTILIDADES
// ============================================

/**
 * Formatea la fecha de un evento para mostrar
 */
export function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora mismo';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays} días`;

  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Obtiene el ícono y color según el tipo de evento
 */
export function getEventTypeInfo(type: EventType): {
  label: string;
  color: string;
  bgColor: string;
} {
  const typeMap: Record<EventType, { label: string; color: string; bgColor: string }> = {
    RIEGO: { label: 'Riego', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    PODA: { label: 'Poda', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
    CAMBIO_FOTOPERIODO: { label: 'Fotoperiodo', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
    TRANSPLANTE: { label: 'Transplante', color: 'text-green-400', bgColor: 'bg-green-500/20' },
    NOTA: { label: 'Nota', color: 'text-zinc-400', bgColor: 'bg-zinc-500/20' },
    FOTO: { label: 'Foto', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
    PARAMETRO_AMBIENTAL: { label: 'Ambiente', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  };

  return typeMap[type] || { label: type, color: 'text-zinc-400', bgColor: 'bg-zinc-500/20' };
}

export default eventService;
