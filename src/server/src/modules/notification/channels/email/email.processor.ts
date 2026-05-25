import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { MailerService } from '@nestjs-modules/mailer';
import {
  EMAIL_JOB_TICKET_CONFIRMED,
  EMAIL_JOB_PAYMENT_PENDING,
  EMAIL_JOB_PAYMENT_FAILED,
  EMAIL_JOB_TICKET_CANCELLED,
  EMAIL_QUEUE,
} from './email.constants';
import {
  TicketConfirmedEmailJob,
  PaymentPendingEmailJob,
  PaymentFailedEmailJob,
  TicketCancelledEmailJob,
} from './email.types';
import * as QRCode from 'qrcode';
import { Attachment } from 'nodemailer/lib/mailer';

@Processor(EMAIL_QUEUE)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailerService: MailerService) {}

  @Process(EMAIL_JOB_TICKET_CONFIRMED)
  async sendTicketConfirmedEmail(job: { data: TicketConfirmedEmailJob }) {
    const payload = job.data;
    const workshop = this.formatWorkshop(payload.workshop);

    const base64Data = await this.generateBase64QrCode(payload.qrCode);

    await this.sendEmail(
      {
        to: payload.to,
        subject: `Ticket confirmed: ${workshop.title}`,
        template: 'ticket-confirmed',
        context: {
          workshop,
          qrCode: payload.qrCode,
        },
        attachments: [
          {
            filename: 'qrcode.png',
            content: base64Data,
            encoding: 'base64',
            cid: 'qrcode-image',
          },
        ],
      },
      `Ticket confirmed email sent to ${payload.to}`,
    );
  }

  @Process(EMAIL_JOB_PAYMENT_PENDING)
  async sendPaymentPendingEmail(job: { data: PaymentPendingEmailJob }) {
    const payload = job.data;
    const workshop = this.formatWorkshop(payload.workshop);

    await this.sendEmail(
      {
        to: payload.to,
        subject: `Payment pending: ${workshop.title}`,
        template: 'payment-pending',
        context: {
          workshop,
          expiresAt: this.formatDate(payload.expiresAt),
          paymentLink: payload.paymentLink,
        },
      },
      `Payment pending email sent to ${payload.to}`,
    );
  }

  @Process(EMAIL_JOB_PAYMENT_FAILED)
  async sendPaymentFailedEmail(job: { data: PaymentFailedEmailJob }) {
    const payload = job.data;
    const workshop = this.formatWorkshop(payload.workshop);

    await this.sendEmail(
      {
        to: payload.to,
        subject: `Payment failed: ${workshop.title}`,
        template: 'payment-failed',
        context: {
          workshop,
        },
      },
      `Payment failed email sent to ${payload.to}`,
    );
  }

  @Process(EMAIL_JOB_TICKET_CANCELLED)
  async sendTicketCancelledEmail(job: { data: TicketCancelledEmailJob }) {
    const payload = job.data;
    const workshop = this.formatWorkshop(payload.workshop);

    await this.sendEmail(
      {
        to: payload.to,
        subject: `Ticket cancelled: ${workshop.title}`,
        template: 'ticket-cancelled',
        context: {
          workshop,
        },
      },
      `Ticket cancelled email sent to ${payload.to}`,
    );
  }

  private async generateBase64QrCode(qrCode: string): Promise<string> {
    try {
      const dataUrl = await this.generateQrCodeDataUrl(qrCode);
      return this.base64FormatFromDataUrl(dataUrl);
    } catch (error) {
      this.logger.error('Failed to generate base64 QR code', error as Error);
      throw error;
    } 
  }


  private async generateQrCodeDataUrl(qrCode: string): Promise<string> {
    try {
      return await QRCode.toDataURL(qrCode, {
        errorCorrectionLevel: 'H',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch (error) {
      this.logger.error('Failed to generate QR code', error as Error);
      throw error;
    }
  }

  private base64FormatFromDataUrl(dataUrl: string): string {
    return dataUrl.split(',')[1];
  }

  private formatWorkshop(workshop: {
    title: string;
    startTime: Date;
    location: string;
  }) {
    return {
      title: workshop.title,
      startTime: this.formatDate(workshop.startTime),
      location: workshop.location,
    };
  }

  private formatDate(value: Date | string) {
    return new Date(value).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  private async sendEmail(
    message: {
      to: string;
      subject: string;
      template: string;
      context: Record<string, unknown>;
      attachments?: Attachment[];
    },
    successLog: string,
  ) {
    try {
      await this.mailerService.sendMail(message);
      this.logger.log(successLog);
    } catch (error) {
      this.logger.error('Email send failed', error as Error);
      throw error;
    }
  }
}
