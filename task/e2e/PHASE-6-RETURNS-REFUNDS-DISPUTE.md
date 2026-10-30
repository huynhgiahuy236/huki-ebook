# 🔄 PHASE 6: TRẢ HÀNG, HOÀN TIỀN & XỬ LÝ KHIẾU NẠI (RMA & DISPUTES)

## 🎯 Mục tiêu
Kiểm thử quy trình Trả hàng / Hoàn tiền (Return Merchandise Authorization - RMA) và Khiếu nại trọng tài (Dispute Arbitration) theo đúng cơ chế bảo vệ quyền lợi người tiêu dùng của Shopee/Lazada.

---

## 🔍 Checklist Kiểm Thử Chi Tiết

### 6.1 Yêu Cầu Trả Hàng / Hoàn Tiền (RMA Request)
- [ ] Trong thời hạn bảo vệ, Buyer gửi yêu cầu Trả hàng / Hoàn tiền (`POST /api/v1/orders/{id}/items/{orderItemId}/return-request`) hoặc tạo khiếu nại (`POST /api/v1/orders/{id}/disputes`).
- [ ] Điền lý do: Hàng rách/hỏng, sách giao sai tựa đề, sách in thiếu trang.
- [ ] Đính kèm bằng chứng (`POST /api/v1/orders/{id}/disputes/evidence`).
- [ ] Tiền đơn hàng trong tài khoản Escrow lập tức bị **ĐÓNG BĂNG (FROZEN)** (`GET /api/v1/orders/admin/escrow/frozen`), không thể giải ngân cho Shop.

### 6.2 Phản Hồi Từ Người Bán (Seller Response)
- [ ] **Kịch bản A (Shop đồng ý hoàn tiền ngay):** Shop chấp thuận (`POST /api/v1/orders/seller/return-requests/{id}/accept`) ➡️ Tiền hoàn trả về Ví Buyer.
- [ ] **Kịch bản B (Shop yêu cầu gửi đổi hàng):** Shop gửi hàng thay thế (`POST /api/v1/orders/seller/return-requests/{id}/ship-replacement`).
- [ ] **Kịch bản C (Shop khiếu nại từ chối):** Shop gửi khiếu nại (`POST /api/v1/orders/seller/return-requests/{id}/dispute`) ➡️ Đơn chuyển lên Admin phân xử.

### 6.3 Phân Xử Trọng Tài Của Sàn (Admin Arbitration)
- [ ] Admin xem xét bằng chứng từ 2 phía (`GET /api/v1/orders/admin/disputes/{id}`).
- [ ] Admin ra phán quyết (`POST /api/v1/orders/admin/return-requests/{id}/arbitrate` hoặc `/admin/disputes/{disputeId}/arbitrate`):
  - Nếu phán quyết Buyer thắng: Tiền Escrow hoàn về Ví Buyer.
  - Nếu phán quyết Shop thắng: Tiền Escrow giải ngân về Ví Shop.

---

## 🛠️ Script thực thi
Script: [scripts/e2e-phase6-returns-refunds.mjs](file:///e:/HuKi/scripts/e2e-phase6-returns-refunds.mjs)
Lệnh chạy: `node scripts/e2e-phase6-returns-refunds.mjs`
