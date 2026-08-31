# Web Frontend - Master Phases Plan

## Mục tiêu

Web responsive phục vụ guest, buyer, seller/business member, delivery operator và admin; đồng thời đóng coverage toàn bộ API platform.

## Thứ tự triển khai

```text
P01 Foundation -> P02 Identity -> P03 Catalog -> P04 COD Checkout
                                                   |
                                                   v
P09 Audit & Launch <- P08 Admin <- P06 Community <- P07 Seller <- P05 Buyer
```

Thứ tự ưu tiên MVP là Identity -> Catalog -> Cart/COD -> Buyer Orders -> Seller.
Community làm sau Seller để không chặn luồng thương mại. P09 luôn làm cuối.

## MVP và phạm vi sau MVP

### MVP

- Đăng ký, đăng nhập, profile và session.
- Homepage, catalog, search, category, store và book detail.
- Cart, address, shipping fee và checkout COD.
- Buyer order list/detail/history/tracking/cancel.
- Seller business/store/book và seller-order state machine.
- Loading, empty, retry và lỗi 400/401/403/404/409/429.

### Sau MVP

- PayOS production, refund automation và reconciliation.
- Forum, realtime chat, push notification và moderation đầy đủ.
- Admin operations, load test sâu và coverage closure cho system APIs.

## Kiến trúc đề xuất

- Next.js App Router, TypeScript strict, responsive và SSR/SEO cho public pages.
- TanStack Query cho server state; Zustand chỉ cho client state thực sự cần thiết.
- React Hook Form + Zod; typed client sinh/đối chiếu từ OpenAPI.
- API qua Gateway, refresh token single-flight, lỗi theo `err/`, response theo `res/`.
- Route groups public/auth/account/seller/delivery/admin và RBAC cả server/client.
- Socket client cho chat/notification với reconnect, dedupe và fallback.
- MSW + component tests; Playwright cho critical E2E; contract drift test trong CI.
- Web development chạy cố định ở `http://localhost:3100`; API Gateway ở `http://localhost:3000`.
- Backend local đặt `CORS_ORIGIN=http://localhost:3100`.

## Quyết định auth bắt buộc trong Phase 01

- Ưu tiên BFF của Next.js và `HttpOnly`, `Secure`, `SameSite` cookie để browser JavaScript không đọc refresh token.
- Trước khi chốt, phải làm proof-of-concept login -> refresh -> logout với backend thật.
- Nếu backend hiện tại chưa hỗ trợ cookie an toàn, ghi ADR và dùng Bearer-token adapter tạm thời; không trộn localStorage và cookie giữa các màn hình.
- Refresh phải single-flight; SSR và client navigation dùng chung một session contract.

## Chiến lược OpenAPI và typed client

- Controller/guard/DTO là nguồn chuẩn; OpenAPI generated là input cho browser client, không phải bằng chứng duy nhất.
- Không ép `211 handlers = 195 public OpenAPI operations`: health trùng, internal, webhook, callback và socket phải được phân loại riêng.
- Phase 01 tạo API wrapper và types theo module trước. Chỉ generate toàn bộ client sau khi response schema liên quan đã được xác minh.
- Mọi operation dành cho browser phải có response type, error mapping và test; system API không được đưa vào browser bundle.

## Definition of Done cho mọi Sprint

- Story và route hoạt động trên 360/768/1280+, keyboard accessible.
- API thật đi qua typed client; không hard-code mock trong production path.
- Có loading, empty, retry và xử lý 400/401/403/404/409/429 phù hợp.
- Cache ownership/invalidation rõ; mutation có rollback hoặc refetch an toàn.
- Unit/component test cho logic và E2E cho luồng quan trọng.
- Dòng API liên quan đã cập nhật status, client function và test ID.
- Internal/webhook/callback tuyệt đối không được mở thành browser client.

## Release gates

| Gate | Điều kiện |
|---|---|
| Contract | Mọi source handler/event được phân loại; browser operations khớp OpenAPI hoặc có drift ticket |
| Functional | API trong Phase ở `VERIFIED`/`SYSTEM_TESTED` |
| Security | RBAC, token, upload, XSS/CSRF review đạt |
| Quality | Typecheck, lint, unit, integration, E2E đạt |
| UX | Responsive, accessibility, error states đạt |
| Release | Không còn critical/high; rollback và observability sẵn sàng |

## “Dùng hết API” theo đúng loại

| Loại | Cách hoàn thành |
|---|---|
| Public/user/seller/admin | UI/workflow + E2E/contract verification |
| Upload/download | Progress, retry, validation và test |
| WebSocket | Subscribe/emit/reconnect/dedupe test |
| Webhook/callback | Backend integration test; browser không gọi trực tiếp |
| Internal service API | Service integration/contract test |
| Health/liveness/readiness | Deployment probe hoặc ops dashboard test |

CI phải diff endpoint snapshot. Endpoint mới làm coverage gate thất bại cho tới khi có owner, Sprint, consumer và test plan.

