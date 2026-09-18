# POL-09 — Multi-Vendor Shipping & Logistics Policy

## 1. Purpose
Quy định cơ chế tính cước vận chuyển đa gian hàng (Multi-Vendor Shipping Fee), tích hợp mã vận đơn với các đơn vị vận chuyển (Carrier AWB Integration), thiết lập hạn mức thời gian giao hàng của người bán (Merchant Dispatch SLA) và quy trình xử lý bồi thường khi hàng hóa bị hư hỏng hoặc thất lạc trong quá trình vận chuyển.

## 2. Scope
- Áp dụng cho toàn bộ các đơn hàng vật lý (`PHYSICAL`) và phần sách giấy trong gói `COMBO` cần vận chuyển từ kho của Merchant tới địa chỉ của Customer.
- Không áp dụng cho sản phẩm `EBOOK` (Luôn có phí vận chuyển bằng 0đ).

## 3. Actors
- **Customer**: Người nhận hàng chịu phí vận chuyển hoặc được hưởng miễn phí vận chuyển.
- **Merchant**: Người bán có nghĩa vụ đóng gói và bàn giao hàng cho bưu tá đúng hạn.
- **Third-Party Logistics (3PL Carriers)**: Các đối tác vận chuyển tích hợp (GHN, GHTK, Viettel Post, v.v.).
- **Logistics Dispatch Engine**: Dịch vụ điều phối bưu kiện và đồng bộ trạng thái AWB.

## 4. Definitions
- **AWB (Air Waybill / Tracking Number)**: Mã vận đơn duy nhất do đơn vị vận chuyển cấp để theo dõi lộ trình bưu kiện.
- **Shipping Zone**: Phân vùng địa lý giao nhận (Nội tỉnh/Nội vùng, Liên vùng gần, Liên vùng xa).
- **Merchant Dispatch Deadline**: Hạn chót người bán phải bấm "Đã bàn giao cho ĐVVC" tính từ khi đơn hàng thanh toán thành công.

## 5. Preconditions
- Sub-Order vật lý đã ở trạng thái thanh toán thành công `PAID` (`POL-08`) hoặc xác nhận COD hợp lệ.
- Địa chỉ nhận hàng của khách đã được chuẩn hóa thông tin Tỉnh/Thành, Quận/Huyện, Phường/Xã.

## 6. Business Rules

### SHIP-001: 3-Tier Shipping Zone Calculation & Ebook Zero-Fee Invariant
- **Rule Status**: `CANONICAL` (Cơ chế Zone & Ebook 0đ) / `PROPOSED` (Định mức cước phẳng 15k/25k/35k theo `DEC-008`)
- **Evidence Status**: `PASS`
- Đối với sản phẩm sách điện tử (`EBOOK`), phí vận chuyển luôn luôn bằng $0$ VNĐ ($\text{Shipping Fee} = 0$).
- Đối với sản phẩm vật lý, cước vận chuyển được tính độc lập cho từng Sub-Order của từng gian hàng:
  - Nội tỉnh / Cùng khu vực: Đề xuất $15.000$ VNĐ.
  - Khác tỉnh / Cùng miền: Đề xuất $25.000$ VNĐ.
  - Liên miền (Bắc - Nam): Đề xuất $35.000$ VNĐ.
  - (Cơ chế tính cước đang chờ phê duyệt giữa Cước phẳng cố định vs Gọi API thời gian thực theo `DEC-008`).
- Trọng lượng vượt mức (> 1.000g): Phụ thu đề xuất $5.000$ VNĐ cho mỗi 500g tiếp theo.

### SHIP-002: Carrier AWB Generation & 48h Merchant Dispatch SLA
- **Rule Status**: `CANONICAL` (Cơ chế tạo AWB) / `PROPOSED` (Định mức 48h SLA theo `DEC-006`)
- **Evidence Status**: `PASS`
- Khi Merchant nhấn "Xác nhận đóng gói", hệ thống tự động gọi API của Đơn vị vận chuyển để sinh mã vận đơn `AWB` và tạo phiếu in bưu kiện (Shipping Label).
- Merchant có nghĩa vụ hoàn tất bàn giao kiện hàng cho bưu tá trong thời hạn đề xuất **48 giờ** kể từ khi đơn hàng ở trạng thái `PAID`.
- Nếu quá 48 giờ Merchant không bàn giao, hệ thống gửi cảnh báo và có thể tự động hủy đơn hoàn tiền cho khách (`DEC-006`).

### SHIP-003: Carrier Delivery SLA & Compensation for Lost Goods
- **Rule Status**: `PROPOSED`
- **Evidence Status**: `NOT_VERIFIED`
- Thời gian giao hàng tiêu chuẩn của ĐVVC: 2 - 5 ngày làm việc tùy thuộc vào khoảng cách địa lý (`GAP-001`).
- Trường hợp kiện hàng bị thất lạc hoặc hư hại trong quá trình bưu tá vận chuyển:
  - ĐVVC chịu trách nhiệm bồi thường theo hợp đồng dịch vụ logistics (`GAP-002`).
  - Sàn Huki tự động hoàn tiền 100% cho người mua từ quỹ bảo hiểm vận chuyển mà không chờ thời gian đối soát với bưu điện.

## 7. State Machine
```
[SUB_ORDER_PAID]
       |
 (Merchant Pack)
       |
       v
[AWAITING_CARRIER_PICKUP] (AWB Generated)
       |
 (Carrier Scanned)
       |
       v
[IN_TRANSIT] (Tracking Active)
       |
       +---> [DELIVERED_SUCCESSFULLY] ---> [POL-14: ESCROW_TIMER_STARTS]
       |
       +---> [DELIVERY_FAILED] (3 Attempts) ---> [RETURNING_TO_SENDER]
       |
       +---> [LOST_IN_TRANSIT] (Carrier Compensation Triggered)
```

## 8. Validation Rules
- Số điện thoại người nhận: 10 chữ số hợp lệ của các nhà mạng Việt Nam.
- Trọng lượng gói hàng không được vượt quá 30kg trên một bưu kiện.

## 9. Financial Impact
- **Impact Level**: `DIRECT`
- Phí vận chuyển được thu từ người mua và tạm giữ trong Escrow trước khi được thanh quyết toán cho Đơn vị vận chuyển hoặc bồi hoàn cho người bán.

## 10. Edge Cases
- **EC-001**: Khách hàng đặt mua từ 3 gian hàng khác nhau trong 1 đơn tổng. Hệ thống tính 3 khoản phí vận chuyển riêng biệt cho 3 Sub-Orders và hiển thị minh bạch cho khách hàng tại bước Checkout.
- **EC-002**: Bưu tá giao hàng thất bại 3 lần liên tiếp do không liên lạc được với khách hàng. Kiện hàng tự động chuyển sang trạng thái `RETURNING_TO_SENDER` (Chuyển hoàn) và hoàn trả về kho của Merchant.

## 11. Security & Fraud
- Mã hóa và ẩn một phần số điện thoại khách hàng trên phiếu in bưu kiện (Masked Shipping Label) để bảo vệ quyền riêng tư người dùng.

## 12. SLA / Timing
- Thời gian tạo mã vận đơn tự động qua API: $\le 2\text{s}$.
- Hạn bàn giao hàng của Merchant: `48h` (`DEC-006`).
- Thời gian giao hàng tiêu chuẩn: 2 - 5 ngày (`GAP-001`).

## 13. Notifications
- Gửi SMS/ZNS và thông báo ứng dụng khi kiện hàng bắt đầu xuất kho kèm đường dẫn tra cứu mã vận đơn.
- Thông báo khi đơn hàng được giao thành công.

## 14. Audit & Compliance
- Lưu trữ lịch sử hành trình bưu kiện (Tracking Milestones) tối thiểu 6 tháng phục vụ giải quyết khiếu nại.

## 15. Dependencies
- **Upstream**: `POL-07` (Sub-Order Created), `POL-08` (Payment Confirmed).
- **Downstream**: `POL-14` (Escrow Release Trigger on Delivery), `POL-11` (RMA Returns).

## 16. Canonical Source
- **Legacy Policy**: POL-12 (Multi-Vendor Shipping & Logistics).
- **Business Flows**: `res-flow-10.md` (Shipping & Logistics Workflow).
- **Engineering Phase**: `PHASE-05-ORDER-FULFILLMENT.md`.
- **Source Modules**: `platform/src/modules/shipping/`, `platform/src/modules/carriers/`.

## 17. Related Flows
- `res-flow-10.md`: Luồng tính phí giao hàng, sinh mã AWB và cập nhật lộ trình.

## 18. Related Engineering Phases
- `PHASE-05-ORDER-FULFILLMENT.md`: Triển khai Shipping Calculator, Carrier API Adapters và Webhook Tracking Listener.

## 19. Open Decisions
- **DEC-006**: Áp dụng chế tài tự hủy đơn khi Merchant quá hạn 48h bàn giao (`Status: DECISION_REQUIRED`).
- **DEC-008**: Phương thức tính phí vận chuyển (Cước phẳng 3 miền vs Cước API thời gian thực) (`Status: DECISION_REQUIRED`).
- **GAP-001 / GAP-002**: Cơ chế đền bù và cam kết thời gian giao hàng của ĐVVC (`Status: DECISION_REQUIRED`).

## 20. Change History
- **Version**: 1.0
- **Status**: CANONICAL DOCUMENT CREATED
- **Source**: CANONICAL POLICY ID MAP v1.1
