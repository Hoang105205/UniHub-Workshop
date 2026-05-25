import { IsUUID } from 'class-validator';

export class MockCancelDto {
  @IsUUID('all')
  registrationId: string;
}
