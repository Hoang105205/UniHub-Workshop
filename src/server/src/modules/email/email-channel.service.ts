import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import {
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
import { INotificationChannel } from '../notification/notification-channel.interface';

@Injectable()
export class EmailChannelService implements INotificationChannel {
  readonly name = 'EMAIL_CHANNEL';

  private readonly logger = new Logger(EmailChannelService.name);

  constructor(@InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue) {}

  async sendTicketConfirmed(payload: TicketConfirmedEmailJob) {
    await this.enqueueJob(EMAIL_JOB_TICKET_CONFIRMED, payload);
  }

  async sendPaymentPending(payload: PaymentPendingEmailJob) {
    await this.enqueueJob(EMAIL_JOB_PAYMENT_PENDING, payload);
  }

  async sendPaymentFailed(payload: PaymentFailedEmailJob) {
    await this.enqueueJob(EMAIL_JOB_PAYMENT_FAILED, payload);
  }

  async sendTicketCancelled(payload: TicketCancelledEmailJob) {
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
