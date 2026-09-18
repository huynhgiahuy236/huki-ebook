# POL-11 — Post-Order RMA, 7-Day Return & Cancellation Policy

## 1. Purpose
Quy định điều kiện, quy trình trả hàng, đổi hàng và hoàn tiền (Return Merchandise Authorization - RMA), thiết lập thời hạn đổi trả 7 ngày đối với sách giấy vật lý, quy định tính chất không hoàn tiền của sách điện tử, và cơ chế hoàn trả nguồn vốn từ quỹ ký quỹ Escrow về tài khoản người mua.

## 2. Scope
- Áp dụng cho toàn bộ các yêu cầu hủy đơn hàng (Order Cancellation) trước khi giao và yêu cầu đổi trả/hoàn tiền (Return & Refund) sau khi nhận hàng trên HUKI EBOOK.
- Áp dụng cho cả đơn hàng `PHYSICAL`, `EBOOK` và `COMBO`.

## 3. Actors
- **Customer**: Người tạo yêu cầu hủy đơn hoặc yêu cầu trả hàng.
- **Merchant**: Người bán tiếp nhận, thẩm tra video/hình ảnh và xác nhận nhận lại hàng.
- **Platform Support / Operations**: Nhân viên sàn hỗ trợ xử lý khiếu nại quá hạn.
- **RMA Engine**: Dịch vụ tự động điều phối dòng tiền hoàn trả và cập nhật tồn kho.

## 4. Definitions
- **RMA (Return Merchandise Authorization)**: Quy trình ủy quyền tiếp nhận lại hàng hóa bị lỗi hoặc không đúng mô tả.
- **7-Day Return Window**: Khoảng thời gian 7 ngày (168 giờ) kể từ khi đơn vị vận chuyển cập nhật trạng thái `DELIVERED` để người mua có quyền gửi yêu cầu trả hàng.
- **Unboxing Video Evidence**: Video quay liền mạch, không cắt ghép quá trình mở kiện hàng và kiểm tra sách từ khi còn nguyên tem niêm phong.

## 5. Preconditions
- Đơn hàng vật lý đã giao thành công và còn trong thời hạn 7 ngày hiệu lực.
- Đơn hàng bị hủy phải ở trạng thái trước khi bàn giao cho ĐVVC (`AWAITING_PAYMENT`, `PAID`, hoặc `PROCESSING`).

## 6. Business Rules

### RMA-001: 7-Day Physical Return Window & Mandatory Video Proof
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Khách hàng có quyền yêu cầu trả hàng - hoàn tiền cho sản phẩm sách giấy (`PHYSICAL`) trong vòng **7 ngày** kể từ thời điểm giao hàng thành công trong các trường hợp:
  1. Sách bị rách, gãy gáy, mất trang, in mờ, bong tróc do lỗi của nhà sản xuất/nhà xuất bản.
  2. Giao sai tựa sách, sai số lượng hoặc sai mô tả sản phẩm trên gian hàng.
  3. Bưu kiện bị ướt, móp méo gây hư hỏng sách trong quá trình vận chuyển.
- Yêu cầu đổi trả bắt buộc phải đính kèm **Video mở hộp (Unboxing Video)** rõ nét thể hiện rõ mã vận đơn và tình trạng lỗi. Các yêu cầu không có video mở hộp có thể bị Merchant từ chối hợp lệ.

### RMA-002: Digital Ebook Non-Refundable Exception Invariant
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Các sản phẩm sách điện tử (`EBOOK`) đã được kích hoạt quyền đọc (DRM Grant theo `POL-04`) là tài sản số hóa phân phối tức thì và **KHÔNG ĐƯỢC PHÉP HOÀN TIỀN** dưới mọi hình thức, ngoại trừ trường hợp:
  - Tệp số hóa bị lỗi kỹ thuật nghiêm trọng (Không thể tải hoặc không thể mở được trên reader) đã được kiểm chứng bởi Platform Support và Merchant không thể cung cấp file thay thế trong vòng 48 giờ.
- Khi một đơn hàng Ebook được chấp thuận hoàn tiền ngoại lệ, hệ thống lập tức thu hồi vĩnh viễn quyền đọc sách trên toàn bộ thiết bị của tài khoản.

### RMA-003: Restocking & Escrow Refund Mechanics
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Khi yêu cầu trả hàng được Merchant hoặc Admin chấp thuận:
  1. Tiền hoàn được trích xuất trực tiếp từ quỹ ký quỹ đang giữ (`Escrow Balance` trong `POL-14`) mà không cần chờ thu hồi tiền từ ví người bán.
  2. Tiền được chuyển trả lại phương thức thanh toán gốc của người mua (Tài khoản ngân hàng VietQR) trong vòng 24 - 48 giờ làm việc.
  3. Khi Merchant xác nhận đã nhận lại hàng vật lý tại kho ở trạng thái hợp lệ, hệ thống tự động tăng tồn kho thực tế `OnHand` (`POL-05`).

## 7. State Machine
```
[DELIVERED] (7-Day Timer Running)
     |
(Customer Submits RMA Request with Video)
     |
     v
[RMA_REQUESTED] ---------------------------------------------------+
     |                                                             |
(Merchant Reviews within 48h)                               (No Response after 48h)
     |                                                             |
     +---> [RMA_ACCEPTED] ---> [RETURNING_GOODS]                   v
     |                                |                     [AUTO_ACCEPTED]
     |                                v
     |                      [MERCHANT_RECEIVED_GOODS]
     |                                |
     |                                v
     |                      [REFUNDED_FROM_ESCROW] ---> [POL-05: RESTOCK]
     |
     +---> [RMA_REJECTED] ---> [POL-12: ESCALATE_TO_DISPUTE]
```

## 8. Validation Rules
- Lý do trả hàng phải nằm trong danh mục lý do hợp lệ do hệ thống quy định.
- Kích thước file video bằng chứng: tối đa 50MB hoặc đính kèm đường link video lưu trữ bảo mật.

## 9. Financial Impact
- **Impact Level**: `DIRECT`
- Hoàn tiền giảm trừ trực tiếp số dư ký quỹ Escrow (`POL-14`), điều chỉnh lại doanh thu của Merchant và hoàn hủy phí sàn tương ứng.

## 10. Edge Cases
- **EC-001**: Khách hàng mua combo Sách giấy + Ebook, yêu cầu trả sách giấy do rách bìa. Tiền hoàn được tính tương ứng với giá trị phần sách giấy vật lý; quyền đọc Ebook vẫn được giữ nguyên nếu khách hàng đồng ý thanh toán phần chênh lệch Ebook.
- **EC-002**: Merchant không phản hồi yêu cầu RMA của khách hàng sau 48 giờ kể từ khi tiếp nhận. Hệ thống tự động chuyển trạng thái sang `AUTO_ACCEPTED` và cho phép khách hàng gửi hàng hoàn về kho.

## 11. Security & Fraud
- Kiểm tra lịch sử tài khoản người mua để phát hiện hành vi lạm dụng chính sách hoàn tiền (Refund Fraud / Serial Returners). Khóa tính năng thanh toán online đối với các tài khoản có tỷ lệ hoàn hàng bất thường > 30%.

## 12. SLA / Timing
- Thời hạn gửi yêu cầu trả hàng: 7 ngày (168 giờ) kể từ khi nhận hàng.
- Thời hạn Merchant phản hồi yêu cầu RMA: 48 giờ.
- Thời gian xử lý hoàn tiền về tài khoản khách: 24 - 48 giờ làm việc.

## 13. Notifications
- Thông báo đẩy và Email cho Merchant ngay khi có yêu cầu trả hàng mới.
- Cập nhật tiến độ hoàn tiền từng bước cho khách hàng qua ứng dụng.

## 14. Audit & Compliance
- Tuân thủ Điều 30 Luật Bảo vệ quyền lợi người tiêu dùng Việt Nam về đổi trả hàng hóa do khuyết tật.

## 15. Dependencies
- **Upstream**: `POL-07` (Sub-Order Delivered), `POL-08` (Payment Recorded), `POL-09` (Shipping Delivered Status).
- **Downstream**: `POL-14` (Escrow Refund Release), `POL-12` (Dispute Escalation), `POL-05` (Inventory Restock).

## 16. Canonical Source
- **Legacy Policy**: POL-14 (Post-Order RMA & Refund).
- **Business Flows**: `res-flow-12.md` (RMA & Refund Processing).
- **Engineering Phase**: `PHASE-07-POST-ORDER.md`.
- **Source Modules**: `platform/src/modules/rma/`, `platform/src/modules/refunds/`.

## 17. Related Flows
- `res-flow-12.md`: Luồng yêu cầu trả hàng, gửi bằng chứng video và hoàn tiền.

## 18. Related Engineering Phases
- `PHASE-07-POST-ORDER.md`: Triển khai RMA Ticket Manager, Video Upload Service và Escrow Refund Hook.

## 19. Open Decisions
- **None**: Cơ chế đổi trả 7 ngày và điều kiện video mở hộp đã được chuẩn hóa.

## 20. Change History
- **Version**: 1.0
- **Status**: CANONICAL DOCUMENT CREATED
- **Source**: CANONICAL POLICY ID MAP v1.1
