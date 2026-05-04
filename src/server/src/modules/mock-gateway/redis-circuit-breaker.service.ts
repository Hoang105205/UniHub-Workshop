import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Redis } from '@upstash/redis';
import { randomUUID } from 'crypto';
import {
  MOCK_GATEWAY_CIRCUIT_COOLDOWN_MS,
  MOCK_GATEWAY_CIRCUIT_FAIL_COUNT_KEY,
  MOCK_GATEWAY_CIRCUIT_FAIL_THRESHOLD,
  MOCK_GATEWAY_CIRCUIT_OPENED_AT_KEY,
  MOCK_GATEWAY_CIRCUIT_PROBE_LOCK_KEY,
  MOCK_GATEWAY_CIRCUIT_STATE_KEY,
  MOCK_GATEWAY_REDIS_TOKEN,
  MockGatewayState,
} from './mock-gateway.constants';

type CircuitContext = {
  requestId: string;
  stateAtEntry: MockGatewayState;
  probeAllowed: boolean;
};

@Injectable()
export class RedisCircuitBreakerService {
  private readonly logger = new Logger(RedisCircuitBreakerService.name);

  constructor(
    @Inject(MOCK_GATEWAY_REDIS_TOKEN) private readonly redis: Redis,
  ) {}

  async execute<T>(action: () => Promise<T>): Promise<T> {
    const context = await this.beforeCall();

    try {
      const result = await action();
      await this.afterSuccess(context);

      return result;
    } catch (error) {
      await this.afterFailure(context, error);
      throw error;
    } finally {
      if (context.probeAllowed) {
        await this.redis.del(MOCK_GATEWAY_CIRCUIT_PROBE_LOCK_KEY);
      }
    }
  }

  private async beforeCall(): Promise<CircuitContext> {
    const state = await this.getState();

    if (state === 'CLOSED') {
      return {
        requestId: randomUUID(),
        stateAtEntry: 'CLOSED',
        probeAllowed: false,
      };
    }

    if (state === 'HALF_OPEN') {
      this.logger.warn(
        'Circuit breaker is HALF_OPEN, rejecting request immediately',
      );
      throw new ServiceUnavailableException(
        'Hệ thống đang thăm dò phục hồi, vui lòng đợi',
      );
    }

    const openedAt = await this.getOpenedAt();
    const elapsed = Date.now() - openedAt;

    if (elapsed < MOCK_GATEWAY_CIRCUIT_COOLDOWN_MS) {
      this.logger.warn(
        `Circuit breaker is OPEN. Cooldown not finished yet (${MOCK_GATEWAY_CIRCUIT_COOLDOWN_MS - elapsed}ms remaining)`,
      );
      throw new ServiceUnavailableException(
        'Cổng thanh toán tạm thời bị ngắt mạch, vui lòng thử lại sau',
      );
    }

    const requestId = randomUUID();
    const lockAcquired = await this.redis.set(
      MOCK_GATEWAY_CIRCUIT_PROBE_LOCK_KEY,
      requestId,
      { nx: true, px: MOCK_GATEWAY_CIRCUIT_COOLDOWN_MS },
    );

    if (!lockAcquired) {
      this.logger.warn(
        'Circuit breaker half-open probe already in progress, rejecting request',
      );
      throw new ServiceUnavailableException(
        'Hệ thống đang thăm dò phục hồi, vui lòng đợi',
      );
    }

    await this.redis.set(MOCK_GATEWAY_CIRCUIT_STATE_KEY, 'HALF_OPEN');
    this.logger.warn(
      'Circuit breaker moved from OPEN to HALF_OPEN for probe request',
    );

    return {
      requestId,
      stateAtEntry: 'HALF_OPEN',
      probeAllowed: true,
    };
  }

  private async afterSuccess(context: CircuitContext): Promise<void> {
    // TRƯỜNG HỢP 1: Nếu đang thăm dò (HALF_OPEN) mà thành công
    if (context.stateAtEntry === 'HALF_OPEN') {
      await this.redis.set(MOCK_GATEWAY_CIRCUIT_STATE_KEY, 'CLOSED');
      await this.redis.set(MOCK_GATEWAY_CIRCUIT_FAIL_COUNT_KEY, '0');
      await this.redis.del(MOCK_GATEWAY_CIRCUIT_OPENED_AT_KEY);
      this.logger.log(
        'Circuit breaker probe succeeded. State transitioned from HALF_OPEN to CLOSED',
      );
      return;
    }

    // TRƯỜNG HỢP 2: Nếu đang bình thường (CLOSED) mà thành công
    // Ta sẽ giảm count lỗi đi 1 đơn vị (nhưng không thấp hơn 0)
    const currentCount = await this.redis.get<number>(
      MOCK_GATEWAY_CIRCUIT_FAIL_COUNT_KEY,
    );

    if (currentCount && currentCount > 0) {
      // Dùng DECR của Redis để đảm bảo tính nguyên tử (Atomic)
      await this.redis.decr(MOCK_GATEWAY_CIRCUIT_FAIL_COUNT_KEY);
      this.logger.debug(
        `Success recorded. Fail count decremented to: ${currentCount - 1}`,
      );
    }
  }

  private async afterFailure(
    context: CircuitContext,
    error: unknown,
  ): Promise<void> {
    if (!this.isRetriableFailure(error)) {
      return;
    }

    const currentState = await this.getState();
    const nextFailCount = await this.redis.incr(
      MOCK_GATEWAY_CIRCUIT_FAIL_COUNT_KEY,
    );

    const shouldOpen =
      currentState === 'HALF_OPEN' ||
      nextFailCount >= MOCK_GATEWAY_CIRCUIT_FAIL_THRESHOLD;

    if (shouldOpen) {
      await this.redis.set(MOCK_GATEWAY_CIRCUIT_STATE_KEY, 'OPEN');
      await this.redis.set(
        MOCK_GATEWAY_CIRCUIT_OPENED_AT_KEY,
        String(Date.now()),
      );
      await this.redis.del(MOCK_GATEWAY_CIRCUIT_PROBE_LOCK_KEY);
      this.logger.error(
        `Circuit breaker opened after failure (state=${currentState}, failCount=${nextFailCount}).`,
        error instanceof Error ? error.stack : undefined,
      );
      return;
    }

    this.logger.warn(
      `Circuit breaker failure recorded, failCount=${nextFailCount}, state remains ${currentState}`,
    );
  }

  private async getState(): Promise<MockGatewayState> {
    const state = await this.redis.get<string>(MOCK_GATEWAY_CIRCUIT_STATE_KEY);
    return this.normalizeState(state);
  }

  private normalizeState(value: string | null): MockGatewayState {
    if (value === 'OPEN' || value === 'HALF_OPEN' || value === 'CLOSED') {
      return value;
    }

    return 'CLOSED';
  }

  private async getOpenedAt(): Promise<number> {
    const value = await this.redis.get<string>(
      MOCK_GATEWAY_CIRCUIT_OPENED_AT_KEY,
    );
    const timestamp = Number(value);

    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      return Date.now();
    }

    return timestamp;
  }

  private isRetriableFailure(error: unknown): boolean {
    if (error instanceof HttpException) {
      return error.getStatus() >= HttpStatus.INTERNAL_SERVER_ERROR;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('timeout')) {
        return true;
      }

      if (
        error.name.toLowerCase().includes('timeout') ||
        error.name === 'AbortError'
      ) {
        return true;
      }
    }

    return false;
  }
}
