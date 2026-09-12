import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function LibraryPage() {
  const [userBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="w-full bg-theme-bg text-on-surface font-sans antialiased min-h-screen flex flex-col lg:flex-row">
      <aside className="w-full lg:w-[260px] bg-theme-surface border-r border-theme-border flex flex-col justify-between z-10 shrink-0 px-4 py-5">
        <div className="flex flex-col h-full">
          <div className="relative w-full mb-4">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-on-surface-variant">
              <span className="material-symbols-outlined text-[17px]">search</span>
            </div>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[38px] pl-8 pr-3 bg-theme-bg border border-theme-border rounded-xl text-xs text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-theme-primary transition-all"
              placeholder="Tìm kiếm trong tủ..."
              type="text"
            />
          </div>

          <div className="flex items-center justify-between pt-1 pb-3 mb-2">
            <h2 className="font-editorial font-bold text-lg text-on-surface tracking-tight">Tủ Sách &amp; Phân Loại</h2>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-3 h-[40px] rounded-xl bg-theme-secondary-subtle text-theme-secondary font-semibold text-xs transition-colors border border-theme-border">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-theme-secondary">menu_book</span>
                <span>Tất Cả Sách</span>
              </div>
              <span className="text-[11px] font-bold text-theme-secondary bg-theme-surface px-2 py-0.5 rounded-md border border-theme-border">
                {userBooks.length}
              </span>
            </div>

            <div className="flex items-center justify-between px-3 h-[40px] rounded-xl text-on-surface hover:bg-theme-bg font-medium text-xs transition-colors">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-emerald-600">schedule</span>
                <span>Đang Đọc Dở</span>
              </div>
              <span className="text-[11px] font-medium text-on-surface-variant">0</span>
            </div>

            <div className="flex items-center justify-between px-3 h-[40px] rounded-xl text-on-surface hover:bg-theme-bg font-medium text-xs transition-colors">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-amber-500">star</span>
                <span>Sách Yêu Thích</span>
              </div>
              <span className="text-[11px] font-medium text-on-surface-variant">0</span>
            </div>

            <div className="flex items-center justify-between px-3 h-[40px] rounded-xl text-on-surface hover:bg-theme-bg font-medium text-xs transition-colors">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-orange-500">bookmark</span>
                <span>Muốn Đọc</span>
              </div>
              <span className="text-[11px] font-medium text-on-surface-variant">0</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-theme-bg">
        <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Header Banner */}
          <div
            className="w-full rounded-3xl text-white p-6 sm:p-8 relative overflow-hidden shadow-xs"
            style={{ background: 'linear-gradient(to right, var(--theme-hero-from, #003B2B), var(--theme-hero-via, #005140), var(--theme-hero-to, #00241A))' }}
          >
            <div className="relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-medium backdrop-blur-xs mb-3 border border-white/20">
                <span className="material-symbols-outlined text-sm text-[#FBBF24]">auto_awesome</span>
                <span>Tủ Sách Số Bản Quyền DRM</span>
              </div>
              <h1 className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2 leading-snug">
                Không Gian Đọc Sách Số Cá Nhân
              </h1>
              <p className="text-white/80 text-xs sm:text-sm leading-relaxed mb-6">
                Các đầu sách điện tử (Ebook EPUB/PDF) bạn đã mua sẽ được lưu trữ vĩnh viễn và đồng bộ tiến độ đọc trên mọi thiết bị.
              </p>
              <Link
                to="/books"
                className="px-5 py-2.5 bg-white text-theme-primary font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:bg-theme-bg transition-colors inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">explore</span>
                <span>Khám Phá Thêm Sách Mới</span>
              </Link>
            </div>
          </div>

          {/* Book List Section */}
          <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-theme-border mb-6">
              <div>
                <h3 className="font-editorial font-bold text-lg text-on-surface">Tất cả sách trong tủ</h3>
                <p className="text-xs text-on-surface-variant">Sở hữu vĩnh viễn • Bản quyền số DRM HUKI</p>
              </div>
            </div>

            {userBooks.length === 0 ? (
              <div className="py-12 sm:py-16 text-center">
                <div className="w-16 h-16 rounded-3xl bg-theme-primary/10 text-theme-primary flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl">auto_stories</span>
                </div>
                <h4 className="font-editorial text-xl font-bold text-on-surface mb-1.5">
                  Tủ Sách Của Bạn Đang Trống
                </h4>
                <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto mb-6">
                  Bạn chưa sở hữu tác phẩm nào. Hãy ghé thăm sàn thương mại HuKi để lựa chọn những cuốn sách hay và bắt đầu hành trình đọc sách của bạn.
                </p>
                <Link
                  to="/books"
                  className="bg-theme-primary text-white px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold hover:bg-theme-primary-hover transition-all shadow-sm inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">menu_book</span>
                  <span>Khám Phá Kho Sách Ngay</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                {/* Dynamically mapped user books */}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
