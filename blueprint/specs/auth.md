# Đặc tả: Authentication & Authorization (RBAC)

## Mô tả
Hệ thống xác thực dựa trên JSON Web Token (JWT) với 3 vai trò: Student, Organizer, và Staff. Mỗi vai trò có quyền hạn khác nhau được kiểm soát bởi cơ chế Role-Based Access Control (RBAC). Hệ thống tích hợp bảo vệ tự động chống brute-force và DDoS thông qua Rate Limiting (Throttler).

## Luồng chính

### Đăng ký (Registration)
1. Sinh viên gửi yêu cầu đăng ký với email, mật khẩu, và mã sinh viên (Student ID).
2. Hệ thống kiểm tra: Email phải đúng định dạng, Student ID phải tồn tại trong dữ liệu đã import (CSV), và chưa được đăng ký trước đó.
3. Mật khẩu được mã hóa an toàn một chiều (Hashing) trước khi lưu vào cơ sở dữ liệu.
4. Hệ thống cấp phát JWT token có thời hạn 7 ngày, gắn vào HttpOnly Cookie để bảo vệ khỏi tấn công XSS, và trả về thông tin người dùng.

### Đăng nhập (Login)
1. Người dùng gửi email và mật khẩu.
2. Hệ thống tìm kiếm người dùng qua email và đối chiếu mật khẩu đã mã hóa.
3. Nếu hợp lệ, hệ thống cấp phát JWT token và HttpOnly Cookie tương tự như bước đăng ký.

### Xác thực & Phân quyền (Mọi Request)
1. Tầng bảo vệ thứ nhất (Auth Guard) trích xuất token từ Cookie hoặc Header. Kiểm tra tính hợp lệ và thời hạn của chữ ký JWT.
2. Tầng bảo vệ thứ hai (Role Guard) so sánh vai trò (Role) được giải mã từ token với yêu cầu quyền hạn của API cụ thể (Ví dụ: Chỉ Organizer mới được tạo Workshop).
3. Nếu thiếu quyền, từ chối truy cập ngay lập tức.

## Kịch bản lỗi
- **Student ID không tồn tại hoặc Email đã dùng:** Trả về lỗi 403 (Forbidden) hoặc 409 (Conflict).
- **Sai mật khẩu / Email không đúng:** Trả về lỗi 401 (Unauthorized).
- **Token hết hạn / Bị giả mạo:** Trả về lỗi 401 (Unauthorized). Yêu cầu đăng nhập lại.
- **Vượt quyền (Ví dụ: Student gọi API của Admin):** Trả về lỗi 403 (Forbidden).
- **Spam đăng nhập:** Trả về lỗi 429 (Too Many Requests).

## Ràng buộc
- **Mã hóa:** Sử dụng Bcrypt với độ phức tạp (salt rounds) là 10.
- **JWT:** Thuật toán HS256, thời hạn sống 7 ngày. Không lưu token ở LocalStorage.
- **Rate Limit (Bảo vệ API):**
  - Đăng nhập/Đăng ký: Tối đa 5 lần / 60 giây. Khóa 5 phút nếu vi phạm.
  - API Đọc (GET): Tối đa 30 lần / 60 giây.
  - API Ghi (POST/PUT/DELETE): Tối đa 10 lần / 60 giây.

## Tiêu chí chấp nhận
- [ ] Đăng ký với sinh viên hợp lệ -> 201 Created.
- [ ] Đăng ký với sinh viên không có trong CSV -> 403 Forbidden.
- [ ] Đăng nhập đúng thông tin -> 200 OK kèm Cookie chứa JWT.
- [ ] Gọi API yêu cầu quyền Organizer bằng tài khoản Student -> 403 Forbidden.
- [ ] Spam đăng nhập 6 lần trong 1 phút -> Bị chặn (429).