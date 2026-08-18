# Books API

Sprint 6 implements book management in Commerce Service under `/api/v1`. Swagger
is available at `/api/docs` while the service is running.

## Access rules

- Public requests can only read `PUBLISHED` books.
- `BUSINESS` can create books and manage books it owns.
- `PLATFORM_ADMIN` can manage and suspend every book.
- Draft, hidden, archived and suspended books return `404` to unauthorized readers.
- Public responses never contain owner IDs, Cloudinary public IDs, R2 keys,
  checksums, reserved inventory, or raw stock.

## Public listing and search

```http
GET /api/v1/books?page=1&limit=20
  &search=nguyen%20nhat
  &category=van-hoc
  &includeChildren=true
  &author=author-uuid-or-slug
  &publisher=publisher-uuid-or-slug
  &store=store-uuid
  &format=PHYSICAL
  &minPrice=50000
  &maxPrice=300000
  &sortBy=createdAt
  &order=DESC
```

| Parameter | Values |
|-----------|--------|
| `page` | Integer from 1; default 1 |
| `limit` | 1–100; default 20 |
| `search` | Title, ISBN, author, or publisher; minimum 2 characters |
| `category` | Category UUID or slug |
| `includeChildren` | Include all active category descendants |
| `author`, `publisher` | UUID or slug |
| `store` | Store UUID |
| `format` | `PHYSICAL`, `DIGITAL`, `BOTH` |
| `minPrice`, `maxPrice` | Non-negative numbers |
| `sortBy` | `createdAt`, `publishedAt`, `price`, `title` |
| `order` | `ASC`, `DESC` |

Search ranking is ISBN exact, title exact, title prefix, PostgreSQL full-text rank,
then trigram similarity. Vietnamese text is normalized for accent-insensitive search.

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

## Book details

```http
GET /api/v1/books/:id
GET /api/v1/books/slug/:slug
```

Authentication is optional. An authenticated owner/admin can use these endpoints
to inspect non-public books.

## Create a book

```http
POST /api/v1/books
Authorization: Bearer <business-or-admin-token>
Content-Type: application/json
```

```json
{
  "storeId": "store-uuid",
  "title": "Mắt biếc",
  "isbn": "9786041234567",
  "description": "Mô tả sách có ít nhất mười ký tự",
  "price": 120000,
  "categoryId": "category-uuid",
  "authorId": "author-uuid",
  "publisherId": "publisher-uuid",
  "format": "BOTH",
  "physicalDetails": {
    "stock": 100,
    "weight": 250,
    "length": 20,
    "width": 14,
    "height": 2,
    "physicalEnabled": true,
    "lowStockThreshold": 10
  },
  "digitalDetails": {
    "digitalEnabled": true,
    "allowOnlineRead": true,
    "allowDownload": false
  }
}
```

Creation always produces a `DRAFT`. The book and its format details are inserted
in one transaction.

## CRUD and format metadata

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/books/:id` | Update a hidden/draft book and optionally its format details |
| DELETE | `/books/:id` | Soft-delete a book |
| GET | `/books/:id/physical` | Private physical metadata |
| PATCH | `/books/:id/physical` | Dimensions, enabled flag, threshold |
| GET | `/books/:id/digital` | Safe digital metadata without object keys |
| PATCH | `/books/:id/digital` | Reading/download flags |

A published book must be hidden before catalog or format settings are modified.
Inventory and media replacement remain available separately.

## Inventory

```http
PATCH /api/v1/books/:id/inventory
Authorization: Bearer <business-or-admin-token>
```

```json
{
  "operation": "ADD",
  "quantity": 25,
  "reason": "RESTOCK"
}
```

- Operations: `SET`, `ADD`, `SUBTRACT`.
- Reasons: `RESTOCK`, `ADJUSTMENT`, `RETURN`, `SALE`.
- The update locks the physical row, cannot make stock negative or lower than
  reserved, writes an audit log, and emits `stock.low` when needed.

## Uploads

| Method | Endpoint | Form field | Storage |
|--------|----------|------------|---------|
| POST | `/books/:id/cover` | `cover` | Cloudinary |
| POST | `/books/:id/file` | `file` | Private Cloudflare R2 source PDF |
| POST | `/books/:id/preview` | `file` | Private Cloudflare R2 preview PDF |

Allowed covers are JPEG, PNG, and WebP up to `BOOK_COVER_MAX_BYTES`. PDFs must
have a valid `%PDF-` signature and fit `BOOK_PDF_MAX_BYTES`. Storage uploads are
compensated if the database update fails, and the previous object is removed only
after the replacement has been saved.

## Publishing workflow

```text
DRAFT ──publish──> PUBLISHED
HIDDEN ──publish──> PUBLISHED
PUBLISHED ──hide──> HIDDEN
DRAFT/HIDDEN/PUBLISHED ──archive──> ARCHIVED
any status ──admin suspend──> SUSPENDED
```

| Method | Endpoint |
|--------|----------|
| POST | `/books/:id/publish` |
| POST | `/books/:id/hide` |
| POST | `/books/:id/archive` |
| POST | `/books/:id/suspend` |

Publish checks active catalog references, cover, common fields and every required
physical/digital field. An incomplete book receives HTTP `422` with an `errors`
array containing `field` and `message` entries.

## Database setup

Keep `DATABASE_SYNC=false` and run migrations from `platform/`:

```bash
npm run migration:commerce:run
```

Book search uses migration-owned `tsvector`, GIN, and `pg_trgm` indexes.
