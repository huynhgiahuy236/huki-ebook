# POL-07 — Master & Sub-Order Splitting Policy

## 1. Purpose
Quy định cơ chế phân tách đơn hàng tổng (Master Order) thành các đơn hàng con (Sub-Orders) theo từng gian hàng và định dạng sản phẩm, thiết lập vòng đời xử lý đơn hàng độc lập, và bảo đảm tính cô lập lỗi/hủy đơn từng phần (Partial Cancellation Isolation).

## 2. Scope
- Áp dụng cho toàn bộ các giao dịch đặt hàng phát sinh từ Checkout trên HUKI EBOOK.
- Áp dụng cho vòng đời thực hiện đơn hàng (Fulfillment Lifecycle) của Merchant và hệ thống điều phối sàn.

## 3. Actors
- **Customer**: Người tạo đơn và theo dõi tiến trình đơn hàng.
- **Merchant (Store Owner/Staff)**: Tiếp nhận, xác nhận và đóng gói các Sub-Order thuộc quyền sở hữu của mình.
- **Order Coordinator / System Engine**: Tự động chia tách đơn, quản lý trạng thái và kích hoạt các cổng thanh toán/vận chuyển.

## 4. Definitions
- **Master Order**: Thực thể đơn hàng cấp cao nhất đại diện cho một phiên thanh toán của khách hàng, chứa mã thanh toán tổng hợp và tổng số tiền phải trả.
- **Sub-Order**: Đơn hàng thành phần thuộc về DUY NHẤT một Gian hàng (`store_id`), có mã vận đơn, chu trình đóng gói, quy trình vận chuyển và quyết toán tài chính độc lập.
- **Order Format Splitting**: Việc phân tách đơn hàng của cùng 1 gian hàng thành Sub-Order Ebook và Sub-Order Sách giấy nếu có sự khác biệt về quy trình giao nhận.

## 5. Preconditions
- Khách hàng đã chọn các mặt hàng hợp lệ từ Giỏ hàng (`POL-06`).
- Tồn kho của các mặt hàng đã được khóa giữ thành công (`INV-002` trong `POL-05`).

## 6. Business Rules

### ORD-001: Mandatory Store-Based Sub-Order Splitting
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Khi khách hàng nhấn xác nhận đặt hàng, hệ thống bắt buộc phân rã Master Order thành $M$ Sub-Orders tương ứng với $M$ gian hàng khác nhau có sản phẩm trong đơn.
- Mỗi Sub-Order bắt buộc mang đầy đủ các thuộc tính độc lập:
  - `sub_order_id`: Mã đơn hàng con duy nhất.
  - `store_id`: Mã định danh gian hàng tiếp nhận.
  - `subtotal`: Tổng tiền hàng của riêng gian hàng đó.
  - `shipping_fee`: Phí vận chuyển áp dụng riêng cho gian hàng đó (`POL-09`).
  - `shop_voucher_discount`: Giảm giá từ voucher của shop (`POL-10`).
  - `platform_voucher_discount_allocated`: Phần bổ khấu trừ từ voucher sàn theo tỷ trọng giá trị đơn.
  - `net_sub_order_amount`: Tổng số tiền thanh toán thực tế của Sub-Order.

### ORD-002: Autonomous Sub-Order Lifecycle
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Mỗi Sub-Order hoạt động như một máy trạng thái (State Machine) hoàn toàn độc lập:
  - Tiến độ xác nhận, đóng gói hoặc giao hàng của Shop A không gây ảnh hưởng hay cản trở tiến độ của Shop B.
  - Sub-Order chứa sản phẩm số (`EBOOK`) tự động chuyển sang trạng thái `COMPLETED` ngay khi thanh toán thành công (`POL-08`) mà không cần chờ bước giao nhận vật lý.

### ORD-003: Partial Cancellation & Failure Isolation
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Khách hàng hoặc Merchant có quyền hủy một Sub-Order cụ thể trước khi hàng được giao cho Đơn vị vận chuyển (`SHIP-002`) mà không làm gián đoạn hay ảnh hưởng đến các Sub-Order còn lại trong cùng Master Order.
- Số tiền hoàn lại (`POL-11`) của Sub-Order bị hủy được tính toán độc lập và hoàn trả chính xác theo giá trị thực thu của Sub-Order đó.

## 7. State Machine
```
[MASTER_ORDER_CREATED]
        |
        +---> [SUB_ORDER_1 (Store A)] ---> [AWAITING_PAYMENT] ---> [PAID] ---> [PROCESSING] ---> [SHIPPED] ---> [DELIVERED] ---> [COMPLETED]
        |                                                                           |
        |                                                                           +---> [CANCELLED] (Partial Refund - POL-11)
        |
        +---> [SUB_ORDER_2 (Store B - Ebook)] ---> [AWAITING_PAYMENT] ---> [PAID] ---> [COMPLETED] (Instant DRM Grant - POL-04)
```

## 8. Validation Rules
- Tổng tiền Master Order bắt buộc bằng tổng các Sub-Orders:
  $$\text{Master Order Total} = \sum_{j=1}^{M} \text{Net Sub-Order Amount}_j$$
- Không được tạo Sub-Order rỗng (Không có sản phẩm nào).

## 9. Financial Impact
- **Impact Level**: `DIRECT`
- Sub-Order là đơn vị cơ sở để tính toán Escrow Settlement (`POL-14`), Thu phí sàn 15% (`FEE-001`), và ghi nhận số dư ví người bán (`POL-15`).

## 10. Edge Cases
- **EC-001**: Khách thanh toán cho Master Order gồm 3 Sub-Orders, nhưng 1 Sub-Order hết hàng do lỗi tồn kho trước đó. Hệ thống tiếp tục xử lý 2 Sub-Orders hợp lệ và tự động hoàn tiền phần chênh lệch của Sub-Order lỗi về tài khoản khách hàng.
- **EC-002**: Người mua yêu cầu đổi địa chỉ nhận hàng sau khi đặt. Việc thay đổi địa chỉ chỉ hợp lệ nếu tất cả các Sub-Orders vật lý chưa chuyển sang trạng thái `SHIPPED`.

## 11. Security & Fraud
- Kiểm soát phân quyền dữ liệu nghiêm ngặt: Merchant của Shop A tuyệt đối không thể xem thông tin, địa chỉ khách hàng hoặc doanh thu của Sub-Orders thuộc Shop B.

## 12. SLA / Timing
- Merchant có nghĩa vụ xác nhận Sub-Order vật lý trong vòng 24 giờ kể từ khi đơn thanh toán thành công (`PAID`).

## 13. Notifications
- Gửi Email xác nhận đơn hàng tổng cho Khách hàng kèm danh sách các Sub-Orders.
- Gửi thông báo đẩy (Push/Webhook) cho từng Merchant khi có Sub-Order mới cần xử lý.

## 14. Audit & Compliance
- Ghi nhật ký trạng thái (Order State Transition Logs) kèm theo timestamp và User ID thực hiện.

## 15. Dependencies
- **Upstream**: `POL-06` (Multi-Store Cart), `POL-05` (Inventory Lock).
- **Downstream**: `POL-08` (Payment Gateway), `POL-09` (Shipping), `POL-14` (Escrow Settlement).

## 16. Canonical Source
- **Legacy Policy**: POL-10 (Order Splitting & Lifecycle).
- **Business Flows**: `res-flow-8.md` (Order Splitting & Sub-Order Management).
- **Engineering Phase**: `PHASE-05-ORDER-FULFILLMENT.md`.
- **Source Modules**: `platform/src/modules/orders/`, `platform/src/modules/checkout/`.

## 17. Related Flows
- `res-flow-8.md`: Luồng phân tách đơn hàng và vòng đời thực hiện đơn.

## 18. Related Engineering Phases
- `PHASE-05-ORDER-FULFILLMENT.md`: Triển khai Order Splitting Engine, Sub-Order Management và Merchant Portal Order UI.

## 19. Open Decisions
- **None**: Kiến trúc Master/Sub-Order đã được triển khai và kiểm chứng trên hệ thống.

## 20. Change History
- **Version**: 1.0
- **Status**: CANONICAL DOCUMENT CREATED
- **Source**: CANONICAL POLICY ID MAP v1.1
