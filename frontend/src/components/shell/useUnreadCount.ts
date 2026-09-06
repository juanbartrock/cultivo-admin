'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { notificationService } from '@/services/notificationService';

export const unreadCountKey = ['notifications', 'unread-count'] as const;

/**
 * Contador de notificaciones sin leer del shell: una sola consulta para toda la app.
 * Refresca cada 60 s y ante cada `alert` que emite el gateway de tiempo real.
 */
export function useUnreadCount() {
  const { isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: unreadCountKey,
    queryFn: async () => (await notificationService.countUnread()).count,
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!socket) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: unreadCountKey });
    };

    socket.on('alert', invalidate);
    return () => {
      socket.off('alert', invalidate);
    };
  }, [socket, queryClient]);

  return query.data ?? 0;
}
