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
}

export interface CartItem {
  id: string;
  bookId: string;
  format: CartItemFormat;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  book: CartBook;
}

export interface CartResponse {
  id: string;
  userId: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  updatedAt: string;
}

export interface AddCartItemPayload {
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
