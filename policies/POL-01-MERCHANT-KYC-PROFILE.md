# POL-01 — Merchant Lifecycle, KYC & Legal Profile Policy

## 1. Purpose
Quy định toàn diện về vòng đời thương nhân trên nền tảng HUKI EBOOK, bao gồm quy trình tiếp nhận hồ sơ định danh pháp lý (KYC), thẩm định tư cách bán hàng, quản lý và kiểm soát biến động thông tin nhạy cảm (Profile Mutation) nhằm đảm bảo tuân thủ pháp luật thương mại điện tử và ngăn ngừa gian lận.

## 2. Scope
- Áp dụng cho mọi cá nhân, hộ kinh doanh và tổ chức doanh nghiệp đăng ký mở gian hàng (Merchant/Seller) trên HUKI EBOOK.
- Áp dụng cho quy trình thẩm duyệt hồ sơ của đội ngũ vận hành Platform Admin.
- Không áp dụng cho tài khoản người mua (Customer) thông thường.

## 3. Actors
- **Merchant Applicant**: Đối tác nộp hồ sơ xin mở gian hàng.
- **Active Merchant**: Thương nhân đang hoạt động hợp lệ trên sàn.
- **Platform Admin / Compliance Officer**: Quản trị viên sàn có thẩm quyền xét duyệt, từ chối hoặc phong tỏa gian hàng.
- **Automated Verification Service**: Dịch vụ kiểm tra dữ liệu tự động (OCR, đối soát định dạng MST/CCCD).

## 4. Definitions
- **KYC (Know Your Customer)**: Quy trình thu thập và xác thực thông tin định danh pháp lý của người bán.
- **Profile Mutation**: Hành vi chỉnh sửa các trường thông tin pháp lý/tài chính trọng yếu của gian hàng sau khi đã được phê duyệt.
- **Merchant Store**: Thực thể gian hàng gắn liền với hồ sơ thương nhân và các sub-order.

## 5. Preconditions
- Người đăng ký đã có tài khoản người dùng Huki và hoàn tất xác thực thông tin đăng nhập cơ bản (`AUTH-001` - Platform Identity Prerequisite).
- Người đăng ký cung cấp đầy đủ tài liệu số hóa: CCCD/Hộ chiếu (đối với cá nhân) hoặc Giấy phép ĐKKD & Mã số thuế (đối với doanh nghiệp).

## 6. Business Rules

### KYC-001: Mandatory Merchant Legal Verification
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Mọi thương nhân bắt buộc phải nộp hồ sơ định danh hợp lệ bao gồm: Số định danh cá nhân (CCCD/Passport) hoặc Mã số thuế doanh nghiệp (Tax ID), Họ tên người đại diện pháp luật, Địa chỉ trụ sở/kho hàng, và Số tài khoản ngân hàng chính chủ.
- Hồ sơ phải ở trạng thái `APPROVED` bởi Platform Admin trước khi gian hàng có thể đăng tải sản phẩm hoặc mở bán.

### KYC-002: Profile Mutation Re-approval Lock
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Khi thương nhân thay đổi bất kỳ trường thông tin nhạy cảm nào (Bao gồm: Mã số thuế, Tên doanh nghiệp/Chủ sở hữu, Số tài khoản ngân hàng thụ hưởng), hệ thống tự động:
  1. Chuyển trạng thái thông tin sang `PENDING_REAPPROVAL`.
  2. Tạm dừng tính năng Rút tiền (`POL-15`) đối với tài khoản thụ hưởng mới cho đến khi Admin phê duyệt.
  3. Duy trì hoạt động bán hàng hiện tại trừ khi có nghi vấn gian lận nghiêm trọng.

### KYC-003: Onboarding Verification SLA
- **Rule Status**: `PROPOSED`
- **Evidence Status**: `NOT_VERIFIED`
- Platform Admin có trách nhiệm xử lý thẩm định hồ sơ KYC trong thời hạn tối đa 48 giờ làm việc kể từ thời điểm tiếp nhận đủ hồ sơ.

## 7. State Machine
```
[DRAFT] --> [SUBMITTED] --> [UNDER_REVIEW]
                                 |
        +------------------------+------------------------+
        |                                                 |
        v                                                 v
   [APPROVED]                                        [REJECTED]
        |                                                 |
   (Active Store)                                  (Resubmit Allowed)
        |
   (Edit Legal Info)
        |
        v
[PENDING_REAPPROVAL] --> [APPROVED] / [SUSPENDED]
```

## 8. Validation Rules
- **CCCD/Passport**: Định dạng 12 chữ số hợp lệ theo chuẩn Bộ Công An hoặc định dạng hộ chiếu quốc tế.
- **Mã số thuế (Tax ID)**: 10 chữ số (doanh nghiệp/hộ kinh doanh) hoặc 13 chữ số (chi nhánh).
- **Tên gian hàng (Store Name)**: Duy nhất trên toàn sàn, độ dài từ 3 - 50 ký tự, không chứa từ khóa vi phạm thuần phong mỹ tục hoặc mạo danh thương hiệu được bảo hộ.
- **Tài khoản ngân hàng**: Trùng khớp tên chủ tài khoản với tên đại diện pháp lý trên CCCD/ĐKKD.

## 9. Financial Impact
- **Impact Level**: `NOT_DIRECT`
- Chính sách này không trực tiếp thu/chi tiền nhưng là điều kiện tiên quyết kích hoạt ví thanh toán (`POL-15`) và dòng tiền thanh quyết toán Escrow (`POL-14`).

## 10. Edge Cases
- **EC-001**: Thương nhân nộp hồ sơ trùng CCCD/Tax ID với gian hàng đang bị cấm vĩnh viễn (`POL-16`). Hệ thống tự động từ chối.
- **EC-002**: Merchant gửi yêu cầu rút tiền trong khi đang ở trạng thái `PENDING_REAPPROVAL`. Lệnh rút tiền bị phong tỏa cho đến khi Admin tái xác nhận.

## 11. Security & Fraud
- Mã hóa dữ liệu CCCD/Mã số thuế trong cơ sở dữ liệu (Encryption at Rest).
- Ghi log bất biến (Immutable Audit Log) toàn bộ lịch sử thay đổi thông tin pháp lý của gian hàng và ID của Admin phê duyệt.

## 12. SLA / Timing
- **Hạn thời gian thẩm định (Proposed)**: 48 giờ làm việc (`DEC-006` context).
- **Thời gian khóa rút tiền khi đổi thông tin**: 24 giờ kể từ thời điểm Admin duyệt thay đổi tài khoản ngân hàng.

## 13. Notifications
- Gửi Email và Webhook thông báo khi hồ sơ KYC được duyệt (`STORE_KYC_APPROVED`).
- Gửi thông báo kèm lý do chi tiết khi hồ sơ bị từ chối (`STORE_KYC_REJECTED`).
- Cảnh báo bảo mật khi phát hiện đăng nhập lạ trong giai đoạn cập nhật hồ sơ pháp lý.

## 14. Audit & Compliance
- Tuân thủ Nghị định 52/2013/NĐ-CP và Nghị định 85/2021/NĐ-CP về quản lý hoạt động sàn giao dịch thương mại điện tử.
- Lưu trữ hồ sơ định danh thương nhân tối thiểu 5 năm theo quy định thanh tra.

## 15. Dependencies
- **Upstream**: Tầng Identity Core (`AUTH-001` - Xác thực người dùng).
- **Downstream**: `POL-02` (Staff RBAC), `POL-03` (Catalog), `POL-14` (Settlement), `POL-15` (Seller Wallet).

## 16. Canonical Source
- **Legacy Policy**: POL-01 (Merchant KYC Onboarding), POL-02 (Store Profile Mutation).
- **Business Flows**: `res-flow-1.md` (Merchant Onboarding), `res-flow-2.md` (Profile Update).
- **Engineering Phase**: `PHASE-01-SELLER-ONBOARDING.md`.
- **Source Modules**: `platform/src/modules/seller/`, `platform/src/modules/admin/`.

## 17. Related Flows
- `res-flow-1.md`: Quy trình tiếp nhận hồ sơ đăng ký thương nhân.
- `res-flow-2.md`: Quy trình cập nhật thông tin và thẩm duyệt lại.

## 18. Related Engineering Phases
- `PHASE-01-SELLER-ONBOARDING.md`: Triển khai UI đăng ký Seller, upload giấy tờ KYC và Admin Review Portal.

## 19. Open Decisions
- **GAP-007**: Cơ chế thông báo real-time qua SMS/Zalo ZNS khi hồ sơ KYC bị từ chối (`Status: DECISION_REQUIRED`).

## 20. Change History
- **Version**: 1.0
- **Status**: CANONICAL DOCUMENT CREATED
- **Source**: CANONICAL POLICY ID MAP v1.1
