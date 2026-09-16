# BÁO CÁO ĐÁNH GIÁ NGHIỆM THU - LUỒNG 7 (FLOW 7)
## THANH TOÁN TRỰC TUYẾN PAYOS (VIETQR) & XỬ LÝ ĐƠN HÀNG TỨC THÌ

---

### 👤 Người thực hiện đánh giá: Project Manager (PM Audit)
### 📅 Ngày đánh giá: 16/09/2026
### 📦 Hệ thống kiểm thử: `commerce-service` (Port 3003), `web` Next.js (Port 3100), PostgreSQL, Redis, PayOS Sandbox

---

## I. TỔNG QUAN ĐÁNH GIÁ CHUNG (EXECUTIVE SUMMARY)

| Chỉ Số | Đánh Giá | Ghi Chú |
|---|:---:|---|
| **Mức độ hoàn thành** | **96%** | Đã hoàn thiện toàn bộ luồng thanh toán VietQR PayOS, Webhook và Escrow |
| **Độ ổn định Backend** | 🟢 **Đạt** | Cơ chế Khóa tạm giữ tồn kho (2 phút) & Idempotency Webhook hoạt động tin cậy |
| **Trải nghiệm Frontend** | 🟢 **Đạt** | Modal đếm ngược Live Countdown, Auto-refresh trạng thái khi chuyển khoản xong |
| **Đối chiếu E-Commerce** | 🔵 **Tốt** | Tương đồng ShopeePay/TikiPay về cơ chế QR động và tự động hoàn đơn khi quá hạn |

---

## II. CHI TIẾT KẾT QUẢ ĐẠT ĐƯỢC (DELIVERABLES AUDIT)

### 🟢 1. CÁC TÍNH NĂNG ĐÃ HOÀN THÀNH & ĐẠT CHUẨN (PASSED)
* 🟢 **Tạo Payment Link PayOS VietQR tự động**:
  * Khi người mua chọn phương thức `ONLINE_PAYMENT`, hệ thống tự sinh mã QR động chứa đúng mã đơn hàng `HUKI <orderCode>` và số tiền thanh toán chính xác từng đồng.
* 🟢 **Modal Đếm Ngược Trực Quan (`PaymentCountdownModal.jsx`)**:
  * Hiển thị đồng hồ đếm ngược 120 giây (2 phút) chuẩn xác.
  * Tích hợp nút sao chép nhanh: Số tài khoản, Ngân hàng, Nội dung chuyển khoản và Số tiền.
  * Tự động Polling kiểm tra trạng thái thanh toán ngầm mỗi 2.5s. Khi nhận diện chuyển khoản thành công, tự động đóng modal và chuyển sang màn hình hoàn tất đơn.
* 🟢 **Xử lý Webhook Idempotency & Tự động kích hoạt đơn hàng**:
  * Xử lý webhook từ PayOS an toàn: Chuyển `order.paymentStatus = 'SUCCEEDED'` và `order.status = 'PROCESSING'`.
  * Tự động hoàn tất và mở khóa Tủ sách tức thì cho các sản phẩm Ebook bản quyền DRM.
* 🟢 **Cơ chế Khóa giữ tồn kho & Tự động Hủy hoàn kho (Auto-Expire 2 Minutes)**:
  * Redis Lock / Cron Job tự động quét và giải phóng tồn kho sách giấy sau 2 phút nếu người mua không quét QR thanh toán.
  * Trả lại hạn mức Flash Sale (nếu có áp dụng).

---

## III. SO SÁNH ĐỐI CHIẾU VỚI SHOPEE / TIKI / LAZADA

| Tiêu Chí Đánh Giá | Shopee / Tiki / Lazada | HUKI Ebook (Hiện Tại) | Đánh Giá PM |
|---|---|---|:---:|
| **Cơ chế thanh toán QR** | Mã VietQR động, tự động quét nội dung và số tiền | VietQR PayOS động, chính xác từng đồng | 🟢 **Ngang bằng** |
| **Thời gian giữ hàng (Inventory Lock)** | Shopee giữ 15-30 phút; Tiki giữ 15 phút | HUKI giữ 2 phút (tối ưu hóa thanh toán tức thì) | 🟢 **Phù hợp mô hình** |
| **Xử lý sản phẩm số (Digital)** | Tiki Ebook mở khóa ngay sau khi thanh toán thành công | Kích hoạt ngay vào Tủ Sách, mở Web Reader trực tiếp | 🟢 **Rất tốt** |
| **Giao diện đếm ngược** | Thanh tiến trình countdown kèm mã QR | Modal nổi popup với đồng hồ đếm ngược & nút copy nhanh | 🟢 **Trải nghiệm mượt** |
| **Thông báo biến động số dư** | Push notification tức thì qua App Mobile | Webhook backend xử lý + Frontend Polling | 🔵 **Khuyến nghị bổ sung WebSocket** |

---

## IV. RỦI RO, GAPS & KHUYẾN NGHỊ NÂNG CẤP (RISKS & RECOMMENDATIONS)

* 🔵 **Khuyến nghị 1 (WebSocket Server-Sent Events)**:
  * Hiện tại Frontend đang dùng cơ chế Polling `checkStatus` mỗi 2.5 giây. Trong tương lai với lượng tải cao, nên kích hoạt Socket.IO/SSE để Backend đẩy thẳng tín hiệu sang Frontend mà không cần gọi API định kỳ.
* 🔴 **Lưu ý 1 (Trường hợp chuyển khoản lệch nội dung)**:
  * Nếu người dùng gõ sai cú pháp chuyển khoản ngoài ngân hàng, PayOS webhook không tự match được. Cần có màn hình "Hỗ trợ tra soát giao dịch" cho Admin đối soát thủ công.

---

## V. MA TRẬN TEST CASES (TC CHECKLIST)

| Mã Test Case | Nội Dung Kiểm Thử | Trạng Thái |
|:---:|---|:---:|
| **TC_PAY_01** | Tạo đơn hàng thanh toán PayOS VietQR | 🟢 **PASS** |
| **TC_PAY_02** | Hiển thị Live Countdown Modal 120s | 🟢 **PASS** |
| **TC_PAY_03** | Webhook PayOS xác nhận thanh toán thành công | 🟢 **PASS** |
| **TC_PAY_04** | Tự động kích hoạt Ebook số vào Tủ Sách sau thanh toán | 🟢 **PASS** |
| **TC_PAY_05** | Hết hạn 2 phút tự động hủy đơn và hoàn trả tồn kho | 🟢 **PASS** |
| **TC_PAY_06** | Nút In biên lai và Xem chi tiết đơn hàng hoạt động | 🟢 **PASS** |
