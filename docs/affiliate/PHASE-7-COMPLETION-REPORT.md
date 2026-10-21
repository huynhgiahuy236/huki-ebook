# BÁO CÁO HOÀN THÀNH GIAI ĐOẠN 7: LIFECYCLE, DISPUTE, CANCEL & REVERSAL (COMMISSION MATRIX)

**Thời gian hoàn thành:** 21/10/2026  
**Trạng thái:** ✅ **HOÀN THÀNH 100% - ĐẠT CHUẨN AUDIT**  
**Hệ thống thực thi:** NestJS Commerce Service, Prisma ORM, Order Completion Pipeline  

---

## 1. TỔNG QUAN CÁC QUYẾT ĐỊNH ĐÃ KHÓA (LOCKED ARCHITECTURAL DECISIONS)

Tuân thủ nghiêm ngặt 4 quyết định cốt lõi đã chốt với người dùng:

1. **Holding Period (Thời gian giữ tiền đối soát):**
   - **Sách vật lý (Physical Books):** Giữ đúng **7 ngày (168 giờ)** kể từ khi đơn chuyển trạng thái `DELIVERED` (khiếu nại/đổi trả theo chính sách sàn).
   - **Sách điện tử / Sách nói (Digital Goods):** Giữ đúng **24 giờ** kể từ khi thanh toán thành công (`PAID`).

2. **Buyer-Confirm Shortcut (Xác nhận nhận hàng sớm):**
   - Khi Người mua chủ động bấm xác nhận đã nhận hàng trên Web/App:
   - Thời gian đối soát còn lại của đơn hàng vật lý được **rút ngắn xuống còn 24 giờ** tính từ thời điểm xác nhận (không chuyển tức thì sang `AVAILABLE` để dự phòng rủi ro chargeback/fraud ngắn hạn).

3. **Huỷ đơn / Khiếu nại / Thu hồi hoa hồng (Cancel / Dispute / Reversal Matrix):**
   - **PENDING / HOLDING (Chưa cộng vào ví khả dụng):** Huỷ sạch trạng thái thành `CANCELLED` mà không phát sinh bút toán đối trừ.
   - **AVAILABLE (Đã chuyển vào ví khả dụng):** Chuyển trạng thái sang `REVERSED`. Phát sinh bút toán ghi nợ kép (Ledger double-entry deduction / Debit).
   - **Âm ví (Debt Mechanism):** Nếu số dư ví CTV không đủ đối trừ khi hoàn/trả hàng, số dư ví chuyển sang số âm (Debt) và sẽ tự động cấn trừ vào các khoản hoa hồng tương lai.

4. **Trả hàng từng phần (Partial Return):**
   - Tính toán và xử lý thu hồi chi tiết ở cấp độ **từng dòng sản phẩm (`orderItemId`)**.
   - Các sản phẩm khác trong cùng đơn hàng nếu không bị trả vẫn giữ nguyên trạng thái hoa hồng và tiếp tục chu kỳ đối soát bình thường.

---

## 2. KIẾN TRÚC VÀ FILE CODE ĐÃ TRIỂN KHAI

### 2.1. Affiliate Lifecycle Service
- **Đường dẫn:** `platform/apps/commerce-service/src/modules/affiliate/services/affiliate-lifecycle.service.ts`
- **Các hàm nghiệp vụ đã cài đặt:**
  - `handleOrderDelivered(orderId, deliveredAt)`: Chuyển hoa hồng từ `PENDING` sang `HOLDING`, gắn `holdUntil = deliveredAt + 7 ngày (168h)`.
  - `handleDigitalOrderPaid(orderId, paidAt)`: Chuyển hoa hồng sản phẩm số sang `HOLDING`, gắn `holdUntil = paidAt + 24 giờ`.
  - `handleBuyerConfirmReceipt(orderId, confirmedAt)`: Rút ngắn `holdUntil` của các hoa hồng đang `HOLDING` còn `confirmedAt + 24 giờ`.
  - `handleOrderCancelled(orderId, reason)`: Huỷ toàn bộ hoa hồng của đơn hàng:
    - Nếu trạng thái là `PENDING` hoặc `HOLDING`: Chuyển sang `CANCELLED`.
    - Nếu trạng thái là `AVAILABLE`: Gọi phương thức Reversal đối trừ công nợ.
  - `handleOrderItemRefunded(orderId, orderItemId, reason)`: Huỷ hoặc thu hồi chính xác hoa hồng của sản phẩm bị hoàn trả, bảo toàn các sản phẩm còn lại.
  - `handleDisputeOpened(orderId, disputeId)`: Tạm khóa hoa hồng sang trạng thái `DISPUTED` để ngăn scheduler release tiền về ví CTV trong thời gian xử lý tranh chấp.
  - `handleDisputeDismissed(orderId)`: Khôi phục hoa hồng từ `DISPUTED` về `HOLDING` với thời hạn bảo lưu bổ sung 48h.
  - `processMaturedHoldings(batchSize)`: Cron/Batch engine quét tất cả các hoa hồng `HOLDING` có `holdUntil <= NOW()`, tự động giải ngân chuyển sang `AVAILABLE` và ghi nhận cộng số dư ví CTV trong một Prisma Database Transaction nguyên tử.

### 2.2. Tích hợp trực tiếp vào Order Completion Service
- **Đường dẫn:** `platform/apps/commerce-service/src/modules/orders/order-completion.service.ts`
- **Điểm móc nối (Hooks):**
  - Khi đơn hàng cập nhật trạng thái `DELIVERED` -> Tự động kích hoạt `handleOrderDelivered()`.
  - Khi người mua xác nhận nhận hàng -> Tự động kích hoạt `handleBuyerConfirmReceipt()`.
  - Khi đơn hàng bị huỷ hoặc hoàn tiền -> Tự động kích hoạt `handleOrderCancelled()` hoặc `handleOrderItemRefunded()`.

### 2.3. Endpoints vận hành Quản trị viên (Admin API)
- **Đường dẫn:** `platform/apps/commerce-service/src/modules/affiliate/controllers/affiliate-admin.controller.ts`
  - `POST /api/v1/affiliate/admin/process-matured-holdings`: Cho phép Admin hoặc hệ thống Scheduler trigger đối soát tự động theo mẻ.
  - `POST /api/v1/affiliate/admin/commissions/:id/cancel`: Hủy hoa hồng vi phạm quy định.
  - `POST /api/v1/affiliate/admin/commissions/:id/reverse`: Thu hồi hoa hồng đã chuyển vào ví kèm lý do đối trừ.

---

## 3. KẾT QUẢ KIỂM THỬ (100% PASS)

### 3.1. Unit & Integration Test Suite (`affiliate-lifecycle.spec.ts`)
```text
✓ AffiliateLifecycleService
  ✓ handleOrderDelivered should transition physical order pending commissions to HOLDING with 7 days holdUntil
  ✓ handleDigitalOrderPaid should transition digital order pending commissions to HOLDING with 24 hours holdUntil
  ✓ handleBuyerConfirmReceipt should shorten holdUntil to 24h when current holdUntil is further away
  ✓ handleBuyerConfirmReceipt should not extend holdUntil if already less than 24h away
  ✓ handleOrderCancelled should set PENDING commissions to CANCELLED cleanly
  ✓ handleOrderCancelled should set HOLDING commissions to CANCELLED cleanly
  ✓ handleOrderCancelled should REVERSE already AVAILABLE commissions and create wallet deduction
  ✓ handleOrderItemRefunded should only cancel or reverse the specific line-item commission
  ✓ handleDisputeOpened should freeze commissions to DISPUTED to prevent auto-release
  ✓ handleDisputeDismissed should restore DISPUTED commissions back to HOLDING
  ✓ processMaturedHoldings should release matured HOLDING commissions to AVAILABLE and credit wallet balance
  ✓ processMaturedHoldings should handle debt balance cleanly when balance was negative

Tests: 12 passed, 12 total
```

### 3.2. Toàn bộ 6 Commerce Affiliate Test Suites:
```text
✓ src/modules/affiliate/affiliate-lifecycle.spec.ts (12 tests)
✓ src/modules/affiliate/affiliate-checkout.spec.ts (14 tests)
✓ src/modules/affiliate/affiliate-attribution.spec.ts (12 tests)
✓ src/modules/affiliate/affiliate-rules.spec.ts (13 tests)
✓ src/modules/affiliate/affiliate-commission.spec.ts (12 tests)
✓ src/modules/affiliate/affiliate.service.spec.ts (14 tests)

Test Files: 6 passed (6)
Tests:      77 passed (77)
Time:       2.518s
```

### 3.3. E2E Browser Test Suite (Playwright):
```text
16 passed (29.8s)
```

---

## 4. KẾT LUẬN & SẴN SÀNG CHO GIAI ĐOẠN 8

Giai đoạn 7 đã được hoàn tất trọn vẹn, giải quyết toàn bộ bài toán vòng đời hoa hồng từ lúc đơn hàng giao thành công, xử lý thời gian đối soát theo loại sách, hỗ trợ rút ngắn thời hạn khi người mua xác nhận, bảo vệ ví CTV trước các rủi ro huỷ đơn/hoàn hàng/trả hàng từng phần, và vận hành hệ thống âm ví (debt mechanism) an toàn tuyệt đối.

Hệ thống đã sẵn sàng 100% để chuyển sang **Giai đoạn 8: Wallet/Ledger settlement & reconciliation (Ví hoa hồng, rút tiền CTV & kế toán kép)**.
