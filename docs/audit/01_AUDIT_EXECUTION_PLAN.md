# KẾ HOẠCH & THỨ TỰ THI CÔNG AUDIT TOÀN DIỆN HỆ THỐNG
## (DEPENDENCY PIPELINE & AUDIT EXECUTION ORDER)

Tài liệu này xác lập lộ trình kiểm toán (Audit Pipeline) có thứ tự ưu tiên logic theo luồng dữ liệu (Data & Auth Flow), phân cấp rủi ro kiến trúc và xác định Service tiên phong để kích hoạt quy trình Audit - Fix - Verify cho hệ thống Microservices **HUKI EBOOK Platform**.

Toàn bộ kế hoạch được xây dựng dựa trên kết quả khảo sát thực tế tại [`docs/audit/00_MASTER_TOPOLOGY.md`](file:///e:/HuKi/docs/audit/00_MASTER_TOPOLOGY.md).

---

## 1. PHÂN CẤP ĐỘ RỦI RO KIẾN TRÚC (RISK TIERS)

Hệ thống gồm 8 Microservices Backend, 1 Web Frontend Next.js và cụm Background Workers được phân bổ vào 5 cấp độ rủi ro (Risk Tiers) từ gốc tới ngọn:

```
[Tier 0: Security & Ingress Core]
         │  (identity-service, api-gateway)
         ▼
[Tier 1: Core Financial & Organization]
         │  (business-service, commerce-service)
         ▼
[Tier 2: Operational & Fulfillment]
         │  (promotion-service, shipping-service)
         ▼
[Tier 3: Community, Realtime & Analytics]
         │  (community-service, analytics-service)
         ▼
[Tier 4: Frontend Presentation & E2E]
            (web Next.js Client)
```

### 🔴 Tier 0: Critical Infrastructure / Security Core
- **Bao gồm:** `identity-service`, `api-gateway`.
- **Đặc trưng:** Là gốc rễ bảo mật (Root of Trust) và cửa ngõ điều phối toàn bộ lưu lượng của hệ thống.
- **Tác động khi xảy ra lỗi:**
  - Nếu `identity-service` lỗi: Gãy toàn bộ quy trình đăng ký, đăng nhập, cấp phát và thu hồi JWT token; tê liệt cơ chế phân quyền RBAC và giới hạn thiết bị đọc sách DRM.
  - Nếu `api-gateway` lỗi: Gãy toàn bộ định tuyến hệ thống, lộ lọt header giả mạo từ client (`x-user-id`, `x-user-role`), rò rỉ endpoint nội bộ cấm public (`/internal/*`), hoặc gây sập toàn sàn (502 Bad Gateway).

### 🟠 Tier 1: Core Financial & Money Flow
- **Bao gồm:** `business-service`, `commerce-service`.
- **Đặc trưng:** Quản lý cấu trúc pháp nhân/gian hàng, danh mục sách, giỏ hàng, quy trình thanh toán PayOS, ví người bán, sổ cái tài chính sàn, ký quỹ escrow và hoa hồng tiếp thị liên kết (Affiliate).
- **Tác động khi xảy ra lỗi:**
  - Thất thoát tài chính, sai lệch số dư ví, rò rỉ thanh toán PayOS.
  - Bán vượt tồn kho (Overselling / Inventory race conditions).
  - Vi phạm đóng gói dữ liệu (Cross-DB Query từ commerce sang business).
  - Gian lận hoa hồng Affiliate hoặc phát tán lậu bản quyền sách điện tử DRM.

### 🟡 Tier 2: Operational & Fulfillment
- **Bao gồm:** `promotion-service`, `shipping-service`.
- **Đặc trưng:** Nghiệp vụ trợ lực thương mại và hoàn tất đơn hàng: Mã giảm giá (Vouchers), Phiên bán chớp nhoáng (Flash Sale realtime với Redis atomic decrement), Định tuyến vận chuyển, Tính cước đa tiêu chí, và Điều phối bưu tá (Shipper COD).
- **Tác động khi xảy ra lỗi:**
  - Lạm dụng mã giảm giá, áp trùng voucher dẫn đến đơn hàng âm tiền.
  - Lệch tồn kho Flash Sale giữa Redis in-memory và PostgreSQL persistence.
  - Tính sai cước phí vận chuyển; mất dấu vận đơn hoặc lỗi xử lý dòng tiền COD bưu tá.
  - Crash Loop container do lỗi script migration (từng gây ra lỗi `BUG-UAT-001`).

### 🟢 Tier 3: Community & Analytics
- **Bao gồm:** `community-service`, `analytics-service`.
- **Đặc trưng:** Tương tác người dùng xã hội và thông minh hóa dữ liệu: Chat trực tuyến qua WebSocket (Socket.IO), Đánh giá nhận xét có chứng thực mua hàng (Verified Purchase), Hộp thư thông báo đẩy, Trợ lý ảo AI tư vấn sách (Gemini), Thu thập telemetry hành vi, Báo cáo kinh doanh tự động (Daily Rollup cron), và Đồ thị tương đồng sở thích đọc (Affinity scoring).
- **Tác động khi xảy ra lỗi:**
  - Spam đánh giá ảo; lộ lọt tin nhắn riêng tư giữa khách hàng và gian hàng.
  - Memory leak do không dọn dẹp kết nối WebSocket Socket.IO.
  - Báo cáo tài chính ngày chạy sai múi giờ (UTC vs UTC+7).
  - Tắc nghẽn kết nối cơ sở dữ liệu do lượng sự kiện telemetry ghi dồn dập.

### 🔵 Tier 4: Frontend Presentation & E2E
- **Bao gồm:** `web` (Next.js 16.3.3 + React 19.2.8).
- **Đặc trưng:** Cổng giao diện hợp nhất đa đối tượng (Người mua, Chủ gian hàng, Nhân viên bưu tá, Quản trị viên sàn).
- **Tác động khi xảy ra lỗi:**
  - Sai khác giữa SSR và Client Hydration (Hydration Error).
  - Treo vòng lặp Refresh Token khiến người dùng bị văng khỏi phiên làm việc.
  - Rò rỉ thông tin nhạy cảm (Private IP, Secret Key, Localhost) ra file bundle JavaScript phía client.
  - Sai lệch luồng hiển thị (ví dụ đơn sách điện tử DRM hiển thị thông tin bưu tá giao hàng).

---

## 2. BẢNG THỨ TỰ XỬ LÝ TUẦN TỰ (SERVICE EXECUTION ORDER)

Quy định lộ trình kiểm toán tuần tự từ **#1 đến #9**. Mỗi bước chỉ được tiến hành khi các điều kiện tiên quyết của bước trước đã được xác minh đạt chuẩn:

| Thứ tự (#) | Tên Service | Cấp độ rủi ro | Các điểm "nóng" cần soi kỹ nhất (Hotspots) | Điều kiện tiên quyết (Prerequisites) |
|:---:|---|:---:|---|---|
| **#1** | **identity-service** | **Tier 0** | - Thuật toán băm mật khẩu Bcrypt (rounds = 10).<br>- Độ an toàn phát hành JWT (`JWT_SECRET`, thời hạn 15m/7d, cấu trúc payload).<br>- Race condition khi quay vòng Refresh Token đồng thời.<br>- Giới hạn thiết bị DRM (`DRM_MAX_ACTIVE_DEVICES = 5`).<br>- Chống brute-force trên `/auth/login`.<br>- Phục hồi Transactional Outbox khi event kẹt `PROCESSING` quá 60s. | Hạ tầng cơ sở:<br>- `postgres` (`huki_identity`)<br>- `redis` (Cache & Sessions)<br>- `rabbitmq` (`huki.events`) |
| **#2** | **api-gateway** | **Tier 0** | - Lỗ hổng rò rỉ phân tầng Security Tier (`classifyRoute` trong `route-classification.ts`).<br>- Khả năng bóc sạch 100% Header giả mạo từ client (`x-user-*`, `x-business-id`, `x-internal-*`).<br>- Tính chính xác của Header Forwarding (`x-user-id`, `x-user-role`, `x-correlation-id`).<br>- Chặn triệt để các endpoint nội bộ (`/internal/*`) khỏi Internet.<br>- Treo kết nối khi upload file lớn (PDF 100MB, ảnh 5MB).<br>- Nguy cơ Retry Storm trên các phương thức mutation (`POST`/`PATCH`).<br>- Cầu nối TCP WebSocket Upgrade sang `community-service`. | Đã chạy và kiểm thử đạt chuẩn:<br>- `identity-service` (#1) |
| **#3** | **business-service** | **Tier 1** | - Máy trạng thái phê duyệt doanh nghiệp (`PENDING` -> `APPROVED` / `REJECTED` / `SUSPENDED`).<br>- Tính cô lập đa gian hàng (Chủ shop A không thể can thiệp shop B).<br>- Phân quyền RBAC nội bộ shop (`BUSINESS_OWNER` vs `BUSINESS_STAFF`).<br>- Điểm phạt vi phạm của người bán và cơ chế tự động khóa shop.<br>- Transactional Outbox cho các sự kiện `BUSINESS_*`. | Đã chạy và kiểm thử đạt chuẩn:<br>- `identity-service` (#1)<br>- `api-gateway` (#2) |
| **#4** | **commerce-service** | **Tier 1** | - **Khắc phục lỗi kiến trúc Cross-DB Query (`seller-scope.util.ts`) dùng `pg.Pool` đọc trực tiếp DB `huki_business`**.<br>- Race condition tranh mua tồn kho sách vật lý (Overselling).<br>- Xác thực chữ ký số webhook PayOS (`PAYOS_CHECKSUM_KEY`) và Idempotency.<br>- Tự hủy đơn hết hạn thanh toán (`ORDER_PAYMENT_TTL_SECONDS = 900s`) và nhả tồn kho.<br>- Tính đúng hoa hồng sàn (`PLATFORM_COMMISSION_PERCENT = 10%`), giam và giải phóng ký quỹ Escrow.<br>- Quyết toán hoa hồng Affiliate (`AffiliateSettlementWorker` lúc 00:00 VN).<br>- Bảo hộ bản quyền Ebook DRM (Cấp quyền đọc & Thủy vân số Forensic). | Đã chạy và kiểm thử đạt chuẩn:<br>- `identity-service` (#1)<br>- `api-gateway` (#2)<br>- `business-service` (#3) |
| **#5** | **promotion-service** | **Tier 2** | - Khử triệt để lỗi Crash Loop container do lệnh khởi động `prisma migrate` (`BUG-UAT-001`).<br>- Đồng bộ tồn kho Flash Sale giữa Redis atomic counter và PostgreSQL persistence.<br>- Kiểm soát hạn mức voucher sàn và voucher shop (chống áp dụng lặp, chống âm tiền đơn hàng).<br>- Cơ chế hoàn trả (rollback) lượt dùng voucher và quota Flash Sale khi đơn bị hủy.<br>- Worker đồng bộ trạng thái khung giờ Flash Sale (`setInterval(15000)`). | Đã chạy và kiểm thử đạt chuẩn:<br>- `commerce-service` (#4) (Để lấy thông tin sách tham gia khuyến mãi) |
| **#6** | **shipping-service** | **Tier 2** | - Tính toán cước phí vận chuyển bậc thang chính xác theo địa bàn và khối lượng hàng.<br>- Chặn hoàn toàn các API nội bộ tra cứu địa chỉ (`/internal/addresses`) nếu thiếu `x-internal-service-key`.<br>- Xử lý sự kiện bất đồng bộ `ORDER_CREATED` từ RabbitMQ để tự tạo vận đơn có kiểm tra trùng lặp (`inboxEvent`).<br>- Quy trình tác nghiệp bưu tá: Phân công đơn, chuyển trạng thái giao hàng và đối soát tiền thu hộ COD. | Đã chạy và kiểm thử đạt chuẩn:<br>- `commerce-service` (#4)<br>- `identity-service` (#1) |
| **#7** | **community-service** | **Tier 3** | - Ràng buộc chặt chẽ đánh giá nhận xét: Bắt buộc kiểm tra `Verified Purchase` qua `commerce-service`.<br>- Quản lý phòng chat WebSocket (Socket.IO) giữa Người mua và Gian hàng, chống rò rỉ bộ nhớ.<br>- Trợ lý ảo AI (`POST /api/v1/chat/ai`): Kiểm soát hạn mức token Gemini API, chống rò rỉ prompt hệ thống.<br>- Watchdog SLA Scanner (`@Cron(EVERY_10_MINUTES)`): Quét đơn trễ hạn và cảnh báo, tránh spam notification. | Đã chạy và kiểm thử đạt chuẩn:<br>- `identity-service` (#1)<br>- `commerce-service` (#4)<br>- `api-gateway` (#2) |
| **#8** | **analytics-service** | **Tier 3** | - Khả năng chịu tải của endpoint thu thập telemetry (`/api/v1/events`), chống nghẽn DB connection pool.<br>- Job tự động tổng hợp báo cáo ngày (`DailyRollupJob` lúc 00:05 UTC+7), tính toán chuẩn xác ngày kinh doanh trước đó.<br>- Job tính toán độ tương đồng sở thích (`RecalculateAffinityJob` lúc 03:00 AM) và hệ số suy giảm decay.<br>- Client giao tiếp với catalog commerce qua `CatalogClientService`. | Đã chạy và kiểm thử đạt chuẩn:<br>- `commerce-service` (#4)<br>- `postgres` (`huki_analytics`) |
| **#9** | **web** | **Tier 4** | - Khắc phục 100% lỗi SSR vs Client Hydration trên toàn bộ các route.<br>- Cơ chế tự động làm mới token (Silent Token Refresh) qua Axios/Fetch interceptor, không redirect vòng lặp.<br>- Rà soát bảo mật: Tuyệt đối không để lộ key/secret, không gọi `localhost` trên môi trường triển khai.<br>- Kiểm thử E2E trọn vẹn toàn bộ 5 luồng người dùng: Guest -> Khách mua -> Người bán -> Bưu tá -> Quản trị viên sàn. | Toàn bộ 8 Backend Services (#1 -> #8) đã được kiểm thử và đạt trạng thái Healthy. |

---

## 3. XÁC NHẬN SERVICE TIÊN PHONG

Chỉ định chính thức: **Service #1 - `identity-service`** được chọn làm **Service Tiên phong (Pioneer Service)** để kích hoạt ngay lập tức Giai đoạn 1 (Task 3 - Setup Branch & Task 4 - Deep Audit).

### Lý do lựa chọn `identity-service` làm mắt xích khởi đầu:
1. **Gốc rễ định danh của toàn bộ nền tảng (Root of Trust):**
   - Mọi thực thể nghiệp vụ trên sàn (Người mua, Chủ gian hàng, Nhân viên bán hàng, Bưu tá giao vận, Quản trị viên hệ thống) đều bắt nguồn từ bảng `users` trong cơ sở dữ liệu `huki_identity`.
   - Nếu `identity-service` chưa được xác thực tính đúng đắn về mã hóa mật khẩu, cấu trúc token JWT và kiểm soát quyền hạn, toàn bộ các bài kiểm thử tại `api-gateway` và các service phía sau sẽ buộc phải dùng dữ liệu giả (mock) – điều này vi phạm trực tiếp nguyên tắc thi công.
2. **Độc lập hoàn toàn về mặt liên kết dịch vụ (Zero Microservice Dependencies):**
   - `identity-service` không gọi đồng bộ (HTTP/gRPC) tới bất kỳ microservice nào khác.
   - Service chỉ phụ thuộc trực tiếp vào hạ tầng nền tảng cơ bản: PostgreSQL (`huki_identity`), Redis và RabbitMQ.
3. **Cung cấp "Bộ chứng chỉ kiểm thử chuẩn" (Golden Test Personas):**
   - Ngay sau khi hoàn thành rà soát và ổn định `identity-service`, chúng ta sẽ có ngay 4 tài khoản thử nghiệm thật mang đầy đủ vai trò nghiệp vụ trên cơ sở dữ liệu thực:
     + `buyer@huki.local` (Vai trò: `USER`)
     + `seller@huki.local` (Vai trò: `BUSINESS_OWNER`)
     + `shipper@huki.local` (Vai trò: `DELIVERY_STAFF` / `SHIPPER`)
     + `admin@huki.local` (Vai trò: `PLATFORM_ADMIN`)
   - Bộ token thật này sẽ được dùng xuyên suốt để kích hoạt kiểm thử an ninh Ingress tại Service #2 (`api-gateway`) và các tầng tiếp theo một cách khách quan và chính xác 100%.

---

## 4. CHIẾN LƯỢC QUẢN LÝ NHÁNH & MÔI TRƯỜNG CHO TASK 3
- Nhánh cơ sở: `develop` (nhánh hiện tại của kho lưu trữ).
- Nhánh làm việc quy chuẩn cho từng service: `audit/<service-name>` (ví dụ: `audit/identity-service`).
- Nguyên tắc an toàn: Không can thiệp trực tiếp lên `main` hay `develop` khi chưa hoàn tất kiểm thử hồi quy; toàn bộ commit cục bộ tuân thủ chuẩn Conventional Commits.

---

ĐÃ XÁC LẬP XONG LỘ TRÌNH THỰC THI VÀO `docs/audit/01_AUDIT_EXECUTION_PLAN.md`. ĐÃ XÁC ĐỊNH SERVICE ĐẦU TIÊN CẦN XỬ LÝ. SẴN SÀNG NHẬN MESSAGE 3 ĐỂ SETUP WORKSPACE & BRANCHING.

