'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Zap,
  Leaf,
  AlertTriangle,
  Info,
  CheckCircle2,
  Loader2,
  Cloud,
  Filter,
  Trash2,
  CheckCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  Archive,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { notificationService, NotificationSummary } from '@/services/notificationService';
import { Notification, NotificationType, NotificationPriority } from '@/types';
import { useToast } from '@/contexts/ToastContext';

// Configuración de iconos y colores por tipo
const typeConfig: Record<NotificationType, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  AUTOMATION: { icon: Zap, color: 'text-purple-400', bgColor: 'bg-purple-500/20', label: 'Automatización' },
  FEEDING_PLAN: { icon: Leaf, color: 'text-green-400', bgColor: 'bg-green-500/20', label: 'Plan de Alimentación' },
  PREVENTION_PLAN: { icon: Leaf, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', label: 'Plan de Prevención' },
  MILESTONE: { icon: CheckCircle2, color: 'text-amber-400', bgColor: 'bg-amber-500/20', label: 'Hito' },
  ALERT: { icon: AlertTriangle, color: 'text-red-400', bgColor: 'bg-red-500/20', label: 'Alerta' },
  SYSTEM: { icon: Info, color: 'text-blue-400', bgColor: 'bg-blue-500/20', label: 'Sistema' },
  WEATHER: { icon: Cloud, color: 'text-sky-400', bgColor: 'bg-sky-500/20', label: 'Clima' },
};

const priorityConfig: Record<NotificationPriority, { color: string; borderColor: string; label: string }> = {
  LOW: { color: 'text-zinc-400', borderColor: 'border-l-zinc-500', label: 'Baja' },
  MEDIUM: { color: 'text-blue-400', borderColor: 'border-l-blue-500', label: 'Media' },
  HIGH: { color: 'text-amber-400', borderColor: 'border-l-amber-500', label: 'Alta' },
  CRITICAL: { color: 'text-red-400', borderColor: 'border-l-red-500', label: 'Crítica' },
};

const ITEMS_PER_PAGE = 20;

export default function NotificacionesPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<NotificationType | 'ALL'>('ALL');
  const [filterRead, setFilterRead] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const [response, summaryData] = await Promise.all([
        notificationService.getAll({
          type: filterType === 'ALL' ? undefined : filterType,
          unreadOnly: filterRead === 'UNREAD',
          limit: ITEMS_PER_PAGE,
          offset: currentPage * ITEMS_PER_PAGE,
        }),
        notificationService.getSummary(),
      ]);
      
      let filteredData = response.data;
      
      // Filtro adicional por leídas (cuando filterRead === 'READ')
      if (filterRead === 'READ') {
        filteredData = filteredData.filter(n => n.read);
      }
      
      // Filtro por búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredData = filteredData.filter(n => 
          n.title.toLowerCase().includes(query) ||
          n.message.toLowerCase().includes(query)
        );
      }
      
      setNotifications(filteredData);
      setTotalCount(response.total);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Error al cargar notificaciones');
    } finally {
      setIsLoading(false);
    }
  }, [filterType, filterRead, currentPage, searchQuery, toast]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
    setSelectedIds(new Set());
  }, [filterType, filterRead, searchQuery]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} minutos`;
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-AR', { 
      day: 'numeric', 
      month: 'long',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatFullDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.read) return;
    
    try {
      await notificationService.markAsRead(notification.id);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      if (summary) {
        setSummary({ ...summary, unread: Math.max(0, summary.unread - 1) });
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Error al marcar como leída');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      if (summary) {
        setSummary({ ...summary, unread: 0 });
      }
      toast.success('Todas las notificaciones marcadas como leídas');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Error al marcar todas como leídas');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      await notificationService.deleteMany(Array.from(selectedIds));
      setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} notificaciones eliminadas`);
      loadNotifications();
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('Error al eliminar notificaciones');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllRead = async () => {
    setIsDeleting(true);
    try {
      const result = await notificationService.deleteAllRead();
      toast.success(`${result.deleted} notificaciones leídas eliminadas`);
      loadNotifications();
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      toast.error('Error al eliminar notificaciones leídas');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationService.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notificación eliminada');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Error al eliminar notificación');
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Agrupar notificaciones por fecha
  const groupedNotifications = notifications.reduce((acc, notification) => {
    const date = new Date(notification.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let groupKey: string;
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Ayer';
    } else {
      groupKey = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    }
    
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(notification);
    return acc;
  }, {} as Record<string, Notification[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-xl border border-amber-500/30">
                <Bell className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Notificaciones</h1>
                <p className="text-zinc-400 mt-1">
                  {summary ? (
                    <>
                      {summary.unread > 0 ? (
                        <span className="text-amber-400">{summary.unread} sin leer</span>
                      ) : (
                        <span>Todo al día</span>
                      )}
                      {' · '}{summary.total} total
                    </>
                  ) : 'Cargando...'}
                </p>
              </div>
            </div>
            
            <button
              onClick={loadNotifications}
              disabled={isLoading}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Actualizar"
            >
              <RefreshCw className={`w-5 h-5 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {Object.entries(summary.byType).map(([type, count]) => {
              const config = typeConfig[type as NotificationType];
              if (!config || count === 0) return null;
              return (
                <motion.button
                  key={type}
                  onClick={() => setFilterType(filterType === type ? 'ALL' : type as NotificationType)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 rounded-xl border transition-all ${
                    filterType === type 
                      ? `${config.bgColor} border-current ${config.color}` 
                      : 'bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <config.icon className={`w-5 h-5 ${config.color}`} />
                    <div className="text-left">
                      <p className="text-2xl font-bold text-white">{count}</p>
                      <p className="text-xs text-zinc-400">{config.label}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Filters & Actions Bar */}
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar notificaciones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showFilters || filterType !== 'ALL' || filterRead !== 'ALL'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
              {(filterType !== 'ALL' || filterRead !== 'ALL') && (
                <span className="px-1.5 py-0.5 text-xs bg-amber-500 text-black rounded-full">
                  {(filterType !== 'ALL' ? 1 : 0) + (filterRead !== 'ALL' ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar ({selectedIds.size})</span>
                </button>
              )}
              
              {summary && summary.unread > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-lg hover:border-zinc-600 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Marcar todas leídas</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Options */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-4 border-t border-zinc-700/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Filter by Type */}
                    <div>
                      <label className="text-sm text-zinc-400 mb-2 block">Tipo</label>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as NotificationType | 'ALL')}
                        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      >
                        <option value="ALL">Todos los tipos</option>
                        {Object.entries(typeConfig).map(([type, config]) => (
                          <option key={type} value={type}>{config.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter by Read Status */}
                    <div>
                      <label className="text-sm text-zinc-400 mb-2 block">Estado</label>
                      <select
                        value={filterRead}
                        onChange={(e) => setFilterRead(e.target.value as 'ALL' | 'UNREAD' | 'READ')}
                        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      >
                        <option value="ALL">Todas</option>
                        <option value="UNREAD">Sin leer</option>
                        <option value="READ">Leídas</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => {
                        setFilterType('ALL');
                        setFilterRead('ALL');
                        setSearchQuery('');
                      }}
                      className="text-sm text-zinc-400 hover:text-white"
                    >
                      Limpiar filtros
                    </button>
                    
                    <button
                      onClick={handleDeleteAllRead}
                      disabled={isDeleting}
                      className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      <Archive className="w-4 h-4" />
                      <span>Eliminar todas las leídas</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Select All */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={selectAll}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
            >
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                selectedIds.size === notifications.length && notifications.length > 0
                  ? 'bg-amber-500 border-amber-500'
                  : 'border-zinc-600 hover:border-zinc-500'
              }`}>
                {selectedIds.size === notifications.length && notifications.length > 0 && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                )}
              </div>
              <span>Seleccionar todo</span>
            </button>
            {selectedIds.size > 0 && (
              <span className="text-sm text-zinc-500">
                {selectedIds.size} seleccionadas
              </span>
            )}
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-4" />
              <p className="text-zinc-400">Cargando notificaciones...</p>
            </div>
          ) : notifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-10 h-10 text-zinc-600" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Sin notificaciones</h3>
              <p className="text-zinc-500 max-w-md mx-auto">
                {searchQuery || filterType !== 'ALL' || filterRead !== 'ALL'
                  ? 'No hay notificaciones que coincidan con los filtros aplicados'
                  : 'No tienes notificaciones por el momento. Te avisaremos cuando haya algo nuevo.'}
              </p>
            </motion.div>
          ) : (
            Object.entries(groupedNotifications).map(([groupKey, groupNotifications], groupIndex) => (
              <motion.div
                key={groupKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.1 }}
              >
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <h3 className="text-sm font-medium text-zinc-400 capitalize">{groupKey}</h3>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>

                {/* Notifications for this date */}
                <div className="space-y-2">
                  {groupNotifications.map((notification, index) => {
                    const typeInfo = typeConfig[notification.type];
                    const priorityInfo = priorityConfig[notification.priority];
                    const TypeIcon = typeInfo.icon;
                    const isSelected = selectedIds.has(notification.id);

                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`group relative bg-zinc-800/50 border rounded-xl overflow-hidden transition-all hover:bg-zinc-800 ${
                          isSelected 
                            ? 'border-amber-500/50 ring-1 ring-amber-500/30' 
                            : notification.read 
                              ? 'border-zinc-700/30' 
                              : 'border-zinc-700/50'
                        } ${priorityInfo.borderColor} border-l-4`}
                      >
                        <div className="flex items-start gap-4 p-4">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleSelect(notification.id)}
                            className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors mt-1 ${
                              isSelected
                                ? 'bg-amber-500 border-amber-500'
                                : 'border-zinc-600 hover:border-zinc-500'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                          </button>

                          {/* Icon */}
                          <div className={`shrink-0 p-2.5 rounded-xl ${typeInfo.bgColor}`}>
                            <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
                          </div>

                          {/* Content */}
                          <div 
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => handleMarkAsRead(notification)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className={`font-medium ${notification.read ? 'text-zinc-400' : 'text-white'}`}>
                                  {notification.title}
                                </h4>
                                <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                              </div>
                              
                              {!notification.read && (
                                <span className="shrink-0 w-2.5 h-2.5 bg-amber-400 rounded-full mt-1.5 animate-pulse" />
                              )}
                            </div>

                            {/* Meta info */}
                            <div className="flex items-center gap-3 mt-3">
                              <span className="text-xs text-zinc-600" title={formatFullDate(notification.createdAt)}>
                                {formatDate(notification.createdAt)}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.bgColor} ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              {notification.priority !== 'LOW' && (
                                <span className={`text-xs ${priorityInfo.color}`}>
                                  Prioridad {priorityInfo.label}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            {notification.actionUrl && (
                              <Link
                                href={notification.actionUrl}
                                className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                                title="Ver detalles"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Link>
                            )}
                            <button
                              onClick={() => handleDelete(notification.id)}
                              className="p-2 hover:bg-red-500/20 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-zinc-400" />
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i;
                } else if (currentPage < 3) {
                  pageNum = i;
                } else if (currentPage > totalPages - 4) {
                  pageNum = totalPages - 5 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? 'bg-amber-500 text-black font-semibold'
                        : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        )}

        {/* Footer info */}
        {notifications.length > 0 && (
          <p className="text-center text-sm text-zinc-600 mt-6">
            Mostrando {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalCount)} de {totalCount} notificaciones
          </p>
        )}
      </div>
    </div>
  );
}

