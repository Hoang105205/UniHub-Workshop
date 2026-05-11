import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  readonly logger = new Logger(UserThrottlerGuard.name);
  protected async getTracker(req: Record<string, any>,
  ): Promise<string> {
    // 1. Kiểm tra xem user đã đăng nhập chưa
    // (Thông thường req.user sẽ có sẵn nếu API này đã đi qua JwtAuthGuard của bạn)
    const user = req.user;

    if (user && user.id) {
      return `user-${user.id}`;
    }

    // 2. Fallback: Nếu là khách vãng lai không có token, đành dùng IP
    // BẮT BUỘC phải lấy 'x-forwarded-for' vì IP gốc đã bị Nginx che mất
    const ip = req.headers['x-forwarded-for'] || req.ip;
    // Cấp cho cái xô tên là "ip-113.160..."
    return `ip-${ip}`;
  }
}
