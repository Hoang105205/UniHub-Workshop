# Đặc tả: Workshop Registration (Booking Flow & Seat Locking)

## Mô tả

Luồng đăng ký workshop với cơ chế **Pessimistic Locking** để đảm bảo **0% oversell** khi có 12.000 users đăng ký đồng thời. Hệ thống xử lý cả workshop miễn phí và có phí, tích hợp với payment gateway.

**Mục tiêu:**
- Đảm bảo không có 2 sinh viên cùng nhận "chỗ cuối cùng"
- Xử lý 12.000 concurrent requests trong 10 phút
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
1. Student gửi POST `/registrations` với workshopId
2. Backend validate:
   - Kiểm tra JWT token
   - Validate workshopId là UUID hợp lệ
3. Bắt đầu transaction với isolation level SERIALIZABLE
4. Khóa row workshop bằng `FOR UPDATE` (pessimistic lock)
5. Kiểm tra điều kiện kinh doanh:
   - Workshop có tồn tại
   - Thời gian đăng ký còn mở (start_time > NOW)
   - Có chỗ trống (registered_count < capacity)
   - User chưa đăng ký workshop này
6. Tạo registration record với status = 'confirmed'
7. Tạo QR code duy nhất (định dạng: WS-{timestamp}-{random-hex})
8. Tăng registered_count của workshop
9. Commit transaction
10. Đẩy job notification vào queue (async)
11. Xóa cache workshop
12. Trả về HTTP 201 Created với thông tin registration

**Postcondition:**
- Registration được tạo với status = 'confirmed'
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
1. Student gửi POST `/registrations` với workshopId, paymentMethod, idempotencyKey
2. Validation (tương tự free workshop)
3. Bắt đầu transaction SERIALIZABLE
4. Khóa workshop row với FOR UPDATE
5. Kiểm tra điều kiện kinh doanh (tương tự free workshop)
6. Tạo registration với status = 'pending' (chờ thanh toán)
7. Tạo payment record với status = 'pending'
8. Tăng registered_count (seat được reserve)
9. Commit transaction
10. Trả về HTTP 201 Created
    - Status: "pending"
    - Message: "Registration created. Please proceed to pay or cancel."
    - Payment expires in 10 minutes

**Postcondition:**
- Seat được reserve
- Registration ở trạng thái 'pending'
- Chờ người dùng bấm "Pay" hoặc "Cancel"

---

### 2.1. Thanh toán Workshop (Click nút "Pay")

**Actor:** Student

**Precondition:**
- Registration đang ở trạng thái 'pending'
- Payment gateway hoạt động (hoặc Circuit breaker CLOSED)

**Flow:**
1. Student gửi POST `/registrations/:id/pay` với paymentMethod, idempotencyKey
2. Validate:
   - Registration có status = 'pending'
   - Payment timeout chưa hết (< 10 phút)
3. Gọi payment gateway qua Circuit Breaker (ngoài transaction)
4. **Nếu payment SUCCESS:**
   - Update payment: status = 'success', transaction_id được lưu
   - Update registration: status = 'confirmed'
   - Đẩy notification job
   - Trả về HTTP 200 OK với QR code
5. **Nếu Circuit Breaker OPEN (gateway sập):**
   - Giữ registration status = 'pending'
   - Đẩy retry job vào queue với exponential backoff
   - Trả về HTTP 202 Accepted
   - Message: "Payment system is busy. We will process it shortly."
   - Gửi email: "Thanh toán đang xử lý, bạn sẽ nhận QR code khi hoàn tất"
6. **Nếu payment FAILED (card declined, insufficient funds):**
   - Bắt đầu transaction
   - Update payment: status = 'failed', error_message được lưu
   - Update registration: status = 'cancelled'
   - Giảm registered_count (release seat)
   - Commit
   - Trả về HTTP 402 Payment Required
   - Message: "Payment failed: {error message}"
   - User có thể retry với card khác

---

### 3. Hủy đăng ký (Cancel)

**Actor:** Student (hủy của mình)

**Precondition:**
- Registration có status = 'pending'
- Còn ít nhất 24 giờ trước khi workshop bắt đầu

**Flow:**
1. Student gửi DELETE `/registrations/:id`
2. Kiểm tra ownership: user_id của registration phải trùng current user
3. Kiểm tra chính sách hủy:
   - Tính giờ = (workshop.start_time - NOW) / 3600
   - Nếu < 24 giờ → Trả lỗi 400 Bad Request "Cannot cancel within 24 hours"
   - Nếu status != 'pending' → Trả lỗi 400 "Only pending registrations can be cancelled"
4. Bắt đầu transaction
5. Update registration: status = 'cancelled'
6. Update payment (nếu có): status = 'failed'
7. Giảm workshop.registered_count
8. Commit
9. Đẩy notification job (cancellation)
10. Trả về HTTP 204 No Content

---

## Tại sao Pessimistic Locking?

### So sánh với Optimistic Locking

| Approach             | Pessimistic (FOR UPDATE)            | Optimistic (Version Check)       |
| -------------------- | ----------------------------------- | -------------------------------- |
| **Cơ chế**           | Lock row trước, xử lý tuần tự        | Đọc → Xử lý → Check version lúc save |
| **Conflict rate**    | 0% (serialized)                     | Cao khi concurrent nhiều          |
| **Retry needed**     | Không                               | Có (client phải retry)            |
| **Throughput**       | Thấp hơn (do lock)                  | Cao hơn (no lock)                 |
| **User experience**  | Deterministic (đợi lâu hơn nhưng chắc) | Unpredictable (có thể retry nhiều) |
| **Data consistency** | 100% (không bao giờ oversell)       | Phụ thuộc vào retry logic         |

### Kết luận

Pessimistic Locking là chọn đúng vì:
1. **Correctness > Performance** - Oversell là lỗi nghiêm trọng
2. **Đọc ít, ghi nhiều** - Spike 3 phút đầu, không phải load đọc liên tục
3. **Connection pool đủ lớn** - Có thể handle 100 concurrent locks

---

## Kịch bản lỗi

### 1. Workshop đã full
- **Trigger:** registered_count >= capacity
- **Response:** HTTP 409 Conflict - "Workshop 'React Best Practices' is full (60/60 seats)"
- **Action:** User chọn workshop khác

### 2. Đã đăng ký workshop này rồi
- **Trigger:** Duplicate (workshop_id, user_id)
- **Response:** HTTP 409 Conflict - "You have already registered for this workshop"
- **Existing Registration:** Trả về thông tin đăng ký hiện tại (id, status, qrCode)
- **Action:** Hiển thị QR code hiện tại

### 3. Payment gateway timeout
- **Trigger:** Payment request > 10 giây
- **Response:** HTTP 202 Accepted
  - Status: "pending"
  - Message: "Registration saved. Payment processing..."
- **Background:** Retry job chạy sau 1 phút với backoff exponential
- **Email:** "Đăng ký thành công, thanh toán đang xử lý"

### 4. Circuit breaker OPEN
- **Trigger:** > 5 lỗi trong 60 giây
- **Response:** HTTP 503 Service Unavailable
- **Backend:** Tất cả payment requests fail fast
- **Registration:** Vẫn được tạo với status = 'pending'
- **Retry:** Jobs sẽ chạy khi circuit HALF_OPEN (sau 30s)

### 5. Card declined
- **Trigger:** Insufficient funds, card expired, etc.
- **Response:** HTTP 402 Payment Required - "Payment failed: Card declined"
- **Backend:** Đánh dấu payment là failed, xóa registration, giảm count
- **Action:** User retry với card khác

### 6. Lock timeout
- **Trigger:** Transaction giữ lock > 5 giây (PostgreSQL timeout)
- **Response:** HTTP 500 Internal Server Error - "Registration timeout. Please try again."
- **Action:** Client auto-retry sau 2 giây

### 7. Idempotent retry (same idempotency key)
- **Trigger:** Client timeout → Retry với cùng idempotency key
- **Flow:**
  1. Kiểm tra cache trước (Redis)
  2. Kiểm tra database (payment table)
  3. Nếu đã xử lý → Trả cùng response
  4. Không bị charge 2 lần
- **Result:** Deterministic response, no double charge

---

## Ràng buộc

### Business Rules

| Ràng buộc                               | Giá trị                                     |
| --------------------------------------- | ------------------------------------------- |
| Max registrations per user per workshop | 1                                           |
| Cancellation deadline                   | 24 hours before workshop start              |
| QR code format                          | `WS-{timestamp}-{8-char-hex}`               |
| QR code uniqueness                      | Global unique, UNIQUE constraint ở DB       |
| Payment timeout                         | 10 minutes                                  |
| Payment retry attempts                  | 5                                           |
| Payment retry delay                     | Exponential backoff (5s, 10s, 20s, 40s, 80s) |

### Performance

| Ràng buộc                         | Giá trị                     |
| --------------------------------- | --------------------------- |
| Registration response time (free) | < 500ms (P95)               |
| Registration response time (paid) | < 2s (P95)                  |
| Concurrent registrations          | 12,000 in 10 minutes        |
| Lock hold time                    | < 100ms average             |
| Transaction timeout               | 5 seconds                   |
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

## Luồng chính

### 1. Đăng ký Workshop Miễn phí

Sinh viên gửi yêu cầu đăng ký workshop không có phí. Hệ thống thực hiện các kiểm tra:
- Xác thực JWT token
- Workshop tồn tại
- Workshop chưa bắt đầu
- Có chỗ trống
- Sinh viên chưa đăng ký workshop này

Nếu tất cả kiểm tra vượt qua, hệ thống tạo một đăng ký với trạng thái "confirmed" ngay lập tức. QR code được tạo theo định dạng `WS-{timestamp}-{random}` và thêm vào đăng ký.

Chỗ ngồi trong workshop tăng lên 1. Thông báo xác nhận được gửi cho sinh viên qua email và ứng dụng trong nước (không chặn phản hồi API).

**Điều kiện trước:**
- Người dùng đã đăng nhập
- Workshop có chỗ trống
- Workshop chưa bắt đầu

**Kết quả:**
- Đăng ký được tạo với trạng thái 'confirmed'
- Chỗ ngồi được bảo lưu
- Thông báo được gửi

---

### 2. Đăng ký Workshop Có phí

Sinh viên gửi yêu cầu đăng ký workshop có phí kèm idempotency key (để tránh trừ tiền 2 lần). Hệ thống thực hiện kiểm tra tương tự như workshop miễn phí.

Nếu vượt qua, đăng ký được tạo với trạng thái "pending" (chờ thanh toán). Bản ghi thanh toán được tạo với idempotency key và status "pending". Chỗ ngồi được bảo lưu.

Thanh toán sẽ được xử lý trong bước tiếp theo (xem phần 2.1).

**Điều kiện trước:**
- Người dùng đã đăng nhập
- Workshop có phí
- Có chỗ trống

**Kết quả:**
- Đăng ký với trạng thái 'pending'
- Chỗ ngồi được giữ trong vòng 10 phút
- Chờ thanh toán hoặc hủy

---

### 2.1. Thanh toán Workshop

Sinh viên gửi yêu cầu thanh toán với idempotency key. Hệ thống kiểm tra:
- Đăng ký ở trạng thái 'pending'
- Idempotency key chưa được xử lý (kiểm tra cache rồi database)

Nếu key đã được xử lý, trả về kết quả cached để tránh trừ tiền 2 lần.

Nếu là yêu cầu mới, hệ thống gọi cổng thanh toán qua Circuit Breaker. Nếu thành công, cập nhật trạng thái payment thành 'success' và registration thành 'confirmed', rồi gửi thông báo.

Nếu cổng thanh toán bị sập (Circuit Breaker ở trạng thái OPEN), giữ đăng ký ở 'pending' và tạo job retry với exponential backoff (bắt đầu từ 5000ms).

Nếu thanh toán thất bại (thẻ bị từ chối, không đủ tiền...), cập nhật payment thành 'failed', hủy đăng ký, và giải phóng chỗ ngồi.

**Kết quả (thành công):**
- Đăng ký xác nhận
- Thanh toán hoàn tất
- QR code được tạo

**Kết quả (thất bại):**
- Chỗ ngồi được giải phóng
- Sinh viên có thể thử lại

---

### 3. Hủy đăng ký

Sinh viên hủy đăng ký của mình. Hệ thống kiểm tra:
- Đăng ký thuộc về sinh viên
- Workshop bắt đầu trong hơn 24 giờ (chính sách hủy)
- Đăng ký ở trạng thái 'pending' hoặc 'confirmed'

Nếu vượt qua, hủy đăng ký (status thành 'cancelled') và giải phóng chỗ ngồi. Nếu có bản ghi thanh toán, cập nhật thành 'failed'. Thông báo hủy được gửi cho sinh viên.

**Kết quả:**
- Đăng ký hủy
- Chỗ ngồi được giải phóng
- Thông báo gửi cho sinh viên

---

## Tại sao Pessimistic Locking?

Hệ thống sử dụng Pessimistic Locking (khóa hàng ngay lập tức) thay vì Optimistic Locking (kiểm tra xung đột sau) để đảm bảo 0% oversell:

- **Pessimistic (FOR UPDATE):** Khóa hàng trước, xử lý tuần tự → Không có xung đột, luôn chính xác
- **Optimistic (Version Check):** Kiểm tra phiên bản khi lưu → Dễ bị xung đột, cần retry nhiều

Khi 100 sinh viên đăng ký workshop 60 chỗ với Pessimistic Locking: 60 thành công, 40 thất bại (chính xác).
Khi dùng Optimistic: Có nguy cơ 65-70 người thành công (oversell).

**Ràng buộc:**
- Transaction isolation: READ COMMITTED (mặc định PostgreSQL)
- Lock timeout: 5 giây
- Pessimistic locking: PostgreSQL FOR UPDATE

---

## Kịch bản lỗi

### 1. Workshop đã full

Khi số sinh viên đã đăng ký bằng hoặc vượt quá sức chứa, yêu cầu đăng ký mới bị từ chối.

**Lỗi:** 409 Conflict - Workshop is full

**Hành động:** Sinh viên chọn workshop khác

### 2. Đã đăng ký workshop này rồi

Khi sinh viên thử đăng ký lại cùng workshop, yêu cầu bị từ chối.

**Lỗi:** 409 Conflict - Already registered for this workshop

**Hành động:** Hiển thị QR code hiện có

### 3. Hủy yêu cầu trong 24 giờ

Nếu workshop bắt đầu trong ít hơn 24 giờ, hủy không được phép.

**Lỗi:** 400 Bad Request - Cannot cancel within 24 hours of workshop

### 4. Thanh toán hết hạn

Nếu thanh toán vượt quá 10 phút (payment timeout), hệ thống vẫn giữ đăng ký ở trạng thái 'pending' và tạo job retry với exponential backoff bắt đầu từ 5000ms, tối đa 5 lần thử.

**Lỗi:** 201 Created - Registration pending, payment processing

### 5. Payment gateway sập (Circuit Breaker OPEN)

Khi gateway gặp 5 lỗi trong vòng 60 giây, Circuit Breaker chuyển sang trạng thái OPEN. Tất cả yêu cầu thanh toán bị từ chối ngay lập tức (fail-fast). Hệ thống vẫn giữ đăng ký ở 'pending' và tạo retry job.

**Lỗi:** 503 Service Unavailable

**Khi nào hết:** Sau 30 giây, Circuit Breaker chuyển sang HALF_OPEN (cho phép 1 yêu cầu thử) hoặc CLOSED nếu thành công.

### 6. Thẻ bị từ chối

Khi thẻ hết tiền hoặc hết hạn, thanh toán thất bại. Đăng ký được giữ lại để sinh viên thử lại với thẻ khác.

**Lỗi:** 402 Payment Required

**Hành động:** Sinh viên cung cấp thẻ mới

### 7. Idempotency key trùng (yêu cầu retry)

Nếu sinh viên gửi lại yêu cầu với cùng idempotency key, hệ thống trả về kết quả cached (24 giờ TTL) hoặc kiểm tra database, không trừ tiền 2 lần.

**Kết quả:** Phản hồi giống như lần đầu tiên

## Ràng buộc

| Ràng buộc | Giá trị |
|-----------|---------|
| Max đăng ký/sinh viên/workshop | 1 |
| Hạn hủy | 24 giờ trước workshop |
| Format QR code | WS-{timestamp}-{8-char-hex} |
| Retry thanh toán | 5 lần, exponential backoff từ 5000ms |
| Circuit breaker threshold | 5 lỗi trong 60 giây |
| Circuit breaker cooldown | 30 giây |
| Payment timeout | 10 phút |
| Idempotency key TTL | 24 giờ cache, 30 giây lock khi xử lý |
| Response time (miễn phí) | < 500ms (P95) |
| Response time (có phí) | < 2 giây (P95) |
| Concurrent requests | 12,000 trong 10 phút |

---

## Tiêu chí chấp nhận

### Kiểm thử chức năng

- Sinh viên đăng ký workshop miễn phí → Thành công
- Sinh viên đăng ký workshop có phí → Tạo đăng ký 'pending'
- Đăng ký workshop đã full → Lỗi 409
- Đăng ký lại workshop đã đăng ký → Lỗi 409
- Hủy đăng ký > 24h trước → Thành công
- Hủy đăng ký < 24h trước → Lỗi 400
- Thanh toán thất bại → Đăng ký hủy, chỗ giải phóng
- Thanh toán hết hạn → Đăng ký 'pending', job retry được tạo
- Circuit breaker OPEN → Tất cả thanh toán thất bại, job retry được tạo
- Retry với cùng idempotency key → Trả về kết quả cached, không trừ tiền 2 lần

### Kiểm thử độ tin cậy

- 100 yêu cầu đồng thời workshop 60 chỗ → Đúng 60 thành công, 40 thất bại
- Không bao giờ bán quá sức chứa
- registered_count luôn chính xác
- QR code không bao giờ trùng

### Kiểm thử hiệu suất

- 12,000 đăng ký trong 10 phút → 100% thành công
- P95 response time < 500ms (miễn phí)
- P95 response time < 2 giây (có phí)
