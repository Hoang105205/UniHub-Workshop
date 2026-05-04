import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class ConfigMockGatewayDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  failureRate: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  latency: number;
}
