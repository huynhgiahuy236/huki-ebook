# 🚚 PHASE 5: GIAO HÀNG, XÁC NHẬN NHẬN HÀNG & GIẢI NGÂN VÍ SHOP (ESCROW RELEASE)

## 🎯 Mục tiêu
Kiểm thử quy trình giao hàng, xác nhận nhận hàng, hạch toán giải ngân tiền từ Quỹ bảo đảm Escrow về Ví số dư của Người bán (đã trừ chiết khấu sàn) và kích hoạt tính năng Đánh giá sản phẩm.

---

## 🔍 Checklist Kiểm Thử Chi Tiết

### 5.1 Giao Hàng & Thu Tiền COD (Nghiệp vụ Shipper)
- [ ] Shipper nhận đơn giao (`PATCH /api/v1/orders/shipper/orders/{id}/claim`).
- [ ] Shipper lấy hàng từ Shop (`PATCH /api/v1/orders/shipper/orders/{id}/pickup`).
- [ ] Shipper cập nhật giao thành công (`PATCH /api/v1/orders/shipper/orders/{id}/deliver`) -> Trạng thái đơn thành `DELIVERED`.
- [ ] Nếu là đơn COD: Shipper ghi nhận đã thu tiền từ Buyer, đối soát dòng tiền COD về hệ thống (`POST /api/v1/orders/shipper/remit-cod`).

### 5.2 Buyer Xác Nhận Nhận Hàng (Buyer Acceptance)
- [ ] Buyer kiểm tra kiện hàng và bấm *"Đã nhận được hàng"* (`POST /api/v1/orders/{id}/confirm-delivered` hoặc `release-escrow`).
- [ ] Đơn hàng chuyển sang trạng thái hoàn tất `COMPLETED`.
- [ ] Trường hợp Buyer không bấm xác nhận: Sau thời hạn bảo vệ (ví dụ: 7 ngày), hệ thống tự động hoàn tất đơn (Auto-complete).

### 5.3 Giải Ngân Tiền Về Ví Shop (Escrow Settlement)
- [ ] Hệ thống giải phóng số tiền từ tài khoản Escrow (`GET /api/v1/orders/{id}/escrow` chuyển sang `RELEASED`).
- [ ] Trừ phí dịch vụ sàn (Platform Fee).
- [ ] Cộng tiền thực nhận vào Số dư khả dụng của Ví người bán (`GET /api/v1/orders/seller/escrow/items` hoặc `GET /api/v1/wallet`).
- [ ] Ghi nhận lịch sử biến động số dư ví (Wallet Transaction Ledger).

### 5.4 Đánh Giá Sản Phẩm (Rating & Review)
- [ ] Sau khi nhận hàng, Buyer mở quyền viết đánh giá 1-5 sao kèm nhận xét (`POST /api/v1/books/{id}/reviews`).
- [ ] Đọc danh sách đánh giá (`GET /api/v1/books/{id}/reviews`), điểm đánh giá trung bình và số lượng lượt bán được cập nhật tăng ngay lập tức.

---

## 🛠️ Script thực thi
Script: [scripts/e2e-phase5-shipping-release.mjs](file:///e:/HuKi/scripts/e2e-phase5-shipping-release.mjs)
Lệnh chạy: `node scripts/e2e-phase5-shipping-release.mjs`
