import {
  Body,
  Controller,
  ParseArrayPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../entities/roles.enum';
import { CheckInsService } from './check-ins.service';
import { BatchCheckInDto } from './dto/batch-checkin.dto';
import { CreateCheckInDto } from './dto/create-checkin.dto';

@Controller('check-ins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STAFF, Role.ADMIN)
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  @Post()
  async create(
    @Body() dto: CreateCheckInDto,
    @Req() request: { user: { id: string } },
  ) {
    return this.checkInsService.createCheckIn(dto, request.user.id);
  }

  @Post('batch')
  async batch(
    @Body(new ParseArrayPipe({ items: BatchCheckInDto }))
    payload: BatchCheckInDto[],
    @Req() request: { user: { id: string } },
  ) {
    return this.checkInsService.batchCheckIns(payload, request.user.id);
  }
}
