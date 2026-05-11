import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as crypto from 'crypto';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {

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

  protected generateKey(
    context: ExecutionContext, 
    trackerString: string, 
    throttlerName: string
  ): string {
    // Lấy tên Class (Controller) và tên Hàm (Method) đang được gọi
    // Ví dụ: Class 'MockGatewayController', Method 'charge'
    const controllerName = context.getClass().name;
    const methodName = context.getHandler().name;

    const uniqueEndpointName = `${controllerName}-${methodName}`;
    const rawKey = `${throttlerName}:${uniqueEndpointName}:${trackerString}`;

    return crypto.createHash('md5').update(rawKey).digest('hex');
  }
}
