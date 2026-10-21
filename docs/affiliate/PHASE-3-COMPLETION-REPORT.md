# Báo Cáo Nghiệm Thu Giai Đoạn 3: Registration & Admin Review End-to-End

> **Dự án:** HuKi E-Commerce Platform — Hệ Thống Tiếp Thị Liên Kết (Affiliate Marketing)  
> **Thời điểm hoàn thành:** 2026-10-21  
> **Trạng thái:** Hoàn tất, 100% test pass, sẵn sàng cho Giai đoạn 4 (Attribution Engine & Cookie Lifecycle).

---

## 1. Tóm Tắt Kết Quả Triển Khai Giai Đoạn 3

Giai đoạn 3 đã hoàn thành toàn bộ luồng đăng ký đối tác (Registration Wizard), thẩm định mã affiliate, tra cứu tiến độ hồ sơ (Application Status), và hệ thống kiểm duyệt quản trị (Admin Review Portal) theo đúng hợp đồng UX Contract v1.4.0 và 3 quyết định kiến trúc đã khóa với chủ dự án.

### 1.1 Các Quyết Định Kiến Trúc Đã Khóa & Hiện Thực
1. **Quy tắc Resubmit (Tối đa 3 lần):** Khi admin chọn `REQUEST_CHANGES`, đối tác được phép bổ sung/nộp lại tối đa 3 lần (`resubmitCount <= 3`). Nếu vượt quá 3 lần mà không đạt, hệ thống tự động chuyển trạng thái `REJECTED` với thời gian chờ 14 ngày.
2. **Quy tắc Cooldown (Làm mát 14 ngày):** Khi hồ sơ chuyển sang `REJECTED`, hệ thống thiết lập `cooldownUntil = now() + 14 ngày`. Trong thời gian này, đối tác không được nộp lại đơn nhằm chống spam tài nguyên và bảo vệ hàng đợi kiểm duyệt.
3. **Outbox & Notification Event:** Mọi hành vi nộp đơn, nộp lại, phê duyệt, yêu cầu sửa, từ chối, tạm ngưng và kích hoạt đều đồng thời phát sinh thông báo nội bộ qua bảng `Notification` và phát sự kiện `OutboxEvent` (với topic `affiliate.application.*`) để tích hợp thời gian thực.

---

## 2. Các Thành Phần Backend Đã Hiện Thực (Platform)

### 2.1 Mở Rộng Schema & Migration (`commerce-service`)
- Đã bổ sung 2 trường vào bảng `affiliate_profiles`:
  - `resubmitCount`: kiểu `Int`, giá trị mặc định `0`, lưu trữ số lần đã nộp lại.
  - `cooldownUntil`: kiểu `DateTime?`, lưu mốc thời gian hết hạn làm mát 14 ngày.
- Đã cập nhật và deploy migration vào cơ sở dữ liệu PostgreSQL `huki_commerce`.

### 2.2 DTOs Chuẩn Hóa Với class-validator
- Vị trí: `platform/apps/commerce-service/src/modules/affiliate/dto/affiliate-application.dto.ts`
- Các DTO kiểm soát chặt chẽ:
  - `CheckCodeAvailabilityDto`: Kiểm tra định dạng Regex `/^[A-Z0-9_]{4,24}$/`.
  - `AffiliateChannelDto`: Kiểm tra loại kênh enum, URL định dạng HTTPS tên miền hợp lệ, canonical URL, khoảng người theo dõi.
  - `CreateAffiliateApplicationDto`: Kiểm tra 4 bước đăng ký (họ tên, email, phone, bio, danh sách kênh, chủ đề nội dung, phương thức tiếp thị, lưu lượng trả phí, điều khoản & marketing consent).
  - `ResubmitAffiliateApplicationDto`: DTO cho luồng cập nhật bổ sung khi ở trạng thái `REQUEST_CHANGES`.
  - `AdminReviewApplicationDto`: Lý do thẩm định bắt buộc cho các hành vi từ chối hoặc yêu cầu sửa.

### 2.3 Application & Review Service (`AffiliateApplicationService`)
- Vị trí: `platform/apps/commerce-service/src/modules/affiliate/services/affiliate-application.service.ts`
- **Hàm nghiệp vụ người dùng:**
  - `checkCodeAvailability(code)`: Kiểm tra từ khóa bảo lưu hệ thống (`ADMIN`, `HUKI`, `ROOT`, `SUPPORT`, `AFFILIATE`, ...), kiểm tra trùng lặp không phân biệt hoa thường.
  - `getMyProfile(userId)`: Trả về trạng thái hồ sơ kèm cờ `isCoolingDown`, `cooldownRemainingMs`, `canResubmit`, `remainingResubmits`.
  - `submitApplication(userId, dto)`: Chặn trùng kênh quảng bá trong cùng hồ sơ, chặn hồ sơ đang trong thời gian làm mát 14 ngày, ghi nhận consent, sinh notification và outbox event.
  - `resubmitApplication(userId, dto)`: Tăng biến đếm `resubmitCount`, chuyển về `PENDING_REVIEW`, tự động reject nếu quá 3 lần.
- **Hàm nghiệp vụ Ban Quản Trị:**
  - `adminListApplications({ status, search, page, limit })`: Phân trang, lọc theo trạng thái và tìm kiếm.
  - `adminGetApplicationDetail(id)`: Lấy đầy đủ thông tin định danh, kênh phân phối, chi tiết lưu lượng và lịch sử audit log.
  - `adminApprove(id, actorId)`: Phê duyệt hồ sơ chuyển sang `ACTIVE`, tự động mở ví `AffiliateWallet`, ghi nhận audit log và gửi thông báo.
  - `adminRequestChanges(id, actorId, reason)`: Chuyển trạng thái sang `REQUEST_CHANGES`, lưu lý do và ghi nhận audit log.
  - `adminReject(id, actorId, reason)`: Chuyển trạng thái sang `REJECTED`, kích hoạt thời gian làm mát 14 ngày (`cooldownUntil`).
  - `adminSuspend(id, actorId, reason)`: Tạm ngưng tài khoản `ACTIVE`.
  - `adminActivate(id, actorId)`: Mở lại tài khoản bị `SUSPENDED`.

### 2.4 Controllers & Routing
- User Controller: `platform/apps/commerce-service/src/modules/affiliate/controllers/affiliate.controller.ts`
  - `GET /affiliate/program` (Public)
  - `GET /affiliate/code-availability` (Public)
  - `GET /affiliate/me` (Authenticated)
  - `POST /affiliate/applications` (Authenticated)
  - `POST /affiliate/me/resubmit` (Authenticated)
- Admin Controller: `platform/apps/commerce-service/src/modules/affiliate/controllers/affiliate-admin.controller.ts`
  - `GET /admin/affiliates`
  - `GET /admin/affiliates/:id`
  - `POST /admin/affiliates/:id/approve`
  - `POST /admin/affiliates/:id/request-changes`
  - `POST /admin/affiliates/:id/reject`
  - `POST /admin/affiliates/:id/suspend`
  - `POST /admin/affiliates/:id/activate`
- API Gateway:
  - Cập nhật `ROUTES` ánh xạ `/affiliate` và `/admin/affiliates` sang `commerce`.
  - Cập nhật `route-classification.ts` đánh dấu `/affiliate/program` và `/affiliate/code-availability` là `PUBLIC`.

---

## 3. Các Thành Phần Frontend Đã Hiện Thực (Web)

### 3.1 Client API Helper (`affiliateApi.ts`)
- Vị trí: `web/src/lib/affiliate/affiliateApi.ts`
- Cung cấp đầy đủ hàm gọi API có kiểu dữ liệu TypeScript nghiêm ngặt, tự động inject Bearer token, correlation ID và xử lý token refresh.

### 3.2 Registration Wizard (`/account/affiliate/register`)
- Vị trí: `web/src/app/account/affiliate/register/page.tsx`
- **Tính năng trực tiếp trên runtime:**
  - Kiểm tra tính khả dụng của mã Affiliate trực tiếp: Khi nhập mã, debounce 400ms gọi `affiliateApi.checkCodeAvailability` và hiển thị phản hồi trực quan (mã hợp lệ / đã sử dụng / bảo lưu).
  - Tự động nhận diện hồ sơ hiện có: Cảnh báo thời gian làm mát (14 ngày) nếu hồ sơ trước đó bị từ chối, hoặc chuyển hướng đến trang tiến độ nếu đã có hồ sơ đang xử lý.
  - Nộp đơn trực tiếp ở Bước 4: Nút "Nộp Hồ Sơ Đăng Ký" kích hoạt gửi dữ liệu đến backend khi toàn bộ 4 bước hợp lệ; nhận diện mã lỗi trả về để đánh dấu trường tương ứng.

### 3.3 Application Status Page (`/account/affiliate/application`)
- Vị trí: `web/src/app/account/affiliate/application/page.tsx`
- **Xử lý toàn diện 6 trạng thái nghiệp vụ:**
  1. *Chưa đăng nhập:* Hiển thị thông báo yêu cầu đăng nhập và nút chuyển hướng đến trang login.
  2. *Chưa có hồ sơ:* Hiển thị thẻ giới thiệu quyền lợi và nút dẫn đến trang đăng ký `/account/affiliate/register`.
  3. *PENDING_REVIEW:* Hiển thị timeline tiến trình 3 bước (SLA 24h - 48h), mã dự kiến và thông tin kênh đã khai báo.
  4. *REQUEST_CHANGES:* Hiển thị lý do từ ban quản trị, đếm số lần còn lại (`X / 3 lần`) và modal cho phép chỉnh sửa bổ sung để nộp lại trực tiếp.
  5. *REJECTED:* Hiển thị lý do từ chối và đồng hồ đếm ngược thời gian làm mát 14 ngày (`cooldownUntil`).
  6. *ACTIVE:* Hiển thị mã CTV chính thức, bảng tỷ lệ hoa hồng (Sách giấy 5%, Sách điện tử 15%, Sách nói 10%) và nút điều hướng đến Dashboard.
  7. *SUSPENDED:* Hiển thị thông báo tạm ngưng và hướng dẫn liên hệ ban quản trị.

### 3.4 Admin Review Management View (`/admin/affiliates`)
- Vị trí:
  - `web/src/ui/components/admin/AdminAffiliatesView.tsx`
  - `web/src/app/admin/affiliates/page.tsx`
- **Tính năng hoàn chỉnh:**
  - Bộ lọc tab trạng thái: *Tất cả*, *Chờ duyệt*, *Yêu cầu sửa*, *Đang hoạt động*, *Từ chối*, *Tạm ngưng*.
  - Ô tìm kiếm theo tên, mã đối tác, email.
  - Bảng danh sách đối tác hiển thị đầy đủ avatar, loại hình, số kênh phân phối, thông tin liên hệ và ngày nộp.
  - Modal chi tiết & phê duyệt: Hiển thị đầy đủ 4 phần (Định danh, Kênh phân phối, Hình thức & lưu lượng, Lịch sử kiểm toán Audit Log).
  - Thao tác quản trị theo trạng thái: Phê duyệt, Yêu cầu bổ sung (kèm lý do), Từ chối (kèm lý do), Tạm ngưng, Kích hoạt lại.
  - Đã gắn liên kết vào thanh điều hướng bên trái của `AdminLayout` dưới mục *TIẾP THỊ & TRUYỀN THÔNG*.

---

## 4. Minh Chứng Kiểm Thử Kỹ Thuật (Test Evidence)

| Bộ Kiểm Thử | Công Cụ | Số Lượng Suite / Test | Kết Quả | Ghi Chú |
| :--- | :---: | :---: | :---: | :--- |
| **Frontend Unit & Zod** | Vitest | 5 suites / 41 tests | **PASS (100%)** | Bao gồm 19 test Zod contract, apiClient, CartContext, tokenStorage |
| **Playwright E2E** | Playwright | 1 suite / 10 tests | **PASS (100%)** | Bao gồm Landing, Wizard 4 bước, live code check, Admin view, Responsive 390x844 |
| **Commerce Service Unit** | Jest | 29 suites / 353 tests | **PASS (100%)** | Bao gồm 15 test registration + 13 test foundation + toàn bộ ledger, wallet, orders |
| **API Gateway Routing** | Jest | 2 suites / 26 tests | **PASS (100%)** | Kiểm tra proxy middleware, phân loại public/admin route |
| **TypeScript Typecheck** | `tsc --noEmit` | Web & Platform | **PASS (0 errors)**| Không có lỗi kiểu dữ liệu ở cả 2 workspace |

---

## 5. Kết Luận & Đề Xuất Tiếp Theo

Giai đoạn 3 đã hoàn tất trọn vẹn, đáp ứng tiêu chuẩn sản xuất (production-ready) với 0% dữ liệu giả lập và 100% kết nối backend thật qua API Gateway.

Hệ thống đã sẵn sàng cho **Giai đoạn 4: Attribution Engine, Nonce Verification & Cookie Lifecycle**.
