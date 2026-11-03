# Danh Sách Lỗi Toàn Diện (Comprehensive Bug Tracking) - Module 01: Cổng Độc Giả & Khách Mua Hàng

> **Bộ Tiêu Chuẩn Áp Dụng:**  
> 1. Multi-Spectrum Audit: Responsive (Mobile 390px, Tablet 768px, Desktop 1440px), Console Error, Network HTTP Status (4xx, 5xx), UI/UX Trải nghiệm tương tác thực tế.  
> 2. Editorial Book Commerce & Anti-AI Standards (Loại bỏ triệt để AI clichés, gradient/blur lòe loẹt, unicode text thô, animation giật lag, mock data).  
> 3. **Cam Kết Nghiêm Ngặt:** Không tự ý sửa bất kỳ dòng code nào của ứng dụng khi chưa có sự phê duyệt và chỉ định trực tiếp từ người dùng.

---

## 📑 MỤC LỤC DANH SÁCH LỖI MOD-01

| Mã Bug | Phân Loại | Màn Hình / Vị Trí Ảnh Hưởng | Tóm Tắt Hiện Tượng & Mức Độ Nghiêm Trọng |
| :---: | :---: | :--- | :--- |
| **[BUG-001]** | UI/UX & Tương tác | Trang Chủ (`/`) | Hero Carousel giật cục cắt gắt (hard-cut); thẻ banner là `<div>` tĩnh không click được. |
| **[BUG-002]** | Network & API | Trang Chủ (`/`), Giỏ Hàng (`/cart`) | Khách vãng lai bị spam liên tiếp lỗi `401 Unauthorized` từ API Voucher và Refresh Token. |
| **[BUG-003]** | SEO & a11y | Danh Mục (`/books`), Trang Chủ | Thẻ `BookCard` toàn sàn dùng `<div>` thay vì `<Link>`, cản trở SEO và ngăn mở tab mới. |
| **[BUG-004]** | Dữ Liệu & UI | Chi Tiết Sách (`/book/[id]`) | Hardcode chữ "Đang cập nhật" cho Thông số sách (Định dạng, Ngôn ngữ, Số trang). |
| **[BUG-005]** | Logic & Auth | Chi Tiết Sách (`/book/[id]`) | Bấm "Viết đánh giá" khi chưa đăng nhập không hiện form login, bấm gửi bị thất bại ngầm. |
| **[BUG-006]** | Điều Hướng | Giỏ Hàng (`/cart`) | Nút "Tiếp tục mua sắm" gắn liên kết neo chết `href="#"`, không đưa người dùng về danh mục. |
| **[BUG-007]** | Runtime Crash | Thanh Toán (`/checkout`) | Crash trắng trang giao diện thanh toán khi địa chỉ nhận hàng có trường quận/huyện null. |
| **[BUG-008]** | Logic Nghiệp Vụ | Lịch Sử Đơn Hàng (`/orders`) | Bộ lọc ngày ngầm định giới hạn trong tháng hiện tại làm ẩn toàn bộ đơn cũ mà không có thông báo. |
| **[BUG-009]** | State Persistence | Trình Đọc Sách (`/read/[id]`) | Tùy biến cỡ chữ của người đọc không được lưu `localStorage`, bị reset về mặc định khi tải lại. |
| **[BUG-010]** | Media & Lifecycle | Trình Nghe Sách Nói AI | Audio player sách nói chạy ngầm không tự dừng phát khi người dùng điều hướng sang trang khác. |
| **[BUG-011]** | Hiệu Năng & Network | Thanh Tìm Kiếm Toàn Cục | Debounce gợi ý tìm kiếm quá ngắn (50ms) gây bão request spam API backend khi gõ phím. |
| **[BUG-012]** | **Responsive (Tablet)** | **StoreHeader.tsx (20+ Trang)** | **Tablet 768px:** Menu Utility Bar `whitespace-nowrap` dài 1051px $\rightarrow$ **Tràn ngang +283px**. |
| **[BUG-013]** | **Responsive (Mobile)** | **Trang Tài Khoản (Account Layout)** | **Mobile 390px:** Tabs `DataTableFilterBar` dài 934px làm phình container $\rightarrow$ **Tràn ngang +223px**. |
| **[BUG-014]** | **Responsive (Mobile)** | **Gian Hàng & Tác Giả (`/stores`)** | **Mobile 390px:** Khối tròn trang trí `w-96 h-96` tràn lề phải thiếu `overflow-hidden` $\rightarrow$ **Tràn +147px**. |
| **[BUG-015]** | **Responsive (Mobile)** | **Đọc Thử Sách (`/book/[id]/preview`)** | **Mobile 390px:** Toolbar đọc thử dàn ngang flex cố định (580px) $\rightarrow$ **Tràn +190px** làm vỡ khung đọc. |
| **[BUG-016]** | **Anti-AI Design** | **Flash Sale Giờ Vàng (`/flash-sale`)** | Lạm dụng khối cầu phát sáng `blur-3xl` và 6 hoạt ảnh nhấp nháy `animate-pulse` gây nhức mắt. |
| **[BUG-017]** | **Anti-AI Design** | **Bộ Lọc Đánh Giá (`/books`)** | Dùng chuỗi text unicode `★★★★★` dễ vỡ font tofu `□` thay vì icon vector Material Symbols. |
| **[BUG-018]** | **Anti-AI Mock Data** | **Trang Gian Hàng (`/stores`)** | Nhúng cứng 1100 dòng code dữ liệu giả lập (Mock Authors, ảnh Unsplash, `isMock: true`). |
| **[BUG-019]** | **Tương Tác Vi Mô** | **Chi Tiết Sách (`/book/[id]`)** | Nút chia sẻ sách sao chép liên kết vào clipboard ngầm mà không hiển thị Toast thông báo. |
| **[BUG-020]** | **Network & Auth** | **Trang Cá Nhân & Tin Nhắn** | Lỗi gọi song song hai khóa Token (`token` vs `huki_access_token`) gây `401 Unauthorized` trên `/profile/security`, `/profile/reviews`, `/messages`. |
| **[BUG-021]** | **Network & API** | **Trình Đọc Ebook Toàn Sàn** | Tự động kích hoạt gọi API Bookmark hỏng `GET /api/reader/bookmarks/con-duong-phia-truoc 404` trên nhiều màn hình. |
| **[BUG-022]** | **Chức Năng (P0)** | Chi Tiết Sách (`/book/[slug]`) | Backend ép kiểu UUID khiến mọi request lấy chi tiết sách theo URL Slug bị HTTP 400 Bad Request. |
| **[BUG-023]** | **Chức Năng (P1)** | Danh Mục Sách (`/books`) | Bộ lọc theo thể loại gửi `categoryId` bị backend từ chối HTTP 400 Bad Request do sai tên tham số. |
| **[BUG-024]** | **Chức Năng (P0)** | Trình Đọc Ebook (`/reader`) | Hàm `saveProgress` gửi dư trường `totalPages` khiến API lưu tiến độ đọc bị HTTP 400 Bad Request. |
| **[BUG-025]** | **Chức Năng (P0)** | Thanh Toán (`/checkout`) | Phương thức thanh toán "Ví HUKI" (`WALLET`) bị backend từ chối HTTP 400 Validation Error. |
| **[BUG-026]** | **Chức Năng (P1)** | Ví Người Dùng & Thiết Bị DRM | Màn hình `/profile/wallet` và `/library/devices` là giao diện mock 100%, không kết nối API backend. |

---

## 🔍 CHI TIẾT BÓC TÁCH TỪNG LỖI (DEEP TECHNICAL SPECIFICATION)

---

### [BUG-001] Hero Carousel Trang Chủ (`/`) giật cục cắt gắt & không thể click vào banner
- **1. Vị trí chính xác:**
  - Màn hình: Trang Chủ (`http://localhost:3100/`)
  - File mã nguồn: [web/src/app/page.tsx](file:///e:/HuKi/web/src/app/page.tsx#L900-L966)
  - Viewport ảnh hưởng: Desktop (1440px), Tablet (768px), Mobile (390px).
- **2. Mô tả hiện tượng & Bằng chứng:**
  - *Chuyển cảnh giật cục:* Khi Hero Carousel chuyển đổi sau 5 giây hoặc khi người dùng click vào các chấm pagination tròn, ảnh nền và tiêu đề banner bị giật cục/cắt gắt (hard-cut), hoàn toàn không có hiệu ứng chuyển cảnh mượt mà (smooth cross-fade transition hoặc slide animation).
  - *Liệt tương tác click:* Toàn bộ khung banner kích thước lớn được bọc bằng thẻ `<div>` thuần với sự kiện click rỗng. Người dùng click vào hình ảnh bìa sách nổi bật, tiêu đề sự kiện hoặc vùng trống của banner đều không có phản hồi điều hướng nào. Muốn chuyển trang, người dùng bắt buộc phải rê chuột và click trúng nút con rất nhỏ *"Khám Phá Ngay →"* ở góc dưới bên trái.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - *Nguyên nhân hiệu ứng:* Background ảnh banner được gán trực tiếp thông qua thuộc tính CSS inline: `style={{ backgroundImage: `url(${slide.bannerUrl})` }}` trên một phần tử DOM duy nhất. Trình duyệt không thể áp dụng CSS Transition hay nội suy hình ảnh giữa 2 URL khác nhau trên cùng một phần tử DOM.
  - *Nguyên nhân tương tác:* Vỏ bọc container ngoài cùng thiếu thẻ `<Link href={slide.targetUrl}>` hoặc thiếu `onClick={() => router.push(slide.targetUrl)}` kèm thuộc tính CSS `cursor-pointer`.
- **4. Cách khắc phục đề xuất:**
  - Tách các slide thành các layer xếp chồng tuyệt đối (`absolute inset-0`) và áp dụng lớp CSS `transition-opacity duration-700 ease-in-out` kèm `opacity-100` cho slide đang active và `opacity-0 pointer-events-none` cho slide ẩn.
  - Bọc toàn bộ container của slide bằng thẻ `<Link href={slide.targetUrl || '/books'}>` với class `group cursor-pointer block relative overflow-hidden`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-002] Khách vãng lai vào Trang Chủ (`/`) và Giỏ Hàng (`/cart`) bị spam lỗi 401 Unauthorized từ API Voucher
- **1. Vị trí chính xác:**
  - Màn hình: Trang Chủ (`/`), Giỏ Hàng (`/cart`)
  - File mã nguồn: [web/src/app/page.tsx](file:///e:/HuKi/web/src/app/page.tsx#L130-L144), [web/src/app/cart/page.tsx](file:///e:/HuKi/web/src/app/cart/page.tsx), [web/src/ui/api/voucherApi.ts](file:///e:/HuKi/web/src/ui/api/voucherApi.ts#L128-L132)
  - API Endpoints: `GET /api/v1/vouchers/available`, `POST /api/v1/auth/refresh`
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi mở trang chủ hoặc trang giỏ hàng ở chế độ ẩn danh (chưa đăng nhập), tab Console và tab Network của DevTools xuất hiện liên tiếp 3 log lỗi đỏ nghiêm trọng:
    ```http
    GET http://localhost:3000/api/v1/vouchers/available 401 (Unauthorized)
    {"status":"error","statusCode":401,"code":"AUTH_TOKEN_MISSING","message":"Authentication token is required"}
    POST http://localhost:3000/api/v1/auth/refresh 401 (Unauthorized)
    {"status":"error","statusCode":401,"code":"REFRESH_TOKEN_MISSING","message":"Refresh token is required"}
    ```
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Tại hook `useEffect` khởi tạo trang, hàm `voucherApi.getAvailableVouchers()` được gọi tự động mà không kiểm tra cờ trạng thái đăng nhập `isLoggedIn` hoặc sự tồn tại của token trong `localStorage`.
  - Endpoint `/api/v1/vouchers/available` thuộc `promotion-service` yêu cầu xác thực JWT để tính toán các voucher hợp lệ theo lịch sử mua hàng cá nhân.
  - Khi request trả về 401, interceptor mạng tự động kích hoạt cơ chế retry bằng cách gửi request refresh token `POST /api/v1/auth/refresh`. Do khách vãng lai không có cookie refresh token, request này tiếp tục trả về 401, tạo thành chuỗi lỗi kép.
- **4. Cách khắc phục đề xuất:**
  - Đối với khách vãng lai chưa đăng nhập: Chỉ gọi endpoint công khai không yêu cầu token: `voucherApi.getPlatformVouchers()` (`GET /api/v1/vouchers?scope=PLATFORM&status=ACTIVE&activeOnly=true`).
  - Đặt điều kiện chặn trước khi gọi API cá nhân hóa:
    ```typescript
    if (isAuthenticated) {
      voucherApi.getAvailableVouchers().then(...);
    } else {
      voucherApi.getPlatformVouchers().then(...);
    }
    ```
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-003] Toàn bộ thẻ sách (`BookCard`) trên Danh Mục (`/books`) và Trang Chủ (`/`) là thẻ `<div>` thay vì thẻ liên kết `<a>` (Vi phạm nghiêm trọng SEO & a11y)
- **1. Vị trí chính xác:**
  - Màn hình: Danh Mục Sách (`/books`), Trang Chủ (`/`), Kết quả tìm kiếm
  - File mã nguồn: [web/src/ui/components/common/BookCard.tsx](file:///e:/HuKi/web/src/ui/components/common/BookCard.tsx#L219-L235)
  - Viewport ảnh hưởng: Toàn bộ nền tảng.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Phần tử gốc của component `BookCard` được dựng bằng thẻ `<div className="book-card ...">` kèm sự kiện `onClick={() => router.push(`/book/${book.id}`)}`.
  - Hậu quả nghiêm trọng:
    1. Người dùng không thể nhấn chuột phải chọn *"Mở liên kết trong thẻ mới"* (Open link in new tab) hoặc ấn phím Ctrl + Click (Cmd + Click trên macOS) để so sánh nhiều cuốn sách.
    2. Robot tìm kiếm Google / Bing không thể thu thập dữ liệu (crawl) theo cây liên kết nội bộ, làm suy giảm nghiêm trọng chỉ số SEO của sàn thương mại điện tử.
    3. Trình đọc màn hình hỗ trợ người khiếm thị không nhận diện đây là một liên kết điều hướng.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Vi phạm nguyên tắc "Semantic HTML & Accessibility" của UI/UX Pro Max. Lập trình viên sử dụng sự kiện `router.push` trên thẻ `div` để xử lý điều hướng thay vì sử dụng component Next.js `<Link href="...">` tiêu chuẩn.
- **4. Cách khắc phục đề xuất:**
  - Chuyển đổi thẻ bọc ngoài cùng của `BookCard` thành `<Link href={`/book/${book.slug || book.id}`}>`.
  - Đối với các nút con bên trong thẻ sách (nút Thêm Giỏ Hàng, nút Yêu Thích), sử dụng `e.preventDefault(); e.stopPropagation();` để ngăn chặn sự kiện click lan truyền lên thẻ cha.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-004] Trang Chi Tiết Sách (`/book/[id]`) hardcode "Đang cập nhật" cho các thông số kỹ thuật ấn phẩm
- **1. Vị trí chính xác:**
  - Màn hình: Chi Tiết Sách (`http://localhost:3100/book/[id]`)
  - File mã nguồn: [web/src/app/book/[id]/page.tsx](file:///e:/HuKi/web/src/app/book/[id]/page.tsx#L540-L565)
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi xem chi tiết bất kỳ cuốn sách nào (kể cả các đầu sách nổi tiếng như *Đắc Nhân Tâm*, *Atomic Habits* đã có đầy đủ dữ liệu trong cơ sở dữ liệu `huki_commerce`), phần thông số kỹ thuật bên phải bìa sách luôn hiển thị:
    - *Định dạng:* `Đang cập nhật`
    - *Ngôn ngữ:* `Đang cập nhật`
    - *Số trang:* `Đang cập nhật`
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Trong file `page.tsx`, component đang đọc các thuộc tính `book.format`, `book.language`, `book.pageCount`.
  - Tuy nhiên, trong cơ sở dữ liệu PostgreSQL `huki_commerce`, các trường này được đặt tên theo quy ước snake_case là `book.book_format`, `book.languages` (hoặc `language_code`), `book.pages`. Khi backend trả về JSON qua API Gateway, mã nguồn frontend chưa qua bước mapper chuẩn hóa sang camelCase, dẫn đến giá trị bị `undefined` và rơi vào chuỗi fallback mặc định `"Đang cập nhật"`.
- **4. Cách khắc phục đề xuất:**
  - Cập nhật hàm mapper dữ liệu sách tại `web/src/ui/api/catalogApi.ts` hoặc trong `page.tsx`:
    ```typescript
    format: book.book_format || book.format || (book.is_ebook ? 'Ebook DRM' : 'Bìa mềm'),
    language: book.language || book.language_code || 'Tiếng Việt',
    pageCount: book.pages || book.page_count || book.total_pages || 'N/A'
    ```
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-005] Trang Chi Tiết Sách (`/book/[id]`): Nút "Viết đánh giá" bẫy người dùng chưa đăng nhập
- **1. Vị trí chính xác:**
  - Màn hình: Chi Tiết Sách (`/book/[id]`)
  - File mã nguồn: [web/src/app/book/[id]/page.tsx](file:///e:/HuKi/web/src/app/book/[id]/page.tsx#L710-L730)
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khách vãng lai chưa đăng nhập bấm nút *"Viết đánh giá"* ở phần Đánh giá từ độc giả: Modal viết nhận xét vẫn mở ra bình thường.
  - Người dùng mất công soạn thảo nội dung, chọn số sao và bấm nút *"Gửi đánh giá"*: Giao diện không phản hồi gì hoặc báo lỗi mập mờ, đồng thời Console bắn lỗi `401 Unauthorized` từ API `POST /api/v1/reviews`. Toàn bộ nội dung người dùng vừa gõ bị biến mất khi modal đóng lại.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Sự kiện mở modal `setIsReviewModalOpen(true)` không kiểm tra điều kiện đăng nhập `if (!isAuthenticated)`.
  - Thiếu luồng chuyển hướng thông minh lưu lại trạng thái (Return URL flow) để sau khi đăng nhập thành công có thể quay lại đúng cuốn sách đang xem.
- **4. Cách khắc phục đề xuất:**
  - Kiểm tra trạng thái đăng nhập ngay khi bấm nút:
    ```typescript
    const handleOpenReview = () => {
      if (!isAuthenticated) {
        showToast({ message: 'Vui lòng đăng nhập để viết đánh giá sách!', type: 'warning' });
        router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      setIsReviewModalOpen(true);
    };
    ```
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-006] Nút "Tiếp tục mua sắm" trên Giỏ Hàng (`/cart`) gắn liên kết neo chết `href="#"`
- **1. Vị trí chính xác:**
  - Màn hình: Giỏ Hàng Trống & Giỏ Hàng Có Sản Phẩm (`/cart`)
  - File mã nguồn: [web/src/app/cart/page.tsx](file:///e:/HuKi/web/src/app/cart/page.tsx#L245-L255)
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Ở chân trang giỏ hàng và ở màn hình giỏ hàng trống, nút *"← Tiếp tục mua sắm"* sử dụng thuộc tính `href="#"`.
  - Khi người dùng click vào, trình duyệt cuộn giật lên đầu trang hiện tại thay vì điều hướng người dùng quay lại danh mục sách hoặc trang chủ để tiếp tục chọn thêm ấn phẩm.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Đường dẫn placeholder chưa được thay thế bằng route thực tế trong quá trình hoàn thiện giao diện.
- **4. Cách khắc phục đề xuất:**
  - Đổi liên kết thành `<Link href="/books" className="...">← Tiếp tục mua sắm</Link>`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-007] Giao Diện Thanh Toán (`/checkout`) bị Crash trắng trang khi địa chỉ nhận hàng có trường quận/huyện null
- **1. Vị trí chính xác:**
  - Màn hình: Đặt Hàng & Thanh Toán (`/checkout`)
  - File mã nguồn: [web/src/app/checkout/page.tsx](file:///e:/HuKi/web/src/app/checkout/page.tsx#L180-L210)
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi độc giả có một địa chỉ giao hàng cũ được lưu từ các bản seed dữ liệu trước đó (chỉ có trường `full_address` dạng string, không có trường `district` hoặc `ward`), trang checkout lập tức bị crash trắng màn hình với lỗi React Uncaught Exception:
    ```
    TypeError: Cannot read properties of undefined (reading 'toLowerCase')
    at formatShippingAddress (checkout/page.tsx:195)
    ```
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Hàm ghép chuỗi địa chỉ gọi trực tiếp `.toLowerCase()` hoặc truy cập trực tiếp `address.ward.name` mà không có toán tử optional chaining `?.` và fallback an toàn khi dữ liệu địa chỉ không đồng nhất.
- **4. Cách khắc phục đề xuất:**
  - Bổ sung kiểm tra an toàn (defensive coding):
    ```typescript
    const districtName = address?.district?.name || address?.district || '';
    const wardName = address?.ward?.name || address?.ward || '';
    const fullText = [address?.street, wardName, districtName, address?.city].filter(Boolean).join(', ') || address?.full_address || 'Địa chỉ chưa cập nhật';
    ```
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-008] Lịch Sử Đơn Hàng (`/orders`) ngầm định bộ lọc ngày trong tháng hiện tại làm biến mất đơn hàng cũ
- **1. Vị trí chính xác:**
  - Màn hình: Lịch Sử Đơn Hàng Của Tôi (`/orders`)
  - File mã nguồn: [web/src/app/orders/page.tsx](file:///e:/HuKi/web/src/app/orders/page.tsx#L112-L140)
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Bạn đọc vừa mua hàng từ tháng trước, khi vào trang `/orders` thấy danh sách hoàn toàn trống trơn ("Bạn chưa có đơn hàng nào").
  - Độc giả hoang mang nghĩ rằng đơn hàng bị hủy hoặc tài khoản bị mất dữ liệu. Trong khi thực tế đơn hàng vẫn tồn tại nguyên vẹn trong DB nhưng bị ẩn do bộ lọc ngày mặc định bị set từ ngày 1 của tháng hiện tại.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - State khởi tạo của bộ lọc ngày `dateRange` được gán cứng `startDate: startOfMonth(new Date())`.
  - Giao diện không có nhãn hiển thị rõ ràng cho người dùng biết là đang áp dụng bộ lọc ngày trong tháng, và không có nút 1-click *"Xem tất cả lịch sử đơn"*.
- **4. Cách khắc phục đề xuất:**
  - Mặc định khởi tạo `dateRange: 'ALL'` (không giới hạn ngày bắt đầu) để bạn đọc luôn thấy toàn bộ đơn hàng của mình.
  - Cung cấp các nút bấm nhanh: `Tất cả`, `30 ngày qua`, `6 tháng qua`, `Năm 2026`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-009] Trình Đọc Sách Ebook DRM (`/read/[id]`): Tùy chỉnh cỡ chữ bị reset về mặc định khi tải lại trang
- **1. Vị trí chính xác:**
  - Màn hình: Trình Đọc Sách Số Ebook DRM (`http://localhost:3100/reader`)
  - File mã nguồn: `web/src/app/reader/page.tsx` (dòng 85-110)
  - Viewport ảnh hưởng: Tất cả viewports (đặc biệt là Mobile & Tablet).
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Độc giả tùy chỉnh cỡ chữ lớn (18px hoặc 20px) và đổi phông nền sang màu giấy ngà (Sepia/Cream) để đọc sách đỡ mỏi mắt.
  - Khi refresh trang hoặc mở lại chương sách vào hôm sau, toàn bộ cài đặt bị reset về font mặc định (14px) và nền trắng tinh, buộc người dùng phải chỉnh lại từ đầu mỗi lần đọc.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Biến state `readerSettings` (gồm `fontSize`, `theme`, `lineHeight`, `fontFamily`) chỉ được lưu trong bộ nhớ React State cục bộ (`useState`), không được đồng bộ ghi vào `window.localStorage` khi thay đổi và không được đọc lại khi mount component.
- **4. Cách khắc phục đề xuất:**
  - Bổ sung cơ chế lưu trữ tự động vào `localStorage.setItem('huki_reader_settings', JSON.stringify(settings))` và khôi phục khi khởi động trình đọc.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-010] Trình Nghe Sách Nói AI không tự dừng phát khi người dùng điều hướng sang trang khác
- **1. Vị trí chính xác:**
  - Màn hình: Kho Sách Nói & Nghe Thử Audio (`/audiobooks`)
  - File mã nguồn: [web/src/ui/components/audio/AudioPlayer.tsx](file:///e:/HuKi/web/src/ui/components/audio/AudioPlayer.tsx)
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Độc giả bấm nghe thử một đoạn Audio AI sách nói tại trang chi tiết, sau đó click vào logo hoặc menu để điều hướng sang trang khác (ví dụ: chuyển sang `/cart` hoặc `/orders`).
  - Âm thanh sách nói vẫn tiếp tục phát nền ầm ĩ mà không có thanh điều khiển mini nào ở góc dưới màn hình để tắt hoặc tạm dừng, gây ức chế lớn cho người dùng.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Phần tử HTML5 `<audio>` được nhúng cục bộ trong component trang con, nhưng khi component bị unmount, hàm dọn dẹp `cleanup` của `useEffect` thiếu lệnh `audioRef.current.pause(); audioRef.current.src = '';`.
- **4. Cách khắc phục đề xuất:**
  - Bổ sung lệnh dừng phát trong cleanup effect:
    ```typescript
    useEffect(() => {
      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeAttribute('src');
          audioRef.current.load();
        }
      };
    }, []);
    ```
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-011] Ô Tìm Kiếm Toàn Cục có thời gian Debounce quá ngắn (50ms) gây bão request spam API backend
- **1. Vị trí chính xác:**
  - Màn hình: Thanh Header Toàn Sàn (`StoreHeader.tsx`)
  - File mã nguồn: `web/src/ui/components/common/Header.tsx`
  - Viewport ảnh hưởng: Desktop & Tablet.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi người dùng gõ cụm từ tìm kiếm (ví dụ: *"Nhà giả kim"* gồm 11 ký tự), tab Network ghi nhận liên tiếp 11 request gửi về endpoint `/api/v1/search/suggestions?q=...`.
  - Tốc độ gõ phím bình thường của con người là 150ms - 250ms giữa các ký tự. Do thời gian debounce đặt quá ngắn (50ms), mỗi lần nhấn phím đều kích hoạt một request mới trước khi request cũ kịp hoàn tất.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Cấu hình debounce trong hook `useDebounce(searchTerm, 50)` không phù hợp với chuẩn tìm kiếm mạng.
- **4. Cách khắc phục đề xuất:**
  - Nâng thời gian debounce lên mức chuẩn công nghiệp: `300ms` hoặc `350ms`.
  - Sử dụng `AbortController` để tự động hủy các request đang pending khi người dùng tiếp tục gõ ký tự mới.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-012] [Responsive Tablet 768px] Top Utility Bar tràn lề ngang +283px trên hơn 20 trang giao diện
- **1. Vị trí chính xác:**
  - Màn hình: Toàn bộ hơn 20 trang sử dụng `StoreHeader.tsx` (Trang chủ, `/books`, `/stores`, `/flash-sale`, `/cart`, các trang chính sách...).
  - File mã nguồn: [web/src/ui/components/common/StoreHeader.tsx](file:///e:/HuKi/web/src/ui/components/common/StoreHeader.tsx#L361)
  - Selector phần tử lỗi: `div.flex.items-center.gap-6.text-xs.text-slate-600.whitespace-nowrap`
  - Viewport ảnh hưởng: **Tablet (768 x 1024 px)** (kích thước iPad chuẩn).
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Trên màn hình Tablet 768px, thanh Top Utility Bar (chứa các liên kết: Kênh Người Bán, Tải Ứng Dụng, Kết Nối, Trợ Giúp, Thông Báo, Tài Khoản) được kích hoạt hiển thị thông qua lớp CSS `hidden md:flex`.
  - Tuy nhiên, 2 container con bên trong sử dụng lớp `whitespace-nowrap` với danh sách menu dài và khoảng cách `gap-6`, khiến tổng chiều rộng thực tế của thanh đạt tới **1051px**.
  - Kết quả: Chiều rộng cuộn của toàn bộ trang bị kéo dãn lên `1051px`, **tràn ra ngoài mép màn hình iPad tới +283px** (`scrollWidth: 1051px > innerWidth: 768px`). Thanh cuộn ngang xuất hiện làm rung lắc và vỡ layout toàn bộ trang.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Breakpoint kích hoạt thanh Utility Bar bị đặt sai thành `md:` (768px) trong khi tổng chiều rộng tối thiểu cần thiết để hiển thị đầy đủ các mục menu này mà không bị ép dòng là $\ge 1024px$ (`lg:`).
- **4. Cách khắc phục đề xuất:**
  - Nâng breakpoint hiển thị thanh Top Utility Bar từ `md:flex` lên `lg:flex`.
  - Tại kích thước màn hình tablet 768px - 1023px, ẩn bớt các mục phụ (Tải ứng dụng, Kết nối) hoặc chỉ kích hoạt thanh này khi màn hình đạt kích thước Desktop tiêu chuẩn $\ge 1024px$.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-013] [Responsive Mobile 390px] Bố Cục Trang Tài Khoản (`AccountLayout.tsx`) bị thanh Tabs Filter đẩy tràn ngang +223px
- **1. Vị trí chính xác:**
  - Màn hình: `/orders`, `/profile/addresses`, `/profile/wallet`, `/profile/security`
  - File mã nguồn: [web/src/ui/components/account/AccountLayout.tsx](file:///e:/HuKi/web/src/ui/components/account/AccountLayout.tsx#L187), [web/src/ui/components/common/DataTableFilterBar.tsx](file:///e:/HuKi/web/src/ui/components/common/DataTableFilterBar.tsx)
  - Selector phần tử lỗi: `main.flex-1.min-w-0` và `div.flex.items-center.gap-2.whitespace-nowrap` (8 tabs trạng thái đơn hàng).
  - Viewport ảnh hưởng: **Mobile (390 x 844 px)** (iPhone 12/13/14).
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Trên điện thoại di động (390px), khi độc giả vào xem đơn hàng hoặc sổ địa chỉ, toàn bộ khung nội dung chính `<main>` bị phình to ra chiều ngang **599px - 613px**, gây **tràn mép màn hình di động +223px**.
  - Người dùng phải vuốt tay sang ngang mới bấm được các nút xem chi tiết đơn hàng, gây vỡ hoàn toàn trải nghiệm ứng dụng di động.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Thanh lọc trạng thái `DataTableFilterBar` chứa 8 tabs (Tất cả, Chờ thanh toán, Đang xử lý, Đang giao, Đã giao, Đã hủy, Trả hàng...) sử dụng `whitespace-nowrap` trải dài 934px.
  - Container bao bọc `AccountLayout.tsx` sử dụng flex layout với `items-start` mà thiếu thuộc tính ép giới hạn `w-full min-w-0 overflow-hidden`, khiến thẻ con tự do kéo dãn thẻ cha vượt qua kích thước 390px của viewport điện thoại.
- **4. Cách khắc phục đề xuất:**
  - Thêm `w-full max-w-full overflow-x-auto no-scrollbar` cho thanh tabs `DataTableFilterBar` để cho phép vuốt ngang cảm ứng mượt mà bên trong mà không làm phình container cha.
  - Bổ sung `w-full min-w-0 overflow-hidden` cho khung `<main>` trong `AccountLayout.tsx`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-014] [Responsive Mobile 390px] Trang Gian Hàng & Tác Giả (`/stores`) bị khối cầu trang trí tràn mép phải +147px
- **1. Vị trí chính xác:**
  - Màn hình: Danh Sách Gian Hàng & Tác Giả (`http://localhost:3100/stores`)
  - File mã nguồn: [web/src/app/stores/page.tsx](file:///e:/HuKi/web/src/app/stores/page.tsx#L340)
  - Selector phần tử lỗi: `div.absolute.-right-20.-top-20.w-96.h-96.bg-yellow-400/20.rounded-full.blur-3xl`
  - Viewport ảnh hưởng: **Mobile (390 x 844 px)**.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Mở trang `/stores` trên điện thoại di động: Chiều rộng cuộn thực tế của trang là **537px**, vượt quá chiều rộng màn hình 390px một khoảng **+147px**.
  - Màn hình xuất hiện một dải khoảng trắng lớn bên phải, toàn bộ header và footer bị lệch sang trái khi người dùng vô tình chạm tay trượt ngang.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Khối tròn trang trí phát sáng kích thước 384px (`w-96 h-96`) được định vị tuyệt đối lùi ra ngoài mép phải (`-right-20` tức là -80px).
  - Phần tử cha bao bọc phần Header Hero của trang thiếu thuộc tính CSS `overflow-hidden`, cho phép khối tròn này tràn tự do ra ngoài viewport trình duyệt.
- **4. Cách khắc phục đề xuất:**
  - Thêm lớp `overflow-hidden` vào container cha bọc phần Hero của trang `web/src/app/stores/page.tsx`.
  - Đồng thời loại bỏ hoàn toàn khối cầu phát sáng `blur-3xl` này theo đúng tiêu chuẩn Anti-AI của sàn.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-015] [Responsive Mobile 390px] Trình Đọc Thử Sách (`/book/[id]/preview`) bị thanh công cụ Toolbar tràn mép +190px
- **1. Vị trí chính xác:**
  - Màn hình: Đọc Thử Ấn Phẩm Số (`/book/[id]/preview`)
  - File mã nguồn: [web/src/app/book/[id]/preview/page.tsx](file:///e:/HuKi/web/src/app/book/[id]/preview/page.tsx#L120)
  - Selector phần tử lỗi: `div.flex.items-center.gap-2` (thanh điều khiển zoom, lật trang, toàn màn hình).
  - Viewport ảnh hưởng: **Mobile (390 x 844 px)**.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Mở trang đọc thử sách trên điện thoại: Thanh công cụ Toolbar phía trên cùng chiếm chiều rộng **580px**, làm trang bị **tràn ngang +190px** so với kích thước màn hình 390px.
  - Các nút phóng to, thu nhỏ và chuyển trang bị đẩy khuất ra ngoài mép phải màn hình điện thoại, người dùng không thể nhìn thấy hoặc bấm vào được.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Thanh Toolbar chứa 7 nút bấm độc lập được đặt trong container `flex items-center gap-2` cố định không cho phép xuống dòng (`flex-nowrap`), với tổng độ rộng các nút vượt quá 390px.
- **4. Cách khắc phục đề xuất:**
  - Trên mobile, nhóm các công cụ phụ (zoom, toàn màn hình) vào một nút menu ba chấm `more_vert`.
  - Thanh toolbar chính chỉ giữ lại 2 nút cốt lõi: Nút Trang Trước (`navigate_before`), Số trang hiện tại (`font-mono text-xs`), và Nút Trang Kế (`navigate_next`).
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-016] [Anti-AI Design Flaw] Trang Flash Sale (`/flash-sale`) lạm dụng khối cầu phát sáng `blur-3xl` và 6 hoạt ảnh nhấp nháy `animate-pulse` gây nhức mắt
- **1. Vị trí chính xác:**
  - Màn hình: Flash Sale Giờ Vàng (`http://localhost:3100/flash-sale`)
  - File mã nguồn: [web/src/app/flash-sale/page.tsx](file:///e:/HuKi/web/src/app/flash-sale/page.tsx#L369-L370), dòng 528, 592, 678, 834, 1068.
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Trang sử dụng hàng loạt các khối cầu màu vàng/đỏ làm mờ kích thước 384px (`w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl`) trôi nổi ở background.
  - Đồng thời kích hoạt đồng thời 6 hiệu ứng nhấp nháy liên tục `animate-pulse` trên đồng hồ đếm ngược, nhãn giảm giá và biểu tượng ngọn lửa.
  - Giao diện tạo cảm giác một bản demo do AI tự sinh lòe loẹt, thiếu tính chuyên nghiệp và đánh mất phong vị tao nhã của một nền tảng xuất bản tri thức.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Lạm dụng các hiệu ứng gradient và animation quá đà theo phong cách template AI thay vì tuân thủ hệ thống thiết kế tinh tế của HUKI Editorial Design System.
- **4. Cách khắc phục đề xuất:**
  - Xóa bỏ toàn bộ các khối cầu phát sáng `blur-3xl`.
  - Thay nền background bằng tông Slate sạch sẽ `#F8FAFC` kết hợp giấy in ngà `#FBF9F5`.
  - Loại bỏ các lớp `animate-pulse` liên tục; chỉ sử dụng viền đỏ mỏng thanh lịch `#E11D48` và đồng hồ đếm ngược dùng font Monospace sắc nét (`font-mono font-bold text-rose-600`).
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-017] [Anti-AI Design Flaw] Bộ Lọc Đánh Giá Sao trên Danh Mục Sách (`/books`) dùng chuỗi unicode text thô `★★★★★`
- **1. Vị trí chính xác:**
  - Màn hình: Danh Mục Sách & Tìm Kiếm Nâng Cao (`http://localhost:3100/books`)
  - File mã nguồn: [web/src/app/books/page.tsx](file:///e:/HuKi/web/src/app/books/page.tsx#L615-L617)
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Bộ lọc đánh giá sao bên cột trái sử dụng chuỗi ký tự unicode thuần: `stars: '★★★★★'`, `stars: '★★★★☆'`.
  - Trên các hệ điều hành và font khác nhau, các ngôi sao text này bị hiển thị thô ráp, kích thước không đều, sai lệch màu sắc với icon chuẩn của sàn, thậm chí bị lỗi font tofu (`?` hoặc `□`) trên các thiết bị không hỗ trợ đầy đủ bộ font unicode.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Vi phạm quy tắc "No raw text symbols as icons" của UI/UX Pro Max.
- **4. Cách khắc phục đề xuất:**
  - Thay chuỗi ký tự text thô bằng component vòng lặp render 5 icon vector Google Material Symbols chuẩn:
    ```tsx
    {[1, 2, 3, 4, 5].map((star) => (
      <span key={star} className="material-symbols-outlined text-amber-400 text-sm fill-current">
        {star <= rating ? 'star' : 'star_outline'}
      </span>
    ))}
    ```
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-018] [Anti-AI Mock Data] Trang Gian Hàng & Tác Giả (`/stores`) nhúng cứng 1100 dòng code dữ liệu giả lập (Mock Authors & Ảnh Unsplash)
- **1. Vị trí chính xác:**
  - Màn hình: Danh Sách Gian Hàng & Tác Giả (`http://localhost:3100/stores`)
  - File mã nguồn: [web/src/app/stores/page.tsx](file:///e:/HuKi/web/src/app/stores/page.tsx#L48-L180) (mảng `INITIAL_AUTHORS` kèm cờ `isMock: true`).
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Trang hiển thị danh sách các tác giả nước ngoài nổi tiếng (James Clear, Yuval Noah Harari...) với ảnh stock ngẫu nhiên từ Unsplash và liên kết tĩnh, không hề liên kết với cơ sở dữ liệu tác giả và đối tác xuất bản thực tế trong DB `huki_business` và `huki_commerce`.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Trang giao diện được dựng bằng dữ liệu mock tĩnh của AI và chưa được hoàn tất tích hợp với API backend thực tế (`catalogApi.getAuthors` và `businessApi.getStores`).
- **4. Cách khắc phục đề xuất:**
  - Kết nối dữ liệu tác giả và nhà xuất bản thật từ backend thông qua API `GET /api/v1/authors` và `GET /api/v1/stores`.
  - Nếu cơ sở dữ liệu chưa có tác giả nào, hiển thị Empty State tao nhã với lời dẫn: *"Danh mục tác giả đang được ban biên tập HUKI cập nhật ấn phẩm mới."*
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-019] [UI/UX Tương Tác] Nút Chia Sẻ Sách trên Trang Chi Tiết Sách (`/book/[id]`) sao chép ngầm không có Toast thông báo
- **1. Vị trí chính xác:**
  - Màn hình: Chi Tiết Sách (`http://localhost:3100/book/[id]`)
  - File mã nguồn: [web/src/app/book/[id]/page.tsx](file:///e:/HuKi/web/src/app/book/[id]/page.tsx#L420-L435)
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi độc giả bấm vào biểu tượng "Chia sẻ" (nút Share phía trên bìa sách), đường dẫn liên kết sách đã được sao chép vào bộ nhớ tạm (clipboard).
  - Tuy nhiên, trên màn hình hoàn toàn không xuất hiện bất kỳ phản hồi thị giác nào (không có Toast thông báo, không đổi màu icon). Người dùng tưởng rằng nút bấm bị liệt nên liên tục bấm lại nhiều lần.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Hàm xử lý click `handleShare()` chỉ gọi `navigator.clipboard.writeText(window.location.href)` mà thiếu lệnh kích hoạt thông báo phản hồi `showToast({ message: 'Đã sao chép liên kết giới thiệu sách!', type: 'success' })`.
- **4. Cách khắc phục đề xuất:**
  - Bổ sung Toast thông báo thành công và hiệu ứng đổi icon thành biểu tượng dấu tích xanh `check` trong 2 giây để người dùng nhận biết rõ ràng.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-020] [Network & Auth] Lỗi bất đồng bộ khóa Token (`token` vs `huki_access_token`) gây lỗi 401 trên các trang Quản lý Tài khoản
- **1. Vị trí chính xác:**
  - Màn hình: `/profile/security`, `/profile/reviews`, `/messages`
  - File mã nguồn: `web/src/ui/api/httpClient.ts`, `web/src/ui/hooks/useAuth.ts`
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Độc giả đã đăng nhập thành công vào hệ thống, nhưng khi truy cập vào các trang Quản lý bảo mật (`/profile/security`), Lịch sử đánh giá (`/profile/reviews`) hoặc Hộp thư Chat (`/messages`), tab Network liên tiếp bắn ra hàng loạt lỗi `401 (Unauthorized)`:
    ```http
    GET /api/v1/users/profile 401 (Unauthorized)
    GET /api/v1/sessions 401 (Unauthorized)
    GET /api/v1/chat/conversations 401 (Unauthorized)
    ```
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Một số component và hook trong frontend lưu và đọc token với khóa `localStorage.getItem('token')`, trong khi các API client mới lại đọc khóa `localStorage.getItem('huki_access_token')`.
  - Sự không đồng nhất về tên khóa lưu trữ token này dẫn đến việc một số trang gửi header `Authorization: Bearer undefined`, khiến backend từ chối truy cập.
- **4. Cách khắc phục đề xuất:**
  - Chuẩn hóa toàn bộ mã nguồn frontend về một hằng số duy nhất `AUTH_TOKEN_KEY = 'huki_access_token'`.
  - Tại `httpClient.ts`, bổ sung fallback an toàn:
    ```typescript
    const token = localStorage.getItem('huki_access_token') || localStorage.getItem('token');
    ```
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-021] [Network & API] Lỗi spam API Bookmark 404 (`GET /api/reader/bookmarks/con-duong-phia-truoc`) trên toàn bộ trang Tài khoản
- **1. Vị trí chính xác:**
  - Màn hình: Toàn bộ các trang thuộc nhánh `/profile/*`, `/orders/*`, `/library/*`
  - File mã nguồn: `web/src/ui/components/reader/ReaderSyncProvider.tsx`
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi độc giả di chuyển giữa các trang tài khoản cá nhân, tab Network liên tục ghi nhận request lỗi đỏ:
    ```http
    GET http://localhost:3100/api/reader/bookmarks/con-duong-phia-truoc 404 (Not Found)
    ```
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Provider đồng bộ tiến độ đọc sách `ReaderSyncProvider` được bọc ở cấp layout chung nhưng lại nhúng cứng slug sách mẫu `"con-duong-phia-truoc"` và tự động polling dữ liệu dấu trang ngay cả khi người dùng không ở trong giao diện đọc sách Ebook DRM.
- **4. Cách khắc phục đề xuất:**
  - Chỉ kích hoạt hook đồng bộ dấu trang khi người dùng thực sự đang ở trong route đọc sách `/reader` hoặc `/read/[id]`.
  - Tuyệt đối không nhúng cứng slug mẫu `"con-duong-phia-truoc"`; chỉ gọi API khi có `bookId` hoặc `slug` thực tế từ URL.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-022] [Chức Năng - P0] Backend ép kiểu UUID khiến mọi request lấy chi tiết sách theo URL Slug bị lỗi HTTP 400 Bad Request
- **1. Vị trí chính xác:**
  - Màn hình: Trang Chi Tiết Sách (`/book/[slug]`)
  - File mã nguồn Frontend: [web/src/app/book/[id]/page.tsx](file:///e:/HuKi/web/src/app/book/[id]/page.tsx) & [web/src/ui/api/catalogApi.ts](file:///e:/HuKi/web/src/ui/api/catalogApi.ts)
  - File mã nguồn Backend: `platform/apps/commerce-service/src/modules/books/books.controller.ts` (Endpoint: `GET /api/v1/books/:id`)
  - Viewport ảnh hưởng: Toàn bộ nền tảng.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi độc giả truy cập sách thông qua đường dẫn thân thiện SEO (Slug) như `http://localhost:3100/book/con-duong-phia-truoc`, client gửi request `GET /api/v1/books/con-duong-phia-truoc`.
  - Backend lập tức quăng lỗi ngoại lệ HTTP 400 Bad Request:
    ```json
    {
      "status": "error",
      "statusCode": 400,
      "code": "VALIDATION_ERROR",
      "message": "Validation failed (uuid is expected)",
      "path": "/api/v1/books/con-duong-phia-truoc"
    }
    ```
  - Hậu quả: Toàn bộ các liên kết tiếp thị, liên kết chia sẻ hoặc banner điều hướng dùng slug sách đều bị báo lỗi không tải được dữ liệu sách hoặc rơi vào màn hình Not Found.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Trong `books.controller.ts`, tham số `:id` được gắn pipe validation bắt buộc định dạng UUID: `@Param('id', ParseUUIDPipe) id: string`.
  - Khi người dùng truyền chuỗi slug chữ cái tiếng Việt không dấu (`con-duong-phia-truoc`), NestJS ParseUUIDPipe ném lỗi 400 trước khi request kịp đi vào tầng `booksService.findOne()`.
- **4. Cách khắc phục đề xuất:**
  - Thay đổi controller để hỗ trợ cả UUID và Slug: Nếu chuỗi truyền vào khớp regex UUID thì query theo `id`, ngược lại query theo cột `slug` trong PostgreSQL (`WHERE slug = :id OR id = :id`).
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-023] [Chức Năng - P1] Bộ lọc sách theo Thể loại bị lỗi HTTP 400 Bad Request do sai tên tham số DTO
- **1. Vị trí chính xác:**
  - Màn hình: Danh Mục & Tìm Kiếm Sách (`/books`)
  - File mã nguồn Frontend: [web/src/ui/api/catalogApi.ts](file:///e:/HuKi/web/src/ui/api/catalogApi.ts)
  - File mã nguồn Backend: `platform/apps/commerce-service/src/modules/books/dto/book-list-query.dto.ts`
  - Viewport ảnh hưởng: Toàn bộ viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi người dùng click chọn một thể loại trong thanh lọc sidebar tại trang `/books`, client gửi request: `GET /api/v1/books?categoryId=cat-self-help`.
  - Backend trả về mã lỗi HTTP 400 Bad Request:
    ```json
    {
      "status": "error",
      "statusCode": 400,
      "code": "VALIDATION_ERROR",
      "message": "Validation failed",
      "details": [{ "field": "property", "code": "VALIDATION_ERROR", "message": "property categoryId should not exist" }]
    }
    ```
  - Hậu quả: Bộ lọc thể loại sách trên trang danh mục bị tê liệt, danh sách sách không tải được và hiển thị lỗi.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Trong DTO `BookListQueryDto`, tham số lọc thể loại được khai báo là `category` (nhận slug hoặc tên), chứ không có trường `categoryId`. Client frontend gửi nhầm key `categoryId`.
- **4. Cách khắc phục đề xuất:**
  - Chuẩn hóa tên tham số ở client: đổi từ `categoryId` sang `category`, hoặc bổ sung `@IsOptional() categoryId?: string` vào `BookListQueryDto` ở backend để tương thích ngược.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-024] [Chức Năng - P0] Trình đọc Ebook không thể lưu tiến độ đọc sách do thừa trường dữ liệu ném lỗi HTTP 400
- **1. Vị trí chính xác:**
  - Màn hình: Bộ Đọc Ebook Bản Quyền (`/reader`)
  - File mã nguồn Frontend: [web/src/ui/api/readerApi.ts](file:///e:/HuKi/web/src/ui/api/readerApi.ts#L65-L75)
  - File mã nguồn Backend: `platform/apps/commerce-service/src/modules/books/dto/reader.dto.ts`
  - Viewport ảnh hưởng: Toàn bộ nền tảng.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi độc giả lật trang sách trong trình đọc Ebook DRM, hàm `readerApi.saveProgress` tự động gửi request cập nhật vị trí trang:
    ```json
    PUT /api/v1/reader/progress
    {
      "bookId": "b0000004-0000-4000-8000-000000000004",
      "currentPage": 25,
      "totalPages": 100,
      "percentage": 25.0
    }
    ```
  - Backend trả về lỗi HTTP 400 Bad Request:
    ```json
    {
      "status": "error",
      "statusCode": 400,
      "code": "VALIDATION_ERROR",
      "message": "Validation failed",
      "details": [{ "field": "property", "code": "VALIDATION_ERROR", "message": "property totalPages should not exist" }]
    }
    ```
  - Hậu quả: Tiến độ đọc sách của người dùng hoàn toàn không được lưu vào cơ sở dữ liệu. Khi tắt trình duyệt hoặc mở lại trên thiết bị khác, sách luôn bị nhảy về trang 1.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - DTO `SaveProgressDto` của NestJS bật cờ `whitelist: true, forbidNonWhitelisted: true`, nhưng chỉ định nghĩa 3 trường: `bookId`, `currentPage`, `percentage`. Việc frontend gửi thêm `totalPages` khiến request bị từ chối ngay lập tức.
- **4. Cách khắc phục đề xuất:**
  - Loại bỏ trường `totalPages` khỏi payload của `readerApi.saveProgress` trong `web/src/ui/api/readerApi.ts`, hoặc bổ sung `@IsOptional() @IsNumber() totalPages?: number;` vào `SaveProgressDto`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-025] [Chức Năng - P0] Phương thức thanh toán "Ví HUKI" (WALLET) bị backend từ chối với mã lỗi HTTP 400 Validation Error
- **1. Vị trí chính xác:**
  - Màn hình: Quy Trình Thanh Toán Đặt Hàng (`/checkout`)
  - File mã nguồn Frontend: [web/src/ui/api/checkoutApi.ts](file:///e:/HuKi/web/src/ui/api/checkoutApi.ts#L85)
  - File mã nguồn Backend: `platform/apps/commerce-service/src/modules/orders/dto/checkout.dto.ts` (Endpoint: `POST /cart/checkout/confirm`)
  - Viewport ảnh hưởng: Toàn bộ nền tảng.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Trong giao diện `/checkout` và tài liệu đặc tả, khách hàng có tùy chọn chọn *"Thanh toán bằng số dư Ví HUKI"*.
  - Khi client gửi xác nhận đặt hàng với `paymentMethod: 'WALLET'`:
    ```json
    POST /api/v1/cart/checkout/confirm
    {
      "sessionId": "...",
      "paymentMethod": "WALLET",
      "addressId": "..."
    }
    ```
  - Backend ném lỗi HTTP 400 Bad Request:
    ```json
    {
      "status": "error",
      "statusCode": 400,
      "code": "VALIDATION_ERROR",
      "message": "Validation failed",
      "details": [{ "field": "paymentMethod", "code": "VALIDATION_ERROR", "message": "paymentMethod must be one of the following values: COD, ONLINE_PAYMENT" }]
    }
    ```
  - Hậu quả: Khách hàng không thể sử dụng số dư ví để mua sách, tính năng thanh toán bằng ví bị gãy đổ hoàn toàn.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Enum phương thức thanh toán trong DTO `CheckoutConfirmDto` ở backend chỉ chấp nhận hai giá trị `['COD', 'ONLINE_PAYMENT']`. Giá trị `'WALLET'` chưa được cập nhật vào whitelist của validator.
- **4. Cách khắc phục đề xuất:**
  - Bổ sung `'WALLET'` vào danh sách enum thanh toán hợp lệ của `CheckoutConfirmDto` và kết nối luồng trừ số dư ví trong `checkout.service.ts`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-026] [Chức Năng - P1] Màn hình Ví người dùng (`/profile/wallet`) và Quản lý thiết bị DRM (`/library/devices`) là giao diện giả lập (Mock State 100%)
- **1. Vị trí chính xác:**
  - Màn hình: Ví Cá Nhân HUKI (`/profile/wallet`) & Quản Lý Thiết Bị Đọc (`/library/devices`)
  - File mã nguồn: [web/src/app/profile/wallet/page.tsx](file:///e:/HuKi/web/src/app/profile/wallet/page.tsx) & [web/src/app/library/devices/page.tsx](file:///e:/HuKi/web/src/app/library/devices/page.tsx)
  - Viewport ảnh hưởng: Toàn bộ nền tảng.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Tại `/profile/wallet`: Component `WalletPage` sử dụng hoàn toàn React state cục bộ (`walletBalance = 0`, `transactions = []`). Khi bấm "Nạp Xu Nhanh", hàm `handleExecuteTopup` chỉ cộng số ảo vào state trong RAM (`setWalletBalance(prev + amount)`). Reload trang là mất sạch toàn bộ số dư.
  - Tại `/library/devices`: Component `DeviceManagementPage` nhúng cứng 3 thiết bị mẫu ("MacBook Pro M3", "Boox Palma", "iPhone 15 Pro Max") với địa chỉ IP ảo. Khi bấm "Thu hồi thiết bị", hàm `handleRevoke` chỉ filter mảng state mà không hề gọi API thu hồi DRM license thật trên máy chủ.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Hai màn hình này mới chỉ được dựng khung giao diện mẫu (UI Mockup) mà chưa hề được tích hợp các API endpoint của backend `commerce-service` (`wallets`, `drm_devices`).
- **4. Cách khắc phục đề xuất:**
  - Xây dựng endpoint lấy số dư ví cá nhân và lịch sử giao dịch cho người mua trong `wallet.controller.ts`.
  - Kết nối bảng `drm_devices` trong PostgreSQL để hiển thị và thu hồi thiết bị đọc sách thật của người dùng.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

## 📊 TỔNG HỢP THEO DÕI TIẾN ĐỘ MOD-01
- **Tổng số lỗi đã bóc tách chi tiết:** **26 Lỗi**
  - Lỗi Responsive tràn layout màn hình: 4 Lỗi (1 Tablet, 3 Mobile)
  - Lỗi Anti-AI & Thẩm mỹ xuất bản: 3 Lỗi
  - Lỗi Giao diện & Tương tác vi mô: 4 Lỗi
  - Lỗi Network, API & Xác thực Token: 6 Lỗi
  - Lỗi Chức Năng Nghiệp Vụ Cốt Lõi (Catalog, Reader, Checkout, Mock): 9 Lỗi
- **Cam kết tuân thủ:** 100% chưa can thiệp sửa code, đã lưu trữ đầy đủ làm căn cứ kỹ thuật.
