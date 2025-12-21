import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, UpdateNotificationDto } from './dto/notification.dto';
import { NotificationType } from '@prisma/client';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Lista todas las notificaciones con paginación
   * GET /api/notifications?unreadOnly=true&type=AUTOMATION&limit=50&offset=0
   */
  @Get()
  async findAll(
    @Query('unreadOnly') unreadOnly?: string,
    @Query('type') type?: NotificationType,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const [notifications, total] = await Promise.all([
      this.notificationsService.findAll({
        unreadOnly: unreadOnly === 'true',
        type,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      }),
      this.notificationsService.count({
        unreadOnly: unreadOnly === 'true',
        type,
      }),
    ]);

    return {
      data: notifications,
      total,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    };
  }

  /**
   * Obtiene resumen de notificaciones
   * GET /api/notifications/summary
   */
  @Get('summary')
  getSummary() {
    return this.notificationsService.getSummary();
  }

  /**
   * Cuenta notificaciones no leídas
   * GET /api/notifications/unread-count
   */
  @Get('unread-count')
  async countUnread() {
    const count = await this.notificationsService.countUnread();
    return { count };
  }

  /**
   * Obtiene una notificación por ID
   * GET /api/notifications/:id
   */
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.notificationsService.findById(id);
  }

  /**
   * Crea una nueva notificación
   * POST /api/notifications
   */
  @Post()
  create(@Body() data: CreateNotificationDto) {
    return this.notificationsService.create(data);
  }

  /**
   * Actualiza una notificación
   * PATCH /api/notifications/:id
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateNotificationDto) {
    return this.notificationsService.update(id, data);
  }

  /**
   * Marca una notificación como leída
   * PATCH /api/notifications/:id/read
   */
  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  /**
   * Marca todas las notificaciones como leídas
   * POST /api/notifications/mark-all-read
   */
  @Post('mark-all-read')
  markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }

  /**
   * Elimina múltiples notificaciones
   * POST /api/notifications/delete-many
   */
  @Post('delete-many')
  deleteMany(@Body() body: { ids: string[] }) {
    return this.notificationsService.deleteMany(body.ids);
  }

  /**
   * Elimina todas las notificaciones leídas
   * POST /api/notifications/delete-read
   */
  @Post('delete-read')
  deleteAllRead() {
    return this.notificationsService.deleteAllRead();
  }

  /**
   * Elimina una notificación
   * DELETE /api/notifications/:id
   */
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.notificationsService.delete(id);
  }

  /**
   * Limpia notificaciones antiguas
   * DELETE /api/notifications/cleanup?daysOld=30
   */
  @Delete('cleanup')
  deleteOld(@Query('daysOld') daysOld?: string) {
    return this.notificationsService.deleteOld(
      daysOld ? parseInt(daysOld, 10) : 30,
    );
  }
}





