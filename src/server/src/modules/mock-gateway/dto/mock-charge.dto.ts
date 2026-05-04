import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class MockChargeDto {
  @IsUUID('all')
  registrationId: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}
