import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';

vi.mock('./ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('./AuthContext', () => ({
  useAuth: () => ({ user: null, isLoggedIn: false }),
}));

vi.mock('../api/cartApi', () => ({
  cartApi: {
    getCart: vi.fn().mockResolvedValue({ success: true, data: { items: [] } }),
    addItem: vi.fn().mockResolvedValue({ success: true }),
    updateItem: vi.fn().mockResolvedValue({ success: true }),
    removeItem: vi.fn().mockResolvedValue({ success: true }),
    clearCart: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CartProvider>{children}</CartProvider>
  );

  it('initializes with an empty cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.cartItems).toEqual([]);
    expect(result.current.totalItemsCount).toBe(0);
    expect(result.current.checkedSubtotal).toBe(0);
  });

  it('adds an item to cart and calculates subtotal correctly', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    const sampleBook = {
      id: 'book-101',
      title: 'Đắc Nhân Tâm',
      author: 'Dale Carnegie',
      publisher: 'NXB Tổng Hợp',
      storeId: 'store-alpha',
      price: 85000,
      pricePaper: 85000,
      cover: '/covers/dac-nhan-tam.jpg',
      format: 'Sách giấy',
    };

    await act(async () => {
      await result.current.addToCart(sampleBook, 'paper');
    });

    expect(result.current.cartItems.length).toBe(1);
    const item = result.current.cartItems[0];
    expect(item.title).toBe('Đắc Nhân Tâm');
    expect(item.quantity).toBe(1);
    expect(item.price).toBe(85000);
    expect(result.current.checkedSubtotal).toBe(85000);
    expect(result.current.totalItemsCount).toBe(1);
  });

  it('updates item quantity and recalculates totals', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    const sampleBook = {
      id: 'book-102',
      title: 'Nhà Giả Kim',
      author: 'Paulo Coelho',
      storeId: 'store-alpha',
      price: 70000,
      format: 'Sách giấy',
    };

    await act(async () => {
      await result.current.addToCart(sampleBook, 'paper', 1);
    });

    const itemId = result.current.cartItems[0].id;

    await act(async () => {
      await result.current.updateQuantity(itemId, 2); // add 2 more
    });

    expect(result.current.cartItems[0].quantity).toBe(3);
    expect(result.current.checkedSubtotal).toBe(210000);
  });

  it('removes item from cart', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    const sampleBook = {
      id: 'book-103',
      title: 'Tuổi Trẻ Đáng Giá Bao Nhiêu',
      storeId: 'store-beta',
      price: 60000,
    };

    await act(async () => {
      await result.current.addToCart(sampleBook, 'paper', 1);
    });

    expect(result.current.cartItems.length).toBe(1);
    const itemId = result.current.cartItems[0].id;

    await act(async () => {
      await result.current.removeFromCart(itemId);
    });

    expect(result.current.cartItems.length).toBe(0);
    expect(result.current.checkedSubtotal).toBe(0);
  });

  it('toggles item selection and updates checkedSubtotal', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    await act(async () => {
      await result.current.addToCart({ id: 'b1', title: 'Book 1', price: 50000, storeId: 's1' }, 'paper', 1);
      await result.current.addToCart({ id: 'b2', title: 'Book 2', price: 100000, storeId: 's1' }, 'paper', 1);
    });

    expect(result.current.checkedSubtotal).toBe(150000);

    const firstItemId = result.current.cartItems[0].id;

    act(() => {
      result.current.toggleCheckItem(firstItemId);
    });

    expect(result.current.cartItems[0].checked).toBe(false);
    expect(result.current.checkedSubtotal).toBe(100000);

    act(() => {
      result.current.toggleAll(false);
    });

    expect(result.current.checkedSubtotal).toBe(0);
    expect(result.current.checkedItems.length).toBe(0);

    act(() => {
      result.current.toggleAll(true);
    });

    expect(result.current.checkedSubtotal).toBe(150000);
  });
});
