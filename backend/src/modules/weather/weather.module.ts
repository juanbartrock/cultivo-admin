import { Module } from '@nestjs/common';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { WeatherPollerService } from './weather-poller.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [NotificationsModule, RealtimeModule],
  controllers: [WeatherController],
  providers: [WeatherService, WeatherPollerService],
  exports: [WeatherService],
})
export class WeatherModule {}
