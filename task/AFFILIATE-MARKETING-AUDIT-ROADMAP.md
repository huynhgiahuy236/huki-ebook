# HUKI Affiliate Marketing — Full-stack Product, Audit & Delivery Roadmap

> Mục tiêu: triển khai Affiliate Marketing thành tính năng hoàn chỉnh của HuKi, gồm Product Policy, UI/UX, Frontend, Backend, realtime, bảo mật, dòng tiền, audit log, observability, hạ tầng, E2E, UAT và rollout.
>
> Ngày tạo lại: 2026-10-21
>
> Trạng thái: `[~]` Đang rà soát và làm sạch Giai đoạn 1 (Lược bỏ mock runtime, chuyển sang honest unavailable state)
>
> Nguyên tắc cao nhất: **đầu mỗi giai đoạn phải hỏi/chốt phần chưa rõ; cuối mỗi giai đoạn phải chạy test và E2E; sau báo cáo phải dừng, chỉ làm tiếp khi chủ dự án ra lệnh.**

---

## 1. Quy ước trạng thái và cổng kiểm soát

- `[ ]`: chưa bắt đầu.
- `[?]`: đang chờ chủ dự án chốt nghiệp vụ/UI/UX.
- `[~]`: đang thực hiện.
- `[x]`: hoàn thành, có bằng chứng test và đã báo cáo.
- `[!]`: bị chặn bởi lỗi hoặc phụ thuộc ngoài phạm vi.

Mỗi giai đoạn bắt buộc đi qua bốn cổng:

1. **DISCOVER:** đọc code/UI/schema/hạ tầng hiện tại, ghi baseline Git, hỏi các điểm chưa rõ.
2. **IMPLEMENT:** chỉ sửa phạm vi đã duyệt; không ghi đè thay đổi không rõ chủ sở hữu.
3. **VERIFY:** chạy validation, unit, integration, build/typecheck/lint và E2E phù hợp.
4. **REPORT & STOP:** báo cáo file thay đổi, decision log, test evidence, rủi ro và rollback; sau đó dừng chờ lệnh.

Không tự chuyển giai đoạn. Không đánh dấu `[x]` nếu E2E bắt buộc chưa chạy hoặc fail do thay đổi trong giai đoạn.

---

## 2. Kết quả khảo sát nhanh hệ thống hiện có

### 2.1 Thành phần nên học và tái sử dụng

| Nhu cầu Affiliate | Thành phần HuKi hiện có | Cách áp dụng |
|---|---|---|
| Onboarding nhiều bước | `SellerRegisterView.tsx`, onboarding components | Học stepper, redirect theo trạng thái, field error, policy modal; không sao chép field pháp nhân không cần thiết. |
| Form control | `Input`, `Select`, `Button`, `CustomModal`, `Toast` | Giữ theme token, focus/error/helper state thống nhất. |
| Validation frontend | Zod trong `web`, `authValidation.ts` | Dùng Zod ở client; server vẫn validate độc lập bằng DTO/class-validator. |
| Account navigation | `AccountLayout.tsx` | Affiliate cá nhân nằm trong Trung tâm tài khoản, không tạo portal lạc design system. |
| Seller/Admin portal | Seller layouts/sidebar và Admin layout/views | Thêm Affiliate vào IA và phân quyền hiện có. |
| KPI/chart/table | `KPICard`, analytics views, `GroupedDataTable`, `FinancialTransactionTable` | Dùng cho click/conversion/commission/transaction, server-side filter/sort/page. |
| UI states | `EmptyState`, table states, Toast | Mọi màn hình có loading/skeleton, empty, error + retry, stale indicator. |
| Audit UI | `AuditHistoryTimeline` | Hiển thị history profile/policy/commission/manual action. |
| Holding UX | `EscrowCountdown` | Dùng pattern countdown, thời gian lấy từ server. |
| Wallet/Payout UX | `WithdrawalPinModal`, `UpdateBankModal`, wallet API/UI | Học PIN/2FA, bank snapshot, idempotency và trạng thái payout. |
| Realtime client | `realtimeSyncBus`, `UniversalNotificationBell`, notification gateway | Chỉ nhận thông báo/invalidate query; không dùng payload client làm nguồn sự thật tiền. |
| Event reliability | Commerce/Identity/Promotion Outbox + RabbitMQ | Transactional outbox cho commission, settlement, reversal và notification. |
| Audit backend | shared audit context/types/sanitizer và audit modules | Ghi actor, role, request ID, before/after, reason; sanitize PII/secrets. |
| Tracing | Gateway correlation ID, shared tracing/filter/interceptor | Truy vết click → checkout → commission → ledger → payout. |
| Observability | Prometheus, Grafana, Loki/Promtail, alert runbook | Bổ sung Affiliate metrics, dashboard, log query và cảnh báo. |
| E2E | Playwright `web/e2e`, backend Jest/integration scripts | Tạo Affiliate fixtures và full journey tests theo role. |

### 2.2 Điểm phải sửa hoặc không được sao chép nguyên trạng

1. `Wallet` hiện gắn duy nhất với `storeId`; Affiliate cá nhân không được giả làm store. Phải thiết kế owner/account scope hoặc subaccount đúng chuẩn.
2. `realtimeSyncBus` có BroadcastChannel/localStorage và event frontend tự publish. Nó chỉ tối ưu UX giữa tab; database/Ledger vẫn là nguồn sự thật.
3. Notification WebSocket hiện có CORS fallback `*` và fallback JWT secret trong code. Trước production phải bỏ fallback secret, allowlist origin và chuẩn hóa auth/reconnect.
4. Wallet có logic đồng bộ số dư từ order lúc đọc và return window test ngắn trong code. Phải audit, không kế thừa cách tái tính có nguy cơ lệch Ledger.
5. Một số form dùng validation viết tay. Affiliate phải chuẩn hóa Zod client + class-validator server + stable error code, không copy hai bộ rule rời nhau.
6. Click count, analytics aggregate hoặc WebSocket payload không bao giờ được credit/debit tiền.

---

## 3. Product policy mặc định đề xuất để chờ xác nhận

| Chính sách | Đề xuất MVP |
|---|---|
| Attribution | Last eligible click. |
| Window | Web 30 ngày; App chốt riêng khi có app. |
| Phạm vi | Không trả chéo store; book-only hay same-store phải chốt ở Giai đoạn 0. |
| Funding | Seller tài trợ 100%; platform funding để phase sau. |
| Commission base | Giá hàng thực thu trừ discount Seller tài trợ; loại ship, thuế và phí không phải giá hàng. |
| Holding | Bám escrow/return/dispute thật theo format, không hard-code một mốc chung. |
| Self-referral | Chặn cùng user; phone/address/device/payment dùng risk flag trừ khi policy cho auto-block. |
| Approval | Đăng ký → `PENDING_REVIEW` → Admin duyệt → `ACTIVE`. |
| KYC/bank | Onboarding nhẹ; bắt buộc hoàn thiện trước lần payout đầu tiên. |
| Money truth | Double-entry Ledger là nguồn sự thật; dashboard là projection/read model. |
| Realtime | Server event báo thay đổi; client fetch lại snapshot có version. |

---

## 4. Information Architecture và routes

### 4.1 Affiliate cá nhân

Tích hợp vào `AccountLayout`, thêm nhóm **TIẾP THỊ LIÊN KẾT**:

| Route | Màn hình | Quyền/trạng thái |
|---|---|---|
| `/affiliate` | Landing quyền lợi, cách hoạt động, FAQ | Public; CTA yêu cầu đăng nhập. |
| `/account/affiliate/register` | Đăng ký nhiều bước | User đăng nhập, chưa có hồ sơ. |
| `/account/affiliate/application` | Theo dõi/bổ sung hồ sơ | Applicant. |
| `/account/affiliate/dashboard` | KPI, earnings, link nhanh, cảnh báo | `ACTIVE`; suspended read-only. |
| `/account/affiliate/links` | Tạo/quản lý link và campaign | `ACTIVE`. |
| `/account/affiliate/commissions` | Lịch sử và chi tiết commission | Chủ hồ sơ. |
| `/account/affiliate/payouts` | Balance, KYC/bank, payout | Chủ hồ sơ đủ điều kiện. |
| `/account/affiliate/settings` | Kênh, thông báo, consent, điều khoản | Chủ hồ sơ. |

Tại `/book/[id]`, Affiliate `ACTIVE` thấy card **Chia sẻ và nhận hoa hồng** cạnh vùng mua. Mobile đặt sau CTA mua chính, không che sticky checkout CTA.

### 4.2 Seller

| Route | Màn hình |
|---|---|
| `/seller/affiliate/overview` | Attributed revenue, commission cost, conversion, top books. |
| `/seller/affiliate/settings` | Default rate cấp store, bật/tắt. |
| `/seller/affiliate/books` | Override theo book/format, bulk action, effective date. |
| `/seller/affiliate/commissions` | Đối soát theo SellerOrder/OrderItem. |
| `/seller/affiliate/audit` | Lịch sử policy và staff actions. |

### 4.3 Platform Admin

| Route | Màn hình |
|---|---|
| `/admin/affiliates` | Queue duyệt, search/filter/risk flags. |
| `/admin/affiliates/[id]` | Hồ sơ, KYC, channels, commission, audit. |
| `/admin/affiliate/policies` | Cap, window, holding, payout threshold, policy version. |
| `/admin/affiliate/commissions` | Reconciliation, manual review, reversal. |
| `/admin/affiliate/fraud` | Case, evidence, decision, appeal. |
| `/admin/affiliate/operations` | Worker, backlog, DLQ, mismatch. |

---

## 5. UI/UX specification

### 5.1 Quy chuẩn chung

- Không tạo design system mới; ưu tiên theme token và common components sẵn có.
- Status có text + icon, không chỉ màu. Form có label thật, required mark, helper, inline error và error summary.
- Keyboard navigation, visible focus, `aria-describedby`, modal focus trap; touch target tối thiểu 44x44 px.
- Tiền hiển thị `vi-VN`; backend/Ledger giữ Decimal. Lưu giờ UTC, hiển thị Asia/Ho_Chi_Minh.
- Không optimistic-update balance. Realtime chỉ báo “Đang đồng bộ” rồi fetch snapshot mới.

### 5.2 Luồng đăng ký

```text
Đăng nhập → Landing/CTA → Step 1 Hồ sơ → Step 2 Kênh quảng bá
→ Step 3 Hoạt động/khai báo → Step 4 Điều khoản + xem lại
→ Submit idempotent → PENDING_REVIEW
→ Admin APPROVE / REQUEST_CHANGES / REJECT
→ notification realtime + persisted → ACTIVE hoặc sửa đúng field bị yêu cầu
```

#### Step 1 — Thông tin hồ sơ

| API key | Control | Bắt buộc | Validation client + server | UX |
|---|---|---:|---|---|
| `displayName` | Text | Có | Trim; 2–80 Unicode; chặn control char/HTML | Gợi ý từ tên tài khoản. |
| `affiliateCode` | Text + availability | Có | 4–24; `A-Z0-9_`; uppercase; unique case-insensitive; reserved words; rate-limit | Debounce 500 ms; submit kiểm tra lại; preview link. |
| `bio` | Textarea | Có | 30–500; sanitize output | Counter ký tự. |
| `contactEmail` | Email | Có | Max 254; đổi khác account phải verify | Mask ở list/log. |
| `contactPhone` | Tel | Có | Chuẩn hóa E.164 VN; OTP nếu khác account | Không log số đầy đủ. |
| `avatarUrl` | Upload/chọn avatar | Không | MIME allowlist, size/dimension, scan/storage policy | Fallback avatar account. |

#### Step 2 — Kênh quảng bá

Phải có ít nhất một channel, tối đa 10.

| API key | Control | Validation |
|---|---|---|
| `channels[].type` | Select | `FACEBOOK`, `TIKTOK`, `YOUTUBE`, `BLOG`, `INSTAGRAM`, `OTHER`. |
| `channels[].url` | URL | HTTPS; max 2048; hostname hợp lệ; cấm javascript/data/file; canonicalize. |
| `channels[].handle` | Text | 1–100; optional nếu URL đủ rõ. |
| `channels[].followersRange` | Select | Enum range. |
| `channels[].isPrimary` | Radio | Chính xác một primary. |
| `contentCategories` | Multi-select | 1–8 category ID tồn tại. |
| `promotionMethods` | Checkbox group | Ít nhất một: review, video, social, blog, livestream, community. |

URL trùng trong form báo lỗi. Channel bị hồ sơ khác khai báo chỉ tạo risk flag, không lộ danh tính hồ sơ đó.

#### Step 3 — Khai báo và payout readiness

| API key | Control | Bắt buộc lúc đăng ký | Validation |
|---|---|---:|---|
| `applicantType` | Radio | Có | `INDIVIDUAL`/`BUSINESS`; đổi có cảnh báo KYC/thuế. |
| `promotionDescription` | Textarea | Có | 50–1000; sanitize. |
| `hasPaidTraffic` | Switch | Có | Boolean. |
| `paidTrafficSources` | Multi-select | Có điều kiện | Required khi paid traffic bật. |
| `taxId` | Text | Chưa bắt buộc beta | Nếu nhập: MST 10 số hoặc `10 số-xxx`. |
| `payoutSetupLater` | Checkbox | Có | Beta cho setup trước lần rút đầu. |

CCCD, giấy phép và bank account không thu ở registration MVP nếu chọn onboarding nhẹ. Chúng nằm trong secure KYC/Payout setup, được mask/encrypt và hạn chế quyền.

#### Step 4 — Điều khoản

| Field | Quy tắc |
|---|---|
| `acceptedAffiliateTerms` | Bắt buộc; lưu version, time, audit context. |
| `acceptedPrivacyNotice` | Bắt buộc; lưu version. |
| `confirmedInformationAccuracy` | Bắt buộc. |
| Marketing consent | Optional, tách khỏi điều khoản bắt buộc. |

Review screen nhóm theo step, có “Chỉnh sửa”, không lộ PII quá mức. Submit khóa nút, dùng idempotency key; thành công redirect application status và hiện application code.

#### Hành vi validation

- Validate khi blur, revalidate lúc sửa field lỗi, submit validate toàn form.
- Client dùng Zod conditional/refinement; server DTO/service rule quyết định cuối.
- Backend trả `{ code, message, fieldErrors, requestId }`; không dùng text tiếng Việt làm logic.
- Tự mở đúng step/focus field lỗi đầu tiên; có summary đầu form.
- Async check lỗi mạng phải báo “Chưa thể kiểm tra”, không được kết luận “đã tồn tại”.
- Draft lưu server-side; không lưu CCCD, bank, token trong localStorage.

### 5.3 Trạng thái hồ sơ và UX

```text
DRAFT → PENDING_REVIEW → ACTIVE
                     ↘ REQUEST_CHANGES → PENDING_REVIEW
                     ↘ REJECTED
ACTIVE → SUSPENDED → ACTIVE hoặc TERMINATED
```

- Pending: timeline + SLA. Request changes: reason + deep-link đúng field. Rejected: reason code/note + nộp lại/appeal policy.
- Suspended: dashboard read-only, không tạo link; giải thích balance/payout theo policy.
- Mọi status change có persisted notification và realtime; email khi hạ tầng email khả dụng.

### 5.4 Dashboard và các màn hình chính

Affiliate Dashboard:

1. Header: status, date range, “Tạo link”.
2. KPI: Valid clicks, Conversion, Pending, Holding, Available, Paid, Reversed.
3. Chart ngày: click/conversion/commission + accessible text summary.
4. Quick link: chọn book/store/campaign, copy; QR nếu duyệt.
5. Recent commission table; KYC/payout readiness; activity timeline.

Link generator:

- Search book debounce + cancellation; chỉ book/store đang enabled.
- Hiện rate ước tính và disclaimer; `campaign/subId` dài 1–64, `[A-Za-z0-9_-]`, cấm PII.
- Backend issue/resolve link; frontend không tự ghép dữ liệu tin cậy.

Commission list/detail:

- Filter date/status/store/book/campaign/order masked; server sort/page; async export nếu lớn.
- Cột: time, order masked, book, base, rate, amount, status, holding/reason.
- Detail drawer: attribution, snapshot, state timeline, reversal/adjustment, ledger reference.
- Không lộ Buyer name, phone, address hoặc payment data.

Seller policy:

- Global switch có confirm; default rate theo format; book override/bulk/effective date.
- Preview seller net gồm price, seller discount, platform fee, Affiliate commission, net.
- Save dùng version/ETag; conflict cho reload/diff. Audit timeline có before/after/reason/request ID.

Admin:

- Queue/detail; approve/reject/request changes có confirm, reason code + note.
- Suspend/reverse/manual adjustment cần re-auth/2FA, impact preview và audit.
- Không có nút sửa balance trực tiếp; chỉ journal adjustment có workflow/quyền.
- Operations hiển thị backlog, failed outbox, DLQ, mismatch và correlation/log link.

Responsive:

- Desktop ≥1024: sidebar + main; tablet 768–1023: collapsible nav; mobile <768: single column/bottom sheet filter.
- KPI mobile grid 2 cột hoặc horizontal scroll; table chuyển card/controlled scroll; tiền không bị cắt.
- Sticky CTA không che nav/Toast; test 1440x900, 768x1024, 390x844, 360px width.

---

## 6. End-to-end business flow

```mermaid
sequenceDiagram
    autonumber
    actor AF as Affiliate
    actor B as Buyer
    participant FE as Web/App
    participant GW as API Gateway
    participant CM as Commerce Service
    participant AN as Analytics Service
    participant MQ as Outbox/RabbitMQ
    participant NT as Notification/Realtime
    participant WL as Wallet/Ledger
    participant PO as Payout

    AF->>GW: Đăng ký (idempotency key)
    GW->>CM: Validate + PENDING_REVIEW
    CM->>MQ: APPLICATION_SUBMITTED
    MQ->>NT: Thông báo Admin/User
    Note over AF,CM: Admin duyệt → ACTIVE
    AF->>GW: Tạo link book/store + campaign
    GW->>CM: Validate + issue link
    B->>FE: Mở link
    FE->>GW: Resolve ref
    GW->>CM: Tạo/cập nhật AttributionSession
    CM->>AN: Outbox analytics event
    CM-->>FE: Opaque cookie/token
    B->>GW: Preview checkout
    GW->>CM: Resolve attribution + pricing
    B->>GW: Confirm checkout/payment
    GW->>CM: Transaction Order + Commission PENDING snapshot + Outbox
    CM->>MQ: COMMISSION_CREATED
    MQ->>NT: Invalidate dashboard
    Note over CM: Order eligible → HOLDING; dispute chặn release
    CM->>WL: Settlement idempotent double-entry
    WL-->>CM: Ledger reference committed
    CM->>MQ: COMMISSION_AVAILABLE
    NT-->>FE: resourceId/version; FE fetch snapshot
    AF->>PO: KYC/bank/PIN/2FA + payout
    PO->>WL: Freeze → disburse/debit hoặc release khi fail
    PO-->>AF: Persisted + realtime payout status
```

Cancel/refund:

- Trước settlement: `PENDING/HOLDING → CANCELLED`, không credit.
- Sau settlement: `AVAILABLE → REVERSED`, Ledger bù trừ tham chiếu transaction gốc.
- Partial refund xử lý cấp item/base. Đã rút tiền thì tạo receivable/debt hoặc khấu trừ tương lai theo policy; không xóa lịch sử.

---

## 7. Backend architecture và data ownership

| Service | Sở hữu |
|---|---|
| `commerce-service` | Profile MVP, policy, link, checkout attribution, commission, settlement, Ledger integration. |
| `promotion-service` | Discount breakdown/funding; không quyết định commission. |
| `analytics-service` | Click/funnel/read aggregate; không mutate tiền. |
| `community-service` | Persisted notification + authenticated realtime. |
| `identity-service` | Identity/role/auth; không lưu balance. |
| API Gateway | JWT, identity headers, correlation ID, routing, rate limit. |

Không chia một financial transaction đồng bộ qua nhiều DB. Dùng local transaction + transactional outbox + idempotent consumer.

Schema tối thiểu:

- `AffiliateProfile`, `AffiliateChannel`, `AffiliateConsent`.
- `AffiliatePolicy`, `StoreAffiliateSetting`, `BookAffiliateSetting` có version/effective range.
- `AffiliateLink`, `AffiliateAttribution` với opaque token hash, expiry, target, first/last click, fraud status.
- `AffiliateCommission` cấp order item: base/rate/amount/funding/policy snapshot, lifecycle, ledger refs, version.
- Owner-aware Affiliate wallet/subaccount hoặc payout profile đúng thiết kế đã duyệt.
- `AffiliateFraudCase` và shared `AffiliateAuditLog`/audit resource.

Ràng buộc:

- Code unique case-insensitive; commission business key unique; Ledger idempotency key unique.
- Decimal precision thống nhất Wallet/Ledger; UTC timestamps.
- `totalEarnings` không là nguồn sự thật; projection phải reconcile được.
- Không hard-delete commission/Ledger/audit.
- Transition dùng compare-and-set/version hoặc transaction lock; retry là no-op/idempotent.

API dự kiến:

- User: `GET /affiliate/program`, `POST /affiliate/applications`, `GET/PATCH /affiliate/me`, `POST /affiliate/me/resubmit`, `GET /affiliate/code-availability`, CRUD links, `GET /r/:shortCode` để redirect, `POST /affiliate/attributions` để lưu attribution bền vững, dashboard, commissions và payouts.
- Seller: settings, book override/bulk, overview, commissions.
- Admin: list/detail/decision/status, platform policies, reconciliation, journal adjustments.

Contract:

- OpenAPI DTO/response/pagination rõ; mutation nhận `Idempotency-Key`; concurrent edit dùng version/ETag.
- Stable error code; không nhận `userId`, owner, rate hoặc amount do client khai nếu server suy ra được.

---

## 8. Dòng tiền và accounting controls

```text
commissionBase
  = item merchandise amount after seller-funded discount allocation
  - non-commissionable amount

commissionAmount
  = floorVnd(Decimal(commissionBase) × Decimal(ratePercent) / 100)
```

- Không tính ship/tax/service fee nếu policy không cho. Platform-funded discount phải tách funding.
- Không dùng JavaScript `number` cho tiền; sau khi làm tròn phải enforce `0 <= commissionAmount <= sellerPayableBeforeCommission`.
- Lưu snapshot tại checkout; thay rate sau đó không hồi tố.
- Mỗi Ledger transaction có tổng debit = tổng credit.
- Seller payable giảm đúng commission Seller tài trợ; Affiliate tăng khi hết holding và không dispute.
- Một commission tối đa một settlement gốc; reversal/adjustment luôn tham chiếu gốc.
- Wallet reconcile với Ledger; cấm sửa balance bằng phép cộng trực tiếp.
- Payout freeze trước provider; retry không freeze/debit lần hai.

Ledger account cần xem xét: `AFFILIATE_PAYABLE_PENDING`, `AFFILIATE_PAYABLE_AVAILABLE`, `AFFILIATE_PAYABLE_FROZEN`, seller commission expense/contra-payable, reversal clearing, payout clearing. Không dùng `PLATFORM_MARKETING_EXPENSE` nếu Seller là bên tài trợ.

Reconciliation hàng ngày và on-demand kiểm tra commission↔settlement, reversal↔original, payout↔freeze/debit/provider, liability↔account summary, seller net↔pricing snapshot. Mismatch vào review queue + alert; không tự bơm tiền bù.

---

## 9. Realtime specification

- Server state là nguồn sự thật. Outbox → broker → consumer/read model → authenticated WebSocket.
- Event chỉ mang `eventId`, `type`, `resourceId`, `version`, `occurredAt`, scope tối thiểu; không gửi KYC/bank/PII.
- Frontend nhận event sẽ invalidate/refetch. BroadcastChannel chỉ đồng bộ tab sau khi nhận state hợp lệ.
- Event tối thiểu: application submitted/status, profile suspended, link created, commission created/status, balance updated, payout status, reconciliation alert.
- Resource có monotonic `version`; dedupe bằng `eventId`; bỏ event cũ/out-of-order.
- Reconnect exponential backoff + jitter; sau reconnect refetch hoặc sync cursor. Socket lỗi thì polling với backoff/Page Visibility và hiển thị `lastUpdatedAt`.
- Không dùng WebSocket ACK để kết luận giao dịch tiền thành công.

Bắt buộc hardening:

- Bỏ hard-coded JWT fallback; production fail-fast nếu thiếu secret.
- CORS origin allowlist, không dùng `*` cho authenticated socket.
- Room suy ra từ verified JWT + server membership, không tin room/store ID client gửi.
- Rate limit connection/event, payload limit; log auth failure nhưng không log token.

---

## 10. Security, privacy và fraud

- Attribution cookie dùng opaque/signed token, `Secure`, `SameSite` phù hợp; expiry server-side; checkout không tin `ref` thô.
- Raw click analytics được phép best-effort, nhưng `AttributionSession` ảnh hưởng commission phải lưu bền vững phía server; Redis/in-memory chỉ là cache.
- CSRF cho cookie mutation, CORS allowlist, CSP review, rate-limit register/code/link/resolve/export/payout/admin.
- Owner/role/store authorization ở service layer; IDOR test toàn bộ resource.
- Sanitize/output encode bio/campaign/URL; chống open redirect và scheme nguy hiểm.
- KYC/bank/phone/email phải mask/encrypt/access-log/retention; không đưa PII vào metrics/log.
- Re-auth + purpose-bound PIN/2FA token cho payout và privileged finance action.
- Secret từ environment/secret manager, có rotation; dependency/SAST/container scan trong CI nếu khả dụng.

Fraud:

- Hard block: cùng user, profile không ACTIVE, attribution hết hạn/tampered.
- Risk/review: trùng phone/address/device/payment fingerprint, click burst, conversion/refund bất thường, nhiều account cùng channel.
- Không auto-block chỉ dựa IP/shared household.
- Rule version + evidence snapshot; Admin decision có reason/actor/time; fingerprint pseudonymized và có retention.

---

## 11. Logging, audit, metrics và hạ tầng

Structured JSON log tối thiểu: `timestamp`, `level`, `service`, `environment`, `event`, `traceId`, `correlationId`, `requestId`, `eventId`, internal resource IDs, result, duration, errorCode.

- Không log JWT/cookie/PIN/OTP/bank/CCCD/phone/email đầy đủ hoặc sensitive request body.
- Không dùng user/order/book ID hay amount làm Prometheus label.
- Retry log attempt/reason; terminal failure vào DLQ/failed state + alert.
- Correlation ID xuyên Gateway → service → outbox → consumer → Ledger/Payout.

Audit bắt buộc: application decisions, suspension, link disable, Seller rate changes, Admin policy, cancel/reverse/adjustment, KYC/bank/PIN/payout, fraud decision, reconciliation repair. Record gồm actor/role/scope, before/after sanitized, fields, reason, request ID, IP/user-agent và timestamp; immutable.

Metrics:

- Counter: attribution result, application decision, commission transition, settlement/reversal/payout result.
- Gauge: holding/settlement backlog, failed outbox, reconciliation mismatch, socket connections.
- Histogram: resolve/calculation/settlement latency, realtime delivery lag.

Grafana/Loki/alert:

- Operations dashboard cho funnel, liability, settlement, reversal, payout, error.
- Saved queries theo trace/commission/event ID.
- P0/P1: unbalanced Ledger, duplicate credit, mismatch vượt ngưỡng, double debit, missing secret/config.
- Operational: DLQ/backlog/age, socket auth spike, attribution rejects, analytics lag.
- Mỗi alert có runbook: verify, containment/kill switch, recovery, reconcile, escalation owner.

Hạ tầng:

- PostgreSQL migration backward-compatible, index strategy, backup/restore test.
- RabbitMQ durable queue/exchange, DLQ, retry backoff, prefetch, idempotent consumer.
- Redis chỉ cache/rate-limit/lock có TTL; không là nguồn sự thật tiền.
- Worker claim/lock, bounded concurrency, graceful shutdown.
- Health/readiness, feature flags riêng cho registration/attribution/commission/settlement/payout.
- Staging gần production; holding test override bằng config rõ ràng, không hard-code vào production.
- CI: schema/migration, backend/frontend test, typecheck/lint, Playwright, security scan phù hợp.

---

## 12. Test strategy và E2E matrix

Test layers: unit validator/calculation/state; integration Prisma/outbox/Ledger/auth/reconcile; contract API/event; component UI; Playwright desktop/mobile; targeted failure for duplicate/out-of-order/broker/socket/provider.

| ID | Kịch bản | Kết quả |
|---|---|---|
| AFF-01 | Registration sai/đúng từng step | Error đúng field; một hồ sơ. |
| AFF-02 | Code race/double submit | Code/hồ sơ duy nhất, idempotent. |
| AFF-03 | Request changes → resubmit → approve | History đủ, realtime/refetch đúng. |
| AFF-04 | ACTIVE tạo/copy link | Server-issued link, rate preview đúng. |
| AFF-05 | Click A rồi B | B nhận last-click. |
| AFF-06 | Token sửa/hết hạn/suspended | Không commission, checkout vẫn chạy. |
| AFF-07 | Self-referral | Loại với reason/audit. |
| AFF-08 | Multi-store/format cart | Chỉ item eligible; snapshot đúng. |
| AFF-09 | Seller/platform voucher | Base/funding đúng. |
| AFF-10 | Seller đổi rate sau order | Đơn cũ giữ snapshot. |
| AFF-11 | Retry checkout/webhook/outbox | Không trùng commission/effect. |
| AFF-12 | Physical + return window | HOLDING → AVAILABLE đúng. |
| AFF-13 | Ebook paid/granted | Lifecycle đúng policy. |
| AFF-14 | Dispute mở | Settlement bị chặn. |
| AFF-15 | Cancel/refund trước settle | CANCELLED, không credit. |
| AFF-16 | Full/partial refund sau settle | REVERSED + Ledger bù đúng. |
| AFF-17 | Concurrent workers | Credit đúng một lần. |
| AFF-18 | Socket duplicate/out-of-order/reconnect | UI không rollback; snapshot đúng version. |
| AFF-19 | Socket down | Polling fallback, dữ liệu đúng. |
| AFF-20 | Payout dưới ngưỡng/sai PIN/2FA | Từ chối, không freeze sai. |
| AFF-21 | Payout approve/reject/fail/retry | Không mất/nhân đôi tiền. |
| AFF-22 | Cross-user/store IDOR | Từ chối, không lộ dữ liệu. |
| AFF-23 | Mobile registration/dashboard/link | Không overflow/che CTA. |
| AFF-24 | Full ebook journey | Register → click → buy → settle → payout → reconcile. |
| AFF-25 | Full physical/COD journey | Remit/deliver/hold/settle/payout đúng. |
| AFF-26 | Inject reconciliation mismatch | Alert/review, không tự bơm tiền. |

Definition of done mỗi giai đoạn: acceptance/UI states/API đạt; không P0/P1; không skip test để làm xanh; auth/idempotency/audit/observability có test; desktop/tablet/mobile E2E liên quan pass; có accounting evidence; tài liệu/runbook/rollback cập nhật; báo cáo và dừng.

---

## 13. Roadmap theo giai đoạn

### Giai đoạn 0 — Product discovery, UI inventory và policy lock

**Trạng thái:** `[x]` Hoàn thành (Báo cáo tại `docs/affiliate/PHASE-0-AUDIT-REPORT.md`)

**Hỏi đầu giai đoạn:** attribution scope/window, approval, KYC timing, funding, base/discount, holding theo format, self-referral, reversal debt, payout/tax, realtime SLA.

**Làm:** audit sâu code/UI/schema; component inventory; wireflow ba role; policy matrix; threat model; accounting diagram; baseline.

**Test/E2E:** smoke checkout → escrow → wallet → payout; frontend/backend baseline.

**Deliverable:** signed decision log, UI map, data-flow/threat model, baseline report. **STOP chờ lệnh.**

### Giai đoạn 1 — UX contract, prototype và validation contract

**Trạng thái:** `[~]` Đang rà soát và làm sạch (Loại bỏ toàn bộ mock runtime/fake data/state switcher; chuyển sang honest unavailable states cho đến khi có backend)

**Hỏi:** routes, wording, fields, required/optional, draft, mobile, KPI, filter/export. (Đã chốt và duyệt v1.4.1)

**Làm:** high-fidelity states dùng component hiện có; Zod/DTO matrix; stable errors; accessibility/responsive criteria; API mock. (Hoàn thành đầy đủ trên Landing, 4-step Registration, Application Status, Dashboard 7 KPIs, BookAffiliateCard trên `/book/[id]`, `/r/[shortCode]` fragment redirect handler)

**Test/E2E:** component interactions; registration/dashboard prototype desktop/mobile; accessibility smoke. (Đã pass: 18 Vitest unit tests, 5 Playwright E2E tests, tsc --noEmit pass 100%) **STOP chờ lệnh Giai đoạn 2.**

### Giai đoạn 2 — Data model, migration, policy engine và audit foundation

**Trạng thái:** `[ ]`

**Hỏi:** wallet ownership, schema location, retention, policy version/effective date, Ledger accounts.

**Làm:** Prisma models/migration/index/constraints; state machine; policy resolver; audit actions; event schemas; flags.

**Test/E2E:** migration empty/existing DB; schema validate; unit/integration state/idempotency; commerce regression. **STOP chờ lệnh.**

### Giai đoạn 3 — Registration và Admin review end-to-end

**Trạng thái:** `[ ]`

**Hỏi:** review SLA, reason codes, notification channels, resubmit/appeal limits, approver roles.

**Làm:** APIs, multi-step UI, application status, Admin review, notification/outbox, audit timeline.

**Test/E2E:** AFF-01/02/03/22/23; auth/validation; typecheck/lint/build. **STOP chờ lệnh.**

### Giai đoạn 4 — Seller policy và book eligibility

**Trạng thái:** `[ ]`

**Hỏi:** default/override priority, caps, format rates, scheduling, bulk UX, disable semantics.

**Làm:** Seller/Admin policy API/UI; seller-net preview; concurrency; audit/realtime invalidation.

**Test/E2E:** store isolation, cap/effective version, edit conflict, responsive bulk table. **STOP chờ lệnh.**

### Giai đoạn 5 — Link, attribution và analytics

**Trạng thái:** `[ ]`

**Hỏi:** target scope, sub-ID, short link/QR, consent, bot/dedupe, retention.

**Làm:** link APIs/UI/book CTA; secure resolve/cookie; last-click; rate-limit; analytics outbox/aggregate.

**Test/E2E:** AFF-04/05/06/07/23; tamper/expiry/rate-limit/analytics-down/performance. **STOP chờ lệnh.**

### Giai đoạn 6 — Checkout calculation và PENDING snapshot

**Trạng thái:** `[ ]`

**Hỏi:** Buyer disclosure, discount allocation, COD timing, rounding, seller-net floor, attribution scope.

**Làm:** preview/confirm resolver; calculation; snapshot; transaction/outbox; seller payable; idempotency.

**Test/E2E:** AFF-08/09/10/11; voucher/flash-sale/multi-store/COD regression; accounting table. **STOP chờ lệnh.**

### Giai đoạn 7 — Lifecycle, dispute, cancel và reversal

**Trạng thái:** `[ ]`

**Hỏi:** ebook/physical release, buyer-confirm shortcut, partial refund, debt, privileged adjustment.

**Làm:** consumers; holding; dispute gate; cancel/reversal; dedupe/out-of-order; DLQ/replay.

**Test/E2E:** AFF-12…17; worker restart; escrow/refund regression. **STOP chờ lệnh.**

### Giai đoạn 8 — Wallet/Ledger settlement và reconciliation

**Trạng thái:** `[ ]`

**Hỏi:** wallet/subaccount, bucket, schedule/timezone, repair workflow, journal approval.

**Làm:** accounts/posting; settlement worker; balance API; reconciliation job/UI/alerts; recovery.

**Test/E2E:** AFF-16/17/26; concurrency/crash; Ledger balance; wallet/admin finance regression. **STOP chờ lệnh.**

### Giai đoạn 9 — Dashboard, reporting và production realtime

**Trạng thái:** `[ ]`

**Hỏi:** KPI/freshness, export, notification preferences, stale UX, realtime SLA.

**Làm:** ba-role dashboards; read models; events; socket hardening; reconnect/poll; responsive/a11y.

**Test/E2E:** AFF-18/19/23; permissions; metric consistency; fanout/query load. **STOP chờ lệnh.**

### Giai đoạn 10 — KYC, payout và fraud operations

**Trạng thái:** `[ ]`

**Hỏi:** KYC provider/manual, documents, encryption/retention, bank verify, tax, threshold/fee, fraud policy.

**Làm:** KYC/payout setup; payout owner model; PIN/2FA; fraud queue; payout lifecycle; audit/notification.

**Test/E2E:** AFF-20/21/22/24/25; concurrency/provider timeout; PII leak scan. **STOP chờ lệnh.**

### Giai đoạn 11 — Observability, infrastructure và performance

**Trạng thái:** `[ ]`

**Hỏi:** SLO/SLA, alert/on-call, retention, volume, capacity, RPO/RTO.

**Làm:** structured logs; Grafana/Loki/Prometheus; alerts/runbooks; queue/DLQ; health; load; backup/restore; secret/CORS hardening.

**Test/E2E:** alert firing, trace correlation, dependency degradation, graceful shutdown, restore/migration/load. **STOP chờ lệnh.**

### Giai đoạn 12 — Full UAT, rollout và hậu kiểm

**Trạng thái:** `[ ]`

**Hỏi:** allowlist/percentage rollout, observation window, kill-switch owner, go/no-go approvers.

**Làm:** staging full journey; UAT ba role; config/migration; feature flags; production smoke; post-release reconciliation.

**Test/E2E:** AFF-01…26; full regression; CI gate; kill switch/rollback drill.

**Điều kiện hoàn tất:** không P0/P1; Ledger cân; mismatch được giải thích; UAT sign-off; runbook/on-call sẵn sàng. **Chỉ rollout khi có lệnh rõ ràng.**

---

## 14. Decision log

| ID | Ngày | Giai đoạn | Câu hỏi | Quyết định | Người chốt |
|---|---|---|---|---|---|
| AFF-DEC-001 | 2026-10-21 | 0 | Attribution scope | Áp dụng theo cùng Store. Item đủ điều kiện thuộc Store A mới có commission. Không trả chéo Store. Commission ghi nhận cấp OrderItem. | Chủ dự án |
| AFF-DEC-002 | 2026-10-21 | 0 | Attribution model | `LAST_ELIGIBLE_CLICK`. Cookie window Web 30 ngày. Link hết hạn, profile không ACTIVE, target không eligible không thay thế attribution trước. | Chủ dự án |
| AFF-DEC-003 | 2026-10-21 | 0 | Funding source | MVP do Seller tài trợ 100%, trừ vào Seller payable, không giảm platform fee. Schema giữ field `fundingSource` để mở rộng. | Chủ dự án |
| AFF-DEC-004 | 2026-10-21 | 0 | Affiliate approval | `DRAFT → PENDING_REVIEW → ACTIVE` (nhánh `REQUEST_CHANGES`, `REJECTED`, `SUSPENDED`). Admin duyệt thủ công có audit reason. | Chủ dự án |
| AFF-DEC-005 | 2026-10-21 | 0 | Holding period | Physical: 7 ngày sau COMPLETED và hết hạn đổi trả/khiếu nại; Ebook: 24h sau thanh toán và cấp quyền đọc. Đơn có dispute tiếp tục phong tỏa. | Chủ dự án |
| AFF-DEC-006 | 2026-10-21 | 0 | Wallet architecture | Không giả cá nhân thành Store. Mở rộng Wallet theo `ownerType: STORE \| USER`, `ownerId`, `purpose: SELLER \| AFFILIATE`, unique hợp thành. Dùng chung Ledger & Payout. | Chủ dự án |
| AFF-DEC-007 | 2026-10-21 | 0 | Commission base & rounding | Tính trên merchandise amount trừ seller discount. Platform voucher không giảm base. Không tính ship/thuế/phí. Dùng Decimal theo `floorVnd(base × ratePercent / 100)` và enforce amount không vượt seller payable trước commission; không dùng JS floating point cho tiền. | Chủ dự án |
| AFF-DEC-008 | 2026-10-21 | 0 | Self-referral & Fraud | Hard block: `buyer.userId === affiliate.userId`, profile không ACTIVE, token hết hạn/tampered. Risk flag: trùng SĐT/địa chỉ/thiết bị. Không auto-block chỉ theo IP. | Chủ dự án |
| AFF-DEC-009 | 2026-10-21 | 0 | Refund & Reversal | Trước settle: CANCELLED. Sau settle: REVERSED + Ledger entry bù trừ. Rút tiền rồi tạo receivable debt cấn trừ tương lai. Không xóa lịch sử cũ. | Chủ dự án |
| AFF-DEC-010 | 2026-10-21 | 0 | Payout & 2FA | Ngưỡng rút tối thiểu 100.000 VND. Yêu cầu KYC, bank, PIN, 2FA trước lần rút đầu. Đóng băng balance trước khi gọi provider. | Chủ dự án |
| AFF-DEC-011 | 2026-10-21 | 0 | Tax policy | MVP hiển thị và ghi nhận gross commission, chưa tự động khấu trừ thuế TNCN. UI ghi chú "Thu nhập trước thuế (nếu áp dụng)". Data model sẵn sàng cho withholding sau này. | Chủ dự án |
| AFF-DEC-012 | 2026-10-21 | 0 | Item eligibility | Click sách A mua sách B cùng Store chỉ tính hoa hồng nếu B đang bật Affiliate. Tỷ lệ hoa hồng lấy theo snapshot của chính sách B tại checkout. | Chủ dự án |
| AFF-DEC-013 | 2026-10-21 | 0 | Link sharing UI on book detail | Card "Chia sẻ và nhận hoa hồng" cạnh vùng mua (sau khối CTA trên desktop). Trên mobile đặt sau nút mua chính, không che sticky CTA. Chỉ hiện khi Affiliate ACTIVE. | Chủ dự án |
| AFF-DEC-014 | 2026-10-21 | 0 | Payout channels | Giai đoạn MVP chỉ rút tiền qua Chuyển khoản Ngân hàng nội địa (VietQR/Napas247) sau KYC & Bank snapshot. Chưa hỗ trợ đổi sang số dư mua sách để giữ chuẩn hạch toán độc lập. | Chủ dự án |
| AFF-DEC-015 | 2026-10-21 | 0 | Affiliate code rules | Tự đặt 4–24 ký tự `[A-Z0-9_]`, tự động uppercase, unique case-insensitive, chặn từ khóa hệ thống (reserved words). Debounce 500ms + rate-limit, có nút gợi ý mã ngẫu nhiên. | Chủ dự án |

---

## 15. Mẫu báo cáo cuối mỗi giai đoạn

```md
## Báo cáo Affiliate — Giai đoạn N

### Trạng thái
- Hoàn thành / Bị chặn / Còn lỗi

### Câu hỏi và quyết định đã chốt
- AFF-DEC-...

### UI/UX đã hoàn thành
- Route/screen/state/responsive/accessibility: ...

### Backend/data/realtime đã hoàn thành
- API/schema/event/worker: ...

### Security và dòng tiền
- Authorization/idempotency/Ledger/reconciliation/PII: ...

### File/migration/config đã thay đổi
- ...

### Test evidence
- Unit/integration: `<command>` → PASS/FAIL
- Build/typecheck/lint: `<command>` → PASS/FAIL
- E2E desktop/mobile: X/Y PASS
- Accounting/reconciliation: PASS/FAIL

### Observability và vận hành
- Log/metric/alert/runbook: ...

### Rủi ro, nợ kỹ thuật và rollback
- ...

### Điểm dừng
Đã dừng sau Giai đoạn N. Chờ chủ dự án ra lệnh trước Giai đoạn N+1.
```

---

## 16. Tiêu chí kết thúc toàn chương trình

- User đăng ký, được duyệt, tạo link, theo dõi commission và payout bằng UI hoàn chỉnh desktop/mobile.
- Seller cấu hình policy, xem cost/revenue và audit đúng store; Admin review/investigate/reconcile bằng privileged workflow.
- Validation client/server thống nhất; không tin dữ liệu client cho quyền hoặc tiền.
- Attribution chống sửa; fraud có policy/evidence/review.
- Snapshot/lifecycle/cancel/reversal/partial refund đúng; double-entry Ledger là nguồn sự thật.
- Settlement/payout idempotent; reconciliation khớp.
- Realtime có auth, ordering/version, reconnect, polling fallback; không làm sai balance.
- Log không rò PII/secret; trace end-to-end; metric/alert/runbook/kill switch hoạt động.
- AFF-01…AFF-26 và regression pass; UAT được ký duyệt.
- Mỗi giai đoạn có decision log, test evidence, báo cáo và điểm dừng.

