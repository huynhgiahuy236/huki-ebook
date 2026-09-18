# HUKI EBOOK - COMPREHENSIVE AUDIT REPORT

## PHASE 03: CART CHECKOUT + SELLER FINANCE + ADMIN FINANCE

---

## 1. CURRENT STATE SUMMARY

### USER SIDE

| Page | Status | Notes |
|------|--------|-------|
| Product Detail | ⚠️ NEEDS_WORK | Shows price, flash sale, but not clear distinction Product Discount vs Voucher |
| Cart | ❌ NEEDS_WORK | Hardcoded vouchers, hardcoded calculations |
| Checkout | ✅ DONE | Backend pricing integrated |
| Order History | ⚠️ NEEDS_WORK | Needs to show proper discount breakdown |
| Order Detail | ⚠️ NEEDS_WORK | Needs proper discount breakdown by type |

### SELLER SIDE

| Page | Status | Notes |
|------|--------|-------|
| Dashboard | ⚠️ MOCK | Shows stats but some mock data |
| Orders | ✅ OK | Order list works |
| Order Detail | ⚠️ NEEDS_WORK | Needs proper discount breakdown |
| Finance/Wallet | ❌ MOCK_DATA | Mock data, no real integration |
| **Promotion** | ❌ MISSING | NO Product Discount management |
| **Promotion** | ❌ MISSING | NO Shop Voucher management |

### ADMIN SIDE

| Page | Status | Notes |
|------|--------|-------|
| Dashboard | ⚠️ MOCK | Mock stats |
| Marketing | ⚠️ PARTIAL | Flash Sale OK, Voucher is mock |
| Finance | ❌ MOCK_DATA | Mock payout batches |
| **Withdrawal Requests** | ❌ MISSING | No real withdrawal approval flow |

---

## 2. DISCOUNT/VOUCHER TAXONOMY

### Current Implementation Status

```
DISCOUNT ECOSYSTEM:
├── PRODUCT DISCOUNT (Flash Sale Price)
│   ├── Type: Price reduction directly on book
│   ├── Backend: Flash Sale Service
│   ├── Frontend: Shows as discounted price
│   └── Status: ✅ Works but NOT distinguished from Voucher
│
├── HUKI VOUCHER (Platform)
│   ├── Type: Voucher code managed by HUKI Admin
│   ├── Backend: Promotion Service
│   ├── Limit: 1 per checkout
│   └── Status: ⚠️ Partial - Admin has management, User can apply
│
├── SHOP VOUCHER (Seller)
│   ├── Type: Voucher code managed by Seller
│   ├── Backend: Promotion Service (scope=STORE)
│   ├── Limit: 1 per Shop per checkout
│   └── Status: ❌ MISSING - No Seller UI
│
└── SHIPPING VOUCHER
    ├── Type: Free shipping
    ├── Backend: Promotion Service (type=FREE_SHIPPING)
    ├── Limit: 1 per checkout
    └── Status: ⚠️ Partial - User can apply, no dedicated UI
```

---

## 3. PRICING FLOW ANALYSIS

### Current Conceptual Flow

```
Base Product Price (book.price)
        ↓
Flash Sale Price (if active) → This is "Product Discount"
        ↓
Cart Item Price (unitPrice in cart) = Final price after Product Discount
        ↓
Shop Voucher (if applied to store) → Discount on subtotal
        ↓
HUKI Voucher (if applied) → Discount on subtotal
        ↓
Merchandise Total
        ↓
Shipping Fee (calculated)
        ↓
Shipping Voucher (if applied) → Discount on shipping fee only
        ↓
Grand Total
```

### Issues Found

1. **No clear distinction** between "Product Discount" and "Voucher" in UI
2. **Cart calculations** are hardcoded, not from backend
3. **Checkout calculations** now use backend (✅ good)
4. **Order snapshot** needs verification for all discount types

---

## 4. BACKEND ANALYSIS

### PricingCalculatorService

**Location:** `commerce-service/src/modules/voucher/pricing-calculator.service.ts`

**Current Flow:**
1. Group items by store
2. Calculate store subtotal
3. Apply store voucher per group
4. Calculate platform voucher discount
5. Calculate shipping fee
6. Apply shipping voucher
7. Return final pricing

**Missing:**
- Product Discount calculation (Flash Sale already handled in Cart)
- Clear breakdown of each discount type

### Order Snapshot

**Location:** `commerce-service/src/modules/orders/checkout.service.ts`

**Current Fields:**
- `itemSubtotal` - Original subtotal
- `discountTotal` - Total of all discounts
- `shippingTotal` - Shipping fee
- `grandTotal` - Final total

**Missing from Snapshot:**
- Product Discount amount (Flash Sale)
- HUKI Voucher discount (only stored in `vouchers` object)
- Shop Voucher discount (only stored in `vouchers` object)
- Shipping Voucher discount (only stored in `vouchers` object)
- **Need:** Clear breakdown stored in Order fields

### Seller Payout Calculation

**Current:** Not implemented in backend

**Need:**
- `Order.merchantSubtotal` - Total before platform fee
- `SellerOrder.sellerSubtotal` - Total before commission
- `SellerOrder.commissionAmount` - Platform commission
- `SellerOrder.sellerPayout` - Amount seller receives

---

## 5. DATABASE SCHEMA ANALYSIS

### Current Order Table

```prisma
model Order {
  itemSubtotal    Decimal
  shippingTotal   Decimal
  discountTotal   Decimal  // Total of ALL discounts
  grandTotal      Decimal
  
  // Missing:
  // - productDiscountTotal (Flash Sale savings)
  // - hukiVoucherTotal
  // - shopVoucherTotal  
  // - shippingVoucherTotal
}
```

### Current SellerOrder Table

```prisma
model SellerOrder {
  itemSubtotal    Decimal
  shippingFee     Decimal
  grandTotal      Decimal
  
  // Missing:
  // - sellerSubtotal (before commission)
  // - commissionAmount (HUKI fee)
  // - sellerPayout (net to seller)
  // - hukiVoucherDiscount (allocated)
  // - shopVoucherDiscount
}
```

---

## 6. USER UI ISSUES

### CartPage.jsx

**Problems:**
1. Line 9-30: `AVAILABLE_VOUCHERS` is hardcoded mock data
2. Line 61-75: Discount calculations are hardcoded
3. Line 68: `shopDiscount = checkedSubtotal >= 200000 ? 20000 : 0` - HARDCODED
4. Line 70-72: `hukiDiscount` calculation is hardcoded
5. Line 80-85: `grandTotal` calculation is hardcoded

**Required Changes:**
- Remove hardcoded vouchers
- Fetch available vouchers from backend
- Use backend pricing for calculations
- Show proper discount breakdown

### BookDetailPage.jsx

**Current:**
- Shows `originalPrice` vs `price`
- Shows flash sale countdown
- Shows "Flash Sale" badge

**Issues:**
- Not clear that flash sale price = "Product Discount"
- No mention of "Voucher" eligibility
- No visual distinction between "Product Discount" vs "Shop Voucher" vs "HUKI Voucher"

**Required Changes:**
- Rename "Flash Sale" to "Product Discount" in context
- Show if book is eligible for vouchers
- Show "Add to Cart" with discounted price prominently

### OrderDetailPage.jsx (User)

**Current:**
- Shows total only
- No discount breakdown

**Required:**
- Product Discount (Flash Sale)
- Shop Voucher discount
- HUKI Voucher discount
- Shipping Voucher discount
- Clear pricing breakdown

---

## 7. SELLER UI ISSUES

### Missing: Promotion Management

**Required Pages:**
1. **Product Discount** (Flash Sale Management)
   - Create/Edit/Disable flash sale campaigns
   - Set discount percentage or fixed amount
   - Set time window
   - Select products
   - View status

2. **Shop Voucher Management**
   - Create/Edit/Disable shop vouchers
   - Set discount type (percentage or fixed)
   - Set minimum order amount
   - Set usage limit
   - Set per-user limit
   - View usage statistics

### SellerFinancePage.jsx

**Current State:** MOCK DATA

**Required Real Integration:**
- Fetch ledger from backend
- Fetch available/pending balance
- Submit withdrawal request
- View withdrawal history

### SellerOrderDetailPage.jsx

**Current:** Shows order items and totals

**Missing:**
- Product Discount breakdown
- Shop Voucher breakdown
- HUKI Voucher breakdown (seller's view)
- Commission calculation
- Seller Payout

---

## 8. ADMIN UI ISSUES

### AdminMarketingPage.jsx

**Current:**
- Flash Sale management ✅
- Voucher management (mock data) ❌

**Required:**
- HUKI Voucher CRUD
- View voucher usage
- View voucher statistics

### AdminFinancePage.jsx

**Current:** MOCK DATA with payout batches

**Required Real Implementation:**
- Withdrawal request list
- Approve/Reject actions
- Bank transfer simulation
- Settlement calculation

### Missing: Withdrawal Requests Page

**Required:**
- List of pending withdrawal requests
- Seller info
- Amount
- Bank details
- Approve/Reject buttons
- History

---

## 9. API GAPS

### Missing APIs

| API | Description | Priority |
|-----|-------------|----------|
| `GET /seller/vouchers` | List shop vouchers | HIGH |
| `POST /seller/vouchers` | Create shop voucher | HIGH |
| `PATCH /seller/vouchers/:id` | Update shop voucher | HIGH |
| `DELETE /seller/vouchers/:id` | Delete shop voucher | HIGH |
| `GET /seller/ledger` | Get seller ledger entries | HIGH |
| `GET /seller/balance` | Get available/pending balance | HIGH |
| `POST /seller/withdrawals` | Submit withdrawal request | HIGH |
| `GET /admin/withdrawals` | List withdrawal requests | HIGH |
| `POST /admin/withdrawals/:id/approve` | Approve withdrawal | HIGH |
| `POST /admin/withdrawals/:id/reject` | Reject withdrawal | HIGH |

---

## 10. BUSINESS RULES VERIFICATION

### Voucher Rules

| Rule | Status | Implementation |
|------|--------|----------------|
| HUKI Voucher = max 1/checkout | ✅ | `platformVoucherCode?: string` |
| Shop Voucher = max 1/shop/checkout | ✅ | `storeVoucherCodes: Record<storeId, code>` |
| Shipping Voucher = max 1/checkout | ✅ | `shippingVoucherCode?: string` |
| Stackable (HUKI + Shop + Shipping) | ✅ | All validated independently |

### Pricing Rules

| Rule | Status | Notes |
|------|--------|-------|
| Product Discount first | ✅ | Flash sale price in unitPrice |
| Shop Voucher next | ✅ | Applied to store subtotal |
| HUKI Voucher next | ✅ | Applied to remaining |
| Shipping last | ✅ | Applied to shipping fee |
| No tampering | ✅ | Backend recalculates on confirm |

### Settlement Rules

| Rule | Status | Notes |
|------|--------|-------|
| Commission = 15% | ⚠️ MOCK | Hardcoded in UI |
| Tax withholding | ⚠️ MOCK | Hardcoded in UI |
| Escrow 2 minutes | ⚠️ MOCK | No real implementation |
| Available vs Pending | ⚠️ MOCK | No real balance tracking |

---

## 11. IMPLEMENTATION PRIORITY

### Phase 1: Critical (Must Have)

1. **Fix Cart Calculations**
   - Remove hardcoded vouchers
   - Fetch from backend
   - Use backend pricing

2. **Add Shop Voucher CRUD for Seller**
   - Create voucher API
   - Seller UI for voucher management

3. **Fix Order Snapshot**
   - Store all discount types
   - Clear breakdown in order

### Phase 2: Important

4. **Seller Finance Real Integration**
   - Ledger API
   - Balance API
   - Withdrawal request API

5. **Admin Withdrawal Management**
   - List pending requests
   - Approve/Reject

6. **UI Updates**
   - Product Detail: Clear discount types
   - Order Detail: Full breakdown
   - Seller Order Detail: Commission breakdown

### Phase 3: Nice to Have

7. **Product Discount Management UI**
   - Flash sale management for sellers (already exists for admin)

8. **Advanced Voucher Features**
   - Per-product voucher restriction
   - Category restrictions

---

## 12. FILES TO MODIFY

### Backend

| File | Changes |
|------|---------|
| `commerce-service/src/modules/orders/orders.module.ts` | Add Ledger service |
| `commerce-service/src/modules/orders/orders.service.ts` | Add ledger methods |
| `commerce-service/src/modules/orders/seller-ledger.service.ts` | **NEW** |
| `commerce-service/src/modules/orders/withdrawal.service.ts` | **NEW** |
| `commerce-service/src/modules/orders/seller-orders.controller.ts` | Add ledger endpoints |
| `commerce-service/src/modules/orders/dto/order.dto.ts` | Add ledger types |
| `promotion-service/src/modules/vouchers/vouchers.module.ts` | Add seller voucher service |
| `promotion-service/src/modules/vouchers/seller-vouchers.service.ts` | **NEW** |
| `promotion-service/src/modules/vouchers/seller-vouchers.controller.ts` | **NEW** |

### Frontend - User

| File | Changes |
|------|---------|
| `web/src/ui/pages/store/CartPage.jsx` | Remove hardcoded, use backend |
| `web/src/ui/pages/store/BookDetailPage.jsx` | Clarify discount types |
| `web/src/ui/pages/store/OrderDetailPage.jsx` | Show discount breakdown |

### Frontend - Seller

| File | Changes |
|------|---------|
| `web/src/ui/pages/seller/SellerFinancePage.jsx` | Real integration |
| `web/src/ui/pages/seller/SellerOrderDetailPage.jsx` | Show commission |
| `web/src/ui/pages/seller/SellerPromotionPage.jsx` | **NEW** - Voucher management |
| `web/src/ui/api/sellerLedgerApi.ts` | **NEW** |
| `web/src/ui/api/sellerVoucherApi.ts` | **NEW** |

### Frontend - Admin

| File | Changes |
|------|---------|
| `web/src/ui/pages/admin/AdminFinancePage.jsx` | Add withdrawal tab |
| `web/src/ui/pages/admin/AdminWithdrawalPage.jsx` | **NEW** |
| `web/src/ui/api/adminFinanceApi.ts` | **NEW** |

---

## 13. SUMMARY

### ✅ ALREADY DONE

1. Checkout V2 integration (backend pricing)
2. Voucher API client in commerce-service
3. Shipping client integration
4. Order snapshot structure
5. Flash Sale integration

### ⚠️ PARTIALLY DONE

1. HUKI Voucher - Admin can manage, User can apply, but no dedicated UI
2. Order Snapshot - Structure exists, but fields incomplete
3. Pricing Calculation - Backend calculates, but snapshot doesn't capture all types

### ❌ NOT DONE

1. **Cart Calculations** - Still hardcoded
2. **Shop Voucher** - No seller management UI
3. **Seller Finance** - All mock data
4. **Admin Withdrawal** - No real implementation
5. **Order Breakdown** - No clear discount type distinction

### 🔴 BLOCKING ISSUES

1. No Seller Voucher CRUD API
2. No Seller Ledger API
3. No Withdrawal API
4. No Order discount breakdown fields
5. No Seller payout calculation

---

## 14. RECOMMENDED ACTIONS

### Immediate (This Sprint)

1. Fix Cart calculations to use backend
2. Add Shop Voucher CRUD API
3. Add Seller Voucher management UI
4. Update Order snapshot with discount fields
5. Add Order Detail discount breakdown

### Short Term (Next Sprint)

6. Implement Seller Ledger API
7. Implement Withdrawal API
8. Add Admin withdrawal management
9. Real integration for Seller Finance
10. Update Seller Order Detail with commission

### Long Term

11. Product Discount management for sellers
12. Advanced voucher features
13. Real payment integration for withdrawals
