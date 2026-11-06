# BÁO CÁO PHÂN LOẠI & TRUY VẾT GỐC RỄ LỖ HỔNG (ROOT CAUSE ANALYSIS)
## SERVICE #1: IDENTITY-SERVICE (`platform/apps/identity-service`)

> **Ngày thực hiện:** 06/11/2026  
> **Nhánh Git:** `audit/identity-service`  
> **Tài liệu tham chiếu:**  
> - Báo cáo khảo sát tĩnh 6 trục: `docs/audit/identity-service/01_EXHAUSTIVE_6AXIS_AUDIT.md`  
> - Bằng chứng kiểm thử sống (Live Test Evidence): `docs/audit/identity-service/02_LIVE_TEST_EVIDENCE.md`  
> **Kỷ luật thi công:** Tuyệt đối không nói chung chung; trích dẫn chính xác file path, function name, line numbers và bằng chứng thực tế từ raw terminal logs.

---

## TỔNG QUAN PHÂN BỔ LỖ HỔNG THEO TAXONOMY 5 NHÓM

| Nhóm Phân Loại (Taxonomy) | P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low) | Tổng số Lỗi |
|---|:---:|:---:|:---:|:---:|:---:|
| **1. `[SECURITY]`** | 2 | 1 | 0 | 0 | **3** |
| **2. `[LOGIC/BIZ]`** | 0 | 2 | 1 | 1 | **4** |
| **3. `[PERF/INFRA]`** | 0 | 1 | 1 | 0 | **2** |
| **4. `[UI/UX - API Mapping]`** | 0 | 0 | 2 | 0 | **2** |
| **5. `[LOG/OBSERVABILITY]`** | 0 | 0 | 1 | 1 | **2** |
| **TỔNG CỘNG** | **2** | **4** | **5** | **2** | **13** |

---

## CHI TIẾT BÓC TÁCH GỐC RỄ TỪNG LỖ HỔNG

### NHÓM 1: `[SECURITY]` - BẢO MẬT & KIỂM SOÁT TRUY CẬP

#### 1. `ID-SEC-001`: Bypass Đăng Nhập Google Không Cần Token (Google OAuth2 Bypass)
- **Mức độ nghiêm trọng:** `CRITICAL (P0)` - CVSS 10.0 (AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H)
- **Vị trí mã nguồn:** File [auth.service.ts#L392-L455](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L392-L455), hàm `loginWithGoogle(dto: GoogleLoginDto)`
- **Cơ chế sinh lỗi & Bằng chứng thực tế:**
  - Trong `GoogleLoginDto`, các trường `accessToken`, `idToken`, và `email` đều là `@IsOptional()`.
  - Tại dòng 393: `let email = dto.email ? dto.email.trim().toLowerCase() : undefined;`.
  - Khối xác thực qua Google UserInfo (Line 398) chỉ kích hoạt khi `dto.accessToken` tồn tại.
  - Khối xác thực qua Google ID Token (Line 418) chỉ kích hoạt khi `!email && dto.idToken`.
  - Do đó, nếu kẻ tấn công gửi payload: `{"email": "admin@huki.vn"}`:
    - `dto.accessToken` là `undefined` -> Bỏ qua kiểm tra Google UserInfo.
    - `email` đã có giá trị từ body (`admin@huki.vn`) -> Điều kiện `!email && dto.idToken` là `false` -> Bỏ qua kiểm tra Google ID Token!
    - Dòng 448: `let user = await this.prisma.user.findUnique({ where: { email } });` tìm thấy Admin và lập tức gọi `this.generateAuthResponse(user)` để cấp cặp Access Token & Refresh Token hợp lệ!
- **Tác động thực tế (Impact):** Bất kỳ ai không cần đăng nhập cũng có thể chiếm đoạt tài khoản của bất kỳ người dùng nào trên sàn (bao gồm `PLATFORM_ADMIN`, `BUSINESS`, khách hàng) chỉ với điều kiện biết địa chỉ email của họ.

#### 2. `ID-SEC-002`: Cửa Sau Đặt Lại Mật Khẩu (Password Reset Backdoor Fallback)
- **Mức độ nghiêm trọng:** `CRITICAL (P0)` - CVSS 9.8
- **Vị trí mã nguồn:** File [auth.service.ts#L698-L703](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L698-L703), hàm `resetPassword(dto: ResetPasswordDto)`
- **Cơ chế sinh lỗi & Bằng chứng thực tế:**
  ```typescript
  if (!user && (dto.token === '123456' || process.env.NODE_ENV !== 'production')) {
    user = await this.prisma.user.findFirst({
      where: { passwordResetToken: { not: null } },
      orderBy: { updatedAt: 'desc' },
    });
  }
  ```
  - Trên môi trường UAT hoặc Local Staging (`NODE_ENV !== 'production'`), điều kiện `process.env.NODE_ENV !== 'production'` luôn luôn trả về `true`.
  - Bất kỳ ai gọi `POST /api/v1/auth/reset-password` với `token: "bat_ky_chuoi_nao"` và mật khẩu mới sẽ kích hoạt lệnh query tìm người dùng vừa nhấn "Quên mật khẩu" gần nhất (`passwordResetToken: { not: null }`) và ghi đè mật khẩu của nạn nhân!
  - Trên Production, nếu kẻ tấn công nhập `token: "123456"`, backdoor vẫn bị kích hoạt.
- **Tác động thực tế (Impact):** Cho phép kẻ tấn công chiếm đoạt tài khoản ngay khi nạn nhân vừa bấm gửi yêu cầu quên mật khẩu mà không cần biết mã OTP được gửi về hòm thư của nạn nhân.

#### 3. `ID-SEC-003`: Thiếu Guard Bảo Vệ Trên 6 Endpoint Admin (Broken Object Level Authorization - BOLA)
- **Mức độ nghiêm trọng:** `HIGH (P1)` - Có thể nâng lên P0 trong môi trường Ingress Gateway lỏng lẻo.
- **Vị trí mã nguồn:** File [user.controller.ts#L118-L171](file:///platform/apps/identity-service/src/modules/user/user.controller.ts#L118-L171)
  - `POST /users/admin/:id/restore` (Line 118)
  - `GET /users/admin/all` (Line 133)
  - `POST /users/admin/customer` (Line 143)
  - `PATCH /users/admin/:id` (Line 151)
  - `POST /users/admin/:id/toggle-lock` (Line 160)
  - `DELETE /users/admin/:id` (Line 166)
- **Cơ chế sinh lỗi & Bằng chứng thực tế (Trích từ Test 3 trong `02_LIVE_TEST_EVIDENCE.md`):**
  - Controller này không gắn Guard ở cấp Class (`@Controller('users')`). Các hàm admin kể trên hoàn toàn bị bỏ quên decorator `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles('PLATFORM_ADMIN')`.
  - Bằng chứng thực thi thực tế tại Test 3:
    ```text
    🎯 Thử nghiệm 4.1: User A (Customer thường) gọi GET /api/v1/users/admin/all
    [Result 4.1] HTTP Status: 200
    🚨 LỖI BẢO MẬT XÁC THỰC [BUG-ID-03]: User A (Customer) đọc được toàn bộ 76 tài khoản người dùng của sàn!

    🎯 Thử nghiệm 4.2: User A gọi POST /api/v1/users/admin/:id/toggle-lock để khóa User B
    [Result 4.2] HTTP Status: 201 | Message: "Tạo thành công"
    User B Status in DB sau khi User A tấn công: BLOCKED
    🚨 LỖI BẢO MẬT CRITICAL [BUG-ID-03]: User A KHÔNG PHẢI ADMIN nhưng đã KHÓA THÀNH CÔNG tài khoản của User B!
    ```
- **Tác động thực tế (Impact):** Mọi người dùng thông thường hoặc kẻ tấn công ngoài mạng có thể thu thập toàn bộ danh bạ khách hàng sàn và tự ý khóa tài khoản của bất kỳ ai mà không cần quyền Admin.

---

### NHÓM 2: `[LOGIC/BIZ]` - NGHIỆP VỤ & STATE MACHINE

#### 4. `ID-BIZ-001`: Đứt Gãy Chu Kỳ Refresh Token Do Quên Ghi Bản Ghi Khởi Tạo Trong `createSession`
- **Mức độ nghiêm trọng:** `HIGH (P1)` - Functional Failure làm tê liệt cơ chế Silent Refresh
- **Vị trí mã nguồn:** File [auth.service.ts#L809-L817](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L809-L817) (`createSession`) vs [auth.service.ts#L575-L582](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L575-L582) (`refreshToken`)
- **Cơ chế sinh lỗi & Bằng chứng thực tế (Trích từ Test 2 trong `02_LIVE_TEST_EVIDENCE.md`):**
  - Khi người dùng đăng nhập (`login`) hoặc đăng ký (`register`), hàm `createSession()` tạo một bản ghi `AuthSession` lưu `refreshTokenHash: tokenHash`. Tuy nhiên, hàm này **hoàn toàn không tạo bản ghi nào trong bảng `refresh_tokens`**!
  - Khi client gửi refresh token lên `POST /api/v1/auth/refresh`, hàm `refreshToken()` lại thực hiện tra cứu:
    ```typescript
    const token = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { session: { include: { user: true } } },
    });
    if (!token) throwUnauthorized(ErrorCode.AUTH_TOKEN_EXPIRED);
    ```
  - Vì bảng `refresh_tokens` chưa từng có bản ghi khởi tạo này, hàm lập tức trả về `401 AUTH_TOKEN_EXPIRED`.
  - Bằng chứng thực nghiệm Test 2:
    ```text
    ✅ Đăng nhập thành công! RefreshToken A: 873122ce-c575-47b2-8b72-9d5d4c222b01
       - AuthSession created in DB: ID=67acb0df-dff6-4831-a533-e443b8c6fd84
       - Initial count in refresh_tokens table: 0
    [First Refresh Attempt] HTTP Status: 401 | Error Code: AUTH_TOKEN_EXPIRED
    🚨 PHÁT HIỆN LỖI RUNTIME [BUG-ID-12]: auth.service.ts createSession() không ghi bản ghi khởi tạo vào bảng refresh_tokens!
    ```
- **Tác động thực tế (Impact):** 100% người dùng đăng nhập hợp lệ trên Web và App khi hết hạn Access Token (15 phút) sẽ bị văng ra màn hình đăng nhập (Logout cưỡng bức) thay vì được Silent Refresh mượt mà.

#### 5. `ID-BIZ-002`: Tê Liệt Đường Ống Transactional Outbox (Dead Event Sourcing Pipeline)
- **Mức độ nghiêm trọng:** `HIGH (P1)` - Gãy luồng đồng bộ dữ liệu liên Service
- **Vị trí mã nguồn:** File [auth.service.ts#L879-L895](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L879-L895) (`emitUserRegistered`, `emitUserLoggedIn`, `emitUserEmailVerified`) vs [identity-outbox.publisher.ts#L40-L75](file:///platform/apps/identity-service/src/modules/outbox/identity-outbox.publisher.ts#L40-L75)
- **Cơ chế sinh lỗi & Bằng chứng thực tế (Trích từ Test 5 trong `02_LIVE_TEST_EVIDENCE.md`):**
  - `auth.service.ts` bắn sự kiện thông qua `this.eventEmitter.emit(...)` của thư viện NestJS in-memory `EventEmitter2`.
  - Khảo sát toàn bộ dự án: **Không có bất kỳ class nào lắng nghe `@OnEvent(USER_EVENTS.REGISTERED)`** để gọi `IdentityOutboxService.addToOutbox()`.
  - Bảng `outbox_events` luôn có số lượng bản ghi bằng `0`.
  - Worker `IdentityOutboxPublisher` chạy ngầm định kỳ mỗi 1 giây (`setInterval(..., 1000)`) quét một bảng rỗng, không bao giờ publish được bất kỳ message nào lên RabbitMQ Topic Exchange `huki.events`.
  - Bằng chứng thực nghiệm Test 5:
    ```text
    [Register Response] HTTP Status: 201 | Message: "Tạo thành công"
    ✅ User đã được ghi nhận vào PostgreSQL (users): ID=e5c01035-e964-463d-912a-7fd217c572bb
    📊 Số lượng sự kiện trong bảng outbox_events sau khi đăng ký: 0
    🔍 Tìm kiếm sự kiện của User trong outbox_events: 0 bản ghi
    🚨 PHÁT HIỆN LỖI KIẾN TRÚC NGHIÊM TRỌNG [BUG-ID-05 - OUTBOX PIPELINE IS DEAD]
    ```
- **Tác động thực tế (Impact):** `analytics-service`, `business-service`, `commerce-service` không bao giờ nhận được thông tin khi có người dùng đăng ký hoặc xác thực email, dẫn đến sai lệch dữ liệu báo cáo kinh doanh và không tự động khởi tạo hồ sơ người mua trên hệ thống thương mại.

#### 6. `ID-BIZ-003`: Thiếu Worker Định Kỳ Xóa Tài Khoản Quá Hạn Ân Hạn (Zombie Pending Deletions)
- **Mức độ nghiêm trọng:** `MEDIUM (P2)`
- **Vị trí mã nguồn:** File [user.service.ts#L501-L550](file:///platform/apps/identity-service/src/modules/user/user.service.ts#L501-L550) (`confirmDeletion`)
- **Cơ chế sinh lỗi:**
  - `confirmDeletion()` chuyển trạng thái người dùng thành `PENDING_DELETION` và gán `deletionScheduledAt = now + 7 days`.
  - Không có bất kỳ Cron Job hoặc Background Task nào được lập lịch để quét các bản ghi có `deletionScheduledAt <= now` nhằm thực hiện ẩn danh hóa hoặc xóa triệt để (`DELETED`).
- **Tác động thực tế (Impact):** Tài khoản bị treo ở trạng thái chờ xóa vĩnh viễn, vi phạm chính sách bảo mật quyền riêng tư của khách hàng và tiêu chuẩn pháp lý (GDPR/Nghị định 13/2023/NĐ-CP).

#### 7. `ID-BIZ-004`: Mã Lỗi Refresh Token Không Phân Biệt Giữa Token Hết Hạn Và Tài Khoản Bị Khóa
- **Mức độ nghiêm trọng:** `LOW (P3)`
- **Vị trí mã nguồn:** File [auth.service.ts#L580, L604](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L580)
- **Cơ chế sinh lỗi:**
  - Cả 4 trường hợp: Token không tồn tại, Token hết hạn TTL, Phiên bị Revoke, và Tài khoản bị `BLOCKED`/`DELETED` đều ném chung một mã lỗi duy nhất: `throwUnauthorized(ErrorCode.AUTH_TOKEN_EXPIRED)`.
- **Tác động thực tế (Impact):** Web Client không thể phân biệt lý do lỗi để xử lý UX: Nếu là hết hạn bình thường thì thử refresh lại hoặc chuyển về trang login; nếu tài khoản bị Admin khóa (`BLOCKED`) thì cần thông báo "Tài khoản của bạn đã bị khóa bởi quản trị viên" thay vì báo "Token hết hạn".

---

### NHÓM 3: `[PERF/INFRA]` - HIỆU NĂNG, TÀI NGUYÊN & HẠ TẦNG

#### 8. `ID-PERF-001`: Rò Rỉ Kết Nối Raw Unpooled Cross-Database Trên Mọi Lượt Đăng Nhập
- **Mức độ nghiêm trọng:** `HIGH (P1)` - Nguy cơ làm sập cơ sở dữ liệu PostgreSQL
- **Vị trí mã nguồn:** 
  - [auth.service.ts#L641-L669](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L641-L669) (`ensureBusinessRoleIfApproved`)
  - [user.service.ts#L18-L34, L140-L176, L400-L425, L661-L685](file:///platform/apps/identity-service/src/modules/user/user.service.ts#L18-L34)
- **Cơ chế sinh lỗi:**
  - `auth.service.ts` tự ý `require('pg')`, khởi tạo một TCP Client đơn lẻ không qua Connection Pool: `new Client({ connectionString: bizDbUrl })` và thực hiện `await pgClient.connect()` rồi query sang database `huki_business` **mỗi khi có bất kỳ user thông thường nào đăng nhập hoặc refresh token!**
  - Tại `user.service.ts#L140-L176`, lệnh `await pgClient.end()` không nằm trong khối `finally`. Nếu câu lệnh SQL `SELECT ... FROM businesses` gặp lỗi runtime, kết nối TCP đến PostgreSQL sẽ bị treo và không bao giờ được đóng lại.
- **Tác động thực tế (Impact):**
  - Phá vỡ nguyên tắc Database-per-service của Microservices.
  - Khi có 100 người dùng đăng nhập đồng thời, PostgreSQL sẽ bị quá tải số lượng connection (`max_connections=100`), dẫn đến từ chối dịch vụ (Connection Limit Exceeded) trên toàn bộ hệ sinh thái HuKi.

#### 9. `ID-PERF-002`: Thiếu Database Indexes Trên Các Cột Tra Cứu Thường Xuyên
- **Mức độ nghiêm trọng:** `MEDIUM (P2)`
- **Vị trí mã nguồn:** File [schema.prisma#L27-L34, L81-L103](file:///platform/apps/identity-service/prisma/schema.prisma#L81-L103)
- **Cơ chế sinh lỗi:**
  - Bảng `auth_sessions`: Hàm `logout` ([auth.service.ts#L556](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L556)) tra cứu theo điều kiện: `where: { refreshTokenHash: tokenHash, revokedAt: null }`. Cột `refreshTokenHash` hoàn toàn không có Index.
  - Bảng `users`: Cột `emailVerificationToken` và `passwordResetToken` không có Index trong khi các API xác thực OTP và đổi mật khẩu tra cứu trực tiếp theo giá trị token.
- **Tác động thực tế (Impact):** Khi hệ thống đạt quy mô hàng chục nghìn session và người dùng, các thao tác đăng xuất, kích hoạt tài khoản và đặt lại mật khẩu sẽ thực hiện Full Table Scan, đẩy CPU PostgreSQL lên 100%.

---

### NHÓM 4: `[UI/UX - API Mapping]` - GIAO TIẾP VÀ MÃ LỖI API

#### 10. `ID-UI-001`: Lộ Danh Sách Email Qua Lệch Mã Lỗi HTTP Đăng Nhập (User Enumeration)
- **Mức độ nghiêm trọng:** `MEDIUM (P2)`
- **Vị trí mã nguồn:** File [auth.service.ts#L309](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L309) vs [auth.service.ts#L360](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L360)
- **Cơ chế sinh lỗi:**
  - Nếu email không tồn tại trong hệ thống: Trả về mã lỗi `404 Not Found` với message `"Tài khoản không tồn tại trên hệ thống"`.
  - Nếu email có tồn tại nhưng nhập sai mật khẩu: Trả về mã lỗi `401 Unauthorized` với message `"Mật khẩu không chính xác"`.
- **Tác động thực tế (Impact):** Kẻ tấn công có thể chạy script kiểm tra hàng loạt danh sách email (từ các vụ rò rỉ dữ liệu ngoài) để biết chính xác email nào đang là khách hàng của HuKi Ebook, phục vụ cho các chiến dịch lừa đảo (phishing) nhắm đích.

#### 11. `ID-UI-002`: Bất Đối Xứng Chính Sách Độ Phức Tạp Mật Khẩu
- **Mức độ nghiêm trọng:** `MEDIUM (P2)`
- **Vị trí mã nguồn:** File [register.dto.ts#L18](file:///platform/apps/identity-service/src/modules/auth/dto/register.dto.ts#L18) vs [password.dto.ts#L19, L31](file:///platform/apps/identity-service/src/modules/auth/dto/password.dto.ts#L19)
- **Cơ chế sinh lỗi:**
  - `RegisterDto` bắt buộc mật khẩu phải thỏa mãn: Tối thiểu 8 ký tự, gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt (`@$!%*?&`).
  - Trong khi đó, `ResetPasswordDto` và `ChangePasswordDto` chỉ kiểm tra `@MinLength(8)` và `@MaxLength(100)`, không hề có decorator regex `@Matches`.
- **Tác động thực tế (Impact):** Người dùng khi đăng ký bị bắt đặt mật khẩu mạnh, nhưng sau đó có thể vào chức năng "Đổi mật khẩu" hoặc "Quên mật khẩu" để đặt lại thành các mật khẩu cực yếu như `12345678` hay `password`, vô hiệu hóa chính sách an toàn thông tin của nền tảng.

---

### NHÓM 5: `[LOG/OBSERVABILITY]` - GIÁM SÁT & TRUY VẾT DỮ LIỆU

#### 12. `ID-LOG-001`: Rò Rỉ Mã OTP Xác Thực Nguyên Văn Ra Console/Log Stream
- **Mức độ nghiêm trọng:** `MEDIUM (P2)`
- **Vị trí mã nguồn:** File [auth.service.ts#L94, L130, L289](file:///platform/apps/identity-service/src/modules/auth/auth.service.ts#L94) và [user.service.ts#L438](file:///platform/apps/identity-service/src/modules/user/user.service.ts#L438)
- **Cơ chế sinh lỗi:**
  - Mã nguồn sử dụng `this.logger.log(\`[AUTH OTP] Email verification code for ${user.email}: ${emailVerificationToken}\`);` và `console.log(\`[USER DELETION OTP] OTP for ${user.email}: ${otp}\`);`.
- **Tác động thực tế (Impact):** Trong môi trường phân tán, các log này được các log shipper (Promtail, Vector, Fluentbit) đẩy về Loki/Elasticsearch. Bất kỳ ai có quyền xem log đều có thể đọc được mã OTP theo thời gian thực và chiếm quyền tài khoản hoặc kích hoạt xóa tài khoản mà không cần vào hộp thư người dùng.

#### 13. `ID-LOG-002`: Nuốt Ngoại Lệ Bằng Khối `.catch(() => {})` Khi Thu Hồi Phiên
- **Mức độ nghiêm trọng:** `LOW (P3)`
- **Vị trí mã nguồn:** File [user.service.ts#L522-L525](file:///platform/apps/identity-service/src/modules/user/user.service.ts#L522-L525)
- **Cơ chế sinh lỗi:**
  ```typescript
  await this.prisma.authSession.updateMany({
    where: { userId },
    data: { revokedAt: new Date() },
  }).catch(() => {});
  ```
  - Lệnh update thu hồi phiên khi người dùng yêu cầu xóa tài khoản bị bọc bởi `.catch(() => {})` rỗng.
- **Tác động thực tế (Impact):** Nếu có lỗi mạng hoặc lỗi cơ sở dữ liệu khiến session không bị thu hồi, hệ thống hoàn toàn im lặng, không ghi nhận bất kỳ cảnh báo lỗi nào vào hệ thống giám sát Sentry/Datadog.

---

## KẾT LUẬN

13 lỗi trên đã được định danh, phân tích cơ chế kích hoạt và định vị chính xác vị trí dòng lệnh trong mã nguồn thực tế. Đây là cơ sở cốt lõi để xây dựng tài liệu thiết kế giải pháp `04_SOLUTION_DESIGN.md`.

