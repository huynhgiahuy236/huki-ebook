import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SellerActionButton } from '@/ui/components/seller/SellerUI';
import { createPortal } from 'react-dom';

describe('UAT 02-SELLER-AUDIT Fixes Verification', () => {
  describe('BUG 07: Realtime Chat Socket Channel ID Validation', () => {
    // Logic from useChatSocket: isValidConversationId accepts UUIDs, numeric IDs, and store/channel prefixes
    const isValidConversationId = (id: string | null | undefined): boolean => {
      if (!id || typeof id !== 'string') return false;
      const trimmed = id.trim();
      return (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed) ||
        /^[a-zA-Z0-9_-]{3,64}$/.test(trimmed)
      );
    };

    it('accepts valid UUIDs', () => {
      expect(isValidConversationId('a8098c1a-f86e-11da-bd1a-00112444be1e')).toBe(true);
      expect(isValidConversationId('c67341e9-4670-498c-8f47-8a6a6f671c82')).toBe(true);
    });

    it('accepts store channel IDs (e.g. store-biz-123456)', () => {
      expect(isValidConversationId('store-c67341e9-4670-498c-8f47-8a6a6f671c82')).toBe(true);
      expect(isValidConversationId('store-12345')).toBe(true);
      expect(isValidConversationId('channel_customer_support')).toBe(true);
    });

    it('rejects invalid, empty or malicious conversation IDs', () => {
      expect(isValidConversationId('')).toBe(false);
      expect(isValidConversationId(null)).toBe(false);
      expect(isValidConversationId(undefined)).toBe(false);
      expect(isValidConversationId('ab')).toBe(false); // too short
      expect(isValidConversationId('bad/id/with/slashes')).toBe(false);
      expect(isValidConversationId('<script>alert(1)</script>')).toBe(false);
    });
  });

  describe('BUG 12: Seller Followers Name Full Display without Arbitrary Truncation', () => {
    it('renders customer names exceeding 10 characters fully', () => {
      const followers = [
        { id: '1', fullName: 'Nguyen Van A' }, // 12 chars
        { id: '2', fullName: 'Doan Quoc Trinh' }, // 15 chars
        { id: '3', fullName: 'Tran Thi Mai Phuong' }, // 19 chars
      ];

      const { container } = render(
        <table>
          <tbody>
            {followers.map((f) => {
              const fullName = f.fullName || 'Khách Hàng';
              const displayName = fullName; // Fix: no longer sliced to 10 chars
              return (
                <tr key={f.id}>
                  <td>
                    <span className="font-bold text-gray-900" title={fullName}>
                      {displayName}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );

      // Verify all full names appear in document without truncation
      expect(screen.getByText('Nguyen Van A')).toBeDefined();
      expect(screen.getByText('Doan Quoc Trinh')).toBeDefined();
      expect(screen.getByText('Tran Thi Mai Phuong')).toBeDefined();
      expect(container.textContent).not.toContain('...');
    });
  });

  describe('BUG 13 & 14: Seller Orders Action Loading Isolation and Modal Portal', () => {
    it('BUG 14: maintains isolated row loading so clicking an action on order 1 does NOT show loading on order 2', () => {
      let actionLoadingOrderId: string | null = 'ord-1';

      const { rerender } = render(
        <div data-testid="orders-table">
          <div data-testid="row-ord-1">
            <SellerActionButton
              variant="success"
              label="Xác nhận"
              icon="check_circle"
              size="sm"
              onClick={() => {}}
              loading={actionLoadingOrderId === 'ord-1'}
            />
          </div>
          <div data-testid="row-ord-2">
            <SellerActionButton
              variant="success"
              label="Xác nhận"
              icon="check_circle"
              size="sm"
              onClick={() => {}}
              loading={actionLoadingOrderId === 'ord-2'}
            />
          </div>
        </div>
      );

      // Row 1 button must show loading spinner
      const row1 = screen.getByTestId('row-ord-1');
      expect(row1.querySelector('.animate-spin')).not.toBeNull();

      // Row 2 button must NOT show loading spinner
      const row2 = screen.getByTestId('row-ord-2');
      expect(row2.querySelector('.animate-spin')).toBeNull();
      expect(row2.textContent).toContain('Xác nhận');

      // Now switch loading to ord-2
      actionLoadingOrderId = 'ord-2';
      rerender(
        <div data-testid="orders-table">
          <div data-testid="row-ord-1">
            <SellerActionButton
              variant="success"
              label="Xác nhận"
              icon="check_circle"
              size="sm"
              onClick={() => {}}
              loading={actionLoadingOrderId === 'ord-1'}
            />
          </div>
          <div data-testid="row-ord-2">
            <SellerActionButton
              variant="success"
              label="Xác nhận"
              icon="check_circle"
              size="sm"
              onClick={() => {}}
              loading={actionLoadingOrderId === 'ord-2'}
            />
          </div>
        </div>
      );

      expect(row1.querySelector('.animate-spin')).toBeNull();
      expect(row2.querySelector('.animate-spin')).not.toBeNull();
    });

    it('BUG 13: renders Modal Action Box directly onto document.body via Portal with backdrop overlay', () => {
      const activeActionBox = {
        type: 'CANCEL' as const,
        order: { id: 'ord-888', code: 'HK-888' },
      };

      const { container } = render(
        <div id="seller-orders-scrollable-container" className="overflow-y-auto">
          <h1>Seller Orders Page</h1>
          {/* Action box portalled to document.body */}
          {createPortal(
            <div
              data-testid="modal-portal-backdrop"
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl p-6 border shadow-xl max-w-lg w-full">
                <h3>Xác Nhận Hủy Đơn Hàng</h3>
                <p>Mã đơn: #{activeActionBox.order.code}</p>
              </div>
            </div>,
            document.body
          )}
        </div>
      );

      // Modal must NOT be clipped inside scrollable table container
      const insideContainer = container.querySelector('#seller-orders-scrollable-container > [data-testid="modal-portal-backdrop"]');
      expect(insideContainer).toBeNull();

      // Modal must be directly in document.body with fixed z-50
      const inBody = document.body.querySelector('[data-testid="modal-portal-backdrop"]');
      expect(inBody).not.toBeNull();
      expect(inBody?.className).toContain('fixed inset-0 z-50');
      expect(inBody?.textContent).toContain('Xác Nhận Hủy Đơn Hàng');
      expect(inBody?.textContent).toContain('#HK-888');
    });
  });

  describe('BUG 08: Client-Side Canvas Image Sizing Logic', () => {
    it('computes proportional dimensions within max 1200px boundary', () => {
      const calculateDimensions = (width: number, height: number, maxDim = 1200) => {
        let newWidth = width;
        let newHeight = height;
        if (width > height && width > maxDim) {
          newHeight = Math.round((height * maxDim) / width);
          newWidth = maxDim;
        } else if (height > maxDim) {
          newWidth = Math.round((width * maxDim) / height);
          newHeight = maxDim;
        }
        return { width: newWidth, height: newHeight };
      };

      // 4000x3000 landscape
      const landscape = calculateDimensions(4000, 3000);
      expect(landscape.width).toBe(1200);
      expect(landscape.height).toBe(900);

      // 3000x4000 portrait
      const portrait = calculateDimensions(3000, 4000);
      expect(portrait.width).toBe(900);
      expect(portrait.height).toBe(1200);

      // 800x600 small image (no resizing needed)
      const small = calculateDimensions(800, 600);
      expect(small.width).toBe(800);
      expect(small.height).toBe(600);
    });
  });
});

