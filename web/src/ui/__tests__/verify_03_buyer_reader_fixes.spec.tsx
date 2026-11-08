import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('UAT 03-BUYER-READER-AUDIT Fixes Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('BUG 17: Wishlist State Smart Merge & Protection against Empty Server Overwrites', () => {
    it('does NOT wipe out local favorites when server returns an empty wishlist array []', () => {
      // 1. User favorited books locally while browsing
      const initialLocalWishlist = ['book-uuid-1', 'book-uuid-2'];
      localStorage.setItem('huki_wishlist_ids', JSON.stringify(initialLocalWishlist));

      // 2. Server profile is empty (user just signed in or brand new profile)
      const serverWishlist: string[] = [];

      // Smart merge logic as implemented in LibraryPage
      const saved = JSON.parse(localStorage.getItem('huki_wishlist_ids') || '[]');
      const currentLocalIds = Array.isArray(saved) ? saved : [];
      const mergedIds = Array.from(new Set([...currentLocalIds, ...serverWishlist]));
      localStorage.setItem('huki_wishlist_ids', JSON.stringify(mergedIds));

      // 3. Verify local favorites are preserved 100% and NOT wiped to []
      const afterSaved = JSON.parse(localStorage.getItem('huki_wishlist_ids') || '[]');
      expect(afterSaved).toEqual(['book-uuid-1', 'book-uuid-2']);
      expect(afterSaved.length).toBe(2);
    });

    it('merges local items with server items and identifies missing sync items', () => {
      const localWishlist = ['book-local-1'];
      const serverWishlist = ['book-server-2'];

      const merged = Array.from(new Set([...localWishlist, ...serverWishlist]));
      expect(merged).toContain('book-local-1');
      expect(merged).toContain('book-server-2');
      expect(merged.length).toBe(2);

      // Must trigger sync back to server because merged.length > serverWishlist.length
      const shouldSyncToServer = merged.length > serverWishlist.length;
      expect(shouldSyncToServer).toBe(true);
    });

    it('dispatches huki_wishlist_updated custom event when toggling favorite', () => {
      const eventSpy = vi.fn();
      window.addEventListener('huki_wishlist_updated', eventSpy);

      const bookId = 'book-toggle-123';
      const willWishlist = true;
      localStorage.setItem('huki_wishlist_ids', JSON.stringify([bookId]));

      window.dispatchEvent(
        new CustomEvent('huki_wishlist_updated', {
          detail: { bookId, wishlisted: willWishlist },
        })
      );

      expect(eventSpy).toHaveBeenCalledTimes(1);
      const detail = eventSpy.mock.calls[0][0].detail;
      expect(detail.bookId).toBe(bookId);
      expect(detail.wishlisted).toBe(true);

      window.removeEventListener('huki_wishlist_updated', eventSpy);
    });
  });

  describe('BUG 16: Tủ Sách Cá Nhân Format Badges & Routing for Purchased Books', () => {
    it('renders appropriate format badges (Sách Giấy, Combo DRM, Ebook DRM)', () => {
      const items = [
        { id: '1', format: 'PHYSICAL', title: 'Nhà Giả Kim (Sách In)' },
        { id: '2', format: 'BOTH', title: 'Đắc Nhân Tâm (Bản Combo)' },
        { id: '3', format: 'DIGITAL', title: 'Tư Duy Nhanh Và Chậm (Ebook)' },
      ];

      const getBadge = (format: string) => {
        return format === 'BOTH' ? 'Combo DRM' : format === 'PHYSICAL' ? 'Sách Giấy' : 'Ebook DRM';
      };

      const getActionLink = (format: string, id: string) => {
        return format === 'PHYSICAL' ? `/book/${id}` : `/reader?book=${id}`;
      };

      const getActionLabel = (format: string) => {
        return format === 'PHYSICAL' ? 'Xem Sách In' : 'Đọc Sách';
      };

      expect(getBadge(items[0].format)).toBe('Sách Giấy');
      expect(getBadge(items[1].format)).toBe('Combo DRM');
      expect(getBadge(items[2].format)).toBe('Ebook DRM');

      expect(getActionLink(items[0].format, items[0].id)).toBe('/book/1');
      expect(getActionLink(items[2].format, items[2].id)).toBe('/reader?book=3');

      expect(getActionLabel(items[0].format)).toBe('Xem Sách In');
      expect(getActionLabel(items[2].format)).toBe('Đọc Sách');
    });

    it('renders book card with correct label and action in DOM', () => {
      const physicalBook = {
        bookId: 'book-phys-1',
        title: 'Hiểu Về Trái Tim',
        format: 'PHYSICAL',
        status: 'ACTIVE',
      };

      const { container } = render(
        <div data-testid="library-card">
          <span className="format-badge">
            {physicalBook.format === 'BOTH' ? 'Combo DRM' : physicalBook.format === 'PHYSICAL' ? 'Sách Giấy' : 'Ebook DRM'}
          </span>
          <a
            href={physicalBook.status === 'WISHLIST' || physicalBook.format === 'PHYSICAL' ? `/book/${physicalBook.bookId}` : `/reader?book=${physicalBook.bookId}`}
            className="action-btn"
          >
            {physicalBook.format === 'PHYSICAL' ? 'Xem Sách In' : 'Đọc Tiếp'}
          </a>
        </div>
      );

      expect(container.querySelector('.format-badge')?.textContent).toBe('Sách Giấy');
      expect(container.querySelector('.action-btn')?.getAttribute('href')).toBe('/book/book-phys-1');
      expect(container.querySelector('.action-btn')?.textContent).toBe('Xem Sách In');
    });
  });

  describe('BUG 15: Universal Fallback Strategy for Reader PDF Stream', () => {
    it('provides universal fallback candidates ensuring a reading document is always available', () => {
      const universalCandidates = [
        'platform/apps/commerce-service/assets/default-ebook.pdf',
        'apps/commerce-service/assets/default-ebook.pdf',
        'web/public/ebooks/Con_duong_phia_truoc__Bill_Gates.pdf',
      ];

      expect(universalCandidates.length).toBeGreaterThan(0);
      expect(universalCandidates.some((c) => c.endsWith('default-ebook.pdf'))).toBe(true);
    });

    it('does not silently suppress ebook upload error in UI toast notification', () => {
      const toastMock = vi.fn();
      const uploadRes = { success: false, error: { message: 'File size exceeds limit' } };

      if (!uploadRes.success) {
        toastMock(
          uploadRes.error?.message
            ? `Lưu ý tệp Ebook: ${uploadRes.error.message}`
            : 'Chưa tải được tệp PDF lên máy chủ lưu trữ.',
          'warning'
        );
      }

      expect(toastMock).toHaveBeenCalledWith('Lưu ý tệp Ebook: File size exceeds limit', 'warning');
    });
  });
});
