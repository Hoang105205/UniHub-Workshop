# Đặc tả: Notification System

## Mô tả

Hệ thống thông báo gửi notification async qua Bull Queue, không chặn API response. Hiện tại hỗ trợ Email (kênh duy nhất được cài đặt).

**Sự kiện được hỗ trợ:**
- ticket.confirmed - Đăng ký thành công
- payment.pending - Thanh toán đang xử lý
- payment.failed - Thanh toán thất bại
- ticket.cancelled - Vé bị hủy

**Email retry:** 3 lần, exponential backoff từ 5000ms

**QR code:** Tạo bằng thư viện qrcode với error correction level H

## Luồng chính

### 1. Trigger Notification

Khi sự kiện quan trọng xảy ra (đăng ký thành công, thanh toán thất bại...), hệ thống tạo 1 job cho mỗi kênh và đẩy vào Bull Queue.

**Job data:**
- Event type (ví dụ: ticket.confirmed)
- User ID, Workshop ID, Registration ID
- QR code, số tiền, lý do...
- Idempotency key (tránh gửi 2 lần)

API response trả về ngay, không chờ email gửi.

### 2. Email Worker

Worker lấy job từ queue, lấy dữ liệu sinh viên và workshop từ database, chuẩn bị nội dung email (subject, body, attachment QR code).

Gửi email qua SMTP server. Nếu thất bại, retry tối đa 3 lần với exponential backoff từ 5000ms.

### 3. QR Code Generation

Khi gửi email cho sự kiện ticket.confirmed, hệ thống:
- Tạo QR code từ chuỗi định dạng WS-{timestamp}-{random}
- Sử dụng thư viện qrcode với error correction level H
- Embed QR code vào email dưới dạng ảnh đính kèm

### Sự kiện và Kênh

| Sự kiện | Kênh | Nội dung |
|---------|------|---------|
| ticket.confirmed | Email | QR code, thời gian, địa điểm, phòng |
| payment.pending | Email | Thanh toán đang xử lý, sẽ gửi QR code sau |
| payment.failed | Email | Lý do thất bại, link thử lại |
| ticket.cancelled | Email | Lý do hủy, số tiền hoàn lại (nếu có) |

## Ràng buộc

| Ràng buộc | Giá trị |
|-----------|---------|
| Email retry attempts | 3 lần |
| Email retry backoff | Exponential từ 5000ms |
| QR code format | WS-{timestamp}-{random} |
| QR code error correction | Level H |
| Kênh được cài đặt | Email only |

## Kịch bản lỗi

### 1. Email gửi thất bại

Khi SMTP server không phản hồi hoặc từ chối, email job retry tối đa 3 lần. Nếu tất cả đều thất bại, email được ghi lại trong log và có thể thử lại thủ công sau.

**Kết quả:** Notification vẫn được lưu trong database, sinh viên có thể xem qua in-app

### 2. QR code generation lỗi

Nếu không thể tạo QR code, email vẫn được gửi nhưng không có đính kèm QR code. Sinh viên nhận được chuỗi QR code text để quét thủ công nếu cần.

**Kết quả:** Email gửi đi với chuỗi QR code dạng text

### 3. Idempotency key trùng

Nếu job được retry (Bull Queue tự động), idempotency key giúp tránh gửi duplicate email.

**Kết quả:** Email chỉ gửi 1 lần cho mỗi sự kiện

## Tiêu chí chấp nhận

### Kiểm thử chức năng

- Đăng ký thành công → Email gửi với QR code đính kèm
- Thanh toán thất bại → Email thông báo lỗi
- Vé hủy → Email xác nhận hủy
- Retry email 3 lần nếu SMTP lỗi
- Idempotency key chống duplicate

### Kiểm thử đáng tin cậy

- 1000 notification đồng thời → Tất cả được queue
- SMTP down → Retry tối đa 3 lần, log để xử lý thủ công
- QR code generation lỗi → Email vẫn gửi, chuỗi text QR
