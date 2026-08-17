# 📚 Catalog Feature

Tài liệu về feature Catalog - Quản lý sách và danh mục.

## 📋 Mục lục

1. [Overview](#overview)
2. [Book Model](#book-model)
3. [Physical vs Digital](#physical-vs-digital)
4. [Book Management](#book-management)
5. [Inventory](#inventory)
6. [API Endpoints](#api-endpoints)

## Overview

Catalog quản lý:
- Sách vật lý (Physical)
- Sách điện tử (Digital)
- Thể loại, tác giả, nhà xuất bản
- Tồn kho (Physical)
- File ebook (Digital)

## Book Model

### Book Entity

```typescript
interface Book {
  id: string;                    // UUID
  storeId: string;              // FK to Store (logical reference)
  title: string;
  slug: string;                   // URL-friendly
  isbn?: string;
  description: string;
  price: number;                 // Common price for both formats
  categoryId?: string;
  authorId?: string;
  publisherId?: string;
  coverUrl?: string;
  status: BookStatus;
  createdAt: Date;
  updatedAt: Date;
}

enum BookStatus {
  DRAFT = 'DRAFT',              // Đang soạn
  PUBLISHED = 'PUBLISHED',       // Đã xuất bản
  HIDDEN = 'HIDDEN',            // Ẩn
  SUSPENDED = 'SUSPENDED',      // Bị khóa
  ARCHIVED = 'ARCHIVED'          // Lưu trữ
}
```

### Physical Book Details

```typescript
interface PhysicalBookDetails {
  id: string;
  bookId: string;
  stock: number;                // Tồn kho
  reserved: number;             // Đang giữ
  available: number;            // Còn bán được (stock - reserved)
  weight: number;               // grams
  length: number;               // cm
  width: number;                 // cm
  height: number;               // cm
  physicalEnabled: boolean;
  lowStockThreshold: number;    // Ngưỡng "sắp hết hàng"
}
```

### Digital Book Details

```typescript
interface DigitalBookDetails {
  id: string;
  bookId: string;
  sourcePdfKey: string;         // R2 key for original PDF
  previewPdfKey: string;         // R2 key for preview
  epubKey?: string;              // Optional EPUB
  digitalEnabled: boolean;
  allowOnlineRead: boolean;
  allowDownload: boolean;
}
```

## Physical vs Digital

| Aspect | Physical | Digital |
|--------|----------|---------|
| Stock | Có tồn kho | Không có stock |
| Shipping | Cần giao hàng | Không cần |
| Shipping Fee | Có | Không |
| File Storage | Không | Cloudflare R2 |
| Delivery | 1-3 ngày | Tức thì |
| Price | Giống nhau | Giống nhau |

## Book Management

### Create Book Flow

```
Business chọn "Tạo sách mới"
        │
        ▼
Chọn định dạng:
├── Physical only
├── Digital only
└── Both
        │
        ▼
Nhập thông tin:
- Title, ISBN, Description
- Category, Author, Publisher
- Price
        │
        ▼
Upload Cover (Cloudinary)
        │
        ▼
Nếu Digital:
├── Upload PDF file (R2)
├── Upload Preview PDF
└── Thiết lập quyền đọc
        │
        ▼
Nếu Physical:
├── Thiết lập stock ban đầu
└── Kích thước/khối lượng
        │
        ▼
Lưu ở trạng thái DRAFT
        │
        ▼
Publish khi đã sẵn sàng
```

### Book Status Flow

```
                    ┌──────────┐
                    │  DRAFT   │
                    └────┬─────┘
                         │ publish
                         ▼
              ┌──────────────────┐
              │    PUBLISHED     │
              └────────┬─────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
     ┌───▼───┐   ┌────▼────┐   ┌───▼────┐
     │ HIDDEN │   │SUSPENDED│   │ARCHIVED│
     └────────┘   └─────────┘   └────────┘
```

## Inventory

### Stock Management

```typescript
interface InventoryUpdate {
  bookId: string;
  operation: 'SET' | 'ADD' | 'SUBTRACT';
  quantity: number;
  reason: 'SALE' | 'RETURN' | 'ADJUSTMENT' | 'RESTOCK';
}

// Example: Reserve stock when checkout
async function reserveStock(bookId: string, quantity: number) {
  const book = await this.bookRepo.findOne({
    where: { id: bookId },
    relations: ['physicalDetails'],
  });

  if (book.physicalDetails.available < quantity) {
    throw new InsufficientStockException();
  }

  await this.bookRepo.update(bookId, {
    physicalDetails: {
      reserved: book.physicalDetails.reserved + quantity,
    },
  });
}

// Example: Release stock when order cancelled
async function releaseStock(bookId: string, quantity: number) {
  await this.bookRepo.update(bookId, {
    physicalDetails: {
      reserved: Reserved - quantity,
      // or stock += quantity if returning to warehouse
    },
  });
}
```

### Low Stock Alert

```typescript
// Event: STOCK_LOW
interface StockLowEvent {
  bookId: string;
  bookTitle: string;
  storeId: string;
  currentStock: number;
  threshold: number;
}

// Triggered when stock < threshold
@EventHandler()
class StockAlertHandler {
  async handle(event: StockLowEvent) {
    await this.notificationService.notifyStore({
      type: 'STOCK_LOW',
      title: 'Cảnh báo: Sách sắp hết hàng',
      message: `"${event.bookTitle}" chỉ còn ${event.currentStock} cuốn`,
      storeId: event.storeId,
    });
  }
}
```

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/books | List books with filters |
| GET | /api/v1/books/:id | Get book by ID |
| GET | /api/v1/books/slug/:slug | Get book by slug |
| GET | /api/v1/categories | List categories |
| GET | /api/v1/authors | List authors |
| GET | /api/v1/publishers | List publishers |

### Business Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/books | Create book |
| PATCH | /api/v1/books/:id | Update book |
| DELETE | /api/v1/books/:id | Delete book |
| POST | /api/v1/books/:id/cover | Upload cover |
| POST | /api/v1/books/:id/file | Upload PDF |
| POST | /api/v1/books/:id/publish | Publish book |
| POST | /api/v1/books/:id/hide | Hide book |
| PATCH | /api/v1/books/:id/inventory | Update stock |

### Query Parameters

```http
GET /api/v1/books?page=1&limit=20
  &search=javascript
  &category=programming
  &author=douglas
  &format=DIGITAL
  &min_price=50000
  &max_price=200000
  &store=store-uuid
  &sort=price
  &order=asc
```

### Response Format

```json
{
  "data": [
    {
      "id": "book-uuid",
      "title": "JavaScript: The Good Parts",
      "slug": "javascript-the-good-parts",
      "price": 149000,
      "coverUrl": "https://example.com/cover.jpg",
      "author": {
        "id": "author-uuid",
        "name": "Douglas Crockford"
      },
      "store": {
        "id": "store-uuid",
        "name": "Tech Books"
      },
      "averageRating": 4.5,
      "reviewCount": 128,
      "formats": ["DIGITAL"],
      "digitalEnabled": true,
      "physicalEnabled": false,
      "stock": null,
      "status": "PUBLISHED"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```
