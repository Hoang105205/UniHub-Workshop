import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncHistory } from '../../entities/sync-history.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../entities/roles.enum';
import { Throttle } from '@nestjs/throttler';
import { UserThrottlerGuard } from '../../common/guards/user-throttler.guard';
import { RATE_LIMIT } from '../../config/rate-limit.config';

@Controller('csv-sync')
export class CsvSyncController {
  constructor(
    @InjectRepository(SyncHistory)
    private readonly syncHistoryRepository: Repository<SyncHistory>,
  ) {}

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default:  RATE_LIMIT.ADMIN }) // Giới hạn 20 request / 1 phút cho endpoint này
  async getHistory(@Req() request: { user: { id: string } }) {
    return this.syncHistoryRepository.find({ order: { createdAt: 'DESC' } });
  }
}
