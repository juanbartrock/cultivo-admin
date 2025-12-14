import { Module, forwardRef } from '@nestjs/common';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';
import { AutomationSchedulerService } from './automation-scheduler.service';
import { EffectivenessCheckerService } from './effectiveness-checker.service';
import { JobSchedulerService } from './job-scheduler.service';
import { JobProcessorService } from './job-processor.service';
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
    JobSchedulerService,
    JobProcessorService,
  ],
  exports: [AutomationsService, JobSchedulerService],
})
export class AutomationsModule {}



