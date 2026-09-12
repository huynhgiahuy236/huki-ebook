import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function SellerPortalLayout() {
  const { isLoggedIn, hasRole } = useAuth();
  const location = useLocation();
  const isRegisterPage = location.pathname.includes('/register');

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#17201F] font-sans antialiased">
      {/* B2B Partner Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E8E5DF] shadow-xs">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex items-center justify-between min-h-[68px]">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#003B2B] to-[#006B50] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[24px]">menu_book</span>
              </div>
              <div className="flex flex-col">
                <span className="font-editorial text-xl font-bold tracking-tight text-[#003B2B] leading-none">
                  HUKI EBOOK
                </span>
                <span className="text-[11px] uppercase font-bold tracking-wider text-[#006B50]">
                  Kênh Người Bán & NXB
                </span>
              </div>
            </Link>

            <div className="h-6 w-px bg-[#E8E5DF] mx-2 hidden md:block"></div>

            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-[#59413C]">
              <Link to="/seller" className={`hover:text-[#003B2B] transition-colors ${!isRegisterPage ? 'text-[#003B2B] font-bold' : ''}`}>
                Giới Thiệu Kênh Bán
              </Link>
              <Link to="/seller/register" className={`hover:text-[#003B2B] transition-colors ${isRegisterPage ? 'text-[#003B2B] font-bold' : ''}`}>
                Đăng Ký Đối Tác NXB
              </Link>
              <Link to="/seller/edge-cases" className="hover:text-[#003B2B] transition-colors">
                Thư Viện Trạng Thái Sách
              </Link>
            </nav>
          </div>

          {/* Right Action CTA */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#59413C] hover:text-[#003B2B] px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">storefront</span>
              <span>Về Sàn HUKI Store</span>
            </Link>

            <Link
              to="/seller/dashboard"
              className="inline-flex items-center gap-1.5 bg-[#003B2B] hover:bg-[#005140] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">dashboard</span>
              <span>Vào Kênh Quản Trị</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 min-w-0">
        <Outlet />
      </main>

      {/* B2B Footer */}
      <footer className="bg-white border-t border-[#E8E5DF] py-10 px-4 sm:px-6 lg:px-8 mt-auto text-xs text-[#59413C]">
        <div className="max-w-[1680px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="font-editorial text-base font-bold text-[#003B2B]">HUKI PARTNER ECOSYSTEM</div>
            <span className="hidden sm:inline text-gray-300">|</span>
            <span>Cổng Kết Nối & Xuất Bản Số Chuẩn Quốc Tế Cho Nhà Sách, Tác Giả & Đơn Vị Phát Hành</span>
          </div>
          <div className="flex items-center gap-6 font-medium">
            <Link to="/seller/register" className="hover:text-[#003B2B]">Quy chế sàn</Link>
            <Link to="/seller/register" className="hover:text-[#003B2B]">Chính sách bảo mật DRM</Link>
            <a href="mailto:partner@huki.vn" className="hover:text-[#003B2B]">partner@huki.vn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
