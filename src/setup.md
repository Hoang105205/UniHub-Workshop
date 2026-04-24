# 🚀 Hướng dẫn thiết lập dự án UniHub Workshop

Tài liệu này giúp các thành viên trong team thiết lập môi trường phát triển từ con số 0 để chuẩn bị cho dự án UniHub Workshop.

---

## 📋 1. Yêu cầu hệ thống (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy bạn đã cài đặt các công cụ sau:

1.  **Node.js (v18 trở lên):** Kiểm tra bằng cách gõ `node -v` trong terminal.
2.  **Git:** Để quản lý mã nguồn và clone repository.
3.  **Docker Desktop:** Bắt buộc để chạy **PostgreSQL** và **Redis** thông qua Docker Compose.
4.  **Expo Go (Trên điện thoại):** Tải từ App Store hoặc Google Play để chạy thử ứng dụng Mobile.

---

## 📥 2. Clone Dự án

Mở Terminal và chạy các lệnh sau:

```bash
# Clone dự án từ GitHub
git clone <link-repo-cua-ban>

# Truy cập vào thư mục dự án
cd unihub-workshop
```

## ⚙️ 3. Thiết lập Backend (NestJS)

1.  Vào thư mục server:
    ```bash
    cd server
    ```
2.  Cài đặt dependencies:
    ```bash
    npm install
    ```
3.  Chạy Database & Redis (Docker):

    ```bash
    docker-compose up -d
    ```

4.  Khởi tạo Database (Migration & Seed):

    ```bash
    npm run db:migrate
    npm run db:seed
    ```

5.  Chạy server:
    ```bash
    npm run start:dev
    ```
    API sẽ chạy tại: http://localhost:4000.

## 🌐 4. Thiết lập Frontend Web (Next.js 14)

1.  Mở terminal mới và vào thư mục web:

```Bash
cd web-client
```

2.  Cài đặt thư viện:

```Bash
npm install
```

3.  Chạy server:

```Bash
npm run dev
```

Giao diện web sẽ hiển thị tại: http://localhost:3000.

## 📱 5. Thiết lập Mobile App (React Native/Expo)

1.  Mở terminal mới và vào thư mục mobile:

```Bash
cd mobile-client
```

2.  Cài đặt thư viện:

```Bash
npm install
```

3.  Khởi chạy Expo:

```Bash
npx expo start
```

Dùng ứng dụng Expo Go trên điện thoại để quét mã QR.

## 🔑 6. Tài khoản dùng thử (Demo Accounts)

Sử dụng các tài khoản sau để kiểm thử các vai trò khác nhau trong hệ thống:

| Vai trò          | Email             | Mật khẩu    |
| ---------------- | ----------------- | ----------- |
| Sinh viên        | student1@uni.edu  | password123 |
| Ban tổ chức      | organizer@uni.edu | password123 |
| Nhân sự Check-in | staff@uni.edu     | password123 |
