import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncHistory } from '../../entities/sync-history.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../entities/roles.enum';

@Controller('csv-sync')
export class CsvSyncController {
  constructor(
    @InjectRepository(SyncHistory)
    private readonly syncHistoryRepository: Repository<SyncHistory>,
  ) {}

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getHistory(@Req() request: { user: { id: string } }) {
    return this.syncHistoryRepository.find({ order: { createdAt: 'DESC' } });
  }
}
