# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 3
## PHÂN QUYỀN & QUẢN TRỊ NHÂN SỰ GIAN HÀNG (STAFF RBAC & SUB-ACCOUNTS MANAGEMENT)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng hệ thống quản trị phân quyền nội bộ gian hàng (Staff Role-Based Access Control) đa tầng, bảo vệ tuyệt đối dữ liệu tài chính (Ví, Rút tiền) và hồ sơ pháp lý. Cho phép Chủ gian hàng (Owner) tự do cấp tài khoản nhân viên, cấu hình quyền hạn theo từng nghiệp vụ (Đơn hàng, Kho sách, CSKH) và tự động lọc giao diện/chặn truy cập trái phép.
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `identity-service`: Quản lý tài khoản user, JWT claims, mã hóa mật khẩu.
    * `business-service`: Quản trị bảng `business_members`, gán quyền hạn `permissions`, kiểm tra vai trò `OWNER` vs `STAFF`.
    * Middleware/Guards: `PermissionsGuard`, `RolesGuard`, `@RequirePermissions()`.
  * **Frontend**:
    * [`SellerStaffPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerStaffPage.jsx): Giao diện danh sách nhân sự, form cấp tài khoản, cấu hình ma trận quyền.
    * [`SellerSidebar.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/components/layout/SellerSidebar.jsx): Bộ lọc menu thông minh tự động ẩn mục không có quyền.
    * `web/src/ui/utils/permissions.ts`: Hằng số 10 mã quyền và hàm kiểm tra `can(permission, businessId, user)`.
    * [`RouteGuards.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/components/auth/RouteGuards.jsx): Bảo vệ URL trực tiếp, render màn hình 403 Forbidden.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 3
                                           │
    ┌────────────────┬─────────────────────┼─────────────────────┬────────────────┐
    ▼                ▼                     ▼                     ▼                ▼
 PHẦN 1:          PHẦN 2:               PHẦN 3:               PHẦN 4:          PHẦN 5:
DATABASE &       FRONTEND UTILS &      SMART SIDEBAR         STAFF MANAGEMENT INTEGRATION &
BACKEND APIS     ROUTE GUARDS (403)    FILTERING             UI & PERMISSION  KIỂM THỬ E2E
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & BACKEND APIS PHÂN QUYỀN

### 📌 Mục tiêu:
Xây dựng bảng liên kết `business_members`, định nghĩa các mã quyền và phát triển 4 endpoint API phục vụ cho việc cấp tài khoản, cập nhật quyền và khóa tài khoản nhân viên.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Hoàn thiện Schema Prisma Bảng `business_members`**
  * Định nghĩa các trường:
    * `id` (UUID, Primary Key).
    * `business_id` (UUID, Foreign Key liên kết `businesses`).
    * `user_id` (UUID, Foreign Key liên kết `users`).
    * `role` (Enum: `OWNER`, `MANAGER`, `STAFF`).
    * `permissions` (Array String / Text[]: Lưu danh sách các mã quyền như `['ORDER_VIEW', 'ORDER_PROCESS']`).
    * `status` (Enum: `ACTIVE`, `INACTIVE`).
    * `created_at`, `updated_at` (Timestamps).

* **Task 1.2: API Lấy Danh Sách Nhân Viên Gian Hàng**
  * **Endpoint**: `GET /api/v1/business/:bizId/staff`
  * **Header**: `Authorization: Bearer <token>`
  * **Xử lý Logic**: Lấy danh sách thành viên thuộc `business_id`, join với bảng `users` để lấy thông tin Email, Họ tên, SĐT, Avatar và danh sách quyền hạn đã cấp.

* **Task 1.3: API Khởi Tạo Tài Khoản Nhân Viên Mới (Provisioning)**
  * **Endpoint**: `POST /api/v1/business/:bizId/staff/provision`
  * **Body**: `{ "email": "nv.donhang@gmail.com", "fullName": "Nguyen Van Dat", "password": "...", "permissions": ["ORDER_VIEW", "ORDER_PROCESS"] }`
  * **Xử lý Logic (Transaction)**:
    1. Kiểm tra quyền của người gọi API: Bắt buộc phải là `OWNER` hoặc có quyền `MEMBER_MANAGE`.
    2. Gọi `identity-service` tạo bản ghi User mới với `role = 'STAFF'`.
    3. Tạo bản ghi `business_members` liên kết `businessId` và `userId` vừa tạo, gán mảng `permissions`.
    4. Trả về `201 Created` kèm thông tin nhân sự mới.

* **Task 1.4: API Cập Nhật Quyền Hạn & Khóa Nhân Viên**
  * **Endpoint**: `PATCH /api/v1/business/:bizId/staff/:memberId/permissions` & `PATCH /api/v1/business/:bizId/staff/:memberId/status`
  * **Xử lý Logic**: Cập nhật mảng quyền hạn mới hoặc đổi trạng thái sang `INACTIVE` (khi nhân viên nghỉ việc).

* **Task 1.5: Xây dựng NestJS Guard Kiểm Tra Quyền (`PermissionsGuard`)**
  * Tạo Decorator `@RequirePermissions(PERMISSIONS.FINANCE_VIEW)`.
  * Middleware Guard trích xuất User Token và kiểm tra danh sách `permissions` trong DB. Nếu vi phạm &rarr; Trả về ngay mã lỗi HTTP `403 Forbidden`.

---

## PHẦN 2: XÂY DỰNG TIỆN ÍCH PHÂN QUYỀN FRONTEND & ROUTE GUARDS

### 📌 Mục tiêu:
Xây dựng hàm kiểm tra quyền trung tâm `can()` và thành phần bảo vệ đường dẫn trực tiếp (Route Guard) chặn đứng các hành vi vượt quyền.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: Hoàn thiện File Hằng Số & Hàm Kiểm Tra Quyền (`permissions.ts`)**
  * Định nghĩa bảng hằng số `PERMISSIONS`:
    ```typescript
    export const PERMISSIONS = {
      DASHBOARD_VIEW: 'DASHBOARD_VIEW',
      ORDER_VIEW: 'ORDER_VIEW',
      ORDER_PROCESS: 'ORDER_PROCESS',
      ORDER_CANCEL: 'ORDER_CANCEL',
      PRODUCT_VIEW: 'PRODUCT_VIEW',
      PRODUCT_CREATE: 'PRODUCT_CREATE',
      PRODUCT_UPDATE: 'PRODUCT_UPDATE',
      INVENTORY_UPDATE: 'INVENTORY_UPDATE',
      STORE_VIEW: 'STORE_VIEW',
      STORE_UPDATE: 'STORE_UPDATE',
      MEMBER_VIEW: 'MEMBER_VIEW',
      MEMBER_MANAGE: 'MEMBER_MANAGE',
      FINANCE_VIEW: 'FINANCE_VIEW',
    };
    ```
  * Xây dựng hàm kiểm tra trung tâm:
    ```typescript
    export function can(permission: string, businessId: string, user: any): boolean {
      if (!user) return false;
      // Chủ shop (OWNER) hoặc Super Admin có toàn quyền 100%
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'BUSINESS' || user.isOwner) return true;
      // Kiểm tra trong danh sách quyền của nhân viên
      const userPerms = user.permissions || user.member?.permissions || [];
      return userPerms.includes(permission);
    }
    ```

* **Task 2.2: Xây dựng Màn Hình Thông Báo Lỗi 403 Forbidden Trang Trọng**
  * Tạo component hiển thị khi bị chặn truy cập:
    * Icon ổ khóa bảo mật màu vàng hổ phách lớn ở giữa màn hình.
    * Tiêu đề: *"Không Có Quyền Truy Cập (403 Forbidden)"*.
    * Mô tả: *"Tài khoản nhân viên của bạn chưa được cấp quyền truy cập tính năng này. Vui lòng liên hệ Chủ gian hàng để được phân quyền."*
    * Nút *"Quay lại Bảng Điều Khiển"* (`/seller/dashboard`).

---

## PHẦN 3: TỐI ƯU HÓA BỘ LỌC MENU SIDEBAR THÔNG MINH (`SellerSidebar.jsx`)

### 📌 Mục tiêu:
Đảm bảo Sidebar chỉ hiển thị đúng các chức năng mà nhân viên được giao; ẩn triệt để các mục không có quyền (không hiển thị mờ, ẩn hoàn toàn).

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: Áp Dụng Bộ Lọc Quyền Vào Cấu Trúc Menu**
  * Gán mã quyền `permission` tương ứng cho từng menu item trong `SellerSidebar.jsx`:
    * Menu *Tất Cả Đơn Hàng* &rarr; `PERMISSIONS.ORDER_VIEW`.
    * Menu *Danh Mục Sản Phẩm* &rarr; `PERMISSIONS.PRODUCT_VIEW`.
    * Menu *Ví & Doanh Thu* &rarr; `PERMISSIONS.FINANCE_VIEW`.
    * Menu *Hồ Sơ Doanh Nghiệp* &rarr; `PERMISSIONS.STORE_VIEW`.
    * Menu *Danh Sách Nhân Viên* &rarr; `PERMISSIONS.MEMBER_VIEW`.
    * Menu *Quản Trị Phân Quyền* &rarr; `PERMISSIONS.MEMBER_MANAGE`.

* **Task 3.2: Cơ Chế Tự Động Ẩn Nhóm Menu Rỗng**
  * Sử dụng logic lọc 2 tầng:
    ```javascript
    const visibleMenuGroups = menuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.permission) {
            return can(item.permission, currentBizId, user);
          }
          return true;
        }),
      }))
      .filter((group) => group.items.length > 0); // Ẩn nhóm nếu không còn item nào
    ```
  * *Kết quả*: Nếu nhân viên không có quyền `FINANCE_VIEW` &rarr; Cả nhóm tiêu đề *"TÀI CHÍNH & DOANH THU"* tự động biến mất khỏi Sidebar.

---

## PHẦN 4: XÂY DỰNG MÀN HÌNH QUẢN TRỊ NHÂN SỰ (`SellerStaffPage.jsx`)

### 📌 Mục tiêu:
Cung cấp giao diện quản trị nhân sự trực quan cho Chủ shop: xem danh sách nhân viên, gán quyền nhanh theo mẫu hoặc tùy chỉnh chi tiết, và khóa tài khoản khi cần.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Bảng Danh Sách Nhân Sự Nội Bộ**
  * Hiển thị danh sách nhân viên dạng thẻ hoặc bảng: Avatar, Họ tên, Email, Chức vụ, Huy hiệu trạng thái (`ACTIVE / INACTIVE`).
  * Danh sách các tag quyền hạn nhỏ gọn (ví dụ: `[Đơn hàng]`, `[Kho sách]`).
  * Các nút hành động: *"Sửa quyền"*, *"Khóa tài khoản"*.

* **Task 4.2: Modal Khởi Tạo & Phân Quyền Nhân Sự Mới**
  * Form nhập liệu: Email, Họ tên, SĐT, Mật khẩu khởi tạo.
  * **Bộ chọn vai trò mẫu (Role Presets)**:
    * Nút *"Nhân viên Xử lý Đơn hàng"*: Tự động tick các quyền về đơn hàng.
    * Nút *"Nhân viên Quản lý Kho"*: Tự động tick các quyền về sản phẩm và tồn kho.
    * Nút *"Quản lý Cửa hàng"*: Tự động tick toàn bộ trừ quyền Ví tài chính.
  * **Ma trận hộp chọn (Checkbox Matrix)**: Cho phép Chủ shop tick chọn chi tiết từng quyền riêng lẻ.

* **Task 4.3: Hộp Thoại Khóa / Mở Khóa Tài Khoản Nhân Viên**
  * Popup xác nhận: *"Bạn có chắc chắn muốn tạm khóa tài khoản của nhân viên [Họ Tên]? Nhân viên này sẽ bị đăng xuất và không thể truy cập gian hàng."*

---

## PHẦN 5: TÍCH HỢP E2E & KỊCH BẢN KIỂM THỬ NGHIỆM THU

### 📌 Mục tiêu:
Kiểm thử toàn diện các kịch bản đăng nhập thực tế giữa Chủ shop (Owner) và các loại tài khoản nhân viên khác nhau.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Kịch bản Kiểm thử Chủ Gian Hàng (`OWNER`)**
  * Đăng nhập tài khoản Chủ shop &rarr; Hiển thị đầy đủ tất cả các menu, vào được trang Ví, xem được doanh thu, rút được tiền mã PIN 6 số, tạo và sửa nhân viên bình thường.

* **Task 5.2: Kịch bản Kiểm thử Nhân Viên Đơn Hàng (`ORDER_STAFF`)**
  * Đăng nhập tài khoản nhân viên đơn hàng:
    * Sidebar chỉ thấy nhóm Đơn hàng.
    * Mục Ví & Doanh thu bị ẩn hoàn toàn.
    * Thử gõ link `/seller/finance` trên trình duyệt &rarr; Nhận ngay màn hình **403 Forbidden**.

* **Task 5.3: Kịch bản Kiểm thử Khóa Tài Khoản**
  * Chủ shop bấm khóa nhân viên &rarr; Tài khoản nhân viên lập tức bị chặn đăng nhập và thu hồi phiên làm việc.

---

## III. BẢNG TIẾN ĐỘ THỰC HIỆN (TIMELINE & MILESTONES)

| Giai Đoạn | Đầu Việc Chính | Output Cần Đạt | Thời Gian |
|---|---|---|:---:|
| **Giai đoạn 1** | Schema DB & Backend APIs RBAC | 4 Endpoint API, Middleware Guard NestJS | 1.0 ngày |
| **Giai đoạn 2** | Frontend Permissions Utils & Màn hình 403 | Hàm `can()`, RouteGuards, Màn hình 403 Lock | 0.5 ngày |
| **Giai đoạn 3** | Tối ưu hóa Bộ lọc Smart Sidebar | Sidebar ẩn 100% mục không có quyền | 0.5 ngày |
| **Giai đoạn 4** | Xây dựng Giao diện Staff Management | Bảng nhân sự, Modal ma trận quyền, Preset roles | 1.0 ngày |
| **Giai đoạn 5** | Tích hợp E2E & Kiểm thử 6 Test Cases | Phân quyền chính xác 100%, Pass 6 Test Cases | 0.5 ngày |
| **Tổng cộng** | **Toàn bộ Luồng 3 Hoàn Chỉnh** | **Nghiệm thu 6/6 Test Cases Pass 100%** | **3.5 ngày làm việc** |

---

## IV. TIÊU CHÍ NGHIỆM THU CUỐI CÙNG (DEFINITION OF DONE)

1. ✅ Chủ gian hàng có toàn quyền tạo mới, chỉnh sửa quyền và khóa tài khoản nhân sự.
2. ✅ Cơ chế lọc Sidebar tự động ẩn hoàn toàn các mục menu không có quyền (không hiển thị mờ).
3. ✅ Cơ chế Route Guard chặn đứng các hành vi gõ link URL trực tiếp bằng màn hình thông báo 403 Forbidden chuẩn mực.
4. ✅ Backend API kiểm tra token và cờ quyền nghiêm ngặt trước khi thực thi lệnh.
5. ✅ Trang Ví tài chính (`/seller/finance`) và thao tác Rút tiền được bảo vệ độc quyền cho Chủ gian hàng (`OWNER`).
