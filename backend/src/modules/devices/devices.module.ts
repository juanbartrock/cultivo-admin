import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { IoTGatewayService } from './iot-gateway.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
  ],
  controllers: [DevicesController],
  providers: [DevicesService, IoTGatewayService],
  exports: [DevicesService, IoTGatewayService],
})
export class DevicesModule {}
