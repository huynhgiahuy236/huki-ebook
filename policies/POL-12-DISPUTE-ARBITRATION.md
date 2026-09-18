# POL-12 — Dispute Resolution & Platform Arbitration Policy

## 1. Purpose
Quy định cơ chế leo thang khiếu nại (Dispute Escalation), thẩm quyền phán quyết trọng tài của Sàn Huki (Platform Arbitration), quy trình thẩm định bằng chứng khách quan giữa Người mua và Người bán, và cơ chế thi hành quyết định tài chính ràng buộc trên nguồn tiền ký quỹ Escrow.

## 2. Scope
- Áp dụng cho các trường hợp Người mua và Người bán không đạt được thỏa thuận chung trong quá trình xử lý Trả hàng/Hoàn tiền (`POL-11`), hoặc các tranh chấp liên quan đến chất lượng sản phẩm, gian lận thanh toán, và sai lệch cước vận chuyển.
- Không áp dụng cho các tranh chấp pháp lý ngoài phạm vi nền tảng (Yêu cầu khởi kiện ra Tòa án/Trọng tài thương mại độc lập).

## 3. Actors
- **Buyer (Disputant)**: Khách hàng yêu cầu sàn can thiệp phán quyết.
- **Seller (Respondent)**: Gian hàng cung cấp bằng chứng đối chất.
- **Platform Arbitration Officer (Admin)**: Trọng tài viên Huki có quyền ra phán quyết cuối cùng và cưỡng chế dòng tiền.

## 4. Definitions
- **Dispute Escalation**: Hành động chuyển một yêu cầu RMA bị từ chối thành một hồ sơ tranh chấp chính thức do Sàn thụ lý.
- **Platform Binding Ruling**: Phán quyết cuối cùng có tính chất bắt buộc thi hành của Ban quản trị sàn Huki.
- **Counter-Evidence**: Bằng chứng đối chất từ phía người bán (Biên bản đóng gói, camera an ninh xuất kho, phiếu cân bưu điện).

## 5. Preconditions
- Yêu cầu RMA của khách hàng đã bị Merchant từ chối trong `POL-11`, hoặc quá hạn xử lý mà hai bên không đạt được tiếng nói chung.
- Hồ sơ tranh chấp được gửi lên sàn trong vòng 72 giờ kể từ thời điểm bị từ chối RMA.

## 6. Business Rules

### DSP-001: Formal Dispute Escalation & 72h Evidence Window
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Khi khách hàng nhấn "Yêu cầu Huki can thiệp", hệ thống:
  1. Đóng băng vĩnh viễn thời gian đếm ngược tự động giải ngân Escrow (`POL-14`) của Sub-Order đó.
  2. Mở cổng tiếp nhận tài liệu chứng cứ trong vòng **72 giờ** cho cả hai bên:
     - Người mua: Bắt buộc cung cấp video mở hộp, hình ảnh cận cảnh lỗi và biên lai nhận hàng.
     - Người bán: Bắt buộc cung cấp video trích xuất camera đóng hàng, ảnh chụp bưu kiện trước khi giao và phiếu cân trọng lượng của bưu tá.

### DSP-002: Objective Evidence Assessment & Platform Final Arbitration
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Platform Arbitration Officer căn cứ vào hệ thống bằng chứng đối chiếu độc lập:
  - Nếu video mở hộp của Người mua thể hiện rõ kiện hàng còn nguyên niêm phong và sản phẩm bên trong bị hư hỏng/thiếu $\rightarrow$ Phán quyết Người mua thắng khiếu nại.
  - Nếu Người bán chứng minh được kiện hàng lúc giao cho bưu tá hoàn toàn nguyên vẹn nhưng khi đến tay khách bị rách/vỡ $\rightarrow$ Phán quyết lỗi thuộc Đơn vị vận chuyển (`POL-09`), sàn kích hoạt bồi thường bảo hiểm cho cả hai bên.
  - Nếu Người mua không cung cấp được video mở hộp hợp lệ hoặc có dấu hiệu làm giả chứng cứ $\rightarrow$ Phán quyết Người bán thắng khiếu nại.
- Phán quyết của Sàn Huki là quyết định thi hành cuối cùng trên nền tảng.

### DSP-003: Binding Escrow Settlement Execution
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Ngay khi có phán quyết trọng tài từ Admin, hệ thống tự động thi hành:
  - **Trường hợp Hoàn tiền toàn phần (Full Refund)**: Giải phóng 100% tiền Escrow về tài khoản ngân hàng của Người mua.
  - **Trường hợp Hoàn tiền một phần (Partial Settlement)**: Chia tiền Escrow theo tỷ lệ phán quyết (Ví dụ: Hoàn 50% cho khách, chuyển 50% vào ví người bán).
  - **Trường hợp Bác khiếu nại (Claim Dismissed)**: Kích hoạt lại tiến trình giải ngân 85% cho Người bán theo `POL-14`.

## 7. State Machine
```
[RMA_REJECTED] (POL-11)
      |
 (Customer Escalates within 72h)
      |
      v
[DISPUTE_OPENED] (Escrow Timer Frozen)
      |
 (72h Evidence Submission Window)
      |
      v
[UNDER_PLATFORM_REVIEW]
      |
      +---> [RULING_BUYER_WINS] ---------> [FULL_REFUND_EXECUTED]
      |
      +---> [RULING_SELLER_WINS] --------> [ESCROW_RELEASED_TO_SELLER]
      |
      +---> [RULING_PARTIAL_SETTLEMENT] -> [SPLIT_FUNDS_EXECUTED]
      |
      +---> [RULING_CARRIER_AT_FAULT] ---> [INSURANCE_PAYOUT_BOTH]
```

## 8. Validation Rules
- Không mở tranh chấp đối với đơn hàng đã hoàn tất thanh quyết toán qua ví người bán quá 30 ngày.
- Bằng chứng video phải là file gốc, không qua chỉnh sửa hiệu ứng hoặc cắt ghép khung hình.

## 9. Financial Impact
- **Impact Level**: `DIRECT`
- Quyết định việc phân bổ nguồn tiền ký quỹ hàng tỷ đồng đang được phong tỏa trong Escrow Pool (`POL-14`).

## 10. Edge Cases
- **EC-001**: Merchant không nộp bất kỳ bằng chứng đối chất nào trong 72 giờ. Hệ thống tự động xử Người mua thắng khiếu nại do Merchant từ bỏ quyền đối chất (`Default Judgement`).
- **EC-002**: Người mua và Người bán tự thỏa thuận thành công trong thời gian sàn đang thụ lý. Khách hàng có quyền bấm "Rút khiếu nại" và hệ thống tiếp tục chu trình giải ngân bình thường.

## 11. Security & Fraud
- Hệ thống tự động ghi nhận điểm phạt vi phạm (Penalty Points) đối với Merchant có tỷ lệ thua tranh chấp > 5% tổng số đơn hàng trong tháng (`POL-16`).

## 12. SLA / Timing
- Thời hạn nộp chứng cứ: 72 giờ kể từ khi mở tranh chấp.
- Thời gian Admin ra phán quyết: Tối đa 48 giờ làm việc kể từ khi kết thúc thời hạn nộp chứng cứ.

## 13. Notifications
- Gửi Email và SMS cảnh báo khẩn cấp cho Merchant khi có tranh chấp mở mới.
- Thông báo phán quyết chi tiết kèm trích dẫn lý do và chứng cứ cho cả hai bên.

## 14. Audit & Compliance
- Lưu trữ toàn bộ hồ sơ tranh chấp, video chứng cứ và nhật ký thao tác của Trọng tài viên trong tối thiểu 3 năm phục vụ thanh tra.

## 15. Dependencies
- **Upstream**: `POL-11` (RMA Rejected), `POL-14` (Escrow Holding Lock).
- **Downstream**: `POL-14` (Settlement Fund Release), `POL-15` (Seller Wallet Adjustment), `POL-16` (Sanctions on Fraud).

## 16. Canonical Source
- **Legacy Policy**: POL-15 (Dispute Resolution & Platform Arbitration).
- **Business Flows**: `res-flow-13.md` (Dispute Mediation & Ruling Workflow).
- **Engineering Phase**: `PHASE-07-POST-ORDER.md`.
- **Source Modules**: `platform/src/modules/disputes/`, `platform/src/modules/admin/arbitration/`.

## 17. Related Flows
- `res-flow-13.md`: Luồng mở tranh chấp, đối soát chứng cứ và thi hành phán quyết.

## 18. Related Engineering Phases
- `PHASE-07-POST-ORDER.md`: Triển khai Dispute Resolution Portal, Evidence Viewer và Arbitration Engine.

## 19. Open Decisions
- **None**: Quy trình trọng tài và đóng băng Escrow đã được kiểm chứng trên hệ thống.

## 20. Change History
- **Version**: 1.0
- **Status**: CANONICAL DOCUMENT CREATED
- **Source**: CANONICAL POLICY ID MAP v1.1
