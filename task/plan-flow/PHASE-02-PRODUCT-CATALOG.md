# PHASE 2: PRODUCT CATALOG
## HUKI EBOOK - Book Management & DRM

---

## MỤC TIÊU

Hoàn thiện luồng tạo và quản lý sản phẩm với 3 định dạng: Physical, Ebook, và Hybrid.

---

## TASKS

### Task 15: Add Product Form - Physical/Ebook/Hybrid
**Priority:** P0 | **Effort:** 4 days | **Owner:** Frontend + Backend

**Mô tả:**
Implement form đăng sách với 3 loại sản phẩm.

**Deliverables:**
```
✓ Product Type Selection:
  - Physical (Sách giấy)
  - Ebook (Sách số)
  - Hybrid (Combo sách giấy + ebook)
  
✓ Common Fields:
  - Title (required, 1-200 chars)
  - Subtitle (optional)
  - Author (required, 1-100 chars)
  - Publisher (required)
  - Publication date
  - Language (Vietnamese/English/Other)
  - Category (hierarchical dropdown)
  - Tags (multi-select)
  - Description (rich text, max 5000 chars)
  - Cover image (required, 1:1.5 ratio)
  - Gallery images (optional, max 10)
  
✓ Physical-specific Fields:
  - ISBN (required if physical)
  - Page count
  - Weight (grams)
  - Dimensions (L x W x H)
  - Binding type (Paperback/Hardcover)
  - Inventory (initial stock)
  - Low stock threshold
  
✓ Ebook-specific Fields:
  - File upload (PDF/EPUB, max 100MB)
  - Sample file (first 10%, optional)
  - DRM enabled (checkbox)
  - Watermark enabled (checkbox)
  
✓ Hybrid-specific Fields:
  - Physical fields
  - Ebook fields
  - Combo price (must be < sum of individual)
  
✓ Pricing:
  - Base price (required)
  - Sale price (optional, with date range)
  - Discount percentage display
  
✓ Validation:
  - ISBN format validation
  - ISBN uniqueness check (async)
  - Price must be > 0
  - File size/type validation
```

**Files cần create:**
- `web/src/ui/pages/seller/AddProductPage.tsx`
- `web/src/ui/components/product/ProductTypeSelector.tsx`
- `web/src/ui/components/product/PhysicalForm.tsx`
- `web/src/ui/components/product/EbookForm.tsx`
- `web/src/ui/components/product/HybridForm.tsx`
- `web/src/ui/components/product/ImageUploader.tsx`
- `web/src/services/productApi.ts`
- `business-service/src/services/CatalogService.ts`
- `business-service/src/routes/products.ts`

**API Endpoints:**
```
POST   /api/products
GET    /api/products/:id
PUT    /api/products/:id
DELETE /api/products/:id
GET    /api/products/isbn/:isbn (check uniqueness)
POST   /api/products/:id/upload-file
POST   /api/products/:id/upload-cover
```

---

### Task 16: ISBN Validation & Duplicate Check
**Priority:** P1 | **Effort:** 1 day | **Owner:** Backend

**Mô tả:**
Implement ISBN validation và duplicate detection.

**Deliverables:**
```
✓ ISBN Validation:
  - ISBN-10 format: X-XXXX-XXXX-X
  - ISBN-13 format: XXX-X-XXXX-XXXX-X
  - Checksum validation
  
✓ ISBN Duplicate Check:
  - Real-time API call on blur
  - Display error message if exists
  - Show link to existing product
  
✓ ISBN Sources:
  - ISBN registry API (mock for now)
  - Manual entry allowed
  
✓ Edge Cases:
  - ISBN-10 converted to ISBN-13
  - Hyphens stripped for comparison
  - Case-insensitive
```

**Files cần create:**
- `business-service/src/utils/isbnValidator.ts`
- `business-service/src/services/ISBNService.ts`

---

### Task 17: Ebook File Upload & Storage
**Priority:** P0 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Implement ebook file upload và storage system.

**Deliverables:**
```
✓ File Upload:
  - Supported formats: PDF, EPUB
  - Max size: 100MB
  - Chunked upload for large files
  - Progress indicator
  - Resume on failure
  
✓ Storage:
  - Upload to S3/MinIO
  - Private bucket (not public)
  - File path: /ebooks/{seller_id}/{product_id}/{filename}
  - Metadata storage in database
  
✓ Sample File:
  - Extract first 10% of content
  - Upload as separate file
  - Public access for preview
  
✓ Processing:
  - Virus scan (optional)
  - File integrity check (hash)
  - Format conversion if needed
  
✓ Backup:
  - Cross-region replication
  - Versioning enabled
```

**Files cần create:**
- `business-service/src/services/FileStorageService.ts`
- `business-service/src/services/EbookProcessor.ts`
- `business-service/src/routes/ebook-upload.ts`

---

### Task 18: Sample Preview 10%
**Priority:** P1 | **Effort:** 1 day | **Owner:** Backend

**Mô tả:**
Implement sample preview - first 10% free.

**Deliverables:**
```
✓ Sample Extraction:
  - PDF: Extract first N pages (10% of total)
  - EPUB: Extract first 10% of chapters
  
✓ Sample Upload:
  - Auto-generate from full file
  - Or manual upload sample file
  - Stored separately
  
✓ Sample Access:
  - Public endpoint (no auth required)
  - Watermark applied
  - No DRM for samples
  
✓ UI:
  - "Xem thử" button on product page
  - Opens in preview modal
  - Page navigation
```

**Files cần create:**
- `business-service/src/services/SampleGenerator.ts`
- `business-service/src/routes/sample-preview.ts`
- `web/src/ui/components/product/SamplePreviewModal.tsx`

---

### Task 19: DRM Protection Implementation
**Priority:** P0 | **Effort:** 3 days | **Owner:** Backend

**Mô tả:**
Implement DRM protection cho ebook files.

**Deliverables:**
```
✓ DRM Types:
  - Dynamic Watermark (user info overlay)
  - Chunked Delivery (stream by chapters)
  - License-based Access (token verification)
  
✓ Implementation:
  - Watermark injection on stream
  - User ID + Order ID embedded
  - Timestamp embedded
  
✓ API:
  GET /api/ebooks/:id/chapter/:chapterNum
  - Verify license
  - Apply watermark
  - Return chunk
  
✓ License Storage:
  - User purchases table
  - License validity check
  - Device limit (optional)
  
✓ Security:
  - No direct file URLs
  - Token expiration
  - IP binding (optional)
```

**Files cần create:**
- `business-service/src/services/DRMService.ts`
- `business-service/src/services/WatermarkService.ts`
- `business-service/src/services/LicenseService.ts`
- `business-service/src/middleware/drmGuard.ts`
- `business-service/src/routes/ebook-stream.ts`

**Database Schema:**
```sql
CREATE TABLE ebook_licenses (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  order_id UUID REFERENCES orders(id),
  device_id VARCHAR(255),
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE drm_audit (
  id UUID PRIMARY KEY,
  license_id UUID,
  user_id UUID,
  action VARCHAR(50),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### Task 20: Backup Strategy for Ebook Files
**Priority:** P1 | **Effort:** 1 day | **Owner:** DevOps

**Mô tả:**
Setup backup strategy cho ebook storage.

**Deliverables:**
```
✓ Backup Strategy:
  - Cross-region replication
  - Versioning enabled (keep 10 versions)
  - Daily incremental backup
  - Weekly full backup
  
✓ Recovery:
  - Point-in-time recovery
  - RTO: 4 hours
  - RPO: 24 hours
  
✓ Access Control:
  - IAM policies
  - No public access
  - Signed URLs for authorized access
```

---

### Task 21: SEO Infrastructure - DONE ✅
**Priority:** P0 | **Effort:** 2 days | **Owner:** Frontend
**Completion Date:** 2026-09-17

**Mô tả:**
Implement SEO infrastructure cho book discovery.

**Deliverables:**
```
✓ JSON-LD Schema:
  - Book schema (schema.org/Book)
  - Store schema (schema.org/Store)
  - BreadcrumbList schema
  - FAQPage schema
  - WebSite schema (Sitelinks Search Box)
  - Organization schema

✓ Sitemap:
  - Static pages
  - Dynamic pages (books, stores, categories)
  - Priority & changeFrequency
  - Auto-refresh (ISR)

✓ Robots.txt:
  - Allow/block rules
  - Sitemap reference
  - Bad bot blocking

✓ Open Graph:
  - Book metadata (author, ISBN, rating)
  - Store metadata
  - Category metadata
  - Twitter Cards

✓ SEO Components:
  - SEOTags.tsx (client-side)
  - head-metadata.ts (server-side)
  - schema-generator.ts (JSON-LD)
  - sitemap.ts (dynamic)
  - useSeo.ts (hooks)
```

**Files created:**
```
web/src/lib/seo/
├── schema-generator.ts      # JSON-LD schema generators
├── head-metadata.ts        # Metadata generators
├── types.ts               # SEO types
├── sitemap.ts             # Sitemap utilities
└── index.ts               # Exports

web/src/components/seo/
└── SEOTags.tsx            # Client-side SEO components

web/src/hooks/
└── useSeo.ts              # SEO hooks

web/src/app/
├── sitemap.ts             # Next.js sitemap
└── robots.ts             # Robots.txt
```

---

## DEPENDENCIES

- Task 1 (Infrastructure) → Task 17, 20
- Task 8 (Seller Wizard) → Task 15 (seller must exist)
- Task 15 (Add Product) → Task 16, 17, 18, 19

---

## SUCCESS CRITERIA

- [x] Seller có thể tạo Physical book với inventory ✅ DONE
- [x] Seller có thể tạo Ebook với file upload ✅ DONE
- [x] Seller có thể tạo Hybrid combo ✅ DONE
- [x] ISBN duplicate check hoạt động ✅ DONE
- [x] Sample preview 10% có thể xem ✅ DONE
- [x] DRM watermark applied khi stream ebook ✅ DONE
- [x] Ebook files backed up properly ✅ DONE
- [x] SEO Infrastructure (JSON-LD, Sitemap, Robots.txt) ✅ DONE

---

## TEST CASES

```
TC_CAT_01: Tạo Physical book với inventory
TC_CAT_02: Tạo Ebook với DRM
TC_CAT_03: Tạo Hybrid combo
TC_CAT_04: ISBN duplicate detection
TC_CAT_05: Sample preview 10%
TC_CAT_06: File upload progress indicator
TC_CAT_07: DRM license check on stream
TC_CAT_08: Watermark visible on streamed ebook
```

---

## NOTES

- Ebook file nên được encrypt at rest
- DRM nên có fallback nếu watermark bị strip
- Consider PDF password protection as additional layer
- Hybrid combo price nên có validation không thấp hơn physical price
- Product approval workflow (optional - auto-approve for now)
