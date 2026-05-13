// notification/notification.module.ts
import { Module } from '@nestjs/common';
import { EmailModule } from './channels/email/email.module';
import { NotificationEventListener } from './notification-event.listener';

@Module({
  imports: [EmailModule], // Import EmailModule để dùng được EmailChannelService
  providers: [NotificationEventListener],
})
export class NotificationModule {}
