import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { IoTGatewayService } from './iot-gateway.service';
import { SensorHistoryService } from './sensor-history.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
  ],
  controllers: [DevicesController],
  providers: [DevicesService, IoTGatewayService, SensorHistoryService],
  exports: [DevicesService, IoTGatewayService, SensorHistoryService],
})
export class DevicesModule {}
