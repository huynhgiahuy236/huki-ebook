# 🛒 PHASE 2: GIỎ HÀNG, PHÂN CỤM STORE & GOM MÃ GIẢM GIÁ (CART & VOUCHERS)

## 🎯 Mục tiêu
Kiểm thử nghiệp vụ giỏ hàng chuẩn Shopee/Lazada: phân cụm sản phẩm theo từng Nhà bán (Shop/Store), áp dụng đồng thời mã giảm giá của Sàn và mã riêng của Shop, tự động tính toán tổng tiền tạm tính và chiết khấu.

---

## 🔍 Checklist Kiểm Thử Chi Tiết

### 2.1 Quản Lý Giỏ Hàng (Cart Management)
- [ ] `POST /api/v1/cart/items`: Thêm sản phẩm sách giấy vào giỏ hàng (`format: 'PHYSICAL'`).
- [ ] `POST /api/v1/cart/items`: Thêm sản phẩm Ebook vào giỏ hàng (`format: 'DIGITAL'`).
- [ ] `GET /api/v1/cart`: Lấy danh sách sản phẩm trong giỏ, kiểm tra các trường và cấu trúc dữ liệu.
- [ ] `PATCH /api/v1/cart/items/{itemId}`: Thay đổi số lượng item trong giỏ.
- [ ] Kiểm tra kiểm soát tồn kho: Thêm số lượng vượt quá tồn kho thực tế phải báo lỗi không đủ hàng.
- [ ] Phân cụm giỏ hàng theo Store: Các sản phẩm cùng 1 nhà bán phải nhóm chung 1 store; sản phẩm khác nhà bán phải tách store riêng.

### 2.2 Áp Dụng Mã Giảm Giá Đa Tầng & Xem Trước Giỏ Hàng (Voucher Stacking & Preview - Chuẩn Shopee)
- [ ] `GET /api/v1/vouchers` hoặc `GET /api/v1/vouchers/available`: Lấy danh sách voucher hợp lệ từ hệ thống (Platform Voucher & Store Voucher).
- [ ] `POST /api/v1/vouchers/validate`: Kiểm tra tính hợp lệ của mã giảm giá với giỏ hàng hiện tại.
- [ ] `POST /api/v1/cart/checkout/preview`: Tính toán preview chi tiết trước khi đặt hàng:
  - Tách đơn theo từng Store (Sub-orders).
  - Áp dụng Voucher Sàn (Platform Voucher) và Voucher Shop (Store Voucher).
  - Kiểm tra điều kiện đơn hàng tối thiểu (Min Order Value).
  - Tính toán số tiền giảm trừ chính xác từng đồng, không làm tròn sai lệch.

---

## 🛠️ Script thực thi
Script: [scripts/e2e-phase2-cart-voucher.mjs](file:///e:/HuKi/scripts/e2e-phase2-cart-voucher.mjs)
Lệnh chạy: `node scripts/e2e-phase2-cart-voucher.mjs`
