import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { SyncHistory } from '../../entities/sync-history.entity';
import { CsvSyncWorkerService } from './csv-sync.worker.service';
import { CsvSyncController } from './csv-sync.controller';
import { BullModule } from '@nestjs/bull/dist/bull.module';
import { CSV_SYNC_JOB_QUEUE } from './csv-sync.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: CSV_SYNC_JOB_QUEUE }),
    TypeOrmModule.forFeature([User, SyncHistory]),
  ],
  providers: [CsvSyncWorkerService],
  controllers: [CsvSyncController],
})
export class CsvSyncModule {}
