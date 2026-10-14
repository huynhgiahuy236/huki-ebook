"use client";

import React, { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/ui/context/AuthContext';
import { maintenanceService } from '@/ui/services/maintenanceService';
import AppLayout from './AppLayout';

interface AppRouteShellProps {
  children: ReactNode;
}

export default function AppRouteShell({ children }: AppRouteShellProps) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { user, isLoggedIn, isLoading } = useAuth();
  const [maintenanceState, setMaintenanceState] = useState(() => ({
    isActive: maintenanceService.isMaintenanceActive(),
    isDrain: maintenanceService.isUnderGracefulDrain(),
    drainSec: maintenanceService.getRemainingDrainSeconds(),
  }));

  // Synchronize maintenance state
  useEffect(() => {
    const handleUpdate = () => {
      setMaintenanceState({
        isActive: maintenanceService.isMaintenanceActive(),
        isDrain: maintenanceService.isUnderGracefulDrain(),
        drainSec: maintenanceService.getRemainingDrainSeconds(),
      });
    };

    window.addEventListener('huki_system_maintenance_changed', handleUpdate);
    const interval = setInterval(handleUpdate, 1000);

    return () => {
      window.removeEventListener('huki_system_maintenance_changed', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const isShipperUser = Boolean(
    user?.role === 'DELIVERY_STAFF' ||
    user?.role === 'SHIPPER' ||
    (user as any)?.role === 'DELIVERY_STAFF' ||
    (user as any)?.role === 'SHIPPER'
  );

  const isAdminUser = Boolean(
    user?.role === 'PLATFORM_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    (user as any)?.role === 'PLATFORM_ADMIN' ||
    (user as any)?.role === 'ADMIN' ||
    (user as any)?.role === 'SUPER_ADMIN' ||
    (user as any)?.role === 'ADMIN_CON' ||
    user?.email === 'adminhuki@gmail.com'
  );

  const hasAdminBypass = isAdminUser || maintenanceService.hasBypassPermission();

  // Route classifications
  const isMaintenanceRoute = pathname.startsWith('/maintenance');
  const isAdminRoute = pathname.startsWith('/admin');
  const isForbiddenPortalForAdmin = pathname.startsWith('/seller') || pathname.startsWith('/shipper');

  // Hook 6: Maintenance redirect effect
  useEffect(() => {
    if (maintenanceState.isActive) {
      if (isAdminRoute && hasAdminBypass) {
        return;
      }
      if (!isMaintenanceRoute) {
        router.replace('/maintenance');
      }
    }
  }, [maintenanceState.isActive, isAdminRoute, hasAdminBypass, isMaintenanceRoute, router]);

  // Hook 7: Super Admin portal guard effect
  useEffect(() => {
    if (!isLoading && isLoggedIn && isAdminUser && isForbiddenPortalForAdmin) {
      router.replace('/admin');
    }
  }, [isLoading, isLoggedIn, isAdminUser, isForbiddenPortalForAdmin, router]);

  // Hook 8: Shipper portal guard effect
  useEffect(() => {
    if (!isLoading && isLoggedIn && isShipperUser && !pathname.startsWith('/shipper')) {
      router.replace('/shipper');
    }
  }, [isLoading, isLoggedIn, isShipperUser, pathname, router]);

  // --- ALL HOOKS ABOVE. CONDITIONAL RETURNS BELOW ---

  // 1. Full Maintenance Active screen
  if (maintenanceState.isActive && !isMaintenanceRoute) {
    if (!(isAdminRoute && hasAdminBypass)) {
      return (
        <div className="min-h-screen w-full bg-[#031510] text-emerald-100 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="w-16 h-16 rounded-2xl bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-center mb-4 shadow-xl">
            <span className="material-symbols-outlined text-[36px] text-emerald-400 animate-spin">settings</span>
          </div>
          <h2 className="text-base font-bold text-white mb-1">Hệ Thống Đang Kích Hoạt Chế Độ Bảo Trì</h2>
          <p className="text-xs text-emerald-300/70 max-w-sm mb-5">
            Đang chuyển hướng bạn an toàn sang trang thông báo bảo trì kỹ thuật...
          </p>
        </div>
      );
    }
  }

  // 2. Standalone Maintenance Page
  if (isMaintenanceRoute) {
    return <>{children}</>;
  }

  // 3. Super Admin redirected away from /seller or /shipper
  if (!isLoading && isLoggedIn && isAdminUser && isForbiddenPortalForAdmin) {
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
          Tài khoản Quản trị viên sàn chỉ điều hành qua Bảng Quản Trị (/admin) hoặc trải nghiệm Store (/), không truy cập cổng đối tác riêng lẻ. Đang chuyển hướng bạn về Bảng Quản Trị Admin...
        </p>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold text-emerald-200 border border-white/10">
          <span className="w-4 h-4 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
          <span>Đang chuyển về Cổng Admin...</span>
        </div>
      </div>
    );
  }

  // 4. Shipper redirected to /shipper
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
  const isShipperRoute = pathname.startsWith('/shipper');
  const isReaderRoute =
    pathname.startsWith('/reader') ||
    pathname.startsWith('/read') ||
    /^\/library\/[^/]+/.test(pathname);
  const isInvoiceRoute = pathname.includes('/invoice');
  const isMessagesRoute = pathname.startsWith('/account/messages') || pathname.startsWith('/messages');
  const isOnboardingRoute = pathname.startsWith('/onboarding') || pathname.startsWith('/welcome');

  const drainBanner = maintenanceState.isDrain && !isAdminRoute && (
    <div className="bg-amber-500 text-slate-950 font-sans px-4 py-2.5 flex items-center justify-between text-xs font-bold sticky top-0 z-[9999] shadow-lg border-b border-amber-600 animate-pulse">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-base">timer</span>
        <span>
          CẢNH BÁO BẢO TRÌ HỆ THỐNG: Sàn HuKi sẽ tạm dừng sau {Math.floor(maintenanceState.drainSec / 60)} phút {maintenanceState.drainSec % 60} giây để nâng cấp máy chủ. Quý khách vui lòng hoàn tất giao dịch!
        </span>
      </div>
      <span className="shrink-0 text-[11px] bg-slate-950 text-amber-300 font-mono px-2.5 py-0.5 rounded-full uppercase tracking-wider font-black">
        {Math.floor(maintenanceState.drainSec / 60)}:{String(maintenanceState.drainSec % 60).padStart(2, '0')}
      </span>
    </div>
  );

  if (isAuthRoute || isSellerRoute || isAdminRoute || isShipperRoute || isReaderRoute || isInvoiceRoute || isMessagesRoute || isOnboardingRoute) {
    return (
      <>
        {drainBanner}
        {children}
      </>
    );
  }

  // Wrap all Store & Community & Account pages in AppLayout (StoreHeader + HierarchicalSidebar + StoreFooter)
  return (
    <>
      {drainBanner}
      <AppLayout>{children}</AppLayout>
    </>
  );
}
