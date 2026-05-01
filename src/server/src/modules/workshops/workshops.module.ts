import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Registration } from '../../entities/registration.entity';
import { Workshop } from '../../entities/workshop.entity';
import { AiSummaryProcessor } from './ai-summary.processor';
import { AiSummaryQueueService } from './ai-summary.queue';
import { AiSummaryService } from './ai-summary.service';
import { SupabaseStorageService } from './supabase-storage.service';
import { WorkshopsController } from './workshops.controller';
import { WorkshopsService } from './workshops.service';
import { AI_SUMMARY_QUEUE } from './ai-summary.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workshop, Registration]),
    BullModule.registerQueue({
      name: AI_SUMMARY_QUEUE,
    }),
  ],
  controllers: [WorkshopsController],
  providers: [
    WorkshopsService,
    SupabaseStorageService,
    AiSummaryQueueService,
    AiSummaryService,
    AiSummaryProcessor,
  ],
})
export class WorkshopsModule {}
