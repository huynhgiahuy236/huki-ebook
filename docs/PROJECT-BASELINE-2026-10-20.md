# HUKI Project Baseline — 2026-10-20

## Phạm vi

Báo cáo này khóa trạng thái kỹ thuật trước khi bắt đầu kế hoạch ổn định dự án. Không có logic sản phẩm nào được thay đổi trong quá trình lập baseline.

## Điểm tham chiếu

- Branch: `develop`
- Commit: `b4d747eb910cf90ba0307c742e4ae13cc067be16`
- Commit gần nhất: `b4d747e feat: implement flash sales module, analytics services, and comprehensive admin and seller views`
- Working tree trước khi tạo tài liệu: sạch.
- File chưa được Git theo dõi sau khi bắt đầu roadmap: `task/PROJECT-STABILIZATION-ROADMAP.md`.

Các lỗi bên dưới đều tái hiện trên code đã commit, không phải thay đổi logic chưa commit trong working tree.

## Kết quả kiểm tra

| Kiểm tra | Kết quả | Trạng thái |
|---|---:|---:|
| Backend build | Toàn bộ shared library và 8 service build thành công | PASS |
| Backend unit test | 53/60 suite; 572/594 test pass | FAIL |
| Frontend typecheck | 12 lỗi TypeScript tại 4 file | FAIL |
| Frontend lint | 1.661 error; 423 warning | FAIL |
| Frontend automated test | Không có test suite trong source hiện tại | MISSING |
| Mobile | Chỉ có `.gitkeep` | NOT IMPLEMENTED |

### Lệnh đã chạy

```text
cd platform && npm.cmd run build
cd platform && npm.cmd test -- --runInBand --silent
cd web && npm.cmd run typecheck
cd web && npm.cmd run lint
```

## Lỗi chặn frontend compile

Tất cả bốn file dưới đây được thay đổi gần nhất tại commit `b4d747e`.

| File | Nhóm lỗi | Phân loại ban đầu |
|---|---|---|
| `AdminReportsView.tsx` | Không tìm thấy `PlatformGmvTimelineItem` | Implementation/import thiếu |
| `ConversionAndCategoryView.tsx` | `summaryRow` không tồn tại trong props | Contract component không đồng bộ |
| `SellerGroupedOrderTable.tsx` | `summaryRow` không tồn tại trong props | Contract component không đồng bộ |
| `SellerPayoutGroupedTable.tsx` | Trộn status code với nhãn; sai `bankBranch`/`branch`; `summaryRow` | Model/UI contract không đồng bộ |

Kết luận: đây là lỗi implementation đã được commit và là phạm vi trực tiếp của Bước 2.

## Backend test failures

### Wallet và PIN — 10 test fail

- `wallet.service.spec.ts`: 7 lỗi do Prisma mock thiếu `wallet.findMany` sau khi service mở rộng cách tìm wallet.
- `wallet-security.service.spec.ts`: 3 lỗi.
  - Một test yêu cầu không được ghi đè PIN nhưng implementation hiện cho phép.
  - Hai test dùng PIN `654321`, trong khi implementation mới xem đây là PIN yếu.

Phân loại:

- Prisma errors: test/mock chưa theo kịp implementation.
- Ghi đè PIN và thứ tự validate 2FA/PIN yếu: chênh lệch logic/policy, phải xác minh policy trước khi sửa.

### Voucher và flash sale — 7 test fail

- Voucher: 5 lỗi do mock thiếu `userSavedVoucher.findUnique` sau khi thêm mandatory-claim rule.
- Flash sale: 2 lỗi vì mock không trả mảng cho query platform sales mới, dẫn tới `pendingPlatformSales is not iterable`.

Phân loại ban đầu: mock/test chưa theo kịp implementation. Vẫn cần bổ sung defensive handling cho kết quả repository không hợp lệ nếu adapter có khả năng trả `undefined`.

### Community — 5 test fail

- Review: 2 lỗi.
  - Test mong `PENDING_REVIEW`, implementation lưu `PUBLISHED`.
  - Purchase-verification mock/flow không còn khớp service.
- Chat: 1 lỗi ở luồng tạo conversation rồi gửi tin đầu tiên; repository mock không trả conversation vừa tạo.
- Notification: 2 lỗi do broadcast query/read model mới nhưng mock và expectation vẫn là notification cá nhân cũ.

Phân loại:

- Chat và một phần notification: mock/test chưa theo kịp implementation.
- Review status: chênh lệch policy thật, phải quyết định moderation workflow trước khi sửa.

## Mức độ ưu tiên

### P0 — Chặn phát hành hoặc có rủi ro an toàn

- Backend test đỏ ở wallet, PIN, voucher, flash sale và review.
- Client có thể gửi internal identity headers trong khi Gateway chưa chủ động xóa header đầu vào.
- Một số microservice tin `x-user-id`, `x-user-role` hoặc `x-business-id`.
- Next.js rewrite gọi thẳng microservice, có khả năng bypass Gateway policy.
- JWT có secret fallback đoán được nếu production thiếu cấu hình.
- Refresh token được lưu trong `localStorage` và cookie đọc được bằng JavaScript.
- CI deploy backend không chạy test và bỏ qua lỗi migration bằng `prisma:migrate:deploy || true`.

### P1 — Chặn beta ổn định

- Frontend không qua typecheck.
- Frontend chưa có automated test.
- Nhiều trạng thái nghiệp vụ nhạy cảm nằm trong `localStorage`.
- Onboarding bỏ qua lỗi lưu server và vẫn redirect/báo thành công.
- Lint có 2.084 vấn đề; một phần đến từ script cũ, phần còn lại nằm trong application source.
- Docker Compose chỉ dựng infrastructure, chưa đóng gói application services.

### P2 — Nợ kỹ thuật và vận hành

- Observability có config rời nhưng chưa được chứng minh end-to-end trong pipeline deploy.
- Tài liệu mô tả mobile app nhưng implementation mới là placeholder.
- Một số service gọi nhau bằng URL/credential localhost fallback hard-code.
- Không có staging, rollback tự động hoặc restore drill được ghi nhận trong CI/CD.

## Phân loại nguồn lỗi

| Loại | Kết luận |
|---|---|
| Thay đổi logic chưa commit | Không có tại thời điểm khóa baseline |
| Lỗi đã được commit | Có; toàn bộ lỗi typecheck/test hiện tại thuộc baseline commit history |
| Test/mock chưa cập nhật | Có; wallet Prisma mock, voucher, flash sale, chat, notification |
| Logic/policy cần sửa hoặc xác minh | Có; PIN overwrite, validation order, review moderation status |
| Thiếu hàng rào chất lượng | Có; frontend tests và CI quality gates |

## Các cổng đang chặn

- Frontend build/release bị chặn bởi TypeScript errors.
- Backend release an toàn bị chặn bởi 22 test failures.
- Production release bị chặn bởi auth boundary, token storage và CI không có quality gate.
- Mobile release chưa thuộc phạm vi vì chưa có implementation.

## Quyết định cho bước tiếp theo

Bước tiếp theo được phép thực hiện theo roadmap là **Bước 2 — Làm frontend typecheck xanh**. Không xử lý test backend hoặc security trong cùng bước để giữ phạm vi thay đổi nhỏ và có thể kiểm chứng.

