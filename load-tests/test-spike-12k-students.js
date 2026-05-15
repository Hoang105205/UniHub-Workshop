import http from "k6/http";
import { check, sleep } from "k6";
import crypto from "k6/crypto";

// 1. DỊCH BÀI TOÁN THÀNH CẤU HÌNH STAGES
export const options = {
  stages: [
    // Bão tố 3 phút đầu: Đẩy số lượng User ảo (VUs) lên 40,
    // mỗi VU bắn 1 req/s -> Đạt tốc độ 40 RPS (~7200 req trong 3 phút)
    { duration: "10s", target: 40 }, // Khởi động nhanh
    { duration: "2m50s", target: 40 }, // Duy trì bão

    // Dư âm 7 phút sau: Hạ xuống 11 VUs -> Đạt tốc độ ~11 RPS (~4800 req trong 7 phút)
    { duration: "7m", target: 11 },
  ],
  thresholds: {
    // Để PASS bài test, hệ thống không được phép sập (lỗi 500 phải = 0)
    "http_req_failed{status:500}": ["rate==0"],
  },
};

// Hàm tạo IP giả để lừa Nginx (Giả lập 12.000 máy tính khác nhau)
function getRandomIP() {
  return `${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

export default function () {
  // Thay URL này bằng API bạn muốn test (VD: Lấy danh sách hoặc Đăng ký)
  const url = "http://localhost/api/workshops";

  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhjZDc0MjVlLWQyYmItNDExMy1hMmZiLWIxMzFjYmRjMWIwOSIsImVtYWlsIjoidHJhbi50aGkuYkBzdHVkZW50LmVkdS52biIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzc4NzMzMDIyLCJleHAiOjE3NzkzMzc4MjJ9.I0gRZw1FNlqDYwsOoVVn69JU6U3_zOLPe7527bil3uE";

  const fakeIp = getRandomIP();

  const params = {
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": fakeIp,
      "X-Real-IP": fakeIp,
      "Authorization": `Bearer ${token}`,
    },
  };

  const res = http.get(url, params);

  // 2. NGHIỆM THU CÁC TIÊU CHÍ BẢO VỆ
  check(res, {
    "✅ Xử lý thành công (200 OK)": (r) => r.status === 200,
    "🛡️ Nginx/Throttler chặn spam (429)": (r) => r.status === 429,
    "⚖️ Hết vé công bằng (409)": (r) => r.status === 409,
    "🔥 SẬP SERVER (500)": (r) => r.status === 500,
  });

  // Nghỉ đúng 1 giây để đảm bảo 1 VU = 1 Request/giây
  sleep(1);
}
