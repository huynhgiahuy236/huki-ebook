"use client";

import React, { useState, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import StoreHeader from './StoreHeader';
import HierarchicalSidebar from './HierarchicalSidebar';
import StoreFooter from './StoreFooter';
import { useCart } from '@/ui/context/CartContext';

export interface LayoutContextType {
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
}

export const LayoutContext = createContext<LayoutContextType>({
  isSidebarCollapsed: true,
  setIsSidebarCollapsed: () => {},
  isMobileOpen: false,
  setIsMobileOpen: () => {},
  toggleSidebar: () => {},
});

export const useLayout = () => useContext(LayoutContext);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const { totalItemsCount } = useCart();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen((prev) => !prev);
  };

  return (
    <LayoutContext.Provider
      value={{
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        isMobileOpen,
        setIsMobileOpen,
        toggleSidebar,
      }}
    >
      <div className="storefront-portal bg-background text-on-surface flex flex-col antialiased selection:bg-tertiary-fixed selection:text-on-tertiary-fixed font-sans min-h-screen pb-14 lg:pb-0">
        {/* Unified E-Commerce Header */}
        <StoreHeader
          onToggleSidebar={toggleSidebar}
          onToggleMobileSidebar={toggleMobileSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <div className="flex-1 flex flex-row relative min-h-[calc(100vh-84px)]">
          {/* Hierarchical Multi-Level Sidebar */}
          <HierarchicalSidebar
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
            isMobileOpen={isMobileOpen}
            setIsMobileOpen={setIsMobileOpen}
          />

          {/* Main Page Content Wrapper with Dynamic Left Margin matching Sidebar */}
          <div
            className={`
              flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out
              ${isSidebarCollapsed ? 'lg:ml-[68px]' : 'lg:ml-[280px]'}
              ml-0
            `}
          >
            <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 outline-none">
              {children}
            </main>

            {/* Unified E-Commerce Footer */}
            <StoreFooter />
          </div>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--theme-surface,#ffffff)] border-t border-[var(--theme-border,#e8e5df)] flex items-center justify-around h-14 px-2 lg:hidden shadow-lg">
          <Link
            href="/"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              pathname === '/' ? 'text-[#003b2b]' : 'text-[#6b7280]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">home</span>
            <span>Trang chủ</span>
          </Link>
          <Link
            href="/books"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              pathname.startsWith('/books') ? 'text-[#003b2b]' : 'text-[#6b7280]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">menu_book</span>
            <span>Khám phá</span>
          </Link>
          <Link
            href="/library"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              pathname.startsWith('/library') ? 'text-[#003b2b]' : 'text-[#6b7280]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">auto_stories</span>
            <span>Tủ sách</span>
          </Link>
          <Link
            href="/cart"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold relative ${
              pathname.startsWith('/cart') ? 'text-[#003b2b]' : 'text-[#6b7280]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
            {totalItemsCount > 0 && (
              <span className="absolute -top-1 right-1 bg-[#ac2c19] text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {totalItemsCount}
              </span>
            )}
            <span>Giỏ hàng</span>
          </Link>
          <Link
            href="/profile"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              pathname.startsWith('/profile') ? 'text-[#003b2b]' : 'text-[#6b7280]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">account_circle</span>
            <span>Tài khoản</span>
          </Link>
        </nav>
      </div>
    </LayoutContext.Provider>
  );
}
