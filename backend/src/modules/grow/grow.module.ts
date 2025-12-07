import { Module } from '@nestjs/common';
import { CyclesController } from './cycles.controller';
import { PlantsController } from './plants.controller';
import { StrainsController } from './strains.controller';
import { GrowService } from './grow.service';

@Module({
  controllers: [CyclesController, PlantsController, StrainsController],
  providers: [GrowService],
  exports: [GrowService],
})
export class GrowModule {}
