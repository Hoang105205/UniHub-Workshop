# Đặc tả: Notification System (Multi-channel & Strategy Pattern)

## Mô tả

Hệ thống thông báo đa kênh với kiến trúc Strategy Pattern, cho phép gửi notification qua nhiều kênh (Email, In-app) và dễ dàng mở rộng thêm kênh mới (Telegram, SMS) trong tương lai mà không cần refactor core logic.

**Mục tiêu:**
- Gửi notification async qua Bull Queue (không block API response)
- Support 2 kênh hiện tại: Email + In-app notification
- Extensible: Dễ thêm Telegram, SMS, Push notification
- Retry mechanism khi gửi failed
- Theo dõi delivery status

**Kiến trúc:**
```
API Request → Queue Job → Worker → Strategy Pattern
                                    ├── Email Strategy
                                    ├── In-app Strategy
                                    └── [Future] Telegram Strategy
```

---

## Luồng chính

### 1. Trigger Notification (Queue Job)

**Trigger points:** Các sự kiện quan trọng trong hệ thống

**Events & Channels:**

| Event | Email | In-app | Priority |
|-------|-------|--------|----------|
| **registration-confirmed** | ✅ | ✅ | High (10) |
| **payment-success** | ✅ | ✅ | High (10) |
| **payment-pending** | ✅ | ✅ | Medium (5) |
| **workshop-cancelled** | ✅ | ✅ | High (10) |
| **workshop-updated** | ❌ | ✅ | Low (1) |
| **check-in-success** | ❌ | ✅ | Low (1) |
| **payment-manual-required** | ✅ | ✅ | High (10) |
| **ai-summary-completed** | ❌ | ✅ | Low (1) |

**Flow:**

```
1. Business logic trigger notification:
   // Example: Sau khi registration success
   
   // Tại Business Logic (Service)
async triggerNotification(registration: Registration) {
  const channels = ['email', 'in-app'];
  
  // Thay vì 1 Job chứa 2 channels, ta tạo 2 Jobs riêng biệt
  const jobs = channels.map(channel => ({
    name: `notify-${channel}`, // Tên Job phân biệt theo channel
    data: {
      channel, // Chỉ định rõ channel này
      userId: registration.userId,
      workshopId: registration.workshopId,
      // Bổ sung Idempotency Key để chống trùng mức tuyệt đối
      idempotencyKey: `reg_${registration.id}_${channel}` 
    },
    opts: {
      jobId: `reg_${registration.id}_${channel}`, // Bull sẽ tự reject nếu trùng ID này
      priority: 10,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    }
  }));

  await notificationQueue.addBulk(jobs);
}

2. Job queued → Return immediately
   API response không đợi notification

3. Worker process job (async)
   → Xử lý ở phần Worker
```

---

### 2. Notification Worker (Strategy Pattern)

**Flow:**

```
1. Worker nhận job từ queue:
   @Processor('notification')
   export class NotificationProcessor {
     @Process('registration-confirmed')
     async handleRegistrationConfirmed(job: Job) {
       const { userId, workshopId, registrationId, qrCode, channels } = job.data;
       
       // Fetch full data
       const user = await this.userRepo.findOne({ where: { id: userId } });
       const workshop = await this.workshopRepo.findOne({ where: { id: workshopId } });
       
       // Prepare notification content
       const notification = {
         type: 'registration-confirmed',
         userId: user.id,
         subject: `Đăng ký thành công: ${workshop.title}`,
         content: {
           studentName: user.fullName,
           workshopTitle: workshop.title,
           workshopTime: workshop.startTime,
           workshopRoom: workshop.room,
           qrCode: qrCode,
           price: workshop.price
         }
       };
       
       // Send via multiple channels
       await this.notificationService.send(user, notification, channels);
     }
   }

2. NotificationService.send():
   
   async send(
     user: User, 
     notification: Notification, 
     channels: string[]
   ): Promise<void> {
     const promises = channels.map(channel => {
       const strategy = this.strategies.get(channel);
       
       if (!strategy) {
         console.warn(`Unknown channel: ${channel}`);
         return Promise.resolve();
       }
       
       return strategy.send(user, notification)
         .catch(error => {
           console.error(`Failed to send via ${channel}:`, error);
           // Log nhưng không throw (cho phép channel khác vẫn gửi)
         });
     });
     
     await Promise.all(promises);
   }

3. Strategy execute:
   → Email Strategy: Send qua SMTP
   → In-app Strategy: Save to database
```

---

### 3. Email Strategy

**Implementation:**

```typescript
// strategies/email-notification.strategy.ts
@Injectable()
export class EmailNotificationStrategy implements NotificationStrategy {
  constructor(
    private mailService: MailService,
    private templateEngine: TemplateEngine
  ) {}
  
  async send(user: User, notification: Notification): Promise<void> {
    // Select template based on notification type
    const template = this.getTemplate(notification.type);
    
    // Render HTML email
    const html = await this.templateEngine.render(template, {
      studentName: notification.content.studentName,
      ...notification.content
    });
    
    // Send email
    await this.mailService.send({
      to: user.email,
      subject: notification.subject,
      html: html,
      attachments: notification.type === 'registration-confirmed' 
        ? [this.generateQRCodeAttachment(notification.content.qrCode)]
        : []
    });
    
    // Log success
    console.log(`Email sent to ${user.email}: ${notification.type}`);
  }
  
  private getTemplate(type: string): string {
    const templates = {
      'registration-confirmed': 'emails/registration-confirmed.hbs',
      'payment-success': 'emails/payment-success.hbs',
      'workshop-cancelled': 'emails/workshop-cancelled.hbs',
      'payment-pending': 'emails/payment-pending.hbs',
      'payment-manual-required': 'emails/payment-manual-required.hbs'
    };
    
    return templates[type] || 'emails/default.hbs';
  }
  
  private generateQRCodeAttachment(qrCode: string) {
    // Generate QR code image
    const qrCodeBuffer = QRCode.toBuffer(qrCode);
    
    return {
      filename: 'qr-code.png',
      content: qrCodeBuffer,
      cid: 'qrcode'  // Content ID for embedding in email
    };
  }
}
```

**Email Templates (Handlebars):**

```html
<!-- emails/registration-confirmed.hbs -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .qr-code { text-align: center; margin: 20px 0; }
    .button { 
      display: inline-block; 
      padding: 12px 24px; 
      background: #4F46E5; 
      color: white; 
      text-decoration: none; 
      border-radius: 6px; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Đăng ký thành công!</h1>
    </div>
    
    <div class="content">
      <p>Chào <strong>{{studentName}}</strong>,</p>
      
      <p>Bạn đã đăng ký thành công workshop:</p>
      
      <h2>{{workshopTitle}}</h2>
      
      <p><strong>Thời gian:</strong> {{formatDate workshopTime}}</p>
      <p><strong>Địa điểm:</strong> Phòng {{workshopRoom}}</p>
      {{#if price}}
      <p><strong>Phí tham gia:</strong> {{formatCurrency price}}</p>
      {{/if}}
      
      <div class="qr-code">
        <p><strong>Mã QR check-in:</strong></p>
        <img src="cid:qrcode" alt="QR Code" width="200" height="200">
        <p style="color: #6b7280; font-size: 14px;">
          Mã: {{qrCode}}
        </p>
      </div>
      
      <p style="color: #ef4444; font-weight: bold;">
        Vui lòng mang theo mã QR này khi tham dự workshop.
      </p>
      
      <p style="text-align: center; margin-top: 30px;">
        <a href="{{appUrl}}/my-registrations" class="button">
          Xem chi tiết đăng ký
        </a>
      </p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
      <p>UniHub Workshop System | Trường Đại học A</p>
      <p>Nếu có thắc mắc, vui lòng liên hệ: support@uni.edu</p>
    </div>
  </div>
</body>
</html>
```

```html
<!-- emails/workshop-cancelled.hbs -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    /* Same styles */
  </style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: #ef4444;">
      <h1> Workshop bị hủy</h1>
    </div>
    
    <div class="content">
      <p>Chào <strong>{{studentName}}</strong>,</p>
      
      <p>Rất tiếc phải thông báo rằng workshop sau đây đã bị hủy:</p>
      
      <h2>{{workshopTitle}}</h2>
      
      <p><strong>Thời gian dự kiến:</strong> {{formatDate workshopTime}}</p>
      
      <p><strong>Lý do:</strong> {{cancellationReason}}</p>
      
      {{#if refundAmount}}
      <div style="background: #dcfce7; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; color: #166534;">
          Số tiền <strong>{{formatCurrency refundAmount}}</strong> 
          sẽ được hoàn lại vào tài khoản của bạn trong 5-7 ngày làm việc.
        </p>
      </div>
      {{/if}}
      
      <p>Bạn có thể đăng ký workshop khác tại:</p>
      
      <p style="text-align: center; margin-top: 30px;">
        <a href="{{appUrl}}/workshops" class="button">
          Xem các workshop khác
        </a>
      </p>
    </div>
  </div>
</body>
</html>
```

---

### 4. In-app Strategy

**Implementation:**

```typescript
// strategies/in-app-notification.strategy.ts
@Injectable()
export class InAppNotificationStrategy implements NotificationStrategy {
  constructor(
    @InjectRepository(Notification) 
    private notificationRepo: Repository<Notification>
  ) {}
  
  async send(user: User, notification: Notification): Promise<void> {
    // Save to database
    const record = this.notificationRepo.create({
      userId: user.id,
      type: notification.type,
      channel: 'app',
      subject: notification.subject,
      content: notification.content,
      sentAt: new Date()
    });
    
    await this.notificationRepo.save(record);
    
    // TODO: Nếu có WebSocket, emit event real-time
    // this.websocketGateway.emitToUser(user.id, 'new-notification', record);
    
    console.log(`In-app notification saved for user ${user.id}: ${notification.type}`);
  }
}
```

**Database Schema:**

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,  -- 'registration-confirmed', 'workshop-cancelled', etc.
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('app', 'email', 'telegram')),
  subject VARCHAR(255),
  content JSONB NOT NULL,  -- Flexible content structure
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_type ON notifications(type);
```

**Frontend API:**

```typescript
// GET /notifications/my
@Get('my')
@UseGuards(JwtAuthGuard)
async getMyNotifications(
  @CurrentUser() user: User,
  @Query() query: GetNotificationsDto
) {
  const notifications = await this.notificationRepo.find({
    where: { 
      userId: user.id,
      channel: 'app'
    },
    order: { createdAt: 'DESC' },
    take: query.limit || 20,
    skip: query.offset || 0
  });
  
  const unreadCount = await this.notificationRepo.count({
    where: { 
      userId: user.id,
      channel: 'app',
      readAt: IsNull()
    }
  });
  
  return {
    data: notifications,
    unreadCount
  };
}

// PATCH /notifications/:id/read
@Patch(':id/read')
@UseGuards(JwtAuthGuard)
async markAsRead(
  @Param('id') id: string,
  @CurrentUser() user: User
) {
  const notification = await this.notificationRepo.findOne({
    where: { id, userId: user.id }
  });
  
  if (!notification) {
    throw new NotFoundException();
  }
  
  notification.readAt = new Date();
  await this.notificationRepo.save(notification);
  
  return notification;
}
```

**Frontend Component:**

```typescript
// components/NotificationBell.tsx
export function NotificationBell() {
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications({ limit: 10 }),
    refetchInterval: 30000  // Poll every 30s
  });
  
  const unreadCount = data?.unreadCount || 0;
  
  return (
    <Popover>
      <PopoverTrigger>
        <button className="relative">
          <BellIcon />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      
      <PopoverContent>
        <div className="w-80">
          <h3 className="font-bold mb-2">Notifications</h3>
          {data?.data.map(notification => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

---

### 5. Future: Telegram Strategy (Extensible)

**Cách thêm channel mới KHÔNG cần refactor core:**

```typescript
// strategies/telegram-notification.strategy.ts
@Injectable()
export class TelegramNotificationStrategy implements NotificationStrategy {
  constructor(private telegramBot: TelegramBotService) {}
  
  async send(user: User, notification: Notification): Promise<void> {
    // Check user có Telegram ID không
    if (!user.telegramId) {
      console.log(`User ${user.id} has no Telegram ID, skipping`);
      return;
    }
    
    // Format message
    const message = this.formatMessage(notification);
    
    // Send via Telegram Bot API
    await this.telegramBot.sendMessage({
      chatId: user.telegramId,
      text: message,
      parseMode: 'Markdown'
    });
  }
  
  private formatMessage(notification: Notification): string {
    switch (notification.type) {
      case 'registration-confirmed':
        return `
*Đăng ký thành công*

Workshop: *${notification.content.workshopTitle}*
Thời gian: ${notification.content.workshopTime}
Phòng: ${notification.content.workshopRoom}

Mã QR: \`${notification.content.qrCode}\`

Vui lòng giữ mã QR để check-in tại sự kiện.
        `.trim();
      
      default:
        return notification.subject;
    }
  }
}
```

**Register strategy:**

```typescript
// notification.module.ts
@Module({
  providers: [
    NotificationService,
    EmailNotificationStrategy,
    InAppNotificationStrategy,
    TelegramNotificationStrategy,  // Thêm mới
    {
      provide: 'NOTIFICATION_STRATEGIES',
      useFactory: (
        emailStrategy: EmailNotificationStrategy,
        inAppStrategy: InAppNotificationStrategy,
        telegramStrategy: TelegramNotificationStrategy
      ) => {
        return new Map<string, NotificationStrategy>([
          ['email', emailStrategy],
          ['in-app', inAppStrategy],
          ['telegram', telegramStrategy]  // Thêm mới
        ]);
      },
      inject: [
        EmailNotificationStrategy, 
        InAppNotificationStrategy,
        TelegramNotificationStrategy
      ]
    }
  ]
})
export class NotificationModule {}
```

**Usage:** Không cần thay đổi business logic!

```typescript
// Chỉ cần thêm 'telegram' vào channels array
await notificationQueue.add('registration-confirmed', {
  userId: '...',
  channels: ['email', 'in-app', 'telegram']  // Thêm Telegram
});
```

---

## Kịch bản lỗi

### 1. Email SMTP server down

**Trigger:** SMTP connection error

**Flow:**
```
1. EmailStrategy.send() → Throw error

2. NotificationService catch error:
   console.error('Email failed:', error);
   // Không throw, cho phép in-app vẫn gửi

3. Bull Queue retry (3 attempts với exponential backoff)
   - Attempt 1: Immediate
   - Attempt 2: After 5s
   - Attempt 3: After 10s

4. Nếu vẫn fail sau 3 attempts:
   - Log to error tracking (Sentry)
   - Email admin: "Notification delivery failed"
   - Notification vẫn được lưu in-app
```

---

### 2. User không có email

**Trigger:** User record có email = null

**Flow:**
```
1. EmailStrategy.send() check:
   if (!user.email) {
     console.warn(`User ${user.id} has no email`);
     return;  // Skip silently
   }

2. In-app strategy vẫn gửi bình thường
```

---

### 3. Notification content thiếu field

**Trigger:** Template expect field không có trong content

**Flow:**
```
1. Template engine render:
   {{workshopTitle}} → undefined

2. Handlebars helper handle:
   {{workshopTitle}} → "" (empty string)

3. Email vẫn gửi nhưng thiếu thông tin
   → Log warning cho admin review template
```

**Mitigation: Validate content trước khi queue**

```typescript
function validateNotificationContent(type: string, content: any) {
  const requiredFields = {
    'registration-confirmed': ['studentName', 'workshopTitle', 'workshopTime', 'qrCode'],
    'workshop-cancelled': ['studentName', 'workshopTitle', 'cancellationReason']
  };
  
  const required = requiredFields[type] || [];
  const missing = required.filter(field => !content[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}
```

---

### 4. Bull Queue Redis down

**Trigger:** Redis connection lost

**Flow:**
```
1. notificationQueue.add() → Throw error

2. Business logic catch:
   try {
     await notificationQueue.add(...);
   } catch (error) {
     // Fallback: Send immediately (blocking)
     await notificationService.send(user, notification, ['in-app']);
     
     // Log error
     console.error('Queue unavailable, sent immediately:', error);
   }

3. Graceful degradation:
   - In-app notification vẫn gửi (write DB trực tiếp)
   - Email skip (không block API)
```

---

### 5. Quá nhiều notification spam user

**Trigger:** 100 workshop updates trong 1 ngày

**Mitigation: Notification batching/digest**

```typescript
// Thay vì gửi 100 emails riêng lẻ
// → Gửi 1 email tổng hợp vào cuối ngày

@Cron('0 18 * * *')  // 6 PM daily
async sendDailyDigest() {
  const users = await this.userRepo.find();
  
  for (const user of users) {
    const todayNotifications = await this.notificationRepo.find({
      where: {
        userId: user.id,
        type: In(['workshop-updated', 'workshop-cancelled']),
        createdAt: MoreThan(startOfDay(new Date()))
      }
    });
    
    if (todayNotifications.length > 5) {
      // Send digest instead of individual emails
      await this.sendDigestEmail(user, todayNotifications);
      
      // Mark as sent
      await this.notificationRepo.update(
        { id: In(todayNotifications.map(n => n.id)) },
        { sentAt: new Date() }
      );
    }
  }
}
```

---

## Ràng buộc

### Business Rules

| Ràng buộc | Giá trị |
|-----------|---------|
| Notification retention | 90 days (auto cleanup) |
| Max unread notifications | 100 (older auto-marked read) |
| Email retry attempts | 3 |
| Retry backoff | Exponential (5s, 10s, 20s) |
| Batch email size | Max 50 recipients |
| Template cache | 1 hour |

### Performance

| Ràng buộc | Giá trị |
|-----------|---------|
| Queue job processing time | < 5s per job |
| Email send time | < 3s (P95) |
| In-app save time | < 100ms |
| Notification fetch time | < 200ms |
| Polling interval (frontend) | 30s |

### Data Integrity

- **User deletion:** CASCADE delete notifications
- **Channel enum:** Constrained to valid values
- **Content JSON:** Valid JSON structure
- **Sent timestamp:** Set only after successful delivery

---

## Tiêu chí chấp nhận

### Functional Tests

- [ ] **TC-NOT-001:** Registration success → Email + In-app notification sent
- [ ] **TC-NOT-002:** Workshop cancelled → Email với refund info sent
- [ ] **TC-NOT-003:** Payment pending → Email với hướng dẫn sent
- [ ] **TC-NOT-004:** Email failed → In-app vẫn gửi (fallback)
- [ ] **TC-NOT-005:** User có 10 unread → Badge hiển thị đúng
- [ ] **TC-NOT-006:** Mark as read → Unread count giảm
- [ ] **TC-NOT-007:** Notification older than 90 days → Auto cleanup

### Extensibility Tests

- [ ] **TC-EXT-001:** Thêm Telegram strategy → Không cần sửa NotificationService
- [ ] **TC-EXT-002:** Thêm notification type mới → Chỉ cần thêm template
- [ ] **TC-EXT-003:** Disable email channel → In-app vẫn hoạt động

### Performance Tests

- [ ] **TC-PERF-001:** Queue 1000 notifications → < 10s
- [ ] **TC-PERF-002:** Fetch 20 notifications → < 200ms
- [ ] **TC-PERF-003:** Email send → P95 < 3s

---

## Implementation Notes

### Strategy Pattern Interface

```typescript
// interfaces/notification-strategy.interface.ts
export interface NotificationStrategy {
  send(user: User, notification: Notification): Promise<void>;
}

export interface Notification {
  type: string;
  userId: string;
  subject: string;
  content: Record<string, any>;
}
```

### Notification Service

```typescript
// notification.service.ts
@Injectable()
export class NotificationService {
  private strategies: Map<string, NotificationStrategy>;
  
  constructor(
    @Inject('NOTIFICATION_STRATEGIES') 
    strategies: Map<string, NotificationStrategy>
  ) {
    this.strategies = strategies;
  }
  
  async send(
    user: User,
    notification: Notification,
    channels: string[]
  ): Promise<void> {
    const promises = channels.map(channel => {
      const strategy = this.strategies.get(channel);
      
      if (!strategy) {
        console.warn(`Unknown notification channel: ${channel}`);
        return Promise.resolve();
      }
      
      return strategy.send(user, notification).catch(error => {
        console.error(`Failed to send notification via ${channel}:`, error);
        // Không throw để các channel khác vẫn gửi được
      });
    });
    
    await Promise.all(promises);
  }
}
```

---

## Dependencies

- `@nestjs/bull` - Queue management
- `nodemailer` - Email sending
- `handlebars` - Email templates
- `qrcode` - QR code generation
- `node-telegram-bot-api` - Telegram (future)
