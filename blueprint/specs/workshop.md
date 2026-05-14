# Đặc tả: Workshop Management (CRUD & Room Conflict Detection)

## Mô tả

Hệ thống quản lý thông tin workshop dành cho Ban tổ chức (Organizer) và hiển thị cho người dùng đã đăng nhập. Hệ thống kiểm soát xung đột thời gian và địa điểm tổ chức (phòng) để tránh hai workshop cùng giờ tại một phòng.

**Mục tiêu:**
- Quản lý tập trung thông tin workshop (Thêm, Sửa, Xóa)
- Kiểm soát xung đột thời gian và địa điểm tổ chức
- Caching tối ưu cho danh sách workshop
- Tính toán chỗ trống theo thời gian thực

---

## Luồng chính

### 1. Tạo Workshop (Creation)

**Actor:** Organizer (yêu cầu đã Login)

**Flow:**
1. Organizer gửi POST `/workshops` với:
   - title, speaker, room, capacity, price
   - startTime, endTime, detail (optional)
2. Backend xác thực:
   - Kiểm tra role = 'organizer'
   - Validate DTO: title, capacity, startTime > now, startTime < endTime
   - **Kiểm tra xung đột phòng:**
     - Query database: Tìm workshop khác ở cùng phòng với time range overlap
     - Sử dụng PostgreSQL OVERLAPS operator: `(start_time, end_time) OVERLAPS (:start, :end)`
     - Nếu tìm thấy → Trả lỗi 409 Conflict "Phòng đã có lịch vào thời gian này"
3. Tạo workshop record trong database
4. Xóa cache danh sách workshop
5. Trả về HTTP 201 Created

---

### 2. Cập nhật Workshop (Update)

**Actor:** Organizer

**Flow:**
1. Organizer gửi PATCH `/workshops/:id` với fields cần cập nhật
2. Backend xác thực:
   - Workshop có tồn tại
   - Role check: Organizer
   - **Nếu cập nhật startTime/endTime/room:**
     - Kiểm tra xung đột (tương tự tạo workshop)
     - Loại trừ workshop ID hiện tại
   - **Nếu cập nhật capacity:**
     - Kiểm tra: capacity >= registeredCount
     - Nếu không → Trả lỗi 400 "Cannot reduce capacity below registered count"
3. Cập nhật workshop record
4. Xóa cache (danh sách + detail page)
5. Trả về HTTP 200 OK

---

### 3. Xóa Workshop (Delete)

**Actor:** Organizer

**Flow:**
1. Organizer gửi DELETE `/workshops/:id`
2. Backend xác thực:
   - Workshop có tồn tại
   - Role = 'organizer'
   - **Kiểm tra:**
     - Nếu có registrations = 'confirmed' → Trả lỗi 400 "Cannot delete workshop with confirmed registrations"
3. Xóa workshop record (soft delete hoặc hard delete tùy policy)
4. Xóa cache
5. Trả về HTTP 204 No Content

---

### 4. Xem danh sách Workshop (Listing)

**Actor:** Student, Organizer

**Flow:**
1. User gửi GET `/workshops` (optional: ?page=1&limit=9)
2. Backend xác thực:
   - Kiểm tra JWT token
3. **Kiểm tra cache:**
   - Cache key: `workshops:list:page:{page}:limit:{limit}`
   - TTL: 15 seconds
   - Nếu cache hit → Trả cached data
4. Query database nếu cache miss:
   - SELECT *, (capacity - registered_count) AS available_seats
   - WHERE start_time > NOW() (chỉ workshop chưa bắt đầu)
   - ORDER BY start_time ASC
   - LIMIT & OFFSET cho pagination
5. Lưu kết quả vào cache (15 seconds)
6. Trả về HTTP 200 OK với danh sách workshops + available_seats

---

### 5. Xem chi tiết Workshop (Detail View)

**Actor:** Student, Organizer

**Flow:**
1. User gửi GET `/workshops/:id`
2. Backend xác thực:
   - Validate UUID format của ID
3. **Kiểm tra cache:**
   - Cache key: `workshops:detail:{id}`
   - TTL: 10 seconds
   - Nếu cache hit → Trả cached data
4. Query database nếu cache miss:
   - SELECT * từ workshops WHERE id = ?
   - Tính: available_seats = capacity - registered_count
5. Nếu workshop không tìm thấy → Trả lỗi 404 Not Found
6. Lưu kết quả vào cache (10 seconds)
7. Trả về HTTP 200 OK

**Response includes:**
- Thông tin chi tiết workshop (title, speaker, room, price)
- Capacity, registered count, available seats
- Start time, end time
- Detail content (có thể là AI summary nếu được generate)

---

## Quản lý trạng thái dựa trên thời gian

Hệ thống **không sử dụng cột `status`**. Trạng thái được xác định qua logic:

- **Đang mở (Open for registration):** `start_time > NOW()` AND `registered_count < capacity`
- **Hết chỗ (Full):** `registered_count >= capacity`
- **Đã diễn ra (Closed):** `start_time <= NOW()`

Frontend có thể tính toán trạng thái này từ thông tin trả về.

---

## Kiểm soát xung đột phòng (Room Conflict Detection)

### Cơ chế

**PostgreSQL OVERLAPS operator:**

Hệ thống sử dụng PostgreSQL OVERLAPS operator để kiểm tra range overlap giữa các workshop:
- Query database: Tìm workshop khác ở cùng phòng với time range overlap
- Loại trừ workshop ID hiện tại khi cập nhật

**Ví dụ overlaps:**

- Workshop A: Room A.101, 8:00-10:00
- Workshop B (create): Room A.101, 9:00-11:00
- → OVERLAP → Reject (409)

- Workshop B (create): Room A.101, 10:00-12:00
- → NOT overlap (không overlap exactly ở 10:00) → Accept

---

## Ràng buộc

### Business Rules

| Ràng buộc | Giá trị |
|-----------|---------|
| Start time | phải > NOW() |
| Start time < End time | Bắt buộc |
| Capacity | phải ≥ 1 |
| Capacity reduction | không thể < registered_count |
| Room conflict | (start_time, end_time) không được overlap với workshop khác cùng room |
| Delete constraint | không thể xóa workshop nếu có confirmed registrations |

### Performance

| Ràng buộc | Giá trị |
|-----------|---------|
| List response time | < 500ms (P95) |
| Detail response time | < 500ms (P95) |
| List cache TTL | 15 seconds |
| Detail cache TTL | 10 seconds |
| Room conflict check time | < 50ms |

### Security

- **Authentication:** JWT token required cho mọi endpoint
- **Authorization:** POST/PATCH/DELETE chỉ dành cho role 'organizer'
- **GET endpoints:** Accessible cho Student & Organizer
- **Data visibility:** Public cho Student (xem tất cả workshop sắp tới)

---

## Kịch bản lỗi

### 1. Workshop không tồn tại
- **Trigger:** GET/PATCH/DELETE `/workshops/{invalidId}`
- **Response:** HTTP 404 Not Found
- **Action:** User chọn workshop khác

### 2. Xung đột phòng/thời gian
- **Trigger:** Tạo workshop ở room A.101 từ 8:00-10:00, đã có workshop 9:00-11:00
- **Response:** HTTP 409 Conflict
- **Message:** "Phòng A.101 đã có lịch từ 09:00-11:00"
- **Action:** Organizer đổi phòng hoặc dời giờ

### 3. Giảm capacity dưới registered_count
- **Trigger:** PATCH capacity từ 100 → 50 khi đã có 80 người đăng ký
- **Response:** HTTP 400 Bad Request
- **Message:** "Cannot reduce capacity below registered count (80)"

### 4. Xóa workshop với confirmed registrations
- **Trigger:** DELETE workshop đã có confirmed registrations
- **Response:** HTTP 400 Bad Request
- **Message:** "Cannot delete workshop with active registrations"
- **Action:** Hủy tất cả registrations trước, hoặc set workshop sang trạng thái cancelled

### 5. Start time trong quá khứ
- **Trigger:** Tạo workshop với startTime < NOW()
- **Response:** HTTP 400 Bad Request
- **Message:** "Workshop start time must be in the future"

### 6. Invalid UUID format
- **Trigger:** GET `/workshops/not-a-uuid`
- **Response:** HTTP 400 Bad Request
- **Message:** "Invalid workshop ID format"

---

## Tiêu chí chấp nhận

### Functional Tests

- [ ] **TC-WS-001:** Truy cập API `/workshops` không có token → 401 Unauthorized
- [ ] **TC-WS-002:** Tạo workshop thành công → 201 Created
- [ ] **TC-WS-003:** Tạo workshop ở room/time trùng → 409 Conflict
- [ ] **TC-WS-004:** Cập nhật startTime/room → Kiểm tra conflict
- [ ] **TC-WS-005:** Giảm capacity < registeredCount → 400 Bad Request
- [ ] **TC-WS-006:** Xóa workshop có confirmed registrations → 400 Bad Request
- [ ] **TC-WS-007:** GET danh sách → available_seats = capacity - registered_count
- [ ] **TC-WS-008:** Student thấy chính xác số chỗ trống theo thời gian thực
- [ ] **TC-WS-009:** Sinh viên không thể gọi POST/PATCH/DELETE `/workshops` → 403 Forbidden
- [ ] **TC-WS-010:** GET `/workshops` với invalid page/limit → Default hoặc error

### Cache Tests

- [ ] **TC-CACHE-001:** Danh sách cache hit trong 15s
- [ ] **TC-CACHE-002:** Cache invalidate sau cập nhật workshop
- [ ] **TC-CACHE-003:** Detail cache hit trong 10s
- [ ] **TC-CACHE-004:** Registration tạo/update → list & detail cache invalidated

### Concurrency Tests

- [ ] **TC-CONC-001:** 100 concurrent GET `/workshops` → Phần lớn cache hit
- [ ] **TC-CONC-002:** Concurrent room conflict check → Không bao giờ cho phép overlap
- [ ] **TC-CONC-003:** Concurrent capacity update → Atomic check-and-set

### Performance Tests

- [ ] **TC-PERF-001:** List response < 500ms (P95)
- [ ] **TC-PERF-002:** Detail response < 500ms (P95)
- [ ] **TC-PERF-003:** Room conflict check < 50ms

## Luồng chính

### 1. Tạo Workshop

Organizer gửi yêu cầu tạo workshop với các thông tin: tiêu đề, diễn giả, phòng, sức chứa, giá, thời gian bắt đầu/kết thúc.

Hệ thống kiểm tra:
- Xác thực JWT token (role='organizer')
- Xác định DTO (dữ liệu hợp lệ)
- Kiểm tra xung đột phòng: Không cho phép 2 workshop cùng phòng trong cùng khung giờ (dùng PostgreSQL OVERLAPS operator)

Nếu tất cả kiểm tra vượt qua, workshop được tạo. Nếu có file PDF, file được upload lên storage và job AI summary được tạo.

**Kết quả:**
- Workshop được tạo với status 'pending' (chờ xử lý AI)
- Nếu có PDF, job AI được queue

### 2. AI Summary Worker

Khi job AI được queue, worker lấy PDF từ storage, trích xuất text, làm sạch dữ liệu (tối đa 5000 ký tự), gửi lên OpenAI API với prompt tóm tắt.

Kết quả tóm tắt được cập nhật vào trường `detail` của workshop. Nếu lỗi, job retry tối đa 3 lần với exponential backoff.

**Kết quả:**
- Trường `detail` được cập nhật tự động
- Organizer nhận thông báo khi hoàn tất

### 3. Xem danh sách Workshop

Sinh viên hoặc Organizer gọi API danh sách. Hệ thống:
- Kiểm tra JWT token
- Query database: SELECT tất cả workshop với start_time > NOW()
- Tính sức chứa có sẵn = capacity - registered_count
- Cache kết quả 15 giây

**Kết quả:**
- Danh sách workshop với sức chứa có sẵn
- Sắp xếp theo start_time

### 4. Xem chi tiết Workshop

Sinh viên gọi API chi tiết workshop với ID. Hệ thống:
- Kiểm tra JWT token
- Kiểm tra UUID hợp lệ
- Query database
- Cache kết quả 10 giây

**Lỗi:** 404 Not Found nếu workshop không tồn tại

**Kết quả:**
- Thông tin đầy đủ workshop
- Sức chứa có sẵn
- Nội dung chi tiết (đã được AI tóm tắt)

## Quản lý trạng thái (Time-based)

Hệ thống không sử dụng cột `status`. Trạng thái được xác định logic qua thời gian:
- **Đang mở:** start_time > NOW() và registered_count < capacity
- **Đang diễn ra:** start_time ≤ NOW() ≤ end_time
- **Hết chỗ:** registered_count >= capacity

## Ràng buộc

| Ràng buộc | Giá trị |
|-----------|---------|
| Cache danh sách | 15 giây |
| Cache chi tiết | 10 giây |
| Room conflict detection | PostgreSQL OVERLAPS |
| Xác thực | JWT token required |
| Quyền POST/PATCH/DELETE | role='organizer' only |
| Giảm capacity | Không được < registered_count |
| AI retry | Tối đa 3 lần, exponential backoff |

## Kịch bản lỗi

### 1. Xung đột phòng (Room conflict)

Khi tạo/sửa workshop với phòng và khung giờ trùng với workshop khác, yêu cầu bị từ chối.

**Lỗi:** 409 Conflict - Room already booked for this time slot

**Hành động:** Chọn phòng/giờ khác

### 2. AI processing failure

Khi xử lý PDF gặp lỗi (API OpenAI down, file lỗi...), hệ thống giữ nội dung gốc, ghi log, retry tối đa 3 lần.

**Kết quả:** Email thông báo cho Organizer về lỗi

### 3. Unauthorized access

Khi sinh viên cố tạo/xóa workshop hoặc truy cập API không có token.

**Lỗi:** 401 Unauthorized (không token) hoặc 403 Forbidden (role không đủ)

### 4. Giảm sức chứa quá mức

Khi cố giảm capacity < registered_count.

**Lỗi:** 400 Bad Request - Cannot reduce capacity below current registrations

## Tiêu chí chấp nhận

### Kiểm thử chức năng

- API `/workshops` không có token → 401
- Tạo workshop thành công
- Xung đột phòng/giờ → Từ chối (409)
- Upload PDF → `detail` cập nhật trong 30s
- Sinh viên thấy sức chứa có sẵn chính xác
- Sinh viên không thể xóa workshop (403)

### Kiểm thử hiệu suất

- Danh sách 10,000 workshop được cache 15 giây
- Chi tiết workshop được cache 10 giây
- Room conflict check < 100ms
- AI summary processing < 30 giây
