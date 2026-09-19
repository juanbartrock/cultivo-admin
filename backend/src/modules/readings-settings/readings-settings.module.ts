import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReadingsSettingsController } from './readings-settings.controller';
import { ReadingsSettingsService } from './readings-settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReadingsSettingsController],
  providers: [ReadingsSettingsService],
  exports: [ReadingsSettingsService],
})
export class ReadingsSettingsModule {}
