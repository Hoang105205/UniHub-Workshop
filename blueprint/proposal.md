# UniHub Workshop — Project Proposal

## Vấn đề
Ban tổ chức UniHub hiện đang vận hành quy trình đăng ký workshop hoàn toàn thủ công: sinh viên điền Google Form, ban tổ chức xác nhận qua email, check-in bằng danh sách in giấy. Quy trình này bộc lộ nhiều vấn đề nghiêm trọng khi quy mô tăng lên cũng như gặp nhiều trường hợp phức tạp:

hông có seat count real-time -> Oversell — workshop 60 chỗ nhận 80 đăng ký vì form không tự đóng
Không xử lý concurrent booking -> Race condition — 2 người cùng nhận "chỗ cuối cùng", gây tranh chấp tại sự kiện
Không có hệ thống check-in -> Không biết ai thực sự tham dự, báo cáo sponsor thiếu dữ liệu
Không hỗ trợ offline -> Nhân sự check-in mất mạng tại hội trường → tắc nghẽn, xếp hàng dài
Không scale	12K users đăng ký đồng thời trong vài phút đầu → form lag, timeout, mất đăng ký
Quy trình thủ công tốn nhân lực	Ban tổ chức mất 3–4 giờ/workshop để xử lý email, đối soát danh sách

## Mục tiêu

| # | Mục tiêu | Chỉ số đo lường |
|---|----------|-----------------|
| 1 | Chịu tải cao điểm đăng ký | 12,000 sinh viên đăng ký thành công trong 10 phút đầu, không timeout |
| 2 | Không oversell | 0% trường hợp 2 người cùng nhận một chỗ (đảm bảo tính toàn vẹn dữ liệu) |
| 3 | Hệ thống luôn sẵn sàng | 99.9% uptime cho luồng xem workshop — ngay cả khi payment gateway hoặc dịch vụ phụ trợ gặp sự cố |
| 4 | Check-in không phụ thuộc mạng | Nhân sự quét QR và ghi nhận điểm danh offline, tự động sync khi có kết nối |
| 5 | Dễ mở rộng kênh thông báo | Kiến trúc notification cho phép thêm Telegram, SMS, push notification mà không cần refactor core |

---

## Người dùng và nhu cầu

### 1. Sinh viên (12,000 users)

Đối tượng chính sử dụng hệ thống với tần suất cao, đặc biệt trong khung giờ mở đăng ký.

| Nhu cầu | Mô tả |
|--------|------|
| Xem lịch workshop real-time | Biết ngay workshop nào còn chỗ, tránh mất thời gian đăng ký rồi bị từ chối |
| Đăng ký nhanh, đơn giản | Hoàn tất trong ≤3 bước, không cần tạo tài khoản mới nếu đã có |
| Nhận QR code ngay lập tức | Có mã check-in ngay sau khi đăng ký thành công, không chờ email thủ công |
| Thông báo xác nhận đa kênh | Nhận confirmation qua email + in-app notification để không bỏ lỡ |
| Hủy/đổi workshop linh hoạt | Tự hủy đăng ký trước deadline để nhường chỗ cho người khác |

---

### 2. Ban tổ chức (5–10 users)

Quản lý nội dung workshop, theo dõi vận hành, và xuất báo cáo cho sponsor.

| Nhu cầu | Mô tả |
|--------|------|
| CRUD workshop dễ dàng | Tạo, sửa, hủy workshop với giao diện trực quan, không cần kỹ thuật |
| Dashboard real-time | Theo dõi số lượng đăng ký, tỷ lệ chỗ trống từng workshop theo thời gian thực |
| Export thống kê | Xuất CSV/Excel danh sách đăng ký, điểm danh để báo cáo sponsor |
| Import dữ liệu cũ | Nhập danh sách sinh viên từ hệ thống legacy qua CSV với error handling rõ ràng |
| AI summary | Tự động tóm tắt nội dung workshop từ PDF tài liệu đính kèm |

---

### 3. Nhân sự check-in (20–30 users)

Tình nguyện viên hoặc nhân viên tại sự kiện, làm việc trong điều kiện mạng không ổn định.

| Nhu cầu | Mô tả |
|--------|------|
| Quét QR nhanh | Xác nhận điểm danh trong ≤2 giây/người, không tắc nghẽn hàng chờ |
| Hoạt động offline | Tiếp tục check-in khi mất WiFi/4G tại hội trường đông người |
| Đồng bộ tự động | Dữ liệu offline tự sync lên server khi có mạng, không cần thao tác thủ công |
| Xử lý edge case | Nhận cảnh báo khi QR không hợp lệ, đã check-in trước đó, hoặc sai workshop |

## Phạm vi

### TRONG phạm vi
- Toàn bộ tính năng nghiệp vụ trong đề bài
-Rate limiting, Circuit breaker, Idempotency
- Offline check-in + sync
- Multi-channel notification (email + in-app)
- AI summary từ PDF
- CSV import với error handling

### NGOÀI phạm vi
- Real payment gateway integration (dùng mock)
- Deploy lên cloud production (chỉ Docker local)
- Real-time WebSocket cho seat count (dùng polling)
- Mobile push notification (chỉ in-app + email)
- Telegram bot (để extensible nhưng không implement)

## Rủi ro và ràng buộc kỹ thuật

## Rủi ro kỹ thuật

| Rủi ro | Tác động | Giải pháp ngăn ngừa (Mitigation) |
|--------|----------|----------------------------------|
| Race Condition | 2 sinh viên cùng chiếm 1 chỗ cuối cùng (Oversell). | Sử dụng Pessimistic Locking (FOR UPDATE) tại tầng Database. |
| Traffic Spike | 12K users dồn vào 3 phút đầu gây sập API/DB. | Triển khai Token Bucket Rate Limiting bằng Redis để làm mượt (smooth) lưu lượng. |
| Double Spending | User nhấn "Thanh toán" nhiều lần gây trừ tiền trùng. | Bắt buộc sử dụng Idempotency Key trong mỗi request thanh toán. |
| Dependency Failure | Cổng thanh toán hoặc AI API bị down kéo sập cả hệ thống. | Triển khai Circuit Breaker để ngắt mạch và phản hồi lỗi ngay lập tức cho user. |
| Network Instability | Mất mạng tại hội trường khiến không thể check-in. | Cơ chế Offline-first với Expo SQLite; tự động sync khi có tín hiệu mạng trở lại. |