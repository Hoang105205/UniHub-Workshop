# Đặc tả: Payment Processing (Circuit Breaker & Idempotency)

## Mô tả

Hệ thống thanh toán workshop có phí sử dụng **mock payment gateway**, tập trung vào 2 cơ chế bảo vệ cốt lõi:
1. **Circuit Breaker:** Ngăn chặn gọi payment gateway khi hệ thống bị sập, giúp fail-fast và không làm treo server.
2. **Idempotency Key:** Chống double charge khi client gặp lỗi mạng và retry.

**Lưu ý:** Đây là mock payment cho đồ án, không tích hợp gateway thật. Sinh viên thấy trang xác nhận với nút "Cancel" và "Pay".

**Mục tiêu:**
- Tự động hạ cấp duy trì dịch vụ khi payment gateway gặp sự cố
- Đảm bảo 0% double charge dù client retry nhiều lần
- Workshop listing vẫn hoạt động khi payment down (99.9% uptime cho tính năng cốt lõi)

---

## Luồng chính

### 1. Luồng thanh toán hoàn chỉnh (Happy Path)

**Context:** Sinh viên đã đăng ký workshop có phí, registration ở trạng thái `pending`

**Flow:**
1. Sinh viên truy cập trang chi tiết vé (`/my-registrations/:id`), xem số tiền
2. Frontend tự động tạo Idempotency Key (UUID v4) nếu chưa có, gửi kèm Header
3. Backend kiểm tra Key trong Cache (Redis), sau đó kiểm tra Database để đảm bảo chưa xử lý
4. Backend tạo bản ghi `payments` với status = 'pending'
5. Gọi Mock Payment Gateway qua Circuit Breaker
6. Nếu thành công:
   - Update payment: status = 'success', transaction_id được lưu
   - Update registration: status = 'confirmed'
   - Cache lại kết quả Idempotency Key (24 giờ TTL)
   - Đẩy job email/thông báo xác nhận
   - Trả về QR code
7. Nếu failed: Xem phần "Kịch bản lỗi"

---

### 2. Mock Payment Gateway

**Mục đích:** Giả lập cổng thanh toán với khả năng phát sinh lỗi hoặc quá hạn thời gian

**Default Configuration:**
- **Failure Rate:** 0% (không có lỗi)
- **Latency:** 200ms
- **Configurable:** Via API `/mock-gateway/config` endpoint

**Các kịch bản hỗ trợ:**
- Giả lập failure rate ngẫu nhiên (VD: 50% request bị lỗi)
- Giả lập timeout (15 giây để Circuit Breaker tự ngắt)

---

### 3. Cơ chế Circuit Breaker

**Quản lý 3 trạng thái:**

#### CLOSED (Bình thường)
- Mọi request đi qua bình thường
- Nếu phát hiện 5 lỗi trong vòng 60 giây → chuyển OPEN

#### OPEN (Ngắt mạch)
- Chặn ngay lập tức mọi request gửi đến Gateway
- Thời gian chờ: 30 giây
- Sau 30 giây → chuyển HALF_OPEN

#### HALF_OPEN (Thử nghiệm)
- Cho phép duy nhất 1 request đi qua để "thăm dò"
- Nếu thành công → Trở lại CLOSED
- Nếu thất bại → Quay lại OPEN

**Thống kê:**
| Thông số | Giá trị |
| -------- | ------ |
| Fail threshold | 5 lỗi |
| Check window | 60 giây |
| Cooldown (OPEN→HALF_OPEN) | 30 giây |

---

### 4. Graceful Degradation (Hạ cấp dịch vụ)

**Khi Circuit Breaker ở trạng thái OPEN (Gateway sập):**
1. Request thanh toán bị Circuit Breaker chặn lại ngay
2. Backend giữ payment status = 'pending' (không update)
3. Tạo tác vụ Retry vào Bull Queue:
   - **Retry attempts:** 5 lần
   - **Backoff:** Exponential (5s, 10s, 20s, 40s, 80s)
4. Trả về HTTP 202 Accepted
   - Message: "Payment system is busy. We will process it shortly."
5. Frontend hiển thị: "QR code sẽ được gửi qua email"
6. Khi circuit HALF_OPEN hoặc CLOSED, retry jobs chạy tự động

---

## Kịch bản lỗi

### 1. Client timeout và retry với CÙNG Idempotency Key
- **Trigger:** Mạng chập chờn, client không nhận phản hồi, gửi lại request y hệt
- **Xử lý:** Backend phát hiện Key đã tồn tại trong Cache
- **Result:** Trả về kết quả đã cache (HTTP 200 OK)
- **Guarantee:** Không gọi Gateway, không có double charge

### 2. Client retry với KHÁC Idempotency Key
- **Trigger:** Sinh viên reload trang, bấm "Pay" nhiều lần, mỗi lần Key mới
- **Xử lý:** Backend kiểm tra Database
- **Result:** Thấy Registration đã thanh toán → Trả lỗi 409 Conflict
- **Message:** "Registration already paid"

### 3. Circuit Breaker OPEN
- **Trigger:** Có > 5 lỗi trong 60s
- **Response:** HTTP 503 Service Unavailable
- **Frontend:** Hiển thị đồng hồ đếm ngược 30s, tạm khóa nút "Pay"
- **Backend:** Đẩy retry job vào queue

### 4. Card declined / Payment failed
- **Trigger:** Mock gateway trả về lỗi logic (không đủ tiền, sai thông tin)
- **Response:** HTTP 402 Payment Required
- **Message:** "Payment failed: {error message}"
- **Database:** Đánh dấu payment = 'failed'
- **Registration:** Không xóa (sinh viên có thể retry lại)

### 5. Idempotency Key Format Invalid
- **Trigger:** Idempotency Key không phải UUID v4
- **Response:** HTTP 400 Bad Request
- **Message:** "Invalid idempotency key format"

### 6. Timeout Lock Exceeded
- **Trigger:** Processing state lock > 30 giây (ngăn race condition)
- **Response:** HTTP 409 Conflict
- **Message:** "Payment processing conflict. Please retry."

---

## Ràng buộc

### Business Rules

| Ràng buộc | Giá trị |
|-----------|---------|
| Idempotency key format | UUID v4 |
| Idempotency key TTL (cache) | 24 hours |
| Idempotency processing lock duration | 30 seconds |
| Payment processing timeout | 10 seconds |
| Circuit breaker failure threshold | 5 errors in 60 seconds |
| Circuit breaker open state duration | 30 seconds |
| Payment retry attempts | 5 times |
| Retry backoff strategy | Exponential (5s, 10s, 20s, 40s, 80s) |

### Performance

| Ràng buộc | Giá trị |
|-----------|---------|
| Payment processing time | < 2s (P95) |
| Circuit breaker decision time | < 5ms |
| Idempotency cache check time | < 50ms |
| Cache hit rate | > 90% |

### Data Integrity

- **Idempotency key unique:** Constraint UNIQUE ở tầng Database
- **Payment status immutability:** Tuyệt đối không cho phép chuyển từ success sang pending
- **Atomic updates:** Payment status và registration status cập nhật cùng transaction

---

## Tiêu chí chấp nhận

### Functional Tests

- [ ] **TC-PAY-001:** Thanh toán thành công → Registration confirmed, QR code cấp
- [ ] **TC-PAY-002:** Retry với cùng Idempotency Key → Cached response, không trừ tiền 2 lần
- [ ] **TC-PAY-003:** Retry với Key khác nhưng vé đã thanh toán → Conflict (409)
- [ ] **TC-PAY-004:** Gateway timeout → Circuit breaker ghi nhận 1 lỗi
- [ ] **TC-PAY-005:** 5 lỗi liên tiếp → Circuit OPEN
- [ ] **TC-PAY-006:** Circuit OPEN → Chặn request, trả lỗi 503
- [ ] **TC-PAY-007:** Sau 30s → Circuit chuyển HALF_OPEN
- [ ] **TC-PAY-008:** Card declined → Status = failed, registration giữ pending
- [ ] **TC-PAY-009:** Job retry tự động chạy sau 5s nếu Circuit đang OPEN

### Resilience & Performance Tests

- [ ] **TC-RES-001:** 50% failure rate → Circuit Breaker được kích hoạt
- [ ] **TC-RES-002:** Cache miss fallback → Idempotency fallback dùng Database
- [ ] **TC-PERF-001:** 100 payment requests cùng lúc → Xử lý < 2s (P95)

---

## Dependencies

- Redis (Idempotency cache)
- Bull Queue (Retry job queue)
- PostgreSQL (Payment & Registration data)
- Mock Gateway Service (payment simulation)

## Luồng chính

### Luồng thanh toán hoàn chỉnh (Happy Path)

Sinh viên bấm nút "Pay" trên giao diện để thanh toán vé workshop. Frontend tạo idempotency key (UUID v4) duy nhất và gửi kèm request.

Backend nhận request, kiểm tra idempotency key trong cache (Redis) trước tiên, sau đó kiểm tra database để đảm bảo giao dịch này chưa từn được xử lý. Nếu key đã tồn tại, trả về kết quả cached (không gọi gateway).

Nếu là giao dịch mới, tạo payment record với status "pending". Gọi mock gateway thông qua Circuit Breaker.

Nếu thành công, cập nhật payment thành "success" và registration thành "confirmed". Cache lại kết quả trong 24 giờ. Tạo job thông báo cho sinh viên.

**Kết quả:**
- Payment thành công
- Registration confirmed
- QR code được tạo
- Email xác nhận được gửi

### Mock Payment Gateway

Mock gateway hỗ trợ giả lập các kịch bản:
- Failure rate: 0-100% (mặc định 0%)
- Timeout mode: Giữ request lơ lửng để kích hoạt Circuit Breaker
- Latency: 200ms (mặc định)

Admin có thể thay đổi các thông số này qua API để kiểm thử.

### Circuit Breaker (3 trạng thái)

**CLOSED (Bình thường):**
- Tất cả request đi qua gateway bình thường
- Nếu 5 lỗi trong 60 giây → OPEN

**OPEN (Ngắt mạch):**
- Chặn ngay tất cả request → fail-fast
- Trả về 503 Service Unavailable
- Sau 30 giây → HALF_OPEN

**HALF_OPEN (Thử nghiệm):**
- Cho phép 1 request thử
- Nếu thành công → CLOSED
- Nếu thất bại → OPEN (reset 30 giây countdown)

### Graceful Degradation (Hạ cấp dịch vụ)

Khi Circuit breaker ở trạng thái OPEN:
- Request thanh toán bị chặn ngay lập tức
- Backend giữ payment ở status "pending"
- Tạo retry job với exponential backoff từ 5000ms
- Trả về 202 Accepted cho client
- Email thông báo: "Thanh toán đang xử lý, QR code sẽ được gửi qua email"

**Kết quả:** Tất cả tính năng khác (xem workshop, profile) vẫn hoạt động

### 3.1. Retry với cùng idempotency key

Nếu client gửi lại request với idempotency key giống nhau, hệ thống kiểm tra cache. Nếu tìm thấy, trả về kết quả cached ngay lập tức (HTTP 200). Không gọi gateway, không trừ tiền 2 lần.

**Kết quả:** Phản hồi giống như lần đầu tiên

### 3.2. Retry với idempotency key khác nhưng vé đã thanh toán

Nếu registration đã thanh toán thành công (hoặc đang xử lý), yêu cầu thanh toán lần 2 bị từ chối.

**Lỗi:** 409 Conflict - Registration already paid

### 3.3. Circuit Breaker OPEN (5+ lỗi trong 60 giây)

Khi gateway gặp 5 lỗi liên tiếp trong 60 giây, Circuit Breaker chuyển sang OPEN. Tất cả request thanh toán bị từ chối ngay lập tức.

**Lỗi:** 503 Service Unavailable

**Hành động:** Frontend hiển thị countdown 30 giây, sau đó cho phép thử lại

### 3.4. Thẻ bị từ chối

Khi thẻ hết tiền, sai thông tin, hoặc hết hạn, gateway trả về lỗi.

**Lỗi:** 402 Payment Required

**Hành động:** Payment được đánh dấu "failed", registration giữ nguyên để sinh viên thử lại với thẻ khác

### 3.5. Payment timeout (quá 10 phút)

Nếu gateway response chậm, hệ thống vẫn giữ payment ở "pending" và tạo job retry.

**Kết quả:** 202 Accepted - Payment is being processed

---

## Tiêu chí chấp nhận

### Kiểm thử chức năng

- Thanh toán thành công → Registration xác nhận, cấp QR code
- Retry với cùng idempotency key → Trả về cache, không trừ tiền 2 lần
- Retry với key khác nhưng vé đã thanh toán → Lỗi 409
- Gateway timeout → Circuit breaker ghi nhận 1 lỗi
- 5 lỗi liên tiếp → Circuit ngắt mạch (OPEN)
- Circuit OPEN → Chặn request, trả về 503
- Sau 30 giây → Circuit chuyển HALF_OPEN
- Thanh toán thẻ bị từ chối → Payment failed, vé giữ nguyên
- Job retry tự động chạy nếu Circuit OPEN

### Kiểm thử độ tin cậy

- Tỷ lệ lỗi gateway 50% → Circuit Breaker kích hoạt
- Redis down → Idempotency fallback dùng database
- 100 yêu cầu thanh toán đồng thời → Xử lý < 2 giây (P95)

## Ràng buộc

| Ràng buộc | Giá trị |
|-----------|---------|
| Failure threshold (Circuit Breaker) | 5 lỗi |
| Time window (Circuit Breaker) | 60 giây |
| Cooldown (Circuit Breaker) | 30 giây |
| Payment timeout | 10 phút |
| Retry attempts | 5 lần |
| Retry backoff | Exponential, từ 5000ms |
| Idempotency key TTL (cache) | 24 giờ |
| Idempotency key lock | 30 giây |
| Default failure rate | 0% |
| Default latency | 200ms |
| Payment processing time (P95) | < 2 giây |
| Idempotency check (P95) | < 50ms |
