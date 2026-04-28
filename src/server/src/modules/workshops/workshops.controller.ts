import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../entities/roles.enum';
import { WorkshopsService } from './workshops.service';

@Controller('workshops')
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT, Role.ADMIN)
  async listUpcoming(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const resolvedPage = Math.max(1, Number(page) || 1);
    const resolvedLimit = Math.min(24, Math.max(1, Number(limit) || 9));

    return this.workshopsService.listUpcoming(resolvedPage, resolvedLimit);
  }
}
