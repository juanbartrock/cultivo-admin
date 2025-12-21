import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto, UpdateNotificationDto } from './dto/notification.dto';
import { NotificationType, NotificationPriority, Prisma } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  
  // Cooldown en minutos para cada tipo de notificación antes de permitir duplicados
  private readonly DEDUPE_COOLDOWN_MINUTES: Record<NotificationType, number> = {
    WEATHER: 360,        // 6 horas para alertas de clima
    AUTOMATION: 30,      // 30 minutos para automatizaciones
    ALERT: 60,           // 1 hora para alertas generales
    SYSTEM: 120,         // 2 horas para sistema
    FEEDING_PLAN: 1440,  // 24 horas para planes de alimentación
    PREVENTION_PLAN: 1440, // 24 horas para planes de prevención
    MILESTONE: 60,       // 1 hora para hitos
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Genera una clave de deduplicación basada en el contenido de la notificación
   */
  private generateDedupeKey(data: CreateNotificationDto): string {
    // Crear un hash basado en tipo + título + datos relevantes del mensaje
    const baseContent = `${data.type}:${data.title}`;
    
    // Para alertas de clima, incluir metadata para identificar la misma alerta
    let metadataKey = '';
    if (data.metadata) {
      // Extraer campos relevantes para deduplicación
      const { alertType, event, start, sender } = data.metadata as Record<string, unknown>;
      if (alertType) metadataKey += `:${alertType}`;
      if (event) metadataKey += `:${event}`;
      if (start) metadataKey += `:${start}`;
    }
    
    const content = baseContent + metadataKey;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Verifica si ya existe una notificación similar reciente
   */
  async findDuplicate(data: CreateNotificationDto): Promise<boolean> {
    const dedupeKey = this.generateDedupeKey(data);
    const cooldownMinutes = this.DEDUPE_COOLDOWN_MINUTES[data.type] || 60;
    const cooldownDate = new Date();
    cooldownDate.setMinutes(cooldownDate.getMinutes() - cooldownMinutes);

    // Buscar notificaciones similares creadas dentro del período de cooldown
    const existing = await this.prisma.notification.findFirst({
      where: {
        dedupeKey,
        createdAt: { gte: cooldownDate },
      },
    });

    return !!existing;
  }

  /**
   * Lista todas las notificaciones con paginación y filtros
   */
  async findAll(options?: {
    unreadOnly?: boolean;
    type?: NotificationType;
    limit?: number;
    offset?: number;
  }) {
    const { unreadOnly, type, limit, offset } = options || {};

    return this.prisma.notification.findMany({
      where: {
        ...(unreadOnly && { read: false }),
        ...(type && { type }),
      },
      orderBy: [
        { read: 'asc' }, // No leídas primero
        { priority: 'desc' }, // Mayor prioridad primero
        { createdAt: 'desc' },
      ],
      take: limit || 100,
      skip: offset || 0,
    });
  }

  /**
   * Cuenta total de notificaciones con filtros
   */
  async count(options?: {
    unreadOnly?: boolean;
    type?: NotificationType;
  }): Promise<number> {
    const { unreadOnly, type } = options || {};
    
    return this.prisma.notification.count({
      where: {
        ...(unreadOnly && { read: false }),
        ...(type && { type }),
      },
    });
  }

  /**
   * Obtiene una notificación por ID
   */
  async findById(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  /**
   * Crea una nueva notificación con deduplicación automática
   * Retorna null si se detectó un duplicado dentro del período de cooldown
   */
  async create(data: CreateNotificationDto) {
    // Verificar duplicados
    const isDuplicate = await this.findDuplicate(data);
    if (isDuplicate) {
      this.logger.debug(`Notificación duplicada ignorada: ${data.title}`);
      return null;
    }

    const dedupeKey = this.generateDedupeKey(data);

    return this.prisma.notification.create({
      data: {
        type: data.type,
        priority: data.priority || NotificationPriority.MEDIUM,
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        metadata: data.metadata as Prisma.InputJsonValue,
        dedupeKey,
      },
    });
  }

  /**
   * Crea una notificación forzando (ignorando deduplicación)
   * Útil para notificaciones que DEBEN crearse siempre
   */
  async createForced(data: CreateNotificationDto) {
    const dedupeKey = this.generateDedupeKey(data);

    return this.prisma.notification.create({
      data: {
        type: data.type,
        priority: data.priority || NotificationPriority.MEDIUM,
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        metadata: data.metadata as Prisma.InputJsonValue,
        dedupeKey,
      },
    });
  }

  /**
   * Marca una notificación como leída/no leída
   */
  async update(id: string, data: UpdateNotificationDto) {
    await this.findById(id);

    return this.prisma.notification.update({
      where: { id },
      data: {
        ...(data.read !== undefined && { read: data.read }),
      },
    });
  }

  /**
   * Marca una notificación como leída
   */
  async markAsRead(id: string) {
    return this.update(id, { read: true });
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  async markAllAsRead() {
    return this.prisma.notification.updateMany({
      where: { read: false },
      data: { read: true },
    });
  }

  /**
   * Elimina una notificación
   */
  async delete(id: string) {
    await this.findById(id);
    return this.prisma.notification.delete({ where: { id } });
  }

  /**
   * Elimina múltiples notificaciones
   */
  async deleteMany(ids: string[]) {
    const result = await this.prisma.notification.deleteMany({
      where: { id: { in: ids } },
    });
    return { deleted: result.count };
  }

  /**
   * Elimina todas las notificaciones leídas
   */
  async deleteAllRead() {
    const result = await this.prisma.notification.deleteMany({
      where: { read: true },
    });
    return { deleted: result.count };
  }

  /**
   * Elimina notificaciones antiguas (más de X días)
   */
  async deleteOld(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        read: true, // Solo eliminar las ya leídas
      },
    });
  }

  /**
   * Cuenta notificaciones no leídas
   */
  async countUnread(): Promise<number> {
    return this.prisma.notification.count({
      where: { read: false },
    });
  }

  /**
   * Obtiene resumen de notificaciones
   */
  async getSummary() {
    const [total, unread, byType, byPriority] = await Promise.all([
      this.prisma.notification.count(),
      this.prisma.notification.count({ where: { read: false } }),
      this.prisma.notification.groupBy({
        by: ['type'],
        _count: true,
        where: { read: false },
      }),
      this.prisma.notification.groupBy({
        by: ['priority'],
        _count: true,
        where: { read: false },
      }),
    ]);

    return {
      total,
      unread,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}





