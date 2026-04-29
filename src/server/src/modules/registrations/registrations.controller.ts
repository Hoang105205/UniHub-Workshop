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

@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async getMyConfirmedRegistrations(@Req() request: { user: { id: string } }) {
    return this.registrationsService.getMyConfirmedRegistrations(
      request.user.id,
    );
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async getMyPendingRegistrations(@Req() request: { user: { id: string } }) {
    return this.registrationsService.getMyPendingRegistrations(request.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
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
