# POL-04 — DRM & Digital Content Protection Policy

## 1. Purpose
Quy định cơ chế quản lý quyền kỹ thuật số (Digital Rights Management - DRM), bảo vệ bản quyền sách điện tử (Ebook), kiểm soát đọc thử miễn phí (Sample Preview), đóng dấu thủy vân động (Dynamic Canvas Watermarking) và hạn chế số lượng thiết bị truy cập đồng thời nhằm ngăn ngừa chia sẻ tài khoản hoặc sao chép lậu nội dung.

## 2. Scope
- Áp dụng cho toàn bộ các sản phẩm sách điện tử (`EBOOK`) và thành phần ebook trong gói `COMBO` trên nền tảng HUKI EBOOK.
- Áp dụng cho trải nghiệm đọc trên Web Reader (HTML5 Canvas) và Mobile Reader App.
- Không áp dụng cho các sản phẩm sách giấy vật lý (`PHYSICAL`).

## 3. Actors
- **Ebook Reader / Customer**: Người dùng đọc thử hoặc người mua đã sở hữu bản quyền đọc ebook.
- **Publisher / Author**: Chủ sở hữu tác quyền nội dung số.
- **DRM Encryption Service**: Dịch vụ mã hóa và cấp phép phân phối nội dung số.
- **Client Reader Application**: Ứng dụng đọc sách chuyên dụng có tích hợp cơ chế chống ghi hình và hiển thị Canvas.

## 4. Definitions
- **DRM (Digital Rights Management)**: Tập hợp các biện pháp kỹ thuật và mã hóa nhằm kiểm soát việc sử dụng, sửa đổi và phân phối tác phẩm số.
- **Dynamic Canvas Watermark**: Kỹ thuật vẽ mờ thông tin nhận diện người dùng (User ID, Masked Email, Timestamp) trực tiếp lên nền Canvas hiển thị văn bản với độ mờ được tính toán để không cản trở việc đọc nhưng ngăn chặn chụp ảnh màn hình phát tán.
- **Device Fingerprint**: Chuỗi định danh thiết bị duy nhất dựa trên phần cứng và thông tin trình duyệt.

## 5. Preconditions
- Sản phẩm Ebook đã được phê duyệt xuất bản trong Catalog (`POL-03`).
- Người dùng đã đăng nhập tài khoản Huki hợp lệ (`AUTH-001`).

## 6. Business Rules

### DRM-001: Sample Preview Threshold
- **Rule Status**: `IMPLEMENTED`
- **Evidence Status**: `PASS`
- Người dùng chưa mua sách được phép đọc thử một phần nội dung mẫu (Sample Preview).
- Tỷ lệ đọc thử được giới hạn trong khoảng từ **10% đến 20%** tổng số trang của sách (do Merchant/Publisher cấu hình tại thời điểm đăng tải theo `POL-03`).
- Khi người dùng đọc đến trang giới hạn, hệ thống tự động khóa hiển thị trang tiếp theo và hiển thị hộp thoại kêu gọi mua bản quyền đầy đủ (Call-To-Action Checkout).

### DRM-002: Dynamic Canvas Watermarking
- **Rule Status**: `IMPLEMENTED`
- **Evidence Status**: `PASS`
- Mọi trang sách render trên Web Reader hoặc Mobile App bắt buộc phải hiển thị lớp phủ Watermark động được vẽ trực tiếp qua HTML5 Canvas API.
- Nội dung Watermark bao gồm: `HUKI - [User_ID] - [Masked_Phone_or_Email] - [Current_UTC_Timestamp]`.
- Watermark được phân bổ theo góc nghiêng $30^\circ$ hoặc $45^\circ$, độ trong suốt (opacity) từ $0.08$ đến $0.15$ và tự động thay đổi vị trí ngẫu nhiên theo từng phiên làm việc để chống thuật toán xóa watermark tự động.

### DRM-003: Active Device Limitation
- **Rule Status**: `PROPOSED`
- **Evidence Status**: `NOT_VERIFIED`
- Một tài khoản mua sách điện tử được kích hoạt và đồng bộ dữ liệu đọc trên tối đa **3 đến 5 thiết bị** đồng thời (Đang chờ phê duyệt chính thức theo `DEC-007`).
- Khi đăng nhập trên thiết bị thứ $N+1$, hệ thống bắt buộc người dùng chọn hủy kích hoạt (De-authorize) một trong các thiết bị cũ trước khi được phép tải/đọc sách.

## 7. State Machine
```
[GUEST / TRIAL] --> [READING_SAMPLE] (DRM-001: Max 20%)
                           |
                     (Reach Limit)
                           |
                           v
               [SAMPLE_LIMIT_REACHED] --> (Checkout / Purchase)
                                                 |
                                                 v
[OWNER] <-------------------------------+ [ORDER_PAID] (POL-08)
   |
   +---> [DEVICE_SESSION_VALID] (DRM-002: Watermark Rendered)
   |
   +---> [DEVICE_QUOTA_EXCEEDED] (DRM-003: De-authorize Required)
```

## 8. Validation Rules
- Tỷ lệ đọc thử không được vượt quá 30% tổng số chương/trang của ấn bản.
- Token giải mã từng trang sách (Page Decryption Token) có thời gian sống (TTL) không quá 10 phút và gắn liền với Session ID hiện tại của Client.

## 9. Financial Impact
- **Impact Level**: `NOT_DIRECT`
- Bảo vệ doanh thu của Publisher và Merchant khỏi tình trạng vi phạm bản quyền và chia sẻ tài khoản lậu.

## 10. Edge Cases
- **EC-001**: Người dùng cố tình tắt JavaScript hoặc can thiệp DOM để xóa Watermark. Canvas Reader phát hiện trạng thái DOM bị sửa đổi và tự động xóa bộ nhớ đệm trang sách (`Memory Purge`), chuyển sang màn hình lỗi `DRM_VIOLATION`.
- **EC-002**: Đơn hàng mua sách Ebook bị hoàn tiền do tranh chấp (`POL-11` / `POL-12`). Quyền truy cập DRM của tài khoản đối với cuốn sách đó lập tức bị thu hồi (`REVOKED`).

## 11. Security & Fraud
- Mã hóa luồng dữ liệu truyền tải (AES-GCM-256) từ Content Delivery Network (CDN) tới thiết bị người dùng.
- Vô hiệu hóa tính năng Copy Text, Select Text, Right-click và Print trên giao diện Web Reader.

## 12. SLA / Timing
- Thời gian tạo link đọc thử: $\le 500\text{ms}$.
- Thời gian thu hồi quyền đọc khi hủy đơn/hoàn tiền: $\le 10$ giây.

## 13. Notifications
- Thông báo cho người dùng khi có thiết bị mới đăng nhập vào tài khoản đọc sách.
- Cảnh báo khi tài khoản đạt ngưỡng giới hạn thiết bị tối đa.

## 14. Audit & Compliance
- Ghi nhật ký phân phối bản quyền (License Issuance Log) phục vụ đối soát với Cục Bản quyền tác giả và Nhà xuất bản.

## 15. Dependencies
- **Upstream**: `POL-03` (Catalog Ebook Metadata), `POL-07` (Order Splitting), `POL-08` (Payment Completed).
- **Downstream**: `POL-11` (RMA Revocation), `POL-16` (Moderation & Piracy Sanctions).

## 16. Canonical Source
- **Legacy Policy**: POL-05 (Sample Preview Limit), POL-06 (Watermark Forensics), POL-07 (Device Limit).
- **Business Flows**: `res-flow-5.md` (Ebook Reader & DRM Protection).
- **Engineering Phase**: `PHASE-06-EBOOK-DRM.md`.
- **Source Modules**: `ebook/src/reader/`, `ebook/src/drm/`, `web/src/components/reader/`.

## 17. Related Flows
- `res-flow-5.md`: Luồng mở sách đọc thử và đọc toàn bộ sau khi thanh toán.

## 18. Related Engineering Phases
- `PHASE-06-EBOOK-DRM.md`: Triển khai Canvas Web Reader, Watermark Engine và Device Manager.

## 19. Open Decisions
- **DEC-007**: Quyết định hạn mức số thiết bị kích hoạt đọc đồng thời (Option A: 3 thiết bị vs Option B: 5 thiết bị) (`Status: DECISION_REQUIRED`).

## 20. Change History
- **Version**: 1.0
- **Status**: CANONICAL DOCUMENT CREATED
- **Source**: CANONICAL POLICY ID MAP v1.1
