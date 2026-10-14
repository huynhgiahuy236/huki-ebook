import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { businessApi } from '../../api/businessApi';
import { catalogApi } from '../../api/catalogApi';
import { orderApi } from '../../api/orderApi';
import { useAuth } from '../../context/AuthContext';
import { can, PERMISSIONS, type PermissionKey } from '../../utils/permissions';

import { featureFlagsService } from '@/ui/services/featureFlagsService';
import { adminNotificationService } from '@/ui/services/adminNotificationService';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import { chatService } from '@/ui/services/chatService';

export interface SellerSidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isMobile: boolean;
  onClose: () => void;
}

interface MenuItem {
  to: string;
  icon: string;
  label: string;
  badge?: number | null;
  badgeColor?: string;
  permission?: PermissionKey;
  isDeferred?: boolean;
  targetBlank?: boolean;
  featureFlag?: string;
}

interface MenuGroup {
  title: string;
  icon?: string;
  items: MenuItem[];
}

export default function SellerSidebar({ isCollapsed, toggleSidebar, isMobile, onClose }: SellerSidebarProps) {
  const pathname = usePathname() || '';
  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  const [unreadAdminNotifs, setUnreadAdminNotifs] = useState(0);
  const [, setFeatureVersion] = useState(0);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [badges, setBadges] = useState<{
    stores: number;
    products: number;
    orders: number;
    pendingOrders: number;
    businessUpdates: number;
    unreadChat: number;
  }>({ stores: 0, products: 0, orders: 0, pendingOrders: 0, businessUpdates: 0, unreadChat: 0 });

  useEffect(() => {
    let cancelled = false;
    const fetchBadges = async () => {
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

      const counts = { stores: 0, products: 0, orders: 0, pendingOrders: 0, businessUpdates: 0, unreadChat: 0 };
      try {
        const storesRes = await businessApi.getMyStores(bizId);
        if (storesRes.success && Array.isArray(storesRes.data)) counts.stores = storesRes.data.length;
      } catch { /* ignore */ }
      try {
        const reqRes = await businessApi.getMyUpdateRequests();
        if (reqRes.success && reqRes.data) {
          const list = Array.isArray(reqRes.data) ? reqRes.data : (reqRes.data as { data?: unknown[] })?.data || [];
          const unreadKey = `huki_read_req_noti_${bizId}`;
          const deletedKey = `huki_deleted_req_noti_${bizId}`;
          const readMap = JSON.parse(localStorage.getItem(unreadKey) || '{}');
          const deletedMap = JSON.parse(localStorage.getItem(deletedKey) || '{}');
          const unread = list.filter((r: { id?: string }) => r?.id && !deletedMap[r.id] && !readMap[r.id]).length;
          counts.businessUpdates = unread;
        }
      } catch { /* ignore */ }
      try {
        const booksRes = await catalogApi.getPublicBooks({ limit: 100, ...(bizId ? { business: bizId } : {}) });
        if (booksRes.success && Array.isArray(booksRes.data)) {
          const count = bizId
            ? booksRes.data.filter((b: { business?: { id?: string }; businessId?: string }) => (b.business?.id || b.businessId) === bizId).length
            : booksRes.data.length;
          counts.products = count;
        }
      } catch { /* ignore */ }
      try {
        const ordersRes = await orderApi.getSellerOrders(bizId ? { limit: 100, business: bizId } : { limit: 100 });
        if (ordersRes.success && ordersRes.data) {
          const list: Array<{ status?: string }> = Array.isArray(ordersRes.data)
            ? ordersRes.data
            : Array.isArray((ordersRes.data as { items?: unknown[] }).items)
            ? (ordersRes.data as { items: Array<{ status?: string }> }).items
            : [];
          const validOrders = list.filter((o) => o.status !== 'PENDING_PAYMENT');
          const pending = validOrders.filter((o) => o.status === 'PENDING_CONFIRMATION').length;
          counts.orders = validOrders.length;
          counts.pendingOrders = pending;
        }
      } catch { /* ignore */ }
      try {
        const convRes = await chatService.listConversations(bizId);
        if (convRes.success && Array.isArray(convRes.data)) {
          counts.unreadChat = convRes.data.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
        }
      } catch { /* ignore */ }

      if (!cancelled) setBadges(counts);
    };

    fetchBadges();

    const handleSync = () => {
      const bizId = user?.business?.id || activeBusinessId;
      if (!bizId) return;
      try {
        const unreadKey = `huki_read_req_noti_${bizId}`;
        const deletedKey = `huki_deleted_req_noti_${bizId}`;
        const readMap = JSON.parse(localStorage.getItem(unreadKey) || '{}');
        const deletedMap = JSON.parse(localStorage.getItem(deletedKey) || '{}');
        businessApi.getMyUpdateRequests().then((reqRes) => {
          if (reqRes.success && reqRes.data) {
            const list = Array.isArray(reqRes.data) ? reqRes.data : (reqRes.data as { data?: unknown[] })?.data || [];
            const unread = list.filter((r: { id?: string }) => r?.id && !deletedMap[r.id] && !readMap[r.id]).length;
            setBadges((prev) => ({ ...prev, businessUpdates: unread }));
          }
        }).catch(() => {});
      } catch { /* ignore */ }
    };

    window.addEventListener('huki_noti_updated', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('huki_orders_updated', fetchBadges);

    const syncAdminNotifs = () => {
      const bizId = user?.business?.id || activeBusinessId || undefined;
      const sellerCreatedAt = user?.business?.createdAt || user?.createdAt || undefined;
      const notifs = adminNotificationService.getForSeller(bizId, true, sellerCreatedAt);
      const unread = notifs.filter(n => !bizId || !n.readByBusinessIds?.includes(bizId)).length;
      setUnreadAdminNotifs(unread);
    };

    syncAdminNotifs();
    window.addEventListener('huki_admin_notifications_updated', syncAdminNotifs);

    const syncFeatures = () => {
      setFeatureVersion(v => v + 1);
    };
    window.addEventListener('huki_feature_flags_updated', syncFeatures);

    const unsubscribeBus = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'FEATURE_FLAGS_UPDATED') {
        syncFeatures();
      }
      if (msg.type === 'ADMIN_NOTIFICATIONS_UPDATED' || msg.type === 'NOTIFICATION_READ') {
        syncAdminNotifs();
      }
      if (msg.type.startsWith('ORDER_')) {
        fetchBadges();
      }
      if (msg.type === 'CHAT_MESSAGE_RECEIVED' || msg.type === 'CHAT_UNREAD_COUNT_CHANGED') {
        fetchBadges();
      }
    });

    const badgeTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchBadges();
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(badgeTimer);
      window.removeEventListener('huki_noti_updated', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('huki_orders_updated', fetchBadges);
      window.removeEventListener('huki_admin_notifications_updated', syncAdminNotifs);
      window.removeEventListener('huki_feature_flags_updated', syncFeatures);
      unsubscribeBus();
    };
  }, [user, activeBusinessId, setActiveBusinessId]);

  const currentBizId = user?.business?.id || activeBusinessId || undefined;

  // 7 Nhóm phân hệ Accordion chuẩn sàn TMĐT
  const menuGroups: MenuGroup[] = [
    {
      title: 'TỔNG QUAN GIAN HÀNG',
      icon: 'store',
      items: [
        { 
          to: '/seller/dashboard', 
          icon: 'dashboard', 
          label: 'Bảng Tổng Quan (Dashboard)', 
          permission: PERMISSIONS.DASHBOARD_VIEW 
        },
        { 
          to: '/seller/notifications', 
          icon: 'notifications', 
          label: 'Trung Tâm Thông Báo', 
          badge: unreadAdminNotifs || null,
          badgeColor: 'bg-rose-500',
        },
        { 
          to: `/shop/${user?.business?.slug || user?.business?.id || activeBusinessId || 'alpha-books'}`, 
          icon: 'storefront', 
          label: 'Xem Gian Hàng', 
          permission: PERMISSIONS.STORE_VIEW,
          targetBlank: true,
        },
      ]
    },
    {
      title: 'QUẢN LÝ ĐƠN HÀNG',
      icon: 'receipt_long',
      items: [
        { 
          to: '/seller/orders', 
          icon: 'receipt_long', 
          label: 'Tất Cả Đơn Hàng', 
          badge: badges.orders || null, 
          badgeColor: 'bg-amber-600', 
          permission: PERMISSIONS.ORDER_VIEW 
        },
        { 
          to: '/seller/orders?tab=PENDING_CONFIRMATION', 
          icon: 'local_shipping', 
          label: 'Xử Lý & Giao Hàng', 
          badge: badges.pendingOrders || null, 
          badgeColor: 'bg-blue-600', 
          permission: PERMISSIONS.ORDER_PROCESS 
        },
        { 
          to: '/seller/orders?tab=CANCELLED', 
          icon: 'cancel', 
          label: 'Đơn Hủy', 
          permission: PERMISSIONS.ORDER_CANCEL 
        },
        { 
          to: '/seller/returns', 
          icon: 'assignment_return', 
          label: 'Yêu Cầu Đổi Trả', 
          permission: PERMISSIONS.ORDER_VIEW,
          featureFlag: 'RETURNS_MANAGEMENT',
        },
        { 
          to: '/seller/replacement-orders', 
          icon: 'sync_alt', 
          label: 'Đơn Hàng Đổi Mới', 
          permission: PERMISSIONS.ORDER_VIEW 
        },
      ]
    },
    {
      title: 'SẢN PHẨM & TỒN KHO',
      icon: 'menu_book',
      items: [
        { 
          to: '/seller/products', 
          icon: 'menu_book', 
          label: 'Danh Mục Sản Phẩm', 
          badge: badges.products || null, 
          badgeColor: 'bg-emerald-600', 
          permission: PERMISSIONS.PRODUCT_VIEW 
        },
        { 
          to: '/seller/product/create-hybrid', 
          icon: 'add_circle', 
          label: 'Đăng Bán Sách Mới', 
          permission: PERMISSIONS.PRODUCT_CREATE 
        },
        { 
          to: '/seller/product/correction', 
          icon: 'draft', 
          label: 'Danh Sách Sách Nháp', 
          permission: PERMISSIONS.PRODUCT_UPDATE 
        },
        { 
          to: '/seller/inventory', 
          icon: 'inventory', 
          label: 'Quản Lý Tồn Kho (3 Tầng)', 
          permission: PERMISSIONS.INVENTORY_UPDATE,
        }
      ]
    },
    {
      title: 'CHĂM SÓC KHÁCH HÀNG (CRM)',
      icon: 'support_agent',
      items: [
        { 
          to: '/seller/chat', 
          icon: 'chat', 
          label: 'Tin Nhắn & Chat', 
          targetBlank: true,
          permission: PERMISSIONS.STORE_VIEW,
          featureFlag: 'CUSTOMER_CHAT',
          badge: badges.unreadChat || null,
          badgeColor: 'bg-rose-500',
        },
        { 
          to: '/seller/reviews', 
          icon: 'rate_review', 
          label: 'Đánh Giá & Nhận Xét', 
          permission: PERMISSIONS.STORE_VIEW 
        },
        { 
          to: '/seller/followers', 
          icon: 'group', 
          label: 'Người Theo Dõi', 
          permission: PERMISSIONS.STORE_VIEW 
        },
      ]
    },
    {
      title: 'CÔNG CỤ MARKETING',
      icon: 'campaign',
      items: [
        { 
          to: '/seller/promotions/discounts', 
          icon: 'sell', 
          label: 'Giảm Giá Tự Do', 
          permission: PERMISSIONS.PRODUCT_UPDATE,
          featureFlag: 'DISCOUNTS',
        },
        { 
          to: '/seller/promotions/vouchers', 
          icon: 'confirmation_number', 
          label: 'Voucher Giảm Giá', 
          permission: PERMISSIONS.PRODUCT_UPDATE,
          featureFlag: 'VOUCHERS',
        },
        { 
          to: '/seller/promotions/flash-sale', 
          icon: 'bolt', 
          label: 'Flash Sale (Giờ Vàng)', 
          permission: PERMISSIONS.PRODUCT_UPDATE,
          featureFlag: 'FLASH_SALE',
        }
      ]
    },
    {
      title: 'VÍ & TÀI CHÍNH',
      icon: 'account_balance_wallet',
      items: [
        { 
          to: '/seller/finance', 
          icon: 'account_balance_wallet', 
          label: 'Số Dư Ví & Rút Tiền', 
          permission: PERMISSIONS.FINANCE_VIEW,
          featureFlag: 'WITHDRAWALS',
        },
        { 
          to: '/seller/escrow', 
          icon: 'hourglass_top', 
          label: 'Tiền Chờ Quyết Toán', 
          permission: PERMISSIONS.FINANCE_VIEW 
        },
        { 
          to: '/seller/reports', 
          icon: 'analytics', 
          label: 'Báo Cáo Doanh Thu & Sổ Cái', 
          permission: PERMISSIONS.FINANCE_VIEW 
        }
      ]
    },
    {
      title: 'THIẾT LẬP SHOP',
      icon: 'settings',
      items: [
        { 
          to: '/seller/business', 
          icon: 'domain', 
          label: 'Hồ Sơ Cửa Hàng & Doanh Nghiệp', 
          badge: badges.businessUpdates || null,
          badgeColor: 'bg-rose-600',
          permission: PERMISSIONS.STORE_VIEW 
        },
        { 
          to: '/seller/staff', 
          icon: 'badge', 
          label: 'Danh Sách Nhân Viên', 
          permission: PERMISSIONS.MEMBER_VIEW,
          featureFlag: 'STAFF_MANAGEMENT',
        },
        { 
          to: '/seller/staff?action=provision', 
          icon: 'admin_panel_settings', 
          label: 'Quản Trị Phân Quyền', 
          permission: PERMISSIONS.MEMBER_MANAGE 
        }
      ]
    }
  ];

  // Tự động mở accordion của nhóm chứa route hiện tại
  useEffect(() => {
    const nextOpen: Record<string, boolean> = {};
    menuGroups.forEach((group) => {
      const hasActive = group.items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
      if (hasActive) {
        nextOpen[group.title] = true;
      }
    });
    setOpenGroups((prev) => ({ ...prev, ...nextOpen }));
  }, [pathname]);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const visibleMenuGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.isDeferred && !item.permission) return true;
        if (item.permission) {
          const hasPerm = can(item.permission, currentBizId, user);
          if (!hasPerm) return false;
        }
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const currentFullUrl = pathname;

  return (
    <aside 
      className={`bg-white text-slate-800 border-r border-[#00875A]/20 flex flex-col justify-between shrink-0 h-[calc(100vh-54px)] sticky top-[54px] overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out select-none shadow-2xs z-20 custom-scrollbar ${
        isCollapsed ? 'w-[64px] p-2' : 'w-[250px] p-3'
      }`}
    >
      <div className="space-y-3">
        {/* Mobile Header with Close button */}
        {isMobile && (
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 -m-3 mb-3">
            <div className="flex flex-col select-none">
              <div className="flex items-center gap-1.5">
                <span className="font-editorial text-base font-black tracking-tight text-[#003B2B] leading-none">
                  HUKI EBOOK
                </span>
                <span className="bg-[#003B2B] text-white text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider">
                  SELLER
                </span>
              </div>
              <span className="text-[7.5px] uppercase tracking-widest text-[#006953] font-bold mt-0.5">
                Kênh NXB &amp; Tác Giả
              </span>
            </div>
            <button 
              type="button" 
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              title="Đóng menu"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {visibleMenuGroups.map((group, gIdx) => {
          const isGroupOpen = openGroups[group.title] ?? true;
          const hasActiveChild = group.items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

          return (
            <div key={gIdx} className="space-y-0.5">
              {/* Group Title or Accordion Header */}
              {isCollapsed ? (
                <div className="my-2 border-t border-[#00875A]/15" title={group.title}></div>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className={`w-full px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-between select-none cursor-pointer transition-colors ${
                    hasActiveChild ? 'text-[#00875A] bg-[#00875A]/8' : 'text-slate-500 hover:text-[#00875A] hover:bg-slate-50'
                  }`}
                  title={`Bấm để ${isGroupOpen ? 'thu gọn' : 'mở rộng'} ${group.title}`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {group.icon && <span className="material-symbols-outlined text-[14px]">{group.icon}</span>}
                    <span className="truncate">{group.title}</span>
                  </div>
                  <span className={`material-symbols-outlined text-[14px] transition-transform duration-200 ${isGroupOpen ? 'rotate-180 text-[#00875A]' : 'text-slate-400'}`}>
                    expand_more
                  </span>
                </button>
              )}

              {(isCollapsed || isGroupOpen) && (
                <div className={`space-y-1 ${!isCollapsed ? 'pl-1 pr-0.5 mt-0.5 animate-in fade-in-0 duration-200' : ''}`}>
              {group.items.map((item, iIdx) => {
                if (item.isDeferred) {
                  return (
                    <div key={iIdx} className="relative group">
                      {isCollapsed ? (
                        <div className="flex items-center justify-center py-0.5">
                          <div className="flex items-center justify-center w-10 h-10 rounded-xl opacity-40 text-slate-400 cursor-not-allowed">
                            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                          </div>
                          <div className="opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 absolute left-full ml-2.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap z-50">
                            {item.label} (Sắp ra mắt)
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium opacity-40 text-slate-400 cursor-not-allowed">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="material-symbols-outlined text-[19px] shrink-0">{item.icon}</span>
                            <span className="truncate">{item.label}</span>
                          </div>
                          <span className="text-[8.5px] px-1.5 py-0.2 rounded font-bold text-slate-400 bg-slate-100 border border-slate-200 whitespace-nowrap shrink-0 ml-1.5">
                            Sớm
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }

                // Check Feature Flag status
                const featCheck = item.featureFlag
                  ? featureFlagsService.isFeatureAccessible(item.featureFlag, currentBizId)
                  : { accessible: true };
                const isFeatureDisabled = !featCheck.accessible;

                if (isFeatureDisabled) {
                  const isTenantRestricted = featCheck.reason?.includes('giới hạn') || featCheck.reason?.includes('quyền truy cập');
                  const badgeText = isTenantRestricted ? 'Giới hạn' : 'Bảo trì';
                  const badgeClasses = isTenantRestricted
                    ? 'text-rose-800 bg-rose-100 border border-rose-200'
                    : 'text-amber-800 bg-amber-100 border border-amber-200';

                  return (
                    <div key={iIdx} className="relative group/dis">
                      {isCollapsed ? (
                        <div className="flex items-center justify-center py-0.5">
                          <div className="flex items-center justify-center w-10 h-10 rounded-xl opacity-40 text-slate-400 bg-slate-100/70 cursor-not-allowed">
                            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                          </div>
                          <div className="opacity-0 pointer-events-none group-hover/dis:opacity-100 transition-opacity duration-150 absolute left-full ml-2.5 px-3 py-2 bg-slate-900 text-white text-xs rounded-xl shadow-2xl border border-slate-700 w-60 z-[9999]">
                            <div className={`font-bold mb-0.5 ${isTenantRestricted ? 'text-rose-300' : 'text-amber-300'}`}>
                              {item.label} ({badgeText})
                            </div>
                            <div className="text-[10.5px] text-slate-300 font-normal leading-relaxed">{featCheck.reason || 'Đang bảo trì nâng cấp'}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[12.5px] bg-slate-50/70 border border-slate-200/50 cursor-not-allowed select-none relative">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 opacity-45 text-slate-400">
                            <span className="material-symbols-outlined text-[19px] shrink-0">{item.icon}</span>
                            <span className="truncate leading-none">{item.label}</span>
                          </div>
                          <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap shrink-0 ${badgeClasses}`}>
                            {badgeText}
                          </span>

                          {/* Floating Tooltip to the right: Solid background, no bleed-through, doesn't cover other menu items */}
                          <div className="opacity-0 pointer-events-none group-hover/dis:opacity-100 transition-all duration-150 absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3.5 py-2.5 bg-slate-900 text-white text-[11px] rounded-xl shadow-2xl border border-slate-700 whitespace-normal w-64 z-[9999] leading-relaxed">
                            <div className={`font-bold flex items-center gap-1.5 mb-1 ${isTenantRestricted ? 'text-rose-400' : 'text-amber-400'}`}>
                              <span className="material-symbols-outlined text-sm">{isTenantRestricted ? 'block' : 'build'}</span>
                              <span>{isTenantRestricted ? 'Giới Hạn Truy Cập' : 'Tạm Bảo Trì'}</span>
                            </div>
                            <div className="text-slate-300 text-[10.5px] leading-relaxed">
                              {featCheck.reason || 'Tính năng đang được nâng cấp bởi Ban quản trị sàn'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                const isItemActive = pathname === item.to || (item.to !== '/seller/dashboard' && pathname.startsWith(item.to + '/'));

                return (
                  <div key={iIdx} className="relative group">
                    {isCollapsed ? (
                      /* Collapsed View - Centered w-10 h-10 with floating tooltip */
                      <div className="flex items-center justify-center py-0.5">
                        <Link
                          href={item.to}
                          target={item.targetBlank ? '_blank' : undefined}
                          rel={item.targetBlank ? 'noopener noreferrer' : undefined}
                          className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 relative shrink-0 active:scale-95 ${
                            isItemActive
                              ? 'bg-[#00875A] text-white shadow-xs font-bold'
                              : 'text-slate-600 hover:bg-[#00875A]/10 hover:text-[#00875A] border border-transparent'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
                          {item.badge && item.badge > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                          )}
                        </Link>

                        {/* Floating Tooltip */}
                        <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 absolute left-full ml-2.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap z-50 flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9.5px] font-black">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Expanded View */
                      <Link
                        href={item.to}
                        target={item.targetBlank ? '_blank' : undefined}
                        rel={item.targetBlank ? 'noopener noreferrer' : undefined}
                        onClick={isMobile ? onClose : undefined}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[12.5px] transition-all duration-150 shrink-0 select-none active:scale-[0.98] ${
                          isItemActive
                            ? 'bg-[#00875A] text-white font-bold shadow-xs'
                            : 'text-slate-700 font-semibold hover:bg-[#00875A]/8 hover:text-[#00875A] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className={`material-symbols-outlined text-[19px] shrink-0 ${isItemActive ? 'text-white' : 'text-slate-500 group-hover:text-[#00875A]'}`}>
                            {item.icon}
                          </span>
                          <span className="truncate leading-none min-w-0">{item.label}</span>
                        </div>

                        {item.badge && item.badge > 0 && (
                          <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black whitespace-nowrap shrink-0 ${
                            isItemActive
                              ? 'bg-white/25 text-white'
                              : 'bg-rose-500 text-white shadow-2xs'
                          }`}>
                            {item.badge}
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

      {/* Sidebar Bottom Controls */}
      <div className="p-2.5 border-t border-[#00875A]/15 bg-slate-50/70 flex flex-col gap-1 shrink-0 -mx-3 -mb-3 mt-auto">
        {!isMobile && (
          <button
            type="button"
            onClick={toggleSidebar}
            className={`w-full flex items-center rounded-xl text-xs font-semibold text-slate-600 hover:text-[#00875A] hover:bg-[#00875A]/10 transition-all cursor-pointer ${
              isCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2'
            }`}
            title={isCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                {isCollapsed ? 'last_page' : 'first_page'}
              </span>
              {!isCollapsed && <span className="text-[12px]">Thu gọn thanh bên</span>}
            </div>
          </button>
        )}
      </div>
    </aside>
  );
}

