import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import UserAvatar from '../../components/common/UserAvatar';
import { useToast } from '../../context/ToastContext';

export default function ReadingChallengePage() {
  const { showToast } = useToast();
  const [goalCount, setGoalCount] = useState(30);
  const [readCount, setReadCount] = useState(18);

  const badges = [
    { id: 1, name: 'Bậc Thầy Thói Quen', desc: 'Đọc sách 14 ngày liên tục không ngắt quãng', icon: 'local_fire_department', color: 'bg-amber-500', unlocked: true },
    { id: 2, name: 'Mọt Sách Khai Phóng', desc: 'Hoàn thành 10 cuốn sách thuộc 3 thể loại khác nhau', icon: 'auto_stories', color: 'bg-emerald-600', unlocked: true },
    { id: 3, name: 'Kẻ Săn Tri Thức', desc: 'Đọc hơn 5.000 trang sách điện tử DRM', icon: 'military_tech', color: 'bg-blue-600', unlocked: true },
    { id: 4, name: 'Cú Đêm Đọc Sách', desc: 'Đọc sách sau 23:00 trong 7 ngày', icon: 'bedtime', color: 'bg-purple-600', unlocked: false },
    { id: 5, name: 'Nhà Phê Bình Tinh Hoa', desc: 'Đăng 10 bài review đạt trên 50 lượt hữu ích', icon: 'rate_review', color: 'bg-rose-600', unlocked: false },
  ];

  const leaderboard = [
    { rank: 1, name: 'Nguyễn Bích Thủy', read: 48, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200', streak: 120 },
    { rank: 2, name: 'Trần Văn Nam', read: 42, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200', streak: 94 },
    { rank: 3, name: 'Lê Minh Anh', read: 36, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200', streak: 85 },
    { rank: 12, name: 'Nguyễn Văn An (Bạn)', read: 18, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', streak: 14, isUser: true },
  ];

  const percentage = Math.min(100, Math.round((readCount / goalCount) * 100));

  return (
    <div className="min-h-screen bg-theme-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-6">
          <Link to="/profile" className="hover:text-theme-primary font-medium">Tài Khoản</Link>
          <span>/</span>
          <span className="text-on-surface font-semibold">Thử Thách Đọc Sách 2026</span>
        </div>

        {/* Hero Challenge Banner */}
        <div 
          style={{ background: 'linear-gradient(to right, var(--theme-hero-from, #003b2b), var(--theme-hero-via, #003828), var(--theme-hero-to, #001f17))' }}
          className="text-white rounded-3xl p-8 sm:p-10 shadow-xl mb-8 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="relative z-10 max-w-lg">
            <div className="inline-flex items-center gap-2 bg-white/20 border border-white/30 text-[var(--theme-header-top-accent,#94f5d6)] px-3 py-1 rounded-full text-xs font-bold mb-3">
              <span className="material-symbols-outlined text-sm">military_tech</span>
              <span>HUKI READING CHALLENGE 2026</span>
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl font-bold mb-2">
              Thử Thách Đọc Sách Năm 2026
            </h1>
            <p className="text-white/80 text-xs sm:text-sm font-light leading-relaxed">
              Xây dựng thói quen đọc mỗi ngày, chinh phục mục tiêu tri thức và nhận huy hiệu danh giá cùng phần thưởng HUKI Xu.
            </p>
          </div>

          {/* Goal Progress Ring / Box */}
          <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl text-center min-w-[240px]">
            <div className="text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
              Tiến Độ Hiện Tại
            </div>
            <div className="font-editorial text-4xl font-bold text-[var(--theme-header-top-accent,#94f5d6)]">
              {readCount} <span className="text-xl text-white/70 font-normal">/ {goalCount} cuốn</span>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden my-3">
              <div
                className="bg-[var(--theme-header-top-accent,#94f5d6)] h-full transition-all duration-500 rounded-full"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            <div className="text-xs font-bold text-white flex items-center justify-between">
              <span>Đạt {percentage}% mục tiêu</span>
              <span className="text-amber-400">🔥 Streak 14 ngày</span>
            </div>
          </div>
        </div>

        {/* Badges Section */}
        <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-editorial text-xl font-bold text-on-surface">
                Bộ Sưu Tập Huy Hiệu Độc Giả ({badges.filter(b => b.unlocked).length}/{badges.length})
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Mỗi huy hiệu mở khóa sẽ tặng kèm 100 - 500 HUKI Xu vào ví của bạn
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {badges.map((b) => (
              <div
                key={b.id}
                className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-between transition-all ${
                  b.unlocked
                    ? 'bg-theme-bg border-theme-border shadow-2xs'
                    : 'bg-stone-50 border-stone-200 dark:bg-stone-900 dark:border-stone-800 opacity-50 grayscale'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl ${b.color} text-white flex items-center justify-center shadow-md mb-3`}>
                  <span className="material-symbols-outlined text-2xl">{b.icon}</span>
                </div>
                <div>
                  <div className="font-bold text-xs text-on-surface leading-tight mb-1">{b.name}</div>
                  <div className="text-xs text-on-surface-variant leading-snug">{b.desc}</div>
                </div>
                <div className="mt-3">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      b.unlocked ? 'bg-theme-primary text-white' : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                    }`}
                  >
                    {b.unlocked ? 'Đã Đạt Được' : 'Chưa Mở Khóa'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Community Leaderboard */}
        <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs">
          <h3 className="font-editorial text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500">emoji_events</span>
            <span>Bảng Xếp Hạng Độc Giả Tích Cực 2026</span>
          </h3>

          <div className="space-y-3">
            {leaderboard.map((item) => (
              <div
                key={item.rank}
                className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                  item.isUser
                    ? 'bg-theme-secondary-subtle border-theme-primary/40 ring-2 ring-theme-secondary/15'
                    : 'bg-theme-bg border-theme-border'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      item.rank === 1
                        ? 'bg-amber-400 text-amber-950 shadow-sm'
                        : item.rank === 2
                        ? 'bg-slate-300 text-slate-800'
                        : item.rank === 3
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {item.rank}
                  </div>
                  <UserAvatar src={item.avatar} name={item.name} size="w-9 h-9" />
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-on-surface">{item.name}</div>
                    <div className="text-[11px] text-on-surface-variant">Streak liên tục: {item.streak} ngày</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-sm text-theme-primary">{item.read} cuốn sách</div>
                  <div className="text-[10px] text-theme-secondary font-semibold">Đã đọc xong</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
