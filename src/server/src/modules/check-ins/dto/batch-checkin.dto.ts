import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { CreateCheckInDto } from './create-checkin.dto';

export class BatchCheckInDto extends CreateCheckInDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  local_id: number;
}
