import { Module } from '@nestjs/common';
import { 
  PreventionPlansController, 
  SectionPreventionPlansController,
  PlantPreventionPlansController,
} from './prevention-plans.controller';
import { PreventionPlansService } from './prevention-plans.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    PreventionPlansController,
    SectionPreventionPlansController,
    PlantPreventionPlansController,
  ],
  providers: [PreventionPlansService],
  exports: [PreventionPlansService],
})
export class PreventionPlansModule {}
