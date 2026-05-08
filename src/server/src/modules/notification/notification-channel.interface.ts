import { 
  TicketConfirmedNotificationJob, 
  PaymentPendingNotificationJob, 
  PaymentFailedNotificationJob, 
  TicketCancelledNotificationJob 
} from './notification.types'; // Tạm thời dùng lại type cũ, sau này rảnh bạn đổi tên thành NotificationJob sau

export interface INotificationChannel {
  name: string; // Tên kênh để log (vd: 'EMAIL', 'TELEGRAM')
  
  sendTicketConfirmed(payload: TicketConfirmedNotificationJob): Promise<void>;
  sendPaymentPending(payload: PaymentPendingNotificationJob): Promise<void>;
  sendPaymentFailed(payload: PaymentFailedNotificationJob): Promise<void>;
  sendTicketCancelled(payload: TicketCancelledNotificationJob): Promise<void>;
}