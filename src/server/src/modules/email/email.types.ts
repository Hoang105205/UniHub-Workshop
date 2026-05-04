export interface WorkshopEmailContext {
  title: string;
  startTime: Date;
  location: string;
}

export interface EmailJobBase {
  to: string;
  registrationId: string;
  workshop: WorkshopEmailContext;
}

export interface TicketConfirmedEmailJob extends EmailJobBase {
  qrCode: string;
}

export interface PaymentPendingEmailJob extends EmailJobBase {
  expiresAt: Date;
  paymentLink: string;
}

export interface PaymentFailedEmailJob extends EmailJobBase {}

export interface TicketCancelledEmailJob extends EmailJobBase {}
