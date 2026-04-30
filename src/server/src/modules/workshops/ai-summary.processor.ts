import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Redis } from '@upstash/redis';
import { Repository } from 'typeorm';
import pdfParse from 'pdf-parse';
import { Workshop } from '../../entities/workshop.entity';
import { AI_SUMMARY_QUEUE } from './ai-summary.constants';
import { AiSummaryJobData } from './ai-summary.types';
import { AiSummaryService } from './ai-summary.service';

@Injectable()
export class AiSummaryProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiSummaryProcessor.name);
  private pollingTimer: NodeJS.Timeout | null = null;
  private processing = false;
  private client: Redis | null = null;
  private initialized = false;

  constructor(
    @InjectRepository(Workshop)
    private readonly workshopRepository: Repository<Workshop>,
    private readonly aiSummaryService: AiSummaryService,
  ) {}

  private get redis() {
    if (!this.initialized) {
      this.client = Redis.fromEnv();
      this.initialized = true;
    }

    return this.client as Redis;
  }

  onModuleInit() {
    this.pollingTimer = setInterval(() => {
      void this.drainQueue();
    }, 3000);
  }

  onModuleDestroy() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private async drainQueue() {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      while (true) {
        const rawJob = await this.redis.rpop(AI_SUMMARY_QUEUE);
        this.logger.debug(`Polled AI summary job: ${JSON.stringify(rawJob)}`);
        const job = this.parseJob(rawJob);
        if (!job) {
          return;
        }

        if ((job.runAt ?? 0) > Date.now()) {
          await this.redis.lpush(AI_SUMMARY_QUEUE, JSON.stringify(job));
          return;
        }

        try {
          await this.handle(job);
        } catch (error) {
          const nextAttempts = (job.attempts || 0) + 1;

          if (nextAttempts >= 3) {
            this.logger.error(
              `AI summary job failed after ${nextAttempts} attempts for workshop ${job.workshopId}`,
              error instanceof Error ? error.stack : undefined,
            );
            continue;
          }

          this.logger.warn(
            `Retrying AI summary job for workshop ${job.workshopId}, attempt ${nextAttempts}`,
          );
          await this.redis.lpush(
            AI_SUMMARY_QUEUE,
            JSON.stringify({
              ...job,
              attempts: nextAttempts,
              runAt: Date.now() + 5000 * 2 ** (nextAttempts - 1),
            }),
          );
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private parseJob(rawJob: unknown): AiSummaryJobData | null {
    if (!rawJob) {
      return null;
    }

    if (typeof rawJob === 'string') {
      return JSON.parse(rawJob) as AiSummaryJobData;
    }

    if (typeof rawJob === 'object') {
      return rawJob as AiSummaryJobData;
    }

    return null;
  }

  private async handle(job: AiSummaryJobData) {
    const { workshopId, pdfUrl, detailSnapshot } = job;

    const pdfBuffer = await this.downloadPdf(pdfUrl);
    console.log(`Downloaded PDF for workshop ${workshopId}, size: ${pdfBuffer.length} bytes`);
    const extractedText = await this.extractText(pdfBuffer);

    const summary = await this.aiSummaryService.summarize(extractedText);

    await this.workshopRepository
      .createQueryBuilder()
      .update(Workshop)
      .set({ detail: summary })
      .where('id = :id', { id: workshopId })
      .andWhere('detail = :detailSnapshot', { detailSnapshot })
      .execute();
  }

  private async downloadPdf(url: string): Promise<Buffer> {
    const encodedUrl = encodeURI(url);
    let response = await fetch(encodedUrl);

    if (!response.ok && encodedUrl.includes('/storage/v1/object/')) {
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseServiceRoleKey) {
        response = await fetch(encodedUrl, {
          headers: {
            apikey: supabaseServiceRoleKey,
            Authorization: `Bearer ${supabaseServiceRoleKey}`,
          },
        });
      }
    }

    if (!response.ok) {
      const responseBody = await response.text().catch(() => '');
      const snippet = responseBody.slice(0, 200);
      throw new Error(
        `Failed to download PDF: ${response.status}${snippet ? ` - ${snippet}` : ''}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async extractText(buffer: Buffer): Promise<string> {
    const result = await pdfParse(buffer);
    const cleaned = result.text.replace(/\s+/g, ' ').trim();

    return cleaned.slice(0, 5000);
  }
}
