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
import { Redis } from '@upstash/redis';
import { MOCK_GATEWAY_REDIS_TOKEN } from '../mock-gateway.constants';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @Inject(MOCK_GATEWAY_REDIS_TOKEN) private readonly redis: Redis,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.body?.idempotencyKey;

    if (!idempotencyKey) {
      return next.handle();
    }

    const redisKey = `idempotency:${idempotencyKey}`;

    // BƯỚC 1: Kiểm tra Redis
    const existingState = await this.redis.get<any>(redisKey);

    // BƯỚC 2A: Đã có trong Redis
    if (existingState === 'processing') {
      console.log(`Idempotency key ${idempotencyKey} is currently being processed.`);
      throw new ConflictException('Payment is currently being processed, please wait.');
    } else if (existingState) {
      // ĐÃ SỬA Ở ĐÂY: Trả về thẳng object existingState, không dùng JSON.parse nữa
      return of(existingState);
    }

    // BƯỚC 3: Chưa có -> Đánh dấu đang xử lý
    // Dùng nx (Not eXists) để khóa chống race condition nếu client bắn 2 request cùng lúc
    const lockAcquired = await this.redis.set(redisKey, 'processing', {
      nx: true,
      ex: 30, // Khóa 30 giây
    });

    if (!lockAcquired) {
       throw new ConflictException('Payment is currently being processed, please wait.');
    }

    // BƯỚC 4: Cho phép request chạy vào Controller (Đẩy vào Queue)
    return next.handle().pipe(
      tap(async (response) => {
        // Lưu ý: Ở kiến trúc Worker, hàm này chỉ bắt được response lúc vừa đẩy vào Queue ('PROCESSING')
        // Kết quả THỰC SỰ (Success/Fail) phải được update đè lên RedisKey này ở bên trong file PaymentProcessor
        await this.redis.set(redisKey, response, { ex: 86400 });
      }),
    );
  }
}