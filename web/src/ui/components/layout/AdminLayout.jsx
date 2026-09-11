import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

export default function AdminLayout() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const routeMap = {
    '/admin': { parent: 'Tổng Quan Hệ Thống', title: 'Bảng Điều Hành Sàn' },
    '/admin/dashboard': { parent: 'Tổng Quan Hệ Thống', title: 'Bảng Điều Hành Sàn' },
    '/admin/publishers': { parent: 'Đối Tác & NXB', title: 'Quản Lý Nhà Xuất Bản' },
    '/admin/companies': { parent: 'Đối Tác & NXB', title: 'Quản Lý Nhà Xuất Bản' },
    '/admin/leads': { parent: 'Đối Tác & NXB', title: 'Duyệt Đăng Ký Mới' },
    '/admin/tasks': { parent: 'Nội Dung & Bản Quyền', title: 'Hàng Chờ Kiểm Duyệt Sách' },
    '/admin/moderation': { parent: 'Nội Dung & Bản Quyền', title: 'Hàng Chờ Kiểm Duyệt Sách' },
    '/admin/drm': { parent: 'Nội Dung & Bản Quyền', title: 'Kho Bản Quyền DRM' },
    '/admin/users': { parent: 'Độc Giả & Hội Viên', title: 'Danh Sách Bạn Đọc' },
    '/admin/contacts': { parent: 'Độc Giả & Hội Viên', title: 'Danh Sách Bạn Đọc' },
    '/admin/deals': { parent: 'Tài Chính & Đơn Hàng', title: 'Đối Soát Doanh Thu 85/15' },
    '/admin/finance': { parent: 'Tài Chính & Đơn Hàng', title: 'Đối Soát Doanh Thu 85/15' },
    '/admin/reports': { parent: 'Tài Chính & Đơn Hàng', title: 'Báo Cáo Phân Tích' },
    '/admin/automation': { parent: 'Marketing & Sự Kiện', title: 'Banner & Flash Deal' },
    '/admin/marketing': { parent: 'Marketing & Sự Kiện', title: 'Banner & Flash Deal' },
    '/admin/calendar': { parent: 'Marketing & Sự Kiện', title: 'Lịch Trình Toàn Sàn' },
    '/admin/integrations': { parent: 'Hạ Tầng Kỹ Thuật', title: 'Cổng Tích Hợp DRM' },
    '/admin/settings': { parent: 'Hạ Tầng Kỹ Thuật', title: 'Cài Đặt Hệ Thống' },
    '/admin/support': { parent: 'Hạ Tầng Kỹ Thuật', title: 'Hỗ Trợ & Khiếu Nại' }
  };

  const currentRouteInfo = routeMap[location.pathname] || { parent: 'Hệ Thống', title: 'Quản Trị' };

  const menuSections = [
    {
      group: 'TỔNG QUAN HỆ THỐNG',
      items: [
        { label: 'Bảng Điều Hành Sàn', to: '/admin/dashboard', icon: 'dashboard' }
      ]
    },
    {
      group: 'ĐỐI TÁC & NXB',
      items: [
        { label: 'Quản Lý Nhà Xuất Bản', to: '/admin/publishers', icon: 'domain', count: '1.024' },
        { label: 'Duyệt Đăng Ký Mới', to: '/admin/leads', icon: 'group_add', count: '18', badgeColor: 'bg-amber-500' }
      ]
    },
    {
      group: 'NỘI DUNG & BẢN QUYỀN',
      items: [
        { label: 'Hàng Chờ Kiểm Duyệt', to: '/admin/tasks', icon: 'verified', disabled: true },
        { label: 'Kho Bản Quyền DRM', to: '/admin/drm', icon: 'security', disabled: true }
      ]
    },
    {
      group: 'ĐỘC GIẢ & HỘI VIÊN',
      items: [
        { label: 'Danh Sách Bạn Đọc', to: '/admin/users', icon: 'groups', disabled: true }
      ]
    },
    {
      group: 'TÀI CHÍNH & ĐƠN HÀNG',
      items: [
        { label: 'Đối Soát Doanh Thu', to: '/admin/deals', icon: 'payments', disabled: true },
        { label: 'Báo Cáo Phân Tích', to: '/admin/reports', icon: 'monitoring', disabled: true }
      ]
    },
    {
      group: 'MARKETING & SỰ KIỆN',
      items: [
        { label: 'Banner & Flash Deal', to: '/admin/automation', icon: 'campaign', disabled: true },
        { label: 'Lịch Trình Toàn Sàn', to: '/admin/calendar', icon: 'calendar_month', disabled: true }
      ]
    },
    {
      group: 'HẠ TẦNG KỸ THUẬT',
      items: [
        { label: 'Cổng Tích Hợp DRM', to: '/admin/integrations', icon: 'hub', disabled: true },
        { label: 'Cài Đặt Hệ Thống', to: '/admin/settings', icon: 'settings', disabled: true },
        { label: 'Hỗ Trợ & Khiếu Nại', to: '/admin/support', icon: 'support_agent', disabled: true }
      ]
    }
  ];

  return (
    <div className="h-screen w-full bg-white text-[#1E293B] flex flex-col font-sans antialiased overflow-hidden selection:bg-[#00875A] selection:text-white">
      
      {/* 1. TOP APP BAR / HEADER (FULL WIDTH EDGE-TO-EDGE) */}
      <header className="h-16 border-b border-[#E2E8F0] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shrink-0 bg-white z-30">
        
        {/* Left: Brand Identity, Collapse Button & Search */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Desktop Sidebar Collapse Toggle Button */}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex w-9 h-9 items-center justify-center rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all cursor-pointer border border-[#E2E8F0]"
            title={isSidebarCollapsed ? "Mở rộng thanh menu (Sidebar)" : "Thu gọn thanh menu (Sidebar)"}
            aria-label="Toggle sidebar"
          >
            <span className="material-symbols-outlined text-[20px] transition-transform duration-300">
              {isSidebarCollapsed ? 'menu' : 'menu_open'}
            </span>
          </button>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>

          {/* Logo & Portal Identity */}
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#003B2B] to-[#00875A] flex items-center justify-center text-white shadow-xs font-black text-base shrink-0">
              H
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-editorial text-base font-bold text-gray-900 leading-tight tracking-tight">
                  HUKI SUPER ADMIN
                </span>
                <span className="bg-[#00875A] text-white text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded tracking-wide">
                  ROOT
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase hidden sm:block">
                Ban Điều Hành Trung Ương Sàn HUKI
              </span>
            </div>
          </Link>

          {/* Global Search Bar */}
          <div className="relative hidden md:block w-64 lg:w-80 ml-2 opacity-50" title="Tạm khóa — tìm kiếm kiểm duyệt ngoài happy case hiện tại">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Tìm kiếm NXB, mã ISBN, bản quyền DRM..."
              disabled
              aria-disabled="true"
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-gray-800 placeholder:text-gray-400 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Right: Date, DRM Status, Notification & Profile */}
        <div className="flex items-center gap-2 sm:gap-3.5">
          {/* Date Filter */}
          <div className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-gray-700">
            <span className="material-symbols-outlined text-[16px] text-[#00875A]">calendar_month</span>
            <span>Tháng 6/2026</span>
            <span className="material-symbols-outlined text-[14px] text-gray-400">expand_more</span>
          </div>

          {/* Server Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EBF7F2] border border-[#BDE6D7] text-[11px] font-bold text-[#00875A]">
            <span className="w-2 h-2 rounded-full bg-[#00875A] animate-pulse"></span>
            <span>DRM Cluster: Hoạt động (99.99%)</span>
          </div>

          {/* Notification Bell */}
          <button disabled aria-disabled="true" title="Tạm khóa — thông báo realtime ngoài happy case hiện tại" className="relative w-9 h-9 rounded-xl border border-[#E2E8F0] flex items-center justify-center text-gray-400 opacity-50 cursor-not-allowed">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#EF4444] ring-2 ring-white"></span>
          </button>

          {/* Super Admin Profile */}
          <div className="flex items-center gap-2.5 pl-2 sm:border-l sm:border-gray-200">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
              alt="Super Admin"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[#00875A]/30"
            />
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-bold text-gray-900 leading-tight">Admin Trưởng Sàn</span>
              <span className="text-[10px] text-gray-500 font-medium">Head of Operations</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE (SIDEBAR + CONTENT OUTLET) */}
      <div className="flex-1 flex overflow-hidden w-full">
        
        {/* LEFT SIDEBAR NAVIGATION (EXPANDED OR COLLAPSED) */}
        <aside className={`
          border-r border-[#E2E8F0] bg-[#FAFBFD] flex flex-col justify-between shrink-0 overflow-y-auto select-none transition-all duration-300
          ${isSidebarCollapsed ? 'w-20 p-2.5' : 'w-72 p-4'}
          ${isMobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 bg-white shadow-2xl block w-72 p-4' : 'hidden lg:flex'}
        `}>
          <div className="space-y-4">
            {menuSections.map((sec, sIdx) => (
              <div key={sIdx}>
                {!isSidebarCollapsed ? (
                  <p className="px-3 text-[9.5px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5 transition-opacity">
                    {sec.group}
                  </p>
                ) : (
                  <div className="w-6 h-px bg-gray-200 mx-auto my-2"></div>
                )}
                
                <div className="space-y-0.5">
                  {sec.items.map((item, iIdx) => {
                    const isActive = location.pathname === item.to || 
                      (item.to === '/admin/dashboard' && location.pathname === '/admin') ||
                      (item.to === '/admin/tasks' && location.pathname === '/admin/moderation') ||
                      (item.to === '/admin/publishers' && (location.pathname === '/admin/companies')) ||
                      (item.to === '/admin/users' && location.pathname === '/admin/contacts') ||
                      (item.to === '/admin/deals' && location.pathname === '/admin/finance') ||
                      (item.to === '/admin/automation' && location.pathname === '/admin/marketing');

                    return (
                      <Link
                        key={iIdx}
                        to={item.to}
                        onClick={(event) => {
                          if (item.disabled) {
                            event.preventDefault();
                            return;
                          }
                          setIsMobileMenuOpen(false);
                        }}
                        aria-disabled={item.disabled || undefined}
                        tabIndex={item.disabled ? -1 : undefined}
                        title={item.disabled ? 'Tạm khóa — ngoài happy case hiện tại' : (isSidebarCollapsed ? item.label : undefined)}
                        className={`
                          flex items-center rounded-xl text-xs font-semibold transition-all group relative
                          ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'}
                          ${item.disabled
                            ? 'text-gray-400 opacity-50 cursor-not-allowed'
                            : isActive
                            ? 'bg-[#EBF7F2] text-[#00875A] font-bold shadow-2xs' 
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 cursor-pointer'}
                        `}
                      >
                        <div className={`flex items-center gap-2.5 ${isSidebarCollapsed ? 'justify-center' : 'min-w-0'}`}>
                          <span className={`material-symbols-outlined text-[20px] shrink-0 ${isActive ? 'text-[#00875A]' : 'text-gray-400 group-hover:text-gray-700'} transition-colors`}>
                            {item.icon}
                          </span>
                          {!isSidebarCollapsed && <span className="truncate">{item.label}{item.disabled ? ' · Tạm khóa' : ''}</span>}
                        </div>

                        {item.count && !isSidebarCollapsed && (
                          <span className={`text-[9.5px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                            isActive 
                              ? 'bg-[#00875A] text-white' 
                              : `${item.badgeColor ? `${item.badgeColor} text-white` : 'bg-gray-200/70 text-gray-600'}`
                          }`}>
                            {item.count}
                          </span>
                        )}

                        {/* Collapsed dot badge indicator */}
                        {item.count && isSidebarCollapsed && (
                          <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${item.badgeColor ? item.badgeColor : 'bg-[#00875A]'}`}></span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Switcher Links */}
          <div className={`pt-4 mt-4 border-t border-gray-200/80 space-y-1.5 ${isSidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
            <Link
              to="/seller/dashboard"
              title={isSidebarCollapsed ? "Kênh Người Bán NXB" : undefined}
              className={`flex items-center rounded-xl text-xs font-semibold text-gray-600 hover:text-[#003B2B] hover:bg-emerald-50/70 transition-colors ${
                isSidebarCollapsed ? 'p-2.5 justify-center' : 'justify-between px-3.5 py-2'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-gray-400">store</span>
                {!isSidebarCollapsed && <span>Kênh Người Bán NXB</span>}
              </div>
              {!isSidebarCollapsed && <span className="material-symbols-outlined text-[14px]">arrow_forward</span>}
            </Link>

            <Link
              to="/"
              title={isSidebarCollapsed ? "Về Sàn HUKI Store" : undefined}
              className={`flex items-center rounded-xl text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition-colors ${
                isSidebarCollapsed ? 'p-2.5 justify-center' : 'justify-between px-3.5 py-2'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">storefront</span>
                {!isSidebarCollapsed && <span>Về Sàn HUKI Store</span>}
              </div>
              {!isSidebarCollapsed && <span className="material-symbols-outlined text-[14px]">arrow_forward</span>}
            </Link>
          </div>
        </aside>

        {/* MAIN CONTENT OUTLET WITH DYNAMIC BREADCRUMBS ("BÁNH MÌ") */}
        <main className="flex-1 bg-[#F8FAFC] overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col">
          
          {/* BREADCRUMB BAR ("BÁNH MÌ" ĐIỀU HƯỚNG TRANG) */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-5 bg-white px-4 py-2.5 rounded-2xl border border-[#E2E8F0] shadow-2xs shrink-0">
            <Link to="/" className="text-gray-400 hover:text-[#00875A] flex items-center gap-1 transition-colors">
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span className="hidden sm:inline">Sàn HUKI</span>
            </Link>
            <span className="material-symbols-outlined text-[14px] text-gray-300">chevron_right</span>
            <Link to="/admin/dashboard" className="text-gray-500 hover:text-[#00875A] transition-colors">
              Super Admin
            </Link>
            {currentRouteInfo.parent && (
              <>
                <span className="material-symbols-outlined text-[14px] text-gray-300">chevron_right</span>
                <span className="text-gray-400 hidden sm:inline">{currentRouteInfo.parent}</span>
              </>
            )}
            <span className="material-symbols-outlined text-[14px] text-gray-300">chevron_right</span>
            <span className="text-[#00875A] font-bold">{currentRouteInfo.title}</span>
          </nav>

          <div className="flex-1">
            <Outlet />
          </div>
        </main>
      </div>

    </div>
  );
}
