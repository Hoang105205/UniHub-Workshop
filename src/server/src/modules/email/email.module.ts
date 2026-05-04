import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { mailerConfig } from '../../config/mailer.config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { join } from 'path';
import { EmailEventListener } from './email-event.listener';
import { EmailProcessor } from './email.processor';
import { EMAIL_QUEUE } from './email.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: EMAIL_QUEUE }), 
    mailerConfig,
  ],
  providers: [EmailEventListener, EmailProcessor],
})
export class EmailModule {}
