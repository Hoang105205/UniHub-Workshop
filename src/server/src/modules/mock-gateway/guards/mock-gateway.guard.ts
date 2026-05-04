import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MockGatewayConfigGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const headerValue = request.headers['config-api-key'];
    const expectedValue = this.configService.get<string>(
      'MOCK_GATEWAY_CONFIG_API_KEY',
    );

    if (!expectedValue) {
      throw new InternalServerErrorException(
        'MOCK_GATEWAY_CONFIG_API_KEY is not configured',
      );
    }

    if (!headerValue || String(headerValue) !== expectedValue) {
      throw new ForbiddenException('Invalid config-api-key');
    }

    return true;
  }
}
