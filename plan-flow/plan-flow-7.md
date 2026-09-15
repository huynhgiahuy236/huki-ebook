# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 7
## FLASH SALE ĐẾM NGƯỢC KHUNG GIỜ VÀNG & GIỚI HẠN HẠN MỨC MUA (FLASH SALE COUNTDOWN & PURCHASE QUOTA LIMITER)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng toàn diện hệ thống Flash Sale khung giờ vàng, hỗ trợ cấu hình chiến dịch linh hoạt, đếm ngược thời gian thực, hiển thị thanh tiến trình bán chạy và triển khai bộ kiểm soát hạn mức mua (Purchase Quota Limiter) trên nền tảng Redis nguyên tử nhằm loại bỏ nguy cơ đầu cơ và gom hàng trái phép.
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `promotion-service`: Quản lý chiến dịch Flash Sale, tính toán chiết khấu, tự động kích hoạt khung giờ.
    * `Redis Cache Engine`: Lưu trữ bộ đếm kho Flash Sale `flash:stock:...` và bộ đếm hạn mức mua của user `quota:user:...`.
    * `order-service`: Tích hợp bước kiểm tra Quota và áp dụng giá ưu đãi khi tạo đơn hàng.
  * **Frontend (Admin, Seller & Storefront)**:
    * `web/src/ui/pages/admin/AdminFlashSaleCampaignsPage.jsx`: Quản lý và duyệt các phiên Flash Sale toàn sàn.
    * `web/src/ui/pages/seller/SellerFlashSaleRegisterPage.jsx`: Giao diện Seller đăng ký sản phẩm tham gia và phân bổ số lượng.
    * `web/src/ui/pages/public/FlashSaleLandingPage.jsx`: Trang sự kiện Flash Sale với đồng hồ đếm ngược, tab chọn khung giờ (Đang diễn ra / Sắp diễn ra) và thanh tiến trình bán chạy.
    * `web/src/ui/components/books/FlashSaleBadge.jsx`: Huy hiệu Flash Sale kèm giá sốc hiển thị tại trang danh mục và chi tiết sách (PDP).

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 7
                                           │
    ┌────────────────┬─────────────────────┼─────────────────────┬────────────────┐
    ▼                ▼                     ▼                     ▼                ▼
 PHẦN 1:          PHẦN 2:               PHẦN 3:               PHẦN 4:          PHẦN 5:
SCHEMA & PRISMA  REDIS QUOTA ENGINE    BACKEND APIS &        STOREFRONT UI &  HIGH CONCURRENCY
DATA MODEL       & ATOMIC SCRIPTS      CHECKOUT INTEGRATION  COUNTDOWN SYNC   & QUOTA TESTING
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & SCHEMA PRISMA FLASH SALE

### 📌 Mục tiêu:
Thiết lập cấu trúc lưu trữ chuẩn cho các phiên Flash Sale và các sản phẩm tham gia trên PostgreSQL bằng Prisma ORM.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Thiết kế Bảng `flash_sale_campaigns`**
  * Định nghĩa bảng trong `prisma/schema.prisma`:
    * `id`: UUID, Primary Key.
    * `title`: String (VD: "Flash Sale Trưa Rực Rỡ 12H - 14H").
    * `start_time`: DateTime (Thời điểm mở bán).
    * `end_time`: DateTime (Thời điểm đóng cổng).
    * `status`: Enum (`UPCOMING`, `ACTIVE`, `ENDED`).
    * `banner_url`: String (Banner tiếp thị).
    * `created_at`, `updated_at`.

* **Task 1.2: Thiết kế Bảng `flash_sale_items`**
  * Định nghĩa bảng chi tiết sản phẩm:
    * `id`: UUID, Primary Key.
    * `campaign_id`: UUID, FK `flash_sale_campaigns`.
    * `book_id`: UUID, FK `books`.
    * `business_id`: UUID, FK `businesses`.
    * `original_price`: Decimal.
    * `flash_price`: Decimal (Giá bán giảm sốc).
    * `allocated_quantity`: Int (Số lượng phân bổ).
    * `sold_quantity`: Int (Mặc định: 0).
    * `max_per_user`: Int (Mặc định: 1 - Hạn mức tối đa cho mỗi khách hàng).
    * Unique Index: `[campaign_id, book_id]`.

---

## PHẦN 2: TRIỂN KHAI REDIS QUOTA ENGINE & ATOMIC LUA SCRIPTS

### 📌 Mục tiêu:
Xây dựng lớp xử lý hạn mức mua và khóa kho Flash Sale với hiệu năng cao bằng Lua Scripts trên Redis.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: Viết Lua Script Kiểm Tra & Trừ Kho Flash Sale (`reserve_flash_stock.lua`)**
  * Logic script:
    * Kiểm tra tồn kho Flash Sale còn lại: `flash:stock:{campId}:{bookId}`.
    * Kiểm tra hạn mức đã mua của user: `quota:user:{userId}:{campId}:{bookId}`.
    * Nếu tồn kho đủ và số lượng mua không vượt `max_per_user`:
      * Giảm `flash:stock` số lượng tương ứng.
      * Tăng `quota:user` số lượng tương ứng (kèm đặt TTL bằng thời gian còn lại của phiên sale).
      * Trả về mã thành công `1`.
    * Nếu không hợp lệ: Trả về mã lỗi tương ứng (`ERR_OUT_OF_STOCK` hoặc `ERR_QUOTA_EXCEEDED`).

* **Task 2.2: Viết Module Tự Động Nạp Dữ Liệu Trước (Cache Warm-up Worker)**
  * Tự động chạy trước khi phiên Flash Sale diễn ra 10 phút:
    * Đọc toàn bộ danh sách `flash_sale_items` từ Database.
    * Nạp vào Redis: `SET flash:stock:{campId}:{bookId} allocated_qty`, `SET flash:price:{campId}:{bookId} flash_price`.
    * Đảm bảo khi đúng 00 giây, 100% request được phục vụ từ RAM với độ trễ $< 2\text{ms}$.

---

## PHẦN 3: XÂY DỰNG BACKEND APIS & TÍCH HỢP QUY TRÌNH CHECKOUT

### 📌 Mục tiêu:
Phát triển các RESTful APIs phục vụ quản trị chiến dịch và tích hợp bước xác thực giá Flash Sale vào quy trình tạo đơn hàng.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: Bộ API Quản Trị Flash Sale (Admin & Seller)**
  * `POST /api/v1/promotions/flash-sale/campaigns`: Admin tạo khung giờ mới.
  * `POST /api/v1/promotions/flash-sale/register`: Seller đăng ký sách tham gia Flash Sale.
  * `GET /api/v1/promotions/flash-sale/my-registrations`: Seller xem danh sách sách đã đăng ký.
  * `PATCH /api/v1/promotions/flash-sale/approve/:itemId`: Admin duyệt sản phẩm vào phiên.

* **Task 3.2: Bộ API Công Khai Dành Cho Người Mua (Public Storefront)**
  * `GET /api/v1/promotions/flash-sale/active`: Lấy danh sách các khung giờ trong ngày và danh sách sách thuộc phiên đang diễn ra.
  * `GET /api/v1/promotions/flash-sale/upcoming`: Lấy danh sách sản phẩm chuẩn bị mở bán ở khung giờ kế tiếp.

* **Task 3.3: Tích hợp Xác Thực Giá Flash Sale trong `order-service`**
  * Khi khách hàng đặt mua sách:
    * Gọi `promotionService.validateAndApplyFlashSale(userId, bookId, qty)`.
    * Nếu hợp lệ: Áp dụng `flash_price` vào `order_items` và ghi nhận cờ `is_flash_sale: true`.
    * Nếu đơn hàng bị hủy hoặc hết hạn 15m: Tự động hoàn trả `quota` và `flash:stock` trên Redis.

---

## PHẦN 4: GIAO DIỆN STOREFRONT & ĐẾM NGƯỢC THỜI GIAN THỰC

### 📌 Mục tiêu:
Xây dựng giao diện trang Flash Sale sinh động, chuyên nghiệp và có khả năng tương tác trực quan cao.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Xây dựng Trang Sự Kiện Flash Sale ([`FlashSaleLandingPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/public/FlashSaleLandingPage.jsx))**
  * **Thanh điều hướng khung giờ (Timeline Tabs)**:
    * Hiển thị các phiên: `00:00 (Đã kết thúc)`, `09:00 (Đang diễn ra 🔥)`, `15:00 (Sắp diễn ra)`, `20:00 (Sắp diễn ra)`.
  * **Đồng hồ đếm ngược**: Dạng số lớn `KẾT THÚC TRONG 01:24:35`.
  * **Lưới sản phẩm Flash Sale (Grid Layout)**:
    * Thẻ sách: Ảnh bìa, Tên sách, Tác giả, Giá Flash Sale đỏ nổi bật, Giá gốc gạch ngang, Huy hiệu giảm giá `-%`.
    * **Thanh tiến trình bán chạy**: Thanh gradient cam/đỏ kèm chữ *"Đã bán X cuốn"* hoặc *"Đang bán chạy 🔥"*.
    * Nút hành động: **"Mua Ngay"** (phiên đang chạy) hoặc **"Nhắc Tôi"** (phiên sắp diễn ra).

* **Task 4.2: Tích hợp Huy Hiệu Flash Sale Trên Trang Chi Tiết Tác Phẩm (`BookDetailPage.jsx`)**
  * Khối thông báo Flash Sale màu đỏ cam rực rỡ ở đầu trang chi tiết:
    * Đồng hồ đếm ngược nhỏ.
    * Thông báo hạn mức: *"Mỗi khách hàng chỉ được mua tối đa 1 cuốn với giá Flash Sale"*.

---

## PHẦN 5: KIỂM THỬ TẢI CAO & CHỐNG GOM HÀNG (CONCURRENCY & ANTI-BOT TESTING)

### 📌 Mục tiêu:
Đảm bảo cơ chế Quota Limiter và khóa tồn kho hoạt động hoàn hảo dưới tải cao, không xảy ra gian lận.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Kiểm thử Hạn Mức Mua Quota Limiter**
  * Cho 1 User gửi liên tiếp 5 request mua sách trong 1 giây (với cấu hình `max_per_user = 1`).
  * Xác nhận: Duy nhất 1 request đầu tiên được áp dụng giá Flash Sale, 4 request sau bị từ chối hoặc tính giá gốc.

* **Task 5.2: Kiểm thử Hết Hàng Flash Sale Tự Động Khôi Phục Giá Gốc**
  * Phân bổ 5 cuốn, cho 5 khách mua thành công.
  * Khách hàng thứ 6 truy cập: Thanh tiến trình hiển thị "Đã bán hết 100%", giá bán tự động quay về giá thường `100.000đ`.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Database** | Prisma Schema `flash_sale_campaigns`, `flash_sale_items` | ⏳ Sẵn sàng | Backend Team |
| **Redis Quota** | Lua Script `reserve_flash_stock.lua` & Cache Warm-up | ⏳ Sẵn sàng | Backend Team |
| **Backend APIs** | APIs Quản trị Admin/Seller, API Public & Checkout Validation | ⏳ Sẵn sàng | Backend Team |
| **Storefront UI** | Giao diện `FlashSaleLandingPage.jsx`, Timeline Tabs, Thanh tiến trình | ⏳ Sẵn sàng | Frontend Team |
| **PDP Sync** | Huy hiệu Flash Sale và thông báo hạn mức trên trang chi tiết sách | ⏳ Sẵn sàng | Frontend Team |
| **Quality Audit** | Vượt qua 100% Ma trận kiểm thử 6 kịch bản (TC_FS_01 đến TC_FS_06) | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 7 thuộc Nền tảng Sách Huki Ebook.*
