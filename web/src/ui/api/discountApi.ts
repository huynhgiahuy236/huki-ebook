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
   * Get active/latest discount for a book
   */
  getDiscountByBookId: (bookId: string) =>
    apiClient<BookDiscount | null>(`/seller/discounts/books/${encodeURIComponent(bookId)}`, {
      method: 'GET',
    }),

  /**
   * Get discounts for multiple books in batch
   */
  getDiscountsForBooks: (bookIds: string[]) =>
    apiClient<BookDiscount[]>('/seller/discounts/batch-books', {
      method: 'POST',
      body: JSON.stringify({ bookIds }),
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
