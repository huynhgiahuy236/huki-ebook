# POL-15 — Seller Wallet, Security PIN & Payout Policy

## 1. Purpose
Quy định về cấu trúc tài khoản Ví người bán (Seller Wallet), quản lý 3 trạng thái số dư (Pending, Available, Frozen), cơ chế xác thực bảo mật mã PIN 6 số và 2FA, quy định hạn mức và quy trình rút tiền (Payout / Withdrawal) về tài khoản ngân hàng chính chủ của thương nhân.

## 2. Scope
- Áp dụng cho toàn bộ các gian hàng đã được phê duyệt KYC (`POL-01`) có phát sinh doanh thu trên HUKI EBOOK.
- Áp dụng cho các lệnh yêu cầu rút tiền và quản lý số dư của Store Owner.

## 3. Actors
- **Store Owner (Merchant Primary)**: Người có quyền sở hữu ví và tạo lệnh rút tiền (`BIT 9` trong `POL-02`).
- **Wallet Ledger Service**: Hệ thống sổ cái kế toán số dư ví.
- **Payout Gateway / Bank Disbursement Service**: Cổng chi hộ ngân hàng thực hiện chuyển khoản.
- **Security & Fraud Engine**: Dịch vụ giám sát giao dịch bất thường và khóa ví khẩn cấp.

## 4. Definitions
- **Available Balance (Số dư khả dụng)**: Số tiền đã hoàn tất thanh quyết toán từ Escrow (`POL-14`), người bán có thể tự do tạo lệnh rút về ngân hàng.
- **Pending Balance (Số dư chờ giải ngân)**: Số tiền từ các đơn hàng thành công đang trong thời gian giữ an toàn của Escrow Pool.
- **Frozen Balance (Số dư bị phong tỏa)**: Số tiền bị đóng băng do đơn hàng có tranh chấp (`POL-12`) hoặc gian hàng bị áp dụng chế tài xử phạt (`POL-16`).
- **Wallet PIN**: Mã số bí mật gồm 6 chữ số do Store Owner thiết lập để xác thực mọi giao dịch tài chính.

## 5. Preconditions
- Gian hàng đã liên kết tài khoản ngân hàng chính chủ trùng tên với hồ sơ KYC (`POL-01`).
- Store Owner đã thiết lập mã PIN ví và kích hoạt xác thực 2FA hợp lệ.

## 6. Business Rules

### WAL-001: 3-Tier Wallet Balance Architecture
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Ví của mỗi gian hàng bắt buộc phải phân tách thành 3 số dư kế toán độc lập:
  $$\text{Total Wallet Value} = \text{Available Balance} + \text{Pending Balance} + \text{Frozen Balance}$$
- Chỉ có $\text{Available Balance}$ mới được phép đưa vào lệnh rút tiền.
- Tuyệt đối không cho phép số dư $\text{Available Balance} < 0$ (Không thấu chi).

### WAL-002: Double-Entry Immutable Ledger Mutation
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Mọi biến động số dư ví (Cộng tiền từ Settlement, Trừ tiền rút, Khấu trừ phí) bắt buộc phải tạo một bản ghi giao dịch bất biến (`wallet_transactions`) với đầy đủ:
  - Mã giao dịch duy nhất `transaction_id`.
  - Loại biến động `type` (`SETTLEMENT_CREDIT`, `PAYOUT_DEBIT`, `DISPUTE_HOLD`, `REFUND_DEDUCT`).
  - Số dư trước (`balance_before`) và Số dư sau (`balance_after`).
  - Mã tham chiếu nguồn (`reference_id` trỏ tới `sub_order_id` hoặc `payout_id`).

### PO-001: Payout Limits & Bank Transfer Settlement
- **Rule Status**: `CANONICAL` (Nguyên lý rút tiền) / `PROPOSED` (Định mức hạn mức)
- **Evidence Status**: `PASS`
- Merchant có quyền tạo lệnh rút tiền về tài khoản ngân hàng đã liên kết:
  - Số tiền rút tối thiểu: $100.000$ VNĐ / lệnh.
  - Số tiền rút tối đa: $50.000.000$ VNĐ / ngày (Nâng hạn mức cần xác thực bổ sung).
  - Tần suất rút tiền: Tối đa 2 lệnh / ngày.
- Lệnh rút tiền được chuyển trạng thái `PROCESSING` và giải ngân qua tài khoản ngân hàng trong vòng 24 giờ làm việc.

### SEC-002: 6-Digit PIN Security & 2FA Enforcement
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Mọi thao tác: Tạo lệnh rút tiền, Đổi tài khoản ngân hàng, hoặc Đổi mã PIN bắt buộc phải nhập đúng **Mã PIN 6 số** kèm mã OTP 2FA gửi qua SMS/Email.
- Nhập sai mã PIN quá **5 lần liên tiếp**:
  - Hệ thống tự động **khóa tạm thời ví** trong 24 giờ (`WALLET_LOCKED`).
  - Gửi email cảnh báo khẩn cấp cho Store Owner.
  - Mở khóa ví yêu cầu xác minh danh tính lại qua Admin Support.

## 7. State Machine
```
[AVAILABLE_BALANCE]
        |
 (Store Owner Requests Payout - PO-001)
        |
 (Verify 6-Digit PIN & 2FA - SEC-002)
        |
        v
[PAYOUT_REQUESTED] (Available Balance Decreased, In-Transit Increased)
        |
 (Disbursement Gateway Processes)
        |
        +---> [PAYOUT_SUCCESS] (Funds Credited to Bank Account)
        |
        +---> [PAYOUT_FAILED] (Bank Rejected) ---> [FUNDS_RETURNED_TO_AVAILABLE]
```

## 8. Validation Rules
- Số tiền rút phải là bội số của $1.000$ VNĐ.
- Số tiền yêu cầu rút không được vượt quá số dư khả dụng hiện tại $\text{Amount} \le \text{Available Balance}$.

## 9. Financial Impact
- **Impact Level**: `DIRECT_CORE`
- Điểm xuất dòng tiền (Cash-out Gateway) từ hệ sinh thái tài chính của Huki ra tài khoản ngân hàng thương mại bên ngoài.

## 10. Edge Cases
- **EC-001**: Lệnh chuyển khoản ngân hàng bị thất bại do tài khoản thụ hưởng của Merchant bị khóa. Hệ thống nhận webhook báo lỗi từ ngân hàng và tự động hoàn lại 100% số tiền về $\text{Available Balance}$ của ví trong vòng 15 phút.
- **EC-002**: Merchant vừa nộp yêu cầu đổi số tài khoản ngân hàng (`POL-01`). Tính năng rút tiền bị phong tỏa 24 giờ theo quy tắc an toàn `KYC-002`.

## 11. Security & Fraud
- Mã hóa một chiều (Bcrypt / Argon2 Hashing) mã PIN 6 số trong cơ sở dữ liệu; tuyệt đối không lưu PIN dưới dạng plain-text.
- Cảnh báo và tự động chặn các lệnh rút tiền có dấu hiệu bất thường (Rút toàn bộ số dư ngay sau khi vừa đổi mật khẩu hoặc đăng nhập từ IP nước ngoài).

## 12. SLA / Timing
- Thời gian xử lý lệnh rút tiền tự động: $\le 2$ giờ (cho các lệnh $\le 10$ triệu VNĐ) hoặc $\le 24$ giờ làm việc (cho các lệnh lớn cần duyệt thủ công).

## 13. Notifications
- Gửi thông báo tức thì khi có biến động số dư ví (Cộng tiền / Trừ tiền).
- Gửi mã OTP xác thực giao dịch rút tiền.

## 14. Audit & Compliance
- Tuân thủ Luật Phòng, chống rửa tiền và các quy định của Ngân hàng Nhà nước về quản lý giao dịch thanh toán điện tử.

## 15. Dependencies
- **Upstream**: `POL-14` (Escrow Settlement Credit), `POL-01` (Merchant KYC Bank Account), `POL-02` (Staff RBAC Bit 9).
- **Downstream**: `POL-16` (Freezing on Fraud Investigation), `POL-17` (Financial Tax Reporting).

## 16. Canonical Source
- **Legacy Policy**: POL-19 (Seller Wallet & Payout Security).
- **Business Flows**: `res-flow-16.md` (Seller Wallet & Payout Management).
- **Engineering Phase**: `PHASE-08-FINANCE.md`.
- **Source Modules**: `platform/src/modules/finance/wallet/`, `platform/src/modules/finance/payout/`.

## 17. Related Flows
- `res-flow-16.md`: Luồng xem số dư ví, đổi mã PIN và tạo lệnh rút tiền ngân hàng.

## 18. Related Engineering Phases
- `PHASE-08-FINANCE.md`: Triển khai Wallet Ledger Service, PIN Security Component và Payout Bank Integration.

## 19. Open Decisions
- **DEC-002 / GAP-005**: Mức phí rút tiền (Miễn phí rút vs Thu phí cố định theo lượt chuyển khoản ngân hàng) (`Status: DECISION_REQUIRED`).

## 20. Change History
- **Version**: 1.0
- **Status**: CANONICAL DOCUMENT CREATED
- **Source**: CANONICAL POLICY ID MAP v1.1
