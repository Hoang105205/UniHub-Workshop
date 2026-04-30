import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import {
  Registration,
  RegistrationStatus,
} from '../../entities/registration.entity';
import { Workshop } from '../../entities/workshop.entity';
import { AiSummaryQueueService } from './ai-summary.queue';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { SupabaseStorageService } from './supabase-storage.service';
import type { Multer } from 'multer';

export interface WorkshopListItem {
  id: string;
  title: string;
  detail: string;
  capacity: number;
  registeredCount: number;
  availableSeats: number;
  price: string;
  startTime: Date;
  endTime: Date;
  room: string;
  speaker: string;
}

export interface WorkshopListResponse {
  data: WorkshopListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WorkshopDetailResponse {
  id: string;
  title: string;
  detail: string;
  capacity: number;
  registeredCount: number;
  availableSeats: number;
  price: string;
  startTime: Date;
  endTime: Date;
  room: string;
  speaker: string;
  hasTicket: boolean;
}

export interface WorkshopAdminResponse {
  id: string;
  title: string;
  detail: string;
  capacity: number;
  registeredCount: number;
  price: string;
  startTime: Date;
  endTime: Date;
  room: string;
  speaker: string;
}

@Injectable()
export class WorkshopsService {
  constructor(
    @InjectRepository(Workshop)
    private readonly workshopRepository: Repository<Workshop>,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
    private readonly storageService: SupabaseStorageService,
    private readonly aiSummaryQueue: AiSummaryQueueService,
  ) {}

  async create(
    dto: CreateWorkshopDto,
    file?: Multer.File,
  ): Promise<WorkshopAdminResponse> {
    this.assertValidTimeRange(dto.startTime, dto.endTime);
    this.assertStartTimeInFuture(dto.startTime);
    await this.assertRoomAvailable(dto.room, dto.startTime, dto.endTime);

    const workshop = this.workshopRepository.create({
      title: dto.title,
      speaker: dto.speaker,
      room: dto.room,
      capacity: dto.capacity,
      price: this.normalizePrice(dto.price),
      startTime: dto.startTime,
      endTime: dto.endTime,
      detail: dto.detail?.trim() || '',
    });

    const saved = await this.workshopRepository.save(workshop);

    if (file) {
      const pdfUrl = await this.storageService.uploadWorkshopIntroPdf(
        saved.id,
        file,
      );
      await this.aiSummaryQueue.enqueue({
        workshopId: saved.id,
        pdfUrl,
        detailSnapshot: saved.detail,
      });
    }

    return this.mapAdminResponse(saved);
  }

  async update(
    id: string,
    dto: UpdateWorkshopDto,
    file?: Multer.File,
  ): Promise<WorkshopAdminResponse> {
    const workshop = await this.workshopRepository.findOne({ where: { id } });

    if (!workshop) {
      throw new NotFoundException('Workshop not found');
    }

    if (
      typeof dto.capacity === 'number' &&
      dto.capacity < workshop.registeredCount
    ) {
      throw new BadRequestException(
        'Capacity cannot be lower than registered count',
      );
    }

    const nextStart = dto.startTime ?? workshop.startTime;
    const nextEnd = dto.endTime ?? workshop.endTime;
    const nextRoom = dto.room ?? workshop.room;

    this.assertValidTimeRange(nextStart, nextEnd);
    if (dto.startTime || dto.endTime) {
      this.assertStartTimeInFuture(nextStart);
    }

    const isRoomChanged = nextRoom !== workshop.room;
    const isTimeChanged =
      nextStart.getTime() !== workshop.startTime.getTime() ||
      nextEnd.getTime() !== workshop.endTime.getTime();

    if (isRoomChanged || isTimeChanged) {
      await this.assertRoomAvailable(nextRoom, nextStart, nextEnd, id);
    }

    workshop.title = dto.title ?? workshop.title;
    workshop.speaker = dto.speaker ?? workshop.speaker;
    workshop.room = nextRoom;
    workshop.capacity = dto.capacity ?? workshop.capacity;
    workshop.price =
      typeof dto.price === 'number'
        ? this.normalizePrice(dto.price)
        : workshop.price;
    workshop.startTime = nextStart;
    workshop.endTime = nextEnd;
    workshop.detail = dto.detail ?? workshop.detail;

    const saved = await this.workshopRepository.save(workshop);

    if (file) {
      const pdfUrl = await this.storageService.uploadWorkshopIntroPdf(
        saved.id,
        file,
      );
      await this.aiSummaryQueue.enqueue({
        workshopId: saved.id,
        pdfUrl,
        detailSnapshot: saved.detail,
      });
    }

    return this.mapAdminResponse(saved);
  }

  async remove(id: string): Promise<{ id: string; deleted: boolean }> {
    const workshop = await this.workshopRepository.findOne({ where: { id } });

    if (!workshop) {
      throw new NotFoundException('Workshop not found');
    }

    await this.workshopRepository.remove(workshop);
    return { id, deleted: true };
  }

  async listUpcoming(
    page: number,
    limit: number,
  ): Promise<WorkshopListResponse> {
    const [items, total] = await this.workshopRepository.findAndCount({
      where: {
        startTime: MoreThan(new Date()),
      },
      order: {
        startTime: 'ASC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = items.map((workshop) => ({
      id: workshop.id,
      title: workshop.title,
      detail: workshop.detail,
      capacity: workshop.capacity,
      registeredCount: workshop.registeredCount,
      availableSeats: workshop.capacity - workshop.registeredCount,
      price: workshop.price,
      startTime: workshop.startTime,
      endTime: workshop.endTime,
      room: workshop.room,
      speaker: workshop.speaker,
    }));

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getDetail(id: string, userId: string): Promise<WorkshopDetailResponse> {
    const workshop = await this.workshopRepository.findOne({
      where: { id },
    });

    if (!workshop) {
      throw new NotFoundException('Workshop not found');
    }

    const ticketCount = await this.registrationRepository.count({
      where: {
        workshopId: id,
        userId,
        status: In([
          RegistrationStatus.CONFIRMED,
          RegistrationStatus.CHECKED_IN,
          RegistrationStatus.PENDING,
        ]),
      },
    });

    return {
      id: workshop.id,
      title: workshop.title,
      detail: workshop.detail,
      capacity: workshop.capacity,
      registeredCount: workshop.registeredCount,
      availableSeats: workshop.capacity - workshop.registeredCount,
      price: workshop.price,
      startTime: workshop.startTime,
      endTime: workshop.endTime,
      room: workshop.room,
      speaker: workshop.speaker,
      hasTicket: ticketCount > 0,
    };
  }

  private normalizePrice(price?: number): string {
    if (price === undefined || price === null) {
      return '0';
    }

    return Number(price).toFixed(2);
  }

  private mapAdminResponse(workshop: Workshop): WorkshopAdminResponse {
    return {
      id: workshop.id,
      title: workshop.title,
      detail: workshop.detail,
      capacity: workshop.capacity,
      registeredCount: workshop.registeredCount,
      price: workshop.price,
      startTime: workshop.startTime,
      endTime: workshop.endTime,
      room: workshop.room,
      speaker: workshop.speaker,
    };
  }

  private assertValidTimeRange(startTime: Date, endTime: Date) {
    if (startTime >= endTime) {
      throw new BadRequestException('End time must be after start time');
    }
  }

  private assertStartTimeInFuture(startTime: Date) {
    if (startTime <= new Date()) {
      throw new BadRequestException('Start time must be in the future');
    }
  }

  private async assertRoomAvailable(
    room: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ) {
    const query = this.workshopRepository
      .createQueryBuilder('workshop')
      .select('workshop.id')
      .where('workshop.room = :room', { room })
      .andWhere('(workshop.start_time, workshop.end_time) OVERLAPS (:start, :end)', {
        start: startTime,
        end: endTime,
      });

    if (excludeId) {
      query.andWhere('workshop.id <> :excludeId', { excludeId });
    }

    const conflict = await query.getOne();

    if (conflict) {
      throw new ConflictException('Room is already booked for this time slot');
    }
  }
}
