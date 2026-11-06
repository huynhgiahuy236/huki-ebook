# MASTER TOPOLOGY & RUNTIME ARCHITECTURE

Báo cáo kiểm toán kiến trúc vi dịch vụ và cấu trúc vận hành Runtime thực tế của hệ thống **HUKI EBOOK Platform**.
Toàn bộ dữ liệu dưới đây được trích xuất 100% trực tiếp từ các tệp cấu hình triển khai, mã nguồn khởi chạy, khai báo phụ thuộc và schema cơ sở dữ liệu thực tế tại repository (không suy đoán, không mock, không viết theo sách giáo khoa).

---

## 1. INFRASTRUCTURE & ORCHESTRATION

### 1.1. Cấu trúc Monorepo / Multi-repo
Hệ thống được quy hoạch theo mô hình **Monorepo kết hợp 2 workspace chính**:
1. **Platform Workspace (`/platform`)**:
   - Monorepo quản lý bởi **Nx** kết hợp **NestJS CLI** và `npm workspaces` (`platform/package.json`, `platform/nx.json`, `platform/tsconfig.base.json`).
   - Chứa **8 Microservices Backend** độc lập tại `platform/apps/` (`api-gateway`, `identity-service`, `business-service`, `commerce-service`, `shipping-service`, `community-service`, `promotion-service`, `analytics-service`).
   - Chứa thư viện dùng chung **Shared Library** tại `platform/libs/shared/` (`@huki/shared`: domain events, errors, interceptors, jwt secrets, decorators).
2. **Web Frontend Workspace (`/web`)**:
   - Ứng dụng Frontend độc lập phát triển trên **Next.js 16.3.3** (App Router & Pages Router) và **React 19.2.8** (`web/package.json`, `web/next.config.ts`).
3. **Docker Infrastructure (`/docker`)**:
   - Nginx reverse proxy routing (`docker/nginx/huki.conf`).
   - Database bootstrap scripts (`docker/postgres/init-multiple-databases.sh`).
   - Provisioning & dashboard templates cho monitoring stack.

### 1.2. Orchestration Tool
Triển khai điều phối đa môi trường bằng **Docker Compose**:
- **Local Infrastructure Stack (`docker-compose.yml`)**:
  - Dựng các core database, cache và message broker dùng cho Local Development (`postgres:15-alpine`, `mongo:6`, `redis:7-alpine`, `rabbitmq:3-management-alpine`).
- **Production Stack (`docker-compose.prod.yml`)**:
  - Khởi chạy đầy đủ 4 container hạ tầng + 8 container backend services + 1 container Next.js Web frontend.
  - Sử dụng Docker Healthchecks cho từng service (`/api/v1/health/live`, `pg_isready`, `mongosh ping`, `redis-cli ping`, `rabbitmq-diagnostics`).
- **UAT / Staging Stack (`docker-compose.uat.yml`)**:
  - Khởi chạy song song toàn bộ cụm Microservices dành riêng cho môi trường UAT (`huki-uat-api-gateway`, `huki-uat-web`, `huki-uat-*-service`), trỏ tới các database UAT độc lập (`huki_uat_*`, `community_uat_db`).
- **Observability Stack (`docker-compose.observability.yml`)**:
  - Dựng hệ thống giám sát phân tán gồm: Prometheus 2.48.0 (9090), Grafana Loki 2.9.2 (3100), Promtail 2.9.2, Grafana Tempo 2.3.1 (3200, 4317, 4318), Grafana Dashboard 10.2.0 (3101:3000).

### 1.3. Danh sách Networks nội bộ
- **Network chính**: `huki-network` (driver: `bridge`, external: `true` trong stack UAT/Observability, defined trong `docker-compose.yml` và `docker-compose.prod.yml`).
- Toàn bộ giao tiếp giữa các container Microservices và hạ tầng cơ sở dữ liệu, broker diễn ra hoàn toàn bên trong bridge network `huki-network` thông qua Docker DNS aliases (`postgres`, `mongo`, `redis`, `rabbitmq`, `api-gateway`, `identity-service`, `business-service`, `commerce-service`, `shipping-service`, `community-service`, `promotion-service`, `analytics-service`).

---

## 2. GATEWAY & INGRESS ROUTING

### 2.1. Ingress Engine & Cấu hình điều phối
Hệ thống sử dụng mô hình Ingress 2 lớp (Two-tier Ingress):
- **Lớp 1 - Reverse Proxy biên (Edge Proxy)**: Nginx (Cấu hình: `docker/nginx/huki.conf`).
  - Lắng nghe cổng công khai `80` (HTTP).
  - Điều hướng domain Production (`hukiebook.duckdns.org`):
    - `location /api/` -> `http://127.0.0.1:3000` (API Gateway Production)
    - `location /` -> `http://127.0.0.1:3100` (Web Frontend Production)
  - Điều hướng domain UAT (`huki-uat.duckdns.org`):
    - `location /api/` -> `http://127.0.0.1:3010` (API Gateway UAT)
    - `location /` -> `http://127.0.0.1:3110` (Web Frontend UAT)
- **Lớp 2 - API Gateway trung tâm**: NestJS Application (`platform/apps/api-gateway`).
  - Điểm khởi chạy: `platform/apps/api-gateway/src/main.ts`
  - Tiền tố API toàn cục: `api/v1`
  - Bộ định tuyến Proxy động: `platform/apps/api-gateway/src/modules/proxy/service-proxy.middleware.ts`
  - Phân loại cấp độ bảo mật: `platform/apps/api-gateway/src/modules/proxy/route-classification.ts`
  - Middleware xác thực Token: `platform/apps/api-gateway/src/modules/auth/auth.middleware.ts`
  - WebSocket Upgrade: Lắng nghe sự kiện HTTP Upgrade `server.on('upgrade')` tại `main.ts`, chuyển tiếp luồng TCP Socket.IO trực tiếp sang `community-service:3005`.

### 2.2. Danh sách Ports công khai & Nội bộ
| Thành phần | Container Port | Host Port (Local/Dev) | Host Port (Prod Stack) | Host Port (UAT Stack) | Ghi chú an ninh |
|---|---|---|---|---|---|
| **Nginx** | 80 | 80 | 80 (Public) | 80 (Public) | Cổng mở ra Internet |
| **API Gateway** | 3000 | 3000 | 3000:3000 | 127.0.0.1:3010:3000 | Chỉ Nginx / Localhost truy cập |
| **Next.js Web** | 3100 | 3100 | 3100:3100 | 127.0.0.1:3110:3100 | Cổng ứng dụng giao diện |
| **Identity Service** | 3001 | 3001 | Không publish | Không publish | Nội bộ `huki-network` |
| **Business Service** | 3002 | 3002 | Không publish | Không publish | Nội bộ `huki-network` |
| **Commerce Service** | 3003 | 3003 | Không publish | Không publish | Nội bộ `huki-network` |
| **Shipping Service** | 3004 | 3004 | Không publish | Không publish | Nội bộ `huki-network` |
| **Community Service**| 3005 | 3005 | Không publish | Không publish | Nội bộ `huki-network` |
| **Promotion Service**| 3007 | 3007 | Không publish | Không publish | Nội bộ `huki-network` |
| **Analytics Service**| 3008 | 3008 | Không publish | Không publish | Nội bộ `huki-network` |
| **PostgreSQL** | 5432 | 5432:5432 | 127.0.0.1:5432:5432 | 127.0.0.1:5432:5432 | Khóa IP ngoài, chỉ bind localhost |
| **MongoDB** | 27017 | 27017:27017 | 127.0.0.1:27017:27017 | 127.0.0.1:27017:27017 | Khóa IP ngoài, chỉ bind localhost |
| **Redis** | 6379 | 6379:6379 | 127.0.0.1:6379:6379 | 127.0.0.1:6379:6379 | Khóa IP ngoài, chỉ bind localhost |
| **RabbitMQ AMQP** | 5672 | 5672:5672 | 127.0.0.1:5672:5672 | 127.0.0.1:5672:5672 | Giao thức truyền tin AMQP 0-9-1 |
| **RabbitMQ Web UI** | 15672 | 15672:15672 | 127.0.0.1:15672:15672 | 127.0.0.1:15672:15672 | Quản trị hàng đợi |
| **Grafana** | 3000 | 3101:3000 | 3101:3000 | 3101:3000 | Cổng Dashboard giám sát |

### 2.3. Cơ chế xác thực & An ninh tại Gateway
1. **Kiểm tra & Giải mã Token tại Gateway (`AuthMiddleware`)**:
   - Trích xuất Bearer Token từ Header `Authorization: Bearer <token>` hoặc Cookies (`huki_access_token`, `token`, `accessToken`).
   - Giải mã và xác thực chữ ký số bằng thuật toán HMAC SHA-256 qua bí mật chia sẻ `getJwtSecret()`.
   - Gán payload giải mã vào đối tượng `req.user` ({ id, email, role, businessId }). Nếu token lỗi hoặc hết hạn, gán `req.authError` tương ứng.
2. **Phân tầng tuyến đường (Security Tiers Enforcement)**:
   - **`PUBLIC`**: Cho phép truy cập không yêu cầu token (Login, Register, Callback PayOS, Giao vận, Xem danh mục sách, Bài viết). Nếu client cố ý truyền token hỏng/hết hạn, Gateway chủ động trả về `401 Unauthorized` để client kích hoạt cơ chế Refresh Token.
   - **`AUTHENTICATED`**: Yêu cầu token hợp lệ (`user` bắt buộc tồn tại). Áp dụng cho: Giỏ hàng, Đặt hàng, Xem thông tin cá nhân, Đánh giá sách.
   - **`SELLER`**: Yêu cầu token hợp lệ VÀ `user.role` thuộc tập `SELLER_ROLES` (`SELLER`, `BUSINESS`, `BUSINESS_OWNER`, `BUSINESS_STAFF`, `PLATFORM_ADMIN`, `ADMIN`, `SUPER_ADMIN`). Áp dụng cho: Quản lý sách người bán, Khuyến mãi cửa hàng.
   - **`ADMIN`**: Yêu cầu token hợp lệ VÀ `user.role` thuộc tập `ADMIN_ROLES` (`PLATFORM_ADMIN`, `ADMIN`, `SUPER_ADMIN`). Áp dụng cho: Quản trị tài chính, Kiểm duyệt nội dung, Quản trị hệ thống.
3. **Cơ chế Chống giả mạo Header (Identity Header Stripping & Forwarding)**:
   - Gateway **xóa sạch toàn bộ header định danh do client gửi lên**: `x-user-*`, `x-business-id`, `x-store-id`, `x-internal-service`, `x-roles`.
   - Gateway tự động sinh hoặc kế thừa correlation ID: `x-correlation-id`.
   - Nếu user đã được xác thực hợp lệ, Gateway tự chèn các Header tin cậy gửi tới downstream:
     + `x-user-id: <user.id>`
     + `x-user-role: <user.role>`
     + `x-user-email: <user.email>`
     + `x-business-id: <user.businessId>` (nếu có)
4. **Cơ chế xác thực tại Downstream Services (Defense-in-Depth)**:
   - `business-service` và `promotion-service`: Ưu tiên đọc trực tiếp các Header tin cậy `x-user-id`, `x-user-role` từ Gateway; nếu không có mới fallback kiểm tra Bearer JWT.
   - `commerce-service`, `shipping-service`, `community-service`: Giữ guard độc lập tự verify lại Bearer JWT bằng `jwtService.verifyAsync` để phòng ngừa bypass gateway.
   - **Internal APIs cấm public**: Tuyệt đối không khai báo route `/internal/*` trên Gateway. Các lời gọi nội bộ bắt buộc phải kèm Header `x-internal-service-key` (khớp với biến môi trường `INTERNAL_SERVICE_KEY`).

### 2.4. Bảng ánh xạ định tuyến Gateway (Routing Matrix)
*(Trích xuất nguyên văn từ `service-proxy.middleware.ts` & `route-classification.ts`)*

| Public Route Prefix | Upstream Service (Internal Host:Port) | Auth Policy (Gateway Security Tier) | Mô tả nghiệp vụ |
|---|---|---|---|
| `/socket.io/*` | `community-service:3005` | PUBLIC | WebSocket Realtime Handshake & Chat |
| `/api/v1/auth/login` | `identity-service:3001` | PUBLIC (Có Rate Limit 5 req/phút/IP) | Đăng nhập tài khoản |
| `/api/v1/auth/register` | `identity-service:3001` | PUBLIC | Đăng ký tài khoản người dùng |
| `/api/v1/auth/refresh` | `identity-service:3001` | PUBLIC | Cấp mới Access Token bằng Refresh Token |
| `/api/v1/auth/forgot-password` | `identity-service:3001` | PUBLIC | Yêu cầu khôi phục mật khẩu |
| `/api/v1/auth/reset-password` | `identity-service:3001` | PUBLIC | Đặt lại mật khẩu mới |
| `/api/v1/auth/verify-email` | `identity-service:3001` | PUBLIC | Xác thực email kích hoạt |
| `/api/v1/auth/google/*` | `identity-service:3001` | PUBLIC | Đăng nhập OAuth2 qua Google |
| `/api/v1/auth/*` | `identity-service:3001` | AUTHENTICATED | Đổi mật khẩu, Logout, Profile |
| `/api/v1/users/*` | `identity-service:3001` | AUTHENTICATED / ADMIN (`/users/admin/*`) | Quản lý thông tin tài khoản |
| `/api/v1/sessions/*` | `identity-service:3001` | AUTHENTICATED | Quản lý phiên đăng nhập thiết bị |
| `/api/v1/system-maintenance` | `identity-service:3001` | GET: PUBLIC / Others: ADMIN | Trạng thái bảo trì hệ thống |
| `/api/v1/system/*` | `identity-service:3001` | GET: PUBLIC / Others: ADMIN | Cấu hình bảo trì hệ thống |
| `/api/v1/maintenance/*` | `identity-service:3001` | GET: PUBLIC / Others: ADMIN | Thông số bảo trì |
| `/api/v1/businesses` (GET) | `business-service:3002` | PUBLIC | Xem danh sách doanh nghiệp |
| `/api/v1/businesses/*` | `business-service:3002` | AUTHENTICATED / ADMIN (`/businesses/admin/*`) | Đăng ký & phê duyệt doanh nghiệp |
| `/api/v1/stores` (GET) | `business-service:3002` | PUBLIC | Xem thông tin cửa hàng / storefront |
| `/api/v1/stores/*` | `business-service:3002` | AUTHENTICATED / ADMIN (`/stores/admin/*`) | Quản lý thông tin gian hàng |
| `/api/v1/members/*` | `business-service:3002` | AUTHENTICATED | Quản lý nhân sự gian hàng |
| `/api/v1/broadcast-notifications` | `business-service:3002` | GET: PUBLIC / Others: ADMIN | Thông báo diện rộng toàn sàn |
| `/api/v1/seller-features` | `business-service:3002` | GET: PUBLIC / Others: SELLER | Tính năng nâng cấp người bán |
| `/api/v1/seller-penalties` | `business-service:3002` | GET: PUBLIC / Others: ADMIN | Điểm phạt & kỷ luật người bán |
| `/api/v1/seller/features` | `business-service:3002` | GET: PUBLIC / Others: SELLER | Tính năng người bán (route override) |
| `/api/v1/seller/penalties` | `business-service:3002` | GET: PUBLIC / Others: ADMIN | Điểm phạt người bán (route override) |
| `/api/v1/books` (GET) | `commerce-service:3003` | PUBLIC | Tra cứu danh mục sách công khai |
| `/api/v1/books` (POST/PUT/PATCH/DELETE) | `commerce-service:3003` | SELLER | Đăng và cập nhật sách của gian hàng |
| `/api/v1/books/*/digital` | `commerce-service:3003` | AUTHENTICATED | Đọc ebook và kiểm tra bản quyền số |
| `/api/v1/books/*/forensics` | `commerce-service:3003` | AUTHENTICATED | Thủy vân số (Digital Watermarking DRM) |
| `/api/v1/books/:id/reviews` | `community-service:3005` | GET: PUBLIC / Mutations: AUTH | Đánh giá nhận xét cho từng cuốn sách |
| `/api/v1/stores/:id/reviews` | `community-service:3005` | GET: PUBLIC / Mutations: AUTH | Đánh giá nhận xét cho từng gian hàng |
| `/api/v1/catalog/*` | `commerce-service:3003` | PUBLIC | Danh mục sản phẩm & sách nổi bật |
| `/api/v1/categories/*` | `commerce-service:3003` | PUBLIC | Thể loại sách |
| `/api/v1/authors/*` | `commerce-service:3003` | PUBLIC | Tác giả sách |
| `/api/v1/publishers/*` | `commerce-service:3003` | PUBLIC | Nhà xuất bản |
| `/api/v1/ai-audio/plans` | `commerce-service:3003` | PUBLIC | Bảng giá gói Audio AI |
| `/api/v1/ai-audio/*` | `commerce-service:3003` | AUTHENTICATED | Đọc sách giọng nói AI |
| `/api/v1/reader/*` | `commerce-service:3003` | AUTHENTICATED | Trình đọc sách điện tử (Web Reader) |
| `/api/v1/forensics/*` | `commerce-service:3003` | AUTHENTICATED | DRM Forensics & Chống sao chép |
| `/api/v1/cart/*` | `commerce-service:3003` | AUTHENTICATED | Giỏ hàng người dùng |
| `/api/v1/orders/*` | `commerce-service:3003` | AUTHENTICATED | Tạo đơn hàng, danh sách đơn hàng |
| `/api/v1/payments/webhook` | `commerce-service:3003` | PUBLIC | Webhook nhận thanh toán từ PayOS |
| `/api/v1/payments/*` | `commerce-service:3003` | AUTHENTICATED | Khởi tạo cổng thanh toán PayOS/COD |
| `/api/v1/wallet/*` | `commerce-service:3003` | AUTHENTICATED / ADMIN (`/wallet/admin/*`) | Ví điện tử & số dư doanh nghiệp |
| `/api/v1/payout/*` | `commerce-service:3003` | AUTHENTICATED / ADMIN (`/payout/admin/*`) | Rút tiền và quyết toán doanh thu |
| `/api/v1/ledger/*` | `commerce-service:3003` | ADMIN (`/ledger/admin/*`) | Sổ cái tài chính hệ thống |
| `/api/v1/sanctions/*` | `commerce-service:3003` | ADMIN | Chế tài vi phạm & đóng băng ví |
| `/api/v1/affiliate/program` | `commerce-service:3003` | PUBLIC | Thông tin chương trình Tiếp thị liên kết |
| `/api/v1/affiliate/catalog` | `commerce-service:3003` | PUBLIC | Danh mục sách tham gia Affiliate |
| `/api/v1/affiliate/resolve/*` | `commerce-service:3003` | PUBLIC | Giải mã link rút gọn Affiliate |
| `/api/v1/r/*` | `commerce-service:3003` | PUBLIC | Link chuyển tiếp Affiliate Tracker |
| `/api/v1/affiliate/*` | `commerce-service:3003` | AUTHENTICATED | Dashboard & hoa hồng Affiliate |
| `/api/v1/seller/vouchers/*` | `promotion-service:3007` | SELLER (Override) | Quản lý voucher của gian hàng |
| `/api/v1/seller/discounts/*` | `promotion-service:3007` | SELLER (Override) | Quản lý giảm giá riêng của gian hàng |
| `/api/v1/seller/*` | `commerce-service:3003` | SELLER | Kênh người bán: Đơn hàng, Doanh số |
| `/api/v1/shipping/rates` | `shipping-service:3004` | PUBLIC | Bảng giá cước vận chuyển công khai |
| `/api/v1/shipping/methods` | `shipping-service:3004` | PUBLIC | Phương thức giao hàng khả dụng |
| `/api/v1/shipping/callbacks/*` | `shipping-service:3004` | PUBLIC | Webhook hãng vận chuyển đối tác |
| `/api/v1/callbacks/*` | `shipping-service:3004` | PUBLIC | Callback vận chuyển |
| `/api/v1/shipping/*` | `shipping-service:3004` | AUTHENTICATED | Tính cước, địa chỉ giao hàng |
| `/api/v1/shipments/*` | `shipping-service:3004` | AUTHENTICATED | Tra cứu vận đơn & tiến trình |
| `/api/v1/delivery-staff/*` | `shipping-service:3004` | AUTHENTICATED (SHIPPER/DELIVERY) | Phân công & tác nghiệp nhân viên giao hàng |
| `/api/v1/vouchers` (GET) | `promotion-service:3007` | PUBLIC | Danh sách voucher công khai |
| `/api/v1/vouchers/*` | `promotion-service:3007` | AUTHENTICATED | Kiểm tra áp dụng mã giảm giá |
| `/api/v1/banners/*` | `promotion-service:3007` | PUBLIC | Banner quảng cáo, trang chủ |
| `/api/v1/flash-sales` (GET) | `promotion-service:3007` | PUBLIC | Các khung giờ Flash Sale công khai |
| `/api/v1/flash-sales/seller/*` | `promotion-service:3007` | SELLER | Đăng ký sách tham gia Flash Sale |
| `/api/v1/flash-sales/*` | `promotion-service:3007` | AUTHENTICATED | Quản lý phiên Flash Sale |
| `/api/v1/discounts/seller/*` | `promotion-service:3007` | SELLER | Thiết lập chương trình giảm giá |
| `/api/v1/discounts/*` | `promotion-service:3007` | AUTHENTICATED | Chiết khấu & quà tặng kèm |
| `/api/v1/chat/ai/*` | `community-service:3005` | PUBLIC | Trợ lý ảo AI tư vấn đọc sách |
| `/api/v1/chat/*` | `community-service:3005` | AUTHENTICATED | Hội thoại Chat giữa Khách và Shop |
| `/api/v1/forum/*` | `community-service:3005` | AUTHENTICATED | Diễn đàn & bài viết cộng đồng |
| `/api/v1/reviews/*` | `community-service:3005` | GET: PUBLIC / Mutations: AUTH | Quản lý đánh giá |
| `/api/v1/notifications/*` | `community-service:3005` | AUTHENTICATED | Hộp thư thông báo cá nhân |
| `/api/v1/moderation/*` | `community-service:3005` | ADMIN | Kiểm duyệt bình luận, đánh giá xấu |
| `/api/v1/admin/broadcast-notifications` | `business-service:3002` | ADMIN (Override) | Gửi thông báo broadcast hệ thống |
| `/api/v1/admin/finance/*` | `commerce-service:3003` | ADMIN (Override) | Quản trị tài chính, đối soát sàn |
| `/api/v1/admin/drm/*` | `commerce-service:3003` | ADMIN (Override) | Quản trị vi phạm bản quyền số |
| `/api/v1/admin/affiliates/*` | `commerce-service:3003` | ADMIN (Override) | Phê duyệt & quyết toán Affiliate |
| `/api/v1/admin/*` | `community-service:3005` | ADMIN | Quản trị cộng đồng & kiểm duyệt |
| `/api/v1/events/*` | `analytics-service:3008` | AUTHENTICATED / PUBLIC | Thu thập telemetry hành vi người dùng |
| `/api/v1/analytics/*` | `analytics-service:3008` | AUTHENTICATED / ADMIN | Thống kê báo cáo số liệu vận hành |

---

## 3. HỆ THỐNG TRUYỀN THÔNG ĐỒNG BỘ & BẤT ĐỒNG BỘ

### 3.1. Truyền thông đồng bộ (Inter-Service Synchronous Calls)
Hệ thống sử dụng các cuộc gọi HTTP REST nội bộ trực tiếp giữa các container trong mạng `huki-network`, bảo vệ bằng Header `x-internal-service-key: <INTERNAL_SERVICE_KEY>`:

| Caller Service | Target Service | Giao thức / Endpoint mục tiêu | Nghiệp vụ xử lý | Cơ chế bảo vệ & Cấm Public |
|---|---|---|---|---|
| **commerce-service** | `shipping-service:3004` | `GET /api/v1/internal/addresses/:id`<br>`GET /api/v1/internal/addresses?userId=:id` | Lấy và kiểm tra quyền sở hữu địa chỉ giao hàng của người mua | `x-internal-service-key` + `x-user-id` (Chặn hoàn toàn tại Gateway) |
| **commerce-service** | `shipping-service:3004` | `POST /api/v1/shipping/fee`<br>`POST /api/v1/shipping/fee/multi` | Tính toán biểu phí vận chuyển theo khối lượng và địa bàn người bán | `x-internal-service-key` |
| **commerce-service** | `promotion-service:3007` | `POST /api/v1/vouchers/validate` | Kiểm tra tính hợp lệ và hạn mức voucher khi người dùng checkout | `x-internal-service-key` + `x-user-id` |
| **commerce-service** | `promotion-service:3007` | `POST /api/v1/vouchers/apply` | Đánh dấu tiêu thụ (consume) lượt dùng voucher khi tạo đơn hàng | `x-internal-service-key` + `x-user-id` |
| **commerce-service** | `promotion-service:3007` | `POST /api/v1/vouchers/rollback` | Hoàn trả lượt dùng voucher khi đơn hàng bị hủy | `x-internal-service-key` |
| **commerce-service** | `promotion-service:3007` | `POST /api/v1/flash-sales/validate-quota`<br>`POST /api/v1/flash-sales/reserve`<br>`POST /api/v1/flash-sales/release-order` | Giữ chỗ số lượng Flash Sale và giải phóng khi quá thời gian thanh toán | `x-internal-service-key` |
| **commerce-service** | `promotion-service:3007` | `GET /api/v1/discounts/active/:bookId`<br>`GET /api/v1/flash-sales/price/:bookId` | Lấy giá ưu đãi flash sale / giảm giá seller cho sách trong giỏ hàng | `x-internal-service-key` |
| **commerce-service** | `business-service:3002` | `GET /api/v1/stores/:id`<br>`GET /api/v1/businesses/:id` | Lấy tên gian hàng hiển thị trong giỏ hàng và chi tiết đơn hàng | Internal HTTP call (có LRU Cache 60s) |
| **community-service**| `commerce-service:3003` | `GET /api/v1/books/:bookId` | Tra cứu storeId và ownerUserId của cuốn sách để định tuyến đánh giá | Internal HTTP call |
| **community-service**| `commerce-service:3003` | `GET /api/v1/orders/:orderId`<br>`GET /api/v1/orders` | Xác thực người đánh giá đã thực sự mua và nhận hàng thành công (Verified Purchase) | Forward Authorization Bearer của người dùng |
| **promotion-service**| `commerce-service:3003` | `GET /api/v1/books/:bookId`<br>`GET /api/v1/books?limit=20` | Kiểm tra tồn kho vật lý của sách khi người bán đăng ký vào phiên Flash Sale | Internal HTTP call |
| **analytics-service**| `commerce-service:3003` | `GET /api/books/:bookId/metadata`<br>`POST /api/books/metadata/batch` | Lấy thông tin giá, danh mục, tác giả sách để xây dựng đồ thị tương đồng (Affinity Graph) | Axios HTTP Client |
| **web (SSR Proxy)** | `api-gateway:3000` | `/api/v1/*` | Next.js Server Components / API proxy chuyển tiếp request từ trình duyệt vào Gateway | Forward Cookie / Bearer |

> **CẢNH BÁO KIẾN TRÚC VI PHẠM DATA ISOLATION (CROSS-DB QUERY):**
> Phát hiện tại file `platform/apps/commerce-service/src/common/seller-scope.util.ts` (dòng 11-29 và 49-62):
> `commerce-service` không gọi qua HTTP API mà **tự ý mở một PostgreSQL Connection Pool (`pg.Pool`) kết nối trực tiếp vào database của `business-service` (`huki_business`)** để thực thi câu lệnh Raw SQL:
> ```sql
> SELECT b.id AS business_id, b.owner_id, s.id AS store_id 
> FROM businesses b LEFT JOIN stores s ON s.business_id = b.id ...
> ```
> Điều này vi phạm nghiêm trọng tính đóng gói (Data Encapsulation) của mô hình Microservices.

---

### 3.2. Truyền thông bất đồng bộ (Asynchronous Event Bus & Queues)
- **Message Broker**: RabbitMQ 3.x với AMQP Connection Manager (`amqp-connection-manager`, `amqplib`).
- **Exchange chính**: `huki.events`
  - Kiểu Exchange: `topic`
  - Bền vững (Durable): `true`
- **Pattern áp dụng**:
  - **Transactional Outbox Pattern**: Mỗi service khi commit transaction nghiệp vụ sẽ ghi bản ghi sự kiện vào bảng `outboxEvent` trong cùng DB transaction. Một Background Worker nội bộ (`setInterval(1000)`) sẽ quét bảng outbox ở trạng thái `PENDING`, chuyển sang `PROCESSING`, bắn lên RabbitMQ Exchange `huki.events` và đánh dấu `COMPLETED`.
  - **Inbox Deduplication Pattern**: Service tiếp nhận (ví dụ `shipping-service`) kiểm tra sự kiện trùng lặp bằng bảng `inboxEvent` (`eventId`) trước khi xử lý nghiệp vụ để đảm bảo Exactly-Once / Idempotency.
  - **Dead Letter Queue (DLQ)**: Mọi queue đăng ký đều tự động khai báo queue DLQ tương ứng `<queue-name>.dlq`. Khi xử lý lỗi quá 2 lần (`x-retry-count >= 2`), message sẽ được đưa vào DLQ.

#### Ma trận luồng sự kiện (Event Flow Matrix)
*(Trích xuất từ `domain-event.ts`, `commerce-event.consumer.ts`, `notification-event.consumer.ts`, `shipping-order-event.consumer.ts`)*

| Tên Queue thực tế | Topic Routing Patterns | Publisher Service | Consumer Service(s) | Nghiệp vụ xử lý thực tế |
|---|---|---|---|---|
| `shipping-service.order-events` | `ORDER_CREATED`<br>`ORDER_PAID`<br>`ORDER_CANCELLED`<br>`SELLER_ORDER_CANCELLED` | `commerce-service` | `shipping-service` | - Tự động tạo vận đơn vận chuyển (`shipments.createFromOrder`).<br>- Hủy đơn giao vận nếu đơn hàng bị hủy (`shipments.cancelByOrder` / `cancelBySellerOrder`). |
| `commerce-service.inventory-and-completion` | `ORDER_CANCELLED`<br>`PAYMENT_FAILED`<br>`SHIPMENT_CREATED`<br>`SHIPMENT_PICKED_UP`<br>`SHIPMENT_IN_TRANSIT`<br>`SHIPMENT_OUT_FOR_DELIVERY`<br>`SHIPMENT_DELIVERED`<br>`SHIPMENT_FAILED`<br>`SHIPMENT_RETURNED`<br>`SHIPMENT_CANCELLED` | `commerce-service`<br>`shipping-service` | `commerce-service` | - Giải phóng tồn kho giữ chỗ khi đơn hàng hủy hoặc thanh toán thất bại.<br>- Cập nhật trạng thái đơn hàng (DELIVERED -> Hoàn tất; RETURNED -> Trả hàng). |
| `community-service.order-confirmations` | `ORDER_CREATED`<br>`ORDER_PAID`<br>`ORDER_CANCELLED`<br>`ORDER_COMPLETED`<br>`SELLER_ORDER_CONFIRMED`<br>`SELLER_ORDER_SHIPPED`<br>`SELLER_ORDER_CANCELLED`<br>`PAYMENT_FAILED`<br>`SHIPMENT_CREATED`<br>`SHIPMENT_OUT_FOR_DELIVERY`<br>`SHIPMENT_DELIVERED`<br>`SHIPMENT_FAILED`<br>`SHIPMENT_STAFF_ASSIGNED`<br>`chat.message.sent`<br>`review.created` | `commerce-service`<br>`shipping-service`<br>`community-service` | `community-service` | - Bắn thông báo đẩy (Push Notification & In-app Bell) cho Người mua (trạng thái đơn hàng, thanh toán, giao hàng).<br>- Bắn thông báo cho Người bán (khi có đơn mới, đánh giá mới).<br>- Bắn thông báo cho Shipper khi được gán đơn mới. |
| `outboxEvent` (Internal Worker) | N/A (Bảng Outbox DB) | `identity-service` | RabbitMQ Exchange `huki.events` | Đẩy các sự kiện: `USER_REGISTERED`, `USER_EMAIL_VERIFIED`, `USER_BLOCKED`... |
| `outboxEvent` (Internal Worker) | N/A (Bảng Outbox DB) | `business-service` | RabbitMQ Exchange `huki.events` | Đẩy các sự kiện: `BUSINESS_REGISTERED`, `BUSINESS_APPROVED`, `STORE_CREATED`... |
| `outboxEvent` (Internal Worker) | N/A (Bảng Outbox DB) | `promotion-service` | RabbitMQ Exchange `huki.events` | Đẩy các sự kiện khuyến mãi, voucher |

---

## 4. PERSISTENCE & DATA ISOLATION

### 4.1. Khảo sát Database Servers & Mô hình Lưu trữ
Hệ thống sử dụng kết hợp **Polyglot Persistence**:
1. **Relational Database**: **PostgreSQL 15** (`postgres:15-alpine`).
   - **Mô hình**: **Shared Database Server Instance** nhưng tách biệt thành các **Database logic độc lập hoàn toàn** cho từng service thông qua script `docker/postgres/init-multiple-databases.sh`.
   - Mỗi service sở hữu chuỗi kết nối riêng biệt `DATABASE_URL` tới database của mình, không dùng chung schema public.
2. **Document Database**: **MongoDB 6** (`mongo:6`).
   - **Mô hình**: Dedicated Container độc lập phục vụ lưu trữ tài liệu phi cấu trúc và hội thoại realtime của `community-service` (`community_db`).
3. **In-Memory Cache & Session Store**: **Redis 7** (`redis:7-alpine`).
   - Dùng chung cho toàn hệ thống: lưu session token, quản lý phiên đăng nhập, khóa tồn kho tạm thời, rate limiting IP, cache danh mục và bộ nhớ đệm Flash Sale.

### 4.2. Bảng ma trận Persistence & Schemas theo từng Service
*(Trích xuất từ `docker-compose.yml`, `docker-compose.prod.yml`, `docker-compose.uat.yml` và các file `schema.prisma`, `*.schema.ts`)*

| Tên Service | DB Engine | Tên Database (Prod / UAT) | Mô hình Lưu trữ | ORM / Driver | Đường dẫn File Schema thực tế |
|---|---|---|---|---|---|
| **api-gateway** | *Không có* | *Không có* | Stateless | Không dùng | *Không có (Stateless)* |
| **identity-service** | PostgreSQL 15 | `huki_identity` / `huki_uat_identity` | Isolated Database trên Shared Postgres | Prisma ORM | `platform/apps/identity-service/prisma/schema.prisma` |
| **business-service** | PostgreSQL 15 | `huki_business` / `huki_uat_business` | Isolated Database trên Shared Postgres | Prisma ORM | `platform/apps/business-service/prisma/schema.prisma` |
| **commerce-service** | PostgreSQL 15 | `huki_commerce` / `huki_uat_commerce`<br>*(Đồng thời kết nối `huki_business`)* | Primary Isolated DB + **Vi phạm đọc trực tiếp DB `huki_business`** | Prisma ORM (Commerce)<br>Raw SQL qua `pg.Pool` (Business) | `platform/apps/commerce-service/prisma/schema.prisma` |
| **shipping-service** | PostgreSQL 15 | `huki_shipping` / `huki_uat_shipping` | Isolated Database trên Shared Postgres | Prisma ORM | `platform/apps/shipping-service/prisma/schema.prisma` |
| **community-service**| MongoDB 6 | `community_db` / `community_uat_db` | Dedicated Mongo Database | Mongoose (`@nestjs/mongoose`) | `platform/apps/community-service/src/entities/*.schema.ts` (9 schemas: `conversation`, `message`, `notification`, `notification-device`, `notification-preference`, `quick-reply`, `report`, `review`, `review-reply`) |
| **promotion-service**| PostgreSQL 15 | `huki_promotion` / `huki_uat_promotion` | Isolated Database trên Shared Postgres | Prisma ORM | `platform/apps/promotion-service/prisma/schema.prisma` |
| **analytics-service**| PostgreSQL 15 | `huki_analytics` / `huki_uat_analytics` | Isolated Database trên Shared Postgres | Prisma ORM | `platform/apps/analytics-service/prisma/schema.prisma` |
| **web (Frontend)** | *Không có* | *Không có* | Stateless Next.js App | Không dùng | *Không có* |

---

## 5. MASTER SERVICE REGISTRY (100% THÀNH PHẦN HỆ THỐNG)

Bao gồm toàn bộ Microservices Backend, Frontend Web, Background Workers và Cron Jobs nội bộ đang hoạt động trong toàn bộ hệ thống:

| STT | Tên Service / Thành phần | Folder Path | Vai trò kiến trúc | Framework & Entry Point | Port Nội bộ / Host Port | Dependencies (Các service / hạ tầng gọi tới) |
|---|---|---|---|---|---|---|
| **1** | **api-gateway** | `platform/apps/api-gateway` | Reverse Proxy & Ingress Security Gateway | NestJS 10<br>`src/main.ts` | 3000 (Local)<br>Host: 3000 (Prod) / 3010 (UAT) | Gọi đồng bộ HTTP Proxy tới: `identity-service`, `business-service`, `commerce-service`, `shipping-service`, `community-service`, `promotion-service`, `analytics-service`. Cầu nối TCP Socket tới `community-service`. |
| **2** | **identity-service** | `platform/apps/identity-service` | Quản lý định danh, người dùng, OAuth, DRM session | NestJS 10<br>`src/main.ts` | 3001 | Phụ thuộc: `postgres` (`huki_identity`), `redis`, `rabbitmq`. |
| **3** | **business-service** | `platform/apps/business-service` | Quản lý doanh nghiệp, storefront, nhân sự gian hàng | NestJS 10<br>`src/main.ts` | 3002 | Phụ thuộc: `postgres` (`huki_business`), `rabbitmq`. |
| **4** | **commerce-service** | `platform/apps/commerce-service` | Lõi thương mại: Sách, Giỏ hàng, Đơn hàng, PayOS, Affiliate, Ví sàn | NestJS 10<br>`src/main.ts` | 3003 | Phụ thuộc: `postgres` (`huki_commerce`), `postgres` (`huki_business` qua pg pool), `redis`, `rabbitmq`, Cloudflare R2, Cloudinary, Cổng PayOS.<br>Gọi HTTP tới: `shipping-service`, `promotion-service`, `business-service`. |
| **5** | **shipping-service** | `platform/apps/shipping-service` | Quản lý vận chuyển, cước phí, theo dõi đơn, phân công shipper | NestJS 10<br>`src/main.ts` | 3004 | Phụ thuộc: `postgres` (`huki_shipping`), `rabbitmq`. |
| **6** | **community-service**| `platform/apps/community-service` | Hội thoại Chat realtime, Thông báo đẩy, Đánh giá nhận xét, Kiểm duyệt | NestJS 10 + Socket.IO<br>`src/main.ts` | 3005 | Phụ thuộc: `mongo` (`community_db`), `redis` (Socket.IO Adapter), `rabbitmq`, Google Gemini API.<br>Gọi HTTP tới: `commerce-service`. |
| **7** | **promotion-service**| `platform/apps/promotion-service` | Voucher, Flash Sale realtime, Banner, Chiết khấu người bán | NestJS 10<br>`src/main.ts` | 3007 | Phụ thuộc: `postgres` (`huki_promotion`), `redis` (Atomic quota decr), `rabbitmq`.<br>Gọi HTTP tới: `commerce-service`. |
| **8** | **analytics-service**| `platform/apps/analytics-service` | Thu thập hành vi, báo cáo kinh doanh, đồ thị đề xuất sách | NestJS 10<br>`src/main.ts` | 3008 | Phụ thuộc: `postgres` (`huki_analytics`).<br>Gọi HTTP tới: `commerce-service`. |
| **9** | **web** | `web` | Khách hàng & Người bán Web Portal | Next.js 16.3.3 + React 19<br>`next dev` / `next start` | 3100 (Local)<br>Host: 3100 (Prod) / 3110 (UAT) | Gọi HTTP REST & WebSocket tới `api-gateway`. |
| **10**| **DailyRollupJob** | `platform/apps/analytics-service/src/jobs/DailyRollupJob.ts` | Scheduled Cron Job: Tổng hợp báo cáo kinh doanh ngày hôm trước | NestJS `@Cron('5 0 * * *', 'Asia/Ho_Chi_Minh')` | Chạy trong process `analytics-service` | Đọc dữ liệu sự kiện từ DB `huki_analytics` và tổng hợp vào bảng rollup lúc 00:05 sáng hàng ngày. |
| **11**| **RecalculateAffinityJob** | `platform/apps/analytics-service/src/jobs/RecalculateAffinityJob.ts` | Scheduled Cron Job: Tính toán lại điểm số tương tác và độ suy giảm (decay) | NestJS `@Cron('0 3 * * *')` (Mỗi ngày lúc 03:00 AM) | Chạy trong process `analytics-service` | Quét bảng `userCategoryAffinity`, `userAuthorAffinity` để cập nhật điểm gợi ý sách cá nhân hóa. |
| **12**| **AffiliateSettlementWorker** | `platform/apps/commerce-service/src/modules/affiliate/services/affiliate-settlement-worker.service.ts` | Scheduled Cron Job: Quyết toán hoa hồng tiếp thị liên kết | NestJS `@Cron('0 17 * * *')` (00:00 VN / 17:00 UTC) | Chạy trong process `commerce-service` | Quét các hoa hồng đang ở trạng thái `HOLDING` đã đủ ngày đối soát và chuyển sang `AVAILABLE`. |
| **13**| **NotificationWatchdogService** | `platform/apps/community-service/src/modules/notifications/notification-watchdog.service.ts` | Scheduled Cron Job: Quét cảnh báo vi phạm SLA đơn hàng, chậm giao, hết hàng | NestJS `@Cron(EVERY_10_MINUTES)` | Chạy trong process `community-service` | Quét định kỳ mỗi 10 phút để phát hiện đơn hàng quá hạn xử lý và tạo cảnh báo thông báo tự động. |
| **14**| **Payment Expiration Worker** | `platform/apps/commerce-service/src/modules/payments/payments.service.ts` | Interval Worker: Hủy giao dịch PayOS treo và trả lại hàng trong kho | `setInterval(5000)` (Chạy mỗi 5 giây) | Chạy trong process `commerce-service` | Quét các giao dịch thanh toán trực tuyến quá hạn (`ORDER_PAYMENT_TTL_SECONDS`), tự hủy và nhả tồn kho. |
| **15**| **Flash Sale Status Worker** | `platform/apps/promotion-service/src/modules/flash-sales/flash-sales.service.ts` | Interval Worker: Đồng bộ trạng thái khung giờ Flash Sale & Khởi tạo Redis Stock | `setInterval(15000)` (Chạy mỗi 15 giây) | Chạy trong process `promotion-service` | Chuyển đổi trạng thái phiên UPCOMING -> ACTIVE -> EXPIRED và nạp tồn kho vào Redis. |
| **16**| **Transactional Outbox Publishers** | Nằm trong 5 services: `identity`, `business`, `commerce`, `shipping`, `promotion` | Polling Queue Worker: Quét và đẩy Domain Events từ DB lên RabbitMQ | `setInterval(1000)` (Chạy mỗi 1 giây tại từng service) | Chạy ngầm trong từng microservice | Quét bảng `outboxEvent` trạng thái `PENDING`, publish qua `RabbitMqEventBus` lên exchange `huki.events`. |

---

## 6. ĐÁNH GIÁ TỔNG QUAN VÀ KHUYẾN NGHỊ CHO QUY TRÌNH AUDIT
1. **Kiến trúc Gateway nhất quán**: Gateway kiểm soát tập trung authentication, rate limit, CORS và role-based authorization với 4 tiers phân minh.
2. **Điểm rủi ro kiến trúc (Coupling Issue)**:
   - File `commerce-service/src/common/seller-scope.util.ts` truy cập trực tiếp database `huki_business` qua SQL `pg.Pool`. Cần được refactor trong quy trình Fix để gọi qua HTTP/gRPC nội bộ của `business-service`.
   - Cổng mặc định của `loki` trong `docker-compose.observability.yml` đặt tại port `3100:3100`, có nguy cơ đụng độ với port của `web` container nếu không cấu hình phân cách.
3. **Mô hình Event-Driven hoàn chỉnh**: Việc áp dụng Transactional Outbox kết hợp Dead Letter Queue (DLQ) trên RabbitMQ và Inbox pattern tại `shipping-service` đảm bảo tính nhất quán dữ liệu cuối cùng (Eventual Consistency) rất tốt khi có biến cố mạng.

