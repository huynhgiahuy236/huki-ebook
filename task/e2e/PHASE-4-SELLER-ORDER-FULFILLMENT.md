# 📦 PHASE 4: NGƯỜI BÁN XÁC NHẬN & VẬN HÀNH ĐƠN HÀNG (SELLER FULFILLMENT)

## 🎯 Mục tiêu
Kiểm thử hành trình người bán (Seller/Merchant): nhận thông báo đơn hàng mới, duyệt đơn, đóng gói, in phiếu xuất kho và bàn giao hàng cho đơn vị vận chuyển.

---

## 🔍 Checklist Kiểm Thử Chi Tiết

### 4.1 Thông Báo & Tiếp Nhận Đơn Hàng (Order Notification)
- [ ] Shop nhận thông báo realtime qua WebSocket / Push Notification khi có đơn hàng mới.
- [ ] Truy cập Kênh Người Bán (`GET /api/v1/seller/orders`): Đơn hàng hiển thị đầy đủ thông tin: Mã đơn, người mua, sản phẩm, địa chỉ, phương thức thanh toán.

### 4.2 Xử Lý & Xuất Kho (Fulfillment & Pick/Pack)
- [ ] Người bán duyệt xác nhận đơn hàng (`PATCH /api/v1/seller/orders/{id}/confirm`) -> Chuyển sang trạng thái `CONFIRMED`.
- [ ] Đóng gói & chuẩn bị hàng (`PATCH /api/v1/seller/orders/{id}/prepare`) -> Chuyển sang trạng thái `PREPARING`.
- [ ] In phiếu đóng gói / Phiếu gửi hàng (Packing Slip / Shipping Label) có mã vận đơn.

### 4.3 Bàn Giao Cho Đơn Vị Vận Chuyển (Handover to Carrier)
- [ ] Bàn giao kiện hàng cho Shipper / Đơn vị vận chuyển (`PATCH /api/v1/seller/orders/{id}/ship`).
- [ ] Cung cấp thông tin nhà vận chuyển và mã vận đơn: `{ carrier: "HUKI_EXPRESS", trackingCode: "VN..." }`.
- [ ] Trạng thái đơn hàng cập nhật thành `SHIPPED`.
- [ ] Buyer theo dõi hành trình cập nhật đồng bộ (`GET /api/v1/orders/{id}/tracking`).

---

## 🛠️ Script thực thi
Script: [scripts/e2e-phase4-seller-fulfillment.mjs](file:///e:/HuKi/scripts/e2e-phase4-seller-fulfillment.mjs)
Lệnh chạy: `node scripts/e2e-phase4-seller-fulfillment.mjs`
