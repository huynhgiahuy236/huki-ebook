# BÁO CÁO AUDIT TĨNH CHUYÊN SÂU 6 TRỤC & KHUNG AN NINH THANH TOÁN
## SERVICE #1: IDENTITY-SERVICE (`platform/apps/identity-service`)

> **Ngày thực hiện:** 06/11/2026  
> **Nhánh Git:** `audit/identity-service` (Base commit: `2ec08a55...` -> Setup commit: `3d745f6`)  
> **Môi trường khảo sát:** Local Development / Staging UAT Baseline  
> **Phương pháp tiếp cận:** Static Code Analysis, Control Flow Inspection, Architecture Verification, Security & Data Integrity Audit.  
> **Nguyên tắc cốt lõi:** Tuyệt đối không suy đoán, không dùng dữ liệu mock, trích dẫn chính xác file path, function name và line number từ mã nguồn thực tế.

---

## PHẦN 1: KHUNG KIỂM SOÁT AN NINH THANH TOÁN CẤP P0 (PAYMENT SUBSYSTEM AUDIT FRAMEWORK)

Môi trường UAT ghi nhận nhiều sự cố nghiêm trọng liên quan đến dòng tiền, xung đột trạng thái đơn hàng và thất thoát doanh thu. Nhằm chuẩn bị cho các bước audit tiếp theo tại `commerce-service`, `promotion-service`, `shipping-service` và `api-gateway`, khung kiểm soát an ninh thanh toán được thiết lập bắt buộc như sau:

### 1. Phân hệ `commerce-service` (Hotspot cốt lõi của dòng tiền)
- **Xác thực chữ ký số PayOS (`PAYOS_CHECKSUM_KEY`, HMAC-SHA256):**
  - Mọi payload nhận từ cổng thanh toán PayOS gửi về endpoint Webhook bắt buộc phải được tính toán và kiểm tra chữ ký HMAC-SHA256 với secret key được lưu trữ an toàn trong biến môi trường.
  - **Nghiêm cấm tuyệt đối** hành vi bypass xác thực chữ ký số dưới mọi hình thức (kể cả điều kiện `NODE_ENV !== 'production'` hoặc cờ debug giả định).
- **Tính Idempotency của Webhook (`POST /payments/webhook`):**
  - Cơ chế nhận webhook phải có khóa chống trùng lặp (Idempotency Key hoặc tra cứu trạng thái transaction `payment_transactions.transaction_id`).
  - Khi webhook của cùng một giao dịch được gửi lại nhiều lần (do mạng chập chờn hoặc retry từ cổng PayOS), hệ thống không được kích hoạt xử lý cộng tiền, tạo vận đơn hoặc trừ kho lặp lại (Chống Double-Spending & Duplicate Processing).
- **Worker tự hủy đơn quá hạn (`ORDER_PAYMENT_TTL_SECONDS = 900s` / 15 phút):**
  - Worker quét đơn hàng ở trạng thái `PENDING_PAYMENT` quá thời gian quy định (15 phút) phải hủy đơn tự động (`CANCELLED`).
  - Thao tác cập nhật trạng thái đơn hàng và hoàn trả tồn kho (`stock release`) cho các sản phẩm/phiên bản sách bắt buộc phải được bọc trong một **Database Transaction (ACID)** duy nhất. Nếu hoàn kho thất bại, giao dịch hủy đơn phải rollback toàn bộ để tránh sai lệch tồn kho (Inventory Drift).

### 2. Phân hệ `api-gateway` (Cổng định tuyến Ingress)
- **Đặc quyền định tuyến Webhook:** Endpoint `/api/v1/payments/webhook` phải được định nghĩa rõ ràng là endpoint `PUBLIC`.
- Gateway tuyệt đối **không được áp dụng Guard kiểm tra Bearer Token** (JWT) hoặc chặn các dải IP ngoại mạng từ cổng thanh toán đối tác, đồng thời không làm biến dạng (mutate) raw body payload trước khi chuyển tiếp vào `commerce-service` nhằm đảm bảo thuật toán HMAC-SHA256 tính toán khớp từng byte.

### 3. Phân hệ `promotion-service` & `shipping-service` (Auxiliary / Fulfillment)
- **Cơ chế Rollback Voucher & Quota Flash Sale:**
  - Khi đơn hàng bị hủy hoặc thanh toán thất bại (`PAYMENT_FAILED` hoặc `ORDER_CANCELLED`), `promotion-service` phải lắng nghe event từ RabbitMQ hoặc endpoint `/vouchers/rollback` để phục hồi lại lượt sử dụng voucher cho khách hàng và hoàn trả quota giới hạn trong các chiến dịch Flash Sale.
- **Consumer RabbitMQ xử lý `ORDER_PAID` tại `shipping-service`:**
  - Cơ chế nhận thông điệp đơn hàng đã thanh toán thành công phải đảm bảo tính toàn vẹn (Reliable Message Processing).
  - Nghiêm cấm hành vi bọc khối `try/catch` rỗng (silent swallow error) khiến đơn hàng đã trừ tiền của khách nhưng hệ thống vận chuyển bị lỗi không tạo được mã vận đơn, dẫn đến đơn bị treo vô thời hạn (Deadlock Fulfillment).

---

## PHẦN 2: KẾT QUẢ AUDIT TĨNH 6 TRỤC CHO IDENTITY-SERVICE

Mã nguồn được kiểm tra trực tiếp tại: `platform/apps/identity-service/src/`

```
platform/apps/identity-service/
├── prisma/
│   └── schema.prisma             # Data schema, models, enums & indexes
└── src/
    ├── app.module.ts             # Module composition & global interceptors
    ├── main.ts                   # Bootstrap, validation pipe & port binding
    ├── prisma/
    │   └── prisma.service.ts     # Prisma client lifecycle
    └── modules/
        ├── auth/                 # Authentication, JWT, Google OAuth, Passwords
        ├── user/                 # User CRUD, Account deletion lifecycle, Admin APIs
        ├── session/              # Session tracking, Device parsing, Revocation
        ├── outbox/               # Transactional Outbox pattern & RabbitMQ Publisher
        ├── redis/                # Redis client & Session caching
        └── maintenance/          # System maintenance mode & emergency kill-switch
```

---

### TRỤC 1: API CONTRACT, STATUS CODES & CLIENT ERROR HANDLING (UI/UX MAPPING)

#### 1. Khảo sát DTOs & ValidationPipe
- **Hiện trạng:**
  - `main.ts` (Lines 31-36) khởi tạo `ValidationPipe`:
    ```typescript
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );
    ```
  - `whitelist: true` giúp loại bỏ các trường không mong muốn, nhưng `forbidNonWhitelisted: false` không ném lỗi khi client truyền thêm trường rác.
- **Điểm yếu & Bất đối xứng (Validation Mismatch):**
  - **Đăng ký (`RegisterDto`):** File [register.dto.ts](file:///platform/apps/identity-service/src/modules/auth/dto/register.dto.ts#L8-L23) kiểm soát mật khẩu rất chặt chẽ:
    ```typescript
    @MinLength(8)
    @MaxLength(100)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    password: string;
    ```
  - **Đặt lại mật khẩu & Đổi mật khẩu (`ResetPasswordDto`, `ChangePasswordDto`):** File [password.dto.ts](file:///platform/apps/identity-service/src/modules/auth/dto/password.dto.ts#L19-L34) CHỈ có `@MinLength(8)` và `@MaxLength(100)`, HOÀN TOÀN BỎ QUÊN regex `@Matches`.
  - **Hậu quả:** Người dùng đăng ký phải tạo mật khẩu phức tạp, nhưng khi vào tính năng "Đổi mật khẩu" hoặc "Quên mật khẩu", họ có thể đặt mật khẩu yếu dạng `12345678` hoặc `abcdefgh`. Đây là lỗ hổng bất đồng bộ chính sách mật khẩu (Password Policy Asymmetry).

#### 2. Phân giải Mã lỗi HTTP & Hành vi Client
- **Rò rỉ thông tin qua mã lỗi đăng nhập (User Enumeration):**
  - File [auth.service.ts](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L309) vs [L360](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L360):
    ```typescript
    // Line 309: Nếu email không tồn tại -> 404 NOT FOUND
    if (!user) {
      throwNotFound(ErrorCode.USER_NOT_FOUND, 'Tài khoản không tồn tại trên hệ thống');
    }
    // Line 360: Nếu email có tồn tại nhưng sai pass -> 401 UNAUTHORIZED
    if (!valid) {
      throwUnauthorized(ErrorCode.AUTH_LOGIN_INVALID_CREDENTIALS, 'Email hoặc mật khẩu không chính xác');
    }
    ```
  - **Hậu quả UX/An ninh:** Kẻ tấn công có thể brute-force danh sách email khách hàng. Bất kỳ email nào trả về 401 xác nhận email đó đã mở tài khoản tại HuKi; email trả về 404 là chưa đăng ký. Vi phạm chuẩn OWASP ASVS (V2.1.1).
- **Cơ chế Silent Refresh trên Frontend Web:**
  - Token hết hạn trả về `401 Unauthorized` kèm `code: AUTH_TOKEN_EXPIRED`.
  - Tuy nhiên, trong [auth.service.ts](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L580) và [L604](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L604), cả trường hợp token không tồn tại, session bị revoked, user bị block/deleted đều trả về chung mã lỗi `AUTH_TOKEN_EXPIRED` thay vì phân định rõ `AUTH_SESSION_REVOKED` hay `AUTH_ACCOUNT_SUSPENDED`. Điều này làm Next.js Web Client liên tục loop gửi refresh token vô hạn trước khi nhận ra user đã bị khóa.

---

### TRỤC 2: CHỨC NĂNG, NGHIỆP VỤ & STATE MACHINE (LOGIC & STATE AUDIT)

#### 1. State Machine vòng đời tài khoản người dùng
Hệ thống quản lý trạng thái tài khoản qua Enum `UserStatus`:
`PENDING` -> `ACTIVE` -> `BLOCKED` / `PENDING_DELETION` -> `DELETED`

- **Trạng thái PENDING:** Khi người dùng vừa đăng ký ([auth.service.ts#L115](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L115)), tài khoản ở trạng thái `PENDING`, tạo mã OTP 6 số hết hạn sau 15 phút. Nếu người dùng đăng ký lại cùng email đang `PENDING` ([auth.service.ts#L79-L94](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L79-L94)), hệ thống tái tạo mã OTP và cho phép tiếp tục thay vì báo lỗi trùng email. Đây là luồng xử lý hợp lý.
- **Khóa tài khoản tự động (Brute-Force Lockout):**
  - File [auth.service.ts#L347-L359](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L347-L359): Nếu đăng nhập sai 5 lần (`failedLoginAttempts >= 5`), tài khoản bị khóa 15 phút (`lockedUntil = now + 15m`).
  - Khi đăng nhập thành công, `failedLoginAttempts` được reset về 0 ([auth.service.ts#L367](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L367)). State machine tại điểm này hoạt động chặt chẽ.
- **Hạn chế nghiêm trọng vòng đời xóa tài khoản (Missing Account Deletion Purge Worker):**
  - File [user.service.ts#L501-L550](file:///platform/apps/identity-service/src/modules/user/user.service.ts#L501-L550) (`confirmDeletion`): Chuyển trạng thái sang `PENDING_DELETION` và tính toán `deletionScheduledAt = now + 7 days`.
  - Khảo sát toàn bộ dự án: **KHÔNG CÓ BẤT KỲ CRON JOB HOẶC WORKER NÀO** thực hiện quét các bản ghi có `deletionScheduledAt <= now` để thực hiện xóa thật (`DELETED`) hoặc ẩn danh dữ liệu (Anonymization)!
  - **Hậu quả:** Tài khoản sau 7 ngày ân hạn vẫn nằm nguyên ở trạng thái `PENDING_DELETION` mãi mãi, dữ liệu cá nhân không bao giờ được giải phóng, vi phạm cam kết bảo vệ dữ liệu người dùng.

#### 2. Quản lý phiên (Session Management) & Giới hạn 5 thiết bị (DRM Device FIFO)
- **Refresh Token Rotation (RTR) & Tái sử dụng (Reuse Detection):**
  - File [auth.service.ts#L584-L596](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L584-L596): Khi phát hiện token đã có `revokedAt != null` mà vẫn gửi lên refresh (tái sử dụng token đã thu hồi), hệ thống bọc transaction hủy toàn bộ `RefreshToken` trong cùng `tokenFamily` với lý do `reuse_detected` và thu hồi `AuthSession`. Cơ chế RTR đạt tiêu chuẩn an toàn cao.
- **Giới hạn 5 thiết bị đồng thời (DRM Device Management - POL-04 / DRM-003):**
  - File [auth.service.ts#L778-L808](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L778-L808):
    ```typescript
    await tx.$executeRaw`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`;
    const activeSessions = await tx.authSession.findMany({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'asc' },
    });
    const maxAllowedDevices = policyConfig.drmMaxActiveDevices; // 5
    if (activeSessions.length >= maxAllowedDevices) {
      const evictCount = activeSessions.length - maxAllowedDevices + 1;
      const toEvict = activeSessions.slice(0, evictCount);
      // Thu hồi phiên cũ nhất (FIFO Eviction)
      ...
    }
    ```
  - **Đánh giá:** Logic DRM 5 thiết bị được xử lý cực kỳ mẫu mực: có row lock `FOR UPDATE` chống race condition khi 2 thiết bị login cùng một mili-giây, áp dụng đúng cơ chế FIFO tự động thu hồi thiết bị cũ nhất.

---

### TRỤC 3: BẢO MẬT & KIỂM SOÁT TRUY CẬP (SECURITY & ACCESS CONTROL)

#### 1. [LỖ HỔNG P0 - CRITICAL] Bypass Đăng nhập Google Không Cần Token (CVSS 10.0)
- **Vị trí:** File [auth.service.ts](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L392-L455), hàm `loginWithGoogle(dto: GoogleLoginDto)`
- **Đoạn mã nguy hiểm:**
  ```typescript
  async loginWithGoogle(dto: GoogleLoginDto, userAgent?: string, ipAddress?: string) {
    let email = dto.email ? dto.email.trim().toLowerCase() : undefined;
    let fullName = dto.fullName ? dto.fullName.trim() : undefined;
    let avatar = dto.avatar;

    // 1. Xác thực qua Google ID Token hoặc Google OAuth2 Access Token
    if (dto.accessToken) {
      // Gọi Google UserInfo API
    }

    if (!email && dto.idToken) {
      // Verify ID token bằng OAuth2Client
    }

    if (!email) {
      throwBadRequest(ErrorCode.AUTH_LOGIN_INVALID_CREDENTIALS, 'Email Google là bắt buộc...');
    }

    // 2. Tìm kiếm người dùng theo email và cấp Token đăng nhập!
    let user = await this.prisma.user.findUnique({ where: { email } });
    ...
    return this.generateAuthResponse(user, ...);
  }
  ```
- **Phân tích cơ chế khai thác (Exploit Vector):**
  - Kẻ tấn công gửi HTTP POST tới endpoint công khai `/api/v1/auth/google`:
    ```json
    {
      "email": "admin@huki.vn"
    }
    ```
  - `dto.accessToken` là `undefined` -> Bỏ qua khối xác thực UserInfo.
  - `email` đã có giá trị (`admin@huki.vn`) -> Điều kiện `if (!email && dto.idToken)` là `false` -> **BỎ QUA HOÀN TOÀN KHỐI KIỂM TRA CHỨNG CHỈ GOOGLE!**
  - `if (!email)` là `false`.
  - Dòng lệnh tiếp theo lập tức truy vấn user theo email và ký sinh JWT cấp quyền đăng nhập đầy đủ cho kẻ tấn công!
- **Hậu quả:** Bất kỳ ai cũng có thể chiếm đoạt tài khoản của mọi người dùng trong hệ thống (kể cả `PLATFORM_ADMIN`) chỉ bằng cách biết email của họ! Đây là lỗ hổng nghiêm trọng nhất toàn hệ thống.

#### 2. [LỖ HỔNG P0 - CRITICAL] Cửa sau Đặt lại Mật khẩu (Password Reset Backdoor)
- **Vị trí:** File [auth.service.ts](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L698-L703), hàm `resetPassword(dto: ResetPasswordDto)`
- **Đoạn mã nguy hiểm:**
  ```typescript
  async resetPassword(dto: ResetPasswordDto) {
    let user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    if (!user && (dto.token === '123456' || process.env.NODE_ENV !== 'production')) {
      user = await this.prisma.user.findFirst({
        where: { passwordResetToken: { not: null } },
        orderBy: { updatedAt: 'desc' },
      });
    }
  ```
- **Phân tích cơ chế khai thác:**
  - **Môi trường UAT / Non-production (`NODE_ENV !== 'production'`):** Điều kiện `process.env.NODE_ENV !== 'production'` LUÔN ĐÚNG. Bất kỳ ai gửi `POST /api/v1/auth/reset-password` với `token: "any_dummy_string"` và `newPassword` sẽ cướp ngay tài khoản của người vừa nhấn quên mật khẩu gần nhất!
  - **Môi trường Production:** Nếu kẻ tấn công truyền `token: "123456"`, điều kiện `dto.token === '123456'` sẽ kích hoạt backdoor, chiếm quyền tài khoản vừa yêu cầu reset pass!
- **Hậu quả:** Phá hủy hoàn toàn cơ chế bảo mật xác thực quên mật khẩu.

#### 3. [LỖ HỔNG P1 - HIGH] Thiếu Auth Guards trên 6 Endpoint Quản trị Tài khoản (Admin User APIs)
- **Vị trí:** File [user.controller.ts](file:///platform/apps/identity-service/src/modules/user/user.controller.ts#L118-L171)
- **Danh sách endpoint bị khuyết Guard:**
  1. `POST /users/admin/:id/restore` (Line 118)
  2. `GET /users/admin/all` (Line 133)
  3. `POST /users/admin/customer` (Line 143)
  4. `PATCH /users/admin/:id` (Line 151)
  5. `POST /users/admin/:id/toggle-lock` (Line 160)
  6. `DELETE /users/admin/:id` (Line 166)
- **Đối chiếu an ninh:**
  - Tại Line 173 (`GET /users/admin/:id/audit-logs`), lập trình viên có gắn:
    ```typescript
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('PLATFORM_ADMIN')
    ```
  - Nhưng trên 6 endpoint admin cốt lõi kể trên, **HOÀN TOÀN KHÔNG CÓ** `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(...)`!
- **Hậu quả:** Nếu request lọt qua Gateway hoặc được gọi trực tiếp qua mạng nội bộ, bất kỳ người dùng không đăng nhập nào cũng có thể lấy danh sách toàn bộ khách hàng, khóa tài khoản, sửa thông tin, hoặc xóa vĩnh viễn user!

---

### TRỤC 4: HIỆU NĂNG, TÀI NGUYÊN & TOÀN VẸN DỮ LIỆU (PERFORMANCE & DATA INTEGRITY)

#### 1. Rò rỉ Kết nối Database Liên Service (Cross-DB Raw Connection Leak)
- **Vị trí:**
  - [auth.service.ts#L641-L669](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L641-L669) (`ensureBusinessRoleIfApproved`)
  - [user.service.ts#L18-L34](file:///platform/apps/identity-service/src/modules/user/user.service.ts#L18-L34), [L140-L176](file:///platform/apps/identity-service/src/modules/user/user.service.ts#L140-L176), [L400-L425](file:///platform/apps/identity-service/src/modules/user/user.service.ts#L400-L425), [L661-L685](file:///platform/apps/identity-service/src/modules/user/user.service.ts#L661-L685)
- **Đoạn mã vi phạm kiến trúc Microservices:**
  ```typescript
  // auth.service.ts - Chạy trên MỌI lượt ĐĂNG NHẬP và REFRESH TOKEN của user thường!
  private async ensureBusinessRoleIfApproved(user: User): Promise<User> {
    const { Client } = require('pg');
    const bizDbUrl = ... || 'postgresql://postgres:postgres123@localhost:5432/huki_business';
    const pgClient = new Client({ connectionString: bizDbUrl });
    await pgClient.connect();
    const res = await pgClient.query("SELECT id FROM businesses WHERE owner_id = $1 AND status = 'APPROVED' ...", [user.id]);
    await pgClient.end();
  }
  ```
- **Hậu quả:**
  - **Vi phạm nguyên tắc cô lập dữ liệu Microservices (Database per Service):** `identity-service` tự ý mở kết nối trực tiếp vào database của `business-service` (`huki_business`) và `commerce-service` (`huki_commerce`).
  - **Kiệt quệ Connection Pool:** Mỗi request login/refresh tạo một raw TCP connection tới PostgreSQL mà không qua connection pool. Nếu gặp tải 100 req/s, PostgreSQL sẽ cạn kiệt connection (`max_connections=100`), gây sập toàn bộ các service khác!
  - **Leak kết nối khi có lỗi:** Trong `user.service.ts#L140-L176`, lệnh `await pgClient.end()` không nằm trong khối `finally`. Bất kỳ lỗi query nào xảy ra sẽ khiến kết nối TCP bị treo vĩnh viễn trong RAM.

#### 2. Thiếu Indexing trên các Trường Tra cứu Thường xuyên (Missing Database Indexes)
- Khảo sát schema tại [schema.prisma](file:///platform/apps/identity-service/prisma/schema.prisma):
  - Model `AuthSession`: Thiếu index trên cột `refreshTokenHash`. Trong khi đó, hàm `logout` ([auth.service.ts#L556](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L556)) tra cứu: `where: { refreshTokenHash: tokenHash }`. Mỗi lần người dùng logout sẽ gây ra Full Table Scan trên bảng session!
  - Model `User`: Cột `emailVerificationToken` và `passwordResetToken` không hề có index. Khi người dùng xác thực OTP hoặc đặt lại mật khẩu, hệ thống phải quét tuần tự toàn bộ bảng `users`.

---

### TRỤC 5: HẠ TẦNG, MẠNG & KHẢ NĂNG PHỤC HỒI (INFRASTRUCTURE & RESILIENCE)

#### 1. Hệ thống Outbox Bị Tê Liệt (Dead Transactional Outbox Pipeline)
- **Vị trí:**
  - File [auth.service.ts#L879-L895](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L879-L895)
  - File [identity-outbox.publisher.ts](file:///platform/apps/identity-service/src/modules/outbox/identity-outbox.publisher.ts)
  - File [outbox.service.ts](file:///platform/apps/identity-service/src/modules/outbox/outbox.service.ts)
- **Hiện trạng kiểm tra thực tế:**
  - `IdentityOutboxPublisher` được cấu hình chạy ngầm mỗi 1 giây (`setInterval(..., 1000)`), quét bảng `outbox_events` với status `PENDING` để publish lên RabbitMQ Topic Exchange `huki.events`.
  - Nhưng trong `auth.service.ts`, các sự kiện quan trọng (`UserRegisteredEvent`, `UserLoggedInEvent`, `UserEmailVerifiedEvent`) chỉ được bắn vào `this.eventEmitter.emit(...)` của thư viện NestJS In-Memory `EventEmitter2`.
  - **Trong toàn bộ identity-service, KHÔNG CÓ BẤT KỲ listener nào hứng các event này để ghi vào outbox!** Class `IdentityOutboxService.addToOutbox()` không hề được gọi ở bất cứ đâu!
- **Hậu quả:** Bảng `outbox_events` luôn trống rỗng (`count = 0`). RabbitMQ không bao giờ nhận được bất kỳ event nào từ `identity-service`. Khi người dùng đăng ký hoặc xác thực email, các service như `analytics-service` hoặc `business-service` hoàn toàn không nhận được dữ liệu đồng bộ.

#### 2. Khả năng chịu lỗi khi Redis gặp sự cố (Redis Resilience)
- **Khảo sát:** File [maintenance.service.ts#L22-L55](file:///platform/apps/identity-service/src/modules/maintenance/maintenance.service.ts#L22-L55)
- **Đánh giá:** Logic xử lý tại `MaintenanceService` rất tốt. Thao tác đọc/ghi cấu hình bảo trì hệ thống đều được bọc trong khối `try/catch`. Nếu Redis sập, service tự động fallback đọc trực tiếp từ PostgreSQL bảng `system_maintenance_config`, không làm gián đoạn luồng kiểm tra bảo trì của hệ thống.

---

### TRỤC 6: LOGGING, GIÁM SÁT & XỬ LÝ LỖI (OBSERVABILITY & ERROR HANDLING)

#### 1. [AN NINH] Lộ Mã OTP Rõ Trong Log Tập Trung (PII & Secret Leakage)
- **Vị trí:**
  - [auth.service.ts#L94](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L94): `this.logger.log(\`[AUTH OTP] Email verification code for ${updatedPendingUser.email}: ${emailVerificationToken}\`);`
  - [auth.service.ts#L130](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L130): `this.logger.log(\`[AUTH OTP] Email verification code for ${user.email}: ${emailVerificationToken}\`);`
  - [auth.service.ts#L289](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L289): `this.logger.log(\`[AUTH OTP] Re-sent verification code for ${user.email}: ${emailVerificationToken}\`);`
  - [user.service.ts#L438](file:///platform/apps/identity-service/src/modules/user/user.service.ts#L438): `console.log(\`[USER DELETION OTP] OTP for ${user.email}: ${otp}\`);`
- **Hậu quả:** Mã OTP xác thực email và mã OTP hủy tài khoản bị ghi nguyên văn dưới dạng Plaintext ra console. Trong môi trường production, các log này được thu thập bởi Promtail/Loki/CloudWatch, cho phép bất kỳ nhân viên vận hành hoặc hacker có quyền đọc log chiếm đoạt mã OTP.

#### 2. Bỏ qua Lỗi Thu hồi Session (Swallowed Exception)
- **Vị trí:** File [user.service.ts#L522-L525](file:///platform/apps/identity-service/src/modules/user/user.service.ts#L522-L525)
- **Đoạn mã:**
  ```typescript
  await this.prisma.authSession.updateMany({
    where: { userId },
    data: { revokedAt: new Date() },
  }).catch(() => {});
  ```
- **Hậu quả:** Sử dụng `.catch(() => {})` nuốt chửng lỗi mà không ghi log cảnh báo. Nếu database bị timeout hoặc deadlock khi revoke session, hệ thống vẫn tiếp tục báo thành công cho client trong khi các session cũ vẫn hoạt động bình thường.

#### 3. Nhật ký Kiểm toán Quản trị (Governance Audit Trail)
- **Đánh giá:** Bảng `audit_logs` được triển khai tốt trong `user.service.ts`. Mọi thao tác hủy tài khoản, khôi phục tài khoản hoặc cập nhật bởi admin đều ghi nhận đầy đủ `actorId`, `actorRole`, `beforeState`, `afterState` và `changedFields`.

---

## PHẦN 3: BẢNG MA TRẬN RỦI RO SƠ BỘ (PRELIMINARY RISK MATRIX)

| Mã Bug ID | Phân loại (Category) | File : Line Number | Mức độ | Mô tả Tóm tắt Lỗi & Hậu quả | Đề xuất Khắc phục Kỹ thuật |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **BUG-ID-01** | `[SECURITY]` | `auth.service.ts:392-455` | **P0** | **Bypass Đăng nhập Google không cần token:** Gửi POST `{"email": "..."}` bypass toàn bộ bước xác thực OAuth2, chiếm quyền mọi tài khoản. | Bắt buộc phải có `dto.idToken` hoặc `dto.accessToken` hợp lệ; cấm tin cậy `dto.email` gửi trực tiếp từ client body. |
| **BUG-ID-02** | `[SECURITY]` | `auth.service.ts:698-703` | **P0** | **Cửa sau Đặt lại Mật khẩu:** Cho phép token `'123456'` hoặc bất kỳ chuỗi nào khi `NODE_ENV !== 'production'` chiếm quyền user reset pass gần nhất. | Xóa bỏ hoàn toàn nhánh fallback `123456` và `NODE_ENV !== 'production'`. Token phải khớp 100% với database. |
| **BUG-ID-03** | `[SECURITY]` | `user.controller.ts:118-171` | **P1** | **Thiếu Guard trên 6 Admin Endpoints:** Các API khôi phục, danh sách, tạo, sửa, khóa, xóa user không được bọc `JwtAuthGuard` & `RolesGuard`. | Bổ sung `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles('PLATFORM_ADMIN')` cho toàn bộ các endpoint admin. |
| **BUG-ID-04** | `[PERF/INFRA]` | `auth.service.ts:641-669`<br>`user.service.ts:140, 400, 661` | **P1** | **Rò rỉ kết nối Cross-DB unpooled:** Khởi tạo `new Client()` sang DB khác trên mỗi lượt login/refresh, không giải phóng kết nối trong `finally`. | Thay thế truy vấn cross-DB trực tiếp bằng gRPC / HTTP Internal Call hoặc đồng bộ trạng thái qua RabbitMQ Event. |
| **BUG-ID-05** | `[LOGIC/BIZ]` | `auth.service.ts:879-895`<br>`outbox.publisher.ts:40-75` | **P1** | **Outbox Pipeline Bị Tê Liệt:** Event phát ra in-memory không ai lắng nghe; `outbox_events` trống rỗng, RabbitMQ không bao giờ nhận được user events. | Chuyển luồng `emit` sang gọi trực tiếp `IdentityOutboxService.addToOutbox()` trong cùng Prisma Transaction với User update. |
| **BUG-ID-06** | `[UI/UX - API Mapping]` | `auth.service.ts:309, 360` | **P2** | **User Enumeration trên Login:** Email không tồn tại trả về 404, sai mật khẩu trả về 401, cho phép dò quét danh sách email đăng ký. | Chuẩn hóa toàn bộ lỗi đăng nhập thất bại về `401 Unauthorized` với mã lỗi chung `AUTH_LOGIN_INVALID_CREDENTIALS`. |
| **BUG-ID-07** | `[LOG/OBSERVABILITY]` | `auth.service.ts:94, 130, 289`<br>`user.service.ts:438` | **P2** | **Lộ mã OTP ra Log Console:** Plaintext OTP được in ra log stream, có nguy cơ bị đánh cắp qua hệ thống gom log tập trung. | Loại bỏ việc in mã OTP ra console ở môi trường Staging/Production hoặc che dấu (masking). |
| **BUG-ID-08** | `[UI/UX - API Mapping]` | `password.dto.ts:19, 31`<br>`register.dto.ts:18` | **P2** | **Bất đối xứng chính sách mật khẩu:** Đăng ký bắt buộc ký tự đặc biệt, nhưng đổi mật khẩu và đặt lại mật khẩu cho phép đặt pass yếu `12345678`. | Đồng bộ decorator `@Matches` quy định độ phức tạp mật khẩu từ `RegisterDto` sang `ResetPasswordDto` và `ChangePasswordDto`. |
| **BUG-ID-09** | `[LOGIC/BIZ]` | `user.service.ts:501-550` | **P2** | **Thiếu Worker xóa tài khoản định kỳ:** User trạng thái `PENDING_DELETION` sau 7 ngày không bao giờ được xóa thật do thiếu cron job. | Xây dựng Scheduled Cron Job quét các tài khoản quá hạn 7 ngày để thực hiện anonymize hoặc chuyển sang `DELETED`. |
| **BUG-ID-10** | `[PERF/INFRA]` | `schema.prisma:81-103` | **P3** | **Thiếu Index trên AuthSession & User:** Cột `refreshTokenHash`, `emailVerificationToken`, `passwordResetToken` không có database index. | Thêm `@@index([refreshTokenHash])` vào `AuthSession` và index tương ứng trên `User`. |
| **BUG-ID-11** | `[LOG/OBSERVABILITY]` | `user.service.ts:522-525` | **P3** | **Nuốt ngoại lệ khi revoke session:** Dùng `.catch(() => {})` khiến lỗi revoke session bị bỏ qua trong im lặng. | Ghi nhận lỗi bằng `this.logger.error(...)` để theo dõi và xử lý. |

---

## KẾT LUẬN & ĐỊNH HƯỚNG BƯỚC TIẾP THEO

Báo cáo đã bóc tách toàn diện 6 trục vận hành của `identity-service`, xác định chính xác **2 lỗ hổng an ninh cấp độ P0 (Critical)** cho phép chiếm quyền tài khoản tùy ý, cùng các điểm yếu về hiệu năng liên kết cơ sở dữ liệu và đường truyền sự kiện bất đồng bộ.

Kết quả kiểm tra tĩnh này là cơ sở vững chắc để thiết kế bộ kịch bản kiểm thử thực nghiệm (Proof of Concept Test Scripts) nhằm tái hiện chính xác 100% các lỗi trên môi trường runtime tại Task 11 & Task 12.

