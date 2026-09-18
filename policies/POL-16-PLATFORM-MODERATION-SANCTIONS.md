# POL-16 — Platform Moderation, Sanctions & Freezing Policy

## 1. Purpose
Quy định hệ thống kiểm duyệt nội dung, khung chế tài xử lý vi phạm đối với Thương nhân và Người dùng, thang điểm phạt tích lũy (Penalty Points System), quy trình phong tỏa gian hàng và đóng băng tài khoản ví (Store & Wallet Freezing) khi phát hiện hành vi gian lận, phát tán sách lậu hoặc vi phạm pháp luật xuất bản.

## 2. Scope
- Áp dụng cho toàn bộ các cá nhân, tổ chức, gian hàng và sản phẩm hoạt động trên hệ sinh thái HUKI EBOOK.
- Áp dụng cho các quyết định can thiệp cưỡng chế của Platform Admin, Đội ngũ Pháp chế và Ban An ninh thông tin sàn.

## 3. Actors
- **Violating Entity**: Thương nhân hoặc Người dùng có hành vi vi phạm điều khoản dịch vụ.
- **Platform Compliance & Legal Officer**: Cán bộ pháp chế và tuân thủ có thẩm quyền xử phạt.
- **Automated Anti-Fraud Engine**: Hệ thống giám sát an ninh tự động quét vi phạm.

## 4. Definitions
- **Penalty Points**: Hệ thống tính điểm lỗi vi phạm của gian hàng trong chu kỳ đánh giá (Ví dụ: chu kỳ 90 ngày).
- **Store Suspension**: Việc tạm khóa khả năng đăng bán sản phẩm và ẩn toàn bộ gian hàng khỏi Storefront.
- **Wallet Freezing**: Việc chuyển toàn bộ số dư khả dụng sang trạng thái `FROZEN` (`POL-15`), ngăn chặn hoàn toàn việc rút tiền ra khỏi sàn trong thời gian điều tra.

## 5. Preconditions
- Có báo cáo vi phạm có căn cứ từ Người mua, Chủ sở hữu tác quyền, cơ quan quản lý nhà nước hoặc hệ thống giám sát tự động kích hoạt cờ cảnh báo (Flagged Incident).

## 6. Business Rules

### MOD-001: 3-Tier Violation Severity & Progressive Penalty System
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Các hành vi vi phạm được phân cấp xử lý theo 3 mức độ nghiêm trọng:
  1. **Cấp độ 1 (Nhẹ - Vi phạm thông tin/Giao trễ)**:
     - Giao hàng trễ hạn SLA (`POL-09`), mô tả sản phẩm thiếu chính xác, tỷ lệ phản hồi chat thấp.
     - *Chế tài*: Nhắc nhở cảnh cáo + Cộng 1 - 2 điểm phạt.
  2. **Cấp độ 2 (Trung bình - Hàng lỗi/Thao túng đánh giá)**:
     - Giao sách rách lỗi lặp lại nhiều lần (`POL-11`), thuê người đánh giá ảo (Seeding Review theo `POL-13`), hủy đơn hàng loạt do hết hàng ảo.
     - *Chế tài*: Tạm ẩn sản phẩm vi phạm + Khóa tính năng tham gia Flash Sale (`POL-10`) trong 14 - 30 ngày + Tạm dừng thanh toán 7 ngày.
  3. **Cấp độ 3 (Nghiêm trọng - Hàng giả/Sách lậu/Rửa tiền/Gian lận)**:
     - Bán sách photo, sách lậu vi phạm bản quyền (`POL-04`), cung cấp hồ sơ KYC giả mạo (`POL-01`), gian lận voucher sàn hoặc tấn công hệ thống.
     - *Chế tài*: Xóa toàn bộ sản phẩm + Khóa vĩnh viễn gian hàng + Đóng băng toàn bộ số dư ví (`MOD-003`).

### MOD-002: Piracy & Counterfeit Zero-Tolerance Policy
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Huki áp dụng chính sách không khoan nhượng (Zero Tolerance) đối với hành vi xâm phạm quyền tác giả:
  - Ngay khi nhận được thông báo vi phạm bản quyền hợp lệ từ Nhà xuất bản/Tác giả hoặc Cục Bản quyền tác giả, hệ thống tự động gỡ bỏ sản phẩm trong vòng **04 giờ làm việc**.
  - Toàn bộ doanh thu từ các đơn hàng sách lậu đang nằm trong Escrow (`POL-14`) sẽ bị phong tỏa để hoàn tiền cho người mua hoặc chuyển giao xử lý theo yêu cầu của cơ quan tư pháp.

### MOD-003: Emergency Store & Wallet Freezing Protocol
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Khi phát hiện rủi ro bảo mật khẩn cấp (Tài khoản Store Owner bị hacker chiếm quyền điều khiển, hoặc có dấu hiệu rửa tiền/rút tiền bất thường):
  - Admin có quyền kích hoạt lệnh đóng băng tức thì (`EMERGENCY_FREEZE`).
  - Toàn bộ lệnh rút tiền đang chờ xử lý (`PO-001` trong `POL-15`) lập tức bị hủy bỏ và chuyển số dư vào trạng thái `FROZEN`.
  - Mọi token đăng nhập của gian hàng bị thu hồi (`SEC-001` trong `POL-02`).

## 7. State Machine
```
[NORMAL_ACTIVE_STORE]
         |
  (Violation Detected)
         |
         +---> [WARNING_ISSUED] (Tier 1)
         |
         +---> [TEMPORARILY_SUSPENDED] (Tier 2: 7 - 30 Days)
         |            |
         |     (Remedied / Appeal Approved)
         |            |
         |            v
         |     [NORMAL_ACTIVE_STORE]
         |
         +---> [PERMANENTLY_BANNED] (Tier 3: Delisted & Wallet Frozen)
```

## 8. Validation Rules
- Mọi quyết định xử phạt Cấp độ 2 và Cấp độ 3 bắt buộc phải có biên bản thẩm tra đính kèm mã vi phạm và phê duyệt của Trưởng bộ phận Tuân thủ (Compliance Manager).
- Điểm phạt vi phạm được tự động xóa (Reset) sau 90 ngày nếu gian hàng không tái phạm.

## 9. Financial Impact
- **Impact Level**: `DIRECT`
- Phong tỏa tài sản và dòng tiền nhằm bảo toàn thiệt hại cho khách hàng và nền tảng trước các hành vi gian lận thương mại.

## 10. Edge Cases
- **EC-001**: Merchant khiếu nại quyết định xử phạt (Appeal Submission). Merchant có quyền gửi đơn kháng nghị kèm bằng chứng bản quyền/hóa đơn nguồn gốc sách trong vòng 7 ngày; Sàn có trách nhiệm phúc thẩm trong 72 giờ làm việc.
- **EC-002**: Gian hàng bị khóa vĩnh viễn nhưng vẫn còn các đơn hàng hợp lệ đã giao thành công trước đó và đã qua thời hạn RMA 7 ngày. Sau khi trừ toàn bộ các khoản phạt và bồi thường, số tiền dư hợp pháp còn lại sẽ được hướng dẫn thủ tục thanh lý hợp đồng.

## 11. Security & Fraud
- Tự động nhận diện thiết bị và số tài khoản ngân hàng của thương nhân bị cấm để chặn việc tạo gian hàng mới (Blacklist Registry).

## 12. SLA / Timing
- Thời gian gỡ bỏ sản phẩm vi phạm bản quyền khẩn cấp: $\le 4$ giờ làm việc.
- Thời gian thực thi đóng băng ví khẩn cấp: $\le 5$ giây kể từ lệnh Admin.

## 13. Notifications
- Gửi Email chính thức trích dẫn điều khoản vi phạm, mức phạt và hướng dẫn thủ tục kháng nghị cho Merchant.

## 14. Audit & Compliance
- Báo cáo định kỳ danh sách các trường hợp vi phạm bản quyền và gian lận thương mại cho Bộ Công Thương và Cục Thương mại điện tử và Kinh tế số.

## 15. Dependencies
- **Upstream**: `POL-01` (Merchant KYC), `POL-03` (Product Catalog), `POL-04` (DRM & Copyright), `POL-12` (Disputes).
- **Downstream**: `POL-15` (Wallet Freezing), `POL-02` (Revoke Staff Access).

## 16. Canonical Source
- **Legacy Policy**: POL-20 (Platform Moderation & Freezing).
- **Business Flows**: `res-flow-17.md` (Moderation & Sanctions Workflow).
- **Engineering Phase**: `PHASE-01-SELLER-ONBOARDING.md`, `PHASE-08-FINANCE.md`.
- **Source Modules**: `platform/src/modules/moderation/`, `platform/src/modules/admin/sanctions/`.

## 17. Related Flows
- `res-flow-17.md`: Luồng phát hiện vi phạm, cảnh báo, tạm khóa và đóng băng tài khoản.

## 18. Related Engineering Phases
- `PHASE-01-SELLER-ONBOARDING.md`: Triển khai Store Status Management và Blacklist Engine.
- `PHASE-08-FINANCE.md`: Triển khai Wallet Freezing Handler.

## 19. Open Decisions
- **None**: Khung chế tài xử lý vi phạm 3 cấp độ đã được chuẩn hóa trên hệ thống.

## 20. Change History
- **Version**: 1.0
- **Status**: CANONICAL DOCUMENT CREATED
- **Source**: CANONICAL POLICY ID MAP v1.1
