# Đặc tả: Check-in Offline & Batch Sync

Tính năng xử lý quét QR để check in trên mobile, lưu offline, và đồng bộ batch khi có kết nối mạng.

## 1. Tổng quan ngắn
- Mobile app sử dụng SQLite (`pending_checkins`) làm queue offline-first.
- NetInfo (thư viện) được dùng để phát hiện chuyển đổi offline→online; khi online app sẽ gọi đồng bộ (no periodic background retry implemented by default).
- Đồng bộ theo batch, mặc định 50 item mỗi request, backend trả kết quả theo từng item (mapping bằng `local_id`).
- Mỗi item có `synced` trạng thái: `0` = pending, `1` = synced, `-1` = sync failed (kèm `sync_error`).

---

## 2. Cơ sở dữ liệu SQLite cho pending check-ins:
```
CREATE TABLE IF NOT EXISTS pending_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_code TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  scanned_at INTEGER NOT NULL, -- Unix timestamp (seconds)
  synced INTEGER DEFAULT 0,
  sync_error TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_qr_code ON pending_checkins(qr_code);
CREATE INDEX IF NOT EXISTS idx_sync_status ON pending_checkins(synced);
```

---

## 3. Luồng xử lý 

3.1 Check-in (scan handler) — `checkin.ts`
- Validate QR format with regex `^WS-\d{13}-[a-f0-9]{8}$`. Nếu không hợp lệ -> trả `invalid_format`, không lưu.
- Nếu thiết bị online: gọi `postCheckIn` (POST `/check-ins`). Nếu server trả `status === 'ok'` thì xóa mọi pending cùng `qr_code` (`deletePendingByQrCode`). Nếu API call lỗi/timeout thì fallback: lưu local.
- Nếu thiết bị offline: kiểm tra duplicate cục bộ `hasUnsyncedQrCode(qr)` -> nếu có trả `duplicate_offline`. Nếu chưa có, `insertPendingCheckin` (đặt `synced = 0`).

3.2 Đồng bộ batch — `sync.ts`
- Trigger: NetInfo listener (`startSyncListener`) — khi trạng thái kết nối trở lại, gọi `syncPendingCheckins()`.
- Lấy batch = `fetchUnsynced(50)` (order by `created_at ASC`) và lặp cho đến khi hết.
- Gọi `postBatchCheckIns(payload)` với payload có `local_id` để backend map trả về.
- Khi server trả kết quả: cập nhật mỗi record bằng `updateSyncStatus(id, 1, null)` nếu `status === 'ok'`, hoặc `updateSyncStatus(id, -1, message)` nếu `conflict`/`error`.
- Nếu gọi batch ném (network timeout / axios error), code sẽ mark tất cả records trong batch là failed (`synced = -1`) kèm message và dừng (sẽ thử lại khi NetInfo báo online lần sau).

3.3 Đồng bộ đơn (fallback hoặc retry cụ thể)
- `syncSingleCheckin(record)` gọi `postCheckIn` cho 1 record và cập nhật `synced` tương ứng.

---

## 4. Hành vi và ràng buộc hiện tại 
- Batch size: 50 items/request .
- API client default timeout: 8000 ms .
- Cleanup: Những bản ghi chưa đồng bộ (synced = 0) cũ hơn 7 ngày sẽ được xóa `cleanupSyncedOlderThanDays()`. Default = 7 days.
- Retry: retry xảy ra khi NetInfo báo connected hoặc khi user trigger manual sync.
- Duplicate prevention (same device): `hasUnsyncedQrCode()` prevents inserting the same QR while `synced = 0` exists.

---

## 5. Kịch bản lỗi & cách code xử lý
- QR không đúng định dạng: bị từ chối ngay ở phía client.
- Trùng trên cùng một thiết bị (khi offline): bị chặn ở phía client thông qua hasUnsyncedQrCode.
- Trùng giữa nhiều thiết bị (đều offline): cả hai thiết bị đều lưu pending; khi đồng bộ, backend chấp nhận bản ghi đến trước, trả conflict cho bản ghi đến sau -> mobile đánh dấu bản ghi đến sau là synced = -1 và lưu sync_error.
- Lỗi mạng trong lúc đồng bộ batch: nếu postBatchCheckIns ném lỗi (do mạng), đánh dấu toàn bộ bản ghi trong batch là failed, kèm thông báo lỗi rồi dừng; kết quả từng item chỉ được xử lý khi server trả về mảng kết quả theo từng item.

---


## 7. Acceptance criteria 
- Quét QR hợp lệ Online -> server response `ok` -> không tạo pending (pass if < 2s ideally).
- Quét Offline -> `insertPendingCheckin` tạo record `synced = 0`.
- Offline→Online -> NetInfo listener gọi `syncPendingCheckins()` và cập nhật `synced` theo kết quả server.
- Batch sync size = 50 and per-item result mapping via `local_id` is required by backend contract.

---

