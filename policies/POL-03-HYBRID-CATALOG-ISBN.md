# POL-03 — Hybrid Product & ISBN Catalog Governance Policy

## 1. Purpose
Quy định về quản lý danh mục sản phẩm, chuẩn hóa thông tin dữ liệu sách, kiểm thực mã số tiêu chuẩn quốc tế ISBN và quy chuẩn các định dạng sản phẩm lai (Sách giấy vật lý, Sách điện tử Ebook, Gói Combo Hybrid) trên sàn thương mại điện tử HUKI EBOOK.

## 2. Scope
- Áp dụng cho mọi sản phẩm sách và ấn phẩm xuất bản được đăng tải bởi Merchant hoặc Platform Admin.
- Không áp dụng cho các tài liệu số phi xuất bản (User-generated documents không có bản quyền).

## 3. Actors
- **Merchant / Publisher**: Người bán hoặc nhà xuất bản đăng bán ấn phẩm.
- **Platform Content Moderator**: Đội ngũ kiểm duyệt nội dung ấn phẩm sàn.
- **Catalog System**: Hệ thống xử lý dữ liệu và đánh chỉ mục tìm kiếm.

## 4. Definitions
- **ISBN (International Standard Book Number)**: Mã số tiêu chuẩn quốc tế gồm 10 hoặc 13 chữ số định danh duy nhất cho một ấn bản sách.
- **Product Format Types**:
  - `PHYSICAL`: Sách giấy vật lý, yêu cầu quản lý tồn kho kho vật lý và vận chuyển bưu chính.
  - `EBOOK`: Sách điện tử số hóa (EPUB/PDF), kích hoạt quyền đọc ngay khi thanh toán, không phát sinh phí vận chuyển.
  - `COMBO / HYBRID`: Gói sản phẩm gồm cả bản sách giấy và bản quyền đọc Ebook đi kèm.

## 5. Preconditions
- Gian hàng của Merchant đã được duyệt KYC (`POL-01`).
- Tài khoản thực hiện có quyền ghi danh mục sản phẩm (`BIT 1` trong `POL-02`).

## 6. Business Rules

### CAT-001: Multi-Format Product Integrity
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Mỗi sản phẩm sách trên hệ thống có thể cấu hình một hoặc nhiều định dạng (`PHYSICAL`, `EBOOK`, `COMBO`).
- Mỗi định dạng có giá niêm yết (Original Price), giá khuyến mãi (Sale Price) và cơ chế quản lý kho riêng biệt:
  - `PHYSICAL`: Bắt buộc nhập trọng lượng (gram), kích thước (cm) và tồn kho ban đầu (`POL-05`).
  - `EBOOK`: Bắt buộc đính kèm tệp số hóa hợp lệ (EPUB/PDF) được mã hóa theo chuẩn DRM (`POL-04`) và cấu hình tỷ lệ đọc thử (Sample Preview).
  - `COMBO`: Bắt buộc liên kết chính xác cả tài sản kho vật lý và quyền truy cập số.

### CAT-002: Strict ISBN Checksum Validation
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Mọi ấn phẩm thương mại đăng bán bắt buộc phải khai báo mã ISBN (10 hoặc 13 chữ số).
- Hệ thống áp dụng thuật toán kiểm tra checksum nghiêm ngặt:
  - Chuẩn ISBN-10: Thuật toán Modulo 11.
  - Chuẩn ISBN-13: Thuật toán Modulo 10 (Trọng số xen kẽ 1 và 3, bắt đầu bằng tiền tố `978` hoặc `979`).
- Nghiêm cấm tạo sản phẩm với mã ISBN giả lập hoặc sai checksum.

### CAT-003: Product Publishing & Moderation Lifecycle
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Sản phẩm mới hoặc sản phẩm có chỉnh sửa nội dung trọng yếu (Tiêu đề, Tác giả, File Ebook) phải trải qua trạng thái `PENDING_REVIEW` trước khi được hiển thị công khai trên Storefront (`ACTIVE`).

## 7. State Machine
```
[DRAFT] --> [PENDING_REVIEW] --> [ACTIVE]
                 |                  |
                 v                  +---> [OUT_OF_STOCK]
            [REJECTED]              |
                                    +---> [ARCHIVED / DELISTED]
```

## 8. Validation Rules
- **Tiêu đề sách**: Từ 2 đến 255 ký tự, không chứa ký tự spam.
- **Giá bán (Original Price)**: Số nguyên dương $\ge 1.000$ VNĐ.
- **Giá khuyến mãi (Sale Price)**: Phải thỏa mãn $0 < \text{Sale Price} \le \text{Original Price}$.
- **Trọng lượng sách giấy**: Số nguyên dương từ 10g đến 20.000g.
- **Tệp Ebook**: Định dạng `.epub` hoặc `.pdf`, kích thước tối đa 100MB, không chứa mã độc hoặc script nhúng nguy hiểm.

## 9. Financial Impact
- **Impact Level**: `NOT_DIRECT`
- Giá bán định dạng thiết lập tại Catalog là nguồn tham chiếu bất biến cho việc tính toán Subtotal giỏ hàng (`POL-06`) và Sub-Order (`POL-07`).

## 10. Edge Cases
- **EC-001**: Merchant đăng sách Ebook nhưng không đính kèm file mẫu Sample. Hệ thống tự động trích xuất 10% số trang đầu làm bản đọc thử mặc định theo `POL-04`.
- **EC-002**: Hai Merchant khác nhau cùng đăng bán một tựa sách có cùng ISBN. Hệ thống cho phép tồn tại nhiều Merchant bán cùng ISBN nhưng quản lý tồn kho và giá độc lập.

## 11. Security & Fraud
- Kiểm tra mã băm SHA-256 của file Ebook upload để phát hiện tệp trùng lặp hoặc file lậu vi phạm bản quyền đã bị cảnh báo trước đó.
- Ngăn chặn triệt để lỗ hổng XSS trong phần mô tả chi tiết của sách (HTML Sanitization).

## 12. SLA / Timing
- Thời gian kiểm duyệt sản phẩm của Platform Admin: $\le 24$ giờ làm việc.

## 13. Notifications
- Thông báo cho Merchant khi sản phẩm được duyệt xuất bản hoặc bị từ chối kèm lý do chi tiết.
- Cảnh báo tự động cho Merchant khi tồn kho sách giấy giảm xuống dưới ngưỡng cảnh báo (Low Stock Threshold).

## 14. Audit & Compliance
- Tuân thủ Luật Xuất bản Việt Nam và Công ước Bern về bảo hộ tác phẩm văn học nghệ thuật.
- Lưu trữ lịch sử thay đổi thông tin sản phẩm và giá bán phục vụ đối soát tranh chấp.

## 15. Dependencies
- **Upstream**: `POL-01` (Merchant KYC), `POL-02` (Staff RBAC).
- **Downstream**: `POL-04` (DRM & Content Protection), `POL-05` (Inventory), `POL-06` (Cart), `POL-07` (Orders).

## 16. Canonical Source
- **Legacy Policy**: POL-04 (Hybrid Catalog & ISBN Governance).
- **Business Flows**: `res-flow-4.md` (Product Listing & Format Management).
- **Engineering Phase**: `PHASE-02-PRODUCT-CATALOG.md`.
- **Source Modules**: `platform/src/modules/catalog/`, `platform/src/modules/isbn/`.

## 17. Related Flows
- `res-flow-4.md`: Luồng đăng tải sản phẩm đa định dạng và thẩm định ISBN.

## 18. Related Engineering Phases
- `PHASE-02-PRODUCT-CATALOG.md`: Triển khai Schema Sản phẩm, Form Catalog UI và ISBN Validator.

## 19. Open Decisions
- **GAP-006**: Hỗ trợ nhiều kho hàng vật lý cho một sản phẩm (Multi-warehouse) hiện đang ở trạng thái `PROPOSED / FUTURE_SCOPE`.

## 20. Change History
- **Version**: 1.0
- **Status**: CANONICAL DOCUMENT CREATED
- **Source**: CANONICAL POLICY ID MAP v1.1
