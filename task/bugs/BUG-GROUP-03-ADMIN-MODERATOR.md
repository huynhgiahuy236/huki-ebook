# Báo Cáo Kiểm Thử & Danh Sách Lỗi: Nhóm Quản Trị Viên & Kiểm Duyệt Sàn (Admin & Content Moderator)

> **Mã phân hệ:** `BUG-GROUP-03`  
> **Đối tượng người dùng:** Ban quản trị sàn (Super Admin), Nhân sự kiểm duyệt nội dung (Content Moderator), Kế toán vận hành sàn (Platform Financial Admin).  
> **Phạm vi kiểm thử:** Toàn bộ 35 màn hình quản trị sàn (`/admin/*`), bao gồm phê duyệt đối tác, phê duyệt sách, kiểm soát DRM, giải phóng tiền ký quỹ Escrow, quản lý danh mục, báo cáo vi phạm và phân quyền tài khoản.  
> **Nguyên tắc kỹ thuật:** Tuân thủ phân quyền RBAC đa cấp độ, audit trail cho mọi thao tác của admin, không dung dưỡng mock data, đưa ra 1 giải pháp kỹ thuật tối ưu duy nhất.

---

## BẢNG TỔNG HỢP CÁC LỖI TRÊN TỪNG NÚT BẤM & TỪNG MÀN HÌNH (ADMIN & MODERATOR)

| Mã Lỗi | Màn Hình / Route | Nút Bấm / Thành Phần Tương Tác | Phân Loại | Mức Độ | Trạng Thái Kiểm Thử |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **AD-001** | Quản lý doanh nghiệp (`/admin/businesses`) | Nút **"Xem Yêu Cầu Cập Nhật"** | Điều Hướng / Link | **P1 (Critical)** | ❌ **FAIL** (Gãy link `/admin/business-update-requests` $\rightarrow$ 404) |
| **AD-002** | Quản lý nhà xuất bản (`/admin/publishers`) | Nút **"Xem Đầu Mối Xuất Bản (Leads)"** | Điều Hướng / Link | **P1 (Critical)** | ❌ **FAIL** (Gãy link `/admin/leads` $\rightarrow$ 404) |
| **AD-003** | Báo cáo & Khiếu nại (`/admin/reports`) | Nút **"Đăng Nhập Quản Trị"** (Auth Timeout) | Điều Hướng / Auth | **P1 (Critical)** | ❌ **FAIL** (Gãy link `/login?redirect=...` $\rightarrow$ 404) |
| **AD-004** | Quản lý doanh nghiệp (`/admin/businesses`) | Nút **"Xem Gian Hàng Công Khai"** | Điều Hướng / Link | **P1 (Critical)** | ❌ **FAIL** (Gãy link `/stores/${storeSlug}` $\rightarrow$ 404) |
| **AD-005** | Quản lý cửa hàng (`/admin/stores`) | Nút **"Mở Trang Cửa Hàng"** | Điều Hướng / Link | **P1 (Critical)** | ❌ **FAIL** (Gãy link `/stores/${selectedStore.slug}` $\rightarrow$ 404) |
| **AD-006** | Chiến dịch Flash Sale (`/admin/promotions/flash-sale`) | Nút **"Tạo Khung Giờ Flash Sale"** | API & Service | **P0 (Blocker)** | ❌ **FAIL** (Promotion Service 502 Bad Gateway) |
| **AD-007** | Quản lý Voucher sàn (`/admin/promotions/vouchers`) | Nút **"Kích Hoạt Voucher Sàn"** | API & Service | **P0 (Blocker)** | ❌ **FAIL** (Promotion Service 502 Bad Gateway) |
| **AD-008** | Kiểm duyệt sách (`/admin/book-moderation`) | Nút **"Từ Chối & Yêu Cầu Chỉnh Sửa"** | Nghiệp Vụ / Modal | **P1 (Critical)** | ❌ **FAIL** (Không gửi thông báo email/socket tới seller) |
| **AD-009** | Ký quỹ sàn Escrow (`/admin/escrow`) | Nút **"Giải Phóng Tiền Cho Seller"** | Tài Chính / API | **P0 (Blocker)** | ❌ **FAIL** (Lỗi transaction phân tán không rollback khi ví seller lỗi) |
| **AD-010** | Quản lý người dùng (`/admin/users`) | Nút **"Khóa Tài Khoản"** | Bảo Mật / Token | **P1 (Critical)** | ❌ **FAIL** (Khóa xong nhưng refresh token trong cookie chưa bị hủy ngay) |

---

## CHI TIẾT KỸ THUẬT TỪNG LỖI CỤ THỂ

---

### [AD-001] Nút "Xem Yêu Cầu Cập Nhật" Dẫn Đến Trang 404 Not Found
- **Vị trí chính xác:**
  - Màn hình: Quản lý doanh nghiệp & đối tác bán hàng (`http://localhost:3100/admin/businesses`)
  - File mã nguồn: [web/src/ui/components/admin/AdminBusinessesView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminBusinessesView.tsx#L2051)
- **Nút bấm / Thao tác:**
  - Thao tác: Bấm vào badge hoặc nút `"Xem yêu cầu cập nhật hồ sơ đối tác"`.
  - Đoạn code: `<Link href="/admin/business-update-requests">`
- **Hiện tượng lỗi:**
  - Quản trị viên muốn xét duyệt các thông tin sửa đổi (tên pháp nhân, tài khoản ngân hàng mới, địa chỉ kho mới) do người bán gửi lên. Bấm vào nút thì bị văng sang màn hình **HTTP 404 Not Found**.
- **Nguyên nhân gốc rễ:**
  - Tên route thực tế trong cấu trúc thư mục App Router là `web/src/app/admin/business-requests/page.tsx` (không có chữ `-update-`).
- **Giải pháp dứt khoát duy nhất:**
  - Đổi đường dẫn tại dòng 2051 [AdminBusinessesView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminBusinessesView.tsx#L2051) thành:
    ```tsx
    href="/admin/business-requests"
    ```

---

### [AD-002] Nút "Xem Đầu Mối Xuất Bản (Leads)" Dẫn Đến Trang 404 Not Found
- **Vị trí chính xác:**
  - Màn hình: Quản lý nhà xuất bản (`http://localhost:3100/admin/publishers`)
  - File mã nguồn: [web/src/ui/components/admin/AdminPublishersView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminPublishersView.tsx#L489)
- **Nút bấm / Thao tác:**
  - Thao tác: Bấm nút `"Danh sách đối tác tiềm năng (Leads)"`.
  - Đoạn code: `<Link href="/admin/leads">`
- **Hiện tượng lỗi:**
  - Admin bấm vào nút xem danh sách các nhà xuất bản đã đăng ký hợp tác nhưng chưa ký quỹ/chưa kích hoạt, màn hình báo **HTTP 404 Not Found**.
- **Nguyên nhân gốc rễ:**
  - Route được khai báo trong thư mục là `web/src/app/admin/publisher-leads/page.tsx`. Lập trình viên viết tắt thành `/admin/leads`.
- **Giải pháp dứt khoát duy nhất:**
  - Cập nhật liên kết thành:
    ```tsx
    href="/admin/publisher-leads"
    ```

---

### [AD-003] Nút Đăng Nhập Quản Trị Tại Màn Hình Báo Cáo Gãy Link `/login`
- **Vị trí chính xác:**
  - Màn hình: Báo cáo & Xử lý vi phạm (`http://localhost:3100/admin/reports`)
  - File mã nguồn: [web/src/ui/components/admin/AdminReportsView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminReportsView.tsx#L514)
- **Nút bấm / Thao tác:**
  - Thao tác: Khi phiên làm việc của Admin hết hạn, màn hình hiển thị lời nhắc *"Vui lòng đăng nhập lại để tiếp tục xử lý báo cáo vi phạm"* kèm nút `"Đăng nhập lại"`.
  - Đoạn code: `<Link href="/login?redirect=/admin/reports">`
- **Hiện tượng lỗi:**
  - Admin bấm nút, bị chuyển sang `http://localhost:3100/login?redirect=/admin/reports` $\rightarrow$ **HTTP 404 Not Found**. Admin bị kẹt, không thể đăng nhập lại được nếu không gõ tay trên thanh địa chỉ URL.
- **Nguyên nhân gốc rễ:**
  - Viết nhầm `/login` thay vì `/auth/login`.
- **Giải pháp dứt khoát duy nhất:**
  - Đổi liên kết thành:
    ```tsx
    href="/auth/login?redirect=/admin/reports"
    ```

---

### [AD-004] Nút "Xem Gian Hàng Công Khai" Dẫn Đến Route `/stores/[slug]` Không Tồn Tại
- **Vị trí chính xác:**
  - [web/src/ui/components/admin/AdminBusinessesView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminBusinessesView.tsx#L638)
  - [web/src/ui/components/admin/AdminStoresView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminStoresView.tsx#L664)
- **Nút bấm / Thao tác:**
  - Nút: `"Mở trang gian hàng"` (icon `visibility` hoặc `launch`).
  - Đoạn code: `<Link href={`/stores/${selectedStore.slug}`} target="_blank">`
- **Hiện tượng lỗi:**
  - Admin đang duyệt gian hàng, muốn bấm vào xem giao diện storefront của shop để kiểm tra sách hiển thị có đúng không. Màn hình tab mới báo **HTTP 404 Not Found**.
- **Nguyên nhân gốc rễ:**
  - Trong dự án HUKI:
    - Danh sách các gian hàng là `/stores` (tập hợp tất cả shop).
    - Trang chi tiết của 1 gian hàng cụ thể được định tuyến tại `web/src/app/shop/[id]/page.tsx` (`/shop/:slugOrId`).
    - Hoàn toàn KHÔNG CÓ thư mục `web/src/app/stores/[id]/page.tsx`.
- **Giải pháp dứt khoát duy nhất:**
  - Đổi tất cả các liên kết xem gian hàng thành:
    ```tsx
    href={`/shop/${selectedStore.slug || selectedStore.id}`}
    ```

---

### [AD-005] Toàn Bộ Nút Thao Tác Khuyến Mãi Sàn Bị Đóng Băng Do Lỗi 502 Promotion Service
- **Vị trí chính xác:**
  - `/admin/promotions/flash-sale`, `/admin/promotions/vouchers`, `/admin/flash-sales`
- **Nút bấm / Thao tác:**
  - Nút: `"Tạo khung giờ Flash Sale mới"`, `"Kích hoạt Voucher sàn"`, `"Thêm sách vào Flash Sale"`.
- **Hiện tượng lỗi:**
  - Mọi thao tác bấm gửi form đều quay vô tận rồi báo lỗi đỏ: *"Lỗi máy chủ (502): Service promotion is unavailable"*.
- **Nguyên nhân gốc rễ:**
  - Dịch vụ `promotion-service-uat` bị crash loop trong docker compose.
- **Giải pháp dứt khoát duy nhất:**
  - Fix triệt để container startup script của promotion-service trong `docker-compose.uat.yml`, đảm bảo service chạy ổn định trên cổng nội bộ 3007 và trả về 200 OK cho API Gateway.

