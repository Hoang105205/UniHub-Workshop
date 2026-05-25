import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../entities/roles.enum';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { RegistrationsService } from './registrations.service';
import { Throttle } from '@nestjs/throttler';
import { UserThrottlerGuard } from '../../common/guards/user-throttler.guard';
import { RATE_LIMIT } from '../../config/rate-limit.config';

@Controller('registrations')
@UseGuards(JwtAuthGuard, UserThrottlerGuard)
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  @Throttle({ default:  RATE_LIMIT.WRITE }) // Giới hạn 10 request / 1 phút 
  async registerTicket(
    @Body() dto: CreateRegistrationDto,
    @Req() request: { user: { id: string } },
  ) {
    return this.registrationsService.registerTicket(
      request.user.id,
      dto.workshopId,
    );
  }

  @Get('confirm')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  @Throttle({ default:  RATE_LIMIT.READ }) // Giới hạn 30 request / 1 phút 
  async getMyConfirmedRegistrations(@Req() request: { user: { id: string } }) {
    return this.registrationsService.getMyConfirmedRegistrations(
      request.user.id,
    );
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  @Throttle({ default:  RATE_LIMIT.READ }) // Giới hạn 30 request / 1 phút 
  async getMyPendingRegistrations(@Req() request: { user: { id: string } }) {
    return this.registrationsService.getMyPendingRegistrations(request.user.id);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  @Throttle({ default:  RATE_LIMIT.READ }) // Giới hạn 30 request / 1 phút 
  async getRegistrationDetail(
    @Param('id') registrationId: string,
    @Req() request: { user: { id: string } },
  ) {
    return this.registrationsService.getRegistrationDetail(
      request.user.id,
      registrationId,
    );
  }
}
