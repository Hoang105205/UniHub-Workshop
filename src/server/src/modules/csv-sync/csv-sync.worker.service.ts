import { Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Papa from 'papaparse';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import {
  SyncHistory,
  SyncHistoryStatus,
} from '../../entities/sync-history.entity';
import { StudentCsvRow } from './student-csv-row.interface';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { Processor } from '@nestjs/bull/dist/decorators/processor.decorator';
import {
  CSV_SYNC_JOB_QUEUE,
  CSV_SYNC_JOB,
  CSV_SYNC_JOB_ID,
} from './csv-sync.constants';
import { InjectQueue } from '@nestjs/bull/dist/decorators/inject-queue.decorator';
import type { Queue } from 'bull';
import { Process } from '@nestjs/bull/dist/decorators/process.decorator';

type ParsedStudentRecord = {
  studentId: string;
  email: string;
  name: string;
};

@Processor(CSV_SYNC_JOB_QUEUE)
export class CsvSyncWorkerService implements OnModuleInit {
  private readonly logger = new Logger(CsvSyncWorkerService.name);
  private supabase: SupabaseClient;
  private readonly BUCKET_NAME =
    process.env.SUPABASE_CSV_SYNC_BUCKET || 'csv-sync';

  constructor(
    @InjectQueue(CSV_SYNC_JOB_QUEUE)
    private readonly syncQueue: Queue,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SyncHistory)
    private readonly syncHistoryRepository: Repository<SyncHistory>,
  ) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL') || '',
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || '',
    );

    this.logger.log(
      `CSV sync worker initialized with bucket: ${this.BUCKET_NAME}`,
    );
  }

  // Khởi tạo lịch chạy định kỳ khi Server start
  async onModuleInit() {
    const repeatableJobs = await this.syncQueue.getRepeatableJobs();

    // Xóa toàn bộ các lịch trình đang có sẵn trong Redis
    for (const job of repeatableJobs) {
      await this.syncQueue.removeRepeatableByKey(job.key);
    }

    const cronSchedule = process.env.STUDENT_SYNC_CRON || '0 0 * * *';

    await this.syncQueue.add(
      CSV_SYNC_JOB,
      {}, // Payload (không cần truyền data gì vì nó tự quét Supabase)
      {
        repeat: { cron: cronSchedule },
        jobId: CSV_SYNC_JOB_ID, // CRITICAL: Chìa khóa để chống trùng lặp khi chạy 3 instances
        removeOnComplete: true, // Chạy xong thì xóa job khỏi queue để đỡ rác Redis
      },
    );
    this.logger.log(
      `Nightly CSV sync job scheduled with cron: ${cronSchedule}`,
    );
  }

  @Process(CSV_SYNC_JOB)
  async handleNightlySync(): Promise<void> {
    this.logger.log(`Worker [${process.pid}] is picking up the sync job!`);

    const pendingFiles = await this.scanPendingFiles();

    if (pendingFiles.length === 0) {
      this.logger.log('No CSV files found in pending folder on Supabase.');
      return;
    }

    for (const filename of pendingFiles) {
      await this.processFile(filename);
    }
  }

  private async scanPendingFiles(): Promise<string[]> {
    const { data, error } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .list('pending', {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      this.logger.error(`Failed to list pending files: ${error.message}`);
      return [];
    }

    return data
      .filter(
        (file) =>
          file.name.toLowerCase().endsWith('.csv') && file.name !== '.keep.csv',
      )
      .map((file) => file.name);
  }

  private async processFile(filename: string): Promise<void> {
    const pendingPath = `pending/${filename}`;

    const processedFilename = `${this.buildTimestampPrefix()}_${filename}`;

    const history = await this.syncHistoryRepository.save(
      this.syncHistoryRepository.create({
        filename,
        status: SyncHistoryStatus.PROCESSING,
        totalRecordsProcessed: 0,
        errorMessage: null,
      }),
    );

    try {
      // 1. Tải file từ Supabase
      const { data: blobData, error: downloadError } =
        await this.supabase.storage
          .from(this.BUCKET_NAME)
          .download(pendingPath);

      if (downloadError || !blobData) {
        throw new Error(
          `Failed to download from Supabase: ${downloadError?.message}`,
        );
      }

      // 2. Chuyển Blob thành Text để Papaparse đọc được
      const csvContent = await blobData.text();

      const parsed = Papa.parse<StudentCsvRow>(csvContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        throw new Error(
          `CSV parse error: ${parsed.errors.map((error) => error.message).join('; ')}`,
        );
      }

      const mappedRows = this.mapRows(parsed.data);

      // 3. Logic Database giữ nguyên không đổi
      await this.dataSource.transaction(async (manager) => {
        const chunkSize = 1000;
        for (let index = 0; index < mappedRows.length; index += chunkSize) {
          const chunk = mappedRows.slice(index, index + chunkSize);
          if (chunk.length === 0) continue;

          await manager
            .createQueryBuilder()
            .insert()
            .into(User)
            .values(chunk)
            .orUpdate(['email', 'full_name'], ['student_id']) // Lưu ý đoạn này tuỳ biến lại theo key cũ của bạn nhé
            .execute();
        }
      });

      // 4. Di chuyển file sang thư mục completed trên Supabase
      const completedPath = `completed/${processedFilename}`;

      const { error: moveError } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .move(pendingPath, completedPath);

      if (moveError)
        throw new Error(`Move to completed failed: ${moveError.message}`);

      // Cập nhật DB
      await this.syncHistoryRepository.update(history.id, {
        status: SyncHistoryStatus.SUCCESS,
        totalRecordsProcessed: mappedRows.length,
        errorMessage: null,
      });

      this.logger.log(
        `CSV sync completed for ${filename} with ${mappedRows.length} records.`,
      );
    } catch (error) {
      const message = this.toErrorMessage(error);
      this.logger.error(`CSV sync failed for ${filename}: ${message}`);

      // Xử lý lỗi: Di chuyển file vào thư mục error trên Supabase
      const errorPath = `error/${processedFilename}`;

      try {
        const { error: moveFailError } = await this.supabase.storage
          .from(this.BUCKET_NAME)
          .move(pendingPath, errorPath);

        if (moveFailError) {
          this.logger.error(
            `Failed to move file to error folder: ${moveFailError.message}`,
          );
        }
      } catch (e) {
        this.logger.error(`Critical storage error: ${this.toErrorMessage(e)}`);
      }

      await this.syncHistoryRepository.update(history.id, {
        status: SyncHistoryStatus.FAILED,
        errorMessage: message,
      });
    }
  }

  private mapRows(rows: StudentCsvRow[]): ParsedStudentRecord[] {
    return rows
      .map((row) => ({
        studentId: String(row.MSSV ?? '').trim(),
        email: String(row.email ?? '').trim(),
        name: String(row.fullname ?? '').trim(),
      }))
      .filter(
        (row) =>
          row.studentId.length > 0 &&
          row.email.length > 0 &&
          row.name.length > 0,
      );
  }

  private buildTimestampPrefix(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');

    return [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      '-',
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds()),
    ].join('');
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.stack || error.message;
    }

    return String(error);
  }
}
