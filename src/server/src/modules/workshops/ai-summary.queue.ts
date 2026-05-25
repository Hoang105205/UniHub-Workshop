import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { AI_SUMMARY_JOB, AI_SUMMARY_QUEUE } from './ai-summary.constants';
import { AiSummaryJobData } from './ai-summary.types';

@Injectable()
export class AiSummaryQueueService {
  constructor(@InjectQueue(AI_SUMMARY_QUEUE) private readonly queue: Queue) {}

  async enqueue(job: AiSummaryJobData) {
    const payload: AiSummaryJobData = {
      ...job,
      id: job.id || crypto.randomUUID(),
      attempts: job.attempts || 0,
      runAt: job.runAt || Date.now(),
    };

    const delay =
      payload.runAt && payload.runAt > Date.now()
        ? payload.runAt - Date.now()
        : 0;

    await this.queue.add(AI_SUMMARY_JOB, payload, {
      jobId: payload.id,
      attempts: 3,
      delay: delay || undefined,
      backoff: {
        type: 'exponential', // Tăng dần thời gian chờ sau mỗi lần lỗi
        delay: 5000, // Lần 1 chờ 5s, lần 2 chờ 10s, lần 3 chờ 20s...
      },
      removeOnComplete: true, // Xóa NGAY LẬP TỨC khỏi Redis khi job chạy thành công (Status 200 OK)
      removeOnFail: false, // Giữ lại job trong Redis nếu đã thử 3 lần mà vẫn lỗi (Status 500), để sau này có thể inspect thủ công hoặc retry thủ công qua Dashboard
    });
  }
}
