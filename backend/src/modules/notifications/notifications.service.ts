import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto, UpdateNotificationDto } from './dto/notification.dto';
import { NotificationType, NotificationPriority, Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lista todas las notificaciones
   */
  async findAll(options?: {
    unreadOnly?: boolean;
    type?: NotificationType;
    limit?: number;
  }) {
    const { unreadOnly, type, limit } = options || {};

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
   * Crea una nueva notificación
   */
  async create(data: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        type: data.type,
        priority: data.priority || NotificationPriority.MEDIUM,
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        metadata: data.metadata as Prisma.InputJsonValue,
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




