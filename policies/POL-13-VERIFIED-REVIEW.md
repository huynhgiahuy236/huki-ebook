# POL-13 — Verified Purchase & Community Review Policy

## 1. Purpose
Quy định cơ chế đánh giá và nhận xét sản phẩm (Product Reviews & Ratings), xác thực người mua hàng thực tế (Verified Purchase Badge), kiểm soát nội dung cộng đồng, ngăn chặn đánh giá giả mạo (Fake Reviews/Seeding) và bảo vệ uy tín thương hiệu của các gian hàng chân chính.

## 2. Scope
- Áp dụng cho mọi hoạt động đăng đánh giá, chấm điểm sao, tải lên hình ảnh/video trải nghiệm sản phẩm trên toàn bộ các trang chi tiết sách (`PHYSICAL`, `EBOOK`, `COMBO`).
- Áp dụng cho phản hồi của Merchant đối với nhận xét của khách hàng.

## 3. Actors
- **Verified Buyer**: Khách hàng đã nhận hàng và hoàn tất đơn hàng trên sàn.
- **Merchant**: Gian hàng nhận đánh giá và có quyền phản hồi hoặc khiếu nại nhận xét xúc phạm.
- **Automated Review Moderation Engine**: Bộ lọc từ khóa thô tục và phát hiện spam tự động.
- **Community Moderator (Admin)**: Quản trị viên kiểm duyệt nội dung cộng đồng.

## 4. Definitions
- **Verified Purchase**: Huy hiệu xác nhận người dùng đã trực tiếp thanh toán và nhận sản phẩm từ gian hàng đó thông qua hệ sinh thái Huki.
- **Review Window**: Khoảng thời gian cho phép người mua gửi đánh giá sau khi đơn hàng hoàn thành (Mặc định 30 ngày).
- **Incentive Coins / Points**: Phần thưởng điểm thưởng/coin khuyến khích khách hàng đính kèm hình ảnh và video thực tế.

## 5. Preconditions
- Sub-Order của khách hàng đối với sản phẩm đó phải ở trạng thái `COMPLETED` (`POL-07`, `POL-08`, `POL-09`).
- Người dùng chưa từng gửi đánh giá cho Sub-Order này hoặc đang trong thời hạn chỉnh sửa cho phép (Tối đa 1 lần chỉnh sửa trong vòng 30 ngày).

## 6. Business Rules

### REV-001: Strict Verified Purchase Invariant
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- CHỈ những tài khoản có đơn hàng chứa sản phẩm ở trạng thái `COMPLETED` mới được phép chấm điểm sao (1 - 5 sao) và viết nhận xét cho sản phẩm đó.
- Khách vãng lai, tài khoản chưa từng mua hàng, hoặc tài khoản đã hủy/hoàn tiền đơn hàng (`POL-11`) tuyệt đối KHÔNG ĐƯỢC PHÉP tạo đánh giá.

### REV-002: Rating Scale & Multimedia Incentive Mechanics
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Thang điểm đánh giá: Chuẩn 1 đến 5 sao nguyên tử.
- Đánh giá đạt chuẩn nhận thưởng khuyến khích (Incentive Reward) khi thỏa mãn:
  - Có nội dung nhận xét $\ge 50$ ký tự có ý nghĩa.
  - Đính kèm ít nhất 1 hình ảnh chụp sản phẩm thực tế hoặc 1 đoạn video ngắn $\ge 5$ giây.

### REV-003: Review Moderation & Anti-Defamation Shield
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Hệ thống tự động lọc và ẩn ngay lập tức các nhận xét:
  1. Chứa từ ngữ thô tục, chửi thề, vi phạm thuần phong mỹ tục hoặc phân biệt chủng tộc.
  2. Chứa số điện thoại, thông tin cá nhân của người khác hoặc đường dẫn link lừa đảo/quảng cáo ngoài sàn.
  3. Cố tình bôi nhọ, tống tiền gian hàng (Merchant có quyền gửi yêu cầu gỡ bỏ kèm bằng chứng trò chuyện).
- Mỗi đánh giá, Merchant được quyền đăng **01 phản hồi chính thức (Store Response)** mang tính lịch sự và xây dựng.

## 7. State Machine
```
[SUB_ORDER_COMPLETED]
        |
 (Customer Submits Review)
        |
        v
[AUTOMATED_FILTER_CHECK]
        |
        +---> [PASSED] -------------> [PUBLISHED_PUBLICLY]
        |                                    |
        |                             (Store Responds)
        |                                    |
        |                                    v
        |                            [REPLY_PUBLISHED]
        |
        +---> [FLAGGED_PROFANITY] ---> [PENDING_ADMIN_REVIEW] ---> [APPROVED] / [DELETED]
```

## 8. Validation Rules
- Độ dài nhận xét: Từ 10 đến 2.000 ký tự.
- Hình ảnh đính kèm: Tối đa 5 ảnh (.jpg, .png, .webp, kích thước mỗi ảnh $\le 5$MB).
- Video đính kèm: Tối đa 1 video (.mp4, thời lượng $\le 60$ giây, dung lượng $\le 30$MB).

## 9. Financial Impact
- **Impact Level**: `NOT_DIRECT`
- Điểm đánh giá sao ảnh hưởng trực tiếp đến thuật toán xếp hạng tìm kiếm sản phẩm và tỷ lệ chuyển đổi bán hàng của gian hàng.

## 10. Edge Cases
- **EC-001**: Khách hàng mua combo 5 cuốn sách khác nhau trong 1 Sub-Order. Hệ thống cho phép khách hàng đánh giá riêng biệt cho từng tựa sách trong combo.
- **EC-002**: Merchant tố cáo một loạt đánh giá 1 sao hàng loạt từ các tài khoản mới lập. Hệ thống phát hiện mô hình tấn công đối thủ (Competitor Sabotage) và tạm khóa hiển thị để Admin kiểm tra IP/Thiết bị.

## 11. Security & Fraud
- Kiểm tra tính tương quan giữa thời gian hoàn tất đơn và thời điểm đánh giá để phát hiện bot tự động farm điểm đánh giá ảo.

## 12. SLA / Timing
- Thời hạn mở cổng đánh giá: 30 ngày kể từ khi đơn hàng `COMPLETED`.
- Thời gian hệ thống kiểm duyệt tự động từ khóa: $\le 200\text{ms}$.

## 13. Notifications
- Gửi thông báo nhắc nhở khách hàng đánh giá nhận thưởng sau 3 ngày kể từ khi giao hàng thành công.
- Thông báo cho Merchant khi có nhận xét mới từ khách hàng.

## 14. Audit & Compliance
- Tuân thủ nguyên tắc không được xóa các đánh giá tiêu cực mang tính xây dựng của khách hàng nhằm làm đẹp gian hàng một cách không trung thực.

## 15. Dependencies
- **Upstream**: `POL-07` (Sub-Order Completed Status), `POL-03` (Catalog Product).
- **Downstream**: `POL-16` (Moderation Sanctions on Fake Reviews).

## 16. Canonical Source
- **Legacy Policy**: POL-16 (Verified Purchase & Reviews).
- **Business Flows**: `res-flow-14.md` (Review Submission & Moderation).
- **Engineering Phase**: `PHASE-07-POST-ORDER.md`.
- **Source Modules**: `platform/src/modules/reviews/`, `platform/src/modules/moderation/`.

## 17. Related Flows
- `res-flow-14.md`: Luồng gửi nhận xét, tải ảnh/video và phản hồi của gian hàng.

## 18. Related Engineering Phases
- `PHASE-07-POST-ORDER.md`: Triển khai Review Form UI, Star Rating Component và Moderation Filter.

## 19. Open Decisions
- **None**: Kiến trúc Verified Review đã hoàn chỉnh và kiểm chứng trên hệ thống.

## 20. Change History
- **Version**: 1.0
- **Status**: CANONICAL DOCUMENT CREATED
- **Source**: CANONICAL POLICY ID MAP v1.1
