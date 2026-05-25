import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT_TOKEN } from './redis.constants';

@Global() // giúp Module này dùng được ở mọi nơi mà không cần imports lại
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT_TOKEN,
      useFactory: (configService: ConfigService): Redis => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (!redisUrl) {
          throw new Error('Missing REDIS_URL environment variable');
        }
        
        // (Singleton)
        return new Redis(redisUrl);
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT_TOKEN], // Xuất Token ra để các module khác xài
})
export class RedisModule {}