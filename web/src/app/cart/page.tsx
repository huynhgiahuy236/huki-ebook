"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/ui/context/CartContext';
import { useToast } from '@/ui/context/ToastContext';
import EmptyState from '@/ui/components/common/EmptyState';
import { voucherApi } from '@/ui/api/voucherApi';

/**
 * CartPage - Migrated to Next.js App Router
 * Uses backend pricing, vouchers, and cart context
 */

const MOCK_AVAILABLE_VOUCHERS = [
  { code: 'HUKI30', name: 'Mã Giảm 30K HUKI', discount: 30000, minSpend: 300000, desc: 'Giảm 30.000đ cho đơn từ 300.000đ', badge: 'Phổ biến' },
  { code: 'FREESHIP', name: 'Miễn Phí Vận Chuyển', discount: 25000, minSpend: 200000, desc: 'Giảm 25.000đ phí giao hàng sách giấy', badge: 'Freeship' },
];

export default function CartPage() {
  const router = useRouter();
  const {
    cartItems = [],
    availableItems = [],
    unavailableItems = [],
    storeGroups = [],
    toggleCheckItem,
    toggleStoreCheck,
    toggleAll,
    updateQuantity,
    removeFromCart,
    addItem,
    clearUnavailableItems,
    checkedSubtotal = 0,
    checkedItemsCount = 0,
    allChecked = false,
    hasPhysicalItems = false,
    hasEbookItems = false,
  } = (useCart() || {}) as any;
  const { showToast } = useToast();

  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const [showVoucherAccordion, setShowVoucherAccordion] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const loadVouchers = async () => {
      setLoadingVouchers(true);
      try {
        const res = await voucherApi.getAvailableVouchers();
        if (res.success && Array.isArray(res.data)) {
          const platformVouchers = res.data
            .filter((v: any) => v.scope === 'PLATFORM')
            .map((v: any) => ({
              code: v.code,
              name: v.name,
              discount: v.value,
              minSpend: v.minOrderAmount || 0,
              desc: v.description || `Giảm ${v.value}${v.type === 'PERCENTAGE' ? '%' : 'đ'}`,
              badge: v.scope,
              type: v.type,
              maxDiscount: v.maxDiscountAmount,
            }));
          setAvailableVouchers(platformVouchers);
        }
      } catch (err) {
        console.warn('Failed to load vouchers:', err);
        setAvailableVouchers(MOCK_AVAILABLE_VOUCHERS);
      } finally {
        setLoadingVouchers(false);
      }
    };
    loadVouchers();
  }, []);

  const checkedItems = (availableItems || []).filter((i: any) => i.checked);
  const productDiscount = checkedItems.reduce((acc: number, item: any) => {
    if (item.originalPrice && item.originalPrice > item.price) {
      return acc + (item.originalPrice - item.price) * item.quantity;
    }
    return acc;
  }, 0);

  const handleMoveToCart = (item: any) => {
    setSavedItems((prev) => prev.filter((i) => i.id !== item.id));
    addItem({
      id: `saved-${item.id}-${Date.now()}`,
      bookId: item.bookId,
      title: item.title,
      slug: item.slug,
      author: item.author,
      publisher: item.publisher,
      storeId: item.storeId,
      format: item.format,
      price: item.price,
      quantity: 1,
      cover: item.cover,
      type: item.format?.toLowerCase().includes('ebook') ? 'ebook' : 'physical',
    });
    showToast({ title: 'Đã chuyển vào giỏ', message: `Đã chuyển "${item.title}" vào giỏ hàng của bạn!` }, 'success');
  };

  const handleSaveForLater = (item: any) => {
    removeFromCart(item.id);
    setSavedItems((prev) => [
      ...prev,
      {
        id: `saved-${Date.now()}`,
        bookId: item.bookId,
        title: item.title,
        slug: item.slug,
        author: item.author || 'Tác giả',
        publisher: item.publisher,
        storeId: item.storeId,
        format: item.format,
        price: item.price,
        cover: item.cover,
      },
    ]);
    showToast({ title: 'Đã lưu lại', message: `Đã lưu ấn phẩm "${item.title}" vào danh sách mua sau.` }, 'info');
  };

  const handleSelectVoucher = (voucher: any) => {
    setSelectedVoucher(voucher);
    setShowVoucherAccordion(false);
    showToast({ title: 'Đã chọn mã giảm giá', message: `Mã ${voucher.code} sẽ được áp dụng khi thanh toán` }, 'success');
  };

  const handleClearVoucher = () => {
    setSelectedVoucher(null);
    showToast({ title: 'Đã xóa mã giảm giá', message: 'Bạn có thể chọn mã khác khi thanh toán' }, 'info');
  };

  const handleCheckout = () => {
    if (checkedItemsCount === 0) {
      showToast({ title: 'Chưa chọn ấn phẩm', message: 'Vui lòng tích chọn ít nhất 1 ấn phẩm khả dụng để tiến hành đặt hàng.' }, 'warning');
      return;
    }
    router.push('/checkout');
  };

  return (
    <div className="w-full bg-[var(--theme-background,#F2FBF9)] text-[var(--theme-text,#1c1b1f)] min-h-screen pb-16 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-[var(--theme-text-muted,#49454f)] mb-5">
          <Link href="/" className="hover:text-[var(--theme-primary,#003B2B)] transition-colors flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[15px]">home</span>Trang chủ
          </Link>
          <span className="opacity-40">/</span>
          <Link href="/books" className="hover:text-[var(--theme-primary,#003B2B)] transition-colors font-medium">Sàn TMĐT Sách</Link>
          <span className="opacity-40">/</span>
          <span className="font-bold text-[var(--theme-text,#1c1b1f)]">Giỏ hàng</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-[var(--theme-border,#e8e5df)] pb-4 mb-6 gap-3">
          <div className="flex items-baseline gap-3.5">
            <h1 className="font-editorial text-2xl sm:text-3xl font-extrabold text-[var(--theme-text,#1c1b1f)] tracking-tight">Giỏ Hàng</h1>
            <span className="text-xs sm:text-sm text-[var(--theme-text-muted,#49454f)] font-medium">({availableItems.length} ấn phẩm khả dụng · {checkedItemsCount} đã chọn)</span>
          </div>
          <Link href="/books" className="text-xs font-bold text-[var(--theme-primary,#003B2B)] hover:underline flex items-center gap-1 self-start sm:self-auto group">
            <span className="material-symbols-outlined text-[16px] transition-transform group-hover:-translate-x-0.5">arrow_back</span>Tiếp tục mua sách
          </Link>
        </div>

        {/* Benefits Banner */}
        {!bannerDismissed && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-[var(--theme-secondary-subtle,#e0f2fe)]/80 via-[var(--theme-surface,#ffffff)] to-[var(--theme-secondary-subtle,#e0f2fe)]/40 border border-[var(--theme-primary,#003B2B)]/20 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-[var(--theme-primary,#003B2B)] text-white flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">local_shipping</span>
              </span>
              <div>
                <span className="font-bold text-xs sm:text-sm text-[var(--theme-text,#1c1b1f)] block">Đặc quyền Ebook & Miễn phí vận chuyển HUKI</span>
                <span className="text-xs text-[var(--theme-text-muted,#49454f)]">
                  {hasEbookItems && hasPhysicalItems ? '⚡ Ebook số kích hoạt ngay tức thì + Miễn phí vận chuyển cho đơn sách giấy từ 250.000đ.' : hasEbookItems ? '⚡ Đơn hàng Ebook bản quyền DRM được miễn phí 100% chi phí vận chuyển.' : '📦 Miễn phí vận chuyển toàn quốc cho đơn sách giấy từ 250.000đ.'}
                </span>
              </div>
            </div>
            <button onClick={() => setBannerDismissed(true)} className="text-[var(--theme-text-muted,#49454f)] hover:text-[var(--theme-text,#1c1b1f)] p-1.5 rounded-lg hover:bg-black/5 transition-colors cursor-pointer" title="Đóng thông báo">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {cartItems.length === 0 ? (
          <EmptyState
            icon="shopping_cart_off"
            title="Giỏ hàng của bạn đang trống"
            description="Hàng ngàn tựa sách giá trị, Ebook bản quyền DRM và sách nói đang chờ bạn khám phá trên HUKI."
            actionText="Khám Phá Sách Ngay"
            actionLink="/books"
            actionIcon="menu_book"
            onAction={() => router.push('/books')}
          />
        ) : (
          <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left Column */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
              {/* Select All Toolbar */}
              <div className="bg-[var(--theme-surface,#ffffff)] rounded-xl p-3.5 border border-[var(--theme-border,#e8e5df)] flex items-center justify-between text-xs font-semibold shadow-xs">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} className="w-4 h-4 rounded text-[var(--theme-primary,#003B2B)] focus:ring-[var(--theme-primary,#003B2B)] border-[var(--theme-border,#e8e5df)] cursor-pointer" />
                  <span>Chọn tất cả ({availableItems.length} ấn phẩm khả dụng)</span>
                </label>
                <div className="hidden sm:grid grid-cols-12 gap-4 flex-1 max-w-[380px] text-right text-[var(--theme-text-muted,#49454f)] pr-4">
                  <span className="col-span-4">Đơn giá</span>
                  <span className="col-span-4 text-center">Số lượng</span>
                  <span className="col-span-4">Thành tiền</span>
                </div>
              </div>

              {/* Store Groups */}
              {storeGroups.map((store: any) => (
                <div key={store.id} className="bg-[var(--theme-surface,#ffffff)] rounded-2xl border border-[var(--theme-border,#e8e5df)] shadow-sm overflow-hidden">
                  <div className="bg-[var(--theme-secondary-subtle,#f0fdf4)]/50 px-4 py-3 border-b border-[var(--theme-border,#e8e5df)] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <input type="checkbox" checked={(store.items || []).every((i: any) => i.checked)} onChange={(e) => toggleStoreCheck(store.id, e.target.checked)} className="w-4 h-4 rounded text-[var(--theme-primary,#003B2B)] focus:ring-[var(--theme-primary,#003B2B)] border-[var(--theme-border,#e8e5df)] cursor-pointer" />
                      <span className={`w-6 h-6 rounded-md ${store.tagBg} text-white text-[10px] font-bold flex items-center justify-center shadow-2xs`}>{store.tag}</span>
                      <span className="font-bold text-xs sm:text-sm text-[var(--theme-text,#1c1b1f)] flex items-center gap-1">{store.name}<span className="material-symbols-outlined text-[15px] text-[var(--theme-primary,#003B2B)]" title="Gian hàng chính hãng">verified</span></span>
                      <span className="bg-[var(--theme-primary,#003B2B)]/10 text-[var(--theme-primary,#003B2B)] text-[10px] px-2 py-0.5 rounded-full font-semibold hidden sm:inline">{store.badge}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-[var(--theme-text-muted,#49454f)] font-medium">{(store.items || []).length} món</span>
                      <Link href={`/shop/${store.id}`} className="text-[11px] font-bold text-[var(--theme-primary,#003B2B)] hover:underline flex items-center gap-0.5"><span>Xem Shop</span><span className="material-symbols-outlined text-[14px]">chevron_right</span></Link>
                    </div>
                  </div>

                  <div className="divide-y divide-[var(--theme-border,#e8e5df)]/40 p-2 sm:p-4">
                    {(store.items || []).map((item: any) => {
                      const bookPath = `/book/${item.slug || item.bookId || item.id}`;
                      const itemOriginalPrice = item.originalPrice || item.price * 1.3;
                      const hasProductDiscount = itemOriginalPrice > item.price;
                      return (
                        <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <input type="checkbox" checked={item.checked} onChange={() => toggleCheckItem(item.id)} className="w-4 h-4 rounded text-[var(--theme-primary,#003B2B)] focus:ring-[var(--theme-primary,#003B2B)] border-[var(--theme-border,#e8e5df)] mt-1 cursor-pointer" />
                            <Link href={bookPath} className="w-16 h-22 aspect-[2/3] rounded-lg overflow-hidden shrink-0 bg-neutral-100 border border-[var(--theme-border,#e8e5df)] shadow-2xs group-hover:opacity-90 transition-opacity">
                              <img className="w-full h-full object-cover" alt={item.title} src={item.cover} loading="lazy" />
                            </Link>
                            <div className="flex flex-col gap-1 min-w-0 pr-2">
                              {hasProductDiscount && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200 w-fit">
                                  <span className="material-symbols-outlined text-[12px]">bolt</span>GIẢM {(itemOriginalPrice - item.price).toLocaleString('vi-VN')}đ
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--theme-primary,#003B2B)]/10 text-[var(--theme-primary,#003B2B)] w-fit">
                                <span className="material-symbols-outlined text-[12px]">{item.type === 'ebook' ? 'bolt' : 'local_shipping'}</span>{item.format}
                              </span>
                              <Link href={bookPath} className="font-bold text-xs sm:text-sm text-[var(--theme-text,#1c1b1f)] hover:text-[var(--theme-primary,#003B2B)] transition-colors line-clamp-2 leading-snug">{item.title}</Link>
                              <span className="text-xs text-[var(--theme-text-muted,#49454f)]">Tác giả: {item.author}</span>
                              <span className="text-[11px] text-[var(--theme-text-muted,#49454f)]/80">{item.formatTag}</span>
                              {item.priceChangeMessage && (
                                <div className={`mt-1 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border ${item.priceChange === 'DECREASED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-900 border-amber-200'}`}>
                                  <span className="material-symbols-outlined text-[14px]">{item.priceChange === 'DECREASED' ? 'trending_down' : 'info'}</span>
                                  <span>{item.priceChangeMessage}</span>
                                </div>
                              )}
                              {item.stockWarning && (
                                <div className="mt-1 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200">
                                  <span className="material-symbols-outlined text-[14px]">warning</span><span>{item.stockWarning}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-5 pl-7 sm:pl-0 shrink-0">
                            <div className="text-left sm:text-right min-w-[70px]">
                              <span className="text-xs sm:text-sm font-bold text-[var(--theme-text,#1c1b1f)] block">{item.price.toLocaleString('vi-VN')}đ</span>
                              {hasProductDiscount && <span className="text-[11px] text-[var(--theme-text-muted,#49454f)] line-through block">{itemOriginalPrice.toLocaleString('vi-VN')}đ</span>}
                            </div>
                            <div className="flex items-center border border-[var(--theme-border,#e8e5df)] rounded-lg overflow-hidden bg-[var(--theme-surface,#ffffff)]">
                              <button onClick={() => updateQuantity(item.id, -1)} disabled={item.quantity <= 1} className="w-7 h-7 flex items-center justify-center hover:bg-black/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"><span className="material-symbols-outlined text-[14px]">remove</span></button>
                              <span className="w-7 text-center font-bold text-xs">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} disabled={item.quantity >= (item.availableStock || 99)} className="w-7 h-7 flex items-center justify-center hover:bg-black/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"><span className="material-symbols-outlined text-[14px]">add</span></button>
                            </div>
                            <div className="text-right min-w-[85px]">
                              <span className="text-xs sm:text-sm font-bold text-[var(--theme-primary,#003B2B)] block">{(item.price * item.quantity).toLocaleString('vi-VN')}đ</span>
                              {hasProductDiscount && <span className="text-[11px] text-red-500 font-semibold block">-{(itemOriginalPrice - item.price) * item.quantity}đ</span>}
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleSaveForLater(item)} className="p-1.5 rounded-lg text-[var(--theme-text-muted,#49454f)] hover:text-[var(--theme-primary,#003B2B)] hover:bg-black/5 transition-colors cursor-pointer" title="Lưu lại mua sau"><span className="material-symbols-outlined text-[18px]">bookmark_border</span></button>
                              <button onClick={() => removeFromCart(item.id)} className="p-1.5 rounded-lg text-[var(--theme-text-muted,#49454f)] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer" title="Xóa ấn phẩm"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Unavailable Items */}
              {unavailableItems.length > 0 && (
                <div className="bg-slate-100/80 rounded-2xl border border-slate-200 p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-500 text-lg">remove_shopping_cart</span>
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-700">Sản phẩm tạm thời không khả dụng ({unavailableItems.length} ấn phẩm)</h3>
                    </div>
                    <button onClick={clearUnavailableItems} className="text-xs font-bold text-rose-600 hover:underline cursor-pointer">Xóa tất cả</button>
                  </div>
                  <div className="divide-y divide-slate-200/60">
                    {unavailableItems.map((item: any) => (
                      <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-60 hover:opacity-80 transition-opacity">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <input type="checkbox" disabled checked={false} className="w-4 h-4 rounded border-slate-300 bg-slate-200 mt-1 cursor-not-allowed opacity-50" />
                          <div className="w-16 h-22 aspect-[2/3] rounded-lg overflow-hidden shrink-0 bg-neutral-200 border border-slate-300 grayscale">
                            <img className="w-full h-full object-cover" alt={item.title} src={item.cover} loading="lazy" />
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 w-fit">TẠM HẾT HÀNG</span>
                            <span className="font-bold text-xs sm:text-sm text-slate-700 line-clamp-2">{item.title}</span>
                            <span className="text-xs text-slate-500">Tác giả: {item.author} • {item.publisher}</span>
                            <span className="text-[11px] text-rose-600 font-semibold">Ấn phẩm này hiện đang tạm hết hàng hoặc ngừng mở bán từ người bán.</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pl-7 sm:pl-0 shrink-0">
                          <Link href={`/books?q=${encodeURIComponent(item.author || item.title)}`} className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">search</span><span>Tìm sách tương tự</span>
                          </Link>
                          <button onClick={() => removeFromCart(item.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer" title="Xóa ấn phẩm"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Saved For Later */}
              {savedItems.length > 0 && (
                <div className="bg-[var(--theme-surface,#ffffff)] rounded-2xl border border-[var(--theme-border,#e8e5df)] p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--theme-border,#e8e5df)]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[var(--theme-primary,#003B2B)] text-lg">bookmark</span>
                      <h3 className="font-editorial font-bold text-sm sm:text-base text-[var(--theme-text,#1c1b1f)]">Danh Sách Mua Sau ({savedItems.length} ấn phẩm)</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {savedItems.map((item: any) => (
                      <div key={item.id} className="p-3 rounded-xl border border-[var(--theme-border,#e8e5df)] flex items-center gap-3 bg-[var(--theme-background,#F2FBF9)]/40">
                        <div className="w-12 h-16 rounded-md overflow-hidden shrink-0 bg-neutral-100 border border-[var(--theme-border,#e8e5df)]">
                          <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-bold text-xs text-[var(--theme-text,#1c1b1f)] line-clamp-1">{item.title}</span>
                          <span className="text-[11px] text-[var(--theme-text-muted,#49454f)] line-clamp-1">{item.author}</span>
                          <span className="text-xs font-bold text-[var(--theme-primary,#003B2B)] mt-0.5">{item.price.toLocaleString('vi-VN')}đ</span>
                        </div>
                        <button onClick={() => handleMoveToCart(item)} className="px-2.5 py-1.5 rounded-lg bg-[var(--theme-primary,#003B2B)] text-white text-[11px] font-bold shrink-0 hover:bg-[var(--theme-primary-hover,#002a1e)] transition-colors cursor-pointer">Chuyển vào giỏ</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Order Summary */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
              <div className="bg-[var(--theme-surface,#ffffff)] rounded-2xl border border-[var(--theme-border,#e8e5df)] p-5 shadow-sm space-y-5 sticky top-24">
                <h3 className="font-editorial font-extrabold text-base sm:text-lg text-[var(--theme-text,#1c1b1f)] border-b border-[var(--theme-border,#e8e5df)] pb-3">Tóm Tắt Đơn Hàng</h3>

                {/* Vouchers */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--theme-text,#1c1b1f)]">
                    <span className="flex items-center gap-1 text-[var(--theme-primary,#003B2B)]">
                      <span className="material-symbols-outlined text-[16px]">local_activity</span>Mã Ưu Đãi HUKI
                    </span>
                    <button onClick={() => setShowVoucherAccordion(!showVoucherAccordion)} className="text-[var(--theme-primary,#003B2B)] hover:underline cursor-pointer">{showVoucherAccordion ? 'Thu gọn' : 'Chọn mã'}</button>
                  </div>

                  {selectedVoucher && (
                    <div className="p-2.5 rounded-xl bg-[var(--theme-secondary-subtle,#f0fdf4)] border border-[var(--theme-primary,#003B2B)]/30 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[var(--theme-primary,#003B2B)] block">{selectedVoucher.code}</span>
                        <span className="text-[11px] text-[var(--theme-text-muted,#49454f)]">{selectedVoucher.desc}</span>
                      </div>
                      <button onClick={handleClearVoucher} className="p-1 rounded hover:bg-black/10 cursor-pointer"><span className="material-symbols-outlined text-[16px] text-[var(--theme-text-muted,#49454f)]">close</span></button>
                    </div>
                  )}

                  {showVoucherAccordion && (
                    <div className="space-y-2 pt-2 border-t border-[var(--theme-border,#e8e5df)]">
                      {loadingVouchers ? (
                        <div className="p-4 text-center text-xs text-[var(--theme-text-muted,#49454f)]">
                          <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                          <p className="mt-1">Đang tải...</p>
                        </div>
                      ) : availableVouchers.length === 0 ? (
                        <div className="p-4 text-center text-xs text-[var(--theme-text-muted,#49454f)]">
                          <span className="material-symbols-outlined text-[20px]">info</span>
                          <p className="mt-1">Chưa có voucher khả dụng</p>
                        </div>
                      ) : availableVouchers.map((v: any) => (
                        <div key={v.code} onClick={() => handleSelectVoucher(v)} className={`p-2.5 rounded-xl border cursor-pointer transition-all ${selectedVoucher?.code === v.code ? 'border-[var(--theme-primary,#003B2B)] bg-[var(--theme-primary,#003B2B)]/5' : 'border-[var(--theme-border,#e8e5df)] hover:bg-black/5'}`}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[var(--theme-text,#1c1b1f)]">{v.code}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--theme-primary,#003B2B)] text-white">{v.badge}</span>
                          </div>
                          <span className="text-[11px] text-[var(--theme-text-muted,#49454f)] block mt-0.5">{v.desc}</span>
                          {v.minSpend > 0 && <span className="text-[10px] text-orange-600 font-semibold block mt-0.5">Đơn tối thiểu: {v.minSpend.toLocaleString('vi-VN')}đ</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="space-y-2.5 text-xs text-[var(--theme-text-muted,#49454f)] border-t border-[var(--theme-border,#e8e5df)] pt-4">
                  <div className="flex items-center justify-between">
                    <span>Tạm tính ({checkedItemsCount} ấn phẩm đã chọn):</span>
                    <span className="font-bold text-[var(--theme-text,#1c1b1f)]">{checkedSubtotal.toLocaleString('vi-VN')}đ</span>
                  </div>
                  {productDiscount > 0 && (
                    <div className="flex items-center justify-between text-red-600 font-semibold">
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">bolt</span>Giảm giá sản phẩm (Flash Sale):</span>
                      <span>-{productDiscount.toLocaleString('vi-VN')}đ</span>
                    </div>
                  )}
                  <div className="flex items-start justify-between text-[11px] italic pt-1 border-t border-dashed border-[var(--theme-border,#e8e5df)] mt-2">
                    <span>{selectedVoucher ? `Mã ${selectedVoucher.code} sẽ được áp dụng khi thanh toán` : 'Shop Voucher & HUKI Voucher được áp dụng tại Checkout'}</span>
                  </div>
                </div>

                <div className="border-t border-[var(--theme-border,#e8e5df)] pt-4 space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-sm text-[var(--theme-text,#1c1b1f)]">Tạm tính giỏ hàng:</span>
                    <span className="font-black text-xl text-[var(--theme-primary,#003B2B)]">{checkedSubtotal.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <span className="text-[11px] text-[var(--theme-text-muted,#49454f)] block text-right">Voucher & phí ship được tính tại Checkout</span>
                </div>

                <button onClick={handleCheckout} disabled={checkedItemsCount === 0} className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${checkedItemsCount === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-[var(--theme-primary,#003B2B)] to-[var(--theme-primary-hover,#002a1e)] hover:opacity-95 text-white shadow-md'}`}>
                  <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                  <span>Tiến Hành Thanh Toán ({checkedItemsCount})</span>
                </button>

                <div className="flex items-center justify-center gap-4 pt-2 text-[10px] text-[var(--theme-text-muted,#49454f)]">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">lock</span>Bảo mật</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">verified</span>Chính hãng</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">support_agent</span>Hỗ trợ 24/7</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
