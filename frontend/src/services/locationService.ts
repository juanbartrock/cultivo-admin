/**
 * Location Service - Servicio para gestionar salas y secciones
 * 
 * Maneja la estructura física del cultivo:
 * - Rooms (Salas): Espacios físicos principales
 * - Sections (Secciones/Carpas): Subdivisiones dentro de las salas
 */

import { api } from './apiService';
import {
  Room,
  Section,
  SectionDashboard,
  CreateSectionDto,
  SectionLayout,
  SectionLayoutConfig,
} from '@/types';

// ============================================
// ROOM SERVICE - Gestión de Salas
// ============================================

export const roomService = {
  /**
   * Lista todas las salas
   */
  getAll: () => api.get<Room[]>('/rooms'),

  /**
   * Obtiene una sala por ID (incluye secciones)
   */
  getById: (id: string) => api.get<Room>(`/rooms/${id}`),

  /**
   * Crea una nueva sala
   */
  create: (data: { name: string; description?: string }) =>
    api.post<Room>('/rooms', data),

  /**
   * Actualiza una sala
   */
  update: (id: string, data: Partial<Room>) =>
    api.put<Room>(`/rooms/${id}`, data),

  /**
   * Elimina una sala
   */
  delete: (id: string) => api.delete(`/rooms/${id}`),

  /**
   * Obtiene las secciones de una sala
   */
  getSections: (id: string) => api.get<Section[]>(`/rooms/${id}/sections`),
};

// ============================================
// SECTION SERVICE - Gestión de Secciones/Carpas
// ============================================

export const sectionService = {
  /**
   * Lista todas las secciones
   */
  getAll: () => api.get<Section[]>('/sections'),

  /**
   * Obtiene una sección por ID
   */
  getById: (id: string) => api.get<Section>(`/sections/${id}`),

  /**
   * Obtiene el dashboard de una sección
   * Incluye dispositivos, plantas y resumen estadístico
   */
  getDashboard: (id: string) => api.get<SectionDashboard>(`/sections/${id}/dashboard`),

  /**
   * Crea una nueva sección
   */
  create: (data: CreateSectionDto) => api.post<Section>('/sections', data),

  /**
   * Actualiza una sección
   */
  update: (id: string, data: Partial<Section>) =>
    api.put<Section>(`/sections/${id}`, data),

  /**
   * Elimina una sección
   */
  delete: (id: string) => api.delete(`/sections/${id}`),

  /**
   * Obtiene la configuración de layout de una sección
   */
  getLayout: (id: string) => api.get<SectionLayout>(`/sections/${id}/layout`),

  /**
   * Actualiza la configuración de layout de una sección
   */
  updateLayout: (id: string, config: SectionLayoutConfig) =>
    api.put<SectionLayout>(`/sections/${id}/layout`, config),
};

// ============================================
// UTILIDADES
// ============================================

/**
 * Obtiene todas las ubicaciones disponibles para asignar dispositivos
 * Combina salas y secciones en un formato uniforme
 */
export async function getAllLocations(): Promise<
  { id: string; name: string; type: 'room' | 'section'; parentName?: string }[]
> {
  try {
    const [rooms, sections] = await Promise.all([
      roomService.getAll(),
      sectionService.getAll(),
    ]);

    const locations: { id: string; name: string; type: 'room' | 'section'; parentName?: string }[] = [];

    // Agregar salas
    rooms.forEach(room => {
      locations.push({
        id: room.id,
        name: room.name,
        type: 'room',
      });
    });

    // Agregar secciones con referencia a la sala padre
    sections.forEach(section => {
      const parentRoom = rooms.find(r => r.id === section.roomId);
      locations.push({
        id: section.id,
        name: section.name,
        type: 'section',
        parentName: parentRoom?.name,
      });
    });

    return locations;
  } catch {
    return [];
  }
}

export default {
  roomService,
  sectionService,
  getAllLocations,
};
