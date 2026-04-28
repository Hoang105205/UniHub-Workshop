import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import {
  Registration,
  RegistrationStatus,
} from '../../entities/registration.entity';
import { Workshop } from '../../entities/workshop.entity';

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

@Injectable()
export class WorkshopsService {
  constructor(
    @InjectRepository(Workshop)
    private readonly workshopRepository: Repository<Workshop>,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
  ) {}

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
}
