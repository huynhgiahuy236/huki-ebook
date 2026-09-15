# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 9
## GIỎ HÀNG LƯU TRỮ ĐA THIẾT BỊ & XỬ LÝ SẢN PHẨM HẾT HÀNG (PERSISTENT CART & OUT-OF-STOCK ITEM HANDLING)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng hệ thống giỏ hàng bền bỉ (Persistent Cart) đồng bộ đa thiết bị theo thời gian thực, tự động gộp giỏ hàng khách vãng lai (Guest Cart Merge) khi đăng nhập, phân nhóm trực quan theo từng Nhà Bán Hàng và phát triển engine tự động phát hiện, cảnh báo, xử lý các biến động về tồn kho (hết hàng, giảm số lượng) cũng như biến động giá bán mà không làm gián đoạn trải nghiệm người dùng.
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `commerce-service` / `cart-service`: Module `CartModule`, `CartService`, `CartController`.
    * Prisma Schema: Bảng `carts`, bảng `cart_items` (liên kết `user_id`, `book_id`, `format`, `quantity`, `added_price`).
    * Redis Cache: Lưu trữ cache giỏ hàng `cart:user:{userId}` để phản hồi thao tác $+ / -$ trong $< 5\text{ms}$.
  * **Frontend (Storefront)**:
    * `web/src/ui/pages/cart/CartPage.jsx`: Giao diện giỏ hàng chính phân nhóm theo Shop, checkbox đa tầng, khu vực sản phẩm không khả dụng.
    * `web/src/ui/components/cart/CartItemRow.jsx`: Component từng dòng sách với bộ tăng giảm số lượng, nhãn cảnh báo giá và nút xóa.
    * `web/src/ui/components/cart/UnavailableItemsSection.jsx`: Khu vực hiển thị các tựa sách đã hết hàng / ngừng bán.
    * `web/src/ui/context/CartContext.tsx`: Quản trị state giỏ hàng toàn cục, xử lý LocalStorage và gọi API Merge khi login.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 9
                                           │
    ┌────────────────┬─────────────────────┼─────────────────────┬────────────────┐
    ▼                ▼                     ▼                     ▼                ▼
 PHẦN 1:          PHẦN 2:               PHẦN 3:               PHẦN 4:          PHẦN 5:
SCHEMA & PRISMA  CART MERGE &          MUTATION ENGINE &     FRONTEND CART UI TESTING SUITE &
DATA MODEL       BACKEND APIS          STOCK VALIDATION      & SHOP GROUPING  UX VALIDATION
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & SCHEMA PRISMA GIỎ HÀNG

### 📌 Mục tiêu:
Thiết lập cấu trúc bảng lưu trữ giỏ hàng và các mục hàng trên PostgreSQL bằng Prisma ORM.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Thiết kế Bảng `carts`**
  * Định nghĩa bảng trong `prisma/schema.prisma`:
    * `id`: UUID, Primary Key.
    * `user_id`: UUID (Nullable, Unique Index - liên kết người dùng).
    * `session_token`: String (Nullable, Index - dành cho khách vãng lai).
    * `created_at`: DateTime, `updated_at`: DateTime.

* **Task 1.2: Thiết kế Bảng `cart_items`**
  * Định nghĩa bảng chi tiết mục giỏ hàng:
    * `id`: UUID, Primary Key.
    * `cart_id`: UUID, FK `carts` (onDelete: Cascade).
    * `book_id`: UUID, FK `books`.
    * `business_id`: UUID, FK `businesses` (Hỗ trợ gom nhóm Shop).
    * `format`: Enum (`PHYSICAL`, `EBOOK`, `HYBRID`).
    * `quantity`: Int (Check $\ge 1$).
    * `added_price`: Decimal (Lưu giá lúc thêm để so khớp biến động).
    * `is_selected`: Boolean (Mặc định: true).
    * Unique Index: `[cart_id, book_id, format]`.

---

## PHẦN 2: PHÁT TRIỂN BACKEND APIS & THUẬT TOÁN GỘP GIỎ HÀNG (CART MERGE)

### 📌 Mục tiêu:
Xây dựng các RESTful endpoints quản lý giỏ hàng và thuật toán gộp giỏ hàng khách vãng lai khi đăng nhập.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: Triển khai Thuật toán Gộp Giỏ Hàng (`mergeGuestCart`)**
  * Khi người dùng đăng nhập tài khoản:
    * Nhận danh sách các mục trong LocalStorage của khách vãng lai.
    * Với các tựa sách đã có trong giỏ của tài khoản: Cộng dồn số lượng `quantity = existing_qty + guest_qty` (giới hạn không vượt tồn kho).
    * Với các tựa sách mới: Thêm mới bản ghi vào giỏ của User.
    * Trả về giỏ hàng hợp nhất hoàn chỉnh.

* **Task 2.2: Xây dựng Bộ API Giỏ Hàng Chuẩn RESTful**
  * `GET /api/v1/cart`: Lấy thông tin giỏ hàng chi tiết (kèm kiểm tra tồn kho & biến động giá).
  * `POST /api/v1/cart/items`: Thêm sản phẩm vào giỏ (hoặc tăng số lượng nếu đã có).
  * `PATCH /api/v1/cart/items/:itemId`: Cập nhật số lượng hoặc trạng thái checkbox `is_selected`.
  * `DELETE /api/v1/cart/items/:itemId`: Xóa 1 mục khỏi giỏ hàng.
  * `POST /api/v1/cart/merge`: Gộp giỏ hàng khách vãng lai vào tài khoản.

---

## PHẦN 3: ENGINE PHÁT HIỆN BIẾN ĐỘNG TỒN KHO & GIÁ BÁN (MUTATION ENGINE)

### 📌 Mục tiêu:
Tự động đối soát và gắn nhãn các sản phẩm bị biến động về giá, hết hàng hoặc giảm tồn kho mỗi khi người dùng truy cập giỏ hàng.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: Module Kiểm Tra Tồn Kho Khả Dụng (`StockSyncProcessor`)**
  * Khi gọi `GET /api/v1/cart`:
    * Truy vấn `inventory-service` để lấy `available_stock` của từng `book_id`.
    * Nếu `available_stock == 0`: Tự động uncheck `is_selected = false` và gắn cờ `status: 'OUT_OF_STOCK'`.
    * Nếu `quantity > available_stock`: Tự động điều chỉnh `quantity = available_stock` và gắn cờ `status: 'PARTIAL_STOCK'`, trả về cảnh báo `"Số lượng đã được hạ xuống bằng tồn kho khả dụng"`.

* **Task 3.2: Module Phát Hiện Biến Động Giá (`PriceMutationDetector`)**
  * So sánh giá hiện tại (`current_price`) với giá lúc thêm (`added_price`):
    * Nếu `current_price < added_price`: Gắn nhãn `price_change: 'DECREASED'`, hiển thị mức giảm.
    * Nếu `current_price > added_price`: Gắn nhãn `price_change: 'INCREASED'`, hiển thị lý do (VD: Hết Flash Sale).
    * Tự động tính toán lại tổng tiền thanh toán theo `current_price`.

---

## PHẦN 4: GIAO DIỆN STOREFRONT & PHÂN NHÓM THEO NHÀ BÁN HÀNG

### 📌 Mục tiêu:
Xây dựng giao diện giỏ hàng chuyên nghiệp, mượt mà, phân nhóm trực quan theo từng Shop và xử lý thẩm mỹ khu vực sản phẩm hết hàng.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Xây dựng Trang Giỏ Hàng ([`CartPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/cart/CartPage.jsx))**
  * **Header bảng**: Checkbox "Chọn tất cả", Cột Sản phẩm, Đơn giá, Số lượng, Thành tiền, Thao tác.
  * **Khối phân nhóm theo Shop**:
    * Thanh tiêu đề Shop: Checkbox chọn cả Shop, Tên Shop, Nút "Xem Shop".
    * Danh sách sách của Shop: Bìa, Tên sách, Phân loại (`[Sách Giấy]`, `[Ebook]`, `[Hybrid]`), Bộ tăng giảm số lượng mượt mà có debounce chống spam click.
  * **Thanh tổng kết nổi cố định (Sticky Footer)**:
    * Checkbox chọn tất cả, Tổng tiền tạm tính của các sản phẩm đã tick, Nút **"Mua Hàng (X)"** nổi bật.

* **Task 4.2: Xây dựng Khu Vực Hàng Không Khả Dụng (`UnavailableItemsSection.jsx`)**
  * Đặt ở cuối trang:
    * Tiêu đề: *"Sản phẩm tạm thời không khả dụng (X)"*.
    * Danh sách sách bị làm mờ (Opacity 50%), nút checkbox bị vô hiệu hóa.
    * Huy hiệu xám rõ ràng: **"TẠM HẾT HÀNG"**.
    * Nút hành động: **"Xóa"** hoặc **"Tìm sách tương tự"**.

---

## PHẦN 5: KIỂM THỬ TOÀN TRÌNH & ĐÁNH GIÁ TRẢI NGHIỆM (TEST SUITE)

### 📌 Mục tiêu:
Đảm bảo 100% tính chính xác của cơ chế gộp giỏ, cập nhật số lượng và xử lý biến động tồn kho/giá.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Unit & Integration Test Giỏ Hàng**
  * Kiểm thử gộp giỏ hàng khách vãng lai và tài khoản có sẵn (Merge Cart Test).
  * Kiểm thử debounce tăng giảm số lượng liên tục không gây lỗi dữ liệu.

* **Task 5.2: Kiểm thử Kịch Bản Xử Lý Biến Động Thực Tế**
  * Đưa sách vào giỏ &rarr; Giả lập sách hết hàng trong kho &rarr; Mở lại giỏ: Xác nhận sách tự động chuyển sang khu vực hết hàng và không cho phép thanh toán.
  * Đưa sách Flash Sale 29k vào giỏ &rarr; Hết phiên sale &rarr; Mở lại giỏ: Xác nhận giá cập nhật 100k kèm cảnh báo màu vàng.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Database** | Prisma Schema bảng `carts`, `cart_items` | ⏳ Sẵn sàng | Backend Team |
| **Merge Engine** | Thuật toán gộp giỏ khách vãng lai khi đăng nhập | ⏳ Sẵn sàng | Backend Team |
| **Backend APIs** | Bộ APIs CRUD giỏ hàng và kiểm tra đồng bộ tồn kho | ⏳ Sẵn sàng | Backend Team |
| **Mutation Engine** | Tự động xử lý hết hàng, hạ số lượng và cảnh báo biến động giá | ⏳ Sẵn sàng | Backend Team |
| **Frontend UI** | Giao diện `CartPage.jsx`, Shop Grouping, Vùng Hết hàng & Sticky Footer | ⏳ Sẵn sàng | Frontend Team |
| **Quality Audit** | Vượt qua 100% Ma trận kiểm thử 6 kịch bản (TC_CART_01 đến TC_CART_06) | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 9 thuộc Nền tảng Sách Huki Ebook.*
