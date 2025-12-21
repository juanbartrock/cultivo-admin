/**
 * Notification Service - Servicio para gestionar notificaciones
 */

import { api } from './apiService';
import { Notification, NotificationType } from '@/types';

export interface NotificationSummary {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface NotificationListResponse {
  data: Notification[];
  total: number;
  limit: number;
  offset: number;
}

export const notificationService = {
  /**
   * Lista todas las notificaciones con paginación
   */
  getAll: async (options?: { 
    unreadOnly?: boolean; 
    type?: NotificationType; 
    limit?: number;
    offset?: number;
  }): Promise<NotificationListResponse> => {
    const params = new URLSearchParams();
    if (options?.unreadOnly) params.append('unreadOnly', 'true');
    if (options?.type) params.append('type', options.type);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<NotificationListResponse>(`/notifications${query}`);
  },

  /**
   * Lista notificaciones simple (para dropdown, compatibilidad)
   */
  getSimple: async (options?: { 
    unreadOnly?: boolean; 
    type?: NotificationType; 
    limit?: number;
  }): Promise<Notification[]> => {
    const response = await notificationService.getAll(options);
    return response.data;
  },

  /**
   * Obtiene una notificación por ID
   */
  getById: (id: string) => api.get<Notification>(`/notifications/${id}`),

  /**
   * Obtiene resumen de notificaciones
   */
  getSummary: () => api.get<NotificationSummary>('/notifications/summary'),

  /**
   * Cuenta notificaciones no leídas
   */
  countUnread: () => api.get<{ count: number }>('/notifications/unread-count'),

  /**
   * Marca una notificación como leída
   */
  markAsRead: (id: string) => api.patch<Notification>(`/notifications/${id}/read`, {}),

  /**
   * Marca todas las notificaciones como leídas
   */
  markAllAsRead: () => api.post('/notifications/mark-all-read', {}),

  /**
   * Elimina una notificación
   */
  delete: (id: string) => api.delete(`/notifications/${id}`),

  /**
   * Elimina múltiples notificaciones
   */
  deleteMany: (ids: string[]) => api.post<{ deleted: number }>('/notifications/delete-many', { ids }),

  /**
   * Elimina todas las notificaciones leídas
   */
  deleteAllRead: () => api.post<{ deleted: number }>('/notifications/delete-read', {}),
};

export default notificationService;





