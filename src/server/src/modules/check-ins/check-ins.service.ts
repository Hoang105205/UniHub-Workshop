import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CheckIn, SyncStatus } from '../../entities/check-in.entity';
import {
  Registration,
  RegistrationStatus,
} from '../../entities/registration.entity';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/roles.enum';
import { BatchCheckInDto } from './dto/batch-checkin.dto';
import { CreateCheckInDto } from './dto/create-checkin.dto';

export interface BatchCheckInResult {
  local_id: number;
  status: 'ok' | 'conflict' | 'error';
  message?: string;
}

@Injectable()
export class CheckInsService {
  private readonly logger = new Logger(CheckInsService.name);

  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async createCheckIn(dto: CreateCheckInDto, staffId: string) {
    return this.dataSource.transaction(async (manager) => {
      const registrationRepository = manager.getRepository(Registration);
      const checkInRepository = manager.getRepository(CheckIn);
      const userRepository = manager.getRepository(User);
      
      this.logger.debug(`Attempting to check in with QR code: ${dto.qr_code} by staff ID: ${staffId}`);

      const staff = await userRepository.findOne({ where: { id: staffId } });
      if (!staff) {
        throw new NotFoundException('Staff not found');
      }
      if (![Role.STAFF, Role.ADMIN].includes(staff.role)) {
        throw new BadRequestException('User is not allowed to check in');
      }

      this.logger.debug(`Staff ${staff.name} (${staff.id}) is authorized to perform check-in.`);

      const registration = await registrationRepository
        .createQueryBuilder('registration')
        .leftJoinAndSelect('registration.user', 'user')
        .leftJoinAndSelect('registration.workshop', 'workshop')
        .where('registration.qrCode = :qrCode', { qrCode: dto.qr_code })
        // Sửa dòng này: Thêm tham số thứ 3 là mảng chứa alias của bảng muốn lock
        .setLock('pessimistic_write', undefined, ['registration']) 
        .getOne();

      if (!registration) {
        throw new NotFoundException('Invalid QR code');
      }

      if (registration.status === RegistrationStatus.CHECKED_IN) {
        throw new ConflictException('Already checked in');
      }

      if (registration.status !== RegistrationStatus.CONFIRMED) {
        throw new BadRequestException('Registration is not confirmed');
      }

      const existing = await checkInRepository.findOne({
        where: { registrationId: registration.id },
      });

      if (existing) {
        throw new ConflictException('Already checked in');
      }

      const checkedInAt = this.resolveTimestamp(dto.scanned_at);

      const checkIn = checkInRepository.create({
        registrationId: registration.id,
        staffId,
        syncStatus: SyncStatus.SYNCED,
        deviceId: dto.device_id,
        checkedInAt,
      });

      await checkInRepository.save(checkIn);

      registration.status = RegistrationStatus.CHECKED_IN;
      await registrationRepository.save(registration);

      this.logger.log(`Check-in successful for registration ID: ${registration.id} by staff ID: ${staffId} at ${checkedInAt.toISOString()}`);

      return {
        id: checkIn.id,
        registration: {
          id: registration.id,
          student: registration.user
            ? {
                name: registration.user.name,
                studentId: registration.user.studentId,
              }
            : null,
          workshop: registration.workshop
            ? {
                title: registration.workshop.title,
                room: registration.workshop.room,
              }
            : null,
        },
        checkedInAt: checkIn.checkedInAt,
      };
    });
  }

  async batchCheckIns(
    items: BatchCheckInDto[],
    staffId: string,
  ): Promise<{ results: BatchCheckInResult[] }> {
    const results: BatchCheckInResult[] = [];

    for (const item of items) {
      try {
        await this.createCheckIn(item, staffId);
        results.push({ local_id: item.local_id, status: 'ok' });
      } catch (error) {
        const mapped = this.mapCheckInError(error, item.local_id);
        results.push(mapped);
      }
    }

    return { results };
  }

  private resolveTimestamp(raw: number): Date {
    const asMs = raw > 1_000_000_000_000 ? raw : raw * 1000;
    return new Date(asMs);
  }

  private mapCheckInError(
    error: unknown,
    localId: number,
  ): BatchCheckInResult {
    if (error instanceof ConflictException) {
      return { local_id: localId, status: 'conflict', message: error.message };
    }
    if (error instanceof NotFoundException) {
      return { local_id: localId, status: 'error', message: error.message };
    }
    if (error instanceof BadRequestException) {
      return { local_id: localId, status: 'error', message: error.message };
    }
    return {
      local_id: localId,
      status: 'error',
      message: 'Unable to check in',
    };
  }
}
