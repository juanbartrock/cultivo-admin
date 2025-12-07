import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { LocationsModule } from './modules/locations/locations.module';
import { DevicesModule } from './modules/devices/devices.module';
import { GrowModule } from './modules/grow/grow.module';
import { EventsModule } from './modules/events/events.module';
import { FeedingPlansModule } from './modules/feeding-plans/feeding-plans.module';
import { PreventionPlansModule } from './modules/prevention-plans/prevention-plans.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    LocationsModule,
    DevicesModule,
    GrowModule,
    EventsModule,
    FeedingPlansModule,
    PreventionPlansModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
