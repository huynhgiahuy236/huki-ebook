# POL-02 — Staff RBAC & Merchant Security Policy

## 1. Purpose
Quy định cơ chế phân quyền dựa trên vai trò (Role-Based Access Control - RBAC), phân định giới hạn quyền hạn nhân viên gian hàng (Merchant Staff), kiểm soát truy cập quản trị sàn (Platform Admin) và bảo đảm an ninh phiên làm việc khi có biến động quyền hạn.

## 2. Scope
- Áp dụng cho các tài khoản nhân viên của gian hàng (Merchant Staff) và tài khoản quản trị viên nền tảng (Platform Staff/Admin).
- Không áp dụng cho việc ủy quyền người mua cuối (Customer Profile).

## 3. Actors
- **Store Owner (Merchant Primary)**: Chủ sở hữu hợp pháp của gian hàng có toàn quyền quản trị.
- **Store Staff**: Nhân viên được chủ gian hàng mời và gán quyền thao tác phân đoạn.
- **Platform Super Admin**: Quản trị viên tối cao của sàn.
- **Platform Support / Operations Staff**: Nhân viên vận hành sàn theo nhóm quyền chỉ định.

## 4. Definitions
- **Bitmask Permissions**: Hệ thống mã hóa quyền hạn bằng bit nhị phân (13-bit) cho phép kiểm tra quyền với hiệu năng cao và độ trễ cực thấp.
- **Session Revocation**: Hành động hủy bỏ ngay lập tức tính hiệu lực của token đăng nhập/phiên làm việc khi có thay đổi quyền hoặc tài khoản bị vô hiệu hóa.

## 5. Preconditions
- Chủ gian hàng đã hoàn thành KYC hợp lệ (`POL-01`).
- Nhân viên được mời đã có tài khoản định danh trên nền tảng (`AUTH-001`).

## 6. Business Rules

### RBAC-001: 13-Bit Permission Bitmask Matrix
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Quyền hạn của nhân viên gian hàng được định nghĩa theo cấu trúc bitmask 13-bit:
  - `BIT 0 (1)`: Read Products (Xem sản phẩm)
  - `BIT 1 (2)`: Write Products (Thêm/Sửa sản phẩm)
  - `BIT 2 (4)`: Delete Products (Xóa sản phẩm)
  - `BIT 3 (8)`: View Orders (Xem danh sách đơn hàng)
  - `BIT 4 (16)`: Process Fulfillment (Đóng gói/Giao đơn cho ĐVVC)
  - `BIT 5 (32)`: Handle Returns/RMA (Xử lý khiếu nại trả hàng)
  - `BIT 6 (64)`: View Analytics (Xem báo cáo doanh số)
  - `BIT 7 (128)`: Manage Promotions (Tạo mã giảm giá shop)
  - `BIT 8 (256)`: View Financial Wallet (Xem số dư ví)
  - `BIT 9 (512)`: Request Payout / Withdraw (Tạo lệnh rút tiền - Chỉ Store Owner)
  - `BIT 10 (1024)`: Manage Store Staff (Thêm/Xóa nhân viên)
  - `BIT 11 (2048)`: Manage Store Settings (Đổi thông tin shop)
  - `BIT 12 (4096)`: Direct Customer Chat / Support (Chat với khách hàng)
- Nhân viên thông thường không bao giờ được cấp `BIT 9` (Rút tiền) trừ khi có văn bản ủy quyền pháp lý được Admin xác nhận.

### RBAC-002: Merchant Staff Account Quota
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Một gian hàng tiêu chuẩn được tạo tối đa 5 tài khoản nhân viên (Store Staff). Việc mở rộng hạn mức yêu cầu nâng cấp gói đối tác doanh nghiệp.

### SEC-001: Real-time Session Invalidation
- **Rule Status**: `CANONICAL`
- **Evidence Status**: `PASS`
- Khi Store Owner thu hồi quyền, sửa bitmask hoặc xóa một tài khoản Staff, hệ thống bắt buộc gửi tín hiệu xóa session (Redis Blacklist Token) khiến token của nhân viên đó mất hiệu lực trong vòng tối đa 5 giây.

## 7. State Machine
```
[INVITED] --> [ACCEPTED] --> [ACTIVE]
                                |
        +-----------------------+-----------------------+
        |                                               |
        v                                               v
[PERMISSIONS_UPDATED]                             [REVOKED / DELETED]
        |                                               |
(Invalidate Session)                             (Blacklist Token)
```

## 8. Validation Rules
- Email mời nhân viên không được trùng với Email của Store Owner hoặc tài khoản đang là chủ sở hữu gian hàng khác.
- Lời mời tham gia quản trị gian hàng có thời hạn hiệu lực 72 giờ kể từ thời điểm khởi tạo.

## 9. Financial Impact
- **Impact Level**: `NOT_DIRECT`
- Ngăn chặn triệt để rủi ro nhân viên gian hàng tự ý rút tiền hoặc chỉnh sửa giá sản phẩm gây thất thoát tài chính.

## 10. Edge Cases
- **EC-001**: Nhân viên đang trong tiến trình xác nhận đóng hàng thì bị Store Owner thu hồi quyền. Request kế tiếp lập tức bị trả về lỗi `403 Forbidden` và điều hướng về trang đăng nhập.
- **EC-002**: Store Owner bị khóa tài khoản do vi phạm chính sách (`POL-16`). Toàn bộ tài khoản Staff của gian hàng đó lập tức bị vô hiệu hóa truy cập.

## 11. Security & Fraud
- Bắt buộc kích hoạt xác thực hai yếu tố (2FA / OTP) cho mọi tài khoản có quyền truy cập thông tin tài chính hoặc quản trị nhân sự (`BIT 8`, `BIT 9`, `BIT 10`).
- Ghi nhật ký IP, User-Agent và timestamp đối với mọi thao tác thay đổi quyền hạn.

## 12. SLA / Timing
- Thời gian vô hiệu hóa token khi thay đổi quyền: $\le 5$ giây.
- Thời gian hết hạn lời mời nhân viên: 72 giờ.

## 13. Notifications
- Gửi email thông báo cho nhân viên khi được phân quyền hoặc thay đổi vai trò.
- Gửi cảnh báo tức thì cho Store Owner khi phát hiện nhân viên cố tình truy cập khu vực cấm quá 3 lần liên tiếp.

## 14. Audit & Compliance
- Lưu vết toàn bộ lịch sử truy cập và phân quyền (Access Audit Trail) trong tối thiểu 12 tháng.

## 15. Dependencies
- **Upstream**: `AUTH-001` (Identity), `POL-01` (Merchant Profile).
- **Downstream**: Tất cả các Policy quản trị nghiệp vụ (`POL-03` đến `POL-17`).

## 16. Canonical Source
- **Legacy Policy**: POL-03 (Staff RBAC Management).
- **Business Flows**: `res-flow-3.md` (Staff Invitation & Permission Grant).
- **Engineering Phase**: `PHASE-01-SELLER-ONBOARDING.md`.
- **Source Modules**: `platform/src/modules/auth/guards/`, `platform/src/modules/seller/staff/`.

## 17. Related Flows
- `res-flow-3.md`: Luồng mời nhân viên và quản lý ma trận quyền hạn.

## 18. Related Engineering Phases
- `PHASE-01-SELLER-ONBOARDING.md`: Triển khai RBAC Middleware và UI quản lý nhân viên gian hàng.

## 19. Open Decisions
- **None**: Cấu trúc 13-bit mask đã được chuẩn hóa và kiểm chứng trên hệ thống.

## 20. Change History
- **Version**: 1.0
- **Status**: CANONICAL DOCUMENT CREATED
- **Source**: CANONICAL POLICY ID MAP v1.1
