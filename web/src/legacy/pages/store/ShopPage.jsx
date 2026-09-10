import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

export default function ShopPage() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isFollowed, setIsFollowed] = useState(false);
  const [savedVouchers, setSavedVouchers] = useState({});

  const toggleSaveVoucher = (code) => {
    setSavedVouchers(prev => {
      const next = { ...prev, [code]: !prev[code] };
      showToast(next[code] ? `Đã lưu mã ${code} vào ví voucher!` : `Đã hủy lưu mã ${code}`, 'success');
      return next;
    });
  };

  const handleFollow = () => {
    setIsFollowed(prev => {
      const next = !prev;
      showToast(next ? 'Đã theo dõi Alpha Books Official Store!' : 'Đã bỏ theo dõi cửa hàng.', next ? 'success' : 'info');
      return next;
    });
  };

  const vouchers = [
    { code: 'ALPHA20', discount: 'Giảm 20.000đ', min: 'Đơn từ 150.000đ', color: 'primary' },
    { code: 'ALPHA50', discount: 'Giảm 50.000đ', min: 'Đơn từ 400.000đ', color: 'primary' },
    { code: 'FREESHIP', discount: 'Miễn Phí Vận Chuyển', min: 'Freeship toàn quốc', color: 'tertiary' },
    { code: 'EBOOKDRM15', discount: 'Giảm 15% Ebook', min: 'Kho Ebook DRM', color: 'secondary' }
  ];

  const books = [
    {
      id: 'atomic-habits',
      title: 'Atomic Habits - Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ',
      author: 'James Clear',
      price: 129000,
      originalPrice: 198000,
      rating: 4.9,
      reviews: 3420,
      tag: 'Bestseller',
      tagColor: 'bg-theme-accent text-white',
      format: 'hybrid',
      category: 'phat-trien-ban-than',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA53AnKQnh_CvQZkKdgIVlAr69RGZi-Dy_-3urusFYsOguAICJMpGRsU85cbWni4isxviEEkUKqkRCbJ5ueD-G6ys8WaQ2MMUeOfQc35hhCHTyVW6HvA1qu9GgdWj-79QinbXun6KsdNRBGwwFc8KHlTtm9n-RZ3vb6WH6vSR13XZ9-w18ittfip9My_AtHU9afgpWLiOpFBdWm7G8UW0lwQztO50FOnTqdl0m9-V26JGH-brBYGrO7Cw'
    },
    {
      id: 'deep-work',
      title: 'Deep Work - Làm Ra Làm Chơi Ra Chơi',
      author: 'Cal Newport',
      price: 79000,
      originalPrice: 120000,
      rating: 4.8,
      reviews: 2150,
      tag: 'Ebook DRM',
      tagColor: 'bg-theme-secondary text-white',
      format: 'ebook',
      category: 'kinh-te',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUoGOHjQ2hoZxnNvlZMZ0EaHKTarSa9EdssU1WWQ8_CEqlDjPkxJ-Eo73jLzR07vvMUGL3X62Bi5cAkdtSoNOn5msr3ZD-146e8TCkcN3gc-r1IiY2QTqqFwp5vHvs6ZfeOU9kdYkLQvDNXp9QZMPbIJ36ZmGICQZQ0_pAgRFNWe6OKgOLgcrsHoCORCXMiXdnKUs7a0kVDcUW1OZu89Z_pEK89aKwgsjfagK9eqmf-T5_pS96mX9_sw'
    },
    {
      id: 'thinking-fast-slow',
      title: 'Tư Duy Nhanh Và Chậm (Thinking, Fast and Slow)',
      author: 'Daniel Kahneman',
      price: 159000,
      originalPrice: 240000,
      rating: 4.9,
      reviews: 5610,
      tag: 'Combo Hybrid',
      tagColor: 'bg-amber-800 text-white',
      format: 'hybrid',
      category: 'tam-ly',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANH9QImz-ucfcn9uv_MlbqtxToG_dytIK3a8VA3WhDMJxtc7C7nGB3P4THS39VcuT2OdgWu_eGDaTUI8j1aBQd9YjObATDkleR2X6wUk023tz5x5l0XYGbT8s-eLIGufFcL4aRX3zc_qLlav8X4ZhfgFjrtLdWa3cdUfuPPmARFsOJnMDclYDZhaEFkNzE9zo16on8sZQNc-K3QwPJDkP5As62z9yINTaSyFZzuO50mMkGPL_R5Vz0Pw'
    },
    {
      id: 'lean-startup',
      title: 'Khởi Nghiệp Tinh Gọn (The Lean Startup)',
      author: 'Eric Ries',
      price: 115000,
      originalPrice: 169000,
      rating: 4.7,
      reviews: 1840,
      tag: 'Sách Giấy',
      tagColor: 'bg-theme-primary text-white',
      format: 'physical',
      category: 'khoi-nghiep',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAknvziFGs_CitMs_0JZvRWN1iKVDBH09Y7RKC4MlS4SsZmQNvmgy1C56mlOem0R5rPapycbEtlozf30XGURqZ1iRVLVPpPojp-adJI9DrBl97-pbkzrJDJnv8Y6i-KTEBJhtR48WcyDEUEw3bZTZPI3rOVeKHD4cSK0AnP8Amm3AM3odYYZvcKKp2RvMcicUA86798-VcN9kJfID4I3xpHcgcpXNB3SiOzUoBpEXQLrG9bvNoCDGUIpQ'
    },
    {
      id: 'start-with-why',
      title: 'Bắt Đầu Với Câu Hỏi Tại Sao (Start With Why)',
      author: 'Simon Sinek',
      price: 99000,
      originalPrice: 145000,
      rating: 4.85,
      reviews: 2890,
      tag: 'Bestseller',
      tagColor: 'bg-theme-accent text-white',
      format: 'ebook',
      category: 'kinh-te',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjgnwa9G3UcVqohHuu1ky9tGqqJaffDqENIcbnvbC4V33nXAN1RzXK7Infa5ig737CMNvJKpKbHxlGbnf3XMJix08LNjSVTkIjgsxwLgd6uSps5RzGkLczuULkinxoH_ey7coA1DnldeLUGG3ukev7R3FZaugpryH9VAvys10Il-8M0pk-q1fyN5ZiMXarjiRWn4dokVSirk_wdiZOqubfbC8Rey2_o4SyHyPrIDlrP2vAaptd6TudTg'
    },
    {
      id: 'psychology-of-money',
      title: 'Tâm Lý Học Về Tiền (The Psychology of Money)',
      author: 'Morgan Housel',
      price: 125000,
      originalPrice: 189000,
      rating: 4.95,
      reviews: 4120,
      tag: 'Combo Hybrid',
      tagColor: 'bg-amber-800 text-white',
      format: 'hybrid',
      category: 'kinh-te',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBPtM4fEF50qiA3LJT6VRKZ4N7fTPN6jOoxh2ryBnzedt5FA5_VTRim9wYpzGX1LBNImhplf6XFrSgwnvdVFanZ2TEFWln9kRUk0j0FDd54xHUJJql6Lw3bHytmH2n_PbDCsDtu9_o0sUCgc9ZNUl--xR6TmfF825RDGooi07RHZ-74OyLPkpqUkrYgxkbp054QNKTO5hp82EqWyeC1yqcp0rOHERKeBFh7vHjCmZu9qxm5Dvs0BJkEaw'
    },
    {
      id: 'grit',
      title: 'Grit - Vững Tâm Bền Chí Đến Thành Công',
      author: 'Angela Duckworth',
      price: 108000,
      originalPrice: 155000,
      rating: 4.75,
      reviews: 1450,
      tag: 'Sách In',
      tagColor: 'bg-theme-primary text-white',
      format: 'physical',
      category: 'phat-trien-ban-than',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA6z4RRX8HMlIcOvy2R0r2l59OBusqbAGxZMmlR78cuCyeDC8gGZns6bdxsLLTKhbllY6ipqLiDdY75myavSumNiw42XGt15k-jDiJpYDQPKDrkSF1w7YIIXJidh7ufUJ_vFBZtyyMiDY3oaMvyA5Egf0W9ek9yxT90H9l8M9eKSe3wAdjf0JpJcGlYPmYIve2otBzZaejypLqysxWf0ZDdUdYkqdJZuucX46VRZsUu7meEJrfU1dCVVw'
    },
    {
      id: 'principles',
      title: 'Nguyên Tắc Để Thành Công (Principles)',
      author: 'Ray Dalio',
      price: 245000,
      originalPrice: 350000,
      rating: 4.9,
      reviews: 3880,
      tag: 'Ebook DRM',
      tagColor: 'bg-theme-secondary text-white',
      format: 'ebook',
      category: 'kinh-te',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAjTLa-EsuM3rAWCh7QLNIibiUWD653rBXryru_Jm_EF0wZW4y-iu_MEhVPSofjLC51Q-mcpY6LK9ZFs5uMtEB0CFUp-uJycDwy6uYh4tlaXcIvZXN-K54DVKnrOpk767ZNWT6ifu0fqPVQ8L2bs9tl6LERKtNGUpUsbOX0jig_DPsfwPYYhcf6KivlIei79lVB2OH3MF9WtjhEoxYGMJQILVOWMGuMuuuvutHrRyYYwlR6EJ1732DOkg'
    }
  ];

  const filteredBooks = books.filter(book => {
    if (activeTab === 'new' && !['atomic-habits', 'grit'].includes(book.id)) return false;
    if (activeTab === 'bestseller' && book.rating < 4.85) return false;
    if (activeTab === 'ebook' && book.format !== 'ebook') return false;
    if (activeTab === 'hybrid' && book.format !== 'hybrid') return false;
    if (activeFilter !== 'all' && book.category !== activeFilter) return false;
    return true;
  });

  return (
    <div className="w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 font-body-md">
      {/* Breadcrumb */}
      <nav className="text-body-sm text-on-surface-variant flex items-center gap-2 mb-6">
        <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
        <span>/</span>
        <Link to="/books" className="hover:text-primary transition-colors">Sàn TMĐT</Link>
        <span>/</span>
        <span className="text-theme-primary font-semibold">Alpha Books Official Store</span>
      </nav>

      {/* Publisher Hero Header & Profile Card */}
      <section className="relative rounded-3xl overflow-hidden shadow-sm bg-theme-surface border border-theme-border mb-8">
        {/* Panoramic Banner */}
        <div
          className="h-56 md:h-72 w-full relative bg-cover bg-center"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCeCTntEsOoh4pvyAI9RR559lNcDh8232FrQ2nzx934Y0Q0NSn1i7Nxp9Sp3pEWf7zQXfB1YPSfE1YJlwIyOyE8kpOmGwMeeB0WEP_qAkjMuY3EioZCLHDG2n_VCr8CA6rUepryndOGStUSrRnBPanrasuFQI2gKB-40r0x5BS4Iz1m0X2abgiGL6_dr6XVYXrnZiTtCtN2hmClugyACqeGpLKUUJ6vdXqgEjz-cnrWGYq6aSiwOMv8zg')`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
          <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="px-3 py-1 bg-theme-accent text-white text-xs font-bold rounded-full uppercase tracking-wider mb-2 inline-block shadow-sm">
                NXB Đối Tác Độc Quyền
              </span>
              <h1 className="font-editorial text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
                Tri Thức Là Sức Mạnh - Tinh Hoa Quản Trị & Đổi Mới Sáng Tạo
              </h1>
            </div>
            <div className="text-right hidden md:block shrink-0">
              <span className="text-emerald-300 font-semibold text-sm block">HUKI DRM Verified Publisher</span>
              <span className="text-stone-300 text-xs">Đồng hành cùng độc giả Việt Nam từ 2010</span>
            </div>
          </div>
        </div>

        {/* Profile Bar */}
        <div className="px-6 sm:px-8 pb-6 pt-2 bg-theme-surface flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 relative z-10 w-full lg:w-auto">
            {/* Publisher Logo Avatar (Negative Top Margin scoped only here) */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1.5 shadow-xl border-4 border-white shrink-0 -mt-14 sm:-mt-16 relative z-20">
              <div className="w-full h-full rounded-xl bg-theme-primary text-white flex flex-col items-center justify-center relative overflow-hidden shadow-inner p-1">
                <span className="font-editorial font-bold text-2xl sm:text-3xl leading-none">AB</span>
                <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold mt-1">Alpha Books</span>
              </div>
            </div>

            {/* Shop Details */}
            <div className="pt-1 sm:pt-2 flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-editorial text-on-surface">Alpha Books Official</h2>
                <span className="bg-theme-accent/10 text-theme-accent px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  Gian Hàng Chính Hãng - Mall
                </span>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-on-surface-variant flex-wrap">
                <span className="flex items-center gap-1 text-amber-600 font-bold">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  4.9/5 <span className="text-on-surface-variant font-normal">(18.4k đánh giá)</span>
                </span>
                <span>•</span>
                <span><strong>142.5k</strong> Người theo dõi</span>
                <span>•</span>
                <span><strong>385</strong> Đầu sách</span>
                <span>•</span>
                <span>Phản hồi chat: <strong className="text-emerald-700">99% (Dưới 5 phút)</strong></span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-start lg:justify-end flex-wrap pt-2 lg:pt-0">
            <button
              onClick={handleFollow}
              className={`flex-1 sm:flex-none px-6 py-2.5 font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm cursor-pointer ${
                isFollowed
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-theme-primary hover:bg-theme-primary-hover text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isFollowed ? 'check' : 'add'}
              </span>
              {isFollowed ? 'Đang Theo Dõi' : 'Theo Dõi Shop'}
            </button>
            <Link
              to="/chat?shop=alpha-books"
              className="flex-1 sm:flex-none px-5 py-2.5 bg-theme-surface border border-theme-border hover:border-theme-primary hover:bg-theme-secondary-subtle text-on-surface font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-2xs"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              <span>Chat Tư Vấn</span>
            </Link>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              Atomic Habits - Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ
            </h3>
            <p className="text-white/90 text-sm sm:text-base mb-6 leading-relaxed">
              Tác phẩm kinh điển về xây dựng thói quen của James Clear. Nay đi kèm đặc quyền Ebook DRM chính hãng đọc mọi lúc mọi nơi trên thiết bị Huki Reader.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/book/atomic-habits"
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold rounded-xl shadow transition-all flex items-center gap-2 text-sm"
              >
                <span className="material-symbols-outlined text-lg">menu_book</span>
                Xem Chi Tiết & Mua Ngay
              </Link>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-300">129.000đ</span>
                <span className="text-sm line-through text-stone-300">198.000đ</span>
              </div>
            </div>
          </div>
          <div className="w-48 h-64 bg-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-sm border border-white/20 rotate-2 transform hover:rotate-0 transition-transform shrink-0">
            <img
              className="w-full h-full object-cover rounded-xl shadow-md"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWItUxTURt8zzPltJ1MGh3ehJoZ_Udl0tKD87x8mTuxTuTWcc9kxdyTMWzI-8SegOFSS4X7FXyoj98aJgcSp9sKsR6LOwVthAa0Ld57CaH9Q-bMyfMqFmyPd_0nXbJBU6ReXwFnSX4KV7UFG_sdCOuZNdll2OcOGC7L9eqmHXZ8_8efFgM3zWJAjZs0Mlrunn5SLw2HTb5nW9J9QTA8fSZGcvuR8t5t5xDJDB4MzQ5URhROtTxmQIOIw"
              alt="Atomic Habits"
            />
          </div>
        </div>
      </div>

      {/* Main Book Catalog Grid (5-column responsive grid) */}
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
                <Link to={`/book/${book.id}`}>
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    src={book.cover}
                    alt={book.title}
                  />
                </Link>
              </div>
              <Link to={`/book/${book.id}`} title={book.title}>
                <h4 className="font-semibold text-sm text-on-surface line-clamp-1 truncate mb-1 group-hover:text-theme-accent transition-colors">
                  {book.title}
                </h4>
              </Link>
              <Link to="/author/james-clear" className="text-xs text-on-surface-variant hover:text-theme-primary transition-colors block mb-2">
                {book.author}
              </Link>
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
                      publisher: 'Alpha Books'
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
              Về Nhà Xuất Bản Alpha Books
            </span>
            <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface">
              Tiên Phong Kiến Tạo Tri Thức Quản Trị & Đổi Mới Tại Việt Nam
            </h3>
            <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed">
              Thành lập từ năm 2005, Alpha Books tự hào là đơn vị xuất bản hàng đầu trong mảng sách Quản trị kinh doanh, Kinh tế, Kỹ năng sống và Tư duy đổi mới sáng tạo. Chúng tôi liên tục hợp tác cùng các tác giả danh tiếng thế giới như James Clear, Eric Ries, Peter Thiel để chuyển ngữ chuẩn xác và phát hành các ấn bản Ebook DRM bảo mật cao nhất trên nền tảng Huki Ebook.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-3 bg-theme-bg rounded-xl text-center">
                <div className="font-bold text-xl text-theme-primary">15+</div>
                <div className="text-xs text-on-surface-variant">Năm phát triển</div>
              </div>
              <div className="p-3 bg-theme-bg rounded-xl text-center">
                <div className="font-bold text-xl text-theme-primary">2.500+</div>
                <div className="text-xs text-on-surface-variant">Đầu sách xuất bản</div>
              </div>
              <div className="p-3 bg-theme-bg rounded-xl text-center">
                <div className="font-bold text-xl text-theme-primary">10M+</div>
                <div className="text-xs text-on-surface-variant">Bản in đã bán</div>
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
                onClick={() => showToast('Cam kết đổi mới 1-1 trong 7 ngày nếu lỗi in ấn!', 'info')}
                className="w-full py-2 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold transition-colors"
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
