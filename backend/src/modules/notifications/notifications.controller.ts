import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  CleanupNotificationsQueryDto,
  DeleteManyNotificationsDto,
  GetNotificationsDto,
  UpdateNotificationDto,
} from './dto/notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Query() query: GetNotificationsDto) {
    const [notifications, total] = await Promise.all([
      this.notificationsService.findAll({
        unreadOnly: query.unreadOnly,
        type: query.type,
        limit: query.limit,
        offset: query.offset,
      }),
      this.notificationsService.count({
        unreadOnly: query.unreadOnly,
        type: query.type,
      }),
    ]);

    return {
      data: notifications,
      total,
      limit: query.limit ?? 100,
      offset: query.offset ?? 0,
    };
  }

  @Get('summary')
  getSummary() {
    return this.notificationsService.getSummary();
  }

  @Get('unread-count')
  async countUnread() {
    const count = await this.notificationsService.countUnread();
    return { count };
  }

  @Post()
  create(@Body() data: CreateNotificationDto) {
    return this.notificationsService.create(data);
  }

  @Post('mark-all-read')
  markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }

  @Post('delete-many')
  deleteMany(@Body() body: DeleteManyNotificationsDto) {
    return this.notificationsService.deleteMany(body.ids);
  }

  @Post('delete-read')
  deleteAllRead() {
    return this.notificationsService.deleteAllRead();
  }

  @Post('delete-all')
  deleteAll() {
    return this.notificationsService.deleteAll();
  }

  @Delete('cleanup')
  deleteOld(@Query() query: CleanupNotificationsQueryDto) {
    return this.notificationsService.deleteOld(query.daysOld ?? 30);
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(id, data);
  }

  @Patch(':id/read')
  markAsRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.delete(id);
  }
}
