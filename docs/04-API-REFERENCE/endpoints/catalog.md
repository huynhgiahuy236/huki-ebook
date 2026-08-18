# Catalog API

Commerce Service exposes catalog endpoints below the `/api/v1` prefix. Swagger is
available at `/api/docs` while the service is running.

## Public endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | Paginated flat category list |
| GET | `/categories/tree` | Active nested category tree |
| GET | `/categories/:id` | Category details |
| GET | `/authors` | Paginated author list |
| GET | `/authors/:id` | Author details |
| GET | `/publishers` | Paginated publisher list |
| GET | `/publishers/:id` | Publisher details |
| GET | `/catalog/search` | Ranked catalog full-text search |

### Category list query

`GET /api/v1/categories?page=1&limit=20&search=lap%20trinh&rootOnly=true&sortBy=sortOrder&order=ASC`

- `page`: integer from 1; default `1`.
- `limit`: integer from 1 to 100; default `20`.
- `search`: accent-insensitive name search.
- `parentId`: return direct children of a category.
- `rootOnly`: return root categories; cannot be combined with `parentId`.
- `includeInactive`: include inactive records; default `false`.
- `sortBy`: `name`, `sortOrder`, or `createdAt`.
- `order`: `ASC` or `DESC`.

### Catalog search query

`GET /api/v1/catalog/search?q=nguyen%20nhat&types=AUTHOR,PUBLISHER&page=1&limit=20`

`types` accepts `CATEGORY`, `AUTHOR`, and `PUBLISHER`. Results are ranked by exact
match, prefix match, PostgreSQL full-text rank, and trigram similarity.

## Administrator endpoints

The following operations require an Identity Service JWT whose role is
`PLATFORM_ADMIN`:

| Method | Endpoint |
|--------|----------|
| POST | `/categories`, `/authors`, `/publishers` |
| PATCH | `/categories/:id`, `/authors/:id`, `/publishers/:id` |
| DELETE | `/categories/:id`, `/authors/:id`, `/publishers/:id` |

Delete operations are soft deletes. A category cannot be deleted while it still
has child categories. Moving a category validates cycles and updates descendant
depth values in one transaction.

## Database migration

From `platform/`:

```bash
npm run migration:commerce:run
```

Set `DATABASE_SYNC=false`; the full-text and trigram indexes are migration-owned.
