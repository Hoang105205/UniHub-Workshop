# KẾ HOẠCH TRIỂN KHAI UNIHUB (UNI WORKSHOP)

## 1. Hai luồng vận hành chính

### Luồng 1: Coding (Development Flow)

**Bước chuẩn bị:** Đảm bảo file .env.local của Web và Mobile đang cấu hình API_URL=http://localhost:3000.

**Cách chạy**: Chạy thủ công 3 terminal riêng biệt cho Server (NestJS), Web (Next.js) và Mobile (React Native).

**Terminal 1: Khởi động Server (NestJS)**

```bash
cd server
# Chạy ở chế độ theo dõi sự thay đổi của code (watch mode)
npm run start:dev
```

**Terminal 2: Khởi động Web (Next.js)**

```bash
cd client-web
# Chạy Next.js ở môi trường development (mặc định port 3001 nếu 3000 đã bị Server chiếm)
npm run dev
```

**Terminal 3: Khởi động Mobile (React Native)**

```bash
cd client-mobile
# Khởi động Expo Server
npx expo start

# Khi Terminal hiện ra mã QR và menu điều khiển:
# - Bấm phím 'a' để tự động nạp app vào máy ảo Android (Pixel 7)
# - Hoặc bấm phím 'i' để mở trên máy ảo iOS
```

- **Kết nối**: Client gọi trực tiếp vào API qua port (VD: `localhost:3000`), sử dụng file `.env.local`.
- **Dữ liệu**: Cả team kết nối chung đến Database (Supabase) và Redis (Upstash) để đảm bảo dữ liệu mẫu (153 Users, 40 Workshops) luôn đồng bộ giữa các máy.

### Luồng 2: Giả lập Production (Docker Flow)

Sử dụng để test toàn bộ hệ thống (có Load Balancer Nginx) trước khi deploy thật.

**Bước chuẩn bị:** Đảm bảo file .env.production của hệ thống đã sẵn sàng. Đối với Mobile, cần sửa API_URL trỏ về IP mạng LAN của máy tính.

**(Mẹo: Vì các bạn thường dùng môi trường Windows để code các stack như .NET, hãy mở PowerShell và gõ lệnh ipconfig, tìm dòng IPv4 Address (VD: 192.168.1.45) để điền vào file .env của Mobile).**

**Thao tác 1: Khởi động toàn bộ cụm Server & Web**
Chỉ cần 1 Terminal duy nhất tại thư mục gốc của dự án (nơi chứa file docker-compose.yml):

```bash
# Build lại image (nếu có code mới) và chạy ngầm (-d) toàn bộ Nginx, NestJS, Next.js
docker-compose up -d --build
```

**Thao tác 2: Kiểm tra trạng thái (Tùy chọn nhưng rất cần thiết)**

```bash
# Xem danh sách các container đang chạy xem có cái nào bị "Exit" không
docker-compose ps

# Xem log trực tiếp của cụm hệ thống (Bấm Ctrl+C để thoát chế độ xem)
docker-compose logs -f
```

**Thao tác 3: Khởi động Mobile (Bên ngoài Docker)**
Giống như Luồng 1, do Mobile chạy trên thiết bị vật lý/máy ảo, bạn vẫn phải chạy thủ công:

```bash
cd client-mobile
# Khởi động môi trường Expo
npx expo start

# Bấm phím 'a' trên bàn phím để kết nối với máy ảo Android
```

**Thao tác 4: Tắt và dọn dẹp hệ thống khi test xong**

```bash
# Tắt Nginx, Server, Web và giải phóng mạng nội bộ của Docker
docker-compose down
```

**CÓ THỂ THAO TÁC VỚI DOCKER QUA DOCKER DESKTOP (GUI)**

- **Thành phần**: Docker tự động khởi tạo Nginx (Reverse Proxy), Next.js Web Server và cụm NestJS Server.
- **Kết nối**: Client gọi thông qua Nginx (Port 80), sử dụng file `.env.production`. App Mobile trỏ API URL về IP LAN của máy tính đang chạy Docker.

## 2. Giải thích Luồng Giả lập Production

- **Nginx (Entry Point)**: Đóng vai trò là "người gác cổng" duy nhất. Nginx nhận yêu cầu từ người dùng và điều hướng: nếu là truy cập giao diện sẽ gửi đến Next.js, nếu là yêu cầu dữ liệu sẽ gửi đến cụm NestJS.
- **Cân bằng tải (Load Balancing)**: Tận dụng `docker replicas` để nhân bản Server NestJS thành nhiều instance chạy song song. Nginx tự động phân phối các yêu cầu đến các instance này để tối ưu hiệu suất và tránh quá tải.
- **Xử lý tác vụ ngầm (Background Jobs)**: Hệ thống sử dụng Bull Queue kết hợp Redis Lock từ Upstash. Khi có tác vụ như gửi mail xác nhận đăng ký workshop, các instance Server sẽ tự điều phối để đảm bảo mỗi tác vụ chỉ được xử lý đúng một lần duy nhất.

---

_Lưu ý: App Mobile (React Native) không nằm trong Docker, team cần bật thủ công và cấu hình IP máy chủ chính xác._

---

# Cách triển khai background service tối ưu hơn nữa

```yaml
version: "3.8"

services:
  # 1. API Server (Nhận HTTP Request)
  uni-api:
    build: .
    image: unihub-backend:latest
    env_file: .env.production
    environment:
      - RUN_MODE=api
    deploy:
      replicas: 3 # Tự do scale API lên 3 instance

  # 2. Background Worker (Chỉ nhai Bull Queue, không mở port HTTP)
  uni-worker:
    image: unihub-backend:latest
    env_file: .env.production
    environment:
      - RUN_MODE=worker
    deploy:
      replicas: 1 # Có thể giữ 1, hoặc scale lên 2 nếu hàng đợi quá tải
    # Không cần Nginx trỏ vào đây vì nó chạy ngầm
```
