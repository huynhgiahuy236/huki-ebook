import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export type CartItemFormat = 'PHYSICAL' | 'DIGITAL';

export interface CartBook {
  id: string;
  storeId: string;
  title: string;
  slug: string;
  coverUrl?: string;
  status: string;
  author?: string;
  publisher?: string;
}

export interface CartItem {
  id: string;
  bookId: string;
  format: CartItemFormat;
  quantity: number;
  unitPrice: number;
  addedPrice?: number;
  currentPrice?: number;
  subtotal: number;
  isAvailable?: boolean;
  status?: 'AVAILABLE' | 'OUT_OF_STOCK' | 'PARTIAL_STOCK';
  availableStock?: number;
  priceChange?: 'INCREASED' | 'DECREASED' | null;
  priceChangeMessage?: string | null;
  stockWarning?: string | null;
  book: CartBook;
}

export interface StoreGroup {
  id: string;
  name: string;
  tag: string;
  tagBg: string;
  badge: string;
  items: CartItem[];
  subtotal: number;
}

export interface CartResponse {
  id: string;
  userId: string;
  items: CartItem[];
  availableItems?: CartItem[];
  unavailableItems?: CartItem[];
  storeGroups?: StoreGroup[];
  totalItems: number;
  subtotal: number;
  updatedAt: string;
}

export interface AddCartItemPayload {
  bookId: string;
  format: CartItemFormat;
  quantity: number;
}

export interface MergeCartItemPayload {
  bookId: string;
  format: CartItemFormat;
  quantity: number;
}

export interface UpdateCartItemPayload {
  quantity: number;
}

export const cartApi = {
  getCart: async (): Promise<ApiResponse<CartResponse>> => {
    return apiClient<CartResponse>('/cart', { method: 'GET' });
  },

  addToCart: async (payload: AddCartItemPayload): Promise<ApiResponse<CartResponse>> => {
    return apiClient<CartResponse>('/cart/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  mergeCart: async (items: MergeCartItemPayload[]): Promise<ApiResponse<CartResponse>> => {
    return apiClient<CartResponse>('/cart/merge', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  updateCartItem: async (itemId: string, quantity: number): Promise<ApiResponse<CartResponse>> => {
    return apiClient<CartResponse>(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  },

  removeCartItem: async (itemId: string): Promise<ApiResponse<CartResponse>> => {
    return apiClient<CartResponse>(`/cart/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  clearCart: async (): Promise<ApiResponse<{ message: string }>> => {
    return apiClient<{ message: string }>('/cart', {
      method: 'DELETE',
    });
  },
};
