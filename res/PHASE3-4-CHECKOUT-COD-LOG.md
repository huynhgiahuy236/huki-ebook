# Báo Cáo Thực Hiện PHẦN 3 & PHẦN 4 — Sổ Địa Chỉ Inline & Giao Diện Checkout COD
**Mã tài liệu:** `RES-PHASE3-4-LOG`  
**Thời gian thực hiện:** `2026-09-13`  
**Trạng thái:** `✅ DONE` — Đã hoàn thành 100% mục tiêu Phần 3 & Phần 4 và biên dịch thành công.

---

## 🎯 1. Mục Tiêu Đạt Được

### A. PHẦN 3: Sổ Địa Chỉ Giao Hàng Inline (Sprint 14A)
1. **Module `addressApi.ts` (`web/src/ui/api/addressApi.ts`):**
   - Kết nối trực tiếp với backend `shipping-service` qua API Gateway:
     - `getAddresses()`: `GET /api/v1/shipping/address`
     - `createAddress(payload)`: `POST /api/v1/shipping/address`
     - `updateAddress(id, payload)`: `PATCH /api/v1/shipping/address/:id`
     - `deleteAddress(id)`: `DELETE /api/v1/shipping/address/:id`
2. **Nâng cấp trang Sổ địa chỉ (`web/src/ui/pages/store/UserAddressesPage.jsx`):**
   - Chuẩn hóa layout `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
   - **Triệt tiêu Popup Modal**: Toàn bộ thao tác thêm mới và chỉnh sửa địa chỉ sử dụng **Inline Expandable Form (Accordion)** mượt mà ngay tại chỗ.
   - Thẻ địa chỉ hỗ trợ: Thiết lập địa chỉ mặc định, sửa, xóa, và hiển thị trạng thái rỗng `EmptyState`.

---

### B. PHẦN 4: Giao Diện Checkout COD & Preview Đơn Hàng An Toàn (Sprint 14B & 15)
1. **Module `checkoutApi.ts` (`web/src/ui/api/checkoutApi.ts`):**
   - `previewCheckout(payload)`: `POST /api/v1/cart/checkout/preview` $\rightarrow$ Khởi tạo phiên Checkout Session, lấy báo giá và phí ship chuẩn từ server `commerce-service`.
   - `confirmCheckout(payload, idempotencyKey)`: `POST /api/v1/cart/checkout/confirm` $\rightarrow$ Xác nhận đặt đơn hàng, hỗ trợ Header `Idempotency-Key` ngăn chặn click đúp/trùng lặp đơn.
2. **Nâng cấp trang Checkout (`web/src/ui/pages/store/CheckoutPage.jsx`):**
   - Chuẩn hóa layout `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
   - **Phân tách giao nhận thông minh (Fulfillment Split View):**
     - **Gói 1 (Ebook Bản Quyền DRM):** Miễn phí vận chuyển 100%, kích hoạt trực tiếp vào Tủ Sách HUKI ngay sau khi hoàn tất.
     - **Gói 2 (Sách Giấy Hiện Vật):** Tích hợp sổ địa chỉ giao hàng với Inline Selector & Inline Add Form (không popup).
   - **Phương thức thanh toán:**
     - **COD (Thanh toán khi nhận hàng):** Kích hoạt mặc định, viền nổi bật.
     - **HukiPay, VNPay QR, MoMo:** Duy trì giao diện trực quan với `opacity-50 pointer-events-none cursor-not-allowed` + Badge *"Sắp hỗ trợ"*.
   - **Bảo vệ Idempotency & Tự động xóa giỏ:** Khi người dùng bấm *"Hoàn Tất Đặt Hàng"*, nút hiển thị spinner `isSubmitting`, tạo mã UUID Idempotency-Key gửi lên server, sau khi thành công tự động `clearCart()` và điều hướng sang `/order-success`.

---

## 🧪 2. Kết Quả Kiểm Thử & Biên Dịch

* **Frontend (`web`):**
  * Lệnh: `npm run typecheck` $\rightarrow$ **0 Errors (Exit code 0)**.
* **Các route hoạt động trực tiếp:**
  * Sổ địa chỉ: `http://localhost:3100/settings/addresses`
  * Thanh toán đơn hàng: `http://localhost:3100/checkout`

---

## 🛑 3. Điểm Dừng Nghiệm Thu (Điểm Dừng 4)

Đã hoàn thành toàn bộ công việc của **PHẦN 3 & PHẦN 4**. Sẵn sàng chuyển giao sang **PHẦN 5: Màn Hình Đặt Hàng Thành Công & E2E Validation Toàn Diện (Sprint 16)**.
