import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import {
  EMAIL_EVENT_TICKET_CONFIRMED,
  EMAIL_EVENT_PAYMENT_PENDING,
  EMAIL_EVENT_PAYMENT_FAILED,
  EMAIL_EVENT_TICKET_CANCELLED,
  EMAIL_JOB_TICKET_CONFIRMED,
  EMAIL_JOB_PAYMENT_PENDING,
  EMAIL_JOB_PAYMENT_FAILED,
  EMAIL_JOB_TICKET_CANCELLED,
  EMAIL_QUEUE,
} from './email.constants';
import type {
  TicketConfirmedEmailJob,
  PaymentPendingEmailJob,
  PaymentFailedEmailJob,
  TicketCancelledEmailJob,
} from './email.types';

@Injectable()
export class EmailEventListener {
  private readonly logger = new Logger(EmailEventListener.name);

  constructor(@InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue) {}

  @OnEvent(EMAIL_EVENT_TICKET_CONFIRMED)
  async handleTicketConfirmed(payload: TicketConfirmedEmailJob) {
    await this.enqueueJob(EMAIL_JOB_TICKET_CONFIRMED, payload);
  }

  @OnEvent(EMAIL_EVENT_PAYMENT_PENDING)
  async handlePaymentPending(payload: PaymentPendingEmailJob) {
    await this.enqueueJob(EMAIL_JOB_PAYMENT_PENDING, payload);
  }

  @OnEvent(EMAIL_EVENT_PAYMENT_FAILED)
  async handlePaymentFailed(payload: PaymentFailedEmailJob) {
    await this.enqueueJob(EMAIL_JOB_PAYMENT_FAILED, payload);
  }

  @OnEvent(EMAIL_EVENT_TICKET_CANCELLED)
  async handleTicketCancelled(payload: TicketCancelledEmailJob) {
    await this.enqueueJob(EMAIL_JOB_TICKET_CANCELLED, payload);
  }

  private async enqueueJob(
    jobName: string,
    payload: { registrationId: string },
  ) {
    try {
      await this.emailQueue.add(jobName, payload, {
        jobId: `${jobName}:${payload.registrationId}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      });
    } catch (error) {
      this.logger.error(
        `Failed to enqueue email job: ${jobName}`,
        error as Error,
      );
    }
  }
}
