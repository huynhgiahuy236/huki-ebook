# Báo Cáo Kiểm Thử & Danh Sách Lỗi: Nhóm Người Bán & Chủ Gian Hàng (Seller & Merchant Portal)

> **Mã phân hệ:** `BUG-GROUP-02`  
> **Đối tượng người dùng:** Người bán cá nhân, Doanh nghiệp đối tác, Nhà xuất bản phát hành sách (Seller / Merchant / Publisher).  
> **Phạm vi kiểm thử:** Toàn bộ 48 màn hình và luồng nghiệp vụ quản trị kênh người bán (`/seller/*`), bao gồm quy trình đăng ký gian hàng, quản lý sản phẩm, tồn kho, đơn hàng, in vận đơn, khuyến mãi, tài chính, ví và phân quyền nhân viên.  
> **Nguyên tắc kỹ thuật:** Bám sát logic nghiệp vụ đa chi nhánh, xác thực quyền hạn Store Owner/Staff, loại bỏ toàn bộ dữ liệu giả lập, xử lý dứt khoát 1 phương án kỹ thuật.

---

## BẢNG TỔNG HỢP CÁC LỖI TRÊN TỪNG NÚT BẤM & TỪNG MÀN HÌNH (SELLER & MERCHANT)

| Mã Lỗi | Màn Hình / Route | Nút Bấm / Thành Phần Tương Tác | Phân Loại | Mức Độ | Trạng Thái Kiểm Thử |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **SM-001** | Danh sách sản phẩm (`/seller/products`) | Nút **"Xem trên sàn"** (`open_in_new`) | Điều Hướng / Link | **P0 (Blocker)** | ✅ **FIXED & VERIFIED** (Đã chuyển `/books/${id}` $\rightarrow$ `/book/${id}`) |
| **SM-002** | Quản lý gian hàng (`/seller/stores`) | Nút **"Cài đặt doanh nghiệp"** | Điều Hướng / Link | **P1 (Critical)** | ✅ **FIXED & VERIFIED** (Đã sửa link sang `/seller/business` + tạo trang redirect) |
| **SM-003** | Quản lý người theo dõi (`/seller/followers`) | Nút **"Nhắn tin"** (`chat`) | Tương Tác / Chat | **P1 (Critical)** | ✅ **FIXED & VERIFIED** (Gỡ disabled, dẫn thẳng vào `/seller/chat?recipientId=...` và tự động mở phòng chat) |
| **SM-004** | Xử lý đổi trả (`/seller/returns`) | Nút **"Mở Trang Xử Lý Yêu Cầu"** | Tương Tác / Form | **P1 (Critical)** | ✅ **FIXED & VERIFIED** (Sửa cấu trúc lồng thẻ, liên kết mượt mà đến `/seller/returns/[id]`) |
| **SM-005** | Quản lý sản phẩm (`/seller/products`) | Nút **"Xóa sách"** | Nghiệp Vụ / API | **P0 (Blocker)** | ✅ **FIXED & VERIFIED** (Tự động chuyển sang Soft-Delete `status = ARCHIVED` khi có ràng buộc đơn hàng) |
| **SM-006** | Đăng sách số Ebook (`/seller/product/create-ebook`) | Nút **"Upload file PDF"** | Lưu Trữ / R2 | **P1 (Critical)** | ✅ **VERIFIED** (Tích hợp tiến trình upload và giới hạn kiểm tra định dạng/dung lượng) |
| **SM-007** | Đăng sách Hybrid (`/seller/product/create-hybrid`) | Form nhập **Kho sách số vs Kho sách giấy** | Logic / Validation | **P1 (Critical)** | ✅ **FIXED & VERIFIED** (Ấn bản Ebook không giới hạn tồn kho, chỉ kiểm soát tồn kho sách in) |
| **SM-008** | Quản lý kho (`/seller/inventory`) | Nút phân trang **Lịch sử nhập/xuất kho** | Phân Trang / UX | **P2 (Major)** | ✅ **FIXED & VERIFIED** (Tính toán `logTotalPages` chuẩn xác và disable nút hợp lý) |
| **SM-009** | Quản lý đơn hàng (`/seller/orders`) | Nút **"In phiếu giao hàng (Vận đơn)"** | In Ấn / Renderer | **P2 (Major)** | ✅ **VERIFIED** (In phiếu nhiệt chuẩn 80mm / A4) |
| **SM-010** | Quản lý tài chính (`/seller/finance`) | Nút **"Yêu cầu rút tiền"** | Tài Chính / Modal | **P1 (Critical)** | ✅ **FIXED & VERIFIED** (Kiểm tra số dư khả dụng tối thiểu 50.000 ₫ trước khi submit và mở modal) |
| **SM-011** | Phân quyền nhân viên (`/seller/staff`) | Nút **"Thêm nhân viên mới"** | Phân Quyền / API | **P1 (Critical)** | ✅ **FIXED & VERIFIED** (Cơ chế Direct Provisioning tự tạo tài khoản mới nếu email chưa tồn tại) |

---

## CHI TIẾT KỸ THUẬT CÁC LỖI ĐÃ XỬ LÝ

---

### [SM-001] Nút "Xem Trên Sàn" Trong Quản Lý Sản Phẩm Dẫn Đến Trang 404
- **Vị trí chính xác:** [web/src/app/seller/products/page.tsx](file:///e:/HuKi/web/src/app/seller/products/page.tsx#L841)
- **Đã xử lý:** Đổi `href={`/books/${book.id}`}` thành `href={`/book/${book.id}`}`.

---

### [SM-002] Nút "Cài Đặt Doanh Nghiệp" Trong Quản Lý Gian Hàng Dẫn Đến Trang 404
- **Vị trí chính xác:** [web/src/ui/components/seller/SellerStoresView.tsx](file:///e:/HuKi/web/src/ui/components/seller/SellerStoresView.tsx#L137)
- **Đã xử lý:** Cập nhật liên kết trỏ về `/seller/business`, đồng thời tạo trang chuyển hướng tự động tại `/seller/business/settings/page.tsx`.

---

### [SM-003] Nút "Nhắn Tin" Tại Danh Sách Người Theo Dõi Bị Khóa Liệt Chức Năng
- **Vị trí chính xác:** [web/src/app/seller/followers/page.tsx](file:///e:/HuKi/web/src/app/seller/followers/page.tsx#L411-L422) & [web/src/ui/components/seller/SellerChatView.tsx](file:///e:/HuKi/web/src/ui/components/seller/SellerChatView.tsx)
- **Đã xử lý:** Gỡ bỏ thuộc tính `disabled`, chuyển thành Link trực tiếp tới `/seller/chat?recipientId=${follower.userId}&recipientName=...`. `SellerChatView` tự động nhận diện query params và mở ngay phòng hội thoại với khách hàng đó.

---

### [SM-004] Nút "Mở Trang Xử Lý Yêu Cầu" Đổi Trả Bị Lỗi Lồng Thẻ
- **Vị trí chính xác:** [web/src/app/seller/returns/page.tsx](file:///e:/HuKi/web/src/app/seller/returns/page.tsx)
- **Đã xử lý:** Tách thẻ `<button>` khỏi `<Link>`, cho phép điều hướng mượt mà vào trang chi tiết `/seller/returns/[id]`.

---

### [SM-005] Nút "Xóa Sách" Trong Quản Lý Sản Phẩm Bị Lỗi 500 Khi Sách Đã Từng Có Đơn Hàng
- **Vị trí chính xác:** [platform/apps/commerce-service/src/modules/books/books.service.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/books/books.service.ts#L779-L797)
- **Đã xử lý:** Khi câu lệnh xóa vật lý gặp lỗi ràng buộc khóa ngoại `order_items`, hệ thống tự động fallback sang Soft-Delete: chuyển `status = ARCHIVED`, ẩn sách khỏi sàn nhưng vẫn bảo tồn toàn vẹn lịch sử đơn hàng cũ.

---

### [SM-007] Đăng Sách Hybrid Bắt Buộc Nhập Tồn Kho Cho Ebook
- **Vị trí chính xác:** [web/src/ui/components/seller/SellerCreateProductView.tsx](file:///e:/HuKi/web/src/ui/components/seller/SellerCreateProductView.tsx)
- **Đã xử lý:** Chuẩn hóa form: Ebook DRM tự động gán cấp phép số không giới hạn, chỉ kiểm soát tồn kho đối với ấn bản sách giấy.
