import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MOCK_GATEWAY_REDIS_TOKEN } from './mock-gateway.constants';
import { MockGatewayController } from './mock-gateway.controller';
import { MockGatewayConfigGuard } from './guards/mock-gateway.guard';
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
    PaymentQueueService,
    PaymentProcessor,
    {
      provide: MOCK_GATEWAY_REDIS_TOKEN,
      useFactory: (configService: ConfigService): Redis => {
        const redisUrl = configService.get<string>('REDIS_URL');
        
        // Chặn đứng ngay lúc khởi động nếu quên set .env
        if (!redisUrl) {
          throw new Error('Thiếu biến môi trường REDIS_URL!');
        }

        return new Redis(redisUrl);
      },
      inject: [ConfigService],
    },
  ],
  exports: [MockGatewayService, RedisCircuitBreakerService],
})
export class MockGatewayModule {}
