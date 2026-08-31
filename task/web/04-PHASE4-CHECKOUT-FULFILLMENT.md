# Phase 04 - Cart, Checkout, Payment & Shipping

## Sprint 13 - Cart

Get/add/update/remove/clear cart; optimistic rollback; hết hàng, đổi giá, digital/physical và multi-store.

## Sprint 14 - Address, shipping fee and checkout

CRUD địa chỉ, tính phí ship, checkout preview/confirm; voucher lookup/validate, breakdown và chống double submit.

## Sprint 15 - COD completion and PayOS preparation

COD là payment path bắt buộc của MVP. Chuẩn bị UI state và adapter cho initiate, redirect/QR, poll status, return/cancel và buyer refund nhưng không chặn MVP khi thiếu PayOS credential. PayOS webhook chỉ backend gọi và chỉ chuyển `SYSTEM_TESTED` khi có chữ ký/integration test hợp lệ.

## Sprint 16 - COD checkout hardening

E2E COD, invalid voucher, inventory race, timeout/retry-safe và double-submit. Online-payment E2E cùng reconciliation callback chậm chuyển sang post-MVP nếu môi trường PayOS chưa sẵn sàng.

**Phase DoD MVP:** cart/address/fee/COD checkout API `VERIFIED`; PayOS được phép `ENV_BLOCKED` với adapter/UI state và ticket rõ ràng. Khi bật online payment, webhook phải đạt `SYSTEM_TESTED`.

