# Báo Cáo Kiểm Thử & Danh Sách Lỗi: Nhóm Quản Trị Viên & Kiểm Duyệt Sàn (Admin & Content Moderator)

> **Mã phân hệ:** `BUG-GROUP-03`  
> **Đối tượng người dùng:** Ban quản trị sàn (Super Admin), Nhân sự kiểm duyệt nội dung (Content Moderator), Kế toán vận hành sàn (Platform Financial Admin).  
> **Phạm vi kiểm thử:** Toàn bộ 35 màn hình quản trị sàn (`/admin/*`), bao gồm phê duyệt đối tác, phê duyệt sách, kiểm soát DRM, giải phóng tiền ký quỹ Escrow, quản lý danh mục, báo cáo vi phạm và phân quyền tài khoản.  
> **Nguyên tắc kỹ thuật:** Tuân thủ phân quyền RBAC đa cấp độ, audit trail cho mọi thao tác của admin, không dung dưỡng mock data, đưa ra 1 giải pháp kỹ thuật tối ưu duy nhất.

---

## BẢNG TỔNG HỢP CÁC LỖI TRÊN TỪNG NÚT BẤM & TỪNG MÀN HÌNH (ADMIN & MODERATOR)

| Mã Lỗi | Màn Hình / Route | Nút Bấm / Thành Phần Tương Tác | Phân Loại | Mức Độ | Trạng Thái Kiểm Thử |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **AD-001** | Quản lý doanh nghiệp (`/admin/businesses`) | Nút **"Xem Yêu Cầu Cập Nhật"** | Điều Hướng / Link | **P1 (Critical)** | ✅ **PASS** (Đã chuyển về `/admin/business-requests` + forwarder) |
| **AD-002** | Quản lý nhà xuất bản (`/admin/publishers`) | Nút **"Xem Đầu Mối Xuất Bản (Leads)"** | Điều Hướng / Link | **P1 (Critical)** | ✅ **PASS** (Đã chuyển về `/admin/publisher-leads` + forwarder) |
| **AD-003** | Báo cáo & Khiếu nại (`/admin/reports`) | Nút **"Đăng Nhập Quản Trị"** (Auth Timeout) | Điều Hướng / Auth | **P1 (Critical)** | ✅ **PASS** (Đã sửa link chuẩn `/auth/login?redirect=...`) |
| **AD-004** | Quản lý doanh nghiệp (`/admin/businesses`) | Nút **"Xem Gian Hàng Công Khai"** | Điều Hướng / Link | **P1 (Critical)** | ✅ **PASS** (Đã chuyển sang storefront `/shop/${slug}` + forwarder `/stores/[id]`) |
| **AD-005** | Quản lý cửa hàng (`/admin/stores`) | Nút **"Mở Trang Cửa Hàng"** | Điều Hướng / Link | **P1 (Critical)** | ✅ **PASS** (Đã chuyển sang storefront `/shop/${slug}` + forwarder `/stores/[id]`) |
| **AD-006** | Chiến dịch Flash Sale (`/admin/promotions/flash-sale`) | Nút **"Tạo Khung Giờ Flash Sale"** | API & Service | **P0 (Blocker)** | ✅ **PASS** (Đồng bộ cấu hình Docker UAT & Promotion Service 200 OK) |
| **AD-007** | Quản lý Voucher sàn (`/admin/promotions/vouchers`) | Nút **"Kích Hoạt Voucher Sàn"** | API & Service | **P0 (Blocker)** | ✅ **PASS** (Đồng bộ cấu hình Gateway / Commerce & Promotion Service 200 OK) |
| **AD-008** | Kiểm duyệt sách (`/admin/book-moderation`) | Nút **"Từ Chối & Yêu Cầu Chỉnh Sửa"** | Nghiệp Vụ / Modal | **P1 (Critical)** | ✅ **PASS** (Gửi lý do vào API suspend + NotificationService gửi seller in-app) |
| **AD-009** | Ký quỹ sàn Escrow (`/admin/escrow`) | Nút **"Giải Phóng Tiền Cho Seller"** | Tài Chính / API | **P0 (Blocker)** | ✅ **PASS** (Bọc toàn bộ OrderStatusHistory + Wallet + WalletTx trong prisma.$transaction) |
| **AD-010** | Quản lý người dùng (`/admin/users`) | Nút **"Khóa Tài Khoản"** | Bảo Mật / Token | **P1 (Critical)** | ✅ **PASS** (Hủy ngay lập tức AuthSession & RefreshToken trong DB khi bị BLOCKED) |

---

## CHI TIẾT KỸ THUẬT TỪNG LỖI CỤ THỂ

---

### [AD-001] Nút "Xem Yêu Cầu Cập Nhật" Dẫn Đến Trang 404 Not Found
- **Vị trí chính xác:**
  - Màn hình: Quản lý doanh nghiệp & đối tác bán hàng (`http://localhost:3100/admin/businesses`)
  - File mã nguồn: [web/src/ui/components/admin/AdminBusinessesView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminBusinessesView.tsx#L2051)
- **Nút bấm / Thao tác:**
  - Thao tác: Bấm vào badge hoặc nút `"Xem yêu cầu cập nhật hồ sơ đối tác"`.
  - Đoạn code: `<Link href="/admin/business-requests">`
- **Hiện tượng lỗi ban đầu:**
  - Quản trị viên muốn xét duyệt các thông tin sửa đổi (tên pháp nhân, tài khoản ngân hàng mới, địa chỉ kho mới) do người bán gửi lên. Bấm vào nút thì bị văng sang màn hình **HTTP 404 Not Found**.
- **Nguyên nhân gốc rễ:**
  - Tên route thực tế trong cấu trúc thư mục App Router là `web/src/app/admin/business-requests/page.tsx` (không có chữ `-update-`).
- **Giải pháp dứt khoát đã áp dụng:**
  - Đổi đường dẫn tại dòng 2051 [AdminBusinessesView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminBusinessesView.tsx#L2051) thành `href="/admin/business-requests"`.
  - Bổ sung trang forwarder `web/src/app/admin/business-update-requests/page.tsx` điều hướng tự động sang `/admin/business-requests`.

---

### [AD-002] Nút "Xem Đầu Mối Xuất Bản (Leads)" Dẫn Đến Trang 404 Not Found
- **Vị trí chính xác:**
  - Màn hình: Quản lý nhà xuất bản (`http://localhost:3100/admin/publishers`)
  - File mã nguồn: [web/src/ui/components/admin/AdminPublishersView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminPublishersView.tsx#L489)
- **Nút bấm / Thao tác:**
  - Thao tác: Bấm nút `"Danh sách đối tác tiềm năng (Leads)"`.
  - Đoạn code: `<Link href="/admin/publisher-leads">`
- **Hiện tượng lỗi ban đầu:**
  - Admin bấm vào nút xem danh sách các nhà xuất bản đã đăng ký hợp tác nhưng chưa ký quỹ/chưa kích hoạt, màn hình báo **HTTP 404 Not Found**.
- **Nguyên nhân gốc rễ:**
  - Route được khai báo trong thư mục là `web/src/app/admin/publisher-leads/page.tsx`. Lập trình viên viết tắt thành `/admin/leads`.
- **Giải pháp dứt khoát đã áp dụng:**
  - Cập nhật liên kết thành `href="/admin/publisher-leads"`.
  - Bổ sung trang forwarder `web/src/app/admin/leads/page.tsx` điều hướng tự động sang `/admin/publisher-leads`.

---

### [AD-003] Nút Đăng Nhập Quản Trị Tại Màn Hình Báo Cáo Gãy Link `/login`
- **Vị trí chính xác:**
  - Màn hình: Báo cáo & Xử lý vi phạm (`http://localhost:3100/admin/reports`)
  - File mã nguồn: [web/src/ui/components/admin/AdminReportsView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminReportsView.tsx#L514)
- **Nút bấm / Thao tác:**
  - Thao tác: Khi phiên làm việc của Admin hết hạn, màn hình hiển thị lời nhắc *"Vui lòng đăng nhập lại để tiếp tục xử lý báo cáo vi phạm"* kèm nút `"Đăng nhập lại"`.
- **Hiện tượng lỗi ban đầu:**
  - Admin bấm nút, bị chuyển sang `http://localhost:3100/login?redirect=/admin/reports` $\rightarrow$ **HTTP 404 Not Found**.
- **Nguyên nhân gốc rễ:**
  - Viết nhầm `/login` thay vì `/auth/login`.
- **Giải pháp dứt khoát đã áp dụng:**
  - Đổi liên kết thành `href="/auth/login?redirect=/admin/reports"`.

---

### [AD-004] & [AD-005] Nút "Xem Gian Hàng Công Khai" Dẫn Đến Route `/stores/[slug]` Không Tồn Tại
- **Vị trí chính xác:**
  - [web/src/ui/components/admin/AdminBusinessesView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminBusinessesView.tsx#L638)
  - [web/src/ui/components/admin/AdminStoresView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminStoresView.tsx#L664)
- **Nút bấm / Thao tác:**
  - Nút: `"Mở trang gian hàng"` (icon `visibility` hoặc `launch`).
- **Hiện tượng lỗi ban đầu:**
  - Admin bấm vào xem gian hàng của đối tác, màn hình tab mới báo **HTTP 404 Not Found**.
- **Nguyên nhân gốc rễ:**
  - Trang storefront công khai của HuKi nằm ở route `/shop/[id]` (`web/src/app/shop/[id]/page.tsx`). Thư mục `/stores/[id]` trước đó không tồn tại.
- **Giải pháp dứt khoát đã áp dụng:**
  - Đổi tất cả các liên kết xem gian hàng thành `href={`/shop/${selectedStore.slug || selectedStore.id}`}`.
  - Tạo trang forwarder động `web/src/app/stores/[id]/page.tsx` tự động redirect 307 mọi truy cập từ `/stores/:id` sang `/shop/:id`.
  - Cập nhật schema SEO trong `SEOTags.tsx` chuẩn hóa đường dẫn `@id` và `url` về `/shop/${store.slug}`.

---

### [AD-006] & [AD-007] Hoạt Động Khuyến Mãi Sàn & Flash Sale
- **Vị trí chính xác:**
  - `/admin/promotions/flash-sale`, `/admin/promotions/vouchers`, `/admin/flash-sales`
- **Nghiệp vụ:**
  - Kích hoạt voucher sàn, tạo khung giờ Flash Sale, điều phối trợ giá khuyến mãi.
- **Giải pháp dứt khoát đã áp dụng:**
  - Kiểm tra và đồng bộ hóa `INTERNAL_SERVICE_KEY: ${INTERNAL_SERVICE_KEY:-huki-production-internal-key}` giữa API Gateway, Commerce Service và Promotion Service trong `docker-compose.uat.yml`.
  - Đảm bảo Promotion Service khởi động ổn định kèm migrate database schema tự động trước khi lắng nghe port 3007.

---

### [AD-008] Kiểm Duyệt Sách: Nút "Từ Chối & Yêu Cầu Chỉnh Sửa"
- **Vị trí chính xác:**
  - Màn hình: Kiểm duyệt sách (`/admin/book-moderation`)
  - File mã nguồn: [web/src/ui/components/admin/AdminBookModerationView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminBookModerationView.tsx#L148)
  - Backend: [book-publishing.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/books/book-publishing.controller.ts) và [book-publishing.service.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/books/book-publishing.service.ts)
- **Hiện tượng lỗi ban đầu:**
  - Admin bấm từ chối hoặc yêu cầu sửa đổi nhưng lý do từ chối không được gửi sang backend, người bán không nhận được thông báo in-app hay email về lý do bị từ chối.
- **Giải pháp dứt khoát đã áp dụng:**
  - Mở rộng controller và service `suspend(bookId, actor, reason?: string)` tiếp nhận lý do từ chối cụ thể.
  - Tích hợp `NotificationService` trong `commerce-service` tự động gửi thông báo hệ thống trực tiếp đến `book.ownerUserId` với lý do và hướng dẫn khắc phục.
  - Cập nhật `catalogApi.suspendBook(id, reason)` và `AdminBookModerationView.tsx` truyền đầy đủ lý do khi từ chối hoặc yêu cầu sửa đổi ấn phẩm.

---

### [AD-009] Ký Quỹ Sàn Escrow: Nút "Giải Phóng Tiền Cho Seller"
- **Vị trí chính xác:**
  - Màn hình: Ký quỹ trung gian Escrow (`/admin/escrow`)
  - File mã nguồn: [orders.service.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/orders.service.ts#L2780)
- **Hiện tượng lỗi ban đầu:**
  - Thao tác giải phóng tiền thực hiện các bước rời rạc: ghi lịch sử `orderStatusHistory`, sau đó mới upsert ví và tạo giao dịch ví `walletTransaction`. Nếu bước sau thất bại, trạng thái hiển thị đã bàn giao nhưng người bán thực tế chưa nhận được tiền.
- **Giải pháp dứt khoát đã áp dụng:**
  - Bọc toàn bộ quá trình cập nhật trạng thái dòng tiền, tăng số dư khả dụng ví người bán và ghi sổ phụ `walletTransaction` vào một khối atomic transaction duy nhất: `this.prisma.$transaction(async (tx) => { ... })`.
  - Đảm bảo tính nhất quán tuyệt đối (ACID): nếu có bất kỳ lỗi nào xảy ra, toàn bộ giao dịch tự động rollback về trạng thái ban đầu.

---

### [AD-010] Quản Lý Người Dùng: Khóa Tài Khoản Nhưng Refresh Token Chưa Bị Hủy
- **Vị trí chính xác:**
  - Màn hình: Quản lý người dùng (`/admin/users`)
  - File mã nguồn: [user.service.ts](file:///e:/HuKi/platform/apps/identity-service/src/modules/user/user.service.ts#L330) và [auth.service.ts](file:///e:/HuKi/platform/apps/identity-service/src/modules/auth/auth.service.ts#L598)
- **Hiện tượng lỗi ban đầu:**
  - Admin bấm khóa tài khoản người dùng (`status = BLOCKED`), nhưng cookie refresh token của người dùng vẫn hoạt động được cho tới khi hết hạn 7 ngày, cho phép tiếp tục lấy access token mới.
- **Giải pháp dứt khoát đã áp dụng:**
  - Trong `UserService.toggleLockByAdmin` và `UserService.updateUserByAdmin`: ngay khi trạng thái chuyển sang `BLOCKED`, tự động thu hồi (revoke) toàn bộ `authSession` và `refreshToken` của người dùng đó trong cơ sở dữ liệu (`revokedReason: 'admin_account_blocked'`).
  - Trong `AuthService.refreshToken`: bổ sung điều kiện chặn ngay lập tức nếu trạng thái tài khoản là `BLOCKED` hoặc `DELETED`.
