/**
 * HUKI EBOOK - Seller Book Discount API Client
 * Custom Book Discount CRUD operations for Sellers (Giảm giá tự do)
 */

import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type DiscountStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface BookDiscount {
  id: string;
  bookId: string;
  type: DiscountType;
  value: number;
  minQuantity?: number;
  startsAt: string;
  expiresAt: string;
  status: DiscountStatus;
  isCurrentlyActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookDiscountPayload {
  bookId: string;
  type: DiscountType;
  value: number;
  minQuantity?: number;
  startsAt: string;
  expiresAt: string;
}

export const discountApi = {
  /**
   * Create or update discount for a book
   */
  createOrUpdateDiscount: (payload: CreateBookDiscountPayload) =>
    apiClient<BookDiscount>('/seller/discounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /**
   * Get active discount for a book (public endpoint - avoids 403 on Buyer pages)
   */
  getDiscountByBookId: (bookId: string) =>
    apiClient<BookDiscount | null>(`/discounts/active/${encodeURIComponent(bookId)}`, {
      method: 'GET',
      skipAuth: true,
    }),

  /**
   * Get active discounts for multiple books in batch
   */
  getDiscountsForBooks: (bookIds: string[]) =>
    apiClient<BookDiscount[]>('/discounts/batch-active', {
      method: 'POST',
      body: JSON.stringify({ bookIds }),
      skipAuth: true,
    }),

  /**
   * Cancel / Delete a discount
   */
  cancelDiscount: (discountId: string) =>
    apiClient<BookDiscount>(`/seller/discounts/${encodeURIComponent(discountId)}`, {
      method: 'DELETE',
    }),
};

export default discountApi;
