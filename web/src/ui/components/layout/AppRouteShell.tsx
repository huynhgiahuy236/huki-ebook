"use client";

import React, { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/ui/context/AuthContext';
import AppLayout from './AppLayout';

interface AppRouteShellProps {
  children: ReactNode;
}

export default function AppRouteShell({ children }: AppRouteShellProps) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { user, isLoggedIn, isLoading } = useAuth();

  const isShipperUser = Boolean(
    user?.role === 'DELIVERY_STAFF' ||
    user?.role === 'SHIPPER' ||
    (user as any)?.role === 'DELIVERY_STAFF' ||
    (user as any)?.role === 'SHIPPER'
  );

  // Shipper is a dedicated 3PL logistics partner: CANNOT access store, cart, buyer account, seller or admin.
  // Must strictly stay inside /shipper portal at all times.
  useEffect(() => {
    if (!isLoading && isLoggedIn && isShipperUser && !pathname.startsWith('/shipper')) {
      router.replace('/shipper');
    }
  }, [isLoading, isLoggedIn, isShipperUser, pathname, router]);

  // If a logged-in shipper lands on any non-shipper route, show dedicated redirect screen and prevent store leak
  if (!isLoading && isLoggedIn && isShipperUser && !pathname.startsWith('/shipper')) {
    return (
      <div className="min-h-screen w-full bg-[#003B2B] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-4 shadow-xl">
          <span className="material-symbols-outlined text-[36px] text-emerald-300 animate-pulse">local_shipping</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-editorial text-xl font-black tracking-tight text-white">HUKI EBOOK</span>
          <span className="bg-amber-400 text-zinc-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider font-sans">
            EXPRESS 3PL
          </span>
        </div>
        <h2 className="text-base font-bold text-white mb-1">Cổng Quản Trị Vận Hành Bưu Tá</h2>
        <p className="text-xs text-white/70 max-w-sm mb-5">
          Tài khoản bưu tá không sử dụng giao diện cửa hàng. Đang chuyển hướng bạn trực tiếp vào Bảng Điều Hành HuKi Express...
        </p>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold text-emerald-200 border border-white/10">
          <span className="w-4 h-4 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
          <span>Đang vào ca vận hành...</span>
        </div>
      </div>
    );
  }

  // Non-store routes that have their own specialized standalone layout
  const isAuthRoute = pathname.startsWith('/auth');
  const isSellerRoute = pathname.startsWith('/seller');
  const isAdminRoute = pathname.startsWith('/admin');
  const isShipperRoute = pathname.startsWith('/shipper');
  const isReaderRoute =
    pathname.startsWith('/reader') ||
    pathname.startsWith('/read') ||
    /^\/library\/[^/]+/.test(pathname);
  const isInvoiceRoute = pathname.includes('/invoice');
  const isMessagesRoute = pathname.startsWith('/account/messages') || pathname.startsWith('/messages');
  const isOnboardingRoute = pathname.startsWith('/onboarding') || pathname.startsWith('/welcome');

  if (isAuthRoute || isSellerRoute || isAdminRoute || isShipperRoute || isReaderRoute || isInvoiceRoute || isMessagesRoute || isOnboardingRoute) {
    return <>{children}</>;
  }

  // Wrap all Store & Community & Account pages in AppLayout (StoreHeader + HierarchicalSidebar + StoreFooter)
  return <AppLayout>{children}</AppLayout>;
}
