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

  useEffect(() => {
    if (isLoading) return;

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
    if (!user?.business && user?.role !== 'PLATFORM_ADMIN') {
      if (!pathname.startsWith('/seller/register') && pathname !== '/seller') {
        router.replace('/seller/register');
        return;
      }
    }
  }, [isLoading, isLoggedIn, user, pathname, router]);

  if (isPortalRoute) {
    return <SellerPortalLayout>{children}</SellerPortalLayout>;
  }

  // Standalone Full-Page Chat Workspace (mở ở browser mới / tab riêng như Shopee Web Chat)
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
