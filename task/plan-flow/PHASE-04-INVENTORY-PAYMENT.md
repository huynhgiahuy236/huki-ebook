# PHASE 4: INVENTORY & PAYMENT
## HUKI EBOOK - Stock Management & PayOS Integration

---

## MỤC TIÊU

Hoàn thiện quản lý tồn kho 3 tầng, thanh toán PayOS VietQR, và xử lý timeout.

---

## TASKS

### Task 29: Verify Redis-PostgreSQL Reconciliation
**Priority:** P0 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Verify và implement reconciliation job để đồng bộ Redis với PostgreSQL.

**Deliverables:**
```
✓ Reconciliation Job:
  - Scheduled: every 5 minutes
  - Compare Redis cache vs PostgreSQL
  - Log discrepancies
  - Auto-heal if possible
  - Alert if major mismatch
  
✓ Checks:
  - Total reserved matches orders
  - Available = OnHand - Reserved
  - No negative values
  
✓ Auto-heal:
  - If Redis = NULL, populate from PG
  - If mismatch < threshold, trust PG
  - If mismatch > threshold, alert only
  
✓ Manual Reconciliation:
  - Admin endpoint to trigger full sync
  - Admin endpoint to see discrepancies
```

**Files cần create:**
- `commerce-service/src/jobs/ReconciliationJob.ts`
- `commerce-service/src/services/InventoryReconciler.ts`
- `commerce-service/src/routes/admin/reconciliation.ts`

---

### Task 30: Atomic Inventory Lock
**Priority:** P0 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Verify và enhance atomic inventory reservation.

**Deliverables:**
```
✓ Redis Lua Script (Atomic):
  ```
  -- Check available stock
  local available = redis.call('GET', key)
  if tonumber(available) < tonumber(requested) then
    return {err = 'INSUFFICIENT_STOCK'}
  end
  
  -- Reserve stock
  redis.call('DECRBY', key, requested)
  redis.call('HSET', reservedKey, orderId, requested)
  
  return {ok = true}
  ```
  
✓ PostgreSQL Backup Check:
  ```
  UPDATE inventory
  SET reserved = reserved + ?,
      available = on_hand - reserved - ?
  WHERE product_id = ?
    AND available >= ?
  RETURNING *
  ```
  
✓ Race Condition Prevention:
  - Redis lock + PG conditional UPDATE
  - Either both succeed or both fail
  - Timeout: 5 seconds max
  
✓ Return Values:
  - SUCCESS: Stock reserved
  - INSUFFICIENT: Not enough stock
  - TIMEOUT: Lock wait exceeded
  - ERROR: System error
```

**Files cần verify/create:**
- `commerce-service/src/services/InventoryReservationService.ts`
- `commerce-service/src/scripts/reservation.lua`

---

### Task 31: TTL 2 Phút Countdown Modal
**Priority:** P0 | **Effort:** 2 days | **Owner:** Frontend

**Mô tả:**
Implement payment countdown modal UI.

**Deliverables:**
```
✓ Modal UI:
  - Countdown timer (120 seconds)
  - VietQR code display
  - Payment details:
    - Account number
    - Bank name
    - Account holder
    - Amount
    - Transfer content (order code)
  - Copy buttons for all fields
  - "Tôi đã chuyển khoản" button
  
✓ Timer Behavior:
  - Real-time countdown
  - Color changes: green > yellow (30s) > red (10s)
  - Audio alert at 10s (optional)
  - Auto-refresh QR code every 30s (PayOS)
  
✓ States:
  - Waiting: QR displayed
  - Processing: After user clicks "Da chuyen khoan"
  - Success: Payment confirmed
  - Expired: Time ran out
  - Error: Payment failed
  
✓ Actions:
  - Cancel order (during countdown)
  - Re-generate QR (PayOS)
  - Check status (polling)
```

**Files cần create:**
- `web/src/ui/components/payment/PaymentCountdownModal.tsx`
- `web/src/hooks/usePaymentCountdown.ts`
- `web/src/services/paymentApi.ts`

---

### Task 32: Auto-Release Stock on Timeout
**Priority:** P0 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Implement automatic stock release khi order timeout.

**Deliverables:**
```
✓ Timeout Handler:
  - Triggered by: scheduled job / delayed queue
  - Check orders where expiresAt < now AND status = PENDING_PAYMENT
  - Action:
    1. Update order status = CANCELLED
    2. Release reserved stock (increment available)
    3. Release Flash Sale slots (if applicable)
    4. Send notification to user
    5. Log in order_history
    
✓ Release Formula:
  ```
  available = available + reserved
  reserved = 0
  ```
  
✓ Idempotency:
  - Check if already cancelled before processing
  - Use order ID as idempotency key
  
✓ Flash Sale Release:
  - Release flash_sale_slots_used
  - Make slots available again
```

**Files cần create:**
- `commerce-service/src/jobs/OrderTimeoutJob.ts`
- `commerce-service/src/services/StockReleaseService.ts`

---

### Task 33: Late Webhook Handling & Refund
**Priority:** P0 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Handle PayOS webhooks that arrive after timeout.

**Deliverables:**
```
✓ Late Webhook Detection:
  - Webhook received
  - Check order status
  - If order.CANCELLED AND webhook.SUCCESS:
    → Trigger refund flow
    
✓ Refund Flow:
  1. Check if already refunded
  2. Calculate refund amount
  3. Create refund record
  4. Call PayOS refund API
  5. Update order.paymentStatus = REFUNDED
  6. Send notification to user
  
✓ Admin Notification:
  - Flag order for manual review
  - Log discrepancy
  - Send email to finance
  
✓ User Notification:
  - "Chúng tôi đã hoàn tiền cho đơn hàng này"
  - Refund timeline: 3-5 business days
```

**Files cần create:**
- `commerce-service/src/services/RefundService.ts`
- `commerce-service/src/services/LateWebhookHandler.ts`
- `commerce-service/src/routes/webhooks/payos.ts`

---

### Task 34: PayOS VietQR Integration
**Priority:** P0 | **Effort:** 3 days | **Owner:** Backend

**Mô tả:**
Implement PayOS VietQR payment gateway.

**Deliverables:**
```
✓ PayOS Integration:
  - Initialize PayOS client
  - Create payment link
  - Generate VietQR code
  - Handle webhook callbacks
  
✓ Payment Link Creation:
  ```
  {
    orderCode: "ORD-XXXXX",
    amount: 150000,
    description: "Thanh toan don hang ORD-XXXXX",
    buyerName: "Nguyen Van A",
    buyerEmail: "email@example.com",
    buyerPhone: "0912345678",
    items: [...]
  }
  ```
  
✓ VietQR Response:
  - QR code image (base64)
  - Payment link
  - Expires at
  
✓ Configuration:
  - PAYOS_CLIENT_ID
  - PAYOS_API_KEY
  - PAYOS_CHECKSUM_KEY
  - Webhook URL: https://api.huki.vn/webhooks/payos
```

**Files cần create:**
- `commerce-service/src/services/PayOSService.ts`
- `commerce-service/src/routes/payment.ts`
- `commerce-service/src/routes/webhooks/payos.ts`

**Environment Variables:**
```env
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key
```

---

### Task 35: Webhook Idempotency
**Priority:** P0 | **Effort:** 1 day | **Owner:** Backend

**Mô tả:**
Implement webhook idempotency để handle PayOS retries.

**Deliverables:**
```
✓ Idempotency Check:
  - Store webhook ID in database
  - Check before processing
  - Skip if already processed
  
✓ Database:
  ```sql
  CREATE TABLE webhook_events (
    id UUID PRIMARY KEY,
    provider VARCHAR(50),
    event_id VARCHAR(255) UNIQUE,
    event_type VARCHAR(100),
    payload JSONB,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
  
✓ Processing:
  1. Check if event_id exists
  2. If exists AND processed → return success
  3. If exists AND NOT processed → process
  4. If not exists → create + process
  
✓ Retry Logic:
  - Acknowledge quickly (200 OK)
  - Process async
  - Retry failed jobs
```

---

### Task 36: Payment Status - WebSocket Upgrade
**Priority:** P1 | **Effort:** 2 days | **Owner:** Backend + Frontend

**Mô tả:**
Replace polling với WebSocket cho payment status updates.

**Deliverables:**
```
✓ WebSocket Events:
  - payment:status_changed
  - payment:success
  - payment:failed
  - payment:expired
  
✓ Client Events:
  - Subscribe: order:{orderId}
  - Unsubscribe: on close
  
✓ Fallback:
  - Keep polling as fallback
  - Detect WebSocket support
  
✓ Server:
  - Socket.IO or native WebSocket
  - Redis pub/sub for scaling
```

**Files cần create:**
- `commerce-service/src/websocket/paymentSocket.ts`
- `web/src/hooks/usePaymentSocket.ts`
- `web/src/services/socketService.ts`

---

### Task 37: Tra Soát Giao Dịch UI
**Priority:** P1 | **Effort:** 2 days | **Owner:** Frontend + Backend

**Mô tả:**
Implement transaction dispute UI cho admin.

**Deliverables:**
```
✓ Admin Transaction Review:
  - List of late/conflicted webhooks
  - Order details
  - Payment details
  - User info
  - Action buttons
  
✓ Manual Actions:
  - Mark as: Refunded
  - Mark as: Payment Received (manual)
  - Mark as: Payment Failed
  - Add notes
  
✓ User Support:
  - Transaction lookup by order code
  - Payment evidence upload
  - Status explanation
```

**Files cần create:**
- `web/src/ui/pages/admin/TransactionReviewPage.tsx`
- `commerce-service/src/routes/admin/transactions.ts`

---

## DEPENDENCIES

- Task 1 (Infrastructure) → All tasks
- Task 26-27 (Order Creation) → Task 30 (Inventory Lock)
- Task 30 (Inventory Lock) → Task 32 (Auto-Release)
- Task 34 (PayOS) → Task 31 (Countdown Modal)
- Task 34 (PayOS) → Task 35 (Webhook)
- Task 33 (Late Webhook) → Task 37 (Transaction UI)

---

## SUCCESS CRITERIA

- [ ] Redis-PostgreSQL reconciliation runs successfully
- [ ] Atomic inventory lock prevents overselling
- [ ] Countdown modal displays VietQR correctly
- [ ] Auto-release stock when order expires
- [ ] Late webhooks trigger refund automatically
- [ ] PayOS integration works end-to-end
- [ ] Webhook idempotency prevents duplicate processing
- [ ] Transaction dispute UI works for admin

---

## TEST CASES

```
TC_INV_01: Available = OnHand - Reserved
TC_INV_02: Reserve stock when order created
TC_INV_03: Block overselling (100 concurrent requests)
TC_INV_04: Deduct OnHand when shipped
TC_INV_05: Release reserved when cancelled
TC_INV_06: Inventory logs recorded
TC_PAY_01: Create PayOS payment link
TC_PAY_02: Display VietQR countdown modal
TC_PAY_03: Webhook confirms payment
TC_PAY_04: Ebook unlocked after payment
TC_PAY_05: Auto-cancel after 2 minutes
TC_PAY_06: Late webhook triggers refund
```

---

## NOTES

- Redis cache nên warm on startup
- Keep inventory logs for audit (never delete)
- Consider implementing circuit breaker cho PayOS
- TTL should be configurable per environment
- Late webhook handling requires PayOS API support
- Store payment webhooks in raw format for debugging
