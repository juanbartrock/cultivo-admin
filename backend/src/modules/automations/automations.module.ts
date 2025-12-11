import { Module } from '@nestjs/common';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';
import { AutomationSchedulerService } from './automation-scheduler.service';
import { EffectivenessCheckerService } from './effectiveness-checker.service';
import { DevicesModule } from '../devices/devices.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    DevicesModule,
    NotificationsModule,
  ],
  controllers: [AutomationsController],
  providers: [
    AutomationsService,
    AutomationSchedulerService,
    EffectivenessCheckerService,
  ],
  exports: [AutomationsService],
})
export class AutomationsModule {}



