# BÁO CÁO KIỂM TOÁN TĨNH 6 TRỤC CHUYÊN SÂU (EXHAUSTIVE 6-AXIS CODE AUDIT)
## TIER 1 - CORE FINANCIAL & BUSINESS SERVICES: COMMERCE-SERVICE & BUSINESS-SERVICE
**Service mục tiêu:** `platform/apps/commerce-service` & `platform/apps/business-service`  
**Nhánh kiểm toán:** `audit/commerce-service`  
**Mức độ ưu tiên:** P0 (Trọng tâm An ninh Dòng tiền, Toàn vẹn Tồn kho & Độc lập Kiến trúc Microservices)

---

## 1. TỔNG QUAN HỆ THỐNG VÀ BỐI CẢNH KIỂM TOÁN
Trong hệ sinh thái Huki Ebook, `commerce-service` (Port 3003) và `business-service` (Port 3002) cấu thành **Tier 1 - Lõi Tổ chức & Dòng tiền Sàn**. Đây là phân hệ nắm giữ toàn bộ dữ liệu quan trọng nhất:
- Danh mục sách, giỏ hàng, đặt hàng (Order Lifecycle).
- Tích hợp cổng thanh toán VietQR / PayOS, xử lý Webhook tài chính và hoàn tiền (Refunds).
- Kiểm soát giữ chỗ (Reservation) và trừ kho vật lý (Physical Inventory).
- Sổ cái tài chính kép (Double-Entry Ledger), tài khoản tạm giữ (Escrow Holding) và ví nhà bán/người mua (Wallets).
- Hệ thống tiếp thị liên kết (Affiliate Commissions & Batch Settlement).

Giai đoạn UAT gần đây ghi nhận nhiều phản ánh nghiêm trọng về lỗi dòng tiền, đơn hàng bị hủy dù khách đã chuyển khoản thành công, hiện tượng bán âm kho (Overselling) khi nhiều người cùng đặt sách, và lỗi kết nối database chéo (Cross-DB coupling) giữa các microservice.

---

## 2. PHÂN TÍCH CHI TIẾT 6 TRỤC KIỂM TOÁN CHUYÊN SÂU

### 2.1. TRỤC 1: XỬ LÝ VI PHẠM ĐÓNG GÓI DỮ LIỆU (CROSS-DB QUERY VIOLATION)
- **Vị trí phát hiện:** [`platform/apps/commerce-service/src/common/seller-scope.util.ts:11-29, 49-62, 96-105`](file:///e:/HuKi/platform/apps/commerce-service/src/common/seller-scope.util.ts#L11-L29)
- **Cơ chế sinh lỗi:**
  Tại `seller-scope.util.ts`, hàm `getBusinessPool()` khởi tạo một `pg.Pool` kết nối trực tiếp vào cơ sở dữ liệu `huki_business` thông qua việc tự động thay thế chuỗi kết nối:
  ```typescript
  const bizDbUrl =
    process.env.BUSINESS_DATABASE_URL ||
    process.env.DATABASE_URL?.replace(/\/[^\/]+$/, '/huki_business') ||
    'postgresql://postgres:postgres123@localhost:5432/huki_business';
  poolInstance = new Pool({ connectionString: bizDbUrl, max: 10, ... });
  ```
  Sau đó, các hàm `getSellerScope()` và `resolveStoreAndBusinessIds()` thực thi các câu lệnh Raw SQL trực tiếp lên các bảng `businesses`, `stores`, `members` thuộc quyền sở hữu độc quyền của `business-service`.
- **Rủi ro và Hậu quả (Architectural Anti-Pattern):**
  1. **Phá vỡ nguyên lý Database-per-Service:** `commerce-service` phụ thuộc trực tiếp vào cấu trúc bảng nội bộ của `business-service`. Khi `business-service` thay đổi schema hoặc tách sang cụm Database vật lý/RDS riêng biệt, `commerce-service` sẽ gãy đổ toàn bộ luồng quản lý đơn hàng của Seller.
  2. **Rò rỉ Connection Pool:** Mỗi instance của `commerce-service` âm thầm chiếm dụng 10 kết nối trực tiếp sang Postgres của `business-service`, có nguy cơ làm cạn kiệt connection pool của DB.
  3. **Thiếu API Contract:** Nguyên nhân gốc rễ là do `business-service` chưa cung cấp các endpoint nội bộ (`/api/v1/internal/*`) để các downstream service truy vấn phạm vi phân quyền của seller.

---

### 2.2. TRỤC 2: CỔNG THANH TOÁN PAYOS & XÁC THỰC WEBHOOK (PAYMENT & CHECKSUM)
- **Vị trí phát hiện:**
  - [`platform/apps/commerce-service/src/modules/payments/payments.controller.ts:36-45`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/payments/payments.controller.ts#L36-L45)
  - [`platform/apps/commerce-service/src/modules/payments/payments.service.ts:251-302`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/payments/payments.service.ts#L251-L302)
  - [`platform/apps/commerce-service/src/modules/payments/payos.service.ts:90-96`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/payments/payos.service.ts#L90-L96)
- **Phát hiện lỗ hổng nghiêm trọng P0 (PAY-VULN-001 - Bypass Thanh toán mô phỏng):**
  Endpoint `POST /api/v1/payments/orders/:orderId/simulate-success` được mở công khai trong Controller cho mọi người dùng có token Bearer thông thường (`@UseGuards(AuthenticatedGuard)`):
  ```typescript
  // payments.service.ts:295
  await this.completePaymentFromPayOS(payment, mockLinkInfo, payment.order);
  ```
  Hàm này không kiểm tra môi trường (`NODE_ENV === 'production'`) và không yêu cầu quyền `PLATFORM_ADMIN`. Bất kỳ khách mua hàng nào cũng có thể gửi request này để tự xác nhận đơn hàng đã thanh toán thành công, trừ kho thực tế, kích hoạt quyền đọc Ebook và chuyển tiền vào ví Seller mà không hề tốn một đồng nào!
- **Đánh giá xác thực chữ ký Webhook (HMAC-SHA256):**
  Tại `payos.service.ts:90-96`, hàm `verifyWebhook()` sử dụng `createHmac('sha256', checksumKey)` và `timingSafeEqual`, bảo đảm chống tấn công Timing Attack. Chữ ký được đối chiếu chính xác với `PAYOS_CHECKSUM_KEY`.
- **Kiểm tra tính Idempotency & Sai lệch số tiền (Amount Tampering):**
  Tại `payments.service.ts:489-492`:
  - Đã có kiểm tra số tiền `Number(payment.amount) !== Number(payload.data.amount) -> throwBadRequest(ErrorCode.PAYMENT_AMOUNT_MISMATCH)`.
  - Đã có kiểm tra trạng thái thanh toán `payment.status === SUCCEEDED` và cập nhật có điều kiện `updateMany({ where: { status: { in: [PENDING, PROCESSING] } } })`.

---

### 2.3. TRỤC 3: MÁY TRẠNG THÁI ĐƠN HÀNG & GIẢI PHÓNG TỒN KHO (ORDER STATE MACHINE & TTL)
- **Vị trí phát hiện:**
  - [`platform/apps/commerce-service/src/modules/payments/payments.service.ts:65-72, 1207-1310`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/payments/payments.service.ts#L65-L72)
  - [`platform/apps/commerce-service/src/modules/payments/payments.service.ts:496-502, 633-750`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/payments/payments.service.ts#L633-L750)
- **Cơ chế hoạt động của TTL Worker:**
  - Hằng số TTL: `ORDER_PAYMENT_TTL_SECONDS = 900s` (15 phút đối với đơn thường) và 60s đối với đơn Flash Sale.
  - Worker quét tự động mỗi 5 giây (`setInterval(..., 5000)`).
  - Khi đơn quá hạn, worker thực thi `this.prisma.$transaction` để chuyển trạng thái đơn sang `CANCELLED`, payment sang `EXPIRED`, và gọi `this.reservations.release()` để nhả số lượng sách tạm giữ về kho khả dụng.
- **Xử lý Race Condition tại giây thứ 901 (Late Webhook Edge Case):**
  - Hệ thống đã thiết kế hàm `handleLateWebhook()` để xử lý trường hợp khách chuyển tiền thành công nhưng webhook đến trễ sau khi Worker đã hủy đơn.
  - **Điểm yếu phát hiện (ORDER-RACE-001):** Tại `handleLateWebhook:654-666`, logic kiểm tra tồn kho để khôi phục (`canRestore`) đọc dữ liệu `tx.physicalBookDetails.findUnique` mà không sử dụng khóa bi quan (`FOR UPDATE`). Nếu có nhiều giao dịch trễ cùng khôi phục hoặc có người khác đang đặt mua, hệ thống có thể phán đoán sai số lượng tồn khả dụng, dẫn đến khôi phục thừa và làm âm kho vật lý.
  - **Điểm yếu phát hiện (ORDER-RACE-002):** Trong `completePaymentFromPayOS:326-335`, nếu một đơn hàng bị hủy do timeout nhưng được thanh toán qua kênh kiểm tra chủ động của worker, hàm này chuyển thẳng đơn sang `PROCESSING` và gọi `this.reservations.commit()` mà KHÔNG kiểm tra xem tồn kho đã bị người khác mua mất trong thời gian bị giải phóng hay chưa.

---

### 2.4. TRỤC 4: TRANH MUA & CHỐNG BÁN VƯỢT TỒN KHO (INVENTORY OVERSELLING PREVENTION)
- **Vị trí phát hiện:**
  - [`platform/apps/commerce-service/src/modules/orders/inventory-reservation.service.ts:22-54`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/inventory-reservation.service.ts#L22-L54)
  - [`platform/apps/commerce-service/src/modules/orders/checkout.service.ts:836`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/checkout.service.ts#L836)
  - [`platform/apps/commerce-service/prisma/schema.prisma:228-245`](file:///e:/HuKi/platform/apps/commerce-service/prisma/schema.prisma#L228-L245)
- **Cơ chế sinh lỗi Tranh chấp Tồn kho (INV-RACE-001 - Critical P0):**
  Tại `inventory-reservation.service.ts`, quá trình giữ chỗ sách vật lý diễn ra theo 2 tầng:
  1. **Tầng 1 (Redis Atomic):**
     ```typescript
     let redisResult = await this.redisService.reserveStockAtomic(item.bookId, item.quantity);
     if (redisResult === -1) {
       await this.redisService.syncStock(item.bookId, available);
       redisResult = await this.redisService.reserveStockAtomic(item.bookId, item.quantity);
     }
     ```
     Nếu Redis cache bị thiếu (Cold start hoặc Redis restart), 2 request đồng thời đều nhận `-1`. Cả 2 cùng đọc `available = 1` từ DB và cùng ghi đè lại `syncStock(..., 1)`, dẫn đến cả 2 đều trừ thành công trên Redis!
  2. **Tầng 2 (PostgreSQL Prisma Update):**
     ```typescript
     const details = await tx.physicalBookDetails.findUnique({ where: { bookId: item.bookId } });
     ...
     await tx.physicalBookDetails.update({
       where: { bookId: item.bookId },
       data: { reserved: { increment: item.quantity } },
     });
     ```
     - Prisma `findUnique` KHÔNG khóa dòng (`SELECT ... FOR UPDATE`).
     - Prisma `update` chỉ thực thi `UPDATE physical_book_details SET reserved = reserved + qty WHERE book_id = ?` mà KHÔNG có mệnh đề bảo vệ `AND (stock - reserved) >= qty`.
     - Trong Database Schema `physical_book_details`, hoàn toàn không có `CHECK (reserved <= stock)`.
  3. **Hậu quả thực tế:**
     Khi 10 khách hàng cùng bấm đặt cuốn sách cuối cùng trong kho Flash Sale, hệ thống cho phép nhiều đơn hàng cùng giữ chỗ thành công, khiến trường `reserved` vọt lên lớn hơn `stock`, gây ra sự cố bán âm kho nghiêm trọng trên thực tế.

---

### 2.5. TRỤC 5: PHÂN QUYỀN GIAN HÀNG & CÔ LẬP DỮ LIỆU ĐA CHỦ THỂ (TENANT ISOLATION)
- **Vị trí phát hiện:**
  - [`platform/apps/commerce-service/src/common/book-auth.guard.ts:25-47`](file:///e:/HuKi/platform/apps/commerce-service/src/common/book-auth.guard.ts#L25-L47)
  - [`platform/apps/commerce-service/src/modules/orders/orders.service.ts:995-1010`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/orders.service.ts#L995-L1010)
- **Phân tích cơ chế kiểm tra quyền Seller:**
  - Tại `orders.service.ts:995`, hàm `assertSeller` bảo vệ các thao tác của người bán bằng cách kiểm tra:
    ```typescript
    const hasAccess =
      scope.ownerUserIds.includes(order.ownerUserId) ||
      scope.storeIds.includes(order.storeId) ||
      scope.businessIds.includes(order.storeId);
    if (!hasAccess) throwForbidden(ErrorCode.AUTHZ_NOT_OWNER);
    ```
  - Cơ chế này ngăn chặn IDOR/BOLA giữa các gian hàng khác nhau khi thao tác trên đơn hàng (`confirm`, `ship`, `cancelSeller`).
- **Điểm yếu phát hiện (SEC-GUARD-001):**
  1. `book-auth.guard.ts:35` chứa mảng secret fallback hardcoded:
     `['your-super-secret-jwt-key', '0521ab048...']`. Khi chạy ở môi trường test/staging hoặc nếu cấu hình biến môi trường bị thiếu, guard có thể chấp nhận token giả mạo được ký bằng secret mặc định này.
  2. Guard tự parse lại JWT từ header `Authorization` thay vì sử dụng các Header đáng tin cậy đã được Ingress Gateway xác thực và làm sạch (`x-user-id`, `x-user-role`, `x-business-id`).

---

### 2.6. TRỤC 6: SỔ CÁI TÀI CHÍNH, ESCROW & TIẾP THỊ LIÊN KẾT (LEDGER & AFFILIATE)
- **Vị trí phát hiện:**
  - [`platform/apps/commerce-service/src/modules/orders/settlement.service.ts:98-145`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/settlement.service.ts#L98-L145)
  - [`platform/apps/commerce-service/src/modules/affiliate/services/affiliate-settlement-worker.service.ts:47-60`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/affiliate/services/affiliate-settlement-worker.service.ts#L47-L60)
  - [`platform/apps/commerce-service/src/modules/affiliate/services/affiliate-lifecycle.service.ts:170-199`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/affiliate/services/affiliate-lifecycle.service.ts#L170-L199)
- **Đánh giá Sổ cái kép (Double-Entry Ledger) & Độ chính xác số học:**
  - `settlement.service.ts` tuân thủ chuẩn kế toán: Tiền thanh toán của khách được giam giữ tại tài khoản `ESCROW_HOLDING` và ghi nhận treo tại `SELLER_PENDING`.
  - Phép tính hoa hồng sàn sử dụng thư viện `Decimal` với phương thức làm tròn nửa lên `Decimal.ROUND_HALF_UP`, tránh sai số làm tròn số thực (Floating-point error).
  - Phí vận chuyển được bóc tách nghiêm ngặt khỏi doanh thu tính hoa hồng của Seller (`merchandiseNet = grandTotal - shippingFee`).
- **Lỗ hổng Concurrency trong Affiliate Settlement Worker (AFF-WORKER-001):**
  Tại `affiliate-settlement-worker.service.ts:53-56`, cơ chế chống chạy trùng lặp chỉ dựa trên cờ boolean in-memory:
  ```typescript
  if (this.isRunning) {
    return { status: 'SKIPPED_ALREADY_RUNNING' as const };
  }
  ```
  Trong môi trường triển khai Production có từ 2 pod trở lên (Horizontal Pod Autoscaling), cron job `@Cron('0 17 * * *')` sẽ kích hoạt đồng thời trên tất cả các pod, dẫn đến việc quét trùng lặp và cố gắng giải phóng hoa hồng kép vào ví Affiliate nếu thiếu Distributed Lock (Redis Lock hoặc Postgres Advisory Lock).
- **Rủi ro phân rã giao dịch trong Affiliate Cancellation (AFF-TX-001):**
  Tại `affiliate-lifecycle.service.ts:186`, khi đơn hàng bị hủy, hàm `handleOrderCancelled` gọi `this.stateMachine.cancelCommission` độc lập cho từng commission mà không truyền context transaction `tx`, dẫn đến nguy cơ trạng thái hoa hồng bị lệch nếu tiến trình hủy đơn hàng gặp sự cố giữa chừng.

---

## 3. BẢNG TỔNG HỢP RỦI RO SƠ BỘ (PRELIMINARY RISK MATRIX)

| Mã Rủi Ro | Phân Nhóm Taxonomy | Mức Độ | File & Dòng Phát Hiện | Bản Chất Lỗ Hổng / Hành Vi Sai Logic |
| :---: | :--- | :---: | :--- | :--- |
| **PAY-VULN-01** | `[PAYMENT - WEBHOOK & CHECKSUM]` | **P0 (Critical)** | `payments.controller.ts:36-45`<br>`payments.service.ts:251-302` | **Lỗ hổng bypass thanh toán mô phỏng:** Endpoint `simulate-success` mở cho mọi user, tự xác nhận đã thanh toán mà không qua PayOS. |
| **INV-RACE-01** | `[INVENTORY - RACE CONDITION & ACID]` | **P0 (Critical)** | `inventory-reservation.service.ts:22-54`<br>`checkout.service.ts:836` | **Tranh chấp giữ chỗ gây bán âm kho (Overselling):** Thiếu `FOR UPDATE` trong DB và thiếu điều kiện atomic `stock >= reserved + qty`. |
| **ARCH-CDB-01** | `[ARCHITECTURE - CROSS-DB COUPLING]` | **P0 (Critical)** | `seller-scope.util.ts:11-29, 49-62` | **Vi phạm đóng gói Database vi dịch vụ:** `commerce-service` mở kết nối `pg.Pool` trực tiếp sang database `huki_business`. |
| **ORD-RACE-01** | `[ORDER - STATE MACHINE & TTL WORKER]` | **P1 (High)** | `payments.service.ts:633-750`<br>`payments.service.ts:304-335` | **Xung đột đơn hủy và thanh toán trễ (901s):** `completePaymentFromPayOS` cam kết trừ kho đơn hủy mà không thẩm định lại lượng tồn kho khả dụng. |
| **AFF-WORK-01** | `[LEDGER - ESCROW & AFFILIATE]` | **P1 (High)** | `affiliate-settlement-worker.service.ts:53-56` | **Thiếu Distributed Lock trong Batch Quyết toán:** Cờ in-memory `isRunning` gây chạy trùng lặp khi scale nhiều instance. |
| **SEC-GRD-01** | `[TENANT - ISOLATION & RBAC]` | **P2 (Medium)** | `book-auth.guard.ts:30-37` | **Tồn tại Hardcoded JWT Secret Fallback:** Mảng secret dự phòng chứa key mặc định không an toàn (`your-super-secret-jwt-key`). |

---

## 4. KẾT LUẬN & ĐỊNH HƯỚNG BƯỚC TIẾP THEO (MESSAGE 15)
- Không gian làm việc cho nhánh `audit/commerce-service` đã được cô lập hoàn chỉnh.
- Toàn bộ 6 trục kiến trúc, thanh toán, tồn kho, phân quyền và sổ cái đã được bóc tách chi tiết với đầy đủ bằng chứng mã nguồn dòng code thật.
- Hệ thống đã sẵn sàng chuyển giao sang **Message 15** để xây dựng các kịch bản kiểm thử động (Live Dynamic Test Scripts) tại `scriptstest/audit/commerce-service/`, chứng minh thực nghiệm các lỗi thanh toán và tranh chấp kho trên cổng 3003 và 3002.
