import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bookModerationService } from './bookModerationService';
import { realtimeSyncBus } from './realtimeSyncBus';
import { adminNotificationService } from './adminNotificationService';

describe('BookModerationService - Post-moderation Flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. should return seeded reported books with valid statistics', async () => {
    const res = await bookModerationService.getReportedBooks();
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.stats.total).toBeGreaterThanOrEqual(res.items.length);
    expect(res.stats.pending + res.stats.blocked + res.stats.dismissed).toBe(res.stats.total);
  });

  it('2. should submit a new user report for a book and emit realtime BOOK_REPORTED event', async () => {
    const publishSpy = vi.spyOn(realtimeSyncBus, 'publish');

    const res = await bookModerationService.submitReport({
      bookId: 'test-book-999',
      bookTitle: 'Tác Phẩm Thử Nghiệm Báo Cáo',
      author: 'Tác Giả A',
      sellerId: 'biz-seller-999',
      sellerName: 'Gian Hàng Thử Nghiệm',
      reporterId: 'usr-reader-test',
      reporterName: 'Độc Giả Test',
      reason: 'COPYRIGHT',
      description: 'Phát hiện tác phẩm scan lậu và vi phạm bản quyền phát hành.',
    });

    expect(res.success).toBe(true);
    expect(res.reportId).toBeDefined();
    expect(publishSpy).toHaveBeenCalledWith(
      'BOOK_REPORTED',
      expect.objectContaining({
        bookId: 'test-book-999',
        reason: 'COPYRIGHT',
      }),
      expect.objectContaining({
        roles: ['ADMIN', 'ADMIN_CON'],
      })
    );

    // Verify it now exists in queue
    const queue = await bookModerationService.getReportedBooks({ searchQuery: 'Tác Phẩm Thử Nghiệm' });
    expect(queue.items.some((b) => b.bookId === 'test-book-999')).toBe(true);
  });

  it('3. should allow Admin to BLOCK a reported book and dispatch notification to Seller', async () => {
    const notifSpy = vi.spyOn(adminNotificationService, 'createNotification');
    const publishSpy = vi.spyOn(realtimeSyncBus, 'publish');

    const res = await bookModerationService.moderateBook({
      bookId: 'test-book-999',
      action: 'BLOCK',
      reasonText: 'Bản quyền & Sách lậu',
      note: 'Yêu cầu shop gỡ bỏ và giải trình hợp đồng xuất bản trong 24h.',
      notifySeller: true,
    });

    expect(res.success).toBe(true);
    expect(res.book.status).toBe('BLOCKED');
    expect(notifSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'POLICY',
        severity: 'CRITICAL',
        targetRole: 'SELLER',
        targetType: 'DIRECT',
        targetBusinessIds: ['biz-seller-999'],
      })
    );
    expect(publishSpy).toHaveBeenCalledWith(
      'BOOK_MODERATED',
      expect.objectContaining({
        bookId: 'test-book-999',
        action: 'BLOCK',
        status: 'BLOCKED',
      }),
      expect.anything()
    );
  });

  it('4. should allow Admin to DISMISS reports when book is verified valid', async () => {
    const res = await bookModerationService.moderateBook({
      bookId: 'test-book-999',
      action: 'DISMISS',
      note: 'Đã xác minh hợp đồng bản quyền hợp lệ.',
    });

    expect(res.success).toBe(true);
    expect(res.book.status).toBe('DISMISSED');
  });

  it('5. should allow Admin to UNBLOCK a book and notify seller upon resolution', async () => {
    const notifSpy = vi.spyOn(adminNotificationService, 'createNotification');

    const res = await bookModerationService.moderateBook({
      bookId: 'test-book-999',
      action: 'UNBLOCK',
      note: 'Khôi phục sau khi shop giải trình hợp lệ.',
      notifySeller: true,
    });

    expect(res.success).toBe(true);
    expect(res.book.actionTaken).toBe('UNBLOCK');
    expect(notifSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'POLICY',
        severity: 'INFO',
        targetRole: 'SELLER',
      })
    );
  });
});
