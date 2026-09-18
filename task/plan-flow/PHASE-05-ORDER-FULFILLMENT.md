# PHASE 5: ORDER FULFILLMENT
## HUKI EBOOK - Shipping, Fulfillment & Tracking

---

## MỤC TIÊU

Hoàn thiện luồng tính phí vận chuyển, tạo đơn hàng, và theo dõi đơn hàng realtime.

---

## TASKS

### Task 38: 3-Tier Shipping Fee Calculation
**Priority:** P0 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Implement shipping fee calculation với 3 zone system.

**Deliverables:**
```
✓ Zone System:
  Zone 1 - Intra-province: TP.HCM → TP.HCM
  Zone 2 - Midland: TP.HCM → Binh Duong
  Zone 3 - Inter-region: TP.HCM → Ha Noi
  
✓ Fee Calculation:
  Base fee:
  - Zone 1: 15,000 VND
  - Zone 2: 25,000 VND
  - Zone 3: 35,000 VND
  
  Weight-based:
  - 0-500g: base
  - 500g-1kg: base + 5,000
  - 1kg-2kg: base + 10,000
  - >2kg: base + (weight-2)*10,000
  
✓ Special Cases:
  - Ebook: 0 VND (free shipping)
  - Hybrid: Only physical shipping fee
  - Heavy items (>5kg): Calculate separately
  
✓ API:
  POST /api/shipping/calculate
  {
    fromProvince: "TP.HCM",
    toProvince: "Ha Noi",
    weight: 500, // grams
    items: [...]
  }
  
  Response:
  {
    fee: 35000,
    zone: 3,
    estimatedDays: "3-5 ngày"
  }
```

**Files cần create:**
- `commerce-service/src/services/ShippingFeeService.ts`
- `commerce-service/src/services/ZoneMapper.ts`
- `commerce-service/src/routes/shipping.ts`

---

### Task 39: GHN/Viettel Post API Integration
**Priority:** P0 | **Effort:** 3 days | **Owner:** Backend

**Mô tả:**
Integrate với GHN và Viettel Post APIs.

**Deliverables:**
```
✓ GHN Integration:
  - Create shipment
  - Get shipping fee (real-time)
  - Get tracking status
  - Print label (future)
  
✓ Viettel Post Integration:
  - Same as GHN
  - Separate service implementation
  
✓ Configuration:
  - GHN_API_KEY
  - GHN_SHOP_ID
  - VIETTEL_API_KEY
  - VIETTEL_SHOP_ID
  
✓ Fallback:
  - If API fails, use calculated fee
  - Manual AWB entry option
  
✓ Supported Operations:
  - Calculate fee (from carrier API)
  - Create shipment (register order with carrier)
  - Get tracking (poll carrier API)
  - Cancel shipment
```

**Files cần create:**
- `commerce-service/src/services/carriers/GHNService.ts`
- `commerce-service/src/services/carriers/ViettelService.ts`
- `commerce-service/src/services/carriers/CarrierFactory.ts`
- `commerce-service/src/routes/carrier.ts`

---

### Task 40: Fallback Shipping Fee
**Priority:** P1 | **Effort:** 1 day | **Owner:** Backend

**Mô tả:**
Implement fallback khi carrier API unavailable.

**Deliverables:**
```
✓ Fallback Strategy:
  1. Try GHN API
  2. If failed, try Viettel API
  3. If both failed, use internal calculation
  
✓ Internal Calculation:
  - Based on zone system
  - Cached results
  - Not as accurate as carrier API
  
✓ Monitoring:
  - Log API failures
  - Alert if >10% failure rate
  - Metric: carrier_api_success_rate
```

---

### Task 41: Order Fulfillment State Machine
**Priority:** P0 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Implement 5-stage fulfillment state machine.

**Deliverables:**
```
✓ States:
  1. PENDING_PAYMENT - Awaiting payment
  2. PENDING_CONFIRMATION - Paid, awaiting seller confirm
  3. PROCESSING - Seller preparing
  4. SHIPPED - Handed to carrier
  5. DELIVERED - Customer received
  6. CANCELLED - Order cancelled
  7. PARTIALLY_CANCELLED - Some items cancelled
  
✓ Transitions:
  PENDING_PAYMENT → PENDING_CONFIRMATION (payment received)
  PENDING_PAYMENT → CANCELLED (timeout/manual)
  PENDING_CONFIRMATION → PROCESSING (seller confirms)
  PENDING_CONFIRMATION → CANCELLED (seller reject)
  PROCESSING → SHIPPED (carrier pickup)
  SHIPPED → DELIVERED (carrier confirms)
  SHIPPED → RETURNED (return initiated)
  DELIVERED → RETURN_REQUESTED (customer requests)
  
✓ Guards:
  - Only valid transitions allowed
  - Timestamp recorded
  - Reason required for cancellations
  
✓ Webhook Updates:
  - Carrier → status updates
  - Admin → manual updates
```

**Files cần create:**
- `commerce-service/src/services/OrderStateMachine.ts`
- `commerce-service/src/models/OrderState.ts`

---

### Task 42: AWB Generation
**Priority:** P0 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Implement AWB (Air Waybill) generation.

**Deliverables:**
```
✓ AWB Format:
  GHN: "GHN-XXXXXXXXX"
  Viettel: "VTXXXXXXXXX"
  
✓ Generation:
  - Request AWB from carrier API
  - Store AWB in order
  - Update Sub-Order status
  
✓ Fields:
  - tracking_code: "GHN-123456789"
  - carrier: "GHN"
  - carrier_service: "Express"
  - estimated_delivery: date
  
✓ Seller Action:
  - Button: "Tạo vận đơn"
  - Auto-generate or manual entry
```

**Files cần create:**
- `commerce-service/src/services/AWBService.ts`
- `commerce-service/src/routes/seller/awb.ts`

---

### Task 43: Shipping Label PDF
**Priority:** P1 | **Effort:** 2 days | **Owner:** Frontend + Backend

**Mô tả:**
Generate và display shipping label.

**Deliverables:**
```
✓ Label Format:
  - A6 size (105mm x 148mm)
  - QR code
  - Address details
  - Barcode (tracking code)
  
✓ PDF Generation:
  - Server-side PDF generation
  - PDFKit or similar library
  - Store in S3
  
✓ Display:
  - Preview in browser
  - Print button
  - Download PDF
  
✓ Label Contents:
  - From address (HUKI warehouse)
  - To address (customer)
  - Tracking code barcode
  - QR code (for carrier scanning)
  - Order code
  - Weight
```

**Files cần create:**
- `commerce-service/src/services/LabelGenerator.ts`
- `commerce-service/src/routes/label.ts`
- `web/src/ui/pages/seller/PrintLabelModal.tsx`

---

### Task 44: Carrier Webhook Integration
**Priority:** P1 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Integrate carrier webhooks cho real-time tracking updates.

**Deliverables:**
```
✓ Webhook Endpoints:
  POST /api/webhooks/carrier/ghn
  POST /api/webhooks/carrier/viettel
  
✓ Webhook Payload:
  - Order/AWB code
  - Status
  - Location
  - Timestamp
  - Signature verification
  
✓ Status Mapping:
  GHN → HUKI status
  - "picking" → PROCESSING
  - "transporting" → SHIPPED
  - "delivered" → DELIVERED
  - "returned" → RETURNED
  
✓ Processing:
  - Verify signature
  - Update order status
  - Send notification to user
  - Log in tracking history
```

**Files cần create:**
- `commerce-service/src/routes/webhooks/carrier.ts`
- `commerce-service/src/services/CarrierWebhookProcessor.ts`

---

### Task 45: Real-time Order Tracking
**Priority:** P0 | **Effort:** 2 days | **Owner:** Frontend

**Mô tả:**
Implement order tracking page.

**Deliverables:**
```
✓ Tracking Page:
  - Order code header
  - Store/Seller info
  - 7-stage progress stepper
  - Estimated delivery
  - Current status highlight
  
✓ 7 Stages:
  1. Đặt hàng thành công
  2. Đã xác nhận
  3. Đang chuẩn bị
  4. Đã bàn giao đơn vị vận chuyển
  5. Đang vận chuyển
  6. Đã đến nơi
  7. Đã nhận hàng
  
✓ Timeline:
  - Each status with timestamp
  - Location info
  - Notes from carrier
  
✓ UX:
  - Share tracking link
  - Copy tracking code
  - Link to carrier tracking page
```

**Files cần create:**
- `web/src/ui/pages/order/OrderTrackingPage.tsx`
- `web/src/ui/components/order/TrackingStepper.tsx`
- `web/src/ui/components/order/TrackingTimeline.tsx`

---

### Task 46: WebSocket Tracking Updates
**Priority:** P0 | **Effort:** 2 days | **Owner:** Backend + Frontend

**Mô tả:**
Implement WebSocket cho real-time tracking updates.

**Deliverables:**
```
✓ WebSocket Events:
  - order:status_changed
  - order:shipped
  - order:delivered
  
✓ Payload:
  {
    orderId: "uuid",
    subOrderId: "uuid",
    oldStatus: "PROCESSING",
    newStatus: "SHIPPED",
    carrier: "GHN",
    trackingCode: "GHN-123456",
    timestamp: "ISO8601"
  }
  
✓ Frontend:
  - Auto-reconnect on disconnect
  - Update UI immediately
  - Show toast notification
```

**Files cần create:**
- `commerce-service/src/websocket/orderTracking.ts`
- `web/src/hooks/useOrderTracking.ts`

---

### Task 47: Push Notification
**Priority:** P1 | **Effort:** 1 day | **Owner:** Backend

**Mô tả:**
Implement push notification cho order updates.

**Deliverables:**
```
✓ Notification Triggers:
  - Order confirmed
  - Order shipped
  - Out for delivery
  - Delivered
  - Delivery failed
  
✓ Push Channels:
  - Web push (browser)
  - Email (optional)
  - In-app notification
  
✓ Implementation:
  - Web Push API
  - Service worker
  - Notification permission request
```

---

## DEPENDENCIES

- Task 1 (Infrastructure) → Task 46 (WebSocket)
- Task 38-39 (Shipping) → Task 40 (Fallback)
- Task 41 (State Machine) → Task 42 (AWB)
- Task 42 (AWB) → Task 43 (Label)
- Task 44 (Carrier Webhook) → Task 45 (Tracking)
- Task 46 (WebSocket) → Task 45 (Real-time updates)

---

## SUCCESS CRITERIA

- [ ] Shipping fee calculated correctly by zone
- [ ] GHN/Viettel API integrated
- [ ] Fallback fee works when API fails
- [ ] Order state machine transitions correctly
- [ ] AWB generated and stored
- [ ] Shipping label printable
- [ ] Carrier webhooks update order status
- [ ] Tracking page shows 7 stages
- [ ] Real-time updates via WebSocket

---

## TEST CASES

```
TC_SHIP_01: Tính phí nội tỉnh
TC_SHIP_02: Tính phí liên miền
TC_SHIP_03: Ebook = 0 phí ship
TC_SHIP_04: GHN API down → fallback
TC_AWB_01: Tạo mã AWB tự động
TC_AWB_02: In nhãn shipping A6
TC_AWB_03: Webhook GHN update status
TC_TRACK_01: Timeline hiển thị 7 mốc
TC_TRACK_02: Real-time update khi shipper scan
TC_TRACK_03: Buyer nhận notification
```

---

## NOTES

- 63 tỉnh/thành phải được map đúng zone
- Consider adding insurance option for high-value orders
- AWB generation should be idempotent (retry safe)
- Carrier webhooks need signature verification
- Tracking page should work without WebSocket (fallback to polling)
- Consider adding delivery attempt notes
