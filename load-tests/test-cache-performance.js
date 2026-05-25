import http from "k6/http";
import { check, sleep } from "k6";

// 1. CẤU HÌNH CHIẾN DỊCH (Mô phỏng đợt sóng truy cập)
export const options = {
  stages: [
    { duration: "10s", target: 200 }, // Khởi động: Tăng tốc từ 0 lên 200 user trong 10 giây
    { duration: "30s", target: 200 }, // Bão táp: Duy trì 200 user liên tục xả request trong 30 giây
    { duration: "10s", target: 0 }, // Hạ nhiệt: Giảm từ từ về 0 user trong 10 giây
  ],
  thresholds: {
    // Đặt tiêu chuẩn để k6 đánh giá PASS hay FAIL
    http_req_duration: ["p(95)<200"], // 95% số request phải phản hồi nhanh hơn 200ms
    http_req_failed: ["rate<0.01"], // Tỉ lệ lỗi (500) phải dưới 1%
  },
};

export default function () {
  // 2. MỤC TIÊU: API lấy danh sách (Đi qua Nginx Load Balancer)
  const url = "http://localhost/api/workshops?page=1&limit=24";

  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhjZDc0MjVlLWQyYmItNDExMy1hMmZiLWIxMzFjYmRjMWIwOSIsImVtYWlsIjoidHJhbi50aGkuYkBzdHVkZW50LmVkdS52biIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzc4NzMzMDIyLCJleHAiOjE3NzkzMzc4MjJ9.I0gRZw1FNlqDYwsOoVVn69JU6U3_zOLPe7527bil3uE";

  const params = {
    headers: {
      // Bạn có thể gắn token vào đây nếu API bắt buộc, nếu không cứ để trống hoặc thay token giả
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  // 3. GỬI REQUEST
  const res = http.get(url, params);

  // 4. KIỂM TRA ĐỘ MƯỢT
  check(res, {
    "Thành công (Trúng Cache) - 200 OK": (r) => r.status === 200,
  });

  // Mỗi user ảo sẽ nghỉ 1 giây trước khi F5 tiếp (Mô phỏng người thật)
  sleep(1);
}
