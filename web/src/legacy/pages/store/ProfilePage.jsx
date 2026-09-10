import React from 'react';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
  return (
    <div className="w-full min-h-screen flex flex-col font-body-md text-on-surface bg-theme-bg py-4 md:py-6">
      <div className="max-w-[1440px] w-full mx-auto px-4 md:px-6 pt-2 pb-2">
        <div className="flex items-center justify-between">
          <nav className="flex items-center gap-2 text-body-sm text-on-surface-variant">
            <Link className="hover:text-primary inline-flex items-center gap-1 font-medium transition-colors" to="/">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Quay lại Bảng Tin</span>
            </Link>
            <span className="text-outline-variant/80">/</span>
            <span className="hover:text-primary cursor-pointer">Cộng đồng</span>
            <span className="text-outline-variant/80">/</span>
            <span className="hover:text-primary cursor-pointer">Độc giả</span>
            <span className="text-outline-variant/80">/</span>
            <span className="text-on-surface font-semibold">Nguyễn Minh Anh (@minhanh.reads)</span>
          </nav>
          <div className="text-xs text-on-surface-variant flex items-center gap-1.5 bg-surface-container-lowest px-2.5 py-1 rounded-full border border-outline-variant/60">
            <span className="w-2 h-2 rounded-full bg-tertiary-container"></span>
            <span>Trực tuyến 15 phút trước trên HUKI Reader</span>
          </div>
        </div>
      </div>

      <main className="max-w-[1440px] w-full mx-auto px-4 md:px-6 pb-16 flex-1 flex flex-col">

<section className="mt-2 bg-surface-container-lowest rounded-3xl border border-outline-variant/70 shadow-book-card overflow-hidden">

<div
  className="relative h-[220px] w-full overflow-hidden"
  style={{ background: 'linear-gradient(to right, var(--theme-hero-from, #003B2B), var(--theme-hero-via, #004D38), var(--theme-hero-to, #00271E))' }}
>

<div className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay" alt="Atmospheric warm aesthetic library desk at dusk with leather bound books, warm antique reading lamp glow, gentle foliage shadows, and open vintage journal on oak table." style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA7UQNdAkxndM8FZkoZPszneTwSZYrS-WTXC0M3OVCyiYVLFDA7de7wX8bBlGxmrS6d2QO2Gl5sy1Y1faCEHnK8qJY4FCm5cU248F5q0VhqVPwfQZlA7SUCqD73crnVYpJvMmQmRJnjUOgQqgBe1Zf2nOoVWm-ITw6tsIUwzWSfJKASqw72_fIsxKqDhViCQpYls9yxTxxXl9vCv_2FlRA4epwGIvzcBKXWsha2CLhr9_WqDqFAy9kbHA')" }}></div>

<div className="absolute inset-0 flex items-center justify-between px-12 pointer-events-none">
<div className="max-w-md hidden lg:block text-white/70 italic font-display-lg text-lg leading-relaxed">
                “Một cuốn sách hay trên giá gỗ là một người bạn trầm lặng luôn sẵn lòng đợi ta trở lại.”
              </div>
<div className="text-right hidden sm:block">
<span className="inline-block px-3 py-1 rounded-lg bg-black/25 backdrop-blur-md text-white/80 font-mono text-xs border border-white/10">
                  HUKI READER ID: #VN-88402
                </span>
</div>
</div>

<div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent"></div>
</div>

<div className="px-6 md:px-8 pb-6 pt-0 relative">
<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-outline-variant/50">

<div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">

{/* Avatar with negative top margin to overlap banner */}
<div className="relative group shrink-0 -mt-14 sm:-mt-16">
<img className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-white shadow-xl border-2 border-primary/30 bg-white" alt="Portrait photo of Nguyen Minh Anh, a Vietnamese female reader in her late twenties, warm gentle smile, holding a hardcover book with soft natural morning light in an airy studio." src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8CQmH-QjU5CJxzbNRKMzKbOkTZU2dYnnAEtOsDhF77nYohJnqNg5IdziFz4fChk4ExFkhYouQ-3xNmmTER7BWwcfFOVEixWtIIb_eQitcG9T_m7sCpJlZVIYbjhjFaoSy0U8NBdgP2D08B4Mw1OtzDfsjOi1r-c4lzUEoVHqwEK2YBuKMUxeN0N52Og9rfsZEndR_JD744nftu4_-tlKptEpiN55xTd8jCw2SM4-QoigRA9CE2XoOgA" />
<span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[13px] ring-2 ring-white shadow-sm" title="Đã xác thực danh tính bạn đọc">
<span className="material-symbols-outlined text-[15px]">verified</span>
</span>
</div>

{/* User Name and Meta Info (Cleanly positioned inside card body) */}
<div className="space-y-1.5 pt-2 sm:pt-3">
<div className="flex flex-wrap items-center gap-2.5">
<h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface leading-tight">
                      Nguyễn Minh Anh
                    </h1>
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 font-label-sm font-semibold text-xs">
<span className="material-symbols-outlined text-[13px] material-symbols-fill">verified</span>
                      Độc giả tích cực
                    </span>
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30 font-label-sm font-semibold text-xs">
<span className="material-symbols-outlined text-[13px]">psychology</span>
                      Chủ CLB Phát Triển Bản Thân
                    </span>
</div>

<div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs sm:text-sm text-on-surface-variant">
<span className="font-medium text-on-surface">@minhanh.reads</span>
<span>•</span>
<span className="inline-flex items-center gap-1">
<span className="material-symbols-outlined text-sm">location_on</span>
                      TP. Hồ Chí Minh
                    </span>
<span>•</span>
<span className="inline-flex items-center gap-1">
<span className="material-symbols-outlined text-sm">calendar_today</span>
                      Tham gia từ tháng 01/2025
                    </span>
<span>•</span>
<span className="font-medium text-on-surface">1.2K</span> người theo dõi
                    <span>•</span>
<span className="font-medium text-on-surface">486</span> đang theo dõi
                  </div>
</div>
</div>

{/* Actions */}
<div className="flex items-center gap-2.5 self-start lg:self-center pt-2 lg:pt-0">
<button className="h-10 px-5 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary border border-primary/30 font-title-md text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer">
<span className="material-symbols-outlined text-base">done</span>
<span>Đang Theo Dõi</span>
<span className="material-symbols-outlined text-base">expand_more</span>
</button>
<button className="h-10 px-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/80 text-on-surface font-title-md text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer">
<span className="material-symbols-outlined text-base">mail</span>
<span>Nhắn Tin</span>
</button>
<button className="w-10 h-10 rounded-xl bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/80 text-on-surface-variant flex items-center justify-center transition-all cursor-pointer" title="Tùy chọn khác">
<span className="material-symbols-outlined text-lg">more_horiz</span>
</button>
</div>
</div>

<div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
<p className="font-body-lg text-sm sm:text-base text-on-surface/85 max-w-3xl leading-relaxed">
                “Yêu sách tâm lý, phát triển bản thân và những câu chuyện khiến mình suy nghĩ lâu hơn sau khi gấp sách lại. Đang hướng tới mục tiêu 24 cuốn sách trong năm 2026.”
              </p>
<div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/40 self-start md:self-auto">
<span className="material-symbols-outlined text-sm text-primary">auto_stories</span>
<span>Đang đọc: <strong className="text-on-surface font-semibold">Deep Work</strong> (36%)</span>
</div>
</div>

<div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-3.5 bg-surface-container-low/70 rounded-2xl border border-outline-variant/50">
<div className="px-3 py-1.5 flex items-center gap-3">
<div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
<span className="material-symbols-outlined text-lg">menu_book</span>
</div>
<div>
<div className="font-headline-sm text-lg font-bold text-on-surface leading-tight">47</div>
<div className="text-xs text-on-surface-variant font-medium">Sách đã đọc</div>
</div>
</div>
<div className="px-3 py-1.5 flex items-center gap-3 border-l border-outline-variant/40">
<div className="w-9 h-9 rounded-xl bg-theme-secondary/10 text-theme-secondary flex items-center justify-center">
<span className="material-symbols-outlined text-lg">rate_review</span>
</div>
<div>
<div className="font-headline-sm text-lg font-bold text-on-surface leading-tight">12</div>
<div className="text-xs text-on-surface-variant font-medium">Bài review sâu</div>
</div>
</div>
<div className="px-3 py-1.5 flex items-center gap-3 border-l border-outline-variant/40">
<div className="w-9 h-9 rounded-xl bg-theme-accent/10 text-theme-accent flex items-center justify-center">
<span className="material-symbols-outlined text-lg material-symbols-fill">local_fire_department</span>
</div>
<div>
<div className="font-headline-sm text-lg font-bold text-theme-accent leading-tight">8 ngày</div>
<div className="text-xs text-on-surface-variant font-medium">Chuỗi đọc hiện tại</div>
</div>
</div>
<div className="px-3 py-1.5 flex items-center gap-3 border-l border-outline-variant/40">
<div className="w-9 h-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
<span className="material-symbols-outlined text-lg">flag</span>
</div>
<div>
<div className="font-headline-sm text-lg font-bold text-on-surface leading-tight">17 / 24 <span className="text-xs text-primary font-normal">(71%)</span></div>
<div className="text-xs text-on-surface-variant font-medium">Thử thách 2026</div>
</div>
</div>
<div className="px-3 py-1.5 flex items-center gap-3 border-l border-outline-variant/40">
<div className="w-9 h-9 rounded-xl bg-theme-secondary/10 text-theme-secondary flex items-center justify-center">
<span className="material-symbols-outlined text-lg">hub</span>
</div>
<div>
<div className="font-headline-sm text-lg font-bold text-on-surface leading-tight">3</div>
<div className="text-xs text-on-surface-variant font-medium">CLB đang tham gia</div>
</div>
</div>
</div>
</div>
</section>

<div className="mt-6 sticky top-16 z-20 bg-theme-surface/90 backdrop-blur-md pt-2 pb-3 border-b border-outline-variant/60">
<div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
<button className="px-5 py-2.5 rounded-xl font-title-md text-sm font-semibold text-primary bg-primary/10 border border-primary/25 shadow-xs flex items-center gap-2">
<span className="material-symbols-outlined text-[18px]">dashboard</span>
<span>Tổng Quan</span>
</button>
<button className="px-5 py-2.5 rounded-xl font-title-md text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2">
<span className="material-symbols-outlined text-[18px]">shelves</span>
<span>Tủ Sách</span>
<span className="px-2 py-0.5 rounded-full text-xs bg-surface-container text-on-surface-variant font-semibold">47</span>
</button>
<button className="px-5 py-2.5 rounded-xl font-title-md text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2">
<span className="material-symbols-outlined text-[18px]">article</span>
<span>Bài Viết</span>
<span className="px-2 py-0.5 rounded-full text-xs bg-surface-container text-on-surface-variant font-semibold">28</span>
</button>
<button className="px-5 py-2.5 rounded-xl font-title-md text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2">
<span className="material-symbols-outlined text-[18px]">hotel_class</span>
<span>Review</span>
<span className="px-2 py-0.5 rounded-full text-xs bg-surface-container text-on-surface-variant font-semibold">12</span>
</button>
<button className="px-5 py-2.5 rounded-xl font-title-md text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2">
<span className="material-symbols-outlined text-[18px]">timeline</span>
<span>Hoạt Động Đọc</span>
</button>
<button className="px-5 py-2.5 rounded-xl font-title-md text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2">
<span className="material-symbols-outlined text-[18px]">groups</span>
<span>CLB Đang Tham Gia</span>
<span className="px-2 py-0.5 rounded-full text-xs bg-surface-container text-on-surface-variant font-semibold">3</span>
</button>
</div>
</div>

<div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

<div className="lg:col-span-3 space-y-6">

<div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/70 shadow-book-card">
<div className="flex items-center gap-2 pb-3 border-b border-outline-variant/40">
<span className="material-symbols-outlined text-primary text-[20px]">person_book</span>
<h2 className="font-headline-sm text-base font-semibold text-on-surface">Về Minh Anh</h2>
</div>
<div className="mt-4 space-y-4 text-body-sm">

<div>
<div className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2">Thể loại yêu thích</div>
<div className="flex flex-wrap gap-1.5">
<span className="px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface border border-outline-variant/50 text-xs font-medium">Phát triển bản thân</span>
<span className="px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface border border-outline-variant/50 text-xs font-medium">Tâm lý học</span>
<span className="px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface border border-outline-variant/50 text-xs font-medium">Tư duy &amp; Năng suất</span>
<span className="px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface border border-outline-variant/50 text-xs font-medium">Văn học kinh điển</span>
</div>
</div>

<div>
<div className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-1.5">Phương thức đọc</div>
<div className="flex items-center gap-2 text-on-surface">
<span className="material-symbols-outlined text-base text-primary">devices</span>
<span>Ebook trên HUKI Reader &amp; Sách giấy</span>
</div>
</div>

<div>
<div className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-1.5">Khung giờ vàng</div>
<div className="flex items-center gap-2 text-on-surface">
<span className="material-symbols-outlined text-base text-primary">bedtime</span>
<span>21:00 - 22:30 mỗi tối (45 phút/ngày)</span>
</div>
</div>
</div>
</div>

<div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/70 shadow-book-card relative overflow-hidden">
<div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[20px]">emoji_events</span>
<h2 className="font-headline-sm text-base font-semibold text-on-surface">Thử Thách Đọc 2026</h2>
</div>
<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">71%</span>
</div>
<div className="mt-4">
<div className="flex justify-between items-baseline mb-2">
<span className="font-headline-md text-2xl font-bold text-on-surface">17 <span className="text-sm font-normal text-on-surface-variant">/ 24 cuốn</span></span>
<span className="text-xs font-medium text-tertiary">Còn 7 cuốn để về đích</span>
</div>

<div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden p-0.5 border border-outline-variant/40">
<div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: '71%' }}></div>
</div>
<p className="mt-3 text-xs text-on-surface-variant leading-relaxed">
                  Minh Anh đang vượt 2 cuốn so với tiến độ trung bình năm 2026.
                </p>
<button className="mt-4 w-full py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary font-title-md text-xs font-semibold border border-outline-variant/60 transition-colors flex items-center justify-center gap-1">
<span>Xem Chi Tiết Thử Thách</span>
<span className="material-symbols-outlined text-sm">arrow_forward</span>
</button>
</div>
</div>

<div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/70 shadow-book-card">
<div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-tertiary text-[20px] material-symbols-fill">local_fire_department</span>
<h2 className="font-headline-sm text-base font-semibold text-on-surface">Chuỗi Đọc</h2>
</div>
<span className="text-xs text-on-surface-variant">Hằng ngày</span>
</div>
<div className="mt-4 flex items-center justify-between">
<div>
<div className="text-2xl font-bold font-headline-sm text-tertiary flex items-center gap-1">
                    🔥 8 ngày
                  </div>
<div className="text-xs text-on-surface-variant mt-0.5">Kỷ lục: <strong className="text-on-surface">21 ngày</strong></div>
</div>
<div className="text-right">
<div className="text-sm font-bold text-secondary flex items-center justify-end gap-1">
<span className="material-symbols-outlined text-base">monetization_on</span>
                    1,450
                  </div>
<div className="text-[11px] text-on-surface-variant">BookPoints tích lũy</div>
</div>
</div>

<div className="mt-4 pt-3 border-t border-outline-variant/40 flex justify-between items-center text-center">
<div className="flex flex-col items-center gap-1">
<span className="text-[10px] text-on-surface-variant">T2</span>
<span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px]"><span className="material-symbols-outlined text-xs">check</span></span>
</div>
<div className="flex flex-col items-center gap-1">
<span className="text-[10px] text-on-surface-variant">T3</span>
<span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px]"><span className="material-symbols-outlined text-xs">check</span></span>
</div>
<div className="flex flex-col items-center gap-1">
<span className="text-[10px] text-on-surface-variant">T4</span>
<span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px]"><span className="material-symbols-outlined text-xs">check</span></span>
</div>
<div className="flex flex-col items-center gap-1">
<span className="text-[10px] text-on-surface-variant">T5</span>
<span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px]"><span className="material-symbols-outlined text-xs">check</span></span>
</div>
<div className="flex flex-col items-center gap-1">
<span className="text-[10px] text-on-surface-variant">T6</span>
<span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px]"><span className="material-symbols-outlined text-xs">check</span></span>
</div>
<div className="flex flex-col items-center gap-1">
<span className="text-[10px] text-on-surface-variant">T7</span>
<span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px]"><span className="material-symbols-outlined text-xs">check</span></span>
</div>
<div className="flex flex-col items-center gap-1">
<span className="text-[10px] text-on-surface-variant font-bold text-primary">CN</span>
<span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] ring-2 ring-primary/30"><span className="material-symbols-outlined text-xs">check</span></span>
</div>
</div>
</div>

<div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/70 shadow-book-card">
<div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[20px]">military_tech</span>
<h2 className="font-headline-sm text-base font-semibold text-on-surface">Huy Hiệu Độc Giả</h2>
</div>
<span className="text-xs text-on-surface-variant font-medium">3/12</span>
</div>
<div className="mt-3 space-y-3">
<div className="flex items-center gap-3 p-2 rounded-xl bg-surface-container-low border border-outline-variant/40">
<div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
<span className="material-symbols-outlined text-xl">self_improvement</span>
</div>
<div>
<div className="text-xs font-semibold text-on-surface">Thợ Săn Thói Quen</div>
<div className="text-[11px] text-on-surface-variant">Đọc liên tục 7 ngày sách Self-help</div>
</div>
</div>
<div className="flex items-center gap-3 p-2 rounded-xl bg-surface-container-low border border-outline-variant/40">
<div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
<span className="material-symbols-outlined text-xl">psychology_alt</span>
</div>
<div>
<div className="text-xs font-semibold text-on-surface">Chiêm Nghiệm Sâu Sắc</div>
<div className="text-[11px] text-on-surface-variant">Được 50+ độc giả lưu bài viết</div>
</div>
</div>
<div className="flex items-center gap-3 p-2 rounded-xl bg-surface-container-low border border-outline-variant/40">
<div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center">
<span className="material-symbols-outlined text-xl">forum</span>
</div>
<div>
<div className="text-xs font-semibold text-on-surface">Thành Viên Tích Cực CLB</div>
<div className="text-[11px] text-on-surface-variant">Dẫn dắt 10 buổi thảo luận sách</div>
</div>
</div>
</div>
</div>
</div>

<div className="lg:col-span-6 space-y-7">

<section>
<div className="flex items-center justify-between mb-4">
<div className="flex items-center gap-2">
<span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping"></span>
<h2 className="font-headline-sm text-lg font-bold text-on-surface">Đang Đọc Cùng Lúc (Currently Reading)</h2>
</div>
<span className="text-xs font-medium text-on-surface-variant">2 tác phẩm</span>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

<div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/70 shadow-book-card hover:shadow-book-card-hover transition-all flex flex-col justify-between">
<div className="flex gap-4">
<div className="w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden shadow-md book-spine-effect bg-[#1d3557]">
<img className="w-full h-full object-cover" alt="Editorial book cover of Deep Work by Cal Newport, clean yellow and black typography, minimalist productivity design aesthetic on warm cream background." src="https://lh3.googleusercontent.com/aida-public/AB6AXuB06UJjwmySkWO-lcfIpp-tQX2isyHgJfCNHFeVGqet945k-QEyOGtoBJmOY5mkW4OO0_fqjb2L8ZhZHezfPSJFZeluYgaOYIVJoLOWpi5X2Gqos_sc2M5ByrCMUK2PtGJD4BttxIBcmlvNhw_LflzwFjhtZ7uDkAd5d9LQ_7OZzMZEFUN7GmHdxAq5tAn-Dhpsn-QIx2iYBDYtJhNS0pomV2jRyIDclpVgHqvuJ1t2E0dSgSeMI8lWyQ" />
</div>
<div className="flex-1 min-w-0">
<span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary mb-1">Ebook HUKI Reader</span>
<h3 className="font-title-md text-base font-bold text-on-surface truncate">Deep Work</h3>
<p className="text-body-sm text-on-surface-variant">Cal Newport</p>
<div className="mt-2 text-xs text-on-surface-variant">
                        Tiến độ: <strong className="text-on-surface font-semibold">36%</strong> (114/304 trang)
                      </div>
<div className="w-full bg-surface-container h-1.5 rounded-full mt-1.5 overflow-hidden">
<div className="bg-primary h-full rounded-full" style={{ width: '36%' }}></div>
</div>
</div>
</div>
<div className="mt-4 pt-3 border-t border-outline-variant/40 flex items-center justify-between text-xs">
<span className="text-on-surface-variant/80 flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">edit_calendar</span>
                      Đọc hôm nay
                    </span>
<Link className="font-semibold text-primary hover:text-primary-container flex items-center gap-0.5" to="/">
                      Xem Cuốn Sách
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
</Link>
</div>
</div>

<div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/70 shadow-book-card hover:shadow-book-card-hover transition-all flex flex-col justify-between">
<div className="flex gap-4">
<div className="w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden shadow-md book-spine-effect bg-[#b45309]">
<img className="w-full h-full object-cover" alt="Book cover of Nha Gia Kim (The Alchemist) Vietnamese translation by Paulo Coelho, warm desert yellow and deep blue celestial illustration." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwPUmsBfjLGRW-n9hawXV_KRe5uns4e23Sr-vbTT3ZAC6v81LBUJpgdiDD84jx3WG0xBciu-qXcCD6b-wQm2wMDtH5m-mF3MRAUz90G7g51ctEiszyvqJOqF5Dhb0jF_Jd0YzsvrnKnu1vX5P-iRJH2r1kfgjVfuRmyIsTHUCVDw28VR_q6VSejoa2Mb-M_TF2Det6HuKZDVVEBnniYrJ6Sm4m93QoIfQz5pWuP05amWqXMb5JYtCICg" />
</div>
<div className="flex-1 min-w-0">
<span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-surface-container text-on-surface-variant mb-1">Sách Giấy &amp; Audio</span>
<h3 className="font-title-md text-base font-bold text-on-surface truncate">Nhà Giả Kim</h3>
<p className="text-body-sm text-on-surface-variant">Paulo Coelho</p>
<div className="mt-2 text-xs text-on-surface-variant">
                        Tiến độ: <strong className="text-on-surface font-semibold">62%</strong> (142/228 trang)
                      </div>
<div className="w-full bg-surface-container h-1.5 rounded-full mt-1.5 overflow-hidden">
<div className="bg-primary h-full rounded-full" style={{ width: '62%' }}></div>
</div>
</div>
</div>
<div className="mt-4 pt-3 border-t border-outline-variant/40 flex items-center justify-between text-xs">
<span className="text-on-surface-variant/80 flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">schedule</span>
                      2 ngày trước
                    </span>
<Link className="font-semibold text-primary hover:text-primary-container flex items-center gap-0.5" to="/">
                      Xem Cuốn Sách
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
</Link>
</div>
</div>
</div>
</section>

<section>
<div className="flex items-center justify-between mb-4">
<h2 className="font-headline-sm text-lg font-bold text-on-surface">Bài Viết &amp; Thảo Luận Gần Đây</h2>
<Link className="text-xs font-semibold text-primary hover:underline" to="/community">Tất cả 28 bài viết →</Link>
</div>

<article className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/70 shadow-book-card space-y-4">

<div className="flex items-center justify-between">
<div className="flex items-center gap-3">
<img className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20" alt="Portrait of Nguyen Minh Anh smiling gently in a cozy library setting." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpTUISg-tnfY2rrFojWmbuCx5z779iKnlLgbGz_GLAahWWB8eXP59pYu32VuchN8TAUY2t9FFU636fN99eX09aUYBV7b6QmulGn_6VlfW6R2AZMukgt2emUGXS1AtVlTbpptOBW26u9Jn8STRX4LVTj7ztimGDT-59XVaEH1_8M_qJYFji6Jbp9VnE5CS-fKcM02gS5paQmBxB6SqTKyBbyxLQiEGLIS50Z_MTn9u9Gj0HWMnrBpOetw" />
<div>
<div className="flex items-center gap-1.5">
<span className="font-title-md text-sm font-semibold text-on-surface">Nguyễn Minh Anh</span>
<span className="text-xs text-on-surface-variant">đã chia sẻ một góc nhìn</span>
</div>
<div className="text-[11px] text-on-surface-variant flex items-center gap-1">
<span>2 giờ trước</span>
<span>•</span>
<span className="text-primary font-medium">CLB Phát Triển Bản Thân</span>
</div>
</div>
</div>
<button className="text-on-surface-variant hover:text-on-surface">
<span className="material-symbols-outlined text-lg">bookmark_border</span>
</button>
</div>

<div>
<h3 className="font-headline-sm text-lg font-bold text-on-surface hover:text-primary transition-colors cursor-pointer leading-snug">
                    Thay đổi nhỏ có thực sự tạo ra khác biệt lớn sau 6 tháng kiên trì?
                  </h3>
<p className="mt-2 text-body-md text-on-surface/85 leading-relaxed">
                    Sau khi hoàn thành cuốn <span className="font-semibold text-primary">Atomic Habits</span> vào tháng trước và áp dụng nguyên tắc 2 phút cho việc duy trì thói quen đọc mỗi tối, mình nhận ra rào cản lớn nhất không phải là thiếu động lực, mà là sự kỳ vọng quá mức vào kết quả tức thời...
                  </p>
</div>

<div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/50 flex items-center justify-between gap-4">
<div className="flex items-center gap-3 min-w-0">
<div className="w-12 h-16 rounded-md overflow-hidden flex-shrink-0 shadow-sm book-spine-effect">
<img className="w-full h-full object-cover" alt="Cover of Atomic Habits by James Clear with clean white background, yellow-red font accents, Vietnamese translation edition." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAffrEdtg9Y8HMXsM5ELP8DDXK9-9Pdtrdy_W2poimdKUOjTigW1inJVdriudS105rHLgtAqd1HoOsqqTrtncRT-uheXc5lBJ0XFQn4IhEXOtsClDO5i3FhsI4x3hUfVNTbqGMNJO4mWuNzr7FpQROmsU4OcyNrUl48m2qzbM4HIKF2jHCvdaIAXisVOV9CReVkQlx_9y39VBOZBI3hCmTA_ufZHpVXAdw1xlxFw3zRF8M4BNCmMAXPig" />
</div>
<div className="truncate">
<div className="text-[11px] font-medium text-primary uppercase tracking-wider">Sách được nhắc đến</div>
<h4 className="font-title-md text-sm font-bold text-on-surface truncate">Atomic Habits: Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ</h4>
<div className="flex items-center gap-2 text-xs text-on-surface-variant mt-0.5">
<span>James Clear</span>
<span>•</span>
<span className="text-amber-600 font-semibold flex items-center gap-0.5">
<span className="material-symbols-outlined text-[13px] material-symbols-fill">star</span>
                          4.8
                        </span>
<span>•</span>
<span className="text-primary font-medium">Đã đọc xong (100%)</span>
</div>
</div>
</div>
<button className="px-3 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-white text-on-surface text-xs font-semibold border border-outline-variant/60 shadow-xs flex-shrink-0">
                    Xem Sách
                  </button>
</div>

<div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between text-on-surface-variant text-xs">
<div className="flex items-center gap-6">
<button className="flex items-center gap-1.5 hover:text-tertiary transition-colors group">
<span className="material-symbols-outlined text-lg text-tertiary material-symbols-fill">favorite</span>
<span className="font-semibold text-on-surface group-hover:text-tertiary">128</span> Thích
                    </button>
<button className="flex items-center gap-1.5 hover:text-primary transition-colors">
<span className="material-symbols-outlined text-lg">chat_bubble_outline</span>
<span>24 Bình luận</span>
</button>
<button className="flex items-center gap-1.5 hover:text-primary transition-colors">
<span className="material-symbols-outlined text-lg">share</span>
<span>15 Chia sẻ</span>
</button>
</div>
<div className="text-[11px] text-on-surface-variant/70">
                    1.4K lượt đọc
                  </div>
</div>
</article>
</section>

<section>
<div className="flex items-center justify-between mb-4">
<h2 className="font-headline-sm text-lg font-bold text-on-surface">Review Sách Nổi Bật</h2>
<span className="text-xs text-on-surface-variant font-medium">12 bài đánh giá</span>
</div>
<div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/70 shadow-book-card relative">
<div className="flex items-start justify-between gap-4">
<div className="flex items-center gap-3">
<div className="w-12 h-16 rounded-md overflow-hidden shadow-sm book-spine-effect flex-shrink-0">
<img className="w-full h-full object-cover" alt="Minimalist book cover of Atomic Habits by James Clear placed on ivory aesthetic paper background." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBv7-N6BOo9wz36N_yUF3T9218XQwu3-_Mi4Mdpo2sRs9Rf92ERQwfQmQsUlSoqRGofvgf5SHbc35CO3OnlSuWmLpvgXeZ81dfPRlG3pvMstYZtE5gLjKamK0HXg7ZFH-fgZEzyj9AiUs4k2hawNVtnlcFmG-9mxiXkaeAZq0DRBiEoGxox4Oy3RWauY1-5Ziz-n9G6tUESDd3hkwQ7Y38AU0C2ca3RghCRkv2RHFPTuKbOo2x-jEtUdQ" />
</div>
<div>
<h3 className="font-headline-sm text-base font-bold text-on-surface">Atomic Habits</h3>
<p className="text-body-sm text-on-surface-variant">James Clear · Bản dịch HUKI Ebook</p>
<div className="flex items-center gap-1 mt-1 text-amber-500">
<span className="material-symbols-outlined text-[16px] material-symbols-fill">star</span>
<span className="material-symbols-outlined text-[16px] material-symbols-fill">star</span>
<span className="material-symbols-outlined text-[16px] material-symbols-fill">star</span>
<span className="material-symbols-outlined text-[16px] material-symbols-fill">star</span>
<span className="material-symbols-outlined text-[16px] material-symbols-fill">star</span>
<span className="ml-1 text-xs font-bold text-on-surface">5.0 / 5.0</span>
</div>
</div>
</div>
<span className="px-2.5 py-1 rounded-full bg-theme-secondary/10 text-theme-secondary text-xs font-semibold border border-theme-secondary/20">
                    Top Reviewer HUKI
                  </span>
</div>

<div className="mt-4 bg-theme-surface-subtle border-l-4 border-theme-secondary p-4 rounded-r-xl">
<h4 className="font-title-md text-sm font-semibold text-on-surface italic">
                    “Một cuốn sách dễ áp dụng vào thực tế nhất về kiến tạo thói quen bền vững”
                  </h4>
<p className="mt-2 text-body-sm text-on-surface-variant italic leading-relaxed font-display-lg text-sm sm:text-base">
                    «James Clear không dạy bạn cách gồng mình lên để kỷ luật thép, mà hướng dẫn bạn tái cấu trúc môi trường sống sao cho thói quen tốt trở nên hiển nhiên, còn thói quen xấu trở nên bất tiện. Điểm sáng lớn nhất của bản dịch HUKI lần này là sự mượt mà trong thuật ngữ tâm lý học hành vi.»
                  </p>
</div>
<div className="mt-4 flex items-center justify-between pt-3 border-t border-outline-variant/40 text-xs">
<div className="text-on-surface-variant flex items-center gap-1">
<span className="material-symbols-outlined text-sm text-primary">thumb_up</span>
<span><strong className="text-on-surface">42</strong> độc giả thấy bài viết này hữu ích</span>
</div>
<button className="text-primary font-semibold hover:underline flex items-center gap-1">
<span>Xem Toàn Bộ Review</span>
<span className="material-symbols-outlined text-sm">open_in_new</span>
</button>
</div>
</div>
</section>

<section>
<div className="flex items-center justify-between mb-4">
<div>
<h2 className="font-headline-sm text-lg font-bold text-on-surface">Tủ Sách Yêu Thích Tuyển Chọn</h2>
<p className="text-xs text-on-surface-variant">5 tác phẩm định hình phong cách đọc của Minh Anh</p>
</div>
<Link className="text-xs font-semibold text-primary hover:underline" to="/">Xem tất cả 47 cuốn →</Link>
</div>

<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">

<div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/70 shadow-book-card hover:-translate-y-1 transition-all group">
<div className="aspect-[2/3] rounded-lg overflow-hidden shadow-sm book-spine-effect mb-2.5">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Book cover of Atomic Habits by James Clear, iconic minimal red typography on ivory background." src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-0tmecJvt8aZyNo52miU2gu64pNgKsyDUp3a-ek_k_4i-YIO7gib9OY5b04LbgVZNIhoOUz5u-j0gCsJYLKDKFE-LE5hL9ZkoyPXhddSo9WfLJfa2WcbV7gRpWuB9baSbuQ7_9UL83L62H0cGsLe3GONX-9BPEkubpfa5GH47EI20D2YljJpvf4EPrT_G3oPtCOj49_29xzV8E451-3jtpXTKX_ZCewsUI0iHh5Xh4ulQljlVLVZhHA" />
</div>
<h3 className="font-title-md text-xs font-bold text-on-surface truncate">Atomic Habits</h3>
<p className="text-xs text-on-surface-variant truncate">James Clear</p>
<div className="flex items-center gap-1 mt-1 text-amber-500 text-xs font-semibold">
<span className="material-symbols-outlined text-sm material-symbols-fill">star</span>
<span>5.0</span>
</div>
</div>

<div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/70 shadow-book-card hover:-translate-y-1 transition-all group">
<div className="aspect-[2/3] rounded-lg overflow-hidden shadow-sm book-spine-effect mb-2.5">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Book cover of Deep Work by Cal Newport, bold yellow cover design with clean black graphic design." src="https://lh3.googleusercontent.com/aida-public/AB6AXuApBlXjS0lcOVNVrJhfqDhVmd62HxH1P8_QrZqNgoE3SzI9CL6cFLfS11hk95CkIea8sp9UYNn6F7GGo2aVDZCMdsqinBek6rWSYv-oIoPJYwhslD6dJV5i8apATdyzFwPKmB5s4CJlW4aBwGLRO1fxIQKouHV9kVfx_tJOfnquB71wl0WxMoZCwZSdqZpvtGIFF1nqlJecFMEdLGCAfwI6L9_5KKErG2NBj4y-thvgRLMQveWpvUL7DA" />
</div>
<h3 className="font-title-md text-xs font-bold text-on-surface truncate">Deep Work</h3>
<p className="text-xs text-on-surface-variant truncate">Cal Newport</p>
<div className="flex items-center gap-1 mt-1 text-amber-500 text-xs font-semibold">
<span className="material-symbols-outlined text-sm material-symbols-fill">star</span>
<span>4.9</span>
</div>
</div>

<div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/70 shadow-book-card hover:-translate-y-1 transition-all group">
<div className="aspect-[2/3] rounded-lg overflow-hidden shadow-sm book-spine-effect mb-2.5">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Book cover of The Psychology of Money by Morgan Housel, elegant dark emerald green and gold foil lettering." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBheFIYFRJrUq02gBjRpFtHwtH1L_RVPCinr6WfQNmVJH2pxVg-Ndw2P1MltMrOLwpOptNzyqtYcqsuoMyXa18IUbmAMt9fAJOsTHHhJAK--gBH-SAFb0OLo-BmKPla5x6xhlJILOyYlESmb0jW2QJ7tAigwC2GR-mGR_pJHlVJg-0ZyNi4BhGpuVw7F_fj6LpKjwnxqQQp19cXcHEoDNmQBo9p-7ejhtjslPR3t3c3jyQH-r2r1pOf1Q" />
</div>
<h3 className="font-title-md text-xs font-bold text-on-surface truncate">Tâm Lý Học Về Tiền</h3>
<p className="text-xs text-on-surface-variant truncate">Morgan Housel</p>
<div className="flex items-center gap-1 mt-1 text-amber-500 text-xs font-semibold">
<span className="material-symbols-outlined text-sm material-symbols-fill">star</span>
<span>5.0</span>
</div>
</div>

<div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/70 shadow-book-card hover:-translate-y-1 transition-all group">
<div className="aspect-[2/3] rounded-lg overflow-hidden shadow-sm book-spine-effect mb-2.5">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Book cover of Thinking, Fast and Slow by Daniel Kahneman, minimalist white book cover with a sharp graphite pencil illustration." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBrkYjf1neG-q73EgFnl36Eg6ICS53Kq5eQb7HGwitHm_cv2L2sMzFth0kTexOWsPVWuQZqyqWX7_0yS4Bn92gjIW3WXtepmAYlW-E8uggbXxd6fkAFh4y20VUtCxkJND9rUrIJVdVqSxhx1it3dmEdVElbvWVaVzXXoCZ0N1l7c21bG44_LINr3Fe-10op7v4TmqSru6U6Pgw2IZhZKEjzEObXA5uTtr2MUGN4q0vi3OGX02Nf3v2lQA" />
</div>
<h3 className="font-title-md text-xs font-bold text-on-surface truncate">Tư Duy Nhanh &amp; Chậm</h3>
<p className="text-xs text-on-surface-variant truncate">Daniel Kahneman</p>
<div className="flex items-center gap-1 mt-1 text-amber-500 text-xs font-semibold">
<span className="material-symbols-outlined text-sm material-symbols-fill">star</span>
<span>4.8</span>
</div>
</div>

<div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/70 shadow-book-card hover:-translate-y-1 transition-all group">
<div className="aspect-[2/3] rounded-lg overflow-hidden shadow-sm book-spine-effect mb-2.5">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Book cover of The Daily Stoic by Ryan Holiday, classic Greek marble sculpture profile on stone grey background." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCN8Com1Mo_ci68S114rxlFDUSkLA24tyqEdVUiEHEhKTchDmPhlk8XNU8-DTHr19VLSjJKeCuQkXVTKVwLGfats8M-YyJU_zx9NjFFcDWyzpzVmlRWBkC5YY8kAljxS5GRtdSHtPBuSqiX2Mffj8peqPXdC3YJjavexVs34JnDbiQrDViudbHgkS7dQgvvkAETgAcwEDV_Bo_q2csYDSu64auCuVJ_6rtvTmch7dou7r41k4DKizI7YA" />
</div>
<h3 className="font-title-md text-xs font-bold text-on-surface truncate">Chủ Nghĩa Khắc Kỷ</h3>
<p className="text-xs text-on-surface-variant truncate">Ryan Holiday</p>
<div className="flex items-center gap-1 mt-1 text-amber-500 text-xs font-semibold">
<span className="material-symbols-outlined text-sm material-symbols-fill">star</span>
<span>4.7</span>
</div>
</div>
</div>
</section>
</div>

<div className="lg:col-span-3 space-y-6">

<div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/70 shadow-book-card">
<div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
<span className="text-xs uppercase tracking-wider font-semibold text-primary flex items-center gap-1">
<span className="w-2 h-2 rounded-full bg-primary"></span>
                  Đang Đọc Trọng Tâm
                </span>
<span className="text-xs text-on-surface-variant">Chương 4/10</span>
</div>
<div className="mt-4 text-center">
<div className="w-32 h-44 mx-auto rounded-xl overflow-hidden shadow-md book-spine-effect ring-1 ring-black/5">
<img className="w-full h-full object-cover" alt="High resolution cover of Deep Work Rules for Focused Success in a Distracted World by Cal Newport on clean library shelf." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGVta7GCOCFr0yU48FioEs-RuFKG-hTl09xZGhkVY3rNhThtdTnsC7E_RKr9jPx0o_C_kvNTYys9ikjJaYZ4HWmaMkBm2atGIwk6zaac302ibjgEi3G9QjGomZR3phEdNJP3spLhWyLfthDdoayIsQQZbpR7h0q0fsR0sMyFYNGR271bFwJ6u7klL_UKdMVguQy1ev5d5N9lmZ-7VEwrQVHjxNYN6ID6EU83oR0dmckUI5tuVGhDSLtQ" />
</div>
<h3 className="font-headline-sm text-base font-bold text-on-surface mt-3">Deep Work</h3>
<p className="text-body-sm text-on-surface-variant">Cal Newport · NXB Trẻ</p>

<div className="mt-3 text-left">
<div className="flex justify-between text-xs text-on-surface-variant mb-1">
<span>Đã đọc 114 / 304 trang</span>
<span className="font-semibold text-primary">36%</span>
</div>
<div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
<div className="bg-theme-secondary h-full rounded-full" style={{ width: '36%' }}></div>
</div>
</div>
<button className="mt-4 w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-container text-white font-title-md text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5">
<span className="material-symbols-outlined text-base">chrome_reader_mode</span>
<span>Xem Chi Tiết Sách</span>
</button>
</div>
</div>

<div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/70 shadow-book-card">
<div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-xl">pie_chart</span>
<h2 className="font-headline-sm text-base font-semibold text-on-surface">Gu Đọc Sách</h2>
</div>
<span className="text-xs text-on-surface-variant font-medium">Năm 2026</span>
</div>
<div className="mt-4 space-y-3">

<div>
<div className="flex justify-between text-xs mb-1">
<span className="font-medium text-on-surface">Phát triển bản thân</span>
<span className="font-semibold text-primary">38%</span>
</div>
<div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
<div className="bg-primary h-full rounded-full" style={{ width: '38%' }}></div>
</div>
</div>

<div>
<div className="flex justify-between text-xs mb-1">
<span className="font-medium text-on-surface">Tâm lý học ứng dụng</span>
<span className="font-semibold text-theme-secondary">26%</span>
</div>
<div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
<div className="bg-theme-secondary h-full rounded-full" style={{ width: '26%' }}></div>
</div>
</div>

<div>
<div className="flex justify-between text-xs mb-1">
<span className="font-medium text-on-surface">Kinh doanh &amp; Quản trị</span>
<span className="font-semibold text-amber-700 dark:text-amber-400">18%</span>
</div>
<div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
<div className="bg-amber-600 h-full rounded-full" style={{ width: '18%' }}></div>
</div>
</div>

<div>
<div className="flex justify-between text-xs mb-1">
<span className="font-medium text-on-surface">Triết học &amp; Lối sống</span>
<span className="font-semibold text-theme-accent">12%</span>
</div>
<div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
<div className="bg-theme-accent h-full rounded-full" style={{ width: '12%' }}></div>
</div>
</div>

<div>
<div className="flex justify-between text-xs mb-1">
<span className="font-medium text-on-surface-variant">Khác (Văn học, Lịch sử)</span>
<span className="font-semibold text-on-surface-variant">6%</span>
</div>
<div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
<div className="bg-outline-variant h-full rounded-full" style={{ width: '6%' }}></div>
</div>
</div>
</div>
<div className="mt-4 pt-3 border-t border-outline-variant/40 text-center">
<span className="text-[11px] text-on-surface-variant italic">
                  Dữ liệu tự động cập nhật từ nhật ký đọc HUKI Reader
                </span>
</div>
</div>

<div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/70 shadow-book-card">
<div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[20px]">groups</span>
<h2 className="font-headline-sm text-base font-semibold text-on-surface">CLB Tham Gia</h2>
</div>
<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">3 CLB</span>
</div>
<div className="mt-3 space-y-3.5">

<div className="flex items-start gap-3 group cursor-pointer">
<div className="w-10 h-10 rounded-xl bg-[#fea619]/20 text-[#855300] flex items-center justify-center font-bold flex-shrink-0">
<span className="material-symbols-outlined text-xl">self_improvement</span>
</div>
<div className="flex-1 min-w-0">
<div className="flex items-center justify-between">
<h4 className="font-title-md text-xs font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                        CLB Phát Triển Bản Thân
                      </h4>
</div>
<div className="text-[11px] text-primary font-semibold">Chủ CLB · 4.8K thành viên</div>
<div className="text-[11px] text-on-surface-variant">Đang thảo luận: Sức Bền Ý Chí</div>
</div>
</div>

<div className="flex items-start gap-3 group cursor-pointer">
<div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">
<span className="material-symbols-outlined text-xl">trending_up</span>
</div>
<div className="flex-1 min-w-0">
<h4 className="font-title-md text-xs font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                      Đọc Sách Kinh Doanh Tinh Hoa
                    </h4>
<div className="text-[11px] text-on-surface-variant">Thành viên tích cực · 2.3K thành viên</div>
<div className="text-[11px] text-on-surface-variant">Đang đọc: Good to Great</div>
</div>
</div>

<div className="flex items-start gap-3 group cursor-pointer">
<div className="w-10 h-10 rounded-xl bg-[#ac2c19]/10 text-tertiary flex items-center justify-center font-bold flex-shrink-0">
<span className="material-symbols-outlined text-xl">balance</span>
</div>
<div className="flex-1 min-w-0">
<h4 className="font-title-md text-xs font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                      Thảo Luận Triết Học Khắc Kỷ
                    </h4>
<div className="text-[11px] text-on-surface-variant">Thành viên · 1.2K thành viên</div>
<div className="text-[11px] text-on-surface-variant">Thảo luận hàng tuần</div>
</div>
</div>
</div>
<button className="mt-4 w-full py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-title-md text-xs font-medium border border-outline-variant/60 transition-colors">
                Khám Phá Các CLB Khác
              </button>
</div>

<div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/70 shadow-book-card">
<div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary text-[20px]">history</span>
<h2 className="font-headline-sm text-base font-semibold text-on-surface">Hoạt Động Gần Đây</h2>
</div>
</div>
<div className="mt-4 relative pl-5 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-outline-variant/60">

<div className="relative">
<span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-white"></span>
<div className="text-xs font-semibold text-on-surface">Hoàn thành Chương 4 Deep Work</div>
<div className="text-[11px] text-on-surface-variant">Hôm nay · HUKI Reader Web</div>
</div>

<div className="relative">
<span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-[#13846a] ring-4 ring-white"></span>
<div className="text-xs font-semibold text-on-surface">Đăng bài thảo luận Atomic Habits</div>
<div className="text-[11px] text-on-surface-variant">2 giờ trước · 128 lượt thích</div>
</div>

<div className="relative">
<span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-white"></span>
<div className="text-xs font-semibold text-on-surface">Viết đánh giá 5★ cho Tâm Lý Học Về Tiền</div>
<div className="text-[11px] text-on-surface-variant">3 ngày trước · Top Review</div>
</div>

<div className="relative">
<span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-outline ring-4 ring-white"></span>
<div className="text-xs font-semibold text-on-surface">Tham gia thử thách đọc tháng 9 cùng CLB</div>
<div className="text-[11px] text-on-surface-variant">1 tuần trước · Mục tiêu 2 cuốn</div>
</div>
</div>
</div>
</div>
</div>
      </main>
    </div>
  );
}
