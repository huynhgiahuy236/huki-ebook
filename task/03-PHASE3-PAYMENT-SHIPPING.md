# 📋 PHASE 3: Payment & Shipping
**Thời gian ước tính: 3-4 tuần**

## Mục tiêu
- Payment integration (VNPay, MoMo, COD)
- Shipping Service
- Order completion flow

---

## 🐙 Tasks

### Sprint 9: Payment Integration (1.5 tuần)

| Task | Người | Priority | Mô tả |
|------|-------|---------|--------|
| T9.1 | KIEN | HIGH | Database schema: payments, refunds |
| T9.2 | KIEN | HIGH | Payment initiation (VNPay, MoMo) |
| T9.3 | KIEN | HIGH | VNPay callback handling |
| T9.4 | KIEN | HIGH | MoMo callback handling |
| T9.5 | KIEN | HIGH | Payment status management |
| T9.6 | HUY | HIGH | COD payment option |
| T9.7 | HUY | MEDIUM | Refund request flow |
| T9.8 | KIEN | MEDIUM | Payment verification |

---

### Sprint 10: Shipping Service (1 tuần)

| Task | Người | Priority | Mô tả |
|------|-------|---------|--------|
| T10.1 | HUY | HIGH | Database schema: shipments, delivery_staff |
| T10.2 | HUY | HIGH | Shipping fee calculation (GHTK mock) |
| T10.3 | HUY | HIGH | Shipment creation on order |
| T10.4 | HUY | HIGH | Shipment tracking |
| T10.5 | HUY | HIGH | Delivery staff assignment |
| T10.6 | KIEN | MEDIUM | GHTK integration (mock) |
| T10.7 | HUY | MEDIUM | Delivery status updates |

---

### Sprint 11: Order Completion & Events (1 tuần)

| Task | Người | Priority | Mô tả |
|------|-------|---------|--------|
| T11.1 | KIEN | HIGH | Events: ORDER_CREATED, ORDER_PAID, ORDER_CANCELLED |
| T11.2 | KIEN | HIGH | Events: PAYMENT_SUCCEEDED, PAYMENT_FAILED |
| T11.3 | HUY | HIGH | Event consumer: inventory management |
| T11.4 | HUY | HIGH | Order completion flow |
| T11.5 | KIEN | HIGH | Order confirmation notifications |
| T11.6 | HUY | MEDIUM | Order history |

---

## 📊 Progress Tracking

```
✅ Sprint 9: Payment Integration
✅ Sprint 10: Shipping Service
✅ Sprint 11: Order Completion & Events

📦 Deliverables Phase 3:
- [ ] VNPay integration
- [ ] MoMo integration
- [ ] COD payment
- [ ] Refund flow
- [ ] Shipping fee calculation
- [ ] Shipment tracking
- [ ] Event-driven order flow
```

---

## 🔗 Dependencies

- Sprint 9 cần Sprint 8 (Orders) xong
- Sprint 10 có thể chạy song song với Sprint 9
- Sprint 11 cần Sprint 9, 10 xong

---

## 📝 Notes

**KIEN:** Payment, Events, Notifications
**HUY:** Shipping, Refunds, Integration
