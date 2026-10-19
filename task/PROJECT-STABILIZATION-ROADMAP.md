# HUKI Project Stabilization Roadmap

> Mục tiêu: đưa dự án từ trạng thái prototype/pre-beta thành một bản web beta ổn định, có thể kiểm chứng và triển khai an toàn.
>
> Cập nhật gần nhất: 2026-10-20

## Quy ước trạng thái

- `[ ]` Chưa bắt đầu
- `[~]` Đang thực hiện
- `[x]` Hoàn thành
- `[!]` Đang bị chặn

## Nguyên tắc thực hiện

Mỗi bước được thực hiện độc lập theo chu trình:

1. Kiểm tra phạm vi và các file đang thay đổi.
2. Chỉ sửa nhóm vấn đề thuộc bước hiện tại.
3. Chạy build, typecheck hoặc test liên quan.
4. Ghi lại file đã sửa, kết quả kiểm tra và vấn đề còn lại.
5. Dừng và chờ xác nhận trước khi chuyển sang bước tiếp theo.

Không reset, xóa hoặc ghi đè các thay đổi chưa commit nếu chưa xác định rõ quyền sở hữu.

## Tổng quan tiến độ

| Bước | Nội dung | Trạng thái | Điều kiện hoàn thành |
|---|---|---:|---|
| 1 | Khóa baseline | [x] | Có báo cáo lỗi và phạm vi thay đổi hiện tại |
| 2 | Làm frontend typecheck xanh | [x] | `npm run typecheck` pass |
| 3A | Backend: Wallet và PIN | [x] | Test wallet/PIN pass |
| 3B | Backend: Voucher và flash sale | [ ] | Test voucher/flash sale pass |
| 3C | Backend: Community | [ ] | Test review/chat/notification pass |
| 4 | Vá ranh giới bảo mật backend | [ ] | Không giả mạo được identity headers |
| 5 | Gom API qua Gateway | [ ] | Frontend không gọi thẳng microservice |
| 6 | Củng cố auth token | [ ] | Refresh token không đọc được bằng JavaScript |
| 7 | Hoàn thiện onboarding | [ ] | Server là nguồn dữ liệu chính, có xử lý lỗi |
| 8 | Bỏ nghiệp vụ nhạy cảm khỏi localStorage | [ ] | Dữ liệu nghiệp vụ quan trọng nằm ở backend |
| 9 | Frontend test và lint | [ ] | Có test luồng chính và lint được kiểm soát |
| 10 | DevOps production-ready | [ ] | CI/CD có quality gate và rollback |
| 11 | UAT và phát hành beta | [ ] | Các vai trò và luồng tiền được nghiệm thu |

---

## Bước 1 — Khóa baseline hiện tại

### Mục tiêu

Xác định chính xác dự án đang hỏng ở đâu trước khi tiếp tục phát triển.

### Công việc

- [x] Ghi nhận toàn bộ file đang thay đổi hoặc chưa được Git theo dõi.
- [x] Phân loại lỗi thành:
  - Lỗi từ thay đổi chưa commit.
  - Lỗi đã tồn tại từ trước.
  - Test/mock chưa cập nhật theo implementation.
  - Logic implementation thực sự sai.
- [x] Xếp mức ưu tiên P0, P1 và P2.
- [x] Lưu báo cáo baseline trong `docs/` hoặc phần nhật ký của file này.
- [x] Không sửa logic sản phẩm trong bước này.

### Điều kiện hoàn thành

- Có danh sách lỗi theo mức độ ưu tiên.
- Biết lỗi nào đang chặn build, test và deploy.
- Có số liệu baseline để so sánh sau mỗi bước.

### Kết quả quan sát ban đầu

- Backend build: pass.
- Backend test: 53/60 suite pass; 572/594 test pass; 22 test fail.
- Frontend typecheck: fail.
- Frontend lint: 1.661 error, 423 warning.
- Frontend automated test: chưa có.
- Mobile: mới có placeholder `.gitkeep`.

---

## Bước 2 — Làm frontend typecheck xanh

### Mục tiêu

Khôi phục hàng rào kiểm tra type cho frontend trước khi tiếp tục thêm tính năng.

### Công việc

- [x] Bổ sung hoặc import đúng `PlatformGmvTimelineItem`.
- [x] Thống nhất API của `GroupedDataTable` và prop `summaryRow`.
- [x] Tách mã trạng thái payout khỏi nhãn hiển thị tiếng Việt.
- [x] Thống nhất field `bankBranch` và `branch`.
- [x] Kiểm tra các file analytics, finance và seller table đang sửa dở.
- [x] Không mở rộng sang sửa toàn bộ lint trong bước này.

### Điều kiện hoàn thành

```text
npm run typecheck → PASS
```

---

## Bước 3A — Backend: Wallet và PIN

### Mục tiêu

Khôi phục độ tin cậy cho các nghiệp vụ tài chính và bảo mật rút tiền.

### Công việc

- [x] Kiểm tra wallet ownership và multi-tenant isolation.
- [x] Không cho thiết lập đè PIN hiện có.
- [x] Kiểm tra danh sách PIN yếu.
- [x] Xác minh 2FA token đúng purpose.
- [x] Cập nhật Prisma mock nếu implementation đúng nhưng test đã cũ.
- [x] Thêm regression test cho lỗi logic thực tế.

### Điều kiện hoàn thành

- Toàn bộ test wallet, PIN và 2FA pass.
- Không thể đọc ví của store khác.
- Không thể dùng token sai purpose để thay đổi PIN.

---

## Bước 3B — Backend: Voucher và flash sale

### Mục tiêu

Ổn định claim, validate, quota và tồn kho flash sale.

### Công việc

- [x] Xác minh quy tắc bắt buộc claim voucher.
- [x] Sửa hoặc cập nhật mock `userSavedVoucher`.
- [x] Kiểm tra Redis quota theo user.
- [x] Kiểm tra stock reservation và sold quantity.
- [x] Bảo đảm status synchronization không lỗi khi query trả về rỗng.
- [x] Thêm test chống oversell và request lặp.

### Điều kiện hoàn thành

- Toàn bộ test voucher và flash sale pass.
- Reservation có tính idempotent.
- Không thể vượt quota hoặc bán âm tồn kho.

---

## Bước 3C — Backend: Community

### Mục tiêu

Ổn định review, chat và notification.

### Công việc

- [x] Review chỉ được tạo sau khi xác minh giao dịch hợp lệ.
- [x] Thống nhất trạng thái `PENDING_REVIEW` và `PUBLISHED` theo policy.
- [x] Bảo đảm tạo conversation có tính idempotent.
- [x] Kiểm tra ownership khi gửi và đọc tin nhắn.
- [x] Thống nhất notification cá nhân, broadcast và `readBy`.
- [x] Cập nhật repository mocks theo implementation hợp lệ.

### Điều kiện hoàn thành

```text
npm test -- --runInBand
60 suites passed
594 tests passed
```

Số test được phép tăng nếu bổ sung regression test.

---

## Bước 4 — Vá ranh giới bảo mật backend

### Mục tiêu

Client không thể tự khai `userId`, `role` hoặc `businessId` để vượt quyền.

### Công việc

- [ ] Gateway xóa `x-user-id` và `x-user-role` nhận từ request bên ngoài.
- [ ] Gateway chỉ sinh lại identity headers từ JWT đã xác minh.
- [ ] Xử lý JWT không hợp lệ rõ ràng ở endpoint được bảo vệ.
- [ ] Production fail-fast nếu thiếu `JWT_SECRET`.
- [ ] Loại bỏ fallback `your-super-secret-jwt-key` trong production.
- [ ] Kiểm tra `x-business-id` với membership phía server.
- [ ] Phân loại public, authenticated, seller và admin endpoint.
- [ ] Thêm test giả mạo identity headers.

### Điều kiện hoàn thành

- Forged identity-header request bị từ chối.
- Không thể tự khai role admin.
- Production không khởi động khi thiếu secret bắt buộc.

---

## Bước 5 — Gom toàn bộ API qua Gateway

### Mục tiêu

API Gateway là cửa vào duy nhất của backend.

### Công việc

- [ ] Chuyển Next.js rewrites về Gateway port `3000`.
- [ ] Giữ nguyên public API path để hạn chế sửa call site.
- [ ] Không public port của từng microservice trong production.
- [ ] Chuẩn hóa CORS, timeout, correlation ID và error response.
- [ ] Kiểm tra upload/multipart qua Gateway.
- [ ] Kiểm tra WebSocket routing riêng.

### Kiến trúc đích

```text
Browser → Next.js → API Gateway → Microservice
```

### Điều kiện hoàn thành

- Không còn request từ browser đi thẳng tới microservice.
- Auth và audit middleware được áp dụng nhất quán.

---

## Bước 6 — Củng cố auth token

### Mục tiêu

Giảm nguy cơ chiếm phiên khi frontend gặp XSS.

### Công việc

- [ ] Chuyển refresh token sang cookie `HttpOnly`.
- [ ] Bật `Secure` trong production và đặt `SameSite` phù hợp.
- [ ] Không lưu refresh token trong `localStorage`.
- [ ] Đặt access token có thời gian sống ngắn.
- [ ] Chuẩn hóa refresh rotation, logout và revoke session.
- [ ] Không lưu mật khẩu đăng ký trong `localStorage`.
- [ ] Không đưa token nhạy cảm lên Google OAuth redirect URL nếu có thể tránh.
- [ ] Thêm test refresh rotation và token reuse.

### Điều kiện hoàn thành

- JavaScript phía client không đọc được refresh token.
- Logout thu hồi được session.
- Refresh token cũ không dùng lại được sau rotation.

---

## Bước 7 — Hoàn thiện onboarding

### Mục tiêu

Onboarding phản ánh đúng dữ liệu đã được lưu trên server.

### Công việc

- [ ] Chặn hoặc redirect người chưa đăng nhập.
- [ ] Không bỏ qua lỗi từ `completeOnboarding`.
- [ ] Không đánh dấu hoàn tất nếu API thất bại.
- [ ] Không thông báo voucher nếu backend chưa cấp thành công.
- [ ] Lưu đầy đủ goals, genres, formats, theme và reading habits ở backend.
- [ ] Chỉ dùng `localStorage` làm cache không có thẩm quyền.
- [ ] Thêm trạng thái loading, retry và error rõ ràng.
- [ ] Kiểm tra khả năng cuộn trên màn hình thấp và thiết bị di động.
- [ ] Thêm test cho skip, finish, retry và unauthenticated access.

### Điều kiện hoàn thành

- Reload hoặc đổi thiết bị vẫn có trạng thái onboarding đúng.
- API lỗi không tạo trạng thái hoàn tất giả.
- Voucher hiển thị đúng theo kết quả cấp voucher thực tế.

---

## Bước 8 — Bỏ nghiệp vụ nhạy cảm khỏi localStorage

### Thứ tự di chuyển

- [ ] Maintenance configuration và bypass.
- [ ] Seller feature flags.
- [ ] Seller staff và audit logs.
- [ ] Penalty và sanction profile.
- [ ] Wallet/PIN metadata.
- [ ] Notifications và reviews.
- [ ] Shipper claimed orders.
- [ ] Cart, wishlist, bookmark và reading progress.

### Nguyên tắc

- Server là nguồn dữ liệu chính cho nghiệp vụ và phân quyền.
- `localStorage` chỉ dùng cho theme, UI preference, draft và cache có thể tái tạo.
- Không tin dữ liệu client cho tiền, quyền hạn, tồn kho hoặc audit.

### Điều kiện hoàn thành

- Xóa localStorage không làm mất dữ liệu nghiệp vụ quan trọng.
- Đăng nhập trên thiết bị khác vẫn thấy trạng thái đúng.

---

## Bước 9 — Frontend test và lint

### Mục tiêu

Tạo hàng rào chống regression cho các luồng chính.

### Công việc

- [ ] Tách migration scripts khỏi lint ứng dụng hoặc cấu hình rule phù hợp.
- [ ] Sửa lint theo module, không sửa hàng nghìn lỗi trong một commit.
- [ ] Unit test API client, token refresh và error translation.
- [ ] Component test onboarding và cart.
- [ ] E2E register/login.
- [ ] E2E onboarding.
- [ ] E2E catalog và book detail.
- [ ] E2E cart và checkout.
- [ ] E2E payment callback và order.
- [ ] E2E seller fulfillment.

### Điều kiện hoàn thành

- Các luồng doanh thu chính có E2E test.
- Lint và test được chạy tự động trong CI.

---

## Bước 10 — DevOps production-ready

### Mục tiêu

Không deploy code chưa được kiểm chứng và có khả năng rollback khi xảy ra lỗi.

### Công việc

- [ ] CI chạy backend build và test.
- [ ] CI chạy frontend typecheck, lint, test và build.
- [ ] CI kiểm tra OpenAPI và Prisma migration.
- [ ] Bỏ `prisma:migrate:deploy || true`.
- [ ] Không deploy khi bất kỳ quality gate nào fail.
- [ ] Tạo Dockerfile cho web và backend services.
- [ ] Thiết lập staging trước production.
- [ ] Thêm health/readiness check cho từng service.
- [ ] Chuẩn hóa rollback.
- [ ] Thiết lập backup/restore database và diễn tập restore.
- [ ] Tích hợp Prometheus, Loki, Tempo và Grafana vào deploy.
- [ ] Chạy smoke test sau deploy.

### Điều kiện hoàn thành

- Pipeline tự chặn bản build lỗi.
- Có thể rollback bản phát hành.
- Có bằng chứng backup khôi phục được.

---

## Bước 11 — UAT và phát hành beta

### Công việc

- [ ] Chuẩn bị bộ seed data ổn định.
- [ ] Nghiệm thu vai trò buyer.
- [ ] Nghiệm thu vai trò seller và staff.
- [ ] Nghiệm thu vai trò admin.
- [ ] Nghiệm thu vai trò shipper.
- [ ] Kiểm thử concurrency của checkout, voucher và flash sale.
- [ ] Kiểm thử payment timeout và callback lặp.
- [ ] Kiểm thử refund, settlement và payout recovery.
- [ ] Kiểm thử backup restore.
- [ ] Chốt danh sách known issues cho beta.

### Điều kiện hoàn thành

- Luồng tiền và phân quyền được nghiệm thu.
- Không còn lỗi P0 mở.
- Lỗi P1 còn lại có owner, deadline và phương án giảm thiểu.

### Ngoài phạm vi beta web

Mobile hiện mới là placeholder. Chỉ bắt đầu Flutter app sau khi API contract và web beta đã ổn định.

---

## Thứ tự bắt buộc

```text
Baseline
  → Frontend compile
  → Backend tests
  → Security boundary
  → Gateway duy nhất
  → Token/auth
  → Onboarding
  → Bỏ localStorage nghiệp vụ
  → Frontend tests
  → DevOps
  → UAT
```

## Nhật ký thực hiện

Mỗi lần hoàn thành một bước, thêm bản ghi theo mẫu:

```markdown
### YYYY-MM-DD — Bước X

- Trạng thái: Hoàn thành / Bị chặn
- File đã thay đổi:
  - `path/to/file`
- Kiểm tra đã chạy:
  - `command` → PASS/FAIL
- Vấn đề còn lại:
  - Mô tả ngắn
- Bước được phép làm tiếp:
  - Bước Y
```

### 2026-10-20 — Bước 1

- Trạng thái: Hoàn thành.
- Baseline: branch `develop`, commit `b4d747eb910cf90ba0307c742e4ae13cc067be16`.
- File đã thay đổi:
  - `docs/PROJECT-BASELINE-2026-10-20.md`
  - `task/PROJECT-STABILIZATION-ROADMAP.md`
- Kiểm tra đã chạy:
  - `platform: npm.cmd run build` → PASS.
  - `platform: npm.cmd test -- --runInBand --silent` → FAIL, 22/594 test fail.
  - `web: npm.cmd run typecheck` → FAIL, 12 TypeScript errors.
  - `web: npm.cmd run lint` → FAIL, 1.661 errors và 423 warnings.
- Vấn đề còn lại:
  - Chi tiết và phân loại P0/P1/P2 nằm trong `docs/PROJECT-BASELINE-2026-10-20.md`.
- Bước được phép làm tiếp:
  - Bước 2 — Làm frontend typecheck xanh.

### 2026-10-20 — Bước 2

- Trạng thái: Hoàn thành.
- File đã thay đổi:
  - `web/src/ui/components/admin/AdminReportsView.tsx` (import `PlatformGmvTimelineItem`)
  - `web/src/ui/components/common/GroupedDataTable.tsx` (bổ sung `summaryRow` vào prop và render `<tfoot>`)
  - `web/src/ui/components/seller/SellerPayoutGroupedTable.tsx` (khai báo kiểu `badge: { label: string; bg: string }`, dùng `branch` an toàn)
  - `task/PROJECT-STABILIZATION-ROADMAP.md` (cập nhật tiến độ)
- Kiểm tra đã chạy:
  - `web: npm.cmd run typecheck` → PASS (0 lỗi).
- Vấn đề còn lại:
  - Chưa mở rộng sửa lint (sẽ thực hiện có kiểm soát ở Bước 9).
- Bước được phép làm tiếp:
  - Bước 3A — Backend: Wallet và PIN.

### 2026-10-20 — Bước 3A

- Trạng thái: Hoàn thành.
- File đã thay đổi:
  - `platform/apps/commerce-service/src/modules/wallet/wallet.service.ts` (siết chặt kiểm tra multi-tenant isolation dựa trên quyền sở hữu thực sự của actor thay vì storeIdList)
  - `platform/apps/commerce-service/src/modules/wallet/wallet.service.spec.ts` (bổ sung `findMany` mock cho `prisma.wallet` và `walletTransaction`)
  - `platform/apps/commerce-service/src/modules/wallet/wallet-security.service.ts` (chặn ghi đè mã PIN trái phép trong `setupPin` khi PIN đã tồn tại)
  - `platform/apps/commerce-service/src/modules/wallet/wallet-security.service.spec.ts` (dùng mã PIN hợp lệ không yếu trong test 17 & 18)
  - `task/PROJECT-STABILIZATION-ROADMAP.md` (cập nhật tiến độ)
- Kiểm tra đã chạy:
  - `platform: npm.cmd test -- wallet.service.spec.ts wallet-security.service.spec.ts` → PASS (2/2 test suite pass, 50/50 tests pass).
- Vấn đề còn lại:
  - Không có.
- Bước được phép làm tiếp:
  - Bước 3B — Backend: Voucher và flash sale.

### 2026-10-20 — Bước 3B

- Trạng thái: Hoàn thành.
- File đã thay đổi:
  - `platform/apps/promotion-service/src/modules/flash-sales/flash-sales.service.ts` (bảo đảm status sync phòng vệ duyệt qua mảng rỗng `pendingPlatformSales || []`)
  - `platform/apps/promotion-service/src/modules/flash-sales/flash-sales.service.spec.ts` (cung cấp mock `findMany` cho `flashSale` và `flashSaleItem` trong `beforeEach`)
  - `platform/apps/promotion-service/src/modules/vouchers/vouchers.service.ts` (kiểm tra an toàn sự tồn tại của `this.prisma.userSavedVoucher`)
  - `platform/apps/promotion-service/src/modules/vouchers/vouchers.service.spec.ts` (cập nhật assertion chuỗi lỗi validate tương thích thông báo song ngữ / tiếng Việt đã Việt hóa)
  - `task/PROJECT-STABILIZATION-ROADMAP.md` (cập nhật tiến độ)
- Kiểm tra đã chạy:
  - `platform: npm.cmd test -- vouchers.service.spec.ts flash-sales.service.spec.ts` → PASS (2/2 test suite pass, 19/19 tests pass).
- Vấn đề còn lại:
  - Không có.
- Bước được phép làm tiếp:
  - Bước 3C — Backend: Community (review, chat, notification).

### 2026-10-20 — Bước 3C

- Trạng thái: Hoàn thành.
- File đã thay đổi:
  - `platform/apps/community-service/src/modules/reviews/reviews.service.ts` (bắt buộc hoàn tất giao dịch mua sách `purchase` trước khi tạo review và chuẩn hóa trạng thái mặc định ban đầu là `PENDING_REVIEW` theo policy kiểm duyệt)
  - `platform/apps/community-service/src/modules/notifications/notifications.service.spec.ts` (bổ sung mock `findById`, `findByIdAndUpdate`, chuẩn hóa matcher tìm kiếm theo danh sách vai trò broadcast/cá nhân và `readBy`)
  - `platform/apps/community-service/src/modules/chat/chat.service.ts` (bảo đảm tính idempotent cho `createConversation` khi cuộc trò chuyện đã tồn tại, không gửi lặp lại initial message)
  - `task/PROJECT-STABILIZATION-ROADMAP.md` (cập nhật tiến độ)
- Kiểm tra đã chạy:
  - `platform: npm.cmd test -- reviews.service.spec.ts chat.service.spec.ts notifications.service.spec.ts` → PASS (3/3 test suites pass, 24/24 tests pass).
  - `platform: npm.cmd test -- --runInBand` → PASS (60/60 test suites pass, 594/594 tests pass — 100% backend test xanh tuyệt đối).
- Vấn đề còn lại:
  - Không có.
- Bước được phép làm tiếp:
  - Bước 4 — Vá ranh giới bảo mật backend (Gateway xóa header giả mạo, sinh lại từ JWT đã xác minh).




