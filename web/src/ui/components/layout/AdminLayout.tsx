"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/ui/context/AuthContext';
import UserAvatar from '@/ui/components/common/UserAvatar';
import { adminApi } from '@/ui/api/adminApi';
import { businessApi } from '@/ui/api/businessApi';

export interface AdminLayoutProps {
  children?: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Số lượng thực tế lấy từ Gateway Backend
  const [stats, setStats] = useState({
    pendingBusinesses: 0,
    pendingUpdates: 0,
    approvedBusinesses: 0,
    totalBusinesses: 0,
    pendingStores: 0,
    approvedStores: 0,
    totalStores: 0,
    totalBooks: 0,
    activeBooks: 0,
    suspendedBooks: 0,
    healthStatus: 'ok',
  });

  const fetchNavStats = useCallback(async () => {
    try {
      const [res, reqRes] = await Promise.all([
        adminApi.getAdminStats().catch(() => null),
        businessApi.getAllUpdateRequests({ limit: 100 }).catch(() => null),
      ]);

      let readMap: Record<string, boolean> = {};
      try {
        readMap = JSON.parse(localStorage.getItem('huki_admin_read_update_requests') || '{}');
      } catch {
        // ignore
      }
      let pendingUpdatesCount = 0;
      if (reqRes && reqRes.success && reqRes.data) {
        const list = Array.isArray(reqRes.data) ? reqRes.data : (reqRes.data as any).data || [];
        pendingUpdatesCount = list.filter((r: any) => r.status === 'PENDING' && !readMap[r.id]).length;
      }

      if (res && res.success && res.data) {
        setStats({
          ...(res.data as any),
          pendingUpdates: pendingUpdatesCount,
        });
      } else {
        setStats((prev) => ({
          ...prev,
          pendingUpdates: pendingUpdatesCount,
        }));
      }
    } catch (err) {
      console.warn('Failed to load admin stats in layout', err);
    }
  }, []);

  useEffect(() => {
    fetchNavStats();
  }, [fetchNavStats, pathname]);

  // Lắng nghe sự kiện đồng bộ chấm đỏ Admin khi xem / duyệt / từ chối yêu cầu
  useEffect(() => {
    const handleAdminSync = () => {
      fetchNavStats();
    };
    window.addEventListener('huki_admin_noti_updated', handleAdminSync);
    window.addEventListener('storage', handleAdminSync);
    return () => {
      window.removeEventListener('huki_admin_noti_updated', handleAdminSync);
      window.removeEventListener('storage', handleAdminSync);
    };
  }, [fetchNavStats]);

  const adminName = user?.fullName || user?.name || 'HUKI Super Admin';

  const routeMap: Record<string, { parent: string; title: string }> = {
    '/admin': { parent: 'Tổng Quan Hệ Thống', title: 'Bảng Điều Hành Sàn' },
    '/admin/dashboard': { parent: 'Tổng Quan Hệ Thống', title: 'Bảng Điều Hành Sàn' },
    '/admin/businesses': { parent: 'Xét Duyệt Đối Tác', title: 'Quản Lý & Duyệt Doanh Nghiệp' },
    '/admin/business-requests': { parent: 'Xét Duyệt Đối Tác', title: 'Yêu Cầu Chỉnh Sửa Doanh Nghiệp' },
    '/admin/business-update-requests': { parent: 'Xét Duyệt Đối Tác', title: 'Yêu Cầu Chỉnh Sửa Doanh Nghiệp' },
    '/admin/businesses/update-requests': { parent: 'Xét Duyệt Đối Tác', title: 'Yêu Cầu Chỉnh Sửa Doanh Nghiệp' },
    '/admin/update-requests': { parent: 'Xét Duyệt Đối Tác', title: 'Yêu Cầu Chỉnh Sửa Doanh Nghiệp' },
    '/admin/leads': { parent: 'Xét Duyệt Đối Tác', title: 'Quản Lý & Duyệt Doanh Nghiệp' },
    '/admin/publisher-leads': { parent: 'Xét Duyệt Đối Tác', title: 'Khách Hàng Tiềm Năng NXB' },
    '/admin/publishers': { parent: 'Xét Duyệt Đối Tác', title: 'Nhà Xuất Bản' },
    '/admin/companies': { parent: 'Xét Duyệt Đối Tác', title: 'Quản Lý & Duyệt Doanh Nghiệp' },
    '/admin/stores': { parent: 'Xét Duyệt Đối Tác', title: 'Quản Lý & Duyệt Cửa Hàng' },
    '/admin/books': { parent: 'Quản Trị Catalog', title: 'Quản Lý Sách Toàn Sàn' },
    '/admin/book-moderation': { parent: 'Quản Trị Catalog', title: 'Kiểm Duyệt Sách' },
    '/admin/categories': { parent: 'Quản Trị Catalog', title: 'Danh Mục & Tác Giả' },
    '/admin/health': { parent: 'Hạ Tầng Kỹ Thuật', title: 'Sức Khỏe Hệ Thống Microservices' },
    '/admin/system/health': { parent: 'Hạ Tầng Kỹ Thuật', title: 'Sức Khỏe Hệ Thống Microservices' },
    '/admin/users': { parent: 'Độc Giả & Hội Viên', title: 'Danh Sách Bạn Đọc' },
    '/admin/accounts': { parent: 'Quản Trị Người Dùng', title: 'Quản Lý Người Dùng Toàn Sàn' },
    '/admin/users-management': { parent: 'Quản Trị Người Dùng', title: 'Quản Lý Người Dùng Toàn Sàn' },
    '/admin/finance': { parent: 'Tài Chính & Kế Toán', title: 'Báo Cáo & Đối Soát Doanh Thu' },
    '/admin/escrow': { parent: 'Tài Chính & Vận Hành', title: 'Tài Khoản Trung Gian & Quản Lý Dòng Tiền' },
    '/admin/return-requests': { parent: 'Tài Chính & Vận Hành', title: 'Quản Lý Yêu Cầu Đổi Trả' },
    '/admin/disputes': { parent: 'Tài Chính & Vận Hành', title: 'Trọng Tài Khiếu Nại & Tranh Chấp' },
    '/admin/marketing': { parent: 'Tiếp Thị & Khuyến Mãi', title: 'Chiến Dịch & Voucher' },
    '/admin/drm-vault': { parent: 'Hạ Tầng Kỹ Thuật', title: 'Kho Khóa Bảo Mật DRM' },
    '/admin/reports': { parent: 'Báo Cáo & Phân Tích', title: 'Phân Tích Dữ Liệu' },
    '/admin/calendar': { parent: 'Vận Hành & Sự Kiện', title: 'Lịch Làm Việc & Sự Kiện' },
    '/admin/integrations': { parent: 'Hạ Tầng Kỹ Thuật', title: 'Tích Hợp Bên Thứ Ba' },
    '/admin/support': { parent: 'Hỗ Trợ Khách Hàng', title: 'Yêu Cầu Hỗ Trợ' },
    '/admin/settings': { parent: 'Hạ Tầng Kỹ Thuật', title: 'Cài Đặt Hệ Thống' },
  };

  const currentRouteInfo = routeMap[pathname] || { parent: 'Ban Quản Trị', title: 'Quản Trị Nền Tảng' };

  interface AdminMenuItem {
    label: string;
    to: string;
    icon: string;
    count?: string;
    badgeColor?: string;
    isDeferred?: boolean;
  }

  interface AdminMenuSection {
    group: string;
    items: AdminMenuItem[];
  }

  const menuSections: AdminMenuSection[] = [
    {
      group: 'TỔNG QUAN HỆ THỐNG',
      items: [
        { label: 'Bảng Điều Hành', to: '/admin/dashboard', icon: 'dashboard' },
        { label: 'Quản Lý Người Dùng', to: '/admin/accounts', icon: 'manage_accounts' },
      ],
    },
    {
      group: 'XÉT DUYỆT ĐỐI TÁC',
      items: [
        {
          label: 'Duyệt Doanh Nghiệp',
          to: '/admin/businesses',
          icon: 'domain',
          count: stats.pendingBusinesses > 0 ? String(stats.pendingBusinesses) : undefined,
          badgeColor: 'bg-amber-500 text-white font-bold',
        },
        {
          label: 'Yêu Cầu Chỉnh Sửa',
          to: '/admin/business-requests',
          icon: 'edit_note',
          count: stats.pendingUpdates > 0 ? String(stats.pendingUpdates) : undefined,
          badgeColor: 'bg-rose-500 text-white font-bold animate-pulse',
        },
        {
          label: 'Cửa Hàng Gian Hàng',
          to: '/admin/stores',
          icon: 'storefront',
          count: stats.pendingStores > 0 ? String(stats.pendingStores) : undefined,
          badgeColor: 'bg-amber-500 text-white font-bold',
        },
      ],
    },
    {
      group: 'QUẢN TRỊ CATALOG',
      items: [
        {
          label: 'Sách Toàn Sàn',
          to: '/admin/books',
          icon: 'menu_book',
          count: stats.totalBooks > 0 ? String(stats.totalBooks) : undefined,
          badgeColor: 'bg-slate-200 text-slate-700 font-semibold',
        },
        {
          label: 'Kiểm Duyệt Sách',
          to: '/admin/book-moderation',
          icon: 'fact_check',
        },
        {
          label: 'Danh Mục & Tác Giả',
          to: '/admin/categories',
          icon: 'category',
        },
        {
          label: 'Kho Khóa DRM Vault',
          to: '/admin/drm-vault',
          icon: 'lock',
        },
      ],
    },
    {
      group: 'QUẢN LÝ ƯU ĐÃI',
      items: [
        { label: 'Voucher Giảm Giá', to: '/admin/promotions/vouchers', icon: 'confirmation_number', isDeferred: true },
        { label: 'Flash Sale', to: '/admin/promotions/flash-sale', icon: 'bolt', isDeferred: true },
      ],
    },
    {
      group: 'TÀI CHÍNH & VẬN HÀNH',
      items: [
        { label: 'Tài Khoản Trung Gian', to: '/admin/escrow', icon: 'account_balance_wallet' },
        { label: 'Yêu Cầu Đổi Trả', to: '/admin/return-requests', icon: 'assignment_return' },
        { label: 'Tài Chính & Kế Toán', to: '/admin/finance', icon: 'payments' },
        { label: 'Trọng Tài Khiếu Nại', to: '/admin/disputes', icon: 'gavel' },
        { label: 'Tiếp Thị & Khuyến Mãi', to: '/admin/marketing', icon: 'campaign' },
        { label: 'Báo Cáo Thống Kê', to: '/admin/reports', icon: 'bar_chart' },
      ],
    },
    {
      group: 'HẠ TẦNG KỸ THUẬT',
      items: [
        {
          label: 'Sức Khỏe Hệ Thống',
          to: '/admin/health',
          icon: 'health_and_safety',
          count: stats.healthStatus === 'ok' ? 'Online' : 'Degraded',
          badgeColor: stats.healthStatus === 'ok' ? 'bg-emerald-500 text-white font-bold' : 'bg-rose-500 text-white font-bold',
        },
        { label: 'Danh Sách Bạn Đọc', to: '/admin/users', icon: 'groups' },
        { label: 'Cài Đặt Hệ Thống', to: '/admin/settings', icon: 'settings' },
      ],
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/admin/books?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <div className="admin-portal h-screen w-full bg-white text-[#1E293B] flex flex-col font-sans antialiased overflow-hidden selection:bg-[#00875A] selection:text-white">
      {/* 1. TOP APP BAR / HEADER */}
      <header className="h-13.5 min-h-[54px] border-b border-[#E2E8F0] px-3.5 sm:px-5 lg:px-6 flex items-center justify-between gap-3 shrink-0 bg-white z-30">
        {/* Left: Brand Identity, Collapse Button & Search */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {/* Desktop Sidebar Collapse Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all cursor-pointer border border-[#E2E8F0]"
            title={isSidebarCollapsed ? 'Mở rộng thanh menu (Sidebar)' : 'Thu gọn thanh menu (Sidebar)'}
            aria-label="Toggle sidebar"
          >
            <span className="material-symbols-outlined text-[18px] transition-transform duration-300">
              {isSidebarCollapsed ? 'menu' : 'menu_open'}
            </span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-xl text-gray-500 hover:bg-gray-100 cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>

          {/* Logo & Portal Identity */}
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#003B2B] to-[#00875A] flex items-center justify-center text-white shadow-xs font-black text-sm shrink-0">
              H
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-editorial text-sm sm:text-base font-bold text-gray-900 leading-tight tracking-tight">
                  HUKI ADMIN PORTAL
                </span>
                <span className="bg-[#00875A] text-white text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded tracking-wide">
                  PLATFORM
                </span>
              </div>
              <span className="text-[9px] text-gray-400 font-semibold tracking-wider uppercase hidden sm:block">
                Ban Quản Trị Trung Ương Nền Tảng HUKI
              </span>
            </div>
          </Link>

          {/* Global Search Bar */}
          <form onSubmit={handleSearch} className="relative hidden md:block w-56 lg:w-72 ml-1">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
            <input
              type="text"
              placeholder="Tìm sách, doanh nghiệp, ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
            />
          </form>
        </div>

        {/* Right: Microservice Health, User info & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Health quick status badge */}
          <Link
            href="/admin/health"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${stats.healthStatus === 'ok' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-gray-600">Hệ Thống:</span>
            <span className={stats.healthStatus === 'ok' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
              {stats.healthStatus === 'ok' ? 'Ổn định' : 'Cảnh báo'}
            </span>
          </Link>

          {/* Profile & Avatar */}
          <div className="flex items-center gap-2 pl-2 sm:pl-2.5 border-l border-[#E2E8F0]">
            <UserAvatar user={user} className="w-7 h-7 rounded-xl border border-[#E2E8F0]" />
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-gray-900 leading-tight truncate max-w-[120px]">
                {adminName}
              </span>
              <span className="text-[9px] text-emerald-700 font-semibold leading-tight">
                Super Admin
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. BODY CONTAINER: SIDEBAR + MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* DESKTOP SIDEBAR */}
        <aside className={`${isSidebarCollapsed ? 'w-18' : 'w-64'} hidden lg:flex flex-col border-r border-[#E2E8F0] bg-[#F8FAFC] shrink-0 transition-all duration-300 select-none`}>
          <div className="flex-1 overflow-y-auto py-3.5 px-2.5 flex flex-col gap-4 custom-scrollbar">
            {menuSections.map((sec, sIdx) => (
              <div key={sIdx} className="flex flex-col gap-0.5">
                {!isSidebarCollapsed && (
                  <div className="px-2.5 pb-1 text-[9.5px] font-extrabold uppercase tracking-wider text-gray-400">
                    {sec.group}
                  </div>
                )}
                {sec.items.map((item, iIdx) => {
                  if ((item as any).isDeferred) {
                    return (
                      <div
                        key={iIdx}
                        title={isSidebarCollapsed ? `${item.label} (Sắp ra mắt)` : undefined}
                        className={`flex items-center relative ${isSidebarCollapsed ? 'justify-center px-0 py-2' : 'justify-between px-2.5 py-1.5'} rounded-xl text-xs font-semibold opacity-45 cursor-not-allowed pointer-events-none select-none text-gray-400 bg-black/[0.02]`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="material-symbols-outlined text-[18px] shrink-0 text-gray-400">
                            {item.icon}
                          </span>
                          {!isSidebarCollapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </div>
                        {!isSidebarCollapsed && (
                          <span className="text-[8.5px] px-1.5 py-0.2 rounded font-bold text-gray-400 bg-gray-100 border border-gray-200 whitespace-nowrap shrink-0 ml-1.5">
                            Sắp ra mắt
                          </span>
                        )}
                      </div>
                    );
                  }

                  const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);
                  return (
                    <Link
                      key={iIdx}
                      href={item.to}
                      title={isSidebarCollapsed ? `${item.label} (${item.count || 0})` : undefined}
                      className={`flex items-center relative ${isSidebarCollapsed ? 'justify-center px-0 py-2' : 'justify-between px-2.5 py-1.5'} rounded-xl text-xs font-semibold transition-all group ${
                        isActive
                          ? 'bg-[#00875A] text-white shadow-xs font-bold'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className={`material-symbols-outlined text-[18px] shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-700'}`}>
                          {item.icon}
                        </span>
                        {!isSidebarCollapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </div>
                      {!isSidebarCollapsed && item.count && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full whitespace-nowrap shrink-0 ml-1.5 ${item.badgeColor || (isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700')}`}>
                          {item.count}
                        </span>
                      )}
                      {isSidebarCollapsed && item.count && (
                        <span className="absolute top-1 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse"></span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Sidebar Footer */}
          <div className="p-2.5 border-t border-[#E2E8F0] bg-[#F1F5F9]/70 flex flex-col gap-1.5 shrink-0">
            {!isSidebarCollapsed ? (
              <div className="flex items-center justify-between text-[10px] text-gray-500 px-1.5 py-0.5">
                <span className="font-semibold text-gray-700">HUKI v2.0 Platform</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[8px] font-bold">PROD</span>
              </div>
            ) : (
              <div className="flex justify-center text-[9px] text-emerald-700 font-bold">
                PROD
              </div>
            )}
          </div>
        </aside>

        {/* MOBILE DRAWER SIDEBAR */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative w-64 max-w-[80vw] bg-white h-full flex flex-col shadow-2xl z-10 animate-slide-right">
              <div className="p-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#00875A] flex items-center justify-center text-white font-black text-xs">
                    H
                  </div>
                  <span className="font-bold text-xs text-gray-900 font-editorial">HUKI ADMIN</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
                {menuSections.map((sec, sIdx) => (
                  <div key={sIdx} className="flex flex-col gap-0.5">
                    <div className="px-2.5 pb-1 text-[9px] font-extrabold uppercase tracking-wider text-gray-400">
                      {sec.group}
                    </div>
                    {sec.items.map((item, iIdx) => {
                      if (item.isDeferred) {
                        return (
                          <div
                            key={iIdx}
                            className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold opacity-45 cursor-not-allowed pointer-events-none select-none text-gray-400 bg-black/[0.02]"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="material-symbols-outlined text-[16px] text-gray-400">
                                {item.icon}
                              </span>
                              <span>{item.label}</span>
                            </div>
                            <span className="text-[8.5px] px-1.5 py-0.2 rounded font-bold text-gray-400 bg-gray-100 border border-gray-200">
                              Sắp ra mắt
                            </span>
                          </div>
                        );
                      }

                      const isActive = pathname === item.to;
                      return (
                        <Link
                          key={iIdx}
                          href={item.to}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold ${
                            isActive
                              ? 'bg-[#00875A] text-white font-bold'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-[16px]">
                              {item.icon}
                            </span>
                            <span>{item.label}</span>
                          </div>
                          {item.count && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-gray-100 text-gray-700">
                              {item.count}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. MAIN WORKSPACE */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] overflow-y-auto">
          {/* Breadcrumbs Navigation Bar */}
          <div className="h-9 px-3.5 sm:px-5 lg:px-6 border-b border-[#E2E8F0] bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Link href="/admin/dashboard" className="hover:text-gray-900 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-gray-400">home</span>
                <span>Admin</span>
              </Link>
              <span className="text-gray-300">/</span>
              <span className="text-gray-500">{currentRouteInfo.parent}</span>
              <span className="text-gray-300">/</span>
              <span className="font-bold text-gray-900">{currentRouteInfo.title}</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="hidden sm:inline">Role: <strong className="text-emerald-700 font-bold">PLATFORM_ADMIN</strong></span>
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 p-3.5 sm:p-5 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
