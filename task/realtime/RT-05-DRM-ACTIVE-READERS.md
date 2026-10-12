# 🔒 RT-05: REALTIME DRM VAULT ACTIVE READERS & DEVICE ENFORCEMENT

> **Mục tiêu:** Giám sát thời gian thực phiên đọc sách điện tử (`activeReaders`), cơ chế gửi nhịp tim (Heartbeat 30 giây) từ trình đọc Web Reader, và thu hồi thiết bị / hủy quyền đọc sách lậu tức thì từ Admin DRM Vault.

---

## 🔍 1. PHẠM VI ẢNH HƯỞNG (SCOPE & IMPACT ANALYSIS)

### A. Frontend (Giao diện người dùng)
* **Web Reader (`/reader?book=[id]`):**
  * Gửi nhịp tim định kỳ `heartbeat` lên máy chủ khi người dùng đang đọc.
  * Lắng nghe tín hiệu `drm:license_revoked` hoặc `drm:device_blocked` $\to$ Đóng phiên đọc, làm đen màn hình và hiện thông báo vi phạm bản quyền ngay lập tức.
* **Admin DRM Vault (`admin/drm-vault`):**
  * Thẻ KPI "Đang Đọc Trực Tuyến" và bảng chi tiết từng cuốn sách nhảy số lượng `activeReaders` tự động.
  * Nút "Thu Hồi Giấy Phép / Khóa Thiết Bị": Khi Admin click $\to$ Thiết bị vi phạm bị ngắt kết nối ngay tại trang đọc.

### B. Backend (Microservices)
* `commerce-service`:
  * Module `drm-vault.service.ts` và controller.
  * Bảng `drm_licenses`, `drm_devices`, `drm_audit_logs`.
* CSDL: Cập nhật trường `active_readers` và ghi nhật ký kiểm toán DRM.

### C. Mức độ rủi ro & Biện pháp phòng ngừa
* **Rủi ro:** Khi có hàng ngàn bạn đọc online cùng lúc, việc gửi heartbeat dồn dập có thể làm nghẽn CSDL nếu ghi thẳng vào PostgreSQL mỗi giây.
* **Phòng ngừa:** Sử dụng bộ nhớ đệm Redis / In-Memory TTL Set để đếm số lượng bạn đọc active; chỉ đồng bộ số tổng về PostgreSQL theo chu kỳ định kỳ (Batch update mỗi 30 giây).

---

## 🛠️ 2. THIẾT KẾ KỸ THUẬT & CÁCH LÀM (IMPLEMENTATION PLAN)

### A. Kênh Socket & Định danh Room
```
Namespace: /drm
Rooms:
  ├── book_readers_{bookId}     (Nhóm các bạn đọc đang mở cùng một cuốn sách)
  ├── user_session_{userId}     (Phiên làm việc riêng của từng bạn đọc)
  └── admin_drm_monitor         (Admin giám sát số liệu DRM toàn sàn)
```

### B. Cơ chế Nhịp tim (Heartbeat Protocol)
1. Khi vào trang `/reader`: Client phát sự kiện `drm:reader_joined` kèm `bookId` và `deviceId`.
2. Định kỳ mỗi **30 giây**: Client gửi gói tin ping `drm:heartbeat`.
3. Nếu máy chủ không nhận được heartbeat trong **60 giây** (người dùng tắt tab hoặc rớt mạng) $\to$ Tự động trừ `activeReaders` đi 1.
4. Khi người dùng đóng tab: Trình duyệt bắn sự kiện `navigator.sendBeacon` hoặc socket disconnect để trừ số người đọc tức thì.

### C. Cơ chế Cưỡng chế Thu hồi (Remote Revocation)
1. Admin trên trang Quản lý DRM Vault bấm nút **"Thu hồi giấy phép"** hoặc **"Chặn thiết bị đọc lậu"**.
2. Máy chủ phát sự kiện khẩn cấp `drm:force_terminate` vào room `user_session_{userId}`.
3. Web Reader của bạn đọc lập tức:
   * Hủy bỏ khóa giải mã AES-GCM-256 trong bộ nhớ RAM.
   * Xóa sạch canvas PDF/EPUB.
   * Hiển thị cảnh báo: *"Giấy phép đọc tác phẩm đã bị thu hồi bởi Ban Quản Trị."*

---

## 🎯 3. KẾT QUẢ ĐẠT ĐƯỢC (EXPECTED OUTCOME)

1. Mở trang Web Reader đọc cuốn sách số $\to$ Trên màn hình Admin DRM Vault, cột **"Đang Đọc"** của cuốn sách đó nhảy từ 0 lên 1 trong **< 200ms**.
2. Khi tắt tab đọc sách $\to$ Cột "Đang Đọc" tự động giảm về 0.
3. Khi Admin bấm thu hồi thiết bị $\to$ Trang đọc sách của người dùng bị khóa ngay lập tức mà không cần chờ người dùng F5 tải lại trang.

---

## 🧪 4. KẾ HOẠCH KIỂM THỬ (TESTING & VERIFICATION CADENCE)

* **Test Case 1 (Reader Joined Counter):** Mở tab đọc sách `/reader?book=[id]` $\to$ Xác nhận máy chủ nhận `startSession`, `activeReaders` tăng lên, Admin DRM Vault cập nhật thời gian thực kèm hiệu ứng pulse xanh. ✅ **ĐẠT (PASS)**
* **Test Case 2 (Tab Closure Auto-Decrement):** Đóng tab hoặc rời khỏi trang $\to$ Bắn beacon/keepalive `session-leave`, xác nhận số lượng trên Admin giảm xuống tức thì. ✅ **ĐẠT (PASS)**
* **Test Case 3 (Instant Piracy Kill-Switch):** Admin DRM Vault click nút **"Thu Hồi"** $\to$ Gọi `POST /admin/drm/licenses/:id/revoke`, bắn sự kiện `DRM_LICENSE_REVOKED` $\to$ Tab đọc sách của độc giả ngay lập tức bị đóng canvas, chuyển sang màn hình cảnh báo vi phạm bản quyền (POL-04) mà không cần F5. ✅ **ĐẠT (PASS)**
* **Test Case 4 (Restore License):** Admin click **"Khôi Phục"** $\to$ Chuyển trạng thái về `SECURE` và mở lại quyền đọc. ✅ **ĐẠT (PASS)**

---

## 🏆 KẾT LUẬN & TRẠNG THÁI NGHIỆM THU
* **Trạng thái:** ✅ **HOÀN THÀNH (COMPLETED)**
* **Biên dịch TypeScript:** 0 lỗi (`tsc --noEmit` đạt 100% trên cả `web` và `commerce-service`).
* **Không làm gián đoạn Docker / Back / Front:** Đáp ứng hoàn toàn chỉ thị bảo toàn container và môi trường đang chạy.
