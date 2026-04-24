# Đặc tả: Payment Processing (Circuit Breaker & Idempotency)

## 1. Mô tả

Hệ thống thanh toán workshop có phí sử dụng **mock payment gateway**, tập trung vào 2 cơ chế bảo vệ cốt lõi:

1. **Circuit Breaker:** Ngăn chặn gọi payment gateway khi hệ thống này bị sập (down), giúp fail-fast và không làm treo server.
2. **Idempotency Key:** Chống trừ tiền 2 lần (double charge) khi client gặp lỗi mạng và gửi lại yêu cầu (retry).

**Lưu ý:** Đây là mock payment cho đồ án, không tích hợp gateway thật. Sinh viên sẽ thấy trang xác nhận với 2 nút: `Cancel` và `Pay`.

**Mục tiêu:**

- Tự động hạ cấp duy trì dịch vụ (Graceful degradation) khi payment gateway gặp sự cố.
- Đảm bảo 0% double charge dù client có retry nhiều lần.
- Workshop listing vẫn hoạt động bình thường khi payment down (đảm bảo 99.9% uptime cho tính năng cốt lõi).

## 2. Luồng chính

### 2.1. Luồng thanh toán hoàn chỉnh (Happy Path)

**Context:** Sinh viên đã đăng ký workshop có phí, registration đang ở trạng thái `pending`.

**Flow:**

1. **Giao diện:** Sinh viên truy cập trang chi tiết vé (`/my-registrations/:id`), xem số tiền và bấm nút `[Pay Now]`.
2. **Khởi tạo định danh:** Frontend tự động tạo một Idempotency Key (UUID v4) và gửi kèm trong Header của request thanh toán.
3. **Kiểm tra Idempotency:** Backend nhận request, ưu tiên kiểm tra Key này trong Cache (Redis), sau đó kiểm tra trong Database để đảm bảo giao dịch này chưa từng được xử lý.
4. **Khởi tạo thanh toán:** Backend tạo bản ghi `payments` với trạng thái `pending`.
5. **Gọi Gateway:** Hệ thống gọi đến Mock Payment Gateway thông qua lớp bảo vệ Circuit Breaker.
6. **Cập nhật trạng thái:** Nếu Gateway trả về thành công, cập nhật trạng thái payment thành `success`, đồng thời chuyển trạng thái registration thành `confirmed`.
7. **Lưu vết & Thông báo:** Cache lại kết quả Idempotency Key trong 24h và đẩy Job gửi email/thông báo xác nhận cho sinh viên vào Queue.
8. **Phản hồi:** Trả về kết quả cho Frontend để hiển thị QR code.

### 2.2. Mock Payment Gateway (Demo Implementation)

**Mục đích:** Giả lập một cổng thanh toán có khả năng phát sinh lỗi (fail) hoặc quá hạn thời gian (timeout) để kiểm thử hoạt động của Circuit Breaker.

**Các kịch bản hỗ trợ:**

- Giả lập tỷ lệ lỗi ngẫu nhiên (Ví dụ: 50% request sẽ bị lỗi).
- Giả lập Timeout (Giữ request lơ lửng trong 15s để Circuit Breaker tự ngắt).
- Admin có thể điều khiển các thông số này qua các API ẩn.

**Demo Scenarios (Sử dụng cURL):**

```bash
# Normal mode (100% success)
curl -X POST /admin/payment-gateway/set-failure-rate -d '{"rate": 0}'

# Simulate 50% failure rate
curl -X POST /admin/payment-gateway/set-failure-rate -d '{"rate": 50}'

# Simulate timeout (trigger Circuit Breaker)
curl -X POST /admin/payment-gateway/set-timeout-mode -d '{"enabled": true}'
```

### 2.3. Cơ chế ngắt mạch (Circuit Breaker)

Mục đích: Ngăn hệ thống tiếp tục gọi đến Gateway nếu nó đã bị lỗi liên tục, tránh hiệu ứng domino làm sập toàn bộ Backend.

**Quản lý 3 trạng thái:**

- **CLOSED (Bình thường):** Mọi request đi qua bình thường. Nếu phát hiện 5 lỗi trong vòng 60 giây, chuyển sang OPEN.

- **OPEN (Ngắt mạch):** Chặn ngay lập tức mọi request gửi đến Gateway. Sau 30 giây thời gian chờ, chuyển sang HALF_OPEN.

- **HALF_OPEN (Thử nghiệm):** Cho phép duy nhất 1 request đi qua để "thăm dò". Nếu thành công -> Trở lại CLOSED. Nếu thất bại -> Quay lại OPEN.

### 2.4. Graceful Degradation (Hạ cấp dịch vụ)

Context: Khi Circuit Breaker đang ở trạng thái OPEN (Gateway sập).

**Các bước thực hiện:**

- Request thanh toán của sinh viên bị Circuit Breaker chặn lại ngay lập tức.

- Backend "bắt" được lỗi này, thay vì báo lỗi bắt user làm lại, hệ thống giữ nguyên bản ghi payment ở trạng thái pending.

- Hệ thống tạo một tác vụ nền (Retry Job) đẩy vào Bull Queue với cơ chế Exponential Backoff (thử lại sau 1p, 2p, 4p...).

- Trả về phản hồi cho Frontend biết hệ thống đang bận và giao dịch sẽ được xử lý ngầm.

- Frontend hiển thị thông báo "Thanh toán đang xử lý, QR code sẽ được gửi qua email" thay vì báo lỗi đỏ.

---

## 3. Kịch bản lỗi

### 3.1. Client timeout và retry với CÙNG một Idempotency Key

- **Trigger**: Mạng chập chờn, client không nhận được phản hồi nên gửi lại request y hệt.

- **Xử lý**: Backend phát hiện Key đã tồn tại trong Cache. Lập tức trả về kết quả đã cache trước đó với HTTP 200 OK. Không gọi Gateway, không có double charge.

### 3.2. Client retry với KHÁC Idempotency Key

- **Trigger**: Sinh viên mất kiên nhẫn, reload trang và bấm nút "Pay" nhiều lần, mỗi lần Frontend sinh ra một Key mới.

- **Xử lý**: Backend kiểm tra Database, thấy Registration này đã được thanh toán thành công (hoặc đang xử lý). Trả về lỗi 409 Conflict - Registration already paid.

### 3.3. Circuit Breaker OPEN

- **Trigger**: Có hơn 5 lỗi trong 60s.

- **Xử lý**: Trả về mã lỗi 503 Service Unavailable. Frontend hiển thị đồng hồ đếm ngược 30s và tạm khóa nút "Pay".

### 3.4. Gateway từ chối thẻ (Card declined)

- **Trigger**: Mock gateway trả về lỗi logic (không đủ tiền, sai thông tin).

- **Xử lý**: Đánh dấu payment là failed. Không xóa đăng ký (registration) để sinh viên có cơ hội dùng thẻ khác thanh toán lại. Trả về lỗi 402 Payment Required.

---

## 4. Ràng buộc (Constraints)

**Business Rules**
| Ràng buộc | Giá trị |
|-----------|---------|
| Idempotency key format | UUID v4 |
| Idempotency key TTL (cache) | 24 hours |
| Payment timeout | 10 seconds |
| Circuit breaker failure threshold | 5 errors in 60 seconds |
| Circuit breaker open timeout | 30 seconds |
| Payment retry attempts | 5 times |
| Retry backoff | Exponential (1min, 2min, 4min, 8min, 16min) |

**Performance**
| Ràng buộc | Giá trị |
|-----------|---------|
| Payment processing time | < 2s (P95) |
| Circuit breaker decision time | < 5ms |
| Idempotency check time | < 50ms |
| Cache hit rate | > 90% |

**Data Integrity**

- **Idempotency key unique:** Ràng buộc UNIQUE ở tầng Database.

- **Payment status immutability:** Tuyệt đối không cho phép chuyển trạng thái từ success về lại pending.

---

## 5. Tiêu chí chấp nhận (Acceptance Criteria)

**Functional Tests**  
[ ] **TC-PAY-001:** Thanh toán thành công -> Xác nhận Registration, cấp QR code.

[ ] **TC-PAY-002:** Thử lại với cùng Idempotency Key -> Trả về cache, không trừ tiền hai lần.

[ ] **TC-PAY-003:** Thử lại với Key khác nhưng vé đã thanh toán -> Báo lỗi Conflict (409).

[ ] **TC-PAY-004:** Gateway bị timeout -> Circuit breaker ghi nhận 1 lỗi.

[ ] **TC-PAY-005:** 5 lỗi liên tiếp -> Circuit ngắt mạch (OPEN).

[ ] **TC-PAY-006:** Circuit OPEN -> Lập tức chặn request và báo lỗi ServiceUnavailable.

[ ] **TC-PAY-007:** Sau 30s mở lại -> Circuit chuyển sang chế độ thử nghiệm (HALF_OPEN).

[ ] **TC-PAY-008:** Thanh toán lỗi thẻ -> Trạng thái báo failed, vé giữ nguyên chờ thanh toán lại.

[ ] **TC-PAY-009:** Job retry tự động chạy sau 1 phút nếu Circuit đang bị OPEN.

**Resilience & Performance Tests**  
[ ] **TC-RES-001:** Khi tỷ lệ lỗi Gateway lên 50% -> Circuit Breaker phải được kích hoạt.

[ ] **TC-RES-002:** Tắt Cache (Redis down) -> Idempotency tự động fallback dùng Database.

[ ] **TC-PERF-001:** 100 yêu cầu thanh toán cùng lúc -> Xử lý dưới 2 giây (P95).

## 6. Implementation Notes & Code Reference

(Phần này lưu trữ các đoạn code mẫu, Database Schema và logic chi tiết dành cho Developers)

### 6.1. Frontend Flow (Idempotency Generation)

```typescript
// pages/my-registrations/[id].tsx
const [idempotencyKey] = useState(() => uuidv4()); // Generate once!

const handlePay = async () => {
  try {
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey, // Same key for retries
      },
      body: JSON.stringify({
        registrationId: registration.id,
        amount: registration.workshop.price,
      }),
    });

    if (response.status === 503) {
      // Circuit breaker OPEN
      setError("Payment service temporarily unavailable. Please wait...");
      startCountdown(30); // 30s countdown
    } else if (response.ok) {
      router.push("/my-registrations");
    }
  } catch (error) {
    // Network error - safe to retry với same key
    handlePay();
  }
};
```

### 6.2. Happy Path Logic (Pseudo-code)

```
1. Check Idempotency (Cache & DB).
2. Create Payment Record (status: 'pending').
3. Call Gateway qua CircuitBreaker:
   try {
     result = await circuitBreaker.call(() => mockGateway.charge(...));
     payment.status = 'success';
   } catch (error) {
     Handle Circuit Open OR Card Failed;
   }
4. UPDATE payments SET status = ?, transaction_id = ? WHERE id = ?;
5. IF payment.status == 'success' THEN
     UPDATE registrations SET status = 'confirmed', payment_id = ?
6. Cache Result (24h TTL) cho Idempotency Key.
7. Queue Notification ('payment-success').
```

### 6.3. Mock Payment Gateway Service

```typescript
@Injectable()
export class MockPaymentGatewayService {
  private failureRate = 0;
  private shouldTimeout = false;

  setFailureRate(rate: number) {
    this.failureRate = Math.min(100, Math.max(0, rate));
  }
  setTimeoutMode(enabled: boolean) {
    this.shouldTimeout = enabled;
  }

  async charge(dto: ChargeDto): Promise<ChargeResult> {
    if (this.shouldTimeout) {
      await new Promise((resolve) => setTimeout(resolve, 15000));
      throw new Error("Gateway timeout");
    }

    if (Math.random() * 100 < this.failureRate) {
      throw new Error("Gateway error: Service unavailable");
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      transactionId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: dto.amount,
      currency: dto.currency,
    };
  }
}
```

### 6.4. Circuit Breaker Service

```typescript
enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN,
}

@Injectable()
export class CircuitBreakerService {
  private state = CircuitState.CLOSED;
  private failures: number[] = [];
  // Config: 5 errors, 60s window, 30s open timeout, 1 half-open call

  async call<T>(fn: () => Promise<T>, serviceName: string): Promise<T> {
    await this.updateState(serviceName);

    if (this.state === CircuitState.OPEN) {
      // Check timeout to transition to HALF_OPEN
      // Else throw ServiceUnavailableException
    }

    if (this.state === CircuitState.HALF_OPEN) {
      // Allow limited calls, else throw Exception
    }

    try {
      const result = await Promise.race([fn(), this.timeoutPromise(10000)]);
      await this.onSuccess(serviceName);
      return result;
    } catch (error) {
      await this.onFailure(serviceName, error);
      throw error;
    }
  }
  // onSuccess and onFailure update state and push to Redis...
}
```

### 6.5. Graceful Degradation & Retry Worker

```typescript
// Payment Retry Flow Pseudo-code (catch block)
IF error instanceof ServiceUnavailableException THEN
  a. Keep payment status = 'pending'
  b. await paymentRetryQueue.add('retry-payment', { paymentId, registrationId }, { backoff })
  c. Update registration notes
  d. Trả về HTTP 202 Accepted cho user.

// payment-retry.processor.ts
@Processor('payment-retry')
export class PaymentRetryProcessor {
  @Process('retry-payment')
  async handleRetry(job: Job<RetryPaymentDto>) {
    const payment = await this.paymentRepo.findOne({ id: job.data.paymentId });
    if (payment.status !== 'pending') return;

    try {
      const result = await this.circuitBreaker.call(() => gateway.charge(...));
      // Update success state for payment & registration
      // Send success notification
    } catch (error) {
      if (job.attemptsMade >= 5) {
        payment.status = 'failed';
        await this.paymentRepo.save(payment);
        // Manual intervention needed notification
      }
      throw error; // Bull retry trigger
    }
  }
}
```

### 6.6. Backend Validation Snippets

**Check chống double charge khi khác Idempotency Key:**

```typescript
async processPayment(dto: ProcessPaymentDto) {
  const registration = await this.registrationRepo.findOne({
    where: { id: dto.registrationId },
    relations: ['payment']
  });

  if (registration.payment && registration.payment.status === 'success') {
    throw new ConflictException('Registration already paid');
  }
  // Continue with idempotency check...
}
```

**Check lỗi khi từ chối thẻ (Card declined):**

```typescript
// Trong khối catch của processPayment
} else {
  // Payment failed (card declined, insufficient funds, etc.)
  payment.status = 'failed';
  payment.errorMessage = error.message;
  await this.paymentRepo.save(payment);
  // Không rollback registration (giữ lại để user retry)
}
```
