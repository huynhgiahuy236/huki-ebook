# HUKI Comprehensive Code Review + Product Audit

Ngày audit: 2026-09-07  
Phạm vi: `web/`, `platform/`, database schemas, API Gateway, tài liệu web, và bộ UI reference `diendan_ui_huki_ebook`.  
Nguyên tắc: chỉ audit, không sửa code.

## 1. Kết luận điều hành

**Huki hiện chưa khớp với UI reference và chưa phải MVP web.** Backend là một nền tảng microservice tương đối rộng và build/test unit tốt, nhưng frontend web hiện chỉ là một trang control-center tĩnh. Không có route sản phẩm, API client, auth/session, state management, form, cart, checkout, reader, forum, seller hoặc admin UI. Chính tài liệu nội bộ cũng ghi `0 / 90 screens verified`.

Khoảng cách quan trọng nhất không phải là “chỉnh CSS”; đó là **thiếu toàn bộ lớp ứng dụng web và nối end-to-end**. Bộ HTML reference là prototype nhiều chức năng nhưng hoàn toàn dùng dữ liệu JavaScript/localStorage, không gọi API. Vì vậy không thể copy nguyên mẫu và xem là hoàn thành.

Đánh giá tổng quát:

| Lớp | Đánh giá | Bằng chứng chính |
|---|---|---|
| Backend modules | 🟡 Có nhưng cần xác minh tích hợp | 7 app/service, 211 HTTP handler theo inventory, build pass, 209 unit test pass |
| API contract | 🟡 Có nhưng cần chỉnh | OpenAPI generated có 195 operation; runtime drift check chưa chạy khi services tắt |
| Frontend web | 🔴 Thiếu | Chỉ có `/`, không có API call, package chỉ Next/React/Tailwind |
| UI reference | 🟡 Prototype phong phú | 6 HTML page + CSS + JS, nhưng không có `fetch`/axios và dùng localStorage/mock |
| End-to-end | 🔴 Thiếu | Không có web test/E2E; không flow nghiệp vụ nào đi từ UI tới DB |
| MVP readiness | 🔴 Chưa đạt | Auth, catalog, cart/COD, buyer order, seller đều chưa có trên web |

## 2. Phạm vi, cách kiểm tra và giới hạn

Đã đọc/kiểm tra:

- `README.md`, `task/web/00-START-HERE.md`, `PHASES-PLAN.md`, `API-COVERAGE-MATRIX.md`, `SCREEN-INVENTORY.md`.
- Quy tắc trong `web/AGENTS.md` và inventory skill dưới `skill/.codex`.
- Toàn bộ source hiện có trong `web/src` và manifest/config liên quan.
- Controller, DTO/guard/service trọng yếu, Gateway proxy, response/error envelope, Prisma schemas, Mongo schemas và integration adapters trong `platform/`.
- Sáu HTML reference, `styles.css`, `app.js`, các navigation target, form/control, responsive/state selectors và hành vi localStorage.
- Quality gates: web lint/typecheck, backend TypeScript build và toàn bộ Jest unit tests.

Kết quả chạy:

- `web: npm run check`: pass.
- `platform: npm run build`: pass cho shared, gateway và 6 microservice.
- `platform: npm test -- --runInBand`: **41/41 suites, 209/209 tests pass**.
- `platform: npm run openapi:check`: không thể hoàn tất vì `localhost:3000` không chạy (`ECONNREFUSED`). Đây là “not verified”, không phải pass/fail contract.
- Không có web test; không tìm thấy E2E test.
- Visual runtime trong browser không thực hiện được vì browser runtime của môi trường thiếu dependency. Các nhận xét UI reference dưới đây dựa trên DOM/CSS/JS thực, không tuyên bố pixel-perfect/runtime verified.

## 3. Kiến trúc thực tế

### 3.1 Thành phần

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| Web | Next.js 16.3.3 App Router, React 19.2.8, TypeScript, Tailwind 4 | Hiện mới là control-center page |
| API Gateway | NestJS | Proxy theo prefix, OpenAPI aggregate, health |
| Identity | NestJS + Prisma/PostgreSQL | Auth, user, session |
| Business | NestJS + Prisma/PostgreSQL | Business, store, member |
| Commerce | NestJS + Prisma/PostgreSQL | Book/catalog/cart/order/payment |
| Shipping | NestJS + Prisma/PostgreSQL | Address, fee, shipment, delivery staff |
| Community | NestJS + Mongoose/MongoDB + Socket.IO | Forum, review, chat, notification, moderation |
| Promotion | NestJS + Prisma/PostgreSQL | Voucher, banner, flash sale |
| Hạ tầng | PostgreSQL, MongoDB, Redis, RabbitMQ | Persistence/cache/queue |

Repo còn khai báo mobile Flutter trong README nhưng `mobile/` hiện không có file được inventory; không thuộc trọng tâm web audit này.

### 3.2 Luồng hệ thống dự kiến

Browser gọi `http://localhost:3000/api/v1/*` → Gateway chọn service bằng segment đầu → service áp dụng validation/guard/business logic → PostgreSQL hoặc MongoDB → response được chuẩn hóa về `{status,statusCode,message,data,pagination?,meta}`.

Auth hiện là Bearer-token API: login/refresh trả cả access token và refresh token trong body; refresh token được hash ở DB và rotate. Không có cookie/BFF implementation. Tài liệu web mới chỉ đề xuất HttpOnly cookie và yêu cầu proof-of-concept; frontend chưa có session contract.

## 4. Inventory UI reference

| Page | Chức năng thể hiện | Cách hoạt động thật trong reference |
|---|---|---|
| `index.html` | Landing, search, flash sale, voucher, featured/category/combo/award/bestseller, author/publisher, audiobook, VIP, social reading, forum, chat, shelf/progress/labels, quick view/cart/seller modal | Dữ liệu hard-code trong `app.js`; tương tác DOM, timeout và localStorage; không API |
| `books.html` | Catalog, search, category/price/format/rating filter, sort, pagination, wishlist/cart, quick view | Filter/sort client-side trên array mock |
| `book-detail.html` | Format selection, sample/TOC/review tabs, rating, related books, add/buy/read sample | Data chọn bằng query `id`; review/cart chỉ thay đổi local state |
| `checkout.html` | Cart, coupon, coin, payment method, total, success receipt | Cart từ localStorage; confirm dùng UI state/timeout, không tạo order/payment thật |
| `library.html` | Profile/library shelf, filter, reading challenge, heatmap, progress | Dữ liệu mock; không entitlement/progress API |
| `reader.html` | Reader theme/font/TOC/navigation/PDF-like controls | Nội dung và page state local; không signed download/entitlement/progress sync |

UI reference có design tokens rõ (pine/terracotta/gold, typography Sans/Serif/Reader, radius/shadow/transition), dark mode, focus-visible, hover, breakpoint 640/768/900/1024/1280 và nhiều modal/drawer/toast. Điểm yếu của chính reference:

- Không có network call; toàn bộ business outcome là giả lập.
- Dùng nhiều inline `onclick`, gây khó accessibility/test/CSP.
- Một số hàm bị khai báo lặp và phiên bản sau ghi đè phiên bản trước, ví dụ `handleHeroSearch`, `addToCart`, `updateCartBadge`, `openQuickView`, `openEbookReader`, `setReaderTheme`.
- Trạng thái loading/error/unauthorized chủ yếu là hiệu ứng/toast; không phản ánh lỗi HTTP thực.
- Page `index.html` rất lớn và ôm quá nhiều concern/modal, không phù hợp để bê nguyên vào component architecture.

## 5. Project web hiện tại so với reference

`web/src/app/page.tsx` chỉ render roadmap Foundation/Identity/Catalog/Commerce và lệnh chạy dự án. `globals.css` chỉ có token nền/text cơ bản. Không tồn tại:

- route ngoài `/`;
- component dùng chung;
- API layer hoặc typed client;
- `fetch`, Axios hay TanStack Query;
- auth/token/cookie/session/RBAC;
- React Hook Form/Zod;
- cart/wishlist/client state;
- loading/error/not-found/unauthorized/offline pages;
- test component/E2E;
- asset/product data thực.

Do đó trang `/` hiện tại cũng không phải landing page reference. Nó là trang trạng thái dành cho developer.

## 6. Audit API và contract

### 6.1 Coverage backend

| Service | HTTP handler theo source inventory | Chức năng chính | Web đang dùng |
|---|---:|---|---:|
| Gateway | 3 | health/ping/service health | 0 |
| Identity | 19 | auth/user/session/health | 0 |
| Business | 26 | business/store/member/health | 0 |
| Commerce | 62 | catalog/cart/order/payment/taxonomy/upload/health | 0 |
| Shipping | 19 | fee/address/shipment/delivery/callback/health | 0 |
| Community | 53 + 10 WS inbound | forum/review/chat/notification/moderation | 0 |
| Promotion | 29 | voucher/banner/flash sale/internal/health | 0 |
| **Tổng** | **211 HTTP + 10 WS** |  | **0** |

Tất cả browser-facing API hiện là “backend có, UI chưa dùng”. Không API nào có thể gọi là end-to-end hoàn thiện trên web.

### 6.2 Vấn đề/risk cụ thể

1. **Gateway không route invitation accept.** `MemberController` khai báo `POST invitations/accept`, nhưng `ROUTES` trong `service-proxy.middleware.ts` không có key `invitations`. Gọi qua Gateway sẽ không tới Business service. Đây là lỗi flow thật, ưu tiên P0 khi làm seller/member.
2. **CORS mặc định và example không thống nhất với web port 3100.** Gateway fallback là `http://localhost:3000`; các backend `.env.example` chủ yếu cho 3000/8080, trong khi tài liệu web yêu cầu 3100. Browser call trực tiếp từ web có nguy cơ bị chặn nếu env không override đúng.
3. **Auth architecture chưa chốt.** Backend trả refresh token trong JSON body; web plan ưu tiên HttpOnly cookie/BFF. Chưa có adapter/ADR/proof-of-concept nên login → refresh → logout chưa có contract phía browser.
4. **OpenAPI closure chưa được chứng minh.** Source inventory ghi 211 HTTP handler, generated OpenAPI có 195 public operation; sự chênh lệch có giải thích về health/internal/webhook/callback nhưng chưa có snapshot chi tiết một dòng/operation và `openapi:check` runtime chưa chạy.
5. **Chỉ có unit test, chưa có integration/E2E evidence.** Unit test pass là tín hiệu tốt về service logic nhưng không chứng minh Gateway → service → DB/queue/cache → UI.
6. **Tích hợp production chưa hoàn tất:** shipping fee là deterministic GHTK mock; business registry verification là mock; Firebase tự disable khi thiếu credentials; PayOS trả 503 khi thiếu credential; R2/Cloudinary/SendGrid phụ thuộc cấu hình ngoài.
7. **Contract UI reference khác domain backend.** Reference tập trung ebook-only checkout/library/reader/audiobook/VIP/social shelf; backend commerce hiện mạnh hơn ở marketplace sách vật lý + order/shipping nhưng thiếu một số domain số nêu dưới đây.

### 6.3 UI cần API nhưng backend chưa thấy contract tương ứng

- Library/ownership/ebook entitlement.
- Signed secure download/read URL và DRM/access check cho buyer.
- Reading progress, reading status (`reading`, `want-to-read`, `read`), custom labels/shelves.
- Reading challenge, streak/heatmap, leaderboard.
- Quotes/share quote.
- Audiobook catalog/playback/progress.
- VIP/subscription/unlimited-reading plan.
- Coin/wallet balance và coin redemption.
- Combo/bundle product contract chuyên biệt.

Các mục này không nên tự suy ra từ book/order API; cần quyết định product scope. Với MVP marketplace, có thể hoãn audiobook/VIP/social gamification, nhưng entitlement/reader là bắt buộc nếu bán ebook.

## 7. Audit các flow người dùng

| Flow | UI bắt đầu | API/backend | DB thay đổi | Kết thúc hiện tại | Kết quả |
|---|---|---|---|---|---|
| Landing → register | Không có landing/register route | Identity register/verify có | User/token dự kiến | Không thể bắt đầu | 🔴 Đứt ở UI |
| Register → verify | Không có form/page | API có; email phụ thuộc cấu hình | User verification | Không thể thao tác | 🔴 Đứt ở UI/integration |
| Login → refresh → logout | Không có UI/session client | API có Bearer/body token | Session/refresh token | Không thể thao tác | 🔴 P0 |
| Forgot/reset password | Không có route/form | API có | Reset token/user | Không thể thao tác | 🔴 Đứt ở UI/email |
| Home/catalog/search | Chỉ developer control-center | Books/categories/authors/publishers/search/promotion có | Read-only | Không hiển thị sản phẩm | 🔴 P0/P1 |
| Book detail | Không có route | Book/digital/physical/review có | Read-only/review mutation | Không thể xem/mua | 🔴 P1 |
| Cart | Không có UI/state | Cart CRUD có | Cart/cart items | Không thể dùng | 🔴 P0 |
| Address/shipping/COD checkout | Không có UI | Address, fee mock, preview/confirm có | Order/seller order/reservation | Không thể dùng | 🔴 P0 |
| PayOS checkout | Không có UI/callback result | API có, cần credential/webhook | Payment/order | Không thể dùng | 🟡 Sau COD MVP |
| Buyer orders/tracking/cancel | Không có UI | APIs có | Order/shipment state | Không thể dùng | 🔴 P1 |
| Library/reader/progress | Không có UI | Backend thiếu entitlement/progress | Chưa có model rõ | Không thể dùng | 🔴 Cả hai thiếu |
| Forum/review | Không có UI | REST API có | MongoDB | Không thể dùng | 🟡 Backend có, UI thiếu |
| Chat/notification | Không có UI/socket client | REST/Socket/Firebase có | MongoDB/device prefs | Không thể dùng | 🟡 Backend có, UI thiếu |
| Seller onboarding/store/product | Không có UI | API phần lớn có | Business/store/book | Không thể dùng | 🔴 P1 |
| Accept member invitation | Không có UI | Controller có nhưng Gateway route thiếu | Member/invitation | Gateway làm đứt | ⚠️ Bug |
| Admin/moderation/ops | Không có UI | APIs có | Multi-DB/Mongo | Không thể dùng | 🟡 Backend có, UI thiếu |
| Error/loading/empty/permission | Không có app states | Error envelope có | Không áp dụng | Không có UX | 🔴 Thiếu |

## 8. Phân loại A/B/C/D

- **A — UI hoàn thiện + chức năng hoàn thiện:** không có screen web nào đủ tiêu chí. Control-center `/` pass lint/typecheck nhưng không phải product screen.
- **B — UI hoàn thiện, chức năng chưa hoàn thiện:** không có trong Next.js project. Sáu HTML reference thuộc nhóm prototype/mock, không được tính là UI project hoàn thiện.
- **C — Chức năng/backend có, UI chưa hoàn thiện:** auth/session/profile, business/store/member, catalog/taxonomy, cart/order/payment, address/shipping, forum/review/chat/notification/moderation, voucher/banner/flash sale.
- **D — Cả UI và chức năng thiếu:** library entitlement/secure reader/progress, audiobook, VIP/subscription, coin wallet, reading challenge/leaderboard/labels/quote social, nếu các mục này vẫn thuộc product scope.

## 9. Audit UI/UX

| Tiêu chí | Reference | Web hiện tại | Nhận định |
|---|---|---|---|
| Visual hierarchy | Hero và section phong phú | Control-center rõ nhưng sai mục đích | ❌ Không khớp product |
| Typography | 4 vai trò font rõ | Geist/Geist Mono | 🟡 Cần chốt design system |
| Color | Pine/terracotta/gold + dark | Stone/emerald/amber một page | 🟡 Có họ màu gần nhưng chưa token hóa tương đương |
| Spacing/grid | Nhiều card/grid/breakpoint | Một layout responsive đơn giản | 🔴 Chưa có product component |
| Component consistency | Prototype có pattern card/button | Không component library | 🔴 Thiếu |
| Navigation | Desktop/mobile/sidebar/drawer | Không navigation sản phẩm | 🔴 Thiếu |
| Feedback | Toast/modal/active/hover mock | Chỉ hover card | 🔴 Thiếu business feedback |
| Loading/empty/error | Có một số empty/toast giả | Không có | 🔴 Thiếu |
| Accessibility | Có skip/focus CSS, semantic section một phần | `/` có semantic khá ổn | 🟡 Chưa test keyboard/screen reader |
| Responsive | Nhiều breakpoint | `/` responsive | ⚠️ Không có screen sản phẩm để đánh giá |
| Mobile UX | Mobile nav/swipe trong prototype | Không có | 🔴 Thiếu |

Nên tái sử dụng từ reference: palette/tokens, book-card language, catalog filters, quick view, cart feedback, reader settings và responsive intent. Không nên copy: một file JS khổng lồ, inline handlers, mock timeout/localStorage business state, home page quá tải và ebook-only assumptions không khớp marketplace vật lý.

## 10. Bảng đối chiếu tổng hợp

| # | Khu vực | Reference | Project hiện tại | API | UI/UX | Trạng thái | Cần làm |
|---:|---|---|---|---|---|---|---|
| 1 | Home/landing | Hero + nhiều merchandising section | Developer roadmap page | Catalog/promotion có | Product UI thiếu | ❌ | Xây `/` bằng data thật, giữ section có giá trị |
| 2 | Catalog/search | Filter/sort/pagination | Không route | Có | Thiếu | 🔴 | Typed client + URL query + states |
| 3 | Book detail | Format/tab/review/related | Không route | Phần lớn có | Thiếu | 🔴 | SSR detail + price/stock/format contract |
| 4 | Auth | Modal/CTA rải rác | Không route/session | Có | Thiếu | 🔴 | Login/register/verify/recovery + ADR token |
| 5 | Cart | Drawer + checkout page | Không có | Có | Thiếu | 🔴 | Cart query/mutation + optimistic/invalidation |
| 6 | COD checkout | Fake success | Không có | Có | Thiếu | 🔴 | Address → fee → preview → confirm → result E2E |
| 7 | PayOS | Payment choice giả | Không có | Có, cần credential | Thiếu | 🟡 | Sau COD; callback/reconciliation tests |
| 8 | Orders/tracking | Receipt/library redirect | Không có | Có | Thiếu | 🔴 | Buyer list/detail/history/tracking/cancel |
| 9 | Library/reader | Hai page đầy đủ mock | Không có | Thiếu entitlement/progress | Thiếu | 🔴 | Thiết kế domain/API trước UI |
| 10 | Forum/social | Feed/post/progress modals | Không có | Forum có; shelf/social progress thiếu | Thiếu | 🟡 | Tách forum MVP khỏi social gamification |
| 11 | Review | Detail review UI | Không có | Có | Thiếu | 🟡 | Editor/list/report + purchase verification UX |
| 12 | Chat | Floating messenger | Không có | REST + Socket có | Thiếu | 🟡 | Socket auth/reconnect/dedupe/fallback |
| 13 | Notifications | Feed concept | Không có | Có | Thiếu | 🟡 | List/settings/device/socket client |
| 14 | Seller | Seller modal/portal teaser | Không có | Phần lớn có | Thiếu | 🔴 | Business/store/product/order vertical slices |
| 15 | Members | Không đầy đủ | Không có | Gateway bug ở accept | Thiếu | ⚠️ | Route `invitations`, UI invite/accept/RBAC |
| 16 | Promotions | Voucher/flash sale/banner | Không có | Có | Thiếu | 🟡 | Public merchandising + seller/admin CRUD |
| 17 | Admin/ops | Không phải trọng tâm reference | Không có | Phần lớn có | Thiếu | 🟡 | Moderation/approval/refund/shipment/health |
| 18 | Error/loading/empty | Một phần mock | Không app states | Error envelope có | Thiếu | 🔴 | 401/403/404/409/429/5xx/retry/offline |
| 19 | Responsive/a11y | CSS khá đầy đủ | Chỉ page demo | N/A | Chưa chứng minh | ⚠️ | Test 360/768/1280+, keyboard/axe |
| 20 | Test/contract | Không test | Unit backend tốt | 195 OpenAPI vs 211 HTTP | Web/E2E thiếu | ⚠️ | Snapshot classification + component/E2E |

## 11. Bug/risk codebase đáng chú ý

### Critical/high

- Gateway thiếu route `invitations`, làm hỏng endpoint public qua gateway.
- CORS examples/fallback không cho web `localhost:3100` theo cấu hình chuẩn của tài liệu.
- Không có auth/session storage strategy phía web; dùng sai cách có thể lộ refresh token hoặc gây refresh race.
- Không có E2E nên những unit pass không bảo đảm proxy, DB migration, Redis/RabbitMQ và external adapter phối hợp đúng.
- Nếu ebook là sản phẩm bán thật, chưa thấy entitlement/download/read-access API: nguy cơ người chưa mua truy cập file hoặc người đã mua không có library.

### Medium

- API inventory/OpenAPI/matrix chưa có machine-readable per-operation closure như chính kế hoạch yêu cầu.
- `.env.example` giữa root/service có naming/value drift (`CORS_ORIGIN(S)`, database URL/name, frontend URL/port).
- GHTK và business registry đang mock; Firebase/PayOS/storage/email phụ thuộc credential và chưa có production evidence.
- Reference JavaScript có duplicate function declarations và global mutable state; không nên port trực tiếp.
- Frontend package chưa có các dependency/abstraction mà architecture plan nêu: query cache, schema/form validation, generated types, socket, testing.

### Code quality

- Backend tổ chức module tương đối tốt và có shared response/error contract; build/test đều xanh.
- Tài liệu nhiều hơn implementation web; status `PLANNED` đúng, nhưng API inventory dùng dấu ✅ có thể bị hiểu nhầm là E2E hoàn chỉnh. Nên phân biệt `implemented`, `unit-tested`, `integration-tested`, `browser-verified`.
- Không phát hiện TODO/FIXME rộng; nhưng mock được đóng trong code production path cần feature flag và release gate rõ.

## 12. Roadmap sửa lỗi/tạo MVP

### P0 — Critical

1. Sửa Gateway route coverage (`invitations` trước tiên) và tạo automated route-to-controller contract test.
2. Đồng bộ CORS cho `http://localhost:3100` trong gateway/service examples và runtime config.
3. Chốt ADR auth: BFF + HttpOnly cookie hoặc Bearer adapter tạm; triển khai single-flight refresh và logout revocation.
4. Xây foundation web: route groups/layout/design tokens/components, typed response/error client, query provider, form validation.
5. Hoàn thành E2E `register/login/refresh/logout` với backend + DB thật.
6. Hoàn thành vertical slice catalog: home → search/list → book detail bằng API thật.
7. Hoàn thành COD commerce: cart → address → fee → preview → confirm → order result; test idempotency và inventory rollback.

### P1 — Important

1. Buyer profile/sessions/address/order/history/tracking/cancel/notification.
2. Seller business → approval status → store → product/media → seller-order state machine.
3. Thiết kế ebook entitlement/library/secure reader/progress nếu ebook nằm trong MVP.
4. Tạo per-operation API snapshot: consumer/auth/role/request/response/error/client/test/status.
5. Integration/E2E cho Gateway → service → PostgreSQL/Mongo/Redis/RabbitMQ; không chỉ mock repository.
6. Xác minh upload Cloudinary/R2, email verification/reset và production-like failure behavior.

### P2 — UI/UX

1. Port design language có chọn lọc: pine/terracotta/gold, type scale, card/button/form primitives.
2. Xây loading skeleton, empty, inline validation, retry, conflict, rate-limit và unauthorized flows.
3. Responsive 360/768/1280+, mobile filter drawer, cart drawer và sticky checkout summary.
4. Accessibility: skip link, focus trap/restore modal, labels, keyboard, contrast, reduced motion, axe checks.
5. Giảm tải home reference; ưu tiên hero/search, featured, category, flash sale/voucher, trusted publisher.

### P3 — Code quality

1. Generate/validate TypeScript client từ OpenAPI sau khi contract ổn.
2. Chuẩn hóa env schema và fail-fast cho secret/config production.
3. Tách browser/system/internal/webhook/socket API trong inventory và CI drift gate.
4. Thêm component tests/MSW và Playwright critical paths.
5. Chuẩn hóa logging/request-id/observability xuyên Gateway và services.

### P4 — Nice to have

- Audiobook, VIP/unlimited reading, coin wallet, reading challenge/heatmap/leaderboard, quote cards, advanced social shelf, recommendation personalization.
- Dark mode sau khi light theme và accessibility hoàn chỉnh.
- PayOS production/reconciliation sau COD MVP ổn định.

## 13. Trả lời 9 câu hỏi cuối

1. **Đã đúng reference chưa?** Chưa. Web product gần như chưa được triển khai; chỉ có control-center page.
2. **Phần hoàn thiện?** Backend module code có độ phủ rộng, shared envelope/validation/guards, build pass và 209 unit test pass. Không có screen web nào verified.
3. **Phần đang làm dở?** Toàn bộ web Foundation/Identity/Catalog/Commerce đang ở `PLANNED`; integrations production và API closure cũng chưa verified.
4. **UI có nhưng backend chưa hỗ trợ?** Trong reference: library entitlement, secure reader/progress, audiobook, VIP, coin, reading challenge/leaderboard/labels/quotes và bundle domain.
5. **API có nhưng UI chưa dùng?** Toàn bộ browser-facing API của 6 domain service; web hiện gọi 0 API.
6. **Flow bị đứt?** Tất cả product flow đứt ngay tại UI. Member invitation còn đứt thêm tại Gateway. Ebook purchase → library → reader đứt do thiếu domain/API.
7. **Bug/risk quan trọng nhất?** Không có end-to-end web; auth contract chưa chốt; Gateway thiếu `invitations`; CORS sai port; thiếu entitlement reader; không có E2E; external integrations còn mock/config-dependent.
8. **Task để thành MVP?** Foundation/client/auth, catalog, cart/address/fee/COD, buyer order/tracking, seller vertical slice, ebook entitlement nếu in-scope, cùng contract/integration/E2E gates.
9. **Thứ tự tối ưu?** Gateway/CORS/auth foundation → auth E2E → catalog → COD checkout → buyer orders → seller → ebook entitlement/reader → UI polish/a11y → community/admin → nice-to-have.

## 14. Quyết định go/no-go

**NO-GO cho MVP web ở trạng thái hiện tại.** Có thể xem backend là nền móng tốt ở mức implementation + unit test, nhưng chưa đủ bằng chứng production/integration. Mốc chuyển sang “MVP candidate” chỉ nên xảy ra khi các flow P0 chạy qua Gateway với DB thật, có E2E, có error/loading/permission states và ít nhất các screen Identity + Catalog + COD Commerce + Buyer Orders + Seller được verified.
