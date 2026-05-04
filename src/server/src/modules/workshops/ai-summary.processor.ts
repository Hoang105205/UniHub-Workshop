import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import pdfParse from 'pdf-parse';
import { Workshop } from '../../entities/workshop.entity';
import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { AI_SUMMARY_JOB, AI_SUMMARY_QUEUE } from './ai-summary.constants';
import { AiSummaryJobData } from './ai-summary.types';
import { AiSummaryService } from './ai-summary.service';

@Processor(AI_SUMMARY_QUEUE)
@Injectable()
export class AiSummaryProcessor {
  private readonly logger = new Logger(AiSummaryProcessor.name);

  constructor(
    @InjectRepository(Workshop)
    private readonly workshopRepository: Repository<Workshop>,
    private readonly aiSummaryService: AiSummaryService,
  ) {}

  @Process(AI_SUMMARY_JOB)
  async handle(job: Job<AiSummaryJobData>) {
    const { workshopId, pdfUrl, detailSnapshot } = job.data;

    const pdfBuffer = await this.downloadPdf(pdfUrl);

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
