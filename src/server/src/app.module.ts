import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { MockGatewayModule } from './modules/mock-gateway/mock-gateway.module';
import { WorkshopsModule } from './modules/workshops/workshops.module';
import { BullModule } from '@nestjs/bull';
import { bullConfig } from './config/bull.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig),
    BullModule.forRootAsync(bullConfig),
    AuthModule,
    RegistrationsModule,
    MockGatewayModule,
    WorkshopsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
