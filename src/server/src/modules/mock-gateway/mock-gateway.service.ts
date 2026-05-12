import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import {
  MOCK_GATEWAY_CONFIG_KEY,
  MOCK_GATEWAY_DEFAULT_FAILURE_RATE,
  MOCK_GATEWAY_DEFAULT_LATENCY,
  MOCK_GATEWAY_REDIS_TOKEN,
  MockGatewayConfigRecord,
} from './mock-gateway.constants';
import { ConfigMockGatewayDto } from './dto/config-mock-gateway.dto';
import { MockChargeDto } from './dto/mock-charge.dto';

export type MockGatewayConfigView = {
  failureRate: number;
  latency: number;
  updatedAt: string | null;
};

export type MockGatewayChargeResponse = {
  transactionId: string;
  status: 'SUCCESS';
  registrationId: string;
};

@Injectable()
export class MockGatewayService {
  private readonly logger = new Logger(MockGatewayService.name);

  constructor(
    @Inject(MOCK_GATEWAY_REDIS_TOKEN) private readonly redis: Redis,
  ) {}

  async setConfig(dto: ConfigMockGatewayDto): Promise<MockGatewayConfigView> {
    const record: MockGatewayConfigRecord = {
      failureRate: dto.failureRate,
      latency: dto.latency,
      updatedAt: new Date().toISOString(),
    };

    await this.redis.set(MOCK_GATEWAY_CONFIG_KEY, JSON.stringify(record));
    this.logger.log(
      `Mock gateway config updated: failureRate=${record.failureRate} latency=${record.latency}ms`,
    );

    return record;
  }

  async getConfig(): Promise<MockGatewayConfigView> {
    const raw = await this.redis.get(MOCK_GATEWAY_CONFIG_KEY);
    const parsed = raw ? (JSON.parse(raw) as MockGatewayConfigRecord) : null;

    if (!parsed) {
      return {
        failureRate: MOCK_GATEWAY_DEFAULT_FAILURE_RATE,
        latency: MOCK_GATEWAY_DEFAULT_LATENCY,
        updatedAt: null,
      };
    }

    return {
      failureRate: Number.isFinite(parsed.failureRate)
        ? parsed.failureRate
        : MOCK_GATEWAY_DEFAULT_FAILURE_RATE,
      latency: Number.isFinite(parsed.latency)
        ? parsed.latency
        : MOCK_GATEWAY_DEFAULT_LATENCY,
      updatedAt: parsed.updatedAt ?? null,
    };
  }

  async charge(dto: MockChargeDto): Promise<MockGatewayChargeResponse> {
    const config = await this.getConfig();

    this.logger.log(
      `Mock charge request received for registration=${dto.registrationId}, latency=${config.latency}ms, failureRate=${config.failureRate}%`,
    );

    await this.sleep(config.latency);

    const shouldFail = Math.random() * 100 < config.failureRate;

    if (shouldFail) {
      this.logger.warn(
        `Mock charge failed for registration=${dto.registrationId} with simulated 503`,
      );
      throw new HttpException(
        'Mock Gateway simulated failure',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const response: MockGatewayChargeResponse = {
      transactionId: randomUUID(),
      status: 'SUCCESS',
      registrationId: dto.registrationId,
    };

    this.logger.log(
      `Mock charge success for registration=${dto.registrationId}`,
    );
    return response;
  }

  private async sleep(latency: number): Promise<void> {
    if (latency <= 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, latency);
    });
  }
}
