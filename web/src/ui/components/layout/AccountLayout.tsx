'use client';

import React, { ReactNode, useMemo } from 'react';
import { useAffiliateGuard } from '@/lib/affiliate/useAffiliateGuard';
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

  const { step: affiliateStep } = useAffiliateGuard();

  const isSeller = Boolean(
    user?.role === 'BUSINESS' ||
    user?.hasApprovedBusiness ||
    user?.business ||
    (Array.isArray(user?.memberships) && user.memberships.length > 0)
  );
  const chatUrl = isSeller ? '/seller/chat' : '/account/messages';

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
          label: isSeller ? 'Chat Kênh Người Bán' : 'Tin Nhắn & Chat',
          href: chatUrl,
          icon: 'chat',
          active: false,
          targetBlank: true,
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
        {
          label: 'Đánh Giá Của Tôi',
          href: '/profile/reviews',
          icon: 'rate_review',
          active: pathname === '/profile/reviews',
        },
      ],
    },
    {
      title: 'TIẾP THỊ LIÊN KẾT (AFFILIATE)',
      items: affiliateStep === 'ACTIVE' || affiliateStep === 'BANK_SETUP'
        ? [
            {
              label: 'Bảng Điều Khiển CTV',
              href: '/account/affiliate/dashboard',
              icon: 'dashboard',
              active: pathname === '/account/affiliate/dashboard',
            },
            {
              label: 'Quản Lý Liên Kết',
              href: '/account/affiliate/links',
              icon: 'link',
              active: pathname === '/account/affiliate/links',
            },
            {
              label: 'Sàn Sách Tiếp Thị',
              href: '/account/affiliate/marketplace',
              icon: 'storefront',
              active: pathname === '/account/affiliate/marketplace',
            },
            {
              label: 'Tiến Độ & Ngân Hàng',
              href: '/account/affiliate/application',
              icon: 'account_balance',
              active: pathname === '/account/affiliate/application',
              badge: affiliateStep === 'BANK_SETUP' ? 'Cần LK Ngân Hàng' : 'Đã duyệt',
            },
          ]
        : affiliateStep === 'PENDING' || affiliateStep === 'CHANGES_REQUESTED' || affiliateStep === 'REJECTED'
        ? [
            {
              label: 'Giới Thiệu Chương Trình',
              href: '/affiliate',
              icon: 'campaign',
              active: pathname === '/affiliate',
            },
            {
              label: affiliateStep === 'PENDING' ? 'Tiến Độ Hồ Sơ (Đang duyệt)' : 'Tiến Độ Hồ Sơ (Cần cập nhật)',
              href: '/account/affiliate/application',
              icon: 'assignment',
              active: pathname === '/account/affiliate/application',
              badge: affiliateStep === 'PENDING' ? 'Đang duyệt' : 'Cần sửa',
            },
          ]
        : [
            {
              label: 'Giới Thiệu Chương Trình',
              href: '/affiliate',
              icon: 'campaign',
              active: pathname === '/affiliate',
            },
            {
              label: 'Đăng Ký Tham Gia CTV',
              href: '/account/affiliate/register',
              icon: 'how_to_reg',
              active: pathname === '/account/affiliate/register',
              badge: 'Mới',
            },
          ],
    },
  ];

  return (
    <div className="w-full min-h-[calc(100vh-140px)] bg-[#f4f7f6] py-5 font-sans">
      <div className="w-full max-w-[1600px] mx-auto px-3.5 sm:px-5 lg:px-6">
        
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-4">
          <Link href="/" className="hover:text-[#003B2B] font-medium transition-colors">
            Trang Chủ
          </Link>
          <span>/</span>
          <span className="text-gray-800 font-semibold">Trung Tâm Tài Khoản</span>
        </nav>

        {/* 2-Column Responsive Layout */}
        <div className="flex flex-col md:flex-row gap-5 items-start w-full min-w-0">
          
          {/* ================= LEFT ACCOUNT SIDEBAR ================= */}
          <aside className="w-full md:w-72 lg:w-80 shrink-0 bg-white rounded-2xl border border-gray-200/80 shadow-xs p-4 sm:p-5 space-y-5">
            
            {/* User Profile Header */}
            <div className="flex items-center gap-3 pb-3.5 border-b border-gray-100">
              <UserAvatar user={user} size="md" className="w-10 h-10" />
              <div className="min-w-0 flex-1">
                <span className="font-bold text-sm text-gray-900 truncate block leading-snug">
                  {displayName}
                </span>
                <span className="inline-block px-2 py-0.5 mt-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold text-[10px] border border-emerald-200">
                  {roleLabel}
                </span>
              </div>
            </div>

            {/* Navigation Groups */}
            <div className="space-y-4 text-xs">
              {navGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1.5">
                  <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase block px-2.5">
                    {group.title}
                  </span>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        target={(item as any).targetBlank ? '_blank' : undefined}
                        rel={(item as any).targetBlank ? 'noopener noreferrer' : undefined}
                        className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-medium transition-all ${
                          item.active
                            ? 'bg-[#003B2B] text-white shadow-2xs font-semibold'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-[#003B2B]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`material-symbols-outlined text-[18px] ${item.active ? 'text-white' : 'text-gray-400'}`}>
                            {item.icon}
                          </span>
                          <span className="font-medium whitespace-nowrap">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {(item as any).badge && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                              item.active
                                ? 'bg-emerald-600 text-white'
                                : (item as any).badge.includes('Cần')
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {(item as any).badge}
                            </span>
                          )}
                          {(item as any).targetBlank && (
                            <span className="material-symbols-outlined text-[13px] text-gray-400">open_in_new</span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* ================= RIGHT MAIN CONTENT PANEL ================= */}
          <main className="w-full flex-1 min-w-0 bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
