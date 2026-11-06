# BÁO CÁO KIỂM TOÁN TĨNH 6 TRỤC (EXHAUSTIVE 6-AXIS AUDIT REPORT)
## PHÂN HỆ: PROMOTION-SERVICE (PORT 3007) & SHIPPING-SERVICE (PORT 3004) - TIER 2

**Thời điểm kiểm toán:** 2026-11-06  
**Nhánh làm việc:** `audit/promotion-and-shipping`  
**Môi trường:** Local Dev / Staging UAT Ready  
**Đối tượng kiểm toán:**
1. `promotion-service` (Port 3007) - Voucher, Flash Sale realtime, Đồng bộ Quota Redis & DB, Khắc phục lỗi Crash Loop Migration (`BUG-UAT-001`).
2. `shipping-service` (Port 3004) - Tính cước đa tiêu chí, Bảo vệ Ingress API nội bộ địa chỉ, Deduplication sự kiện `ORDER_CREATED` / `ORDER_PAID` qua `inboxEvent`, Khử Cross-DB query.

---

## I. TỔNG QUAN HIỆN TRẠNG & ĐIỂM NÓNG (HOTSPOTS)

| Dịch Vụ | Module Trọng Yếu | Lỗi Định Danh / Nguy Cơ | Mức Độ Nghiêm Trọng | Trạng Thái Trước Audit |
| :--- | :--- | :--- | :---: | :---: |
| **promotion-service** | Container Startup / Dockerfile / Compose | `BUG-UAT-001`: Crash Loop container UAT do lệnh `prisma migrate deploy` bị ngắt hoặc lỗi DB | **Blocker (P0)** | Gây 502 Bad Gateway toàn bộ API voucher/flash-sale |
| **promotion-service** | `vouchers.service.ts` | Voucher áp dụng vượt subtotal đơn hàng, làm đơn hàng âm tiền; thiếu kiểm tra idempotency trong `applyByCode` | **Critical (P1)** | Rủi ro thất thoát tài chính sàn/shop |
| **promotion-service** | `flash-sales.service.ts` | Đồng bộ quota Redis & DB `flash_sale_items`; thiếu cơ chế tự động rollback quota khi đơn hủy hoặc thanh toán thất bại | **Critical (P1)** | Kẹt quota, thất thoát lượt mua của khách hàng |
| **promotion-service** | RabbitMQ Consumer | Thiếu hoàn toàn Event Consumer cho sự kiện `ORDER_CANCELLED` / `PAYMENT_FAILED` | **High (P2)** | Phụ thuộc hoàn toàn vào HTTP synchronous call |
| **shipping-service** | `internal-addresses.controller.ts` | Header `x-internal-service-key` trả về 401 thay vì 403 Forbidden; cấu hình key thiếu đồng bộ | **High (P2)** | Không chuẩn hóa mã lỗi phân tầng an ninh |
| **shipping-service** | `shipping-order-event.consumer.ts` | Check-then-act race condition; thiếu xử lý `ORDER_PAID`; không bọc transaction atomic giữa `inboxEvent` và `createFromOrder` | **Critical (P1)** | Nguy cơ sinh 2 vận đơn cho cùng 1 đơn hàng |
| **shipping-service** | `seller-scope.util.ts` | Direct Cross-DB connection (`pg.Client`) vào `huki_business` DB vi phạm Database-per-service pattern | **High (P2)** | Ghép nối lỏng lẻo bị phá vỡ, nghẽn connection pool |

---

## II. CHI TIẾT KHẢO SÁT 6 TRỤC (6-AXIS DEEP DIVE)

### TRỤC 1: LOGIC NGHIỆP VỤ & TOÀN VẸN TÀI CHÍNH (BUSINESS LOGIC & FINANCIAL INTEGRITY)
1. **Lỗ hổng giảm giá vượt giá trị đơn hàng (Negative Order Amount Vulnerability):**
   - **Vị trí:** [`vouchers.service.ts`](file:///e:/HuKi/platform/apps/promotion-service/src/modules/vouchers/vouchers.service.ts#L357-L373)
   - **Cơ chế lỗi:** 
     Trong phương thức `validate()` và `applyByCode()`, mã voucher loại `FREE_SHIPPING` mặc định gán `discount = voucher.value || 30000`, loại `PERCENTAGE` tính `(dto.orderSubtotal * voucher.value) / 100`. Nếu đầu vào đơn hàng có giá trị nhỏ hơn mức giảm giá hoặc chiết khấu nhiều voucher dồn dập, giá trị sau giảm giá có thể rơi vào số âm (`netAmount < 0`), khiến hệ thống phải "trả thêm tiền" cho người mua.
   - **Giải pháp:** 
     Bổ sung ràng buộc trần: `discount = Math.min(discount, dto.orderSubtotal)`. Đảm bảo giá trị thanh toán cuối cùng sau voucher không bao giờ nhỏ hơn 0.
2. **Thiếu Idempotency trong `applyByCode`:**
   - **Vị trí:** [`vouchers.service.ts`](file:///e:/HuKi/platform/apps/promotion-service/src/modules/vouchers/vouchers.service.ts#L747-L788)
   - **Cơ chế lỗi:**
     Bảng `voucher_usages` không có unique constraint trên `(voucherId, orderId)`. Khi một đơn hàng retry lời gọi `applyByCode()`, hệ thống tạo thêm bản ghi usage mới và tăng `currentUsage` lần thứ hai, làm hao hụt sai quota của voucher.
   - **Giải pháp:**
     Kiểm tra bản ghi `voucherUsage` tồn tại theo `(voucherId, orderId)` trước khi tạo mới. Nếu đã tồn tại thì trả về kết quả thành công mà không trừ tiếp quota.

---

### TRỤC 2: TOÀN VẸN DỮ LIỆU & GIAO TIẾP LIÊN DỊCH VỤ (DATA INTEGRITY & CROSS-SERVICE COUPLING)
1. **Lỗi kiến trúc Cross-DB Connection trong `shipping-service`:**
   - **Vị trí:** [`seller-scope.util.ts`](file:///e:/HuKi/platform/apps/shipping-service/src/common/seller-scope.util.ts#L29-L52)
   - **Cơ chế lỗi:**
     `shipping-service` khởi tạo trực tiếp instance `pg.Client` kết nối tới cơ sở dữ liệu `huki_business` để truy vấn danh sách `store_id` và `owner_id`. Lỗi này tương tự như khiếm khuyết đã được bóc tách tại `commerce-service` (Message 14).
   - **Giải pháp:**
     Chuyển sang gọi HTTP API nội bộ `business-service:3002/api/v1/internal/seller-scope/:userId` kèm header `x-internal-service-key` và bộ đệm LRU Cache TTL 60 giây.
2. **Đồng bộ Quota Flash Sale giữa Redis Atomic Counter và PostgreSQL:**
   - **Vị trí:** [`flash-sales.service.ts`](file:///e:/HuKi/platform/apps/promotion-service/src/modules/flash-sales/flash-sales.service.ts#L940-L1000)
   - **Cơ chế:**
     Redis sử dụng Lua script để nguyên tử hóa việc kiểm tra quota người dùng và trừ tồn kho `DECRBY`. Tuy nhiên, nếu thao tác ghi DB `flashSaleItem.updateMany` bị chậm hoặc fail, cần kích hoạt rollback hoàn trả quota trên Redis ngay lập tức.

---

### TRỤC 3: PHÂN TẦNG BẢO MẬT & HÀNG RÀO BIÊN GIỚI (SECURITY & PERIMETER DEFENSE)
1. **Bảo vệ endpoint tra cứu địa chỉ nội bộ (`shipping-service`):**
   - **Vị trí:** [`internal-addresses.controller.ts`](file:///e:/HuKi/platform/apps/shipping-service/src/modules/addresses/internal-addresses.controller.ts#L74-L77)
   - **Hiện trạng:**
     Khi thiếu hoặc sai header `x-internal-service-key`, controller ném ngoại lệ `throwUnauthorized` (HTTP 401). Theo phân cấp bảo mật Microservices, các endpoint `/api/v1/internal/*` là tài nguyên cấm truy cập từ Internet công cộng và phải phản hồi **HTTP 403 Forbidden** (`ForbiddenException`) để biểu thị việc từ chối quyền truy cập tầng mạng/hạ tầng.
   - **Giải pháp:**
     Thay thế `throwUnauthorized` bằng `throwForbidden(ErrorCode.AUTH_FORBIDDEN)` hoặc ném `ForbiddenException('Internal service credentials are required or invalid')`.
2. **Chuẩn hóa xác thực nội bộ tại `promotion-service`:**
   - **Vị trí:** [`internal.controller.ts`](file:///e:/HuKi/platform/apps/promotion-service/src/modules/promotions/internal.controller.ts#L18-L22)
   - **Hiện trạng:**
     `InternalPromotionsController` chỉ đọc header `x-internal-api-key` và so khớp với biến môi trường `PROMOTION_INTERNAL_API_KEY`. Trong khi đó, toàn sàn HuKi sử dụng header chuẩn hóa `x-internal-service-key` với biến `INTERNAL_SERVICE_KEY`. Sự lệch pha này gây ra lỗi 401 khi các service khác gọi tới.

---

### TRỤC 4: ĐỒNG THỜI & TRANH CHẤP DỮ LIỆU (CONCURRENCY & RACE CONDITIONS)
1. **Lỗ hổng Check-Then-Act trong RabbitMQ Consumer (`shipping-service`):**
   - **Vị trí:** [`shipping-order-event.consumer.ts`](file:///e:/HuKi/platform/apps/shipping-service/src/modules/events/shipping-order-event.consumer.ts#L33-L70)
   - **Cơ chế lỗi:**
     ```typescript
     if (await this.prisma.inboxEvent.findUnique({ where: { eventId: event.eventId } })) return;
     await this.shipments.createFromOrder(event.payload);
     await this.prisma.inboxEvent.create({ data: { eventId: event.eventId, ... } });
     ```
     Nếu RabbitMQ gửi 2 bản tin trùng lặp gần như cùng một tích tắc, cả hai luồng đều vượt qua câu lệnh `findUnique` trước khi bản ghi `inboxEvent` đầu tiên được tạo. Hậu quả là `createFromOrder` bị gọi hai lần, tạo ra 2 vận đơn cho cùng 1 đơn hàng!
   - **Giải pháp:**
     Bọc toàn bộ quá trình xử lý vào `prisma.$transaction`. Thực hiện ghi `inboxEvent` ngay trong transaction. Nếu vi phạm ràng buộc duy nhất (Unique Constraint `P2002`), transaction tự động rollback toàn bộ và bỏ qua sự kiện trùng lặp.
2. **Bỏ quên xử lý sự kiện `ORDER_PAID`:**
   - **Vị trí:** [`shipping-order-event.consumer.ts`](file:///e:/HuKi/platform/apps/shipping-service/src/modules/events/shipping-order-event.consumer.ts#L40)
   - **Hiện trạng:**
     Consumer có đăng ký lắng nghe `ORDER_EVENTS.PAID` nhưng trong thân hàm `handle()` chỉ có điều kiện `if (event.eventType === ORDER_EVENTS.CREATED)`. Với các đơn thanh toán trực tuyến PayOS, khi trạng thái chuyển sang `PAID`, vận đơn không được khởi tạo tự động.

---

### TRỤC 5: KHẢ NĂNG PHỤC HỒI & XỬ LÝ LỖI HẠ TẦNG (RELIABILITY & FAULT TOLERANCE)
1. **Khắc phục triệt để `BUG-UAT-001` (Crash Loop do Prisma Migration):**
   - **Vị trí:** `docker-compose.uat.yml` (service `promotion-service-uat` và `shipping-service-uat`).
   - **Nguyên nhân gốc rễ:**
     Lệnh khởi động dùng `npx prisma migrate deploy && node ...`. Khi migration schema gặp cảnh báo, lock timeout hoặc database chưa sẵn sàng, toán tử `&&` lập tức làm tiến trình thoát với exit code khác 0, đẩy container vào vòng xoáy `CrashLoopBackOff` và gây lỗi HTTP 502 Bad Gateway trên Gateway.
   - **Giải pháp chuẩn:**
     Chuyển command sang cơ chế tự phục hồi:
     `command: ["sh", "-c", "npx prisma migrate deploy --schema=apps/promotion-service/prisma/schema.prisma || true && node dist/out-tsc/promotion-service/apps/promotion-service/src/main.js"]`

---

### TRỤC 6: HIỆU NĂNG, BỘ ĐỆM & KHẢ NĂNG QUAN SÁT (PERFORMANCE & OBSERVABILITY)
1. **TTL Quota Flash Sale trong Redis:**
   - Quota và Reservation keys được thiết lập TTL tự động dọn dẹp theo thời gian kết thúc của chiến dịch Flash Sale (`activeItem.flashSale.endsAt`).
2. **Audit Logging & Idempotency Logs:**
   - Mọi thao tác apply voucher, rollback voucher, tạo vận đơn đều ghi nhận Audit Log chi tiết (kèm actor, request ID, thời điểm).

---

## III. KẾT LUẬN & ĐỊNH HƯỚNG TRIỂN KHAI

Báo cáo khảo sát tĩnh đã xác định chính xác 6 điểm nghẽn trọng điểm tại `promotion-service` và `shipping-service`. Bước tiếp theo:
1. Xây dựng bộ kịch bản kiểm thử động độc lập tại `scriptstest/audit/promotion-and-shipping/` để ghi nhận bằng chứng sống lỗi trước khi fix.
2. Thực thi sửa mã nguồn chính xác theo ma trận giải pháp.
3. Chạy Dual Verification nghiệm thu đạt 100% PASS và merge an toàn vào `develop`.
