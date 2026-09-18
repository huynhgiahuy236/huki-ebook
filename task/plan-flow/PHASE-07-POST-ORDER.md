# PHASE 7: POST-ORDER SERVICES
## HUKI EBOOK - Cancellation, Returns & Reviews

---

## MỤC TIÊU

Hoàn thiện các dịch vụ sau đơn hàng: hủy đơn, khiếu nại, đánh giá.

---

## TASKS

### Task 58: Buyer Cancel Before Payment
**Priority:** P0 | **Effort:** 1 day | **Owner:** Backend

**Mô tả:**
Implement buyer cancellation trước thanh toán.

**Deliverables:**
```
✓ Cancel Flow:
  - User clicks "Huy don"
  - Confirm modal
  - Release inventory immediately
  - Update order status = CANCELLED
  - Log cancellation reason
  
✓ Effects:
  - Inventory released (available restored)
  - Flash Sale slot released
  - Payment link invalidated
  
✓ Idempotency:
  - Check if already cancelled
  - Return success if duplicate
  
✓ API:
  POST /api/orders/:id/cancel
  {
    reason: "Khong muon mua nua"
  }
```

**Files cần verify/create:**
- `commerce-service/src/services/OrderCancellationService.ts`
- `commerce-service/src/routes/orders.ts`

---

### Task 59: Cancel During Packing
**Priority:** P1 | **Effort:** 2 days | **Owner:** Backend + Frontend

**Mô tả:**
Implement cancellation during packing phase (requires approval).

**Deliverables:**
```
✓ Request Flow:
  1. Buyer requests cancellation
  2. Seller receives notification
  3. Seller approves/rejects
  4. If approved → cancel + refund
  5. If rejected → continue fulfillment
  
✓ Time Window:
  - Can request within X hours of order
  - After X hours → no cancellation
  
✓ Seller Options:
  - Approve: Full refund
  - Reject: Continue fulfillment + reason
  
✓ Effects on Approval:
  - Update order status
  - Release inventory
  - Initiate refund (if paid)
  - Notify buyer
```

---

### Task 60: Automated Refund Verification
**Priority:** P1 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Verify automated refund process.

**Deliverables:**
```
✓ Refund Flow:
  1. Cancellation/refund initiated
  2. Check payment method
  3. Calculate refund amount
  4. Call PayOS refund API
  5. Update order status
  6. Notify user
  
✓ Refund Amount:
  - Full refund: before shipped
  - Partial refund: minus shipping fee
  
✓ Refund Timeline:
  - PayOS: 3-5 business days
  - Record in refund table
  
✓ Verification:
  - Check PayOS refund status
  - Handle failed refunds
  - Admin retry option
```

**Files cần create:**
- `commerce-service/src/services/RefundService.ts`
- `commerce-service/src/services/PayOSRefundService.ts`
- `commerce-service/src/routes/admin/refunds.ts`

**Database Schema:**
```sql
CREATE TABLE refunds (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  sub_order_id UUID REFERENCES sub_orders(id),
  amount DECIMAL(10,2),
  reason VARCHAR(255),
  status VARCHAR(20), -- PENDING, PROCESSING, COMPLETED, FAILED
  provider VARCHAR(50), -- PAYOS, MANUAL
  provider_ref VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);
```

---

### Task 61: Inventory Release Verification
**Priority:** P1 | **Effort:** 1 day | **Owner:** Backend

**Mô tả:**
Verify inventory is released correctly on cancellation.

**Deliverables:**
```
✓ Release Verification:
  - Check reserved count decreases
  - Check available count increases
  - Verify flash sale slots released
  
✓ Consistency Check:
  - Run reconciliation job
  - Compare order count vs reserved count
  - Alert on discrepancies
  
✓ Log:
  - All releases logged
  - Reason recorded
  - Who initiated
```

---

### Task 62: Dispute Submission UI
**Priority:** P0 | **Effort:** 2 days | **Owner:** Frontend + Backend

**Mô tả:**
Implement dispute/complaint submission.

**Deliverables:**
```
✓ Dispute Types:
  - Product not as described
  - Damaged product
  - Wrong product
  - Not received
  - Counterfeit
  - Other
  
✓ Submission Form:
  - Select dispute type
  - Describe issue (required, min 50 chars)
  - Upload evidence (images, max 5)
  - Select desired resolution:
    - Refund
    - Replace
    - Partial refund
    
✓ Evidence:
  - Drag & drop upload
  - Image preview
  - Max 5MB per image
  - Supported: JPG, PNG
  
✓ API:
  POST /api/orders/:id/disputes
  {
    type: "DAMAGED",
    description: "Sach bi rach...",
    resolution: "REFUND",
    evidence: ["url1", "url2"]
  }
```

**Files cần create:**
- `web/src/ui/pages/order/DisputePage.tsx`
- `web/src/ui/components/dispute/DisputeForm.tsx`
- `commerce-service/src/routes/disputes.ts`
- `commerce-service/src/services/DisputeService.ts`

---

### Task 63: Evidence Upload System
**Priority:** P1 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Implement evidence upload cho disputes.

**Deliverables:**
```
✓ Upload:
  - Image upload to S3
  - Supported: JPG, PNG
  - Max 5MB per file
  - Max 5 files per dispute
  
✓ Storage:
  - Private bucket
  - Path: /disputes/{disputeId}/{filename}
  
✓ API:
  POST /api/disputes/:id/evidence
  - Multipart form data
  - Returns uploaded URL
  
✓ Virus Scan (optional):
  - Scan before storing
  - Reject if infected
```

---

### Task 64: Admin Arbitration Flow
**Priority:** P1 | **Effort:** 2 days | **Owner:** Backend + Frontend

**Mô tả:**
Implement admin dispute resolution.

**Deliverables:**
```
✓ Admin Dispute Panel:
  - List pending disputes
  - Filter by type, date
  - Sort by urgency
  
✓ Dispute Details:
  - Order info
  - Customer info
  - Seller info
  - Evidence gallery
  - Chat history (if any)
  
✓ Resolution Options:
  - Approve full refund
  - Approve partial refund
  - Reject dispute
  - Request more info
  - Escalate to team lead
  
✓ Actions:
  - Process refund
  - Update order status
  - Notify customer
  - Notify seller
  - Add internal notes
```

**Files cần create:**
- `web/src/ui/pages/admin/DisputePanel.tsx`
- `web/src/ui/pages/admin/DisputeDetailModal.tsx`
- `commerce-service/src/routes/admin/disputes.ts`

---

### Task 65: Escrow Fund Freezing
**Priority:** P1 | **Effort:** 1 day | **Owner:** Backend

**Mô tả:**
Freeze escrow khi dispute opened.

**Deliverables:**
```
✓ Freeze Flow:
  1. Dispute opened
  2. Freeze seller's escrow portion
  3. Track frozen amount
  4. Unfreeze on resolution
  
✓ Frozen Amount:
  - Seller's portion only
  - Platform fee already taken
  
✓ Tracking:
  - disputed_balance in wallet
  - disputed_transactions table
  
✓ Release:
  - On seller win: unfreeze
  - On buyer win: process refund
```

**Files cần create:**
- `commerce-service/src/services/EscrowFreezeService.ts`

---

### Task 66: Verified Purchase Badge
**Priority:** P0 | **Effort:** 1 day | **Owner:** Frontend

**Mô tả:**
Display "Verified Purchase" badge on reviews.

**Deliverables:**
```
✓ Badge Logic:
  - Review from delivered order → badge shown
  - Review from cancelled order → no badge
  
✓ Badge Design:
  - Small checkmark icon
  - "Da mua hang" text
  - Green color
  
✓ Display:
  - On review card
  - On review detail page
```

---

### Task 67: Review Form & Submission
**Priority:** P1 | **Effort:** 2 days | **Owner:** Frontend + Backend

**Mô tả:**
Implement review submission system.

**Deliverables:**
```
✓ Review Form:
  - Star rating (1-5)
  - Title (optional, max 100 chars)
  - Content (required, min 20 chars)
  - Photo upload (optional, max 5)
  - Video upload (optional, max 1)
  
✓ Validation:
  - One review per user per product
  - Can edit within 30 days
  - Rating required
  - Content required
  
✓ Anti-Spam:
  - Rate limiting
  - Profanity filter
  - Duplicate detection
  
✓ API:
  POST /api/products/:id/reviews
  {
    rating: 5,
    title: "Sach rat hay",
    content: "Noi dung danh gia...",
    photos: ["url1", "url2"]
  }
```

**Files cần create:**
- `web/src/ui/components/review/ReviewForm.tsx`
- `web/src/ui/components/review/ReviewList.tsx`
- `business-service/src/routes/reviews.ts`
- `business-service/src/services/ReviewService.ts`

---

### Task 68: Profanity Filter
**Priority:** P1 | **Effort:** 1 day | **Owner:** Backend

**Mô tả:**
Implement profanity filter for reviews.

**Deliverables:**
```
✓ Filter Implementation:
  - Vietnamese profanity list
  - Partial match detection
  - Auto-censor with ***
  - Admin notification on violation
  
✓ Configuration:
  - Whitelist words
  - Severity levels
  - Auto-reject vs approve-with-censor
  
✓ Logging:
  - Flag violations
  - Report for admin review
```

**Files cần create:**
- `business-service/src/utils/profanityFilter.ts`
- `business-service/src/middleware/reviewModeration.ts`

---

### Task 69: Seller Reply Feature
**Priority:** P2 | **Effort:** 2 days | **Owner:** Backend + Frontend

**Mô tả:**
Implement seller reply to reviews.

**Deliverables:**
```
✓ Reply Flow:
  - Seller sees review
  - Seller types reply
  - Reply attached to review
  - Buyer notified
  
✓ Reply Rules:
  - One reply per review
  - Max 500 chars
  - Can edit within 24 hours
  
✓ Display:
  - Reply shown below review
  - Different styling
  - "Nguoi ban tra loi" label
```

---

## DEPENDENCIES

- Task 58 (Cancel before payment) → Task 60 (Refund)
- Task 60 (Refund) → Task 61 (Inventory release)
- Task 62 (Dispute) → Task 63 (Evidence)
- Task 63 (Evidence) → Task 64 (Admin arbitration)
- Task 64 (Admin arbitration) → Task 65 (Escrow freeze)
- Task 67 (Review) → Task 68 (Profanity filter)
- Task 67 (Review) → Task 69 (Seller reply)

---

## SUCCESS CRITERIA

- [ ] Buyer can cancel before payment
- [ ] Cancellation during packing requires approval
- [ ] Refund processed automatically
- [ ] Inventory released on cancel
- [ ] Dispute submission works
- [ ] Evidence upload works
- [ ] Admin can resolve disputes
- [ ] Escrow frozen during dispute
- [ ] Verified badge shows on reviews
- [ ] Review form submits successfully
- [ ] Profanity filter works
- [ ] Seller can reply to reviews

---

## TEST CASES

```
TC_CANCEL_01: Buyer cancel before payment
TC_CANCEL_02: Cancel during packing (needs approval)
TC_CANCEL_03: Refund processed correctly
TC_CANCEL_04: Inventory released
TC_DISPUTE_01: Submit dispute with images
TC_DISPUTE_02: Escrow frozen
TC_DISPUTE_03: Admin arbitration
TC_DISPUTE_04: Refund after ruling
TC_REVIEW_01: Verified badge on delivered orders
TC_REVIEW_02: Submit review with photos
TC_REVIEW_03: Seller reply
TC_REVIEW_04: Profanity filter
```

---

## NOTES

- Refund timeline should be communicated clearly to user
- Dispute window should have time limit (e.g., 7 days after delivery)
- Consider implementing chat/mediation before formal dispute
- Review moderation should catch fake reviews
- Consider incentivizing honest reviews
- Seller response time SLA could be implemented
