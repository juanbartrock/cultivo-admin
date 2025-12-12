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

export const notificationService = {
  /**
   * Lista todas las notificaciones
   */
  getAll: (options?: { unreadOnly?: boolean; type?: NotificationType; limit?: number }) => {
    const params = new URLSearchParams();
    if (options?.unreadOnly) params.append('unreadOnly', 'true');
    if (options?.type) params.append('type', options.type);
    if (options?.limit) params.append('limit', options.limit.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<Notification[]>(`/notifications${query}`);
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
};

export default notificationService;





