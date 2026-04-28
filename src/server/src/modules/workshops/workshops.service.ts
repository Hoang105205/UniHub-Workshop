import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
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

@Injectable()
export class WorkshopsService {
  constructor(
    @InjectRepository(Workshop)
    private readonly workshopRepository: Repository<Workshop>,
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
}
