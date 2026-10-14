"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/ui/context/AuthContext';
import UserAvatar from '@/ui/components/common/UserAvatar';
import { adminApi } from '@/ui/api/adminApi';
import { businessApi } from '@/ui/api/businessApi';
import { soundEffects } from '@/ui/utils/soundEffects';

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
  const [isMuted, setIsMuted] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIsMuted(soundEffects.getIsMuted());
    const onMuteChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setIsMuted(Boolean(customEvent.detail));
    };
    window.addEventListener('huki_mute_toggled', onMuteChange);
    return () => window.removeEventListener('huki_mute_toggled', onMuteChange);
  }, []);

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
    '/admin/seller-features': { parent: 'Xét Duyệt Đối Tác', title: 'Quản Lý Tính Năng Seller' },
    '/admin/books': { parent: 'Quản Trị Catalog', title: 'Quản Lý Sách Toàn Sàn' },
    '/admin/ai-audiobooks': { parent: 'Quản Trị Catalog', title: 'Quản Trị Sách Nói AI & Gói Cước' },
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
    '/admin/shippers': { parent: 'Tài Chính & Vận Hành', title: 'Quản Lý Đội Ngũ Bưu Tá (Shipper)' },
    '/admin/notifications': { parent: 'Quản Lý Ưu Đãi & Truyền Thông', title: 'Quản Lý & Phát Sóng Thông Báo' },
    '/admin/vouchers': { parent: 'Quản Lý Ưu Đãi & Truyền Thông', title: 'Mã Giảm Giá Toàn Sàn (Voucher)' },
    '/admin/flash-sales': { parent: 'Quản Lý Ưu Đãi & Truyền Thông', title: 'Flash Sale Giờ Vàng Toàn Sàn' },
    '/admin/marketing': { parent: 'Quản Lý Ưu Đãi & Truyền Thông', title: 'Tiếp Thị & Banner Trang Chủ' },
    '/admin/drm-vault': { parent: 'Hạ Tầng Kỹ Thuật', title: 'Kho Khóa Bảo Mật DRM' },
    '/admin/reports': { parent: 'Báo Cáo & Phân Tích', title: 'Phân Tích Dữ Liệu' },
    '/admin/calendar': { parent: 'Vận Hành & Sự Kiện', title: 'Lịch Làm Việc & Sự Kiện' },
    '/admin/integrations': { parent: 'Hạ Tầng Kỹ Thuật', title: 'Tích Hợp Bên Thứ Ba' },
    '/admin/maintenance': { parent: 'Hệ Thống & Vận Hành', title: 'Bảo Trì Hệ Thống & Kill-Switch' },
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
    icon: string;
    items: AdminMenuItem[];
  }

  const menuSections: AdminMenuSection[] = [
    {
      group: 'TỔNG QUAN & BÁO CÁO',
      icon: 'monitoring',
      items: [
        { label: 'Bảng Điều Hành Sàn', to: '/admin/dashboard', icon: 'dashboard' },
        { label: 'Báo Cáo Thống Kê', to: '/admin/reports', icon: 'bar_chart' },
      ],
    },
    {
      group: 'NGƯỜI DÙNG & ĐỐI TÁC',
      icon: 'domain',
      items: [
        { label: 'Quản Lý Người Dùng', to: '/admin/accounts', icon: 'manage_accounts' },
        { label: 'Danh Sách Bạn Đọc', to: '/admin/users', icon: 'groups' },
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
      group: 'QUẢN TRỊ CATALOG & DRM',
      icon: 'menu_book',
      items: [
        {
          label: 'Sách Toàn Sàn',
          to: '/admin/books',
          icon: 'menu_book',
          count: stats.totalBooks > 0 ? String(stats.totalBooks) : undefined,
          badgeColor: 'bg-slate-200 text-slate-700 font-semibold',
        },
        {
          label: 'Sách Nói AI & Gói Cước',
          to: '/admin/ai-audiobooks',
          icon: 'record_voice_over',
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
      group: 'VẬN HÀNH & GIAO VẬN',
      icon: 'local_shipping',
      items: [
        { label: 'Đội Ngũ Bưu Tá', to: '/admin/shippers', icon: 'local_shipping' },
      ],
    },
    {
      group: 'HẬU MÃI & TRỌNG TÀI',
      icon: 'gavel',
      items: [
        { label: 'Yêu Cầu Đổi Trả', to: '/admin/return-requests', icon: 'assignment_return' },
        { label: 'Trọng Tài Khiếu Nại', to: '/admin/disputes', icon: 'gavel' },
      ],
    },
    {
      group: 'TÀI CHÍNH SÀN',
      icon: 'account_balance_wallet',
      items: [
        { label: 'Tài Khoản Trung Gian (Escrow)', to: '/admin/escrow', icon: 'account_balance_wallet' },
        { label: 'Tài Chính & Kế Toán (Ledger)', to: '/admin/finance', icon: 'payments' },
      ],
    },
    {
      group: 'TIẾP THỊ & TRUYỀN THÔNG',
      icon: 'campaign',
      items: [
        { label: 'Phát Sóng Thông Báo', to: '/admin/notifications', icon: 'campaign' },
        { label: 'Voucher Giảm Giá', to: '/admin/vouchers', icon: 'confirmation_number' },
        { label: 'Flash Sale Giờ Vàng', to: '/admin/flash-sales', icon: 'bolt' },
        { label: 'Tiếp Thị & Banner', to: '/admin/marketing', icon: 'auto_stories' },
      ],
    },
    {
      group: 'HỆ THỐNG & VẬN HÀNH',
      icon: 'settings_suggest',
      items: [
        {
          label: 'Sức Khỏe Hệ Thống',
          to: '/admin/health',
          icon: 'health_and_safety',
          count: stats.healthStatus === 'ok' ? 'Online' : 'Degraded',
          badgeColor: stats.healthStatus === 'ok' ? 'bg-emerald-500 text-white font-bold' : 'bg-rose-500 text-white font-bold',
        },
        { label: 'Tính Năng Seller', to: '/admin/seller-features', icon: 'toggle_on' },
        { label: 'Bảo Trì Hệ Thống', to: '/admin/maintenance', icon: 'build' },
        { label: 'Cài Đặt Hệ Thống', to: '/admin/settings', icon: 'settings' },
      ],
    },
  ];

  // Tự động mở accordion của nhóm chứa route hiện tại
  useEffect(() => {
    menuSections.forEach((sec) => {
      const hasActive = sec.items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
      if (hasActive) {
        setOpenSections((prev) => ({ ...prev, [sec.group]: true }));
      }
    });
  }, [pathname]);

  const toggleSection = (group: string) => {
    setOpenSections((prev) => ({ ...prev, [group]: !prev[group] }));
  };

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
      <header className="h-[54px] min-h-[54px] border-b border-[#E2E8F0] pl-0 pr-3.5 sm:pr-5 lg:pr-6 flex items-center justify-between gap-3 shrink-0 bg-white z-30">
        {/* Left: Sidebar Toggle & Brand Identity */}
        <div className="flex items-center">
          {/* Hamburger / Sidebar Toggle Container - exactly w-[60px] to align perfectly with collapsed sidebar */}
          <div className="w-[60px] flex items-center justify-center shrink-0">
            {/* Desktop Sidebar Collapse Toggle Button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:flex w-9 h-9 items-center justify-center rounded-xl text-gray-500 hover:text-[#003B2B] hover:bg-gray-100 transition-all cursor-pointer border border-[#E2E8F0] hover:border-[#003B2B]/30 shadow-2xs active:scale-95"
              title={isSidebarCollapsed ? 'Mở rộng thanh menu (Sidebar)' : 'Thu gọn thanh menu (Sidebar)'}
              aria-label="Toggle sidebar"
            >
              <span className="material-symbols-outlined text-[20px] text-[#003B2B] transition-transform duration-300">
                {isSidebarCollapsed ? 'menu' : 'menu_open'}
              </span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 border border-[#E2E8F0] cursor-pointer active:scale-95"
              aria-label="Toggle mobile menu"
            >
              <span className="material-symbols-outlined text-[20px] text-[#003B2B]">menu</span>
            </button>
          </div>

          {/* Logo & Portal Identity - Chuẩn nhận diện Home (Không dùng logo icon chữ H) */}
          <Link href="/admin/dashboard" className="flex flex-col group select-none pl-1 pr-3">
            <div className="flex items-center gap-1.5">
              <span className="font-editorial text-base sm:text-lg font-black tracking-tight text-[#003B2B] leading-none">
                HUKI EBOOK
              </span>
              <span className="bg-[#003B2B] text-white text-[7.5px] sm:text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider">
                ADMIN
              </span>
            </div>
            <span className="text-[7.5px] sm:text-[8px] uppercase tracking-widest text-[#006953] font-bold mt-0.5">
              Ban Quản Trị Hệ Thống
            </span>
          </Link>

          {/* Global Search Bar */}
          <form onSubmit={handleSearch} className="relative hidden md:block w-56 lg:w-72 ml-1">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
            <input
              type="text"
              placeholder="Tìm sách, doanh nghiệp, ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#003B2B] focus:bg-white transition-all shadow-2xs"
            />
          </form>
        </div>

        {/* Right: Storefront link, Microservice Health, User info & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Back to Storefront Link */}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl border border-emerald-600/30 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-900 transition-colors shadow-2xs"
            title="Trở về Xem Cửa Hàng / Sàn HuKi"
          >
            <span className="material-symbols-outlined text-[16px] text-emerald-700">storefront</span>
            <span className="hidden sm:inline">Xem Sàn HuKi</span>
          </Link>

          {/* Health quick status badge */}
          <Link
            href="/admin/health"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors shadow-2xs"
          >
            <span className={`w-2 h-2 rounded-full ${stats.healthStatus === 'ok' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-gray-500">Hệ Thống:</span>
            <span className={stats.healthStatus === 'ok' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
              {stats.healthStatus === 'ok' ? 'Ổn định' : 'Cảnh báo'}
            </span>
          </Link>

          {/* Sound Mute Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const newMuted = soundEffects.toggleMute();
              setIsMuted(newMuted);
            }}
            className="flex items-center justify-center w-8 h-8 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-gray-100 text-gray-600 hover:text-[#003B2B] transition-colors relative shadow-2xs cursor-pointer"
            title={isMuted ? "Bật âm thanh chuông thông báo" : "Tắt âm thanh chuông thông báo"}
            aria-label="Bật/Tắt âm thanh"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isMuted ? 'volume_off' : 'volume_up'}
            </span>
          </button>

          {/* Admin Notification Bell */}
          <Link
            href="/admin/notifications"
            className="flex items-center justify-center w-8 h-8 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-gray-100 text-gray-600 hover:text-[#003B2B] transition-colors relative shadow-2xs"
            title="Quản lý & Phát sóng thông báo tới người bán"
          >
            <span className="material-symbols-outlined text-[18px]">campaign</span>
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
              <span className="material-symbols-outlined text-[17px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. BODY CONTAINER: SIDEBAR + MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* DESKTOP SIDEBAR - Chuẩn Accordion 7 Phân Hệ (#003B2B) */}
        <aside
          className={`
            hidden lg:flex flex-col
            bg-[#003B2B] text-white border-r border-[#00281D]
            shrink-0 transition-all duration-300 select-none shadow-md
            ${isSidebarCollapsed ? 'w-[60px]' : 'w-[245px]'}
          `}
        >
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-1.5 flex flex-col gap-2.5 select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {menuSections.map((sec, sIdx) => {
              const isSectionOpen = openSections[sec.group] ?? true;
              const hasActiveChild = sec.items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

              return (
                <div key={sIdx} className="flex flex-col gap-0.5">
                  {!isSidebarCollapsed ? (
                    <button
                      type="button"
                      onClick={() => toggleSection(sec.group)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[9.5px] font-extrabold uppercase tracking-widest transition-colors cursor-pointer select-none ${
                        hasActiveChild ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                      title={`Bấm để ${isSectionOpen ? 'thu gọn' : 'mở rộng'} ${sec.group}`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="material-symbols-outlined text-[13px] opacity-75">{sec.icon}</span>
                        <span className="truncate">{sec.group}</span>
                      </div>
                      <span className={`material-symbols-outlined text-[14px] transition-transform duration-200 ${isSectionOpen ? 'rotate-180 text-white' : 'text-white/40'}`}>
                        expand_more
                      </span>
                    </button>
                  ) : (
                    <div className="my-1.5 border-t border-white/10" title={sec.group} />
                  )}

                  {/* Items Container */}
                  {(isSidebarCollapsed || isSectionOpen) && (
                    <div className={`flex flex-col gap-1 ${!isSidebarCollapsed ? 'pl-1 pr-0.5 mt-0.5 animate-in fade-in-0 duration-200' : ''}`}>
                      {sec.items.map((item, iIdx) => {
                        if ((item as any).isDeferred) {
                          return (
                            <div key={iIdx} className="relative group">
                              {isSidebarCollapsed ? (
                                <div className="flex items-center justify-center py-0.5">
                                  <div className="flex items-center justify-center w-9 h-9 rounded-xl opacity-40 text-white/50 cursor-not-allowed">
                                    <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
                                  </div>
                                  <div className="opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg shadow-xl whitespace-nowrap z-50">
                                    {item.label} (Sắp ra mắt)
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between px-2.5 h-9 rounded-xl text-[12.5px] font-medium opacity-40 text-white/50 cursor-not-allowed">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="material-symbols-outlined text-[18px] shrink-0">{item.icon}</span>
                                    <span className="truncate">{item.label}</span>
                                  </div>
                                  <span className="text-[8px] px-1 py-0.2 rounded font-bold text-white/60 bg-white/10 border border-white/10 whitespace-nowrap shrink-0 ml-1">
                                    Sớm
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }

                        const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);
                        return (
                          <div key={iIdx} className="relative group">
                            {isSidebarCollapsed ? (
                              /* Collapsed Icon-Only View */
                              <div className="flex items-center justify-center py-0.5">
                                <Link
                                  href={item.to}
                                  className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150 relative shrink-0 ${
                                    isActive
                                      ? 'bg-white text-[#003B2B] shadow-sm font-bold border border-white/40'
                                      : 'text-white/80 hover:bg-white/15 hover:text-white border border-transparent'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[19px] shrink-0">{item.icon}</span>
                                  {item.count && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-400 ring-2 ring-[#003B2B] animate-pulse" />
                                  )}
                                </Link>

                                <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 absolute left-full ml-2.5 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg shadow-xl whitespace-nowrap z-50 flex items-center gap-1.5">
                                  <span>{item.label}</span>
                                  {item.count && (
                                    <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white text-[9px] font-black">
                                      {item.count}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* Expanded Clean Item View */
                              <Link
                                href={item.to}
                                className={`flex items-center justify-between gap-2 px-2.5 h-9 rounded-xl text-[12.5px] transition-all duration-150 shrink-0 ${
                                  isActive
                                    ? 'bg-white text-[#003B2B] font-bold shadow-sm border border-white/40'
                                    : 'text-white/85 font-medium hover:bg-white/15 hover:text-white border border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span
                                    className={`material-symbols-outlined text-[18px] shrink-0 ${
                                      isActive ? 'text-[#003B2B] font-bold' : 'text-white/75 group-hover:text-white'
                                    }`}
                                  >
                                    {item.icon}
                                  </span>
                                  <span className="truncate leading-none min-w-0">{item.label}</span>
                                </div>
                                {item.count && (
                                  <span
                                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-black whitespace-nowrap shrink-0 ${
                                      item.badgeColor || (isActive ? 'bg-[#003B2B]/15 text-[#003B2B]' : 'bg-rose-500 text-white animate-pulse')
                                    }`}
                                  >
                                    {item.count}
                                  </span>
                                )}
                              </Link>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          <div className="p-2.5 border-t border-white/10 bg-black/15 flex flex-col gap-1 shrink-0">
            {!isSidebarCollapsed ? (
              <div className="flex items-center justify-between text-[10px] text-white/60 px-1 py-0.5">
                <span className="font-semibold text-white/80">HUKI v2.0 Platform</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[8px] font-bold">PROD</span>
              </div>
            ) : (
              <div className="flex justify-center text-[8.5px] text-emerald-400 font-bold">
                PROD
              </div>
            )}
          </div>
        </aside>

        {/* MOBILE DRAWER SIDEBAR */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-[85vw] bg-[#003B2B] text-white h-full flex flex-col shadow-2xl z-10">
              <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-black/10">
                <div className="flex flex-col select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="font-editorial text-base font-black tracking-tight text-white leading-none">
                      HUKI EBOOK
                    </span>
                    <span className="bg-white/20 text-white text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded">
                      ADMIN
                    </span>
                  </div>
                  <span className="text-[7.5px] uppercase tracking-widest text-emerald-300 font-bold mt-0.5">
                    Ban Quản Trị Hệ Thống
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
                {menuSections.map((sec, sIdx) => {
                  const isSectionOpen = openSections[sec.group] ?? true;
                  const hasActiveChild = sec.items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

                  return (
                    <div key={sIdx} className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => toggleSection(sec.group)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest text-left ${
                          hasActiveChild ? 'text-white bg-white/15' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">{sec.icon}</span>
                          <span>{sec.group}</span>
                        </div>
                        <span className={`material-symbols-outlined text-[14px] transition-transform ${isSectionOpen ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </button>

                      {isSectionOpen && (
                        <div className="flex flex-col gap-1 pl-1">
                          {sec.items.map((item, iIdx) => {
                            const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);
                            return (
                              <Link
                                key={iIdx}
                                href={item.to}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center justify-between px-2.5 h-9 rounded-xl text-xs font-semibold transition-all ${
                                  isActive
                                    ? 'bg-white text-[#003B2B] shadow-xs font-bold'
                                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`material-symbols-outlined text-[17px] ${isActive ? 'text-[#003B2B]' : 'text-white/70'}`}>
                                    {item.icon}
                                  </span>
                                  <span>{item.label}</span>
                                </div>
                                {item.count && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-full font-black bg-rose-500 text-white">
                                    {item.count}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
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
