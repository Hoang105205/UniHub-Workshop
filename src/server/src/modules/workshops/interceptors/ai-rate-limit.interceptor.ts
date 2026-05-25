import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AiRateLimiterService } from '../../../common/services/ai-rate-limiter.service';

@Injectable()
export class AiRateLimitInterceptor implements NestInterceptor {
  constructor(private readonly aiRateLimiter: AiRateLimiterService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // 1. Kiểm tra: Có file tải lên không?
    // Nếu không có file -> Chắc chắn không gọi AI -> Cho đi tiếp ngay lập tức!
    if (!request.file) {
      return next.handle();
    }

    // 2. Nếu có file -> Chuẩn bị xài AI -> Rút 1 Token của User này
    const userId = request.user?.id;
    if (!userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    try {
      // Cố gắng trừ 1 Token trong Redis
      const rateLimiterRes = await this.aiRateLimiter.consumeToken(userId);
      
      // (Tùy chọn) Bơm Header trả về cho Client biết còn bao nhiêu lượt AI
      const response = context.switchToHttp().getResponse();
      response.header('X-AI-RateLimit-Limit', '5');
      response.header('X-AI-RateLimit-Remaining', String(rateLimiterRes.remainingPoints));
      
      // Xác nhận trừ Token thành công -> Cho phép vào Controller lưu Database
      return next.handle();

    } catch (rateLimiterRes) {
      // 3. Nếu xô cạn (bị Reject từ Service) -> Khóa cửa ngay lập tức!
      // Báo 429 và Không cho phép chạy vào Controller (File sẽ bị loại bỏ, không lưu xuống DB)
      throw new HttpException(
        'You have exceeded the AI usage limit. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}