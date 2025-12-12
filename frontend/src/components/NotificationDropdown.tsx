'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  Zap,
  Leaf,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { notificationService } from '@/services/notificationService';
import { Notification, NotificationType, NotificationPriority } from '@/types';

const typeConfig: Record<NotificationType, { icon: React.ElementType; color: string }> = {
  AUTOMATION: { icon: Zap, color: 'text-purple-400 bg-purple-500/20' },
  FEEDING_PLAN: { icon: Leaf, color: 'text-green-400 bg-green-500/20' },
  PREVENTION_PLAN: { icon: Leaf, color: 'text-cyan-400 bg-cyan-500/20' },
  MILESTONE: { icon: CheckCircle2, color: 'text-amber-400 bg-amber-500/20' },
  ALERT: { icon: AlertTriangle, color: 'text-red-400 bg-red-500/20' },
  SYSTEM: { icon: Info, color: 'text-blue-400 bg-blue-500/20' },
};

const priorityColors: Record<NotificationPriority, string> = {
  LOW: 'border-l-zinc-500',
  MEDIUM: 'border-l-blue-500',
  HIGH: 'border-l-amber-500',
  CRITICAL: 'border-l-red-500',
};

interface NotificationDropdownProps {
  onClose: () => void;
  onMarkAsRead: () => void;
}

export default function NotificationDropdown({ onClose, onMarkAsRead }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  async function loadNotifications() {
    setIsLoading(true);
    try {
      const data = await notificationService.getAll({ limit: 10 });
      setNotifications(data);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMarkAsRead(notification: Notification) {
    if (notification.read) return;
    
    try {
      await notificationService.markAsRead(notification.id);
      setNotifications(notifications.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      ));
      onMarkAsRead();
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-700 bg-zinc-800/80">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <span className="font-medium text-white">Notificaciones</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full">
              {unreadCount} nuevas
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Marcar todas
            </button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Lista de notificaciones */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          </div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-zinc-700/50">
            {notifications.map((notification) => {
              const typeInfo = typeConfig[notification.type];
              const TypeIcon = typeInfo.icon;
              
              return (
                <div
                  key={notification.id}
                  onClick={() => handleMarkAsRead(notification)}
                  className={`p-3 hover:bg-zinc-700/50 cursor-pointer transition-colors border-l-2 ${
                    priorityColors[notification.priority]
                  } ${!notification.read ? 'bg-zinc-700/30' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${typeInfo.color}`}>
                      <TypeIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${notification.read ? 'text-zinc-400' : 'text-white'}`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-amber-400 rounded-full shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-zinc-600">
                          {formatDate(notification.createdAt)}
                        </span>
                        {notification.actionUrl && (
                          <Link
                            href={notification.actionUrl}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
                          >
                            Ver más
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Bell className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">Sin notificaciones</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-2 border-t border-zinc-700 bg-zinc-800/80">
          <Link
            href="/notificaciones"
            onClick={onClose}
            className="block w-full text-center text-sm text-amber-400 hover:text-amber-300 py-2"
          >
            Ver todas las notificaciones
          </Link>
        </div>
      )}
    </motion.div>
  );
}





