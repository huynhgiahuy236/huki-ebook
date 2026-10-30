# 💳 PHASE 3: ĐẶT HÀNG, THANH TOÁN & QUẢN LÝ TIỀN ESCROW (CHECKOUT & PAYMENT)

## 🎯 Mục tiêu
Kiểm thử quy trình tạo đơn hàng, tính phí vận chuyển theo địa chỉ, xử lý thanh toán và giữ tiền trong tài khoản bảo đảm (Escrow) theo chuẩn sàn TMĐT.

---

## 🔍 Checklist Kiểm Thử Chi Tiết

### 3.1 Địa Chỉ & Vận Chuyển (Shipping Calculation)
- [ ] Lấy danh sách địa chỉ nhận hàng của Buyer (`GET /api/v1/shipping/address`).
- [ ] Thêm địa chỉ mới nếu chưa có (`POST /api/v1/shipping/address`).
- [ ] Tính phí vận chuyển thực tế qua Preview (`POST /api/v1/cart/checkout/preview`) hoặc (`GET /api/v1/shipping/rates`).
- [ ] Tách kiện hàng tự động nếu giỏ hàng gồm nhiều Shop khác nhau (mỗi shop 1 đơn con - sub-order).

### 3.2 Phương Thức Thanh Toán (Payment Gateways)
- [ ] Hỗ trợ COD (Thanh toán khi nhận hàng).
- [ ] Hỗ trợ Ví HuKi (`WALLET`) - trừ số dư khả dụng của ví Buyer.
- [ ] Hỗ trợ Cổng thanh toán trực tuyến (`VNPAY`).

### 3.3 Tạo Đơn & Giữ Tiền Bảo Đảm (Escrow Hold)
- [ ] Tạo đơn hàng thành công qua `POST /api/v1/cart/checkout/confirm` kèm header bắt buộc `Idempotency-Key: <UUID>`.
- [ ] Trừ quota sử dụng của Voucher.
- [ ] Khóa tồn kho (Reserve / Deduct Stock) để tránh overselling.
- [ ] Kiểm tra số tiền thanh toán được ghi nhận vào tài khoản Tạm giữ Escrow (`GET /api/v1/orders/{id}/escrow`), **CHƯA ĐƯỢC CHUYỂN NGAY VÀO VÍ CỦA SHOP** (bảo vệ quyền lợi Buyer).
- [ ] Trạng thái đơn ban đầu: `PENDING` hoặc `PROCESSING`.

---

## 🛠️ Script thực thi
Script: [scripts/e2e-phase3-checkout-payment.mjs](file:///e:/HuKi/scripts/e2e-phase3-checkout-payment.mjs)
Lệnh chạy: `node scripts/e2e-phase3-checkout-payment.mjs`
