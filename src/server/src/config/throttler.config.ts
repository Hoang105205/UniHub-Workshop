import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerAsyncOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Redis } from 'ioredis';
import { RATE_LIMIT } from './rate-limit.config';
import { REDIS_CLIENT_TOKEN } from '../redis/redis.constants';

export const getThrottlerConfig: ThrottlerAsyncOptions = {
  imports: [ConfigModule],
  inject: [REDIS_CLIENT_TOKEN],
  useFactory: async (redisClient: Redis) => {
    return {
      storage: new ThrottlerStorageRedisService(redisClient),
      throttlers: [
        {
          name: 'default',
          ...RATE_LIMIT.READ,
        },
      ],
    };
  },
};
