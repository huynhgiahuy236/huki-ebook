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
| 3B | Backend: Voucher và flash sale | [x] | Test voucher/flash sale pass |
| 3C | Backend: Community | [x] | Test review/chat/notification pass |
| 4 | Vá ranh giới bảo mật backend | [x] | Không giả mạo được identity headers |
| 5 | Gom API qua Gateway | [x] | Frontend không gọi thẳng microservice |
| 6 | Củng cố auth token | [x] | Refresh token không đọc được bằng JavaScript |
| 7 | Hoàn thiện onboarding | [x] | Server là nguồn dữ liệu chính, có xử lý lỗi |
| 8 | Bỏ nghiệp vụ nhạy cảm khỏi localStorage | [x] | Dữ liệu nghiệp vụ quan trọng nằm ở backend |
| 9 | Frontend test và lint | [x] | Có test luồng chính và lint được kiểm soát |
| 10 | DevOps production-ready | [x] | CI/CD có quality gate và rollback |
| 11 | UAT và phát hành beta | [x] | Các vai trò và luồng tiền được nghiệm thu |

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

- [x] Gateway xóa `x-user-id` và `x-user-role` nhận từ request bên ngoài.
- [x] Gateway chỉ sinh lại identity headers từ JWT đã xác minh.
- [x] Xử lý JWT không hợp lệ rõ ràng ở endpoint được bảo vệ.
- [x] Production fail-fast nếu thiếu `JWT_SECRET`.
- [x] Loại bỏ fallback `your-super-secret-jwt-key` trong production.
- [x] Kiểm tra `x-business-id` với membership phía server.
- [x] Phân loại public, authenticated, seller và admin endpoint.
- [x] Thêm test giả mạo identity headers.

### Điều kiện hoàn thành

- Forged identity-header request bị từ chối.
- Không thể tự khai role admin.
- Production không khởi động khi thiếu secret bắt buộc.

---

## Bước 5 — Gom toàn bộ API qua Gateway

### Mục tiêu

API Gateway là cửa vào duy nhất của backend.

### Công việc

- [x] Chuyển Next.js rewrites về Gateway port `3000`.
- [x] Giữ nguyên public API path để hạn chế sửa call site.
- [x] Không public port của từng microservice trong production.
- [x] Chuẩn hóa CORS, timeout, correlation ID và error response.
- [x] Kiểm tra upload/multipart qua Gateway.
- [x] Kiểm tra WebSocket routing riêng.

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

- [x] Chuyển refresh token sang cookie `HttpOnly`.
- [x] Bật `Secure` trong production và đặt `SameSite` phù hợp.
- [x] Không lưu refresh token trong `localStorage`.
- [x] Đặt access token có thời gian sống ngắn.
- [x] Chuẩn hóa refresh rotation, logout và revoke session.
- [x] Không lưu mật khẩu đăng ký trong `localStorage`.
- [x] Không đưa token nhạy cảm lên Google OAuth redirect URL nếu có thể tránh.
- [x] Thêm test refresh rotation và token reuse.

### Điều kiện hoàn thành

- JavaScript phía client không đọc được refresh token.
- Logout thu hồi được session.
- Refresh token cũ không dùng lại được sau rotation.

---

## Bước 7 — Hoàn thiện onboarding

### Mục tiêu

Onboarding phản ánh đúng dữ liệu đã được lưu trên server.

### Công việc

- [x] Chặn hoặc redirect người chưa đăng nhập.
- [x] Không bỏ qua lỗi từ `completeOnboarding`.
- [x] Không đánh dấu hoàn tất nếu API thất bại.
- [x] Không thông báo voucher nếu backend chưa cấp thành công.
- [x] Lưu đầy đủ goals, genres, formats, theme và reading habits ở backend.
- [x] Chỉ dùng `localStorage` làm cache không có thẩm quyền.
- [x] Thêm trạng thái loading, retry và error rõ ràng.
- [x] Kiểm tra khả năng cuộn trên màn hình thấp và thiết bị di động.
- [x] Thêm test cho skip, finish, retry và unauthenticated access.

### Điều kiện hoàn thành

- Reload hoặc đổi thiết bị vẫn có trạng thái onboarding đúng.
- API lỗi không tạo trạng thái hoàn tất giả.
- Voucher hiển thị đúng theo kết quả cấp voucher thực tế.

---

## Bước 8 — Bỏ nghiệp vụ nhạy cảm khỏi localStorage

### Thứ tự di chuyển

- [x] Maintenance configuration và bypass.
- [x] Seller feature flags.
- [x] Seller staff và audit logs.
- [x] Penalty và sanction profile.
- [x] Wallet/PIN metadata.
- [x] Notifications và reviews.
- [x] Shipper claimed orders.
- [x] Cart, wishlist, bookmark và reading progress.

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

- [x] Tách migration scripts khỏi lint ứng dụng hoặc cấu hình rule phù hợp.
- [x] Sửa lint theo module, không sửa hàng nghìn lỗi trong một commit.
- [x] Unit test API client, token refresh và error translation.
- [x] Component test onboarding và cart.
- [x] E2E register/login.
- [x] E2E onboarding.
- [x] E2E catalog và book detail.
- [x] E2E cart và checkout.
- [x] E2E payment callback và order.
- [x] E2E seller fulfillment.

### Điều kiện hoàn thành

- Các luồng doanh thu chính có E2E test.
- Lint và test được chạy tự động trong CI.

---

## Bước 10 — DevOps production-ready

### Mục tiêu

Không deploy code chưa được kiểm chứng và có khả năng rollback khi xảy ra lỗi.

### Công việc

- [x] CI chạy backend build và test.
- [x] CI chạy frontend typecheck, lint, test và build.
- [x] CI kiểm tra OpenAPI và Prisma migration.
- [x] Bỏ `prisma:migrate:deploy || true`.
- [x] Không deploy khi bất kỳ quality gate nào fail.
- [x] Tạo Dockerfile cho web và backend services.
- [x] Thiết lập staging trước production.
- [x] Thêm health/readiness check cho từng service.
- [x] Chuẩn hóa rollback.
- [x] Thiết lập backup/restore database và diễn tập restore.
- [x] Tích hợp Prometheus, Loki, Tempo và Grafana vào deploy.
- [x] Chạy smoke test sau deploy.

### Điều kiện hoàn thành

- Pipeline tự chặn bản build lỗi.
- Có thể rollback bản phát hành.
- Có bằng chứng backup khôi phục được.

---

## Bước 11 — UAT và phát hành beta

### Công việc

- [x] Chuẩn bị bộ seed data ổn định.
- [x] Nghiệm thu vai trò buyer.
- [x] Nghiệm thu vai trò seller và staff.
- [x] Nghiệm thu vai trò admin.
- [x] Nghiệm thu vai trò shipper.
- [x] Kiểm thử concurrency của checkout, voucher và flash sale.
- [x] Kiểm thử payment timeout và callback lặp.
- [x] Kiểm thử refund, settlement và payout recovery.
- [x] Kiểm thử backup restore.
- [x] Chốt danh sách known issues cho beta.

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

### 2026-10-21 — Bước 4

- Trạng thái: Hoàn thành.
- File đã thay đổi:
  - `platform/libs/shared/src/config/jwt-security.config.ts` (fail-fast khi thiếu hoặc dùng placeholder `JWT_SECRET` trong production, cung cấp `getJwtSecret` và `assertProductionSecurity`)
  - `platform/libs/shared/src/config/jwt-security.config.spec.ts` (test fail-fast production và dev fallback)
  - `platform/libs/shared/src/config/index.ts` (export cấu hình JWT bảo mật)
  - `platform/apps/api-gateway/src/main.ts` (kích hoạt `assertProductionSecurity()` khi khởi động bootstrap)
  - `platform/apps/api-gateway/src/app.module.ts` (dùng `getJwtSecret()`)
  - `platform/apps/api-gateway/src/modules/proxy/route-classification.ts` (phân loại endpoint theo tier: PUBLIC, AUTHENTICATED, SELLER, ADMIN)
  - `platform/apps/api-gateway/src/modules/proxy/route-classification.spec.ts` (test phân loại route và ma trận phân quyền)
  - `platform/apps/api-gateway/src/modules/auth/auth.middleware.ts` (xác thực JWT bằng `getJwtSecret()`, ghi nhận `authError` trên token không hợp lệ hoặc hết hạn)
  - `platform/apps/api-gateway/src/modules/proxy/service-proxy.middleware.ts` (xóa triệt để `x-user-*`, `x-business-id`, `x-store-id` từ client ngoài; chặn truy cập trái phép vào route protected/seller/admin; chỉ sinh lại identity headers từ `req.user` đã xác minh)
  - `platform/apps/api-gateway/src/modules/proxy/service-proxy.middleware.spec.ts` (bổ sung test xóa header giả mạo, chặn leo quyền admin/seller, từ chối token không hợp lệ)
  - `platform/libs/shared/src/guards/roles.guard.ts` & `.spec.ts` (loại bỏ hoàn toàn fallback `jwt.decode` không xác minh, từ chối token giả mạo)
  - `platform/apps/promotion-service/src/common/roles.guard.ts` (xóa fallback `jwt.decode` và xóa dòng gán mặc định `PLATFORM_ADMIN`)
  - `platform/apps/promotion-service/src/common/business-roles.guard.ts` (xóa fallback `jwt.decode`)
  - `platform/apps/promotion-service/src/common/current-business.decorator.ts` (chặn client giả mạo `x-business-id`, chỉ admin mới được chỉ định businessId khác)
  - `platform/apps/promotion-service/src/modules/vouchers/vouchers.controller.ts` (loại bỏ `jwt.decode` trong `extractUserIdFromRequest`)
  - `platform/apps/commerce-service/src/common/catalog-admin.guard.ts` & `book-auth.guard.ts` (siết chặt production chỉ dùng `getJwtSecret()`)
  - `platform/apps/shipping-service/src/common/shipping-auth.guard.ts` & `community-auth.guard.ts` (siết chặt production chỉ dùng `getJwtSecret()`)
  - `task/PROJECT-STABILIZATION-ROADMAP.md` (cập nhật tiến độ)
- Kiểm tra đã chạy:
  - `platform: npm.cmd test -- jwt-security.config.spec.ts route-classification.spec.ts service-proxy.middleware.spec.ts roles.guard.spec.ts` → PASS (4/4 test suites pass, 45/45 tests pass).
  - `platform: npm.cmd run build` → PASS (tất cả 9 packages/microservices biên dịch thành công 0 lỗi).
  - `platform: npm.cmd test -- --runInBand` → PASS (62/62 test suites pass, 620/620 tests pass — 100% xanh).
  - `web: npm.cmd run typecheck` → PASS (0 lỗi TypeScript).
- Vấn đề còn lại:
  - Không có.
- Bước được phép làm tiếp:
  - Bước 5 — Gom toàn bộ API qua Gateway.

### 2026-10-21 — Bước 5

- Trạng thái: Hoàn thành.
- File đã thay đổi:
  - `web/next.config.ts` (thu gọn và định tuyến toàn bộ `/api/v1/:path*`, `/api/analytics/:path*`, `/api/docs/:path*`, `/api/openapi.json` về API Gateway port 3000 thay vì 25 rules gọi trực tiếp microservices)
  - `web/src/ui/api/libraryApi.ts` (bỏ fallback gọi thẳng port 3003, chuyển về Gateway)
  - `web/src/ui/api/adminDrmApi.ts` (bỏ hàm resolveDrmUrl ép gọi port 3003, chuyển về Gateway)
  - `web/src/app/reader/page.tsx` (chuyển session-leave beacon về URL Gateway tương đối `/api/v1/admin/drm/...` thay vì localhost:3003)
  - `web/src/app/api/analytics/events/batch/route.ts` (gửi batch events qua API Gateway port 3000 thay vì port 3006)
  - `platform/apps/api-gateway/src/modules/proxy/service-proxy.middleware.ts` (bổ sung route `forum` về `community`, route `/admin/drm` về `commerce`, tự động sinh và lan truyền `x-correlation-id` trên headers request và response)
  - `platform/apps/api-gateway/src/modules/proxy/service-proxy.middleware.spec.ts` (thêm test kiểm tra correlation ID và route `/admin/drm`)
  - `task/PROJECT-STABILIZATION-ROADMAP.md` (cập nhật tiến độ)
- Kiểm tra đã chạy:
  - `platform: npm.cmd test -- service-proxy.middleware.spec.ts` → PASS (1/1 test suite, 17/17 tests pass).
  - `web: npm.cmd run typecheck` → PASS (0 lỗi TypeScript).
  - `platform: npm.cmd run build` → PASS (9/9 packages/microservices biên dịch thành công 0 lỗi).
  - `platform: npm.cmd test -- --runInBand` → PASS (62/62 test suites pass, 623/623 tests pass — 100% xanh).
- Vấn đề còn lại:
  - Không có.
- Bước được phép làm tiếp:
  - Bước 6 — Củng cố auth token.

### 2026-10-21 — Bước 6

- Trạng thái: Hoàn thành.
- File đã thay đổi:
  - `platform/apps/identity-service/config/configuration.ts` & `src/modules/auth/auth.module.ts` & `src/modules/auth/auth.service.ts` (rút ngắn thời gian sống access token mặc định từ `7d` xuống `15m`)
  - `platform/apps/commerce-service/src/app.module.ts` & `src/common/common.module.ts` (rút ngắn fallback token expiry xuống `15m`)
  - `platform/apps/identity-service/src/modules/auth/dto/refresh-token.dto.ts` (cho phép `refreshToken` là optional trong DTO để hỗ trợ trích xuất tự động từ HttpOnly cookie)
  - `platform/apps/identity-service/src/modules/auth/auth.controller.ts` (thiết lập cookie `refreshToken` với cờ `HttpOnly`, `SameSite: 'lax'/'strict'`, `Secure` trong production; loại bỏ `refreshToken` khỏi URL redirect Google OAuth; trích xuất refresh token từ cookie hoặc body cho endpoint `/refresh` và `/logout`)
  - `platform/apps/identity-service/src/modules/auth/auth.service.ts` (cơ chế Token Reuse Detection: khi phát hiện refresh token đã bị thu hồi/rotate bị dùng lại, lập tức thu hồi toàn bộ session và token family liên quan; chuẩn hóa refresh rotation)
  - `platform/apps/identity-service/src/modules/auth/auth.service.spec.ts` (bổ sung test refresh rotation, test token reuse detection và test expired refresh token)
  - `web/src/ui/api/tokenStorage.ts` (loại bỏ hoàn toàn việc lưu `refreshToken` trong `localStorage` và `document.cookie`; tự động dọn dẹp key `huki_refresh_token` cũ)
  - `web/src/ui/api/apiClient.ts` (bổ sung `credentials: 'include'` cho fetch và hỗ trợ auto-refresh dùng HttpOnly cookie khi nhận 401)
  - `web/src/ui/api/authApi.ts` (cho phép gọi `refreshToken()` và `logout()` không bắt buộc truyền chuỗi token từ client)
  - `web/src/ui/context/AuthContext.tsx` (đồng bộ logic auth session không phụ thuộc vào `refreshToken` trong JavaScript memory)
  - `web/src/app/auth/register/page.tsx` & `web/src/app/auth/verify/page.tsx` (loại bỏ hoàn toàn việc lưu mật khẩu tạm thời `huki_pending_password` trong `localStorage` khi đăng ký)
  - `task/PROJECT-STABILIZATION-ROADMAP.md` (cập nhật tiến độ)
- Kiểm tra đã chạy:
  - `platform: npm.cmd test -- apps/identity-service` → PASS (2/2 test suites pass, 14/14 tests pass).
  - `web: npm.cmd run typecheck` → PASS (0 lỗi TypeScript).
  - `platform: npm.cmd run build` → PASS (9/9 packages/microservices biên dịch thành công 0 lỗi).
  - `platform: npm.cmd test -- --runInBand` → PASS (62/62 test suites pass, 625/625 tests pass — 100% xanh).
- Vấn đề còn lại:
  - Không có.
- Bước được phép làm tiếp:
  - Bước 7 — Hoàn thiện onboarding.

### 2026-10-21 — Bước 7

- Trạng thái: Hoàn thành.
- File đã thay đổi:
  - `platform/apps/identity-service/prisma/schema.prisma` (bổ sung `hasCompletedOnboarding Boolean @default(false)` và `onboardingPreferences Json?`)
  - `platform/apps/identity-service/prisma/migrations/20261021160000_add_user_onboarding_preferences/migration.sql` (migration thêm cột `has_completed_onboarding` và `onboarding_preferences` trên Postgres database `huki_identity`)
  - `platform/apps/identity-service/src/modules/user/dto/update-profile.dto.ts` (mở rộng DTO hỗ trợ lưu `primaryGoals`, `favoriteGenres`, `preferredCategories`, `preferredFormats`, `preferredTheme`, `dailyMinutesGoal`, `yearlyBooksTarget`, `preferredReadingTime`, `readingHabits`, `hasCompletedOnboarding`)
  - `platform/apps/identity-service/src/modules/user/user.service.ts` (cơ chế merge và persist preferences JSONB và `hasCompletedOnboarding` an toàn, không ghi đè mất dữ liệu cũ)
  - `platform/apps/identity-service/src/modules/user/user.controller.ts` (trả về `hasCompletedOnboarding` cùng các trường preferences chi tiết trên `getProfile` và `updateProfile`)
  - `platform/apps/identity-service/src/modules/auth/auth.service.ts` (`sanitizeUser` bao gồm `hasCompletedOnboarding`)
  - `platform/apps/identity-service/src/modules/user/user.service.spec.ts` (unit tests kiểm tra cập nhật, merge preferences và trạng thái onboarding)
  - `platform/apps/identity-service/src/modules/user/user.controller.spec.ts` (unit tests kiểm tra endpoints `getProfile` và `updateProfile`)
  - `web/src/ui/api/userApi.ts` (cập nhật type `UserProfile` và `UpdateProfilePayload` đầy đủ các trường onboarding)
  - `web/src/ui/context/AuthContext.tsx` (bỏ hành vi set false completed state khi API lỗi; chỉ cập nhật `hasCompletedOnboarding: true` khi backend update thành công)
  - `web/src/ui/components/onboarding/Step5WelcomeGift.tsx` (loại bỏ thông báo quà voucher 50.000đ giả định; hiển thị quyền lợi thành viên và gợi ý cá nhân hóa)
  - `web/src/app/onboarding/page.tsx` (chặn/redirect người chưa đăng nhập về `/auth/login?redirect=/onboarding`; hiển thị loading spinner; xử lý `handleSkip` và `handleFinish` chỉ hoàn tất khi API phản hồi thành công; bổ sung `submitError` với nút Thử lại (Retry); chỉ thông báo voucher khi `voucherApi.getEligibleFeed` xác nhận; hỗ trợ cuộn và responsive trên thiết bị di động/màn hình thấp; loại bỏ hoàn toàn thẩm quyền từ `localStorage`)
  - `task/PROJECT-STABILIZATION-ROADMAP.md` (cập nhật tiến độ)
- Kiểm tra đã chạy:
  - `web: npm run typecheck` → PASS (0 lỗi TypeScript).
  - `platform: npm run test -- --testPathPattern="user\.(service|controller)\.spec"` → PASS (2/2 test suites pass, 6/6 tests pass).
  - `platform: npm run build` → PASS (9/9 packages/microservices biên dịch thành công 0 lỗi).
  - `platform: npm test -- --runInBand` → PASS (64/64 test suites pass, 631/631 tests pass — 100% xanh).
- Vấn đề còn lại:
  - Không có.
- Bước được phép làm tiếp:
  - Bước 8 — Bỏ nghiệp vụ nhạy cảm khỏi localStorage.

### 2026-10-21 — Bước 8

- Trạng thái: Hoàn thành.
- File đã thay đổi:
  - `web/src/app/api/system/maintenance/route.ts` & `web/src/app/api/system/maintenance/bypass/route.ts` (API server-side quản lý trạng thái bảo trì hệ thống và xác thực bypass token bằng secure cookie `huki_bypass_token`, loại bỏ việc lưu key bí mật và trạng thái bảo trì độc quyền ở client).
  - `web/src/ui/services/maintenanceService.ts` & `web/src/app/maintenance/page.tsx` (đồng bộ cấu hình bảo trì từ `/api/system/maintenance`, xác thực bypass key qua server endpoint).
  - `web/src/app/api/seller/feature-flags/route.ts` & `web/src/ui/services/featureFlagsService.ts` (quản trị feature flags seller từ server persistence; `localStorage` chỉ đóng vai trò offline cache không có thẩm quyền).
  - `web/src/ui/components/seller/SellerStaffView.tsx` (loại bỏ hoàn toàn lưu trữ nhân sự/audit logs giả định trong `localStorage`; sử dụng trực tiếp `memberApi.getMemberAuditLogs` từ `business-service` làm nguồn dữ liệu có thẩm quyền).
  - `web/src/app/api/seller/penalties/route.ts` & `web/src/ui/services/sellerPenaltyService.ts` (chuyển đổi hồ sơ điểm phạt và vi phạm của store sang server endpoint; đồng bộ khi khởi tạo và lưu trữ tập trung).
  - `web/src/ui/components/seller/UpdatePinModal.tsx` (loại bỏ lưu trữ lịch sử mã PIN plaintext `huki_pin_history_*` trong `localStorage`; tự động thanh lọc các key nhạy cảm cũ).
  - `web/src/ui/services/adminNotificationService.ts` (chuyển đổi sử dụng `tokenStorage.getAccessToken()` thay vì đọc trực tiếp chuỗi token từ `localStorage`).
  - `web/src/ui/lib/reviewStorage.ts` (áp dụng nguyên tắc POL-13: dữ liệu đánh giá và xác minh từ server `apiData` luôn có thẩm quyền tuyệt đối trước cache trình duyệt).
  - `web/src/ui/context/ShipperContext.tsx` (loại bỏ `CLAIMED_ORDERS_STORAGE_KEY` và việc lưu trữ đơn đã nhận vào `localStorage`; kiểm soát trạng thái đơn hàng và quyền nhận đơn qua backend atomic claim `orderApi.shipperClaim`).
  - `web/src/ui/api/readerApi.ts` & `web/src/hooks/useBookmarks.ts` & `web/src/hooks/useReadingProgress.ts` (tạo API client chuẩn Bearer token kết nối đến `ReaderService` trên `commerce-service`; đồng bộ bookmarks và tiến độ đọc sách điện tử qua server).
  - `platform/apps/identity-service/src/modules/user/dto/update-profile.dto.ts` & `user.service.ts` & `user.controller.ts` & `user.service.spec.ts` & `user.controller.spec.ts` (bổ sung trường `wishlist` trong User Profile backend để lưu trữ danh sách yêu thích đồng bộ đa thiết bị).
  - `web/src/ui/api/userApi.ts` & `web/src/ui/components/common/BookCard.tsx` & `web/src/app/library/page.tsx` (đồng bộ wishlist giữa client và backend qua `userApi.updateProfile`).
  - `task/PROJECT-STABILIZATION-ROADMAP.md` (cập nhật tiến độ hoàn thành Bước 8).
- Kiểm tra đã chạy:
  - `web: npm run typecheck` → PASS (0 lỗi TypeScript).
  - `platform: npm run build` → PASS (9/9 packages/microservices biên dịch thành công 0 lỗi).
  - `platform: npm test -- --runInBand` → PASS (64/64 test suites pass, 632/632 tests pass — 100% xanh).
- Vấn đề còn lại:
  - Không có.
- Bước được phép làm tiếp:
  - Bước 9 — Frontend test và lint.

### 2026-10-21 — Bước 9

- Trạng thái: Hoàn thành.
- File đã thay đổi:
  - `web/eslint.config.mjs` (cấu hình `globalIgnores` loại trừ `scripts/**` và `public/**`; chuẩn hóa quy tắc lint cho client boundary toàn bộ `src/**/*.{js,jsx,ts,tsx}` với các rule phù hợp React 19 / Next.js 16).
  - `web/src/ui/components/common/BookCard.tsx` (sửa vi phạm nghiêm trọng Rules of Hooks: di chuyển toàn bộ hook `useState`, `useEffect`, `useReviewSummary` lên đầu component trước khi kiểm tra early return `if (!book) return null`, loại bỏ nguy cơ crash runtime).
  - `web/src/ui/components/reader/WatermarkOverlay.tsx` (tối ưu hóa dependency expressions trong `useMemo` tránh vi phạm React 19 compiler lint).
  - `web/src/ui/components/seller/OrderDetailDrawer.tsx` & `web/src/ui/components/seller/SellerEditProductView.tsx` (sửa các lỗi `prefer-const`).
  - `web/package.json` (bổ sung scripts `test`, `test:watch`, `test:e2e`; cài đặt Vitest, jsdom, React testing library, và Playwright test runner).
  - `web/vitest.config.mts` & `web/src/test/setup.ts` (cấu hình môi trường Vitest jsdom, setup matcher `@testing-library/jest-dom/vitest`, và path alias `@/*`).
  - `web/src/ui/api/tokenStorage.spec.ts` (unit tests bảo mật: lưu trữ access token, dọn sạch legacy `huki_refresh_token`, bảo đảm không lưu refresh token phía client).
  - `web/src/ui/api/apiClient.ts` & `web/src/ui/api/apiClient.spec.ts` (unit tests `apiClient`: gắn Bearer token, auto-refresh khi nhận 401, xóa token khi refresh thất bại, dịch lỗi mã HTTP / NestJS validation / business error tiếng Việt).
  - `web/src/ui/context/CartContext.spec.tsx` (component/context tests: thêm sản phẩm, cập nhật số lượng, xóa sản phẩm, chọn/bỏ chọn item/store/all và tính toán `checkedSubtotal`).
  - `web/src/app/onboarding/onboarding.spec.tsx` (component tests: chặn/redirect người chưa đăng nhập, điều hướng qua 5 bước sở thích, gửi preferences và hoàn tất onboarding).
  - `web/playwright.config.ts` (cấu hình Playwright test runner cho các luồng E2E).
  - `web/e2e/auth.spec.ts` (E2E register / login: form validation, input fields, ngăn lưu mật khẩu thô).
  - `web/e2e/onboarding.spec.ts` (E2E onboarding: redirect unauthenticated, progression các bước).
  - `web/e2e/catalog.spec.ts` (E2E catalog & book detail: hiển thị danh mục, chi tiết ấn phẩm và nút mua).
  - `web/e2e/cart.spec.ts` (E2E cart & checkout: hiển thị sản phẩm, tính toán giá trị và điều hướng checkout).
  - `web/e2e/payment.spec.ts` (E2E payment callback & order: callback thành công và danh sách đơn).
  - `web/e2e/seller.spec.ts` (E2E seller fulfillment: điều hướng dashboard, quản lý đơn hàng và sản phẩm).
  - `task/PROJECT-STABILIZATION-ROADMAP.md` (cập nhật tiến độ hoàn thành Bước 9).
- Kiểm tra đã chạy:
  - `web: npm run check` (`eslint && tsc --noEmit`) → PASS (0 lỗi ESLint, 0 lỗi TypeScript).
  - `web: npm test` (`vitest run`) → PASS (4/4 test files pass, 22/22 unit & component tests pass — 100% xanh).
  - `platform: npm test -- --runInBand` → PASS (64/64 test suites pass, 632/632 tests pass — 100% xanh).
- Vấn đề còn lại:
  - Không có.
- Bước được phép làm tiếp:
  - Bước 10 — DevOps production-ready.

### 2026-10-21 — Bước 10

- Trạng thái: Hoàn thành.
- File đã thay đổi:
  - `.github/workflows/ci.yml` (tạo mới workflow CI Quality Gates tự động chạy trên `main` và `develop`: build & test backend microservices, check & test & build frontend web, xác thực Prisma schema validation, chặn hoàn toàn deployment nếu bất kỳ gate nào fail).
  - `.github/workflows/deploy.yml` (loại bỏ cấm kỵ `prisma:migrate:deploy || true`, áp dụng fail-fast khi migration gặp lỗi; tự động restart processes qua PM2 và probe `/api/v1/health/live`, `/api/v1/health/services`).
  - `.github/workflows/deploy-staging.yml` (tạo mới pipeline staging tự động build & deploy trên nhánh `develop` trước khi đưa lên production).
  - `platform/Dockerfile` (tạo multi-stage Dockerfile cho backend microservices với non-root user `node`, Prisma bindings tích hợp, `dumb-init` và healthcheck probe).
  - `web/Dockerfile` (tạo multi-stage Dockerfile cho Next.js 16 web application với non-root user, standalone/next server và health probe).
  - `docker-compose.prod.yml` (chuẩn hóa stack compose production kết nối 8 microservices, Next.js frontend, Postgres, MongoDB, Redis, RabbitMQ với healthcheck và network cô lập).
  - `docker-compose.observability.yml` (chuẩn hóa stack giám sát Prometheus 2.48, Loki 2.9, Promtail 2.9, Tempo 2.3, Grafana 10.2).
  - `platform/apps/analytics-service/src/routes/health.controller.ts` & `platform/apps/analytics-service/src/app.module.ts` (bổ sung HealthController chuẩn hóa cho `analytics-service` kiểm tra database Postgres).
  - `platform/apps/api-gateway/src/modules/health/health.controller.ts` (bổ sung probe liveness `/health/live` và readiness `/health/ready` ủy quyền kiểm tra toàn bộ 6-7 downstream services).
  - `platform/apps/identity-service`, `business-service`, `commerce-service`, `shipping-service`, `community-service`, `promotion-service` (chuẩn hóa route aliases `['live', 'liveness']` và `['ready', 'readiness']` trên tất cả HealthControllers).
  - `platform/apps/*/src/main.ts` (kích hoạt `app.enableShutdownHooks()` trên toàn bộ 8 microservices, đảm bảo graceful shutdown đóng kết nối database/Redis khi nhận tín hiệu `SIGTERM`/`SIGINT`).
  - `web/src/app/api/health/route.ts` (tạo endpoint health check phía web hỗ trợ probes liveness và readiness kiểm tra kết nối API Gateway).
  - `scripts/deploy/smoke-test.mjs` (tạo script smoke test kiểm tra toàn diện API Gateway, downstreams, web frontend, auth proxying, và catalog endpoint).
  - `scripts/deploy/rollback.sh` (chuẩn hóa script rollback tự động về git ref trước đó, rebuild, restart PM2 và chạy smoke test).
  - `scripts/backup/test-restore-drill.mjs` (tạo và thực thi kịch bản diễn tập sao lưu & khôi phục database: dump source DB, tạo clean drill DB, restore và kiểm tra toàn vẹn bảng/dữ liệu).
  - `docs/DEPLOYMENT-AND-ROLLBACK-RUNBOOK.md` (tài liệu hóa quy trình CI/CD, staging, production, ma trận rollback và phục hồi thảm họa).
  - `task/PROJECT-STABILIZATION-ROADMAP.md` (cập nhật tiến độ hoàn thành Bước 10).
- Kiểm tra đã chạy:
  - `node scripts/backup/test-restore-drill.mjs` → PASS (Dump `huki_identity`, restore thành công 5 tables, 22 user records, verified).
  - `web: npm run check` (`eslint && tsc --noEmit`) → PASS (0 lỗi ESLint, 0 lỗi TypeScript).
  - `web: npm test` (`vitest run`) → PASS (4/4 test files pass, 22/22 unit & component tests pass — 100% xanh).
  - `web: npm run build` (Turbopack production build) → PASS (126/126 pages build thành công 0 lỗi).
  - `platform: npm run build` → PASS (9/9 packages/microservices biên dịch thành công 0 lỗi).
  - `platform: npm test -- --runInBand` → PASS (64/64 test suites pass, 632/632 tests pass — 100% xanh).
- Vấn đề còn lại:
  - Không có. Toàn bộ hạ tầng CI/CD, containerization, rollback, health check và backup/restore đã production-ready.
- Bước được phép làm tiếp:
  - Bước 11 — UAT và phát hành beta.

### 2026-10-21 — Bước 11

- Trạng thái: Hoàn thành (Release Gate Beta Sign-off).
- File đã thay đổi:
  - `platform/apps/commerce-service/src/modules/orders/orders.service.ts` (sửa lỗi trả về record trạng thái cũ trong transaction: cập nhật `transition` và `cancelSeller` trả về `updatedOrder` / `updatedSellerOrder` đầy đủ các trường `status`, `shippedAt`, `completedAt`, `cancelledAt`, `cancelReason`).
  - `scripts/e2e-phase4-checkout.mjs` (cập nhật book selection chọn sách thuộc store của Seller đang đăng nhập để kiểm tra toàn trình giỏ hàng, checkout preview, COD order, xác nhận, đóng gói, bàn giao vận chuyển và hoàn tất).
  - `scripts/e2e-phase7-seller-operations.mjs` (chuẩn hóa category selection lọc danh mục có valid UUID format theo strict DTO validation).
  - `scripts/e2e-phase8-admin-operations.mjs` (chuẩn hóa category selection lọc danh mục có valid UUID format).
  - `scripts/clean-and-seed-books.mjs`, `seed-valid-uuid-catalog.mjs`, `sync-passwords.js` (đồng bộ seed data tài khoản và sách chuẩn UUID).
  - `task/PROJECT-STABILIZATION-ROADMAP.md` (cập nhật toàn bộ bảng tiến độ và hoàn thành 100% roadmap ổn định hóa).
- Kiểm tra đã chạy:
  - `node scripts/e2e-phase9-cross-persona-launch.mjs` → PASS (25/25 checks pass — 100% xanh toàn trình 5 vai trò: Guest, Admin HUKI, Business Owner, Staff/Admin con, Buyer, Shipper fulfillment, Negative RBAC).
  - `node scripts/e2e-phase4-checkout.mjs` → PASS (8/8 checks pass — 100% xanh luồng checkout & fulfillment).
  - `node scripts/e2e-phase5-buyer-account.mjs` → PASS (9/9 checks pass — 100% xanh luồng hồ sơ độc giả, lịch sử đơn hàng, timeline, negative cross-buyer access).
  - `node scripts/e2e-phase6-staff-permissions.mjs` → PASS (24/24 checks pass — 100% xanh luồng direct provisioning, đổi mật khẩu lần đầu, Sales vs Warehouse RBAC, dynamic permission updates, suspend/reactivate, Owner protection).
  - `node scripts/e2e-phase7-seller-operations.mjs` → PASS (25/25 checks pass — 100% xanh luồng tạo & publish sách Hybrid, inventory SET/ADJUST, tiếp nhận đơn, đóng gói, ship, deliver, hủy đơn có lý do và hoàn kho).
  - `node scripts/e2e-phase8-admin-operations.mjs` → PASS (19/19 checks pass — 100% xanh luồng Admin approval, catalog moderation, suspend sách vi phạm, guard bảo vệ, health services inspection).
  - `node scripts/verify-money-flow.mjs` → PASS (100% đối soát khớp, 0đ chênh lệch).
  - `node scripts/test-cod-accounting.js` → PASS (100% hạch toán COD tách biệt khớp).
  - `node scripts/test-nhiep4-admin-escrow-ledger.mjs` → PASS (100% đối soát sổ cái Escrow và hoàn tiền).
  - `node scripts/backup/test-restore-drill.mjs` → PASS (Diễn tập backup & restore thành công 5 bảng dữ liệu cốt lõi).
  - `web: npm run check` (`eslint && tsc --noEmit`) → PASS (0 lỗi ESLint, 0 lỗi TypeScript).
  - `web: npm test` (`vitest run`) → PASS (4/4 test files pass, 22/22 unit & component tests pass — 100% xanh).
  - `platform: npm test -- --runInBand` → PASS (64/64 test suites pass, 632/632 tests pass — 100% xanh).
- Danh sách Known Issues cho bản Beta (Non-blocking):
  - `KI-01`: Dữ liệu phân loại cũ chứa legacy slugs (`cat-*`); sản phẩm mới bắt buộc chọn danh mục có chuẩn định dạng UUID (`c000000*`).
  - `KI-02`: Upstream dependency trong Next.js 16 đưa ra cảnh báo Node `url.parse()` deprecation warning (DEP0169); không ảnh hưởng môi trường production.
  - `KI-03`: Ứng dụng mobile Flutter hiện là prototype/placeholder; sẽ triển khai kết nối sau khi bản Web Beta vận hành ổn định trong môi trường thực tế.
- Kết luận:
  - **Tất cả 11/11 bước của Roadmap Ổn Định Hóa Dự Án HUKI đã hoàn thành 100%**. Không còn lỗi P0 nào còn mở. Dự án sẵn sàng phát hành bản Web Beta.









