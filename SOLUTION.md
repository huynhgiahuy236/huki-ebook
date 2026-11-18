# GIẢI PHÁP KIẾN TRÚC & TRIỂN KHAI TOÀN DIỆN (SHOPEE-GRADE ARCHITECTURE)
**Tài liệu:** Thiết kế chi tiết & Phương án xử lý dứt điểm 5 mục cốt lõi  
**Nhánh áp dụng:** `fix/backend-consistency-and-boundaries`  
**Hệ thống:** Nền tảng E-Commerce HUKI Microservices  
**Tiêu chuẩn:** ACID Database Transactions, Event-Driven Architecture, High Concurrency, Zero Message Loss, Idempotent Consumers, Database-per-Service.

---

## MỤC 1: Nhất quán tuyệt đối giữa Đơn hàng & Hoa hồng Affiliate

### 1.1. Hiện trạng & Vấn đề tồn đọng
Codex đã đưa transaction vào các hàm của State Machine và bỏ `try/catch` ở 2 luồng hủy của Buyer (`cancelOrder`, `cancelSellerOrder`). Tuy nhiên, **vẫn còn 4 luồng hủy đơn trọng yếu bị bỏ sót**, dẫn đến hoa hồng `PENDING` bị treo vĩnh viễn hoặc bị trả nhầm cho Affiliate:
1. `expirePaymentBatch` / `cancelOrphanOrders` trong `payments.service.ts`: Đơn quá hạn thanh toán PayOS bị hủy tự động nhưng hoa hồng không bị hủy.
2. `sellerCancelOrder` trong `orders.service.ts`: Người bán hết hàng tự hủy kiện hàng nhưng hoa hồng không bị hủy.
3. `adminCancelSellerOrder` trong `orders.service.ts`: Người bán duyệt yêu cầu hủy lúc đóng hàng nhưng hoa hồng không bị hủy.
4. `shipperMarkFailedDelivery` trong `orders.service.ts`: Shipper giao hàng thất bại / bom hàng hoàn về kho (`SellerOrderStatus.CANCELLED`) nhưng hoa hồng không bị hủy.

### 1.2. Giải pháp kỹ thuật chuẩn Shopee
Toàn bộ các luồng hủy đơn (dù do Buyer, Seller, Shipper hay Hệ thống) đều phải tuân thủ nguyên tắc: **Cập nhật trạng thái đơn và Hủy hoa hồng Affiliate phải nằm trong cùng một Database Transaction (`tx`).**

#### A. Vá 4 luồng hủy đơn trong Commerce Service
1. **Trong `payments.service.ts` (`expirePaymentBatch` & `cancelOrphanOrders`):**
   ```typescript
   // Tại khối tx cập nhật Order sang CANCELLED do hết hạn PayOS:
   if (this.affiliateLifecycle) {
     await this.affiliateLifecycle.handleOrderCancelled(
       payment.orderId,
       `Hết hạn thanh toán PayOS (${timeoutLabel})`,
       tx,
     );
   }
   ```
2. **Trong `orders.service.ts` (`sellerCancelOrder`):**
   ```typescript
   // Tại khối tx cập nhật SellerOrder sang CANCELLED:
   if (this.affiliateLifecycle) {
     await this.affiliateLifecycle.handleOrderCancelled(
       sellerOrder.orderId,
       `Người bán hủy kiện hàng: ${dto.reason}`,
       tx,
       sellerOrder.id, // Lọc đúng kiện hàng con
     );
   }
   ```
3. **Trong `orders.service.ts` (`adminCancelSellerOrder`):**
   ```typescript
   // Tại khối tx Seller chấp thuận hủy lúc đóng gói:
   if (this.affiliateLifecycle) {
     await this.affiliateLifecycle.handleOrderCancelled(
       sellerOrder.orderId,
       reason,
       tx,
       sellerOrder.id,
     );
   }
   ```
4. **Trong `orders.service.ts` (`shipperMarkFailedDelivery`):**
   ```typescript
   // Tại khối tx Shipper báo giao thất bại / Hoàn hàng:
   if (this.affiliateLifecycle) {
     await this.affiliateLifecycle.handleOrderCancelled(
       sellerOrder.orderId,
       `Giao hàng thất bại / Hoàn hàng: ${reason}`,
       tx,
       sellerOrder.id,
     );
   }
   ```

#### B. Quy tắc Thu hồi hoa hồng sau đối soát (Clawback & Dispute)
- Khi đơn hàng đã giao thành công và hết hạn khiếu nại (Holding 7 ngày với sách giấy, 24h với Ebook), hoa hồng chuyển sang `AVAILABLE`.
- Nếu khách phát sinh khiếu nại bồi hoàn sau đối soát (Chargeback / Fraud), hàm `handleOrderItemRefunded` gọi `stateMachine.reverseCommission(..., tx)`.
- Ghi nhận bút toán kép (Double-entry Ledger) đảo nợ:
  - `DEBIT: AFFILIATE_PAYABLE_AVAILABLE`
  - `CREDIT: SELLER_COMMISSION_EXPENSE`
- Ví Affiliate cho phép **âm số dư (Debt Balance)** và tự động khấu trừ vào các kỳ hoa hồng kế tiếp của Affiliate đó.

#### C. Khấu trừ Hoa hồng Affiliate vào Tiền Quyết toán Người bán (Seller Settlement Payout)
- **Vấn đề:** Hiện tại `SettlementService.calculateSettlement` chỉ trừ `platformCommission` và cộng `platformSubsidy`, không trừ `affiliateCommission`.
- **Giải pháp:**
  - Trong `SettlementService.calculateSettlement`, tính toán tổng hoa hồng CTV phát sinh từ kiện hàng:
    ```typescript
    const affiliateCommission = await this.prisma.affiliateCommission.aggregate({
      where: {
        orderId: sellerOrder.orderId,
        storeId: sellerOrder.storeId,
        status: { in: ['HOLDING', 'SETTLED', 'AVAILABLE'] },
      },
      _sum: { commissionAmount: true },
    });
    const affCommissionAmount = new Decimal(affiliateCommission._sum.commissionAmount || 0);

    // Quyết toán chuẩn Shopee: Doanh thu món - Phí sàn - Hoa hồng CTV + Trợ giá sàn
    let sellerNet = merchandiseNet
      .sub(platformCommission)
      .sub(affCommissionAmount)
      .add(platformSubsidy);
    if (sellerNet.isNegative()) {
      sellerNet = new Decimal(0);
    }
    ```
  - Trả về chi tiết `affiliateCommission` trong đối tượng kết quả quyết toán để hiển thị minh bạch trên hóa đơn/bảng kê của Người bán.

---

## MỤC 2: Giữ chỗ & Bù trừ Voucher 2-Phase (Voucher Reservation & Anti-Hoarding)

### 2.1. Hiện trạng & Vấn đề tồn đọng
Codex đã tạo bảng `voucher_reservations` và dùng `SELECT ... FOR UPDATE` có sắp xếp ID (tốt). Tuy nhiên:
- **TTL giữ chỗ 30 phút là quá dài**: Tạo kẽ hở cho hành vi gom voucher phá hoại trong các đợt Flash Sale / Siêu Sale.
- **Hoàn trả voucher khi trả hàng từng món (Partial Return)**: Chưa phân định chính sách hoàn trả giữa Voucher sàn, Voucher shop và Freeship.

### 2.2. Giải pháp kỹ thuật chuẩn Shopee

#### A. Rút ngắn TTL & Đồng bộ thời gian chờ thanh toán
- Giảm TTL của `VoucherReservation` từ 30 phút xuống **15 phút**:
  ```typescript
  // Trong vouchers.service.ts (reserveForCheckout):
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 phút (khớp với hạn PayOS QR)
  ```
- Thêm Cron Job tự động quét và giải phóng các reservation `HELD` đã quá hạn (`expiresAt <= now`), chuyển trạng thái sang `EXPIRED`.

#### B. Cơ chế Khóa chống Deadlock (Đã chuẩn hóa)
- Bắt buộc sắp xếp Voucher theo thứ tự bảng chữ cái của ID trước khi khóa dòng bằng `FOR UPDATE`:
  ```typescript
  const orderedVouchers = normalized
    .map(...)
    .sort((a, b) => a.voucher.id.localeCompare(b.voucher.id));
  for (const { voucher } of orderedVouchers) {
    await tx.$queryRaw`SELECT id FROM vouchers WHERE id = ${voucher.id} FOR UPDATE`;
  }
  ```

#### C. Chính sách Hoàn trả Voucher chuẩn Shopee (Partial Return Matrix)
Khi đơn hàng bị hủy hoặc hoàn trả, `PromotionOrderEventConsumer` xử lý theo ma trận:
1. **Hủy toàn bộ đơn hàng (Full Cancellation / Payment Failed):**
   - Hoàn trả lại toàn bộ lượt dùng của tất cả các voucher (`VoucherUsage` bị xóa, `currentUsage` giảm 1, `VoucherReservation` chuyển sang `RELEASED`).
2. **Hủy một phần / Trả hàng một shop trong đơn đa shop (Partial Cancellation):**
   - **Voucher sàn (Platform Voucher):** *KHÔNG HOÀN LẠI* (vì các món khác vẫn hưởng ưu đãi chung).
   - **Voucher Freeship (Shipping Voucher):** *KHÔNG HOÀN LẠI* nếu vẫn còn ít nhất 1 kiện hàng cần giao.
   - **Voucher của Shop (Store Voucher):** *ĐƯỢC HOÀN LẠI* nếu toàn bộ sản phẩm của shop đó trong đơn bị hủy hoàn toàn.

---

## MỤC 3: Vòng đời Inbox Shipping & Tích hợp hãng vận chuyển bất đồng bộ (Outbox Pattern)

### 3.1. Hiện trạng & Vấn đề tồn đọng
Codex đã đổi thứ tự ghi `inboxEvent` xuống sau khi xử lý thành công (sửa lỗi nuốt message). Nhưng **vẫn gọi trực tiếp API hãng vận chuyển đồng bộ bên trong Consumer thread**:
- Nếu GHTK / GHN phản hồi chậm 10-30s hoặc sập API, Consumer của RabbitMQ bị block đứng yên, gây tắc nghẽn toàn bộ hàng đợi vận chuyển.

### 3.2. Giải pháp kỹ thuật chuẩn Shopee: Transactional Outbox for 3PL Dispatch

Thay vì gọi carrier đồng bộ trong Consumer, áp dụng quy trình 2 bước bất đồng bộ:

```
[RabbitMQ: ORDER_CREATED]
         │
         ▼
[ShippingOrderEventConsumer]
         │ (1 DB Transaction)
         ├── 1. Tạo Shipment (Status: PENDING_DISPATCH)
         ├── 2. Tạo Outbox Task (Type: DISPATCH_CARRIER)
         └── 3. Ghi InboxEvent (Đánh dấu hoàn tất nhận tin)
         │
         ▼
[CarrierDispatchWorker (Background Task / Cron / Bull Queue)]
         │
         ├── 1. Lấy task DISPATCH_CARRIER
         ├── 2. Gọi API GHTK / GHN với Idempotency Key: `sellerOrderId`
         ├── 3. Nhận Tracking Number (mã vận đơn)
         └── 4. Cập nhật Shipment (Status: READY_TO_PICK, trackingNumber)
```

#### Các lợi ích vượt trội:
1. **Không nghẽn RabbitMQ:** Consumer xử lý xong chỉ trong 5-10ms (chỉ ghi DB nội bộ).
2. **Khả năng chịu lỗi cao:** Nếu GHTK bảo trì 2 tiếng, các đơn hàng vẫn được tiếp nhận bình thường vào trạng thái `PENDING_DISPATCH`. Khi GHTK hoạt động trở lại, worker sẽ tự động đẩy bù mà không làm gián đoạn hệ thống.
3. **Idempotency tuyệt đối:** Gửi kèm `sellerOrderId` vào trường `client_id` của hãng vận chuyển để ngăn chặn việc tạo 2 mã vận đơn cho cùng 1 kiện hàng.

---

## MỤC 4: Chuẩn hóa Event Bus (Non-blocking Retry & Dead Letter Exchange)

### 4.1. Hiện trạng & Vấn đề tồn đọng
Codex đã thêm Publisher Confirm và header DLQ, nhưng lại chèn:
```typescript
await new Promise((resolve) => setTimeout(resolve, delayMs)); // ❌ Chặn luồng worker
```
Dùng `setTimeout` trong worker sẽ khóa cứng connection channel, làm worker không thể xử lý bất kỳ message nào khác trong thời gian chờ (10 giây).

### 4.2. Giải pháp kỹ thuật chuẩn Shopee: RabbitMQ DLX Retry Queues

Không dùng `setTimeout` trong code. Ủy thác hoàn toàn việc chờ retry cho RabbitMQ bằng cơ chế **Message TTL & Dead Letter Exchange**:

```
[Main Queue: commerce.order-events] ──(Lỗi xử lý)──► [Retry Exchange: huki.retry]
                                                              │
                                                              ▼
                                                     [Delay Queue: huki.retry.5s]
                                                     (x-message-ttl: 5000)
                                                     (x-dead-letter-exchange: huki.events)
                                                              │ (Hết 5s TTL)
                                                              ▼
                                                     [Main Queue: Tự động nhận lại]
```

#### Quy tắc xử lý:
1. **Khi Consumer gặp lỗi tạm thời (Mạng, DB lock):**
   - Đọc `x-retry-count`. Nếu `< MAX_RETRIES`:
   - Publish message sang Queue chờ trễ (`huki.retry.delay`) kèm header `x-retry-count + 1`.
   - Gọi `rawChannel.ack(message)` ngay lập tức để giải phóng thread worker.
   - Sau thời gian TTL (5 giây), RabbitMQ tự động đẩy message quay lại queue chính để xử lý lần 2.
2. **Khi vượt quá `MAX_RETRIES` (Lỗi nghiệp vụ vĩnh viễn):**
   - Chuyển message vào `huki.dead-letter` kèm thông tin lỗi: `x-last-error`, `x-failed-at`.
3. **Công cụ Redrive cho Ops:**
   - Cung cấp API nội bộ `POST /internal/events/dlq/redrive` cho phép đội ngũ vận hành quét lại các message trong DLQ sau khi hệ thống đã fix lỗi.

---

## MỤC 5: Phân ranh giới Microservices & Xóa bỏ triệt để SQL chéo

### 5.1. Hiện trạng & Vấn đề tồn đọng
- Lát cắt Business → Identity đã hoàn thành tốt qua API nội bộ.
- **Lát cắt Identity → Commerce VẪN CÒN NGUY HIỂM:**
  Trong `apps/identity-service/src/modules/user/user.service.ts` (dòng 393 & 433), hàm kiểm tra trước khi xóa tài khoản người dùng vẫn dùng `require('pg')` kết nối thẳng vào Database của Commerce. Nếu lỗi kết nối, hệ thống chỉ `console.warn` rồi... **vẫn tiếp tục xóa tài khoản**!
- **Lỗ hổng bảo mật Fallback Keys:**
  Trong `shipping-service` và `promotion-service`, các controller nội bộ vẫn còn fallback chuỗi hardcode: `'huki-super-secret-internal-key-change-in-production'`.

### 5.2. Giải pháp kỹ thuật chuẩn Shopee

#### A. Xóa triệt để kết nối PostgreSQL trong `user.service.ts`
1. **Phía Commerce Service:**
   Tạo Controller nội bộ `InternalOrdersController`:
   ```typescript
   @Controller('internal/orders')
   @UseGuards(InternalAuthGuard)
   export class InternalOrdersController {
     @Get('active-check/:userId')
     async checkActiveOrders(@Param('userId') userId: string) {
       // Kiểm tra các đơn PENDING, PROCESSING, SHIPPING, DISPUTED
       const count = await this.ordersService.countActiveOrdersForUser(userId);
       return { data: { hasActiveOrders: count > 0, activeCount: count } };
     }
   }
   ```
2. **Phía Identity Service:**
   - Xóa bỏ hoàn toàn hàm `getCommerceDbClient()`.
   - Tạo `CommerceClientService` gọi HTTP sang Commerce với header `x-internal-service-key`.
   - **Chính sách an toàn tuyệt đối khi xóa tài khoản:**
     ```typescript
     const { hasActiveOrders } = await this.commerceClient.checkActiveOrders(userId);
     if (hasActiveOrders) {
       throw new ConflictException(
         'Không thể xóa tài khoản khi đang có đơn hàng hoặc khiếu nại đang xử lý.',
       );
     }
     ```
     Nếu Commerce Service không phản hồi (lỗi mạng/downtime), **BẮT BUỘC TỪ CHỐI XÓA** (`throw new ServiceUnavailableException(...)`), tuyệt đối không được nuốt lỗi cho qua.

#### B. Khắc phục dứt điểm bảo mật Hardcoded Keys
1. Xóa bỏ tất cả các chuỗi fallback `'huki-super-secret-internal-key-change-in-production'`.
2. Kiểm tra bắt buộc biến môi trường lúc khởi động (`main.ts`):
   ```typescript
   if (!process.env.INTERNAL_SERVICE_KEY) {
     throw new Error('FATAL: INTERNAL_SERVICE_KEY must be configured in environment!');
   }
   ```
3. Xóa bỏ mật khẩu mặc định hardcode `'Staff123!'` trong mã nguồn; yêu cầu sinh mật khẩu ngẫu nhiên an toàn (Crypto random string) khi tạo nhân viên và gửi qua Email.

---

## TỔNG HỢP CHECKLIST BẢO ĐẢM TRƯỚC KHI MERGE VÀO DEVELOP

- [ ] **Mục 1:** Chèn 4 dòng `handleOrderCancelled` trong `PaymentsService` và `OrdersService` (Seller cancel, Packing cancel, Shipper failed, Payment expired).
- [ ] **Mục 2:** Giảm TTL voucher reservation xuống 15 phút và bổ sung cron auto-expire.
- [ ] **Mục 3:** Tách cuộc gọi 3PL carrier ra khỏi Consumer thread bằng Transactional Outbox / Dispatcher Worker.
- [ ] **Mục 4:** Bỏ `setTimeout` trong Event Bus, chuyển sang RabbitMQ TTL Retry Exchange.
- [ ] **Mục 5:** Xóa bỏ `pg.Client` trong Identity, tạo API nội bộ kiểm tra đơn bên Commerce, xóa sạch các fallback key hardcode.
- [ ] **Toàn bộ Test Suite:** Chạy `npm test` cho tất cả các service, bảo đảm 100% test pass không dùng mock gian lận.
