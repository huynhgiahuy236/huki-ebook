# POL-06 — Multi-Store Cart & Checkout Validation Policy

## 1. Purpose
Quy định về cấu trúc giỏ hàng đa gian hàng (Multi-Store Cart), cơ chế nhóm sản phẩm theo pháp nhân người bán thực tế, đồng bộ thời gian thực trạng thái tồn kho và giá bán, và quy tắc tính toán tạm tính (Subtotal) trước khi khởi tạo đơn hàng.

## 2. Scope
- Áp dụng cho mọi hoạt động thêm vào giỏ, cập nhật số lượng, chọn sản phẩm và chuẩn bị thanh toán của khách hàng trên giao diện Web và Mobile.
- Áp dụng cho cả sản phẩm `PHYSICAL`, `EBOOK` và `COMBO`.

## 3. Actors
- **Customer**: Người mua quản lý giỏ hàng của mình.
- **Cart Engine**: Dịch vụ xử lý tính toán và nhóm giỏ hàng.
- **Storefront Catalog / Inventory Sync**: Dịch vụ cung cấp dữ liệu giá và tồn kho thời gian thực.

## 4. Definitions
- **Multi-Store Grouping**: Cơ chế phân tách các mặt hàng trong giỏ thành từng khối độc lập theo `Store ID` để phục vụ tính phí vận chuyển và chia đơn hàng (`POL-07`).
- **Cart Item Stale State**: Trạng thái sản phẩm trong giỏ bị thay đổi giá, hết hàng hoặc bị ẩn khỏi sàn kể từ lúc người mua thêm vào giỏ.

## 5. Preconditions
- Khách hàng có thể tương tác với giỏ hàng dưới dạng Khách vãng lai (Guest Cart qua LocalStorage) hoặc Người dùng đã đăng nhập (User Cart đồng bộ Database).

## 6. Business Rules

### CART-001: Strict Multi-Store Grouping by Merchant
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Các sản phẩm trong giỏ hàng bắt buộc phải được nhóm theo từng Gian hàng (Merchant Store) dựa trên `store_id` và tên thương mại chính thức của người bán.
- Khách hàng có thể chọn thanh toán:
  - Toàn bộ giỏ hàng (Tất cả các shop).
  - Chọn lọc từng gian hàng cụ thể.
  - Chọn lọc từng sản phẩm riêng lẻ trong từng gian hàng.

### CART-002: Real-time Price & Stock Re-validation
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Mỗi khi khách hàng mở giao diện giỏ hàng hoặc nhấn nút "Tiến hành thanh toán", hệ thống bắt buộc đối soát lại toàn bộ:
  1. Trạng thái hoạt động của gian hàng (`POL-01`, `POL-16`). Nếu gian hàng bị tạm khóa, các sản phẩm liên quan bị vô hiệu hóa chọn mua (Disabled Checkbox).
  2. Tồn kho khả dụng $\text{Available}$ (`POL-05`). Nếu $\text{Available} = 0$, hiển thị nhãn "Hết hàng". Nếu số lượng trong giỏ > $\text{Available}$, tự động điều chỉnh số lượng giỏ về bằng $\text{Available}$ và hiển thị thông báo.
  3. Giá bán thực tế: Nếu giá niêm yết/khuyến mãi đã thay đổi, cập nhật ngay giá mới nhất và hiển thị cảnh báo biến động giá ("Giá sản phẩm đã thay đổi từ X sang Y").

### CART-003: Subtotal Calculation Invariant
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Tạm tính của từng nhóm gian hàng ($\text{Shop Subtotal}$) bằng tổng tiền các sản phẩm được chọn của gian hàng đó:
  $$\text{Shop Subtotal} = \sum_{i=1}^{n} (\text{Selected Unit Price}_i \times \text{Quantity}_i)$$
- Tổng tạm tính toàn bộ giỏ hàng ($\text{Cart Subtotal}$) bằng tổng tạm tính của tất cả các gian hàng được chọn.
- Phí vận chuyển (`POL-09`) và Giảm giá Voucher (`POL-10`) chỉ được áp dụng ở bước Checkout tiếp theo, không được trừ trực tiếp vào Cart Subtotal.

## 7. State Machine
```
[CART_ITEM_ADDED]
       |
  (View Cart)
       |
       v
[VALIDATING_STOCK_AND_PRICE]
       |
       +---> [VALID] -----------> [READY_FOR_CHECKOUT] (User Selected)
       |                                |
       +---> [PRICE_CHANGED] (Warning) -+
       |
       +---> [OUT_OF_STOCK] (Disabled)
       |
       +---> [STORE_SUSPENDED] (Disabled)
```

## 8. Validation Rules
- Số lượng mua tối thiểu cho 1 sản phẩm: 1.
- Số lượng mua tối đa cho 1 sản phẩm trên 1 đơn: Cấu hình mặc định 99 hoặc theo hạn mức tồn kho khả dụng $\text{Available}$.
- Giỏ hàng lưu trữ tối đa 100 sản phẩm khác nhau.

## 9. Financial Impact
- **Impact Level**: `NOT_DIRECT`
- Cung cấp số liệu đầu vào chuẩn xác để khởi tạo Master Order và Sub-Orders trong `POL-07`.

## 10. Edge Cases
- **EC-001**: Khách hàng Guest thêm 5 món vào giỏ, sau đó Đăng nhập tài khoản đã có sẵn 3 món khác. Hệ thống tự động gộp (Merge Cart) hai danh sách, giữ lại số lượng hợp lệ và khử trùng lặp sản phẩm.
- **EC-002**: Sản phẩm Ebook đã được khách mua thành công trong một đơn hàng trước đó. Khi khách mở giỏ có chứa cuốn sách đó, hệ thống hiển thị thông báo "Bạn đã sở hữu ấn bản này" và vô hiệu hóa mua lại.

## 11. Security & Fraud
- Kiểm tra tính hợp lệ của Payload từ Client (Không bao giờ tin tưởng giá tiền do Client gửi lên; hệ thống luôn truy vấn giá từ Database Catalog Server-Side).

## 12. SLA / Timing
- Thời gian đồng bộ giỏ hàng và kiểm tra tồn kho: $\le 100\text{ms}$.

## 13. Notifications
- Hiển thị Toast Message khi tự động điều chỉnh số lượng hoặc giá trong giỏ.

## 14. Audit & Compliance
- Tuân thủ nguyên tắc minh bạch giá bán theo Luật Bảo vệ quyền lợi người tiêu dùng.

## 15. Dependencies
- **Upstream**: `POL-03` (Catalog Price), `POL-05` (Inventory Available).
- **Downstream**: `POL-07` (Order Splitting), `POL-09` (Shipping Fee Calculation), `POL-10` (Vouchers).

## 16. Canonical Source
- **Legacy Policy**: POL-09 (Multi-Store Cart & Checkout).
- **Business Flows**: `res-flow-7.md` (Cart Management & Multi-Store Selection).
- **Engineering Phase**: `PHASE-03-CART-CHECKOUT.md`.
- **Source Modules**: `platform/src/modules/cart/`, `web/src/app/cart/`.

## 17. Related Flows
- `res-flow-7.md`: Luồng giỏ hàng đa gian hàng và chọn lọc thanh toán.

## 18. Related Engineering Phases
- `PHASE-03-CART-CHECKOUT.md`: Triển khai Cart State Management, UI Multi-Store Grouping và Checkout Transition.

## 19. Open Decisions
- **None**: Kiến trúc giỏ hàng đa gian hàng đã hoàn thiện và kiểm chứng trên hệ thống.

## 20. Change History
- **Version**: 1.0
- **Status**: CANONICAL DOCUMENT CREATED
- **Source**: CANONICAL POLICY ID MAP v1.1
