# BÁO CÁO KIỂM THỬ AN NINH & PHÂN QUYỀN TOÀN HỆ THỐNG (MOD-07: SECURITY & ACCESS AUDIT)

> **Phạm vi kiểm thử:** Local live stack (API Gateway `:3000`, Identity Service `:3002`, Commerce Service `:3003`, Web `:3100`, PostgreSQL 3 databases, MongoDB).  
> **Phương pháp:** Kiểm thử thực tế Black-box & Grey-box API Probes (38 kịch bản tấn công theo chuẩn OWASP Top 10 API Security 2023), kết hợp rà soát mã nguồn tĩnh (Source Code Audit).  
> **Nguyên tắc:** Báo cáo ghi nhận chi tiết lỗi kèm PoC thực nghiệm; **tuyệt đối không tự ý sửa code sản phẩm** khi chưa có chỉ đạo từ người dùng.

---

## TỔNG HỢP KẾT QUẢ KIỂM THỬ AN NINH (MOD-07)

| Mã Lỗ Hổng | Tên Lỗ Hổng & Điểm Xâm Nhập | Phân Loại & CWE | Mức Độ | Trạng Thái |
| :---: | :--- | :---: | :---: | :---: |
| **BUG-MOD07-01** | Bật/Tắt chế độ bảo trì toàn sàn trái phép (`POST /system/maintenance`) | CWE-284 / Broken Access Control | **P0 (Critical)** | `Chờ duyệt sửa` |
| **BUG-MOD07-02** | Rò rỉ thông tin cá nhân khách hàng (PII) & Làm giả nộp tiền COD (`/orders/shipper/*`) | CWE-200 / CWE-284 (Logistics Leak) | **P0 (Critical)** | `Chờ duyệt sửa` |
| **BUG-MOD07-03** | IDOR can thiệp cấu hình Tiếp thị liên kết của gian hàng đối thủ (`/seller/stores/:id/affiliate/*`) | CWE-639 / Insecure Direct Object Reference | **P0 (Critical)** | `Chờ duyệt sửa` |
| **BUG-MOD07-04** | Thiếu Rate Limiting & Chống Brute-Force đăng nhập (Nguy cơ DoS & Tấn công từ điển) | CWE-307 / CWE-400 (Resource Exhaustion) | **P0 (Critical)** | `Chờ duyệt sửa` |
| **BUG-MOD07-05** | Thứ tự Guard & ValidationPipe sai quy chuẩn trên API trừng phạt gian hàng (`/sanctions`) | CWE-285 / Architecture Flaw | **P1 (High)** | `Chờ duyệt sửa` |
| **BUG-MOD07-06** | Vượt quyền truy cập bảo mật ví & Tấn công DoS khóa mã PIN rút tiền gian hàng (`/wallet/store/:id/security/*`) | CWE-284 / Denial of Service via Lockout | **P0 (Critical)** | `Chờ duyệt sửa` |
| **BUG-MOD07-07** | IDOR lộ lọt lịch sử rút tiền & Thông tin tài khoản ngân hàng của gian hàng (`/payout/store/:id/requests`) | CWE-200 / CWE-639 (Financial Data Leak) | **P0 (Critical)** | `Chờ duyệt sửa` |
| **BUG-MOD07-08** | API Gateway bỏ sót phân loại quyền ADMIN đối với các endpoint quản trị thứ cấp | CWE-284 / Defense-in-Depth Failure | **P1 (High)** | `Chờ duyệt sửa` |

---

## CHI TIẾT CÁC LỖ HỔNG AN NINH ĐƯỢC XÁC NHẬN (5 CẤU PHẦN KỸ THUẬT)

### 1. BUG-MOD07-01: Bật/Tắt chế độ bảo trì toàn sàn trái phép (Unauthorized Maintenance Mode Shutdown)
- **VỊ TRÍ (Location):**
  - Controller: `platform/apps/identity-service/src/modules/system/maintenance.controller.ts` (Method `updateConfig`).
  - Gateway: `platform/apps/api-gateway/src/modules/proxy/route-classification.ts` (Dòng 30-45).
- **MÔ TẢ HIỆN TƯỢNG (Symptoms):**
  - Khách mua hàng (`USER`), Shipper (`DELIVERY_STAFF`) hoặc bất kỳ tài khoản thông thường nào khi gửi request `POST /api/v1/system/maintenance` với body `{"isActive": true, "message": "He thong bi hack"}` đều nhận được phản hồi **HTTP 201 Created** kèm cấu hình bảo trì đã được cập nhật.
  - Ngay lập tức toàn bộ hệ thống API Gateway chuyển sang chế độ chặn bảo trì 503 cho toàn bộ người dùng thật trên sàn.
  - **Chứng thực thực tế (PoC):**
    ```bash
    curl -X POST "http://localhost:3000/api/v1/system/maintenance" \
      -H "Authorization: Bearer <BUYER_TOKEN>" \
      -H "Content-Type: application/json" \
      -d '{"isActive":true,"message":"Site down"}'
    # Kết quả trả về: HTTP 201 Created
    # {"status":"success","statusCode":201,"data":{"isActive":true,"message":"Site down"}}
    ```
- **NGUYÊN NHÂN GỐC RỄ (Root Cause):**
  - Tại `identity-service`, phương thức `updateConfig` được đánh dấu decorator `@Public()`, vô hiệu hóa toàn bộ cơ chế kiểm tra JWT của microservice.
  - Tại `api-gateway`, hàm `classifyRoute` chỉ phân loại `upperMethod === 'GET'` là `PUBLIC`, nhưng không hề xếp `POST /system/maintenance` vào nhóm `ADMIN`. Do đó, request rơi vào fallback mặc định dòng 182: `return 'AUTHENTICATED'`, cho phép bất kỳ user nào có đăng nhập đều vượt qua Gateway.
- **CÁCH KHẮC PHỤC TRIỆT ĐỂ (Remediation):**
  1. Trong `route-classification.ts`, bổ sung quy tắc: Nếu `normPath.startsWith('/system/maintenance') && upperMethod !== 'GET'` $\rightarrow$ Bắt buộc trả về `'ADMIN'`.
  2. Trong `maintenance.controller.ts`, gỡ bỏ `@Public()` khỏi method `updateConfig`, gắn decorator `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.PLATFORM_ADMIN)`.
- **TRẠNG THÁI:** `Chờ duyệt sửa (Pending Approval)`.

---

### 2. BUG-MOD07-02: Rò rỉ thông tin cá nhân khách hàng (PII) & Làm giả nộp tiền COD Shipper
- **VỊ TRÍ (Location):**
  - Controller: `platform/apps/commerce-service/src/modules/orders/shipper-orders.controller.ts` (Dòng 33).
  - Service: `platform/apps/commerce-service/src/modules/orders/orders.service.ts` (Method `shipperRemitCod`).
- **MÔ TẢ HIỆN TƯỢNG (Symptoms):**
  - Bất kỳ người mua hàng (`USER`) hoặc người bán (`BUSINESS`) nào gửi request `GET /api/v1/orders/shipper/orders` đều nhận được phản hồi **HTTP 200 OK** chứa toàn bộ danh sách đơn hàng vật lý trên toàn sàn (69 đơn hàng thật trong cơ sở dữ liệu), bao gồm: Họ tên khách hàng, số điện thoại, địa chỉ nhà riêng chi tiết, số tiền thu hộ COD.
  - Bất kỳ tài khoản người dùng nào cũng có thể gửi `POST /api/v1/orders/shipper/remit-cod` với danh sách mã đơn hàng để đánh dấu các đơn COD đó thành "Đã nộp tiền thu hộ", can thiệp nghiêm trọng vào sổ sách tài chính đối soát giao hàng.
  - **Chứng thực thực tế (PoC):**
    ```bash
    curl -X GET "http://localhost:3000/api/v1/orders/shipper/orders" \
      -H "Authorization: Bearer <BUYER_TOKEN>"
    # Kết quả trả về: HTTP 200 OK, data: [ { id: "...", shippingAddress: {...}, customerPhone: "..." } ]
    ```
- **NGUYÊN NHÂN GỐC RỄ (Root Cause):**
  - `ShipperOrdersController` được gán decorator `@UseGuards(OptionalBookAuthGuard)`. Decorator này chỉ giải mã actor nếu có, hoàn toàn không bắt buộc quyền `DELIVERY_STAFF` hay `ADMIN`.
  - Phương thức `ordersService.shipperRemitCod` không kiểm tra `actor.role === 'DELIVERY_STAFF'`, cho phép bất kỳ ai gửi mã đơn hàng hợp lệ đều cập nhật trạng thái nộp COD.
- **CÁCH KHẮC PHỤC TRIỆT ĐỂ (Remediation):**
  1. Thay thế `OptionalBookAuthGuard` trên `ShipperOrdersController` bằng `AuthenticatedGuard` kết hợp `RolesGuard(['DELIVERY_STAFF', 'PLATFORM_ADMIN'])`.
  2. Thêm kiểm tra nghiêm ngặt: Shipper chỉ được xem và thao tác trên các đơn hàng được phân công cho chính Shipper đó (`assignedShipperId === actor.sub`).
- **TRẠNG THÁI:** `Chờ duyệt sửa (Pending Approval)`.

---

### 3. BUG-MOD07-03: IDOR can thiệp cấu hình Tiếp thị liên kết của gian hàng đối thủ
- **VỊ TRÍ (Location):**
  - Controller: `platform/apps/commerce-service/src/modules/affiliate/controllers/seller-affiliate.controller.ts` (Method `updateStoreSettings` & `updateBookAffiliate`).
- **MÔ TẢ HIỆN TƯỢNG (Symptoms):**
  - Người bán của Gian hàng A (`seller@gmail.com`) có thể gửi request `PUT /api/v1/seller/stores/:storeB_Id/affiliate/settings` với body `{ "isEnabled": false, "defaultCommissionRate": 0.01 }` để vô hiệu hóa hoàn toàn chương trình Affiliate của Gian hàng B, hoặc hạ tỷ lệ hoa hồng của đối thủ về 1%.
  - API trả về **HTTP 200 OK** và ghi đè trực tiếp cấu hình trong bảng `store_affiliate_settings` của Gian hàng B.
  - **Chứng thực thực tế (PoC):**
    ```bash
    curl -X PUT "http://localhost:3000/api/v1/seller/stores/3094e54e-2549-42cc-92fb-14a8f8589277/affiliate/settings" \
      -H "Authorization: Bearer <SELLER_A_TOKEN>" \
      -H "Content-Type: application/json" \
      -d '{"isEnabled":false,"defaultCommissionRate":1.5}'
    # Kết quả trả về: HTTP 200 OK, ghi đè thành công cấu hình của gian hàng khác!
    ```
- **NGUYÊN NHÂN GỐC RỄ (Root Cause):**
  - `SellerAffiliateController` chỉ kiểm tra quyền đăng nhập cơ bản của người bán (`@UseGuards(AuthenticatedGuard)`), nhưng **không kiểm tra quyền sở hữu gian hàng** (`assertStoreOwner` hoặc so sánh `actor.storeId === param.storeId`).
- **CÁCH KHẮC PHỤC TRIỆT ĐỂ (Remediation):**
  - Bổ sung Guard kiểm tra quyền sở hữu gian hàng (`StoreOwnerGuard`) hoặc gọi helper kiểm tra:
    ```typescript
    if (actor.role !== 'PLATFORM_ADMIN' && !actor.storeIds.includes(storeId)) {
      throw new ForbiddenException('Bạn không có quyền quản lý gian hàng này.');
    }
    ```
- **TRẠNG THÁI:** `Chờ duyệt sửa (Pending Approval)`.

---

### 4. BUG-MOD07-04: Thiếu Rate Limiting & Chống Brute-Force đăng nhập (DoS & Tấn công từ điển)
- **VỊ TRÍ (Location):**
  - Gateway: `platform/apps/api-gateway/src/modules/proxy/proxy.middleware.ts`.
  - Service: `platform/apps/identity-service/src/modules/auth/auth.controller.ts` (Method `login`).
- **MÔ TẢ HIỆN TƯỢNG (Symptoms):**
  - Khi gửi 30-50 request đăng nhập liên tiếp trong vòng 1 giây đến `POST /api/v1/auth/login`, hệ thống không hề trả về mã lỗi **HTTP 429 Too Many Requests**.
  - Tất cả 30 request đều được chuyển tiếp xuống `identity-service` và ép CPU máy chủ chạy thuật toán băm mật khẩu nặng `bcrypt.compare` đồng thời. Kẻ tấn công có thể dễ dàng làm cạn kiệt tài nguyên CPU (CPU Exhaustion DoS) hoặc thực hiện dò mật khẩu từ điển quy mô lớn.
  - **Chứng thực thực tế (PoC):**
    - Script `test-brute-force-login.cjs` gửi 30 requests song song; 100% trả về HTTP 401, không có bất kỳ phản hồi 429 nào từ Gateway hay Throttler.
- **NGUYÊN NHÂN GỐC RỄ (Root Cause):**
  - API Gateway chưa tích hợp bộ lọc giới hạn tần suất (Rate Limiter / Token Bucket / Redis Throttler) trên các endpoint xác thực nhạy cảm.
  - Mặc dù `identity-service` có đếm `failedLoginAttempts` trên từng user trong cơ sở dữ liệu, việc này chỉ khóa tài khoản sau 5 lần sai mật khẩu nhưng không ngăn chặn kẻ tấn công đổi email ngẫu nhiên để ép server băm bcrypt liên tục.
- **CÁCH KHẮC PHỤC TRIỆT ĐỂ (Remediation):**
  1. Cấu hình `@nestjs/throttler` tại API Gateway: Áp dụng giới hạn `limit: 5, ttl: 60` (tối đa 5 lượt đăng nhập sai mỗi phút trên 1 địa chỉ IP).
  2. Bắt buộc trả về HTTP 429 kèm header `Retry-After` khi vượt ngưỡng giới hạn.
- **TRẠNG THÁI:** `Chờ duyệt sửa (Pending Approval)`.

---

### 5. BUG-MOD07-05: Thứ tự Guard & ValidationPipe sai quy chuẩn trên API trừng phạt gian hàng
- **VỊ TRÍ (Location):**
  - Controller: `platform/apps/commerce-service/src/modules/sanctions/sanctions.controller.ts` (Method `applySanction`).
- **MÔ TẢ HIỆN TƯỢNG (Symptoms):**
  - Khi một người dùng không có quyền Admin (Buyer hoặc Seller) gửi request `POST /api/v1/sanctions` với dữ liệu không hợp lệ (ví dụ: body rỗng `{}`), hệ thống trả về **HTTP 400 Validation Error** thay vì **HTTP 403 Forbidden**.
  - Điều này cho phép kẻ tấn công không có đặc quyền lợi dụng việc gửi payload sai để thăm dò cấu trúc DTO nội bộ của hệ thống (Reconnaissance) và làm hao phí tài nguyên xử lý validation trước khi bị từ chối quyền.
- **NGUYÊN NHÂN GỐC RỄ (Root Cause):**
  - Việc kiểm tra quyền hạn `if (actor.role !== 'PLATFORM_ADMIN')` được viết thủ công bên trong thân hàm (method body). Trong vòng đời xử lý request của NestJS, `ValidationPipe` toàn cục chạy trước khi vào thân hàm, dẫn đến lỗi 400 được ném ra trước khi logic phân quyền được thực thi.
- **CÁCH KHẮC PHỤC TRIỆT ĐỂ (Remediation):**
  - Chuyển logic kiểm tra vai trò ra ngoài Controller Decorator bằng cách sử dụng `@UseGuards(AuthenticatedGuard, AdminGuard)`. Guard sẽ được thực thi trước Pipes, đảm bảo người dùng không có quyền lập tức nhận mã 403 Forbidden.
- **TRẠNG THÁI:** `Chờ duyệt sửa (Pending Approval)`.

---

### 6. BUG-MOD07-06: Vượt quyền truy cập bảo mật ví & Tấn công DoS khóa mã PIN rút tiền gian hàng
- **VỊ TRÍ (Location):**
  - Service: `platform/apps/commerce-service/src/modules/wallet/wallet-security.service.ts` (Method `validateActorStoreAccess` dòng 54).
  - Controller: `platform/apps/commerce-service/src/modules/wallet/wallet.controller.ts` (`getSecurityStatus`, `verifyPin`).
- **MÔ TẢ HIỆN TƯỢNG (Symptoms):**
  - Bất kỳ khách mua hàng thông thường (`USER`) hoặc đối thủ cạnh tranh nào gửi request `GET /api/v1/wallet/store/:victimStoreId/security/status` đều nhận được **HTTP 200 OK** hiển thị chi tiết: Ví đã tạo PIN chưa, số lần nhập sai còn lại, thời gian hết hạn mã PIN.
  - Kẻ tấn công có thể gửi request `POST /api/v1/wallet/store/:victimStoreId/security/pin/verify` với mã PIN sai liên tiếp 5 lần. Hệ thống lập tức trừ số lần thử của chính gian hàng nạn nhân và khóa chức năng rút tiền của nạn nhân (`WALLET_SECURITY_LOCKED: Chức năng rút tiền tạm khóa trong 3 phút`).
  - **Chứng thực thực tế (PoC):**
    ```bash
    curl -X POST "http://localhost:3000/api/v1/wallet/store/3094e54e-2549-42cc-92fb-14a8f8589277/security/pin/verify" \
      -H "Authorization: Bearer <BUYER_TOKEN>" \
      -H "Content-Type: application/json" \
      -d '{"storeId":"3094e54e-2549-42cc-92fb-14a8f8589277","pin":"000000"}'
    # Kết quả trả về: HTTP 400 PIN_INCORRECT: "Mã PIN không đúng. Bạn còn 4 lần thử lại (tối đa 5 lần)."
    # Lần thử của gian hàng thật bị giảm trực tiếp bởi tài khoản lạ!
    ```
- **NGUYÊN NHÂN GỐC RỄ (Root Cause):**
  - Logic hàm `validateActorStoreAccess` được viết như sau:
    ```typescript
    const actorStoreId = (actor as any).storeId;
    if (!isPlatformAdmin && actorStoreId && actorStoreId !== storeId) {
      throw new ForbiddenException(...);
    }
    ```
  - Khi một tài khoản Buyer gọi API, thuộc tính `actorStoreId` trong token là `undefined`. Điều kiện `actorStoreId && actorStoreId !== storeId` cho kết quả `false`, dẫn đến việc bỏ qua hoàn toàn việc kiểm tra quyền và cấp quyền cho bất kỳ ai!
- **CÁCH KHẮC PHỤC TRIỆT ĐỂ (Remediation):**
  - Sửa lại hàm kiểm tra quyền sở hữu ví chặt chẽ:
    ```typescript
    private validateActorStoreAccess(storeId: string, actor: BookActor): void {
      const isPlatformAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
      if (isPlatformAdmin) return;
      if (actor.role !== 'BUSINESS' && actor.role !== 'SELLER') {
        throw new ForbiddenException('Chỉ chủ gian hàng mới có quyền truy cập thông tin ví.');
      }
      if (!actor.storeId || actor.storeId !== storeId) {
        throw new ForbiddenException('Bạn không có quyền thao tác trên ví của gian hàng này.');
      }
    }
    ```
- **TRẠNG THÁI:** `Chờ duyệt sửa (Pending Approval)`.

---

### 7. BUG-MOD07-07: IDOR lộ lọt lịch sử rút tiền & Thông tin tài khoản ngân hàng của gian hàng
- **VỊ TRÍ (Location):**
  - Service: `platform/apps/commerce-service/src/modules/payout/payout.service.ts` (Method `validateActorStoreAccess` dòng 59).
  - Controller: `platform/apps/commerce-service/src/modules/payout/payout.controller.ts` (Method `getStorePayoutRequests`).
- **MÔ TẢ HIỆN TƯỢNG (Symptoms):**
  - Tương tự như module ví, bất kỳ người mua hàng (`USER`) hoặc tài khoản không liên quan nào gửi `GET /api/v1/payout/store/:victimStoreId/requests` đều nhận được **HTTP 200 OK** chứa toàn bộ danh sách lệnh rút tiền của gian hàng, số tiền đã rút, tên ngân hàng và số tài khoản ngân hàng thụ hưởng.
  - **Chứng thực thực tế (PoC):**
    ```bash
    curl -X GET "http://localhost:3000/api/v1/payout/store/3094e54e-2549-42cc-92fb-14a8f8589277/requests" \
      -H "Authorization: Bearer <BUYER_TOKEN>"
    # Kết quả trả về: HTTP 200 OK, data: { items: [...], total: 0, page: 1, limit: 20 }
    ```
- **NGUYÊN NHÂN GỐC RỄ (Root Cause):**
  - `PayoutService.validateActorStoreAccess` sao chép nguyên mẫu logic sai sót từ `WalletSecurityService`: kiểm tra `actorStoreId && actorStoreId !== storeId`, khiến bất kỳ token nào không có claim `storeId` đều được hệ thống coi là hợp lệ và cho phép truy cập.
- **CÁCH KHẮC PHỤC TRIỆT ĐỂ (Remediation):**
  - Yêu cầu xác thực tài khoản phải mang vai trò đối tác kinh doanh (`BUSINESS`) và bắt buộc sở hữu `storeId` trùng khớp với tham số gian hàng trên đường dẫn API.
- **TRẠNG THÁI:** `Chờ duyệt sửa (Pending Approval)`.

---

### 8. BUG-MOD07-08: API Gateway bỏ sót phân loại quyền ADMIN đối với các endpoint quản trị thứ cấp
- **VỊ TRÍ (Location):**
  - Gateway: `platform/apps/api-gateway/src/modules/proxy/route-classification.ts` (Dòng 83-95, dòng 181-182).
- **MÔ TẢ HIỆN TƯỢNG (Symptoms):**
  - Các endpoint nhạy cảm cấp quản trị viên nền tảng như:
    - `/api/v1/wallet/admin/*` (Xem toàn bộ số dư và giao dịch ví trên toàn sàn)
    - `/api/v1/payout/admin/*` (Duyệt lệnh rút tiền, đối soát và kích hoạt giải ngân chuyển khoản)
    - `/api/v1/sanctions/*` (Trừng phạt đóng băng tài khoản gian hàng)
    - `POST /api/v1/system/maintenance` (Cấu hình bảo trì)
    đều không được xếp vào nhóm phân quyền `'ADMIN'` tại API Gateway.
  - Thay vào đó, chúng rơi vào phân loại mặc định `'AUTHENTICATED'`. Điều này vi phạm nguyên tắc an ninh "Phòng thủ theo chiều sâu" (Defense-in-Depth) và kiến trúc Zero-Trust, phó mặc hoàn toàn việc bảo vệ các chức năng tối mật cho các microservices cấp dưới.
- **NGUYÊN NHÂN GỐC RỄ (Root Cause):**
  - Bộ định tuyến `route-classification.ts` chỉ kiểm tra các tiền tố cố định như `normPath.startsWith('/admin/')` hoặc `/users/admin`. Các endpoint có tiền tố đặt admin ở đoạn giữa đường dẫn (như `/wallet/admin/transactions` hay `/payout/admin/requests`) bị lọt khỏi danh sách nhận diện.
- **CÁCH KHẮC PHỤC TRIỆT ĐỂ (Remediation):**
  - Bổ sung quy tắc nhận diện linh hoạt trong `classifyRoute`:
    ```typescript
    if (
      normPath.startsWith('/admin') ||
      normPath.includes('/admin/') ||
      normPath.endsWith('/admin') ||
      normPath.startsWith('/sanctions') ||
      (normPath.startsWith('/system/maintenance') && upperMethod !== 'GET')
    ) {
      return 'ADMIN';
    }
    ```
- **TRẠNG THÁI:** `Chờ duyệt sửa (Pending Approval)`.

