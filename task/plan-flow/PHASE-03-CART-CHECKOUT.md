# PHASE 3: CART & CHECKOUT
## HUKI EBOOK - Shopping Cart & Order Creation

---

## MỤC TIÊU

Hoàn thiện luồng giỏ hàng đa gian hàng, voucher stacking, và order creation.

---

## TASKS

### Task 21: Cart Grouping by Store
**Priority:** P0 | **Effort:** 2 days | **Owner:** Backend + Frontend

**Mô tả:**
Implement cart grouping theo store/publisher.

**Deliverables:**
```
✓ Cart Structure:
  {
    items: [
      { storeId, storeName, items: [...] }
    ]
  }
  
✓ Grouping Logic:
  - Group by storeId
  - Resolve storeName from Business table
  - Calculate subtotal per store
  
✓ Frontend Display:
  - Store headers with icon and name
  - Items grouped under each store
  - Store subtotal
  - Overall cart total
  
✓ Store Name Resolution:
  - Must show real store name (e.g., "Nhà Xuất Bản Trẻ")
  - NOT user ID or generic "Gian hàng #1"
```

**Files cần verify/create:**
- `commerce-service/src/services/CartService.ts` (verify)
- `commerce-service/src/services/StoreResolver.ts` (create if missing)
- `web/src/ui/pages/cart/CartPage.tsx`
- `web/src/ui/components/cart/CartStoreGroup.tsx`

---

### Task 22: Resolve Store Name Real
**Priority:** P0 | **Effort:** 1 day | **Owner:** Backend

**Mô tả:**
Fix store name resolution - show real business name.

**Deliverables:**
```
✓ Store Name Resolution:
  - Query Business table by storeId
  - Return business_name or store_name
  - Cache in Redis for performance
  - Fallback to "Gian hàng #[id]" if not found
  
✓ Business Info:
  - Store name
  - Store logo
  - Store link (storefront URL)
  
✓ API Response:
  {
    storeId: "uuid",
    storeName: "Nhà Xuất Bản Trẻ",
    storeLogo: "https://...",
    storeUrl: "/store/nxb-tre"
  }
```

**Files cần create:**
- `commerce-service/src/services/StoreNameResolver.ts`

---

### Task 23: Cart Checkbox Selection
**Priority:** P0 | **Effort:** 1 day | **Owner:** Frontend

**Mô tả:**
Implement checkbox selection for cart items.

**Deliverables:**
```
✓ Selection Levels:
  1. Item level: Select individual item
  2. Store level: Select all items in store
  3. All level: Select all items in cart
  
✓ Selection State:
  - selectedItems: Set of selected item IDs
  - Store checkbox: All items selected = checked, some = indeterminate
  - All checkbox: All stores selected = checked
  
✓ Real-time Calculation:
  - Update subtotal on selection change
  - Disable checkout if nothing selected
  - Show selected count
  
✓ UX:
  - Smooth transition
  - No lag on large carts
  - Persist selection in localStorage (temporary)
```

**Files cần create:**
- `web/src/ui/components/cart/CartItemCheckbox.tsx`
- `web/src/ui/components/cart/CartStoreCheckbox.tsx`
- `web/src/hooks/useCartSelection.ts`

---

### Task 24: Voucher Stacking - 3 Tier Calculation
**Priority:** P0 | **Effort:** 3 days | **Owner:** Backend

**Mô tả:**
Implement 3-tier voucher stacking system.

**Deliverables:**
```
✓ Voucher Tiers:
  1. Platform Voucher (HUKI vouchers)
     - Discount: fixed amount or percentage
     - Applied to: entire order
     
  2. Store Voucher (Seller vouchers)
     - Discount: fixed amount or percentage
     - Applied to: items from specific store
     
  3. Free Shipping Voucher
     - Discount: shipping fee
     - Applied to: shipping cost
  
✓ Stacking Rules:
  - 1 Platform voucher per order
  - Multiple Store vouchers (1 per store)
  - 1 Free shipping voucher per order
  
✓ Calculation:
  ```
  subtotal = sum(item prices)
  
  // Apply store vouchers
  for each store:
    storeDiscount = calculateStoreVoucher(storeItems, storeVoucher)
    storeSubtotal -= storeDiscount
    
  // Apply platform voucher
  platformDiscount = calculatePlatformVoucher(remainingSubtotal, platformVoucher)
  remainingSubtotal -= platformDiscount
  
  // Apply free shipping
  shippingFee = calculateShipping(...)
  shippingDiscount = calculateFreeShipVoucher(shippingFee, freeShipVoucher)
  finalShipping = max(0, shippingFee - shippingDiscount)
  
  total = remainingSubtotal + finalShipping
  ```
  
✓ Cost Split:
  - Store voucher cost → Platform absorbs
  - Platform voucher cost → Platform absorbs
  - Seller receives: subtotal - storeVoucherAmount
  
✓ API:
  POST /api/checkout/calculate
  - Returns itemized discounts
  - Returns final totals
```

**Files cần create:**
- `commerce-service/src/services/VoucherService.ts`
- `commerce-service/src/services/VoucherCalculator.ts`
- `commerce-service/src/models/Voucher.ts`
- `commerce-service/src/routes/vouchers.ts`

**Database Schema:**
```sql
CREATE TABLE vouchers (
  id UUID PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL, -- PLATFORM, STORE, FREESHIP
  store_id UUID REFERENCES stores(id), -- NULL for platform
  discount_type VARCHAR(20) NOT NULL, -- PERCENTAGE, FIXED
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2),
  max_discount_amount DECIMAL(10,2),
  usage_limit INT,
  used_count INT DEFAULT 0,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### Task 25: Voucher Validation & Anti-Abuse
**Priority:** P1 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Implement voucher validation và abuse prevention.

**Deliverables:**
```
✓ Validation Rules:
  - Code exists and active
  - Not expired
  - Usage limit not reached
  - Min order amount met
  - User hasn't used this voucher
  - User eligible (new user, VIP, etc.)
  
✓ Anti-Abuse:
  - One use per user per voucher
  - IP-based rate limiting
  - Bot detection
  - Fraud pattern detection
  
✓ Error Messages:
  - "Mã voucher không tồn tại"
  - "Voucher đã hết lượt sử dụng"
  - "Đơn hàng chưa đạt giá trị tối thiểu"
  - "Bạn đã sử dụng voucher này rồi"
```

**Files cần create:**
- `commerce-service/src/services/VoucherValidator.ts`
- `commerce-service/src/services/FraudDetection.ts`

---

### Task 26: Master Order Creation
**Priority:** P0 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Implement Master Order creation (single order from multi-store cart).

**Deliverables:**
```
✓ Order Creation Flow:
  1. Validate cart items (stock, price)
  2. Calculate totals (subtotal, shipping, discounts)
  3. Apply vouchers
  4. Create Master Order record
  5. Create Seller Orders (one per store)
  6. Reserve inventory
  7. Return order details
  
✓ Master Order Fields:
  {
    id: UUID,
    orderCode: "ORD-XXXXX",
    userId: UUID,
    items: [...],
    subtotal: DECIMAL,
    shippingFee: DECIMAL,
    discount: DECIMAL,
    total: DECIMAL,
    status: "PENDING_PAYMENT",
    paymentMethod: "ONLINE_PAYMENT",
    shippingAddress: {...},
    createdAt: TIMESTAMP,
    expiresAt: TIMESTAMP -- for payment TTL
  }
  
✓ Transaction:
  - All-or-nothing creation
  - Rollback on any failure
```

**Files cần verify/create:**
- `commerce-service/src/services/OrderService.ts`
- `commerce-service/src/services/MasterOrderService.ts`
- `commerce-service/src/routes/orders.ts`

---

### Task 27: Sub-Order Splitting by Store
**Priority:** P0 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Implement Sub-Order splitting từ Master Order.

**Deliverables:**
```
✓ Sub-Order Creation:
  - One Sub-Order per store
  - OrderCode: "ORD-XXXXX-S1", "ORD-XXXXX-S2", etc.
  - Inherit shipping address from Master Order
  - Calculate shipping per Sub-Order
  
✓ Sub-Order Fields:
  {
    id: UUID,
    masterOrderId: UUID,
    orderCode: "ORD-XXXXX-S1",
    storeId: UUID,
    items: [...],
    subtotal: DECIMAL,
    shippingFee: DECIMAL,
    discount: DECIMAL,
    total: DECIMAL,
    status: "PENDING_CONFIRMATION",
    trackingCode: NULL,
    carrier: NULL
  }
  
✓ Independent Lifecycle:
  - Each Sub-Order has own status
  - Can be cancelled independently
  - Shipping tracked separately
```

**Files cần create:**
- `commerce-service/src/services/SubOrderService.ts`
- `commerce-service/src/services/OrderSplitter.ts`

---

### Task 28: Ebook vs Physical Order Separation
**Priority:** P0 | **Effort:** 1 day | **Owner:** Backend

**Mô tả:**
Handle order separation for digital vs physical items.

**Deliverables:**
```
✓ Order Processing:
  - Ebook items → Instant unlock after payment
  - Physical items → Wait for shipping
  
✓ Order Display:
  - Separate sections for Digital/Pysical
  - Digital: "Đã giao ngay"
  - Physical: "Đang chờ giao hàng"
  
✓ Shipping:
  - Ebook = 0 shipping fee
  - Physical = calculated shipping fee
  
✓ Fulfillment:
  - Digital: Auto-complete after payment
  - Physical: Manual confirmation + shipping
```

**Files cần update:**
- `commerce-service/src/services/OrderService.ts`
- `web/src/ui/pages/order/OrderDetailPage.tsx`

---

## DEPENDENCIES

- Task 15 (Add Product) → Task 21 (Cart)
- Task 22 (Store Name) → Task 21 (Cart)
- Task 24 (Voucher) → Task 26 (Order)
- Task 26 (Master Order) → Task 27 (Sub-Orders)
- Task 27 (Sub-Orders) → Task 28 (Ebook/Physical)

---

## SUCCESS CRITERIA

- [ ] Cart shows items grouped by real store name
- [ ] Checkbox selection works at all levels
- [ ] Voucher stacking calculates correctly
- [ ] Voucher validation prevents abuse
- [ ] Master Order created with single payment
- [ ] Sub-Orders created per store
- [ ] Ebook items separated from physical

---

## TEST CASES

```
TC_CART_01: Gom nhóm các cuốn sách cùng NXB vào 1 khối
TC_CART_02: Hiển thị đúng tên NXB thật
TC_CART_03: Tạm tính riêng cho từng Shop và tổng tiền
TC_CART_04: Checkbox chọn cả Shop / Bỏ chọn cả Shop
TC_CART_05: Thay đổi số lượng cập nhật giỏ hàng
TC_CART_06: Giỏ hàng trống hiển thị Empty State
TC_VOU_01: Stack 3 voucher thành công
TC_VOU_02: Shop voucher chỉ áp dụng cho shop đó
TC_VOU_03: Voucher hết hạn không áp dụng
TC_ORDER_01: Tạo Master Order thành công
TC_ORDER_02: Sub-Orders được tạo đúng số lượng
TC_ORDER_03: Ebook tách riêng với shipping = 0
```

---

## NOTES

- Cart nên có max items limit (50 items)
- Voucher calculation phải precise (2 decimal places)
- Order creation nên có idempotency key để tránh duplicate
- Sub-Order status updates nên trigger Master Order recalculation
- Consider implementing cart persistence (database vs session)
