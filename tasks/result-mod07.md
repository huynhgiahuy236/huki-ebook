# Báo Cáo Kết Quả Xử Lý Lỗi (Resolution Report) - Module 07: Báo Cáo Kiểm Thử An Ninh & Phân Quyền Toàn Hệ Thống (Security & Access Audit)

> **Thông tin phiên làm việc:**
> - Ngày hoàn thành: 04/11/2026
> - Phạm vi: Toàn bộ 8/8 lỗi trong file `tasks/bug-mod07.md`
> - Môi trường kiểm thử: Microservices Backend (`api-gateway`, `identity-service`, `commerce-service`), Jest Unit & Integration Test Suites, Multi-tenant Isolation Verification.
> - Cam kết tuân thủ: File gốc `tasks/bug-mod07.md` được giữ nguyên vẹn 100%, không bị sửa đổi hay ghi đè.

---

## 📊 BẢNG TỔNG HỢP TRẠNG THÁI 8 LỖI MODULE 07

| Mã Bug | Mức Độ | Vị Trí / Microservice | Hiện Tượng Gốc | Trạng Thái Sau Xử Lý | Bằng Chứng Kiểm Thử & File Sửa |
| :---: | :---: | :--- | :--- | :---: | :--- |
| **BUG-MOD07-01** | **P0** | `identity-service` & `api-gateway` | API tắt chế độ bảo trì `POST /api/v1/system/maintenance` mở `@Public()`, cho phép người ngoài tắt bảo trì sàn | **ĐÃ GIẢI QUYẾT** | Loại bỏ decorator `@Public()`, trang bị `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles('PLATFORM_ADMIN')` trong `maintenance.controller.ts`. Đồng thời Gateway phân loại tuyến non-GET `/system/maintenance` vào bậc `ADMIN`. |
| **BUG-MOD07-02** | **P0** | `commerce-service` (`shipper-orders.controller.ts`, `orders.service.ts`) | API giao vận sử dụng `OptionalBookAuthGuard`, lộ lọt PII khách hàng và cho phép giả lập nộp tiền COD | **ĐÃ GIẢI QUYẾT** | Tạo mới `ShipperGuard` (`DELIVERY_STAFF`, `SHIPPER`, `PLATFORM_ADMIN`, `ADMIN`) áp dụng cho toàn bộ `ShipperOrdersController`. Bổ sung xác minh phân quyền theo `actor` trong `OrdersService.shipperListOrders` và `shipperRemitCod`. |
| **BUG-MOD07-03** | **P0** | `commerce-service` (`seller-affiliate.controller.ts`) | IDOR tại cấu hình hoa hồng tiếp thị liên kết: bất kỳ ai cũng có thể sửa tỷ lệ hoa hồng hoặc đọc báo cáo doanh thu gian hàng khác | **ĐÃ GIẢI QUYẾT** | Trang bị `@UseGuards(AuthenticatedGuard)` cấp controller, cài đặt hàm kiểm tra quyền sở hữu `assertStoreAccess` kết hợp `getSellerScope(actor)` cho toàn bộ 8 endpoints cấu hình, sách, báo cáo và dashboard. |
| **BUG-MOD07-04** | **P0** | `api-gateway` & `identity-service` | Thiếu Rate Limiting & chống brute-force đăng nhập; gửi 30-50 request/giây ép server băm bcrypt gây CPU DoS | **ĐÃ GIẢI QUYẾT** | Áp dụng `@Throttle({ default: { limit: 5, ttl: 60_000 } })` trên `@Post('login')` và `@Post('register')` của `AuthController`. Tích hợp bộ đệm sliding window 5 req/60s trả mã HTTP 429 kèm `Retry-After: 60` tại `ServiceProxyMiddleware`, chuyển tiếp `x-forwarded-for` chính xác. |
| **BUG-MOD07-05** | **P1** | `commerce-service` (`sanctions.controller.ts`) | Thứ tự Guard & ValidationPipe sai quy chuẩn: gửi payload rỗng `{}` trả về HTTP 400 thay vì HTTP 403 Forbidden | **ĐÃ GIẢI QUYẾT** | Đưa `PlatformAdminGuard` vào decorator `@UseGuards(PlatformAdminGuard)` trên `createSanction`, `getAppeals`, `liftSanction` và `reviewAppeal`. Guard chạy trước ValidationPipe của NestJS, lập tức trả về 403 Forbidden nếu không phải Admin. |
| **BUG-MOD07-06** | **P0** | `commerce-service` (`wallet-security.service.ts`) | IDOR bảo mật ví: khách mua hàng (`USER`) gửi mã PIN sai 5 lần làm khóa chức năng rút tiền của nạn nhân (DoS ví) | **ĐÃ GIẢI QUYẾT** | Tái cấu trúc `validateActorStoreAccess` kiểm tra nghiêm ngặt vai trò (`STORE_OWNER`, `BUSINESS`, `SELLER`, `BUSINESS_STAFF`, `ADMIN`), xác thực `storeId` qua `getSellerScope(actor)`, loại trừ hoàn toàn các tài khoản Buyer/User lạ. Suite 26 tests + test mới 21b pass 100%. |
| **BUG-MOD07-07** | **P0** | `commerce-service` (`payout.service.ts`) | IDOR lộ lọt lịch sử rút tiền & số tài khoản ngân hàng của gian hàng do logic `actorStoreId && actorStoreId !== storeId` | **ĐÃ GIẢI QUYẾT** | Sửa `PayoutService.validateActorStoreAccess` bắt buộc vai trò đối tác kinh doanh và kiểm tra sở hữu store qua `getSellerScope(actor)`. Suite 28 tests + test mới 19b pass 100%. |
| **BUG-MOD07-08** | **P1** | `api-gateway` (`route-classification.ts`) | Gateway bỏ sót phân loại ADMIN với các route quản trị thứ cấp (`/wallet/admin/*`, `/payout/admin/*`, `/sanctions/*`) | **ĐÃ GIẢI QUYẾT** | Mở rộng quy tắc nhận diện trong `classifyRoute`: kiểm tra `normPath.includes('/admin/')`, `normPath.endsWith('/admin')`, `normPath.startsWith('/sanctions')`, `/wallet/admin`, `/payout/admin` xếp vào bậc `'ADMIN'`. Test Jest 9/9 pass. |

---

## 🛠️ CHI TIẾT SỬA ĐỔI KỸ THUẬT TỪNG LỖI

### 1. [BUG-MOD07-01] Bảo Vệ API Cấu Hình Chế Độ Bảo Trì Hệ Thống
- **Nguyên nhân gốc rễ:** 
  - Tại `platform/apps/identity-service/src/modules/maintenance/maintenance.controller.ts`, phương thức `updateConfig` được đánh dấu decorator `@Public()`, cho phép bất kỳ ai gửi request `POST /api/v1/system/maintenance` thay đổi cấu hình bảo trì của toàn bộ hệ thống mà không cần đăng nhập.
  - Tại API Gateway `route-classification.ts`, đường dẫn `/system/maintenance` rơi vào bậc phân loại mặc định mà không bị chặn lại ở lớp cửa ngõ.
- **Giải pháp:**
  - File: `platform/apps/identity-service/src/modules/maintenance/maintenance.controller.ts`
    - Xóa bỏ decorator `@Public()`.
    - Thêm `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles('PLATFORM_ADMIN')`.
  - File: `platform/apps/api-gateway/src/modules/proxy/route-classification.ts`
    - Bổ sung quy tắc phân loại `(normPath.startsWith('/system/maintenance') && upperMethod !== 'GET') => 'ADMIN'`.
- **Kết quả:** Người dùng thông thường hoặc không có token khi gọi API thay đổi cấu hình bảo trì lập tức bị Gateway chặn với HTTP 401/403. Chỉ `PLATFORM_ADMIN` mới có quyền kích hoạt hoặc tắt chế độ bảo trì.

---

### 2. [BUG-MOD07-02] Ngăn Chặn Lộ PII Khách Hàng & Giả Lập Nộp Tiền COD
- **Nguyên nhân gốc rễ:** 
  - `ShipperOrdersController` dùng `@UseGuards(OptionalBookAuthGuard)`, khiến request không có Authorization Header vẫn được thông qua. Kẻ tấn công có thể xem danh sách đơn hàng chứa thông tin địa chỉ, số điện thoại, tên khách hàng (PII) và gọi API `POST /api/v1/orders/shipper/remit-cod` tạo thanh toán COD ảo.
- **Giải pháp:**
  - File: `platform/apps/commerce-service/src/common/book-auth.guard.ts`
    - Tạo mới `ShipperGuard` kiểm tra bắt buộc người gọi phải đăng nhập và có vai trò thuộc `['DELIVERY_STAFF', 'SHIPPER', 'PLATFORM_ADMIN', 'ADMIN']`.
    - Khai báo và export `ShipperGuard` trong `CommonModule`.
  - File: `platform/apps/commerce-service/src/modules/orders/shipper-orders.controller.ts`
    - Đổi `@UseGuards(OptionalBookAuthGuard)` sang `@UseGuards(ShipperGuard)`.
  - File: `platform/apps/commerce-service/src/modules/orders/orders.service.ts`
    - Trong `shipperListOrders` và `shipperRemitCod`, kiểm tra phân quyền `actor`:
      ```typescript
      const allowedRoles = ['DELIVERY_STAFF', 'SHIPPER', 'PLATFORM_ADMIN', 'ADMIN'];
      if (!actor || !allowedRoles.includes(actor.role)) {
        throw new ForbiddenException({
          code: 'FORBIDDEN_SHIPPER_ACCESS',
          message: 'Chỉ nhân viên giao hàng hoặc quản trị viên mới có quyền thực hiện thao tác này.',
        });
      }
      ```
      Và đối với nhân viên giao hàng, gán `shipperId = actor.sub` nhằm chống việc giả mạo mã nhân viên khác.
- **Kết quả:** Bảo vệ tuyệt đối thông tin cá nhân khách mua hàng, ngăn chặn hoàn toàn việc can thiệp dòng tiền COD.

---

### 3. [BUG-MOD07-03] Khắc Phục IDOR Cấu Hình Tiếp Thị Liên Kết Gian Hàng
- **Nguyên nhân gốc rễ:** 
  - `SellerAffiliateController` không có guard xác thực và lấy `storeId` trực tiếp từ URL/Body mà không đối chiếu với quyền sở hữu gian hàng của người gọi.
- **Giải pháp:**
  - File: `platform/apps/commerce-service/src/modules/affiliate/controllers/seller-affiliate.controller.ts`
    - Thêm `@UseGuards(AuthenticatedGuard)` tại cấp controller.
    - Xây dựng hàm kiểm tra quyền truy cập:
      ```typescript
      private async assertStoreAccess(storeId: string, actor: BookActor): Promise<void> {
        if (actor.role === 'PLATFORM_ADMIN' || actor.role === 'ADMIN') return;
        const allowedRoles = ['BUSINESS', 'SELLER', 'BUSINESS_OWNER', 'BUSINESS_STAFF'];
        if (!allowedRoles.includes(actor.role)) {
          throw new ForbiddenException({
            code: 'FORBIDDEN_STORE_ACCESS',
            message: 'Chỉ chủ gian hàng mới có quyền thao tác cấu hình tiếp thị liên kết.',
          });
        }
        const scope = await getSellerScope(actor);
        if (!scope.storeIds.includes(storeId)) {
          throw new ForbiddenException({
            code: 'FORBIDDEN_STORE_ACCESS',
            message: 'Bạn không có quyền thao tác trên gian hàng này.',
          });
        }
      }
      ```
    - Áp dụng `assertStoreAccess` cho toàn bộ 8 endpoints: `getStoreSettings`, `updateStoreSettings`, `listStoreBooks`, `updateBookSetting`, `bulkUpdateBooks`, `previewSellerNet`, `getSellerDashboard`, `exportSellerReport`.
- **Kết quả:** Ngăn chặn triệt để hành vi thao túng hoa hồng và đọc trộm doanh thu giữa các đối thủ cạnh tranh.

---

### 4. [BUG-MOD07-04] Triển Khai Rate Limiting & Chống Tấn Công Dò Mật Khẩu (Brute-Force)
- **Nguyên nhân gốc rễ:** 
  - API Gateway và Identity Service không áp dụng giới hạn tần suất trên `POST /api/v1/auth/login`. Kẻ tấn công có thể gửi hàng loạt yêu cầu đăng nhập song song để ép CPU tính toán thuật toán băm nặng `bcrypt.compare`.
- **Giải pháp:**
  - File: `platform/apps/identity-service/src/modules/auth/auth.controller.ts`
    - Thêm decorator `@Throttle({ default: { limit: 5, ttl: 60_000 } })` trên `@Post('login')` và `@Post('register')`.
  - File: `platform/apps/api-gateway/src/modules/proxy/service-proxy.middleware.ts`
    - Thêm cơ chế sliding window rate limiter theo IP người gọi:
      ```typescript
      if (req.method === 'POST' && req.originalUrl.includes('/auth/login')) {
        const clientIp = this.getClientIp(req);
        if (this.isRateLimited(clientIp, 5, 60_000)) {
          res.setHeader('Retry-After', '60');
          return res.status(429).json({
            status: 'error',
            statusCode: 429,
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 60 giây.',
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
          });
        }
      }
      ```
    - Thiết lập chuyển tiếp địa chỉ IP thực của khách (`x-forwarded-for`) từ Gateway xuống microservices hạ tầng.
- **Kết quả:** Khi vượt quá 5 lần thử đăng nhập trong 60 giây, hệ thống lập tức phản hồi mã lỗi HTTP 429 Too Many Requests kèm header `Retry-After: 60`, triệt tiêu nguy cơ CPU DoS.

---

### 5. [BUG-MOD07-05] Chuẩn Hóa Thứ Tự Guard & Validation Pipe Trên API Sanctions
- **Nguyên nhân gốc rễ:** 
  - Tại `SanctionsController`, logic kiểm tra vai trò `if (actor.role !== 'PLATFORM_ADMIN')` được đặt bên trong method body. Trong NestJS, `ValidationPipe` toàn cục chạy trước method body, nên khi gửi body không hợp lệ (ví dụ `{}`), hệ thống trả về mã 400 Validation Error thay vì 403 Forbidden.
- **Giải pháp:**
  - File: `platform/apps/commerce-service/src/modules/sanctions/sanctions.controller.ts`
    - Thêm decorator `@UseGuards(PlatformAdminGuard)` trên các endpoints quản trị:
      - `@Post()` (`createSanction`)
      - `@Get('appeals')` (`getAppeals`)
      - `@Post(':id/lift')` (`liftSanction`)
      - `@Post('appeals/:appealId/review')` (`reviewAppeal`)
- **Kết quả:** Guard chạy trước khi dữ liệu được chuyển qua ValidationPipe, đảm bảo bất kỳ người dùng không có quyền quản trị nào gửi request (dù payload hợp lệ hay không) đều nhận ngay mã lỗi HTTP 403 Forbidden.

---

### 6. [BUG-MOD07-06] Khắc Phục IDOR & Ngăn Chặn Khóa Mã PIN Ví Gian Hàng
- **Nguyên nhân gốc rễ:** 
  - Tại `WalletSecurityService.validateActorStoreAccess`, điều kiện kiểm tra quyền:
    ```typescript
    const actorStoreId = (actor as any).storeId;
    if (!isPlatformAdmin && actorStoreId && actorStoreId !== storeId) { ... }
    ```
    Nếu một người mua thông thường (`USER`) gọi API, `actorStoreId` là `undefined`, điều kiện cho kết quả `false`, dẫn đến bỏ qua kiểm tra quyền. Kẻ tấn công có thể nhập sai PIN 5 lần để khóa chức năng rút tiền của nạn nhân.
- **Giải pháp:**
  - File: `platform/apps/commerce-service/src/modules/wallet/wallet-security.service.ts`
    - Tái cấu trúc hàm `validateActorStoreAccess`:
      ```typescript
      private async validateActorStoreAccess(storeId: string, actor: BookActor): Promise<void> {
        const isPlatformAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
        if (isPlatformAdmin) return;

        const allowedRoles = ['STORE_OWNER', 'BUSINESS', 'SELLER', 'BUSINESS_OWNER', 'BUSINESS_STAFF'];
        if (!allowedRoles.includes(actor.role)) {
          throw new ForbiddenException({
            code: 'FORBIDDEN_STORE_ACCESS',
            message: 'Chỉ chủ gian hàng hoặc quản trị viên mới có quyền truy cập thông tin bảo mật của gian hàng này.',
          });
        }

        const actorStoreId = (actor as any).storeId;
        if (actorStoreId && actorStoreId === storeId) return;
        if (actorStoreId && actorStoreId !== storeId) {
          throw new ForbiddenException({
            code: 'FORBIDDEN_STORE_ACCESS',
            message: 'Bạn không có quyền truy cập thông tin bảo mật của gian hàng này.',
          });
        }

        const scope = await getSellerScope(actor);
        if (!scope.storeIds.includes(storeId)) {
          throw new ForbiddenException({
            code: 'FORBIDDEN_STORE_ACCESS',
            message: 'Bạn không có quyền truy cập thông tin bảo mật của gian hàng này.',
          });
        }
      }
      ```
    - Bổ sung `await` tại tất cả các vị trí gọi `validateActorStoreAccess` (`getSecurityStatus`, `setupPin`, `verifyPin`, `changePin`, `issueTwoFactorChallenge`, `verifyTwoFactorChallenge`, `processWithdrawalPinVerification`).
  - File: `platform/apps/commerce-service/src/modules/wallet/wallet-security.service.spec.ts`
    - Bổ sung test case `21b` kiểm chứng tài khoản `USER` không có liên kết gian hàng bị chặn với `ForbiddenException`.
- **Kết quả:** Kiểm tra an ninh toàn diện 27/27 test cases trong `wallet-security.service.spec.ts` vượt qua thành công.

---

### 7. [BUG-MOD07-07] Khắc Phục IDOR Lộ Lịch Sử Rút Tiền & Tài Khoản Ngân Hàng
- **Nguyên nhân gốc rễ:** 
  - `PayoutService.validateActorStoreAccess` sử dụng cùng logic sai sót của Module Ví, cho phép token người dùng không mang thuộc tính `storeId` đọc được thông tin chuyển khoản ngân hàng và lịch sử rút tiền của bất kỳ gian hàng nào.
- **Giải pháp:**
  - File: `platform/apps/commerce-service/src/modules/payout/payout.service.ts`
    - Cập nhật `validateActorStoreAccess` yêu cầu xác thực vai trò đối tác kinh doanh (`BUSINESS`, `SELLER`, `STORE_OWNER`...) và xác thực store qua `getSellerScope(actor)`.
    - Bổ sung `await` tại `createPayoutRequest` và `getStorePayoutRequests`.
  - File: `platform/apps/commerce-service/src/modules/payout/payout.service.spec.ts`
    - Bổ sung test case `19b` kiểm chứng người mua hàng thông thường (`USER`) bị từ chối với `ForbiddenException`.
- **Kết quả:** Toàn bộ 29/29 test cases trong `payout.service.spec.ts` vượt qua thành công. Thông tin tài khoản ngân hàng và lịch sử lệnh rút tiền được bảo mật tuyệt đối.

---

### 8. [BUG-MOD07-08] Chuẩn Hóa Phân Loại Bậc Quyền ADMIN Tại API Gateway
- **Nguyên nhân gốc rễ:** 
  - `route-classification.ts` chỉ nhận diện các route bắt đầu bằng `/admin/` hoặc `/users/admin`. Các tuyến đường quản trị thứ cấp như `/wallet/admin/*`, `/payout/admin/*`, `/sanctions/*`, và cấu hình bảo trì `POST /system/maintenance` bị xếp vào bậc `AUTHENTICATED`, làm suy yếu mô hình Zero-Trust.
- **Giải pháp:**
  - File: `platform/apps/api-gateway/src/modules/proxy/route-classification.ts`
    - Mở rộng logic phân loại tuyến `ADMIN`:
      ```typescript
      if (
        normPath.startsWith('/admin') ||
        normPath.includes('/admin/') ||
        normPath.endsWith('/admin') ||
        normPath.startsWith('/wallet/admin') ||
        normPath.startsWith('/payout/admin') ||
        normPath.startsWith('/sanctions') ||
        (normPath.startsWith('/system/maintenance') && upperMethod !== 'GET')
      ) {
        return 'ADMIN';
      }
      ```
  - File: `platform/apps/api-gateway/src/modules/proxy/route-classification.spec.ts`
    - Bổ sung kiểm thử cho các endpoint quản trị thứ cấp.
- **Kết quả:** Suite kiểm thử 9/9 unit tests của Gateway vượt qua thành công. Mọi truy cập vào các API quản trị thứ cấp đều bị Gateway chặn ngay tại lớp rìa nếu người gọi không có vai trò Quản trị viên (`PLATFORM_ADMIN`, `ADMIN`, `SUPER_ADMIN`).

---

## 🔍 KIỂM CHỨNG TOÀN DIỆN (FULL VERIFICATION SUITE)

1. **Frontend Type Check:**
   - Lệnh: `cd web; npx tsc --noEmit`
   - Kết quả: **Hoàn toàn sạch lỗi (Zero Errors).**

2. **Platform Microservices Full Build:**
   - Lệnh: `cd platform; npm run build:all`
   - Dịch vụ biên dịch: `@huki/shared`, `api-gateway`, `identity-service`, `business-service`, `commerce-service`, `shipping-service`, `community-service`, `promotion-service`, `analytics-service`.
   - Kết quả: **100% build thành công (Zero Errors).**

3. **Jest Unit & Integration Test Suites:**
   - `route-classification.spec.ts`: **9 passed, 9 total**
   - `wallet-security.service.spec.ts`: **27 passed, 27 total**
   - `payout.service.spec.ts`: **29 passed, 29 total**
   - `sanctions.spec.ts`: **34 passed, 34 total**
   - Tổng cộng: **99/99 tests passed (100%).**

4. **Trạng Thái File Báo Cáo Gốc:**
   - File `tasks/bug-mod07.md`: **Không có bất kỳ thay đổi nào (100% nguyên vẹn theo đúng yêu cầu).**

