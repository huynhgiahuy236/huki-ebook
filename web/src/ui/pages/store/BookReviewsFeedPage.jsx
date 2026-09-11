import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import UserAvatar from '../../components/common/UserAvatar';
import { useToast } from '../../context/ToastContext';

export default function BookReviewsFeedPage() {
  const { showToast } = useToast();
  const [filterRating, setFilterRating] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [likedReviews, setLikedReviews] = useState({});

  const reviews = [
    {
      id: 1,
      user: {
        name: 'Nguyễn Minh Anh',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        badge: 'Top 1% Reviewer',
        readCount: 42
      },
      book: {
        id: 'atomic-habits',
        title: 'Atomic Habits - Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ',
        author: 'James Clear',
        cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300',
        format: 'Combo Hybrid'
      },
      rating: 5,
      date: '2 ngày trước',
      title: 'Cuốn sách thay đổi tư duy kỷ luật cá nhân sâu sắc nhất tôi từng đọc',
      content: 'Không giống như những cuốn self-help sáo rỗng chỉ truyền động lực nhất thời, James Clear đưa ra một hệ thống khoa học hành vi chặt chẽ. Điểm tôi thích nhất là khái niệm "Habit Stacking" (chồng thói quen) và thiết kế môi trường. Tôi đã áp dụng thói quen đọc 15 trang sách mỗi sáng trước khi mở điện thoại và duy trì liên tục 6 tháng qua.',
      images: [
        'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400',
        'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=400'
      ],
      likes: 128,
      comments: 24,
      verifiedBuyer: true
    },
    {
      id: 2,
      user: {
        name: 'Trần Hoàng Long',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
        badge: 'Độc giả Tinh Hoa',
        readCount: 28
      },
      book: {
        id: 'tam-ly-hoc-ve-tien',
        title: 'Tâm Lý Học Về Tiền (The Psychology of Money)',
        author: 'Morgan Housel',
        cover: 'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?auto=format&fit=crop&q=80&w=300',
        format: 'Ebook DRM'
      },
      rating: 5,
      date: '4 ngày trước',
      title: 'Tài chính không phải là toán học, tài chính là cách bạn kiểm soát cảm xúc',
      content: 'Chương về sự tự do tài chính đã làm thay đổi hoàn toàn cách tôi phân bổ thu nhập. Ebook trên HUKI đọc rất mượt trên máy đọc sách Kobo, highlight tự động đồng bộ sang Notion rất tiện lợi.',
      images: [],
      likes: 95,
      comments: 11,
      verifiedBuyer: true
    },
    {
      id: 3,
      user: {
        name: 'Lê Thảo My',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
        badge: 'Hội viên Thân Thiết',
        readCount: 15
      },
      book: {
        id: 'tu-duy-nhanh-va-cham',
        title: 'Tư Duy Nhanh Và Chậm (Thinking, Fast and Slow)',
        author: 'Daniel Kahneman',
        cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=300',
        format: 'Sách In Bìa Cứng'
      },
      rating: 4,
      date: '1 tuần trước',
      title: 'Cuốn sách đồ sộ về các thiên kiến nhận thức của con người',
      content: 'Nội dung rất dày dặn và mang tính hàn lâm cao. Sách in bìa cứng chất lượng giấy chống lóa của HUKI rất đẹp, đóng gói 3 lớp xốp khí cẩn thận.',
      images: [
        'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=400'
      ],
      likes: 64,
      comments: 8,
      verifiedBuyer: true
    }
  ];

  const handleToggleLike = (reviewId) => {
    setLikedReviews((prev) => {
      const isLiked = !prev[reviewId];
      if (isLiked) {
        showToast('Đã thả tim bài review!', 'success');
      }
      return { ...prev, [reviewId]: isLiked };
    });
  };

  const filteredReviews = reviews.filter((r) => {
    if (filterRating !== 'all' && r.rating !== parseInt(filterRating, 10)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.book.title.toLowerCase().includes(q) ||
        r.user.name.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-theme-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Hero Banner */}
        <div
          className="text-white p-6 sm:p-10 rounded-3xl shadow-lg mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(to right, var(--theme-hero-from, #003b2b), var(--theme-hero-via, #002f22), var(--theme-hero-to, #001f17))' }}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[var(--theme-header-top-accent,#94f5d6)] text-xs font-bold uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-base">rate_review</span>
              <span>Cộng Đồng Độc Giả HUKI</span>
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl font-bold mb-3">
              Đánh Giá &amp; Cảm Nhận Sách
            </h1>
            <p className="text-white/80 text-xs sm:text-sm max-w-2xl leading-relaxed font-light">
              Hơn 125.000 bài review từ độc giả thực và người mua sách bản quyền đã xác thực. Tìm góc nhìn chân thực nhất trước khi lựa chọn cuốn sách tiếp theo.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <Link
              to="/books"
              className="bg-[var(--theme-header-top-accent,#94f5d6)] text-theme-primary px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm hover:bg-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">edit_note</span>
              Viết Đánh Giá Mới
            </Link>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-theme-surface p-4 rounded-2xl border border-theme-border shadow-xs mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-[#6b7280] text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo tên sách, tác giả, độc giả..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-theme-bg border border-theme-border rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-on-surface focus:bg-theme-surface focus:border-theme-primary outline-none transition-colors"
            />
          </div>

          {/* Rating Filters */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: '5', label: '⭐⭐⭐⭐⭐ (5 sao)' },
              { key: '4', label: '⭐⭐⭐⭐ (4 sao)' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterRating(f.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  filterRating === f.key
                    ? 'bg-theme-primary text-white shadow-xs'
                    : 'bg-theme-secondary-subtle text-[#6b7280] hover:text-on-surface border border-theme-border'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-6">
          {filteredReviews.map((rev) => {
            const isLiked = likedReviews[rev.id];
            return (
              <div key={rev.id} className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs hover:shadow-md transition-shadow">
                {/* Header: User Profile & Book Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-theme-border mb-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar src={rev.user.avatar} name={rev.user.name} size="w-11 h-11" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-on-surface">{rev.user.name}</span>
                        <span className="text-[10px] bg-theme-secondary-subtle text-theme-secondary font-bold px-2 py-0.5 rounded-full">
                          {rev.user.badge}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#6b7280] flex items-center gap-2 mt-0.5">
                        <span>Đã đọc {rev.user.readCount} cuốn</span>
                        <span>•</span>
                        <span>{rev.date}</span>
                        {rev.verifiedBuyer && (
                          <>
                            <span>•</span>
                            <span className="text-theme-secondary font-semibold flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-xs">verified</span>
                              Đã mua hàng chính hãng
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Linked Book Card Snippet */}
                  <Link
                    to={`/book/${rev.book.id}`}
                    className="flex items-center gap-3 p-2 bg-theme-bg hover:bg-theme-secondary-subtle border border-theme-border rounded-2xl transition-colors shrink-0 group"
                  >
                    <img
                      src={rev.book.cover}
                      alt={rev.book.title}
                      className="w-10 h-14 object-cover rounded-lg shadow-xs group-hover:scale-105 transition-transform"
                    />
                    <div className="max-w-[200px]">
                      <div className="text-xs font-bold text-on-surface truncate">{rev.book.title}</div>
                      <div className="text-[11px] text-[#6b7280]">{rev.book.author}</div>
                      <span className="text-[9px] bg-theme-primary text-white px-1.5 py-0.5 rounded font-bold uppercase mt-0.5 inline-block">
                        {rev.book.format}
                      </span>
                    </div>
                  </Link>
                </div>

                {/* Rating Stars & Title */}
                <div className="mb-3">
                  <div className="flex items-center gap-1 text-[#fea619] mb-1.5">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`material-symbols-outlined text-base ${
                          i < rev.rating ? 'text-[#fea619]' : 'text-gray-300'
                        }`}
                      >
                        star
                      </span>
                    ))}
                    <span className="text-xs font-bold text-on-surface ml-1.5">{rev.rating}.0 / 5.0</span>
                  </div>
                  <h3 className="font-editorial text-lg sm:text-xl font-bold text-on-surface">
                    "{rev.title}"
                  </h3>
                </div>

                {/* Content */}
                <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                  {rev.content}
                </p>

                {/* Review Images */}
                {rev.images.length > 0 && (
                  <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-1">
                    {rev.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt="Ảnh chụp thực tế từ độc giả"
                        className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-2xl border border-theme-border shadow-xs cursor-pointer hover:scale-105 transition-transform"
                      />
                    ))}
                  </div>
                )}

                {/* Footer Reactions */}
                <div className="flex items-center justify-between pt-3 border-t border-theme-border text-xs">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleToggleLike(rev.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        isLiked
                          ? 'bg-rose-50 text-rose-600 border-rose-200 font-bold'
                          : 'bg-theme-bg text-[#6b7280] border-theme-border hover:text-on-surface'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-base ${isLiked ? 'text-rose-500' : ''}`}>
                        favorite
                      </span>
                      <span>{rev.likes + (isLiked ? 1 : 0)} Hữu ích</span>
                    </button>

                    <Link
                      to={`/book/${rev.book.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-theme-bg text-[#6b7280] border border-theme-border hover:text-on-surface transition-all"
                    >
                      <span className="material-symbols-outlined text-base">chat_bubble</span>
                      <span>{rev.comments} Thảo luận</span>
                    </Link>
                  </div>

                  <Link
                    to={`/book/${rev.book.id}`}
                    className="text-xs font-bold text-theme-primary hover:underline flex items-center gap-1"
                  >
                    <span>Xem tác phẩm</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
