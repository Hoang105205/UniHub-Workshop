import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { generateQrCode } from '../../utils/qr.utils';
import { Payment, PaymentStatus } from '../../entities/payment.entity';
import {
  Registration,
  RegistrationStatus,
} from '../../entities/registration.entity';
import { Workshop } from '../../entities/workshop.entity';

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
  constructor(private readonly dataSource: DataSource) {}

  async registerTicket(
    userId: string,
    workshopId: string,
  ): Promise<RegisterTicketResponse> {
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
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

      const savedRegistration = await registrationRepository.save(registration);

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
    });
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
      where: { workshopId, userId },
    });

    if (existingRegistration) {
      throw new ConflictException('Already registered for this workshop');
    }
  }
}
