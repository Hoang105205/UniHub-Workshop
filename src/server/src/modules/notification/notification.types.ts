// notification/notification.types.ts

export interface WorkshopNotificationContext {
  title: string;
  startTime: Date;
  location: string;
}

// Data cơ bản mà kênh nào cũng cần
export interface BaseNotificationJob {
  to: string; // Có thể là email, số điện thoại, hoặc user ID tùy kênh
  registrationId: string;
  workshop: WorkshopNotificationContext;
}

// Data đặc thù cho từng loại sự kiện
export interface TicketConfirmedNotificationJob extends BaseNotificationJob {
  qrCode: string; 
}

export interface PaymentPendingNotificationJob extends BaseNotificationJob {
  expiresAt: Date;
  paymentLink: string;
}

export interface PaymentFailedNotificationJob extends BaseNotificationJob {}
export interface TicketCancelledNotificationJob extends BaseNotificationJob {}