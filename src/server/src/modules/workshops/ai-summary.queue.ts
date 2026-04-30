import { Injectable } from '@nestjs/common';
import { Redis } from '@upstash/redis';
import { AI_SUMMARY_QUEUE } from './ai-summary.constants';
import { AiSummaryJobData } from './ai-summary.types';

@Injectable()
export class AiSummaryQueueService {
  private client: Redis | null = null;
  private initialized = false;

  private get redis() {
    if (!this.initialized) {
      this.client = Redis.fromEnv();
      this.initialized = true;
    }

    return this.client as Redis;
  }

  async enqueue(job: AiSummaryJobData) {
    const payload: AiSummaryJobData = {
      ...job,
      id: job.id || crypto.randomUUID(),
      attempts: job.attempts || 0,
      runAt: job.runAt || Date.now(),
    };

    await this.redis.lpush(AI_SUMMARY_QUEUE, JSON.stringify(payload));
  }
}
