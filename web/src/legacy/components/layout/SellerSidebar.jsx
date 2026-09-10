import React from 'react';
import { NavLink } from 'react-router-dom';

export default function SellerSidebar({ isCollapsed, toggleSidebar, isMobile, onClose }) {
  const menuGroups = [
    {
      title: 'TỔNG QUAN',
      items: [
        { to: '/seller/dashboard', icon: 'dashboard', label: 'Bảng Điều Khiển' }
      ]
    },
    {
      title: 'BÁN HÀNG',
      items: [
        { to: '/seller/orders', icon: 'orders', label: 'Quản Lý Đơn Hàng', badge: '12' },
        { to: '/seller/chat', icon: 'chat', label: 'Tin Nhắn & Chat', badge: 'Tạm khóa', badgeColor: 'bg-gray-500', deferred: true },
        { to: '/seller/product/create-hybrid', icon: 'add_box', label: 'Thêm Sản Phẩm Mới' },
        { to: '/seller/product/edit-hybrid', icon: 'edit_note', label: 'Sản Phẩm Đang Bán' },
        { to: '/seller/product/correction', icon: 'report_problem', label: 'Sản Phẩm Cần Sửa', badge: 'Tạm khóa', badgeColor: 'bg-gray-500', deferred: true }
      ]
    },
    {
      title: 'CỔNG PHÁT HÀNH & DRM',
      items: [
        { to: '/seller/product/create-ebook', icon: 'menu_book', label: 'Ebook Kỹ Thuật Số' },
        { to: '/seller/product/create-physical', icon: 'inventory_2', label: 'Kho Sách Giấy' },
        { to: '/seller/edge-cases', icon: 'account_tree', label: 'Thư Viện Trạng Thái', deferred: true }
      ]
    },
    {
      title: 'HỒ SƠ ĐỐI TÁC',
      items: [
        { to: '/seller/register', icon: 'badge', label: 'Hồ Sơ Doanh Nghiệp' },
        { to: '/seller', icon: 'handshake', label: 'Giới Thiệu Kênh B2B' }
      ]
    }
  ];

  return (
    <aside 
      className={`bg-theme-surface border-r border-theme-border flex flex-col justify-between shrink-0 h-[calc(100vh-61px)] sticky top-[61px] overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[72px] p-2.5' : 'w-64 p-4'
      }`}
    >
      <div className="space-y-5">
        {/* Mobile Header with Close button */}
        {isMobile && (
          <div className="flex items-center justify-between pb-3 border-b border-theme-border">
            <span className="font-editorial text-lg font-bold text-theme-primary">DANH MỤC QUẢN LÝ</span>
            <button 
              type="button" 
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-theme-secondary-subtle text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        )}

        {menuGroups.map((group, gIdx) => (
          <div key={gIdx}>
            {/* Group Title or Divider */}
            {isCollapsed ? (
              <div className="my-2 border-t border-theme-border/60" title={group.title}></div>
            ) : (
              <p className="text-[10px] font-bold tracking-wider text-on-surface-variant mb-2 px-3">
                {group.title}
              </p>
            )}

            <div className="space-y-1">
              {group.items.map((item, iIdx) => (
                <NavLink
                  key={iIdx}
                  to={item.to}
                  title={isCollapsed ? item.label : undefined}
                  onClick={isMobile ? onClose : undefined}
                  aria-disabled={item.deferred}
                  tabIndex={item.deferred ? -1 : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl text-xs font-semibold transition-all relative group ${
                      isCollapsed 
                        ? 'justify-center p-2.5' 
                        : 'justify-between px-3 py-2'
                    } ${item.deferred ? 'pointer-events-none opacity-35 grayscale' : ''} ${
                      isActive
                        ? 'bg-theme-primary text-white shadow-sm'
                        : 'text-on-surface hover:bg-theme-secondary-subtle hover:text-theme-primary'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                        <span className="material-symbols-outlined text-lg shrink-0">{item.icon}</span>
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {/* Badge in Expanded mode */}
                      {!isCollapsed && item.badge && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold text-white shadow-2xs ${item.badgeColor || 'bg-[#ac2c19]'}`}>
                          {item.badge}
                        </span>
                      )}

                      {/* Floating Badge in Collapsed mode */}
                      {isCollapsed && item.badge && (
                        <span className={`absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center shadow-xs ${item.badgeColor || 'bg-[#ac2c19]'}`}>
                          {item.badge}
                        </span>
                      )}

                      {/* Custom Tooltip on Hover when Collapsed */}
                      {isCollapsed && (
                        <div className="fixed left-20 ml-2 hidden group-hover:flex items-center px-2.5 py-1.5 rounded-lg bg-on-surface text-surface text-xs font-semibold whitespace-nowrap shadow-lg z-50 pointer-events-none transition-opacity">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Bottom Controls */}
      <div className="pt-4 mt-auto border-t border-theme-border space-y-2">
        {/* Toggle Collapse Button */}
        {!isMobile && (
          <button
            type="button"
            onClick={toggleSidebar}
            className={`w-full flex items-center rounded-xl text-xs font-semibold text-on-surface-variant hover:text-theme-primary hover:bg-theme-secondary-subtle transition-all cursor-pointer ${
              isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
            }`}
            title={isCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">
                {isCollapsed ? 'last_page' : 'first_page'}
              </span>
              {!isCollapsed && <span>Thu gọn thanh bên</span>}
            </div>
          </button>
        )}

        {/* Footer info */}
        {!isCollapsed && (
          <div className="text-[10px] text-on-surface-variant/80 text-center tracking-wide">
            HUKI Core DRM v3.4 Protected
          </div>
        )}
      </div>
    </aside>
  );
}
