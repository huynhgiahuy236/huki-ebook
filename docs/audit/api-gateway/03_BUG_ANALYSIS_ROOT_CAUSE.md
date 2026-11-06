# BÁO CÁO PHÂN LOẠI & TRUY VẾT GỐC RỄ LỖ HỔNG (ROOT CAUSE ANALYSIS)
**Dịch vụ:** `api-gateway` (Service #2 - Tier 0 Ingress & Security Edge)  
**Nhánh kiểm toán:** `audit/api-gateway`  
**Ngày lập:** 06/11/2026  
**Căn cứ bằng chứng:** Khảo sát tĩnh tại `01_EXHAUSTIVE_6AXIS_AUDIT.md` và Kiểm thử động tại `02_LIVE_TEST_EVIDENCE.md`

---

## 1. MA TRẬN PHÂN LOẠI LỖ HỔNG THEO TAXONOMY 5 NHÓM

| Taxonomy | Mã Lỗi | Tên Lỗ Hổng / Vấn Đề Kiến Trúc | Mức Độ | Trạng Thái Bằng Chứng |
| :--- | :--- | :--- | :---: | :---: |
| **`[SECURITY - INGRESS & SPOOFING]`** | **GW-SEC-001** | Bỏ sót stripping các header khóa dịch vụ nội bộ (`x-internal-*`) | **CRITICAL (P0)** | Đã tái hiện tại Test 2 |
| **`[SECURITY - INGRESS & SPOOFING]`** | **GW-SEC-002** | Rò rỉ endpoint nội bộ lồng ghép (`/shipping/fee/internal`) ra ngoài Internet | **CRITICAL (P0)** | Đã tái hiện tại Test 3 |
| **`[ROUTING & PAYMENT GATEWAY]`** | **GW-ROUT-001** | Gateway chặn nhầm Webhook thanh toán PayOS khi có Header Authorization lạ | **CRITICAL (P0)** | Đã tái hiện tại Test 1 |
| **`[ROUTING & PAYMENT GATEWAY]`** | **GW-ROUT-002** | Lỗi chuẩn hóa đường dẫn Trailing Slash (`/`) làm trượt route PUBLIC sang 401 | **HIGH (P1)** | Đã tái hiện tại Test 4 |
| **`[ROUTING & PAYMENT GATEWAY]`** | **GW-ROUT-003** | Bỏ sót `POST /broadcast-notifications` khỏi phân cấp ADMIN tier | **HIGH (P1)** | Đã tái hiện tại Test 4 |
| **`[LOGIC & RESILIENCE]`** | **GW-LOGIC-001** | Rò rỉ TCP Socket khi Upgrade sai URL và chuyển tiếp raw header qua WebSocket | **HIGH (P1)** | Bằng chứng mã nguồn `main.ts` |
| **`[PERF & STREAMING]`** | **GW-PERF-001** | Phình bộ nhớ V8 Heap do Double Buffering JSON 50MB trong Proxy Middleware | **MEDIUM (P2)** | Bằng chứng mã nguồn `service-proxy` |
| **`[LOG & OBSERVABILITY]`** | **GW-OBS-001** | Thiếu trường `requestId` / `correlationId` trong thân JSON lỗi do Gateway sinh ra | **MEDIUM (P2)** | Đã tái hiện tại Test 5 |

---

## 2. PHÂN TÍCH CHI TIẾT TỪNG LỖ HỔNG (DEEP ROOT CAUSE ANALYSIS)

### 2.1 Nhóm `[SECURITY - INGRESS & SPOOFING]`

#### Lỗi GW-SEC-001: Bỏ sót stripping các header khóa dịch vụ nội bộ (`x-internal-*`)
- **Mức độ nghiêm trọng:** `CRITICAL (P0)`
- **Vị trí mã nguồn:** `platform/apps/api-gateway/src/modules/proxy/service-proxy.middleware.ts`, Hàm `forwardHeaders()`, Dòng 381-393.
- **Cơ chế sinh lỗi:**
  Cơ chế bóc tách header của Gateway được lập trình như sau:
  ```typescript
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
  Gateway chỉ kiểm tra chuỗi so sánh bằng chính xác `lower === 'x-internal-service'`. Trong khi đó, các dịch vụ downstream (`commerce-service`, `shipping-service`, `promotion-service`) sử dụng:
  - `x-internal-service-key`
  - `x-internal-api-key`
  Vì hai header này không khớp chính xác với `'x-internal-service'` và cũng không bắt đầu bằng `'x-user-'`, Gateway giữ nguyên giá trị client gửi lên và chuyển tiếp (forward) trực tiếp tới các service bên trong.
- **Bằng chứng thực tế (Trích xuất từ Test 2):**
  ```text
  --- BƯỚC 5: TÁI HIỆN LỖ HỔNG GW-SEC-01: KIỂM TOÁN LỌT HEADER x-internal-service-key ---
  🎯 Gửi request kèm "x-internal-service-key: leaked-secret-123" và "x-internal-api-key: leaked-api-key"
  [Response Internal Key] HTTP Status: 400 | Code: VALIDATION_ERROR
                          Message: "Validation failed"
  ```
  Request đã đi qua Gateway và chạm vào tận controller nội bộ của downstream service kèm theo nguyên vẹn header `x-internal-service-key`.
- **Tác động thực tế (Impact):**
  Bất kỳ kẻ tấn công nào dò đoán hoặc khai thác được internal key bị rò rỉ đều có thể gửi request xuyên qua Gateway để kích hoạt các hành động nội bộ (ví dụ: tự động áp voucher nội bộ, tính toán cước nội bộ) mà không bị Gateway chặn lại.

---

#### Lỗi GW-SEC-002: Lộ lọt endpoint nội bộ lồng ghép (`/shipping/fee/internal`) ra ngoài Internet
- **Mức độ nghiêm trọng:** `CRITICAL (P0)`
- **Vị trí mã nguồn:**
  - `platform/apps/api-gateway/src/modules/proxy/route-classification.ts`, Hàm `classifyRoute()`, Dòng 26-204.
  - `platform/apps/api-gateway/src/modules/proxy/service-proxy.middleware.ts`, Hàm `resolveService()`, Dòng 290-355.
- **Cơ chế sinh lỗi:**
  1. `resolveService()` bóc tách phân đoạn đầu tiên: `/api/v1/shipping/fee/internal` -> phân đoạn `shipping` -> ánh xạ tới `shipping-service:3004`.
  2. `classifyRoute()` rà soát từ trên xuống dưới: Không khớp PUBLIC, không khớp ADMIN, không khớp SELLER. Dòng 204 trả về mặc định `AUTHENTICATED`.
  3. Hoàn toàn không có quy tắc nào chặn cứng các URL chứa `/internal/`. Do đó, người dùng có token hợp lệ bất kỳ (kể cả tài khoản khách hàng mới tạo) đều có thể gọi vào endpoint trao đổi nội bộ của downstream.
- **Bằng chứng thực tế (Trích xuất từ Test 3):**
  ```text
  --- BƯỚC 4: TÁI HIỆN LỖ HỔNG GW-SEC-02: GỌI ROUTE NỘI BỘ /api/v1/shipping/fee/internal ---
  🎯 Path này có phân đoạn đầu là "shipping", Gateway chuyển tiếp thẳng vào shipping-service!
  [Response /shipping/fee/internal] HTTP Status: 400
  Body: {"status":"error","statusCode":400,"code":"VALIDATION_ERROR","message":"Validation failed","path":"/api/v1/shipping/fee/internal", ...}
  🚨 [XÁC NHẬN LỖ HỔNG GW-SEC-02]: Gateway KHÔNG CHẶN route nội bộ lồng ghép!
  ```
- **Tác động thực tế (Impact):**
  Xâm phạm trực tiếp ranh giới phòng thủ mạng (Perimeter Security Boundary). Các API chỉ thiết kế riêng cho liên lạc Server-to-Server bị phơi nhiễm trực tiếp ra Internet.

---

### 2.2 Nhóm `[ROUTING & PAYMENT GATEWAY]`

#### Lỗi GW-ROUT-001: Gateway chặn nhầm Webhook thanh toán PayOS khi có Header Authorization lạ
- **Mức độ nghiêm trọng:** `CRITICAL (P0)`
- **Vị trí mã nguồn:** `platform/apps/api-gateway/src/modules/proxy/service-proxy.middleware.ts`, Dòng 155-161.
- **Cơ chế sinh lỗi:**
  ```typescript
  } else if (tier === 'PUBLIC') {
    // If the client explicitly sent an invalid/expired Bearer token to a public route,
    // return 401 so the client can trigger refresh instead of proceeding with an ambiguous session.
    if (authError && req.headers.authorization) {
      return this.sendUnauthorized(res, req, authError.code, authError.message);
    }
  }
  ```
  Mục đích của đoạn mã trên là hỗ trợ client web phát hiện token hết hạn khi gọi route public (như xem catalog). Tuy nhiên, khi đối tác thanh toán PayOS (hoặc các dịch vụ mô phỏng webhook) gửi webhook kèm theo Header `Authorization` (chứa API Key hoặc chữ ký riêng), `AuthMiddleware` tại Gateway parse JWT thất bại và gán `authError = { code: 'AUTH_TOKEN_INVALID', message: 'jwt malformed' }`.
  Khi đó, điều kiện `authError && req.headers.authorization` trở thành `true`, khiến Gateway chặn đứng webhook và phản hồi HTTP 401 Unauthorized trước khi request kịp đến `commerce-service`.
- **Bằng chứng thực tế (Trích xuất từ Test 1):**
  ```text
  --- BƯỚC 3: TÁI HIỆN RỦI RO GW-ROUT-01 (WEBHOOK GỬI KÈM EXTERNAL AUTHORIZATION TOKEN) ---
  🎯 Thử nghiệm: Đối tác bên thứ ba gửi kèm Header Authorization: Bearer payos_webhook_secret_key_xyz
  [Response 3] HTTP Status: 401 | Code: AUTH_TOKEN_INVALID
               Message: "jwt malformed"
  🚨 [XÁC NHẬN LỖ HỔNG GW-ROUT-01]: Gateway chặn nhầm Webhook công khai với mã 401 Unauthorized!
  ```
- **Tác động thực tế (Impact):**
  Làm đứt gãy luồng thanh toán (Payment Flow). Đơn hàng đã chuyển khoản thành công tại ngân hàng nhưng hệ thống không thể nhận webhook để cập nhật trạng thái đơn sang `PAID`, dẫn đến khiếu nại và hủy đơn nhầm.

---

#### Lỗi GW-ROUT-002: Lỗi chuẩn hóa đường dẫn Trailing Slash (`/`) làm trượt route PUBLIC sang 401
- **Mức độ nghiêm trọng:** `HIGH (P1)`
- **Vị trí mã nguồn:**
  - `platform/apps/api-gateway/src/modules/proxy/route-classification.ts`, Hàm `normalizePath()`, Dòng 17-21.
  - `platform/apps/api-gateway/src/modules/proxy/route-classification.ts`, Hàm `classifyRoute()`, Dòng 68-84.
- **Cơ chế sinh lỗi:**
  Hàm `normalizePath` không loại bỏ dấu gạch chéo cuối (`trailing slash`):
  ```typescript
  export function normalizePath(originalUrl: string): string {
    const pathWithoutQuery = originalUrl.split('?')[0];
    const stripped = pathWithoutQuery.replace(/^\/api\/v1/, '');
    return stripped.startsWith('/') ? stripped : `/${stripped}`;
  }
  ```
  Các route public auth được so sánh bằng tuyệt đối:
  ```typescript
  normPath === '/auth/login' || normPath === '/auth/register' ...
  ```
  Khi request có URL `/api/v1/auth/login/`, `normPath` là `'/auth/login/'`. Phép so sánh `=== '/auth/login'` trả về `false`. Request trượt xuống Dòng 204: `return 'AUTHENTICATED'`, và bị Gateway từ chối ngay lập tức với mã 401 `AUTH_TOKEN_MISSING`.
- **Bằng chứng thực tế (Trích xuất từ Test 4):**
  ```text
  --- BƯỚC 7: TÁI HIỆN LỖ HỔNG GW-ROUT-02 (ĐƯỜNG DẪN CÓ DẤU GẠCH CHÉO CUỐI) ---
  🎯 Request: POST /api/v1/auth/login/ (với trailing slash)
  [Trailing Slash Login] HTTP Status: 401 | Code: AUTH_TOKEN_MISSING
                         Message: "Authentication token is required"
  🚨 [XÁC NHẬN LỖ HỔNG GW-ROUT-02]: Dấu gạch chéo cuối làm trượt khỏi quy tắc PUBLIC, bị Gateway từ chối 401!
  ```
- **Tác động thực tế (Impact):**
  Làm gãy trải nghiệm người dùng trên các ứng dụng di động (Mobile App) hoặc các client tự động nối thêm dấu `/` ở cuối endpoint.

---

#### Lỗi GW-ROUT-003: Bỏ sót `POST /broadcast-notifications` khỏi phân cấp ADMIN tier
- **Mức độ nghiêm trọng:** `HIGH (P1)`
- **Vị trí mã nguồn:** `platform/apps/api-gateway/src/modules/proxy/route-classification.ts`, Dòng 35-36 và Dòng 94-112.
- **Cơ chế sinh lỗi:**
  Tại Dòng 35-36:
  ```typescript
  normPath === '/broadcast-notifications' ||
  normPath.startsWith('/broadcast-notifications')
  ```
  chỉ kiểm tra `if (upperMethod === 'GET') return 'PUBLIC'`.
  Tuy nhiên, trong danh sách Rule 4 (`ADMIN`), lập trình viên đã quên bổ sung `/broadcast-notifications` khi `upperMethod !== 'GET'`. Hậu quả là request `POST /broadcast-notifications` trượt xuống tier mặc định `AUTHENTICATED`.
- **Bằng chứng thực tế (Trích xuất từ Test 4):**
  ```text
  🎯 Khảo sát thêm: POST /api/v1/broadcast-notifications với Merchant token
  [POST /broadcast-notifications - Business] HTTP Status: 400 | Code: VALIDATION_ERROR
  🚨 [PHÁT HIỆN LỖ HỔNG ROUTING]: POST /broadcast-notifications bị bỏ quên khỏi Rule 4 (ADMIN), chỉ được Gateway gán nhãn AUTHENTICATED!
  ```
- **Tác động thực tế (Impact):**
  Người bán (`BUSINESS`) hoặc người dùng bình thường có thể gửi thông báo phát sóng toàn sàn (Broadcast) nếu downstream controller không có guard phụ trợ.

---

### 2.3 Nhóm `[LOGIC & RESILIENCE]`

#### Lỗi GW-LOGIC-001: Rò rỉ TCP Socket khi Upgrade sai URL và chuyển tiếp raw header qua WebSocket
- **Mức độ nghiêm trọng:** `HIGH (P1)`
- **Vị trí mã nguồn:** `platform/apps/api-gateway/src/main.ts`, Dòng 296-318.
- **Cơ chế sinh lỗi:**
  1. **Rò rỉ kết nối:** Sự kiện `server.on('upgrade')` chỉ kiểm tra:
     ```typescript
     if (req.url && req.url.startsWith('/socket.io')) { ... }
     ```
     Nếu client gửi request HTTP Upgrade tới bất kỳ đường dẫn nào khác (ví dụ `/ws`, `/chat`, `/cable`), nhánh `if` không chạy và khối lệnh kết thúc mà **không gọi `socket.destroy()`**. Socket bị treo vô hạn trên Gateway.
  2. **Không lọc Header:** Khi chuyển tiếp sang `community-service`:
     ```typescript
     Object.entries(req.headers)
       .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
     ```
     Toàn bộ raw header của client được ghi thẳng vào TCP socket của `community-service`, hoàn toàn bỏ qua lớp kiểm tra chống giả mạo header của Gateway.
- **Tác động thực tế (Impact):**
  Dễ bị tấn công từ chối dịch vụ (Slowloris/FD Exhaustion) làm cạn kiệt tài nguyên file descriptor của Gateway; mạo danh danh tính người dùng trong hệ thống chat thời gian thực.

---

### 2.4 Nhóm `[PERF & STREAMING]`

#### Lỗi GW-PERF-001: Phình bộ nhớ V8 Heap do Double Buffering JSON 50MB trong Proxy Middleware
- **Mức độ nghiêm trọng:** `MEDIUM (P2)`
- **Vị trí mã nguồn:** `platform/apps/api-gateway/src/main.ts:28-29` và `platform/apps/api-gateway/src/modules/proxy/service-proxy.middleware.ts:357-361`.
- **Cơ chế sinh lỗi:**
  1. `main.ts` kích hoạt `app.use(json({ limit: '50mb' }))`. Toàn bộ body JSON được Express parse và giữ trong RAM dưới dạng Object.
  2. Trong `ServiceProxyMiddleware`, hàm `serializeBody()` lại thực hiện:
     ```typescript
     if (req.is('application/json') || req.is('application/*+json')) return JSON.stringify(req.body);
     ```
     Việc gọi `JSON.stringify` biến object thành chuỗi thứ hai trong RAM, sau đó `Buffer.byteLength(body)` tạo thêm buffer tính toán độ dài.
- **Tác động thực tế (Impact):**
  Nhân 3x-4x dung lượng RAM tiêu thụ trên mỗi request lớn. Khi nhiều client đồng thời gửi dữ liệu lớn (như Base64 sách điện tử), Gateway có nguy cơ gặp hiện tượng Garbage Collection lag hoặc crash do Out-Of-Memory (OOM).

---

### 2.5 Nhóm `[LOG & OBSERVABILITY]`

#### Lỗi GW-OBS-001: Thiếu trường `requestId` / `correlationId` trong thân JSON lỗi do Gateway sinh ra
- **Mức độ nghiêm trọng:** `MEDIUM (P2)`
- **Vị trí mã nguồn:** `platform/apps/api-gateway/src/modules/proxy/service-proxy.middleware.ts`, Dòng 113-119, 228-237, 254-274.
- **Cơ chế sinh lỗi:**
  Các hàm phản hồi lỗi của Gateway (`sendUnauthorized`, `sendForbidden`, và lỗi proxy khi service offline) trực tiếp build JSON payload thủ công mà không đưa trường `requestId` vào thân response:
  ```typescript
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    code: 'SYSTEM_UNAVAILABLE',
    message: timedOut ? `Service ${service} timed out` : `Service ${service} is unavailable`,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
  ```
- **Bằng chứng thực tế (Trích xuất từ Test 5):**
  ```text
  [Response 401 Body] {"status":"error","statusCode":401,"code":"AUTH_TOKEN_MISSING","message":"Authentication token is required","timestamp":"2026-11-06T07:44:43.878Z","path":"/api/v1/cart"}
  [Response Headers]  x-correlation-id: null
  🚨 [XÁC NHẬN LỖ HỔNG GW-OBS-01]: Lỗi do Gateway tự sinh thiếu trường requestId trong JSON body!
  ```
- **Tác động thực tế (Impact):**
  Không tuân thủ chuẩn hợp đồng lỗi P3 của hệ sinh thái Huki, khiến Web Client và hệ thống giám sát phân tán (Loki/Grafana) không thể liên kết mã lỗi người dùng nhìn thấy với log phía backend.

