import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bookModerationService } from './bookModerationService';
import { realtimeSyncBus } from './realtimeSyncBus';
import { moderationApi } from '../api/moderationApi';

describe('BookModerationService - Post-moderation Flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. should return reported books with valid statistics', async () => {
    const res = await bookModerationService.getReportedBooks();
    expect(res.stats.total).toBeGreaterThanOrEqual(0);
    expect(res.stats.pending + res.stats.blocked + res.stats.dismissed).toBe(res.stats.total);
  });

  it('2. should submit a new user report for a book to backend API without fake client chime', async () => {
    const reportApiSpy = vi.spyOn(moderationApi, 'reportBook').mockResolvedValue({
      success: true,
      data: { id: 'rep-backend-1' },
    } as any);

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
      evidenceImages: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='],
    });

    expect(res.success).toBe(true);
    expect(res.reportId).toBe('rep-backend-1');
    expect(reportApiSpy).toHaveBeenCalledWith(
      'test-book-999',
      expect.objectContaining({
        reason: 'COPYRIGHT',
        evidenceImages: expect.any(Array),
      })
    );

    // Verify it now exists in queue
    const queue = await bookModerationService.getReportedBooks({ searchQuery: 'Tác Phẩm Thử Nghiệm' });
    expect(queue.items.some((b) => b.bookId === 'test-book-999')).toBe(true);
  });

  it('3. should allow Admin to BLOCK a reported book and dispatch notification to Seller', async () => {
    const modApiSpy = vi.spyOn(moderationApi, 'moderateBook').mockResolvedValue({ success: true, data: {} } as any);
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
    expect(modApiSpy).toHaveBeenCalledWith(
      'test-book-999',
      expect.objectContaining({
        action: 'BLOCK',
        notifySeller: true,
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
    vi.spyOn(moderationApi, 'moderateBook').mockResolvedValue({ success: true, data: {} } as any);
    const res = await bookModerationService.moderateBook({
      bookId: 'test-book-999',
      action: 'DISMISS',
      note: 'Đã xác minh hợp đồng bản quyền hợp lệ.',
    });

    expect(res.success).toBe(true);
    expect(res.book.status).toBe('DISMISSED');
  });

  it('5. should allow Admin to UNBLOCK a book and notify seller upon resolution', async () => {
    const modApiSpy = vi.spyOn(moderationApi, 'moderateBook').mockResolvedValue({ success: true, data: {} } as any);

    const res = await bookModerationService.moderateBook({
      bookId: 'test-book-999',
      action: 'UNBLOCK',
      note: 'Khôi phục sau khi shop giải trình hợp lệ.',
      notifySeller: true,
    });

    expect(res.success).toBe(true);
    expect(res.book.actionTaken).toBe('UNBLOCK');
    expect(modApiSpy).toHaveBeenCalledWith(
      'test-book-999',
      expect.objectContaining({
        action: 'UNBLOCK',
        notifySeller: true,
      })
    );
  });
});
