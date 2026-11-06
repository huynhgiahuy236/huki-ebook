# BÁO CÁO KIỂM TOÁN TĨNH 6 TRỤC CHUYÊN SÂU - SERVICE: API-GATEWAY
**Dịch vụ:** `api-gateway` (Service #2 - Tier 0 Ingress & Security Edge)  
**Mã nguồn:** `platform/apps/api-gateway/`  
**Ngày thực hiện:** 06/11/2026  
**Nhánh kiểm toán:** `audit/api-gateway`  
**Trạng thái:** Hoàn tất khảo sát toàn diện mã nguồn

---

## 1. TỔNG QUAN KIẾN TRÚC INGRESS VÀ ĐIỀU PHỐI (INGRESS ARCHITECTURE)

`api-gateway` là cửa ngõ duy nhất (Single Ingress Point) đứng trước 7 Microservices nội bộ, chịu trách nhiệm tiếp nhận lưu lượng mạng từ Internet (cổng công khai 3000 và Next.js Web Frontend tại cổng 3100), thực hiện:
1. **Phân loại cấp độ bảo mật (Security Tiers):** `PUBLIC`, `AUTHENTICATED`, `SELLER`, `ADMIN`.
2. **Xác thực JWT biên (Edge JWT Authentication):** Giải mã chữ ký số, trích xuất danh tính và phân quyền vai trò người dùng (`USER`, `SELLER`, `BUSINESS`, `PLATFORM_ADMIN`).
3. **Phòng vệ giả mạo Header (Anti-Spoofing Defense):** Loại bỏ các header định danh do client tự gửi và chèn các header tin cậy (`x-user-id`, `x-user-role`, `x-business-id`, `x-correlation-id`).
4. **Proxy & Streaming chuyển tiếp:** Sử dụng `http.request` chuyển tiếp request tới các dịch vụ downstream tương ứng theo bảng ánh xạ routing `ROUTES`.
5. **Cầu nối nâng cấp WebSocket TCP:** Chuyển tiếp kết nối Socket.IO tới `community-service` (Port 3005).

---

## 2. KẾT QUẢ RÀ SOÁT TĨNH CHUYÊN SÂU THEO 6 TRỤC

### TRỤC 1: ROUTING ACCURACY & SECURITY TIERS (INGRESS & ACCESS CONTROL)
- **Cơ chế phân loại Security Tiers (`route-classification.ts`):**
  + Tầng bảo vệ chia thành 4 cấp bậc:
    - `PUBLIC`: Endpoint công khai, không đòi hỏi xác thực token (Catalog, Tra cứu, Public Auth, Webhooks, Health).
    - `AUTHENTICATED`: Đòi hỏi Bearer Token hợp lệ (Cart, Checkout, Me, Chat, Orders).
    - `SELLER`: Yêu cầu các vai trò thuộc `SELLER_ROLES` (`SELLER`, `BUSINESS`, `BUSINESS_OWNER`, `BUSINESS_STAFF`, `ADMIN`, `PLATFORM_ADMIN`).
    - `ADMIN`: Yêu cầu các vai trò thuộc `ADMIN_ROLES` (`ADMIN`, `PLATFORM_ADMIN`, `SUPER_ADMIN`).
- **Phát hiện lỗi định tuyến & Bất cập Regex:**
  + **Lỗi khớp tuyệt đối (Exact Equality Vulnerability):** Các route xác thực công khai tại `route-classification.ts:70-77` sử dụng so sánh chuỗi tuyệt đối:
    ```typescript
    normPath === '/auth/login' || normPath === '/auth/register' ...
    ```
    Nếu client gửi request có dấu gạch chéo cuối (`/api/v1/auth/login/`) hoặc dư dấu gạch chéo (`/api/v1//auth/login`), hàm `normalizePath` trả về `/auth/login/`. Điều kiện `===` bị false, request bị rơi xuống quy tắc mặc định (Dòng 204: `return 'AUTHENTICATED'`), dẫn đến việc khách vãng lai đăng nhập/đăng ký bị trả về **401 Unauthorized (`AUTH_TOKEN_MISSING`)**.
  + **Lỗi chuẩn hóa Path phân biệt hoa/thường (`normalizePath`):**
    ```typescript
    const stripped = pathWithoutQuery.replace(/^\/api\/v1/, '');
    ```
    Phương thức `replace` không có cờ `i` (case-insensitive). Nếu request gửi `/API/V1/auth/login`, tiền tố không bị bóc tách, dẫn đến nhận diện sai toàn bộ Security Tier.
- **Rà soát Trọng tâm Thanh toán (PayOS Webhook Focus):**
  + Tuyến đường PayOS Webhook được định nghĩa tại `commerce-service` là `@Post('webhooks/payos')` thuộc Controller `payments`.
  + Tại `route-classification.ts:89`, quy tắc kiểm tra: `normPath.startsWith('/payments/webhook')`. Vì `/payments/webhooks/payos` bắt đầu bằng chuỗi này nên route được phân loại đúng là `PUBLIC`.
  + **NGUY CƠ BỊ CHẶN BỞI TOKEN RÁC (`service-proxy.middleware.ts:158-160`):**
    ```typescript
    } else if (tier === 'PUBLIC') {
      if (authError && req.headers.authorization) {
        return this.sendUnauthorized(res, req, authError.code, authError.message);
      }
    }
    ```
    Nếu dịch vụ thanh toán bên ngoài (hoặc hệ thống mô phỏng webhook) gửi kèm Header `Authorization` (ví dụ: chữ ký số, Webhook Secret Token, hoặc Basic Auth), `AuthMiddleware` tại Gateway sẽ cố giải mã nó bằng JWT Secret của Huki. Khi `jwt.verify` thất bại, Gateway thiết lập `authError` và **lập tức từ chối webhook với mã 401 Unauthorized**! Đây là rủi ro P0 làm gián đoạn việc xác nhận đơn hàng khi thanh toán trực tuyến.

---

### TRỤC 2: CƠ CHẾ HEADER STRIPPING & FORWARDING (ANTI-SPOOFING DEFENSE)
- **Hiện trạng tại `service-proxy.middleware.ts:381-393`:**
  ```typescript
  // 1. Strip all incoming identity headers from untrusted client
  for (const key of Object.keys(forwarded)) {
    const lower = key.toLowerCase();
    if (
      lower.startsWith('x-user-') ||
      lower === 'x-business-id' ||
      lower === 'x-store-id' ||
      lower === 'x-internal-service' ||
      lower === 'x-roles'
    ) {
      delete forwarded[key];
    }
  }
  ```
- **LỖ HỔNG BẢO MẬT P0: BỎ SÓT HEADER NỘI BỘ (`GW-SEC-01`):**
  + Các dịch vụ downstream (`commerce-service`, `shipping-service`, `promotion-service`) sử dụng các header xác thực nội bộ:
    - `x-internal-service-key` (dùng trong tính cước vận chuyển, flash sale, voucher nội bộ).
    - `x-internal-api-key` (dùng trong kiểm tra địa chỉ và vận đơn).
  + Cơ chế xóa header của Gateway chỉ so sánh chính xác: `lower === 'x-internal-service'`.
  + Do đó, các header `x-internal-service-key` và `x-internal-api-key` **HOÀN TOÀN KHÔNG BỊ XÓA** khi đi qua Gateway!
  + Nếu kẻ tấn công từ Internet truyền các header này kèm theo request, Gateway sẽ forward nguyên vẹn tới downstream, tạo điều kiện vượt qua xác thực liên dịch vụ (Service-to-Service Bypass).
- **Cơ chế Forwarding danh tính tin cậy:**
  + Khi người dùng đăng nhập hợp lệ, Gateway trích xuất thông tin từ JWT đã giải mã và chèn:
    `x-user-id`, `x-user-role`, `x-user-email`, `x-business-id`.
  + Các header này được downstream tin tưởng tuyệt đối.
- **Tính toàn vẹn của `x-correlation-id`:**
  + Gateway kế thừa `x-correlation-id` hoặc `x-request-id` từ client, hoặc tự động sinh mới bằng `randomUUID()`. Đồng thời phản hồi lại trên Response Header `x-correlation-id`.

---

### TRỤC 3: PHÒNG VỆ ENDPOINT NỘI BỘ (INTERNAL API SHIELDING)
- **Hiện trạng lộ lọt Route Nội bộ (`GW-SEC-02`):**
  + Các dịch vụ nội bộ có các endpoint trao đổi chéo, ví dụ `shipping-service` có `@Post('fee/internal')` thuộc Controller `shipping` (đường dẫn `/api/v1/shipping/fee/internal`).
  + Gateway phân giải tuyến đường dựa vào phân đoạn đầu tiên: `shipping` -> chuyển tiếp tới `shipping-service:3004`.
  + `route-classification.ts` **HOÀN TOÀN KHÔNG CÓ BỘ LỌC CHẶN** các route có chứa `/internal/`.
  + Request từ bên ngoài gọi vào `/api/v1/shipping/fee/internal` chỉ bị xem là `AUTHENTICATED`. Nếu client gửi một JWT khách hàng bất kỳ kèm `x-internal-service-key` (do không bị strip ở Trục 2), request sẽ lọt thẳng vào endpoint nội bộ của `shipping-service`!
  + Cần thiết lập quy tắc chặn cứng tại Gateway: Mọi request từ ngoài Internet chứa phân đoạn `/internal/` hoặc kết thúc bằng `/internal` phải bị từ chối ngay lập tức với mã **403 Forbidden** hoặc **404 Not Found**.

---

### TRỤC 4: WEBSOCKET UPGRADE & STREAMING RESILIENCE
- **Hiện trạng tại `main.ts:296-318`:**
  ```typescript
  server.on('upgrade', (req: any, socket: any, head: any) => {
    if (req.url && req.url.startsWith('/socket.io')) {
      const communityHost = process.env.COMMUNITY_SERVICE_HOST || 'localhost';
      const communityPort = parseInt(process.env.COMMUNITY_SERVICE_PORT || '3005', 10);
      const proxySocket = net.connect(communityPort, communityHost, () => {
        proxySocket.write(
          `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
          Object.entries(req.headers)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join('\r\n') +
          '\r\n\r\n'
        );
        if (head && head.length > 0) proxySocket.write(head);
        socket.pipe(proxySocket).pipe(socket);
      });
      proxySocket.on('error', () => {
        socket.destroy();
      });
      socket.on('error', () => {
        proxySocket.destroy();
      });
    }
  });
  ```
- **Rủi ro rò rỉ Socket & Thiếu bảo vệ (`GW-LOGIC-01`):**
  1. **Rò rỉ Socket Descriptor:** Nếu client gửi HTTP Upgrade request tới một đường dẫn khác `/socket.io` (ví dụ `/ws`, `/graphql`), điều kiện `if` bị bỏ qua và socket **không bao giờ được giải phóng**, gây treo và chiếm dụng file descriptor của hệ điều hành.
  2. **Bỏ lọt Header giả mạo qua WebSocket:** Các header từ `req.headers` được ghi thẳng vào `proxySocket` mà không đi qua bộ lọc stripping của Gateway, cho phép client truyền các header định danh giả mạo vào `community-service`.
  3. **Độ bền khi downstream sập:** Khi `community-service` không khả dụng, `proxySocket.on('error')` gọi `socket.destroy()`, giúp Gateway không bị sập tiến trình. Tuy nhiên kết nối bị đóng thô bạo mà không gửi phản hồi HTTP 502/503.

---

### TRỤC 5: HIỆU NĂNG, STREAMING PAYLOAD & RETRY POLICY (PERF & NETWORK)
- **Giới hạn Body & Áp lực Bộ nhớ (`main.ts:28-29`, `service-proxy.middleware.ts:357-361`):**
  + Gateway cấu hình `json({ limit: '50mb' })` và `urlencoded({ limit: '50mb' })`.
  + Khi client gửi một payload JSON lớn (ví dụ upload Base64 dữ liệu sách/báo cáo):
    1. `express.json` parse toàn bộ vào đối tượng JavaScript trong bộ nhớ RAM (V8 heap).
    2. Hàm `serializeBody` trong `ServiceProxyMiddleware` lại tiếp tục gọi `JSON.stringify(req.body)`, tạo ra chuỗi string thứ hai trong bộ nhớ.
    3. `Buffer.byteLength(body)` tạo thêm buffer tính toán.
  + Điều này gây ra hiện tượng nhân 3x-4x dung lượng RAM thực tế của payload, có nguy cơ gây nghẽn rác GC và lỗi Out-Of-Memory (OOM) nếu nhiều client gửi đồng thời.
  + Đối với request dạng `multipart/form-data`, Gateway đã xử lý tốt khi không buffer JSON mà dùng `req.pipe(upstream)` để stream trực tiếp.
- **Chính sách Thử lại (Retry Policy Integrity):**
  + `RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])`.
  + `RETRYABLE_STATUS_CODES = new Set([502, 503, 504])`.
  + Các phương thức thay đổi trạng thái (`POST`, `PUT`, `PATCH`, `DELETE`) **TUYỆT ĐỐI KHÔNG RETRY**. Điều này ngăn chặn triệt để nguy cơ duplicate đơn hàng hoặc trừ tiền hai lần trên `POST /api/v1/payments/*` và `POST /api/v1/cart/checkout`.

---

### TRỤC 6: LOGGING & ERROR MAPPING
- **Chuẩn hóa Phản hồi Lỗi:**
  + Khi một service downstream bị sập (lỗi kết nối 502 hoặc timeout 504), Gateway phản hồi:
    ```json
    {
      "status": "error",
      "statusCode": 502,
      "code": "SYSTEM_UNAVAILABLE",
      "message": "Service commerce is unavailable",
      "timestamp": "2026-11-06T...",
      "path": "/api/v1/..."
    }
    ```
  + **Bất cập định dạng (`GW-OBS-01`):** Phản hồi thiếu trường `requestId` (hoặc `correlationId`) trong phần thân JSON, gây khó khăn cho việc đối soát log phân tán giữa client và hạ tầng quan sát (Loki/Tempo).
  + Tương tự, các hàm `sendUnauthorized` (401), `sendForbidden` (403) và Rate Limiting (429) tại Gateway cũng thiếu trường `requestId`.
- **An toàn Bảo mật Log:**
  + Middleware ghi log lỗi proxy qua `this.logger.warn(...)` chỉ bao gồm `method`, `originalUrl`, `service`, `attempt` và `error.message`.
  + Không ghi log giá trị Header `Authorization` hay mật khẩu người dùng ra console.

---

## 3. BẢNG TỔNG HỢP RỦI RO SƠ BỘ (PRELIMINARY RISK MATRIX)

| Risk Taxonomy | Mã lỗi định danh | Mức độ | Vị trí phát hiện | Tác động & Hậu quả |
| :--- | :--- | :---: | :--- | :--- |
| **`[SECURITY - INGRESS & SPOOFING]`** | **GW-SEC-01** | **P0 (Critical)** | `service-proxy.middleware.ts:381-393` | **Lọt Header Khóa Dịch Vụ Nội Bộ:** Gateway chỉ xóa `lower === 'x-internal-service'`, không xóa `x-internal-service-key` và `x-internal-api-key`, cho phép client bên ngoài mạo danh lời gọi nội bộ. |
| **`[SECURITY - INGRESS & SPOOFING]`** | **GW-SEC-02** | **P0 (Critical)** | `route-classification.ts`, `service-proxy.middleware.ts:104` | **Lộ Tuyến Đường Nội Bộ (`/internal/*`):** Không có cơ chế chặn các endpoint nội bộ như `/api/v1/shipping/fee/internal`, để lọt request từ ngoài vào sâu hệ thống microservices. |
| **`[ROUTING & PAYMENT GATEWAY]`** | **GW-ROUT-01** | **P0 (Critical)** | `service-proxy.middleware.ts:158-160` | **Nguy Cơ Chặn Nhầm Webhook Thanh Toán (PayOS):** Cơ chế kiểm tra token public route tự động từ chối 401 nếu client gửi `Authorization` header không phải JWT của Huki. Webhook mang chữ ký ngoài sẽ bị từ chối. |
| **`[ROUTING & PAYMENT GATEWAY]`** | **GW-ROUT-02** | **P1 (High)** | `route-classification.ts:17-21, 68-84` | **Lỗi Khớp Đường Dẫn Kèm Trailing Slash (`/`):** Các endpoint public auth dùng so sánh bằng tuyệt đối `=== '/auth/login'`. Gọi URL có dấu `/` ở cuối bị coi là route `AUTHENTICATED` và từ chối 401. |
| **`[LOGIC & RESILIENCE]`** | **GW-LOGIC-01** | **P1 (High)** | `main.ts:296-318` | **Rò Rỉ Socket Khi HTTP Upgrade Sai Đường Dẫn:** Các request upgrade không thuộc `/socket.io` bị bỏ qua không đóng, gây rò rỉ TCP file descriptors; header WebSocket không được lọc qua anti-spoofing. |
| **`[PERF & STREAMING]`** | **GW-PERF-01** | **P2 (Medium)** | `main.ts:28-29`, `service-proxy.middleware.ts:357-361` | **Phình Bộ Nhớ Do JSON Double Buffering:** Cấu hình JSON 50MB kết hợp với `JSON.stringify` trong proxy middleware gây áp lực lớn lên bộ nhớ V8 Heap khi có tải dữ liệu lớn. |
| **`[LOG & OBSERVABILITY]`** | **GW-OBS-01** | **P2 (Medium)** | `service-proxy.middleware.ts:113-119, 228-237, 254-274` | **Thiếu Trường `requestId` Trong Lỗi Gateway:** Phản hồi lỗi Gateway tự tạo thiếu `requestId` trong JSON body, làm đứt gãy luồng tra vết log chuẩn hóa P3. |

---

## 4. KẾT LUẬN & ĐỀ XUẤT HƯỚNG XỬ LÝ (NEXT STEPS)

1. **Khắc phục Bảo mật Ngay (P0):**
   - Mở rộng logic stripping: Xóa triệt để mọi header bắt đầu bằng `x-internal-` (`x-internal-service-key`, `x-internal-api-key`).
   - Bổ sung quy tắc chặn cứng (Block 403 / 404) ngay tại Gateway đối với mọi URL chứa phân đoạn `/internal/` hoặc kết thúc bằng `/internal`.
   - Miễn trừ kiểm tra `authError` đối với các webhook thanh toán (`/payments/webhook*`, `/payments/webhooks/*`, `/callbacks/*`).
2. **Khắc phục Định tuyến & Ổn định (P1):**
   - Chuẩn hóa hàm `normalizePath` để loại bỏ trailing slash (`/`), duplicate slashes (`//`) và xử lý không phân biệt hoa thường.
   - Thêm xử lý `socket.destroy()` cho các request HTTP Upgrade không hợp lệ và lọc header cho kết nối WebSocket.
3. **Chuẩn hóa Định dạng Lỗi (P2):**
   - Đảm bảo toàn bộ phản hồi lỗi từ Gateway (401, 403, 429, 502, 504) đều đính kèm `requestId` (`correlationId`) trong thân JSON theo chuẩn P3 chung của nền tảng.

