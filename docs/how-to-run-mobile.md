# HƯỚNG DẪN CHẠY MOBILE CLIENT (EXPO) CHO TEAM

## Bước 1: Thêm Android Emulator vào biến môi trường (PATH)

Việc này giúp Windows hiểu được các câu lệnh gọi máy ảo từ Terminal.

1. Mở File Explorer hoặc bấm Window + R, copy và dán đường dẫn này vào thanh địa chỉ để xác định thư mục: `%LOCALAPPDATA%\Android\Sdk\emulator`. Bấm chuột phải -> properties -> copy đường dẫn trong mục "Location" (Ví dụ: `C:\Users\Admin\AppData\Local\Android\Sdk\emulator`). **Phải có đuôi là `emulator` chứ không phải `emulator.exe`.**
2. Bấm phím **Windows**, gõ **Environment Variables** và chọn _Edit the system environment variables_.
3. Bấm nút **Environment Variables...** ở góc dưới cùng bên phải.
4. Tại ô **System variables** (khung bên dưới), tìm dòng **`Path`** và bấm **Edit**.
5. Bấm **New** và dán đường dẫn bạn vừa lấy ở mục 1 vào (Ví dụ: `C:\Users\Admin\AppData\Local\Android\Sdk\emulator`). Thêm luôn cả thư mục `platform-tools` (Ví dụ: `C:\Users\Admin\AppData\Local\Android\Sdk\platform-tools`) để có thể sử dụng lệnh `adb` sau này.
6. Nhấn **OK** để lưu lại toàn bộ. Đóng và mở lại VS Code để Terminal nhận diện PATH mới.

## Bước 2: Cài đặt & Cấu hình Extension "Android iOS Emulator"

Extension này giúp bật máy ảo nhanh bằng 1 click ngay trong giao diện VS Code.

1. Trong VS Code, mở tab **Extensions** (`Ctrl + Shift + X`), tìm và cài đặt **Android iOS Emulator** của **Diemas Michiels**.
2. Bấm `Ctrl + ,` để mở trang Cài đặt (Settings), gõ vào ô tìm kiếm: `Emulator Path`.
3. Xóa đường dẫn mặc định (thường là của máy Mac) và dán đường dẫn Windows của bạn vào:
   `C:\Users\<Tên_User_Của_Bạn>\AppData\Local\Android\Sdk\emulator`
   _(Lưu ý: Phải thay `<Tên_User_Của_Bạn>` cho đúng với máy tính của bạn và **TUYỆT ĐỐI KHÔNG** thêm chữ `\emulator.exe` ở cuối)._ -> giống cái gán vào PATH ở bước 1.

## Bước 3: Khởi động máy ảo (Emulator)

Quy tắc bắt buộc: Luôn phải bật máy ảo lên và chờ nó load xong màn hình chính trước khi tiến hành chạy code.

1. Bấm tổ hợp phím `Ctrl + Shift + P` để mở Command Palette.
2. Gõ `Emulator: Run` và nhấn Enter.
3. Chọn máy ảo Android của bạn (Ví dụ: `Pixel_7_API_34`) từ danh sách xổ xuống. Máy ảo sẽ tự động khởi động dưới dạng một cửa sổ độc lập.

## Bước 4: Nạp code (Khởi chạy App với Expo)

Sau khi thiết bị giả lập đã sẵn sàng, chúng ta tiến hành "bơm" dự án lên máy.

1. Mở Terminal mới trong VS Code và di chuyển vào thư mục dự án Mobile:

   ```bash
   cd client-mobile
   ```

2. Cài đặt các gói tài nguyên
   ```bash
   npm install
   ```
3. Khởi động môi trường Expo
   ```bash
   npx expo start
   ```
4. Bấm phím 'a' trên bàn phím để kết nối với máy ảo Android. App sẽ tự động được cài đặt và chạy trên máy ảo.

5. **CÁI APP CỦA MÌNH SẼ NẰM TRONG MỘT CÁI APP TRUNG GIAN LÀ 'EXPO GO'. Vào app 'Expo Go' -> chọn app của mình để mở.**
