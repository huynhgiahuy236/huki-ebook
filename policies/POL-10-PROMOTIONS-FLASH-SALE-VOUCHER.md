# POL-10 — Promotions, Flash Sale & Voucher Allocation Policy

## 1. Purpose
Quy định cơ chế thiết lập chương trình khuyến mại, mã giảm giá (Vouchers), chiến dịch giảm giá chớp nhoáng (Flash Sale), quy tắc xếp chồng ưu đãi (Discount Stacking) và thuật toán phân bổ giảm giá theo tỷ lệ (Pro-rata Allocation) giữa các đơn hàng con (Sub-Orders).

## 2. Scope
- Áp dụng cho mọi chương trình khuyến mại do Merchant tự tạo (Shop Voucher/Shop Discount) hoặc do Sàn Huki tài trợ (Platform Voucher/Platform Campaign).
- Áp dụng tại bước tính toán giỏ hàng và Checkout.

## 3. Actors
- **Customer**: Người áp dụng mã giảm giá và săn Flash Sale.
- **Merchant**: Người tạo mã giảm giá riêng của gian hàng và đăng ký sản phẩm tham gia Flash Sale.
- **Platform Marketing Admin**: Quản trị viên sàn phát hành mã giảm giá toàn sàn và duyệt chiến dịch.
- **Promotion Engine**: Bộ máy tính toán mức giảm và kiểm tra điều kiện áp dụng mã.

## 4. Definitions
- **Shop Voucher**: Mã giảm giá do gian hàng tự tài trợ 100%, chỉ áp dụng cho các sản phẩm của chính gian hàng đó.
- **Platform Voucher**: Mã giảm giá do Sàn Huki tài trợ (hoặc đồng tài trợ), áp dụng trên toàn bộ giỏ hàng thỏa mãn điều kiện tổng tiền.
- **Flash Sale Quota**: Hạn mức số lượng sản phẩm được bán với giá đặc biệt trong một khung giờ cố định.
- **Pro-rata Allocation**: Thuật toán chia đều số tiền giảm giá của Voucher sàn cho từng Sub-Order dựa trên tỷ trọng giá trị hàng của từng Shop.

## 5. Preconditions
- Khách hàng đã chọn danh sách sản phẩm hợp lệ trong giỏ (`POL-06`).
- Mã voucher đang trong thời gian hiệu lực và còn lượt sử dụng.

## 6. Business Rules

### VCH-001: Voucher Hierarchy & Stacking Rules
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Thứ tự áp dụng giảm giá trên một đơn hàng tuân thủ quy tắc nghiêm ngặt:
  1. **Tầng 1 (Flash Sale / Direct Discount)**: Giảm trực tiếp vào đơn giá sản phẩm.
  2. **Tầng 2 (Shop Voucher)**: Khấu trừ vào $\text{Shop Subtotal}$ của gian hàng tương ứng (Tối đa 1 Shop Voucher cho mỗi Shop).
  3. **Tầng 3 (Platform Voucher)**: Khấu trừ vào tổng số tiền của Master Order sau khi đã trừ Shop Voucher (Tối đa 1 Platform Voucher cho mỗi đơn).
  4. **Tầng 4 (Freeship Voucher)**: Khấu trừ trực tiếp vào phí vận chuyển (`POL-09`).
- Nghiêm cấm sử dụng 2 mã Shop Voucher trên cùng một gian hàng hoặc 2 mã Platform Voucher trên cùng một đơn hàng.

### VCH-002: Pro-rata Platform Voucher Allocation across Sub-Orders
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Khi áp dụng Platform Voucher giảm số tiền $D_{\text{platform}}$ cho Master Order gồm $M$ Sub-Orders, số tiền giảm phân bổ cho Sub-Order thứ $j$ được tính theo công thức tỷ trọng:
  $$\text{Allocated Discount}_j = D_{\text{platform}} \times \frac{\text{Shop Subtotal}_j - \text{Shop Discount}_j}{\sum_{k=1}^{M} (\text{Shop Subtotal}_k - \text{Shop Discount}_k)}$$
- Việc phân bổ này là bắt buộc để đảm bảo việc kế toán tài chính, tính phí sàn và xử lý hoàn tiền một phần (`POL-07`, `POL-11`) diễn ra hoàn toàn minh bạch.

### VCH-003: Flash Sale Dedicated Stock Quota & Concurrency Lock
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Sản phẩm tham gia Flash Sale được cấp một quỹ tồn kho riêng biệt $\text{Flash Sale Quota}$.
- Khi sự kiện Flash Sale diễn ra, hệ thống áp dụng khóa tồn kho đồng thời nguyên tử Redis (`POL-05`). Mỗi khách hàng bị giới hạn số lượng mua tối đa (Ví dụ: tối đa 2 sản phẩm/khách hàng) để chống đầu cơ.
- Khi $\text{Flash Sale Quota} = 0$, sản phẩm tự động quay về giá bán niêm yết thông thường.

## 7. State Machine
```
[VOUCHER_CREATED] --> [SCHEDULED] --> [ACTIVE] (Usage Count Monitored)
                                         |
        +--------------------------------+--------------------------------+
        |                                                                 |
        v                                                                 v
 [USAGE_LIMIT_EXHAUSTED]                                           [EXPIRED_BY_DATE]
```

## 8. Validation Rules
- Giá trị giảm giá không được vượt quá 90% giá trị của đơn hàng hoặc Sub-Order (Không cho phép đơn hàng 0đ trừ khi có chiến dịch quà tặng đặc biệt được phê duyệt riêng).
- Đơn hàng phải thỏa mãn giá trị tối thiểu ($\text{Min Order Value}$) do người tạo voucher quy định.

## 9. Financial Impact
- **Impact Level**: `DIRECT`
- Quyết định tỷ lệ khấu trừ doanh thu của Shop và chi phí marketing của Sàn Huki khi thực hiện thanh quyết toán trong Escrow Settlement (`POL-14`).

## 10. Edge Cases
- **EC-001**: Khách hủy 1 Sub-Order trong Master Order đã áp dụng Platform Voucher. Số tiền hoàn lại cho khách bằng đúng $\text{Net Sub-Order Amount}$ đã trừ phần giảm giá phân bổ $\text{Allocated Discount}_j$. Voucher sàn không được hoàn lại lượt dùng nếu các Sub-Orders khác vẫn được thực hiện thành công.
- **EC-002**: Hai khách hàng cùng bấm áp dụng mã Voucher còn duy nhất 1 lượt sử dụng ở cùng mili-giây. Bộ đếm nguyên tử Redis `DECR` chỉ cấp quyền cho khách hàng đầu tiên, khách hàng thứ hai nhận thông báo "Mã giảm giá đã hết lượt dùng".

## 11. Security & Fraud
- Kiểm tra thiết bị và tài khoản người dùng để ngăn chặn hành vi tạo nhiều tài khoản ảo (Sybil Attack) nhằm lạm dụng voucher dành cho khách hàng mới (New User Voucher).

## 12. SLA / Timing
- Thời gian kiểm tra và tính toán giảm giá voucher tại bước Checkout: $\le 50\text{ms}$.

## 13. Notifications
- Thông báo cho khách hàng khi mã giảm giá trong ví sắp hết hạn (Trước 24 giờ).
- Thông báo cho Merchant khi chiến dịch Flash Sale kết thúc kèm báo cáo doanh số chi tiết.

## 14. Audit & Compliance
- Tuân thủ Nghị định 81/2018/NĐ-CP về hoạt động xúc tiến thương mại và hạn mức giảm giá tối đa.

## 15. Dependencies
- **Upstream**: `POL-06` (Multi-Store Cart), `POL-05` (Inventory Lock).
- **Downstream**: `POL-07` (Sub-Order Net Calculation), `POL-14` (Settlement Subsidy Accounting).

## 16. Canonical Source
- **Legacy Policy**: POL-13 (Promotions, Flash Sale & Voucher Allocation).
- **Business Flows**: `res-flow-11.md` (Voucher Engine & Flash Sale Quota).
- **Engineering Phase**: `PHASE-03-CART-CHECKOUT.md`.
- **Source Modules**: `platform/src/modules/promotions/`, `platform/src/modules/vouchers/`.

## 17. Related Flows
- `res-flow-11.md`: Luồng áp dụng mã giảm giá, phân bổ pro-rata và giữ quota Flash Sale.

## 18. Related Engineering Phases
- `PHASE-03-CART-CHECKOUT.md`: Triển khai Voucher Validation Service, Discount Calculator và UI Promotion Picker.

## 19. Open Decisions
- **DEC-004**: Cơ chế đồng tài trợ Voucher Sàn giữa Sàn Huki và Merchant (`Status: DECISION_REQUIRED`).
- **DEC-005**: Kích hoạt hay đóng băng module Huki Coin (`Status: DECISION_REQUIRED`).

## 20. Change History
- **Version**: 1.0
- **Status**: CANONICAL DOCUMENT CREATED
- **Source**: CANONICAL POLICY ID MAP v1.1
