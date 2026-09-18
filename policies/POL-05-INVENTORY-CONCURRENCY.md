# POL-05 — 3-Tier Inventory & Atomic Concurrency Policy

## 1. Purpose
Quy định về mô hình kế toán tồn kho 3 tầng (3-Tier Inventory Model), cơ chế khóa tồn kho đồng thời (Distributed Concurrency Lock), bảo toàn tính toàn vẹn dữ liệu kho hàng khi có lượng truy cập đột biến (Flash Sale/High Traffic) và quy tắc tự động hoàn trả tồn kho khi giao dịch hết hạn hoặc thất bại.

## 2. Scope
- Áp dụng cho toàn bộ các sản phẩm vật lý (`PHYSICAL`) và phần hiện vật trong gói `COMBO` được lưu trữ tại kho của Merchant trên HUKI EBOOK.
- Không áp dụng cho sản phẩm `EBOOK` thuần túy (Tồn kho vô hạn).

## 3. Actors
- **Inventory Engine**: Bộ máy quản lý trạng thái tồn kho và khóa phân tán.
- **Cart & Checkout Service**: Dịch vụ kiểm tra và yêu cầu giữ hàng (Hold Request).
- **Merchant Warehouse Staff**: Nhân viên kho cập nhật số lượng nhập kho thực tế.

## 4. Definitions
- **OnHand (Số lượng thực tế)**: Tổng số lượng sản phẩm vật lý hiện có thực tế tại kho hàng của Merchant.
- **Reserved (Số lượng tạm giữ)**: Số lượng sản phẩm đang được tạm giữ cho các đơn hàng đã tạo nhưng đang chờ thanh toán hoặc đang trong quá trình đóng gói trước khi xuất kho.
- **Available (Số lượng khả dụng)**: Số lượng sản phẩm thực tế còn lại cho phép người mua thêm vào giỏ và đặt hàng.
- **Atomic Lua Script**: Đoạn mã chạy nguyên tử trực tiếp trong bộ nhớ Redis để kiểm tra và trừ tồn kho chỉ trong 1 thao tác duy nhất, chống Race Condition.

## 5. Preconditions
- Sản phẩm vật lý đã được cấu hình tồn kho ban đầu hợp lệ trong Catalog (`POL-03`).

## 6. Business Rules

### INV-001: 3-Tier Inventory Accounting Invariant
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Tồn kho khả dụng bắt buộc phải tuân theo phương trình bất biến kế toán:
  $$\text{Available} = \text{OnHand} - \text{Reserved}$$
- Hệ thống từ chối mọi thao tác đặt hàng nếu số lượng yêu cầu $Q_{\text{req}} > \text{Available}$.
- Trạng thái $\text{Available} < 0$ là vi phạm nghiêm trọng (Overselling Invariant Violation).

### INV-002: Atomic Concurrency Lock via Redis Lua
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Khi khách hàng tiến hành Đặt hàng (Place Order), hệ thống thực thi script Redis Lua nguyên tử để kiểm tra và tăng `Reserved` tương ứng:
  ```lua
  local available = tonumber(redis.call('HGET', KEYS[1], 'on_hand')) - tonumber(redis.call('HGET', KEYS[1], 'reserved'))
  if available >= tonumber(ARGV[1]) then
      redis.call('HINCRBY', KEYS[1], 'reserved', ARGV[1])
      return 1
  else
      return 0
  end
  ```
- Thao tác này đảm bảo loại bỏ 100% rủi ro bán vượt tồn kho (Overselling) ngay cả khi hàng ngàn giao dịch xảy ra trong cùng một mili-giây.

### INV-003: Automatic Inventory Release on Expiration
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Khi một đơn hàng hết thời gian thanh toán (Payment Countdown TTL theo `POL-08`) mà chưa nhận được xác nhận thanh toán thành công, hệ thống tự động:
  1. Hủy đơn hàng (`ORD-003`).
  2. Giảm số lượng `Reserved` tương ứng.
  3. Hoàn trả lại số lượng khả dụng $\text{Available}$ cho sản phẩm trên Storefront.

## 7. State Machine
```
[AVAILABLE_IN_STOCK]
        |
   (Place Order)
        |
        v
[STOCK_RESERVED] ----------------------------+ (Payment TTL Expired / User Cancel)
        |                                    |
(Payment Success - POL-08)                   v
        |                          [STOCK_RELEASED_TO_AVAILABLE]
        v
[AWAITING_DISPATCH]
        |
(Merchant Dispatch / Handover)
        |
        v
[STOCK_DEDUCTED_FROM_ON_HAND]
(OnHand = OnHand - Reserved; Reserved = Reserved - Qty)
```

## 8. Validation Rules
- `OnHand`: Số nguyên không âm $\ge 0$.
- `Reserved`: Số nguyên không âm $\ge 0$.
- Số lượng cập nhật nhập kho từ Merchant (`OnHand Delta`) phải được ghi nhận vào nhật ký kho kèm mã phiếu nhập.

## 9. Financial Impact
- **Impact Level**: `NOT_DIRECT`
- Ngăn chặn việc phát sinh bồi thường đơn hàng và hoàn tiền do bán vượt tồn kho thực tế.

## 10. Edge Cases
- **EC-001**: Merchant điều chỉnh giảm `OnHand` trong lúc đang có `Reserved` dẫn đến $\text{OnHand} < \text{Reserved}$. Hệ thống tạm thời khóa đặt hàng mới ($\text{Available} = 0$) và gửi cảnh báo đỏ cho Merchant.
- **EC-002**: Sự cố mất kết nối mạng giữa Payment Gateway và Hệ thống khiến Webhook đến muộn sau khi tồn kho đã bị nhả (`Late Webhook`). Xử lý theo quy định Auto-Recovery của `POL-08`.

## 11. Security & Fraud
- Giới hạn tần suất đặt hàng (Rate Limiting) trên từng IP/User ID để ngăn chặn bot spam đặt hàng ảo nhằm giữ kho phá hoại gian hàng đối thủ (Inventory Denial of Service).

## 12. SLA / Timing
- Thời gian thực thi khóa tồn kho nguyên tử Redis: $\le 15\text{ms}$.
- Thời gian nhả tồn kho khi hết hạn thanh toán: $\le 1\text{s}$ kể từ khi timer hết hạn.

## 13. Notifications
- Thông báo cho Merchant khi tồn kho khả dụng $\le 5$ cuốn (Cảnh báo sắp hết hàng).
- Thông báo khi tồn kho về 0 (Tự động chuyển trạng thái sản phẩm sang `OUT_OF_STOCK`).

## 14. Audit & Compliance
- Ghi log bất biến toàn bộ các thao tác thay đổi `OnHand`, `Reserved` kèm theo mã `Order ID` hoặc `Adjustment Ticket ID`.

## 15. Dependencies
- **Upstream**: `POL-03` (Catalog Physical format), `POL-06` (Cart).
- **Downstream**: `POL-07` (Order Splitting), `POL-08` (Payment TTL & Webhooks), `POL-11` (RMA Restock).

## 16. Canonical Source
- **Legacy Policy**: POL-08 (3-Tier Inventory & Concurrency).
- **Business Flows**: `res-flow-6.md` (Inventory Locking & Checkout Flow).
- **Engineering Phase**: `PHASE-04-INVENTORY-PAYMENT.md`.
- **Source Modules**: `platform/src/modules/inventory/`, `platform/src/modules/redis/`.

## 17. Related Flows
- `res-flow-6.md`: Luồng khóa giữ tồn kho và trừ kho thực tế.

## 18. Related Engineering Phases
- `PHASE-04-INVENTORY-PAYMENT.md`: Triển khai Redis Lua Scripts, Inventory Service và Queue Worker.

## 19. Open Decisions
- **GAP-006**: Đa kho hàng (Multi-warehouse) và phân bổ kho gần nhất (`Status: DECISION_REQUIRED`).

## 20. Change History
- **Version**: 1.0
- **Status**: CANONICAL DOCUMENT CREATED
- **Source**: CANONICAL POLICY ID MAP v1.1
