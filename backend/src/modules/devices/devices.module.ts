import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { IoTGatewayService } from './iot-gateway.service';
import { SensorHistoryService } from './sensor-history.service';
import { SensorPollerService } from './sensor-poller.service';
import { ReadingsSettingsModule } from '../readings-settings/readings-settings.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
    ReadingsSettingsModule,
  ],
  controllers: [DevicesController],
  providers: [
    DevicesService,
    IoTGatewayService,
    SensorHistoryService,
    SensorPollerService,
  ],
  exports: [
    DevicesService,
    IoTGatewayService,
    SensorHistoryService,
    SensorPollerService,
  ],
})
export class DevicesModule {}
