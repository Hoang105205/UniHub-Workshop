# Đặc tả: Authentication & Authorization (RBAC)

## Mô tả

Hệ thống xác thực dựa trên **JWT (JSON Web Token)** với 3 vai trò: **Student**, **Organizer**, và **Staff**. Mỗi vai trò có quyền hạn khác nhau được kiểm soát bởi **Role-Based Access Control (RBAC)**.

**Mục tiêu:**

- Xác thực người dùng an toàn qua JWT
- Phân quyền rõ ràng theo vai trò
- Hỗ trợ đăng ký tự động cho sinh viên đã có trong CSV import
- Bảo vệ API endpoints theo ma trận phân quyền

---

## Luồng chính

### 1. Đăng ký (Registration)

**Actor:** Sinh viên mới

**Precondition:**

- Student ID phải tồn tại trong bảng `users` (đã được import từ CSV)
- Email chưa được đăng ký

**Flow:**

```
1. User POST /auth/register
   Body: {
     "email": "student@uni.edu",
     "password": "SecurePass123",
     "studentId": "SV001",
   }

2. Backend validate:
   a. Check email format (RFC 5322)
   b. Check password strength:
      - Minimum 8 characters
      - Ít nhất 1 chữ hoa, 1 chữ thường, 1 số
   c. Query DB: SELECT * FROM users WHERE student_id = ? AND email = ?
      - Nếu NOT FOUND → 403 Forbidden "Student ID not in system"
      - Nếu FOUND và email khớp và chưa có password → OK
      - Nếu FOUND và email khớp và đã có password → 409 Conflict "Student ID already registered"

3. Hash password với bcrypt (salt rounds = 10)
   hashed_password = bcrypt.hash(password, 10)

4. Update user record:
   UPDATE users
   SET password_hash = ?, updated_at = NOW()
   WHERE student_id = ? AND email = ?

5. Generate JWT token:
   payload = {
     sub: user.id,
     email: user.email,
     role: user.role,
     iat: Math.floor(Date.now() / 1000),
     exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)  // 7 days
   }
   token = jwt.sign(payload, JWT_SECRET)

6. Set cookie:
    Set-Cookie: accessToken=token; HttpOnly; Secure; SameSite=Strict; Max-Age=604800 (7 days)

7. Response 201 Created:
   {
     "accessToken": "eyJhbGc...",
     "user": {
       "id": "uuid",
       "email": "student@uni.edu",
       "fullName": "Nguyễn Văn A",
       "role": "student"
     }
   }
```

**Postcondition:**

- User có thể login bằng email/password
- Token valid trong 7 ngày

---

### 2. Đăng nhập (Login)

**Actor:** Tất cả người dùng

**Flow:**

```
1. User POST /auth/login
   Body: {
     "email": "student@uni.edu",
     "password": "SecurePass123"
   }

2. Backend query:
   user = SELECT * FROM users WHERE email = ?

3. Validate:
   a. Nếu user NOT FOUND → 401 Unauthorized "Invalid credentials"
   b. Verify password:
      is_valid = bcrypt.compare(password, user.password_hash)
      Nếu !is_valid → 401 Unauthorized "Invalid credentials"

4. Generate JWT token (same as registration)

5. Set cookie (same as registration)

6. Response 200 OK:
   {
     "accessToken": "eyJhbGc...",
     "user": { ... }
   }
```

**Rate Limiting:**

- Max 5 failed attempts / 15 minutes per email
- Sau 5 lần fail → Lock account 15 phút hoặc yêu cầu CAPTCHA

---

### 3. Xác thực Request (JWT Verification)

**Flow cho mọi protected endpoint:**

```
1. Client gửi request:
   GET /workshops
   Headers: {
     "Authorization": "Bearer eyJhbGc..."
   }

2. JwtAuthGuard middleware:
   a. Extract token từ header
      token = request.headers.authorization.split(' ')[1]

   b. Verify token:
      try {
        payload = jwt.verify(token, JWT_SECRET)
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          → 401 "Token expired"
        }
        → 401 "Invalid token"
      }

   c. Attach user to request:
      request.user = {
        id: payload.user.id,
        email: payload.user.email,
        role: payload.user.role
      }

3. Continue to next middleware/handler
```

---

### 4. Kiểm tra phân quyền (RBAC Guard)

**Flow:**

```
1. RolesGuard check required roles:
   requiredRoles = @Roles decorator metadata
   // VD: @Roles('organizer', 'staff')

2. Compare with user role:
   if (!requiredRoles.includes(request.user.role)) {
     → 403 Forbidden "Insufficient permissions"
   }

3. Allow request to proceed
```

---

## Ma trận phân quyền (Permission Matrix)

| Resource             | Endpoint                    | Student | Organizer | Staff |
| -------------------- | --------------------------- | ------- | --------- | ----- |
| **Workshops**        |                             |         |           |       |
| Xem danh sách        | `GET /workshops`            | ✅      | ✅        | ❌    |
| Xem chi tiết         | `GET /workshops/:id`        | ✅      | ✅        | ❌    |
| Tạo mới              | `POST /workshops`           | ❌      | ✅        | ❌    |
| Cập nhật             | `PUT /workshops/:id`        | ❌      | ✅        | ❌    |
| Xóa                  | `DELETE /workshops/:id`     | ❌      | ✅        | ❌    |
| **Registrations**    |                             |         |           |       |
| Đăng ký workshop     | `POST /registrations`       | ✅      | ❌        | ❌    |
| Xem đăng ký của mình | `GET /registrations/my`     | ✅      | ❌        | ❌    |
| Hủy đăng ký          | `DELETE /registrations/:id` | ✅      | ❌        | ❌    |
| **Check-ins**        |                             |         |           |       |
| Check-in             | `POST /check-ins`           | ❌      | ❌        | ✅    |
| Batch sync           | `POST /check-ins/batch`     | ❌      | ❌        | ✅    |
| **Analytics**        |                             |         |           |       |
| Dashboard            | `GET /admin/analytics`      | ❌      | ✅        | ❌    |

---

## Kịch bản lỗi

### 1. Student ID không tồn tại

**Trigger:** Đăng ký với student ID chưa được import từ CSV

**Response:**

```json
{
  "statusCode": 403,
  "message": "Student ID not found in system. Please contact administrator.",
  "error": "Forbidden"
}
```

**Action:** User liên hệ ban tổ chức để kiểm tra hoặc chờ CSV import tiếp theo

---

### 2. Email đã được đăng ký

**Trigger:** Đăng ký với email đã tồn tại

**Response:**

```json
{
  "statusCode": 409,
  "message": "Email already registered. Please login or reset password.",
  "error": "Conflict"
}
```

**Action:** User chuyển sang login

---

### 3. Password yếu

**Trigger:** Password không đủ mạnh

**Response:**

```json
{
  "statusCode": 400,
  "message": "Password must be at least 8 characters with uppercase, lowercase, and number",
  "error": "Bad Request"
}
```

**Action:** User nhập lại password mạnh hơn

---

### 4. Token expired

**Trigger:** Request sau 7 ngày từ khi login

**Response:**

```json
{
  "statusCode": 401,
  "message": "Token expired. Please login again.",
  "error": "Unauthorized"
}
```

**Action:** Frontend redirect về /login, xóa token cũ

---

### 5. Invalid token (giả mạo)

**Trigger:** Token bị modify hoặc sai secret key

**Response:**

```json
{
  "statusCode": 401,
  "message": "Invalid token",
  "error": "Unauthorized"
}
```

**Action:** Frontend redirect về /login

---

### 6. Insufficient permissions

**Trigger:** Student cố gọi `POST /workshops`

**Response:**

```json
{
  "statusCode": 403,
  "message": "You do not have permission to access this resource",
  "error": "Forbidden"
}
```

**Action:** Frontend hiển thị error, không cho access

---

### 7. Too many login attempts

**Trigger:** 5 lần login sai trong 15 phút

**Response:**

```json
{
  "statusCode": 429,
  "message": "Too many failed login attempts. Please try again in 15 minutes.",
  "error": "Too Many Requests",
  "retryAfter": 900
}
```

**Action:** User đợi hoặc reset password

---

## Ràng buộc

### Bảo mật

| Ràng buộc                 | Giá trị                            |
| ------------------------- | ---------------------------------- |
| Password minimum length   | 8 characters                       |
| Password complexity       | 1 uppercase, 1 lowercase, 1 number |
| Bcrypt salt rounds        | 10                                 |
| JWT algorithm             | HS256 (HMAC SHA-256)               |
| JWT expire time           | 7 days                             |
| JWT secret minimum length | 32 characters                      |
| Rate limit - Login        | 5 attempts / 15 minutes            |
| Rate limit - Registration | 3 attempts / 1 hour                |

### Performance

| Ràng buộc                 | Giá trị       |
| ------------------------- | ------------- |
| JWT verification time     | < 10ms        |
| Login response time       | < 200ms (P95) |
| Password hashing time     | < 100ms       |
| Concurrent login requests | 1000 req/s    |

### Compliance

- **OWASP Top 10:** Tuân thủ best practices cho authentication
- **GDPR:** Password không được log, chỉ hash được lưu
- **Session Management:** Không dùng session server-side (stateless JWT)

---

## Tiêu chí chấp nhận

### Functional Tests

- [ ] **TC-AUTH-001:** Đăng ký với student ID hợp lệ → Success (201)
- [ ] **TC-AUTH-002:** Đăng ký với student ID không tồn tại → Forbidden (403)
- [ ] **TC-AUTH-003:** Đăng ký với email đã dùng → Conflict (409)
- [ ] **TC-AUTH-004:** Đăng ký với password yếu → Bad Request (400)
- [ ] **TC-AUTH-005:** Login với credentials đúng → Success với JWT (200)
- [ ] **TC-AUTH-006:** Login với password sai → Unauthorized (401)
- [ ] **TC-AUTH-007:** Login với email không tồn tại → Unauthorized (401)
- [ ] **TC-AUTH-008:** Access protected endpoint với valid token → Success
- [ ] **TC-AUTH-009:** Access protected endpoint không có token → Unauthorized (401)
- [ ] **TC-AUTH-010:** Access protected endpoint với expired token → Unauthorized (401)
- [ ] **TC-AUTH-011:** Student cố tạo workshop → Forbidden (403)
- [ ] **TC-AUTH-012:** Organizer tạo workshop → Success (201)
- [ ] **TC-AUTH-013:** Staff check-in sinh viên → Success (201)
- [ ] **TC-AUTH-014:** Student cố check-in → Forbidden (403)

### Security Tests

- [ ] **TC-SEC-001:** Token với signature sai → Rejected (401)
- [ ] **TC-SEC-002:** Token với payload modified → Rejected (401)
- [ ] **TC-SEC-003:** 5 login attempts sai → Rate limit (429)
- [ ] **TC-SEC-004:** Password hash không bao giờ xuất hiện trong response
- [ ] **TC-SEC-005:** JWT secret không hard-code trong code

### Performance Tests

- [ ] **TC-PERF-001:** Login với 100 concurrent users → P95 < 200ms
- [ ] **TC-PERF-002:** JWT verification → < 10ms average
- [ ] **TC-PERF-003:** Password hashing → < 100ms

---

## Implementation Notes

### JWT Payload Structure

```typescript
interface JwtPayload {
  id: string; // User ID (UUID)
  email: string; // User email
  role: "student" | "organizer" | "staff";
  iat: number; // Issued at (Unix timestamp)
  exp: number; // Expiration (Unix timestamp)
}
```

### NestJS Guards Setup

```typescript
// jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  handleRequest(err, user, info) {
    if (err || !user) {
      throw new UnauthorizedException("Invalid or expired token");
    }
    return user;
  }
}

// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>("roles", [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}

// Usage in controller
@Controller("workshops")
export class WorkshopsController {
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("organizer")
  async create(@Body() dto: CreateWorkshopDto) {
    // Only organizers can access
  }
}
```

### Frontend Token Storage

**Khuyến nghị:**

- **Không dùng localStorage** (dễ bị XSS)
- **Dùng httpOnly cookie** (server set, JS không đọc được)

**Cho đồ án này:**

- **Dùng httpOnly cookie** (server set, JS không đọc được)
- Implement logout để xóa token

```typescript
// lib/auth.ts
export const authService = {
  login: async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    localStorage.setItem("accessToken", data.accessToken);
    return data;
  },

  logout: () => {
    localStorage.removeItem("accessToken");
  },

  getToken: () => {
    return localStorage.getItem("accessToken");
  },
};
```

#### 1. Security & Guards (NestJS)

- **JwtStrategy:** Khi extract payload, chỉ lấy `id` và `role`. Tránh query DB lại trong Strategy để tối ưu performance cho 1.000 req/s.
- **RolesGuard:** Sử dụng `Reflector` để lấy metadata. Đảm bảo Guard này nằm SAU `JwtAuthGuard` trong mảng `providers`.
- **Bcrypt:** Dùng `hashSync` có thể gây block Event Loop nếu lượng request quá lớn. Khuyến khích dùng `await bcrypt.hash()`.

#### 2. Xử lý Rate Limiting (Throttler)

- Cài đặt `@nestjs/throttler` và kết nối với **Redis**.
- **Auth limit:** 5 requests / 15 phút cho `/auth/login`.
- Điều này để đảm bảo khi 12.000 sinh viên ùa vào, server không bị chết connection pool.

#### 3. Cookie & CORS (Next.js 14 Integration)

- **Backend:** Phải set `credentials: true` trong cấu hình CORS.
- **Frontend:** Khi dùng `axios` hoặc `fetch`, phải đính kèm `credentials: 'include'`.
- **Domain:** Nếu chạy local, để domain là `localhost`. Khi lên Docker, dùng domain của service.

#### 4. Data Consistency

- Khi sinh viên đăng ký thành công, hãy đảm bảo luồng `UPDATE users SET password_hash` nằm trong một Transaction cùng với các logic khởi tạo profile khác (nếu có).

---

## Dependencies

- `@nestjs/jwt` - JWT generation & verification
- `@nestjs/passport` - Authentication strategies
- `passport-jwt` - JWT strategy for Passport
- `bcrypt` - Password hashing
- `class-validator` - DTO validation
