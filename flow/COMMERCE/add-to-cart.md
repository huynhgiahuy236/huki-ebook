# Add to Cart Flow

## Overview

Flow xử lý việc thêm sách vào giỏ hàng.

## Flow Diagram

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Select │───▶│ Validate │───▶│  Check   │───▶│  Check   │
│  Book   │    │  Input   │    │  Stock   │    │ Already  │
└──────────┘    └──────────┘    └──────────┘    │  Owned   │
                                                └────┬─────┘
                                                     │
                         ┌─────────────────────────────┼─────────────────────────────┐
                         │                             │                             │
                         ▼                             ▼                             ▼
                   ┌──────────┐                 ┌──────────┐                 ┌──────────┐
                   │  In      │                 │ Physical │                 │ Digital  │
                   │  Stock   │                 │ Check    │                 │ Check    │
                   │  Proceed │                 │ Stock    │                 │ Enabled  │
                   └────┬─────┘                 └────┬─────┘                 └────┬─────┘
                        │                             │                             │
          ┌─────────────┼─────────────┐               │                             │
          │             │             │               │                             │
          ▼             ▼             ▼               ▼                             ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐     ┌──────────┐                 ┌──────────┐
    │ Create   │ │ Update   │ │ Error:   │     │ Check    │                 │ Check    │
    │ New Item │ │ Quantity │ │ Insuff.  │     │ Quantity │                 │ Already  │
    │          │ │          │ │ Stock    │     │ ≤ Stock  │                 │ Purchased│
    └────┬─────┘ └────┬─────┘ └──────────┘     └────┬─────┘                 └────┬─────┘
         │             │                              │                             │
         └─────────────┴──────────────────────────────┴─────────────────────────────┘
                                        │
                                        ▼
                                 ┌──────────┐
                                 │  Return  │
                                 │  Updated │
                                 │  Cart    │
                                 └──────────┘
```

## Process

```typescript
async addToCart(userId: string, dto: AddToCartDto) {
  return this.dataSource.transaction(async (manager) => {
    // 1. Get or create cart
    let cart = await manager.cart.findUnique({
      where: { userId },
    });
    if (!cart) {
      cart = await manager.cart.create({
        data: { userId },
      });
    }

    // 2. Find book
    const book = await manager.book.findUnique({
      where: { id: dto.bookId },
      include: { physicalDetails: true, digitalDetails: true },
    });
    
    if (!book) {
      throwNotFound(ErrorCode.BOOK_NOT_FOUND);
    }

    // 3. Validate book status
    if (book.status !== 'PUBLISHED') {
      throwBadRequest(ErrorCode.BOOK_NOT_PUBLISHED);
    }

    // 4. Validate format availability
    if (dto.format === 'PHYSICAL') {
      if (!book.physicalDetails?.physicalEnabled) {
        throwBadRequest(ErrorCode.BOOK_FORMAT_NOT_AVAILABLE);
      }
    } else {
      if (!book.digitalDetails?.digitalEnabled) {
        throwBadRequest(ErrorCode.BOOK_FORMAT_NOT_AVAILABLE);
      }
    }

    // 5. Check stock/inventory
    if (dto.format === 'PHYSICAL') {
      const available = book.physicalDetails.stock - book.physicalDetails.reserved;
      if (available < dto.quantity) {
        throwConflict(ErrorCode.INVENTORY_INSUFFICIENT);
      }
    }

    // 6. Check if already owned (digital)
    if (dto.format === 'DIGITAL') {
      const existingAccess = await manager.bookAccess.findUnique({
        where: { userId_bookId: { userId, bookId: dto.bookId } },
      });
      if (existingAccess?.status === 'ACTIVE') {
        throwConflict(ErrorCode.CART_DIGITAL_ALREADY_OWNED);
      }
    }

    // 7. Check existing cart item
    const existingItem = await manager.cartItem.findUnique({
      where: { cartId_bookId: { cartId: cart.id, bookId: dto.bookId } },
    });

    if (existingItem) {
      // Update quantity (digital is always 1)
      const newQuantity = dto.format === 'DIGITAL' 
        ? 1 
        : existingItem.quantity + dto.quantity;
      
      const available = book.physicalDetails.stock - book.physicalDetails.reserved;
      if (newQuantity > available) {
        throwConflict(ErrorCode.INVENTORY_INSUFFICIENT);
      }

      await manager.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      // Create new item
      await manager.cartItem.create({
        data: {
          cartId: cart.id,
          bookId: dto.bookId,
          format: dto.format,
          quantity: dto.format === 'DIGITAL' ? 1 : dto.quantity,
          unitPrice: book.price,
        },
      });
    }

    // 8. Return updated cart
    return this.getCart(userId);
  });
}
```

## Rules Summary

| Rule | Physical | Digital |
|------|----------|---------|
| Max quantity per item | Stock - Reserved | 1 |
| Already in cart | Update quantity | Not allowed (throw error) |
| Already purchased | Allowed | Not allowed |
| Price snapshot | ✅ Yes | ✅ Yes |

## Error Codes

| Code | Scenario |
|------|----------|
| BOOK_NOT_FOUND | Book doesn't exist |
| BOOK_NOT_PUBLISHED | Book not published |
| BOOK_FORMAT_NOT_AVAILABLE | Format disabled |
| INVENTORY_INSUFFICIENT | Not enough stock |
| CART_DIGITAL_ALREADY_OWNED | Already purchased digital |
| CART_QUANTITY_INVALID | Invalid quantity |

## Cart Item Response

```typescript
interface CartItemView {
  id: string;
  bookId: string;
  format: 'PHYSICAL' | 'DIGITAL';
  quantity: number;
  unitPrice: number;
  subtotal: number;
  book: {
    id: string;
    title: string;
    slug: string;
    coverUrl: string;
    status: BookStatus;
  };
}
```

## Key Files

| File | Description |
|------|-------------|
| `commerce-service/.../cart.service.ts` | Cart logic |
| `commerce-service/.../cart.controller.ts` | Cart API |
