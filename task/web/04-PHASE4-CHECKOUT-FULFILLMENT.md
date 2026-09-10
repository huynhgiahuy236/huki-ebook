# Phase 04 — Buyer Cart & COD Checkout

**Persona:** User/Buyer
**Status:** `🟡 PARTIAL` — Cart/Checkout/Success có UI mock; chưa tạo đơn thật.

## Sprint 13 — Cart

- [ ] 🟡 Get/add/update/remove/clear cart.
- [ ] 🔴 Kiểm tra tồn kho và thay đổi giá.
- [ ] 🔴 Empty/loading/error và optimistic rollback.

## Sprint 14 — Address và checkout preview

- [ ] 🟡 Address list/create/edit.
- [ ] 🔴 Chọn địa chỉ nhận hàng.
- [ ] 🔴 Checkout preview qua API thật.
- [ ] 🔴 Phí giao hàng tạm tính nội bộ, không gọi GHTK.

## Sprint 15 — COD confirm

- [ ] 🟡 COD là payment method duy nhất đang mở.
- [ ] 🔴 Checkout confirm và order result bằng backend thật.
- [ ] 🔴 Idempotency chống double submit.
- [ ] 🔴 Xử lý out-of-stock, price conflict, timeout và retry-safe.

## Sprint 16 — E2E

- [ ] 🔴 Book detail → cart → address → COD → success.
- [ ] 🔴 Giỏ được clear đúng sau khi backend xác nhận.
- [ ] 🔴 Không tạo hai đơn khi retry.

## Deferred

`⚪ DEFERRED`: GHTK/Grab/SPX, shipping callback, PayOS/VNPay/MoMo, voucher, refund và online reconciliation.

## Phase DoD

Buyer tạo đúng một đơn COD bằng backend thật; tổng tiền và inventory được server xác nhận; không phụ thuộc hãng vận chuyển.
