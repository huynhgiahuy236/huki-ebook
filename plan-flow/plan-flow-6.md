# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 6
## TỰ ĐỘNG THU HỒI TỒN KHO & XỬ LÝ ĐƠN HẾT HẠN THANH TOÁN (AUTOMATIC STOCK RECOVERY & RESERVATION TIMEOUT)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng giải pháp tự động hủy đơn hàng và giải phóng tồn kho tạm giữ (Reserved Stock) khi khách hàng quá thời hạn thanh toán (TTL 15 phút), giải phóng dòng sản phẩm để bán cho khách hàng khác. Đảm bảo tính toán toàn vẹn dữ liệu, chống tranh chấp giữa Webhook thanh toán đến muộn và tiến trình tự động hủy đơn.
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `commerce-service` / `order-service`: Module `OrderTimeoutModule`, `OrderTimeoutProcessor` (BullMQ Worker).
    * `inventory-service`: Triển khai API giải phóng kho `releaseReservedStock()` đồng bộ PostgreSQL và Redis.
    * `payment-service`: Quản lý tích hợp PayOS, xử lý hủy liên kết thanh toán và webhook tranh chấp.
    * `notification-service`: Phát sự kiện WebSocket và Web Push nhắc nhở thanh toán ở phút thứ 10.
  * **Frontend**:
    * `web/src/ui/pages/checkout/PaymentWaitingPage.jsx`: Giao diện hiển thị mã VietQR kèm đồng hồ đếm ngược 15:00 và hiệu ứng đổi màu cảnh báo khẩn cấp.
    * `web/src/ui/components/notifications/OrderTimeoutToast.jsx`: Thông báo Toast realtime khi đơn bị hủy do hết hạn.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 6
                                           │
    ┌────────────────┬─────────────────────┼─────────────────────┬────────────────┐
    ▼                ▼                     ▼                     ▼                ▼
 PHẦN 1:          PHẦN 2:               PHẦN 3:               PHẦN 4:          PHẦN 5:
SCHEMA & QUEUE   TIMEOUT WORKER &      LATE WEBHOOK &        REALTIME UI &    TESTING SUITE &
CONFIGURATION    STOCK RELEASE LOGIC   AUTO-REFUND ENGINE    PUSH NOTIF SYNC  CHAOS AUDIT
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & CẤU HÌNH BULLMQ QUEUE

### 📌 Mục tiêu:
Bổ sung các trường quản lý thời gian hết hạn trong cơ sở dữ liệu và thiết lập hàng đợi BullMQ hỗ trợ Delayed Jobs chính xác.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Cập nhật Schema Bảng `orders`**
  * Bổ sung các cột trong `prisma/schema.prisma`:
    * `expires_at`: DateTime (Mốc thời gian hết hạn thanh toán).
    * `cancel_reason`: String (Lý do hủy đơn).
    * `cancelled_at`: DateTime (Thời điểm thực tế đơn bị hủy).
    * `stock_released`: Boolean (Mặc định `false`, đánh dấu kho đã được hoàn).
    * `payment_status`: Enum (`PENDING`, `PAID`, `EXPIRED`, `REFUNDED`).

* **Task 1.2: Cấu hình BullMQ Queue trong `commerce-service`**
  * Khởi tạo hàng đợi `order-timeout-queue` kết nối Redis.
  * Thiết lập cấu hình retry và dead-letter:
    * `removeOnComplete: true` (Tiết kiệm bộ nhớ Redis sau khi job hoàn tất).
    * `attempts: 3` kèm chính sách backoff lũy thừa nếu gặp lỗi kết nối DB.

---

## PHẦN 2: TRIỂN KHAI TIMEOUT WORKER & LOGIC THU HỒI TỒN KHO

### 📌 Mục tiêu:
Xây dựng Worker chạy nền tiếp nhận các job đếm ngược 10 phút và 15 phút, thực hiện hủy đơn và hoàn kho nguyên tử.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: Triển khai Lập lịch Job Khi Tạo Đơn Hàng (`OrderSchedulerService`)**
  * Khi hàm `createOrder()` thành công:
    * Tính `expires_at = new Date(Date.now() + 15 * 60 * 1000)`.
    * Đẩy Job 1 (Reminder): `{ orderId, type: 'REMIND_10M' }`, `delay: 10 * 60 * 1000`.
    * Đẩy Job 2 (AutoCancel): `{ orderId, type: 'AUTO_CANCEL_15M' }`, `delay: 15 * 60 * 1000`.

* **Task 2.2: Triển khai Bộ Xử Lý Worker (`OrderTimeoutProcessor`)**
  * Xử lý Job `REMIND_10M`:
    * Kiểm tra nếu đơn vẫn là `PENDING_PAYMENT` &rarr; Bắn sự kiện `ORDER_EXPIRING_SOON` qua Notification Service.
  * Xử lý Job `AUTO_CANCEL_15M`:
    * Kiểm tra trạng thái đơn: Nếu vẫn là `PENDING_PAYMENT`:
    * Mở Transaction cập nhật đơn hàng:
      ```sql
      UPDATE orders 
      SET order_status = 'CANCELLED', payment_status = 'EXPIRED', cancel_reason = 'Hết hạn thanh toán 15m'
      WHERE id = :orderId AND order_status = 'PENDING_PAYMENT';
      ```

* **Task 2.3: Tích hợp Giải Phóng Tồn Kho với `inventory-service`**
  * Gọi hàm `inventoryService.releaseReservedStock(items, orderId)`:
    * Trừ `reserved_stock` trong PostgreSQL: `reserved_stock = GREATEST(0, reserved_stock - :qty)`.
    * Tăng bộ đếm Redis Atomic: `INCRBY stock:book:{id} :qty`.
    * Ghi log kiểm toán `inventory_logs` với `action_type = 'RELEASE'`.

---

## PHẦN 3: XỬ LÝ TRANH CHẤP THANH TOÁN ĐẾN MUỘN & HOÀN TIỀN TỰ ĐỘNG

### 📌 Mục tiêu:
Xử lý các tình huống biên (Edge Cases) khi khách thanh toán vào giây thứ 14:59 nhưng Webhook PayOS đến sau khi đơn đã bị hủy lúc phút thứ 15.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: Phân xử Webhook Tranh chấp trong `PaymentService`**
  * Khi nhận Webhook thanh toán thành công từ PayOS cho đơn hàng `orderId`:
  * Nếu đơn hàng đang mang trạng thái `CANCELLED_EXPIRED`:
    * Bước 1: Kiểm tra tồn kho khả dụng của các đầu sách trong đơn (`checkStockAvailability`).
    * Bước 2A (Nếu còn hàng): Khôi phục đơn sang trạng thái `PAID`, khóa lại tồn kho và gửi thông báo xác nhận thành công cho khách.
    * Bước 2B (Nếu đã hết hàng do người khác mua mất): Chuyển đơn sang trạng thái `AUTO_REFUND_PENDING`.

* **Task 3.2: Triển khai Module Hoàn Tiền Tự Động (`AutoRefundService`)**
  * Tích hợp API hoàn tiền của Cổng PayOS / Ngân hàng:
    * Khởi tạo giao dịch hoàn tiền 100% về tài khoản gốc của khách.
    * Cập nhật `payment_status = 'REFUNDED'`.
    * Gửi email xin lỗi độc giả kèm mã giảm giá đền bù (Voucher xin lỗi 10%).

---

## PHẦN 4: GIAO DIỆN ĐẾM NGƯỢC THỜI GIAN THỰC & THÔNG BÁO ĐẨY

### 📌 Mục tiêu:
Tạo trải nghiệm thanh toán rõ ràng, minh bạch với đồng hồ đếm ngược sinh động và cập nhật trạng thái đơn hàng theo thời gian thực không cần tải lại trang.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Xây dựng Component Đồng Hồ Đếm Ngược (`PaymentCountdown.jsx`)**
  * Nhận `expiresAt` từ props, đếm ngược dạng `MM:SS`.
  * Hiệu ứng chuyển đổi màu sắc:
    * `15:00 - 05:01`: Màu xanh lam thanh lịch.
    * `05:00 - 00:00`: Màu đỏ cảnh báo nhấp nháy (Pulse animation) kèm thông báo "Đơn sắp hết hạn!".

* **Task 4.2: Tích hợp WebSocket Lắng Nghe Trạng Thái Đơn Hàng**
  * Lắng nghe các sự kiện:
    * `PAYMENT_SUCCESS`: Tự động chuyển hướng sang trang Hoàn tất đơn hàng (`/checkout/success`).
    * `ORDER_EXPIRED`: Tự động vô hiệu hóa mã QR, mở Popup thông báo "Đơn hàng đã hết hạn thanh toán" và cung cấp nút "Tạo lại đơn hàng mới".

---

## PHẦN 5: KIỂM THỬ TỰ ĐỘNG TOÀN TRÌNH & ĐÁNH GIÁ ĐỘ TIN CẬY (TESTING SUITE)

### 📌 Mục tiêu:
Xác thực 100% độ chính xác của cơ chế hẹn giờ thu hồi kho qua các kịch bản kiểm thử tự động.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Viết Unit & Integration Test Cho Timeout Worker**
  * Test Case 1: Giả lập đơn hàng quá hạn 15m &rarr; Xác nhận đơn chuyển `CANCELLED`, kho được hoàn đúng số lượng.
  * Test Case 2: Giả lập đơn đã thanh toán ở phút 14:00 &rarr; Xác nhận Worker khi chạy ở phút 15:00 không can thiệp.

* **Task 5.2: Viết Integration Test Xử Lý Webhook Đến Trễ (Late Webhook)**
  * Test Case 3: Webhook về sau khi đơn đã hủy và kho còn hàng &rarr; Xác nhận đơn được khôi phục thành công.
  * Test Case 4: Webhook về sau khi đơn đã hủy và kho hết hàng &rarr; Xác nhận lệnh hoàn tiền tự động được kích hoạt.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Database** | Prisma Schema bảng `orders` (bổ sung `expires_at`, `stock_released`) | ⏳ Sẵn sàng | Backend Team |
| **Queue Engine** | Cấu hình BullMQ Delayed Jobs 10m và 15m | ⏳ Sẵn sàng | Backend Team |
| **Worker Logic** | Xử lý tự động hủy đơn và giải phóng tồn kho trên DB + Redis | ⏳ Sẵn sàng | Backend Team |
| **Late Webhook** | Phân xử tranh chấp Webhook đến muộn & luồng hoàn tiền tự động | ⏳ Sẵn sàng | Backend Team |
| **Frontend UI** | Giao diện đếm ngược 15:00, cảnh báo đỏ và WebSocket sync | ⏳ Sẵn sàng | Frontend Team |
| **Quality Audit** | Vượt qua 100% Ma trận kiểm thử 6 kịch bản (TC_TO_01 đến TC_TO_06) | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 6 thuộc Nền tảng Sách Huki Ebook.*
