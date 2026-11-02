/**
 * Agenda Service - Bloque "Hoy" de Inicio: resumen de los períodos de luz, tareas de los planes
 * y manuales, riegos y próximos hitos de cada carpa con ciclo activo.
 */

import { api } from './apiService';
import { AgendaToday, TaskInput, WateringInput } from '@/types';

export const agendaService = {
  /** Una entrada por carpa con plantas de un ciclo activo. */
  getToday: () => api.get<AgendaToday>('/agenda/today'),

  createTask: (data: TaskInput) => api.post('/agenda/tasks', data),

  /** Editar una tarea pendiente, omitirla (`SKIPPED`) o reabrirla (`PENDING`). */
  updateTask: (id: string, data: Partial<Omit<TaskInput, 'sectionId'>> & { status?: 'PENDING' | 'SKIPPED' }) =>
    api.patch(`/agenda/tasks/${id}`, data),

  deleteTask: (id: string) => api.delete(`/agenda/tasks/${id}`),

  /** Marca hecha; si la tarea tiene evento, lo escribe en la bitácora. */
  completeTask: (id: string, note?: string) => api.post(`/agenda/tasks/${id}/complete`, note ? { note } : {}),

  /** Registra la aplicación del preventivo de hoy como nota en sus plantas. */
  completePrevention: (sectionId: string, key: string, note?: string) =>
    api.post('/agenda/prevention/complete', { sectionId, key, ...(note ? { note } : {}) }),

  /** Un evento RIEGO por planta. */
  registerWatering: (data: WateringInput) =>
    api.post<{ created: number }>('/agenda/watering', data),
};

export default agendaService;
