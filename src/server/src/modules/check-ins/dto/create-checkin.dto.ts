import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';

export class CreateCheckInDto {
  @IsString()
  @IsNotEmpty()
  qr_code: string;

  @IsUUID('all')
  staff_id: string;

  @IsString()
  @IsNotEmpty()
  device_id: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  scanned_at: number;
}
