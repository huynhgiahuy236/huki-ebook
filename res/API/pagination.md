# Pagination Response

## Standard Pagination

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number (1-indexed) |
| limit | number | 20 | Items per page (max: 100) |

## Example: Paginated Books

**Request:**
```
GET /api/v1/books?page=2&limit=10
```

**Response:**
```json
{
  "data": [
    { "id": "uuid1", "title": "Book 1", ... },
    { "id": "uuid2", "title": "Book 2", ... },
    ...
  ],
  "pagination": {
    "page": 2,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

## Empty Response

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

## Sorting

Add `sort` and `order` parameters:

| Parameter | Values | Default |
|----------|--------|---------|
| sort | field name | createdAt |
| order | asc, desc | desc |

**Example:**
```
GET /api/v1/books?sort=price&order=asc
```

## Filtering

Filter parameters are specific to each endpoint:

```
GET /api/v1/books?categoryId=uuid&authorId=uuid&minPrice=50000&maxPrice=200000
```
