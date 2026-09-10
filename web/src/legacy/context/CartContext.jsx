import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { booksData } from '../data/mockData';
import { useToast } from './ToastContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { showToast } = useToast();

  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = window.localStorage.getItem('huki.cart.items');
      if (savedCart) return JSON.parse(savedCart);
    } catch {
      // Fall back to demo items if persisted data is unavailable.
    }
    return [
    {
      id: "atomic-habits-paper",
      bookId: "atomic-habits",
      title: "Atomic Habits – Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ",
      author: "James Clear",
      publisher: "Alpha Books Official",
      storeId: "store-alpha",
      format: "Sách giấy",
      formatTag: "Bìa mềm cao cấp · Tái bản 2025",
      price: 129000,
      originalPrice: 169000,
      quantity: 1,
      checked: true,
      cover: booksData[0]?.cover || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcU26O9RXxuUE6tEdj3lV_IkEPeAEbV_XINI408XHscj13B9Jt1eC7uQrRDXyu3byi6MeVzLdEBIBHf5L8tmx014XlWWOzO01LApRCq4Le5GtlpUO9P3z4OnOy3u0_l9rOnFsQkRnUijXOyWPLwafoYZuaoB7ydHbcfLvstaGLDTSn3h3RHfCblHEFxRUKl6kfs2bFvKAg1rLzGwyefjfrMpJky9GO477VUaNcWoT2osMgxUat2Zyelw',
      type: "physical"
    },
    {
      id: "deep-work-ebook",
      bookId: "deep-work",
      title: "Deep Work – Làm Ra Làm, Chơi Ra Chơi",
      author: "Cal Newport",
      publisher: "Alpha Books Official",
      storeId: "store-alpha",
      format: "Ebook Số",
      formatTag: "Ebook (EPUB + PDF) · DRM vĩnh viễn",
      price: 79000,
      originalPrice: 119000,
      quantity: 1,
      checked: true,
      cover: booksData[3]?.cover || 'https://lh3.googleusercontent.com/aida-public/AB6AXuA62ygeX4HioU7gYvlmmpgNNTgKeSlXvDw5GwpDj3xf04iSpU9ZfBZRnLQe5nXAwrtqhxPFu5fXkQvCqGcoeEHZIEGJex1LPIFiTOujpnZCNePfHl6gsENVGgOVLcNp7w4k4HmoZgB_6MZWF0P5CfmSkRiecUcK8EzdW9WXLK6wAcyosRBMSruNquOVVJB4fUDfII1Gy_YE6RnTKZ3ZYQhaR9pi4F8WdoJZBwqF8Sa_BVVSXkA4rXxIVQ',
      type: "ebook"
    },
    {
      id: "tam-ly-hoc-paper",
      bookId: "tam-ly-hoc-ve-tien",
      title: "Tâm Lý Học Về Tiền (The Psychology of Money)",
      author: "Morgan Housel",
      publisher: "Nhà Sách First News Trí Việt",
      storeId: "store-firstnews",
      format: "Sách giấy",
      formatTag: "Bìa mềm dập nổi · Tập 1",
      price: 149000,
      originalPrice: 189000,
      quantity: 2,
      checked: true,
      cover: booksData[2]?.cover || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBJ9lJefwh7SJsM-d-yKmavwMuSTbUtKJj-cZwvWAegojU70CFmrOCJdnnT-shs6lLglKJfVIuXwIkabc64a9-lG6Z_KTtOg00vErrb2W1ic9ON7-F6e9uHNzAnuFWZ4UZCXJDDSl4bsQuOlrncR7TRp6uTxk8DCht7yUhEocR1qaEHvjqIhM4S0r-q0WQh9GxdSZd78yx8oeuPJOt3s9YSFMLgMkfY4ahtq9qAlTkASPMz8nMvj-3f6g',
      type: "physical"
    }
    ];
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('huki.cart.items', JSON.stringify(cartItems));
    } catch {
      // Keep cart functional in memory when storage is unavailable.
    }
  }, [cartItems]);

  // Universal Add Item (supports both object and (book, format) signatures)
  const addItem = (itemOrBook, format = 'ebook') => {
    if (itemOrBook && typeof itemOrBook === 'object' && itemOrBook.title && itemOrBook.price) {
      // Direct item object
      setCartItems(prev => {
        const existingIdx = prev.findIndex(i => i.id === itemOrBook.id || (i.bookId === itemOrBook.bookId && i.format === itemOrBook.format));
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + (itemOrBook.quantity || 1),
            checked: true
          };
          return updated;
        }
        return [
          ...prev,
          {
            id: itemOrBook.id || `item-${Date.now()}`,
            bookId: itemOrBook.bookId || itemOrBook.id,
            title: itemOrBook.title,
            author: itemOrBook.author || 'Đang cập nhật',
            publisher: itemOrBook.publisher || 'Alpha Books Official',
            storeId: itemOrBook.storeId || (itemOrBook.publisher?.includes('First News') ? 'store-firstnews' : 'store-alpha'),
            format: itemOrBook.format || (itemOrBook.type === 'ebook' ? 'Ebook Số' : 'Sách giấy'),
            formatTag: itemOrBook.formatTag || (itemOrBook.type === 'ebook' ? 'Ebook DRM Bản quyền' : 'Bìa mềm cao cấp'),
            price: itemOrBook.price,
            originalPrice: itemOrBook.originalPrice || itemOrBook.price * 1.3,
            quantity: itemOrBook.quantity || 1,
            checked: true,
            cover: itemOrBook.cover || itemOrBook.image || booksData[0]?.cover,
            type: itemOrBook.type || (itemOrBook.format?.toLowerCase().includes('ebook') ? 'ebook' : 'physical')
          }
        ];
      });
    } else {
      // (book, format) style
      const book = itemOrBook;
      const isEbook = format === 'ebook';
      const isCombo = format === 'combo' || format === 'hybrid';
      const price = isEbook ? book.priceEbook : (isCombo ? book.priceCombo : book.pricePaper);
      const formatName = isEbook ? 'Ebook Số' : (isCombo ? 'Combo Hybrid' : 'Sách giấy');

      const newItem = {
        id: `${book.id}-${format}-${Date.now()}`,
        bookId: book.id,
        title: book.title,
        author: book.author || 'Tác giả',
        publisher: book.publisher || 'Alpha Books Official',
        storeId: book.publisher?.includes('First News') ? 'store-firstnews' : 'store-alpha',
        format: formatName,
        formatTag: isEbook ? 'Ebook DRM Bản quyền' : (isCombo ? 'Sách Giấy + Ebook trọn đời' : 'Bìa mềm cao cấp'),
        price: price || 79000,
        originalPrice: isEbook ? (book.originalPriceEbook || 119000) : (book.originalPricePaper || 169000),
        quantity: 1,
        checked: true,
        cover: book.cover || booksData[0]?.cover,
        type: isEbook ? 'ebook' : 'physical'
      };

      setCartItems(prev => [...prev, newItem]);
      showToast(`Đã thêm "${book.title}" vào giỏ hàng!`, 'success');
    }
  };

  const addToCart = addItem;

  const removeFromCart = (id) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
    showToast('Đã xóa ấn phẩm khỏi giỏ hàng', 'info');
  };

  const updateQuantity = (id, delta) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, Math.min(99, item.quantity + delta));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const toggleCheckItem = (id) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, checked: !item.checked };
      }
      return item;
    }));
  };

  const toggleStoreCheck = (storeId, checked) => {
    setCartItems(prev => prev.map(item => {
      if (item.storeId === storeId || item.publisher === storeId) {
        return { ...item, checked };
      }
      return item;
    }));
  };

  const toggleAll = (checked) => {
    setCartItems(prev => prev.map(item => ({ ...item, checked })));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  // Group items by store
  const storeGroups = useMemo(() => {
    const groups = {};
    cartItems.forEach(item => {
      const sId = item.storeId || (item.publisher?.includes('First News') ? 'store-firstnews' : 'store-alpha');
      if (!groups[sId]) {
        groups[sId] = {
          id: sId,
          name: item.publisher || 'Alpha Books Official',
          badge: sId === 'store-alpha' ? 'Chính Hãng' : 'HUKI Partner',
          tag: sId === 'store-alpha' ? 'αB' : 'FN',
          tagBg: sId === 'store-alpha' ? 'bg-theme-primary' : 'bg-theme-secondary',
          vouchersCount: sId === 'store-alpha' ? 2 : 1,
          freeShipThreshold: 200000,
          items: []
        };
      }
      groups[sId].items.push(item);
    });
    return Object.values(groups);
  }, [cartItems]);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    [cartItems]
  );

  const checkedSubtotal = useMemo(
    () => cartItems.filter(i => i.checked).reduce((sum, item) => sum + (item.price * item.quantity), 0),
    [cartItems]
  );

  const totalItemsCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const checkedItemsCount = useMemo(
    () => cartItems.filter(i => i.checked).reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const hasPhysicalItems = useMemo(
    () => cartItems.some(i => i.checked && i.type === 'physical'),
    [cartItems]
  );

  const hasEbookItems = useMemo(
    () => cartItems.some(i => i.checked && i.type === 'ebook'),
    [cartItems]
  );

  const allChecked = useMemo(
    () => cartItems.length > 0 && cartItems.every(i => i.checked),
    [cartItems]
  );

  return (
    <CartContext.Provider value={{
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
      allChecked
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
