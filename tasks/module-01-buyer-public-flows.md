# MOD-01: Cổng Độc Giả & Khách Mua Hàng (Public & Buyer Journey)

> **Phạm vi kiểm thử toàn diện:** Gồm 45 Màn hình & Luồng hệ thống kết hợp giữa **Kiểm thử Giao diện (UI/UX 3 Viewports: Mobile 390px, Tablet 768px, Desktop 1440px)** và **Kiểm thử Chức năng Nghiệp Vụ Sâu (Functional Business Logic, API Network Exceptions & Backend Database Logs)**.  
> **Trạng thái thực tế:** **ĐÃ HOÀN TẤT KIỂM THỬ THỰC TẾ 2 PHA TOÀN DIỆN (UI/UX + CHỨC NĂNG NGHIỆP VỤ + LOGS)**.  
> **Kết quả kiểm thử:** Phát hiện và lập hồ sơ chi tiết **26 lỗi xác thực (18 lỗi UI/UX/Responsive + 8 lỗi Chức năng Nghiệp vụ & Network nghiêm trọng)** lưu tại [tasks/bug-mod01.md](file:///e:/HuKi/tasks/bug-mod01.md).  
> **Cam kết cốt lõi:** **Tuyệt đối không tự ý sửa code sản phẩm** (`web/src/*`, `platform/*`) trước khi có sự phê duyệt từ người dùng.

---

## 🎨 BỘ TIÊU CHUẨN THIẾT KẾ ANTI-AI & GIAO DIỆN XUẤT BẢN TINH TẾ (EDITORIAL DESIGN STANDARD)

Để đảm bảo toàn bộ website mang phong cách sản phẩm xuất bản sách tri thức cao cấp, sạch đẹp, chuyên nghiệp và loại bỏ hoàn toàn cảm giác "AI-generated / demo template", mọi màn hình bắt buộc tuân thủ:

1. **🚫 Loại bỏ triệt để các vết tích "AI Clichés":**
   - Không dùng các khối cầu màu phát sáng vô nghĩa (`blur-3xl`, `bg-yellow-400/20 blur-3xl`, `bg-purple-500/20`).
   - Không dùng hiệu ứng nhấp nháy liên tục `animate-pulse` trên các icon/nút bấm ổn định (chỉ dùng skeleton shimmer nhẹ khi đang nạp API).
   - Không dùng emoji text hoặc raw unicode symbols thô (`★`, `☆`, `⌛`, `👉`, `📦`). Luôn dùng SVG vector chuẩn Material Symbols (`star`, `verified`, `local_shipping`).
   - Không để các thẻ đơn lẻ lọt thỏm trôi nổi giữa màn hình trống (`max-w-md` trôi nổi). Luôn thiết kế bố cục grid rõ ràng.
   - Không nhúng dữ liệu mock/placeholder tĩnh ("Atomic Habits", "Lorem ipsum", tác giả ảo Unsplash). Luôn kết nối dữ liệu thật từ DB/API hoặc hiển thị Empty State tao nhã.

2. **🌿 Bảng Màu Xuất Bản Tri Thức & Sách Bản Quyền:**
   - **Màu thương hiệu chính (Primary):** `#003B2B` (Forest Green đậm tri thức, sang trọng, thư thái cho mắt).
   - **Màu nhấn (Accent):** `#00875A` (Emerald tươi) và `#D97706` / `#F59E0B` (Amber gold ấm áp).
   - **Màu nền (Surface / Background):** Tông giấy in cao cấp `#FBF9F5` (Book Cream) hoặc Neutral Slate `#F8FAFC` sạch sẽ.
   - **Đường viền (Hairline Borders):** `#E2E8F0` hoặc `#003B2B`/10 siêu mảnh, tinh tế, không dùng viền đen thô.

3. **📖 Typography Chuẩn Xuất Bản (Editorial Hierarchy):**
   - **Tiêu đề & Tựa sách (Headings):** Dùng font Serif (`font-editorial` / `font-serif`) mang phong vị sách in truyền thống.
   - **Nội dung văn bản (Body):** Dùng font Sans-serif sắc nét, độ tương phản chuẩn WCAG AA (tối thiểu 4.5:1), không dùng chữ xám mờ khó đọc.
   - **Mã đơn hàng, ISBN, SKU, Giá tiền:** Luôn dùng font Monospace (`font-mono`) cho độ chính xác kỹ thuật.

4. **✨ Công Thái Học & Tương Tác Vi Mô (Micro-interactions & Affordance):**
   - Mọi nút bấm, thẻ card đều có `cursor-pointer`, hiệu ứng hover êm ái `transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`.
   - Tất cả các liên kết điều hướng phải dùng chuẩn `<Link href="...">` để hỗ trợ SEO và mở tab mới.
   - Thao tác sao chép hoặc hành động ngầm đều có Toast thông báo tức thì ("Đã sao chép liên kết sách", "Đã lưu thay đổi").

---

## 🔍 TIÊU CHUẨN KIỂM THỬ ĐA CHIỀU (MULTI-SPECTRUM AUDIT SPECIFICATION)

Mỗi màn hình trong 45 màn hình dưới đây đều bắt buộc trải qua **4 chiều kiểm thử toàn diện** bằng robot Playwright, API probes và phân tích log cơ sở dữ liệu:
- 📱 **Responsive 3 Viewports:** Mobile (390 x 844 px), Tablet (768 x 1024 px), Desktop (1440 x 900 px).
- ⚡ **Chức Năng Nghiệp Vụ (Functional):** Kiểm tra tính đúng đắn của logic tính toán tiền, trừ/giải phóng kho hàng, áp mã giảm giá, đọc Ebook DRM, hủy đơn hàng, tạo phiên thanh toán.
- 🔴 **Console Error & Runtime:** Lắng nghe lỗi đỏ React Hydration, `TypeError`, render loops.
- 🌐 **Network & Exception Log:** Lắng nghe toàn bộ request `status >= 400` (400, 401, 403, 404, 429, 500) và kiểm tra tính toàn vẹn dữ liệu PostgreSQL/Redis.

---

## 🗺️ BẢN ĐỒ CHI TIẾT & TIẾN ĐỘ KIỂM THỬ CHỨC NĂNG MOD-01

### 1. Phân Hệ 1: Khám Phá & Tìm Kiếm Ấn Phẩm (Discovery & Catalog)

- [ ] **Màn hình 1.1: Trang Chủ (`/`)**
  - [x] **Hero Carousel & Banners:** Đã kiểm thử hiển thị. Phát hiện lỗi giật cục cắt gắt và thẻ banner dùng `<div>` tĩnh không click được (`BUG-001`).
  - [ ] **Khách vãng lai bị spam lỗi 401 (`BUG-002`):** Trang chủ tự động kích hoạt gọi API `/api/v1/vouchers/available` khi chưa có token đăng nhập, gây lỗi HTTP 401 và kích hoạt chuỗi retry refresh token thất bại liên tiếp.
  - [x] **Bộ sưu tập sách nổi bật:** Tải sách mới phát hành, sách bán chạy tính theo số lượng bán thật trong PostgreSQL.
  - [x] **Combo Sách Tuyển Chọn (Book Bundles):** Hiển thị 3 bìa sách xếp lớp, tính đúng tỷ lệ giảm giá combo.
  - [ ] **Rò rỉ lỗi gọi API Reader Bookmark 404 (`BUG-021`):** `ReaderContext` bọc trong layout cha hardcode sách `con-duong-phia-truoc`, gây lỗi `GET /api/reader/bookmarks/con-duong-phia-truoc 404` ngay trên trang chủ.

- [ ] **Màn hình 1.2: Danh Mục Sách & Bộ Lọc Nâng Cao (`/books`)**
  - [x] **Lọc theo Định dạng:** Lọc `PHYSICAL` và `DIGITAL` hoạt động chính xác (Status 200).
  - [ ] **LỖI CHỨC NĂNG NGHIÊM TRỌNG (`BUG-023` - P1):** Lọc theo thể loại `GET /books?categoryId=...` trả về lỗi HTTP 400 Bad Request (`property categoryId should not exist`) do backend chỉ chấp nhận param `category`.
  - [ ] **Vi phạm SEO & a11y (`BUG-003` - P0):** Toàn bộ thẻ `BookCard` dùng `<div>` kèm `router.push()` thay vì thẻ `<Link>`, ngăn cản người dùng mở tab mới để so sánh sách.
  - [ ] **Vi phạm thiết kế Anti-AI (`BUG-017` - P1):** Bộ lọc đánh giá dùng chuỗi ký tự unicode thô `★★★★★` dễ vỡ font tofu thay vì icon vector.

- [ ] **Màn hình 1.3: Chi Tiết Sách (`/book/[id]`)**
  - [x] **Truy vấn bằng UUID:** `GET /books/7d426952-bb0e-45ea-84e6-9fb33db9a769` trả về đầy đủ định dạng, giá tiền và tồn kho (Status 200).
  - [ ] **LỖI CHỨC NĂNG NGHIÊM TRỌNG (`BUG-022` - P0):** Khi mở sách bằng slug SEO (`/book/con-duong-phia-truoc`), backend ép kiểu UUID ném lỗi HTTP 400 Bad Request (`Validation failed: uuid is expected`).
  - [ ] **Nút Nhắn tin với Shop bị khóa (`BUG-MOD06-02` - P0):** Bị hardcode `cursor-not-allowed` kèm nhãn "Sắp ra mắt".
  - [ ] **Thông số kỹ thuật sách (`BUG-004` - P1):** Hardcode chữ "Đang cập nhật" cho nhiều trường thông số kỹ thuật.
  - [ ] **Nút chia sẻ sách (`BUG-019` - P2):** Sao chép liên kết vào clipboard ngầm mà không có Toast phản hồi.

- [ ] **Màn hình 1.4: Đọc Thử Sách Trực Tuyến (`/book/[id]/preview`)**
  - [ ] **Lỗi vỡ layout Mobile (`BUG-015` - P1):** Thanh công cụ toolbar dàn ngang cố định 580px gây tràn màn hình điện thoại +190px (`scrollWidth: 580px` vs `390px`).
  - [x] **Giới hạn số trang đọc thử:** Bộ đọc hiển thị bản mẫu xem trước không cho phép đọc toàn văn.

- [ ] **Màn hình 1.5: Gian Hàng & Tác Giả (`/stores`, `/authors`, `/categories`)**
  - [ ] **Dữ liệu giả lập khổng lồ (`BUG-018` - P1):** Trang `/stores` nhúng cứng 1100 dòng code mock data và ảnh Unsplash (`isMock: true`).
  - [ ] **Vỡ layout Mobile (`BUG-014` - P1):** Khối tròn trang trí `w-96 h-96` gây tràn màn hình Mobile +147px.

- [ ] **Màn hình 1.6: Flash Sale Giờ Vàng (`/flash-sale`)**
  - [ ] **Vi phạm thiết kế Anti-AI (`BUG-016` - P1):** Lạm dụng khối cầu phát sáng `blur-3xl` và 6 hoạt ảnh nhấp nháy `animate-pulse` gây nhức mắt.

---

### 2. Phân Hệ 2: Giỏ Hàng & Quy Trình Đặt Hàng Thanh Toán (Cart & Checkout Flow)

- [ ] **Màn hình 2.1: Giỏ Hàng Người Dùng (`/cart`)**
  - [x] **Lấy giỏ hàng (`GET /api/v1/cart`):** Trả về danh sách sách trong giỏ, nhóm theo cửa hàng (Status 200).
  - [x] **Thêm vào giỏ (`POST /api/v1/cart/items`):** Thêm sách vào giỏ thành công (Status 201).
  - [x] **Ràng buộc kiểm tra tồn kho:** Khi thêm số lượng vượt quá tồn kho (ví dụ: 99999 cuốn), backend chặn chính xác với lỗi HTTP 400 Validation Error.
  - [ ] **Nút Tiếp tục mua sắm (`BUG-006` - P2):** Gắn thẻ neo chết `href="#"` không đưa người dùng quay lại danh mục sách.

- [ ] **Màn hình 2.2: Xem Trước Đơn Hàng & Tính Phí Vận Chuyển (`POST /cart/checkout/preview`)**
  - [x] **Tính toán chi phí tự động:** Tính đúng tiền sách (`itemSubtotal`), phí vận chuyển (`shippingFee`), giảm giá voucher sàn/shop và tổng tiền thanh toán (`grandTotal`). Tạo `sessionId` có thời hạn 15 phút chuẩn xác.
  - [x] **Sổ địa chỉ nhận hàng (`GET /shipping/address`):** Tải địa chỉ mặc định của người dùng thành công (Status 200).
  - [ ] **Crash trắng trang thanh toán (`BUG-007` - P0):** Khi địa chỉ nhận hàng có trường quận/huyện null, giao diện checkout bị crash React render.

- [ ] **Màn hình 2.3: Xác Nhận Đặt Hàng & Thanh Toán (`POST /cart/checkout/confirm`)**
  - [x] **Thanh toán khi nhận hàng (COD):** Tạo đơn hàng thành công trong PostgreSQL (`orders`, `seller_orders`), sinh mã đơn hàng chuẩn `ORD-...` và trừ tạm giữ kho hàng (`RESERVE` -1).
  - [ ] **LỖI CHỨC NĂNG NGHIÊM TRỌNG (`BUG-025` - P0):** Khi chọn phương thức "Thanh toán qua Ví HUKI" (`paymentMethod: 'WALLET'`), backend ném lỗi HTTP 400 Bad Request (`paymentMethod must be one of the following values: COD, ONLINE_PAYMENT`), khiến luồng thanh toán bằng ví bị vô hiệu hóa hoàn toàn!
  - [x] **Chuyển hướng thành công:** Chuyển sang màn hình `/order-success` hiển thị mã đơn hàng và hướng dẫn giao dịch.

---

### 3. Phân Hệ 3: Tủ Sách Ebook & Trình Đọc DRM (Library & Reader)

- [ ] **Màn hình 3.1: Tủ Sách Cá Nhân (`/library`)**
  - [x] **Tải sách bản quyền đã mua (`GET /books/library/my-books`):** Trả về đầy đủ Ebook đã mua từ cơ sở dữ liệu (Status 200).
  - [x] **Tìm kiếm & Lọc sách Ebook:** Lọc theo Đang đọc, Yêu thích, Đã hoàn thành.

- [ ] **Màn hình 3.2: Quản Lý Thiết Bị Đọc DRM (`/library/devices`)**
  - [ ] **LỖI CHỨC NĂNG NGHIÊM TRỌNG (`BUG-026` - P1):** Trang quản lý thiết bị 100% sử dụng dữ liệu giả lập (Mock state). Nút "Thu hồi thiết bị" chỉ lọc mảng React state trong bộ nhớ tạm mà không hề kết nối tới API `drm_devices` của backend.

- [ ] **Màn hình 3.3: Trình Đọc Sách Ebook Bản Quyền (`/reader`)**
  - [x] **Tải tiến độ đọc sách (`GET /api/v1/reader/progress/:bookId`):** Trả về trang đang đọc dở và phần trăm hoàn thành (Status 200).
  - [ ] **LỖI CHỨC NĂNG NGHIÊM TRỌNG (`BUG-024` - P0):** Khi lật trang sách, hàm `readerApi.saveProgress` gửi dư trường `totalPages`, backend ném lỗi HTTP 400 Bad Request (`property totalPages should not exist`), khiến tiến độ đọc sách của người dùng không bao giờ được lưu lại trên máy chủ!
  - [ ] **Lỗi lưu tùy biến cỡ chữ (`BUG-009` - P2):** Cỡ chữ người đọc tùy biến không được lưu vào `localStorage`, bị reset về mặc định khi tải lại trang.

---

### 4. Phân Hệ 4: Quản Lý Đơn Hàng & Sau Bán Hàng (Orders & After-Sales)

- [ ] **Màn hình 4.1: Danh Sách & Chi Tiết Đơn Hàng (`/orders`, `/orders/[id]`)**
  - [x] **Tải danh sách đơn hàng (`GET /api/v1/orders`):** Hiển thị toàn bộ các đơn hàng với trạng thái `PROCESSING`, `COMPLETED`, `CANCELLED` (Status 200).
  - [ ] **Bộ lọc ngày ngầm định (`BUG-008` - P1):** Giới hạn đơn trong tháng hiện tại làm ẩn toàn bộ đơn cũ mà không có thông báo.
  - [x] **Hủy đơn hàng chưa đóng gói (`POST /orders/:id/cancel`):** Đã kiểm thử thực tế. Đơn hàng chuyển sang `CANCELLED`, đồng thời PostgreSQL tự động tạo bản ghi `RELEASE` (+1) giải phóng tồn kho sách.

- [ ] **Màn hình 4.2: Đánh Giá & Đổi Trả (`/orders/[id]/review`, `/orders/[id]/return`)**
  - [x] **Ràng buộc chỉ cho phép đánh giá đơn `DELIVERED` (POL-13):** Đã kiểm thử, chặn chính xác các đơn hàng chưa hoàn tất.
  - [ ] **Lỗi gọi sai API upload ảnh (`BUG-MOD06-06` - P1):** Gọi nhầm API upload tranh chấp làm file ảnh biến thành chuỗi Base64 hàng Megabyte.

---

### 5. Phân Hệ 5: Tài Khoản, Sổ Địa Chỉ & Ví Cá Nhân (Account & Profile)

- [ ] **Màn hình 5.1: Sổ Địa Chỉ Nhận Hàng (`/profile/addresses`)**
  - [x] **Tải sổ địa chỉ (`GET /shipping/address`):** Trả về danh sách địa chỉ giao hàng của người dùng (Status 200).
  - [ ] **Lỗi vỡ layout Mobile (`BUG-013` - P1):** Thanh Tabs `DataTableFilterBar` dài 934px làm phình container gây tràn màn hình điện thoại +223px.

- [ ] **Màn hình 5.2: Ví Cá Nhân HUKI (`/profile/wallet`)**
  - [ ] **LỖI CHỨC NĂNG NGHIÊM TRỌNG (`BUG-026` - P1):** Toàn bộ trang ví điện tử người dùng là giao diện giả lập (Mock 100%). Số dư xu, nạp xu nhanh và lịch sử giao dịch chỉ cập nhật state React tạm thời, F5 là mất sạch!

- [ ] **Màn hình 5.3: Bảo Mật Tài Khoản & Tin Nhắn (`/profile/security`, `/messages`)**
  - [ ] **Lỗi xung đột khóa Token (`BUG-020` - P1):** Gọi song song hai khóa `token` và `huki_access_token` gây lỗi HTTP 401 Unauthorized trên trang bảo mật và tin nhắn.
