# HUKI Affiliate Marketing — Báo Cáo Khảo Sát & Audit Toàn Diện (Giai Đoạn 0)

> **Tài liệu:** Deliverable bắt buộc Giai đoạn 0 — Product Discovery, UI Inventory & Policy Lock  
> **Repository:** `E:\HuKi`  
> **Thời điểm lập:** 2026-10-21  
> **Trạng thái:** Hoàn thành audit khảo sát. Không sửa schema, không tạo migration, không can thiệp code nghiệp vụ.

---

## 1. Báo Cáo Baseline Hệ Thống

### 1.1 Trạng thái Git Baseline
- **Branch:** `develop`
- **Commit HEAD:** `c5f832ef3d65e1309fa234e67848bef1c70a65ee`
- **Trạng thái workspace:** Sạch (Clean). File chưa track duy nhất: `task/AFFILIATE-MARKETING-AUDIT-ROADMAP.md` (roadmap nhiệm vụ). Không có thay đổi dở dang nào bị ghi đè.

### 1.2 Bằng chứng kiểm thử Baseline (Verification Evidence)
1. **Backend Unit & Integration Tests (Commerce, Wallet, Payout, Orders):**
   - **Lệnh thực thi:** `npm test -- apps/commerce-service/src/modules/wallet apps/commerce-service/src/modules/payout apps/commerce-service/src/modules/orders`
   - **Kết quả:** **9/9 test suites PASS, 156/156 tests PASS (100% xanh)** trong 38.36s.
   - **Phạm vi bảo đảm:** `settlement.service`, `wallet.service`, `inventory-reservation.service`, `payout-processor.service`, `checkout.service`, `order-completion.service`, `payout.service`, `orders.service`, `wallet-security.service`.
2. **Frontend Typecheck:**
   - **Lệnh thực thi:** `npm run typecheck` tại `web/` (`tsc --noEmit`)
   - **Kết quả:** **PASS (0 errors)**.
3. **Post-Deployment Smoke Test:**
   - **Lệnh thực thi:** `node scripts/deploy/smoke-test.mjs`
   - **Kết quả:** **5/5 checks PASS (100% xanh)** (Gateway Liveness, Downstream Services Health, Auth Proxying, Catalog Listing, Web Frontend Health).
4. **E2E Checkout & Fulfillment Baseline:**
   - **Lệnh thực thi:** `node scripts/e2e-phase4-checkout.mjs`
   - **Kết quả:** **8/8 steps PASS (100% xanh)** (Login, Catalog Discovery, Cart Lifecycle, Shipping Address, COD Checkout, Order Listing, 4-step Seller Fulfillment, Cart Cleanup).

---

## 2. UI & Component Inventory

Khảo sát đối chiếu trên mã nguồn giao diện `web/src`:

| # | Thành phần / Module khảo sát | File mã nguồn thực tế | Phần tái sử dụng tốt | Phần cần Refactor | Điều tuyệt đối KHÔNG sao chép | Khoảng trống cần xây mới |
|---|---|---|---|---|---|---|
| 1 | **Seller Registration / Onboarding** | `web/src/ui/components/seller/SellerRegisterView.tsx` | Cấu trúc stepper đa bước, chuyển bước linh hoạt, `PolicyQuickModal`, redirect theo trạng thái hồ sơ. | Tách validation thành schema Zod rời; tinh gọn state form. | **Không sao chép** các trường pháp nhân nặng nề (giấy phép kinh doanh, MST doanh nghiệp, kho hàng, CCCD đại diện). | Form 4 bước Affiliate cá nhân: Profile ➔ Kênh truyền thông ➔ Khai báo ➔ Điều khoản. |
| 2 | **Form Controls & Modals** | `web/src/ui/components/common/Input.tsx`, `Select.tsx`, `Button.tsx`, `CustomModal.tsx`, `Toast.tsx` | Chuẩn design system token, variant, focus ring, disabled state, helper text, inline error message. | Bổ sung prop `aria-describedby` liên kết trực tiếp với error element để đạt chuẩn a11y. | Không dùng validation chay trong onChange hoặc alert browser thuần. | Input kiểm tra mã Affiliate khả dụng (`code-availability`) có debounce 500ms. |
| 3 | **Account Navigation** | `web/src/ui/components/layout/AccountLayout.tsx` | Nhóm nav, active route highlight, role badge, responsive mobile drawer. | Mở rộng danh mục `navGroups` để nhúng mục "TIẾP THỊ LIÊN KẾT". | Không tạo portal độc lập bị lệch design token và layout chung. | Nhóm menu con Affiliate: Dashboard, Tạo Link, Hoa Hồng, Rút Tiền, Cài Đặt Kênh. |
| 4 | **KPI & Analytics Cards** | `web/src/ui/components/analytics/KPICard.tsx` | Card hiển thị số liệu, % tăng trưởng, icon, loading skeleton. | Chuẩn hóa format tiền tệ `vi-VN` từ props Decimal server-side. | Không tự tính toán sum/aggregation ở client. | KPI Card: Clicks hợp lệ, Tỷ lệ chuyển đổi, Chờ đối soát, Khả dụng, Đã rút, Hoàn trả. |
| 5 | **Data Tables & Filters** | `web/src/ui/components/common/GroupedDataTable.tsx`, `DataTableFilterBar.tsx` | Phân trang, server-side sort, filter đa chiều, summary row chân bảng (`<tfoot>`). | Tối ưu responsive trên màn hình mobile (<768px): chuyển card view hoặc cuộn ngang có kiểm soát. | Không client-side filter toàn bộ tập dữ liệu lớn. | Bảng lịch sử hoa hồng (Commission table) và Bảng quản lý link tiếp thị. |
| 6 | **Financial Tables** | `web/src/ui/components/common/FinancialTransactionTable.tsx` | Format dòng tiền có mã màu (xanh có/đỏ nợ), mã tham chiếu, thời gian. | Chuẩn hóa liên kết ngược về mã đơn hàng (order code) và Ledger transaction. | Không hiển thị số dư chưa đối soát như tiền khả dụng. | Bảng đối soát hoa hồng chi tiết cấp Item và Ledger reference link. |
| 7 | **Audit History Timeline** | `web/src/ui/components/common/AuditHistoryTimeline.tsx` | Timeline mốc thời gian, trạng thái badge, icon, chi tiết actor. | Tái sử dụng nguyên vẹn cho lịch sử vòng đời commission và lịch sử duyệt hồ sơ. | Không ẩn lý do từ chối hoặc lý do điều chỉnh tài chính. | Drawer xem chi tiết Attribution Snapshot & Trạng thái chuyển đổi. |
| 8 | **Escrow Countdown** | `web/src/ui/components/order/EscrowCountdown.tsx` | Đồng hồ đếm ngược thời gian giữ tiền, thanh tiến độ trực quan. | Nhận mốc `holdingUntil` từ server; không tự sinh timestamp ở trình duyệt. | Không hardcode thời gian 7 ngày ở client. | Widget đếm ngược ngày mở khóa hoa hồng trên từng kiện hàng. |
| 9 | **Wallet, Bank & PIN UX** | `web/src/ui/components/seller/WithdrawalPinModal.tsx`, `UpdateBankModal.tsx`, `SecurityPinModal.tsx` | Luồng nhập PIN 6 số, mask ký tự, bàn phím số, modal liên kết tài khoản ngân hàng. | Tách rời ràng buộc `storeId`, hỗ trợ định danh cá nhân `userId`. | **Không lưu PIN thô** hoặc lịch sử PIN trong `localStorage`. | Màn hình thiết lập hồ sơ thụ hưởng và xác thực 2FA rút hoa hồng cá nhân. |
| 10 | **Notification & Realtime UI** | `web/src/ui/components/common/UniversalNotificationBell.tsx`, `RedDotBadge.tsx` | Chuông thông báo góc phải, phân nhóm vai trò, badge đếm tin chưa đọc. | Bổ sung kênh sự kiện Affiliate: `AFFILIATE_APPLICATION_*`, `COMMISSION_*`. | Không dựa vào payload WebSocket để cập nhật balance tức thì. | Drawer thông báo biến động hoa hồng và kết quả xét duyệt hồ sơ. |
| 11 | **UI States & Feedback** | `web/src/ui/components/common/EmptyState.tsx`, `Toast.tsx` | Minh họa rỗng, nút hành động call-to-action, toast thông báo đa cấp. | Bổ sung nút "Thử lại" (Retry) trên tất cả các màn hình báo lỗi mạng/API. | Không để màn hình trắng khi API timeout. | Empty state chuyên biệt khi chưa có link tiếp thị hoặc chưa phát sinh hoa hồng. |

---

## 3. Backend & Data-Flow Inventory

### 3.1 Khảo sát các luồng lõi hiện tại
1. **Cart & Checkout Preview / Confirm (`commerce-service`):**
   - File: `platform/apps/commerce-service/src/modules/orders/checkout.service.ts` và `pricing-calculator.service.ts`.
   - Cơ chế: Tạo `CheckoutSession` chứa snapshot giá; confirm đơn hàng nhận `idempotencyKey` và `paymentMethod`.
   - Điểm gắn kết: Cần nhận `attributionToken` hoặc `affiliateCode` vào `CheckoutPreviewDto` và snapshot trực tiếp vào `CheckoutSession.snapshot`.
2. **Order Hierarchy & Item Splitting:**
   - Cấu trúc: `Order` ➔ `SellerOrder` (theo từng `storeId`) ➔ `OrderItem` (theo từng `bookId`, format, unitPrice, subtotal).
   - Điểm gắn kết: Commission **phải được ghi nhận ở cấp `OrderItem`** vì mỗi sách có % hoa hồng riêng hoặc có thể không bật Affiliate.
3. **Pricing, Voucher Funding & Discount Allocation:**
   - Trong `PricingResult`, hệ thống đã tách bạch rõ:
     - `storeDiscountTotal`: Giảm giá do Seller tài trợ.
     - `platformDiscountTotal`: Giảm giá do Sàn tài trợ.
     - `shippingDiscountTotal`: Giảm giá vận chuyển.
   - Công thức `commissionBase`: `subtotal - storeDiscountAllocated`. Platform voucher hoàn toàn không làm giảm base của Affiliate.
4. **Completion, Escrow & Dispute:**
   - File: `order-completion.service.ts`, `orders.service.ts`.
   - Đơn chuyển sang `COMPLETED` khi được giao thành công. Trạng thái `ESCROW_FROZEN` kích hoạt khi có khiếu nại/dispute.
   - Event thực tế hiện có là `ORDER_EVENTS.COMPLETED` (`ORDER_COMPLETED`) và `ESCROW_EVENTS.RELEASED` (`ESCROW_RELEASED`); **không tồn tại** event `SELLER_COMPLETED` trong `domain-event.ts`.
   - Điểm gắn kết phải được chốt ở giai đoạn thiết kế: với commission cấp `OrderItem`/`SellerOrder`, hoặc phát một domain event SellerOrder-completed mới trong cùng transaction, hoặc dùng event escrow release có payload chứa `sellerOrderId`. Không được dựa vào tên event giả định. Dispute đang mở luôn chặn settlement.
5. **Outbox Pattern & Event Bus (Tách biệt Click Stream vs Transactional Outbox):**
   - Implementation thực tế: model `OutboxEvent` trong Prisma của service và publisher `platform/apps/commerce-service/src/modules/events/commerce-outbox.publisher.ts`; event contract nằm ở `platform/libs/shared/src/events/domain-event.ts`. Không có file `platform/libs/shared/src/events/outbox.service.ts`.
   - **Nguyên tắc phân định ranh giới sự kiện:**
     - *Raw Click Analytics (Tần suất cao, không quyết định tiền):* Event `AFFILIATE_LINK_CLICKED` có thể gửi best-effort tới collector của `analytics-service`, sau đó buffer/aggregate bằng hạ tầng phù hợp. Mất analytics không được làm hỏng redirect hoặc checkout.
     - *Eligible Attribution (Có ảnh hưởng đến tiền):* `AttributionSession` phải được xác thực và lưu bền vững phía server trước khi dùng tại checkout. Redis/in-memory chỉ được làm cache; không được là bằng chứng duy nhất để cấp commission.
     - *Luồng Financial & Lifecycle (Giao dịch có bảo đảm):* Chỉ các sự kiện thay đổi trạng thái hồ sơ và dòng tiền có tính pháp lý/kế toán mới được ghi vào bảng `OutboxEvent` trong cùng local transaction:
       - `AFFILIATE_APPLICATION_SUBMITTED`
       - `AFFILIATE_APPLICATION_APPROVED` / `AFFILIATE_APPLICATION_REJECTED`
       - `AFFILIATE_COMMISSION_CREATED` (khi đơn hàng checkout thành công)
       - `AFFILIATE_COMMISSION_SETTLED` (khi hết thời hạn holding 7 ngày / 24h)
       - `AFFILIATE_COMMISSION_CANCELLED` (khi đơn hàng bị hủy trước settlement)
       - `AFFILIATE_COMMISSION_REVERSED` (khi hoàn tiền sau settlement kèm bút toán bù trừ Ledger)
       - `AFFILIATE_PAYOUT_REQUESTED` / `AFFILIATE_PAYOUT_DISBURSED`
6. **API Gateway Routing & Tracing:**
   - File: `platform/apps/api-gateway/src/modules/proxy/service-proxy.middleware.ts`.
   - Header forwarding: Tự động đính kèm `x-request-id`, `x-correlation-id`, `x-user-id`, `x-user-role`.
   - Điểm gắn kết: Cần đăng ký tiền tố `affiliate: 'commerce'` trong bảng định tuyến `ROUTES`.

---

## 4. Threat Model & Security Assessment

Phân tích rủi ro an ninh theo mô hình STRIDE đối với tính năng Tiếp thị liên kết:

| Nguy cơ (Threat) | Loại STRIDE | Điểm trọng yếu trong hệ thống | Biện pháp kiểm soát bắt buộc |
|---|---|---|---|
| **Giả mạo Attribution Token / Cookie** | Tampering | Khách hàng hoặc bot sửa giá trị mã affiliate trong cookie trình duyệt để chuyển hoa hồng sang tài khoản khác. | Mã hóa hoặc ký số HMAC token attribution (`opaque signed token`), kiểm tra tính hợp lệ và tồn tại trên server khi resolve. |
| **Trục lợi tự mua (Self-Referral Fraud)** | Spoofing / Elevation | Affiliate tự click vào link của chính mình rồi đặt mua sách để lấy chiết khấu hoa hồng. | **Hard block:** Chặn tuyệt đối nếu `buyer.userId === affiliate.userId`. Gắn cờ cảnh báo (risk flag) nếu trùng số điện thoại, địa chỉ nhận hàng hoặc fingerprint thanh toán. |
| **Truy cập chéo dữ liệu hoa hồng (IDOR)** | Information Disclosure | Affiliate A sửa ID trên URL `/api/v1/affiliate/commissions/:id` để đọc dữ liệu hoa hồng và đơn hàng của Affiliate B. | Enforce quyền sở hữu nghiêm ngặt tại Service Layer: `commission.affiliateProfile.userId === actor.sub`. Trả về 404/403. |
| **Lộ lọt thông tin cá nhân (PII Leakage)** | Information Disclosure | Báo cáo danh sách đơn hàng của Affiliate hiển thị tên thật, số điện thoại, địa chỉ nhà của Buyer. | **Data Masking:** Affiliate chỉ được nhìn thấy mã đơn hàng ẩn danh (VD: `ORD-***-71FD`), tên sách và số tiền hoa hồng; tuyệt đối không trả thông tin cá nhân của Buyer. |
| **Spam Click & Click Flooding** | Denial of Service | Dùng tool/bot bắn hàng triệu request click ảo để chiếm quyền attribution và làm nghẽn hệ thống. | Rate-limit nhiều lớp theo IP, session, link và user nếu đã đăng nhập; dedupe raw click theo anonymous session/link/time bucket. Không hard-block chỉ theo IP vì NAT/shared network dễ tạo false positive. |
| **Chi trả trùng lặp (Double Payout)** | Repudiation / Tampering | Worker crash hoặc retry gọi cổng thanh toán ngân hàng nhiều lần dẫn đến chuyển tiền hoa hồng nhiều lần. | **Idempotent Payout:** Đóng băng số dư khả dụng (`AFFILIATE_FROZEN`) trước khi phát lệnh payout; dùng `idempotencyKey` duy nhất cho mỗi giao dịch rút tiền. |
| **Rút tiền rồi hoàn hàng (Cash-and-Run Fraud)** | Tampering / Financial Loss | Khách nhận hàng, Affiliate rút tiền hoa hồng xong thì khách gửi khiếu nại trả hàng đòi hoàn tiền. | **Escrow Holding Window:** Giữ tiền hoa hồng ở trạng thái `HOLDING` đủ thời hạn giải quyết khiếu nại (7 ngày với sách giấy). Nếu phát sinh sau giải ngân, ghi nhận công nợ âm (`receivable debt`) cấn trừ kỳ sau. |

### 4.2 Ma Trận Rate-Limiting Cụ Thể (Gateway & Service Layer)

Để bảo vệ hạ tầng khỏi lạm dụng và tấn công từ chối dịch vụ, các hạn mức dưới đây là **giá trị cấu hình ban đầu**, phải đặt qua environment/config, quan sát metrics và điều chỉnh; không hard-code thành bất biến nghiệp vụ:
1. **Redirect công khai (`GET /r/:shortCode`):** đọc metadata tối thiểu và redirect an toàn; không trực tiếp coi browser prefetch/crawler là một eligible attribution.
2. **Tạo/cập nhật attribution (`POST /affiliate/attributions`):** đề xuất khởi điểm `60 req/phút/IP` kết hợp session/link limiter. Endpoint mutation này mới được phép đặt opaque cookie và lưu `AttributionSession` bền vững.
3. **Raw analytics (`POST /analytics/events/batch`):** best-effort, batch, payload limit và bot/dedupe controls; không quyết định commission.
4. **Kiểm tra mã (`GET /affiliate/code-availability`):** client debounce `500ms`, đề xuất `30 req/phút/IP`.
5. **Nộp hồ sơ (`POST /affiliate/applications`):** đề xuất `5 req/giờ/user`.
6. **Tạo link (`POST /affiliate/links`):** đề xuất `120 req/giờ/user`, đồng thời giới hạn tổng số link active/campaign.
7. **Yêu cầu rút tiền (`POST /affiliate/payouts`):** tối đa `2 req/ngày/owner` theo `PayoutService.MAXIMUM_DAILY_REQUEST_COUNT = 2`, cộng idempotency và concurrency control.

---

## 5. Dòng Tiền & Accounting Audit (Double-Entry Ledger)

### 5.1 Sơ đồ Dòng tiền Thực tế Toàn trình

```text
[1. Khách Hàng Thanh Toán: 100.000đ]
                  │
                  ▼
        ┌───────────────────┐
        │   ESCROW_HOLDING  │ (100.000đ giữ trong tài khoản ký quỹ sàn)
        └───────────────────┘
                  │
                  ├─── (Sau khi giao hàng thành công & hết khiếu nại)
                  │
                  ├───► [Phí Dịch Vụ Sàn: 10% = 10.000đ] ──► PLATFORM_REVENUE
                  │
                  └───► [Doanh Thu Kiện Hàng: 90.000đ]
                                │
                                ├───► [Hoa Hồng Affiliate: 10% = 10.000đ] ──► AFFILIATE_PAYABLE
                                │
                                └───► [Thực Nhận Của Seller: 80.000đ]     ──► SELLER_AVAILABLE
```

### 5.2 Khảo sát Sổ Cái Kép (Double-Entry Invariant)
- **Hiện trạng:**
  - `LedgerTransaction` liên kết với nhiều `LedgerEntry`.
  - Quy tắc bất biến: `SUM(DEBIT) === SUM(CREDIT)` trên mọi giao dịch.
  - Các tài khoản hiện có trong `LedgerAccountType`: `ESCROW_HOLDING`, `SELLER_PENDING`, `SELLER_AVAILABLE`, `SELLER_FROZEN`, `PLATFORM_REVENUE`, `PLATFORM_MARKETING_EXPENSE`, `REFUND_CLEARING`, `PAYOUT_CLEARING`.
- **Khoảng trống cần bổ sung cho Affiliate (Giai đoạn 2):**
  - Cần thêm các tài khoản sổ cái chuyên biệt:
    1. `AFFILIATE_PAYABLE_PENDING` (Nợ phải trả Affiliate — Tạm tính).
    2. `AFFILIATE_PAYABLE_AVAILABLE` (Nợ phải trả Affiliate — Khả dụng).
    3. `AFFILIATE_PAYABLE_FROZEN` (Nợ phải trả Affiliate — Đang phong tỏa rút tiền).
    4. `SELLER_COMMISSION_CONTRA` (Chi phí hoa hồng tiếp thị do Người bán chịu, giảm trừ trực tiếp `SELLER_AVAILABLE`).
  - **Tuyệt đối không dùng** `PLATFORM_MARKETING_EXPENSE` vì trong mô hình MVP, Seller tài trợ 100% hoa hồng, sàn không trích ngân sách marketing.

### 5.3 Lỗi Kiến Trúc Cần Tránh trong `WalletService`
- **Phát hiện kiểm tra code thực tế:** Tại `platform/apps/commerce-service/src/modules/wallet/wallet.service.ts` (dòng 160–301), hàm `getWallet` đang tự động tính toán lại số dư bằng cách quét bảng `sellerOrders` và tự động gọi `prisma.wallet.update` với cửa sổ test 2 phút (`2 * 60 * 1000`).
- **Nguyên tắc cho Affiliate:** **Tuyệt đối KHÔNG sao chép cơ chế tính lại này**. Với Affiliate, số dư trong Ví phải là hình chiếu chính xác từ các giao dịch đã ghi sổ của `LedgerEntry`. Mọi biến động số dư khả dụng bắt buộc phải do `SettlementWorker` kích hoạt thông qua giao dịch sổ cái kép.

### 5.4 Quy tắc Làm tròn Tiền Việt Nam (VND Rounding)
- Tiền tệ Việt Nam Đồng (VND) là đơn vị nguyên tệ không có phần thập phân/xu.
- Không dùng JavaScript `number`/binary floating point cho phép tính tiền. Dùng `Prisma.Decimal`/decimal library hoặc minor-unit integer xuyên suốt pricing, snapshot và Ledger.
- `ratePercent` được lưu theo đơn vị phần trăm, ví dụ `10.50` nghĩa là `10,5%`. Công thức chuẩn:

  `commissionAmount = floorVnd(Decimal(commissionBase) × Decimal(ratePercent) / 100)`

- Sau khi làm tròn vẫn phải enforce:

  `0 <= commissionAmount <= sellerPayableBeforeCommission`

- **Phân tích rủi ro:**
  - Làm tròn xuống tránh chi vượt do phần lẻ VND, nhưng **không tự nó bảo đảm** Seller payable không âm. Rate cap, commissionable base, platform fee, discount funding và invariant phía server vẫn phải được kiểm tra trước khi commit.
  - Quy tắc làm tròn phải nằm trong một helper tài chính dùng chung và có test boundary; không gọi `Math.floor` rải rác ở nhiều service.

---

## 6. Realtime Architecture Assessment

Khảo sát hệ thống thông báo và đồng bộ thời gian thực:

1. **Khảo sát Server WebSocket Gateway (`community-service`):**
   - File: `platform/apps/community-service/src/modules/notifications/notification.gateway.ts`.
   - **Lỗ hổng bảo mật P1 phát hiện:**
     - Dòng 15: `cors: { origin: process.env.SOCKET_CORS_ORIGIN ?? "*" }` cho phép bất kỳ domain nào mở kết nối authenticated socket.
     - Dòng 37–41: Tồn tại mảng fallback JWT secret cứng (`'your-super-secret-jwt-key'`,...). Nếu môi trường thiếu biến cấu hình, socket sẽ xác thực bằng secret mặc định này.
   - **Khắc phục bắt buộc trước Production:** Loại bỏ hoàn toàn fallback secret, buộc fail-fast nếu thiếu `JWT_SECRET`, và cấu hình allowlist domain frontend rõ ràng.
2. **Khảo sát Client Realtime Bus (`realtimeSyncBus.ts`):**
   - File: `web/src/ui/services/realtimeSyncBus.ts`.
   - Cơ chế: Sử dụng `BroadcastChannel` để đồng bộ giữa các tab trình duyệt và phát âm thanh chuông báo.
   - **Nguyên tắc cốt lõi:** `realtimeSyncBus` chỉ là công cụ tối ưu UX tại client, **hoàn toàn không phải nguồn sự thật tài chính**. Khi nhận sự kiện biến động hoa hồng, client chỉ hiển thị thông báo và kích hoạt refetch snapshot số dư từ backend API.
3. **Phân phối Sự kiện (Event Fan-out):**
   - Transactional Outbox ghi nhận sự kiện vào database ➔ RabbitMQ exchange `huki.events` ➔ Notification Consumer ➔ WebSocket Server emit đến room cá nhân `user:{userId}`.

---

## 7. Observability & Infrastructure Gap Analysis

1. **Logging có cấu trúc (Structured Logging):**
   - Cần bổ sung các log fields chuẩn: `{ event: 'AFFILIATE_*', traceId, correlationId, affiliateId, orderId, bookId, rate, amount }`.
   - Sanitize triệt để: Không log số tài khoản ngân hàng, mã PIN, số CCCD/MST, hoặc token tracking trong plaintext log.
2. **Prometheus Metrics Đề xuất (Chưa triển khai):**
   - `huki_affiliate_clicks_total{status="valid|tampered|expired|self_referral"}`
   - `huki_affiliate_commissions_total{status="pending|holding|available|cancelled|reversed"}`
   - `huki_affiliate_settlement_duration_seconds`
   - `huki_affiliate_discrepancy_count`
3. **Grafana & Alert Runbooks:**
   - Cần bổ sung dashboard giám sát: Phễu chuyển đổi click ➔ đơn hàng, tổng nghĩa vụ nợ hoa hồng (Affiliate Liability), số lượng đơn có holding quá hạn chưa giải ngân.
   - P0 Alert: Lệch sổ cái kép Affiliate (`AFFILIATE_LEDGER_UNBALANCED`), giải ngân âm tiền ví.
4. **Hạ tầng & Dead Letter Queue (DLQ):**
   - Hàng đợi RabbitMQ xử lý settlement hoa hồng bắt buộc phải có dead-letter exchange (`huki.events.dlx`) và retry backoff để không làm nghẽn worker khi có lỗi database tạm thời.

---

## 8. Ma Trận Đánh Giá Rủi Ro (Risk Register)

| ID | Nhóm rủi ro | Mô tả chi tiết | Mức độ | Kế hoạch kiểm soát & Giảm thiểu |
|---|---|---|:---:|---|
| **RSK-01** | **Xung đột mô hình Ví (Wallet Isolation)** | Bảng `Wallet` hiện tại có ràng buộc `storeId @unique`. Nếu gán bừa Affiliate vào storeId sẽ phá vỡ mô hình phân quyền đa gian hàng. | **P0** | **AFF-DEC-006:** Thiết kế migration mở rộng Wallet theo `ownerType: STORE | USER`, `ownerId`, `purpose: SELLER | AFFILIATE` với khóa unique tổng hợp. |
| **RSK-02** | **Lệch Sổ Cái do Tự Tính Số Dư** | Thói quen tái tính số dư từ bảng đơn hàng khi đọc (như `wallet.service.ts` dòng 290) có thể làm lệch đối soát với `LedgerEntry`. | **P0** | **AFF-DEC-009:** Cấm tuyệt đối việc cộng/trừ số dư ngoài giao dịch Ledger. Mọi biến động tiền Affiliate phải sinh ra cặp bút toán kép cân bằng. |
| **RSK-03** | **Lỗ hổng WebSocket Secret Fallback** | Fallback secret cứng trong `notification.gateway.ts` có thể bị kẻ xấu lợi dụng để tạo token giả mạo nghe lén channel thông báo. | **P1** | Hardening `notification.gateway.ts` ở Giai đoạn chuẩn bị hạ tầng, xóa bỏ secret mẫu, fail-fast nếu thiếu biến môi trường. |
| **RSK-04** | **Gian lận Click Chéo & Self-Referral** | Người bán hoặc người mua tự tạo nick phụ để hưởng chiết khấu hoa hồng của chính đơn mình mua. | **P1** | **AFF-DEC-008:** Hard block khi `buyer.userId === affiliate.userId`; risk-flag các đơn cùng thiết bị, cùng tài khoản thanh toán PayOS hoặc cùng địa chỉ giao hàng. |
| **RSK-05** | **Rút tiền trong thời gian tranh chấp** | Affiliate rút hoa hồng trong khi kiện hàng đang bị Buyer khiếu nại trả hàng do sách lỗi/hư hỏng. | **P1** | **AFF-DEC-005:** Tiền hoa hồng bắt buộc nằm ở trạng thái `HOLDING` cho đến khi hết 7 ngày sau khi giao hàng thành công và không có khiếu nại nào đang mở. |
| **RSK-06** | **Tràn tải Worker Settlement** | Lượng đơn hàng hoàn tất vào ban đêm tăng đột biến gây nghẽn job đối soát tự động. | **P2** | Phân trang xử lý theo batch (VD: 100 commissions/batch), dùng database advisory lock chống race condition giữa nhiều worker. |

---

## 9. Decision Log (Quyết Định Nghiệp Vụ AFF-DEC-001 đến AFF-DEC-015)

Tất cả các quyết định đã được chốt và đồng bộ chính thức:

- **AFF-DEC-001 (Attribution Scope):** Áp dụng theo cùng Store. Buyer click link thuộc Store A thì chỉ các item đủ điều kiện thuộc Store A mới có commission. Không trả chéo Store. Mỗi commission được tạo ở cấp `OrderItem`.
- **AFF-DEC-002 (Attribution Model):** Sử dụng `LAST_ELIGIBLE_CLICK`. Thời hạn cookie trên Web là 30 ngày. Link hết hạn, Affiliate không `ACTIVE`, target không eligible hoặc token bị sửa không được thay attribution hợp lệ trước đó.
- **AFF-DEC-003 (Funding Source):** Giai đoạn MVP do Seller tài trợ 100%. Commission trừ khỏi phần Seller payable, không làm giảm doanh thu phí sàn (platform fee). Schema lưu trường `fundingSource` để mở rộng platform co-funding sau này.
- **AFF-DEC-004 (Affiliate Approval):** Luồng trạng thái: `DRAFT ➔ PENDING_REVIEW ➔ ACTIVE` (với các nhánh `REQUEST_CHANGES`, `REJECTED`, `SUSPENDED`, `TERMINATED`). Admin HUKI duyệt thủ công, ghi nhận đầy đủ actor, lý do và audit history.
- **AFF-DEC-005 (Holding Period):** Sách giấy (Physical) giữ hoa hồng 7 ngày kể từ khi đơn chuyển sang `COMPLETED` (hết hạn khiếu nại đổi trả). Sách số (Ebook/Audio) giữ 24 giờ sau khi thanh toán thành công và cấp quyền đọc. Đơn có khiếu nại/dispute đang mở sẽ bị phong tỏa giải ngân.
- **AFF-DEC-006 (Wallet Architecture):** Không giả Affiliate thành Store. Đề xuất migration mở rộng mô hình ví: `ownerType: 'STORE' | 'USER'`, `ownerId`, `purpose: 'SELLER' | 'AFFILIATE'`, `currency: 'VND'`, unique theo `(ownerType, ownerId, purpose, currency)`. Dùng chung Ledger và Payout pipeline.
- **AFF-DEC-007 (Commission Base & Rounding):** Tính trên merchandise amount của từng item sau khi trừ chiết khấu do Seller tài trợ. Platform voucher không làm giảm base. Không tính ship, thuế hay phí dịch vụ. Tính bằng Decimal theo `floorVnd(base × ratePercent / 100)`, đồng thời enforce `commissionAmount <= sellerPayableBeforeCommission`; không dùng JavaScript floating point cho tiền.
- **AFF-DEC-008 (Self-Referral & Anti-Fraud):** Hard block khi `buyer.userId === affiliate.userId`, profile không `ACTIVE`, token hết hạn. Risk-flag đối soát khi trùng số điện thoại, địa chỉ hoặc thiết bị; không tự động khóa tài khoản chỉ dựa trên địa chỉ IP.
- **AFF-DEC-009 (Refund & Reversal):** Hủy đơn trước settlement ➔ Commission chuyển `CANCELLED`. Hủy/hoàn tiền sau settlement ➔ Commission chuyển `REVERSED`, ghi bút toán sổ cái kép bù trừ. Nếu đã rút tiền, tạo khoản công nợ cấn trừ vào hoa hồng phát sinh tương lai.
- **AFF-DEC-010 (Payout Threshold & 2FA):** Ngưỡng rút tiền tối thiểu: 100.000 VND. Yêu cầu hoàn thiện thông tin tài khoản ngân hàng, mã PIN bảo mật và xác thực 2FA có gắn mục đích trước lần rút tiền đầu tiên. Đóng băng số dư khả dụng trước khi phát lệnh chi trả.
- **AFF-DEC-011 (Tax Policy):** Giai đoạn MVP hiển thị và ghi nhận hoa hồng gộp (Gross Commission), chưa tự động khấu trừ thuế TNCN tại nguồn; giao diện ghi chú rõ "Thu nhập trước thuế (nếu áp dụng)". Data model thiết kế sẵn các cột hỗ trợ khấu trừ thuế khi có chính sách pháp lý.
- **AFF-DEC-012 (Item Eligibility):** Khách click sách A nhưng mua sách B cùng Store thì B chỉ được tính hoa hồng nếu sách B đang được bật Affiliate. Tỷ lệ hoa hồng áp dụng theo đúng snapshot cấu hình của sách B tại thời điểm checkout, không lấy tỷ lệ của sách A gán cho sách B.
- **AFF-DEC-013 (Link Sharing UI on Book Detail):** Card "Chia sẻ và nhận hoa hồng" đặt cạnh vùng mua (sau khối CTA Mua ngay/Thêm giỏ hàng trên desktop). Trên mobile đặt sau nút mua chính, tuyệt đối không che thanh sticky CTA. Chỉ hiển thị khi tài khoản Affiliate đang ở trạng thái `ACTIVE`.
- **AFF-DEC-014 (Payout Channels):** Giai đoạn MVP chỉ hỗ trợ rút tiền qua Chuyển khoản Ngân hàng nội địa (VietQR / Napas247) sau khi hoàn tất KYC và bank snapshot. Chưa hỗ trợ đổi sang số dư mua sách/xu tiêu dùng để giữ vững tính tách biệt độc lập giữa Ví Thu Nhập và Ví Tiêu Dùng.
- **AFF-DEC-015 (Affiliate Code Rules):** Cho phép người dùng tự đặt mã 4–24 ký tự `[A-Z0-9_]`, tự động uppercase, unique case-insensitive. Chặn danh sách từ khóa hệ thống (reserved words). Debounce 500ms phía client và rate-limit ở backend. Cung cấp nút "Gợi ý ngẫu nhiên" nếu người dùng không muốn tự đặt.

---

## 10. Trạng Thái Kết Thúc Giai Đoạn 0

- Toàn bộ 15 quyết định nghiệp vụ (AFF-DEC-001 đến AFF-DEC-015) đã được chốt và đồng bộ hoàn tất.
- Các khoảng trống và rủi ro P0/P1/P2 đã được nhận diện đầy đủ.
- Đã sẵn sàng các điều kiện tiên quyết cho Giai đoạn 1 (UX Contract, Prototype và Validation Contract).
