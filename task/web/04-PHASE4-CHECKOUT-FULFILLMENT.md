# Phase 04 — Buyer Cart & COD Checkout

**Persona:** User/Buyer
**Status:** `✅ DONE` — Đã tích hợp API thật, hoàn thiện UI/UX Cart/Address/Checkout/Success, chuyển đổi Pure Cookies và kiểm thử E2E 8/8 bước đạt 100%.

## Sprint 13 — Cart

- [x] ✅ Get/add/update/remove/clear cart (`cartApi.getCart`, `cartApi.addToCart`, `cartApi.updateQuantity`, `cartApi.removeFromCart`, `cartApi.clearCart`).
- [x] ✅ Kiểm tra tồn kho và định dạng sách (PHYSICAL/DIGITAL), bắt lỗi `INVENTORY_INSUFFICIENT` và `BOOK_FORMAT_NOT_AVAILABLE`.
- [x] ✅ Empty/loading/error state, sticky summary 2 cột, responsive và optimistic updates qua `CartContext`.
- [x] ✅ Real-time badge đếm số lượng sản phẩm trên `StoreHeader`.

## Sprint 14 — Address và checkout preview

- [x] ✅ Sổ địa chỉ inline accordion, không modal popup (`addressApi.getAddresses`, `addressApi.createAddress`, `addressApi.updateAddress`, `addressApi.deleteAddress`, `addressApi.setDefaultAddress`).
- [x] ✅ Chọn địa chỉ nhận hàng linh hoạt / tạo mới địa chỉ trực tiếp trên trang thanh toán (`CheckoutPage.jsx`).
- [x] ✅ Checkout preview qua API thật (`checkoutApi.previewCheckout` -> `POST /api/v1/cart/checkout/preview`).
- [x] ✅ Phí giao hàng tạm tính nội bộ chuẩn xác (30.000đ), tính toán tổng tiền thanh toán an toàn từ server.

## Sprint 15 — COD confirm

- [x] ✅ COD (Thanh toán khi nhận hàng) là phương thức thanh toán chính thức hoạt động; các phương thức online (VNPay, MoMo, Card) áp dụng disabled state kèm badge "Sắp hỗ trợ".
- [x] ✅ Checkout confirm và order result qua backend thật (`checkoutApi.confirmCheckout` -> `POST /api/v1/cart/checkout/confirm`).
- [x] ✅ Sinh `Idempotency-Key` UUID ở header chống double submit và nút submit loading state chống click đúp.
- [x] ✅ Xử lý out-of-stock, price conflict, thông báo toast lỗi động theo theme của người dùng.

## Sprint 16 — Order Success & E2E Validation

- [x] ✅ Màn hình `OrderSuccessPage.jsx` mang sắc thái chúc mừng theo theme người dùng: mã đơn hàng, số tiền COD cần chuẩn bị, địa chỉ nhận hàng.
- [x] ✅ Nút điều hướng "Xem chi tiết đơn hàng" (`/orders/:id` hoặc fallback `/orders`) và "Tiếp tục mua sắm" (`/books`).
- [x] ✅ Giỏ hàng tự động được xóa sạch sau khi backend xác nhận đặt đơn thành công.
- [x] ✅ Kịch bản E2E kiểm thử tự động toàn diện (`scripts/e2e-phase4-checkout.mjs`).

## Verification evidence 2026-09-13

- **Frontend Build & Typecheck**: `npm run typecheck` (`tsc --noEmit`) đạt **0 errors**; `npm run build` thành công 100%.
- **Token Storage**: Hoàn tất chuyển đổi sang **Pure Cookies** (`huki_access_token`, `huki_refresh_token`) với 7 ngày / 30 ngày expiry, `path=/`, `SameSite=Lax`.
- **E2E Runtime Verification (`scripts/e2e-phase4-checkout.mjs`)**: Đạt **8/8 bước (100% PASS)** trên Backend Gateway (`:3000`) và Frontend Web (`:3100`):
  1. `[Step 0]` Service Live Check (Frontend & Gateway) $\rightarrow$ **PASS**.
  2. `[Step 1]` Login Buyer (`huy@gmail.com`) & Seller (`phuongthuy@gmail.com`) $\rightarrow$ **PASS**.
  3. `[Step 2]` Public Catalog Discovery $\rightarrow$ **PASS**.
  4. `[Step 3]` Cart Lifecycle (Clear $\rightarrow$ Add item $\rightarrow$ Get cart) $\rightarrow$ **PASS**.
  5. `[Step 4]` Shipping Address Management $\rightarrow$ **PASS**.
  6. `[Step 5]` Checkout Preview & COD Confirm (`#ORD-...`, status `PROCESSING`) $\rightarrow$ **PASS**.
  7. `[Step 6]` Buyer Order Details Verification (`GET /orders`) $\rightarrow$ **PASS**.
  8. `[Step 7]` Seller Order Management & State Transition (`PENDING_CONFIRMATION` $\rightarrow$ `CONFIRMED` $\rightarrow$ `PREPARING` $\rightarrow$ `SHIPPED` kèm mã vận đơn GHTK $\rightarrow$ `COMPLETED`) $\rightarrow$ **PASS**.
  9. `[Step 8]` Cart Cleanup Confirmation (Giỏ hàng về 0 sản phẩm) $\rightarrow$ **PASS**.

## Deferred

`⚪ DEFERRED`: GHTK/Grab/SPX API tích hợp trực tiếp, webhook callback đơn vị vận chuyển, PayOS/VNPay/MoMo cổng thanh toán trực tuyến, voucher/mã giảm giá, quy trình hoàn tiền (refund) online.

## Phase DoD

Buyer tạo đúng một đơn COD bằng backend thật; tổng tiền và inventory được server xác nhận; giỏ hàng tự động làm sạch; người bán nhận và hoàn tất đơn hàng qua giao diện quản trị; không phụ thuộc bên vận chuyển thứ 3.
