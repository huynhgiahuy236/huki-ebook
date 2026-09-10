import React from 'react';
import { Link } from 'react-router-dom';

export default function LibraryPage() {
  return (
    <div className="w-full bg-theme-bg text-on-surface font-sans antialiased min-h-screen flex flex-col lg:flex-row">

<aside className="w-[250px] h-full bg-theme-surface border-r border-theme-border flex flex-col justify-between z-10 shrink-0 px-4 py-4">
<div className="flex flex-col h-full overflow-y-auto">

<div className="relative w-full mb-4">
<div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#8A9B95]">
<span className="material-symbols-outlined text-[17px]">search</span>
</div>
<input className="w-full h-[38px] pl-8 pr-3 bg-theme-bg border border-theme-border rounded-[8px] text-[13px] text-on-surface placeholder-[#90A29C] focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/30 transition-all" placeholder="Tìm kiếm nhanh trong tủ..." type="text" />
</div>

<div className="flex items-center justify-between pt-1 pb-3 mb-2">
<h2 className="font-serif font-bold text-[21px] text-on-surface tracking-tight">Tủ Sách &amp; Phân Loại</h2>
<button className="w-6 h-6 rounded flex items-center justify-center text-[#8C9E98] hover:text-on-surface hover:bg-theme-bg transition-colors" title="Đóng panel" aria-label="Đóng panel lọc">
<span className="material-symbols-outlined text-[18px]">close</span>
</button>
</div>

<div className="flex flex-col gap-[3px]">

<div className="flex items-center justify-between px-3 h-[42px] rounded-[10px] bg-theme-secondary-subtle text-theme-secondary font-semibold text-[13.5px] cursor-pointer transition-colors border border-theme-border">
<div className="flex items-center gap-2.5">
<span className="material-symbols-outlined text-[19px] text-theme-secondary">menu_book</span>
<span>Tất Cả Sách</span>
</div>
<span className="text-[12.5px] font-bold text-theme-secondary bg-theme-surface px-2 py-0.5 rounded-md shadow-2xs border border-theme-border">48</span>
</div>

<div className="flex items-center justify-between px-3 h-[40px] rounded-[8px] text-on-surface hover:bg-theme-bg font-medium text-[13.5px] cursor-pointer transition-colors group">
<div className="flex items-center gap-2.5">
<span className="material-symbols-outlined text-[19px] text-[#16A34A] group-hover:scale-105 transition-transform">schedule</span>
<span>Đang Đọc Dở</span>
</div>
<span className="text-[12px] font-medium text-[#7A8F88] group-hover:text-on-surface">3</span>
</div>

<div className="flex items-center justify-between px-3 h-[40px] rounded-[8px] text-on-surface hover:bg-theme-bg font-medium text-[13.5px] cursor-pointer transition-colors group">
<div className="flex items-center gap-2.5">
<span className="material-symbols-outlined text-[19px] text-[#EAB308] group-hover:scale-105 transition-transform">star</span>
<span>Sách Yêu Thích</span>
</div>
<span className="text-[12px] font-medium text-[#7A8F88] group-hover:text-on-surface">12</span>
</div>

<div className="flex items-center justify-between px-3 h-[40px] rounded-[8px] text-on-surface hover:bg-theme-bg font-medium text-[13.5px] cursor-pointer transition-colors group">
<div className="flex items-center gap-2.5">
<span className="material-symbols-outlined text-[19px] text-[#EA580C] group-hover:scale-105 transition-transform">bookmark</span>
<span>Muốn Đọc</span>
</div>
<span className="text-[12px] font-medium text-[#7A8F88] group-hover:text-on-surface">18</span>
</div>

<div className="flex items-center justify-between px-3 h-[40px] rounded-[8px] text-on-surface hover:bg-theme-bg font-medium text-[13.5px] cursor-pointer transition-colors group">
<div className="flex items-center gap-2.5">
<span className="material-symbols-outlined text-[19px] text-[#0D9488] group-hover:scale-105 transition-transform">check_circle</span>
<span>Đã Đọc Xong</span>
</div>
<span className="text-[12px] font-medium text-[#7A8F88] group-hover:text-on-surface">25</span>
</div>

<div className="flex items-center justify-between px-3 h-[40px] rounded-[8px] text-on-surface hover:bg-theme-bg font-medium text-[13.5px] cursor-pointer transition-colors group">
<div className="flex items-center gap-2.5">
<span className="material-symbols-outlined text-[19px] text-[#6366F1] group-hover:scale-105 transition-transform">shopping_bag</span>
<span>Ebook Đã Mua</span>
</div>
<span className="text-[12px] font-medium text-[#7A8F88] group-hover:text-on-surface">15</span>
</div>
</div>

<div className="mt-8 pt-3 border-t border-theme-border">
<div className="flex items-center justify-between px-1 mb-3">
<span className="text-[11px] font-bold tracking-wider text-[#8A9C96] uppercase">Nhãn Màu Cá Nhân</span>
<button className="w-5 h-5 rounded hover:bg-theme-bg flex items-center justify-center text-[#556963] transition-colors" title="Thêm nhãn mới">
<span className="material-symbols-outlined text-[17px]">add</span>
</button>
</div>

<div className="p-3 bg-theme-surface/70 border border-dashed border-theme-border rounded-[8px] text-center mt-2">
<p className="text-[11.5px] text-[#7E918B] leading-relaxed">
            Nhấn <span className="font-semibold text-theme-secondary">+</span> để tạo nhãn màu tùy chỉnh phân loại sách theo dự án hoặc tâm trạng.
          </p>
</div>
</div>
</div>

<div className="pt-3 border-t border-theme-border flex items-center justify-between text-[11.5px] text-[#7A8D87]">
<span className="flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full bg-theme-secondary"></span>
        Đã đồng bộ đám mây
      </span>
<span className="font-medium text-[#5B6D67]">48 / 500 sách</span>
</div>
</aside>



<div className="flex-1 flex flex-col min-w-0 bg-theme-bg">

<div className="p-8 space-y-6">

<div
  className="w-full rounded-2xl text-white p-7 relative overflow-hidden shadow-sm"
  style={{ background: 'linear-gradient(to right, var(--theme-hero-from, #005740), var(--theme-hero-via, #006B4F), var(--theme-hero-to, #0D4B39))' }}
>

<div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 flex items-center justify-end pr-10 pointer-events-none">
<span className="material-symbols-outlined text-[240px]">menu_book</span>
</div>
<div className="relative z-10 max-w-2xl">
<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-white/90 text-[12px] font-medium backdrop-blur-xs mb-3 border border-white/20">
<span className="material-symbols-outlined text-[15px] text-[#FBBF24]">auto_awesome</span>
<span>Mục tiêu đọc sách năm 2026</span>
</div>
<h1 className="font-serif text-[28px] font-bold tracking-tight text-white mb-2 leading-tight">
            Bạn đã hoàn thành 25 / 40 cuốn sách trong năm
          </h1>
<p className="text-white/80 text-[14px] leading-relaxed mb-5">
            Tiếp tục giữ vững nhịp độ 30 phút mỗi ngày. Cuốn sách “Con Đường Phía Trước – Bill Gates” đang đạt 2% tiến độ đọc.
          </p>
<div className="flex items-center gap-3">
<Link to="/read/con-duong-phia-truoc" className="px-4 py-2 bg-white text-theme-primary font-semibold text-[13.5px] rounded-lg shadow-sm hover:bg-theme-bg transition-colors flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px]">play_arrow</span>
              Đọc tiếp Trang 3
            </Link>
<button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium text-[13.5px] rounded-lg transition-colors border border-white/20">
              Chi tiết mục tiêu
            </button>
</div>
</div>
</div>

<div className="flex items-center justify-between pt-2">
<div>
<h3 className="font-serif font-bold text-[20px] text-on-surface">Tất cả sách trong tủ</h3>
<p className="text-[13px] text-[#71857F]">Đang hiển thị 48 cuốn sách điện tử có bản quyền DRM HUKI</p>
</div>
<div className="flex items-center gap-2">
<span className="text-[12.5px] text-[#697D77]">Lọc định dạng:</span>
<span className="px-2.5 py-1 bg-theme-surface border border-theme-border rounded-md text-[12px] font-medium text-theme-secondary">EPUB (38)</span>
<span className="px-2.5 py-1 bg-theme-surface border border-theme-border rounded-md text-[12px] font-medium text-[#677A75]">PDF (10)</span>
</div>
</div>

<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">

        <Link to="/read/con-duong-phia-truoc" className="bg-theme-surface rounded-[14px] border-2 border-[#fea619] p-3.5 shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col">
          <div className="w-full aspect-[2/3] bg-theme-secondary-subtle rounded-[8px] overflow-hidden relative shadow-inner mb-3">
            <img alt="Con Đường Phía Trước - Bill Gates" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300" />
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-[#fea619] text-black text-[10.5px] font-bold">Trang 3/166</span>
          </div>
          <div className="text-[11.5px] text-[#fea619] font-semibold flex items-center gap-1 mb-1">
            <span className="material-symbols-outlined text-[14px] fill">star</span>
            <span>5.0</span>
            <span className="text-[#8B9D97] font-normal">(3.8k)</span>
          </div>
          <h4 className="font-semibold text-[14px] text-on-surface line-clamp-1 leading-snug">Con Đường Phía Trước</h4>
          <p className="text-[12px] text-[#728580] line-clamp-1 mt-0.5">Bill Gates</p>
          <div className="mt-3 pt-2.5 border-t border-theme-border flex items-center justify-between">
            <span className="text-[11.5px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">PDF DRM</span>
            <span className="material-symbols-outlined text-[18px] text-[#8EA29C] hover:text-theme-secondary">more_vert</span>
          </div>
        </Link>

        <Link to="/reader" className="bg-theme-surface rounded-[14px] border border-theme-border p-3.5 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col">
          <div className="w-full aspect-[2/3] bg-theme-secondary-subtle rounded-[8px] overflow-hidden relative shadow-inner mb-3">
            <img alt="Atomic Habits" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300" />
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-theme-secondary text-white text-[10.5px] font-bold">100%</span>
          </div>
          <div className="text-[11.5px] text-[#fea619] font-semibold flex items-center gap-1 mb-1">
            <span className="material-symbols-outlined text-[14px] fill">star</span>
            <span>5.0</span>
            <span className="text-[#8B9D97] font-normal">(3.4k)</span>
          </div>
          <h4 className="font-semibold text-[14px] text-on-surface line-clamp-1 leading-snug">Thay Đổi Tí Hon - Atomic Habits</h4>
          <p className="text-[12px] text-[#728580] line-clamp-1 mt-0.5">James Clear</p>
          <div className="mt-3 pt-2.5 border-t border-theme-border flex items-center justify-between">
            <span className="text-[11.5px] text-theme-secondary font-medium bg-theme-secondary-subtle px-2 py-0.5 rounded">EPUB</span>
            <span className="material-symbols-outlined text-[18px] text-[#8EA29C] hover:text-theme-secondary">more_vert</span>
          </div>
        </Link>

        <Link to="/reader" className="bg-theme-surface rounded-[14px] border border-theme-border p-3.5 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col">
          <div className="w-full aspect-[2/3] bg-theme-secondary-subtle rounded-[8px] overflow-hidden relative shadow-inner mb-3">
            <img alt="Tâm Lý Học Về Tiền" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1592496431122-2349e0fbc666?auto=format&fit=crop&q=80&w=300" />
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-[#E98A15] text-white text-[10.5px] font-bold">Muốn đọc</span>
          </div>
          <div className="text-[11.5px] text-[#fea619] font-semibold flex items-center gap-1 mb-1">
            <span className="material-symbols-outlined text-[14px] fill">star</span>
            <span>4.8</span>
            <span className="text-[#8B9D97] font-normal">(980)</span>
          </div>
          <h4 className="font-semibold text-[14px] text-on-surface line-clamp-1 leading-snug">Tâm Lý Học Về Tiền</h4>
          <p className="text-[12px] text-[#728580] line-clamp-1 mt-0.5">Morgan Housel</p>
          <div className="mt-3 pt-2.5 border-t border-theme-border flex items-center justify-between">
            <span className="text-[11.5px] text-[#61746F] font-medium bg-theme-secondary-subtle px-2 py-0.5 rounded">PDF</span>
            <span className="material-symbols-outlined text-[18px] text-[#8EA29C] hover:text-theme-secondary">more_vert</span>
          </div>
        </Link>

        <Link to="/reader" className="bg-theme-surface rounded-[14px] border border-theme-border p-3.5 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col">
          <div className="w-full aspect-[2/3] bg-theme-secondary-subtle rounded-[8px] overflow-hidden relative shadow-inner mb-3">
            <img alt="Đám Bị Ghét" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300" />
            <span className="absolute top-2 right-2 p-1 rounded-full bg-theme-surface/90 text-[#EF4444] shadow-xs">
              <span className="material-symbols-outlined text-[14px] fill">favorite</span>
            </span>
          </div>
          <div className="text-[11.5px] text-[#fea619] font-semibold flex items-center gap-1 mb-1">
            <span className="material-symbols-outlined text-[14px] fill">star</span>
            <span>4.9</span>
            <span className="text-[#8B9D97] font-normal">(2.1k)</span>
          </div>
          <h4 className="font-semibold text-[14px] text-on-surface line-clamp-1 leading-snug">Can Đảm Để Bị Ghét</h4>
          <p className="text-[12px] text-[#728580] line-clamp-1 mt-0.5">Koga Fumitake, Kishimi Ichiro</p>
          <div className="mt-3 pt-2.5 border-t border-theme-border flex items-center justify-between">
            <span className="text-[11.5px] text-theme-secondary font-medium bg-theme-secondary-subtle px-2 py-0.5 rounded">EPUB</span>
            <span className="material-symbols-outlined text-[18px] text-[#8EA29C] hover:text-theme-secondary">more_vert</span>
          </div>
        </Link>
</div>
</div>
</div>
    </div>
  );
}
