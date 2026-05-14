import http from 'k6/http';
import { check } from 'k6';

// 1. CẤU HÌNH: 15 người dùng ảo (VUs), tổng cộng bắn đúng 15 phát đạn
export const options = {
  vus: 15,
  iterations: 15, // Đảm bảo mỗi người chỉ bắn đúng 1 phát rồi dừng
};


export default function () {
  // 2. MỤC TIÊU: API Đăng ký (Nhớ trỏ đúng cổng Nginx localhost)
  const url = 'http://localhost/api/registrations'; 
  
  // ⚠️ QUAN TRỌNG: Bạn hãy dán ID của cái Workshop chỉ có 1 chỗ trống vào đây
  const workshopId = '0f40932b-338a-4169-a08d-83a38490efcc'; 

  const payload = JSON.stringify({ 
    workshopId: workshopId 
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      // Không cần truyền Authorization (Token) nữa vì chúng ta đã tắt Guard tạm thời
    },
  };

  // 3. 15 NGƯỜI CÙNG NHAU BẤM NÚT "MUA" TRONG CÙNG 1 MILI-GIÂY
  const res = http.post(url, payload, params);

  // 4. PHÂN LOẠI KẾT QUẢ ĐỂ KIỂM TRA ĐỘ "CỨNG" CỦA Ổ KHÓA
  check(res, {
    '🎉 CƯỚP ĐƯỢC VÉ (200/201 OK)': (r) => r.status === 200 || r.status === 201,
    '❌ HẾT VÉ (409 Conflict)': (r) => r.status === 409,
    '⚠️ LỖI SERVER (500) - Khóa bị thủng!': (r) => r.status === 500,
  });
}