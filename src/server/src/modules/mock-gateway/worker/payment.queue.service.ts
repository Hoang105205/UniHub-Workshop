import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { MockChargeDto } from '../dto/mock-charge.dto';
import {
  MOCK_GATEWAY_QUEUE,
  MOCK_GATEWAY_JOB,
} from '../mock-gateway.constants';

@Injectable()
export class PaymentQueueService {
  constructor(
    @InjectQueue(MOCK_GATEWAY_QUEUE) private readonly paymentQueue: Queue,
  ) {}

  async enqueueCharge(dto: MockChargeDto) {
    // Đẩy job vào queue với cơ chế tự động Retry (Backoff)
    await this.paymentQueue.add(MOCK_GATEWAY_JOB, dto, {
      jobId: dto.idempotencyKey, // Chống đúp job trùng lặp
      attempts: 5, // Tối đa thử lại 5 lần
      backoff: {
        type: 'exponential',
        delay: 5000, // Lần 1 chờ 5s, lần 2 chờ 10s, lần 3 chờ 20s...
      },
      removeOnComplete: true,
    });
  }
}
