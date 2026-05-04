import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { join } from 'path';
import { DynamicModule } from '@nestjs/common/interfaces/modules/dynamic-module.interface';

export const mailerConfig: DynamicModule = MailerModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => ({
    transport: {
      host: configService.get<string>('SMTP_HOST') || 'smtp.example.com',
      port: Number(configService.get<string>('SMTP_PORT') || 587),
      secure: false,
      auth: {
        user: configService.get<string>('SMTP_USER') || 'user@example.com',
        pass: configService.get<string>('SMTP_PASS') || 'password',
      },
    },
    defaults: {
      from:
        configService.get<string>('SMTP_FROM') ||
        'Unihub Workshop <no-reply@example.com>',
    },
    template: {
      dir: join(process.cwd(), 'src', 'templates', 'email'),
      adapter: new HandlebarsAdapter(),
      options: {
        strict: true,
      },
    },
  }),
});
