# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 7
## FLASH SALE ĐẾM NGƯỢC KHUNG GIỜ VÀNG & GIỚI HẠN HẠN MỨC MUA (FLASH SALE COUNTDOWN & PURCHASE QUOTA LIMITER)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng toàn diện hệ thống Flash Sale linh hoạt, hỗ trợ cấu hình chiến dịch tùy chỉnh (Admin tự do đặt Tên chiến dịch và tự chọn Khung giờ mở bán), đồng hồ đếm ngược thời gian thực, hiển thị thanh tiến trình bán chạy và triển khai bộ kiểm soát hạn mức mua (Purchase Quota Limiter) nguyên tử nhằm loại bỏ nguy cơ đầu cơ và gom hàng trái phép.
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `promotion-service`: Quản lý chiến dịch Flash Sale tùy chỉnh, tính toán chiết khấu, kiểm tra Quota Limiter, tự động kích hoạt khung giờ.
    * `Redis Cache Engine`: Lưu trữ bộ đếm kho Flash Sale `flash:stock:...` và bộ đếm hạn mức mua của user `quota:user:...`.
    * `commerce-service` / `order-service`: Tích hợp bước kiểm tra Quota và áp dụng giá ưu đãi khi tạo đơn hàng, quản lý TTL giữ hàng 1 phút cho đơn Flash Sale.
  * **Frontend (Admin & Storefront)**:
    * `web/src/ui/pages/admin/AdminMarketingPage.jsx`: Giao diện Admin quản lý chiến dịch, tạo mới khung giờ Flash Sale tùy chỉnh, thêm sách và phân bổ kho.
    * `web/src/ui/pages/public/FlashSalePage.jsx` (hoặc `store/FlashSalePage.jsx`): Trang sự kiện Flash Sale với đồng hồ đếm ngược số lớn, Timeline Tabs chuyển đổi linh hoạt giữa các phiên trong ngày và thanh tiến trình bán chạy.
    * `web/src/ui/pages/store/HomePage.jsx` & `web/src/ui/pages/store/BookDetailPage.jsx`: Khối Flash Sale giờ vàng, huy hiệu giảm giá sốc và thông báo hạn mức mua 1 cuốn/người.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                               KẾ HOẠCH TRIỂN KHAI LUỒNG 7
                                            │
    ┌────────────────┬─────────────────────┼─────────────────────┬────────────────┐
    ▼                ▼                     ▼                     ▼                ▼
 PHẦN 1:          PHẦN 2:               PHẦN 3:               PHẦN 4:          PHẦN 5:
SCHEMA & ADMIN   REDIS QUOTA ENGINE    BACKEND APIS &        STOREFRONT UI &  HIGH CONCURRENCY
CAMPAIGN ENGINE  & ATOMIC SCRIPTS      CHECKOUT INTEGRATION  COUNTDOWN SYNC   & QUOTA TESTING
```

---

## PHẦN 1: QUẢN LÝ CHIẾN DỊCH FLASH SALE & KHUNG GIỜ TÙY CHỈNH

### 📌 Mục tiêu:
Cung cấp khả năng cho Admin tự do đặt tên phiên Flash Sale, tự chọn giờ bắt đầu/kết thúc, chọn sách tham gia và phân bổ số lượng.

### 🔨 Các đầu việc cụ thể:
* **Task 1.1: Quản lý Bảng `flash_sales` & `flash_sale_items`**
  * Tận dụng Prisma Schema của `promotion-service`:
    * `flash_sales`: `id`, `name` (Tên chiến dịch tùy biến), `description`, `starts_at`, `ends_at`, `status` (`SCHEDULED`, `ACTIVE`, `ENDED`).
    * `flash_sale_items`: `id`, `flash_sale_id`, `book_id`, `original_price`, `sale_price`, `stock`, `sold`, `max_per_user`.
* **Task 1.2: Giao diện Quản trị Flash Sale trong `AdminMarketingPage.jsx`**
  * Thêm Tab Quản Lý Flash Sale:
    * Modal **"Tạo Khung Giờ Flash Sale Mới"**: Nhập tên chiến dịch, chọn thời gian bắt đầu & kết thúc, chọn tựa sách trong kho, nhập giá sale, kho phân bổ và hạn mức mỗi người.
    * Bảng danh sách các phiên Flash Sale: Hiển thị tên phiên, thời gian, số lượng sách, trạng thái và các nút thao tác Bật/Tắt/Xóa.

---

## PHẦN 2: TRIỂN KHAI QUOTA LIMITER ENGINE & KIỂM SOÁT HẠN MỨC MUA

### 📌 Mục tiêu:
Kiểm soát hạn mức mỗi khách hàng chỉ được mua tối đa $M$ cuốn sách giá Flash Sale (mặc định 1 cuốn/tựa sách) trong suốt phiên sale.

### 🔨 Các đầu việc cụ thể:
* **Task 2.1: Triển khai Service Kiểm tra Quota (`validateUserQuota`)**
  * Kiểm tra số lượng user đã mua trong phiên hiện tại qua Redis / Database.
  * Nếu tổng số lượng đặt mua vượt quá `max_per_user` $\rightarrow$ Trả về mã lỗi `FLASH_SALE_QUOTA_EXCEEDED`.
* **Task 2.2: Tự động Gieo Dữ Liệu Khởi Tạo (Seeding Demo Sessions)**
  * Tự động khởi tạo phiên Flash Sale đang hoạt động với các tựa sách thực tế có trong cơ sở dữ liệu `commerce_db`, đảm bảo luôn có dữ liệu sống động ngay khi khởi động nền tảng.

---

## PHẦN 3: XÂY DỰNG BACKEND APIS & TÍCH HỢP QUY TRÌNH CHECKOUT

### 📌 Mục tiêu:
Phát triển các API công khai cho Storefront và tích hợp bước xác thực giá Flash Sale vào quy trình tạo đơn hàng.

### 🔨 Các đầu việc cụ thể:
* **Task 3.1: Bộ API Công Khai Dành Cho Người Mua (Public Storefront)**
  * `GET /api/v1/flash-sales/active`: Lấy phiên đang diễn ra kèm danh sách sách và thời gian kết thúc.
  * `GET /api/v1/flash-sales/upcoming`: Lấy các phiên sắp mở bán.
  * `GET /api/v1/flash-sales/slots`: Lấy danh sách toàn bộ các phiên trong ngày (cả mặc định và tùy chỉnh).
  * `GET /api/v1/flash-sales/price/:bookId`: Tra cứu giá Flash Sale của 1 cuốn sách cụ thể.
* **Task 3.2: Tích hợp Giá Flash Sale trong `commerce-service` (`checkout.service.ts`)**
  * Khi khách hàng đặt mua sách:
    * Tự động áp dụng đơn giá `salePrice` nếu sách đang trong phiên Flash Sale hợp lệ.
    * Kiểm tra hạn mức `max_per_user` $\rightarrow$ Báo lỗi nếu mua vượt hạn mức.
    * Đặt thời gian giữ hàng đếm ngược thanh toán của Luồng 6 là **1 phút (60 giây)** cho đơn hàng Flash Sale.
  * Khi đơn hàng bị hủy hoặc quá hạn thanh toán $\rightarrow$ Tự động hoàn trả Quota và kho Flash Sale.

---

## PHẦN 4: GIAO DIỆN STOREFRONT & ĐẾM NGƯỢC THỜI GIAN THỰC

### 📌 Mục tiêu:
Xây dựng giao diện trang Flash Sale sinh động, hiển thị Timeline Tabs các khung giờ và cập nhật theo thời gian thực.

### 🔨 Các đầu việc cụ thể:
* **Task 4.1: Xây dựng Trang Sự Kiện Flash Sale ([`FlashSalePage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/store/FlashSalePage.jsx))**
  * **Thanh điều hướng khung giờ (Timeline Tabs)**:
    * Hiển thị các phiên trong ngày kèm tên tùy chỉnh và trạng thái (`Đã kết thúc`, `Đang diễn ra 🔥`, `Sắp mở bán`).
  * **Đồng hồ đếm ngược**: Dạng số lớn `KẾT THÚC TRONG HH:MM:SS`.
  * **Lưới sản phẩm Flash Sale**:
    * Thẻ sách: Ảnh bìa, Tên sách, Tác giả, Giá Flash Sale đỏ nổi bật, Giá gốc gạch ngang, Huy hiệu giảm giá `-%`.
    * **Thanh tiến trình bán chạy**: Gradient cam/đỏ kèm chữ *"Đã bán X cuốn"* / *"Đang bán chạy 🔥"* / *"ĐÃ BÁN HẾT 100%"*.
    * Nút hành động: **"Mua Ngay"** (phiên đang chạy) hoặc **"Nhắc Tôi"** (phiên sắp diễn ra).
* **Task 4.2: Tích hợp Khối Flash Sale Trên Trang Chủ (`HomePage.jsx`) & Trang Chi Tiết Sách (`BookDetailPage.jsx`)**
  * Trang Chủ: Khối Flash Sale giờ vàng liên kết trực tiếp với dữ liệu API thực tế và nút xem tất cả dẫn đến `/flash-sale`.
  * Trang Chi Tiết Sách: Huy hiệu Flash Sale nổi bật, đồng hồ đếm ngược nhỏ và cảnh báo hạn mức mua 1 cuốn/khách.
* **Task 4.3: Điều hướng Sidebar & Menu Header**
  * Bổ sung mục `⚡ Flash Sale Giờ Vàng` vào menu Sidebar và Header.

---

## PHẦN 5: KIỂM THỬ TẢI CAO & NGHIỆM THU (TESTING SUITE)

### 📌 Mục tiêu:
Xác thực 100% độ chính xác của cơ chế Flash Sale tùy chỉnh và Quota Limiter qua 7 kịch bản kiểm thử.

### 🔨 Các đầu việc cụ thể:
* **Task 5.1: Chạy Automated Tests**
  * Kiểm tra Promotion Service Tests & Commerce Service Tests.
  * Kiểm tra Web Production Build.
* **Task 5.2: Kiểm Thử 7 Kịch Bản Nghiệp Vụ (TC_FS_01 đến TC_FS_07)**
  * Xác nhận Admin tạo khung giờ tùy chỉnh $\rightarrow$ Hiển thị trên Storefront Timeline.
  * Xác nhận mua trong hạn mức Quota = 1 $\rightarrow$ Thành công.
  * Xác nhận cố tình mua từ cuốn thứ 2 $\rightarrow$ Bị chặn báo lỗi hạn mức.
  * Xác nhận bán hết 100% $\rightarrow$ Khôi phục giá gốc.
  * Xác nhận hủy đơn $\rightarrow$ Hoàn trả Quota cho khách.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Admin Campaign** | Admin tạo phiên Flash Sale với Tên & Khung giờ tự chọn | ⏳ Sẵn sàng | Fullstack Team |
| **Quota Limiter** | Cơ chế kiểm tra và khóa hạn mức mua `max_per_user` | ⏳ Sẵn sàng | Backend Team |
| **Backend APIs** | APIs Quản trị & Public Storefront (Active, Upcoming, Slots, Price) | ⏳ Sẵn sàng | Backend Team |
| **Checkout Sync** | Tích hợp giá Flash Sale và TTL 1 phút vào luồng đặt hàng | ⏳ Sẵn sàng | Backend Team |
| **Storefront UI** | Trang sự kiện `FlashSalePage.jsx`, Timeline Tabs, Thanh tiến trình | ⏳ Sẵn sàng | Frontend Team |
| **PDP & Home Sync**| Khối Flash Sale và đếm ngược trên HomePage & BookDetailPage | ⏳ Sẵn sàng | Frontend Team |
| **Quality Audit** | Vượt qua 100% Ma trận kiểm thử 7 kịch bản (TC_FS_01 đến TC_FS_07) | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 7 thuộc Nền tảng Sách Huki Ebook.*
