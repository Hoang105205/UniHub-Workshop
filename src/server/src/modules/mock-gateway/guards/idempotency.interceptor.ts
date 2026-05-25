import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import Redis from 'ioredis';
import { RegistrationsService } from '../../registrations/registrations.service';
import { REDIS_CLIENT_TOKEN } from '../../../redis/redis.constants';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @Inject(REDIS_CLIENT_TOKEN) private readonly redis: Redis,
    private readonly registrationsService: RegistrationsService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.body?.idempotencyKey;

    if (!idempotencyKey) {
      return next.handle();
    }

    const redisKey = `idempotency:${idempotencyKey}`;

    // BƯỚC 1: Kiểm tra Redis
    const existingState = await this.redis.get(redisKey);

    // BƯỚC 2A: Đã có trong Redis
    if (existingState === 'processing') {
      console.log(
        `Idempotency key ${idempotencyKey} is currently being processed.`,
      );
      throw new ConflictException(
        'Payment is currently being processed, please wait.',
      );
    } else if (existingState) {
      const parsedState = JSON.parse(existingState);
      return of(parsedState);
    }

    await this.registrationsService.validateForPayment(
      request.body.registrationId,
    );

    // BƯỚC 3: Chưa có -> Đánh dấu đang xử lý sau khi đã xác thực hợp lệ
    // Dùng nx (Not eXists) để khóa chống race condition nếu client bắn 2 request cùng lúc
    const lockAcquired = await this.redis.set(
      redisKey,
      'processing',
      'EX',
      30,
      'NX',
    );

    if (!lockAcquired) {
      throw new ConflictException(
        'Payment is currently being processed, please wait.',
      );
    }

    // BƯỚC 4: Cho phép request chạy vào Controller (Đẩy vào Queue)
    return next.handle().pipe(
      tap(async (response) => {
        // Lưu ý: Ở kiến trúc Worker, hàm này chỉ bắt được response lúc vừa đẩy vào Queue ('PROCESSING')
        // Kết quả THỰC SỰ (Success/Fail) phải được update đè lên RedisKey này ở bên trong file PaymentProcessor
        await this.redis.set(redisKey, JSON.stringify(response), 'EX', 86400);
      }),
    );
  }
}
