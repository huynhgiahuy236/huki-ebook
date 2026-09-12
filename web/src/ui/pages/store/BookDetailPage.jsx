import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { catalogApi, toCatalogBook } from '../../api/catalogApi';

export default function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { showToast } = useToast();

  const [selectedFormat, setSelectedFormat] = useState('ebook'); // 'ebook' | 'physical' | 'hybrid'
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('intro'); // 'intro' | 'toc' | 'preview' | 'reviews'
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isExpandedIntro, setIsExpandedIntro] = useState(false);
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tìm thông tin sách từ danh mục dữ liệu
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || '');
      const res = isUuid ? await catalogApi.getBookById(id) : await catalogApi.getBookBySlug(id);
      if (!active) return;
      if (res.success && res.data) {
        const normalized = toCatalogBook(res.data);
        const hasPhysical = res.data.format === 'PHYSICAL' || res.data.format === 'BOTH';
        const hasDigital = res.data.format === 'DIGITAL' || res.data.format === 'BOTH';
        setBook({
          ...normalized,
          isbn: res.data.isbn,
          category: normalized.categoryName,
          priceEbook: hasDigital ? normalized.price : null,
          originalPriceEbook: hasDigital ? normalized.price : null,
          pricePaper: hasPhysical ? normalized.price : null,
          originalPricePaper: hasPhysical ? normalized.price : null,
          priceCombo: res.data.format === 'BOTH' ? normalized.price : null,
          originalPriceCombo: res.data.format === 'BOTH' ? normalized.price : null,
          rating: 0,
          reviewCount: 0,
          readCount: 0,
          stock: res.data.physicalDetails?.stock ?? null,
          hasPhysical,
          hasDigital,
        });
        setSelectedFormat(res.data.format === 'PHYSICAL' ? 'physical' : res.data.format === 'BOTH' ? 'hybrid' : 'ebook');
      } else {
        setError(res.error?.message || 'Không tìm thấy sách hoặc sách chưa được xuất bản.');
      }
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [id]);

  if (loading) return <DetailState icon="progress_activity" title="Đang tải thông tin sách…" spinning />;
  if (error || !book) return <DetailState icon="menu_book" title="Không thể mở sách" description={error} />;

  // Cấu trúc giá theo 3 hình thức phát hành
  const formatPricing = {
    ebook: {
      type: 'ebook',
      title: 'Ebook Bản Quyền',
      subtitle: 'Đọc tức thì trên App & Web',
      price: book.priceEbook ?? 0,
      originalPrice: book.originalPriceEbook ?? 0,
      badge: 'ĐỌC NGAY',
      icon: 'bolt',
      delivery: 'Kích hoạt ngay vào Tủ Sách cá nhân',
      note: 'Hỗ trợ DRM đọc trên 5 thiết bị'
    },
    physical: {
      type: 'physical',
      title: 'Sách Giấy Bìa Mềm',
      subtitle: 'Giấy xốp ngà chống lóa',
      price: book.pricePaper ?? 0,
      originalPrice: book.originalPricePaper ?? 0,
      badge: 'GIAO TẬN NƠI',
      icon: 'local_shipping',
      delivery: 'Giao trong 2-3 ngày làm việc',
      note: 'Tặng kèm bookmark độc quyền'
    },
    hybrid: {
      type: 'hybrid',
      title: 'Combo Giấy + Ebook',
      subtitle: 'Tiết kiệm nhất (-45%)',
      price: book.priceCombo ?? 0,
      originalPrice: book.originalPriceCombo ?? 0,
      badge: 'TIẾT KIỆM 45%',
      icon: 'auto_awesome',
      delivery: 'Đọc Ebook ngay + Giao Sách Giấy',
      note: 'Trọn bộ giải pháp đọc kép tiện lợi'
    }
  };

  const currentPrice = formatPricing[selectedFormat];
  const discountPercent = currentPrice.originalPrice > 0
    ? Math.round(((currentPrice.originalPrice - currentPrice.price) / currentPrice.originalPrice) * 100)
    : 0;
  const outOfStock = (selectedFormat === 'physical' || selectedFormat === 'hybrid') && book.stock !== null && book.stock <= 0;

  const handleAddToCart = () => {
    if (outOfStock) {
      showToast('Sản phẩm hiện đã hết hàng.', 'error');
      return;
    }
    addItem({
      id: `${book.id}-${selectedFormat}`,
      bookId: book.id,
      title: book.title,
      author: book.author,
      price: currentPrice.price,
      originalPrice: currentPrice.originalPrice,
      format: currentPrice.title,
      cover: book.cover,
      quantity: quantity
    });
    showToast(`Đã thêm "${book.title} (${currentPrice.title})" vào giỏ hàng!`, 'success');
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  return (
    <div className="w-full bg-[#f8f6f1] text-[#17201f] min-h-screen font-sans pb-16">
      {/* Breadcrumb Navigation */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-4 pb-2">
        <nav className="flex items-center gap-1.5 text-xs text-[#6b7280]">
          <Link to="/" className="hover:text-[#006953] transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">home</span>
            Trang chủ
          </Link>
          <span className="material-symbols-outlined text-xs text-gray-400">chevron_right</span>
          <Link to="/books" className="hover:text-[#006953] transition-colors">Tủ Sách</Link>
          <span className="material-symbols-outlined text-xs text-gray-400">chevron_right</span>
          <span className="text-[#17201f] font-medium truncate max-w-[240px] sm:max-w-md">{book.title}</span>
        </nav>
      </div>

      {/* Main Product Hero */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-2 pb-8">
        <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left Column: 3D Book Cover & Quick Read CTA */}
          <div className="col-span-12 lg:col-span-4 flex flex-col items-center">
            <div className="w-full max-w-[340px] bg-white rounded-2xl p-6 border border-[#e8e5df] shadow-sm flex flex-col items-center group">
              {/* Book Cover */}
              <div className="relative w-[210px] sm:w-[230px] aspect-[2/3] rounded-xl overflow-hidden shadow-xl transition-transform duration-300 group-hover:scale-[1.02]">
                <img
                  src={book.cover}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
                {book.isBestseller && (
                  <div className="absolute top-2 left-2 bg-[#fea619] text-black text-[10px] font-black px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">local_fire_department</span>
                    BÁN CHẠY
                  </div>
                )}
              </div>

              {/* Read Preview CTA Button */}
              <button
                type="button"
                disabled
                className="w-full mt-6 py-3 px-4 rounded-xl bg-gray-200 text-gray-500 font-bold text-sm flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
                aria-disabled="true"
                title="Tạm khóa — WebReader và DRM ngoài happy case hiện tại"
              >
                <span className="material-symbols-outlined text-lg">chrome_reader_mode</span>
                Đọc thử · Tạm khóa
              </button>

              {/* Action Buttons: Wishlist & Share */}
              <div className="grid grid-cols-2 gap-2 w-full mt-3">
                <button
                  type="button"
                  disabled
                  className="py-2 px-3 rounded-lg border border-gray-200 text-gray-400 text-xs font-semibold flex items-center justify-center gap-1.5 opacity-60 cursor-not-allowed"
                  aria-disabled="true"
                  title="Tạm khóa — yêu thích thuộc tủ sách ngoài happy case hiện tại"
                >
                  <span className="material-symbols-outlined text-base">favorite_border</span>
                  Tạm khóa
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    showToast('Đã sao chép liên kết sách!', 'success');
                  }}
                  className="py-2 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">share</span>
                  Chia sẻ
                </button>
              </div>
            </div>

            {/* DRM Guarantee Badge */}
            <div className="mt-3 flex items-center gap-2 text-xs text-[#006953] font-medium bg-[#006953]/10 px-3.5 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-sm">verified_user</span>
              Bản quyền chính thức • Bảo vệ bởi HUKI DRM
            </div>
          </div>

          {/* Middle Column: Metadata, Specs, 3 Formats */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
            {/* Title & Author */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="bg-[#006953]/10 text-[#006953] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  {book.category || 'Công nghệ & Đổi mới'}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500 font-medium">ISBN: {book.isbn || 'Chưa cập nhật'}</span>
              </div>

              <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#17201f] leading-snug">
                {book.title}
              </h1>

              <div className="flex items-center gap-3 mt-2 text-xs text-[#6b7280]">
                <span>Tác giả: <strong className="text-[#17201f]">{book.author}</strong></span>
                <span>•</span>
                <span>NXB: <strong className="text-[#17201f]">{book.publisher || 'HUKI Publishing'}</strong></span>
              </div>
            </div>

            {/* Ratings & Sales Stats */}
            <div className="flex items-center gap-4 py-2 border-y border-[#e8e5df] text-xs">
              <div className="flex items-center gap-1 text-[#fea619]">
                <span className="material-symbols-outlined text-base fill">star</span>
                <span className="font-bold text-[#17201f] text-sm">{book.rating.toFixed(1)}</span>
                <span className="text-gray-400">({book.reviewCount.toLocaleString('vi-VN')} đánh giá)</span>
              </div>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">
                Đã bán <strong className="text-[#17201f]">{book.readCount.toLocaleString('vi-VN')}</strong> bản
              </span>
            </div>

            {/* Quick Specs Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-center">
              <div className="bg-white p-2.5 rounded-xl border border-[#e8e5df]">
                <span className="block text-gray-400 text-[10px]">Số trang</span>
                <strong className="text-sm text-[#17201f]">—</strong>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-[#e8e5df]">
                <span className="block text-gray-400 text-[10px]">Ngôn ngữ</span>
                <strong className="text-sm text-[#17201f]">—</strong>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-[#e8e5df]">
                <span className="block text-gray-400 text-[10px]">Định dạng</span>
                <strong className="text-sm text-[#006953]">{book.format}</strong>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-[#e8e5df]">
                <span className="block text-gray-400 text-[10px]">Tồn kho</span>
                <strong className="text-sm text-[#17201f]">{book.stock === null ? 'Không áp dụng' : book.stock}</strong>
              </div>
            </div>

            {/* Concise Teaser Description */}
            <div className="bg-white p-4 rounded-2xl border border-[#e8e5df] text-xs text-gray-600 leading-relaxed">
              <p>
                {book.description || 'Chưa có mô tả cho tác phẩm này.'}
              </p>
            </div>

            {/* 3 Formats Selector (Clean & Clear) */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Chọn hình thức mua:
              </span>

              <div className="grid grid-cols-3 gap-2.5">
                {Object.values(formatPricing).filter((fmt) => (
                  fmt.type === 'hybrid' ? book.hasPhysical && book.hasDigital
                    : fmt.type === 'physical' ? book.hasPhysical
                      : book.hasDigital
                )).map((fmt) => {
                  const isSelected = selectedFormat === fmt.type;
                  const isHybrid = fmt.type === 'hybrid';
                  return (
                    <div
                      key={fmt.type}
                      onClick={() => setSelectedFormat(fmt.type)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-2 border-[#006953] bg-[#006953]/5 shadow-sm'
                          : isHybrid
                          ? 'border-amber-300 bg-amber-50/40 hover:border-amber-400'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {isSelected ? (
                        <span className="absolute -top-2 right-2 bg-[#006953] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                          ĐANG CHỌN
                        </span>
                      ) : isHybrid ? (
                        <span className="absolute -top-2 right-2 bg-amber-500 text-white text-[8px] font-extrabold px-1.5 py-0.2 rounded-full shadow-xs">
                          🔥 TIẾT KIỆM 45%
                        </span>
                      ) : null}

                      <div>
                        <span className={`text-xs font-bold block ${isSelected ? 'text-[#006953]' : 'text-[#17201f]'}`}>
                          {fmt.title}
                        </span>
                        <span className="text-[10px] text-gray-500 block mt-0.5">{fmt.subtitle}</span>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-baseline justify-between">
                        <span className="text-sm font-bold text-[#006953]">
                          {fmt.price.toLocaleString('vi-VN')}đ
                        </span>
                        <span className="text-[10px] text-gray-400 line-through">
                          {Math.round(fmt.originalPrice / 1000)}k
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Buy Box */}
          <div className="col-span-12 lg:col-span-3">
            <div className="sticky top-[96px] bg-white border border-[#e8e5df] rounded-2xl p-5 shadow-sm space-y-4">
              {/* Pricing Display */}
              <div className="border-b border-gray-100 pb-3">
                <span className="text-xs text-gray-500 block mb-0.5">Tạm tính ({currentPrice.title}):</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#006953]">
                    {(currentPrice.price * quantity).toLocaleString('vi-VN')}đ
                  </span>
                  <span className="text-xs text-gray-400 line-through">
                    {(currentPrice.originalPrice * quantity).toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="bg-red-50 text-red-600 text-[11px] font-bold px-1.5 py-0.5 rounded">
                    Tiết kiệm {discountPercent}%
                  </span>
                  <span className="text-[11px] text-gray-500">Tích 5% HukiXu</span>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 font-medium">Số lượng:</span>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-sm">remove</span>
                  </button>
                  <span className="w-8 text-center font-bold text-xs">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-7 h-7 flex items-center justify-center hover:bg-gray-100"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                  </button>
                </div>
              </div>

              {/* Delivery Note */}
              <div className="bg-[#f8f6f1] p-3 rounded-xl flex items-start gap-2.5 text-xs">
                <span className="material-symbols-outlined text-base text-[#006953] shrink-0 mt-0.5">
                  {currentPrice.icon}
                </span>
                <div>
                  <strong className="block text-gray-800">{currentPrice.delivery}</strong>
                  <span className="text-gray-500 text-[11px]">{currentPrice.note}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleBuyNow}
                  disabled={outOfStock}
                  className="w-full h-11 bg-[#006953] hover:bg-[#00523c] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">shopping_cart_checkout</span>
                  {outOfStock ? 'Hết hàng' : 'Mua Ngay'}
                </button>

                <button
                  onClick={handleAddToCart}
                  disabled={outOfStock}
                  className="w-full h-10 border border-[#006953] text-[#006953] hover:bg-[#006953]/5 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                  Thêm Vào Giỏ Hàng
                </button>
              </div>

              {/* Publisher Badge */}
              <div className="pt-3 border-t border-gray-100 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#006953] text-white font-bold flex items-center justify-center text-xs">
                  H
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-gray-800 block truncate">
                    {book.publisher || 'HUKI Digital Official'}
                  </span>
                  <span className="text-[10px] text-[#006953] flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[12px]">verified</span>
                    Gian hàng chính hãng
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Structured Details Tabs (Clean & Progressive Disclosure) */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6">
        {/* Navigation Tabs Header */}
        <div className="bg-white rounded-2xl border border-[#e8e5df] shadow-sm overflow-hidden mb-6">
          <div className="flex items-center border-b border-gray-200 px-4 sm:px-6 gap-6 sm:gap-8 overflow-x-auto text-xs sm:text-sm font-semibold">
            <button
              onClick={() => setActiveTab('intro')}
              className={`py-4 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'intro'
                  ? 'border-[#006953] text-[#006953] font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <span className="material-symbols-outlined text-base">menu_book</span>
              Giới Thiệu
            </button>

            <button
              onClick={() => setActiveTab('toc')}
              disabled={!book.toc?.length}
              aria-disabled={!book.toc?.length}
              className={`py-4 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'toc'
                  ? 'border-[#006953] text-[#006953] font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50'
              }`}
            >
              <span className="material-symbols-outlined text-base">format_list_bulleted</span>
              Mục Lục ({book.toc?.length || 0} Chương)
            </button>

            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Tạm khóa — Ebook preview/DRM nằm ngoài happy case"
              className="py-4 border-b-2 border-transparent flex items-center gap-1.5 whitespace-nowrap text-gray-400 opacity-60 cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-base">chrome_reader_mode</span>
              Đọc Thử Mẫu
            </button>

            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Tạm khóa — review nằm ngoài happy case"
              className="py-4 border-b-2 border-transparent flex items-center gap-1.5 whitespace-nowrap text-gray-400 opacity-60 cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-base">star</span>
              Đánh Giá ({book.reviewCount.toLocaleString('vi-VN')})
            </button>
          </div>

          {/* Tab Content 1: Giới thiệu */}
          {activeTab === 'intro' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="prose max-w-none text-sm text-gray-700 leading-relaxed space-y-4">
                <p className="text-base font-medium text-gray-900">
                  {book.description || 'Chưa có mô tả cho tác phẩm này.'}
                </p>
              </div>

              {/* 3 Highlight Takeaways */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-[#f8f6f1] border border-[#e8e5df]">
                  <span className="material-symbols-outlined text-2xl text-[#006953] mb-2">lightbulb</span>
                  <h4 className="font-bold text-xs text-gray-900 mb-1">Định dạng</h4>
                  <p className="text-xs text-gray-600">{book.format}</p>
                </div>

                <div className="p-4 rounded-xl bg-[#f8f6f1] border border-[#e8e5df]">
                  <span className="material-symbols-outlined text-2xl text-[#006953] mb-2">trending_up</span>
                  <h4 className="font-bold text-xs text-gray-900 mb-1">Tồn kho</h4>
                  <p className="text-xs text-gray-600">{book.stock === null ? 'Không áp dụng' : `${book.stock} sản phẩm`}</p>
                </div>

                <div className="p-4 rounded-xl bg-[#f8f6f1] border border-[#e8e5df]">
                  <span className="material-symbols-outlined text-2xl text-[#006953] mb-2">verified</span>
                  <h4 className="font-bold text-xs text-gray-900 mb-1">Nhà xuất bản</h4>
                  <p className="text-xs text-gray-600">{book.publisher}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 2: Mục lục */}
          {activeTab === 'toc' && (
            <div className="p-6 sm:p-8 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(book.toc || []).map((chap) => (
                  <span
                    key={chap.id}
                    className="p-3.5 rounded-xl border border-gray-200 flex items-center justify-between text-xs opacity-50 cursor-not-allowed"
                    aria-disabled="true"
                    title="Tạm khóa — WebReader ngoài happy case hiện tại"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-[#006953] group-hover:text-white font-bold text-[11px] flex items-center justify-center transition-colors">
                        {chap.id}
                      </span>
                      <span className="font-semibold text-gray-800 group-hover:text-[#006953] transition-colors">
                        {chap.title}
                      </span>
                    </div>
                    <span className="text-gray-400 font-mono text-[11px]">Trang {chap.page || 1} →</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tab Content 3: Đọc thử mẫu */}
          {activeTab === 'preview' && (
            <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#006953]/10 text-[#006953] flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">auto_stories</span>
              </div>
              <div className="max-w-md">
                <h3 className="font-bold text-base text-gray-900 mb-1">Trải nghiệm đọc thử trực tuyến</h3>
                <p className="text-xs text-gray-600">
                  Mở trình đọc sách toàn màn hình với đầy đủ công cụ ghi chú, bút dạ quang highlight và chế độ đọc ban đêm.
                </p>
              </div>
              <span
                className="px-6 py-3 rounded-xl bg-gray-200 text-gray-500 font-bold text-sm inline-flex items-center gap-2 opacity-60 cursor-not-allowed"
                aria-disabled="true"
                title="Tạm khóa — WebReader ngoài happy case hiện tại"
              >
                <span className="material-symbols-outlined text-lg">chrome_reader_mode</span>
                Mở Trình Đọc PDF / Ebook
              </span>
            </div>
          )}

          {/* Tab Content 4: Đánh giá */}
          {activeTab === 'reviews' && (
            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <span className="text-3xl font-bold text-gray-900">{book.rating || 5.0}</span>
                  <span className="text-xs text-gray-400 ml-1">/ 5.0</span>
                  <div className="flex text-[#fea619] mt-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <span key={i} className="material-symbols-outlined text-base fill">star</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => showToast('Tính năng viết đánh giá dành cho độc giả đã mua sách!', 'info')}
                  className="px-4 py-2 rounded-xl border border-[#006953] text-[#006953] text-xs font-bold hover:bg-[#006953]/5 transition-colors"
                >
                  Viết Đánh Giá
                </button>
              </div>

              {/* Sample Review Comments */}
              <div className="space-y-3 pt-2">
                {[
                  { name: 'Nguyễn Văn An', time: '2 ngày trước', rating: 5, comment: 'Sách rất hay và truyền cảm hứng. Giao diện đọc trực tuyến trên web cực kỳ mượt và tiện lợi.' },
                  { name: 'Trần Thị Mai', time: '1 tuần trước', rating: 5, comment: 'Định dạng PDF rõ nét, công cụ highlight rất thích hợp để vừa đọc vừa ghi nhớ ý chính.' }
                ].map((rev, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-[#f8f6f1] border border-[#e8e5df] text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <strong className="text-gray-900">{rev.name}</strong>
                      <span className="text-gray-400 text-[11px]">{rev.time}</span>
                    </div>
                    <div className="flex text-[#fea619]">
                      {[...Array(rev.rating)].map((_, i) => (
                        <span key={i} className="material-symbols-outlined text-xs fill">star</span>
                      ))}
                    </div>
                    <p className="text-gray-700">{rev.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function DetailState({ icon, title, description, spinning = false }) {
  return (
    <main className="min-h-[70vh] bg-[#f8f6f1] px-4 py-16 flex items-center justify-center" role="status">
      <section className="w-full max-w-lg rounded-2xl border border-[#dedbd3] bg-white p-8 text-center shadow-sm">
        <span className={`material-symbols-outlined text-5xl text-[#006953] ${spinning ? 'animate-spin' : ''}`} aria-hidden="true">{icon}</span>
        <h1 className="mt-4 font-editorial text-2xl font-bold">{title}</h1>
        {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
        {!spinning && <Link to="/books" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#006953] px-5 py-3 text-sm font-bold text-white">Quay lại danh mục</Link>}
      </section>
    </main>
  );
}
