import React, { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { cartApi } from '../api/cartApi';
import { booksData } from '../data/mockData';

const CartContext = createContext(null);

const STORAGE_KEY_GUEST = 'huki.cart.guest_items';
const STORAGE_KEY_LEGACY = 'huki.cart.items';

export const CartProvider = ({ children }) => {
  const { showToast } = useToast();
  const { user, isLoggedIn } = useAuth();

  const [cartItems, setCartItems] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = window.localStorage.getItem(STORAGE_KEY_GUEST) || window.localStorage.getItem(STORAGE_KEY_LEGACY);
        if (saved) return JSON.parse(saved);
      }
    } catch {
      // Fall back to empty array
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const prevLoggedInRef = useRef(isLoggedIn);
  const isSyncingRef = useRef(false);

  // Helper to persist cart items (handles both guest and logged-in user)
  const persistCart = useCallback((items, targetUser = user) => {
    if (typeof window === 'undefined') return;
    try {
      if (targetUser && targetUser.id) {
        window.localStorage.setItem(`huki.cart.user_${targetUser.id}`, JSON.stringify(items));
      } else {
        window.localStorage.setItem(STORAGE_KEY_GUEST, JSON.stringify(items));
        window.localStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify(items));
      }
    } catch {
      // Ignore storage errors
    }
  }, [user]);

  // Transform backend CartResponse item into frontend cart item
  const mapServerItemToLocal = useCallback((serverItem, existingLocalItems = []) => {
    const existing = existingLocalItems.find(
      (i) => i.id === serverItem.id || (i.bookId === serverItem.bookId && i.format === serverItem.format)
    );

    const isPhysical = serverItem.format === 'PHYSICAL';
    const isEbook = serverItem.format === 'DIGITAL';

    const isAvailable = serverItem.isAvailable !== false && serverItem.status !== 'OUT_OF_STOCK';

    // Resolve store ID strictly from server book metadata
    const resolvedStoreId =
      serverItem.book?.storeId ||
      serverItem.book?.businessId ||
      serverItem.storeId ||
      'huki-official';

    // Resolve publisher/store dynamically from server book metadata
    const resolvedPublisher =
      serverItem.book?.publisher ||
      serverItem.book?.business?.name ||
      serverItem.book?.business?.displayName ||
      existing?.publisher ||
      'Gian Hàng HUKI';

    return {
      id: serverItem.id,
      bookId: serverItem.bookId,
      title: serverItem.book?.title || existing?.title || 'Ấn phẩm HUKI',
      slug: serverItem.book?.slug || existing?.slug || serverItem.bookId,
      author: serverItem.book?.author || existing?.author || 'Đang cập nhật',
      publisher: resolvedPublisher,
      storeId: resolvedStoreId,
      format: isPhysical ? 'Sách giấy' : isEbook ? 'Ebook Số' : (existing?.format || 'Sách giấy'),
      apiFormat: serverItem.format,
      formatTag: isPhysical ? 'Bìa mềm cao cấp' : 'Ebook DRM Bản quyền',
      price: Number(serverItem.unitPrice || existing?.price || 0),
      addedPrice: Number(serverItem.addedPrice || existing?.addedPrice || serverItem.unitPrice || 0),
      originalPrice: existing?.originalPrice || Number(serverItem.unitPrice || 0) * 1.3,
      quantity: serverItem.quantity,
      checked: isAvailable ? (existing ? existing.checked : true) : false,
      cover: serverItem.book?.coverUrl || existing?.cover || booksData[0]?.cover,
      type: isPhysical ? 'physical' : 'ebook',
      isAvailable,
      status: serverItem.status || (isAvailable ? 'AVAILABLE' : 'OUT_OF_STOCK'),
      availableStock: serverItem.availableStock ?? (isAvailable ? 99 : 0),
      priceChange: serverItem.priceChange || null,
      priceChangeMessage: serverItem.priceChangeMessage || null,
      stockWarning: serverItem.stockWarning || null,
    };
  }, []);

  // Fetch cart from server for logged-in user
  const fetchServerCart = useCallback(async () => {
    if (!isLoggedIn || !user?.id) return;
    setIsLoading(true);
    try {
      let localUserItems = [];
      try {
        const saved = window.localStorage.getItem(`huki.cart.user_${user.id}`);
        if (saved) localUserItems = JSON.parse(saved);
      } catch {
        localUserItems = [];
      }

      const res = await cartApi.getCart();
      if (res.success && res.data?.items) {
        const mapped = res.data.items.map((serverItem) =>
          mapServerItemToLocal(serverItem, localUserItems)
        );
        setCartItems(mapped);
        persistCart(mapped, user);

        // Notify user if any price changed
        const priceChangedItems = mapped.filter((i) => i.priceChange && i.priceChangeMessage);
        if (priceChangedItems.length > 0) {
          priceChangedItems.forEach((item) => {
            showToast(
              {
                title: item.priceChange === 'DECREASED' ? 'Giá sách giảm' : 'Cập nhật giá mới',
                message: item.priceChangeMessage,
              },
              item.priceChange === 'DECREASED' ? 'success' : 'info'
            );
          });
        }

        // Notify user if any stock adjusted
        const stockAdjustedItems = mapped.filter((i) => i.stockWarning);
        if (stockAdjustedItems.length > 0) {
          stockAdjustedItems.forEach((item) => {
            showToast(
              {
                title: 'Tự động điều chỉnh số lượng',
                message: item.stockWarning,
              },
              'warning'
            );
          });
        }
      }
    } catch {
      // Fallback to local storage if API call fails
      try {
        const saved = window.localStorage.getItem(`huki.cart.user_${user.id}`);
        if (saved) setCartItems(JSON.parse(saved));
      } catch {
        // Keep current state
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, user, mapServerItemToLocal, persistCart, showToast]);

  // Sync Guest Cart to Server on Login (One-shot merge)
  useEffect(() => {
    const syncGuestCartOnLogin = async () => {
      if (isLoggedIn && !prevLoggedInRef.current && user?.id && !isSyncingRef.current) {
        isSyncingRef.current = true;
        try {
          // Read guest cart
          let guestItems = [];
          try {
            const raw = window.localStorage.getItem(STORAGE_KEY_GUEST) || window.localStorage.getItem(STORAGE_KEY_LEGACY);
            if (raw) guestItems = JSON.parse(raw);
          } catch {
            guestItems = [];
          }

          if (guestItems.length > 0) {
            // Prepare payload for merge
            const payloadItems = guestItems
              .filter((item) => item.bookId || item.id)
              .map((item) => ({
                bookId: item.bookId || item.id,
                format: item.apiFormat || (item.type === 'ebook' || item.format?.toLowerCase().includes('ebook') ? 'DIGITAL' : 'PHYSICAL'),
                quantity: item.quantity || 1,
              }));

            if (payloadItems.length > 0) {
              const res = await cartApi.mergeGuestCart(payloadItems);
              if (res.success && res.data?.items) {
                const mapped = res.data.items.map((serverItem) => mapServerItemToLocal(serverItem, guestItems));
                setCartItems(mapped);
                persistCart(mapped, user);

                // Clear guest storage after successful merge
                try {
                  window.localStorage.removeItem(STORAGE_KEY_GUEST);
                  window.localStorage.removeItem(STORAGE_KEY_LEGACY);
                } catch {
                  // Ignore
                }

                showToast(
                  {
                    title: 'Đồng bộ giỏ hàng',
                    message: `Đã tự động gộp ${payloadItems.length} ấn phẩm từ phiên khách vào tài khoản của bạn.`,
                  },
                  'success'
                );
                return;
              }
            }
          }

          // If no guest items, load server cart directly
          await fetchServerCart();
        } catch {
          await fetchServerCart();
        } finally {
          isSyncingRef.current = false;
        }
      } else if (!isLoggedIn && prevLoggedInRef.current) {
        // User logged out -> switch back to guest cart
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY_GUEST) || window.localStorage.getItem(STORAGE_KEY_LEGACY);
          setCartItems(raw ? JSON.parse(raw) : []);
        } catch {
          setCartItems([]);
        }
      }
      prevLoggedInRef.current = isLoggedIn;
    };

    syncGuestCartOnLogin();
  }, [isLoggedIn, user, fetchServerCart, mapServerItemToLocal, persistCart, showToast]);

  // Initial fetch for logged-in user on mount
  useEffect(() => {
    if (isLoggedIn && user?.id) {
      fetchServerCart();
    }
  }, [isLoggedIn, user?.id, fetchServerCart]);

  // Add Item to Cart
  const addItem = useCallback(
    async (itemOrBook, format = 'paper') => {
      let newItem = null;
      let apiFormat = 'PHYSICAL';
      let bookId = '';

      if (itemOrBook && typeof itemOrBook === 'object' && itemOrBook.title && itemOrBook.price) {
        const isPhysical = itemOrBook.type === 'physical' || itemOrBook.format?.toLowerCase().includes('giấy');
        apiFormat = isPhysical ? 'PHYSICAL' : 'DIGITAL';
        bookId = itemOrBook.bookId || itemOrBook.id;

        const resolvedStoreId =
          itemOrBook.storeId ||
          itemOrBook.businessId ||
          itemOrBook.book?.storeId ||
          itemOrBook.book?.businessId ||
          'huki-official';

        const resolvedPublisher =
          itemOrBook.publisher ||
          itemOrBook.business?.displayName ||
          itemOrBook.business?.name ||
          itemOrBook.book?.publisher ||
          'Gian Hàng HUKI';

        newItem = {
          id: itemOrBook.id || `item-${Date.now()}`,
          bookId: bookId,
          title: itemOrBook.title,
          slug: itemOrBook.slug || bookId,
          author: itemOrBook.author || 'Đang cập nhật',
          publisher: resolvedPublisher,
          storeId: resolvedStoreId,
          format: itemOrBook.format || (isPhysical ? 'Sách giấy' : 'Ebook Số'),
          apiFormat,
          formatTag: itemOrBook.formatTag || (isPhysical ? 'Bìa mềm cao cấp' : 'Ebook DRM Bản quyền'),
          price: Number(itemOrBook.price),
          addedPrice: Number(itemOrBook.price),
          originalPrice: Number(itemOrBook.originalPrice || itemOrBook.price * 1.3),
          quantity: itemOrBook.quantity || 1,
          checked: true,
          cover: itemOrBook.cover || itemOrBook.image || booksData[0]?.cover,
          type: isPhysical ? 'physical' : 'ebook',
          isAvailable: true,
          status: 'AVAILABLE',
          availableStock: 99,
        };
      } else {
        const book = itemOrBook;
        const isEbook = format === 'ebook';
        const isCombo = format === 'combo' || format === 'hybrid';
        const isPhysical = !isEbook;
        apiFormat = isPhysical ? 'PHYSICAL' : 'DIGITAL';
        bookId = book.id;

        const price = isEbook ? (book.priceEbook || book.price) : (isCombo ? book.priceCombo : (book.pricePaper || book.price));
        const formatName = isEbook ? 'Ebook Số' : (isCombo ? 'Combo Hybrid' : 'Sách giấy');

        const resolvedStoreId =
          book.storeId ||
          book.businessId ||
          'huki-official';

        const resolvedPublisher =
          book.publisher ||
          book.business?.displayName ||
          book.business?.name ||
          'Gian Hàng HUKI';

        newItem = {
          id: `${book.id}-${format}-${Date.now()}`,
          bookId: book.id,
          title: book.title,
          slug: book.slug || book.id,
          author: book.author || 'Tác giả',
          publisher: resolvedPublisher,
          storeId: resolvedStoreId,
          format: formatName,
          apiFormat,
          formatTag: isEbook ? 'Ebook DRM Bản quyền' : (isCombo ? 'Sách Giấy + Ebook trọn đời' : 'Bìa mềm cao cấp'),
          price: Number(price || 79000),
          addedPrice: Number(price || 79000),
          originalPrice: Number(isEbook ? (book.originalPriceEbook || 119000) : (book.originalPricePaper || 169000)),
          quantity: 1,
          checked: true,
          cover: book.cover || book.coverUrl || booksData[0]?.cover,
          type: isEbook ? 'ebook' : 'physical',
          isAvailable: true,
          status: 'AVAILABLE',
          availableStock: 99,
        };
      }

      const isUUID = typeof bookId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookId);

      if (isLoggedIn && isUUID) {
        try {
          const res = await cartApi.addToCart({
            bookId,
            format: apiFormat,
            quantity: newItem.quantity,
          });

          if (res.success && res.data?.items) {
            setCartItems((prev) => {
              const updated = res.data.items.map((srvItem) => mapServerItemToLocal(srvItem, prev));
              persistCart(updated, user);
              return updated;
            });
            showToast(
              {
                title: 'Đã thêm vào giỏ hàng',
                message: `Ấn phẩm "${newItem.title}" đã được thêm vào giỏ của bạn.`,
              },
              'success'
            );
            return;
          }
        } catch {
          // Fallback to local state update
        }
      }

      // Local / Guest update
      setCartItems((prev) => {
        const existingIdx = prev.findIndex(
          (i) => i.id === newItem.id || (i.bookId === newItem.bookId && i.format === newItem.format)
        );
        let nextState;
        if (existingIdx >= 0) {
          nextState = [...prev];
          nextState[existingIdx] = {
            ...nextState[existingIdx],
            quantity: nextState[existingIdx].quantity + newItem.quantity,
            checked: true,
          };
        } else {
          nextState = [...prev, newItem];
        }
        persistCart(nextState, user);
        return nextState;
      });

      showToast(
        {
          title: 'Đã thêm vào giỏ hàng',
          message: `Ấn phẩm "${newItem.title}" đã được thêm vào giỏ của bạn.`,
        },
        'success'
      );
    },
    [isLoggedIn, user, mapServerItemToLocal, persistCart, showToast]
  );

  const addToCart = addItem;

  // Remove item from cart
  const removeFromCart = useCallback(
    async (id) => {
      const itemToRemove = cartItems.find((i) => i.id === id);

      if (isLoggedIn && id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        try {
          await cartApi.removeCartItem(id);
        } catch {
          // Continue with optimistic UI removal
        }
      }

      setCartItems((prev) => {
        const nextState = prev.filter((item) => item.id !== id);
        persistCart(nextState, user);
        return nextState;
      });

      showToast(
        {
          title: 'Đã xóa ấn phẩm',
          message: itemToRemove ? `Đã xóa "${itemToRemove.title}" khỏi giỏ hàng.` : 'Đã xóa ấn phẩm khỏi giỏ hàng.',
        },
        'info'
      );
    },
    [cartItems, isLoggedIn, user, persistCart, showToast]
  );

  // Clear all unavailable/out-of-stock items
  const clearUnavailableItems = useCallback(async () => {
    const unavItems = cartItems.filter((i) => i.isAvailable === false);
    for (const item of unavItems) {
      if (isLoggedIn && item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)) {
        try {
          await cartApi.removeCartItem(item.id);
        } catch {
          // ignore
        }
      }
    }

    setCartItems((prev) => {
      const nextState = prev.filter((item) => item.isAvailable !== false);
      persistCart(nextState, user);
      return nextState;
    });

    showToast(
      {
        title: 'Đã dọn dẹp',
        message: 'Đã xóa toàn bộ sản phẩm không khả dụng khỏi giỏ hàng.',
      },
      'success'
    );
  }, [cartItems, isLoggedIn, user, persistCart, showToast]);

  // Update quantity of an item
  const updateQuantity = useCallback(
    async (id, delta) => {
      const targetItem = cartItems.find((i) => i.id === id);
      if (!targetItem) return;

      const maxLimit = targetItem.availableStock || 99;
      const newQty = Math.max(1, Math.min(maxLimit, targetItem.quantity + delta));
      if (newQty === targetItem.quantity) return;

      if (isLoggedIn && id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        try {
          await cartApi.updateCartItem(id, newQty);
        } catch {
          // Fallback to local
        }
      }

      setCartItems((prev) => {
        const nextState = prev.map((item) => {
          if (item.id === id) {
            return { ...item, quantity: newQty };
          }
          return item;
        });
        persistCart(nextState, user);
        return nextState;
      });
    },
    [cartItems, isLoggedIn, user, persistCart]
  );

  // Toggle item selection (rejects unavailable items)
  const toggleCheckItem = useCallback(
    (id) => {
      const target = cartItems.find((i) => i.id === id);
      if (target && target.isAvailable === false) {
        showToast(
          {
            title: 'Sản phẩm hết hàng',
            message: 'Ấn phẩm này hiện đang tạm hết hàng, không thể chọn để thanh toán!',
          },
          'warning'
        );
        return;
      }

      setCartItems((prev) => {
        const nextState = prev.map((item) => {
          if (item.id === id) {
            return { ...item, checked: !item.checked };
          }
          return item;
        });
        persistCart(nextState, user);
        return nextState;
      });
    },
    [cartItems, user, persistCart, showToast]
  );

  // Toggle all available items in a store
  const toggleStoreCheck = useCallback(
    (storeId, isChecked) => {
      setCartItems((prev) => {
        const nextState = prev.map((item) => {
          if (item.storeId === storeId && item.isAvailable !== false) {
            return { ...item, checked: isChecked };
          }
          return item;
        });
        persistCart(nextState, user);
        return nextState;
      });
    },
    [user, persistCart]
  );

  // Toggle all available items
  const toggleAll = useCallback(
    (isChecked) => {
      setCartItems((prev) => {
        const nextState = prev.map((item) => {
          if (item.isAvailable !== false) {
            return { ...item, checked: isChecked };
          }
          return { ...item, checked: false };
        });
        persistCart(nextState, user);
        return nextState;
      });
    },
    [user, persistCart]
  );

  // Clear entire cart
  const clearCart = useCallback(async () => {
    if (isLoggedIn) {
      try {
        await cartApi.clearCart();
      } catch {
        // Continue
      }
    }

    setCartItems([]);
    persistCart([], user);
    showToast(
      {
        title: 'Giỏ hàng',
        message: 'Đã xóa toàn bộ ấn phẩm trong giỏ hàng.',
      },
      'info'
    );
  }, [isLoggedIn, user, persistCart, showToast]);

  // Partition available and unavailable items
  const availableItems = useMemo(() => cartItems.filter((i) => i.isAvailable !== false), [cartItems]);
  const unavailableItems = useMemo(() => cartItems.filter((i) => i.isAvailable === false), [cartItems]);

  // Group available items by store
  const storeGroups = useMemo(() => {
    const groups = {};

    availableItems.forEach((item) => {
      const storeId = item.storeId || 'default-store';
      if (!groups[storeId]) {
        const publisherName = item.publisher || 'Gian Hàng HUKI';
        groups[storeId] = {
          id: storeId,
          name: publisherName,
          badge: 'Chính Hãng',
          tag: publisherName.slice(0, 2).toUpperCase(),
          tagBg: 'bg-emerald-600',
          items: [],
          subtotal: 0,
        };
      }
      groups[storeId].items.push(item);
      if (item.checked) {
        groups[storeId].subtotal += item.price * item.quantity;
      }
    });

    return Object.values(groups);
  }, [availableItems]);

  // Checked items (strictly only available items)
  const checkedItems = useMemo(() => availableItems.filter((i) => i.checked), [availableItems]);
  const checkedItemsCount = useMemo(() => checkedItems.reduce((acc, i) => acc + i.quantity, 0), [checkedItems]);
  const checkedSubtotal = useMemo(() => checkedItems.reduce((acc, i) => acc + i.price * i.quantity, 0), [checkedItems]);
  const totalItemsCount = useMemo(() => availableItems.reduce((acc, i) => acc + i.quantity, 0), [availableItems]);

  const allChecked = useMemo(() => {
    return availableItems.length > 0 && availableItems.every((i) => i.checked);
  }, [availableItems]);

  const hasPhysicalItems = useMemo(() => checkedItems.some((i) => i.type === 'physical'), [checkedItems]);
  const hasEbookItems = useMemo(() => checkedItems.some((i) => i.type === 'ebook'), [checkedItems]);

  const value = {
    cartItems,
    availableItems,
    unavailableItems,
    storeGroups,
    checkedItems,
    checkedItemsCount,
    checkedSubtotal,
    totalItemsCount,
    allChecked,
    hasPhysicalItems,
    hasEbookItems,
    isLoading,
    addItem,
    addToCart,
    removeFromCart,
    updateQuantity,
    toggleCheckItem,
    toggleStoreCheck,
    toggleAll,
    clearCart,
    clearUnavailableItems,
    fetchServerCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
export default CartContext;
