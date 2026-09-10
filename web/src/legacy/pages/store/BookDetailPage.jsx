import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { booksData } from '../../data/mockData';

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

  // Tìm thông tin sách từ danh mục dữ liệu
  const book = useMemo(() => {
    return booksData.find(b => b.id === id) || booksData[0];
  }, [id]);

  // Cấu trúc giá theo 3 hình thức phát hành
  const formatPricing = {
    ebook: {
      type: 'ebook',
      title: 'Ebook Bản Quyền',
      subtitle: 'Đọc tức thì trên App & Web',
      price: book.priceEbook || 79000,
      originalPrice: book.originalPriceEbook || 149000,
      badge: 'ĐỌC NGAY',
      icon: 'bolt',
      delivery: 'Kích hoạt ngay vào Tủ Sách cá nhân',
      note: 'Hỗ trợ DRM đọc trên 5 thiết bị'
    },
    physical: {
      type: 'physical',
      title: 'Sách Giấy Bìa Mềm',
      subtitle: 'Giấy xốp ngà chống lóa',
      price: book.pricePaper || 149000,
      originalPrice: book.originalPricePaper || 189000,
      badge: 'GIAO TẬN NƠI',
      icon: 'local_shipping',
      delivery: 'Giao trong 2-3 ngày làm việc',
      note: 'Tặng kèm bookmark độc quyền'
    },
    hybrid: {
      type: 'hybrid',
      title: 'Combo Giấy + Ebook',
      subtitle: 'Tiết kiệm nhất (-45%)',
      price: book.priceCombo || 199000,
      originalPrice: book.originalPriceCombo || 338000,
      badge: 'TIẾT KIỆM 45%',
      icon: 'auto_awesome',
      delivery: 'Đọc Ebook ngay + Giao Sách Giấy',
      note: 'Trọn bộ giải pháp đọc kép tiện lợi'
    }
  };

  const currentPrice = formatPricing[selectedFormat];
  const discountPercent = Math.round(((currentPrice.originalPrice - currentPrice.price) / currentPrice.originalPrice) * 100);

  const handleAddToCart = () => {
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
              <Link
                to={`/read/${book.id}`}
                className="w-full mt-6 py-3 px-4 rounded-xl bg-[#006953] hover:bg-[#00523c] text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">chrome_reader_mode</span>
                Đọc Thử Bản Trực Tuyến
              </Link>

              {/* Action Buttons: Wishlist & Share */}
              <div className="grid grid-cols-2 gap-2 w-full mt-3">
                <button
                  onClick={() => {
                    setIsWishlisted(!isWishlisted);
                    showToast(!isWishlisted ? 'Đã lưu vào Yêu thích!' : 'Đã bỏ yêu thích', 'info');
                  }}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    isWishlisted
                      ? 'border-red-200 bg-red-50 text-red-600'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {isWishlisted ? 'favorite' : 'favorite_border'}
                  </span>
                  {isWishlisted ? 'Đã thích' : 'Yêu thích'}
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
                <span className="text-xs text-gray-500 font-medium">ISBN: {book.isbn || '978-604-58-9123-4'}</span>
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
                <span className="font-bold text-[#17201f] text-sm">{book.rating || 5.0}</span>
                <span className="text-gray-400">({(book.reviewCount || 1240).toLocaleString('vi-VN')} đánh giá)</span>
              </div>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">
                Đã bán <strong className="text-[#17201f]">{(book.readCount || 8500).toLocaleString('vi-VN')}</strong> bản
              </span>
            </div>

            {/* Quick Specs Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-center">
              <div className="bg-white p-2.5 rounded-xl border border-[#e8e5df]">
                <span className="block text-gray-400 text-[10px]">Số trang</span>
                <strong className="text-sm text-[#17201f]">{book.pages || 166}</strong>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-[#e8e5df]">
                <span className="block text-gray-400 text-[10px]">Ngôn ngữ</span>
                <strong className="text-sm text-[#17201f]">Tiếng Việt</strong>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-[#e8e5df]">
                <span className="block text-gray-400 text-[10px]">Định dạng</span>
                <strong className="text-sm text-[#006953]">PDF / EPUB</strong>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-[#e8e5df]">
                <span className="block text-gray-400 text-[10px]">Thiết bị</span>
                <strong className="text-sm text-[#17201f]">5 Máy</strong>
              </div>
            </div>

            {/* Concise Teaser Description */}
            <div className="bg-white p-4 rounded-2xl border border-[#e8e5df] text-xs text-gray-600 leading-relaxed">
              <p>
                {book.description || 'Tác phẩm cung cấp cái nhìn sâu sắc và toàn diện về những chuyển dịch công nghệ và phương pháp tư duy đột phá.'}
              </p>
            </div>

            {/* 3 Formats Selector (Clean & Clear) */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Chọn hình thức mua:
              </span>

              <div className="grid grid-cols-3 gap-2.5">
                {Object.values(formatPricing).map((fmt) => {
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
                  className="w-full h-11 bg-[#006953] hover:bg-[#00523c] text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">shopping_cart_checkout</span>
                  Mua Ngay
                </button>

                <button
                  onClick={handleAddToCart}
                  className="w-full h-10 border border-[#006953] text-[#006953] hover:bg-[#006953]/5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
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
              className={`py-4 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'toc'
                  ? 'border-[#006953] text-[#006953] font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <span className="material-symbols-outlined text-base">format_list_bulleted</span>
              Mục Lục ({book.toc?.length || 8} Chương)
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`py-4 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'preview'
                  ? 'border-[#006953] text-[#006953] font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <span className="material-symbols-outlined text-base">chrome_reader_mode</span>
              Đọc Thử Mẫu
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-4 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'reviews'
                  ? 'border-[#006953] text-[#006953] font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <span className="material-symbols-outlined text-base">star</span>
              Đánh Giá ({(book.reviewCount || 1240).toLocaleString('vi-VN')})
            </button>
          </div>

          {/* Tab Content 1: Giới thiệu */}
          {activeTab === 'intro' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="prose max-w-none text-sm text-gray-700 leading-relaxed space-y-4">
                <p className="text-base font-medium text-gray-900">
                  {book.description || 'Cuốn sách mang đến những góc nhìn mới mẻ và bài học giá trị cho độc giả trong kỷ nguyên số.'}
                </p>
                <p>
                  Thông qua những phân tích thực tế và câu chuyện truyền cảm hứng, tác giả làm sáng tỏ cách các hệ thống vận hành và phương pháp để mỗi cá nhân có thể thích nghi, bứt phá và đạt được những thành tựu vượt bậc.
                </p>
              </div>

              {/* 3 Highlight Takeaways */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-[#f8f6f1] border border-[#e8e5df]">
                  <span className="material-symbols-outlined text-2xl text-[#006953] mb-2">lightbulb</span>
                  <h4 className="font-bold text-xs text-gray-900 mb-1">Tư duy hệ thống</h4>
                  <p className="text-xs text-gray-600">Xây dựng quy trình bền vững thay vì chỉ phụ thuộc vào cảm hứng nhất thời.</p>
                </div>

                <div className="p-4 rounded-xl bg-[#f8f6f1] border border-[#e8e5df]">
                  <span className="material-symbols-outlined text-2xl text-[#006953] mb-2">trending_up</span>
                  <h4 className="font-bold text-xs text-gray-900 mb-1">Tích lũy giá trị</h4>
                  <p className="text-xs text-gray-600">Cải thiện nhỏ mỗi ngày tạo nên kết quả vượt trội theo thời gian.</p>
                </div>

                <div className="p-4 rounded-xl bg-[#f8f6f1] border border-[#e8e5df]">
                  <span className="material-symbols-outlined text-2xl text-[#006953] mb-2">verified</span>
                  <h4 className="font-bold text-xs text-gray-900 mb-1">Ứng dụng thực tiễn</h4>
                  <p className="text-xs text-gray-600">Các phương pháp đã được kiểm chứng và dễ dàng áp dụng ngay.</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 2: Mục lục */}
          {activeTab === 'toc' && (
            <div className="p-6 sm:p-8 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(book.toc || [
                  { id: 1, title: 'Phần I: Khởi đầu và nguyên lý căn bản', page: 1 },
                  { id: 2, title: 'Phần II: Các quy luật và phương pháp thực thi', page: 24 },
                  { id: 3, title: 'Phần III: Xây dựng hệ thống hiệu quả', page: 68 },
                  { id: 4, title: 'Phần IV: Vượt qua rào cản và duy trì kỷ luật', page: 112 },
                  { id: 5, title: 'Phần V: Kết luận và con đường phía trước', page: 150 }
                ]).map((chap) => (
                  <Link
                    key={chap.id}
                    to={`/read/${book.id}?page=${chap.page || 1}`}
                    className="p-3.5 rounded-xl border border-gray-200 hover:border-[#006953] hover:bg-[#006953]/5 transition-all flex items-center justify-between text-xs group"
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
                  </Link>
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
              <Link
                to={`/read/${book.id}`}
                className="px-6 py-3 rounded-xl bg-[#006953] hover:bg-[#00523c] text-white font-bold text-sm shadow-sm transition-all inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">chrome_reader_mode</span>
                Mở Trình Đọc PDF / Ebook
              </Link>
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
