# POL-08 — Payment Gateway, TTL & Auto-Recovery Policy

## 1. Purpose
Quy định cơ chế tích hợp cổng thanh toán trực tuyến (VietQR qua PayOS API), quy trình quản lý thời gian đếm ngược thanh toán (Payment Countdown TTL), xử lý Webhook bất đồng bộ có chữ ký số và chính sách tự động phục hồi đối với các giao dịch thanh toán đến muộn sau khi đơn hàng đã hết hạn (Late Webhook Auto-Recovery).

## 2. Scope
- Áp dụng cho toàn bộ các giao dịch thanh toán trực tuyến (Online Banking / VietQR Transfer) trên HUKI EBOOK.
- Không áp dụng cho hình thức thanh toán khi nhận hàng (Cash on Delivery - COD) đối với các đơn hàng vật lý.

## 3. Actors
- **Customer**: Người thực hiện quét mã QR và chuyển khoản.
- **Payment Gateway (PayOS / VietQR)**: Cổng trung gian thanh toán cung cấp link/QR và phát Webhook.
- **Payment Ingestion Worker**: Dịch vụ nền tiếp nhận Webhook, xác thực chữ ký số HMAC và cập nhật trạng thái đơn hàng.

## 4. Definitions
- **VietQR Dynamic QR**: Mã QR động chứa thông tin chính xác số tiền cần thanh toán và nội dung chuyển khoản mã hóa `ORDER_CODE`.
- **Payment Countdown TTL (Time-To-Live)**: Khoảng thời gian cho phép người mua hoàn tất chuyển khoản trước khi hệ thống tự động hủy đơn và nhả tồn kho.
- **Late Webhook**: Tình huống cổng thanh toán gửi tín hiệu tiền đã vào tài khoản sau khi đơn hàng trên sàn đã chuyển sang trạng thái `CANCELLED` do hết hạn TTL.

## 5. Preconditions
- Master Order và các Sub-Orders đã được khởi tạo thành công (`POL-07`).
- Tồn kho đã được tạm giữ an toàn trong Redis (`POL-05`).

## 6. Business Rules

### PAY-001: VietQR Payment Dynamic Generation & HMAC Webhook Verification
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Khi khách hàng chọn phương thức thanh toán VietQR, hệ thống gọi PayOS API để tạo link thanh toán và mã QR động duy nhất gắn liền với `order_code`.
- Khi tiền vào tài khoản trung gian, PayOS gửi Webhook tới endpoint của Huki. Hệ thống bắt buộc:
  1. Kiểm tra chữ ký số HMAC-SHA256 sử dụng `PAYOS_CHECKSUM_KEY`. Từ chối xử lý ngay lập tức nếu sai chữ ký.
  2. Kiểm tra tính lũy kế/chống trùng lặp (Idempotency Key): Nếu transaction ID đã được xử lý thành công trước đó, trả về HTTP 200 và không thực hiện trừ/cộng tiền lần 2.
  3. Chuyển trạng thái Master Order và toàn bộ Sub-Orders con sang `PAID`.

### PAY-002: Payment Countdown TTL & Auto-Cancellation
- **Rule Status**: `CANONICAL` (Nguyên lý TTL) / `PROPOSED` (Định mức 120s vs 900s)
- **Evidence Status**: `PASS`
- Đơn hàng ở trạng thái `AWAITING_PAYMENT` có bộ đếm thời gian giới hạn:
  - Môi trường Test/Dev: Cấu hình `120s` (2 phút).
  - Môi trường Production Đề xuất: `900s` (15 phút) (Đang chờ phê duyệt theo `DEC-001`).
- Khi đồng hồ TTL về 0 mà chưa nhận được Webhook thanh toán thành công, hệ thống tự động:
  - Chuyển trạng thái đơn hàng sang `CANCELLED_EXPIRED`.
  - Kích hoạt sự kiện giải phóng tồn kho `INV-003` (`POL-05`).

### PAY-003: Late Webhook Auto-Recovery & Refund Handling
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Trong trường hợp Webhook thanh toán thành công đến SAU KHI đơn hàng đã bị hủy do hết hạn TTL (`Late Webhook`):
  1. Hệ thống TUYỆT ĐỐI KHÔNG tự động chuyển trạng thái đơn hàng đã hủy thành `PAID` nếu sản phẩm đã bị người khác mua hết tồn kho.
  2. Ghi nhận giao dịch vào bảng `late_payment_transactions` với trạng thái `REFUND_PENDING`.
  3. Khởi tạo quy trình hoàn tiền tự động hoặc tạo ticket hỗ trợ ưu tiên để hoàn trả 100% số tiền đã nhận về tài khoản ngân hàng của khách hàng trong vòng 24 giờ.

## 7. State Machine
```
[AWAITING_PAYMENT] (TTL Timer Running)
        |
        +---> (Webhook Success within TTL) ----> [PAID] ---> [POL-14: ESCROW_HOLD]
        |
        +---> (TTL Expired: 120s/900s) --------> [CANCELLED_EXPIRED] ---> [POL-05: RESTOCK]
                                                        |
                                            (Late Webhook Arrives)
                                                        |
                                                        v
                                             [LATE_PAYMENT_DETECTED]
                                                        |
                                                        v
                                                [REFUND_PENDING]
```

## 8. Validation Rules
- Số tiền Webhook báo về phải khớp 100% với số tiền `total_amount` của Master Order. Nếu số tiền không khớp (Thừa/Thiếu), đánh dấu đơn hàng là `PAYMENT_MISMATCH` và giữ tiền trong tài khoản chờ xử lý thủ công.
- Mã `order_code` phải tồn tại trong cơ sở dữ liệu.

## 9. Financial Impact
- **Impact Level**: `DIRECT`
- Quyết định việc dòng tiền chính thức được ghi nhận vào tài khoản tổng của sàn Huki và kích hoạt ký quỹ Escrow (`POL-14`).

## 10. Edge Cases
- **EC-001**: Khách hàng quét mã QR nhưng sửa lại số tiền trên app ngân hàng khiến số tiền chuyển thiếu 1.000 VNĐ. Hệ thống không tự động kích hoạt `PAID`, gửi thông báo cho khách hàng và lưu nhật ký đối soát.
- **EC-002**: Webhook của PayOS gửi lại 5 lần do mạng chập chờn (Retry Policy). Nhờ cơ chế Idempotency Check, hệ thống chỉ cập nhật database đúng 1 lần duy nhất ở lần gọi đầu tiên.

## 11. Security & Fraud
- Tuyệt đối không lưu trữ thông tin thẻ hay thông tin đăng nhập ngân hàng của khách hàng trên server Huki.
- Bảo mật tuyệt đối Secret Key và Checksum Key của cổng thanh toán trong biến môi trường bảo mật (KMS / Vault).

## 12. SLA / Timing
- Thời gian xử lý Webhook thanh toán và kích hoạt đơn hàng: $\le 1.5\text{s}$.
- Thời gian đếm ngược TTL: `120s` (Môi trường Dev) / `900s` (Môi trường Prod đề xuất theo `DEC-001`).

## 13. Notifications
- Thông báo real-time qua WebSocket / Server-Sent Events (SSE) trên màn hình thanh toán của khách ngay khi Webhook thành công ("Thanh toán thành công! Đang chuyển hướng...").
- Gửi Email xác nhận biên nhận thanh toán.

## 14. Audit & Compliance
- Tuân thủ Tiêu chuẩn An ninh Dữ liệu Thẻ Thanh toán (PCI DSS Level 1 qua cổng trung gian) và Thông tư của Ngân hàng Nhà nước Việt Nam về thanh toán không dùng tiền mặt.

## 15. Dependencies
- **Upstream**: `POL-07` (Master Order Total).
- **Downstream**: `POL-05` (Inventory Release on Expire), `POL-14` (Escrow Holding on Success), `POL-04` (Instant DRM Unlock).

## 16. Canonical Source
- **Legacy Policy**: POL-11 (Payment Gateway, TTL & Auto-Recovery).
- **Business Flows**: `res-flow-9.md` (Payment Processing & Late Webhooks).
- **Engineering Phase**: `PHASE-04-INVENTORY-PAYMENT.md`.
- **Source Modules**: `platform/src/modules/payment/`, `platform/src/modules/payos/`.

## 17. Related Flows
- `res-flow-9.md`: Luồng thanh toán VietQR, đếm ngược TTL và xử lý Webhook.

## 18. Related Engineering Phases
- `PHASE-04-INVENTORY-PAYMENT.md`: Triển khai PayOS Client, Webhook Controller và TTL Expiration Worker.

## 19. Open Decisions
- **DEC-001**: Quyết định cấu hình thời gian Payment Countdown TTL chính thức (Option A: 120s vs Option B: 900s) (`Status: DECISION_REQUIRED`).

## 20. Change History
- **Version**: 1.0
- **Status**: CANONICAL DOCUMENT CREATED
- **Source**: CANONICAL POLICY ID MAP v1.1
