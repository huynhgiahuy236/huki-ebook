import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

export default function AuthorPage() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [isFollowing, setIsFollowing] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [emailInput, setEmailInput] = useState('');

  const handleFollow = () => {
    setIsFollowing(prev => {
      const next = !prev;
      showToast(next ? 'Đã theo dõi tác giả James Clear!' : 'Đã hủy theo dõi tác giả.', next ? 'success' : 'info');
      return next;
    });
  };

  const copyQuote = (quoteText) => {
    navigator.clipboard.writeText(quoteText);
    showToast('Đã sao chép trích dẫn vào clipboard!', 'success');
  };

  const handleSubscribeNewsletter = (e) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      showToast('Vui lòng nhập địa chỉ email hợp lệ!', 'error');
      return;
    }
    showToast('Đăng ký nhận bản tin 3-2-1 Thứ Năm thành công!', 'success');
    setEmailInput('');
  };

  const quotes = [
    {
      id: 1,
      text: 'Every action you take is a vote for the type of person you wish to become. No single instance will transform your beliefs, but as the votes build up, so does the evidence of your new identity.',
      source: 'Atomic Habits (Chương 2)',
      borderColor: 'border-[#ac2c19]'
    },
    {
      id: 2,
      text: 'Habits are the compound interest of self-improvement. Getting 1 percent better every day counts a lot in the long run.',
      source: 'Atomic Habits (Chương 1)',
      borderColor: 'border-[#003B2B]'
    },
    {
      id: 3,
      text: "If you're having trouble changing your habits, the problem isn't you. The problem is your system. Bad habits repeat themselves again and again not because you don't want to change, but because you have the wrong system for change.",
      source: 'Atomic Habits (Chương 3)',
      borderColor: 'border-[#fea619]'
    }
  ];

  const authorWorks = [
    {
      id: 'atomic-habits',
      title: 'Atomic Habits - Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ',
      format: 'hybrid',
      formatLabel: 'Combo Hybrid (In + Ebook)',
      badge: 'Bestseller Toàn Cầu',
      price: 129000,
      originalPrice: 198000,
      rating: 4.98,
      reviews: 14200,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA53AnKQnh_CvQZkKdgIVlAr69RGZi-Dy_-3urusFYsOguAICJMpGRsU85cbWni4isxviEEkUKqkRCbJ5ueD-G6ys8WaQ2MMUeOfQc35hhCHTyVW6HvA1qu9GgdWj-79QinbXun6KsdNRBGwwFc8KHlTtm9n-RZ3vb6WH6vSR13XZ9-w18ittfip9My_AtHU9afgpWLiOpFBdWm7G8UW0lwQztO50FOnTqdl0m9-V26JGH-brBYGrO7Cw'
    },
    {
      id: 'atomic-habits-ebook',
      title: 'Atomic Habits (Bản Ebook DRM Độc Quyền)',
      format: 'ebook',
      formatLabel: 'Ebook DRM Số',
      badge: 'DRM Active',
      price: 69000,
      originalPrice: 110000,
      rating: 4.95,
      reviews: 8400,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWItUxTURt8zzPltJ1MGh3ehJoZ_Udl0tKD87x8mTuxTuTWcc9kxdyTMWzI-8SegOFSS4X7FXyoj98aJgcSp9sKsR6LOwVthAa0Ld57CaH9Q-bMyfMqFmyPd_0nXbJBU6ReXwFnSX4KV7UFG_sdCOuZNdll2OcOGC7L9eqmHXZ8_8efFgM3zWJAjZs0Mlrunn5SLw2HTb5nW9J9QTA8fSZGcvuR8t5t5xDJDB4MzQ5URhROtTxmQIOIw'
    },
    {
      id: 'clear-habit-journal',
      title: 'The Clear Habit Journal - Sổ Tay Thiết Lập Thói Quen',
      format: 'physical',
      formatLabel: 'Sách In Bìa Cứng',
      badge: 'Ấn Bản Đặc Biệt',
      price: 185000,
      originalPrice: 240000,
      rating: 4.9,
      reviews: 3100,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjgnwa9G3UcVqohHuu1ky9tGqqJaffDqENIcbnvbC4V33nXAN1RzXK7Infa5ig737CMNvJKpKbHxlGbnf3XMJix08LNjSVTkIjgsxwLgd6uSps5RzGkLczuULkinxoH_ey7coA1DnldeLUGG3ukev7R3FZaugpryH9VAvys10Il-8M0pk-q1fyN5ZiMXarjiRWn4dokVSirk_wdiZOqubfbC8Rey2_o4SyHyPrIDlrP2vAaptd6TudTg'
    },
    {
      id: 'transform-habits-masterclass',
      title: 'Transform Your Habits - Tuyển Tập Bài Giảng & Case Studies',
      format: 'ebook',
      formatLabel: 'Ebook Kèm Video Talk',
      badge: 'Khóa Học Số',
      price: 149000,
      originalPrice: 220000,
      rating: 4.92,
      reviews: 2800,
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUoGOHjQ2hoZxnNvlZMZ0EaHKTarSa9EdssU1WWQ8_CEqlDjPkxJ-Eo73jLzR07vvMUGL3X62Bi5cAkdtSoNOn5msr3ZD-146e8TCkcN3gc-r1IiY2QTqqFwp5vHvs6ZfeOU9kdYkLQvDNXp9QZMPbIJ36ZmGICQZQ0_pAgRFNWe6OKgOLgcrsHoCORCXMiXdnKUs7a0kVDcUW1OZu89Z_pEK89aKwgsjfagK9eqmf-T5_pS96mX9_sw'
    }
  ];

  const filteredWorks = authorWorks.filter(w => {
    if (selectedFormat === 'all') return true;
    return w.format === selectedFormat;
  });

  return (
    <div className="w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 font-body-md">
      {/* Breadcrumb Navigation */}
      <nav className="text-body-sm text-on-surface-variant mb-6 flex items-center gap-2 flex-wrap">
        <Link to="/" className="hover:text-[#ac2c19] transition-colors">Trang chủ</Link>
        <span>/</span>
        <Link to="/books" className="hover:text-[#ac2c19] transition-colors">Sàn TMĐT Sách</Link>
        <span>/</span>
        <span className="text-theme-primary font-semibold">Tác Giả James Clear</span>
      </nav>

      {/* Author Hero Banner & Profile Showcase Card */}
      <section className="bg-theme-surface rounded-3xl border border-theme-border overflow-hidden shadow-sm mb-10">
        {/* Panoramic Atmosphere Banner */}
        <div
          className="relative h-60 sm:h-72 w-full bg-cover bg-center"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuA1VDqjDOSPyyJ5ap_0A3jiE5ZJZuH8uVx_33X9ktESvQJIdhbKnd9_D7E38MjWtj42UAN9J-hSVOAvOPcu1g6KsgGLijmCM4NS4chTShFKf3M6n3dsMA6ddt7TMPwbSr6ySafWv6EPzSRh8wzAWv0YrmTDHeQCb8C3h3aLX4uQ6MAKVPm1xkeP1siBPAJfgQU9pifYINXPz4G2ozflfLmIScArJwtZYlStUMYQ9nxid6TSBfCOpn9UTw')`
          }}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to right, var(--theme-hero-from, #003B2B) 0%, var(--theme-hero-via, #003B2B) 60%, transparent 100%)', opacity: 0.95 }}
          ></div>
          
          <div className="absolute top-6 right-6 bg-[#fea619] text-[#2a1700] px-4 py-1.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            <span>Tác Giả Bestseller Số 1 New York Times</span>
          </div>

          <div className="absolute bottom-6 right-8 hidden lg:block text-right max-w-xl pointer-events-none text-white">
            <p className="font-editorial italic text-lg lg:text-xl leading-snug text-white/95">
              "You do not rise to the level of your goals. You fall to the level of your systems."
            </p>
            <span className="text-white/70 text-xs font-medium mt-1 block">— James Clear</span>
          </div>
        </div>

        {/* Profile Bar */}
        <div className="px-6 sm:px-8 pb-8 pt-0 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-theme-border/60">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative shrink-0 -mt-14 sm:-mt-16">
                <img
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-white shadow-xl bg-white"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAf8X-5HnLBV4VIw0BCdP-wUMRAI67_BZfUhYoAPEljm-ZdDw0qmLQxhUVnw6k0t9bRVHGR_vthVoEYGCJaXDnqbdeU3dodRGmwATUmRGVvjUJHMwbi8dE3lIhdcdDWFkZ3dUj_gf-ANWc4qEodT8bgmu1L-WmFvtrLg99EdOyUh0b3rDDhhotexyEaUmz5Y4bqgr93js5BvdwQUJPSmUjS2rnV9U0Urkz-ISgOmICuFNFe08RfAx0r4Q"
                  alt="James Clear"
                />
                <span className="absolute bottom-1 right-1 bg-theme-secondary text-white p-1 rounded-full ring-2 ring-white flex items-center justify-center shadow-sm" title="Verified Author">
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                </span>
              </div>
              <div className="pt-2 sm:pt-3">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface">James Clear</h1>
                  <span className="bg-theme-secondary-subtle text-theme-primary px-2.5 py-0.5 rounded-full text-xs font-semibold border border-theme-border">Mỹ</span>
                  <span className="bg-red-50 text-[#ac2c19] px-2.5 py-0.5 rounded-full text-xs font-semibold">Tâm lý học hành vi</span>
                </div>
                <p className="text-sm text-on-surface-variant">Diễn giả quốc tế & Chuyên gia hàng đầu về xây dựng thói quen và cải thiện hiệu suất</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap self-start md:self-center pt-2 md:pt-0">
              <button
                onClick={handleFollow}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-sm cursor-pointer ${
                  isFollowing
                    ? 'bg-theme-secondary-subtle text-theme-secondary border border-theme-border'
                    : 'bg-theme-secondary hover:opacity-90 text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isFollowing ? 'check' : 'person_add'}
                </span>
                <span>{isFollowing ? 'Đang Theo Dõi' : '+ Theo Dõi Tác Giả'}</span>
              </button>
              <Link
                to="/community/club/lean-growth"
                className="px-5 py-2.5 bg-theme-surface hover:bg-theme-bg border border-theme-border text-on-surface rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">forum</span>
                <span>Thảo Luận Salon</span>
              </Link>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showToast('Đã sao chép link hồ sơ tác giả!', 'success');
                }}
                className="p-2.5 bg-theme-surface hover:bg-theme-bg border border-theme-border text-on-surface rounded-xl transition-colors cursor-pointer"
                title="Chia sẻ"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-theme-border">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-theme-secondary-subtle">
              <div className="w-10 h-10 rounded-xl bg-[#fea619]/15 text-[#855300] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              </div>
              <div>
                <div className="font-bold text-base text-on-surface">4.98 <span className="text-xs text-on-surface-variant font-normal">/5.0</span></div>
                <div className="text-xs text-on-surface-variant">Đánh giá trung bình</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-theme-secondary-subtle">
              <div className="w-10 h-10 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">group</span>
              </div>
              <div>
                <div className="font-bold text-base text-on-surface">28.5k</div>
                <div className="text-xs text-on-surface-variant">Người theo dõi Huki</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-theme-secondary-subtle">
              <div className="w-10 h-10 rounded-xl bg-[#ac2c19]/10 text-[#ac2c19] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">auto_stories</span>
              </div>
              <div>
                <div className="font-bold text-base text-on-surface">4 Tác phẩm</div>
                <div className="text-xs text-on-surface-variant">Độc quyền bản quyền số</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-theme-secondary-subtle">
              <div className="w-10 h-10 rounded-xl bg-theme-secondary-subtle text-theme-secondary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">verified_user</span>
              </div>
              <div>
                <div className="font-bold text-base text-on-surface">Alpha Books</div>
                <div className="text-xs text-on-surface-variant">Đối tác phát hành chính thức</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2-Column Split: Biography & Exclusive Literary Quotes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Left (7/12): Biography */}
        <div className="lg:col-span-7 bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-editorial text-2xl font-bold text-theme-primary">Hành Trình Nghiên Cứu & Triết Lý Sống</h2>
              <span className="text-xs font-bold uppercase tracking-wider text-[#ac2c19] bg-red-50 px-3 py-1 rounded-full">
                Tiểu sử chính thức
              </span>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-on-surface leading-relaxed">
              <p>
                James Clear là nhà văn và diễn giả nổi tiếng tập trung vào các chủ đề thói quen, ra quyết định và cải thiện liên tục. Cuốn sách <strong>"Atomic Habits" (Thói Quen Nguyên Tử)</strong> của ông đã bán được hơn 15 triệu bản trên toàn cầu, được dịch ra hơn 50 ngôn ngữ và trở thành một trong những cẩm nang phát triển bản thân có sức ảnh hưởng sâu rộng nhất thế kỷ 21.
              </p>
              <p>
                Triết lý cốt lõi của James Clear dựa trên mô hình 4 bước xây dựng thói quen: <em>Khao khát, Gợi ý, Phản ứng và Phần thưởng</em>. Ông tin rằng sự thay đổi lớn không đến từ những cú sốc tinh thần hay mục tiêu vĩ đại, mà đến từ những cải thiện nhỏ 1% mỗi ngày tích lũy theo thời gian.
              </p>
              <p>
                Tại hệ thống Huki Ebook, James Clear trực tiếp phối hợp cùng đội ngũ biên dịch viên cao cấp từ Alpha Books để mang đến các phiên bản Ebook DRM tương tác, Nhật ký hành vi độc quyền và các buổi thảo luận salon trực tuyến dành riêng cho độc giả thành viên VIP.
              </p>
            </div>
          </div>

          {/* Trust Guarantee Box */}
          <div className="mt-8 pt-6 border-t border-theme-border bg-theme-secondary-subtle -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-6 sm:p-8 rounded-b-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-theme-primary text-white flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[26px]">gpp_good</span>
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-theme-primary mb-1">Cam Kết Bản Quyền Sạch & Tiêu Chuẩn DRM Core 2026</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  100% Sách của James Clear trên Huki đều có chữ ký số độc quyền, mã hóa chống sao chép và hỗ trợ đồng bộ đa thiết bị đọc sách chuyên dụng.
                </p>
              </div>
            </div>
            <Link to="/settings/devices" className="bg-theme-secondary hover:opacity-90 text-white px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shadow-xs transition-colors">
              Quản Lý Thiết Bị
            </Link>
          </div>
        </div>

        {/* Right (5/12): 3 Callout Quote Cards */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-editorial text-xl font-bold text-theme-primary">Trích Dẫn Nổi Bật</h3>
            <span className="text-xs text-on-surface-variant">Bấm để sao chép</span>
          </div>

          {quotes.map(q => (
            <div
              key={q.id}
              className={`bg-theme-secondary-subtle border-l-4 ${q.borderColor} p-5 rounded-r-2xl shadow-xs relative group hover:bg-theme-surface transition-all`}
            >
              <p className="font-editorial italic text-sm sm:text-base text-on-surface mb-3 leading-relaxed">
                "{q.text}"
              </p>
              <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
                <span>{q.source}</span>
                <button
                  onClick={() => copyQuote(q.text)}
                  className="flex items-center gap-1 text-[#ac2c19] hover:underline opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  Sao chép
                </button>
              </div>
            </div>
          ))}

          {/* Newsletter Box */}
          <form
            onSubmit={handleSubscribeNewsletter}
            className="text-white p-6 rounded-2xl shadow-md space-y-3 mt-2"
            style={{ background: 'linear-gradient(to right, var(--theme-hero-from, #003B2B), var(--theme-hero-to, #005140))' }}
          >
            <div className="flex items-center gap-2 text-[#fea619] text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-base">mail</span>
              Bản Tin 3-2-1 Thứ Năm (James Clear)
            </div>
            <p className="text-xs text-white/90 leading-relaxed">
              Nhận 3 ý tưởng từ James Clear, 2 trích dẫn sâu sắc và 1 câu hỏi phản tư mỗi tuần được dịch song ngữ độc quyền.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Nhập email của bạn..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-xs text-white placeholder-white/60 focus:outline-none focus:border-[#fea619]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#fea619] hover:bg-[#ffb95f] text-[#2a1700] font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                Đăng ký
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Complete Works Catalog Grid (Tuyển Tập Tác Phẩm) */}
      <section className="mb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-editorial text-2xl sm:text-3xl text-theme-primary font-bold">Tuyển Tập Tác Phẩm Chính Thức</h2>
            <p className="text-xs sm:text-sm text-on-surface-variant">Toàn bộ đầu sách bản quyền số định dạng Ebook DRM & Sách In tại Huki</p>
          </div>
          {/* Format Tabs */}
          <div className="flex items-center gap-2 bg-theme-surface p-1 rounded-2xl border border-theme-border overflow-x-auto">
            {[
              { id: 'all', label: `Tất Cả (${authorWorks.length})` },
              { id: 'hybrid', label: 'Combo Hybrid' },
              { id: 'ebook', label: 'Ebook DRM' },
              { id: 'physical', label: 'Sách In' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedFormat(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  selectedFormat === tab.id
                    ? 'bg-theme-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:text-theme-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {filteredWorks.map(work => (
            <div
              key={work.id}
              className="bg-theme-surface border border-theme-border rounded-2xl p-4 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden mb-4 bg-slate-100">
                  <span className="absolute top-2 left-2 z-10 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm bg-[#ac2c19] text-white">
                    {work.badge}
                  </span>
                  <Link to={`/book/${work.id}`}>
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      src={work.cover}
                      alt={work.title}
                    />
                  </Link>
                </div>
                <span className="text-[11px] font-semibold text-theme-secondary block mb-1">{work.formatLabel}</span>
                <Link to={`/book/${work.id}`} title={work.title}>
                  <h4 className="font-semibold text-sm text-on-surface line-clamp-1 truncate mb-2 group-hover:text-[#ac2c19] transition-colors">
                    {work.title}
                  </h4>
                </Link>
              </div>

              <div>
                <div className="flex items-center gap-1 mb-3 text-xs">
                  <span className="material-symbols-outlined text-[16px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-bold text-on-surface">{work.rating}</span>
                  <span className="text-on-surface-variant">({work.reviews})</span>
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t border-theme-border">
                  <div>
                    <span className="font-bold text-[#ac2c19] text-base">{work.price.toLocaleString('vi-VN')}đ</span>
                    <span className="block text-xs line-through text-slate-400">{work.originalPrice.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <button
                    onClick={() => {
                      addToCart({
                        id: work.id,
                        title: work.title,
                        price: work.price,
                        format: work.format,
                        cover: work.cover,
                        publisher: 'Alpha Books'
                      });
                      showToast(`Đã thêm "${work.title}" vào giỏ!`, 'success');
                    }}
                    className="w-10 h-10 rounded-xl bg-theme-secondary-subtle hover:bg-[#ac2c19] hover:text-white text-on-surface transition-colors flex items-center justify-center shadow-xs cursor-pointer"
                    title="Thêm vào giỏ"
                  >
                    <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

