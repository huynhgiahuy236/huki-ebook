"use client";

import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import SellerLayout from '@/ui/components/layout/SellerLayout';
import SellerPortalLayout from '@/ui/components/layout/SellerPortalLayout';

function SellerRouteLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isPortalRoute = pathname === '/seller' || pathname.startsWith('/seller/register') || pathname.startsWith('/seller/edge-cases');

  if (isPortalRoute) {
    return <SellerPortalLayout>{children}</SellerPortalLayout>;
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
