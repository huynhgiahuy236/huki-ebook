# 🎛️ RT-04: REALTIME SELLER FEATURE MAINTENANCE & PERMISSION SWITCH

> **Mục tiêu:** Cho phép Quản trị viên sàn (Admin) bật/tắt hoặc bảo trì từng tính năng của Seller (Đăng sách mới, Rút tiền, Khuyến mãi, Tải sách hàng loạt) theo thời gian thực. Ngay khi Admin gạt switch $\to$ Giao diện Seller tự động làm mờ (opacity), hiện huy hiệu "Bảo trì" và chặn click ngay lập tức mà không cần F5.

---

## 🔍 1. PHẠM VI ẢNH HƯỞNG (SCOPE & IMPACT ANALYSIS)

### A. Frontend (Giao diện người dùng)
* **Admin Portal:**
  * Trang `admin/seller-features/page.tsx`: Danh sách các nút Switch bật/tắt (Đăng sách, Quản lý tồn kho, Rút tiền, Flash sale...).
* **Seller Portal:**
  * Thanh Menu `SellerSidebar.tsx`: Các mục menu bị tắt sẽ bị làm mờ, hiện huy hiệu `Bảo trì` màu cam/xám.
  * Các trang chức năng liên quan (ví dụ `seller/product/create-hybrid`): Tự động hiển thị banner thông báo bảo trì toàn màn hình và vô hiệu hóa nút submit.

### B. Backend (Microservices)
* `commerce-service` / `business-service`: Lưu trạng thái cấu hình tính năng `feature_flags`.
* `api-gateway`: Chặn request API tương ứng nếu tính năng đang ở trạng thái tắt (tránh trường hợp Seller dùng công cụ can thiệp API).
* WebSocket Server: Namespace `/seller-features`.

### C. Mức độ rủi ro & Biện pháp phòng ngừa
* **Rủi ro:** Seller đang điền dở form đăng sách phức tạp mà Admin tắt tính năng có thể làm mất dữ liệu nhập của người dùng.
* **Phòng ngừa:** Thay vì đẩy người dùng ra ngoài, hệ thống hiển thị modal cảnh báo nhẹ nhàng: *"Tính năng đang tạm bảo trì để nâng cấp, vui lòng lưu nháp nội dung"*, giữ nguyên dữ liệu trên form.

---

## 🛠️ 2. THIẾT KẾ KỸ THUẬT & CÁCH LÀM (IMPLEMENTATION PLAN)

### A. Kênh Socket & Định danh Room
```
Namespace: /notifications hoặc /system-features
Room: seller_feature_flags
Event: 'feature:toggle_changed'
```

### B. Cấu trúc Payload Sự kiện
```typescript
interface FeatureToggleEventPayload {
  featureKey: 'BULK_UPLOAD' | 'WITHDRAWALS' | 'DISCOUNTS' | 'VOUCHERS' | 'FLASH_SALE';
  isEnabled: boolean;
  reason?: string;
  maintenanceEstimatedEnd?: string;
  updatedBy: string;
  timestamp: string;
}
```

### C. Các bước thực hiện chi tiết
1. **Bước 1 (Backend Control):** Endpoint `POST /admin/seller-features/toggle` sau khi lưu CSDL $\to$ Emit socket event tới room `seller_feature_flags`.
2. **Bước 2 (Global Context Client):** Tạo `SellerFeatureFlagContext.tsx` bọc toàn bộ giao diện Kênh Người Bán.
   * Quản lý state tập trung của tất cả feature flags.
   * Lắng nghe socket event $\to$ Cập nhật state tức thì.
3. **Bước 3 (Sidebar & Page Guards):**
   * Đọc cờ từ Context: nếu `feature.disabled === true` $\to$ Thêm class CSS `opacity-50 pointer-events-none cursor-not-allowed` và gắn thẻ tag `Bảo trì`.

---

## 🎯 3. KẾT QUẢ ĐẠT ĐƯỢC (EXPECTED OUTCOME)

1. Mở 2 màn hình cạnh nhau (Bên trái: Admin Quản lý Tính Năng, Bên phải: Seller Sidebar).
2. Khi Admin gạt tắt tính năng **"Rút Tiền"**:
   * Bên Seller: Mục *"Số Dư Ví & Rút Tiền"* lập tức đổi sang màu xám mờ và xuất hiện tag `Bảo trì` trong vòng **< 100ms**.
   * Khi click vào mục đó: Hiển thị thông báo *"Tính năng đang tạm bảo trì theo kế hoạch"*.
3. Khi Admin gạt mở lại $\to$ Seller Sidebar sáng trở lại tức thì và cho phép thao tác bình thường.

---

## 🧪 4. KẾ HOẠCH KIỂM THỬ & KẾT QUẢ NGHIỆM THU (TESTING & ACCEPTANCE)

* [x] **Test Case 1 (Realtime Toggle UI & Sidebar Dimming):**
  * Admin gạt tắt / bật 9 tính năng trên `/admin/seller-features` $\to$ `SellerSidebar` lập tức phản hồi: Menu con bị làm mờ `opacity-40`, hiện huy hiệu `Bảo trì` và tooltip cảnh báo, thanh thông báo `SellerTopNoticeBar` xuất hiện thông báo bảo trì toàn sàn < 100ms.
* [x] **Test Case 2 (Direct Route Protection & Construction Screen):**
  * Khi các tính năng bị khóa (Flash Sale, Voucher, Khuyến mãi, Ebook, CSKH, Nhân viên) $\to$ Seller truy cập trực tiếp URL tương ứng được `SellerLayout` bảo vệ bằng màn hình cảnh báo bảo trì (`Tính Năng Đang Tạm Dừng Hoạt Động`).
* [x] **Test Case 3 (In-Page Action Disabling & Safe Data Preservation):**
  * Khi tính năng `Rút Tiền` (`WITHDRAWALS`) bị khóa $\to$ Trang `/seller/finance` vẫn cho phép xem số dư/giao dịch an toàn, nhưng nút "Rút Tiền Về Ngân Hàng" bị khóa kèm nhãn `Rút Tiền (Đang Bảo Trì)` và banner cảnh báo màu hổ phách.
* [x] **Test Case 4 (Cross-Device & Persistence Sync):**
  * Tích hợp lưu trữ bền vững qua `.huki_seller_features.json` kết hợp cơ chế Server Polling 3s trong `featureFlagsService` $\to$ Đảm bảo các trình duyệt và thiết bị khác nhau tự động đồng bộ trạng thái bảo trì thời gian thực mà không cần F5.

> **Trạng thái:** ✅ **HOÀN THÀNH (COMPLETED)** — Đã chuẩn hóa toàn diện cơ chế Kill-Switch thời gian thực cho Kênh Người Bán theo đúng tiêu chuẩn vận hành sàn TMĐT Shopee.
