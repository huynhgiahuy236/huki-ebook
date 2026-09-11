import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

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
    hasEbookItems
  } = useCart();
  const { showToast } = useToast();

  // Saved for later items
  const [savedItems, setSavedItems] = useState([
    {
      id: 'saved-1',
      title: 'Dám Bị Ghét',
      author: 'Koga Fumitake, Kishimi Ichiro',
      format: 'Ebook',
      price: 69000,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5Gv7-f0mBV5kDP9TtiJgBe-rO2H5RTSZ_wF-QUbFiSlqQ1zZbt4-BIFcegGBFFvO9XgoP6E9VS26FRTTqfHESb2APnwNLjZJ8Pr2XlxnivsxWYSoLSYinbHiVjVfoXe2eV_dCRoNVAYLHCwdeMv3-SBlzX0G6f9Qb47tJlGsPMplBKFZiH-DgQZIeT9DN0vWURTxVrKgD4GrNomOOB1-G8054ZJabupcr8OZiQmTFYMG1SawJQ5HRbw'
    },
    {
      id: 'saved-2',
      title: 'Sapiens – Lược Sử Loài Người',
      author: 'Yuval Noah Harari',
      format: 'Sách giấy',
      price: 185000,
      cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'
    }
  ]);

  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Calculations
  const checkedItems = cartItems.filter(i => i.checked);
  const rawOriginalSubtotal = checkedItems.reduce((acc, item) => acc + ((item.originalPrice || item.price * 1.3) * item.quantity), 0);
  const directDiscount = rawOriginalSubtotal - checkedSubtotal;

  // Promotion/voucher is deferred; totals only include direct product pricing.
  const shopDiscount = 0;
  const hukiDiscount = 0;

  // Shipping fee: 25.000đ if any physical book is selected, free if physical items >= 250k
  const physicalSubtotal = checkedItems.filter(i => i.type === 'physical').reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const shippingFee = hasPhysicalItems ? (physicalSubtotal >= 250000 ? 0 : 25000) : 0;
  const grandTotal = Math.max(0, checkedSubtotal - shopDiscount - hukiDiscount + shippingFee);

  const handleMoveToCart = (item) => {
    setSavedItems(prev => prev.filter(i => i.id !== item.id));
    addItem({
      id: `saved-${item.id}-${Date.now()}`,
      title: item.title,
      author: item.author,
      format: item.format,
      price: item.price,
      quantity: 1,
      cover: item.cover,
      type: item.format.toLowerCase().includes('ebook') ? 'ebook' : 'physical'
    });
    showToast(`Đã chuyển "${item.title}" vào giỏ hàng!`, 'success');
  };

  const handleSaveForLater = (item) => {
    removeFromCart(item.id);
    setSavedItems(prev => [
      ...prev,
      {
        id: `saved-${Date.now()}`,
        title: item.title,
        author: item.author || 'Tác giả',
        format: item.format,
        price: item.price,
        cover: item.cover
      }
    ]);
    showToast(`Đã lưu "${item.title}" để mua sau!`, 'info');
  };

  const handleCheckout = () => {
    if (checkedItemsCount === 0) {
      showToast('Vui lòng chọn ít nhất 1 ấn phẩm để thanh toán!', 'warning');
      return;
    }
    navigate('/checkout');
  };

  return (
    <div className="w-full bg-background text-on-surface font-body-md text-body-md min-h-screen pb-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-on-surface/60 mb-5">
          <Link className="hover:text-primary transition-colors flex items-center gap-1" to="/">
            <span className="material-symbols-outlined text-[15px]">home</span>
            Trang chủ
          </Link>
          <span className="text-outline-variant">/</span>
          <Link className="hover:text-primary transition-colors" to="/books">Sàn TMĐT Sách</Link>
          <span className="text-outline-variant">/</span>
          <span className="text-on-surface font-semibold">Giỏ hàng</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-outline-variant/40 pb-4 mb-6 gap-3">
          <div className="flex items-baseline gap-4">
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
              Giỏ Hàng
            </h1>
            <span className="text-on-surface-variant text-xs sm:text-sm">
              ({cartItems.length} sản phẩm · {checkedItemsCount} đã chọn)
            </span>
          </div>
          <Link
            to="/books"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Tiếp tục chọn
          </Link>
        </div>

        {/* Top Free Shipping Banner */}
        {!bannerDismissed && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-secondary-fixed/20 border border-primary/20 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">local_shipping</span>
              </span>
              <div>
                <span className="font-bold text-xs sm:text-sm text-on-surface block">
                  Đặc quyền Ebook &amp; Miễn phí vận chuyển HUKI
                </span>
                <span className="text-xs text-on-surface-variant">
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
              className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container transition-colors"
              title="Đóng thông báo"
              aria-label="Đóng thông báo"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* Cart Main Content Grid */}
        {cartItems.length === 0 ? (
          /* Empty Cart State */
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-12 text-center my-6 flex flex-col items-center max-w-xl mx-auto shadow-sm">
            <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[40px]">shopping_cart_off</span>
            </div>
            <h2 className="font-editorial text-xl font-bold text-on-surface mb-2">
              Giỏ hàng của bạn đang trống
            </h2>
            <p className="text-xs text-on-surface-variant mb-6 max-w-md leading-relaxed">
              Hàng ngàn tựa sách hay, Ebook bản quyền DRM và sách nói Dolby Atmos đang chờ bạn khám phá.
            </p>
            <Link
              to="/books"
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-[#00523c] text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
              Khám Phá Sách Ngay
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start">

            {/* Left Column: Stores & Cart Items List */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

              {/* Table Header: Select All Toolbar */}
              <div className="bg-surface-container-lowest rounded-xl p-3.5 border border-outline-variant/30 flex items-center justify-between text-xs font-semibold shadow-xs">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant"
                  />
                  <span>Chọn tất cả ({cartItems.length} sản phẩm)</span>
                </label>
                <div className="hidden sm:grid grid-cols-12 gap-4 flex-1 max-w-[420px] text-right text-on-surface-variant pr-4">
                  <span className="col-span-4">Đơn giá</span>
                  <span className="col-span-4 text-center">Số lượng</span>
                  <span className="col-span-4">Thành tiền</span>
                </div>
              </div>

              {/* Store Groups */}
              {storeGroups.map((store) => (
                <div
                  key={store.id}
                  className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden"
                >
                  {/* Store Header */}
                  <div className="bg-surface-container-low px-4 py-3 border-b border-outline-variant/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={store.items.every(i => i.checked)}
                        onChange={(e) => toggleStoreCheck(store.id, e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant"
                      />
                      <span className={`w-6 h-6 rounded-md ${store.tagBg} text-white text-[10px] font-bold flex items-center justify-center`}>
                        {store.tag}
                      </span>
                      <Link
                        to="/shop/alpha-books"
                        className="font-bold text-xs sm:text-sm text-on-surface hover:text-primary transition-colors flex items-center gap-1"
                      >
                        {store.name}
                        <span className="material-symbols-outlined text-[15px] text-primary" title="Cửa hàng chính hãng">verified</span>
                      </Link>
                      <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded font-semibold hidden sm:inline">
                        {store.badge}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title="Tạm khóa — promotion nằm ngoài happy case hiện tại"
                      className="text-xs text-on-surface-variant font-semibold flex items-center gap-1 cursor-not-allowed opacity-60"
                    >
                      <span className="material-symbols-outlined text-[15px]">confirmation_number</span>
                      Mã giảm shop (Tạm khóa)
                    </button>
                  </div>

                  {/* Items in Store */}
                  <div className="divide-y divide-outline-variant/20 p-2 sm:p-4">
                    {store.items.map((item) => (
                      <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => toggleCheckItem(item.id)}
                            className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant mt-1"
                          />
                          <Link to="/book/atomic-habits" className="w-16 h-22 aspect-[2/3] rounded-lg overflow-hidden flex-shrink-0 bg-surface-container border border-outline-variant/30 shadow-2xs">
                            <img className="w-full h-full object-cover" alt={item.title} src={item.cover} />
                          </Link>
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary w-fit">
                              <span className="material-symbols-outlined text-[12px]">
                                {item.type === 'ebook' ? 'bolt' : 'local_shipping'}
                              </span>
                              {item.format}
                            </span>
                            <Link to="/book/atomic-habits" className="font-bold text-xs sm:text-sm text-on-surface hover:text-primary transition-colors line-clamp-2 leading-snug">
                              {item.title}
                            </Link>
                            <span className="text-xs text-on-surface-variant">Tác giả: {item.author}</span>
                            <span className="text-[11px] text-on-surface-variant/80">{item.formatTag}</span>
                          </div>
                        </div>

                        {/* Price, Quantity, Subtotal */}
                        <div className="flex items-center justify-between sm:justify-end gap-6 pl-7 sm:pl-0">
                          <div className="text-left sm:text-right">
                            <span className="text-xs sm:text-sm font-bold text-on-surface block">
                              {item.price.toLocaleString('vi-VN')}đ
                            </span>
                            {item.originalPrice && (
                              <span className="text-[11px] text-outline line-through block">
                                {item.originalPrice.toLocaleString('vi-VN')}đ
                              </span>
                            )}
                          </div>

                          {/* Quantity selector */}
                          <div className="flex items-center border border-outline-variant/50 rounded-lg overflow-hidden bg-surface-container-low">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              disabled={item.quantity <= 1}
                              className="w-7 h-7 flex items-center justify-center hover:bg-surface-container transition-colors disabled:opacity-30"
                              aria-label="Giảm số lượng"
                            >
                              <span className="material-symbols-outlined text-[14px]">remove</span>
                            </button>
                            <span className="w-7 text-center font-bold text-xs">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-7 h-7 flex items-center justify-center hover:bg-surface-container transition-colors"
                              aria-label="Tăng số lượng"
                            >
                              <span className="material-symbols-outlined text-[14px]">add</span>
                            </button>
                          </div>

                          {/* Total for this line */}
                          <div className="text-right min-w-[80px]">
                            <span className="text-xs sm:text-sm font-bold text-primary block">
                              {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                            </span>
                          </div>

                          {/* Actions: Save for later & Remove */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSaveForLater(item)}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                              title="Lưu lại mua sau"
                              aria-label="Lưu lại mua sau"
                            >
                              <span className="material-symbols-outlined text-[18px]">bookmark_border</span>
                            </button>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:text-[#AC2C19] hover:bg-surface-container transition-colors"
                              title="Xóa sản phẩm"
                              aria-label="Xóa sản phẩm khỏi giỏ hàng"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Saved For Later Section */}
              {savedItems.length > 0 && (
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 shadow-xs">
                  <h3 className="font-editorial text-base font-bold text-on-surface mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">bookmark</span>
                    Sách Lưu Lại Mua Sau ({savedItems.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedItems.map((sItem) => (
                      <div key={sItem.id} className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img className="w-11 h-16 rounded object-cover border border-outline-variant/30 flex-shrink-0" alt={sItem.title} src={sItem.cover} />
                          <div>
                            <h4 className="font-bold text-xs text-on-surface line-clamp-1">{sItem.title}</h4>
                            <span className="text-[11px] text-on-surface-variant block">{sItem.author}</span>
                            <span className="text-xs font-bold text-primary">{sItem.price.toLocaleString('vi-VN')}đ</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleMoveToCart(sItem)}
                          className="px-3 py-1.5 rounded-lg bg-theme-primary text-white text-xs font-semibold hover:bg-theme-primary-hover transition-colors flex items-center gap-1 flex-shrink-0"
                        >
                          <span className="material-symbols-outlined text-[14px]">add_shopping_cart</span>
                          Thêm Lại
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Order Summary & Checkout Box */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
              <div className="sticky top-20 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                <h2 className="font-editorial text-lg font-bold text-on-surface pb-3 border-b border-outline-variant/20">
                  Tóm Tắt Đơn Hàng
                </h2>

                {/* Voucher Box */}
                <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">confirmation_number</span>
                    <div>
                      <span className="text-xs font-bold text-on-surface block">Mã giảm giá HUKI</span>
                      <span className="text-[11px] text-on-surface-variant">Tạm khóa — ngoài happy case hiện tại</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="text-xs text-on-surface-variant font-semibold cursor-not-allowed opacity-60"
                  >
                    Chưa mở
                  </button>
                </div>

                {/* Calculations */}
                <div className="space-y-2 text-xs text-on-surface-variant">
                  <div className="flex justify-between">
                    <span>Tạm tính ({checkedItemsCount} sản phẩm):</span>
                    <span className="font-semibold text-on-surface">{checkedSubtotal.toLocaleString('vi-VN')}đ</span>
                  </div>
                  {directDiscount > 0 && (
                    <div className="flex justify-between text-primary">
                      <span>Giảm giá trực tiếp:</span>
                      <span className="font-semibold">-{directDiscount.toLocaleString('vi-VN')}đ</span>
                    </div>
                  )}
                  {shopDiscount > 0 && (
                    <div className="flex justify-between text-primary">
                      <span>Voucher từ Alpha Books:</span>
                      <span className="font-semibold">-{shopDiscount.toLocaleString('vi-VN')}đ</span>
                    </div>
                  )}
                  {hukiDiscount > 0 && (
                    <div className="flex justify-between text-primary">
                      <span>Voucher Huki Marketplace:</span>
                      <span className="font-semibold">-{hukiDiscount.toLocaleString('vi-VN')}đ</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Phí vận chuyển sách giấy:</span>
                    <span className="font-semibold text-on-surface">
                      {shippingFee === 0 ? (
                        <span className="text-primary font-bold">MIỄN PHÍ</span>
                      ) : (
                        `${shippingFee.toLocaleString('vi-VN')}đ`
                      )}
                    </span>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="pt-3 border-t border-outline-variant/20 flex items-baseline justify-between">
                  <span className="font-bold text-sm text-on-surface">Tổng thanh toán:</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-primary block">
                      {grandTotal.toLocaleString('vi-VN')}đ
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      (Đã bao gồm VAT &amp; phí kích hoạt DRM)
                    </span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <button
                  onClick={handleCheckout}
                  disabled={checkedItemsCount === 0}
                  className="w-full h-12 bg-primary hover:bg-[#00523c] text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[20px]">shopping_cart_checkout</span>
                  Tiến Hành Thanh Toán ({checkedItemsCount})
                </button>

                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-on-surface-variant pt-2 border-t border-outline-variant/20">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
                    <span>100% Chính Hãng</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">bolt</span>
                    <span>Ebook Đọc Ngay</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">published_with_changes</span>
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
