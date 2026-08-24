# Book Domain Schema

## Book

```typescript
interface Book {
  id: string;
  storeId: string;
  ownerUserId: string;
  title: string;
  slug: string;
  isbn: string | null;
  description: string;
  price: number; // Decimal in VND
  salePrice: number | null;
  categoryId: string | null;
  authorId: string | null;
  publisherId: string | null;
  format: BookFormat;
  coverUrl: string | null;
  coverPublicId: string | null;
  status: BookStatus;
  accessType: BookAccessType;
  publishedAt: Date | null;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

type BookFormat = 'PHYSICAL' | 'DIGITAL' | 'BOTH';

type BookStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN' | 'SUSPENDED' | 'ARCHIVED';

/**
 * Access type cho subscription model:
 * - FREE: Sách thường, mua 1 lần đọc mãi mãi
 * - PREMIUM: Sách premium, cần subscription hoặc trả thêm phí
 */
type BookAccessType = 'FREE' | 'PREMIUM';
```

## PhysicalBookDetails

```typescript
interface PhysicalBookDetails {
  id: string;
  bookId: string;
  stock: number;
  reserved: number;
  weight: number | null; // grams
  dimensions: string | null;
  pageCount: number | null;
  physicalEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Computed
const availableStock = details.stock - details.reserved;
```

## DigitalBookDetails

```typescript
interface DigitalBookDetails {
  id: string;
  bookId: string;
  pdfKey: string | null;
  epubKey: string | null;
  previewPdfKey: string | null;
  digitalEnabled: boolean;
  /** Loại truy cập: FREE = mua đọc mãi mãi, PREMIUM = cần subscription */
  accessType: BookAccessType;
  createdAt: Date;
  updatedAt: Date;
}
```

## BookAccess (Library)

```typescript
interface BookAccess {
  id: string;
  userId: string;
  bookId: string;
  orderId: string;
  sellerOrderId: string | null;
  /** Loại truy cập: FREE = vĩnh viễn, PREMIUM = theo subscription */
  accessType: BookAccessType;
  accessKey: string | null;
  signedUrlExpiresAt: Date | null;
  readingProgress: number; // 0-100
  lastReadAt: Date | null;
  status: AccessStatus;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

type AccessStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';
```

## Book View (API Response)

```typescript
interface BookView {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  salePrice: number | null;
  format: BookFormat;
  coverUrl: string | null;
  status: BookStatus;
  accessType: BookAccessType;
  publishedAt: Date | null;
  viewCount: number;
  store: {
    id: string;
    name: string;
    slug: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  author: {
    id: string;
    name: string;
    slug: string;
  } | null;
  publisher: {
    id: string;
    name: string;
    slug: string;
  } | null;
  physicalDetails: PhysicalBookDetailsView | null;
  digitalDetails: DigitalBookDetailsView | null;
}

interface PhysicalBookDetailsView {
  stock: number;
  available: number; // stock - reserved
  weight: number | null;
  pageCount: number | null;
  physicalEnabled: boolean;
}

interface DigitalBookDetailsView {
  hasPdf: boolean;
  hasEpub: boolean;
  hasPreview: boolean;
  digitalEnabled: boolean;
  accessType: BookAccessType;
}
```

## Book Access Logic

### Determining Access

```typescript
function canAccessBook(user: User, book: Book, access?: BookAccess): boolean {
  // 1. User owns the book (purchased)
  if (access?.status === 'ACTIVE') {
    return true;
  }

  // 2. User has subscription
  if (book.accessType === 'PREMIUM') {
    const subscription = user.subscription;
    if (!subscription || subscription.status !== 'ACTIVE') {
      return false;
    }
    // Check if subscription tier covers this book
    if (subscription.tier === 'PREMIUM') {
      return true;
    }
    // STANDARD tier may cover some PREMIUM books
    return false;
  }

  // 3. FREE books - BASIC subscription can access
  return true;
}
```

## Book Pricing Flow

```typescript
interface PriceCalculation {
  basePrice: number;
  salePrice: number | null;
  finalPrice: number;
  discount: number;
  discountPercent: number;
}

function calculatePrice(book: Book): PriceCalculation {
  const basePrice = Number(book.price);
  const salePrice = book.salePrice ? Number(book.salePrice) : null;
  
  const finalPrice = salePrice ?? basePrice;
  const discount = basePrice - finalPrice;
  const discountPercent = salePrice ? (discount / basePrice) * 100 : 0;
  
  return {
    basePrice,
    salePrice,
    finalPrice,
    discount,
    discountPercent: Math.round(discountPercent),
  };
}
```

## Book Status Flow

```
┌─────────┐     ┌───────────┐     ┌───────────┐
│  DRAFT  │────▶│ PUBLISHED │────▶│  HIDDEN   │
└─────────┘     └─────┬─────┘     └───────────┘
                     │
                     ▼
              ┌───────────┐
              │ SUSPENDED │◀────┐
              └───────────┘     │ (Admin action)
                     │           │
                     ▼           │
              ┌───────────┐     │
              │ ARCHIVED  │─────┘
              └───────────┘
```

## Key Files

| File | Description |
|------|-------------|
| `commerce-service/.../books.service.ts` | Book CRUD |
| `commerce-service/.../book-publishing.service.ts` | Status transitions |
| `commerce-service/.../digital-books.service.ts` | Digital access |
