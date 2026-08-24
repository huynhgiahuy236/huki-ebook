# 📊 Business Flows - HUKI EBOOK

## Overview

Thư mục này chứa tất cả business flows, state machines, và luồng nghiệp vụ.

## Structure

```
flow/
├── AUTH/                    # Authentication Flows
│   ├── login.md           # Login flow
│   ├── register.md        # Registration flow
│   ├── refresh-token.md    # Token refresh flow
│   └── password-reset.md  # Password reset flow
├── COMMERCE/              # Commerce Flows
│   ├── add-to-cart.md     # Add to cart flow
│   ├── checkout.md        # Checkout flow
│   ├── payment.md         # Payment flow
│   ├── order-completion.md # Order completion flow
│   └── refund.md          # Refund flow
├── SHIPPING/              # Shipping Flows
│   ├── create-shipment.md # Create shipment from order
│   ├── update-status.md   # Update shipment status
│   └── delivery.md         # Delivery flow
├── COMMUNITY/            # Community Flows
│   ├── create-post.md     # Forum post flow
│   ├── send-message.md    # Chat message flow
│   └── write-review.md   # Review flow
└── PROMOTION/           # Promotion Flows
    ├── apply-voucher.md  # Voucher application flow
    └── flash-sale.md     # Flash sale flow
```

## Flow Components

Each flow document includes:

1. **Diagram** - ASCII/Unicode flow diagram
2. **Steps** - Sequential steps
3. **States** - State definitions
4. **Events** - Trigger events
5. **Errors** - Error scenarios and recovery
6. **Code References** - Related source files

## Quick Reference

| Flow | Service | Trigger |
|------|---------|---------|
| Login | Identity | User submits credentials |
| Register | Identity | User submits registration |
| Add to Cart | Commerce | User clicks "Add to Cart" |
| Checkout | Commerce | User clicks "Checkout" |
| Payment | Commerce | User confirms payment |
| Order Completion | Commerce | Shipment delivered |
| Create Shipment | Shipping | ORDER_CREATED event |
| Voucher Apply | Promotion | User enters voucher code |

## Update History

| Date | Change | Author |
|------|--------|--------|
| 2026-08-24 | Initial structure | Claude |

---

*For specific flows: Check individual flow files*
