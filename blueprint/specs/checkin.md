# Đặc tả: Check-in Offline & Batch Sync

## 1. Mô tả

Hệ thống check-in dành cho nhân sự (Staff) tại sự kiện, được thiết kế đặc biệt để hoạt động trơn tru ngay cả khi **mất mạng hoàn toàn**. Ứng dụng sử dụng **Expo SQLite** để lưu trữ dữ liệu cục bộ và **NetInfo** để phát hiện kết nối, từ đó tự động đồng bộ hóa.

**Mục tiêu:**

- Tốc độ quét QR check-in sinh viên cực nhanh (≤ 2 giây/người).
- Đảm bảo tính sẵn sàng 100% trong môi trường offline (không có internet).
- Cơ chế tự động đồng bộ (Auto-sync) ngầm khi thiết bị có mạng trở lại.
- Xử lý mượt mà các xung đột (conflict) dữ liệu (VD: 2 nhân sự vô tình quét cùng 1 QR khi đang offline).

**Kiến trúc tổng quan:**

- **Mobile App (React Native + Expo):** Xử lý giao diện và logic.
- **Camera API:** Chịu trách nhiệm nhận diện và giải mã QR code.
- **SQLite:** Cơ sở dữ liệu local lưu tạm các lượt check-in chưa đồng bộ.
- **NetInfo:** Lắng nghe trạng thái mạng (Online/Offline).
- **Sync Service:** Service chạy ngầm đóng gói dữ liệu thành các đợt (Batch) đẩy lên Server.

---

## 2. Luồng xử lý chính

### 2.1. Khởi tạo Ứng dụng & Cơ sở dữ liệu

**Trigger:** Nhân sự mở app lần đầu tiên hoặc mở lại app.

**Các bước thực hiện:**

1. **Kiểm tra trạng thái:** Hệ thống kiểm tra xác thực (JWT Token) của Staff.
2. **Khởi tạo Local DB:** Ứng dụng tự động kiểm tra và tạo bảng `pending_checkins` trong SQLite nếu chưa có.
3. **Định danh thiết bị:** Ứng dụng kiểm tra Device ID trong bộ nhớ máy. Nếu chưa có, tạo một UUID mới và lưu vĩnh viễn (dùng để truy vết sau này).
4. **Lắng nghe mạng:** Kích hoạt NetInfo. Bất cứ khi nào mạng chuyển sang trạng thái "Connected", hệ thống tự động kích hoạt luồng Sync.
5. **Hiển thị giao diện:** Mở màn hình Camera toàn màn hình, kèm theo huy hiệu (badge) báo số lượng check-in đang chờ đồng bộ và trạng thái mạng hiện tại.

### 2.2. Check-in Online (Normal Flow)

**Precondition:** Thiết bị đang có internet, Staff đã đăng nhập.

**Các bước thực hiện:**

1. **Quét mã:** Staff đưa camera hướng vào QR code của sinh viên.
2. **Giải mã & Khóa máy quét:** App giải mã QR, tạm thời vô hiệu hóa máy quét (trong 2s) để chống quét đúp (duplicate scan).
3. **Gửi API lên Backend:** App gọi API `/check-ins` kèm mã QR và thời gian quét thực tế.
4. **Kiểm tra nghiệp vụ (Backend):** Backend xác minh QR hợp lệ, sinh viên đã đăng ký thành công, chưa check-in trước đó và đúng khung giờ sự kiện.
5. **Phản hồi UI:** Nếu thành công, app phát âm thanh thông báo (beep), chớp màn hình màu xanh lá, hiển thị tên + MSSV của sinh viên và tự động tắt thông báo sau 2 giây.
6. **Fallback (Dự phòng):** Nếu API báo lỗi do mạng hoặc quá hạn thời gian (timeout), tự động chuyển sang luồng **Check-in Offline**.

### 2.3. Check-in Offline (Offline Mode)

**Trigger:** Thiết bị không có mạng hoặc API Online bị timeout.

**Các bước thực hiện:**

1. **Phân tích QR:** Đọc dữ liệu từ mã QR.
2. **Kiểm tra trùng lặp cục bộ:** Kiểm tra trong SQLite xem mã QR này đã được quét trên cùng thiết bị này chưa. Nếu đã có, cảnh báo cho Staff và bỏ qua.
3. **Lưu trữ Local:** Lưu dữ liệu quét (QR, thời gian quét, Device ID, Staff ID) vào bảng `pending_checkins` với trạng thái `synced = 0`.
4. **Phản hồi UI:** Phát âm thanh (beep), chớp màn hình màu vàng (để phân biệt với Online), hiển thị thông báo "Đã lưu nội bộ" và tăng số đếm trên huy hiệu pending.

### 2.4. Đồng bộ hàng loạt (Batch Sync)

**Trigger:** NetInfo phát hiện có internet VÀ có dữ liệu đang chờ đồng bộ trong SQLite.

**Các bước thực hiện:**

1. **Trích xuất dữ liệu:** Lấy tối đa 50 bản ghi cũ nhất chưa được đồng bộ từ SQLite.
2. **Hiển thị UI:** Bật Toast thông báo đang tiến hành đồng bộ kèm thanh tiến trình.
3. **Gửi API Batch:** Gửi toàn bộ 50 bản ghi lên Backend qua 1 request duy nhất.
4. **Xử lý Backend:** Backend duyệt qua từng QR. Nó kiểm tra tính hợp lệ và sự trùng lặp (ví dụ: bị thiết bị khác quét mất). Kết quả trả về là một mảng báo cáo chi tiết thành công/thất bại cho từng QR cụ thể.
5. **Cập nhật Local:** App nhận kết quả. QR nào thành công -> đánh dấu `synced = 1`. QR nào lỗi logic -> lưu lại câu thông báo lỗi để Staff xem.
6. **Dọn dẹp:** Một tiến trình ngầm sẽ xóa các bản ghi đã đồng bộ thành công trên thiết bị nếu chúng cũ hơn 7 ngày để giải phóng dung lượng.

### 2.5. Xem danh sách Pending Check-ins

**Trigger:** Staff bấm vào huy hiệu "⏳ X pending" trên màn hình chính.

**Các bước thực hiện:**

1. Ứng dụng truy vấn SQLite để lấy danh sách các bản ghi chưa đồng bộ hoặc đồng bộ lỗi.
2. Hiển thị danh sách kèm thời gian quét và trạng thái cụ thể.
3. Staff có thể thực hiện các thao tác thủ công: **Sync Now** (Đồng bộ ép buộc), **Retry** (Thử lại 1 item lỗi), **Delete** (Xóa bản ghi), hoặc **Clear All Synced**.

---

## 3. Kịch bản lỗi

### 3.1. QR code không hợp lệ khi đang Offline

- **Vấn đề:** Quét nhầm QR không thuộc hệ thống lúc không có mạng.
- **Xử lý:** App dùng Regex để kiểm tra định dạng QR cục bộ ngay khi quét. Nếu sai định dạng, chặn ngay không cho lưu vào DB. Nếu đúng định dạng nhưng sai thông tin, Backend sẽ từ chối khi đồng bộ và ghi chú lỗi vào Local DB để Staff xóa.

### 3.2. Trùng lặp check-in (2 thiết bị quét cùng mã Offline)

- **Vấn đề:** Sinh viên đưa QR cho 2 nhân sự cùng quét khi cả 2 đang mất mạng. Cả 2 thiết bị đều lưu thành công.
- **Xử lý:** Khi có mạng, thiết bị nào đồng bộ trước sẽ thành công. Thiết bị đồng bộ sau sẽ bị Backend từ chối với lỗi "Already checked in". Lỗi này hiển thị ở màn hình Pending để Staff thứ hai xác nhận và xóa bỏ.

### 3.3. Mất mạng giữa chừng khi đang Sync Batch

- **Vấn đề:** Đang đẩy 50 bản ghi lên thì mạng sập.
- **Xử lý:** Ứng dụng xử lý kết quả một phần (nếu Backend có trả về kịp phần nào). Các bản ghi chưa được xử lý vẫn giữ trạng thái `synced = 0`. Trình bắt lỗi Timeout (ECONNABORTED) sẽ chờ khi có mạng lại để tự động gửi lại.

### 3.4. Thiết bị mất kết nối quá 24 giờ

- **Vấn đề:** Staff quên bật mạng, tồn đọng hàng trăm lượt check-in.
- **Xử lý:** Khi có mạng, app sẽ chia nhỏ thành các đợt (Batch), mỗi đợt 50 items. Đẩy từng đợt để không làm quá tải Server và băng thông, giao diện cập nhật tiến trình "1/3... 2/3...".

---

## 4. Ràng buộc (Constraints)

### Business Rules

| Ràng buộc             | Giá trị                               |
| --------------------- | ------------------------------------- |
| Max pending check-ins | 1000 (cảnh báo tại 500)               |
| Batch sync size       | 50 items/request                      |
| Sync retry interval   | 60 seconds                            |
| Offline retention     | 30 ngày (cảnh báo dọn dẹp tại 7 ngày) |
| QR scan cooldown      | 2 giây (Chống quét đúp)               |
| Camera permission     | Bắt buộc                              |

### Performance

| Ràng buộc            | Giá trị           |
| -------------------- | ----------------- |
| QR scan to feedback  | < 2 giây          |
| Offline save time    | < 100ms           |
| Batch sync time      | < 5s cho 50 items |
| SQLite query time    | < 50ms            |
| NetInfo detect delay | < 1s              |

### Data Integrity

- **Tính duy nhất:** Một QR chỉ được phép ghi nhận check-in 1 lần (đảm bảo bởi Backend).
- **Tính nhất quán thời gian:** Sử dụng Unix timestamp để tránh lỗi múi giờ giữa thiết bị và server.
- **Truy vết:** Device ID lưu cứng trên máy (AsyncStorage) giúp xác định chính xác thiết bị nào đã quét.

---

## 5. Tiêu chí chấp nhận (Acceptance Criteria)

### Functional Tests

- [ ] **TC-CI-001:** Quét QR hợp lệ Online -> Báo thành công dưới 2s.
- [ ] **TC-CI-002:** Quét QR không hợp lệ Online -> Báo lỗi.
- [ ] **TC-CI-003:** Quét Offline -> Lưu thành công vào SQLite.
- [ ] **TC-CI-004:** Chuyển từ Offline sang Online -> Tự động kích hoạt Sync.
- [ ] **TC-CI-005:** Đồng bộ 50 items -> Tất cả cập nhật trạng thái `synced = 1`.
- [ ] **TC-CI-006:** 2 máy quét cùng QR offline -> 1 máy thành công, 1 máy báo conflict.
- [ ] **TC-CI-007:** Danh sách Pending hiển thị đúng số lượng và chi tiết.
- [ ] **TC-CI-008:** Nút Manual Sync hoạt động bình thường.
- [ ] **TC-CI-009:** Nút Delete xóa được bản ghi lỗi khỏi SQLite.
- [ ] **TC-CI-010:** Đứt cáp khi đang sync -> Phân đoạn và đồng bộ phần còn lại sau.

### Offline & Performance Tests

- [ ] **TC-OFF-001:** Bật chế độ máy bay -> Chức năng quét và lưu vẫn hoạt động.
- [ ] **TC-OFF-002:** Khởi động lại máy khi đang offline -> Dữ liệu pending không bị mất.
- [ ] **TC-PERF-001:** Insert 100 bản ghi vào SQLite -> Xong dưới 1 giây.

---

## 6. Implementation Notes & Code Reference

_(Phần này lưu trữ các đoạn code mẫu, API Payload, logic Pseudo-code và cấu trúc DB dành cho Developers triển khai tính năng)._

### 6.1. Khởi tạo Database & App Bootstrap

```sql
-- SQLite Schema
CREATE TABLE IF NOT EXISTS pending_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_code TEXT NOT NULL,
  workshop_id TEXT,           -- Parsed từ QR
  scanned_at INTEGER NOT NULL, -- Unix timestamp
  device_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  synced INTEGER DEFAULT 0,   -- 0 = pending, 1 = synced
  sync_error TEXT,            -- Error message nếu sync failed
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_pending_sync ON pending_checkins(synced);
CREATE INDEX idx_qr_code ON pending_checkins(qr_code);
```

```typescript
// Lấy Device ID
deviceId = await AsyncStorage.getItem('deviceId');
IF !deviceId THEN
  deviceId = uuid.v4();
  await AsyncStorage.setItem('deviceId', deviceId);
```

### 6.2. Check-in Online & API Payload

```typescript
// Lắng nghe sự kiện quét QR
onBarCodeScanned = async ({ data: qrCode }) => {
  // VD data: "WS-1717234567890-a1b2c3d4"
  setState({ scanning: false });
  try { await checkInOnline(qrCode); }
  catch (error) { await checkInOffline(qrCode); }
  finally { setTimeout(() => setState({ scanning: true }), 2000); }
}

// Request Payload POST /check-ins
Body: {
  qrCode: "WS-1717234567890-a1b2c3d4",
  deviceId: "device-uuid",
  scannedAt: Date.now()
}

// Backend Response 201 Created
{
  "id": "uuid",
  "registration": {
    "id": "uuid",
    "student": { "name": "Nguyễn Văn A", "studentId": "SV001" },
    "workshop": { "title": "React Best Practices", "room": "A101" }
  },
  "checkedInAt": "2024-06-01T08:05:00Z"
}
```

### 6.3. Check-in Offline Logic

```
1. checkInOffline(qrCode):
   a. existing = SELECT * FROM pending_checkins WHERE qr_code = ? AND synced = 0
      IF existing THEN showAlert("⚠️ Already scanned"); return;

   b. INSERT INTO pending_checkins (qr_code, workshop_id, scanned_at, device_id, staff_id, synced)
      VALUES (?, NULL, ${Date.now()}, ?, ${currentUser.id}, 0)
```

### 6.4. Backend Batch Sync Logic

```
// Request POST /check-ins/batch
Body: {
  checkIns: [
    { qrCode: "WS-123", scannedAt: 1717234567890, deviceId: "device-01" }, ...
  ]
}

// Backend Processing Pseudo-code
FOR EACH checkIn IN request.checkIns DO
  registration = SELECT * FROM registrations WHERE qr_code = ?;
  IF !registration THEN results.push({ error: "Invalid QR" }); continue;

  existing = SELECT * FROM check_ins WHERE registration_id = ?;
  IF existing THEN results.push({ error: "Already checked in" }); continue;

  INSERT INTO check_ins (...) VALUES (...);
  UPDATE registrations SET status = 'checked_in' WHERE id = registration.id;
  results.push({ success: true, student: ... });
END FOR

// Mobile Cleanup
DELETE FROM pending_checkins
WHERE synced = 1 AND created_at < (strftime('%s', 'now') - 604800); -- 7 days
```

### 6.5. Xem danh sách & UI Query

```sql
SELECT qr_code, scanned_at, synced, sync_error
FROM pending_checkins
WHERE synced = 0 ORDER BY scanned_at DESC;
```

```
UI Mockup:
┌─────────────────────────────────────┐
│ Pending Check-ins (5)               │
├─────────────────────────────────────┤
│ WS-1717234567890-a1b2c3d4           │
│ 5 minutes ago                       │
│ Status: Waiting for network         │
├─────────────────────────────────────┤
│ WS-1717234500000-xyz123             │
│ 10 minutes ago                      │
│ Status: Sync failed - Invalid QR    │
│ [Retry] [Delete]                    │
└─────────────────────────────────────┘
```

### 6.6. Error Mitigation Snippets

```typescript
// 1. Chống lỗi QR Format offline
function isValidQRFormat(qrCode: string): boolean {
  return /^WS-\d{13}-[a-f0-9]{8}$/.test(qrCode);
}
if (!isValidQRFormat(qrCode)) {
  showAlert("❌ Invalid QR format");
  return;
}

// 2. Chống lỗi sập mạng giữa chừng (Axios config)
try {
  const response = await axios.post("/check-ins/batch", {
    checkIns: pendingList,
    timeout: 30000, // 30s timeout
  });
  response.data.results.forEach((result) => {
    if (result.success) markAsSynced(result.qrCode);
  });
} catch (error) {
  if (error.code === "ECONNABORTED") {
    console.log("Sync timeout. Will retry...");
  }
}
```

### 6.7. React Native Component Core (CheckInScreen.tsx)

```typescript
import { BarCodeScanner } from "expo-barcode-scanner";
import * as SQLite from "expo-sqlite";
import NetInfo from "@react-native-community/netinfo";

const db = SQLite.openDatabase("checkins.db");

export function CheckInScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();

    initDatabase();

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected);
      if (state.isConnected) syncPendingCheckIns();
    });
    return unsubscribe;
  }, []);

  const handleBarCodeScanned = async ({ data: qrCode }) => {
    if (!scanning) return;
    setScanning(false);

    if (!isValidQRFormat(qrCode)) {
      Alert.alert("Invalid QR", "This is not a valid workshop QR code");
      setScanning(true);
      return;
    }

    try {
      if (isOnline) await checkInOnline(qrCode);
      else await checkInOffline(qrCode);
    } catch (error) {
      await checkInOffline(qrCode);
    }
    setTimeout(() => setScanning(true), 2000);
  };

  // Render: BarCodeScanner & Overlay (Online/Offline badges)
}
```

### 6.8. SQLite Service Module (services/sqlite.ts)

```typescript
export const sqliteService = {
  init: () => {
    db.transaction((tx) => {
      tx.executeSql(`CREATE TABLE IF NOT EXISTS pending_checkins (...)`);
      tx.executeSql(
        "CREATE INDEX IF NOT EXISTS idx_pending_sync ON pending_checkins(synced)",
      );
    });
  },
  savePending: (qrCode: string, staffId: string, deviceId: string) => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `INSERT INTO pending_checkins (qr_code, scanned_at, device_id, staff_id) VALUES (?, ?, ?, ?)`,
          [qrCode, Date.now(), deviceId, staffId],
          (_, result) => resolve(result.insertId),
          (_, error) => reject(error),
        );
      });
    });
  },
  getPending: (): Promise<PendingCheckIn[]> => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          "SELECT * FROM pending_checkins WHERE synced = 0 ORDER BY scanned_at ASC",
          [],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error),
        );
      });
    });
  },
  markSynced: (qrCode: string) => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          "UPDATE pending_checkins SET synced = 1 WHERE qr_code = ?",
          [qrCode],
          (_, result) => resolve(result),
          (_, error) => reject(error),
        );
      });
    });
  },
};
```
