# 📋 HUKI EBOOK - TASK PLAN INDEX

## MỤC LỤC

### Phase 0: Infrastructure Foundation
- [PHASE-00-INFRASTRUCTURE.md](./PHASE-00-INFRASTRUCTURE.md) - Prometheus, Backup, Grafana, Alerts, Loki, OpenTelemetry

### Phase 1: Seller Onboarding
- [PHASE-01-SELLER-ONBOARDING.md](./PHASE-01-SELLER-ONBOARDING.md) - Seller Wizard, KYC, RBAC, Notifications

### Phase 2: Product Catalog
- [PHASE-02-PRODUCT-CATALOG.md](./PHASE-02-PRODUCT-CATALOG.md) - Add Product, ISBN, DRM, Sample Preview

### Phase 3: Cart & Checkout
- [PHASE-03-CART-CHECKOUT.md](./PHASE-03-CART-CHECKOUT.md) - Cart Grouping, Voucher, Order Creation

### Phase 4: Inventory & Payment
- [PHASE-04-INVENTORY-PAYMENT.md](./PHASE-04-INVENTORY-PAYMENT.md) - Inventory Lock, PayOS, TTL, Refund

### Phase 5: Order Fulfillment
- [PHASE-05-ORDER-FULFILLMENT.md](./PHASE-05-ORDER-FULFILLMENT.md) - Shipping, AWB, Tracking

### Phase 6: Ebook & DRM
- [PHASE-06-EBOOK-DRM.md](./PHASE-06-EBOOK-DRM.md) - Ebook Unlock, Reader, Watermark

### Phase 7: Post-Order Services
- [PHASE-07-POST-ORDER.md](./PHASE-07-POST-ORDER.md) - Cancellation, Disputes, Reviews

### Phase 8: Finance & Payouts
- [PHASE-08-FINANCE.md](./PHASE-08-FINANCE.md) - Escrow, Wallet, Payouts, PIN

### Phase 9: Analytics & Moderation
- [PHASE-09-ANALYTICS.md](./PHASE-09-ANALYTICS.md) - GMV, Dashboard, Sanctions

### Phase 10: Production Readiness
- [PHASE-10-PRODUCTION.md](./PHASE-10-PRODUCTION.md) - CI/CD, SSL, Auto-scaling, DR

### Phase 11: Testing & Performance
- [PHASE-11-TESTING.md](./PHASE-11-TESTING.md) - E2E, Load Test, Security

---

## 📊 PROGRESS TRACKER

| Phase | Name | Status | Tasks |
|:---:|---|:---:|:---:|
| 00 | Infrastructure | ✅ 1/7 | [Details](./PHASE-00-INFRASTRUCTURE.md) |
| 01 | Seller Onboarding | ⏳ | [Details](./PHASE-01-SELLER-ONBOARDING.md) |
| 02 | Product Catalog | ⏳ | [Details](./PHASE-02-PRODUCT-CATALOG.md) |
| 03 | Cart & Checkout | ⏳ | [Details](./PHASE-03-CART-CHECKOUT.md) |
| 04 | Inventory & Payment | ⏳ | [Details](./PHASE-04-INVENTORY-PAYMENT.md) |
| 05 | Order Fulfillment | ⏳ | [Details](./PHASE-05-ORDER-FULFILLMENT.md) |
| 06 | Ebook & DRM | ⏳ | [Details](./PHASE-06-EBOOK-DRM.md) |
| 07 | Post-Order | ⏳ | [Details](./PHASE-07-POST-ORDER.md) |
| 08 | Finance | ⏳ | [Details](./PHASE-08-FINANCE.md) |
| 09 | Analytics | ⏳ | [Details](./PHASE-09-ANALYTICS.md) |
| 10 | Production | ⏳ | [Details](./PHASE-10-PRODUCTION.md) |
| 11 | Testing | ⏳ | [Details](./PHASE-11-TESTING.md) |

**Legend:** ✅ Done | ⏳ In Progress | 🔲 Pending

---

## 📜 CANONICAL POLICY GOVERNANCE (WHAT)

Toàn bộ quy tắc kinh doanh (Business Rules) chính thức của HUKI EBOOK được chuẩn hóa và quản trị duy nhất tại thư mục [`policies/`](../../policies/):

| Canonical Policy | Tên chính sách | Bounded Context | Rules Owned | Phase liên quan |
|---|---|---|---|---|
| [POL-01](../../policies/POL-01-MERCHANT-KYC-PROFILE.md) | Merchant Lifecycle, KYC & Legal Profile Policy | Merchant Lifecycle | `KYC-001 → 003` | Phase 01 |
| [POL-02](../../policies/POL-02-STAFF-RBAC-SECURITY.md) | Staff RBAC & Merchant Security Policy | Access Control | `RBAC-001 → 002`, `SEC-001` | Phase 01 |
| [POL-03](../../policies/POL-03-HYBRID-CATALOG-ISBN.md) | Hybrid Product & ISBN Catalog Governance Policy | Product Catalog | `CAT-001 → 003` | Phase 02 |
| [POL-04](../../policies/POL-04-DRM-CONTENT-PROTECTION.md) | DRM & Digital Content Protection Policy | Ebook Protection | `DRM-001 → 003` | Phase 02, 06 |
| [POL-05](../../policies/POL-05-INVENTORY-CONCURRENCY.md) | 3-Tier Inventory & Atomic Concurrency Policy | Stock Tracking | `INV-001 → 003` | Phase 03, 04 |
| [POL-06](../../policies/POL-06-MULTI-STORE-CART.md) | Multi-Store Cart & Checkout Validation Policy | Shopping Cart | `CART-001 → 003` | Phase 03 |
| [POL-07](../../policies/POL-07-ORDER-SPLITTING-LIFECYCLE.md) | Master & Sub-Order Splitting Policy | Order Lifecycle | `ORD-001 → 003` | Phase 03, 05 |
| [POL-08](../../policies/POL-08-PAYMENT-GATEWAY-TTL.md) | Payment Gateway, TTL & Auto-Recovery Policy | Payment Ingestion | `PAY-001 → 003` | Phase 04 |
| [POL-09](../../policies/POL-09-SHIPPING-LOGISTICS.md) | Multi-Vendor Shipping & Logistics Policy | Carrier Logistics | `SHIP-001 → 003` | Phase 05 |
| [POL-10](../../policies/POL-10-PROMOTIONS-FLASH-SALE-VOUCHER.md) | Promotions, Flash Sale & Voucher Allocation Policy | Discounts | `VCH-001 → 003` | Phase 03 |
| [POL-11](../../policies/POL-11-POST-ORDER-RMA-RETURNS.md) | Post-Order RMA, 7-Day Return & Cancellation Policy | Returns & Refunds | `RMA-001 → 003` | Phase 07 |
| [POL-12](../../policies/POL-12-DISPUTE-ARBITRATION.md) | Dispute Resolution & Platform Arbitration Policy | Arbitration | `DSP-001 → 003` | Phase 07 |
| [POL-13](../../policies/POL-13-VERIFIED-REVIEW.md) | Verified Purchase & Community Review Policy | Reviews & Ratings | `REV-001 → 003` | Phase 07 |
| [POL-14](../../policies/POL-14-ESCROW-REVENUE-SETTLEMENT.md) | Escrow Holding & 85/15 Revenue Settlement Policy | Escrow & Settlement | `ESC-001`, `SPLIT-001`, `FEE-001` | Phase 08 |
| [POL-15](../../policies/POL-15-SELLER-WALLET-PAYOUT.md) | Seller Wallet, Security PIN & Payout Policy | Wallet & Payout | `WAL-001 → 002`, `PO-001`, `SEC-002` | Phase 08 |
| [POL-16](../../policies/POL-16-PLATFORM-MODERATION-SANCTIONS.md) | Platform Moderation, Sanctions & Freezing Policy | Moderation | `MOD-001 → 003` | Phase 09 |
| [POL-17](../../policies/POL-17-TAX-INVOICING-COMPLIANCE.md) | Tax, Financial Invoicing & Compliance Policy | Tax & Invoicing | `TAX-001 → 002` | Phase 08, 10 |

---

## 📁 RELATED DOCUMENTS

- [../../policies/](../../policies/) - Canonical Business Policies (WHAT)
- [../res/plan-flow/README.md](../res/plan-flow/README.md) - Business Flows & Audit Summary (HOW Business Executes)
- [../res/plan-flow/90-DAY-ROADMAP.md](../res/plan-flow/90-DAY-ROADMAP.md) - Master Roadmap
- [../res/plan-flow/res-flow-*.md](../res/plan-flow/) - Flow Audit Results

---

## 🚀 QUICK JUMP

**Current Focus:** Phase 0 - Task 2 (Backup Strategy)

**Next:** Continue Phase 0 → Task 2

