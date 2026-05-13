import {
  Body,
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigMockGatewayDto } from './dto/config-mock-gateway.dto';
import { MockChargeDto } from './dto/mock-charge.dto';
import { MockCancelDto } from './dto/mock-cancel.dto';
import { MockGatewayConfigGuard } from './guards/mock-gateway.guard';
import { IdempotencyInterceptor } from './guards/idempotency.interceptor';
import { MockGatewayService } from './mock-gateway.service';
import { PaymentQueueService } from './worker/payment.queue.service';
import { RegistrationsService } from '../registrations/registrations.service';
import { Role } from '../../entities/roles.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Throttle } from '@nestjs/throttler';
import { UserThrottlerGuard } from '../../common/guards/user-throttler.guard';
import { RATE_LIMIT } from '../../config/rate-limit.config';

@Controller('mock-gateway')
export class MockGatewayController {
  constructor(
    private readonly mockGatewayService: MockGatewayService,
    private readonly paymentQueueService: PaymentQueueService,
    private readonly registrationsService: RegistrationsService,
  ) {}

  @Post('config')
  @UseGuards(MockGatewayConfigGuard)
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: RATE_LIMIT.ADMIN })
  async configure(@Body() dto: ConfigMockGatewayDto) {
    return this.mockGatewayService.setConfig(dto);
  }

  @Post('charge')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: RATE_LIMIT.WRITE }) // Giới hạn 10 request / 1 phút
  @UseInterceptors(IdempotencyInterceptor)
  async charge(@Body() dto: MockChargeDto) {
    // 1. Khóa idempotency key theo registrationId.
    // Nếu registration đã gắn với key khác thì từ chối ngay (409), không enqueue.
    await this.registrationsService.reservePaymentIdempotencyKey(
      dto.registrationId,
      dto.idempotencyKey,
    );

    // 2. Đẩy job vào Queue (Bao gồm cả tham số attempts và backoff để tự retry)
    await this.paymentQueueService.enqueueCharge(dto);

    // 3. Trả về ngay lập tức
    return {
      message: 'Payment request received and is being processed.',
      status: 'PROCESSING',
    };
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: RATE_LIMIT.WRITE }) // Giới hạn 10 request / 1 phút
  async cancel(@Body() dto: MockCancelDto) {
    await this.registrationsService.cancelPendingRegistration(
      dto.registrationId,
    );

    return {
      message: 'Registration cancelled successfully.',
      status: 'CANCELLED',
    };
  }
}
