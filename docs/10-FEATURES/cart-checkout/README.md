# 🛒 Cart & Checkout Feature

Tài liệu về Cart và Checkout flow.

## 📋 Mục lục

1. [Overview](#overview)
2. [Cart Model](#cart-model)
3. [Cart Operations](#cart-operations)
4. [Checkout Flow](#checkout-flow)
5. [Multi-Store Handling](#multi-store-handling)
6. [API Endpoints](#api-endpoints)

## Overview

Cart & Checkout quản lý:
- Thêm sách vào giỏ hàng
- Cập nhật số lượng
- Multi-store cart (nhiều cửa hàng)
- Checkout với shipping fee
- Áp dụng voucher
- Tạo order

## Cart Model

### Multi-Store Cart Design

```
User's Cart
    │
    ├── Store: Tech Books Store
    │   ├── Item: Clean Code (Physical) × 2
    │   ├── Item: JavaScript: The Good Parts (Digital) × 1
    │   │
    │   └── Shipping Fee: 30,000đ (nếu có physical)
    │
    └── Store: Fiction Books Store
        ├── Item: Harry Potter (Physical) × 1
        └── Shipping Fee: 25,000đ

Total: Subtotal + Shipping (sum of all stores)
```

### Cart Data Structure

```typescript
interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

interface CartItem {
  id: string;
  bookId: string;
  book: {
    id: string;
    title: string;
    slug: string;
    coverUrl: string;
    price: number;
    storeId: string;
    store: {
      id: string;
      name: string;
    };
  };
  format: 'PHYSICAL' | 'DIGITAL';
  quantity: number;
  subtotal: number;
  addedAt: Date;
}

interface CartSummary {
  totalItems: number;
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  grandTotal: number;
}
```

## Cart Operations

### Add to Cart

```
User clicks "Add to Cart"
        │
        ▼
Backend checks:
├── Book exists & status = PUBLISHED?
├── Format available (PHYSICAL/DIGITAL)?
├── User already owns digital book?
├── Item already in cart?
        │
        ▼
Calculate subtotal
        │
        ▼
Save to database (Redis for performance, PostgreSQL for persistence)
        │
        ▼
Return updated cart
```

### Add to Cart Logic

```typescript
async function addToCart(userId: string, dto: AddToCartDto): Promise<Cart> {
  // 1. Check book exists
  const book = await this.bookService.findById(dto.bookId);
  if (!book) throw new NotFoundException('Book not found');
  if (book.status !== 'PUBLISHED') throw new BadRequestException('Book not available');

  // 2. Check format
  if (dto.format === 'PHYSICAL') {
    if (!book.physicalDetails?.physicalEnabled) {
      throw new BadRequestException('Physical format not available');
    }
    if (book.physicalDetails.available < dto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }
  }

  // 3. Check if digital and already purchased
  if (dto.format === 'DIGITAL') {
    const hasAccess = await this.libraryService.hasAccess(userId, dto.bookId);
    if (hasAccess) {
      throw new ConflictException('Already own this book');
    }

    // Check if already in cart
    const existingItem = await this.cartItemRepo.findOne({
      where: { userId, bookId: dto.bookId, format: dto.format }
    });
    if (existingItem) {
      throw new ConflictException('Item already in cart');
    }
  }

  // 4. Create cart item
  const cartItem = await this.cartItemRepo.save({
    userId,
    bookId: dto.bookId,
    format: dto.format,
    quantity: dto.format === 'DIGITAL' ? 1 : dto.quantity,
  });

  return this.getCart(userId);
}
```

## Checkout Flow

### Complete Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           CHECKOUT FLOW                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User clicks "Checkout"                                                  │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────┐                                                   │
│  │  GET CART        │                                                   │
│  │  - Validate items│                                                   │
│  │  - Check stock   │                                                   │
│  │  - Get prices    │                                                   │
│  └────────┬─────────┘                                                   │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────┐                                                   │
│  │  PREVIEW CHECKOUT│                                                   │
│  │  - Calculate fees │                                                   │
│  │  - Apply vouchers │                                                   │
│  │  - Get shipping  │                                                   │
│  │    quotes        │                                                   │
│  └────────┬─────────┘                                                   │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────┐                                                   │
│  │  USER SELECTS    │                                                   │
│  │  - Shipping addr │                                                   │
│  │  - Payment method│                                                   │
│  │  - Voucher      │                                                   │
│  └────────┬─────────┘                                                   │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────┐                                                   │
│  │  CONFIRM         │                                                   │
│  │  - Reserve stock │                                                   │
│  │  - Create order  │                                                   │
│  │  - Create seller │                                                   │
│  │    orders        │                                                   │
│  │  - Return payment │                                                   │
│  │    URL           │                                                   │
│  └────────┬─────────┘                                                   │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────┐                                                   │
│  │  PAYMENT         │                                                   │
│  │  - User pays via │                                                   │
│  │    PayOS    │                                                   │
│  │  - Webhook       │                                                   │
│  │    confirms      │                                                   │
│  └────────┬─────────┘                                                   │
│           │                                                              │
│     ┌─────┴─────┐                                                       │
│     │           │                                                       │
│  Success      Failed                                                     │
│     │           │                                                       │
│     ▼           ▼                                                       │
│  Payment = SUCCEEDED  →  Refund request                                │
│  Grant book access     Stock released                                  │
│  Notify user           Refund if paid                                 │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Checkout Preview

```typescript
async function previewCheckout(userId: string, dto: PreviewCheckoutDto): Promise<CheckoutPreview> {
  // 1. Get cart with all details
  const cart = await this.getCart(userId);
  if (cart.items.length === 0) {
    throw new BadRequestException('Cart is empty');
  }

  // 2. Group by store
  const storeGroups = this.groupByStore(cart.items);

  // 3. Calculate shipping for each store
  const storeSummaries = await Promise.all(
    storeGroups.map(async (group) => {
      const hasPhysical = group.items.some(i => i.format === 'PHYSICAL');
      
      let shippingFee = 0;
      if (hasPhysical) {
        shippingFee = await this.shippingService.getQuote({
          storeId: group.storeId,
          address: dto.shippingAddress,
          items: group.items.filter(i => i.format === 'PHYSICAL'),
        });
      }

      return {
        storeId: group.storeId,
        storeName: group.storeName,
        items: group.items,
        itemsSubtotal: group.items.reduce((sum, i) => sum + i.subtotal, 0),
        shippingFee,
        discountAmount: 0,
        storeTotal: 0, // Will be calculated with voucher
      };
    })
  );

  // 4. Apply voucher if provided
  let voucherDiscount = 0;
  let voucher = null;
  if (dto.voucherCode) {
    voucher = await this.voucherService.validateAndCalculate({
      code: dto.voucherCode,
      userId,
      cartTotal: storeSummaries.reduce((sum, s) => sum + s.itemsSubtotal, 0),
      bookIds: cart.items.map(i => i.bookId),
    });
    voucherDiscount = voucher.discountAmount;
  }

  // 5. Calculate totals
  const subtotal = cart.items.reduce((sum, i) => sum + i.subtotal, 0);
  const shippingTotal = storeSummaries.reduce((sum, s) => sum + s.shippingFee, 0);
  const grandTotal = subtotal - voucherDiscount + shippingTotal;

  return {
    storeSummaries,
    subtotal,
    shippingTotal,
    voucherDiscount,
    grandTotal,
    voucher,
  };
}
```

## Multi-Store Handling

### Order Split Logic

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ORDER SPLITTING                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Cart Items:                                                            │
│  ├── Tech Books Store                                                  │
│  │   ├── Clean Code (Physical) × 2      - 500,000đ                   │
│  │   └── JS: Good Parts (Digital) × 1     - 149,000đ                  │
│  │   Shipping: 30,000đ                                                   │
│  │                                                                         │
│  └── Fiction Store                                                       │
│      └── Harry Potter (Physical) × 1      - 200,000đ                   │
│      Shipping: 25,000đ                                                   │
│                                                                          │
│  ════════════════════════════════════════════════════════════════════   │
│                                                                          │
│  Created Orders:                                                         │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Order HUK202608140001 (Main)                                      │   │
│  │ ├── Total: 904,000đ                                                │   │
│  │ ├── Payment: 1 transaction                                         │   │
│  │ └── Contains:                                                      │   │
│  │     ├── SellerOrder SO-HUK-001 (Tech Books)                       │   │
│  │     │   ├── Items: 649,000đ                                        │   │
│  │     │   ├── Shipping: 30,000đ                                      │   │
│  │     │   └── Total: 679,000đ                                        │   │
│  │     │                                                             │   │
│  │     └── SellerOrder SO-HUK-002 (Fiction)                           │   │
│  │         ├── Items: 200,000đ                                        │   │
│  │         ├── Shipping: 25,000đ                                       │   │
│  │         └── Total: 225,000đ                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Each SellerOrder is handled independently by its store                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### SellerOrder Creation

```typescript
async function createOrder(userId: string, dto: ConfirmCheckoutDto): Promise<Order> {
  return this.prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId,
        code: this.generateOrderCode(),
        itemSubtotal: preview.itemSubtotal,
        shippingTotal: preview.shippingTotal,
        discountTotal: preview.discountTotal,
        grandTotal: preview.grandTotal,
        paymentMethod: dto.paymentMethod,
        paymentProvider: dto.paymentMethod === 'ONLINE_PAYMENT' ? 'PAYOS' : 'COD',
        paymentStatus: 'PENDING',
        status: dto.paymentMethod === 'COD' ? 'PROCESSING' : 'PENDING_PAYMENT',
        shippingAddress: preview.shippingAddress,
      },
    });

    for (const group of preview.groups) {
      const sellerOrder = await tx.sellerOrder.create({
        data: {
          orderId: order.id,
          code: this.generateSellerOrderCode(),
          storeId: group.storeId,
          ownerUserId: group.ownerUserId,
          itemSubtotal: group.itemSubtotal,
          shippingFee: group.shippingFee,
          grandTotal: group.grandTotal,
          status: dto.paymentMethod === 'COD' ? 'PENDING_CONFIRMATION' : 'PENDING_PAYMENT',
        },
      });
      const items = await Promise.all(group.items.map(item =>
        tx.orderItem.create({ data: { ...item, sellerOrderId: sellerOrder.id } }),
      ));
      await this.reservations.reserve(tx, order.id, items);
    }

    // Online payment attempt is created only when /payments/.../initiate is called.
    if (dto.paymentMethod === 'COD') {
      await tx.payment.create({
        data: { orderId: order.id, amount: order.grandTotal, method: 'COD', provider: 'COD' },
      });
    }
    await tx.cartItem.deleteMany({ where: { cartId: preview.cartId } });
    return order;
  });
}
```

## API Endpoints

### POST /cart/items

```http
POST /api/v1/cart/items
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "bookId": "book-uuid",
  "format": "PHYSICAL",
  "quantity": 2
}
```

### POST /cart/checkout/preview

```http
POST /api/v1/cart/checkout/preview
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "shippingAddress": {
    "receiverName": "Nguyen Van A",
    "phone": "0912345678",
    "addressLine": "123 Nguyen Hue",
    "ward": "Ben Nghe",
    "province": "Ho Chi Minh City"
  },
  "voucherCode": "HUKI10"
}
```

### POST /cart/checkout/confirm

```http
POST /api/v1/cart/checkout/confirm
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "sessionId": "checkout-session-uuid",
  "paymentMethod": "ONLINE_PAYMENT",
  "paymentProvider": "PAYOS"
}
```
