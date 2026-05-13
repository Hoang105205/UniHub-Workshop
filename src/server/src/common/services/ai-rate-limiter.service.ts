import { Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { AI_RATE_LIMIT } from '../../config/rate-limit.config';

@Injectable()
export class AiRateLimiterService implements OnModuleInit {
  private readonly redisClient: Redis;

  constructor() {
    // Tái sử dụng kết nối ioredis qua biến môi trường
    this.redisClient = new Redis(process.env.REDIS_URL as string);
  }

  // Hook này chạy 1 lần duy nhất khi Server NestJS vừa khởi động
  onModuleInit() {
    // Đăng ký "Vũ khí hạng nặng" Lua script thẳng vào ioredis
    // ioredis sẽ tự động dịch nó thành hàm this.redisClient.consumeTokenBucket()
    this.redisClient.defineCommand('consumeTokenBucket', {
      numberOfKeys: 1,
      lua: `
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refillRate = tonumber(ARGV[2]) -- Thời gian (giây) để hồi 1 token
        local now = tonumber(ARGV[3])

        -- Đọc trạng thái xô hiện tại
        local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
        local tokens = tonumber(bucket[1])
        local lastRefill = tonumber(bucket[2])

        if not tokens then
          -- Lần đầu tiên user xuất hiện, cho đầy xô
          tokens = capacity
          lastRefill = now
        else
          -- Đã có xô, tính toán số token được hồi phục theo thời gian trôi qua
          local elapsed = now - lastRefill
          local tokensToAdd = math.floor(elapsed / refillRate)
          
          if tokensToAdd > 0 then
            tokens = math.min(capacity, tokens + tokensToAdd)
            -- Cập nhật lại mốc thời gian hồi phục gần nhất
            lastRefill = lastRefill + (tokensToAdd * refillRate)
          end
        end

        -- Kiểm tra xem còn đủ token để xài không (Cần rút 1)
        if tokens >= 1 then
          tokens = tokens - 1
          redis.call('HSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
          -- Đặt TTL để dọn rác Redis nếu xô bị bỏ không quá lâu
          redis.call('EXPIRE', key, capacity * refillRate)
          return { 1, tokens }
        else
          -- Không đủ token, vẫn lưu trạng thái hồi phục nếu có
          redis.call('HSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
          redis.call('EXPIRE', key, capacity * refillRate)
          return { 0, tokens }
        end
      `,
    });
  }

  async consumeToken(userId: string) {
    const key = `ai-summary-tb:user-${userId}`;
    const capacity = AI_RATE_LIMIT.capacity; // Burst: Cho phép xài dồn tối đa 5 requests
    const refillRate = AI_RATE_LIMIT.refillRate; // Refill: 30 phút (1800 giây) mới nhỏ giọt thêm 1 token
    const now = Math.floor(Date.now() / 1000); // Unix timestamp (giây)

    // @ts-ignore - Bỏ qua cảnh báo type vì hàm này sinh ra động ở Runtime
    const result = await this.redisClient.consumeTokenBucket(key, capacity, refillRate, now);
    
    const isAllowed = result[0] === 1; // 1 là Thành công, 0 là Bị chặn
    const remaining = result[1];       // Số token còn lại trong xô

    if (!isAllowed) {
      // Reject để Interceptor bắt lấy và throw 429
      return Promise.reject({ remainingPoints: remaining });
    }
    
    // Resolve cho phép đi tiếp vào Controller
    return Promise.resolve({ remainingPoints: remaining });
  }
}
