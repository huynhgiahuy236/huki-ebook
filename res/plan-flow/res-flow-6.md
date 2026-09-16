# BÁO CÁO ĐÁNH GIÁ NGHIỆM THU - LUỒNG 6 (FLOW 6)
## TỰ ĐỘNG THU HỒI TỒN KHO & XỬ LÝ ĐƠN HẾT HẠN THANH TOÁN (STOCK RECOVERY & TIMEOUT 2M TTL)

---

### 👤 Người thực hiện đánh giá: Project Manager (PM Audit)
### 📅 Ngày đánh giá: 16/09/2026
### 📦 Hệ thống kiểm thử: `commerce-service` (Port 3003), Redis BullMQ Queue, PostgreSQL, `web` Next.js (Port 3100)

---

## I. TỔNG QUAN ĐÁNH GIÁ CHUNG (EXECUTIVE SUMMARY)

| Chỉ Số | Đánh Giá | Ghi Chú |
|---|:---:|---|
| **Mức độ hoàn thành** | **97%** | Engine Delayed Job / Cron quét đơn quá hạn 2 phút, tự động hủy đơn và giải phóng tồn kho hoàn tất |
| **Độ ổn định Backend** | 🟢 **Đạt** | Xử lý an toàn tranh chấp Webhook đến muộn (Late Webhook) và Tự động hoàn tiền |
| **Trải nghiệm Frontend** | 🟢 **Đạt** | Thông báo Banner/Modal đơn hết hạn, nhãn lý do "Quá hạn thanh toán 2 phút (đã hoàn kho)" |
| **Đối chiếu E-Commerce** | 🟢 **Tương đồng Shopee/Lazada** | Cơ chế Auto-Cancel và Release Stock chuẩn quốc tế |

---

## II. CHI TIẾT KẾT QUẢ ĐẠT ĐƯỢC (DELIVERABLES AUDIT)

### 🟢 1. CÁC TÍNH NĂNG ĐÃ HOÀN THÀNH & ĐẠT CHUẨN (PASSED)
* 🟢 **Cơ chế Hẹn giờ Hết hạn 2 Phút (TTL 120s)**:
  * Khi đơn hàng thanh toán online VietQR được tạo, hệ thống lập tức gắn mốc `expiresAt = now + 2 phút`.
  * Hàng đợi Delayed Job / Scheduled Worker tự động kích hoạt tiến trình xử lý đúng thời điểm hết hạn.
* 🟢 **Tự động Giải phóng Tồn kho Tạm giữ (`releaseReservedStock`)**:
  * Chuyển trạng thái đơn hàng sang `CANCELLED` kèm lý do: *"Đơn hàng đã tự động bị hủy do hết hạn thanh toán (2 phút)"*.
  * Tự động hoàn trả $100\%$ số lượng sách giữ trong `reserved_stock` về lại `available_stock`.
  * Hoàn trả lại hạn mức Flash Sale (nếu có áp dụng).
* 🟢 **Xử lý An toàn Tranh chấp Webhook đến muộn (Late Webhook Handling)**:
  * Nếu khách hàng chuyển khoản ở giây thứ 119 và Webhook ngân hàng đến ở giây thứ 125 (khi đơn đã bị hủy và sách đã bị người khác mua mất):
  * Backend tự động phát hiện `order.status === 'CANCELLED'` và kích hoạt quy trình `REFUND_PENDING` để hoàn tiền tự động về tài khoản ngân hàng của khách, không bao giờ xảy ra lỗi âm kho.
* 🟢 **Trải nghiệm Người dùng Minh bạch trên Frontend**:
  * Màn hình Chi tiết đơn hàng hiển thị Banner thông báo màu đỏ rõ ràng: *"Đơn hàng đã tự động bị hủy do hết hạn thanh toán (2 phút) - Số lượng sách đã được tự động hoàn trả về kho"*.

---

## III. SO SÁNH ĐỐI CHIẾU VỚI SHOPEE / TIKI / LAZADA

| Tiêu Chí Đánh Giá | Shopee / Lazada / Tiki | HUKI Ebook (Hiện Tại) | Đánh Giá PM |
|---|---|---|:---:|
| **Thời gian đếm ngược thanh toán** | Shopee: 15-30 phút; Tiki: 15 phút | HUKI: 2 phút (tối ưu demo và test luồng nhanh) | 🟢 **Rất thuận tiện kiểm thử** |
| **Tự động hoàn kho khi hết hạn** | Tự động trả số lượng tồn về kho ngay khi hủy đơn | Tự động gọi `reservations.release()` và FlashSale release | 🟢 **Chính xác 100%** |
| **Xử lý chuyển tiền muộn (Late Pay)** | Tự động hoàn tiền vào Ví ShopeePay / Tài khoản | Tự động chuyển `paymentStatus = 'REFUND_PENDING'` | 🟢 **Bảo vệ toàn vẹn kho** |
| **Thông báo nhắc thanh toán** | Push notification khi còn 5 phút | Đồng hồ đếm ngược trực tiếp trên Modal VietQR | 🔵 **Khuyến nghị thêm Web Push** |

---

## IV. RỦI RO, GAPS & KHUYẾN NGHỊ NÂNG CẤP (RISKS & RECOMMENDATIONS)

* 🔵 **Khuyến nghị 1 (Cấu hình TTL linh hoạt theo môi trường)**:
  * Môi trường Development/Demo: Giữ TTL = 2 phút (120s) để kiểm thử nhanh.
  * Môi trường Production thực tế: Có thể cấu hình `ORDER_PAYMENT_TTL_MINUTES = 15` qua `.env` để khách hàng có đủ thời gian mở app ngân hàng.
* 🔴 **Lưu ý 1 (Webhook PayOS Retry)**:
  * Cần duy trì tính năng Idempotent Webhook để tránh xử lý trùng lặp khi PayOS gửi retry nhiều lần.

---

## V. MA TRẬN TEST CASES (TC CHECKLIST)

| Mã Test Case | Nội Dung Kiểm Thử | Trạng Thái |
|:---:|---|:---:|
| **TC_TIMEOUT_01** | Tạo đơn hàng online và gắn `expiresAt` chính xác 2 phút | 🟢 **PASS** |
| **TC_TIMEOUT_02** | Sau 2 phút không thanh toán &rarr; Tự động chuyển `CANCELLED` | 🟢 **PASS** |
| **TC_TIMEOUT_03** | Toàn bộ tồn kho tạm giữ được giải phóng về kho khả dụng | 🟢 **PASS** |
| **TC_TIMEOUT_04** | Hạn mức Flash Sale của sách được khôi phục nguyên vẹn | 🟢 **PASS** |
| **TC_TIMEOUT_05** | Webhook thanh toán đến sau 2 phút &rarr; Kích hoạt hoàn tiền (Refund) | 🟢 **PASS** |
| **TC_TIMEOUT_06** | Giao diện hiển thị rõ ràng lý do hủy đơn và trạng thái hoàn kho | 🟢 **PASS** |
