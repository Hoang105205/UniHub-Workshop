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

@Controller('mock-gateway')
export class MockGatewayController {
  constructor(
    private readonly mockGatewayService: MockGatewayService,
    private readonly paymentQueueService: PaymentQueueService,
    private readonly registrationsService: RegistrationsService,
  ) {}

  @Post('config')
  @UseGuards(MockGatewayConfigGuard)
  async configure(@Body() dto: ConfigMockGatewayDto) {
    return this.mockGatewayService.setConfig(dto);
  }

  @Post('charge')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @UseInterceptors(IdempotencyInterceptor)
  async charge(@Body() dto: MockChargeDto) {
    // 1. Uỷ quyền cho Registration Service kiểm tra tính hợp lệ
    // Nếu có lỗi (hết hạn/không tồn tại), nó sẽ tự văng Exception ở bên kia và chặn luồng tại đây
    await this.registrationsService.validateForPayment(dto.registrationId);

    // 2. Khóa idempotency key theo registrationId.
    // Nếu registration đã gắn với key khác thì từ chối ngay (409), không enqueue.
    await this.registrationsService.reservePaymentIdempotencyKey(
      dto.registrationId,
      dto.idempotencyKey,
    );

    // 3. Đẩy job vào Queue (Bao gồm cả tham số attempts và backoff để tự retry)
    await this.paymentQueueService.enqueueCharge(dto);

    // 4. Trả về ngay lập tức
    return {
      message: 'Payment request received and is being processed.',
      status: 'PROCESSING',
    };
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async cancel(@Body() dto: MockCancelDto) {
    await this.registrationsService.cancelPendingRegistration(dto.registrationId);

    return {
      message: 'Registration cancelled successfully.',
      status: 'CANCELLED',
    };
  }
}
