import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { businessApi } from '../../api/businessApi';
import { catalogApi, toCatalogBook } from '../../api/catalogApi';

export default function ShopPage() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [savedVouchers, setSavedVouchers] = useState({});
  const [store, setStore] = useState(null);
  const [books, setBooks] = useState([]);
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeError, setStoreError] = useState('');

  const toggleSaveVoucher = (code) => {
    setSavedVouchers(prev => {
      const next = { ...prev, [code]: !prev[code] };
      showToast(next[code] ? `Đã lưu mã ${code} vào ví voucher!` : `Đã hủy lưu mã ${code}`, 'success');
      return next;
    });
  };

  const vouchers = [
    { code: 'ALPHA20', discount: 'Giảm 20.000đ', min: 'Đơn từ 150.000đ', color: 'primary' },
    { code: 'ALPHA50', discount: 'Giảm 50.000đ', min: 'Đơn từ 400.000đ', color: 'primary' },
    { code: 'FREESHIP', discount: 'Miễn Phí Vận Chuyển', min: 'Freeship toàn quốc', color: 'tertiary' },
    { code: 'EBOOKDRM15', discount: 'Giảm 15% Ebook', min: 'Kho Ebook DRM', color: 'secondary' }
  ];

  useEffect(() => {
    let active = true;

    async function loadStorefront() {
      setStoreLoading(true);
      setStoreError('');

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || '');
      const storeResponse = isUuid
        ? await businessApi.getStoreById(id)
        : await businessApi.getStoreBySlug(id);

      if (!active) return;
      if (!storeResponse.success || !storeResponse.data) {
        setStoreError(storeResponse.error?.message || 'Không tìm thấy gian hàng.');
        setStoreLoading(false);
        return;
      }

      const currentStore = storeResponse.data;
      setStore(currentStore);
      const booksResponse = await catalogApi.getPublicBooks({
        store: currentStore.id,
        page: 1,
        limit: 50,
        sortBy: 'publishedAt',
        order: 'DESC'
      });

      if (!active) return;
      if (!booksResponse.success) {
        setStoreError(booksResponse.error?.message || 'Không thể tải sách của gian hàng.');
        setBooks([]);
      } else {
        setBooks((booksResponse.data || []).map((book) => {
          const catalogBook = toCatalogBook(book);
          const tag = catalogBook.formatType === 'ebook'
            ? 'Ebook DRM'
            : catalogBook.formatType === 'hybrid'
              ? 'Combo Hybrid'
              : 'Sách In';

          return {
            ...catalogBook,
            reviews: 0,
            tag,
            tagColor: catalogBook.formatType === 'ebook'
              ? 'bg-theme-secondary text-white'
              : catalogBook.formatType === 'hybrid'
                ? 'bg-amber-800 text-white'
                : 'bg-theme-primary text-white'
          };
        }));
      }
      setStoreLoading(false);
    }

    loadStorefront();

    return () => {
      active = false;
    };
  }, [id]);
  const filteredBooks = books.filter(book => {
    if (activeTab === 'new' && !['atomic-habits', 'grit'].includes(book.id)) return false;
    if (activeTab === 'bestseller' && book.rating < 4.85) return false;
    if (activeTab === 'ebook' && book.format !== 'ebook') return false;
    if (activeTab === 'hybrid' && book.format !== 'hybrid') return false;
    if (activeFilter !== 'all' && book.category !== activeFilter) return false;
    return true;
  });
  const featuredBook = books[0];
  const storeInitials = getInitials(store?.name);

  return (
    <div className="w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 font-body-md">
      {/* Breadcrumb */}
      <nav className="text-body-sm text-on-surface-variant flex items-center gap-2 mb-6">
        <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
        <span>/</span>
        <Link to="/books" className="hover:text-primary transition-colors">Sàn TMĐT</Link>
        <span>/</span>
        <span className="text-theme-primary font-semibold">{store?.name || 'Gian hàng HUKI'}</span>
      </nav>

      {storeLoading && <StoreNotice icon="progress_activity" title="Đang tải gian hàng" description="Thông tin gian hàng và danh mục sách đang được đồng bộ." spinning />}
      {!storeLoading && storeError && <StoreNotice icon="storefront" title="Chưa thể hiển thị đầy đủ gian hàng" description={storeError} tone="error" />}

      {/* Publisher Hero Header & Profile Card */}
      <section className="relative rounded-3xl overflow-hidden shadow-sm bg-theme-surface border border-theme-border mb-8">
        {/* Panoramic Banner */}
        <div
          className="h-56 md:h-72 w-full relative bg-cover bg-center"
          style={{
            backgroundImage: `url('${store?.banner || '/banners/hero-library.jpg'}')`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
          <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="px-3 py-1 bg-theme-accent text-white text-xs font-bold rounded-full uppercase tracking-wider mb-2 inline-block shadow-sm">
                Gian hàng đã xác minh
              </span>
              <h1 className="font-editorial text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
                {store?.name || 'Gian hàng sách HUKI'}
              </h1>
            </div>
            <div className="text-right hidden md:block shrink-0">
              <span className="text-emerald-300 font-semibold text-sm block">HUKI DRM Verified Publisher</span>
              <span className="text-stone-300 text-xs">{store?.description || 'Sách thật và sách số bản quyền trên HUKI'}</span>
            </div>
          </div>
        </div>

        {/* Profile Bar */}
        <div className="px-6 sm:px-8 pb-6 pt-2 bg-theme-surface flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 relative z-10 w-full lg:w-auto">
            {/* Publisher Logo Avatar (Negative Top Margin scoped only here) */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1.5 shadow-xl border-4 border-white shrink-0 -mt-14 sm:-mt-16 relative z-20">
              <div className="w-full h-full rounded-xl bg-theme-primary text-white flex flex-col items-center justify-center relative overflow-hidden shadow-inner p-1">
                {store?.logo ? <img src={store.logo} alt={`Logo ${store.name}`} className="h-full w-full rounded-lg object-cover" /> : <span className="font-editorial font-bold text-2xl sm:text-3xl leading-none">{storeInitials}</span>}
                {!store?.logo && <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold mt-1">HUKI Store</span>}
              </div>
            </div>

            {/* Shop Details */}
            <div className="pt-1 sm:pt-2 flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-editorial text-on-surface">{store?.name || 'Gian hàng HUKI'}</h2>
                <span className="bg-theme-accent/10 text-theme-accent px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  Gian Hàng Chính Hãng - Mall
                </span>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-on-surface-variant flex-wrap">
                <span className="flex items-center gap-1 text-amber-600 font-bold">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  {store?.status === 'APPROVED' ? 'Đã được HUKI phê duyệt' : 'Đang cập nhật trạng thái'}
                </span>
                <span>•</span>
                <span><strong>{books.length}</strong> đầu sách đang phát hành</span>
                {store?.email && <><span>•</span><span>{store.email}</span></>}
                {store?.phone && <><span>•</span><span>{store.phone}</span></>}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-start lg:justify-end flex-wrap pt-2 lg:pt-0">
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Tạm khóa — theo dõi và notification nằm ngoài happy case"
              className="flex-1 sm:flex-none px-6 py-2.5 font-semibold rounded-xl border border-theme-border bg-theme-surface text-on-surface-variant opacity-60 flex items-center justify-center gap-2 text-sm cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">lock_clock</span>
              Theo Dõi Shop (Tạm khóa)
            </button>
            <span
              aria-disabled="true"
              title="Tạm khóa — chat nằm ngoài happy case"
              className="flex-1 sm:flex-none px-5 py-2.5 bg-theme-surface border border-theme-border text-on-surface-variant opacity-60 font-semibold rounded-xl flex items-center justify-center gap-2 text-sm cursor-not-allowed shadow-2xs"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              <span>Chat Tư Vấn (Tạm khóa)</span>
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                showToast('Đã sao chép liên kết gian hàng!', 'success');
              }}
              className="p-2.5 bg-theme-surface border border-theme-border hover:border-theme-primary text-on-surface rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Chia sẻ cửa hàng"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
            </button>
          </div>
        </div>
      </section>

      {/* Exclusive Shop Voucher Strip */}
      <div inert={true} className="deferred-surface grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {vouchers.map(v => {
          const isSaved = savedVouchers[v.code];
          return (
            <div
              key={v.code}
              className="bg-theme-surface border-2 border-dashed border-theme-border rounded-2xl p-4 flex items-center justify-between relative overflow-hidden shadow-xs hover:shadow-md transition-all group"
            >
              <div className="absolute -right-3 -top-3 w-7 h-7 rounded-full bg-theme-bg"></div>
              <div className="absolute -right-3 -bottom-3 w-7 h-7 rounded-full bg-theme-bg"></div>
              <div className="pr-2">
                <span className={`text-xs uppercase font-bold px-2 py-0.5 rounded ${
                  v.color === 'tertiary'
                    ? 'bg-theme-secondary-subtle text-theme-secondary'
                    : v.color === 'secondary'
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
                    : 'bg-red-100 text-theme-accent dark:bg-red-950/50 dark:text-red-200'
                }`}>
                  {v.discount}
                </span>
                <h4 className="font-semibold text-sm text-on-surface mt-1.5">{v.min}</h4>
                <p className="text-xs text-on-surface-variant font-mono">Mã: {v.code}</p>
              </div>
              <button
                onClick={() => toggleSaveVoucher(v.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  isSaved
                    ? 'bg-theme-primary text-white'
                    : 'bg-theme-accent/10 hover:bg-theme-accent hover:text-white text-theme-accent'
                }`}
              >
                {isSaved ? 'Đã lưu' : 'Lưu mã'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Storefront Tabs & Quick Filter Bar */}
      <div className="bg-theme-surface rounded-2xl border border-theme-border p-4 sm:p-5 mb-8 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-theme-border pb-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-none">
            {[
              { id: 'all', label: `Tất Cả Sản Phẩm (${books.length})` },
              { id: 'new', label: 'Sách Mới Xuất Bản (24)' },
              { id: 'bestseller', label: 'Bán Chạy Nhất' },
              { id: 'ebook', label: 'Ebook Bản Quyền DRM (140)' },
              { id: 'hybrid', label: 'Combo Tiết Kiệm Hybrid (32)' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-theme-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-theme-surface-subtle'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-filter row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-on-surface-variant font-medium">Chủ đề:</span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'kinh-te', label: 'Kinh Tế & Quản Trị' },
              { id: 'phat-trien-ban-than', label: 'Phát Triển Bản Thân' },
              { id: 'tam-ly', label: 'Tâm Lý Học' },
              { id: 'khoi-nghiep', label: 'Khởi Nghiệp' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1 rounded-full font-medium transition-all ${
                  activeFilter === f.id
                    ? 'bg-theme-primary text-white font-bold'
                    : 'bg-theme-surface-subtle text-on-surface hover:bg-theme-border'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-on-surface-variant font-medium">
            Hiển thị <strong className="text-on-surface">{filteredBooks.length}</strong> tựa sách chất lượng cao
          </div>
        </div>
      </div>

      {/* Featured Bestsellers Showcase Banner */}
      <div 
        style={{ background: 'linear-gradient(to right, var(--theme-hero-from, #003B2B), var(--theme-hero-via, #004D38), var(--theme-hero-to, #00271E))' }}
        className="rounded-3xl text-white p-6 md:p-8 mb-10 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <span className="bg-amber-500 text-stone-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 inline-block shadow-sm">
              Sách Đỉnh Cao 2026
            </span>
            <h3 className="font-editorial text-2xl sm:text-3xl font-bold mb-3 text-white">
              {featuredBook?.title || 'Tuyển chọn sách từ gian hàng'}
            </h3>
            <p className="text-white/90 text-sm sm:text-base mb-6 leading-relaxed">
              {featuredBook?.description || store?.description || 'Khám phá các tựa sách đang được phát hành chính thức trên HUKI EBOOK.'}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to={featuredBook ? `/books/${featuredBook.slug || featuredBook.id}` : '/books'}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold rounded-xl shadow transition-all flex items-center gap-2 text-sm"
              >
                <span className="material-symbols-outlined text-lg">menu_book</span>
                Xem Chi Tiết & Mua Ngay
              </Link>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-300">{featuredBook ? `${featuredBook.price.toLocaleString('vi-VN')}đ` : 'Đang cập nhật'}</span>
              </div>
            </div>
          </div>
          <div className="w-48 h-64 bg-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-sm border border-white/20 rotate-2 transform hover:rotate-0 transition-transform shrink-0">
            <img
              className="w-full h-full object-cover rounded-xl shadow-md"
              src={featuredBook?.cover || '/banners/hero-library.jpg'}
              alt={featuredBook?.title || 'Tuyển chọn sách HUKI'}
            />
          </div>
        </div>
      </div>

      {/* Main Book Catalog Grid (5-column responsive grid) */}
      {!storeLoading && !storeError && filteredBooks.length === 0 && (
        <StoreNotice icon="menu_book" title="Chưa có sách phù hợp" description="Gian hàng chưa phát hành sách hoặc không có sách khớp bộ lọc đang chọn." />
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 mb-12">
        {filteredBooks.map(book => (
          <div
            key={book.id}
            className="bg-theme-surface border border-theme-border rounded-2xl p-4 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden mb-4 bg-theme-surface-subtle">
                <span className={`absolute top-2 left-2 z-10 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm ${book.tagColor}`}>
                  {book.tag}
                </span>
                <Link to={`/books/${book.slug || book.id}`}>
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    src={book.cover}
                    alt={book.title}
                  />
                </Link>
              </div>
              <Link to={`/books/${book.slug || book.id}`} title={book.title}>
                <h4 className="font-semibold text-sm text-on-surface line-clamp-1 truncate mb-1 group-hover:text-theme-accent transition-colors">
                  {book.title}
                </h4>
              </Link>
              <span className="text-xs text-on-surface-variant opacity-50 block mb-2 cursor-not-allowed" aria-disabled="true" title="Tạm khóa — trang tác giả riêng ngoài happy case hiện tại">
                {book.author}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-3 text-xs">
                <span className="material-symbols-outlined text-sm text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="font-bold text-on-surface">{book.rating}</span>
                <span className="text-on-surface-variant">({book.reviews})</span>
              </div>
              <div className="flex items-center justify-between pt-2.5 border-t border-theme-border">
                <div>
                  <span className="font-bold text-theme-accent text-base">{book.price.toLocaleString('vi-VN')}đ</span>
                  <span className="block text-xs line-through text-theme-text-muted">{book.originalPrice.toLocaleString('vi-VN')}đ</span>
                </div>
                <button
                  onClick={() => {
                    addToCart({
                      id: book.id,
                      title: book.title,
                      price: book.price,
                      format: book.format,
                      cover: book.cover,
                      publisher: book.publisher
                    }, book.format.toLowerCase().includes('ebook') ? 'ebook' : 'physical');
                    showToast(`Đã thêm "${book.title}" vào giỏ hàng!`, 'success');
                  }}
                  className="p-2.5 rounded-xl bg-theme-bg hover:bg-theme-primary hover:text-white text-theme-secondary transition-all shadow-xs"
                  title="Thêm vào giỏ hàng"
                >
                  <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Publisher Story & Credibility Card */}
      <section className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-8 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-theme-primary bg-theme-secondary-subtle px-3 py-1 rounded-full">
              Về {store?.name || 'gian hàng HUKI'}
            </span>
            <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface">
              Gian hàng sách thật và sách số bản quyền
            </h3>
            <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed">
              {store?.description || 'Gian hàng cung cấp các tác phẩm đã được phê duyệt và phát hành trên nền tảng HUKI EBOOK.'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-3 bg-theme-bg rounded-xl text-center">
                <div className="font-bold text-xl text-theme-primary">{books.length}</div>
                <div className="text-xs text-on-surface-variant">Đầu sách phát hành</div>
              </div>
              <div className="p-3 bg-theme-bg rounded-xl text-center">
                <div className="font-bold text-xl text-theme-primary">{store?.isActive ? 'Mở cửa' : 'Tạm dừng'}</div>
                <div className="text-xs text-on-surface-variant">Trạng thái gian hàng</div>
              </div>
              <div className="p-3 bg-theme-bg rounded-xl text-center">
                <div className="font-bold text-xl text-theme-primary">{store?.createdAt ? new Date(store.createdAt).getFullYear() : '—'}</div>
                <div className="text-xs text-on-surface-variant">Năm tham gia HUKI</div>
              </div>
              <div className="p-3 bg-theme-bg rounded-xl text-center">
                <div className="font-bold text-xl text-theme-primary">100%</div>
                <div className="text-xs text-on-surface-variant">Bản quyền chuẩn DRM</div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 flex justify-center">
            <div className="p-6 bg-theme-primary text-white rounded-2xl text-center space-y-3 w-full max-w-xs shadow-md">
              <span className="material-symbols-outlined text-4xl text-[#fea619]">verified_user</span>
              <h4 className="font-bold text-base">Cam Kết Chính Hãng 100%</h4>
              <p className="text-xs text-white/80">
                Mọi ấn bản sách giấy đều có tem chống hàng giả, sách điện tử DRM hỗ trợ đọc ngoại tuyến trên tối đa 5 thiết bị.
              </p>
              <button
                type="button"
                disabled
                title="Chính sách bảo hành thuộc phase sau"
                className="w-full py-2 bg-white/15 rounded-lg text-xs font-semibold opacity-60 cursor-not-allowed"
              >
                Chính Sách Bảo Hành
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function getInitials(name = '') {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return initials || 'HK';
}

function StoreNotice({ icon, title, description, tone = 'neutral', spinning = false }) {
  const toneClass = tone === 'error'
    ? 'border-red-200 bg-red-50 text-red-900'
    : 'border-theme-border bg-theme-surface text-on-surface';

  return (
    <div className={`mb-6 rounded-2xl border px-6 py-8 text-center ${toneClass}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className={`material-symbols-outlined text-4xl ${spinning ? 'animate-spin' : ''}`} aria-hidden="true">{icon}</span>
      <h2 className="mt-2 text-base font-bold">{title}</h2>
      <p className="mt-1 text-sm opacity-75">{description}</p>
    </div>
  );
}
