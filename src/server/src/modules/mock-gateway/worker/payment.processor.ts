import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import type { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Inject, Logger } from '@nestjs/common';
import { Redis } from '@upstash/redis';
import { MockGatewayService } from '../mock-gateway.service';
import { RedisCircuitBreakerService } from '../redis-circuit-breaker.service';
import { Payment, PaymentStatus } from '../../../entities/payment.entity';
import {
  Registration,
  RegistrationStatus,
} from '../../../entities/registration.entity';
import { MockChargeDto } from '../dto/mock-charge.dto';
import {
  MOCK_GATEWAY_QUEUE,
  MOCK_GATEWAY_JOB,
  MOCK_GATEWAY_REDIS_TOKEN,
} from '../mock-gateway.constants';
import { generateQrCode } from '../../../utils/qr.utils';
import { RegistrationsService } from '../../registrations/registrations.service';

@Processor(MOCK_GATEWAY_QUEUE)
export class PaymentProcessor {
  private readonly logger = new Logger(PaymentProcessor.name);

  constructor(
    private readonly mockGatewayService: MockGatewayService,
    private readonly circuitBreaker: RedisCircuitBreakerService,
    private readonly registrationsService: RegistrationsService,
    private readonly dataSource: DataSource,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
    @Inject(MOCK_GATEWAY_REDIS_TOKEN) private readonly redis: Redis,
  ) {}

  @Process(MOCK_GATEWAY_JOB)
  async handleCharge(job: Job<MockChargeDto>) {
    const dto = job.data;

    this.logger.debug(
      `Worker đang xử lý thanh toán cho đăng ký: ${dto.registrationId}`,
    );

    try {
      // 1. BỌC LỜI GỌI API BẰNG CẦU DAO
      const result = await this.circuitBreaker.execute(async () => {
        return await this.mockGatewayService.charge(dto);
      });

      // 2. NẾU THÀNH CÔNG: Gọi Service xử lý DB Transaction[cite: 37]
      await this.registrationsService.completePayment(
        dto.registrationId,
        dto.idempotencyKey,
        result.transactionId,
      );

      // 3. Cập nhật kết quả vào Redis cho Idempotency[cite: 33]
      const redisKey = `idempotency:${dto.idempotencyKey}`;
      const finalResult = {
        transactionId: result.transactionId,
        status: 'SUCCESS',
      };
      await this.redis.set(redisKey, finalResult, { ex: 86400 });

      this.logger.debug(
        `Đã hoàn tất quy trình thanh toán thành công cho ${dto.registrationId}`,
      );
      return result;
    } catch (error: any) {
      // 4. XỬ LÝ LỖI HỆ THỐNG[cite: 37]
      const status = error?.status || error?.response?.statusCode;

      if (status >= 500) {
        this.logger.warn(
          `Lỗi hệ thống. Đang yêu cầu Service gia hạn expire_at...`,
        );
        await this.registrationsService.extendExpiryDueToSystemError(
          dto.registrationId,
          5,
        );
      }

      // Vẫn throw để Bull thực hiện cơ chế Retry (attempts/backoff)[cite: 32, 38]
      throw error;
    }
  }

  @OnQueueFailed()
  async handleFinalFailure(job: Job<MockChargeDto>, error: Error) {
    // Chỉ xử lý khi đã hết số lần thử (attempts: 5)[cite: 29, 32]
    if (job.attemptsMade < (job.opts.attempts || 5)) {
      return;
    }

    const { registrationId } = job.data;
    this.logger.error(
      `Job ${job.id} thất bại vĩnh viễn sau 5 lần thử. Tiến hành dọn dẹp data...`,
    );

    try {
      // Gọi Service để xử lý trọn gói nghiệp vụ DB[cite: 37]
      await this.registrationsService.handleSystemFailure(registrationId);
    } catch (err) {
      this.logger.error(
        'Lỗi nghiêm trọng khi dọn dẹp sau thất bại vĩnh viễn',
        err,
      );
    }
  }
}
