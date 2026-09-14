import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { businessApi } from '../../api/businessApi';
import { catalogApi } from '../../api/catalogApi';
import { orderApi } from '../../api/orderApi';
import { useAuth } from '../../context/AuthContext';
import { can, PERMISSIONS } from '../../utils/permissions';

export default function SellerSidebar({ isCollapsed, toggleSidebar, isMobile, onClose }) {
  const location = useLocation();
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
            ? booksRes.data.filter((b) => (b.business?.id || b.businessId) === bizId).length
            : booksRes.data.length;
          counts.products = count;
        }
      } catch { /* ignore */ }
      try {
        const ordersRes = await orderApi.getSellerOrders(bizId);
        if (ordersRes.success && ordersRes.data) {
          const list = Array.isArray(ordersRes.data)
            ? ordersRes.data
            : Array.isArray(ordersRes.data.items)
            ? ordersRes.data.items
            : [];
          const pending = list.filter((o) => o.status === 'PENDING_CONFIRMATION' || o.status === 'PENDING_PAYMENT').length;
          counts.orders = pending;
        }
      } catch { /* ignore */ }

      if (!cancelled) setBadges(counts);
    })();
    return () => { cancelled = true; };
  }, [user, activeBusinessId, setActiveBusinessId]);

  const currentBizId = user?.business?.id || activeBusinessId;

  // 4 nhóm quyền chuẩn: Mỗi menu có đường dẫn độc lập để chỉ active duy nhất 1 mục tại 1 thời điểm
  const menuGroups = [
    {
      title: 'BÁN HÀNG & ĐƠN HÀNG',
      items: [
        { 
          to: '/seller/orders', 
          icon: 'receipt_long', 
          label: 'Quản Lý Đơn Hàng', 
          badge: badges.orders || null, 
          badgeColor: 'bg-amber-600', 
          permission: PERMISSIONS.ORDER_VIEW 
        },
        { 
          to: '/seller/chat', 
          icon: 'chat', 
          label: 'Tin Nhắn & Chat', 
          isDeferred: true 
        }
      ]
    },
    {
      title: 'SẢN PHẨM & KHO HÀNG',
      items: [
        { 
          to: '/seller/products', 
          icon: 'menu_book', 
          label: 'Danh Mục Sản Phẩm', 
          badge: badges.products || null, 
          badgeColor: 'bg-blue-600', 
          permission: PERMISSIONS.PRODUCT_VIEW 
        },
        { 
          to: '/seller/product/create-hybrid', 
          icon: 'add_circle', 
          label: 'Đăng Bán Sách Mới', 
          permission: PERMISSIONS.PRODUCT_CREATE 
        },
        { 
          to: '/seller/product/create-physical', 
          icon: 'inventory_2', 
          label: 'Cập Nhật Tồn Kho', 
          permission: PERMISSIONS.INVENTORY_UPDATE 
        },
        { 
          to: '/seller/product/correction', 
          icon: 'edit_note', 
          label: 'Chỉnh Sửa Thông Tin Sách', 
          permission: PERMISSIONS.PRODUCT_UPDATE,
          isDeferred: true 
        }
      ]
    },
    {
      title: 'TÀI CHÍNH & DOANH THU',
      items: [
        { 
          to: '/seller/finance', 
          icon: 'account_balance_wallet', 
          label: 'Ví & Doanh Thu Doanh Nghiệp', 
          permission: PERMISSIONS.FINANCE_VIEW 
        }
      ]
    },
    {
      title: 'CỬA HÀNG & NHÂN SỰ',
      items: [
        { 
          to: '/seller/dashboard', 
          icon: 'dashboard', 
          label: 'Bảng Tổng Quan (Dashboard)', 
          permission: PERMISSIONS.DASHBOARD_VIEW 
        },
        { 
          to: '/seller/business', 
          icon: 'domain', 
          label: 'Hồ Sơ Cửa Hàng & Doanh Nghiệp', 
          permission: PERMISSIONS.STORE_VIEW 
        },
        { 
          to: '/seller/staff', 
          icon: 'badge', 
          label: 'Quản Lý Nhân Viên & Phân Quyền', 
          permission: PERMISSIONS.MEMBER_VIEW 
        },
        { 
          to: '/seller/business/settings', 
          icon: 'storefront', 
          label: 'Cập Nhật Hồ Sơ Cửa Hàng', 
          permission: PERMISSIONS.STORE_UPDATE,
          isDeferred: true 
        }
      ]
    }
  ];

  // Logic: 
  // - Nếu không có quyền: MẤT LUÔN (Ẩn hoàn toàn khỏi Sidebar)
  // - Nếu có quyền: Hiển thị bình thường
  // - Nếu là tính năng Deferred (chưa phát triển): Hiển thị mờ (opacity-40, disabled, badge 'Sắp ra mắt')
  const visibleMenuGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.isDeferred && !item.permission) return true;
        if (item.permission) {
          const hasPerm = can(item.permission, currentBizId, user);
          if (!hasPerm) return false; // Không có quyền -> MẤT LUÔN
        }
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside 
      className={`bg-theme-surface border-r border-theme-border flex flex-col justify-between shrink-0 h-[calc(100vh-52px)] sticky top-[52px] overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16 p-2' : 'w-[268px] p-2.5'
      }`}
    >
      <div className="space-y-3">
        {/* Mobile Header with Close button */}
        {isMobile && (
          <div className="flex items-center justify-between pb-2.5 border-b border-theme-border">
            <span className="font-editorial text-base font-bold text-theme-primary">DANH MỤC QUẢN LÝ</span>
            <button 
              type="button" 
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-theme-secondary-subtle text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}

        {visibleMenuGroups.map((group, gIdx) => (
          <div key={gIdx}>
            {/* Group Title or Divider */}
            {isCollapsed ? (
              <div className="my-1.5 border-t border-theme-border/60" title={group.title}></div>
            ) : (
              <p className="text-[9.5px] font-bold tracking-wider text-on-surface-variant/80 uppercase mb-1 px-2.5 flex items-center justify-between">
                <span>{group.title}</span>
              </p>
            )}

            <div className="space-y-0.5">
              {group.items.map((item, iIdx) => {
                if (item.isDeferred) {
                  return (
                    <div
                      key={iIdx}
                      title={isCollapsed ? `${item.label} (Tính năng đang hoàn thiện)` : undefined}
                      className={`flex items-center rounded-xl text-xs font-semibold relative group opacity-45 cursor-not-allowed pointer-events-none select-none bg-black/[0.02] dark:bg-white/[0.02] ${
                        isCollapsed 
                          ? 'justify-center p-1.5 text-on-surface-variant' 
                          : 'justify-between px-2.5 py-1.5 text-on-surface-variant'
                      }`}
                    >
                      <div className={`flex items-center min-w-0 ${isCollapsed ? 'justify-center' : 'gap-2 flex-1'}`}>
                        <span className="material-symbols-outlined text-[18px] shrink-0 text-gray-400">{item.icon}</span>
                        {!isCollapsed && <span className="truncate text-gray-400 font-medium text-xs">{item.label}</span>}
                      </div>

                      {!isCollapsed && (
                        <span className="text-[8.5px] px-1.5 py-0.2 rounded font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 whitespace-nowrap shrink-0 ml-1.5">
                          Sắp ra mắt
                        </span>
                      )}
                    </div>
                  );
                }

                // Check exact active route
                const isItemActive = location.pathname === item.to || (item.to !== '/seller/dashboard' && location.pathname.startsWith(item.to + '/'));

                return (
                  <NavLink
                    key={iIdx}
                    to={item.to}
                    end={item.to === '/seller/dashboard'}
                    title={isCollapsed ? item.label : undefined}
                    onClick={isMobile ? onClose : undefined}
                    className={() =>
                      `flex items-center rounded-xl text-xs font-semibold transition-all relative group ${
                        isCollapsed 
                          ? 'justify-center p-1.5' 
                          : 'justify-between px-2.5 py-1.5'
                      } ${
                        isItemActive
                          ? 'bg-theme-primary text-white shadow-xs font-bold'
                          : 'text-on-surface hover:bg-theme-secondary-subtle hover:text-theme-primary'
                      }`
                    }
                  >
                    <div className={`flex items-center min-w-0 ${isCollapsed ? 'justify-center' : 'gap-2 flex-1'}`}>
                      <span className={`material-symbols-outlined text-[18px] shrink-0 ${isItemActive ? 'text-white' : 'text-on-surface-variant'}`}>
                        {item.icon}
                      </span>
                      {!isCollapsed && <span className="truncate text-xs">{item.label}</span>}
                    </div>

                    {/* Badge in Expanded mode */}
                    {!isCollapsed && item.badge && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold text-white shadow-2xs whitespace-nowrap shrink-0 ml-1.5 ${item.badgeColor || 'bg-[#ac2c19]'}`}>
                        {item.badge}
                      </span>
                    )}

                    {/* Floating Badge in Collapsed mode */}
                    {isCollapsed && item.badge && (
                      <span className={`absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[8.5px] font-bold text-white flex items-center justify-center shadow-xs ${item.badgeColor || 'bg-[#ac2c19]'}`}>
                        {item.badge}
                      </span>
                    )}

                    {/* Custom Tooltip on Hover when Collapsed */}
                    {isCollapsed && (
                      <div className="fixed left-18 ml-2 hidden group-hover:flex items-center px-2 py-1 rounded-lg bg-on-surface text-surface text-xs font-semibold whitespace-nowrap shadow-lg z-50 pointer-events-none transition-opacity">
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-bold">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Bottom Controls */}
      <div className="pt-2.5 mt-auto border-t border-theme-border space-y-1.5">
        {/* Toggle Collapse Button */}
        {!isMobile && (
          <button
            type="button"
            onClick={toggleSidebar}
            className={`w-full flex items-center rounded-xl text-xs font-semibold text-on-surface-variant hover:text-theme-primary hover:bg-theme-secondary-subtle transition-all cursor-pointer ${
              isCollapsed ? 'justify-center p-1.5' : 'justify-between px-2.5 py-1.5'
            }`}
            title={isCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                {isCollapsed ? 'last_page' : 'first_page'}
              </span>
              {!isCollapsed && <span>Thu gọn thanh bên</span>}
            </div>
          </button>
        )}
      </div>
    </aside>
  );
}
