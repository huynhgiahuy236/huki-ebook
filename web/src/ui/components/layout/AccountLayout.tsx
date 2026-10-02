'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/ui/context/AuthContext';
import UserAvatar from '@/ui/components/common/UserAvatar';

interface AccountLayoutProps {
  children: ReactNode;
}

export default function AccountLayout({ children }: AccountLayoutProps) {
  const pathname = usePathname() || '';
  const { user } = useAuth();

  const displayName =
    user?.fullName ||
    user?.name ||
    (user as any)?.username ||
    (user?.email ? user.email.split('@')[0] : 'Độc Giả HUKI');

  const displayEmail = user?.email || 'Chưa đăng nhập';

  const roleLabel =
    user?.role === 'PLATFORM_ADMIN'
      ? 'Quản Trị Viên'
      : user?.role === 'BUSINESS'
      ? 'Chủ Doanh Nghiệp'
      : 'Độc Giả Cá Nhân';

  const navGroups = [
    {
      title: 'TÀI KHOẢN',
      items: [
        {
          label: 'Hồ Sơ Cá Nhân',
          href: '/profile',
          icon: 'person',
          active: pathname === '/profile',
        },
        {
          label: 'Sổ Địa Chỉ Nhận Hàng',
          href: '/profile/addresses',
          icon: 'location_on',
          active: pathname === '/profile/addresses',
        },
        {
          label: 'Bảo Mật & Mật Khẩu',
          href: '/profile/security',
          icon: 'lock',
          active: pathname === '/profile/security',
        },
      ],
    },
    {
      title: 'MUA SẮM & TỦ SÁCH',
      items: [
        {
          label: 'Đơn Hàng Của Tôi',
          href: '/orders',
          icon: 'receipt_long',
          active: pathname === '/orders' || pathname.startsWith('/orders/'),
        },
        {
          label: 'Tủ Sách Ebook',
          href: '/library',
          icon: 'auto_stories',
          active: pathname === '/library' || pathname.startsWith('/library/'),
        },
        {
          label: 'Ví Voucher / Mã Giảm Giá',
          href: '/vouchers?tab=wallet',
          icon: 'confirmation_number',
          active: pathname === '/vouchers',
        },
        {
          label: 'Ví HUKI & Xu Tích Lũy',
          href: '/profile/wallet',
          icon: 'account_balance_wallet',
          active: pathname === '/profile/wallet',
        },
      ],
    },
  ];

  return (
    <div className="w-full min-h-[calc(100vh-140px)] bg-[#f4f7f6] py-5 font-sans">
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-4">
          <Link href="/" className="hover:text-[#003B2B] font-medium transition-colors">
            Trang Chủ
          </Link>
          <span>/</span>
          <span className="text-gray-800 font-semibold">Trung Tâm Tài Khoản</span>
        </nav>

        {/* 2-Column Responsive Layout */}
        <div className="flex flex-col md:flex-row gap-5 items-start">
          
          {/* ================= LEFT ACCOUNT SIDEBAR ================= */}
          <aside className="w-full md:w-56 shrink-0 bg-white rounded-xl border border-gray-200/80 shadow-2xs p-3.5 space-y-4">
            
            {/* User Profile Header */}
            <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
              <UserAvatar user={user} size="md" className="w-9 h-9" />
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs text-gray-900 truncate block leading-snug">
                  {displayName}
                </span>
                <span className="inline-block px-1.5 py-0.2 mt-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold text-[9.5px] border border-emerald-200">
                  {roleLabel}
                </span>
              </div>
            </div>

            {/* Navigation Groups */}
            <div className="space-y-4 text-xs">
              {navGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1">
                  <span className="text-[9.5px] font-bold tracking-wider text-gray-400 uppercase block px-2">
                    {group.title}
                  </span>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          item.active
                            ? 'bg-[#003B2B] text-white shadow-2xs font-semibold'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-[#003B2B]'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-[16px] ${item.active ? 'text-white' : 'text-gray-400'}`}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* ================= RIGHT MAIN CONTENT PANEL ================= */}
          <main className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
