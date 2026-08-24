# Payment Service Error Codes

Payment, Refund errors.

## PAYMENT_* - Payment

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| PAYMENT_NOT_FOUND | 404 | Thanh toán không tìm thấy | Check payment ID |
| PAYMENT_FAILED | 400 | Thanh toán thất bại | Retry payment |
| PAYMENT_TIMEOUT | 400 | Hết thời gian thanh toán | Start new payment |
| PAYMENT_CANCELLED | 400 | Thanh toán đã bị hủy | Start new payment |
| PAYMENT_ALREADY_PROCESSED | 400 | Thanh toán đã được xử lý | - |
| PAYMENT_AMOUNT_MISMATCH | 400 | Số tiền không khớp | Check amount |
| PAYMENT_SIGNATURE_INVALID | 400 | Chữ ký thanh toán không hợp lệ | - |
| PAYMENT_WEBHOOK_FAILED | 500 | Không thể xử lý thanh toán | Retry |
| PAYMENT_PROVIDER_ERROR | 502 | Lỗi nhà cung cấp thanh toán | Retry later |

## REFUND_* - Refund

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| REFUND_NOT_FOUND | 404 | Yêu cầu hoàn tiền không tìm thấy | Check refund ID |
| REFUND_NOT_ALLOWED | 400 | Không cho phép hoàn tiền | Check eligibility |
| REFUND_AMOUNT_INVALID | 400 | Số tiền hoàn không hợp lệ | Enter valid amount |
| REFUND_EXCEEDS_PAID | 400 | Số tiền hoàn vượt quá số đã thanh toán | Reduce amount |
| REFUND_ALREADY_PROCESSED | 400 | Hoàn tiền đã được xử lý | - |
