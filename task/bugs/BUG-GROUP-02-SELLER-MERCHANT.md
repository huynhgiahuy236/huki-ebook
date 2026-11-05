# Báo Cáo Kiểm Thử & Danh Sách Lỗi: Nhóm Người Bán & Chủ Gian Hàng (Seller & Merchant Portal)

> **Mã phân hệ:** `BUG-GROUP-02`  
> **Đối tượng người dùng:** Người bán cá nhân, Doanh nghiệp đối tác, Nhà xuất bản phát hành sách (Seller / Merchant / Publisher).  
> **Phạm vi kiểm thử:** Toàn bộ 48 màn hình và luồng nghiệp vụ quản trị kênh người bán (`/seller/*`), bao gồm quy trình đăng ký gian hàng, quản lý sản phẩm, tồn kho, đơn hàng, in vận đơn, khuyến mãi, tài chính, ví và phân quyền nhân viên.  
> **Nguyên tắc kỹ thuật:** Bám sát logic nghiệp vụ đa chi nhánh, xác thực quyền hạn Store Owner/Staff, loại bỏ toàn bộ dữ liệu giả lập, xử lý dứt khoát 1 phương án kỹ thuật.

---

## BẢNG TỔNG HỢP CÁC LỖI TRÊN TỪNG NÚT BẤM & TỪNG MÀN HÌNH (SELLER & MERCHANT)

| Mã Lỗi | Màn Hình / Route | Nút Bấm / Thành Phần Tương Tác | Phân Loại | Mức Độ | Trạng Thái Kiểm Thử |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **SM-001** | Danh sách sản phẩm (`/seller/products`) | Nút **"Xem trên sàn"** (`open_in_new`) | Điều Hướng / Link | **P0 (Blocker)** | ❌ **FAIL** (Gãy link `/books/${id}` $\rightarrow$ 404) |
| **SM-002** | Quản lý gian hàng (`/seller/stores`) | Nút **"Cài đặt doanh nghiệp"** | Điều Hướng / Link | **P1 (Critical)** | ❌ **FAIL** (Gãy link `/seller/business/settings` $\rightarrow$ 404) |
| **SM-003** | Quản lý người theo dõi (`/seller/followers`) | Nút **"Nhắn tin"** (`chat`) | Tương Tác / Chat | **P1 (Critical)** | ❌ **FAIL** (Nút bị khóa disabled, không mở khung chat) |
| **SM-004** | Xử lý đổi trả (`/seller/returns`) | Nút **"Mở Trang Xử Lý Yêu Cầu"** | Tương Tác / Form | **P1 (Critical)** | ❌ **FAIL** (Nút bị thiếu handler, không load chi tiết đơn trả) |
| **SM-005** | Quản lý sản phẩm (`/seller/products`) | Nút **"Xóa sách"** | Nghiệp Vụ / API | **P0 (Blocker)** | ❌ **FAIL** (Ràng buộc FK orders gây lỗi 500 thay vì soft-delete) |
| **SM-006** | Đăng sách số Ebook (`/seller/product/create-ebook`) | Nút **"Upload file PDF"** | Lưu Trữ / R2 | **P1 (Critical)** | ❌ **FAIL** (Lỗi upload vượt quá dung lượng không có progress bar) |
| **SM-007** | Đăng sách Hybrid (`/seller/product/create-hybrid`) | Form nhập **Kho sách số vs Kho sách giấy** | Logic / Validation | **P1 (Critical)** | ❌ **FAIL** (Bắt buộc nhập tồn kho cho Ebook vốn là vô hạn) |
| **SM-008** | Quản lý kho (`/seller/inventory`) | Nút phân trang **Lịch sử nhập/xuất kho** | Phân Trang / UX | **P2 (Major)** | ❌ **FAIL** (Lỗi hiển thị tổng số trang và không disable khi trang cuối) |
| **SM-009** | Quản lý đơn hàng (`/seller/orders`) | Nút **"In phiếu giao hàng (Vận đơn)"** | In Ấn / Renderer | **P2 (Major)** | ❌ **FAIL** (Layout in nhiệt 80mm bị tràn trang trên khổ A4/A5) |
| **SM-010** | Quản lý tài chính (`/seller/finance`) | Nút **"Yêu cầu rút tiền"** | Tài Chính / Modal | **P1 (Critical)** | ❌ **FAIL** (Không kiểm tra số dư khả dụng tối thiểu trước khi submit) |
| **SM-011** | Phân quyền nhân viên (`/seller/staff`) | Nút **"Thêm nhân viên mới"** | Phân Quyền / API | **P1 (Critical)** | ❌ **FAIL** (Mời email nhân viên chưa có tài khoản văng lỗi 404) |

---

## CHI TIẾT KỸ THUẬT TỪNG LỖI CỤ THỂ

---

### [SM-001] Nút "Xem Trên Sàn" Trong Quản Lý Sản Phẩm Dẫn Đến Trang 404
- **Vị trí chính xác:**
  - Màn hình: Quản lý sản phẩm người bán (`http://localhost:3100/seller/products`)
  - File mã nguồn: [web/src/app/seller/products/page.tsx](file:///e:/HuKi/web/src/app/seller/products/page.tsx#L841)
- **Nút bấm / Thao tác:**
  - Thao tác: Bấm icon `open_in_new` kèm tooltip `"Xem chi tiết sách trên sàn bán lẻ"`.
  - Đoạn code: `<Link href={`/books/${book.id}`} target="_blank">`
- **Hiện tượng lỗi:**
  - Người bán vừa đăng hoặc chỉnh sửa sách xong, muốn kiểm tra diện mạo của sách ngoài trang chủ sàn, bấm nút "Xem trên sàn".
  - Trình duyệt mở tab mới dẫn đến `http://localhost:3100/books/34e84482-931a-43bc-8492-6592b8dbfd80` $\rightarrow$ Nhận ngay mã lỗi **HTTP 404 Not Found**.
- **Nguyên nhân gốc rễ:**
  - Trong Next.js App Router của HUKI:
    - Trang danh mục duyệt tất cả sách là `/books` (số nhiều).
    - Trang chi tiết của một cuốn sách cụ thể là `/book/[id]` (số ít).
  - Lập trình viên viết nhầm thành số nhiều `/books/${book.id}`, khiến Next.js coi ID sách là một route con không tồn tại và trả về 404.
- **Giải pháp dứt khoát duy nhất:**
  - Đổi đường dẫn tại dòng 841 [web/src/app/seller/products/page.tsx](file:///e:/HuKi/web/src/app/seller/products/page.tsx#L841) thành:
    ```tsx
    href={`/book/${book.id}`}
    ```

---

### [SM-002] Nút "Cài Đặt Doanh Nghiệp" Trong Quản Lý Gian Hàng Dẫn Đến Trang 404
- **Vị trí chính xác:**
  - Màn hình: Quản lý gian hàng (`http://localhost:3100/seller/stores`)
  - File mã nguồn: [web/src/ui/components/seller/SellerStoresView.tsx](file:///e:/HuKi/web/src/ui/components/seller/SellerStoresView.tsx#L137)
- **Nút bấm / Thao tác:**
  - Nút: `"Cài đặt doanh nghiệp"` trong menu thiết lập thông tin đối tác kinh doanh.
- **Hiện tượng lỗi:**
  - Người bán bấm vào nút cài đặt, trình duyệt chuyển sang `http://localhost:3100/seller/business/settings` $\rightarrow$ **HTTP 404 Not Found**.
- **Nguyên nhân gốc rễ:**
  - Tuyến đường cấu hình doanh nghiệp thực tế của người bán là `/seller/business` hoặc `/seller/stores/setup`. Route `/seller/business/settings` không hề tồn tại trong cấu trúc thư mục `web/src/app/seller/business/`.
- **Giải pháp dứt khoát duy nhất:**
  - Cập nhật liên kết `href` trỏ về đúng trang `/seller/business`.

---

### [SM-003] Nút "Nhắn Tin" Tại Danh Sách Người Theo Dõi Bị Khóa Liệt Chức Năng
- **Vị trí chính xác:**
  - Màn hình: Khách hàng & Người theo dõi (`http://localhost:3100/seller/followers`)
  - File mã nguồn: [web/src/app/seller/followers/page.tsx](file:///e:/HuKi/web/src/app/seller/followers/page.tsx#L411-L422)
- **Nút bấm / Thao tác:**
  - Nút: `<button type="button" disabled ...> <span ...>chat</span> Nhắn tin <span ...>Sắp có</span> </button>`
- **Hiện tượng lỗi:**
  - Người bán muốn chăm sóc hoặc tư vấn riêng cho độc giả đang theo dõi gian hàng, nhưng nút bấm bị hardcode thuộc tính `disabled` với badge "Sắp có", không thể bấm được và không mở được kênh chat.
- **Nguyên nhân gốc rễ:**
  - Module Chat nội bộ (`community-service`) đã hoàn thành và có sẵn tại route `/messages` và `/seller/chat`. Tuy nhiên trang `followers` chưa được tích hợp luồng mở phòng chat trực tiếp với `follower.userId`.
- **Giải pháp dứt khoát duy nhất:**
  - Gỡ bỏ `disabled`, chuyển nút thành `<Link href={`/seller/chat?recipientId=${follower.userId}&recipientName=${encodeURIComponent(follower.fullName)}`}>` để chủ shop có thể click mở ngay khung chat thời gian thực với độc giả đó.

---

### [SM-004] Nút "Xóa Sách" Trong Quản Lý Sản Phẩm Bị Lỗi 500 Khi Sách Đã Từng Có Đơn Hàng
- **Vị trí chính xác:**
  - Màn hình: Quản lý sản phẩm (`http://localhost:3100/seller/products`)
  - File mã nguồn: `platform/apps/commerce-service/src/modules/books/books.service.ts`
- **Nút bấm / Thao tác:**
  - Thao tác: Bấm nút `"Xóa sách"` (icon thùng rác) trên một cuốn sách đã từng phát sinh đơn hàng trong quá khứ $\rightarrow$ Xác nhận trong popup.
- **Hiện tượng lỗi:**
  - Giao diện báo lỗi đỏ: *"Lỗi máy chủ nội bộ (500): Không thể xóa sách"*. Sách vẫn giữ nguyên trạng thái.
- **Nguyên nhân gốc rễ:**
  - Trong PostgreSQL, bảng `order_items` có khóa ngoại trỏ tới `books(id)`. Khi gọi `prisma.book.delete()`, PostgreSQL từ chối câu lệnh xóa vật lý (Physical Delete) do vi phạm ràng buộc toàn vẹn khóa ngoại (Foreign Key Constraint Violation).
- **Giải pháp dứt khoát duy nhất:**
  - Chuyển toàn bộ logic xóa sách trong `books.service.ts` thành **Xóa mềm (Soft Delete)**: Cập nhật `status = 'ARCHIVED'` hoặc gắn `deletedAt = new Date()`, đồng thời ẩn sách khỏi danh mục công khai nhưng vẫn bảo toàn toàn vẹn lịch sử đơn hàng cũ của độc giả.

---

### [SM-005] Đăng Sách Hybrid Bắt Buộc Nhập Tồn Kho Cho Ebook
- **Vị trí chính xác:**
  - Màn hình: Đăng sách phiên bản kép Hybrid (`http://localhost:3100/seller/product/create-hybrid`)
  - File mã nguồn: [web/src/app/seller/product/create-hybrid/page.tsx](file:///e:/HuKi/web/src/app/seller/product/create-hybrid/page.tsx)
- **Nút bấm / Thao tác:**
  - Nút: `"Tiếp tục"` hoặc `"Lưu và gửi duyệt"`.
- **Hiện tượng lỗi:**
  - Form xác thực báo lỗi bắt buộc: *"Vui lòng nhập số lượng tồn kho cho ấn phẩm số (Ebook)"*. Nếu nhập 0 thì hệ thống báo hết hàng và không cho khách mua Ebook.
- **Nguyên nhân gốc rễ:**
  - Bộ kiểm tra tính hợp lệ (Form Validation) áp dụng chung quy tắc của sách giấy vật lý (Physical Book) cho cả ấn phẩm số (Digital Book). Ebook là tài sản số có khả năng cấp phép không giới hạn, không có khái niệm giới hạn tồn kho vật lý.
- **Giải pháp dứt khoát duy nhất:**
  - Bỏ trường validate `stock` đối với cấu phần Ebook, tự động gán cờ `digitalEnabled = true` với số lượng không giới hạn và chỉ kiểm soát tồn kho cho ấn bản sách giấy.

