import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MockGatewayController } from './mock-gateway.controller';
import { MockGatewayConfigGuard } from './guards/mock-gateway.guard';
import { IdempotencyInterceptor } from './guards/idempotency.interceptor';
import { MockGatewayService } from './mock-gateway.service';
import { RedisCircuitBreakerService } from './redis-circuit-breaker.service';
import { MOCK_GATEWAY_QUEUE } from './mock-gateway.constants';
import { Registration } from '../../entities/registration.entity';
import { Payment } from '../../entities/payment.entity';
import { RegistrationsModule } from '../registrations/registrations.module';
import { PaymentQueueService } from './worker/payment.queue.service';
import { PaymentProcessor } from './worker/payment.processor';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.registerQueue({
      name: MOCK_GATEWAY_QUEUE,
    }),
    TypeOrmModule.forFeature([Payment, Registration]),
    RegistrationsModule,
  ],
  controllers: [MockGatewayController],
  providers: [
    MockGatewayService,
    RedisCircuitBreakerService,
    MockGatewayConfigGuard,
    IdempotencyInterceptor,
    PaymentQueueService,
    PaymentProcessor,
  ],
  exports: [MockGatewayService, RedisCircuitBreakerService],
})
export class MockGatewayModule {}
