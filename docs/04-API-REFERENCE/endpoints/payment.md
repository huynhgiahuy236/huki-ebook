# Payment API — PayOS và COD

Base URL: `/api/v1/payments`

Commerce Service dùng Prisma cho dữ liệu payment/refund. Online payment chỉ hỗ trợ PayOS; COD chỉ áp dụng cho đơn gồm sách vật lý.

## Trạng thái

Payment: `PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `EXPIRED`, `CANCELLED`, `REFUND_PENDING`, `PARTIAL_REFUND`, `REFUNDED`, `REFUND_FAILED`.

Refund: `PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `CANCELLED`.

## POST /orders/:orderId/initiate

Tạo payment link PayOS. Yêu cầu Bearer token của chủ order. Nếu payment attempt còn hiệu lực, API trả lại link cũ thay vì tạo giao dịch trùng.

```http
POST /api/v1/payments/orders/0e8e4f18-a131-4bd9-8629-e425585a30aa/initiate
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "returnUrl": "http://localhost:3000/payment/success",
  "cancelUrl": "http://localhost:3000/payment/cancelled"
}
```

```json
{
  "id": "payment-uuid",
  "orderId": "order-uuid",
  "amount": 180000,
  "method": "ONLINE_PAYMENT",
  "provider": "PAYOS",
  "status": "PROCESSING",
  "checkoutUrl": "https://pay.payos.vn/web/...",
  "qrCode": "...",
  "expiresAt": "2026-08-21T10:15:00.000Z"
}
```

## POST /webhooks/payos

Public endpoint dành riêng cho PayOS. Signature nằm trong body, không nằm trong header.

```json
{
  "code": "00",
  "desc": "success",
  "success": true,
  "data": {
    "orderCode": 1755760800123,
    "amount": 180000,
    "description": "HUKI ORDER",
    "reference": "FT202608210001",
    "transactionDateTime": "2026-08-21 10:05:00",
    "paymentLinkId": "payos-link-id"
  },
  "signature": "hmac-sha256"
}
```

Backend thực hiện theo thứ tự:

1. Bắt buộc `PAYOS_CHECKSUM_KEY` tồn tại.
2. Sắp xếp key trong `data`, tạo chuỗi `key=value` và xác thực HMAC-SHA256.
3. Tìm payment bằng `provider=PAYOS` và `payosOrderId`.
4. So sánh chính xác số tiền.
5. Cập nhật payment, order, seller-order, outbox event và BookAccess trong một transaction Prisma.
6. Webhook đã xử lý được trả `200` mà không chạy transaction lần hai.

PayOS có thể gửi webhook test khi xác nhận URL; payload hợp lệ nhưng không khớp payment được acknowledge.

## GET /orders/:orderId

Trả trạng thái order, toàn bộ payment attempts và refunds. Yêu cầu Bearer token của chủ order.

## POST /orders/:orderId/refunds

Tạo refund toàn phần hoặc một phần.

```json
{
  "amount": 50000,
  "reason": "Buyer cancelled before shipment"
}
```

Không truyền `amount` nghĩa là hoàn toàn bộ số tiền còn có thể hoàn. API không cho tổng refund pending/processing/succeeded vượt quá số tiền đã thanh toán.

## POST /refunds/:refundId/settle

Endpoint đối soát, chỉ `PLATFORM_ADMIN`. Dùng sau khi refund đã được thực hiện/kiểm tra trên PayOS.

```json
{
  "succeeded": true,
  "providerReference": "PAYOS-REFUND-REFERENCE"
}
```

Nếu thất bại:

```json
{
  "succeeded": false,
  "failureReason": "Bank rejected the refund"
}
```

Refund toàn phần chuyển order/payment sang `REFUNDED` và thu hồi BookAccess; refund một phần chuyển sang `PARTIAL_REFUND`.

## COD

- Checkout với `paymentMethod=COD` tự tạo payment `PENDING`, provider `COD`.
- COD bị từ chối nếu order có sách số.
- Khi mọi seller-order được giao xong, payment và order chuyển `SUCCEEDED`/`COMPLETED`, đồng thời ghi outbox event.

## Timeout

Commerce Service quét payment PayOS hết hạn mỗi phút. Payment chuyển `EXPIRED`; order và seller-order bị hủy; inventory reservation được nhả trong cùng transaction.

## Biến môi trường

```env
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
```

Không có fallback bỏ qua signature. Khi credentials trống, tạo link và nhận webhook đều bị từ chối an toàn.
