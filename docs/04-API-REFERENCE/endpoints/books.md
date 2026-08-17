# 📚 Books API

## GET /books

Get list of books with filtering and pagination.

### Request

```http
GET /api/v1/books?page=1&limit=20&search=javascript&category=programming&format=DIGITAL&min_price=0&max_price=500000&sort=created_at&order=desc
Authorization: Bearer <access_token>  # Optional for public catalog
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 20 | Items per page (max 100) |
| search | string | - | Search in title, author, ISBN |
| category | string | - | Category slug or ID |
| author | string | - | Author name |
| store | string | - | Store ID |
| format | string | - | PHYSICAL, DIGITAL, or BOTH |
| min_price | number | - | Minimum price |
| max_price | number | - | Maximum price |
| sort | string | created_at | Sort field |
| order | string | desc | Sort order (asc/desc) |

### Response 200

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "JavaScript: The Good Parts",
      "slug": "javascript-the-good-parts",
      "author": {
        "id": "author-uuid",
        "name": "Douglas Crockford"
      },
      "store": {
        "id": "store-uuid",
        "name": "Tech Books Store",
        "slug": "tech-books-store"
      },
      "coverUrl": "https://example.com/covers/js-good-parts.jpg",
      "price": 149000,
      "averageRating": 4.5,
      "reviewCount": 128,
      "formats": ["DIGITAL"],
      "digitalEnabled": true,
      "physicalEnabled": false,
      "stock": null,
      "status": "PUBLISHED",
      "createdAt": "2026-08-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## GET /books/:id

Get book details.

### Request

```http
GET /api/v1/books/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <access_token>  # Optional
```

### Response 200

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "JavaScript: The Good Parts",
    "slug": "javascript-the-good-parts",
    "isbn": "978-0596517748",
    "description": "Most programming languages contain good and bad parts...",
    "price": 149000,
    "author": {
      "id": "author-uuid",
      "name": "Douglas Crockford"
    },
    "publisher": {
      "id": "publisher-uuid",
      "name": "O'Reilly Media"
    },
    "category": {
      "id": "category-uuid",
      "name": "Programming",
      "slug": "programming"
    },
    "store": {
      "id": "store-uuid",
      "name": "Tech Books Store",
      "slug": "tech-books-store",
      "logo": "https://example.com/stores/logo.jpg"
    },
    "coverUrl": "https://example.com/covers/js-good-parts.jpg",
    "formats": ["DIGITAL"],
    "digitalDetails": {
      "digitalEnabled": true,
      "allowOnlineRead": true,
      "allowDownload": true,
      "previewPdfUrl": "https://example.com/preview/js-good-parts.pdf"
    },
    "physicalDetails": null,
    "averageRating": 4.5,
    "reviewCount": 128,
    "status": "PUBLISHED",
    "createdAt": "2026-08-01T00:00:00.000Z"
  }
}
```

---

## GET /books/:id/read (Protected)

Get ebook reading URL.

### Request

```http
GET /api/v1/books/550e8400-e29b-41d4-a716-446655440000/read
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": {
    "bookId": "550e8400-e29b-41d4-a716-446655440000",
    "readingUrl": "https://r2.huki-ebook.com/signed-url...",
    "expiresAt": "2026-08-14T12:00:00.000Z",
    "progress": {
      "currentPage": 42,
      "progressPercent": 35,
      "status": "READING"
    }
  }
}
```

### Response 403

```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "You do not have access to this book"
}
```

---

## GET /books/slug/:slug

Get book by slug.

### Request

```http
GET /api/v1/books/slug/javascript-the-good-parts
```

---

## POST /books (Business Only)

Create a new book.

### Request

```http
POST /api/v1/books
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "New JavaScript Book",
  "isbn": "978-1234567890",
  "description": "A comprehensive guide to JavaScript",
  "price": 199000,
  "categoryId": "category-uuid",
  "authorName": "John Doe",
  "publisherId": "publisher-uuid",
  "format": "DIGITAL",
  "allowOnlineRead": true,
  "allowDownload": true
}
```

### Response 201

```json
{
  "message": "Book created successfully",
  "data": {
    "id": "new-book-uuid",
    "title": "New JavaScript Book",
    "slug": "new-javascript-book",
    "status": "DRAFT",
    "createdAt": "2026-08-14T10:00:00.000Z"
  }
}
```

---

## PATCH /books/:id (Business Only)

Update book details.

### Request

```http
PATCH /api/v1/books/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Updated Title",
  "price": 179000,
  "description": "Updated description..."
}
```

---

## POST /books/:id/publish (Business Only)

Publish a book.

### Request

```http
POST /api/v1/books/550e8400-e29b-41d4-a716-446655440000/publish
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "message": "Book published successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "PUBLISHED"
  }
}
```

---

## POST /books/:id/cover (Business Only)

Upload book cover image.

### Request

```http
POST /api/v1/books/550e8400-e29b-41d4-a716-446655440000/cover
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

cover: <file>
```

---

## POST /books/:id/file (Business Only)

Upload ebook PDF file.

### Request

```http
POST /api/v1/books/550e8400-e29b-41d4-a716-446655440000/file
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

file: <file>
```

### Response 200

```json
{
  "message": "File uploaded successfully"
}
```

---

## PATCH /books/:id/inventory (Business Only)

Update inventory.

### Request

```http
PATCH /api/v1/books/550e8400-e29b-41d4-a716-446655440000/inventory
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "stock": 100,
  "operation": "SET"  # SET, ADD, SUBTRACT
}
```

### Response 200

```json
{
  "data": {
    "bookId": "550e8400-e29b-41d4-a716-446655440000",
    "onHand": 100,
    "reserved": 5,
    "available": 95
  }
}
```
