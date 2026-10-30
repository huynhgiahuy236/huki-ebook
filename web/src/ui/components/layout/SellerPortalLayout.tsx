import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/ui/context/AuthContext';

export interface SellerPortalLayoutProps {
  children?: React.ReactNode;
}

export default function SellerPortalLayout({ children }: SellerPortalLayoutProps) {
  const pathname = usePathname() || '';
  const { user, isLoggedIn } = useAuth();

  const isRegisterPage = pathname.includes('/register');
  const isPendingPage = pathname.includes('/pending');
  const isSetupPage = pathname.includes('/stores/setup');

  const bizStatus = user?.business?.status;
  const isApprovedSeller = user?.role === 'BUSINESS' || Boolean(user?.hasApprovedBusiness) || bizStatus === 'APPROVED';

  const [isSetupCompleted, setIsSetupCompleted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.business?.id) {
      const completed = localStorage.getItem(`huki_store_setup_completed_${user.business.id}`) === 'true';
      const hasBank = Boolean(user?.business?.bankAccountNumber && user?.business?.bankName);
      setIsSetupCompleted(completed || hasBank);
    }
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-slate-900 font-sans antialiased">
      {/* B2B Partner Navigation Header - Standard Compact 54px Anti-AI */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-[54px]">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <Link href="/seller" className="flex flex-col select-none group">
              <div className="flex items-center gap-1.5">
                <span className="font-editorial text-base sm:text-lg font-black tracking-tight text-[#003B2B] leading-none">
                  HUKI EBOOK
                </span>
                <span className="bg-[#003B2B] text-white text-[7.5px] sm:text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider">
                  PARTNER
                </span>
              </div>
              <span className="text-[7.5px] sm:text-[8px] uppercase tracking-widest text-[#006953] font-bold mt-0.5 whitespace-nowrap">
                Kênh Nhà Bán Hàng &amp; NXB
              </span>
            </Link>

            <div className="h-4 w-px bg-slate-200 mx-2 hidden md:block" />

            <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-600">
              <Link
                href="/seller"
                className={`transition-colors hover:text-[#003B2B] ${
                  !isRegisterPage && !isPendingPage && !isSetupPage ? 'text-[#003B2B] font-semibold' : ''
                }`}
              >
                Giới thiệu kênh
              </Link>

              {/* Dynamic Action Nav: 1. Regis -> 2. Pending -> 3. Ngân hàng -> 4. Dashboard */}
              {!isLoggedIn || (!user?.business && !isApprovedSeller) ? (
                <Link
                  href="/seller/register"
                  className={`transition-colors hover:text-[#003B2B] ${
                    isRegisterPage ? 'text-[#003B2B] font-semibold' : ''
                  }`}
                >
                  Đăng ký mở gian hàng
                </Link>
              ) : bizStatus === 'PENDING_APPROVAL' || isPendingPage ? (
                <Link
                  href="/seller/pending"
                  className={`transition-colors flex items-center gap-1.5 ${
                    isPendingPage ? 'text-amber-900 font-semibold' : 'hover:text-[#003B2B]'
                  }`}
                >
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Hồ sơ đang thẩm định
                  </span>
                </Link>
              ) : (isApprovedSeller && !isSetupCompleted) || isSetupPage ? (
                <Link
                  href="/seller/stores/setup"
                  className={`transition-colors flex items-center gap-1.5 ${
                    isSetupPage ? 'text-emerald-900 font-semibold' : 'hover:text-[#003B2B]'
                  }`}
                >
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Thiết lập ngân hàng &amp; gian hàng
                  </span>
                </Link>
              ) : (
                <Link
                  href="/seller/dashboard"
                  className="hover:text-[#003B2B] transition-colors text-[#003B2B] font-semibold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">dashboard</span>
                  <span>Bảng điều khiển</span>
                </Link>
              )}
            </nav>
          </div>

          {/* Right Action CTA */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-[#003B2B] px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">storefront</span>
              <span className="hidden sm:inline">Về sàn HUKI</span>
            </Link>

            {!isLoggedIn || (!user?.business && !isApprovedSeller) ? (
              <Link
                href="/seller/register"
                className="inline-flex items-center gap-1.5 bg-[#003B2B] hover:bg-[#002b1f] text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">add_business</span>
                <span>Đăng Ký Bán Hàng</span>
              </Link>
            ) : bizStatus === 'PENDING_APPROVAL' ? (
              <Link
                href="/seller/pending"
                className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200/80 text-[11px] font-medium px-2.5 py-1 rounded-md"
              >
                <span className="material-symbols-outlined text-[14px] text-amber-700">schedule</span>
                <span>Chờ thẩm định</span>
              </Link>
            ) : isApprovedSeller && !isSetupCompleted ? (
              <Link
                href="/seller/stores/setup"
                className="inline-flex items-center gap-1.5 bg-[#003B2B] hover:bg-[#002b1f] text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">account_balance</span>
                <span>Cài Đặt Ngân Hàng</span>
              </Link>
            ) : (
              <Link
                href="/seller/dashboard"
                className="inline-flex items-center gap-1.5 bg-[#003B2B] hover:bg-[#002b1f] text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">dashboard</span>
                <span>Kênh Quản Trị</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content" tabIndex={-1} className="flex-1 min-w-0">
        {children}
      </main>

      {/* B2B Footer - Minimal Clean Hairline */}
      <footer className="bg-white border-t border-slate-200/80 py-6 px-4 sm:px-6 lg:px-8 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
            <span className="font-editorial text-sm font-bold text-[#003B2B]">HUKI PARTNER ECOSYSTEM</span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span className="text-[11px]">Cổng xuất bản số và phân phối sách bản quyền quốc tế</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-medium text-slate-600">
            <Link href="/seller/register" className="hover:text-[#003B2B] transition-colors">Quy chế hoạt động</Link>
            <Link href="/seller/register" className="hover:text-[#003B2B] transition-colors">Bảo vệ bản quyền DRM</Link>
            <a href="mailto:partner@hukiebook.vn" className="hover:text-[#003B2B] transition-colors">partner@hukiebook.vn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
