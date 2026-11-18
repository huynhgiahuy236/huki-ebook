# BÁO CÁO RÀ SOÁT LỖI & TÍNH NHẤT QUÁN BACKEND
**Nhánh:** `fix/backend-consistency-and-boundaries`  
**Ngày rà soát:** 19/11/2026  
**Mục tiêu:** Đảm bảo tính nhất quán (ACID), ranh giới dịch vụ và kiểm soát giao dịch (DB Transactions) giữa Commerce, Affiliate, Promotion, Shipping, Event Bus và Identity.

---

## 1. Mục 1: Nhất quán trong Commerce (Affiliate & Order Transactions)

### 1.1. Những điểm Codex đã hoàn thành tốt
- **Hỗ trợ Transaction Client (`tx`):** Các hàm chuyển trạng thái hoa hồng (`cancelCommission`, `reverseCommission`, `blockDispute`, `unblockDispute`) trong `AffiliateCommissionStateMachineService` đã nhận tham số `transactionClient?: any`. Nếu caller truyền `tx`, hệ thống dùng chung Prisma transaction hiện tại thay vì mở transaction độc lập.
- **Loại bỏ nuốt lỗi (`try/catch`) khi hủy đơn:** Trong `OrdersService.cancelOrder` và `OrdersService.cancelSellerOrder`, đã bỏ `try/catch`. Nếu cập nhật hoa hồng thất bại, toàn bộ giao dịch hủy đơn hàng sẽ rollback, tránh tình trạng đơn hàng đã hủy nhưng tiền hoa hồng vẫn ở trạng thái `PENDING` / `HOLDING` và bị đối soát nhầm.
- **Tách hủy đơn theo kiện hàng con (`sellerOrderId`):** Đã truyền `sellerOrderId` từ `cancelSellerOrder` vào `handleOrderCancelled`, lọc chính xác hoa hồng của các item thuộc kiện hàng con đó (`where.orderItem = { sellerOrderId }`), không làm ảnh hưởng đến hoa hồng của shop khác trong đơn hàng cha đa shop.
- **Hoàn trả món lẻ trong Transaction:** Di chuyển lời gọi `handleOrderItemRefunded` vào bên trong transaction của `OrdersService.updateReturnRequest`.
- **Kích hoạt hoa hồng Ebook:** Bổ sung lời gọi `handleDigitalOrderPaid(orderId, paidAt, tx)` trong `PaymentsService` (cả webhook PayOS và xác minh thanh toán), sửa dứt điểm bug hoa hồng Ebook bị treo vĩnh viễn ở `PENDING`.

### 1.2. Lỗi đã phát hiện và đã khắc phục trong mã nguồn
- **Lỗi gãy 7 Unit Tests trong `affiliate-lifecycle.spec.ts`:**
  - *Nguyên nhân:* Codex truyền trực tiếp biến `tx` (khi không có sẽ mang giá trị `undefined`) vào các hàm mock của state machine (`cancelCommission(id, reason, tx)`). Jest's `toHaveBeenCalledWith` bắt lỗi do nhận thừa tham số `undefined` ở cuối (mong đợi 2 tham số nhưng nhận 3 tham số).
  - *Khắc phục:* Đã chuẩn hóa lại các lời gọi có điều kiện (`tx ? fn(..., tx) : fn(...)`), nhất quán với hàm `handleOrderDelivered`.
  - *Trạng thái:* Toàn bộ 11 test suites (**133/133 tests**) của Affiliate đã **PASS 100%**.

### 1.3. Các lỗ hổng BỎ SÓT cần bổ sung (Pending Patch)
Hệ thống vẫn còn **4 luồng hủy đơn hàng** mà Codex chưa chèn hủy hoa hồng Affiliate (`handleOrderCancelled`):

1. **Hết hạn thanh toán (Payment Timeout / Expired):**
   - **Vị trí:** `platform/apps/commerce-service/src/modules/payments/payments.service.ts` (trong hàm `expirePaymentBatch` / `cancelOrphanOrders` dòng ~1345 và ~1455).
   - **Vấn đề:** Khi khách tạo đơn (Checkout), hoa hồng `PENDING` đã được tạo trong DB. Nếu khách không thanh toán PayOS và đơn bị hết hạn, hệ thống hủy đơn (`CANCELLED`) nhưng **không gọi `handleOrderCancelled`**. Hoa hồng `PENDING` bị treo vĩnh viễn trong DB.
   - **Cách xử lý:** Bổ sung `await this.affiliateLifecycle.handleOrderCancelled(payment.orderId, 'Hết hạn thanh toán', tx)`.

2. **Người bán tự hủy kiện hàng (`sellerCancelOrder`):**
   - **Vị trí:** `platform/apps/commerce-service/src/modules/orders/orders.service.ts` (dòng 545 - 585).
   - **Vấn đề:** Khi Seller hết hàng và bấm hủy kiện hàng (`SellerOrderStatus.CANCELLED`), hàm này chưa gọi `handleOrderCancelled`.
   - **Cách xử lý:** Bổ sung `await this.affiliateLifecycle.handleOrderCancelled(sellerOrder.orderId, dto.reason, tx, sellerOrder.id)`.

3. **Người bán duyệt hủy đơn khi đang đóng hàng (`adminCancelSellerOrder`):**
   - **Vị trí:** `platform/apps/commerce-service/src/modules/orders/orders.service.ts` (dòng 703 - 745).
   - **Vấn đề:** Seller đồng ý hủy kiện hàng theo yêu cầu của khách, trạng thái đổi sang `CANCELLED` nhưng chưa hủy hoa hồng.
   - **Cách xử lý:** Bổ sung `await this.affiliateLifecycle.handleOrderCancelled(sellerOrder.orderId, reason, tx, sellerOrder.id)`.

4. **Shipper báo giao thất bại / Hoàn hàng về kho (`shipperMarkFailedDelivery`):**
   - **Vị trí:** `platform/apps/commerce-service/src/modules/orders/orders.service.ts` (dòng 4679 - 4705).
   - **Vấn đề:** Đơn giao thất bại và hoàn về kho (`SellerOrderStatus.CANCELLED`), hoa hồng chưa được cập nhật hủy.
   - **Cách xử lý:** Bổ sung `await this.affiliateLifecycle.handleOrderCancelled(sellerOrder.orderId, reason, tx, sellerOrder.id)`.

---

## 2. Mục 2: Giữ chỗ Voucher & Bù trừ (Đã triển khai & Kiểm tra hoàn tất)

### 2.1. Đánh giá chi tiết cơ chế triển khai
1. **Model & Migration `voucher_reservations`:**
   - Trạng thái: `HELD`, `CONSUMED`, `RELEASED`, `EXPIRED`.
   - Ràng buộc: `UNIQUE(checkout_session_id, voucher_id)`, TTL 30 phút.
   - File migration: `platform/apps/promotion-service/prisma/migrations/20261119000000_add_voucher_reservations/migration.sql`.
2. **Khóa chống tranh chấp đặt chỗ đồng thời (Concurrency Control):**
   - Trong `reserveForCheckout`: Sắp xếp voucher theo ID tăng dần (`sort((a, b) => a.id.localeCompare(b.id))`) trước khi thực hiện `SELECT ... FOR UPDATE`. Thiết kế này **ngăn ngừa triệt để hiện tượng Deadlock** giữa các request checkout đồng thời có chứa nhiều voucher trùng nhau.
   - Tính toán hạn mức dựa trên: `currentUsage + activeHolds < totalUsage` và `usedByUser + heldByUser < maxUsagePerUser`.
3. **Bù trừ 2-Phase trong `checkout.service.ts`:**
   - **Phase 1 (Reserve):** Trước khi tạo đơn, gọi sang Promotion để giữ quota. Nếu giữ chỗ thất bại (hết lượt), dừng checkout ngay, không sinh đơn với giá giảm không hợp lệ.
   - **Phase 2 (Confirm / Release):**
     - Nếu commit tạo đơn thất bại: Gọi `releaseReservations(sessionId)` để giải phóng quota ngay lập tức.
     - Xử lý trạng thái commit không rõ ràng (Uncertain Commit State): Kiểm tra `checkoutSession.consumedAt`. Nếu session đã consumed nghĩa là đơn đã tạo thành công trong DB (chỉ lỗi mạng sau đó), hệ thống sẽ **không nhả reservation** mà để Outbox event `ORDER_CREATED` xác nhận bù.
     - Nếu tạo đơn thành công: Gọi trực tiếp `confirmReservations` sang Promotion, đồng thời ghi event `ORDER_CREATED` kèm `checkoutSessionId` vào Outbox của Commerce.
4. **Bù trừ khi hủy đơn / thanh toán thất bại:**
   - `PromotionOrderEventConsumer` lắng nghe `ORDER_CANCELLED`, `SELLER_CANCELLED`, `PAYMENT_FAILED` để gọi `rollbackByOrderId`, tự động hoàn lượt dùng voucher và chuyển reservation sang `RELEASED`.

### 2.2. Kết quả kiểm tra Test & Build
- [x] **Commerce Service:** Biên dịch TypeScript thành công (`build:commerce`). Test suite `orders` (**64/64 tests PASS 100%**).
- [x] **Promotion Service:** Biên dịch TypeScript thành công (`build:promotion`). Test suite `promotion` (**37/37 tests PASS 100%**).

---

## 3. Mục 3: Vòng đời Inbox Shipping & Idempotency Hãng vận chuyển (Đã kiểm tra hoàn tất)

### 3.1. Đánh giá chi tiết cơ chế triển khai
1. **Sửa vòng đời Inbox Event (`shipping-order-event.consumer.ts`):**
   - *Trước đây (Flawed):* Consumer ghi `inboxEvent` **trước** khi tạo shipment. Nếu quá trình tạo vận đơn bị lỗi mạng hoặc crash, RabbitMQ gửi lại message thì hệ thống lại coi là trùng (duplicate) do bảng inbox đã có record, khiến đơn hàng **mất luôn vận đơn và không bao giờ được tạo lại**.
   - *Bây giờ (At-least-once Idempotent Consumer):* 
     - Bước 1: Kiểm tra xem `inboxEvent` đã hoàn tất chưa (`findUnique`). Nếu đã có -> bỏ qua (idempotent).
     - Bước 2: Thực hiện nghiệp vụ (tạo hoặc hủy shipment).
     - Bước 3: Chỉ ghi `inboxEvent` **sau khi** nghiệp vụ thành công.
     - Nếu Bước 2 ném lỗi: Không ghi inbox -> Consumer throw lỗi để RabbitMQ nack/retry. Khi retry, message sẽ được xử lý lại bình thường.
2. **Contract Idempotency cho Carrier (`carrier.provider.ts`):**
   - Đã quy định rõ: `sellerOrderId` là idempotency key cho việc tạo vận đơn; việc hủy cùng một `trackingNumber` phải an toàn khi gọi lại nhiều lần (idempotent no-op).
   - Trong `ShipmentsService.createOne`: Đã kiểm tra `prisma.shipment.findUnique({ where: { sellerOrderId } })` trước, và bắt lỗi `P2002` để trả về shipment cũ nếu đã tồn tại. Mock `ghtk-mock.provider.ts` sinh `trackingNumber` xác định từ hash của `sellerOrderId`.

### 3.2. Lưu ý vận hành (Operational Notes)
- Khi tích hợp API hãng vận chuyển thật (GHTK, GHN, ViettelPost) trong tương lai, adapter bắt buộc phải truyền `sellerOrderId` (hoặc mã đơn) vào trường mã đơn đối tác/client ID của hãng để phía hãng không tạo 2 bưu kiện thật khi mạng chập chờn.

### 3.3. Kết quả kiểm tra Test & Build
- [x] **Shipping Service:** Biên dịch TypeScript thành công (`build:shipping`).
- [x] **Shipping Unit Tests:** 2/2 test suites (**18/18 tests PASS 100%**).

---

## 4. Mục 4: Chuẩn hóa Event Bus & RabbitMQ Confirm / Retry / DLQ (Đã kiểm tra hoàn tất)

### 4.1. Đánh giá chi tiết cơ chế triển khai (`rabbitmq-event-bus.service.ts`)
1. **Publisher Confirm trước khi Ack:**
   - Dùng `this.publisher.sendToQueue` (ConfirmChannel).
   - Consumer chỉ gọi `ack(message)` sau khi RabbitMQ xác nhận bản sao retry hoặc DLQ đã vào queue an toàn. Nếu gửi retry thất bại, gọi `nack(..., requeue: true)` để không mất message gốc.
2. **Exponential Backoff khi Retry:**
   - Thêm độ trễ hàm mũ `Math.min(1000 * 2 ** retries, 10000)` trước khi republish để tránh tình trạng retry nóng (hot-looping) làm quá tải server hoặc DB khi gặp sự cố tạm thời.
3. **Cấu hình Max Retries & DLQ Metadata:**
   - Thêm `RABBITMQ_MAX_RETRIES` (mặc định 2, giới hạn [0, 10]) vào `.env.example`.
   - Ghi đầy đủ thông tin lỗi vào headers của message DLQ: `x-retry-count`, `x-last-error`, `x-dead-lettered-at`.

### 4.2. Kết quả kiểm tra Test & Build
- [x] **Shared Library:** Biên dịch TypeScript thành công (`build:shared`).
- [x] **Shared Unit Tests:** 9/9 test suites (**62/62 tests PASS 100%**).

---

## 5. Mục 5: Bỏ SQL truy cập DB chéo (Cross-Database Direct SQL Removal)

### 5.1. Lát cắt 1: Business → Identity (Đã hoàn tất & Kiểm tra thành công)
1. **Xóa bỏ các kết nối PostgreSQL trực tiếp:**
   - Đã gỡ toàn bộ mã mở kết nối `pg.Client` trực tiếp từ `BusinessService` và `MemberService` sang database `huki_identity`.
2. **Xây dựng API Contract nội bộ (`identity-service`):**
   - Thêm `InternalUserController` bảo vệ bởi `InternalAuthGuard` (xác thực header `x-internal-service-key`).
   - Cung cấp các endpoints có audit log đầy đủ:
     - `POST /internal/users/lookup-by-email`: Tìm kiếm ID và Role theo email.
     - `POST /internal/users/member-accounts`: Tạo tài khoản nhân viên mới (hash mật khẩu chuẩn, gán role `BUSINESS`).
     - `PATCH /internal/users/:id/member-access`: Cấp quyền truy cập business cho user hiện có (chuyển role `USER` -> `BUSINESS`, bật `mustChangePassword`).
     - `PATCH /internal/users/:id/password`: Đặt lại mật khẩu nhân viên an toàn (không ghi password vào log).
     - `PATCH /internal/users/:id/business-role`: Đồng bộ role `BUSINESS` khi doanh nghiệp được duyệt.
     - `POST /internal/users/profiles`: Lấy thông tin hiển thị của danh sách user.
3. **Client giao tiếp (`business-service`):**
   - Tạo `IdentityClientService` đóng gói các HTTP request sang Identity với timeout 5s và xác thực `x-internal-service-key`.
4. **Lỗi Unit Test đã khắc phục:**
   - Thêm mock `identity` vào `MemberService` và `BusinessService` trong các file `.spec.ts`.
5. **Kết quả kiểm tra Test & Build:**
   - [x] **Identity Service:** `build:identity` thành công; 4/4 test suites (**21/21 tests PASS 100%**).
   - [x] **Business Service:** `build:business` thành công; 3/3 test suites (**33/33 tests PASS 100%**).

### 5.2. Các lát cắt của Mục 5 (Đã hoàn thành 100%)
- [x] **Lát cắt 2 (Identity → Commerce):** Gỡ hoàn toàn `pg.Client` và `getCommerceDbClient()` trong `UserService`. Thay thế bằng endpoint nội bộ `GET /api/v1/internal/orders/commercial-obligations/:userId` trong `InternalOrdersController` (Commerce Service). Nếu Commerce gặp sự cố, hệ thống trả về `ServiceUnavailableException` để ngăn chặn bypass xóa tài khoản.
- [x] **Lát cắt 3 (Identity → Business):** Gỡ bỏ `getBusinessDbClient()` trong `UserService.findAll()`. Thay thế bằng endpoint nội bộ `POST /api/v1/internal/user-store-mappings` trong `InternalSellerScopeController` (Business Service) để lấy tên gian hàng và vai trò thành viên qua Prisma.
- [x] **Lát cắt 4 (Promotion Data Isolation):** Đã kiểm tra toàn bộ `promotion-service`, Promotion chỉ truy vấn DB riêng (`vouchers`, `voucher_usages`, `voucher_reservations`, `banners`, `flash_sales`), giao tiếp 2 chiều với Commerce thông qua Internal API và RabbitMQ Domain Events.
- [x] **Patch 4 luồng hủy đơn Mục 1:** Đã bổ sung `handleOrderCancelled` cho cả 4 luồng: PayOS timeout/expired (`payments.service.ts`), seller tự hủy (`orders.service.ts`), seller duyệt hủy (`orders.service.ts`), shipper báo giao thất bại hoàn về kho (`orders.service.ts`).
- [x] **Bù trừ hoa hồng Affiliate vào quyết toán Người bán:** Đã khấu trừ `affiliateCommission` vào `sellerNet` trong `SettlementService`, đồng thời cân bằng bảng cân đối kế toán kép bằng bút toán `SELLER_COMMISSION_EXPENSE` (Độ lệch Variance = 0).
- [x] **Chặn Người bán / Admin tham gia Affiliate:** Đã triển khai 5 tầng phòng vệ từ API Application, API tạo link, Attribution Checkout, Chặn hoa hồng sản phẩm shop mình, đến UI Account Layout & Route Guard.

---

## 7. Tổng kết kiểm thử hệ thống & Tiến độ (Verification & Status)

### 7.1. Danh sách Commit trên nhánh `fix/backend-consistency-and-boundaries`
1. `2ca71ce`: `docs: add comprehensive bug audit, shopee architecture solution, and e2e bug lifecycle readme`
2. `3005175`: `fix(commerce): deduct affiliate commission from seller net payout and balance ledger journal`
3. `9b49de5`: `fix(commerce): ensure affiliate commission cancellation across all remaining cancellation flows`
4. `bc3ed9c`: `feat(affiliate): block sellers and admins from affiliate program to prevent self-referral and fraud`
5. `c072405`: `fix(shared): add publisher-confirmed retry, backoff, and DLQ handling to rabbitmq event bus`
6. `c870513`: `fix(shipping): ensure idempotent order event processing and carrier idempotency contracts`
7. `695b172`: `feat(promotion): implement two-phase voucher reservation and outbox confirmation`
8. `b990b45`: `fix(commerce): import AffiliateModule into PaymentsModule for cancellation handling`
9. `225f8c2`: `fix(business): replace direct identity pg queries with internal identity api client`
10. `24d07ce`: `fix(identity): eliminate cross-db direct sql to commerce and business in user deletion and listing`

### 7.2. Kết quả Kiểm thử & Biên dịch Toàn diện (Pass 100%)
- **Toàn bộ Microservices Backend (`npm --prefix platform run build:all`):**
  - Shared, Gateway, Identity, Business, Commerce, Shipping, Community, Promotion, Analytics: **Biên dịch thành công 100% (0 lỗi TypeScript)**.
  - Tự động đồng bộ và sao chép toàn bộ Prisma Clients và Symlink shared library.
- **Frontend Web (`npm --prefix web run build`):**
  - Next.js Turbopack: **141/141 pages biên dịch thành công 100% (0 lỗi TypeScript)**.
- **Tổng hợp Test Suites Toàn Sàn:**
  - `libs/shared`: 9 suites, 62 tests PASS.
  - `identity-service`: 4 suites, 21 tests PASS.
  - `business-service`: 3 suites, 33 tests PASS.
  - `shipping-service`: 2 suites, 18 tests PASS.
  - `promotion-service`: 3 suites, 37 tests PASS.
  - `commerce-service`: 38 suites, 462 tests PASS.
  - **TỔNG CỘNG: 59 test suites, 633 tests PASSED (0 FAILURES).**

---

## 6. Mục 6: Rà soát Luồng Tiếp thị Liên kết (Affiliate Marketing & Seller Settlement)

### 6.1. Hiện tượng ghi nhận trên Dashboard CTV (`/r/minh_ct4d5f`)
- **Tình trạng:** Dashboard CTV hiển thị **Lượt click hợp lệ: 1**, nhưng **Chuyển đổi: 0**, **Hoa hồng chờ duyệt: 0 đ**.
- **Người dùng:** Đăng nhập tài khoản *Huỳnh Gia Huy* (Chủ Doanh Nghiệp), tạo link tiếp thị loại `BOOK` mang mã `/r/minh_ct4d5f`.

### 6.2. Phân tích nguyên nhân kỹ thuật (Root Causes)

#### A. Cơ chế Chống tự mua hàng để ăn hoa hồng (Self-Referral Anti-Fraud)
- **Vị trí code:** `platform/apps/commerce-service/src/modules/affiliate/services/affiliate-checkout.service.ts` (dòng 184 - 190):
  ```typescript
  // Anti-fraud: Self-referral prevention (Affiliate cannot earn on own orders)
  if (buyerUserId && attribution.profile.userId === buyerUserId) {
    this.logger.warn(
      `[Self-Referral Blocked] Affiliate ${attribution.profile.id} attempted purchase with own referral link`,
    );
    return null;
  }
  ```
- **Bản chất nghiệp vụ:** Đây là cơ chế bảo vệ tiêu chuẩn của các sàn TMĐT (Shopee, Amazon, TikTok Shop). Khi CTV click vào link của chính mình, lượt click vẫn tăng (`clickCount: 1`), cookie được ghi nhận. Nhưng khi tiến hành Checkout với chính tài khoản CTV đó (`buyerUserId === profile.userId`), hệ thống nhận diện đây là hành vi tự mua trục lợi hoa hồng và lập tức chặn ghi nhận attribution (`return null`).
- **Hệ quả:** 
  - Không tạo bản ghi `AffiliateCommission` (trạng thái `PENDING`).
  - Không cập nhật `isConverted: true`.
  - Không tăng chỉ số `conversionCount` của link.
- **Khuyến nghị kiểm thử:** Phải dùng tài khoản người mua (Buyer) khác trên thiết bị/trình duyệt khác để click link và checkout.

#### B. Giới hạn phạm vi sản phẩm (Target Scope Mismatch)
- **Vị trí code:** `affiliate-checkout.service.ts` (dòng 224 - 233).
- **Chi tiết:** Link `/r/minh_ct4d5f` có loại là `BOOK` (gắn với 1 `targetBookId` cụ thể). Nếu khách hàng bấm link sách này nhưng khi vào giỏ hàng lại thanh toán sản phẩm của Shop khác, hệ thống sẽ bỏ qua và không tạo hoa hồng.

---

### 6.3. LỖ HỔNG TÀI CHÍNH NGHIÊM TRỌNG: Đứt gãy dòng tiền Người bán (Seller Settlement Disconnect)

#### A. Vấn đề phát hiện
1. **Bút toán kế toán yêu cầu Shop trả tiền hoa hồng:**
   - Khi hoa hồng chuyển sang trạng thái khả dụng (`settleCommission`), State Machine ghi nhận bút toán kép:
     - `GHI NỢ (DEBIT): SELLER_COMMISSION_EXPENSE` (Gán vào `storeId` của Shop)
     - `GHI CÓ (CREDIT): AFFILIATE_PAYABLE_AVAILABLE` (Cộng tiền vào ví CTV)
   - Điều này thể hiện rõ ràng: **Người bán là bên chịu khoản chi phí hoa hồng tiếp thị này.**
2. **Tuy nhiên, hàm quyết toán cho Người bán BỎ QUÊN khoản tiền này:**
   - **Vị trí:** `platform/apps/commerce-service/src/modules/orders/settlement.service.ts` (dòng 133):
     ```typescript
     // Seller Net Payout = Merchandise Net - Commission + Subsidy (Excludes shipping fee)
     let sellerNet = merchandiseNet.sub(platformCommission).add(platformSubsidy);
     ```
   - **Lỗi chí mạng:** Hệ thống chỉ trừ Phí sàn (`platformCommission`) và cộng Trợ giá sàn (`platformSubsidy`), **hoàn toàn KHÔNG trừ `affiliateCommission` khỏi tiền quyết toán của Người bán!**
   - **Hậu quả tài chính:** Người bán vẫn nhận đủ 100% doanh thu sau phí sàn. Sàn phải tự bỏ tiền túi ra trả hoa hồng cho CTV mà không thể thu hồi từ người bán, gây lệch quỹ và âm dòng tiền của sàn.

#### B. Phương án khắc phục
- Trong `SettlementService.calculateSettlement`:
  - Truy vấn tổng hoa hồng Affiliate hợp lệ phát sinh từ kiện hàng (`SellerOrder`):
    ```typescript
    const affiliateCommission = await this.prisma.affiliateCommission.aggregate({
      where: {
        orderId: sellerOrder.orderId,
        storeId: sellerOrder.storeId,
        status: { in: ['HOLDING', 'SETTLED', 'AVAILABLE'] },
      },
      _sum: { commissionAmount: true },
    });
    const affAmount = new Decimal(affiliateCommission._sum.commissionAmount || 0);
    ```
  - Khấu trừ vào tiền quyết toán của Người bán:
    ```typescript
    let sellerNet = merchandiseNet
      .sub(platformCommission)
      .sub(affAmount)
      .add(platformSubsidy);
    ```

---

### 6.4. Đứt gãy Kênh Người Bán (Missing Seller Center Integration)
1. **Backend:** Đã có đầy đủ `SellerAffiliateController` với các API:
   - `GET /api/v1/seller/affiliate/settings`: Cấu hình tỷ lệ hoa hồng của Shop.
   - `PATCH /api/v1/seller/affiliate/books/:bookId`: Chỉnh hoa hồng riêng cho từng cuốn sách.
   - `GET /api/v1/seller/affiliate/orders`: Danh sách đơn hàng đến từ CTV.
   - `GET /api/v1/seller/affiliate/metrics`: Báo cáo hiệu quả tiếp thị của Shop.
2. **Frontend:** Thư mục `web/src/ui/components/seller/` **chưa có giao diện cho Tiếp thị Liên kết**. Người bán hiện không có giao diện để:
   - Xem đơn hàng nào của mình được bán qua CTV.
   - Cài đặt tỷ lệ hoa hồng riêng để kích thích CTV bán hàng.
   - Theo dõi số tiền tiếp thị bị khấu trừ trong từng kỳ đối soát.

---

### 6.5. Chặn tuyệt đối Người bán (Seller) và Quản trị viên (Admin) làm CTV Affiliate (Đã triển khai hoàn tất)
Nhằm ngăn ngừa xung đột lợi ích, tự trục lợi hoa hồng và các hành vi gian lận nội bộ, toàn bộ hệ thống đã được thiết lập **5 tầng phòng thủ nghiêm ngặt**:

1. **Tầng 1 - Nộp hồ sơ CTV (`AffiliateApplicationService`):**
   - Chặn `submitApplication` và `resubmitApplication` nếu tài khoản có vai trò `BUSINESS`, `PLATFORM_ADMIN` hoặc `DELIVERY_STAFF`.
   - Gọi `BusinessServiceClient.getSellerScope` để kiểm tra: nếu tài khoản sở hữu cửa hàng (`storeIds.length > 0`) hoặc doanh nghiệp (`businessIds.length > 0`), lập tức từ chối với thông báo: *"Tài khoản Chủ doanh nghiệp (Seller) hoặc Quản trị viên không được phép đăng ký làm Đối tác Tiếp thị liên kết."*
2. **Tầng 2 - Tạo liên kết tiếp thị (`AffiliateLinkService` & `AffiliateLinkController`):**
   - Hàm `createLink` chặn mọi yêu cầu tạo link từ tài khoản Seller / Admin.
3. **Tầng 3 - Ghi nhận đơn hàng & Hoa hồng (`AffiliateCheckoutService.resolveAttribution`):**
   - Khi khách đặt đơn qua link, hệ thống kiểm tra Seller Scope của chủ link tiếp thị. Nếu chủ link là Admin hoặc Seller, hệ thống **tự động loại bỏ attribution** (`return null`), không tính hoa hồng.
4. **Tầng 4 - Chặn hoa hồng sản phẩm của chính shop mình (`createPendingCommissions`):**
   - Nếu một item trong giỏ hàng thuộc cửa hàng của CTV (`scope.storeIds.includes(item.storeId)`), hệ thống lập tức bỏ qua (`continue`), không tạo hoa hồng cho item đó.
5. **Tầng 5 - Giao diện người dùng (`AccountLayout.tsx` & `useAffiliateGuard.ts`):**
   - Tự động ẩn nhóm menu **TIẾP THỊ LIÊN KẾT (AFFILIATE)** khỏi thanh điều hướng của Chủ Doanh Nghiệp / Quản trị viên (để tránh nhầm lẫn giữa tài khoản Người Bán và CTV).
   - Nếu người dùng Seller/Admin cố tình gõ URL `/account/affiliate/*`, Guard sẽ lập tức chặn lại, thông báo lỗi và redirect về `/profile`.


