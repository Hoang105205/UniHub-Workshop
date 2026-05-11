import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerAsyncOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Redis } from 'ioredis';
import { RATE_LIMIT } from './rate-limit.config';

export const getThrottlerConfig: ThrottlerAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    // 1. Lấy biến môi trường
    const redisUrlString = configService.get<string>('REDIS_URL');

    // 2. Validate cứng, nếu thiếu là báo lỗi không cho chạy app
    if (!redisUrlString) {
      throw new Error('Missing REDIS_URL in environment variables');
    }

    // 3. Trả về cấu hình ThrottlerModuleOptions
    return {
      // Truyền instance Redis của ioredis vào storage
      storage: new ThrottlerStorageRedisService(new Redis(redisUrlString)),
      throttlers: [
        {
          name: 'default',
          ...RATE_LIMIT.READ, // default sẽ là rate limit của các endpoint đọc (GET)
        },
      ],
    };
  },
};
