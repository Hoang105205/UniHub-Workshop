import { 
  TicketConfirmedNotificationJob,
  PaymentPendingNotificationJob,
  PaymentFailedNotificationJob,
  TicketCancelledNotificationJob
} from '../notification/notification.types';

export interface TicketConfirmedEmailJob extends TicketConfirmedNotificationJob {
  // cc?: string[];
  // bcc?: string[];
}

export interface PaymentPendingEmailJob extends PaymentPendingNotificationJob {}
export interface PaymentFailedEmailJob extends PaymentFailedNotificationJob {}
export interface TicketCancelledEmailJob extends TicketCancelledNotificationJob {}
