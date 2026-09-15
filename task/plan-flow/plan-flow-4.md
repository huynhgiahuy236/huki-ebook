# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 4
## QUẢN LÝ CATALOG & ĐĂNG BÁN SÁCH ĐA HÌNH THÁI (MULTI-FORMAT PUBLISHING: PHYSICAL, EBOOK, HYBRID)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng toàn diện hệ thống quản lý danh mục (Catalog) và xuất bản ấn phẩm đa định dạng cho Nhà bán hàng / NXB. Đảm bảo hỗ trợ hoàn hảo **3 hình thái sản phẩm**: Sách giấy truyền thống (Physical), Sách điện tử bản quyền (Ebook) và Gói kết hợp độc quyền (Hybrid Edition Combo - Đọc Ebook ngay trong khi chờ giao sách giấy).
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `catalog-service`: Quản lý thực thể `books`, `categories`, `authors`, tìm kiếm, lọc danh mục, CRUD metadata.
    * `drm-service` / `storage-service`: Tiếp nhận tải file sách số (.EPUB, .PDF), mã hóa bảo mật lưu trữ trong két an toàn (DRM Vault), cấu hình giới hạn đọc thử (Sample Preview).
  * **Frontend (Seller Portal & Storefront)**:
    * [`SellerProductsPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerProductsPage.jsx): Quản lý danh sách sách, trạng thái hiển thị, chỉnh sửa nhanh.
    * [`SellerCreatePhysical.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerCreatePhysical.jsx): Giao diện đăng bán sách in vật lý (Giá, tồn kho, khối lượng, loại bìa).
    * [`SellerCreateEbook.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerCreateEbook.jsx): Giao diện đăng bán sách điện tử (Giá số, tải file số, cấu hình % đọc thử).
    * [`SellerCreateHybrid.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerCreateHybrid.jsx): Giao diện đăng bán gói combo (Giá ưu đãi, thông số giấy + file số).
    * `web/src/ui/pages/public/BookDetailPage.jsx`: Trang chi tiết tác phẩm (PDP) hiển thị bộ chọn 3 định dạng tương tác, tính toán giá trực quan.
    * `web/src/ui/components/reader/SamplePreviewReaderModal.jsx`: Trình đọc thử trực tuyến 10% số trang mượt mà không cần mua trước.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 4
                                           │
    ┌────────────────┬─────────────────────┼─────────────────────┬────────────────┐
    ▼                ▼                     ▼                     ▼                ▼
 PHẦN 1:          PHẦN 2:               PHẦN 3:               PHẦN 4:          PHẦN 5:
DATABASE &       BACKEND APIS &        SELLER PORTAL         STOREFRONT PDP & INTEGRATION &
STORAGE SCHEMA   DRM VAULT ENGINE      PUBLISHING UI         READER PREVIEW   TESTING E2E
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & LƯU TRỮ TỆP SỐ (DATABASE & STORAGE SCHEMA)

### 📌 Mục tiêu:
Thiết lập cấu trúc lưu trữ chuẩn cho ấn phẩm đa hình thái trên PostgreSQL / Prisma và chuẩn bị két an toàn DRM Vault lưu trữ tệp số.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Thiết kế & Cập nhật Schema Prisma trong `catalog-service`**
  * Định nghĩa bảng `books` đầy đủ 24 trường metadata:
    * `id` (UUID, Primary Key).
    * `business_id` (UUID, FK liên kết gian hàng sở hữu).
    * `title`, `subtitle`, `author_name`, `translator_name`, `publisher`, `distributor`.
    * `isbn` (String, Index tìm kiếm).
    * `category_id` (UUID, FK `categories`).
    * `publication_year` (Int), `page_count` (Int), `language` (Default: `'vi'`).
    * `formats` (Enum Array: `PHYSICAL`, `EBOOK`, `HYBRID`).
    * `original_price` (Decimal, Giá bìa niêm yết).
    * `physical_price`, `stock_quantity`, `weight_in_grams`, `cover_type` (Thuộc tính sách giấy).
    * `ebook_price`, `ebook_file_url`, `preview_percentage`, `drm_protected` (Thuộc tính Ebook).
    * `hybrid_price`, `is_hybrid` (Thuộc tính gói Hybrid).
    * `cover_image_url`, `gallery_images` (Text[]).
    * `description` (Text), `status` (Enum: `DRAFT`, `PUBLISHED`, `OUT_OF_STOCK`, `HIDDEN`).
    * `created_at`, `updated_at`.

* **Task 1.2: Thiết kế Schema Lưu Trữ Tệp An Toàn (DRM Vault Metadata)**
  * Bảng `book_digital_assets`:
    * `id` (UUID), `book_id` (UUID), `file_format` (`EPUB` / `PDF`), `file_size_bytes`, `storage_path` (Encrypted S3/MinIO bucket).
    * `checksum_sha256`: Kiểm tra tính toàn vẹn tệp.
    * `total_pages_or_chapters`: Tổng số trang/chương để tính toán phân đoạn đọc thử.
    * `preview_allowed_range`: Tọa độ hoặc chỉ số trang tối đa cho phép đọc thử.

---

## PHẦN 2: PHÁT TRIỂN BACKEND APIS & DRM ENCRYPTION ENGINE

### 📌 Mục tiêu:
Xây dựng các RESTful endpoints xử lý nghiệp vụ đăng sách, kiểm tra hợp lệ và dịch vụ mã hóa tệp nội dung số an toàn.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: API Tải lên & Mã hóa Tệp Ebook (`DRM / Storage Service`)**
  * **Endpoint**: `POST /api/v1/drm/vault/upload`
  * **Header**: `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
  * **Xử lý Logic**:
    * Kiểm tra dung lượng file ($\le 50\text{MB}$) và định dạng cho phép (`.epub`, `.pdf`).
    * Trích xuất tổng số trang / danh mục chương (Table of Contents).
    * Mã hóa tệp nguồn bằng thuật toán AES-256 trước khi đẩy vào két lưu trữ an toàn.
    * Trả về mã định danh `fileKey` an toàn và metadata trích xuất.

* **Task 2.2: API Tạo mới Sách Đa Hình Thái (`Catalog Service`)**
  * **Endpoint**: `POST /api/v1/catalog/books`
  * **Body Payload**: Dữ liệu metadata hoàn chỉnh theo từng định dạng đã chọn.
  * **Xử lý Logic**:
    * Validate dữ liệu: Nếu có Sách giấy bắt buộc có `stock_quantity` và `weight_in_grams`; nếu có Ebook bắt buộc có `ebook_file_url`; nếu có Hybrid bắt buộc cả hai và `hybrid_price <= physical_price + ebook_price`.
    * Kiểm tra không được trùng mã `isbn` đối với cùng một Seller.
    * Tạo bản ghi mới với trạng thái `status: 'PUBLISHED'` hoặc `'DRAFT'`.

* **Task 2.3: API Chỉnh sửa & Cập nhật Thông tin Tác phẩm**
  * **Endpoint**: `PUT /api/v1/catalog/books/:id`
  * **Xử lý Logic**: Cho phép Seller chủ sở hữu cập nhật giá bán, bổ sung tồn kho, thay đổi mô tả và ảnh gallery.

* **Task 2.4: API Chi tiết Sách & Cấu hình Đọc Thử (Public Storefront & Preview)**
  * **Endpoint**: `GET /api/v1/catalog/books/:id` (Dữ liệu công khai chi tiết sách kèm các định dạng khả dụng).
  * **Endpoint**: `GET /api/v1/catalog/books/:id/sample-preview` (Trả về luồng nội dung đọc thử 10% đầu tiên của cuốn sách mà không lộ toàn bộ file nguồn).

---

## PHẦN 3: XÂY DỰNG GIAO DIỆN QUẢN TRỊ XUẤT BẢN DÀNH CHO SELLER

### 📌 Mục tiêu:
Tối ưu hóa trải nghiệm người bán với 3 màn hình chuyên biệt tương ứng 3 hình thái xuất bản, có thanh tiến trình và bộ kiểm tra dữ liệu theo thời gian thực.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: Giao diện Danh Sách Tác Phẩm ([`SellerProductsPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerProductsPage.jsx))**
  * Bảng danh sách sách: Ảnh bìa, Tên sách, ISBN, Định dạng (`[Giấy]`, `[Ebook]`, `[Hybrid]`), Tồn kho, Giá bán và Trạng thái.
  * Bộ lọc nhanh: Lọc theo định dạng, theo danh mục hoặc trạng thái mở bán.
  * Nút hành động nổi bật: **"+ Đăng bán sách mới"** mở Modal chọn 3 định dạng.

* **Task 3.2: Giao diện Đăng Bán Sách Giấy ([`SellerCreatePhysical.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerCreatePhysical.jsx))**
  * Form thông tin chuẩn: Tiêu đề, Tác giả, ISBN, NXB, Thể loại, Mô tả, Ảnh bìa & Gallery.
  * Khối cấu hình Sách Giấy: Giá bìa niêm yết, Giá bán thực tế (tự động tính % giảm giá), Số lượng tồn kho, Trọng lượng đóng gói (gram), Loại bìa.

* **Task 3.3: Giao diện Đăng Bán Sách Điện Tử ([`SellerCreateEbook.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerCreateEbook.jsx))**
  * Khối cấu hình Ebook: Giá bán bản quyền số.
  * Component Tải file số: Hỗ trợ Drag & Drop file `.epub` / `.pdf`, thanh tiến trình Upload % và thông báo mã hóa DRM thành công.
  * Thanh trượt điều chỉnh Tỷ lệ Đọc thử: Từ 5% đến 30% (khuyến nghị 10%).

* **Task 3.4: Giao diện Đăng Bán Gói Kết Hợp ([`SellerCreateHybrid.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerCreateHybrid.jsx))**
  * Tích hợp đồng thời cả 2 cấu hình: Nhập số lượng tồn kho sách in + Tải file số Ebook.
  * Bảng tính giá thông minh: Hiển thị tự động (Giá giấy + Giá Ebook = Tổng giá trị lẻ), gợi ý thiết lập Giá Hybrid Combo tiết kiệm hơn để kích cầu.

---

## PHẦN 4: TÍCH HỢP TRANG CHI TIẾT SẢN PHẨM & TRÌNH ĐỌC THỬ NGOÀI STOREFRONT

### 📌 Mục tiêu:
Hiển thị bộ chọn 3 định dạng trực quan ngoài Storefront và cho phép độc giả đọc thử 10% nội dung ngay trên trình duyệt mà không bị gián đoạn.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Nâng cấp Trang Chi Tiết Sách (`BookDetailPage.jsx`)**
  * Xây dựng **Selector 3 định dạng tương tác**:
    * 📦 **Sách Giấy**: Giá bán, tình trạng còn hàng (`Còn 150 cuốn`), hiển thị biểu phí giao hàng tạm tính.
    * 💻 **Ebook**: Giá số, nhãn "Đọc ngay trên Web", nút bấm **"📖 Đọc thử 10%"**.
    * ⚡ **Hybrid Combo**: Nhãn nổi bật "Best Seller / Tiết kiệm 35%", thông điệp "Nhận sách giấy tận tay + Mở khóa Ebook tức thì".
  * Nút Mua Hàng & Thêm Vào Giỏ tự động thay đổi hành vi theo định dạng độc giả đang chọn.

* **Task 4.2: Xây dựng Trình Đọc Thử Miễn Phí (`SamplePreviewReaderModal.jsx`)**
  * Modal đọc sách tối ưu cho trải nghiệm người dùng:
    * Đọc trực tiếp định dạng EPUB/PDF chuẩn hóa HTML5.
    * Chế độ đọc: Ban ngày / Ban đêm (Dark Mode), điều chỉnh cỡ chữ, kiểu chữ.
    * Giới hạn trang nghiêm ngặt: Tự động dừng ở đúng tỷ lệ đã cấu hình (VD: trang 20/200).
    * Hộp thoại chuyển đổi: Khi hết số trang đọc thử, hiển thị thông báo thân thiện *"Bạn đã đọc hết 10% bản xem trước. Hãy mua sách đầy đủ để thưởng thức trọn vẹn tác phẩm!"* kèm nút "Mua ngay".

---

## PHẦN 5: KIỂM THỬ TÍCH HỢP TOÀN TRÌNH & ĐÁNH GIÁ CHẤT LƯỢNG (TESTING & AUDIT)

### 📌 Mục tiêu:
Đảm bảo toàn bộ luồng xuất bản, mã hóa và hiển thị hoạt động trơn tru không có lỗi phát sinh.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Kiểm thử Đăng bán 3 Định dạng (End-to-End Seller Flow)**
  * Đăng bán thành công 1 Sách Giấy, 1 Ebook kèm file mẫu, 1 Gói Hybrid Combo.
  * Xác nhận dữ liệu hiển thị chính xác trong cơ sở dữ liệu và danh sách quản trị Seller.

* **Task 5.2: Kiểm thử Hợp Lệ Dữ Liệu & Ràng Buộc Nghiệp Vụ**
  * Thử nhập giá bán lớn hơn giá bìa &rarr; Chặn và báo lỗi rõ ràng.
  * Thử đăng Ebook mà không đính kèm file số &rarr; Chặn và yêu cầu tải file.
  * Thử nhập sai định dạng ISBN &rarr; Báo lỗi định dạng mã vạch quốc tế.

* **Task 5.3: Kiểm thử Trải Nghiệm Đọc Thử Ngoài Storefront**
  * Thử nghiệm tính năng "Đọc thử 10%" trên máy tính và thiết bị di động.
  * Xác nhận không rò rỉ toàn bộ file nội dung số trong Network tab.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Database** | Hoàn thiện Schema bảng `books`, `categories`, `book_digital_assets` | ⏳ Sẵn sàng | Backend Team |
| **Backend APIs** | Triển khai API Tạo/Sửa sách và DRM Vault Upload | ⏳ Sẵn sàng | Backend Team |
| **Seller UI** | Hoàn thiện 3 màn hình `SellerCreatePhysical`, `SellerCreateEbook`, `SellerCreateHybrid` | ⏳ Sẵn sàng | Frontend Team |
| **Storefront PDP**| Bộ chọn 3 định dạng tương tác + Tính toán giá thông minh | ⏳ Sẵn sàng | Frontend Team |
| **Web Reader** | Trình đọc thử 10% nội dung số bảo mật bản quyền | ⏳ Sẵn sàng | Frontend Team |
| **Quality Audit** | Vượt qua 100% Ma trận kiểm thử 6 kịch bản (TC_CAT_01 đến 06) | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 4 thuộc Nền tảng Sách Huki Ebook.*
