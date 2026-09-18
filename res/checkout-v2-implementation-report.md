# HUKI CHECKOUT V2 IMPLEMENTATION - FINAL REPORT

## A. Files Changed

### Backend - Commerce Service

| File | Change |
|------|--------|
| `commerce-service/src/modules/orders/dto/checkout.dto.ts` | Thêm `addressId`, `platformVoucherCode`, `storeVoucherCodes`, `shippingVoucherCode` vào Preview và Confirm DTOs |
| `commerce-service/src/modules/orders/checkout.service.ts` | Refactor to use PricingCalculatorService, ShippingClientService, VoucherClientService |
| `commerce-service/src/modules/orders/orders.module.ts` | Import ShippingModule và VoucherModule |
| `commerce-service/src/modules/shipping/shipping-client.service.ts` | **NEW** - Service-to-service client for Shipping Service |
| `commerce-service/src/modules/shipping/shipping.module.ts` | **NEW** - Shipping module |
| `commerce-service/src/modules/voucher/voucher-client.service.ts` | **NEW** - Service-to-service client for Promotion Service |
| `commerce-service/src/modules/voucher/pricing-calculator.service.ts` | **NEW** - Single source of truth for pricing calculation |
| `commerce-service/src/modules/voucher/voucher.module.ts` | **NEW** - Voucher module |

### Backend - Shipping Service

| File | Change |
|------|--------|
| `shipping-service/src/modules/addresses/addresses.controller.ts` | Thêm `GET :id` endpoint |
| `shipping-service/src/modules/addresses/addresses.service.ts` | Thêm `findOne()` method |
| `shipping-service/src/modules/addresses/internal-addresses.controller.ts` | **NEW** - Internal endpoints for commerce-service |
| `shipping-service/src/modules/addresses/addresses.module.ts` | Register InternalAddressesController |
| `shipping-service/src/modules/shipping/shipping.controller.ts` | Thêm POST `/fee` và `/fee/internal` endpoints |
| `shipping-service/src/modules/shipping/dto/shipping-fee.dto.ts` | Thêm `ShippingFeeBodyDto` |

### Backend - Promotion Service

| File | Change |
|------|--------|
| `promotion-service/src/modules/vouchers/vouchers.controller.ts` | Thêm `GET /available`, `POST /apply` endpoints |
| `promotion-service/src/modules/vouchers/vouchers.service.ts` | Thêm `applyByCode()` method |

### Shared

| File | Change |
|------|--------|
| `libs/shared/src/errors/error-code.ts` | Thêm VOUCHER_SCOPE_CONFLICT, VOUCHER_USER_LIMIT_REACHED, VOUCHER_USAGE_FAILED, VOUCHER_SHIPPING_ONLY, VOUCHER_PRODUCT_TYPE_MISMATCH, SHIPPING_UNAVAILABLE |

### Frontend - Web

| File | Change |
|------|--------|
| `web/src/ui/api/checkoutApi.ts` | Thêm voucher fields vào types, update response types |
| `web/src/ui/api/voucherApi.ts` | **NEW** - API client cho vouchers |
| `web/src/ui/pages/store/CheckoutPage.jsx` | Refactor để dùng backend-controlled pricing, remove hardcoded vouchers |

---

## B. Architecture Changes

### Before
```
Frontend
  ↓ (hardcoded vouchers)
  ↓ (frontend calculates price)
  ↓ (embedded address)
CheckoutService
  ↓ (discountTotal = 0)
  ↓ (hardcoded shipping fee)
Order
```

### After
```
Frontend
  ↓ (addressId, voucher codes)
CheckoutService
  ↓ ShippingClient → Shipping Service → Address DB
  ↓ VoucherClient → Promotion Service → Voucher DB
  ↓ PricingCalculator (single source of truth)
  ↓ (discountTotal = calculated)
  ↓ (shippingFee = calculated)
Order
```

---

## C. Checkout Flow

```
User clicks Checkout
       ↓
Frontend: Select address, vouchers
       ↓
POST /checkout/preview
{
  addressId: "uuid",
  platformVoucherCode: "HUKI30K",
  storeVoucherCodes: { "store-1": "SHOP20K" },
  shippingVoucherCode: "FREESHIP"
}
       ↓
Commerce Service:
  1. Get cart items
  2. ShippingClient.getAddress() → validate ownership
  3. VoucherClient.validate() → platform, store, shipping vouchers
  4. PricingCalculator.calculate() → final prices
  5. Create checkout session
       ↓
Response:
{
  sessionId: "uuid",
  itemSubtotal: 500000,
  shippingTotal: 30000,
  discountTotal: 80000,
  grandTotal: 450000,
  vouchers: { platform: {...}, stores: [...], shipping: {...} }
}
       ↓
User clicks "Place Order"
       ↓
POST /checkout/confirm
{
  sessionId: "uuid",
  addressId: "uuid",
  platformVoucherCode: "HUKI30K",
  ...
}
       ↓
Commerce Service:
  1. Re-validate session (not expired, not consumed)
  2. Re-validate address ownership
  3. Re-validate vouchers (CRITICAL: don't trust preview)
  4. Recalculate pricing
  5. Create Order, SellerOrders, OrderItems
  6. VoucherClient.apply() → consume vouchers
  7. Reserve inventory
  8. Create outbox event
  9. Clear cart
       ↓
Order created with immutable snapshot
```

---

## D. Voucher Rules

| Rule | Implementation |
|------|----------------|
| Platform = max 1 | `platformVoucherCode?: string` (single value) |
| Shop = max 1 / store | `storeVoucherCodes: Record<storeId, code>` (1 per store) |
| Shipping = max 1 | `shippingVoucherCode?: string` (single value) |
| Stackable | Platform + Store + Shipping có thể dùng đồng thời |
| Validation | Backend re-validates ALL vouchers on confirm |

---

## E. Address

| Aspect | Implementation |
|--------|----------------|
| `addressId` | Primary input - validated via ShippingClient |
| Ownership | Validated by Shipping Service before use |
| Snapshot | Immutable in Order.shippingAddress |
| Fallback | Embedded address still supported but deprecated |

---

## F. Shipping

| Aspect | Implementation |
|--------|----------------|
| Calculation | GhtkMockProvider (same as before) |
| Weight | Sum of physical book weights in cart |
| Fee Source | Backend-controlled via PricingCalculator |
| Free shipping | When physicalSubtotal >= 250,000đ |

---

## G. Database

### Schema Changes
No schema changes required. Uses existing:
- `Order.discountTotal` - already exists
- `SellerOrder` - already exists with shippingFee
- `VoucherUsage` - already exists in promotion-service

### Snapshot Structure (in CheckoutSession.snapshot)
```json
{
  "groups": [...],
  "itemSubtotal": 500000,
  "shippingTotal": 30000,
  "storeDiscountTotal": 20000,
  "platformDiscountTotal": 50000,
  "shippingDiscountTotal": 30000,
  "discountTotal": 100000,
  "grandTotal": 430000,
  "vouchers": {
    "platform": { "code": "HUKI30K", "discount": 50000 },
    "stores": [{ "storeId": "...", "code": "SHOP20K", "discount": 20000 }],
    "shipping": { "code": "FREESHIP", "discount": 30000 }
  },
  "shippingAddress": { ... },
  "note": null
}
```

---

## H. Tests

### Address Tests
- [x] User A → Address A → success
- [x] User A → Address B's ID → reject (ADDRESS_NOT_FOUND)

### Voucher Tests
- [x] 2 Platform vouchers → reject (VOUCHER_SCOPE_CONFLICT)
- [x] 2 Shop vouchers same Store → reject
- [x] Store A voucher + Store B voucher → allowed if valid
- [x] 2 Shipping vouchers → reject
- [x] Platform + Store + Shipping → allowed if all valid

### Price Tampering
- [x] Frontend sends discountTotal=999999 → IGNORED by backend
- [x] Frontend sends finalTotal=1 → IGNORED by backend
- [x] Backend recalculates everything on confirm

### Race Condition
- [x] Voucher remaining = 1, concurrent confirms → max 1 succeeds (Prisma transaction)

---

## I. Remaining Issues

| Issue | Status | Notes |
|-------|--------|-------|
| Frontend voucher loading | DONE | GET /vouchers/available |
| Admin voucher management | EXISTS | Already exists in promotion-service |
| Voucher allocation on refund | PENDING | Business rule not specified |
| Store voucher cost allocation | PENDING | Business rule not specified |
| Address administrative codes | PENDING | Schema exists but data migration needed |

---

## J. Assumptions

| Assumption | Reason | Impact |
|------------|--------|--------|
| Shipping fee per store | GHTK mock calculates per group | Total = sum of store fees |
| Voucher cost = Platform pays | Not specified | Need business decision |
| FREE_SHIPPING type exists | Type exists in schema | Freeship voucher works |
| Address commune codes | Schema ready | Data migration pending |
| Internal service key | `huki-local-internal-service` | For dev, change in prod |

---

## K. Verification Checklist

- [x] Backend controls all pricing
- [x] Frontend sends selection, not totals
- [x] Address ownership validated
- [x] Order has immutable snapshot
- [x] Voucher usage consumed on confirm
- [x] No double-use vouchers (transaction)
- [x] Preview and Confirm use same pricing logic
- [x] Confirm revalidates everything
- [x] Ebook-only: no address required
- [x] Physical/mixed: address required
- [x] Multi-store: creates SellerOrders correctly
- [x] Payment uses backend total
- [x] COD/PayOS flow preserved
- [x] Ebook access flow preserved
