"use client";

import React, { Suspense, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import SellerLayout from '@/ui/components/layout/SellerLayout';
import SellerPortalLayout from '@/ui/components/layout/SellerPortalLayout';
import { useAuth } from '@/ui/context/AuthContext';

function SellerRouteLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { user, isLoggedIn, isLoading } = useAuth();

  const isPortalRoute =
    pathname === '/seller' ||
    pathname.startsWith('/seller/register') ||
    pathname.startsWith('/seller/pending') ||
    pathname.startsWith('/seller/stores/setup');

  const isPlatformAdmin = Boolean(
    user?.role === 'PLATFORM_ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    (user as any)?.role === 'ADMIN_CON' ||
    user?.email === 'adminhuki@gmail.com'
  );

  useEffect(() => {
    if (isLoading) return;

    // 0. Super Admin / Platform Admin tuyệt đối không truy cập Kênh Người Bán -> Về /admin
    if (isLoggedIn && isPlatformAdmin) {
      router.replace('/admin');
      return;
    }

    // 1. Nếu chưa đăng nhập: Ngoại trừ trang /seller giới thiệu, các trang khác cần đăng nhập
    if (!isLoggedIn) {
      if (pathname !== '/seller') {
        router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    const bizStatus = user?.business?.status;
    const isApprovedSeller = user?.role === 'BUSINESS' || Boolean(user?.hasApprovedBusiness);

    // 2. Seller chính thức: Không được vào register hoặc pending -> về dashboard
    if (isApprovedSeller) {
      if (pathname.startsWith('/seller/register') || pathname.startsWith('/seller/pending')) {
        router.replace('/seller/dashboard');
        return;
      }
    }

    // 3. User đang chờ duyệt: Chỉ được ở /seller/pending (hoặc /seller giới thiệu)
    if (bizStatus === 'PENDING_APPROVAL') {
      if (!pathname.startsWith('/seller/pending') && pathname !== '/seller') {
        router.replace('/seller/pending');
        return;
      }
    }

    // 4. User chưa đăng ký kinh doanh: Cố vào dashboard / pending / setup -> sang register
    if (!isApprovedSeller && !user?.business && user?.role !== 'PLATFORM_ADMIN') {
      if (!pathname.startsWith('/seller/register') && pathname !== '/seller') {
        router.replace('/seller/register');
        return;
      }
    }
  }, [isLoading, isLoggedIn, user, pathname, router, isPlatformAdmin]);

  if (!isLoading && isLoggedIn && isPlatformAdmin) {
    return (
      <div className="min-h-screen w-full bg-[#003B2B] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-4 shadow-xl">
          <span className="material-symbols-outlined text-[36px] text-amber-300 animate-pulse">admin_panel_settings</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-editorial text-xl font-black tracking-tight text-white">HUKI EBOOK</span>
          <span className="bg-amber-400 text-zinc-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider font-sans">
            SUPER ADMIN
          </span>
        </div>
        <h2 className="text-base font-bold text-white mb-1">Cổng Quản Trị Hệ Thống Tối Cao</h2>
        <p className="text-xs text-white/70 max-w-sm mb-5">
          Tài khoản Quản trị viên sàn chỉ điều hành qua Bảng Quản Trị (/admin) hoặc trải nghiệm Store (/), không truy cập cổng đối tác người bán. Đang chuyển hướng bạn về Bảng Quản Trị Admin...
        </p>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold text-emerald-200 border border-white/10">
          <span className="w-4 h-4 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
          <span>Đang chuyển về Cổng Admin...</span>
        </div>
      </div>
    );
  }

  if (isPortalRoute) {
    return <SellerPortalLayout>{children}</SellerPortalLayout>;
  }

  // Standalone Full-Page Chat Workspace (Trang chat toàn màn hình riêng biệt)
  if (pathname === '/seller/chat' || pathname.startsWith('/seller/chat/')) {
    return <>{children}</>;
  }

  return <SellerLayout>{children}</SellerLayout>;
}


export default function SellerRouteLayout(props: any) {
  return (
    <Suspense fallback={null}>
      <SellerRouteLayoutContent {...props} />
    </Suspense>
  );
}
