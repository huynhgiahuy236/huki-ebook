# Exception Patterns

NestJS exception handling patterns for HUKI EBOOK.

## Standard Pattern

```typescript
import { throwError, ErrorCode } from '@app/shared';

// In service methods
async someMethod(id: string) {
  const entity = await this.repository.findOne(id);
  if (!entity) {
    throwError.notFound(ErrorCode.ENTITY_NOT_FOUND, 'Entity not found');
  }
  return entity;
}
```

## Patterns by Use Case

### 1. Not Found

```typescript
// Option A: throwError helper
throwError.notFound(ErrorCode.BOOK_NOT_FOUND, 'Sách không tìm thấy');

// Option B: Direct exception
throw new NotFoundExceptionWithCode(ErrorCode.BOOK_NOT_FOUND, 'Sách không tìm thấy');
```

### 2. Validation/Bad Request

```typescript
// Simple validation
throwError.badRequest(ErrorCode.VALIDATION_REQUIRED, 'Trường bắt buộc');

// With details
throwError.badRequest(ErrorCode.VALIDATION_ERROR, 'Validation failed', {
  field: 'email',
  message: 'Email không hợp lệ',
});
```

### 3. Conflict

```typescript
throwError.conflict(ErrorCode.BOOK_SLUG_EXISTS, 'URL sách đã được sử dụng');
```

### 4. Authorization

```typescript
// Forbidden
throwError.forbidden(ErrorCode.AUTHZ_NOT_OWNER, 'Bạn không phải chủ sở hữu');

// Unauthorized
throwError.unauthorized(ErrorCode.AUTH_TOKEN_EXPIRED, 'Token đã hết hạn');
```

### 5. Business Logic

```typescript
// Unprocessable (valid format but business rule fails)
throwError.unprocessable(ErrorCode.INVENTORY_INSUFFICIENT, 'Số lượng trong kho không đủ');
```

## Migration Guide

### Before (Old Pattern)

```typescript
// ❌ OLD - No error code
throw new NotFoundException('Book not found');
throw new BadRequestException('Cart is empty');
throw new ConflictException('Item already in cart');
```

### After (New Pattern)

```typescript
// ✅ NEW - With error code
throw new NotFoundExceptionWithCode(ErrorCode.BOOK_NOT_FOUND, 'Sách không tìm thấy');
throw new BadRequestExceptionWithCode(ErrorCode.CHECKOUT_CART_EMPTY, 'Giỏ hàng trống');
throw new ConflictExceptionWithCode(ErrorCode.CART_ITEM_EXISTS, 'Sản phẩm đã có trong giỏ hàng');
```

## NestJS Filter Integration

The `HttpExceptionFilter` automatically formats exceptions:

```typescript
// Thrown exception
throw new NotFoundExceptionWithCode(ErrorCode.BOOK_NOT_FOUND, 'Sách không tìm thấy');

// Response to client
{
  "statusCode": 404,
  "message": "Sách không tìm thấy",
  "code": "BOOK_NOT_FOUND",
  "timestamp": "2026-08-24T10:00:00.000Z",
  "path": "/api/v1/books/123"
}
```

## Validation Exception

For class-validator errors, use `ValidationException`:

```typescript
import { ValidationException } from '@app/shared';

// In class-validator pipes
throw new ValidationException('Dữ liệu không hợp lệ', {
  field: 'email',
  errors: ['email must be a valid email'],
});
```

## Prisma Error Handling

```typescript
import { Prisma } from '@app/shared';

try {
  await this.prisma.book.create({ data });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throwError.conflict(ErrorCode.BOOK_SLUG_EXISTS, 'URL sách đã được sử dụng');
    }
  }
  throwError.internal('Database error');
}
```
