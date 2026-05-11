import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerAsyncOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Redis } from 'ioredis';

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
          ttl: 60000, // Thời gian sống: 1 phút
          limit: 30, // Tối đa 30 request / 1 phút
        },
      ],
    };
  },
};
