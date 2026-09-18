'use client';

import React, { ReactNode } from 'react';
import { ThemeProvider } from '@/ui/context/ThemeContext';
import { ToastProvider } from '@/ui/context/ToastContext';
import { AuthProvider } from '@/ui/context/AuthContext';
import { CartProvider } from '@/ui/context/CartContext';
import { ReaderProvider } from '@/ui/context/ReaderContext';
import Toast from '@/ui/components/common/Toast';
import AppRouteShell from '@/ui/components/layout/AppRouteShell';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <ReaderProvider>
              <AppRouteShell>{children}</AppRouteShell>
              <Toast />
            </ReaderProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
