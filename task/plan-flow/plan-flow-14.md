# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 14
## MUA & MỞ KHÓA EBOOK TỨC THÌ QUA PAYOS (INSTANT EBOOK UNLOCK & VIETQR WEBHOOK PROCESSING)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng toàn diện luồng xử lý thanh toán tự động qua cổng PayOS VietQR và cấp phát bản quyền đọc sách điện tử (Ebook DRM License) tức thì trong vòng $< 2\text{ giây}$. Đảm bảo cơ chế bảo mật chữ ký HMAC-SHA256, kiểm soát Idempotency chống xử lý trùng lặp giao dịch, tích hợp WebSocket thông báo đẩy Realtime lên giao diện người mua và tự động đồng bộ cuốn sách vào Tủ sách cá nhân (`/user/my-library`) sẵn sàng mở đọc trên Web Reader.
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `payment-service`: Module `PayOSWebhookModule`, `PayOSWebhookService`, `PaymentTransactionsService`.
    * `drm-service` / `order-service`: Module `EbookLicenseService` (quản lý cấp phát và kiểm tra bản quyền đọc số).
    * `WebSocket Gateway`: Kênh `PaymentSocketGateway` phát sự kiện `EBOOK_UNLOCKED` tới client.
    * Prisma Schema: Bảng `user_ebook_licenses`, `payment_transactions`.
  * **Frontend (Storefront & User Library)**:
    * `web/src/ui/pages/checkout/PaymentWaitingPage.jsx`: Tự động lắng nghe Socket để đóng popup chờ thanh toán và hiển thị màn hình chúc mừng.
    * `web/src/ui/pages/user/MyLibraryPage.jsx`: Giao diện Tủ sách cá nhân hiển thị các tựa sách đã mở khóa kèm nút "Đọc tiếp".
    * `web/src/ui/components/checkout/EbookUnlockedModal.jsx`: Modal thông báo mở khóa thành công kèm nút "📖 Đọc Sách Ngay".

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 14
                                            │
    ┌────────────────┬──────────────────────┼──────────────────────┬────────────────┐
    ▼                ▼                      ▼                      ▼                ▼
 PHẦN 1:          PHẦN 2:                PHẦN 3:                PHẦN 4:          PHẦN 5:
SCHEMA & PRISMA  PAYOS WEBHOOK          DRM LICENSE ENGINE     MY LIBRARY UI &  TESTING SUITE &
LICENSE MODEL    & IDEMPOTENCY CHECK    & WEBSOCKET PUSH       READER REDIRECT  LATENCY AUDIT
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & SCHEMA PRISMA BẢN QUYỀN SỐ

### 📌 Mục tiêu:
Thiết lập bảng lưu trữ giấy phép bản quyền số `user_ebook_licenses` và bảng lịch sử giao dịch `payment_transactions` trên PostgreSQL.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Thiết kế Bảng `user_ebook_licenses`**
  * Định nghĩa bảng trong `prisma/schema.prisma`:
    * `id`: UUID, Primary Key.
    * `user_id`: UUID, Index, FK `users`.
    * `book_id`: UUID, Index, FK `books`.
    * `order_id`: UUID, FK `orders`.
    * `business_id`: UUID, FK `businesses`.
    * `license_type`: Enum (`PERPETUAL`, `RENTAL`).
    * `status`: Enum (`ACTIVE`, `REVOKED`).
    * `granted_at`: DateTime.
    * `last_read_at`: DateTime (Nullable).
    * Unique Constraint: `[user_id, book_id]`.

* **Task 1.2: Thiết kế Bảng `payment_transactions`**
  * Định nghĩa bảng ghi vết giao dịch:
    * `id`: UUID, Primary Key.
    * `order_id`: UUID, FK `orders`.
    * `payment_gateway`: String (Default: 'PAYOS').
    * `transaction_id`: String, Unique, Index.
    * `amount`: Decimal.
    * `payload`: Json.
    * `signature`: String.
    * `status`: Enum (`SUCCESS`, `DUPLICATE`, `FAILED`).
    * `created_at`: DateTime.

---

## PHẦN 2: PHÁT TRIỂN PAYOS WEBHOOK INGESTION & IDEMPOTENCY HANDLER

### 📌 Mục tiêu:
Xây dựng endpoint tiếp nhận Webhook bảo mật, xác thực chữ ký điện tử và ngăn chặn tuyệt đối việc xử lý trùng lặp giao dịch.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: Triển khai Module Xác Thực Chữ Ký HMAC-SHA256**
  * Hàm `verifyPayOSSignature(data, signature, checksumKey)`:
    * Sắp xếp các khóa của `data` theo thứ tự bảng chữ cái.
    * Tạo chuỗi ký tự chuẩn hóa (Canonical Query String).
    * Tính toán mã băm HMAC-SHA256 với `PAYOS_CHECKSUM_KEY`.
    * So sánh an toàn thời gian cố định (Timing-safe comparison) với chữ ký gửi đến.

* **Task 2.2: Triển khai Bộ Xử Lý Chống Trùng Lặp (`IdempotencyService`)**
  * Sử dụng Redis Lock và bản ghi `payment_transactions`:
    * Khóa giao dịch: `SET lock:payment:trans:{id} 1 EX 10 NX`.
    * Nếu giao dịch đã có trong CSDL $\rightarrow$ Bỏ qua và trả về HTTP 200 ngay lập tức.
    * Nếu giao dịch mới $\rightarrow$ Tiến hành mở Transaction xử lý đơn hàng.

---

## PHẦN 3: ENGINE CẤP PHÉP BẢN QUYỀN SỐ & WEBSOCKET REALTIME

### 📌 Mục tiêu:
Tự động kích hoạt bản quyền số vào bảng `user_ebook_licenses` và bắn tín hiệu mở khóa tức thì ra trình duyệt người mua.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: Triển khai Module Cấp Phép Bản Quyền (`EbookLicenseService`)**
  * Hàm `grantLicenseForOrder(orderId, userId)`:
    * Lấy danh sách các sản phẩm trong đơn có định dạng `EBOOK` hoặc `HYBRID`.
    * Tạo bản ghi mới trong bảng `user_ebook_licenses` với `status = 'ACTIVE'`.
    * Cập nhật `orders.payment_status = 'PAID'`.
    * Nếu là đơn thuần Ebook: Cập nhật `sub_orders.status = 'DELIVERED'`.

* **Task 3.2: Tích hợp WebSocket Gateway Phát Tín Hiệu Mở Khóa**
  * Phát sự kiện `EBOOK_UNLOCKED`:
    * Payload: `{ orderId, userId, bookIds: [...], message: "Bản quyền Ebook đã sẵn sàng!" }`.
    * Phát thẳng vào Socket Channel của User đang mở trang thanh toán.

---

## PHẦN 4: GIAO DIỆN TỦ SÁCH CÁ NHÂN & POPUP CHUYỂN HƯỚNG ĐỌC NGAY

### 📌 Mục tiêu:
Tạo trải nghiệm tức thì cho độc giả với thông báo chúc mừng sinh động và Tủ sách cá nhân hiển thị trực quan.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Xây dựng Modal Mở Khóa Thành Công (`EbookUnlockedModal.jsx`)**
  * Tự động bật lên khi nhận sự kiện WebSocket từ server:
    * Hiệu ứng pháo hoa chúc mừng 🎉.
    * Tiêu đề: *"Thanh toán thành công! Sách đã có trong Tủ sách."*
    * Nút bấm hành động nổi bật: **"📖 Đọc Sách Ngay"** (chuyển hướng sang `/reader/:bookId`) và **"📚 Về Tủ Sách"** (`/user/my-library`).

* **Task 4.2: Xây dựng Trang Tủ Sách Cá Nhân ([`MyLibraryPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/user/MyLibraryPage.jsx))**
  * Lưới sách sở hữu (My Books Grid):
    * Bìa sách, Tên sách, Tác giả, Nhãn phân loại (`EPUB` / `PDF`).
    * Thanh tiến trình đọc sách: `Đã đọc 35%` hoặc `Chưa đọc`.
    * Nút bấm: **"Đọc Sách"** mở trực tiếp Web Reader.
    * Bộ lọc & Tìm kiếm: Lọc theo Thể loại, Sách đang đọc, Sách mới mua.

---

## PHẦN 5: KIỂM THỬ TOÀN TRÌNH & ĐÁNH GIÁ TỐC ĐỘ MỞ KHÓA (TEST SUITE)

### 📌 Mục tiêu:
Đảm bảo tốc độ mở khóa sách đạt $< 2\text{ giây}$ và an toàn tuyệt đối trước các đợt gửi lặp Webhook.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Unit & Integration Test PayOS Webhook Processing**
  * Giả lập gửi Webhook thanh toán chuẩn &rarr; Xác nhận tạo đúng bản ghi `user_ebook_licenses`.
  * Giả lập gửi Webhook sai chữ ký &rarr; Xác nhận hệ thống từ chối và chặn truy cập.
  * Giả lập gửi liên tiếp 5 Webhook giống hệt nhau &rarr; Xác nhận chỉ xử lý 1 lần, không trùng lặp license.

* **Task 5.2: Kiểm thử Đo Độ Trễ Mở Khóa Thực Tế (Latency Benchmark)**
  * Đo thời gian từ lúc Webhook chạm Server đến lúc WebSocket phát tín hiệu tới Client: Đảm bảo thời gian xử lý $\le 1.500\text{ms}$.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Database** | Prisma Schema bảng `user_ebook_licenses`, `payment_transactions` | ⏳ Sẵn sàng | Backend Team |
| **Webhook Security**| Xác thực chữ ký HMAC-SHA256 & Cơ chế chống trùng Idempotency | ⏳ Sẵn sàng | Backend Team |
| **DRM Provisioning**| Tự động tạo bản quyền số `ACTIVE` ngay khi nhận Webhook | ⏳ Sẵn sàng | Backend Team |
| **WebSocket Sync**| Tín hiệu mở khóa đẩy tức thì ra UI mà không cần F5 trang | ⏳ Sẵn sàng | Backend Team |
| **Frontend UI** | Giao diện `MyLibraryPage.jsx` & Modal chuyển hướng Web Reader | ⏳ Sẵn sàng | Frontend Team |
| **Latency Audit** | Tốc độ mở khóa $< 2\text{s}$, đạt 100% Ma trận kiểm thử (TC_EBK_01 đến 06) | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 14 thuộc Nền tảng Sách Huki Ebook.*
