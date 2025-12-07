import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { StorageService } from './storage.service';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [EventsController],
  providers: [EventsService, StorageService],
  exports: [EventsService, StorageService],
})
export class EventsModule {}
