import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckIn } from '../../entities/check-in.entity';
import { Registration } from '../../entities/registration.entity';
import { User } from '../../entities/user.entity';
import { CheckInsController } from './check-ins.controller';
import { CheckInsService } from './check-ins.service';

@Module({
  imports: [TypeOrmModule.forFeature([CheckIn, Registration, User])],
  controllers: [CheckInsController],
  providers: [CheckInsService],
})
export class CheckInsModule {}
