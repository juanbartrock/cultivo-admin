import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { LocationsModule } from './modules/locations/locations.module';
import { DevicesModule } from './modules/devices/devices.module';
import { GrowModule } from './modules/grow/grow.module';
import { EventsModule } from './modules/events/events.module';
import { FeedingPlansModule } from './modules/feeding-plans/feeding-plans.module';
import { PreventionPlansModule } from './modules/prevention-plans/prevention-plans.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HarvestModule } from './modules/harvest/harvest.module';
import { AuthModule } from './modules/auth/auth.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { AIAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    LocationsModule,
    DevicesModule,
    GrowModule,
    EventsModule,
    FeedingPlansModule,
    PreventionPlansModule,
    AutomationsModule,
    NotificationsModule,
    HarvestModule,
    AuthModule,
    RealtimeModule,
    AIAssistantModule,
  ],
  controllers: [HealthController],
})
export class AppModule { }
