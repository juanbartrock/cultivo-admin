import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { SectionsController } from './sections.controller';
import { LocationsService } from './locations.service';

@Module({
  controllers: [RoomsController, SectionsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
