import { SharedBullAsyncConfiguration } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const bullConfig: SharedBullAsyncConfiguration = {
  imports: [ConfigModule], // Cần import ConfigModule để xài được ConfigService
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    // 1. Lấy chuỗi URL từ biến môi trường
    const redisUrlString = configService.get<string>('REDIS_URL');

    if (!redisUrlString) {
      throw new Error('Missing REDIS_URL in environment variables');
    }

    // 2. Dùng bộ phân tích URL có sẵn của Node.js
    const redisUrl = new URL(redisUrlString);

    // 3. Trả về cấu hình cho Bull
    return {
      redis: {
        host: redisUrl.hostname,
        port: Number(redisUrl.port) || 6379,
        username: redisUrl.username || 'default', // Upstash yêu cầu username là 'default'
        password: redisUrl.password,
        // Tự động bật TLS nếu URL bắt đầu bằng "rediss://" (có chữ s)
        // Ngược lại nếu chạy local ("redis://") thì tắt TLS
        tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
      },
    };
  },
};
