# 📚 Digital Reading Feature

Tài liệu về feature đọc sách điện tử.

## 📋 Mục lục

1. [Overview](#overview)
2. [User Library](#user-library)
3. [Ebook Reader](#ebook-reader)
4. [Reading Progress](#reading-progress)
5. [File Protection](#file-protection)
6. [API Endpoints](#api-endpoints)

## Overview

Digital Reading cho phép user:
- Xem kho sách đã sở hữu
- Đọc ebook online
- Tải ebook về
- Theo dõi tiến độ đọc
- Đọc offline (mobile)

## User Library

### Library Entry Flow

```
User mua Digital Book
        │
        ▼
Payment SUCCESS ────► Event: PAYMENT_SUCCEEDED
                              │
                              ▼
                    Order Service update status
                              │
                              ▼
                    Event: BOOK_ACCESS_GRANTED
                              │
                              ▼
                    Library Service tạo LibraryEntry
                              │
                              ▼
                    Book xuất hiện trong User Library
```

### Library Entry Model

```typescript
interface LibraryEntry {
  id: string;
  userId: string;
  bookId: string;
  sourceType: 'PURCHASED' | 'FREE' | 'ADMIN_GRANTED';
  sourceId?: string;        // orderId or promotionId
  accessStatus: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  grantedAt: Date;
  revokedAt?: Date;
  expiresAt?: Date;         // For time-limited access
  createdAt: Date;
  updatedAt: Date;
}
```

### Get User Library

```http
GET /api/v1/library
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "entry-uuid",
      "book": {
        "id": "book-uuid",
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "coverUrl": "https://example.com/cover.jpg"
      },
      "accessStatus": "ACTIVE",
      "grantedAt": "2026-08-01T00:00:00.000Z",
      "progress": {
        "currentPage": 125,
        "progressPercent": 52,
        "status": "READING",
        "lastReadAt": "2026-08-14T10:30:00.000Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

## Ebook Reader

### Reading Flow

```
User mở sách từ Library
        │
        ▼
Backend kiểm tra:
1. User đã đăng nhập?
2. User có BookAccess?
3. Book có quyền online_read?
        │
        ▼
Cấp Signed URL với TTL ngắn
        │
        ▼
Trả về reading URL cho frontend
        │
        ▼
Frontend hiển thị PDF reader
```

### Signed URL Strategy

```typescript
// R2 signed URL generation
async function getReadingUrl(bookId: string, userId: string): Promise<string> {
  // 1. Verify user has access
  const hasAccess = await libraryService.verifyAccess(userId, bookId);
  if (!hasAccess) {
    throw new ForbiddenException('Access denied');
  }

  // 2. Get PDF key from book
  const book = await bookService.findById(bookId);
  if (!book.digitalDetails.sourcePdfKey) {
    throw new NotFoundException('Digital file not found');
  }

  // 3. Generate signed URL with short TTL (15 minutes)
  const signedUrl = await r2Client.getSignedUrl({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: book.digitalDetails.sourcePdfKey,
    Expires: 15 * 60, // 15 minutes
  });

  return signedUrl;
}
```

### Reader API

```http
GET /api/v1/library/:bookId/read
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "data": {
    "bookId": "book-uuid",
    "title": "Clean Code",
    "readingUrl": "https://signed-url...",
    "expiresAt": "2026-08-14T12:15:00.000Z",
    "pdf": {
      "totalPages": 431,
      "encrypted": false
    },
    "progress": {
      "currentPage": 125,
      "progressPercent": 29,
      "status": "READING"
    }
  }
}
```

## Reading Progress

### Progress Model

```typescript
interface ReadingProgress {
  id: string;
  userId: string;
  bookId: string;
  currentPage: number;
  totalPages: number;
  progressPercent: number;
  status: 'NOT_STARTED' | 'READING' | 'COMPLETED';
  startedAt?: Date;
  lastReadAt: Date;
  completedAt?: Date;
  updatedAt: Date;
}
```

### Update Progress Flow

```typescript
// POST /api/v1/library/:bookId/progress
interface UpdateProgressDto {
  currentPage: number;
  totalPages?: number;
}

// Service logic
async updateProgress(userId: string, bookId: string, dto: UpdateProgressDto) {
  const book = await this.bookRepository.findById(bookId);
  
  const progressPercent = Math.round((dto.currentPage / book.totalPages) * 100);
  
  let status: 'NOT_STARTED' | 'READING' | 'COMPLETED' = 'READING';
  if (progressPercent === 100) {
    status = 'COMPLETED';
  } else if (dto.currentPage === 1) {
    status = 'NOT_STARTED';
  }

  // Upsert progress
  await this.progressRepository.upsert({
    userId,
    bookId,
    currentPage: dto.currentPage,
    totalPages: dto.totalPages || book.totalPages,
    progressPercent,
    status,
    lastReadAt: new Date(),
    ...(status === 'COMPLETED' && { completedAt: new Date() }),
  });

  // Publish event
  await this.eventBus.publish(new ReadingProgressUpdatedEvent({
    userId,
    bookId,
    currentPage: dto.currentPage,
    progressPercent,
  }));
}
```

### Reading Progress API

```http
PATCH /api/v1/library/:bookId/progress
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPage": 150,
  "totalPages": 431
}
```

**Response:**
```json
{
  "data": {
    "currentPage": 150,
    "totalPages": 431,
    "progressPercent": 35,
    "status": "READING",
    "lastReadAt": "2026-08-14T10:30:00.000Z"
  }
}
```

## File Protection

### Protection Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    PROTECTION LAYERS                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Authentication Layer                                   │
│     - User must be logged in                               │
│     - Verify BookAccess exists                            │
│                                                             │
│  2. Authorization Layer                                    │
│     - Check access status = ACTIVE                        │
│     - Verify not expired                                   │
│     - Check digital_enabled                                │
│                                                             │
│  3. URL Protection                                         │
│     - Signed URL with short TTL (15 min)                  │
│     - Cannot be shared                                     │
│     - IP binding (optional)                                │
│                                                             │
│  4. Content Protection                                     │
│     - Original PDF never exposed                           │
│     - Watermark rendering                                   │
│     - Disable right-click/print (frontend)                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Watermark Strategy

```typescript
// Watermark configuration
interface WatermarkConfig {
  text: string;        // User email or ID
  position: 'diagonal' | 'corner';
  opacity: number;     // 0.1 - 0.3
  fontSize: number;
  color: string;      // Light gray
}

// Apply watermark on render (frontend)
function applyWatermark(ctx: CanvasRenderingContext2D, config: WatermarkConfig) {
  ctx.save();
  ctx.globalAlpha = config.opacity;
  ctx.font = `${config.fontSize}px Arial`;
  ctx.fillStyle = config.color;
  ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
  ctx.rotate(-Math.PI / 6); // Diagonal
  ctx.fillText(config.text, 0, 0);
  ctx.restore();
}
```

### Prevent Download

```typescript
// Backend: Don't expose direct R2 URL
// Frontend: PDF.js with disabled download

// pdfjs worker configuration
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// Disable text layer selection (prevents copy)
// viewer.css
.pdfViewer.enablePermission = true;
.textLayer ::selection {
  background: transparent;
}

// Disable print
@media print {
  .pdf-viewer {
    display: none;
  }
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/library | Get user's library |
| GET | /api/v1/library/:bookId | Get library entry |
| GET | /api/v1/library/:bookId/read | Get reading URL |
| PATCH | /api/v1/library/:bookId/progress | Update reading progress |
| DELETE | /api/v1/library/:bookId | Remove from library |

## Mobile Considerations

### Offline Reading

```dart
// Flutter: Download for offline
class EbookDownloadService {
  Future<void> downloadForOffline(String bookId) async {
    // 1. Get signed URL
    final readingData = await api.getReadingUrl(bookId);
    
    // 2. Download PDF to local storage
    final file = await Dio().download(
      readingData.readingUrl,
      _getLocalPath(bookId),
      onProgress: (received, total) {
        // Update download progress
      },
    );
    
    // 3. Save metadata to Hive
    await hive.box('offline_books').put(bookId, {
      'localPath': file.path,
      'downloadedAt': DateTime.now(),
      'totalPages': readingData.totalPages,
    });
  }
  
  Future<EbookReaderData?> getOfflineBook(String bookId) async {
    final localData = hive.box('offline_books').get(bookId);
    if (localData != null) {
      return EbookReaderData(
        localPath: localData['localPath'],
        totalPages: localData['totalPages'],
      );
    }
    return null;
  }
}
```

### Sync Progress

```dart
// Sync progress when online
class ProgressSyncService {
  Future<void> syncProgress(String bookId, ReadingProgress progress) async {
    try {
      await api.updateProgress(bookId, progress);
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionError) {
        // Save to local queue for later sync
        await _queueProgressUpdate(bookId, progress);
      }
    }
  }
  
  Future<void> processQueue() async {
    final queue = await _getQueuedUpdates();
    for (final item in queue) {
      try {
        await api.updateProgress(item.bookId, item.progress);
        await _removeFromQueue(item);
      } catch (e) {
        // Will retry next time
      }
    }
  }
}
```
