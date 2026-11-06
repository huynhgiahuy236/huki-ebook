# BÁO CÁO PHÂN LOẠI & TRUY VẾT GỐC RỄ LỖ HỔNG (BUG ROOT CAUSE ANALYSIS)
## TIER 1 - CORE FINANCIAL & BUSINESS SERVICES: COMMERCE-SERVICE & BUSINESS-SERVICE
**Service mục tiêu:** `platform/apps/commerce-service` (Port 3003) & `platform/apps/business-service` (Port 3002)  
**Nhánh kiểm toán:** `audit/commerce-service`  
**Ngày thực hiện:** 06/11/2026  
**Cơ sở dữ liệu:** Khảo sát tĩnh 6 trục (`01_EXHAUSTIVE_6AXIS_AUDIT.md`) và Bằng chứng thực thi sống (`02_LIVE_TEST_EVIDENCE.md`)

---

## 1. TỔNG QUAN PHÂN LOẠI THEO CHUẨN TAXONOMY 5 NHÓM
Quá trình kiểm toán tĩnh và kiểm thử động độc lập tại Message 15 đã bóc tách được toàn bộ các khiếm khuyết trong lõi tài chính, giao tiếp liên service và toàn vẹn dữ liệu. Toàn bộ các vấn đề được quy hoạch theo 5 nhóm Taxonomy bắt buộc:

```mermaid
graph TD
    A["Kiểm toán Lõi Tài chính & Đa Gian hàng (Tier 1)"] --> B["[PAYMENT] Webhook & Checksum"]
    A --> C["[ORDER] State Machine & TTL Worker"]
    A --> D["[INVENTORY] Race Condition & ACID"]
    A --> E["[ARCHITECTURE] Cross-DB Coupling"]
    A --> F["[LEDGER] Escrow, BOLA & Affiliate"]

    B --> B1["COM-PAY-001 (P0): Bypass simulate-success"]
    B --> B2["COM-PAY-002 (P2): Lệch kiểu dữ liệu tiền tệ"]
    C --> C1["COM-ORD-001 (P0): Crash 409 Late Webhook Unique Constraint"]
    C --> C2["COM-ORD-002 (P1): Thiếu Row Lock khi khôi phục đơn trễ"]
    C --> C3["COM-ORD-003 (P1): Worker treo vòng lặp do thiếu Timeout PayOS"]
    D --> D1["COM-INV-001 (P0): Thiếu Atomic Condition & Row Lock Postgres"]
    D --> D2["COM-INV-002 (P1): Race Condition ghi đè syncStock Redis"]
    E --> E1["COM-ARCH-001 (P0): pg.Pool chọc thẳng DB huki_business"]
    E --> E2["COM-ARCH-002 (P1): Khuyết thiếu 100% Internal API tại business-service"]
    F --> F1["COM-LED-001 (P0): BOLA rò rỉ toàn bộ sách shop đối thủ"]
    F --> F2["COM-LED-002 (P1): Hardcode UUID trong mã nguồn"]
    F --> F3["COM-LED-003 (P1): In-memory lock trong cron settlement"]
```

---

## 2. PHÂN TÍCH CHI TIẾT TỪNG NHÓM VẤN ĐỀ

### 2.1. NHÓM 1: [PAYMENT - WEBHOOK & CHECKSUM]

#### 1. Lỗi COM-PAY-001: Lỗ hổng Bypass Thanh toán công khai qua endpoint simulate-success
- **Mức độ nghiêm trọng:** `CRITICAL (P0)`
- **Vị trí mã nguồn:**
  - File Controller: [`platform/apps/commerce-service/src/modules/payments/payments.controller.ts:36-45`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/payments/payments.controller.ts#L36-L45)
  - File Service: [`platform/apps/commerce-service/src/modules/payments/payments.service.ts:286-302`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/payments/payments.service.ts#L286-L302)
- **Cơ chế sinh lỗi:**
  Tại `payments.controller.ts`, endpoint `POST /api/v1/payments/orders/:orderId/simulate-success` chỉ được bảo vệ bằng `@UseGuards(AuthenticatedGuard)`. Guard này chấp nhận bất kỳ người dùng đăng nhập nào (kể cả tài khoản `BUYER` thông thường). Trong `payments.service.ts`:
  ```typescript
  async simulateSuccess(userId: string, orderId: string) {
    ...
    await this.completePaymentFromPayOS(payment, mockLinkInfo, payment.order);
    return { success: true, message: "Thanh toán PayOS thành công (Mô phỏng Test dòng tiền)", orderId };
  }
  ```
  Hàm không hề kiểm tra:
  1. `process.env.NODE_ENV !== 'production'`
  2. Role của actor (`actor.role === 'PLATFORM_ADMIN'`)
  3. Quyền sở hữu của người gọi đối với đơn hàng.
- **Bằng chứng thực tế (Trích xuất từ Test 1 - Message 15):**
  ```text
  --- BƯỚC 5: KIỂM CHỨNG LỖ HỔNG P0 (PAY-VULN-001): SIMULATE-SUCCESS BYPASS ---
  [Response 5] Status: 201 | Body: {"status":"success","statusCode":201,"message":"Thanh toán PayOS thành công (Mô phỏng Test dòng tiền)","data":{"success":true,"orderId":"11111111-2222-3333-4444-555555555556"}}
  🚨 [LỖ HỔNG P0 XÁC NHẬN - PAY-VULN-001]: Endpoint simulate-success mở công khai cho Buyer! Đơn hàng đã tự động chuyển sang PROCESSING (COMPLETED) mà KHÔNG qua PayOS!
  ```
- **Tác động thực tế (Impact):**
  Thất thoát dòng tiền 100%. Bất kỳ khách mua hàng nào cũng có thể gửi 1 request HTTP để mua sách vật lý, nhận quyền đọc Ebook và giải ngân tiền vào ví sàn mà không tốn một đồng nào.

---

#### 2. Lỗi COM-PAY-002: Sai lệch ép kiểu số tiền giữa Webhook PayOS (Int) và Database (Decimal)
- **Mức độ nghiêm trọng:** `MEDIUM (P2)`
- **Vị trí mã nguồn:**
  - File: [`platform/apps/commerce-service/src/modules/payments/payments.service.ts:490-492`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/payments/payments.service.ts#L490-L492)
- **Cơ chế sinh lỗi:**
  Cột `payments.amount` trong Prisma schema được định nghĩa kiểu `Decimal(14, 2)`. Trong khi đó, PayOS gửi số tiền kiểu số nguyên VND (`payload.data.amount: number`). Việc so sánh:
  ```typescript
  if (Number(payment.amount) !== Number(payload.data.amount)) {
    throwBadRequest(ErrorCode.PAYMENT_AMOUNT_MISMATCH);
  }
  ```
  dù chặn được sai số lớn, nhưng việc ép kiểu `Number(payment.amount)` sang JavaScript 64-bit float có nguy cơ sai số dấu phẩy động (Floating point inaccuracy) khi xử lý các đơn hàng doanh nghiệp B2B có giá trị lớn (> 9.007.199.254.740.991).
- **Tác động thực tế (Impact):**
  Giao dịch giá trị lớn có nguy cơ bị từ chối oan hoặc sai lệch số dư đối soát kế toán cuối ngày.

---

### 2.2. NHÓM 2: [ORDER - STATE MACHINE & TTL WORKER]

#### 1. Lỗi COM-ORD-001: Lỗi văng Exception 409 Conflict sập Late Webhook do trùng unique order_item_id
- **Mức độ nghiêm trọng:** `CRITICAL (P0)`
- **Vị trí mã nguồn:**
  - File: [`platform/apps/commerce-service/src/modules/payments/payments.service.ts:668-671`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/payments/payments.service.ts#L668-L671)
  - File liên kết: [`platform/apps/commerce-service/src/modules/orders/inventory-reservation.service.ts:55-63`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/inventory-reservation.service.ts#L55-L63)
  - File Prisma: [`platform/apps/commerce-service/prisma/schema.prisma:297`](file:///e:/HuKi/platform/apps/commerce-service/prisma/schema.prisma#L297)
- **Cơ chế sinh lỗi:**
  Trong `schema.prisma`, model `InventoryReservation` có ràng buộc:
  ```prisma
  orderItemId String @unique @map("order_item_id")
  ```
  Khi đơn hàng hết hạn 15 phút, worker `expirePendingPayments()` gọi `this.reservations.release()` để chuyển trạng thái bản ghi cũ sang `status: 'RELEASED'`. Bản ghi này **vẫn tồn tại trong cơ sở dữ liệu**.  
  Khi khách hàng chuyển khoản trễ và Late Webhook đến, hàm `handleLateWebhook()` kiểm tra còn đủ kho và gọi:
  ```typescript
  await this.reservations.reserve(tx, payment.orderId, physicalItems);
  ```
  Hàm `reserve()` lại mù quáng thực thi:
  ```typescript
  await tx.inventoryReservation.create({
    data: { orderId, orderItemId: item.id, bookId: item.bookId, quantity: item.quantity, status: 'ACTIVE' }
  });
  ```
  Lệnh `INSERT` dội thẳng vào ràng buộc `UNIQUE ("order_item_id")`, sinh mã lỗi PostgreSQL `23505 (unique_violation)`. NestJS bắt lỗi này và biến thành HTTP 409 `SYSTEM_ERROR: Dữ liệu (order_item_id) đã tồn tại trên hệ thống`.
- **Bằng chứng thực tế (Trích xuất từ Test 2 - Message 15):**
  ```text
  --- BƯỚC 5: THỬ NGHIỆM LATE WEBHOOK TRÊN ĐƠN ĐÃ CANCELLED (GIÂY THỨ 901) ---
  [Late Webhook Response] Status: 409 | Body: {"status":"error","statusCode":409,"code":"SYSTEM_ERROR","message":"Dữ liệu (order_item_id) đã tồn tại trên hệ thống. Vui lòng kiểm tra lại.","path":"/api/v1/payments/webhooks/payos","requestId":"27f9a324-13d3-4d77-abf4-b1d7c4b38f88"}
  🚨 [PHÁT HIỆN LỖI LOGIC NGHIÊM TRỌNG - LATE-WEBHOOK-UNIQUE-001]:
     handleLateWebhook() gọi reservations.reserve() để tạo bản ghi inventory_reservations mới,
     nhưng bảng inventory_reservations có ràng buộc @unique trên order_item_id!
     Do bản ghi cũ ở trạng thái RELEASED vẫn tồn tại, lệnh INSERT bị dội lỗi 409 Unique Constraint!
     Hệ thống gãy hoàn toàn luồng khôi phục đơn khi khách thanh toán trễ!
  ```
- **Tác động thực tế (Impact):**
  Toàn bộ các đơn hàng thanh toán sau thời điểm quá hạn (Late Webhooks) đều bị crash lỗi 409. Đơn hàng không thể khôi phục sang `PROCESSING`, cũng không thể chuyển sang `REFUND_PENDING`. Tiền của khách bị treo tại PayOS, tạo ra khủng hoảng khiếu nại UAT.

---

#### 2. Lỗi COM-ORD-002: Thiếu Pessimistic Lock khi kiểm tra tồn kho khôi phục đơn thanh toán trễ
- **Mức độ nghiêm trọng:** `HIGH (P1)`
- **Vị trí mã nguồn:**
  - File: [`platform/apps/commerce-service/src/modules/payments/payments.service.ts:654-666`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/payments/payments.service.ts#L654-L666)
- **Cơ chế sinh lỗi:**
  Tại `handleLateWebhook()`, logic kiểm tra tồn kho khả dụng để khôi phục:
  ```typescript
  for (const item of physicalItems) {
    const details = await tx.physicalBookDetails.findUnique({
      where: { bookId: item.bookId },
    });
    if (!details || details.stock - details.reserved < item.quantity) {
      canRestore = false;
      break;
    }
  }
  ```
  `tx.physicalBookDetails.findUnique` thực thi một câu lệnh `SELECT` thông thường không có khóa bi quan `FOR UPDATE`. Nếu tại thời điểm này có một khách hàng khác đang bấm mua hoặc một đơn trễ khác đang khôi phục, cả hai cùng đọc giá trị tồn cũ và cùng phán đoán `canRestore = true`, dẫn tới bán âm kho vật lý.
- **Tác động thực tế (Impact):**
  Bán vượt tồn kho (Overselling) trong kịch bản đơn hủy được hồi sinh trễ.

---

#### 3. Lỗi COM-ORD-003: Worker expirePendingPayments thực thi tuần tự gọi PayOS API thiếu Timeout
- **Mức độ nghiêm trọng:** `HIGH (P1)`
- **Vị trí mã nguồn:**
  - File: [`platform/apps/commerce-service/src/modules/payments/payments.service.ts:1225-1241`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/payments/payments.service.ts#L1225-L1241)
  - File: [`platform/apps/commerce-service/src/modules/payments/payos.service.ts:71-87`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/payments/payos.service.ts#L71-L87)
- **Cơ chế sinh lỗi:**
  Trong vòng lặp `for (const payment of expired)` của worker:
  ```typescript
  if (payment.payosOrderId) {
    const linkInfo = await this.payos.getPaymentLinkInformation(payment.payosOrderId);
    ...
  }
  ```
  Hàm `getPaymentLinkInformation()` sử dụng hàm `fetch()` nguyên bản của Node.js mà **không truyền `signal: AbortSignal.timeout(...)`**.  
  Nếu PayOS API bị nghẽn mạng hoặc phản hồi chậm (e.g. 5-10 giây/request), và hệ thống có 20 đơn quá hạn đang xếp hàng, worker sẽ bị block liên tục hàng phút, không thể hủy đơn đúng hạn 15 phút, khiến sách bị chiếm giữ ảo quá lâu.
- **Tác động thực tế (Impact):**
  Tồn kho sách bị khóa ảo (Inventory Starvation), khách hàng khác không thể mua sách dù người trước không thanh toán.

---

### 2.3. NHÓM 3: [INVENTORY - RACE CONDITION & ACID]

#### 1. Lỗi COM-INV-001: Thiếu Khóa Bi Quan và Cập Nhật Tồn Kho Không Có Điều Kiện Atomic
- **Mức độ nghiêm trọng:** `CRITICAL (P0)`
- **Vị trí mã nguồn:**
  - File: [`platform/apps/commerce-service/src/modules/orders/inventory-reservation.service.ts:23-53`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/inventory-reservation.service.ts#L23-L53)
- **Cơ chế sinh lỗi:**
  Quá trình trừ kho tại tầng PostgreSQL được viết như sau:
  ```typescript
  // 1. Đọc không khóa
  const details = await tx.physicalBookDetails.findUnique({ where: { bookId: item.bookId } });
  ...
  // 2. Kiểm tra trên biến bộ nhớ
  const available = details.stock - details.reserved;
  if (available < item.quantity) {
    throw new ConflictException(...);
  }
  ...
  // 3. Update tăng số lượng tạm giữ vô điều kiện
  await tx.physicalBookDetails.update({
    where: { bookId: item.bookId },
    data: { reserved: { increment: item.quantity } },
  });
  ```
  Câu lệnh `update` của Prisma dịch sang SQL:
  ```sql
  UPDATE physical_book_details SET reserved = reserved + $1 WHERE book_id = $2;
  ```
  Câu lệnh này **hoàn toàn thiếu mệnh đề bảo vệ** `AND (stock - reserved) >= $1`. Khi có nhiều transaction đồng thời vượt qua bước kiểm tra trên bộ nhớ (đặc biệt khi Redis cache bị miss hoặc bị reset), tất cả các transaction đều tăng `reserved`, dẫn đến `reserved > stock` (bán âm kho vật lý).
- **Tác động thực tế (Impact):**
  Bán vượt tồn kho (Overselling), kho hàng không có sách để giao cho khách, phát sinh chi phí bồi thường và xử lý khủng hoảng gian hàng.

---

#### 2. Lỗi COM-INV-002: Tranh chấp ghi đè Cache (Race Condition Clobbering) khi Redis Cold-Start
- **Mức độ nghiêm trọng:** `HIGH (P1)`
- **Vị trí mã nguồn:**
  - File: [`platform/apps/commerce-service/src/modules/orders/inventory-reservation.service.ts:37-43`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/inventory-reservation.service.ts#L37-L43)
- **Cơ chế sinh lỗi:**
  ```typescript
  let redisResult = await this.redisService.reserveStockAtomic(item.bookId, item.quantity);
  if (redisResult === -1) {
    // Key bị thiếu trong Redis -> đồng bộ từ DB rồi thử lại
    await this.redisService.syncStock(item.bookId, available);
    redisResult = await this.redisService.reserveStockAtomic(item.bookId, item.quantity);
  }
  ```
  Hàm `syncStock` thực thi lệnh Redis `SET key available`. Khi Redis vừa restart hoặc key hết hạn (Cold Cache), 5 request cùng gửi tới đồng thời:
  - Cả 5 request đều nhận `redisResult === -1`.
  - Cả 5 cùng đọc `available = 1` từ DB.
  - Request 1 gọi `syncStock(key, 1)` rồi trừ còn `0`.
  - Request 2 đến sau lại tiếp tục gọi `syncStock(key, 1)`, **ghi đè giá trị 1 lên số 0 của Request 1**!
  - Cả 5 request đều trừ thành công trên Redis!
- **Tác động thực tế (Impact):**
  Vô hiệu hóa hoàn toàn cơ chế bảo vệ tồn kho phân tán bằng Redis khi có lượng truy cập đột biến (Flash Sale) trong giai đoạn Cold Cache.

---

### 2.4. NHÓM 4: [ARCHITECTURE - CROSS-DB COUPLING]

#### 1. Lỗi COM-ARCH-001: Khởi tạo pg.Pool kết nối chéo Database huki_business từ commerce-service
- **Mức độ nghiêm trọng:** `CRITICAL (P0)`
- **Vị trí mã nguồn:**
  - File: [`platform/apps/commerce-service/src/common/seller-scope.util.ts:11-29, 49-62`](file:///e:/HuKi/platform/apps/commerce-service/src/common/seller-scope.util.ts#L11-L29)
- **Cơ chế sinh lỗi:**
  Hàm `getBusinessPool()` tự động trích xuất chuỗi kết nối và khởi tạo `new Pool()` trỏ thẳng vào database của `business-service`:
  ```typescript
  const bizDbUrl =
    process.env.BUSINESS_DATABASE_URL ||
    process.env.DATABASE_URL?.replace(/\/[^\/]+$/, '/huki_business') ||
    'postgresql://postgres:postgres123@localhost:5432/huki_business';
  poolInstance = new Pool({ connectionString: bizDbUrl, max: 10, ... });
  ```
  Sau đó, các hàm `getSellerScope()` và `resolveStoreAndBusinessIds()` bắn các câu Raw SQL trực tiếp lên các bảng `businesses`, `stores`, `members`.
- **Bằng chứng thực tế (Trích xuất từ Test 5 - Message 15):**
  ```text
  --- BƯỚC 2: PHÂN TÍCH CƠ CHẾ KẾT NỐI DATABASE CHÉO TRONG COMMERCE-SERVICE ---
  Vị trí: platform/apps/commerce-service/src/common/seller-scope.util.ts:11-29
  Mã nguồn thực tế:
    const bizDbUrl = process.env.BUSINESS_DATABASE_URL || ...replace(/huki_commerce/, "/huki_business");
    poolInstance = new Pool({ connectionString: bizDbUrl, max: 10, idleTimeoutMillis: 30000 });
  Thực thi Raw SQL chéo DB thành công! Số bản ghi đọc trực tiếp: 5
  ✅ [PASS] Xác nhận commerce-service sử dụng Raw SQL query trực tiếp bảng businesses & stores của business-service (ARCH-CDB-01)
  ```
- **Tác động thực tế (Impact):**
  1. **Phá vỡ nguyên lý Microservices Isolation (Database-per-Service):** Hai service bị dính chặt vào nhau ở tầng vật lý.
  2. **Rò rỉ Connection Pool:** Mỗi container của `commerce-service` chiếm giữ cố định 10 connection mở sang `huki_business`, không giải phóng khi shutdown, gây cạn kiệt connection pool của Postgres.
  3. **Không thể triển khai độc lập:** Khi đưa `business-service` lên cụm RDS riêng biệt với VPC cô lập, `commerce-service` sẽ sập hoàn toàn mọi tính năng của Seller.

---

#### 2. Lỗi COM-ARCH-002: business-service khuyết thiếu 100% API Contract nội bộ cho Seller Scope
- **Mức độ nghiêm trọng:** `HIGH (P1)`
- **Vị trí mã nguồn:**
  - Service: `platform/apps/business-service/src/modules/` (Không có bất kỳ controller nào cho route `/internal/*`)
- **Cơ chế sinh lỗi:**
  `business-service` không cung cấp API nội bộ cho các downstream services gọi kiểm tra phân quyền gian hàng. Điều này trực tiếp thúc đẩy các nhà phát triển trước đó dùng biện pháp "chữa cháy" (workaround) bằng cách query trực tiếp DB.
- **Bằng chứng thực tế (Trích xuất từ Test 5 - Message 15):**
  ```text
  --- BƯỚC 1: QUÉT TÌM CÁC ENDPOINT NỘI BỘ (INTERNAL API) TẠI BUSINESS-SERVICE ---
  Probing /api/v1/internal/seller-scope -> Status: 404 | Body: {"statusCode":404,"message":"Cannot GET /api/v1/internal/seller-scope"}
  Probing /api/v1/internal/sellers/scope -> Status: 404 | Body: {"statusCode":404,"message":"Cannot GET /api/v1/internal/sellers/scope"}
  Probing /api/v1/internal/stores/resolve -> Status: 404 | Body: {"statusCode":404,"message":"Cannot GET /api/v1/internal/stores/resolve"}
  Probing /api/v1/internal/businesses/scope -> Status: 404 | Body: {"statusCode":404,"message":"Cannot GET /api/v1/internal/businesses/scope"}
  ✅ [PASS] Xác nhận business-service hoàn toàn thiếu vắng các endpoint nội bộ (/internal/*) cho Seller Scope (Missing: 4/4)
  ```
- **Tác động thực tế (Impact):**
  Thiếu API Contract nội bộ chuẩn hóa, các microservice khác (`shipping`, `promotion`, `analytics`) nếu cần thông tin store cũng sẽ có xu hướng vi phạm kiến trúc tương tự.

---

### 2.5. NHÓM 5: [LEDGER - ESCROW, BOLA & AFFILIATE]

#### 1. Lỗi COM-LED-001: Lỗ hổng BOLA rò rỉ dữ liệu sách riêng tư giữa các gian hàng qua param ?store=
- **Mức độ nghiêm trọng:** `CRITICAL (P0)`
- **Vị trí mã nguồn:**
  - File: [`platform/apps/commerce-service/src/modules/books/books.service.ts:537-552`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/books/books.service.ts#L537-L552)
- **Cơ chế sinh lỗi:**
  Trong hàm `findOwned` của `books.service.ts`:
  ```typescript
  if (!scope.isPlatformAdmin) {
    const orConditions: any[] = [];
    if (scope.storeIds.length > 0) orConditions.push({ storeId: { in: scope.storeIds } });
    if (scope.ownerUserIds.length > 0) orConditions.push({ ownerUserId: { in: scope.ownerUserIds } });
    ...
    if (query.business || query.store) {
      const target = (query.business || query.store) as string;
      orConditions.push({ storeId: target }); // 🚨 LỖ HỔNG CHÍNH NẰM Ở ĐÂY
    }
    conditions.push({ OR: orConditions });
  }
  ```
  Tham số `query.store` do client gửi lên được nhét thẳng vào mảng `orConditions` của Prisma!  
  Do đó, câu truy vấn SQL trở thành:
  ```sql
  WHERE (store_id IN (cac_shop_cua_seller_A) OR owner_user_id = 'seller_A' OR store_id = 'store_B_ID')
  ```
  Toàn bộ sách riêng tư, bản thảo chưa phát hành (DRAFT) của Store B đều bị trả về cho Seller A!
- **Bằng chứng thực tế (Trích xuất từ Test 4 - Message 15):**
  ```text
  --- BƯỚC 5: KIỂM CHỨNG LỖ HỔNG LỘ DỮ LIỆU SÁCH QUA PARAM ?store= (BOLA LEAK) ---
  Seller A gọi /books/owned bình thường: Số sách tìm thấy = 0, Thấy sách B = false
  Seller A gọi /books/owned?store=44444444-2222-4000-a000-000000000022: Số sách tìm thấy = 1, Thấy sách B = true
  🚨 [LỖ HỔNG BOLA / TENANT LEAK XÁC NHẬN - BOLA-BOOK-001]:
     Tại books.service.ts:539, param query.store được push trực tiếp vào orConditions!
     Seller A đã đọc được toàn bộ danh mục sách của Store B chỉ bằng cách truyền ?store=44444444-2222-4000-a000-000000000022!
  ```
- **Tác động thực tế (Impact):**
  Lỗ hổng Broken Object Level Authorization (BOLA / OWASP API 1). Lộ toàn bộ danh mục sách nội bộ, bản thảo độc quyền, giá bán và cấu hình sách giữa các gian hàng cạnh tranh trên sàn.

---

#### 2. Lỗi COM-LED-002: Hardcode UUID môi trường dev/staging trong mã nguồn nghiệp vụ
- **Mức độ nghiêm trọng:** `HIGH (P1)`
- **Vị trí mã nguồn:**
  - File: [`platform/apps/commerce-service/src/modules/books/books.service.ts:540-546`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/books/books.service.ts#L540-L546)
- **Cơ chế sinh lỗi:**
  Mã nguồn chứa các điều kiện so khớp cứng chuỗi UUID:
  ```typescript
  if (target === '1079fc76-a467-48a9-8034-b072aaa5afea') {
    orConditions.push({ storeId: '3094e54e-2549-42cc-92fb-14a8f8589277' });
  } else if (target === 'dede6cd4-454d-4e66-b0cd-ef18337fd25b') {
    orConditions.push({ storeId: '51c48059-37be-46a2-b4a6-04a8365f8cbd' });
  } else if (target === '2fe4493b-08a0-45a3-86cc-093e43ce119e') {
    orConditions.push({ storeId: 'store-002-nhanam-books' }, { storeId: '840daf2f-0f39-4a11-8bf3-f0cd2f64d9f1' });
  }
  ```
- **Tác động thực tế (Impact):**
  Anti-pattern kỹ thuật nghiêm trọng. Codebase bị nhiễm "ma thuật rác" (Magic constants), phá vỡ tính nhất quán khi chạy trên các môi trường test, staging và production.

---

#### 3. Lỗi COM-LED-003: Cron Affiliate Settlement Worker sử dụng In-Memory Lock thay vì Distributed Lock
- **Mức độ nghiêm trọng:** `HIGH (P1)`
- **Vị trí mã nguồn:**
  - File: [`platform/apps/commerce-service/src/modules/affiliate/services/affiliate-settlement-worker.service.ts:11, 47-58`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/affiliate/services/affiliate-settlement-worker.service.ts#L11)
- **Cơ chế sinh lỗi:**
  Worker chạy batch quyết toán hoa hồng mỗi ngày bằng cron:
  ```typescript
  private isRunning = false;
  ...
  async runSettlementBatch(...) {
    if (this.isRunning) return;
    this.isRunning = true;
    ...
  }
  ```
  Biến `isRunning` là biến boolean nội tại trong bộ nhớ (In-memory) của tiến trình. Khi hệ thống scale nhiều instance (e.g. 3 replica pods trong Kubernetes), tại thời điểm 00:00 VN, cả 3 pods cùng kích hoạt cron và cùng chạy batch quyết toán song song.
- **Tác động thực tế (Impact):**
  Nguy cơ ghi trùng giao dịch hoa hồng (Duplicate Commission Settlement), sai lệch số cái kép (Ledger Inconsistency) và thất thoát tiền giải ngân vào ví Affiliate.

---

## 3. TỔNG KẾT MỨC ĐỘ RỦI RO & MỤC TIÊU XỬ LÝ
Bảng phân tích trên đã định danh đầy đủ **10 khiếm khuyết cốt tử**:
- **4 Lỗ hổng CRITICAL (P0):** `COM-PAY-001`, `COM-ORD-001`, `COM-INV-001`, `COM-LED-001`.
- **5 Khiếm khuyết HIGH (P1):** `COM-ORD-002`, `COM-ORD-003`, `COM-INV-002`, `COM-ARCH-002`, `COM-LED-002`, `COM-LED-003`.
- **1 Lỗi MEDIUM (P2):** `COM-PAY-002`.

Tất cả các lỗi này cần được xử lý dứt điểm tận gốc rễ thông qua bản đặc tả thiết kế giải pháp kiến trúc tại `04_SOLUTION_DESIGN.md`.
