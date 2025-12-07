import { Module } from '@nestjs/common';
import {
  FeedingPlansController,
  SectionFeedingPlansController,
  PlantFeedingPlansController,
} from './feeding-plans.controller';
import { FeedingPlansService } from './feeding-plans.service';

@Module({
  controllers: [
    FeedingPlansController,
    SectionFeedingPlansController,
    PlantFeedingPlansController,
  ],
  providers: [FeedingPlansService],
  exports: [FeedingPlansService],
})
export class FeedingPlansModule {}
