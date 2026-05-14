import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1, // Dùng 1 user ảo
  iterations: 40, // Cố tình bắn 40 phát (Lớn hơn định mức 30)
};

export default function () {
  // BẮT BUỘC: Thay bằng token thật của bạn
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhjZDc0MjVlLWQyYmItNDExMy1hMmZiLWIxMzFjYmRjMWIwOSIsImVtYWlsIjoidHJhbi50aGkuYkBzdHVkZW50LmVkdS52biIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzc4NzMzMDIyLCJleHAiOjE3NzkzMzc4MjJ9.I0gRZw1FNlqDYwsOoVVn69JU6U3_zOLPe7527bil3uE'; 
  
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  const res = http.get('http://localhost/api/workshops', params);

  check(res, {
    'Qua trạm an toàn (200 OK)': (r) => r.status === 200,
    'Bị tóm cổ (429 Blocked)': (r) => r.status === 429,
  });

  // Nghỉ 0.1s giữa mỗi lượt bắn (Tốc độ 10 req/s) 
  // Để Nginx (50 req/s) không chặn, nhường sân khấu cho NestJS chặn
  sleep(0.1); 
}