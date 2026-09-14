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

    // Resolve publisher/store dynamically from server book metadata
    const resolvedPublisher = serverItem.book?.business?.displayName
      || serverItem.book?.business?.name
      || serverItem.book?.publisher
      || existing?.publisher
      || 'Gian Hàng HUKI';
    const resolvedStoreId = serverItem.book?.businessId
      || serverItem.book?.storeId
      || existing?.storeId
      || serverItem.bookId; // use bookId as last-resort grouping key

    return {
      id: serverItem.id,
      bookId: serverItem.bookId,
      title: serverItem.book?.title || existing?.title || 'Ấn phẩm HUKI',
      author: existing?.author || 'Đang cập nhật',
      publisher: resolvedPublisher,
      storeId: resolvedStoreId,
      format: isPhysical ? 'Sách giấy' : isEbook ? 'Ebook Số' : (existing?.format || 'Sách giấy'),
      apiFormat: serverItem.format,
      formatTag: isPhysical ? 'Bìa mềm cao cấp' : 'Ebook DRM Bản quyền',
      price: Number(serverItem.unitPrice || existing?.price || 0),
      originalPrice: existing?.originalPrice || Number(serverItem.unitPrice || 0) * 1.3,
      quantity: serverItem.quantity,
      checked: existing ? existing.checked : true,
      cover: serverItem.book?.coverUrl || existing?.cover || booksData[0]?.cover,
      type: isPhysical ? 'physical' : 'ebook',
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
        const serverMapped = res.data.items.map((srvItem) => mapServerItemToLocal(srvItem, localUserItems));
        
        // Merge server items with any mock items that exist locally
        const merged = [...serverMapped];
        for (const locItem of localUserItems) {
          const existsInServer = merged.some(
            (m) => m.id === locItem.id || (m.bookId === locItem.bookId && m.apiFormat === locItem.apiFormat)
          );
          if (!existsInServer) {
            merged.push(locItem);
          }
        }

        setCartItems(merged);
        persistCart(merged, user);
      } else if (localUserItems.length > 0) {
        setCartItems(localUserItems);
      }
    } catch {
      try {
        const saved = window.localStorage.getItem(`huki.cart.user_${user.id}`);
        if (saved) setCartItems(JSON.parse(saved));
      } catch {
        // ignore
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, user, mapServerItemToLocal, persistCart]);

  // Auto-merge guest cart into user cart when user logs in
  useEffect(() => {
    const wasLoggedIn = prevLoggedInRef.current;
    prevLoggedInRef.current = isLoggedIn;

    if (!wasLoggedIn && isLoggedIn && user?.id && !isSyncingRef.current) {
      isSyncingRef.current = true;

      const performAutoMerge = async () => {
        let guestItems = [];
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY_GUEST) || window.localStorage.getItem(STORAGE_KEY_LEGACY);
          if (raw) guestItems = JSON.parse(raw);
        } catch {
          guestItems = [];
        }

        // Load existing user cart
        let userItems = [];
        try {
          const saved = window.localStorage.getItem(`huki.cart.user_${user.id}`);
          if (saved) userItems = JSON.parse(saved);
        } catch {
          userItems = [];
        }

        if (Array.isArray(guestItems) && guestItems.length > 0) {
          let mergedCount = 0;
          for (const item of guestItems) {
            const apiFormat = (item.type === 'physical' || item.format?.toLowerCase().includes('giấy'))
              ? 'PHYSICAL'
              : 'DIGITAL';

            const isUUID = typeof item.bookId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.bookId);

            if (isUUID) {
              try {
                const addRes = await cartApi.addToCart({
                  bookId: item.bookId,
                  format: apiFormat,
                  quantity: item.quantity || 1,
                });
                if (addRes.success) {
                  mergedCount += (item.quantity || 1);
                }
              } catch {
                // Ignore individual item sync error and continue
              }
            }

            // Also merge into user local cart
            const existingIdx = userItems.findIndex(
              (u) => u.id === item.id || (u.bookId === item.bookId && u.format === item.format)
            );
            if (existingIdx >= 0) {
              userItems[existingIdx] = {
                ...userItems[existingIdx],
                quantity: userItems[existingIdx].quantity + (item.quantity || 1),
              };
            } else {
              userItems.push(item);
            }
          }

          // Clear guest pending cart
          try {
            window.localStorage.removeItem(STORAGE_KEY_GUEST);
            window.localStorage.removeItem(STORAGE_KEY_LEGACY);
          } catch {
            // Ignore
          }

          persistCart(userItems, user);

          if (guestItems.length > 0) {
            showToast(
              {
                title: 'Đồng bộ giỏ hàng',
                message: `Đã tự động chuyển các ấn phẩm từ giỏ hàng tạm vào tài khoản của bạn!`,
              },
              'success'
            );
          }
        }

        // Always fetch the freshest server cart
        await fetchServerCart();
        isSyncingRef.current = false;
      };

      performAutoMerge();
    } else if (wasLoggedIn && !isLoggedIn) {
      // User logged out -> reset to saved guest state
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY_GUEST);
        setCartItems(raw ? JSON.parse(raw) : []);
      } catch {
        setCartItems([]);
      }
    } else if (isLoggedIn && user?.id) {
      fetchServerCart();
    }
  }, [isLoggedIn, user, fetchServerCart, persistCart, showToast]);

  // Initial load if already logged in on mount
  useEffect(() => {
    if (isLoggedIn && user?.id) {
      // First restore from user storage immediately
      try {
        const saved = window.localStorage.getItem(`huki.cart.user_${user.id}`);
        if (saved) setCartItems(JSON.parse(saved));
      } catch {
        // ignore
      }
      fetchServerCart();
    }
  }, [isLoggedIn, user?.id, fetchServerCart]);

  // Universal Add Item (supports both direct item object and (book, format) signatures)
  const addItem = useCallback(
    async (itemOrBook, format = 'ebook') => {
      let newItem;
      let apiFormat = 'DIGITAL';
      let bookId = '';

      if (itemOrBook && typeof itemOrBook === 'object' && itemOrBook.title && itemOrBook.price) {
        // Direct item object
        const isPhysical = itemOrBook.type === 'physical' || itemOrBook.format?.toLowerCase().includes('giấy');
        apiFormat = isPhysical ? 'PHYSICAL' : 'DIGITAL';
        bookId = itemOrBook.bookId || itemOrBook.id;

        newItem = {
          id: itemOrBook.id || `item-${Date.now()}`,
          bookId: bookId,
          title: itemOrBook.title,
          author: itemOrBook.author || 'Đang cập nhật',
          publisher: itemOrBook.publisher || itemOrBook.business?.displayName || itemOrBook.business?.name || 'Gian Hàng HUKI',
          storeId: itemOrBook.storeId || itemOrBook.businessId || bookId,
          format: itemOrBook.format || (isPhysical ? 'Sách giấy' : 'Ebook Số'),
          apiFormat,
          formatTag: itemOrBook.formatTag || (isPhysical ? 'Bìa mềm cao cấp' : 'Ebook DRM Bản quyền'),
          price: Number(itemOrBook.price),
          originalPrice: Number(itemOrBook.originalPrice || itemOrBook.price * 1.3),
          quantity: itemOrBook.quantity || 1,
          checked: true,
          cover: itemOrBook.cover || itemOrBook.image || booksData[0]?.cover,
          type: isPhysical ? 'physical' : 'ebook',
        };
      } else {
        // (book, format) style
        const book = itemOrBook;
        const isEbook = format === 'ebook';
        const isCombo = format === 'combo' || format === 'hybrid';
        const isPhysical = !isEbook;
        apiFormat = isPhysical ? 'PHYSICAL' : 'DIGITAL';
        bookId = book.id;

        const price = isEbook ? (book.priceEbook || book.price) : (isCombo ? book.priceCombo : (book.pricePaper || book.price));
        const formatName = isEbook ? 'Ebook Số' : (isCombo ? 'Combo Hybrid' : 'Sách giấy');

        newItem = {
          id: `${book.id}-${format}-${Date.now()}`,
          bookId: book.id,
          title: book.title,
          author: book.author || 'Tác giả',
          publisher: book.publisher || book.business?.displayName || book.business?.name || 'Gian Hàng HUKI',
          storeId: book.storeId || book.businessId || book.id,
          format: formatName,
          apiFormat,
          formatTag: isEbook ? 'Ebook DRM Bản quyền' : (isCombo ? 'Sách Giấy + Ebook trọn đời' : 'Bìa mềm cao cấp'),
          price: Number(price || 79000),
          originalPrice: Number(isEbook ? (book.originalPriceEbook || 119000) : (book.originalPricePaper || 169000)),
          quantity: 1,
          checked: true,
          cover: book.cover || book.coverUrl || booksData[0]?.cover,
          type: isEbook ? 'ebook' : 'physical',
        };
      }

      // If user is logged in and bookId is a backend UUID, call API
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
          // Fallback to local state update on network or server error
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

  // Update quantity of an item
  const updateQuantity = useCallback(
    async (id, delta) => {
      const targetItem = cartItems.find((i) => i.id === id);
      if (!targetItem) return;

      const newQty = Math.max(1, Math.min(99, targetItem.quantity + delta));
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

  // Toggle item selection
  const toggleCheckItem = useCallback(
    (id) => {
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
    [user, persistCart]
  );

  // Toggle all items in a store
  const toggleStoreCheck = useCallback(
    (storeId, checked) => {
      setCartItems((prev) => {
        const nextState = prev.map((item) => {
          if (item.storeId === storeId || item.publisher === storeId) {
            return { ...item, checked };
          }
          return item;
        });
        persistCart(nextState, user);
        return nextState;
      });
    },
    [user, persistCart]
  );

  // Toggle all items in cart
  const toggleAll = useCallback(
    (checked) => {
      setCartItems((prev) => {
        const nextState = prev.map((item) => ({ ...item, checked }));
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
        // Fallback
      }
    }
    setCartItems([]);
    persistCart([], user);
  }, [isLoggedIn, user, persistCart]);

  // Group items by store
  const storeGroups = useMemo(() => {
    const groups = {};
    cartItems.forEach((item) => {
      const sId = item.storeId || item.bookId || 'store-default';
      if (!groups[sId]) {
        groups[sId] = {
          id: sId,
          name: item.publisher || 'Gian Hàng HUKI',
          badge: 'HUKI Partner',
          tag: (item.publisher || 'HK').substring(0, 2).toUpperCase(),
          tagBg: 'bg-theme-primary',
          vouchersCount: 1,
          freeShipThreshold: 200000,
          items: [],
        };
      }
      groups[sId].items.push(item);
    });
    return Object.values(groups);
  }, [cartItems]);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  const checkedSubtotal = useMemo(
    () => cartItems.filter((i) => i.checked).reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  const totalItemsCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const checkedItemsCount = useMemo(
    () => cartItems.filter((i) => i.checked).reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const hasPhysicalItems = useMemo(
    () => cartItems.some((i) => i.checked && i.type === 'physical'),
    [cartItems]
  );

  const hasEbookItems = useMemo(
    () => cartItems.some((i) => i.checked && i.type === 'ebook'),
    [cartItems]
  );

  const allChecked = useMemo(
    () => cartItems.length > 0 && cartItems.every((i) => i.checked),
    [cartItems]
  );

  const value = useMemo(
    () => ({
      cartItems,
      storeGroups,
      addItem,
      addToCart,
      removeFromCart,
      updateQuantity,
      toggleCheckItem,
      toggleStoreCheck,
      toggleAll,
      clearCart,
      subtotal,
      checkedSubtotal,
      totalItemsCount,
      checkedItemsCount,
      hasPhysicalItems,
      hasEbookItems,
      allChecked,
      isLoading,
      refreshCart: fetchServerCart,
    }),
    [
      cartItems,
      storeGroups,
      addItem,
      addToCart,
      removeFromCart,
      updateQuantity,
      toggleCheckItem,
      toggleStoreCheck,
      toggleAll,
      clearCart,
      subtotal,
      checkedSubtotal,
      totalItemsCount,
      checkedItemsCount,
      hasPhysicalItems,
      hasEbookItems,
      allChecked,
      isLoading,
      fetchServerCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
