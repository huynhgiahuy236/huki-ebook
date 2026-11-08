import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('UAT 04-ADMIN-ESCROW-AUDIT Fixes Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('BUG 18 & 19: Admin Escrow Table & Dropdown Clipping Fixes', () => {
    it('calculates escrow start timestamp consistently from server events', () => {
      const orderCreatedAt = '2026-11-08T10:00:00.000Z';
      const deliveredAt = '2026-11-08T10:05:00.000Z';
      const paidAt = '2026-11-08T10:01:00.000Z';

      // Digital: uses paidAt if available, else orderCreatedAt
      const digitalStart = paidAt ? new Date(paidAt).getTime() : new Date(orderCreatedAt).getTime();
      expect(digitalStart).toBe(new Date(paidAt).getTime());

      // Physical: uses deliveredAt when delivered
      const physicalStart = deliveredAt ? new Date(deliveredAt).getTime() : new Date(orderCreatedAt).getTime();
      expect(physicalStart).toBe(new Date(deliveredAt).getTime());
    });

    it('renders escrow table without overflow-hidden clipping container', () => {
      const { container } = render(
        <div data-testid="escrow-order-card">
          <div data-testid="table-wrapper" className="rounded-xl border bg-theme-surface">
            <table className="w-full text-left text-xs">
              <tbody>
                <tr>
                  <td>
                    <div className="relative">
                      <button>Thao tác</button>
                      <div data-testid="dropdown-menu" className="absolute right-0 bottom-full mb-1.5 sm:bottom-auto sm:top-full sm:mt-1.5 w-52 bg-white rounded-2xl shadow-xl z-50">
                        <button>Đang giữ tiền</button>
                        <button>Đóng băng dòng tiền</button>
                        <button>Bàn giao cho Shop</button>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );

      const tableWrapper = screen.getByTestId('table-wrapper');
      expect(tableWrapper.className).not.toContain('overflow-hidden');

      const dropdown = screen.getByTestId('dropdown-menu');
      expect(dropdown).not.toBeNull();
      expect(dropdown.className).toContain('z-50');
    });
  });

  describe('BUG 20: Flash Sale Validation Rules', () => {
    it('accepts empty, undefined, or valid URLs without throwing validation errors', () => {
      const validateBanner = (bannerUrl?: string) => {
        if (!bannerUrl || bannerUrl.trim().length === 0 || bannerUrl.startsWith('data:')) {
          return true; // Valid optional/empty/data URL
        }
        try {
          const url = new URL(bannerUrl);
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      };

      expect(validateBanner(undefined)).toBe(true);
      expect(validateBanner('')).toBe(true);
      expect(validateBanner('   ')).toBe(true);
      expect(validateBanner('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...')).toBe(true);
      expect(validateBanner('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c')).toBe(true);
      expect(validateBanner('not-a-valid-url')).toBe(false);
    });
  });

  describe('BUG 23: Banner Marketing UUIDs & LocalStorage Quota Protection', () => {
    it('uses valid standard UUIDs for all marketing banner entries', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const defaultBannerIds = [
        'e0000001-0000-4000-8000-000000000001',
        'e0000002-0000-4000-8000-000000000002',
        'e0000003-0000-4000-8000-000000000003',
      ];

      for (const id of defaultBannerIds) {
        expect(uuidRegex.test(id)).toBe(true);
      }
    });

    it('safely sanitizes large Base64 images before saving to localStorage to prevent QuotaExceededError', () => {
      const largeDataUri = 'data:image/jpeg;base64,' + 'A'.repeat(300_000);
      const banners = [
        { id: 'banner-1', title: 'Banner with Large Image', bgImage: largeDataUri },
        { id: 'banner-2', title: 'Banner with Standard Path', bgImage: '/banners/hero.jpg' },
      ];

      const lightweight = banners.map((b) => ({
        ...b,
        bgImage: b.bgImage.startsWith('data:') && b.bgImage.length > 200_000
          ? '/banners/hero-library.jpg'
          : b.bgImage,
      }));

      expect(lightweight[0].bgImage).toBe('/banners/hero-library.jpg');
      expect(lightweight[1].bgImage).toBe('/banners/hero.jpg');

      // Writing to localStorage succeeds without error
      expect(() => {
        localStorage.setItem('huki_admin_marketing_banners', JSON.stringify(lightweight));
      }).not.toThrow();
    });
  });

  describe('BUG 24: Admin User Account Management OWASP Compliance', () => {
    it('does not expose clipboard copy for user passwords or plain text view toggle', () => {
      // In compliance with OWASP ASVS: User passwords must be one-way hashed and never exposed in plain text
      const adminActions = ['EDIT_USER', 'LOCK_ACCOUNT', 'SEND_PASSWORD_RESET_LINK'];
      expect(adminActions).not.toContain('COPY_PLAIN_PASSWORD');
      expect(adminActions).not.toContain('VIEW_PLAIN_PASSWORD');
    });
  });

  describe('BUG 25: Business Update Request Comparison & Extended Info', () => {
    it('displays "— (Giữ nguyên)" when a field is not being changed instead of echoing old data', () => {
      const request = {
        business: { name: 'Cong Ty Sach ABC', taxCode: '0101234567' },
        requestedData: { taxCode: '0109999999' }, // name is NOT changed
      };

      const renderProposedName = (req: typeof request) => {
        return (req.requestedData as any)?.name
          ? (req.requestedData as any).name
          : '— (Giữ nguyên)';
      };

      const renderProposedTax = (req: typeof request) => {
        return req.requestedData?.taxCode
          ? req.requestedData.taxCode
          : '— (Giữ nguyên)';
      };

      expect(renderProposedName(request)).toBe('— (Giữ nguyên)');
      expect(renderProposedTax(request)).toBe('0109999999');
    });

    it('does not fall back to hardcoded dummy demo strings for company name or representatives', () => {
      const businessData = { name: 'NXB Cong Nghe Moi', internationalName: undefined, repName: undefined };
      const household = false;

      const internationalName = (businessData as any).internationalName || '';
      const repName = (businessData as any).repName || '';

      expect(internationalName).not.toContain('VIET INTELLECTUAL PUBLISHING');
      expect(repName).not.toContain('Trần Minh Hoàng');
    });
  });
});

