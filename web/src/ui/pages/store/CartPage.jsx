import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import EmptyState from '../../components/common/EmptyState';

const AVAILABLE_VOUCHERS = [
  {
    code: 'HUKI30',
    name: 'Mã Giảm 30K HUKI',
    discount: 30000,
    minSpend: 300000,
    desc: 'Giảm 30.000đ cho đơn từ 300.000đ',
    badge: 'Phổ biến',
  },
  {
    code: 'FREESHIP',
    name: 'Miễn Phí Vận Chuyển',
    discount: 25000,
    minSpend: 200000,
    desc: 'Giảm 25.000đ phí giao hàng sách giấy',
    badge: 'Freeship',
  },
  {
    code: 'HUKI50',
    name: 'Đại Tiệc Sách 50K',
    discount: 50000,
    minSpend: 500000,
    desc: 'Giảm 50.000đ cho đơn hàng từ 500.000đ',
    badge: 'VIP',
  },
];

export default function CartPage() {
  const navigate = useNavigate();
  const {
    cartItems,
    storeGroups,
    toggleCheckItem,
    toggleStoreCheck,
    toggleAll,
    updateQuantity,
    removeFromCart,
    addItem,
    checkedSubtotal,
    checkedItemsCount,
    allChecked,
    hasPhysicalItems,
    hasEbookItems,
  } = useCart();
  const { showToast } = useToast();

  // Saved for later items
  const [savedItems, setSavedItems] = useState([
    {
      id: 'saved-1',
      title: 'Dám Bị Ghét',
      author: 'Koga Fumitake, Kishimi Ichiro',
      format: 'Ebook Số',
      price: 69000,
      cover:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuB5Gv7-f0mBV5kDP9TtiJgBe-rO2H5RTSZ_wF-QUbFiSlqQ1zZbt4-BIFcegGBFFvO9XgoP6E9VS26FRTTqfHESb2APnwNLjZJ8Pr2XlxnivsxWYSoLSYinbHiVjVfoXe2eV_dCRoNVAYLHCwdeMv3-SBlzX0G6f9Qb47tJlGsPMplBKFZiH-DgQZIeT9DN0vWURTxVrKgD4GrNomOOB1-G8054ZJabupcr8OZiQmTFYMG1SawJQ5HRbw',
    },
    {
      id: 'saved-2',
      title: 'Sapiens – Lược Sử Loài Người',
      author: 'Yuval Noah Harari',
      format: 'Sách giấy',
      price: 185000,
      cover:
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    },
  ]);

  // Vouchers state
  const [selectedVoucher, setSelectedVoucher] = useState(AVAILABLE_VOUCHERS[0]);
  const [showVoucherAccordion, setShowVoucherAccordion] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Calculations
  const checkedItems = cartItems.filter((i) => i.checked);
  const rawOriginalSubtotal = checkedItems.reduce(
    (acc, item) => acc + (item.originalPrice || item.price * 1.3) * item.quantity,
    0
  );
  const directDiscount = rawOriginalSubtotal - checkedSubtotal;

  // Shop vouchers discount calculation
  const shopDiscount = checkedSubtotal >= 200000 ? 20000 : 0;
  const hukiDiscount =
    selectedVoucher && checkedSubtotal >= selectedVoucher.minSpend
      ? selectedVoucher.discount
      : 0;

  // Shipping fee: 25.000đ if any physical book is selected, free if physical items >= 250k
  const physicalSubtotal = checkedItems
    .filter((i) => i.type === 'physical')
    .reduce((acc, i) => acc + i.price * i.quantity, 0);
  const shippingFee = hasPhysicalItems
    ? physicalSubtotal >= 250000
      ? 0
      : 25000
    : 0;
  const grandTotal = Math.max(
    0,
    checkedSubtotal - shopDiscount - hukiDiscount + shippingFee
  );

  const handleMoveToCart = (item) => {
    setSavedItems((prev) => prev.filter((i) => i.id !== item.id));
    addItem({
      id: `saved-${item.id}-${Date.now()}`,
      title: item.title,
      author: item.author,
      format: item.format,
      price: item.price,
      quantity: 1,
      cover: item.cover,
      type: item.format.toLowerCase().includes('ebook') ? 'ebook' : 'physical',
    });
    showToast(
      {
        title: 'Đã chuyển vào giỏ',
        message: `Đã chuyển "${item.title}" vào giỏ hàng của bạn!`,
      },
      'success'
    );
  };

  const handleSaveForLater = (item) => {
    removeFromCart(item.id);
    setSavedItems((prev) => [
      ...prev,
      {
        id: `saved-${Date.now()}`,
        title: item.title,
        author: item.author || 'Tác giả',
        format: item.format,
        price: item.price,
        cover: item.cover,
      },
    ]);
    showToast(
      {
        title: 'Đã lưu lại',
        message: `Đã lưu ấn phẩm "${item.title}" vào danh sách mua sau.`,
      },
      'info'
    );
  };

  const handleSelectVoucher = (voucher) => {
    setSelectedVoucher(voucher);
    setShowVoucherAccordion(false);
    showToast(
      {
        title: 'Đã áp dụng mã giảm giá',
        message: `Đã áp dụng mã ${voucher.code} (${voucher.desc})!`,
      },
      'success'
    );
  };

  const handleCheckout = () => {
    if (checkedItemsCount === 0) {
      showToast(
        {
          title: 'Chưa chọn ấn phẩm',
          message: 'Vui lòng tích chọn ít nhất 1 ấn phẩm để tiến hành đặt hàng.',
        },
        'warning'
      );
      return;
    }
    navigate('/checkout');
  };

  return (
    <div className="w-full bg-[var(--theme-background,#F2FBF9)] text-[var(--theme-text,#1c1b1f)] min-h-screen pb-16 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-[var(--theme-text-muted,#49454f)] mb-5">
          <Link
            className="hover:text-[var(--theme-primary,#003B2B)] transition-colors flex items-center gap-1 font-medium"
            to="/"
          >
            <span className="material-symbols-outlined text-[15px]">home</span>
            Trang chủ
          </Link>
          <span className="opacity-40">/</span>
          <Link
            className="hover:text-[var(--theme-primary,#003B2B)] transition-colors font-medium"
            to="/books"
          >
            Sàn TMĐT Sách
          </Link>
          <span className="opacity-40">/</span>
          <span className="font-bold text-[var(--theme-text,#1c1b1f)]">
            Giỏ hàng
          </span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-[var(--theme-border,#e8e5df)] pb-4 mb-6 gap-3">
          <div className="flex items-baseline gap-3.5">
            <h1 className="font-editorial text-2xl sm:text-3xl font-extrabold text-[var(--theme-text,#1c1b1f)] tracking-tight">
              Giỏ Hàng
            </h1>
            <span className="text-xs sm:text-sm text-[var(--theme-text-muted,#49454f)] font-medium">
              ({cartItems.length} ấn phẩm · {checkedItemsCount} đã chọn)
            </span>
          </div>
          <Link
            to="/books"
            className="text-xs font-bold text-[var(--theme-primary,#003B2B)] hover:underline flex items-center gap-1 self-start sm:self-auto group"
          >
            <span className="material-symbols-outlined text-[16px] transition-transform group-hover:-translate-x-0.5">
              arrow_back
            </span>
            Tiếp tục mua sách
          </Link>
        </div>

        {/* Free Shipping & Benefits Banner */}
        {!bannerDismissed && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-[var(--theme-secondary-subtle,#e0f2fe)]/80 via-[var(--theme-surface,#ffffff)] to-[var(--theme-secondary-subtle,#e0f2fe)]/40 border border-[var(--theme-primary,#003B2B)]/20 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-[var(--theme-primary,#003B2B)] text-white flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">
                  local_shipping
                </span>
              </span>
              <div>
                <span className="font-bold text-xs sm:text-sm text-[var(--theme-text,#1c1b1f)] block">
                  Đặc quyền Ebook &amp; Miễn phí vận chuyển HUKI
                </span>
                <span className="text-xs text-[var(--theme-text-muted,#49454f)]">
                  {hasEbookItems && hasPhysicalItems
                    ? '⚡ Ebook số kích hoạt ngay tức thì + Miễn phí vận chuyển cho đơn sách giấy từ 250.000đ.'
                    : hasEbookItems
                    ? '⚡ Đơn hàng Ebook bản quyền DRM được miễn phí 100% chi phí vận chuyển.'
                    : '📦 Miễn phí vận chuyển toàn quốc cho đơn sách giấy từ 250.000đ.'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-[var(--theme-text-muted,#49454f)] hover:text-[var(--theme-text,#1c1b1f)] p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Đóng thông báo"
              aria-label="Đóng thông báo"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* Main Grid: Golden Ratio (8 Cols Left / 4 Cols Right) */}
        {cartItems.length === 0 ? (
          <EmptyState
            icon="shopping_cart_off"
            title="Giỏ hàng của bạn đang trống"
            description="Hàng ngàn tựa sách giá trị, Ebook bản quyền DRM và sách nói đang chờ bạn khám phá trên HUKI."
            actionText="Khám Phá Sách Ngay"
            actionLink="/books"
            actionIcon="menu_book"
          />
        ) : (
          <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left Column (8 Cols): Select All Toolbar + Store Groups + Items */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
              {/* Select All Toolbar */}
              <div className="bg-[var(--theme-surface,#ffffff)] rounded-xl p-3.5 border border-[var(--theme-border,#e8e5df)] flex items-center justify-between text-xs font-semibold shadow-xs">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="w-4 h-4 rounded text-[var(--theme-primary,#003B2B)] focus:ring-[var(--theme-primary,#003B2B)] border-[var(--theme-border,#e8e5df)] cursor-pointer"
                  />
                  <span>Chọn tất cả ({cartItems.length} ấn phẩm)</span>
                </label>
                <div className="hidden sm:grid grid-cols-12 gap-4 flex-1 max-w-[380px] text-right text-[var(--theme-text-muted,#49454f)] pr-4">
                  <span className="col-span-4">Đơn giá</span>
                  <span className="col-span-4 text-center">Số lượng</span>
                  <span className="col-span-4">Thành tiền</span>
                </div>
              </div>

              {/* Store Groups */}
              {storeGroups.map((store) => (
                <div
                  key={store.id}
                  className="bg-[var(--theme-surface,#ffffff)] rounded-2xl border border-[var(--theme-border,#e8e5df)] shadow-sm overflow-hidden"
                >
                  {/* Store Header */}
                  <div className="bg-[var(--theme-secondary-subtle,#f0fdf4)]/50 px-4 py-3 border-b border-[var(--theme-border,#e8e5df)] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={store.items.every((i) => i.checked)}
                        onChange={(e) => toggleStoreCheck(store.id, e.target.checked)}
                        className="w-4 h-4 rounded text-[var(--theme-primary,#003B2B)] focus:ring-[var(--theme-primary,#003B2B)] border-[var(--theme-border,#e8e5df)] cursor-pointer"
                      />
                      <span
                        className={`w-6 h-6 rounded-md ${store.tagBg} text-white text-[10px] font-bold flex items-center justify-center shadow-2xs`}
                      >
                        {store.tag}
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-[var(--theme-text,#1c1b1f)] flex items-center gap-1">
                        {store.name}
                        <span
                          className="material-symbols-outlined text-[15px] text-[var(--theme-primary,#003B2B)]"
                          title="Gian hàng chính hãng"
                        >
                          verified
                        </span>
                      </span>
                      <span className="bg-[var(--theme-primary,#003B2B)]/10 text-[var(--theme-primary,#003B2B)] text-[10px] px-2 py-0.5 rounded-full font-semibold hidden sm:inline">
                        {store.badge}
                      </span>
                    </div>

                    <span className="text-[11px] text-[var(--theme-text-muted,#49454f)] font-medium">
                      {store.items.length} món
                    </span>
                  </div>

                  {/* Items in Store */}
                  <div className="divide-y divide-[var(--theme-border,#e8e5df)]/40 p-2 sm:p-4">
                    {store.items.map((item) => {
                      const bookPath = `/book/${item.book?.slug || item.slug || item.bookId || item.id}`;

                      return (
                        <div
                          key={item.id}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={() => toggleCheckItem(item.id)}
                              className="w-4 h-4 rounded text-[var(--theme-primary,#003B2B)] focus:ring-[var(--theme-primary,#003B2B)] border-[var(--theme-border,#e8e5df)] mt-1 cursor-pointer"
                            />
                            <Link
                              to={bookPath}
                              className="w-16 h-22 aspect-[2/3] rounded-lg overflow-hidden shrink-0 bg-neutral-100 border border-[var(--theme-border,#e8e5df)] shadow-2xs group-hover:opacity-90 transition-opacity"
                            >
                              <img
                                className="w-full h-full object-cover"
                                alt={item.title}
                                src={item.cover}
                                loading="lazy"
                              />
                            </Link>
                            <div className="flex flex-col gap-1 min-w-0 pr-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--theme-primary,#003B2B)]/10 text-[var(--theme-primary,#003B2B)] w-fit">
                                <span className="material-symbols-outlined text-[12px]">
                                  {item.type === 'ebook' ? 'bolt' : 'local_shipping'}
                                </span>
                                {item.format}
                              </span>
                              <Link
                                to={bookPath}
                                className="font-bold text-xs sm:text-sm text-[var(--theme-text,#1c1b1f)] hover:text-[var(--theme-primary,#003B2B)] transition-colors line-clamp-2 leading-snug"
                              >
                                {item.title}
                              </Link>
                              <span className="text-xs text-[var(--theme-text-muted,#49454f)]">
                                Tác giả: {item.author}
                              </span>
                              <span className="text-[11px] text-[var(--theme-text-muted,#49454f)]/80">
                                {item.formatTag}
                              </span>
                            </div>
                          </div>

                          {/* Price, Quantity, Subtotal */}
                          <div className="flex items-center justify-between sm:justify-end gap-5 pl-7 sm:pl-0 shrink-0">
                            {/* Unit Price */}
                            <div className="text-left sm:text-right min-w-[70px]">
                              <span className="text-xs sm:text-sm font-bold text-[var(--theme-text,#1c1b1f)] block">
                                {item.price.toLocaleString('vi-VN')}đ
                              </span>
                              {item.originalPrice && item.originalPrice > item.price && (
                                <span className="text-[11px] text-[var(--theme-text-muted,#49454f)] line-through block">
                                  {item.originalPrice.toLocaleString('vi-VN')}đ
                                </span>
                              )}
                            </div>

                            {/* Quantity selector */}
                            <div className="flex items-center border border-[var(--theme-border,#e8e5df)] rounded-lg overflow-hidden bg-[var(--theme-surface,#ffffff)]">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                disabled={item.quantity <= 1}
                                className="w-7 h-7 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Giảm số lượng"
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  remove
                                </span>
                              </button>
                              <span className="w-7 text-center font-bold text-xs">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                disabled={item.quantity >= 99}
                                className="w-7 h-7 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Tăng số lượng"
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  add
                                </span>
                              </button>
                            </div>

                            {/* Line Subtotal */}
                            <div className="text-right min-w-[85px]">
                              <span className="text-xs sm:text-sm font-bold text-[var(--theme-primary,#003B2B)] block">
                                {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                              </span>
                            </div>

                            {/* Actions: Save for later & Remove */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleSaveForLater(item)}
                                className="p-1.5 rounded-lg text-[var(--theme-text-muted,#49454f)] hover:text-[var(--theme-primary,#003B2B)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                title="Lưu lại mua sau"
                                aria-label="Lưu lại mua sau"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  bookmark_border
                                </span>
                              </button>
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="p-1.5 rounded-lg text-[var(--theme-text-muted,#49454f)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                title="Xóa ấn phẩm"
                                aria-label="Xóa ấn phẩm khỏi giỏ hàng"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  delete
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Saved For Later Section */}
              {savedItems.length > 0 && (
                <div className="bg-[var(--theme-surface,#ffffff)] rounded-2xl border border-[var(--theme-border,#e8e5df)] p-5 shadow-xs">
                  <h3 className="font-editorial text-base font-bold text-[var(--theme-text,#1c1b1f)] mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[var(--theme-primary,#003B2B)]">
                      bookmark
                    </span>
                    Ấn Phẩm Lưu Lại Mua Sau ({savedItems.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedItems.map((sItem) => (
                      <div
                        key={sItem.id}
                        className="p-3 rounded-xl bg-[var(--theme-background,#F2FBF9)]/60 border border-[var(--theme-border,#e8e5df)]/60 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            className="w-11 h-16 rounded object-cover border border-[var(--theme-border,#e8e5df)] shrink-0"
                            alt={sItem.title}
                            src={sItem.cover}
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-[var(--theme-text,#1c1b1f)] line-clamp-1">
                              {sItem.title}
                            </h4>
                            <span className="text-[11px] text-[var(--theme-text-muted,#49454f)] block truncate">
                              {sItem.author}
                            </span>
                            <span className="text-xs font-bold text-[var(--theme-primary,#003B2B)]">
                              {sItem.price.toLocaleString('vi-VN')}đ
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleMoveToCart(sItem)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--theme-primary,#003B2B)] text-white text-xs font-semibold hover:opacity-95 transition-all flex items-center gap-1 shrink-0 shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            add_shopping_cart
                          </span>
                          Thêm Lại
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (4 Cols): Sticky Summary & Checkout Action */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
              <div className="sticky top-20 bg-[var(--theme-surface,#ffffff)] border border-[var(--theme-border,#e8e5df)] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                <h2 className="font-editorial text-lg font-bold text-[var(--theme-text,#1c1b1f)] pb-3 border-b border-[var(--theme-border,#e8e5df)]/60 flex items-center justify-between">
                  <span>Tóm Tắt Đơn Hàng</span>
                  <span className="text-xs font-normal text-[var(--theme-text-muted,#49454f)]">
                    {checkedItemsCount} ấn phẩm
                  </span>
                </h2>

                {/* Inline Accordion Voucher Box (No Popup Policy) */}
                <div className="rounded-xl border border-[var(--theme-border,#e8e5df)] bg-[var(--theme-background,#F2FBF9)]/50 overflow-hidden transition-all">
                  <div
                    onClick={() => setShowVoucherAccordion((prev) => !prev)}
                    className="p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[18px] text-[var(--theme-primary,#003B2B)] shrink-0">
                        confirmation_number
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[var(--theme-text,#1c1b1f)] block truncate">
                          {selectedVoucher ? selectedVoucher.name : 'Chọn mã giảm giá HUKI'}
                        </span>
                        <span className="text-[11px] text-[var(--theme-text-muted,#49454f)] block truncate">
                          {selectedVoucher ? selectedVoucher.desc : 'Tiết kiệm thêm cho đơn hàng'}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`material-symbols-outlined text-[18px] text-[var(--theme-text-muted,#49454f)] transition-transform duration-200 ${
                        showVoucherAccordion ? 'rotate-180' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </div>

                  {/* Accordion Content */}
                  {showVoucherAccordion && (
                    <div className="p-3 pt-0 border-t border-[var(--theme-border,#e8e5df)]/60 flex flex-col gap-2 animate-in fade-in duration-200">
                      <span className="text-[11px] font-semibold text-[var(--theme-text-muted,#49454f)] mt-2">
                        Mã khuyến mãi khả dụng:
                      </span>
                      {AVAILABLE_VOUCHERS.map((v) => {
                        const isSelected = selectedVoucher?.code === v.code;
                        const isEligible = checkedSubtotal >= v.minSpend;

                        return (
                          <div
                            key={v.code}
                            onClick={() => handleSelectVoucher(v)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'border-[var(--theme-primary,#003B2B)] bg-[var(--theme-primary,#003B2B)]/10 font-bold'
                                : 'border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)] hover:border-[var(--theme-primary,#003B2B)]/50'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-[var(--theme-primary,#003B2B)]">
                                  {v.code}
                                </span>
                                <span className="text-[10px] bg-[var(--theme-primary,#003B2B)]/15 text-[var(--theme-primary,#003B2B)] px-1.5 py-0.2 rounded font-semibold">
                                  {v.badge}
                                </span>
                              </div>
                              <span className="text-[11px] text-[var(--theme-text-muted,#49454f)] block">
                                {v.desc}
                              </span>
                            </div>
                            <span className="material-symbols-outlined text-[18px] text-[var(--theme-primary,#003B2B)]">
                              {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Calculations Breakdown */}
                <div className="space-y-2.5 text-xs text-[var(--theme-text-muted,#49454f)]">
                  <div className="flex justify-between">
                    <span>Tạm tính ({checkedItemsCount} ấn phẩm):</span>
                    <span className="font-semibold text-[var(--theme-text,#1c1b1f)]">
                      {checkedSubtotal.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  {directDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Tiết kiệm trực tiếp:</span>
                      <span className="font-semibold">
                        -{directDiscount.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  )}
                  {shopDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Voucher Gian hàng:</span>
                      <span className="font-semibold">
                        -{shopDiscount.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  )}
                  {hukiDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Voucher HUKI ({selectedVoucher?.code}):</span>
                      <span className="font-semibold">
                        -{hukiDiscount.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Phí vận chuyển sách giấy:</span>
                    <span className="font-semibold text-[var(--theme-text,#1c1b1f)]">
                      {shippingFee === 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          MIỄN PHÍ
                        </span>
                      ) : (
                        `${shippingFee.toLocaleString('vi-VN')}đ`
                      )}
                    </span>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="pt-3 border-t border-[var(--theme-border,#e8e5df)]/60 flex items-baseline justify-between">
                  <span className="font-bold text-sm text-[var(--theme-text,#1c1b1f)]">
                    Tổng thanh toán:
                  </span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-[var(--theme-primary,#003B2B)] block">
                      {grandTotal.toLocaleString('vi-VN')}đ
                    </span>
                    <span className="text-[11px] text-[var(--theme-text-muted,#49454f)]">
                      (Đã bao gồm VAT &amp; phí DRM)
                    </span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <button
                  onClick={handleCheckout}
                  disabled={checkedItemsCount === 0}
                  className="w-full h-12 bg-[var(--theme-primary,#003B2B)] hover:opacity-90 text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    shopping_cart_checkout
                  </span>
                  Tiến Hành Đặt Hàng ({checkedItemsCount})
                </button>

                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-[var(--theme-text-muted,#49454f)] pt-2 border-t border-[var(--theme-border,#e8e5df)]/60">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="material-symbols-outlined text-[16px] text-[var(--theme-primary,#003B2B)]">
                      verified_user
                    </span>
                    <span>100% Sách Thật</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="material-symbols-outlined text-[16px] text-[var(--theme-primary,#003B2B)]">
                      bolt
                    </span>
                    <span>Ebook Đọc Ngay</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="material-symbols-outlined text-[16px] text-[var(--theme-primary,#003B2B)]">
                      published_with_changes
                    </span>
                    <span>Đổi Trả 7 Ngày</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}