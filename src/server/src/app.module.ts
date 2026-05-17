import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { CheckInsModule } from './modules/check-ins/check-ins.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { MockGatewayModule } from './modules/mock-gateway/mock-gateway.module';
import { WorkshopsModule } from './modules/workshops/workshops.module';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { bullConfig } from './config/bull.config';
import { EmailModule } from './modules/email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig),
    BullModule.forRootAsync(bullConfig),
    EventEmitterModule.forRoot({ global: true }),
    EmailModule,
    AuthModule,
    CheckInsModule,
    RegistrationsModule,
    MockGatewayModule,
    WorkshopsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
