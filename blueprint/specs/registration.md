# Đặc tả: Workshop Registration (Booking Flow & Seat Locking)

## Mô tả

Luồng đăng ký workshop với cơ chế **Pessimistic Locking** để đảm bảo **0% oversell** khi có 12,000 users đăng ký đồng thời. Hệ thống xử lý cả workshop miễn phí và có phí, tích hợp với payment gateway. 

**Mục tiêu:**

- Đảm bảo không có 2 sinh viên cùng nhận "chỗ cuối cùng"
- Xử lý 12,000 concurrent requests trong 10 phút
- Response time < 500ms (P95) cho registration request
- Rollback tự động khi payment failed

**Core mechanism:** PostgreSQL `FOR UPDATE` (row-level pessimistic lock)

---

## Luồng chính

### 1. Đăng ký Workshop Miễn phí

**Actor:** Student

**Precondition:**

- User đã login
- Thời gian đăng ký còn mở
- Workshop có chỗ trống

**Flow:**

```
1. Student POST /registrations
   Headers: { Authorization: Bearer <token> }
   Body: {
     "workshopId": "uuid"
   }

2. Backend validation:
   a. Extract user từ JWT
   b. Validate DTO: workshopId is valid UUID

3. BEGIN TRANSACTION (Isolation: SERIALIZABLE)

4. LOCK workshop row (CRITICAL):
   workshop = SELECT * FROM workshops
              WHERE id = $1
              FOR UPDATE;  // Pessimistic lock!

   // Các transaction khác đọc cùng row này phải đợi
   // lock được release (COMMIT hoặc ROLLBACK)

5. Business validation:
   a. Check workshop exists:
      IF !workshop THEN
        ROLLBACK;
        → 404 Not Found "Workshop not found"

   b. Check workshop timeline:
      IF workshop.start_time <= NOW() OR workshop.end_time <= NOW() THEN
        ROLLBACK;
        → 400 Bad Request "Workshop not open for registration"

   c. Check capacity:
      IF workshop.registered_count >= workshop.capacity THEN
        ROLLBACK;
        → 409 Conflict "Workshop is full"

   d. Check duplicate registration:
      existing = SELECT * FROM registrations
                 WHERE workshop_id = $1 AND user_id = $2

      IF existing THEN
        ROLLBACK;
        → 409 Conflict "Already registered for this workshop"

6. Create registration:
   qrCode = generateQRCode();  // "WS-{timestamp}-{random}"

   INSERT INTO registrations (
     workshop_id,
     user_id,
     status,
     qr_code,
     registered_at
   ) VALUES (
     $workshopId,
     $userId,
     'confirmed',  // Miễn phí → confirmed ngay
     $qrCode,
     NOW()
   )
   RETURNING *;

7. Increment registered_count (ATOMIC):
   UPDATE workshops
   SET registered_count = registered_count + 1,
       updated_at = NOW()
   WHERE id = $workshopId;

8. COMMIT TRANSACTION
   // Lock được release tại đây

9. Queue notification job (async, outside transaction):
   await notificationQueue.add('registration-confirmed', {
     userId: $userId,
     workshopId: $workshopId,
     qrCode: $qrCode
   }, {
     priority: 10  // High priority
   });

10. Invalidate cache:
    await redis.del(`workshop:${workshopId}:seats`);

11. Response 201 Created:
    {
      "id": "uuid",
      "workshopId": "uuid",
      "userId": "uuid",
      "status": "confirmed",
      "qrCode": "WS-1234567890-a1b2c3d4",
      "registeredAt": "2024-06-01T10:30:00Z",
      "workshop": {
        "title": "React Best Practices",
        "startTime": "2024-06-05T09:00:00Z"
      }
    }
```

**Postcondition:**

- Registration created với status = 'confirmed'
- Workshop.registered_count tăng 1
- Email + in-app notification được queue
- QR code unique và valid

---

### 2. Đăng ký Workshop Có phí

**Actor:** Student

**Precondition:**

- User đã login
- Workshop có price > 0
- Workshop có chỗ trống
- Payment gateway hoạt động (hoặc Circuit breaker CLOSED)

**Flow:**

```
1. Student POST /registrations
   Body: {
     "workshopId": "uuid",
     "paymentMethod": "mock_gateway",
     "idempotencyKey": "client-generated-uuid"  // REQUIRED!
   }

2. Validation (same as free workshop)

3. BEGIN TRANSACTION (SERIALIZABLE)

4. LOCK workshop row:
   workshop = SELECT * FROM workshops WHERE id = $1 FOR UPDATE;

5. Business validation (same as free workshop)

6. Create registration với status = 'pending':
   registration = INSERT INTO registrations (
     workshop_id,
     user_id,
     status,  // 'pending' - chờ người dùng quyết định Pay hoặc Cancel
     qr_code,
     registered_at
   ) VALUES (...) RETURNING *;

7. Create payment record:
   payment = INSERT INTO payments (
     registration_id,
     amount,
     idempotency_key,  // CRITICAL: chống double charge
     status,           // 'pending'
     payment_gateway
   ) VALUES (...) RETURNING *;

8. Increment registered_count:
   UPDATE workshops
   SET registered_count = registered_count + 1
   WHERE id = $workshopId;

9. COMMIT TRANSACTION
   // Lock released, seat đã được reserve

10. Response 201 Created:
    {
    "id": "uuid",
    "status": "pending",
    "message": "Registration created. Please proceed to pay or cancel.",
    "paymentId": "uuid",
    "expiresAt": "2024-06-01T08:15:00Z" // Có thể set timeout 10p để giữ chỗ
    }
```

**Postcondition:**

- Seat được reserve
- Registration ở trạng thái 'pending'
- Chờ người dùng bấm "Pay" hoặc "Cancel" trên giao diện

---

### 2.1. Thanh toán Workshop (Click nút "Pay")

**Actor:** Student

**Precondition:**

- Registration đang ở trạng thái 'pending'
- Payment gateway hoạt động (hoặc Circuit breaker CLOSED)

**Flow:**

```
1. Student POST /registrations/:id/pay
Body: {
"paymentMethod": "mock_gateway",
"idempotencyKey": "client-generated-uuid"  // REQUIRED! CRITICAL: chống double charge
}

2. Validate:
registration = SELECT * FROM registrations WHERE id = ?
IF registration.status != 'pending' THEN
→ 400 Bad Request "Registration is not in pending state"

3. Fetch payment record:
payment = SELECT * FROM payments WHERE registration_id = ?

4. Process payment (OUTSIDE transaction, qua Circuit Breaker):
try {
    paymentResult = await circuitBreaker.call(
        () => paymentGateway.charge({
            amount: payment.amount,
            currency: 'VND',
            idempotencyKey: body.idempotencyKey,
            metadata: {
                registrationId: registration.id,
                workshopId: registration.workshop_id
            }
        }),
        'payment_gateway'
    );

// Payment success
a. Update payment:
UPDATE payments
SET status = 'success',
transaction_id = $paymentResult.id,
updated_at = NOW()
WHERE id = $payment.id;

b. Update registration:
UPDATE registrations
SET status = 'confirmed',
payment_id = $payment.id
WHERE id = $registration.id;

c. Queue notification:
await notificationQueue.add('registration-confirmed', {...});

} catch (error) {
if (error instanceof ServiceUnavailableException) {
    // Circuit breaker OPEN → Graceful degradation

    a. Registration giữ status = 'pending'
    b. Queue retry job:
        await paymentQueue.add('retry-payment', {
        paymentId: payment.id
        }, {
        delay: 60000,  // 1 phút
        attempts: 5,
        backoff: { type: 'exponential', delay: 60000 }
        });

    c. Return response với status = 'pending':
        {
        "id": "uuid",
        "status": "pending",
        "message": "Payment system is busy. We will process it shortly.",
        "qrCode": null  // Chưa có QR
        }

    d. Send email:
        "Hệ thống thanh toán đang bận. Giao dịch đang xử lý.
        Bạn sẽ nhận QR code khi thanh toán hoàn tất."
    }
} else {
// Payment failed (card declined, insufficient funds, etc.)
    a. BEGIN TRANSACTION;
    b. Update payment: SET status = 'failed', error_message = ?
    c. Update registration:
        UPDATE registrations SET status = 'cancelled' WHERE id = ?;
    d. Decrement count:
        UPDATE workshops
        SET registered_count = registered_count - 1
        WHERE id = ?;
    e. COMMIT;

    f. Response 402 Payment Required:
        {
        "statusCode": 402,
        "message": "Payment failed: " + error.message,
        "error": "Payment Required"
        }
}

5. Response 200 OK (nếu payment success):
{
    "id": "uuid",
    "status": "confirmed",
    "qrCode": "WS-1234567890-a1b2c3d4",
    "payment": {
        "id": "uuid",
        "amount": 50000,
        "status": "success",
        "transactionId": "ch_abc123"
    }
}
```

**Postcondition (success):**

- Registration confirmed
- Payment success
- Seat giữ nguyên trạng thái reserve
- QR code valid

**Postcondition (failed):**

- Seat được release
- Registration bị hủy

---

### 3. Hủy đăng ký (Cancel)

**Actor:** Student (hủy của mình) với trạng thái 'pending" only

**Flow:**

```

1. DELETE /registrations/:id

2. Check ownership:
   registration = SELECT \* FROM registrations WHERE id = ?

   IF currentUser.role == 'student' AND registration.user_id != currentUser.id THEN
   → 403 Forbidden

3. Check cancellation policy:
   workshopStartTime = registration.workshop.start_time
   hoursUntilStart = (workshopStartTime - NOW()) / 3600

   IF hoursUntilStart < 24 THEN
   → 400 Bad Request "Cannot cancel within 24 hours of workshop"

   IF registration.status != 'pending' THEN
    → 400 Bad Request "Only pending registrations can be cancelled"

4. BEGIN TRANSACTION

5. Update registration:
   UPDATE registrations SET status = 'cancelled' WHERE id = ?;

6. Update payment (if exists):
   UPDATE payments SET status = 'failed' WHERE registration_id = ?;

7. Decrement count:
   UPDATE workshops
   SET registered_count = registered_count - 1
   WHERE id = ?;

8. COMMIT

9. Queue notification:
   await notificationQueue.add('registration-cancelled', {
   userId: registration.user_id,
   workshopId: registration.workshop_id
   });

10. Response 204 No Content

```

---

## Tại sao Pessimistic Locking?

### So sánh với Optimistic Locking

| Approach             | Pessimistic (FOR UPDATE)                    | Optimistic (Version Check)             |
| -------------------- | ------------------------------------------- | -------------------------------------- |
| **Cơ chế**           | Lock row trước, xử lý tuần tự               | Đọc → Xử lý → Check version khi save   |
| **Conflict rate**    | 0% (serialized)                             | Cao khi concurrent requests nhiều      |
| **Retry needed**     | Không                                       | Có (client phải retry khi conflict)    |
| **Throughput**       | Thấp hơn (do lock)                          | Cao hơn (no lock)                      |
| **User experience**  | Deterministic (đợi lâu hơn nhưng chắc chắn) | Unpredictable (có thể retry nhiều lần) |
| **Data consistency** | 100%                                        | Phụ thuộc retry logic                  |

### Kịch bản 100 users đăng ký cùng lúc workshop 60 chỗ

**Với Pessimistic Locking:**

```

Request 1: LOCK → Check (count=0) → Insert → UPDATE count=1 → COMMIT (50ms)
Request 2: WAIT → Check (count=1) → Insert → UPDATE count=2 → COMMIT (50ms)
Request 3: WAIT → Check (count=2) → Insert → UPDATE count=3 → COMMIT (50ms)
...
Request 60: WAIT → Check (count=59) → Insert → UPDATE count=60 → COMMIT (50ms)
Request 61: WAIT → Check (count=60 >= 60) → ROLLBACK "Full" (10ms)
...
Request 100: WAIT → ROLLBACK "Full" (10ms)

Result: 60 success, 40 fail (đúng)
Average response time: ~1.5s (chấp nhận được)

```

**Với Optimistic Locking:**

```

Request 1: Read (count=0, version=1) → Insert → UPDATE count=1, version=2 → OK
Request 2: Read (count=0, version=1) → Insert → UPDATE failed (version changed) → RETRY
Request 3: Read (count=0, version=1) → Insert → UPDATE failed → RETRY
...
Request 60: Read + RETRY nhiều lần → Eventually OK
Request 61: Read (count=60) → Should fail BUT: - Có thể đọc count=59 (race condition) - Insert → Oversell!

Result: 65 success, 35 fail (OVERSOLD 5 chỗ!)
User experience: Nhiều người retry 5-10 lần, frustrated

```

### Kết luận: Pessimistic Locking phù hợp cho bài toán này

**Lý do:**

1. **Correctness > Performance** - Oversell là lỗi nghiêm trọng, chấp nhận throughput thấp
2. **Đọc ít, ghi nhiều** - Spike đăng ký 3 phút đầu, không phải load đọc liên tục
3. **Connection pool đủ lớn** - Có thể handle 100 concurrent locks (pool size = 50-100)

---

## Kịch bản lỗi

### 1. Workshop đã full

**Trigger:** registered_count >= capacity

**Response:**

```json
{
  "statusCode": 409,
  "message": "Workshop 'React Best Practices' is full (60/60 seats)",
  "error": "Conflict"
}
```

**Action:** User chọn workshop khác hoặc join waitlist (future feature)

---

### 2. Đã đăng ký workshop này rồi

**Trigger:** Duplicate (workshop_id, user_id)

**Response:**

```json
{
  "statusCode": 409,
  "message": "You have already registered for this workshop",
  "error": "Conflict",
  "existingRegistration": {
    "id": "uuid",
    "status": "confirmed",
    "qrCode": "WS-..."
  }
}
```

**Action:** Hiển thị QR code hiện tại

---

### 3. Payment gateway timeout

**Trigger:** Payment request > 10s

**Response:**

```json
{
  "statusCode": 201,
  "message": "Registration saved. Payment processing...",
  "registration": {
    "id": "uuid",
    "status": "pending",
    "qrCode": null
  }
}
```

**Background:**

- Retry payment job chạy sau 1 phút
- Email: "Đăng ký thành công, thanh toán đang xử lý"
- Nếu sau 5 retries vẫn fail → Email "Vui lòng thanh toán thủ công"

---

### 4. Circuit breaker OPEN

**Trigger:** Payment gateway down (5 lỗi liên tiếp)

**Response:** (same as timeout)

**Backend:**

- Tất cả payment requests fail fast (không gọi gateway)
- Registration vẫn được tạo với status = 'pending'
- Retry jobs sẽ chạy khi circuit HALF_OPEN

---

### 5. Card declined

**Trigger:** Insufficient funds, expired card, etc.

**Response:**

```json
{
  "statusCode": 402,
  "message": "Payment failed: Card declined",
  "error": "Payment Required"
}
```

**Backend:**

- Registration bị xóa
- Seat được release
- User có thể retry với card khác

---

### 6. Lock timeout

**Trigger:** Transaction hold lock > 5 seconds

**PostgreSQL config:**

```sql
SET lock_timeout = '5s';
```

**Response:**

```json
{
  "statusCode": 500,
  "message": "Registration timeout. Please try again.",
  "error": "Internal Server Error"
}
```

**Action:** Client auto retry sau 2 giây

---

### 7. Idempotent retry (client retry với same idempotency key)

**Trigger:** Client timeout → Retry với cùng idempotency key

**Flow:**

```
1. Check cache:
   cached = await redis.get(`idempotency:${key}`);
   IF cached THEN
     return JSON.parse(cached);  // Same response

2. Check DB:
   payment = SELECT * FROM payments WHERE idempotency_key = ?
   IF payment THEN
     registration = SELECT * FROM registrations WHERE id = payment.registration_id
     return registration;  // Same response

3. Proceed with new registration (key chưa dùng)
```

**Result:** Client nhận cùng response, không bị charge 2 lần

---

## Ràng buộc

### Business Rules

| Ràng buộc                               | Giá trị                                             |
| --------------------------------------- | --------------------------------------------------- |
| Max registrations per user per workshop | 1                                                   |
| Cancellation deadline                   | 24 hours before workshop                            |
| QR code format                          | `WS-{timestamp}-{8-char-hex}`                       |
| QR code uniqueness                      | Global unique                                       |
| Payment retry attempts                  | 5                                                   |
| Payment retry delay                     | Exponential backoff (1min, 2min, 4min, 8min, 16min) |

### Performance

| Ràng buộc                         | Giá trị                     |
| --------------------------------- | --------------------------- |
| Registration response time (free) | < 500ms (P95)               |
| Registration response time (paid) | < 2s (P95, include payment) |
| Concurrent registrations          | 12,000 in 10 minutes        |
| Lock hold time                    | < 100ms average             |
| Transaction timeout               | 5s                          |
| Database connection pool          | 50-100 connections          |

### Data Integrity

- **Capacity constraint:** `registered_count <= capacity` (DB check constraint)
- **Unique registration:** Unique index on `(workshop_id, user_id)`
- **Unique QR code:** Unique index on `qr_code`
- **Payment idempotency:** Unique index on `idempotency_key`
- **Transaction isolation:** SERIALIZABLE

---

## Tiêu chí chấp nhận

### Functional Tests

- [ ] **TC-REG-001:** Student đăng ký workshop miễn phí → Success (201)
- [ ] **TC-REG-002:** Student đăng ký workshop có phí → Payment → Success (201)
- [ ] **TC-REG-003:** Đăng ký workshop đã full → Conflict (409)
- [ ] **TC-REG-004:** Đăng ký lại workshop đã đăng ký → Conflict (409)
- [ ] **TC-REG-005:** Hủy đăng ký trước 24h & trạng thái 'pending' → Success (204)
- [ ] **TC-REG-006:** Hủy đăng ký trong 24h → Error (400)
- [ ] **TC-REG-007:** Payment failed → Registration rollback, seat released
- [ ] **TC-REG-008:** Payment timeout → Registration pending, retry queued
- [ ] **TC-REG-009:** Circuit breaker OPEN → Registration pending
- [ ] **TC-REG-010:** Retry payment với same idempotency key → Same result, no double charge

### Concurrency Tests (CRITICAL)

- [ ] **TC-CONC-001:** 100 concurrent đăng ký workshop 60 chỗ → Đúng 60 success, 40 fail
- [ ] **TC-CONC-002:** Không có oversell trong mọi trường hợp
- [ ] **TC-CONC-003:** registered_count luôn chính xác sau concurrent requests
- [ ] **TC-CONC-004:** QR code không bao giờ trùng lặp

### Performance Tests

- [ ] **TC-PERF-001:** 12,000 registrations trong 10 phút → 100% success
- [ ] **TC-PERF-002:** P95 response time < 500ms (free workshop)
- [ ] **TC-PERF-003:** P95 response time < 2s (paid workshop)
- [ ] **TC-PERF-004:** Lock hold time < 100ms average

---

## Implementation Notes

### QR Code Generation

```typescript
function generateQRCode(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString("hex");
  return `WS-${timestamp}-${random}`;
}

// Example: WS-1717234567890-a1b2c3d4
```

### Transaction Isolation Level

```typescript
await this.dataSource.transaction(
  "SERIALIZABLE", // Highest isolation
  async (manager) => {
    // All queries here are isolated
  },
);
```

### Lock Timeout Config

```sql
-- PostgreSQL config
ALTER DATABASE unihub SET lock_timeout = '5s';
ALTER DATABASE unihub SET idle_in_transaction_session_timeout = '10s';
```

### Connection Pool Sizing

```typescript
// typeorm config
{
  type: 'postgres',
  poolSize: 100,  // Max connections
  extra: {
    max: 100,
    min: 20,
    idleTimeoutMillis: 30000
  }
}
```

---

## Dependencies

- TypeORM transaction support
- PostgreSQL 12+ (FOR UPDATE support)
- Redis (idempotency cache)
- Bull Queue (retry jobs)
- Payment gateway SDK (Stripe/PayPal)
