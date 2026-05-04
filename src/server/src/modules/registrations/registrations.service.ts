import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository, Not, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { generateQrCode } from '../../utils/qr.utils';
import { Payment, PaymentStatus } from '../../entities/payment.entity';
import {
  Registration,
  RegistrationStatus,
} from '../../entities/registration.entity';
import { Workshop } from '../../entities/workshop.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EMAIL_EVENT_PAYMENT_FAILED,
  EMAIL_EVENT_PAYMENT_PENDING,
  EMAIL_EVENT_TICKET_CANCELLED,
  EMAIL_EVENT_TICKET_CONFIRMED,
} from '../email/email.constants';
import {
  EmailJobBase,
  PaymentFailedEmailJob,
  PaymentPendingEmailJob,
  TicketCancelledEmailJob,
  TicketConfirmedEmailJob,
  WorkshopEmailContext,
} from '../email/email.types';

export interface RegistrationResponse {
  id: string;
  workshopId: string;
  userId: string;
  status: RegistrationStatus;
  qrCode: string;
  registeredAt: Date;
  workshop: {
    title: string;
    startTime: Date;
  };
}

export interface PaidRegistrationResponse {
  id: string;
  status: RegistrationStatus;
  paymentId: string;
  expiresAt: Date;
  message: string;
}

export type RegisterTicketResponse =
  | RegistrationResponse
  | PaidRegistrationResponse;

export interface RegistrationListItem {
  id: string;
  status: RegistrationStatus;
  registeredAt: Date;
  expiresAt: Date | null;
  qrCode: string;
  workshop: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    room: string;
    speaker: string;
    price: string;
  };
  payment: {
    id: string;
    status: PaymentStatus;
  } | null;
}

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async cancelPendingRegistration(registrationId: string): Promise<void> {
    await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const registrationRepository = manager.getRepository(Registration);
      const paymentRepository = manager.getRepository(Payment);
      const workshopRepository = manager.getRepository(Workshop);

      const registration = await registrationRepository
        .createQueryBuilder('registration')
        .leftJoinAndSelect('registration.payment', 'payment')
        .leftJoinAndSelect('registration.workshop', 'workshop')
        .where('registration.id = :id', { id: registrationId })
        // Tham số thứ 3 '["registration"]' báo cho TypeORM/Postgres biết:
        // CHỈ gắn cờ FOR UPDATE lên bảng registration, không đụng tới payment & workshop
        .setLock('pessimistic_write', undefined, ['registration'])
        .getOne();

      if (!registration) {
        throw new NotFoundException('Registration not found');
      }

      if (registration.status !== RegistrationStatus.PENDING) {
        throw new BadRequestException(
          'Only pending registrations can be cancelled',
        );
      }

      // If an idempotency key is present it means payment is being processed
      if (registration.payment && registration.payment.idempotencyKey) {
        throw new ConflictException(
          'Payment is being processed; cannot cancel.',
        );
      }

      // mark registration cancelled and update workshop counts
      registration.status = RegistrationStatus.CANCELLED;
      registration.expiresAt = null;
      await registrationRepository.save(registration);

      const workshop = registration.workshop as Workshop;
      if (workshop) {
        // lock workshop row and decrement
        const workshopRow = await workshopRepository.findOne({
          where: { id: workshop.id },
          lock: { mode: 'pessimistic_write' },
        });

        if (workshopRow) {
          workshopRow.registeredCount = Math.max(
            0,
            (workshopRow.registeredCount || 1) - 1,
          );
          await workshopRepository.save(workshopRow);
        }
      }

      // mark payment failed if exists
      if (registration.payment) {
        const payment = await paymentRepository.findOne({
          where: { id: registration.payment.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (payment) {
          payment.status = PaymentStatus.FAILED;
          await paymentRepository.save(payment);
        }
      }
    });

    await this.emitTicketCancelled(registrationId);
  }

  async registerTicket(
    userId: string,
    workshopId: string,
  ): Promise<RegisterTicketResponse> {
    const result = await this.dataSource.transaction(
      'SERIALIZABLE',
      async (manager) => {
        const workshopRepository = manager.getRepository(Workshop);
        const registrationRepository = manager.getRepository(Registration);
        const paymentRepository = manager.getRepository(Payment);

        const workshop = await this.getWorkshopForUpdate(
          workshopRepository,
          workshopId,
        );

        this.assertWorkshopOpen(workshop);
        this.assertCapacityAvailable(workshop);
        await this.assertNotRegistered(
          registrationRepository,
          workshopId,
          userId,
        );

        const isPaid = Number(workshop.price) > 0;

        if (!isPaid) {
          const registration = registrationRepository.create({
            workshopId,
            userId,
            status: RegistrationStatus.CONFIRMED,
            qrCode: generateQrCode(),
          });

          const savedRegistration =
            await registrationRepository.save(registration);

          workshop.registeredCount += 1;
          await workshopRepository.save(workshop);

          return {
            id: savedRegistration.id,
            workshopId: savedRegistration.workshopId,
            userId: savedRegistration.userId,
            status: savedRegistration.status,
            qrCode: savedRegistration.qrCode,
            registeredAt: savedRegistration.registeredAt,
            workshop: {
              title: workshop.title,
              startTime: workshop.startTime,
            },
          };
        }

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const registration = registrationRepository.create({
          workshopId,
          userId,
          status: RegistrationStatus.PENDING,
          expiresAt,
        });

        const savedRegistration =
          await registrationRepository.save(registration);

        const payment = paymentRepository.create({
          registrationId: savedRegistration.id,
          status: PaymentStatus.PENDING,
        });

        const savedPayment = await paymentRepository.save(payment);

        workshop.registeredCount += 1;
        await workshopRepository.save(workshop);

        return {
          id: savedRegistration.id,
          status: savedRegistration.status,
          paymentId: savedPayment.id,
          expiresAt: savedRegistration.expiresAt as Date,
          message: 'Registration created. Please proceed to pay or cancel.',
        };
      },
    );

    if ('qrCode' in result) {
      await this.emitTicketConfirmed(result.id);
    }

    if ('expiresAt' in result) {
      await this.emitPaymentPending(result.id, result.expiresAt as Date);
    }

    return result;
  }

  async completePayment(
    registrationId: string,
    idempotencyKey: string,
    transactionId: string,
  ): Promise<void> {
    // Đảm bảo tính ACID bằng Transaction
    await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      // 1. Cập nhật bảng Payment
      await manager.update(
        Payment,
        { registrationId, idempotencyKey },
        {
          status: PaymentStatus.SUCCESS,
          transactionId: transactionId,
        },
      );

      // 2. Cập nhật bảng Registration
      await manager.update(
        Registration,
        { id: registrationId },
        {
          status: RegistrationStatus.CONFIRMED,
          qrCode: generateQrCode(),
          expiresAt: null,
        },
      );
    });

    await this.emitTicketConfirmed(registrationId);
  }

  async extendExpiryDueToSystemError(
    registrationId: string,
    minutes: number = 5,
  ): Promise<void> {
    // Logic gia hạn thời gian khi gặp lỗi hệ thống[cite: 37]
    await this.registrationRepository
      .createQueryBuilder()
      .update(Registration)
      .set({ expiresAt: () => `expires_at + INTERVAL '${minutes} minute'` })
      .where('id = :id', { id: registrationId })
      .execute();
  }

  async handleSystemFailure(registrationId: string): Promise<void> {
    await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const registrationRepo = manager.getRepository(Registration);
      const paymentRepo = manager.getRepository(Payment);
      const workshopRepo = manager.getRepository(Workshop);

      // 1. Lấy Registration kèm Payment và Workshop, chỉ lock bảng Registration[cite: 15, 37]
      const registration = await registrationRepo
        .createQueryBuilder('registration')
        .leftJoinAndSelect('registration.payment', 'payment')
        .leftJoinAndSelect('registration.workshop', 'workshop')
        .where('registration.id = :id', { id: registrationId })
        .setLock('pessimistic_write', undefined, ['registration'])
        .getOne();

      if (!registration) return;

      // 2. Cập nhật trạng thái Registration[cite: 15, 28, 37]
      registration.status = RegistrationStatus.SYSTEM_FAILURE;
      registration.expiresAt = null;
      await registrationRepo.save(registration);

      // 3. Cập nhật trạng thái Payment nếu có[cite: 28, 37]
      if (registration.payment) {
        await paymentRepo.update(
          { id: registration.payment.id },
          { status: PaymentStatus.SYSTEM_FAILURE },
        );
      }

      // 4. Trả lại slot cho Workshop (Lock row để an toàn tuyệt đối)
      if (registration.workshop) {
        const workshop = await workshopRepo.findOne({
          where: { id: registration.workshop.id },
          lock: { mode: 'pessimistic_write' },
        });

        if (workshop) {
          workshop.registeredCount = Math.max(
            0,
            (workshop.registeredCount || 0) - 1,
          );
          await workshopRepo.save(workshop);
        }
      }
    });

    await this.emitPaymentFailed(registrationId);
  }

  async getMyConfirmedRegistrations(
    userId: string,
  ): Promise<RegistrationListItem[]> {
    return this.fetchRegistrationsByStatus(
      userId,
      RegistrationStatus.CONFIRMED,
    );
  }

  async getMyPendingRegistrations(
    userId: string,
  ): Promise<RegistrationListItem[]> {
    return this.fetchRegistrationsByStatus(userId, RegistrationStatus.PENDING);
  }

  async getRegistrationDetail(
    userId: string,
    registrationId: string,
  ): Promise<RegistrationListItem> {
    const registrationRepository = this.dataSource.getRepository(Registration);
    const registration = await registrationRepository.findOne({
      where: { id: registrationId, userId },
      relations: ['workshop', 'payment'],
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    return this.mapRegistration(registration);
  }

  private async getWorkshopForUpdate(
    workshopRepository: Repository<Workshop>,
    workshopId: string,
  ): Promise<Workshop> {
    const workshop = await workshopRepository.findOne({
      where: { id: workshopId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!workshop) {
      throw new NotFoundException('Workshop not found');
    }

    return workshop;
  }

  async validateForPayment(registrationId: string): Promise<void> {
    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    const now = new Date();
    if (registration.expiresAt && registration.expiresAt < now) {
      throw new BadRequestException(
        'Registration has expired. Please register again.',
      );
    }
    if (registration.status === RegistrationStatus.CONFIRMED) {
      throw new BadRequestException('Registration has already been paid.');
    }
  }

  async reservePaymentIdempotencyKey(
    registrationId: string,
    idempotencyKey: string,
  ): Promise<void> {
    await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const paymentRepository = manager.getRepository(Payment);

      const payment = await paymentRepository.findOne({
        where: { registrationId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found for this registration');
      }

      if (payment.idempotencyKey && payment.idempotencyKey !== idempotencyKey) {
        throw new ConflictException(
          'Payment for this registration is already being/has been processed.',
        );
      }

      if (!payment.idempotencyKey) {
        payment.idempotencyKey = idempotencyKey;
        await paymentRepository.save(payment);
      }
    });
  }

  private assertWorkshopOpen(workshop: Workshop) {
    const now = new Date();
    if (workshop.startTime <= now || workshop.endTime <= now) {
      throw new BadRequestException('Workshop not open for registration');
    }
  }

  private assertCapacityAvailable(workshop: Workshop) {
    if (workshop.registeredCount >= workshop.capacity) {
      throw new ConflictException('Workshop is full');
    }
  }

  private async fetchRegistrationsByStatus(
    userId: string,
    status: RegistrationStatus,
  ): Promise<RegistrationListItem[]> {
    const registrationRepository = this.dataSource.getRepository(Registration);
    const registrations = await registrationRepository.find({
      where: { userId, status },
      relations: ['workshop', 'payment'],
      order: { registeredAt: 'DESC' },
    });

    return registrations.map((registration) =>
      this.mapRegistration(registration),
    );
  }

  private mapRegistration(registration: Registration): RegistrationListItem {
    return {
      id: registration.id,
      status: registration.status,
      registeredAt: registration.registeredAt,
      expiresAt: registration.expiresAt,
      qrCode: registration.qrCode,
      workshop: {
        id: registration.workshop.id,
        title: registration.workshop.title,
        startTime: registration.workshop.startTime,
        endTime: registration.workshop.endTime,
        room: registration.workshop.room,
        speaker: registration.workshop.speaker,
        price: registration.workshop.price,
      },
      payment: registration.payment
        ? {
            id: registration.payment.id,
            status: registration.payment.status,
          }
        : null,
    };
  }

  private async assertNotRegistered(
    registrationRepository: Repository<Registration>,
    workshopId: string,
    userId: string,
  ) {
    const existingRegistration = await registrationRepository.findOne({
      where: {
        workshopId,
        userId,
        status: Not(
          In([RegistrationStatus.SYSTEM_FAILURE, RegistrationStatus.CANCELLED]),
        ),
      },
    });

    if (existingRegistration) {
      throw new ConflictException('Already registered for this workshop');
    }
  }

  private async emitTicketConfirmed(registrationId: string) {
    const payload = await this.buildTicketConfirmedPayload(registrationId);
    if (!payload) return;
    this.eventEmitter.emit(EMAIL_EVENT_TICKET_CONFIRMED, payload);
  }

  private async emitPaymentPending(registrationId: string, expiresAt: Date) {
    const basePayload = await this.buildBasePayload(registrationId);
    if (!basePayload) return;

    const payload: PaymentPendingEmailJob = {
      ...basePayload,
      expiresAt,
      paymentLink: this.buildPaymentLink(registrationId),
    };

    this.eventEmitter.emit(EMAIL_EVENT_PAYMENT_PENDING, payload);
  }

  private async emitPaymentFailed(registrationId: string) {
    const payload = await this.buildPaymentFailedPayload(registrationId);
    if (!payload) return;
    this.eventEmitter.emit(EMAIL_EVENT_PAYMENT_FAILED, payload);
  }

  private async emitTicketCancelled(registrationId: string) {
    const payload = await this.buildTicketCancelledPayload(registrationId);
    if (!payload) return;
    this.eventEmitter.emit(EMAIL_EVENT_TICKET_CANCELLED, payload);
  }

  private async buildTicketConfirmedPayload(
    registrationId: string,
  ): Promise<TicketConfirmedEmailJob | null> {
    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId },
      relations: ['user', 'workshop'],
    });

    if (!registration?.user?.email || !registration.workshop) return null;
    if (!registration.qrCode) return null;

    return {
      to: registration.user.email,
      registrationId,
      workshop: this.mapWorkshopEmailContext(registration.workshop),
      qrCode: registration.qrCode,
    };
  }

  private async buildTicketCancelledPayload(
    registrationId: string,
  ): Promise<TicketCancelledEmailJob | null> {
    const basePayload = await this.buildBasePayload(registrationId);
    if (!basePayload) return null;

    return basePayload;
  }

  private async buildPaymentFailedPayload(
    registrationId: string,
  ): Promise<PaymentFailedEmailJob | null> {
    const basePayload = await this.buildBasePayload(registrationId);
    if (!basePayload) return null;

    return basePayload;
  }

  private async buildBasePayload(
    registrationId: string,
  ): Promise<EmailJobBase | null> {
    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId },
      relations: ['user', 'workshop'],
    });

    if (!registration?.user?.email || !registration.workshop) {
      return null;
    }

    return {
      to: registration.user.email,
      registrationId,
      workshop: this.mapWorkshopEmailContext(registration.workshop),
    };
  }

  private mapWorkshopEmailContext(workshop: Workshop): WorkshopEmailContext {
    return {
      title: workshop.title,
      startTime: workshop.startTime,
      location: workshop.room,
    };
  }

  private buildPaymentLink(registrationId: string) {
    const base = process.env.PAYMENT_URL_BASE || 'https://example.com/pay';
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}registrationId=${registrationId}`;
  }
}
