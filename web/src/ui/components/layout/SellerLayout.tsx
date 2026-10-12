import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import SellerFooter from './SellerFooter';
import SellerHeader from './SellerHeader';
import SellerSidebar from './SellerSidebar';
import SellerTopNoticeBar from '../seller/SellerTopNoticeBar';
import { featureFlagsService } from '@/ui/services/featureFlagsService';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { AdminBroadcastNotification } from '@/ui/services/adminNotificationService';
import { orderApi, SellerOrder } from '@/ui/api/orderApi';

export interface SellerLayoutProps {
  children?: React.ReactNode;
}

const ROUTE_FEATURE_MAP: Record<string, string> = {
  '/seller/promotions/flash-sale': 'FLASH_SALE',
  '/seller/promotions/vouchers': 'VOUCHERS',
  '/seller/promotions/discounts': 'DISCOUNTS',
  '/seller/product/create-ebook': 'DIGITAL_PUBLISHING',
  '/seller/inventory': 'BULK_UPLOAD',
  '/seller/finance': 'WITHDRAWALS',
  '/seller/returns': 'RETURNS_MANAGEMENT',
  '/seller/staff': 'STAFF_MANAGEMENT',
  '/seller/chat': 'CUSTOMER_CHAT',
};

export default function SellerLayout({ children }: SellerLayoutProps = {}) {
  const pathname = usePathname() || '';
  const { user, activeBusinessId } = useAuth();
  const currentBizId = user?.business?.id || activeBusinessId || undefined;

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [featureCheck, setFeatureCheck] = useState<{ accessible: boolean; reason?: string }>({ accessible: true });

  const { showToast } = useToast();
  const lastBroadcastTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const handleBroadcastUpdate = (msg: { type: string; payload?: unknown }) => {
      if (msg.type === 'ADMIN_NOTIFICATIONS_UPDATED' && Array.isArray(msg.payload)) {
        const notifs = msg.payload as AdminBroadcastNotification[];
        const activeNotifs = notifs.filter(n => n.status === 'ACTIVE');
        if (activeNotifs.length > 0) {
          const latest = activeNotifs[0];
          const createdTime = new Date(latest.createdAt).getTime();
          if (createdTime > lastBroadcastTimeRef.current) {
            lastBroadcastTimeRef.current = createdTime;
            const isTargeted =
              latest.targetType === 'ALL' ||
              (latest.targetType === 'DIRECT' && currentBizId && latest.targetBusinessIds?.includes(currentBizId)) ||
              (latest.targetType === 'SEGMENT');

            if (isTargeted) {
              showToast({
                type: latest.severity === 'CRITICAL' ? 'warning' : 'system',
                title: latest.title,
                message: latest.summary,
                actionUrl: latest.actionUrl || `/seller/notifications?id=${latest.id}`,
                actionLabel: latest.actionLabel || 'Xem chi tiết',
                playSound: true,
              });
            }
          }
        }
      }

      if (msg.type === 'ORDER_CREATED' || msg.type === 'ORDER_PAYMENT_SUCCEEDED') {
        if (!pathname.startsWith('/seller/orders')) {
          const payload = msg.payload as any;
          const code = payload?.orderCode || payload?.orderId || '';
          showToast({
            type: 'order',
            title: 'Nổ đơn hàng mới!',
            message: code ? `Đơn hàng #${code} vừa được đặt thành công.` : 'Có đơn hàng mới vừa cập nhật trên sàn.',
            playSound: true,
            actionUrl: '/seller/orders?tab=PENDING_CONFIRMATION',
            actionLabel: 'Xem đơn hàng',
          });
        }
      }
    };

    const unsubscribe = realtimeSyncBus.subscribe(handleBroadcastUpdate);
    return () => {
      unsubscribe();
    };
  }, [currentBizId, showToast, pathname]);

  // Global background check for new incoming orders across all Seller Portal pages
  const knownGlobalOrderStatusesRef = useRef<Map<string, string>>(new Map());
  const isGlobalInitialLoadRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;

    const checkGlobalOrders = async () => {
      // If already on /seller/orders, the orders page handles its own live refresh
      if (pathname.startsWith('/seller/orders')) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

      try {
        const res = await orderApi.getSellerOrders(currentBizId ? { limit: 20, business: currentBizId } : { limit: 20 });
        if (isCancelled || !res.success || !res.data) return;

        const raw = res.data as unknown;
        const items: SellerOrder[] = Array.isArray(raw)
          ? (raw as SellerOrder[])
          : Array.isArray((raw as { data?: SellerOrder[] })?.data)
          ? ((raw as { data: SellerOrder[] }).data)
          : Array.isArray((raw as { items?: SellerOrder[] })?.items)
          ? ((raw as { items: SellerOrder[] }).items)
          : [];

        if (isGlobalInitialLoadRef.current) {
          items.forEach((o) => {
            const prevStatus = knownGlobalOrderStatusesRef.current.get(o.id);
            const code = o.code || o.id.slice(0, 8);
            const amountStr = o.grandTotal ? Number(o.grandTotal).toLocaleString('vi-VN') + ' đ' : '';

            if (!prevStatus) {
              const isPending = o.status === 'PENDING_PAYMENT';
              showToast({
                type: 'order',
                title: isPending ? 'Đơn hàng mới (Chờ thanh toán QR)!' : 'Nổ đơn hàng mới!',
                message: `Đơn hàng #${code} vừa được tạo (${amountStr}).`,
                playSound: true,
                actionUrl: `/seller/orders?tab=${o.status}`,
                actionLabel: 'Xem đơn hàng',
              });
            } else if (prevStatus === 'PENDING_PAYMENT' && o.status !== 'PENDING_PAYMENT' && o.status !== 'CANCELLED') {
              showToast({
                type: 'order',
                title: 'Nổ đơn hàng mới (Đã thanh toán)!',
                message: `Đơn hàng #${code} đã thanh toán thành công (${amountStr}). Chuẩn bị đóng gói ngay!`,
                playSound: true,
                actionUrl: `/seller/orders?tab=${o.status}`,
                actionLabel: 'Xử lý ngay',
              });
            }
          });
        }

        items.forEach((o) => knownGlobalOrderStatusesRef.current.set(o.id, o.status));
        isGlobalInitialLoadRef.current = true;
      } catch {
        // ignore background poll errors
      }
    };

    // Run first check
    checkGlobalOrders();

    const timer = setInterval(checkGlobalOrders, 5000);
    return () => {
      isCancelled = true;
      clearInterval(timer);
    };
  }, [currentBizId, pathname, showToast]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen(prev => !prev);
  };

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  const isChatPage = pathname.startsWith('/seller/chat');
  const isProductFormPage = pathname.includes('/seller/product/create') || 
                             pathname.includes('/seller/product/edit') ||
                             pathname.includes('/seller/product/correction');

  // Check if current page is disabled by Admin Kill-Switch / Tenant Override
  useEffect(() => {
    const evaluateAccess = () => {
      const matchedKey = Object.keys(ROUTE_FEATURE_MAP).find((route) => pathname.startsWith(route));
      if (matchedKey) {
        const featId = ROUTE_FEATURE_MAP[matchedKey];
        const check = featureFlagsService.isFeatureAccessible(featId, currentBizId);
        setFeatureCheck(check);
      } else {
        setFeatureCheck({ accessible: true });
      }
    };

    evaluateAccess();

    window.addEventListener('huki_feature_flags_updated', evaluateAccess);
    const unsubscribe = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'FEATURE_FLAGS_UPDATED') {
        evaluateAccess();
      }
    });

    return () => {
      window.removeEventListener('huki_feature_flags_updated', evaluateAccess);
      unsubscribe();
    };
  }, [pathname, currentBizId]);

  return (
    <div className={`seller-portal bg-[#F8FAFC] text-slate-800 flex flex-col font-sans antialiased ${isChatPage ? 'h-screen max-h-screen overflow-hidden' : 'min-h-dvh'}`}>
      <SellerHeader 
        isSidebarCollapsed={isSidebarCollapsed} 
        toggleSidebar={toggleSidebar} 
        toggleMobileSidebar={toggleMobileSidebar}
      />

      {/* WordPress-style Top Announcement Notice Bar */}
      <SellerTopNoticeBar />

      <div className={`flex flex-1 min-w-0 relative ${isChatPage ? 'overflow-hidden min-h-0' : ''}`}>
        {/* Desktop Sidebar */}
        <div className="hidden lg:block shrink-0">
          <SellerSidebar 
            isCollapsed={isSidebarCollapsed} 
            toggleSidebar={toggleSidebar}
            isMobile={false}
            onClose={() => {}}
          />
        </div>

        {/* Mobile Slide-over Drawer */}
        {isMobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" 
              onClick={closeMobileSidebar}
              aria-hidden="true"
            />
            {/* Drawer Content */}
            <div className="relative z-10 w-72 bg-white shadow-2xl h-full flex flex-col">
              <SellerSidebar 
                isCollapsed={false} 
                toggleSidebar={closeMobileSidebar}
                isMobile={true}
                onClose={closeMobileSidebar}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className={`min-w-0 flex-1 flex flex-col transition-all duration-300 ${isChatPage ? 'overflow-hidden min-h-0' : ''}`}>
          <main id="main-content" className={`flex-1 min-w-0 ${isChatPage ? 'overflow-hidden min-h-0 flex flex-col p-0' : 'p-3.5 sm:p-5 lg:p-6'}`}>
            {!featureCheck.accessible ? (
              /* Block Screen when Feature is globally disabled or business-restricted */
              <div className="max-w-2xl mx-auto my-12 bg-white border border-amber-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
                  <span className="material-symbols-outlined text-3xl">construction</span>
                </div>
                <div className="space-y-2">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                    Bảo Trì &amp; Giới Hạn Tính Năng
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    Tính Năng Đang Tạm Dừng Hoạt Động
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                    {featureCheck.reason || 'Tính năng này hiện đang được nâng cấp bởi Ban quản trị sàn HUKI hoặc chưa khả dụng cho gian hàng của bạn.'}
                  </p>
                </div>
                <div className="pt-3 flex items-center justify-center gap-3">
                  <Link
                    href="/seller/dashboard"
                    className="bg-[#00875A] hover:bg-[#00704A] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm inline-flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">dashboard</span>
                    <span>Về Bảng Tổng Quan</span>
                  </Link>
                  <Link
                    href="/seller/notifications"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">campaign</span>
                    <span>Xem Bản Tin Sàn</span>
                  </Link>
                </div>
              </div>
            ) : (
              children
            )}
          </main>
          {!isChatPage && !isProductFormPage && <SellerFooter />}
        </div>
      </div>
    </div>
  );
}

