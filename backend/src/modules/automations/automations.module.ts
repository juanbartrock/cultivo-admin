import { Module, forwardRef } from '@nestjs/common';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';
import { AutomationSchedulerService } from './automation-scheduler.service';
import { EffectivenessCheckerService } from './effectiveness-checker.service';
import { JobSchedulerService } from './job-scheduler.service';
import { JobProcessorService } from './job-processor.service';
import { PlantAnalysisService } from './plant-analysis.service';
import { DevicesModule } from '../devices/devices.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AIAssistantModule } from '../ai-assistant/ai-assistant.module';

@Module({
  imports: [
    DevicesModule,
    NotificationsModule,
    AIAssistantModule,
  ],
  controllers: [AutomationsController],
  providers: [
    AutomationsService,
    AutomationSchedulerService,
    EffectivenessCheckerService,
    JobSchedulerService,
    JobProcessorService,
    PlantAnalysisService,
  ],
  exports: [AutomationsService, JobSchedulerService, PlantAnalysisService],
})
export class AutomationsModule {}



