# Đặc tả: Workshop Management (CRUD & AI Summary)

## 1. Mô tả

Hệ thống quản lý thông tin workshop dành cho Ban tổ chức (Organizer) và hiển thị cho người dùng đã đăng nhập. Hệ thống tập trung vào việc tự động hóa nội dung giới thiệu (detail) thông qua AI và kiểm soát dữ liệu chỗ trống theo thời gian thực.

**Mục tiêu:**

- Quản lý tập trung thông tin workshop (Thêm, Sửa, Xóa).
- Tự động hóa nội dung giới thiệu từ tài liệu PDF bằng OpenAI.
- Kiểm soát xung đột thời gian và địa điểm tổ chức (phòng).

## 2. Luồng xử lý chính

### 2.1. Tạo Workshop (Creation)

**Actor:** Organizer (Yêu cầu đã Login)

**Flow:**

```
1. Organizer POST /workshops
Headers: { "Authorization": "Bearer " }
Body: {
"title": "Kỹ năng lập trình NestJS chuyên sâu",
"speaker": "Nguyễn Văn A",
"room": "A.101",
"capacity": 60,
"price": 0,
"startTime": "2024-06-01T08:00:00Z",
"endTime": "2024-06-01T11:00:00Z",
"detail": "Nội dung tóm tắt ban đầu (nếu có)"
}
File: intro_document.pdf (Optional)

2. Backend validate:
a. Check JwtAuthGuard & @Roles('organizer')
b. Validate DTO (title, capacity, startTime > now, v.v.)
c. Kiểm tra trùng phòng (Room Conflict):
SELECT id FROM workshops
WHERE room = ?
AND (start_time, end_time) OVERLAPS (?, ?)
Nếu FOUND → 409 Conflict "Phòng đã có lịch vào thời gian này"

3. Database Transaction:
a. INSERT INTO workshops (
title, capacity, price, detail,
start_time, end_time, room, speaker
) VALUES (...)
b. Nếu có file PDF:

Upload file lên storage -> Lấy pdf_url

Đẩy Job vào Bull Queue: { workshopId: id, pdfUrl: url }

4. Response 201 Created:
{
"id": "uuid",
"title": "Kỹ năng lập trình NestJS chuyên sâu",
...
}
```

### 2.2. Xử lý AI Content Worker

**Trigger:** Job 'ai-summary' được đẩy vào hàng đợi sau khi tạo/cập nhật workshop.

**Flow:**

```
1. Worker lấy job từ Bull Queue, tải file PDF từ pdfUrl.

2. Trích xuất văn bản (Text Extraction):

    - Sử dụng thư viện pdf-parse để lấy nội dung text thô.

    - Làm sạch văn bản, lấy tối đa 5000 ký tự đầu tiên để tối ưu token OpenAI.

3. OpenAI Processing:

    - Gửi văn bản sang OpenAI API (GPT-4) với prompt tóm tắt chuyên biệt.

    - Trả về đoạn giới thiệu súc tích (3-5 câu).

4. Cập nhật dữ liệu:

    - UPDATE workshops SET detail = <ai_summary_result> WHERE id = ?

5. Thông báo:

    - Gửi tín hiệu thông báo (WebSocket hoặc In-app) cho Organizer khi hoàn tất.

```

### 2.3. Xem danh sách Workshop (Listing)

**Actor:** Student, Organizer

**Flow:**

```
1. User GET /workshops
Headers: { "Authorization": "Bearer " }

2. Backend Query:
SELECT *, (capacity - registered_count) as available_seats
FROM workshops
WHERE start_time > NOW()
ORDER BY start_time ASC

3. Response 200 OK:
{
    "data": [
        {
            "id": "uuid",
            "title": "Kỹ năng lập trình NestJS chuyên sâu",
            "availableSeats": 15,
            "startTime": "2024-06-01T08:00:00Z",
            "detail": "...", // Nội dung đã được AI cập nhật
            ...
        }
    ]
}
```

### 2.4. Xem chi tiết một Workshop (Detail View)

**Actor:** Student, Organizer

**Flow:**

```
1. User GET /workshops/:id
Headers: { "Authorization": "Bearer " }

2. Backend Query:
a. Check UUID format
b. Query DB: SELECT * FROM workshops WHERE id = ?

3. Validate:

    - Nếu NOT FOUND → 404 Not Found "Workshop không tồn tại"

4. Response 200 OK:
{
    "id": "uuid",
    "title": "Kỹ năng lập trình NestJS chuyên sâu",
    "capacity": 60,
    "registeredCount": 45,
    "availableSeats": 15,
    "price": 0,
    "detail": "Nội dung chi tiết hoàn chỉnh...",
    "startTime": "2024-06-01T08:00:00Z",
    "endTime": "2024-06-01T11:00:00Z",
    "room": "A.101",
    "speaker": "Nguyễn Văn A"
}
```

## 3. Quản lý trạng thái dựa trên thời gian

Hệ thống không sử dụng cột `status`. Trạng thái của workshop được xác định logic qua thời gian:

- **Đang mở:** `start_time > NOW()` và `registered_count < capacity`.
- **Đã đóng/Đang diễn ra:** `start_time <= NOW()`.
- **Hết chỗ:** `registered_count >= capacity`.

## 4. Ràng buộc

- **Xác thực:** Mọi request (trừ login/register) không có JWT hợp lệ đều bị từ chối với lỗi `401 Unauthorized`.
- **Phân quyền:** Chỉ role `organizer` được quyền thực hiện `POST`, `PATCH`, `DELETE`.
- **Sức chứa:** Không cho phép giảm `capacity` xuống thấp hơn `registered_count` thực tế.

## 5. Kịch bản lỗi

- **Trùng lịch phòng:** Trả về `409 Conflict`. Action: Yêu cầu đổi phòng hoặc dời giờ.
- **AI Processing Failure:** Nếu lỗi (file scan, API down), hệ thống giữ nguyên nội dung `detail` gốc, ghi log và thử lại tối đa 3 lần (exponential backoff).

## 6. Tiêu chí chấp nhận (Acceptance Criteria)

- [ ] **TC-WS-001:** Truy cập API `/workshops` không có token phải trả về 401.
- [ ] **TC-WS-002:** Tạo workshop thành công và tự động ngăn chặn nếu trùng phòng/giờ.
- [ ] **TC-WS-003:** Sau khi upload PDF, trường `detail` được cập nhật tự động trong vòng 30s.
- [ ] **TC-WS-004:** Student thấy được số chỗ trống (`available_seats`) chính xác theo thời gian thực.
- [ ] **TC-WS-005:** Sinh viên không thể gọi API `DELETE /workshops` (Trả về 403).

## 7. Ghi chú cho Team (Implementation Notes)

- **Global Guard:** Cài đặt `JwtAuthGuard` toàn cục. Sử dụng `@Public()` decorator cho các endpoint login/register để đơn giản hóa việc quản lý bảo mật.
- **Timezone:** Tất cả dữ liệu thời gian lưu dưới dạng UTC để nhất quán giữa Server và App Mobile.
- **Optimization:** Đánh Index cho các cột `room` và `start_time` để tối ưu hóa tốc độ kiểm tra xung đột và truy vấn danh sách cho 12.000 sinh viên.
- **AI Summary:** Khi cập nhật trường `detail` từ Worker, phải đảm bảo tính nhất quán (Atomicity) để không ghi đè dữ liệu nếu Organizer đang sửa nội dung đồng thời.
