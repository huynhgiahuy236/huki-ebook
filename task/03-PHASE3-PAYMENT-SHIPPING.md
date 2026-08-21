# PHASE 3: Payment & Shipping

**Thời gian ước tính:** 3-4 tuần

## Mục tiêu

- Thanh toán online qua PayOS và thanh toán COD.
- Theo dõi hoàn tiền toàn phần/một phần.
- Shipping Service và luồng hoàn tất đơn hàng.

## Sprint 9: Payment Integration — Hoàn thành 2026-08-21

| Task | Người | Priority | Mô tả | Trạng thái |
|---|---|---|---|---|
| T9.1 | KIEN | HIGH | Prisma schema và migration cho `payments`, `refunds` | ✅ |
| T9.2 | KIEN | HIGH | Tạo/reuse payment link PayOS | ✅ |
| T9.3 | KIEN | HIGH | Webhook PayOS đúng contract, kiểm tra HMAC-SHA256 | ✅ |
| T9.4 | KIEN | HIGH | Idempotency, đối chiếu số tiền và transaction | ✅ |
| T9.5 | KIEN | HIGH | Quản lý trạng thái payment/order/seller-order | ✅ |
| T9.6 | HUY | HIGH | COD cho đơn chỉ có sách vật lý; ghi nhận khi giao xong | ✅ |
| T9.7 | HUY | MEDIUM | Refund toàn phần/một phần và đối soát PayOS | ✅ |
| T9.8 | KIEN | MEDIUM | Timeout payment, nhả tồn kho, test và Swagger | ✅ |

### Luồng PayOS đã triển khai

1. Checkout tạo order `ONLINE_PAYMENT`, provider được chuẩn hóa thành `PAYOS`.
2. `POST /api/v1/payments/orders/:orderId/initiate` tạo hoặc trả lại link PayOS còn hiệu lực.
3. PayOS gửi `{ code, desc, success, data, signature }` tới `POST /api/v1/payments/webhooks/payos`.
4. Backend bắt buộc có credentials, xác thực signature trong body, kiểm tra order code và số tiền.
5. Transaction Prisma cập nhật payment/order/seller-order, tạo outbox event và cấp quyền sách số.
6. Webhook lặp được acknowledge nhưng không xử lý lại.
7. Payment link quá hạn được job nội bộ quét mỗi phút; order bị hủy và inventory reservation được nhả.

### Refund

- Buyer hoặc platform admin tạo refund request.
- PayOS không được giả định có API refund tự động trong code. Sau khi thao tác/đối soát trên PayOS, chỉ platform admin được gọi endpoint settle để ghi kết quả.
- Refund đủ số tiền chuyển order sang `REFUNDED` và thu hồi quyền sách số; refund một phần dùng `PARTIAL_REFUND`.

## Sprint 10: Shipping Service — Hoàn thành 2026-08-21

| Task | Người | Priority | Mô tả | Trạng thái |
|---|---|---|---|---|
| T10.1 | HUY | HIGH | Database schema: shipments, delivery_staff | ✅ |
| T10.2 | HUY | HIGH | Shipping fee calculation (GHTK mock) | ✅ |
| T10.3 | HUY | HIGH | Shipment creation on order | ✅ |
| T10.4 | HUY | HIGH | Shipment tracking | ✅ |
| T10.5 | HUY | HIGH | Delivery staff assignment | ✅ |
| T10.6 | KIEN | MEDIUM | GHTK integration (mock) | ✅ |
| T10.7 | HUY | MEDIUM | Delivery status updates | ✅ |

### Luồng Shipping đã triển khai

1. Commerce ghi `order.created` với địa chỉ và các seller order vật lý.
2. Shipping tạo shipment idempotent theo `sellerOrderId`, tính phí và sinh tracking GHTK mock.
3. Shipment đi theo `PENDING → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED`; nhánh lỗi hỗ trợ retry/return/cancel.
4. Callback GHTK xác thực HMAC-SHA256 và chống trùng bằng `eventId`.
5. Platform admin phân công delivery staff; buyer/business/admin chỉ xem đúng phạm vi dữ liệu.
6. Mọi thay đổi trạng thái ghi timeline và outbox; RabbitMQ publisher/consumer thuộc Sprint 11.

## Sprint 11: Order Completion & Events

| Task | Người | Priority | Mô tả |
|---|---|---|---|
| T11.1 | KIEN | HIGH | Events: ORDER_CREATED, ORDER_PAID, ORDER_CANCELLED |
| T11.2 | KIEN | HIGH | Events: PAYMENT_SUCCEEDED, PAYMENT_FAILED |
| T11.3 | HUY | HIGH | Event consumer: inventory management |
| T11.4 | HUY | HIGH | Order completion flow |
| T11.5 | KIEN | HIGH | Order confirmation notifications |
| T11.6 | HUY | MEDIUM | Order history |

## Deliverables Phase 3

- [x] PayOS integration
- [x] COD payment
- [x] Refund flow
- [x] Shipping fee calculation
- [x] Shipment tracking
- [ ] Event consumers cho toàn bộ order flow

## Dependencies

- Sprint 9 phụ thuộc Sprint 8 và đã hoàn thành.
- Sprint 10 có thể chạy độc lập trên Shipping Service.
- Sprint 11 cần Sprint 9 và Sprint 10 hoàn thành.
