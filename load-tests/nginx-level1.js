import http from 'k6/http';
import { check, sleep } from 'k6';

// 1. CẤU HÌNH CHIẾN DỊCH BẮN PHÁ
export const options = {
  vus: 10,          // 10 Người dùng ảo (Virtual Users) cùng lúc
  duration: '10s',  // Xả đạn liên tục trong 10 giây
};

export default function () {
  // 2. MỤC TIÊU (Sửa lại port nếu Nginx của bạn đang chạy port khác 80)
  const url = 'http://localhost/api/workshops?page=1&limit=24';

  // 3. GỬI REQUEST (Không thèm gắn Token)
  const res = http.get(url);

  // 4. KIỂM TRA MÃ LỖI (Phân loại đạn)
  check(res, {
    'Lọt qua cổng Nginx (200 hoặc 401)': (r) => r.status === 200 || r.status === 401,
    
    // NƯỚC TRÀN XÔ: Nginx phát hiện IP này gọi quá 10 req/s và vượt quá burst 20.
    // => Nginx đá văng ngay từ vòng gửi xe!
    'BỊ NGINX CHẶN ĐỨNG (Mã 429 - Thành công!)': (r) => r.status === 429,
  });

  sleep(0.05); 
}