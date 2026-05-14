# Đặc tả: CSV Student Data Sync (Cron Job)

## Mô tả

Tính năng đồng bộ hóa dữ liệu sinh viên định kỳ từ file CSV. Hệ thống tự động quét, kiểm tra tính hợp lệ, cập nhật hoặc thêm mới sinh viên vào cơ sở dữ liệu.

**Lịch chạy:** Nửa đêm UTC (configurable qua env)

**Cơ chế retry:** File không tìm thấy → Retry 3 lần, fixed interval 5 phút

**Batch size:** 1000 bản ghi mỗi lần (tối ưu hiệu suất, tránh tràn RAM)

**Lưu trữ file:** pending/, completed/, error/ (di chuyển tự động sau xử lý)

## Luồng chính

### 1. Format File CSV
**Cấu trúc:**

```csv
student_id,email,full_name
SV001,nguyen.a@uni.edu,Nguyễn Văn A
SV002,tran.b@uni.edu,Trần Thị B
SV003,le.c@uni.edu,Lê Văn C
```

**Trường bắt buộc:**

| Trường | Kiểu | Bắt buộc | Max length | Xác minh |
|--------|------|----------|-----------|---------|
| student_id | String | ✅ | 20 | Unique, không có space |
| email | String | ✅ | 255 | Email hợp lệ (RFC 5322) |
| full_name | String | ✅ | 255 | Không rỗng |

### 2. Cron Scheduler & Retry Strategy

Scheduler chạy hàng đêm (0 0 * * * UTC mặc định, hoặc configurable qua env). Nếu file không tìm thấy hoặc rỗng, job được retry tối đa 3 lần với fixed interval 5 phút.

Sau 3 lần thất bại, job ghi log và dừng (không retry tiếp).

### 3. CSV Processing (Streaming)

File được đọc theo stream để tránh tràn RAM với file lớn (100K+ hàng). Dữ liệu được xử lý theo batch 1000 bản ghi.

**Quy trình:**
1. Mở stream đọc file
2. Duyệt từng hàng, validate
3. Thêm vào batch
4. Khi batch đủ 1000, xử lý (upsert) vào database
5. Tiếp tục cho đến hết file
6. Xử lý batch cuối cùng

### 4. Row Validation

Mỗi hàng được kiểm tra:
- Trường bắt buộc không rỗng
- student_id: Chữ hoa + số, không có space
- email: Format hợp lệ
- Độ dài không vượt quá max
- Lỗi validation được ghi lại (không làm dừng job)

Hàng lỗi được skip, hàng hợp lệ được đưa vào batch xử lý.

### 5. Batch Processing (Upsert)

Sử dụng upsert: "Nếu student_id tồn tại, update; không thì insert".

**Update:** Chỉ cập nhật email và full_name. Password hash không đổi.

**Insert:** Tạo user mới với role='student', password_hash=null.

Mỗi batch chạy trong transaction để đảm bảo consistency.

### 6. Kết quả & Log

Sau khi hoàn tất, hệ thống ghi log:
- Tổng hàng xử lý
- Thành công
- Thất bại
- Bỏ qua (không thay đổi)

File được di chuyển từ pending/ → completed/ (nếu thành công) hoặc error/ (nếu có lỗi).

Email tóm tắt được gửi cho admin.

## Ràng buộc

| Ràng buộc | Giá trị |
|-----------|---------|
| Lịch chạy | 0 0 * * * (nửa đêm UTC) hoặc configurable |
| Retry attempts | 3 lần |
| Retry interval | 5 phút (fixed) |
| Batch size | 1000 bản ghi |
| Trường bắt buộc | MSSV, email, fullname |
| student_id max | 20 ký tự |
| email max | 255 ký tự |
| File locations | pending/, completed/, error/ |
| Upsert method | Update on student_id match, insert new |
| File cleanup | Tự động sau 30 ngày (configurable) |

## Kịch bản lỗi

### 1. File không tìm thấy

Khi scheduler chạy nhưng file chưa xuất hiện (legacy system delay), job throw error và Bull Queue tự động retry 2 lần nữa (cấu hình 3 attempts), mỗi lần cách nhau 5 phút.

**Kết quả:** Sau 15 phút, nếu vẫn không có file → log error, admin review

### 2. File trống

Nếu file tồn tại nhưng size = 0 (đang ghi), job throw error, trigger retry.

**Kết quả:** Giống như file không tìm thấy

### 3. CSV format lỗi (missing columns)

Nếu CSV thiếu cột student_id, email, hoặc full_name, csv parser throw error.

**Kết quả:** Job fail, file di chuyển vào error/, admin review

### 4. Validation fail (row)

Nếu hàng: student_id trống, email sai format, full_name > 255 ký tự...

**Kết quả:** Hàng bị skip, ghi vào error log. Các hàng khác tiếp tục xử lý.

**Log entry:** 
```json
{
  "row": 5,
  "student_id": "SV005",
  "errors": ["email format is invalid"]
}
```

### 5. Database connection lỗi

Khi xử lý batch, nếu database không phản hồi, batch xử lý fail.

**Kết quả:** Job fail, file giữ nguyên trong pending/, retry sau 5 phút

### 6. Duplicate dữ liệu (email hoặc student_id)

Nếu 2 hàng trong file có student_id giống, row thứ 2 bị skip.

**Kết quả:** Chỉ hàng đầu được xử lý, hàng trùng bị log

## Tiêu chí chấp nhận

### Kiểm thử chức năng

- CSV file hợp lệ → Sync thành công
- Update on match → student_id tồn tại thì cập nhật email/fullname
- Insert on new → student_id mới thì thêm vào database
- Validation fail → Skip hàng, tiếp tục batch
- File không tìm → Retry 3 lần, cách 5 phút
- File trống → Retry 3 lần
- Invalid CSV → Job fail, file → error/
- Database error → Retry sau 5 phút

### Kiểm thử hiệu suất

- 100K hàng → Xử lý dưới 2 phút (streaming, batch 1000)
- RAM usage → < 100MB (batch processing, không load all)
- Batch transaction → < 2 giây per 1000 rows

### Kiểm thử độ tin cậy

- 10 concurrent jobs → Không deadlock
- Lỗi email hợp lệ → Không fail (validate format)
- File di chuyển → Sau xử lý, completed/ hoặc error/
- Log chi tiết → success/failed/skipped count
