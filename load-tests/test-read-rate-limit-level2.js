import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1, // Dùng 1 user ảo
  iterations: 20, // Cố tình bắn 40 phát (Lớn hơn định mức 30)
};

export default function () {
  // BẮT BUỘC: Thay bằng token thật của bạn
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg5OTY1MzM5LTE0NjItNDNlOC1iYTFkLWYxODZjOWM3MTFjNiIsImVtYWlsIjoiaHV5aG9hbmdsdXUxMDVAZ21haWwuY29tIiwicm9sZSI6InN0dWRlbnQiLCJpYXQiOjE3Nzg1MTE1NDYsImV4cCI6MTc3OTExNjM0Nn0.Rk4ZuYu62IElhdGWBMxlYgoLkXH0EwUMDtAmwYak8Wk'; 
  
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  const res = http.get('http://localhost:3000/api/workshops', params);

  check(res, {
    'Qua trạm an toàn (200 OK)': (r) => r.status === 200,
    'Bị tóm cổ (429 Blocked)': (r) => r.status === 429,
  });

  // Nghỉ 0.1s giữa mỗi lượt bắn (Tốc độ 10 req/s) 
  // Để Nginx (50 req/s) không chặn, nhường sân khấu cho NestJS chặn
  sleep(0.1); 
}