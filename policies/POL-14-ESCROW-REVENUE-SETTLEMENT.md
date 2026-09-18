# POL-14 — Escrow Holding & 85/15 Revenue Settlement Policy

## 1. Purpose
Quy định cơ chế ký quỹ bảo đảm (Escrow Holding), thời hạn khóa dòng tiền bảo vệ người mua (Safety Holding Period), quy tắc phân chia doanh thu ròng (Net Revenue Split) theo tỷ lệ chuẩn 85% cho Thương nhân và 15% Phí hoa hồng sàn (Platform Fee), cùng quy trình tự động chuyển nguồn tiền thanh quyết toán sang Ví người bán.

## 2. Scope
- Áp dụng cho toàn bộ các khoản tiền thu từ đơn hàng thành công (`PAID`) của các sản phẩm `PHYSICAL`, `EBOOK` và `COMBO` trên HUKI EBOOK.
- Không áp dụng cho các dòng tiền nạp/rút trực tiếp ngoài giao dịch mua bán sách.

## 3. Actors
- **Escrow Pool Account**: Tài khoản ký quỹ trung gian bất biến của Sàn Huki.
- **Settlement Automated Engine**: Dịch vụ tính toán hoa hồng, khấu trừ thuế và phân bổ doanh thu.
- **Merchant**: Đối tác thụ hưởng 85% doanh thu ròng sau khi hoàn tất nghĩa vụ bán hàng.
- **Platform Finance Department**: Bộ phận kế toán đối soát dòng tiền sàn Huki.

## 4. Definitions
- **Escrow Holding**: Việc tạm giữ toàn bộ số tiền thanh toán của khách hàng trong một tài khoản trung gian an toàn, không giải ngân cho người bán cho đến khi người mua nhận đủ hàng và hết thời hạn khiếu nại.
- **Settlement Trigger**: Sự kiện kích hoạt giải phóng tiền từ quỹ ký quỹ Escrow sang Ví khả dụng của Merchant.
- **Net Revenue**: Doanh thu thực nhận sau khi đã trừ đi các khoản giảm giá do chính Shop tài trợ (`Shop Discount`).

## 5. Preconditions
- Sub-Order đã được thanh toán thành công `PAID` (`POL-08`).
- Giao dịch không bị vướng tranh chấp `DISPUTE_OPENED` (`POL-12`) hoặc yêu cầu trả hàng `RMA_REQUESTED` (`POL-11`).

## 6. Business Rules

### ESC-001: Escrow Ingestion & 7-Day Safety Hold
- **Rule Status**: `CANONICAL` (Nguyên lý Ký quỹ) / `PROPOSED` (Thời hạn 7 ngày Escrow Hold)
- **Evidence Status**: `PASS`
- Ngay khi nhận được Webhook thanh toán thành công từ cổng VietQR (`POL-08`), 100% số tiền của Sub-Order được chuyển vào trạng thái `ESCROW_HOLDING`.
- Thời gian giữ tiền ký quỹ:
  - **Đối với Sách điện tử (`EBOOK`)**: Do kích hoạt quyền đọc ngay tức thì và không có chính sách đổi trả thông thường, tiền Escrow được giải ngân sang Ví người bán trong vòng tối đa **24 giờ** kể từ khi thanh toán thành công.
  - **Đối với Sách giấy (`PHYSICAL`)**: Tiền được giữ an toàn trong suốt quá trình vận chuyển cộng thêm **7 ngày (168 giờ)** kể từ thời điểm giao hàng thành công `DELIVERED` (Tương ứng với thời hạn RMA theo `POL-11`).
  - Nếu khách hàng chủ động bấm "Đã nhận hàng và hài lòng" trên ứng dụng, hệ thống tự động kết thúc sớm thời hạn giữ tiền và giải ngân ngay lập tức.

### SPLIT-001: 85/15 Revenue Split Formula
- **Rule Status**: `CANONICAL` (Cơ chế tính toán) / `PROPOSED` (Tỷ lệ 85/15 và Cơ sở tính theo `DEC-002`)
- **Evidence Status**: `PASS`
- Doanh thu thanh quyết toán của từng Sub-Order được phân bổ theo công thức chuẩn:
  $$\text{Platform Commission (15\%)} = \text{Revenue Basis} \times 15\%$$
  $$\text{Seller Net Payout (85\%)} = \text{Sub-Order Amount} - \text{Platform Commission} + \text{Platform Subsidies}$$
- (Cơ sở tính toán `Revenue Basis` đang chờ phê duyệt giữa Tính trên Subtotal trước giảm giá vs Tính trên Net Paid sau voucher shop theo `DEC-002`).

### FEE-001: Platform Fee Pool & Voucher Subsidy Balancing
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Khi Sub-Order có áp dụng Voucher do Sàn tài trợ (`Platform Voucher` theo `POL-10`), số tiền giảm giá này KHÔNG ĐƯỢC trừ vào doanh thu của Merchant. Sàn Huki tự động trích xuất từ Quỹ Marketing Sàn bù đắp đủ 100% phần giảm giá đó vào lệnh chuyển tiền sang Ví người bán (`POL-15`).

## 7. State Machine
```
[SUB_ORDER_PAID]
        |
        v
[ESCROW_HOLDING] (Funds Locked in Escrow Pool)
        |
        +---> [EBOOK_ORDER] ---------> (24h Auto-Release) -----------------+
        |                                                                 |
        +---> [PHYSICAL_ORDER]                                            |
                    |                                                     |
             (Delivered + 7 Days) OR (User Confirmed Early)               |
                    |                                                     |
                    v                                                     v
          [SETTLEMENT_TRIGGERED] <----------------------------------------+
                    |
          (Calculate 85/15 Split - SPLIT-001)
          (Deduct 15% Platform Fee - FEE-001)
                    |
                    v
          [TRANSFERRED_TO_SELLER_WALLET] (POL-15: Available Balance Added)
```

## 8. Validation Rules
- Tổng số tiền phân bổ cho Merchant và Sàn phải khớp chính xác 100% với số tiền đã thu từ khách hàng cộng phần bù tài trợ:
  $$\text{Escrow Total} + \text{Platform Subsidy} = \text{Seller Payout} + \text{Platform Fee}$$
- Sai lệch tính toán (Rounding Tolerance) tối đa cho phép là $1$ VNĐ do làm tròn số học.

## 9. Financial Impact
- **Impact Level**: `DIRECT_CORE`
- Trái tim tài chính của toàn bộ nền tảng, định hình doanh thu của công ty Huki và thu nhập của hàng ngàn đối tác thương nhân.

## 10. Edge Cases
- **EC-001**: Khách hàng mở khiếu nại Dispute ở ngày thứ 6 sau khi nhận hàng. Bộ đếm thời gian 7 ngày Escrow lập tức bị đóng băng (`FROZEN`) và dừng toàn bộ tiến trình chuyển tiền cho đến khi có phán quyết trọng tài (`POL-12`).
- **EC-002**: Lỗi kết nối Database nội bộ tại thời điểm chạy Cronjob Settlement. Hệ thống ghi nhận trạng thái `SETTLEMENT_FAILED`, lưu mã lỗi và tự động thử lại sau 15 phút mà không gây nhân đôi số dư.

## 11. Security & Fraud
- Bắt buộc kiểm tra tính toàn vẹn (Double-entry Ledger Check) trước khi phát hành sự kiện cộng tiền sang Ví người bán (`POL-15`).

## 12. SLA / Timing
- Thời gian chạy tự động giải ngân Settlement: Mỗi 1 giờ (Cronjob hourly).
- Thời gian cộng tiền vào ví người bán: $\le 5$ giây kể từ khi kết thúc Escrow Hold.

## 13. Notifications
- Gửi thông báo cho Merchant khi có khoản tiền Sub-Order vừa được hoàn tất thanh quyết toán và cộng vào ví khả dụng.

## 14. Audit & Compliance
- Định kỳ đối soát hàng ngày giữa tổng số dư Escrow trên hệ thống và số dư thực tế tại tài khoản ngân hàng trung gian (Bank Reconciliation).

## 15. Dependencies
- **Upstream**: `POL-07` (Sub-Order Net Amount), `POL-08` (Payment Ingestion), `POL-09` (Delivery Confirmation).
- **Downstream**: `POL-15` (Seller Wallet Balance), `POL-17` (Tax & Commission Invoicing).

## 16. Canonical Source
- **Legacy Policy**: POL-17 (Escrow Holding), POL-18 (85/15 Revenue Split).
- **Business Flows**: `res-flow-15.md` (Escrow Holding & Settlement Pipeline).
- **Engineering Phase**: `PHASE-08-FINANCE.md`.
- **Source Modules**: `platform/src/modules/finance/escrow/`, `platform/src/modules/finance/settlement/`.

## 17. Related Flows
- `res-flow-15.md`: Luồng ký quỹ Escrow, bộ đếm thời gian an toàn và giải ngân tự động.

## 18. Related Engineering Phases
- `PHASE-08-FINANCE.md`: Triển khai Escrow Engine, Settlement Calculator và Accounting Double-Entry Ledger.

## 19. Open Decisions
- **DEC-002**: Cơ sở tính toán phí sàn 15% (Option A: Tính trên Subtotal vs Option B: Tính trên Net Paid Amount) (`Status: DECISION_REQUIRED`).
- **DEC-004**: Tỷ lệ đồng tài trợ Voucher sàn (`Status: DECISION_REQUIRED`).

## 20. Change History
- **Version**: 1.0
- **Status**: CANONICAL DOCUMENT CREATED
- **Source**: CANONICAL POLICY ID MAP v1.1
