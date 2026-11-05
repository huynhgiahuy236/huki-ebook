# Báo Cáo Kiểm Thử & Danh Sách Lỗi: Nhóm Khách Hàng / Độc Giả (Buyer & Reader Journey)

> **Mã phân hệ:** `BUG-GROUP-01`  
> **Đối tượng người dùng:** Khách hàng vãng lai, Người mua sách (Buyer), Độc giả đọc Ebook (Reader).  
> **Phạm vi kiểm thử:** Toàn bộ 45 màn hình công khai và cá nhân của độc giả, gồm tất cả nút bấm, liên kết điều hướng, bộ lọc, form nhập liệu, trình đọc Ebook DRM, giỏ hàng và thanh toán.  
> **Nguyên tắc kỹ thuật:** 100% dữ liệu thực từ PostgreSQL/MongoDB qua API Backend; tuyệt đối không dùng mock data; giải pháp xử lý dứt khoát duy nhất.

---

## BẢNG TỔNG HỢP CÁC LỖI TRÊN TỪNG NÚT BẤM & TỪNG MÀN HÌNH (BUYER & READER)

| Mã Lỗi | Màn Hình / Route | Nút Bấm / Thành Phần Tương Tác | Phân Loại | Mức Độ | Trạng Thái Kiểm Thử |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **BR-001** | Chi tiết đơn hàng (`/orders/[id]`) | Nút **"Đọc Ngay"** (`chrome_reader_mode`) | Điều Hướng / Link | **P0 (Blocker)** | ❌ **FAIL** (Văng trang 404 Not Found) |
| **BR-002** | Đặt hàng thành công (`/order-success`) | Nút **"Đăng Lên Bảng Tin Huki"** (`share`) | Tương Tác / Action | **P1 (Critical)** | ❌ **FAIL** (Nút chết, không có `onClick`/action) |
| **BR-003** | Đặt hàng thành công (`/order-success`) | Nút **"Trung tâm trợ giúp"** | Điều Hướng / Link | **P1 (Critical)** | ❌ **FAIL** (Liên kết gãy `/help` $\rightarrow$ 404) |
| **BR-004** | Trình đọc Ebook (`/reader`) | Nút **"Quay lại cửa hàng"** (`arrow_back`) | Điều Hướng / Link | **P1 (Critical)** | ❌ **FAIL** (Liên kết gãy `/store` $\rightarrow$ 404) |
| **BR-005** | Trang Thư viện (`/library`) | Nút **"Đăng nhập để xem"** (Guest State) | Auth / Điều Hướng | **P1 (Critical)** | ❌ **FAIL** (Gãy link `/login` thay vì `/auth/login`) |
| **BR-006** | Trang Theo dõi (`/following`) | Nút **"Đăng nhập ngay"** (Guest State) | Auth / Điều Hướng | **P1 (Critical)** | ❌ **FAIL** (Gãy link `/login` thay vì `/auth/login`) |
| **BR-007** | Danh sách đơn hàng (`/orders`) | Nút **"Đọc Ebook"** trên card đơn hàng | Điều Hướng / Link | **P0 (Blocker)** | ❌ **FAIL** (Link sang `/reader/${id}` bị 404) |
| **BR-008** | Trang chủ (`/`) | Hero Banner & Card Flash Sale | Dữ Liệu & Hiển Thị | **P1 (Critical)** | ❌ **FAIL** (Promotion Service 502 Bad Gateway) |
| **BR-009** | Chi tiết sách (`/book/[id]`) | Nút **"Viết đánh giá"** khi chưa đăng nhập | Auth & UX | **P2 (Major)** | ❌ **FAIL** (Không hiện modal login, request ngầm 401) |
| **BR-010** | Danh mục sách (`/books`) | Nút lọc theo **Thể loại sách** | API & Filter | **P1 (Critical)** | ❌ **FAIL** (Gửi sai param làm rỗng danh sách) |
| **BR-011** | Giỏ hàng (`/cart`) | Nút **"Tiếp tục mua sắm"** | Điều Hướng / Link | **P2 (Major)** | ❌ **FAIL** (Neo chết `href="#"`, không đưa về danh mục) |
| **BR-012** | Thanh toán (`/checkout`) | Nút chọn phương thức **"Ví HUKI"** | Nghiệp Vụ / API | **P1 (Critical)** | ❌ **FAIL** (Backend trả về 400 Validation Error) |
| **BR-013** | Trình đọc Ebook (`/reader`) | Nút đổi **Cỡ chữ & Font nền** | State & Storage | **P2 (Major)** | ❌ **FAIL** (Bị reset về mặc định khi F5 do thiếu cache) |
| **BR-014** | Trình đọc Ebook (`/reader`) | Tự động gọi API **Bookmarks** trên sách mới | Network & API | **P2 (Major)** | ❌ **FAIL** (Spam 404 Not Found từ backend) |
| **BR-015** | Toàn bộ thẻ sách (`BookCard`) | Toàn bộ bề mặt thẻ sách trên trang chủ | SEO & Trải Nghiệm | **P2 (Major)** | ❌ **FAIL** (Dùng thẻ `div` bọc ngoài thay vì `Link`) |

---

## CHI TIẾT KỸ THUẬT TỪNG LỖI CỤ THỂ

---

### [BR-001] Nút "Đọc Ngay" trong Chi Tiết Đơn Hàng Dẫn Đến Trang 404 Not Found
- **Vị trí chính xác:**
  - Màn hình: Chi tiết đơn hàng đã mua Ebook (`http://localhost:3100/orders/[id]`)
  - File mã nguồn: [web/src/app/orders/[id]/page.tsx](file:///e:/HuKi/web/src/app/orders/[id]/page.tsx#L955-L961)
- **Nút bấm / Thao tác:**
  - Nút: `<Link href={`/reader/${item.bookId}`}>` kèm icon `chrome_reader_mode` và nhãn `"Đọc Ngay"`.
- **Hiện tượng lỗi:**
  - Người dùng mua thành công sách Ebook kỹ thuật số. Khi vào đơn hàng bấm nút **"Đọc Ngay"**, trình duyệt điều hướng đến URL: `http://localhost:3100/reader/34e84482-931a-43bc-8492-6592b8dbfd80`.
  - Next.js không có route động `app/reader/[id]/page.tsx` mà chỉ có `app/reader/page.tsx` (nhận query parameter `?book=...`).
  - Next.js rơi vào catch-all route `app/[...slug]/page.tsx` và kích hoạt hàm `notFound()`, hiển thị màn hình **404 - Trang không tồn tại**. Khách hàng không thể đọc được sách vừa thanh toán.
- **Nguyên nhân gốc rễ:**
  - Cấu trúc thư mục Next.js App Router là `web/src/app/reader/page.tsx`. Trình đọc đọc ID sách từ `searchParams.get('book')`.
  - Nút "Đọc Ngay" tại `orders/[id]/page.tsx` viết cứng đường dẫn dạng path-param `/reader/${item.bookId}` thay vì query-param `/reader?book=${item.bookId}`.
- **Giải pháp dứt khoát duy nhất:**
  - Sửa dòng 956 trong [web/src/app/orders/[id]/page.tsx](file:///e:/HuKi/web/src/app/orders/[id]/page.tsx#L956):
    ```tsx
    href={`/reader?book=${item.bookId}`}
    ```
  - Đồng thời tạo thư mục `web/src/app/reader/[id]/page.tsx` làm alias chuyển tiếp sang `/reader?book=[id]` để bảo vệ tuyệt đối tất cả các đường link cũ.

---

### [BR-002] Nút "Đăng Lên Bảng Tin Huki" Tại Trang Hoàn Tất Đơn Hàng Là Nút Chết
- **Vị trí chính xác:**
  - Màn hình: Đặt hàng thành công (`http://localhost:3100/order-success`)
  - File mã nguồn: [web/src/app/order-success/page.tsx](file:///e:/HuKi/web/src/app/order-success/page.tsx#L726-L730)
- **Nút bấm / Thao tác:**
  - Nút: `<button className="... bg-primary ..."> Đăng Lên Bảng Tin Huki </button>` kèm icon `share`.
- **Hiện tượng lỗi:**
  - Sau khi thanh toán thành công, người dùng nhìn thấy khối kêu gọi *"Chia sẻ cuốn sách mới bạn vừa sở hữu - Lan tỏa cảm hứng đọc sách cùng bạn bè trên Mạng xã hội HUKI"*.
  - Người dùng bấm vào nút **"Đăng Lên Bảng Tin Huki"**, con trỏ chuột không đổi, không có hiệu ứng, không có modal chia sẻ, không chuyển trang, không có bất kỳ phản hồi nào.
- **Nguyên nhân gốc rễ:**
  - Thẻ `<button>` được viết cứng giao diện HTML tĩnh nhưng **hoàn toàn không có thuộc tính `onClick`**, không gọi API `communityApi` và không liên kết đến `/community`.
- **Giải pháp dứt khoát duy nhất:**
  - Gắn `onClick` cho nút, mở modal soạn thảo bài viết chia sẻ cảm nghĩ về cuốn sách vừa mua và điều hướng người dùng sang `/community` sau khi đăng bài thành công kèm toast thông báo *"Đã chia sẻ sách lên Bảng tin HUKI!"*.

---

### [BR-003] Nút "Trung Tâm Trợ Giúp" Tại Trang Order Success Dẫn Sang Link Gãy `/help`
- **Vị trí chính xác:**
  - Màn hình: Đặt hàng thành công (`http://localhost:3100/order-success`)
  - File mã nguồn: [web/src/app/order-success/page.tsx](file:///e:/HuKi/web/src/app/order-success/page.tsx#L638)
- **Nút bấm / Thao tác:**
  - Nút / Link: `<Link href="/help" className="...">Trung tâm trợ giúp</Link>`.
- **Hiện tượng lỗi:**
  - Người dùng cần hỗ trợ về đơn hàng, bấm vào liên kết **"Trung tâm trợ giúp"**, trình duyệt mở trang `http://localhost:3100/help` và nhận ngay mã lỗi **HTTP 404 Not Found**.
- **Nguyên nhân gốc rễ:**
  - Trong dự án HUKI không tồn tại route `/help`. Kênh hỗ trợ khách hàng được xây dựng qua `/policy` hoặc mở widget Chatbot Bé Cáo AI / tin nhắn hỗ trợ trực tiếp.
- **Giải pháp dứt khoát duy nhất:**
  - Đổi liên kết `href="/help"` thành `href="/policy"` (hoặc kích hoạt mở modal trợ giúp Bé Cáo AI với topic "Hỗ trợ đơn hàng").

---

### [BR-004] Nút "Quay Lại Cửa Hàng" Trên Trình Đọc Ebook Dẫn Sang Link Gãy `/store`
- **Vị trí chính xác:**
  - Màn hình: Trình đọc Ebook DRM (`http://localhost:3100/reader`)
  - File mã nguồn:
    - [web/src/app/reader/page.tsx](file:///e:/HuKi/web/src/app/reader/page.tsx#L255)
    - [web/src/ui/components/reader/PdfCanvasViewer.tsx](file:///e:/HuKi/web/src/ui/components/reader/PdfCanvasViewer.tsx#L394)
- **Nút bấm / Thao tác:**
  - Nút: Nút điều hướng quay lại danh mục sách từ màn hình đọc sách khi sách chưa mua hoặc bị lỗi truy cập.
- **Hiện tượng lỗi:**
  - Người dùng bấm nút quay lại gian hàng, bị chuyển sang `http://localhost:3100/store` $\rightarrow$ **HTTP 404 Not Found**.
- **Nguyên nhân gốc rễ:**
  - Route danh sách gian hàng trong dự án là số nhiều `/stores` hoặc danh mục sách là `/books`. Lập trình viên gõ nhầm thành số ít `/store`.
- **Giải pháp dứt khoát duy nhất:**
  - Thay toàn bộ `href="/store"` thành `href="/books"` để độc giả quay lại đúng trang duyệt sách chính thức.

---

### [BR-005] Nút "Đăng Nhập" Trên Trang Thư Viện (`/library`) & Theo Dõi (`/following`) Bị 404
- **Vị trí chính xác:**
  - [web/src/app/library/page.tsx](file:///e:/HuKi/web/src/app/library/page.tsx#L489)
  - [web/src/app/following/page.tsx](file:///e:/HuKi/web/src/app/following/page.tsx#L203)
- **Nút bấm / Thao tác:**
  - Nút: `"Đăng nhập để xem tủ sách của bạn"` và `"Đăng nhập để xem danh sách theo dõi"`.
- **Hiện tượng lỗi:**
  - Khách chưa đăng nhập vào xem trang Thư viện hoặc Trang theo dõi, nhìn thấy thông báo yêu cầu đăng nhập. Bấm vào nút đăng nhập thì bị điều hướng sang `http://localhost:3100/login` $\rightarrow$ **HTTP 404 Not Found**.
- **Nguyên nhân gốc rễ:**
  - Toàn bộ phân hệ xác thực nằm trong tiền tố `app/auth/*` (`/auth/login`, `/auth/register`). Lập trình viên viết tắt thành `/login`.
- **Giải pháp dứt khoát duy nhất:**
  - Đổi tất cả các link `href="/login"` thành `href="/auth/login?redirect=..."` để sau khi đăng nhập thành công, người dùng được tự động chuyển ngược lại đúng trang thư viện.

---

### [BR-006] Nút "Đọc Ebook" Trên Danh Sách Đơn Hàng (`/orders`) Bị Lỗi 404
- **Vị trí chính xác:**
  - Màn hình: Lịch sử đơn hàng cá nhân (`http://localhost:3100/orders`)
  - File mã nguồn: [web/src/app/orders/page.tsx](file:///e:/HuKi/web/src/app/orders/page.tsx#L799)
- **Nút bấm / Thao tác:**
  - Nút: Quick Action button `"Đọc Ebook"` hiển thị trực tiếp trên card đơn hàng có chứa ấn phẩm số.
- **Hiện tượng lỗi:**
  - Tương tự như màn hình chi tiết, nút này dẫn sang `/reader/${firstDigitalItem.bookId}` $\rightarrow$ **HTTP 404 Not Found**.
- **Giải pháp dứt khoát duy nhất:**
  - Chuyển `href` sang `/reader?book=${firstDigitalItem.bookId || firstDigitalItem.id}`.

---

### [BR-007] Cụm Flash Sale & Banner Trang Chủ Bị 502 Bad Gateway
- **Vị trí chính xác:**
  - Màn hình: Trang chủ (`http://localhost:3100/`) và Trang Flash Sale (`http://localhost:3100/flash-sale`)
  - File mã nguồn: `platform/apps/promotion-service`, `docker-compose.uat.yml`
- **Hiện tượng lỗi:**
  - Container `huki-uat-promotion-service` bị lỗi restart liên tục trên UAT. Toàn bộ API gọi sang `/api/v1/flash-sales`, `/api/v1/vouchers`, `/api/v1/banners` trả về lỗi **HTTP 502 Bad Gateway: "Service promotion is unavailable"**.
  - Người dùng vào trang chủ thấy khu vực Flash Sale bị rỗng hoặc quay vòng vô tận.
- **Nguyên nhân gốc rễ:**
  - Lệnh khởi động container promotion-service chạy `npx prisma migrate deploy` gặp lỗi môi trường hoặc thiếu quyền trong container non-root `USER node`.
- **Giải pháp dứt khoát duy nhất:**
  - Kiểm tra kết nối cơ sở dữ liệu `huki_uat_promotion`, đảm bảo biến môi trường `PROMOTION_DATABASE_URL` và `DATABASE_URL` đồng bộ, sửa container command để node server khởi động ổn định.

---

### [BR-008] Nút Chọn Phương Thức Thanh Toán "Ví HUKI" Bị 400 Validation Error
- **Vị trí chính xác:**
  - Màn hình: Đặt hàng & Thanh toán (`http://localhost:3100/checkout`)
  - File mã nguồn: [web/src/app/checkout/page.tsx](file:///e:/HuKi/web/src/app/checkout/page.tsx)
- **Nút bấm / Thao tác:**
  - Radio button chọn phương thức thanh toán: `"Ví HUKI (Thanh toán tức thì)"` $\rightarrow$ Bấm nút `"Đặt Hàng Ngay"`.
- **Hiện tượng lỗi:**
  - Khi người dùng chọn Ví HUKI và bấm đặt hàng, màn hình hiện thông báo đỏ: *"Lỗi tạo đơn hàng: Phương thức thanh toán WALLET không hợp lệ"*. Request backend `POST /api/v1/orders/checkout` trả về HTTP 400 Bad Request.
- **Nguyên nhân gốc rễ:**
  - Frontend gửi `paymentMethod: 'WALLET'`, trong khi enum của backend trong Prisma Schema chỉ hỗ trợ: `'COD'`, `'PAYOS'`, `'VNPAY'`, `'MOMO'`.
- **Giải pháp dứt khoát duy nhất:**
  - Nếu hệ thống chưa kích hoạt module Ví thanh toán nội bộ, ẩn tùy chọn Ví HUKI trên giao diện thanh toán hoặc cập nhật enum `PaymentMethod` trong database backend để hỗ trợ đầy đủ.

