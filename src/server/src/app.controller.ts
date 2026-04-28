import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';
import { Role } from './entities/roles.enum';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('student/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  getStudentDashboard(@Req() request: { user: { email: string; role: Role } }) {
    return {
      message: 'Student dashboard data',
      user: request.user,
    };
  }

  @Get('staff/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF)
  getStaffDashboard(@Req() request: { user: { email: string; role: Role } }) {
    return {
      message: 'Staff dashboard data',
      user: request.user,
    };
  }

  @Get('admin/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getAdminDashboard(@Req() request: { user: { email: string; role: Role } }) {
    return {
      message: 'Admin dashboard data',
      user: request.user,
    };
  }
}
