# Web Frontend - Master Phases Plan

## Mục tiêu

Web responsive phục vụ guest, buyer, seller/business member, delivery operator và admin; đồng thời đóng coverage toàn bộ API platform.

## Thứ tự

```text
P01 Foundation -> P02 Identity -> P03 Catalog -> P04 Checkout -> P05 Buyer
                                      |                          |
                                      +-> P06 Community          |
                                      +-> P07 Seller -> P08 Admin+
                                                                 -> P09 Audit & Launch
```

P06 có thể chạy song song P04-P05 sau P02. P07 có thể bắt đầu sau P03. P09 luôn làm cuối.

## Kiến trúc đề xuất

- Next.js App Router, TypeScript strict, responsive và SSR/SEO cho public pages.
- TanStack Query cho server state; Zustand chỉ cho client state thực sự cần thiết.
- React Hook Form + Zod; typed client sinh/đối chiếu từ OpenAPI.
- API qua Gateway, refresh token single-flight, lỗi theo `err/`, response theo `res/`.
- Route groups public/auth/account/seller/delivery/admin và RBAC cả server/client.
- Socket client cho chat/notification với reconnect, dedupe và fallback.
- MSW + component tests; Playwright cho critical E2E; contract drift test trong CI.

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
| Contract | Controller snapshot = inventory = OpenAPI, hoặc có drift ticket |
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

