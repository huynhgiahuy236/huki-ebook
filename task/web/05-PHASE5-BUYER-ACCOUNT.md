# Phase 05 — Buyer Account & Orders

**Persona:** User/Buyer
**Status:** `✅ DONE` — Đã tách biệt và hoàn thiện OrdersPage & OrderDetailPage, form cập nhật hồ sơ inline, bảo mật phân quyền RBAC đa người dùng và kiểm thử E2E 9/9 bước đạt 100%.

## Sprint 17 — Account tối thiểu

- [x] ✅ Account overview/profile (`ProfilePage.jsx`, `userApi.getProfile`, `userApi.updateProfile`).
- [x] ✅ Address CRUD (`UserAddressesPage.jsx`, `addressApi`).
- [x] ✅ Chỉnh sửa thông tin cá nhân inline (Họ tên, Số điện thoại) cập nhật tức thì `AuthContext` và Toast đổi màu theo Theme Palette.
- [x] ✅ Chỉ đọc/sửa dữ liệu của chính user được xác thực qua JWT Token.

## Sprint 18 — Buyer orders

- [x] ✅ Order list thật (`OrdersPage.jsx` tại `/orders`, `orderApi.getBuyerOrders`): Bộ lọc Tab (Tất cả, Đang xử lý, Đang giao, Hoàn tất, Đã hủy), tìm kiếm theo mã đơn / tên sách, phân trang.
- [x] ✅ Order detail thật (`OrderDetailPage.jsx` tại `/orders/:id`, `orderApi.getBuyerOrderDetail`).
- [x] ✅ Visual Horizontal Status Stepper tiến trình giao hàng trực quan 5 bước (`Đặt hàng` ➔ `Tiếp nhận` ➔ `Đóng gói` ➔ `Vận chuyển` ➔ `Hoàn tất`) cùng dải kết nối đổi màu tự động theo tiến độ thực.
- [x] ✅ Internal order history audit log (`orderApi.getOrderTracking`) hiển thị chi tiết thời gian và tác nhân thay đổi trạng thái.
- [x] ✅ Xử lý đầy đủ Empty/loading skeleton/error/not-found thân thiện.

## Sprint 19 — Order authorization

- [x] ✅ Bảo mật phân quyền: User khác (Buyer B) bị chặn an toàn (`404 ORDER_NOT_FOUND`) khi cố tình truy cập đơn của Buyer A.
- [x] ✅ Không làm sập trang khi truy cập ID đơn hàng không hợp lệ, hiển thị màn hình *Không Tìm Thấy Đơn Hàng* lịch thiệp.
- [x] ✅ Trạng thái Buyer thấy khớp 100% trạng thái Seller cập nhật theo thời gian thực.
- [x] ✅ Routing thông minh: `RequireAuth` tự động lưu `state: { from: location }` và đưa người dùng trở lại đúng trang sau khi đăng nhập.

## Sprint 20 — E2E

- [x] ✅ Checkout success deep-link trực tiếp vào `/orders/:id` (hoặc fallback `/orders`).
- [x] ✅ Refresh trang F5 vẫn tải đầy đủ dữ liệu từ Backend Gateway `:3000`.
- [x] ✅ Layout chuẩn `max-w-7xl`, responsive đầy đủ trên Mobile, Tablet và Desktop.
- [x] ✅ Kịch bản kiểm thử tự động toàn diện (`scripts/e2e-phase5-buyer-account.mjs`).

## Verification evidence 2026-09-14

- **Frontend Build & Typecheck**: `npm run typecheck` (`tsc --noEmit`) đạt **0 errors**; `npm run build` thành công 100%.
- **Token Storage**: Hoạt động hoàn hảo trên nền tảng **Pure Cookies** (`huki_access_token`, `huki_refresh_token`).
- **E2E Runtime Verification (`scripts/e2e-phase5-buyer-account.mjs`)**: Đạt **9/9 bước (100% PASS)** trên Backend Gateway (`:3000`) và Frontend Web (`:3100`):
  1. `[Step 0]` Service Live Check (Frontend `:3100` & Gateway `:3000`) $\rightarrow$ **PASS**.
  2. `[Step 1]` Buyer Login & Profile Data Verification (`GET /users/profile`) $\rightarrow$ **PASS**.
  3. `[Step 2]` Buyer Inline Profile Update Test (`PATCH /users/profile`) $\rightarrow$ **PASS**.
  4. `[Step 3]` Cart & COD Checkout Confirmation $\rightarrow$ **PASS**.
  5. `[Step 4]` Buyer Order List Lookup (`GET /orders`) $\rightarrow$ **PASS**.
  6. `[Step 5]` Buyer Order Details Initial Timeline (`GET /orders/:id`) $\rightarrow$ **PASS**.
  7. `[Step 6]` Seller Fulfillment State Transitions (`CONFIRMED` $\rightarrow$ `PREPARING` $\rightarrow$ `SHIPPED` $\rightarrow$ `COMPLETED`) $\rightarrow$ **PASS**.
  8. `[Step 7]` Buyer Timeline & Status Audit Synchronization $\rightarrow$ **PASS**.
  9. `[Step 8]` Cross-buyer Security & RBAC Isolation Test (Chặn Buyer B truy cập đơn Buyer A) $\rightarrow$ **PASS**.

## Deferred

`⚪ DEFERRED`: carrier tracking webhook trực tiếp từ bên thứ 3, quy trình đổi trả hoàn tiền (refund/return) tự động, đánh giá sách sau mua (review feed), trung tâm thông báo đẩy.

## Phase DoD

Buyer xem được danh sách, chi tiết và lịch sử nội bộ của đơn COD vừa tạo; ownership/RBAC được backend kiểm tra chặt chẽ; cập nhật thông tin cá nhân mượt mà; toàn bộ luồng đạt chuẩn E2E 100%.
