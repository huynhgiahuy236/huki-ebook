"use client";

import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import AppLayout from './AppLayout';

interface AppRouteShellProps {
  children: ReactNode;
}

export default function AppRouteShell({ children }: AppRouteShellProps) {
  const pathname = usePathname() || '';

  // Non-store routes that have their own specialized standalone layout
  const isAuthRoute = pathname.startsWith('/auth');
  const isSellerRoute = pathname.startsWith('/seller');
  const isAdminRoute = pathname.startsWith('/admin');
  const isReaderRoute = pathname.startsWith('/reader') || pathname.startsWith('/read');
  const isInvoiceRoute = pathname.includes('/invoice');
  const isMessagesRoute = pathname.startsWith('/account/messages') || pathname.startsWith('/messages');

  if (isAuthRoute || isSellerRoute || isAdminRoute || isReaderRoute || isInvoiceRoute || isMessagesRoute) {
    return <>{children}</>;
  }

  // Wrap all Store & Community & Account pages in AppLayout (StoreHeader + HierarchicalSidebar + StoreFooter)
  return <AppLayout>{children}</AppLayout>;
}
