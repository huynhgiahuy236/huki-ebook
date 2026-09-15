# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 5
## QUẢN LÝ TỒN KHO 3 TẦNG & KHÓA NGUYÊN TỬ CHỐNG TRANH CHẤP (3-TIER INVENTORY MANAGEMENT & RACE CONDITION LOCK)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Thiết kế và xây dựng toàn diện hệ thống quản lý kho 3 tầng (`on_hand_stock`, `reserved_stock`, `available_stock`) cùng engine khóa nguyên tử hai lớp (Redis Lua Script + PostgreSQL Conditional Update) nhằm loại bỏ hoàn toàn rủi ro bán vượt tồn kho (Overselling / Race Condition) khi hàng nghìn khách hàng mua sách đồng thời trong đợt cao điểm khuyến mãi.
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `inventory-service` / `commerce-service`: Module `InventoryModule`, `InventoryService`, `InventoryController`.
    * Prisma Schema: Bảng `book_inventories`, bảng nhật ký kiểm toán `inventory_logs`.
    * Redis Cluster & Lua Scripts: Tệp script `reserve_stock.lua`, `release_stock.lua`, bộ đếm `stock:book:{id}`.
    * Sagas / Event Bus: Xử lý các sự kiện `ORDER_CREATED` &rarr; `RESERVE_STOCK`, `ORDER_CANCELLED` &rarr; `RELEASE_STOCK`, `ORDER_SHIPPED` &rarr; `DEDUCT_ON_HAND`.
  * **Frontend (Seller Portal & Storefront)**:
    * [`SellerInventoryPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerInventoryPage.jsx): Giao diện quản lý biến động kho, điều chỉnh tồn thực, cấu hình ngưỡng cảnh báo và xem lịch sử xuất nhập.
    * [`BookDetailPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/public/BookDetailPage.jsx): Hiển thị trạng thái kho khả dụng, nhãn "Chỉ còn X cuốn", tự động khóa nút mua khi hết hàng.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 5
                                           │
    ┌────────────────┬─────────────────────┼─────────────────────┬────────────────┐
    ▼                ▼                     ▼                     ▼                ▼
 PHẦN 1:          PHẦN 2:               PHẦN 3:               PHẦN 4:          PHẦN 5:
DATABASE &       REDIS ATOMIC          BACKEND APIS &        SELLER UI &      HIGH CONCURRENCY
INVENTORY SCHEMA ENGINE (LUA SCRIPTS)  EVENT SAGA INTEGRATION STOREFRONT SYNC  TESTING & AUDIT
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & SCHEMA PRISMA TỒN KHO

### 📌 Mục tiêu:
Xây dựng cấu trúc lưu trữ dữ liệu kho 3 tầng và bảng lưu vết lịch sử biến động kho (`audit trail`) phục vụ đối soát, kiểm kê.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Thiết kế Schema Bảng `book_inventories`**
  * Tạo mô hình bảng trong `prisma/schema.prisma`:
    * `id`: UUID, Primary Key.
    * `book_id`: UUID, Unique Index, FK `books`.
    * `business_id`: UUID, FK `businesses`.
    * `on_hand_stock`: Int (Default: 0, Check $\ge 0$).
    * `reserved_stock`: Int (Default: 0, Check $\ge 0$).
    * `low_stock_threshold`: Int (Default: 10).
    * `version`: BigInt (Hỗ trợ Optimistic Locking).
    * `updated_at`: DateTime.
  * Thiết lập Check Constraint đảm bảo $on\_hand\_stock \ge reserved\_stock$.

* **Task 1.2: Thiết kế Schema Bảng `inventory_logs`**
  * Tạo mô hình nhật ký lịch sử:
    * `id`: UUID.
    * `book_id`: UUID, Index.
    * `order_id`: UUID (Nullable).
    * `action_type`: Enum (`RESERVE`, `RELEASE`, `DEDUCT_OUT`, `RESTOCK`, `ADJUST`).
    * `quantity_delta`: Int (Số lượng thay đổi $+ / -$).
    * `on_hand_after`: Int.
    * `reserved_after`: Int.
    * `actor_id`: UUID / String (`SYSTEM` hoặc ID nhân sự kho).
    * `note`: String.
    * `created_at`: DateTime.

---

## PHẦN 2: TRIỂN KHAI ENGINE KHÓA NGUYÊN TỬ TRÊN REDIS (REDIS LUA SCRIPTS)

### 📌 Mục tiêu:
Xây dựng lớp bảo vệ Lớp 1 (Layer 1 Atomic Cache) bằng Lua Script trên Redis, phản hồi $< 2\text{ms}$ và chặn 99.9% request tranh chấp trước khi chạm vào CSDL PostgreSQL.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: Viết Lua Script Tạm Giữ Tồn Kho (`reserve_stock.lua`)**
  * Logic script:
    * Lấy tồn kho hiện tại từ Redis Key `stock:book:{id}`.
    * So sánh với số lượng yêu cầu `requested_qty`.
    * Nếu đủ: Thực hiện trừ `DECRBY key requested_qty` và trả về `1` (Thành công).
    * Nếu không đủ: Giữ nguyên giá trị và trả về `0` (Hết hàng).

* **Task 2.2: Viết Lua Script Giải Phóng Tồn Kho (`release_stock.lua`)**
  * Logic script:
    * Nhận tham số số lượng cần hoàn lại `qty`.
    * Thực hiện tăng `INCRBY stock:book:{id} qty` và trả về tồn kho mới sau khi hoàn.

* **Task 2.3: Viết Module `RedisInventoryLockService`**
  * Đóng gói kết nối Redis, nạp trước (pre-load) các Lua script bằng `SCRIPT LOAD` để lấy SHA băm tối ưu hiệu năng.
  * Cung cấp các phương thức: `atomicReserve(bookId, qty)`, `atomicRelease(bookId, qty)`, `syncStockToRedis(bookId, availableQty)`.

---

## PHẦN 3: PHÁT TRIỂN BACKEND APIS & TÍCH HỢP ĐIỀU PHỐI ĐƠN HÀNG

### 📌 Mục tiêu:
Xây dựng các RESTful endpoints quản lý kho và xử lý luồng Saga giao dịch phân tán giữa `order-service` và `inventory-service`.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: Triển khai Phương thức Khóa Kho trong `InventoryService`**
  * Quy trình thực thi Atomic Transaction 2 bước:
    1. Gọi `RedisInventoryLockService.atomicReserve()`.
    2. Nếu thành công, mở Transaction trên PostgreSQL:
       ```sql
       UPDATE book_inventories
       SET reserved_stock = reserved_stock + :qty, updated_at = NOW()
       WHERE book_id = :id AND (on_hand_stock - reserved_stock) >= :qty;
       ```
    3. Ghi log vào `inventory_logs` (`action_type = 'RESERVE'`).
    4. Nếu SQL trả về `0 rows affected` (Trường hợp dữ liệu cache lệch): Rollback Redis và ném lỗi `ERR_OUT_OF_STOCK`.

* **Task 3.2: Triển khai Logic Khấu Trừ Thực Tế (`deductOnHandStock`)**
  * Khi đơn hàng xuất kho thành công:
    * Trừ `on_hand_stock -= qty` và trừ `reserved_stock -= qty`.
    * Ghi log `action_type = 'DEDUCT_OUT'`.

* **Task 3.3: Triển khai Logic Giải Phóng Tạm Giữ (`releaseReservedStock`)**
  * Khi đơn hàng bị hủy hoặc quá thời hạn thanh toán:
    * Trừ `reserved_stock -= qty`.
    * Gọi `RedisInventoryLockService.atomicRelease()`.
    * Ghi log `action_type = 'RELEASE'`.

* **Task 3.4: Xây dựng Bộ API Quản Trị Kho Cho Seller**
  * `GET /api/v1/inventory/my-stock`: Lấy danh sách tồn kho 3 tầng của gian hàng.
  * `POST /api/v1/inventory/restock`: Bổ sung số lượng tồn thực tế (`+ on_hand`).
  * `POST /api/v1/inventory/adjust`: Điều chỉnh kho sau kiểm kê (kèm lý do sai lệch).
  * `GET /api/v1/inventory/logs/:bookId`: Lấy toàn bộ lịch sử biến động chi tiết của tựa sách.

---

## PHẦN 4: XÂY DỰNG GIAO DIỆN QUẢN TRỊ KHO SELLER & ĐỒNG BỘ STOREFRONT

### 📌 Mục tiêu:
Cung cấp giao diện trực quan cho Seller theo dõi 3 chỉ số tồn kho, nhập hàng nhanh và đồng bộ trạng thái hiển thị ngoài Storefront.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Xây dựng Trang Quản Lý Kho Hàng ([`SellerInventoryPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerInventoryPage.jsx))**
  * Bảng tổng hợp tồn kho 3 cột rõ ràng:
    * 📦 **Tồn thực tế (`On-Hand`)**: Số lượng sách đang có trên kệ.
    * ⏳ **Đang tạm giữ (`Reserved`)**: Số lượng đang chờ khách thanh toán / đóng gói.
    * 🟢 **Khả dụng (`Available`)**: Số lượng thực tế còn bán được.
  * Nút hành động nhanh: **"+ Nhập hàng"**, **"⚙ Điều chỉnh kho"**, **"📜 Xem lịch sử biến động"**.
  * Cảnh báo thông minh: Đổi màu dòng sang **Cam** khi `Available <= 10` (Sắp hết hàng) và **Đỏ** khi `Available == 0` (Hết hàng).

* **Task 4.2: Xây dựng Modal Lịch Sử Biến Động Kho (`InventoryLogsModal.jsx`)**
  * Bảng dòng thời gian chi tiết: Thời gian, Loại biến động (`RESERVE`, `RESTOCK`, `DEDUCT_OUT`), Số lượng $+/-$, Mã đơn hàng liên quan, Người thao tác và Ghi chú.

* **Task 4.3: Đồng bộ Trạng Thái Trên Trang Chi Tiết Sản Phẩm (`BookDetailPage.jsx`)**
  * Hiển thị trạng thái theo thời gian thực:
    * Nếu `Available > 10`: Hiển thị "Còn hàng".
    * Nếu `0 < Available <= 10`: Hiển thị huy hiệu khẩn cấp "Chỉ còn X cuốn!".
    * Nếu `Available == 0`: Vô hiệu hóa nút "Thêm vào giỏ", hiển thị chữ "Tạm hết hàng".

---

## PHẦN 5: KIỂM THỬ TẢI CAO (HIGH CONCURRENCY TESTING) & MA TRẬN ĐÁNH GIÁ

### 📌 Mục tiêu:
Đảm bảo hệ thống đạt độ tin cậy $100\%$ không xảy ra Overselling khi chịu tải hàng nghìn yêu cầu đồng thời.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Viết Kịch Bản Stress Test Bằng Autocannon / k6**
  * Kịch bản: Tồn kho chỉ còn **1 cuốn**.
  * Chạy **100 người dùng ảo** gửi request đặt mua cuốn sách đó trong cùng **10 mili-giây**.
  * Tiêu chí chấp nhận:
    * Chỉ đúng **1 request** nhận mã HTTP 201 Created (Đặt hàng thành công).
    * **99 request còn lại** nhận mã HTTP 400 Bad Request ("Hết hàng").
    * Giá trị `on_hand_stock = 1`, `reserved_stock = 1`, `available_stock = 0`, hoàn toàn không có giá trị âm.

* **Task 5.2: Kiểm thử Hồi phục & Tự Động Nhả Kho (Auto-Release Test)**
  * Tạo đơn nhưng không thanh toán &rarr; Sau 15 phút Cron Job chạy &rarr; `reserved_stock` tự động trả về 0, `available_stock` trở lại 1, Redis stock cập nhật ngay lập tức.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Database** | Prisma Schema `book_inventories`, `inventory_logs` & DB Constraints | ⏳ Sẵn sàng | Backend Team |
| **Redis Engine** | Lua Scripts `reserve_stock.lua`, `release_stock.lua` & Atomic Cache | ⏳ Sẵn sàng | Backend Team |
| **Backend APIs** | APIs Quản trị kho, Khóa/Trừ/Hoàn tồn kho | ⏳ Sẵn sàng | Backend Team |
| **Seller UI** | Giao diện bảng 3 tầng `SellerInventoryPage.jsx` & Modal Lịch sử | ⏳ Sẵn sàng | Frontend Team |
| **Storefront Sync** | PDP tự động cập nhật số lượng khả dụng và chặn nút mua khi hết hàng | ⏳ Sẵn sàng | Frontend Team |
| **Concurrency Test** | Vượt qua 100% kiểm thử Stress Test Concurrency (TC_INV_01 &rarr; 06), 0% Overselling | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 5 thuộc Nền tảng Sách Huki Ebook.*
