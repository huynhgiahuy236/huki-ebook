# PHASE 6: EBOOK & DRM
## HUKI EBOOK - Digital Reading Experience

---

## MỤC TIÊU

Hoàn thiện luồng ebook từ unlock sau thanh toán đến web reader với DRM protection.

---

## TASKS

### Task 48: Ebook Instant Unlock on Payment
**Priority:** P0 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Implement automatic ebook unlock after payment success.

**Deliverables:**
```
✓ Unlock Trigger:
  - Payment webhook received
  - Check if order contains ebook items
  - Grant license to user
  
✓ License Grant:
  ```
  1. Create ebook_license record
  2. Send notification to user
  3. Add to user's library
  4. Send email with link
  ```
  
✓ Idempotency:
  - Check if license already granted
  - Skip if already unlocked
  
✓ Fallback:
  - If unlock fails, mark for retry
  - Admin can manually trigger unlock
  
✓ API:
  POST /api/ebooks/unlock
  {
    orderId: "uuid",
    userId: "uuid"
  }
```

**Files cần create:**
- `business-service/src/services/EbookUnlockService.ts`
- `business-service/src/services/LicenseService.ts`
- `business-service/src/routes/ebooks.ts`

---

### Task 49: DRM License Mechanism
**Priority:** P0 | **Effort:** 3 days | **Owner:** Backend

**Mô tả:**
Implement DRM licensing system.

**Deliverables:**
```
✓ License Types:
  - Permanent (lifetime)
  - Rental (time-limited)
  - Preview (first 10%)
  
✓ License Storage:
  {
    licenseId: UUID,
    userId: UUID,
    productId: UUID,
    orderId: UUID,
    type: "PERMANENT" | "RENTAL",
    grantedAt: timestamp,
    expiresAt: timestamp | NULL,
    isActive: boolean
  }
  
✓ Verification:
  - Check license on every ebook access
  - Verify user owns the product
  - Check expiration for rentals
  
✓ Device Limit (optional):
  - Max 5 devices per user
  - Device registration required
  
✓ Revocation:
  - On refund: revoke license
  - On expiration: auto-disable
```

**Files cần create:**
- `business-service/src/services/DRMLicenseService.ts`
- `business-service/src/middleware/drmGuard.ts`
- `business-service/src/services/DeviceManager.ts`

**Database Schema:**
```sql
CREATE TABLE ebook_licenses (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  order_id UUID REFERENCES orders(id),
  license_type VARCHAR(20), -- PERMANENT, RENTAL
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  revoked_at TIMESTAMP,
  revocation_reason VARCHAR(255)
);

CREATE TABLE license_devices (
  id UUID PRIMARY KEY,
  license_id UUID REFERENCES ebook_licenses(id),
  device_id VARCHAR(255),
  device_name VARCHAR(100),
  registered_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_licenses_user_product ON ebook_licenses(user_id, product_id);
```

---

### Task 50: License Revocation on Refund
**Priority:** P1 | **Effort:** 1 day | **Owner:** Backend

**Mô tả:**
Implement automatic license revocation on refund.

**Deliverables:**
```
✓ Revocation Flow:
  1. Refund initiated
  2. Find all licenses for order
  3. Set is_active = false
  4. Set revoked_at = now()
  5. Log revocation reason
  6. Notify user (email)
  
✓ Refund Reasons:
  - Customer cancel
  - Dispute won
  - Admin override
  
✓ Effect:
  - User cannot access ebook anymore
  - Reader returns "License revoked"
  - Webhook to invalidate active sessions
```

---

### Task 51: Web DRM Reader UI
**Priority:** P0 | **Effort:** 4 days | **Owner:** Frontend

**Mô tả:**
Implement web-based ebook reader.

**Deliverables:**
```
✓ Reader Features:
  - PDF viewer (react-pdf)
  - EPUB viewer (epub.js)
  - Page navigation
  - Table of contents
  - Search within book
  - Bookmarks
  
✓ DRM Protection:
  - Watermark overlay on every page
  - Disable text selection (optional)
  - Disable right-click (optional)
  - Disable copy/paste
  
✓ UI Components:
  - Reader container
  - Navigation bar (top)
  - Page controls (bottom)
  - Settings panel (sidebar)
  - TOC panel
  
✓ Performance:
  - Lazy load pages
  - Progressive loading
  - Cache pages in memory
  
✓ Mobile Responsive:
  - Touch navigation
  - Swipe to turn pages
  - Landscape/portrait modes
```

**Files cần create:**
- `web/src/ui/pages/reader/EbookReaderPage.tsx`
- `web/src/ui/components/reader/PDFViewer.tsx`
- `web/src/ui/components/reader/EPUBViewer.tsx`
- `web/src/ui/components/reader/ReaderToolbar.tsx`
- `web/src/ui/components/reader/ReaderSettings.tsx`
- `web/src/ui/components/reader/TableOfContents.tsx`
- `web/src/ui/components/reader/WatermarkOverlay.tsx`

**Libraries:**
```bash
npm install react-pdf epubjs react-reader
```

---

### Task 52: Font/Size Customization
**Priority:** P1 | **Effort:** 1 day | **Owner:** Frontend

**Mô tả:**
Implement reader customization settings.

**Deliverables:**
```
✓ Settings:
  - Font family (5-6 options)
  - Font size (10 levels: 12px - 24px)
  - Line height (3 options)
  - Margin (3 options)
  - Theme (light/sepia/dark)
  
✓ Persistence:
  - Save to user preferences
  - Sync across devices
  
✓ Preview:
  - Live preview on change
  - Apply immediately
```

**Files cần create:**
- `web/src/ui/components/reader/ReaderSettingsPanel.tsx`
- `web/src/hooks/useReaderSettings.ts`

---

### Task 53: Bookmark & Progress Sync
**Priority:** P1 | **Effort:** 2 days | **Owner:** Backend + Frontend

**Mô tả:**
Implement bookmark và reading progress synchronization.

**Deliverables:**
```
✓ Bookmarks:
  - Add bookmark at current position
  - List all bookmarks
  - Delete bookmark
  - Jump to bookmark
  - Bookmark includes: page, highlight text
  
✓ Reading Progress:
  - Auto-save current position
  - Sync on page turn
  - Percentage complete
  - Last read timestamp
  
✓ API:
  POST /api/reader/bookmarks
  GET  /api/reader/bookmarks/:productId
  DELETE /api/reader/bookmarks/:id
  
  PUT /api/reader/progress
  {
    productId: "uuid",
    currentPage: 42,
    percentage: 35
  }
```

**Files cần create:**
- `business-service/src/routes/reader.ts`
- `business-service/src/services/BookmarkService.ts`
- `business-service/src/services/ProgressService.ts`
- `web/src/hooks/useBookmarks.ts`
- `web/src/hooks/useReadingProgress.ts`

**Database Schema:**
```sql
CREATE TABLE reader_bookmarks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  page_number INT,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reading_progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  current_page INT,
  percentage DECIMAL(5,2),
  last_read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
```

---

### Task 54: Anti-DevTools Protection
**Priority:** P1 | **Effort:** 2 days | **Owner:** Frontend

**Mô tả:**
Implement anti-tampering measures for reader.

**Deliverables:**
```
✓ Detection:
  - DevTools open detection
  - Console manipulation detection
  - Proxy/Fiddler detection
  - Screenshot prevention (partial)
  
✓ Responses:
  - Show warning on DevTools open
  - Temporarily disable reader
  - Log attempt
  
✓ Limitations:
  - Cannot 100% prevent screenshots
  - Focus on deterrence
  
✓ Implementation:
  - debugger; statement
  - ResizeObserver for DevTools
  - Canvas fingerprint detection
```

**Files cần create:**
- `web/src/utils/antiTamper.ts`
- `web/src/components/reader/DRMGuard.tsx`

---

### Task 55: Forensic Watermark Overlay
**Priority:** P0 | **Effort:** 3 days | **Owner:** Backend + Frontend

**Mô tả:**
Implement forensic watermark overlay.

**Deliverables:**
```
✓ Watermark Content:
  - User ID
  - Order ID
  - Timestamp
  - Email (partial)
  
✓ Visual Style:
  - Semi-transparent (10-20% opacity)
  - Diagonal placement
  - Small font size
  - Repeated across page
  
✓ Implementation:
  - Backend: Generate watermark data
  - Frontend: Render overlay on canvas
  - Per-page unique watermark
  
✓ Anti-removal:
  - Split into multiple elements
  - CSS opacity + transforms
  - Regenerate on zoom
```

**Files cần create:**
- `business-service/src/services/WatermarkService.ts`
- `web/src/components/reader/WatermarkOverlay.tsx`
- `web/src/utils/watermarkGenerator.ts`

---

### Task 56: Micro-Jittering Anti-Screenshot
**Priority:** P1 | **Effort:** 1 day | **Owner:** Frontend

**Mô tả:**
Implement micro-jittering to disrupt screenshots.

**Deliverables:**
```
✓ Jitter Effect:
  - Subtle random offset on watermark
  - Change every 100ms
  - Small enough to not be noticeable
  - Large enough to corrupt screenshot
  
✓ Implementation:
  - CSS transform: translate()
  - Random values: ±2px X, ±2px Y
  - requestAnimationFrame loop
  
✓ Performance:
  - Use transform (GPU accelerated)
  - Minimal repaints
  - Battery efficient
```

---

### Task 57: Watermark Forensic Tracking
**Priority:** P2 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Implement watermark extraction and forensic tracking.

**Deliverables:**
```
✓ Watermark Extraction:
  - When piracy detected
  - Extract watermark from screenshot
  - Decode user/order info
  
✓ Database:
  - Store watermark templates
  - Track watermark patterns
  
✓ Investigation Flow:
  1. Receive reported piracy link
  2. Download image
  3. Run OCR/text extraction
  4. Decode watermark
  5. Identify user
  6. Create evidence record
```

---

## DEPENDENCIES

- Task 19 (DRM Protection) → Task 48 (Unlock)
- Task 48 (Unlock) → Task 49 (License)
- Task 49 (License) → Task 50 (Revocation)
- Task 55 (Watermark) → Task 56 (Jittering)
- Task 51 (Reader UI) → Task 52-54 (Features)

---

## SUCCESS CRITERIA

- [ ] Ebook unlocks immediately after payment
- [ ] License verification works on every access
- [ ] License revoked on refund
- [ ] Web reader loads PDF/EPUB
- [ ] Reader settings persist
- [ ] Bookmarks sync across devices
- [ ] Watermark visible on every page
- [ ] Anti-DevTools detection works

---

## TEST CASES

```
TC_EBOOK_01: Ebook unlock sau PayOS thành công
TC_EBOOK_02: Direct redirect to reader
TC_EBOOK_03: License revoked khi refund
TC_READER_01: Reader UI responsive
TC_READER_02: Font/size customization works
TC_READER_03: Bookmark add/remove/sync
TC_READER_04: Progress auto-save
TC_READER_05: Watermark visible on screenshots
```

---

## NOTES

- DRM cannot be 100% foolproof - focus on deterrence
- Consider watermarking the file itself, not just display
- Reader must work offline (cached pages)
- EPUB support may require server-side conversion
- Legal disclaimer recommended
- Consider adding download limit
