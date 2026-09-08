import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StageRangesController } from './stage-ranges.controller';
import { StageRangesService } from './stage-ranges.service';

@Module({
  imports: [PrismaModule],
  controllers: [StageRangesController],
  providers: [StageRangesService],
  exports: [StageRangesService],
})
export class StageRangesModule {}
