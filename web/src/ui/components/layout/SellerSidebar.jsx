import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { businessApi } from '../../api/businessApi';
import { catalogApi } from '../../api/catalogApi';
import { orderApi } from '../../api/orderApi';
import { useAuth } from '../../context/AuthContext';

export default function SellerSidebar({ isCollapsed, toggleSidebar, isMobile, onClose }) {
  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  const [badges, setBadges] = useState({ stores: 0, products: 0, orders: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let bizId = user?.business?.id || activeBusinessId;
      if (!bizId) {
        try {
          const res = await businessApi.getMyBusiness();
          if (res.success && res.data?.id) {
            bizId = res.data.id;
            setActiveBusinessId(bizId);
          }
        } catch { /* ignore */ }
      }
      if (!bizId || cancelled) return;

      const counts = { stores: 0, products: 0, orders: 0 };
      try {
        const storesRes = await businessApi.getMyStores(bizId);
        if (storesRes.success && Array.isArray(storesRes.data)) counts.stores = storesRes.data.length;
      } catch { /* ignore */ }
      try {
        const booksRes = await catalogApi.getPublicBooks({ limit: 100, ...(bizId ? { business: bizId } : {}) });
        if (booksRes.success && Array.isArray(booksRes.data)) {
          const count = bizId
            ? booksRes.data.filter((b) => b.businessId === bizId || b.storeId === bizId).length
            : booksRes.data.length;
          counts.products = count;
        }
      } catch { /* ignore */ }
      try {
        const ordersRes = await orderApi.getSellerOrders({ limit: 100 });
        if (ordersRes.success && ordersRes.data) {
          const list = ordersRes.data.items || (Array.isArray(ordersRes.data) ? ordersRes.data : []);
          const pending = list.filter((o) => o.status === 'PENDING_CONFIRMATION' || o.status === 'PENDING_PAYMENT').length;
          counts.orders = pending;
        }
      } catch { /* ignore */ }

      if (!cancelled) setBadges(counts);
    })();
    return () => { cancelled = true; };
  }, [user, activeBusinessId, setActiveBusinessId]);

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
        { to: '/seller/orders', icon: 'orders', label: 'Quản Lý Đơn Hàng', badge: badges.orders || null, badgeColor: 'bg-amber-600' },
        { to: '/seller/chat', icon: 'chat', label: 'Tin Nhắn & Chat' },
        { to: '/seller/product/create-hybrid', icon: 'add_box', label: 'Thêm Sản Phẩm Mới' },
        { to: '/seller/products', icon: 'edit_note', label: 'Sản Phẩm Đang Bán', badge: badges.products || null, badgeColor: 'bg-blue-600' },
        { to: '/seller/product/correction', icon: 'report_problem', label: 'Sản Phẩm Cần Sửa' }
      ]
    },
    {
      title: 'CỔNG PHÁT HÀNH & DRM',
      items: [
        { to: '/seller/product/create-ebook', icon: 'menu_book', label: 'Ebook Kỹ Thuật Số' },
        { to: '/seller/product/create-physical', icon: 'inventory_2', label: 'Kho Sách Giấy' },
        { to: '/seller/edge-cases', icon: 'account_tree', label: 'Thư Viện Trạng Thái' }
      ]
    },
    {
      title: 'HỒ SƠ ĐỐI TÁC',
      items: [
        { to: '/seller/business', icon: 'domain', label: 'Hồ Sơ Doanh Nghiệp' }
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
              {group.items.map((item, iIdx) => {
                const isDeferred = ['/seller/chat', '/seller/product/correction', '/seller/edge-cases'].includes(item.to);

                if (isDeferred) {
                  return (
                    <div
                      key={iIdx}
                      title={isCollapsed ? `${item.label} (Sắp ra mắt)` : undefined}
                      className={`flex items-center rounded-xl text-xs font-semibold relative group opacity-40 cursor-not-allowed pointer-events-none select-none bg-black/[0.02] dark:bg-white/[0.02] ${
                        isCollapsed 
                          ? 'justify-center p-2.5 text-on-surface-variant' 
                          : 'justify-between px-3 py-2 text-on-surface-variant'
                      }`}
                    >
                      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                        <span className="material-symbols-outlined text-lg shrink-0">{item.icon}</span>
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!isCollapsed && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-gray-500 bg-gray-200/80 dark:bg-gray-700/80">
                          Sắp ra mắt
                        </span>
                      )}
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={iIdx}
                    to={item.to}
                    end={true}
                    title={isCollapsed ? item.label : undefined}
                    onClick={isMobile ? onClose : undefined}
                    className={({ isActive }) =>
                      `flex items-center rounded-xl text-xs font-semibold transition-all relative group ${
                        isCollapsed 
                          ? 'justify-center p-2.5' 
                          : 'justify-between px-3 py-2'
                      } ${
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
                );
              })}
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
