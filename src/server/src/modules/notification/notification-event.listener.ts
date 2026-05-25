// notification/notification-event.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { INotificationChannel } from './interfaces/notification-channel.interface';
import { EmailChannelService } from './channels/email/email-channel.service';
import {
  DOMAIN_EVENT_TICKET_CONFIRMED,
  DOMAIN_EVENT_PAYMENT_PENDING,
  DOMAIN_EVENT_PAYMENT_FAILED,
  DOMAIN_EVENT_TICKET_CANCELLED,
} from './notification.constants';

@Injectable()
export class NotificationEventListener {
  private readonly logger = new Logger(NotificationEventListener.name);
  private channels: INotificationChannel[] = [];

  constructor(
    private readonly emailChannel: EmailChannelService,
    // Tương lai: private readonly telegramChannel: TelegramChannelService
  ) {
    // Cắm phích các kênh vào ổ điện
    this.channels = [this.emailChannel];
  }

  @OnEvent(DOMAIN_EVENT_TICKET_CONFIRMED)
  async handleTicketConfirmed(payload: any) {
    this.dispatchToChannels('sendTicketConfirmed', payload);
  }

  @OnEvent(DOMAIN_EVENT_PAYMENT_PENDING)
  async handlePaymentPending(payload: any) {
    this.dispatchToChannels('sendPaymentPending', payload);
  }

  @OnEvent(DOMAIN_EVENT_PAYMENT_FAILED)
  async handlePaymentFailed(payload: any) {
    this.dispatchToChannels('sendPaymentFailed', payload);
  }

  @OnEvent(DOMAIN_EVENT_TICKET_CANCELLED)
  async handleTicketCancelled(payload: any) {
    this.dispatchToChannels('sendTicketCancelled', payload);
  }

  // Hàm loop qua tất cả các kênh (Fan-out)
  private async dispatchToChannels(
    method: keyof INotificationChannel,
    payload: any,
  ) {
    for (const channel of this.channels) {
      try {
        if (typeof channel[method] === 'function') {
          // Bỏ qua lỗi TypeScript nếu có, nó an toàn vì ta đã kiểm tra type
          await (channel[method] as any)(payload);
        }
      } catch (error) {
        this.logger.error(
          `Channel [${channel.name}] failed to process ${method}`,
          error,
        );
      }
    }
  }
}
