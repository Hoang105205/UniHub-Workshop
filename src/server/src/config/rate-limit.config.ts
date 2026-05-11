export const RATE_LIMIT = {
  // 1. Nhóm Xác thực (Đăng nhập, Đăng ký, Quên mật khẩu) - Rất nghiêm ngặt vì thường bị tấn công brute-force
  AUTH: {
    limit: 5,
    ttl: 60000,
    blockDuration: 60000 * 5, // Nếu cố tình spam login, khóa IP/User 5 phút
  },

  // 2. Nhóm Giao dịch / Mutation
  WRITE: {
    limit: 10,
    ttl: 60000,
  },

  // 3. Nhóm Truy vấn dữ liệu (Rộng rãi)
  READ: {
    limit: 30,
    ttl: 60000,
  },

  // 4. Nhóm Quản trị viên
  ADMIN: {
    limit: 20,
    ttl: 60000,
  },
};
