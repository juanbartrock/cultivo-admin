import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IoTCredentialsController } from './iot-credentials.controller';
import { IoTCredentialsService } from './iot-credentials.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, HttpModule],
  controllers: [IoTCredentialsController],
  providers: [IoTCredentialsService],
  exports: [IoTCredentialsService],
})
export class IoTCredentialsModule {}
