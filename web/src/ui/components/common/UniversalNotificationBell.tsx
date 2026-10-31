'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { soundEffects } from '../../utils/soundEffects';
import { useRealtimeNotifications, RealtimeNotification } from '../../hooks/useRealtimeNotifications';
import { orderApi, SellerOrder } from '../../api/orderApi';

export interface UniversalNotificationBellProps {
  variant?: 'user' | 'seller' | 'shipper' | 'admin';
  fullPageRoute?: string;
  className?: string;
}

type TabType = 'ALL' | 'UNREAD' | 'PENDING_ORDER';
type NotificationCategory = 'ALL' | 'ORDER' | 'REVIEW' | 'DELIVERY' | 'PAYMENT' | 'SYSTEM';
type GridDensity = 'auto' | '2' | '4' | '6';

export default function UniversalNotificationBell({
  variant = 'user',
  fullPageRoute,
  className = '',
}: UniversalNotificationBellProps) {
  const router = useRouter();
  const { user, hasPermission, can } = useAuth();
  const { showToast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isGridOpen, setIsGridOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('ALL');
  const [gridDensity, setGridDensity] = useState<GridDensity>('auto');

  // Modal navigation
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [modalNotifications, setModalNotifications] = useState<RealtimeNotification[]>([]);
  const [isDualView, setIsDualView] = useState(false);

  // Multi-select state (tương tự Facebook)
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Queue animation state: ID các thẻ đang chạy animation slide ngang qua và thẻ đã xử lý
  const [animatingOutIds, setAnimatingOutIds] = useState<Set<string>>(new Set());
  const [processedOrderIds, setProcessedOrderIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // -------------------------------------------------------------------------
  // 1. PHÂN QUYỀN CHUẨN CHỈNH (STRICT ROLE & PERMISSION ENFORCEMENT)
  // -------------------------------------------------------------------------
  const isSeller = variant === 'seller';
  const isAdmin = variant === 'admin' || user?.role === 'PLATFORM_ADMIN' || user?.role === 'ADMIN';
  const isShipper = variant === 'shipper' || user?.role === 'SHIPPER';

  // Quyền xử lý và duyệt đơn hàng: chỉ seller / owner hoặc nhân sự có quyền ORDER_PROCESS
  const canConfirmOrders = useMemo(() => {
    if (!isSeller) return false;
    if (!user) return false;
    if (user.role === 'PLATFORM_ADMIN' || user.role === 'BUSINESS') return true;
    return can('ORDER_PROCESS') || hasPermission('ORDER_PROCESS');
  }, [isSeller, user, can, hasPermission]);

  // Quyền hủy đơn hàng
  const canCancelOrders = useMemo(() => {
    if (!isSeller) return false;
    if (!user) return false;
    if (user.role === 'PLATFORM_ADMIN' || user.role === 'BUSINESS') return true;
    return can('ORDER_CANCEL') || hasPermission('ORDER_CANCEL');
  }, [isSeller, user, can, hasPermission]);

  // Map variant sang recipientType backend chuẩn
  const recipientType = useMemo(() => {
    switch (variant) {
      case 'seller':
        return 'BUSINESS' as const;
      case 'shipper':
        return 'DELIVERY' as const;
      case 'admin':
        return 'ADMIN' as const;
      case 'user':
      default:
        return 'USER' as const;
    }
  }, [variant]);

  // -------------------------------------------------------------------------
  // 2. FETCH THÔNG BÁO TỪ HOOK
  // CHÚ Ý: KHÔNG truyền isReadFilter vào hook để tránh việc tab "Tất cả" bị reset về 0!
  // Toàn bộ 20-50 thông báo được giữ trọn vẹn trong RAM và lọc mượt mà client-side.
  // -------------------------------------------------------------------------
  const {
    notifications,
    unreadCount,
    totalCount,
    hasMore,
    isLoading,
    isLoadingMore,
    markAsRead,
    bulkMarkAsRead,
    deleteNotification,
    bulkDelete,
    markAllAsRead,
    loadMore,
    refresh,
  } = useRealtimeNotifications({
    recipientType,
    limit: 50,
  });

  // Route dẫn tới Trung tâm thông báo đầy đủ
  const defaultFullPage =
    fullPageRoute ||
    (variant === 'seller'
      ? '/seller/notifications'
      : variant === 'shipper'
      ? '/shipper/notifications'
      : variant === 'admin'
      ? '/admin/notifications'
      : '/account/notifications');

  // Tiêu đề tương ứng theo vai trò
  const portalTitle = useMemo(() => {
    switch (variant) {
      case 'seller':
        return 'Thông Báo Kênh Bán';
      case 'shipper':
        return 'Thông Báo Bưu Tá';
      case 'admin':
        return 'Thông Báo Hệ Thống';
      case 'user':
      default:
        return 'Thông Báo Của Bạn';
    }
  }, [variant]);

  // -------------------------------------------------------------------------
  // 3. HÀM PHÂN LOẠI THỂ LOẠI THÔNG BÁO (CATEGORY CLASSIFICATION)
  // -------------------------------------------------------------------------
  const getNotificationCategory = useCallback((n: RealtimeNotification): NotificationCategory => {
    const type = (n.type || '').toUpperCase();
    if (type.includes('ORDER')) return 'ORDER';
    if (type.includes('REVIEW') || type.includes('RATING') || type.includes('FEEDBACK')) return 'REVIEW';
    if (type.includes('SHIP') || type.includes('DELIVERY')) return 'DELIVERY';
    if (type.includes('PAYMENT') || type.includes('WALLET') || type.includes('ESCROW')) return 'PAYMENT';
    if (type.includes('SECURITY') || type.includes('SANCTION') || n.priority === 'CRITICAL' || n.category === 'AUTO_WATCHDOG') return 'SYSTEM';
    return 'SYSTEM';
  }, []);

  // Kiểm tra thông báo có phải đơn chờ duyệt hay không
  const isPendingOrderNotif = useCallback((n: RealtimeNotification): boolean => {
    if (processedOrderIds.has(n.id)) return false;
    const cat = getNotificationCategory(n);
    if (cat !== 'ORDER') return false;
    const payload = (n.payload || {}) as Record<string, any>;
    const status = payload.status || payload.orderStatus;
    if (status && status !== 'PENDING_CONFIRMATION') return false;
    return true;
  }, [getNotificationCategory, processedOrderIds]);

  // Đếm số lượng thông báo theo từng danh mục
  const categoryCounts = useMemo(() => {
    let orderCount = 0;
    let reviewCount = 0;
    let deliveryCount = 0;
    let paymentCount = 0;
    let systemCount = 0;
    let pendingOrderCount = 0;

    notifications.forEach((n) => {
      const cat = getNotificationCategory(n);
      if (cat === 'ORDER') {
        orderCount++;
        if (isPendingOrderNotif(n)) pendingOrderCount++;
      } else if (cat === 'REVIEW') {
        reviewCount++;
      } else if (cat === 'DELIVERY') {
        deliveryCount++;
      } else if (cat === 'PAYMENT') {
        paymentCount++;
      } else {
        systemCount++;
      }
    });

    return {
      all: totalCount || notifications.length,
      unread: unreadCount,
      order: orderCount,
      pendingOrder: pendingOrderCount,
      review: reviewCount,
      delivery: deliveryCount,
      payment: paymentCount,
      system: systemCount,
    };
  }, [notifications, totalCount, unreadCount, getNotificationCategory, isPendingOrderNotif]);

  // -------------------------------------------------------------------------
  // 4. DANH SÁCH THÔNG BÁO LỌC THEO TAB & THỂ LOẠI (CLIENT-SIDE FILTER)
  // KHÔNG làm mất danh sách gốc, tab "Tất cả" luôn giữ nguyên số đếm thật!
  // -------------------------------------------------------------------------
  const displayedNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // 1. Lọc theo Tab
      if (activeTab === 'UNREAD' && n.isRead) return false;
      if (activeTab === 'PENDING_ORDER' && !isPendingOrderNotif(n)) return false;

      // 2. Lọc theo Thể loại (Category)
      if (selectedCategory !== 'ALL') {
        const cat = getNotificationCategory(n);
        if (cat !== selectedCategory) return false;
      }

      return true;
    });
  }, [notifications, activeTab, selectedCategory, isPendingOrderNotif, getNotificationCategory]);

  // -------------------------------------------------------------------------
  // 5. THAO TÁC CHỌN NHIỀU (MULTI-SELECT NHƯ FACEBOOK)
  // -------------------------------------------------------------------------
  const toggleSelectNotification = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const selectAllDisplayed = useCallback(() => {
    const displayedIds = displayedNotifications.map((n) => n.id);
    setSelectedIds(displayedIds);
  }, [displayedNotifications]);

  const deselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleBulkMarkRead = async () => {
    if (selectedIds.length === 0) return;
    const ids = [...selectedIds];
    deselectAll();
    await bulkMarkAsRead(ids);
    showToast({
      title: 'Đã cập nhật',
      message: `Đã đánh dấu ${ids.length} thông báo là đã đọc`,
      type: 'success',
    });
  };

  const handleBulkDeleteItems = async () => {
    if (selectedIds.length === 0) return;
    const ids = [...selectedIds];
    deselectAll();
    await bulkDelete(ids);
    showToast({
      title: 'Đã xóa',
      message: `Đã xóa ${ids.length} thông báo khỏi danh sách`,
      type: 'info',
    });
  };

  // -------------------------------------------------------------------------
  // 6. XÁC NHẬN NHANH ĐƠN HÀNG VỚI ANIMATION CHẠY NGANG & THẺ TIẾP THEO LẤP VÀO
  // -------------------------------------------------------------------------
  const handleConfirmSingleOrderWithAnimation = useCallback(async (
    notification: RealtimeNotification,
    sellerOrderId: string | null,
    orderCode: string | null
  ) => {
    if (!canConfirmOrders) {
      showToast({
        title: 'Từ chối quyền truy cập',
        message: 'Bạn không có quyền ORDER_PROCESS để xác nhận đơn hàng!',
        type: 'error',
      });
      return;
    }

    const notifId = notification.id;
    const targetId = sellerOrderId;

    if (!targetId && !orderCode) {
      showToast({
        title: 'Không thể xác nhận',
        message: 'Không tìm thấy ID đơn hàng trong thông báo này.',
        type: 'warning',
      });
      return;
    }

    try {
      // 1. Bật animation chạy ngang slide qua phải
      setAnimatingOutIds((prev) => new Set([...prev, notifId]));
      soundEffects.playOrderChime();

      // 2. Gọi API xác nhận đơn hàng
      let confirmPromise: Promise<any>;
      if (targetId) {
        confirmPromise = orderApi.confirmOrder(targetId);
      } else {
        // Tìm và xác nhận theo orderCode
        const searchRes = await orderApi.getSellerOrders({ search: orderCode!, limit: 1 });
        const found = searchRes.data?.items?.[0];
        if (found?.id) {
          confirmPromise = orderApi.confirmOrder(found.id);
        } else {
          throw new Error('Không tìm thấy đơn hàng cần xác nhận');
        }
      }

      await confirmPromise;

      // 3. Đánh dấu thông báo là đã đọc
      if (!notification.isRead) {
        markAsRead(notifId);
      }

      // 4. Toast báo thành công
      showToast({
        title: 'Đã duyệt đơn hàng thành công!',
        message: `Đơn hàng #${orderCode || targetId?.slice(0, 8)} đã được chuyển sang trạng thái ĐÃ XÁC NHẬN.`,
        type: 'order',
      });

      // 5. Sau khi animation slide ngang hoàn tất (450ms):
      // Đưa notifId vào processedOrderIds để thẻ biến mất khỏi hàng chờ và thẻ tiếp theo lấp vô!
      setTimeout(() => {
        setProcessedOrderIds((prev) => new Set([...prev, notifId]));
        setAnimatingOutIds((prev) => {
          const next = new Set(prev);
          next.delete(notifId);
          return next;
        });
      }, 450);
    } catch (err: any) {
      // Rollback animation nếu có lỗi
      setAnimatingOutIds((prev) => {
        const next = new Set(prev);
        next.delete(notifId);
        return next;
      });
      showToast({
        title: 'Lỗi khi xác nhận đơn',
        message: err?.message || 'Có lỗi xảy ra khi xác nhận đơn hàng.',
        type: 'error',
      });
    }
  }, [canConfirmOrders, markAsRead, showToast]);

  // Xác nhận hàng loạt các đơn đã chọn (Bulk Confirm Orders)
  const handleBulkConfirmSelectedOrders = useCallback(async () => {
    if (!canConfirmOrders) {
      showToast({
        title: 'Từ chối quyền truy cập',
        message: 'Bạn không có quyền ORDER_PROCESS để xác nhận đơn hàng!',
        type: 'error',
      });
      return;
    }

    const selectedNotifs = displayedNotifications.filter(
      (n) => selectedIds.includes(n.id) && isPendingOrderNotif(n)
    );

    if (selectedNotifs.length === 0) {
      showToast({
        title: 'Không có đơn chờ duyệt',
        message: 'Các thông báo bạn chọn không có đơn hàng nào ở trạng thái chờ xác nhận.',
        type: 'info',
      });
      return;
    }

    setBulkProcessing(true);
    soundEffects.playOrderChime();

    // Kích hoạt animation chạy ngang so le (staggered animation) cho các thẻ
    selectedNotifs.forEach((n, idx) => {
      setTimeout(() => {
        setAnimatingOutIds((prev) => new Set([...prev, n.id]));
      }, idx * 80);
    });

    try {
      let successCount = 0;
      for (const n of selectedNotifs) {
        const payload = (n.payload || {}) as Record<string, any>;
        const orderId =
          payload.sellerOrderId ||
          payload.sellerOrders?.[0]?.sellerOrderId ||
          n.actionUrl?.match(/\/seller\/orders\/([0-9a-fA-F-]+)/)?.[1];
        const orderCode =
          payload.orderCode ||
          n.title?.match(/(ORD-[A-Za-z0-9-]+)/i)?.[1] ||
          n.message?.match(/(ORD-[A-Za-z0-9-]+)/i)?.[1];

        if (orderId) {
          await orderApi.confirmOrder(orderId);
          successCount++;
        } else if (orderCode) {
          const res = await orderApi.getSellerOrders({ search: orderCode, limit: 1 });
          if (res.data?.items?.[0]?.id) {
            await orderApi.confirmOrder(res.data.items[0].id);
            successCount++;
          }
        }
        if (!n.isRead) {
          markAsRead(n.id);
        }
      }

      setTimeout(() => {
        setProcessedOrderIds((prev) => new Set([...prev, ...selectedNotifs.map((n) => n.id)]));
        setAnimatingOutIds((prev) => {
          const next = new Set(prev);
          selectedNotifs.forEach((n) => next.delete(n.id));
          return next;
        });
        deselectAll();
        setBulkProcessing(false);
      }, 500);

      showToast({
        title: 'Duyệt hàng loạt thành công!',
        message: `Đã xác nhận thành công ${successCount} đơn hàng được chọn.`,
        type: 'order',
      });
    } catch (err: any) {
      setBulkProcessing(false);
      showToast({
        title: 'Lỗi duyệt hàng loạt',
        message: err?.message || 'Có một số đơn hàng chưa được xác nhận hoàn tất.',
        type: 'error',
      });
    }
  }, [canConfirmOrders, displayedNotifications, selectedIds, isPendingOrderNotif, markAsRead, deselectAll, showToast]);

  // -------------------------------------------------------------------------
  // 7. MODAL XEM CHI TIẾT & BỘ ĐIỀU HƯỚNG TRƯỚC / SAU (FIXED JUMP 2 THẺ)
  // -------------------------------------------------------------------------
  const handleCloseModal = useCallback(() => {
    setViewingIndex(null);
    setModalNotifications([]);
  }, []);

  // Điều hướng Trái / Phải giữa các thông báo trong modal
  const canGoPrev = viewingIndex !== null && viewingIndex > 0;
  const canGoNext =
    viewingIndex !== null &&
    (isDualView
      ? viewingIndex < modalNotifications.length - 2
      : viewingIndex < modalNotifications.length - 1);

  // SỬA LỖI SLIDING WINDOW: Ở chế độ xem 2 thẻ, nhảy 2 bước để không lặp thẻ cũ!
  const handlePrev = useCallback(() => {
    setViewingIndex((prev) => {
      if (prev === null) return null;
      const step = isDualView ? 2 : 1;
      return Math.max(0, prev - step);
    });
  }, [isDualView]);

  const handleNext = useCallback(() => {
    setViewingIndex((prev) => {
      if (prev === null) return null;
      const step = isDualView ? 2 : 1;
      const maxIdx = isDualView
        ? Math.max(0, modalNotifications.length - 2)
        : modalNotifications.length - 1;
      return Math.min(maxIdx, prev + step);
    });
  }, [isDualView, modalNotifications.length]);

  // Phím tắt bàn phím: ESC để đóng, ← / → để chuyển thông báo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGridOpen) {
        if (e.key === 'Escape') setIsGridOpen(false);
        return;
      }
      if (viewingIndex !== null) {
        if (e.key === 'Escape') {
          handleCloseModal();
        } else if (e.key === 'ArrowLeft') {
          handlePrev();
        } else if (e.key === 'ArrowRight') {
          handleNext();
        }
      } else if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGridOpen, isDrawerOpen, viewingIndex, handlePrev, handleNext, handleCloseModal]);

  // Bấm vào 1 thông báo để xem chi tiết trong modal
  const handleOpenDetail = (n: RealtimeNotification, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const snapshotList = [...displayedNotifications];
    const idx = snapshotList.findIndex((item) => item.id === n.id);
    setModalNotifications(snapshotList);
    setViewingIndex(idx !== -1 ? idx : 0);
    if (!n.isRead) {
      markAsRead(n.id);
    }
  };

  // Định dạng thời gian tương đối
  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  };

  // Làm sạch tiêu đề & nội dung: xóa bỏ emoji rác và mã hash kỹ thuật dài
  const cleanNotificationText = (text?: string): string => {
    if (!text) return '';
    return text
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/#\d{8,}/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Icon & màu sắc theo phân loại thông báo
  const getNotificationCategoryIcon = (n: RealtimeNotification) => {
    const cat = getNotificationCategory(n);
    switch (cat) {
      case 'ORDER':
        return { icon: 'shopping_bag', style: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400', label: 'Đơn hàng' };
      case 'REVIEW':
        return { icon: 'star', style: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400', label: 'Đánh giá' };
      case 'DELIVERY':
        return { icon: 'local_shipping', style: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', label: 'Vận chuyển' };
      case 'PAYMENT':
        return { icon: 'account_balance_wallet', style: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400', label: 'Thanh toán' };
      case 'SYSTEM':
      default:
        if (n.priority === 'CRITICAL') {
          return { icon: 'error', style: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400', label: 'Cảnh báo' };
        }
        return { icon: 'notifications', style: 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-300', label: 'Hệ thống' };
    }
  };

  const getSenderName = (senderType: string, senderName?: string) => {
    switch (senderType) {
      case 'ADMIN':
        return 'Ban Quản Trị';
      case 'SELLER':
        return senderName || 'Người bán';
      case 'SHIPPER':
        return senderName || 'Đơn vị vận chuyển';
      case 'USER':
        return senderName || 'Khách hàng';
      default:
        return 'Hệ thống';
    }
  };

  // Button styles theo từng phân hệ
  const getButtonStyles = () => {
    if (variant === 'shipper') {
      return 'w-9 h-9 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-gray-100 text-gray-700 hover:text-[#003B2B]';
    }
    if (variant === 'admin') {
      return 'w-8 h-8 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-gray-100 text-gray-700 hover:text-[#003B2B]';
    }
    if (variant === 'seller') {
      return 'w-8 sm:w-9 h-8 sm:h-9 rounded-xl border border-theme-border text-on-surface hover:text-[#003B2B] hover:bg-theme-secondary-subtle';
    }
    return 'w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl border border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003b2b)] text-[var(--theme-text,#17201f)] hover:text-[var(--theme-primary,#003b2b)] hover:bg-[var(--theme-secondary-subtle,#f2fbf9)]';
  };

  // Responsive Grid Class
  const getGridColsClass = () => {
    if (gridDensity === '2') return 'grid-cols-1 sm:grid-cols-2';
    if (gridDensity === '4') return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
    if (gridDensity === '6') return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6';
    // Auto: 8 - 4 - 2 - 1 responsive
    return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 3xl:grid-cols-8';
  };

  return (
    <>
      {/* 1. NÚT CHUÔNG TRIGGER (HEADER) */}
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => {
            setIsDrawerOpen(true);
            refresh();
          }}
          className={`relative flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 ${getButtonStyles()}`}
          title={`${portalTitle} (Mở ngăn kéo)`}
          aria-label="Thông báo"
          aria-expanded={isDrawerOpen}
        >
          <span
            className={`material-symbols-outlined text-[20px] transition-transform ${
              unreadCount > 0 ? 'text-[#00875A]' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            notifications
          </span>

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-zinc-900 pointer-events-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* 2. SLIDE-OVER DRAWER (NGĂN KÉO THÔNG BÁO) */}
      {isMounted && isDrawerOpen && createPortal(
        <div className="fixed inset-0 z-[80] overflow-hidden font-sans">
          {/* Backdrop mờ nền */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[80]">
            <div className="w-screen max-w-[440px] sm:max-w-[480px] bg-white dark:bg-zinc-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-zinc-800 animate-in slide-in-from-right duration-300">
              
              {/* --- DRAWER HEADER --- */}
              <div className="p-3.5 sm:px-4 sm:py-3 bg-slate-50/90 dark:bg-zinc-850 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-[#003B2B] dark:text-emerald-400 flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[19px]">notifications</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{portalTitle}</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-[10px] font-bold">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </h3>
                  </div>
                </div>

                {/* Actions: Mở Lưới Kiosk, Chọn Nhiều, Đọc tất cả, Đóng */}
                <div className="flex items-center gap-1.5">
                  {/* NÚT MỞ CHẾ ĐỘ LƯỚI XỬ LÝ NHANH RIÊNG BIỆT */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      setIsGridOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer transition-all"
                    title="Mở Chế độ Lưới xử lý nhanh (Kiosk Board)"
                  >
                    <span className="material-symbols-outlined text-sm">grid_view</span>
                    <span className="hidden sm:inline">Chế độ lưới</span>
                  </button>

                  {/* Nút Chọn Nhiều (Tương tự FB) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMultiSelectMode(!isMultiSelectMode);
                      deselectAll();
                    }}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                      isMultiSelectMode
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                    title={isMultiSelectMode ? 'Tắt chế độ chọn nhiều' : 'Chọn nhiều thông báo (như Facebook)'}
                  >
                    <span className="material-symbols-outlined text-[17px]">checklist</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
                    title="Đóng (ESC)"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
              </div>

              {/* --- DRAWER TABS & SELECT OPTION FILTER --- */}
              <div className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-850 px-3 py-2 space-y-2 shrink-0">
                {/* 1. Tabs Chính: Tất cả (Cố định số đếm thật) / Chưa đọc / Chờ duyệt đơn */}
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ALL')}
                    className={`py-1.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'ALL'
                        ? 'border-[#003B2B] text-[#003B2B] dark:border-emerald-400 dark:text-emerald-400 font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>Tất cả</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-zinc-700 text-[10px] font-bold">
                      {categoryCounts.all}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('UNREAD')}
                    className={`py-1.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'UNREAD'
                        ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>Chưa đọc</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                        categoryCounts.unread > 0
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {categoryCounts.unread}
                    </span>
                  </button>

                  {isSeller && categoryCounts.pendingOrder > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('PENDING_ORDER')}
                      className={`py-1.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === 'PENDING_ORDER'
                          ? 'border-amber-600 text-amber-700 dark:text-amber-400 font-bold'
                          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <span>Cần duyệt</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold animate-pulse">
                        {categoryCounts.pendingOrder}
                      </span>
                    </button>
                  )}
                </div>

                {/* 2. Select Option lọc theo thể loại (Đơn hàng, Đánh giá, Vận chuyển...) */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-[11px] font-medium text-slate-400 shrink-0">Lọc theo:</span>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value as NotificationCategory)}
                      className="text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 outline-none cursor-pointer flex-1 min-w-0 font-medium"
                    >
                      <option value="ALL">Tất cả thể loại ({categoryCounts.all})</option>
                      <option value="ORDER">📦 Đơn hàng ({categoryCounts.order})</option>
                      <option value="REVIEW">⭐ Đánh giá &amp; Phản hồi ({categoryCounts.review})</option>
                      <option value="DELIVERY">🚚 Vận chuyển &amp; Bưu tá ({categoryCounts.delivery})</option>
                      <option value="PAYMENT">💳 Thanh toán &amp; Ví ({categoryCounts.payment})</option>
                      <option value="SYSTEM">🔔 Hệ thống &amp; Cảnh báo ({categoryCounts.system})</option>
                    </select>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-[11px] text-emerald-800 hover:text-emerald-950 dark:text-emerald-400 font-semibold cursor-pointer shrink-0"
                    >
                      Đọc tất cả
                    </button>
                  )}
                </div>
              </div>

              {/* --- THANH TÁC VỤ CHỌN NHIỀU (MULTI-SELECT ACTION BAR NHƯ FACEBOOK) --- */}
              {isMultiSelectMode && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/60 p-2.5 px-3 flex items-center justify-between gap-2 text-xs shrink-0 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="drawer-select-all"
                      checked={
                        displayedNotifications.length > 0 &&
                        selectedIds.length === displayedNotifications.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) selectAllDisplayed();
                        else deselectAll();
                      }}
                      className="w-4 h-4 rounded text-emerald-700 accent-emerald-700 cursor-pointer"
                    />
                    <label htmlFor="drawer-select-all" className="font-semibold text-emerald-900 dark:text-emerald-200 cursor-pointer">
                      Đã chọn {selectedIds.length}
                    </label>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Duyệt hàng loạt đơn nếu là Seller có quyền */}
                    {canConfirmOrders && selectedIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBulkConfirmSelectedOrders}
                        disabled={bulkProcessing}
                        className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Xác nhận tất cả đơn hàng chờ duyệt trong danh sách chọn"
                      >
                        <span className="material-symbols-outlined text-xs">done_all</span>
                        <span>Duyệt đơn</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleBulkMarkRead}
                      disabled={selectedIds.length === 0}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                    >
                      Đã đọc
                    </button>

                    <button
                      type="button"
                      onClick={handleBulkDeleteItems}
                      disabled={selectedIds.length === 0}
                      className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-semibold text-[11px] hover:bg-rose-100 cursor-pointer disabled:opacity-40"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              )}

              {/* --- DANH SÁCH THÔNG BÁO --- */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
                {isLoading && notifications.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-3xl animate-spin mb-2 text-emerald-600">
                      progress_activity
                    </span>
                    <p className="text-xs">Đang tải thông báo...</p>
                  </div>
                ) : displayedNotifications.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center px-4">
                    <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-2xl text-slate-400">
                        {activeTab === 'UNREAD' ? 'check_circle' : 'notifications_off'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {activeTab === 'UNREAD'
                        ? 'Tuyệt vời! Bạn không có thông báo chưa đọc nào'
                        : activeTab === 'PENDING_ORDER'
                        ? 'Không còn đơn hàng nào chờ xác nhận'
                        : 'Không có thông báo nào phù hợp'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      {activeTab === 'UNREAD'
                        ? 'Tất cả các thông báo mới sẽ hiển thị tại đây khi có cập nhật.'
                        : 'Hệ thống sẽ cập nhật thông báo khi có sự kiện mới.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {displayedNotifications.map((n) => {
                      const isUnread = !n.isRead;
                      const isCritical = n.priority === 'CRITICAL';
                      const isSelected = selectedIds.includes(n.id);
                      const cat = getNotificationCategoryIcon(n);
                      const cleanTitle = cleanNotificationText(n.title);
                      const cleanMsg = cleanNotificationText(n.message);
                      const isPending = isPendingOrderNotif(n);

                      return (
                        <div
                          key={n.id}
                          onClick={(e) => {
                            if (isMultiSelectMode) {
                              toggleSelectNotification(n.id, e);
                            } else {
                              handleOpenDetail(n, e);
                            }
                          }}
                          className={`p-3 rounded-xl transition-all cursor-pointer flex items-start gap-3 relative border ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40'
                              : isUnread
                              ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-100/60 dark:border-zinc-800 hover:bg-emerald-50/60'
                              : 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800/80 hover:bg-slate-50 dark:hover:bg-zinc-850'
                          }`}
                        >
                          {/* Checkbox chọn nhiều như FB */}
                          {isMultiSelectMode && (
                            <div className="shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => toggleSelectNotification(n.id, e as any)}
                                className="w-4 h-4 rounded text-emerald-700 accent-emerald-700 cursor-pointer"
                              />
                            </div>
                          )}

                          {/* Category circular icon */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cat.style}`}>
                            <span className="material-symbols-outlined text-[17px]">
                              {cat.icon}
                            </span>
                          </div>

                          {/* Nội dung thông báo */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mb-0.5 flex-wrap">
                              <span className="font-semibold text-slate-600 dark:text-slate-400">
                                {getSenderName(n.senderType, n.senderName)}
                              </span>
                              <span>·</span>
                              <span>{formatRelativeTime(n.createdAt)}</span>
                              {isPending && (
                                <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                  Chờ duyệt
                                </span>
                              )}
                              {isCritical && (
                                <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                                  Khẩn cấp
                                </span>
                              )}
                            </div>

                            <h4
                              className={`text-[13px] leading-snug line-clamp-2 ${
                                isUnread
                                  ? 'font-bold text-slate-900 dark:text-white'
                                  : 'font-normal text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {cleanTitle}
                            </h4>

                            {cleanMsg && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                                {cleanMsg}
                              </p>
                            )}
                          </div>

                          {/* Unread dot */}
                          {isUnread && (
                            <div className="shrink-0 mt-2">
                              <span className="block w-2 h-2 rounded-full bg-emerald-600" />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {hasMore && (
                      <div className="pt-2 text-center">
                        <button
                          type="button"
                          onClick={loadMore}
                          disabled={isLoadingMore}
                          className="w-full py-2 px-3 text-xs font-semibold text-slate-600 hover:text-emerald-800 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isLoadingMore ? 'Đang tải thêm...' : 'Tải thêm thông báo cũ'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* --- DRAWER FOOTER: NÚT VÀO TRUNG TÂM HOẶC LƯỚI --- */}
              <div className="p-3 bg-slate-50/80 dark:bg-zinc-850 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setIsGridOpen(true);
                  }}
                  className="font-bold text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">dashboard</span>
                  <span>Mở bảng lưới xử lý nhanh</span>
                </button>

                <Link
                  href={defaultFullPage}
                  onClick={() => setIsDrawerOpen(false)}
                  className="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
                >
                  <span>Xem tất cả</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ===================================================================== */}
      {/* 3. CHẾ ĐỘ LƯỚI TÁCH RỜI XỬ LÝ NHANH (GRID DISPATCH WORKSPACE KIOSK)     */}
      {/* HỖ TRỢ LƯỚI RESPONSIVE 8 - 4 - 2 - 1, FILTER SELECT, ANIMATION SLIDE  */}
      {/* ===================================================================== */}
      {isMounted && isGridOpen && createPortal(
        <div className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm flex flex-col font-sans animate-in fade-in duration-200">
          {/* Top Header của Bảng Lưới Kiosk */}
          <div className="p-3 sm:px-6 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-[#003B2B] dark:text-emerald-400 flex items-center justify-center font-bold shadow-2xs">
                <span className="material-symbols-outlined text-[20px]">grid_view</span>
              </div>
              <div>
                <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Trung Tâm Xử Lý Nhanh Thông Báo &amp; Đơn Hàng</span>
                  {categoryCounts.pendingOrder > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
                      {categoryCounts.pendingOrder} đơn chờ duyệt
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-400">
                  Chế độ lưới tương tác đa nhiệm — Xác nhận đơn hàng nhanh với animation trượt tự động lấp thẻ
                </p>
              </div>
            </div>

            {/* Điều khiển: Chọn cột (Density), Chọn nhiều, Thoát */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Chọn mật độ lưới (Responsive density selector) */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl text-xs">
                <span className="text-[10px] font-semibold text-slate-500 px-1">Lưới:</span>
                {(['auto', '2', '4', '6'] as GridDensity[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setGridDensity(d)}
                    className={`px-2 py-0.8 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                      gridDensity === d
                        ? 'bg-white dark:bg-zinc-700 text-emerald-800 dark:text-emerald-300 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {d === 'auto' ? 'Tự động (8-4-2)' : `${d} cột`}
                  </button>
                ))}
              </div>

              {/* Nút Chọn nhiều như FB */}
              <button
                type="button"
                onClick={() => {
                  setIsMultiSelectMode(!isMultiSelectMode);
                  deselectAll();
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isMultiSelectMode
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="material-symbols-outlined text-sm">checklist</span>
                <span>{isMultiSelectMode ? 'Đang chọn nhiều' : 'Chọn nhiều'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsGridOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                title="Đóng (ESC)"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>

          {/* Subheader: Bộ lọc Select Option & Filter Pills */}
          <div className="bg-slate-50 dark:bg-zinc-850 px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0 flex-wrap">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  selectedCategory === 'ALL'
                    ? 'bg-[#003B2B] text-white shadow-2xs'
                    : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                }`}
              >
                <span>Tất cả</span>
                <span className="text-[10px] opacity-80">({categoryCounts.all})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('ORDER');
                  setActiveTab('ALL');
                }}
                className={`px-3 py-1.2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  selectedCategory === 'ORDER'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                }`}
              >
                <span>📦 Đơn hàng</span>
                <span className="text-[10px] opacity-80">({categoryCounts.order})</span>
              </button>

              {isSeller && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('ORDER');
                    setActiveTab('PENDING_ORDER');
                  }}
                  className={`px-3 py-1.2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    activeTab === 'PENDING_ORDER' && selectedCategory === 'ORDER'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <span>Chờ xác nhận</span>
                  <span className="text-[10px] font-black">({categoryCounts.pendingOrder})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedCategory('REVIEW')}
                className={`px-3 py-1.2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  selectedCategory === 'REVIEW'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                }`}
              >
                <span>⭐ Đánh giá</span>
                <span className="text-[10px] opacity-80">({categoryCounts.review})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('DELIVERY')}
                className={`px-3 py-1.2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  selectedCategory === 'DELIVERY'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                }`}
              >
                <span>🚚 Vận chuyển</span>
                <span className="text-[10px] opacity-80">({categoryCounts.delivery})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('PAYMENT')}
                className={`px-3 py-1.2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  selectedCategory === 'PAYMENT'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                }`}
              >
                <span>💳 Thanh toán</span>
                <span className="text-[10px] opacity-80">({categoryCounts.payment})</span>
              </button>
            </div>

            {/* Quick Multi-action bar */}
            {isMultiSelectMode && selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Đã chọn {selectedIds.length}
                </span>

                {canConfirmOrders && (
                  <button
                    type="button"
                    onClick={handleBulkConfirmSelectedOrders}
                    disabled={bulkProcessing}
                    className="px-3 py-1 rounded-xl bg-[#003B2B] hover:bg-[#00281D] text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>⚡ Duyệt nhanh {selectedIds.length} đơn</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleBulkMarkRead}
                  className="px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Đã đọc
                </button>
              </div>
            )}
          </div>

          {/* Grid Content Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 dark:bg-zinc-950">
            {displayedNotifications.length === 0 ? (
              <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white dark:bg-zinc-850 flex items-center justify-center mb-3 shadow-xs">
                  <span className="material-symbols-outlined text-3xl text-emerald-600">verified</span>
                </div>
                <h3 className="font-bold text-base text-slate-800 dark:text-white">
                  Đã duyệt sạch danh sách!
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Không còn thông báo hoặc đơn hàng nào cần xử lý trong mục đã chọn. Thẻ mới sẽ tự động cập nhật khi có đơn mới.
                </p>
              </div>
            ) : (
              <div className={`grid ${getGridColsClass()} gap-3.5 sm:gap-4 transition-all duration-300`}>
                {displayedNotifications.map((n) => {
                  const isUnread = !n.isRead;
                  const isSelected = selectedIds.includes(n.id);
                  const isAnimating = animatingOutIds.has(n.id);
                  const cat = getNotificationCategoryIcon(n);
                  const isOrder = getNotificationCategory(n) === 'ORDER';
                  const isPending = isPendingOrderNotif(n);

                  // Trích xuất mã đơn hàng & ID nếu có
                  const payload = (n.payload || {}) as Record<string, any>;
                  const orderCode =
                    payload.orderCode ||
                    n.title?.match(/(ORD-[A-Za-z0-9-]+)/i)?.[1] ||
                    n.message?.match(/(ORD-[A-Za-z0-9-]+)/i)?.[1];
                  const sellerOrderId =
                    payload.sellerOrderId ||
                    payload.sellerOrders?.[0]?.sellerOrderId ||
                    n.actionUrl?.match(/\/seller\/orders\/([0-9a-fA-F-]+)/)?.[1] ||
                    null;

                  const receiverName = payload.shippingAddress?.receiverName || payload.shippingAddress?.fullName || 'Khách nhận';
                  const fullAddress = payload.shippingAddress?.fullAddress || payload.shippingAddress?.address || '';
                  const total = payload.total || payload.totalAmount || payload.grandTotal;

                  return (
                    <div
                      key={n.id}
                      className={`relative bg-white dark:bg-zinc-900 rounded-2xl border p-4 shadow-sm flex flex-col justify-between transition-all duration-500 ease-out transform ${
                        isAnimating
                          ? 'translate-x-full opacity-0 scale-90 pointer-events-none'
                          : 'translate-x-0 opacity-100 scale-100'
                      } ${
                        isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                          : isUnread
                          ? 'border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/20'
                          : 'border-slate-200/80 dark:border-zinc-800'
                      }`}
                    >
                      {/* Checkbox chọn nhiều & Category badge */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          {isMultiSelectMode && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => toggleSelectNotification(n.id, e as any)}
                              className="w-4 h-4 rounded text-emerald-700 accent-emerald-700 cursor-pointer"
                            />
                          )}
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${cat.style}`}>
                            <span className="material-symbols-outlined text-[13px]">{cat.icon}</span>
                            <span>{cat.label}</span>
                          </span>
                        </div>

                        <span className="text-[11px] text-slate-400">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>

                      {/* Tiêu đề & Nội dung */}
                      <div className="space-y-1 mb-3">
                        <h4 className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-white line-clamp-2 leading-snug">
                          {cleanNotificationText(n.title)}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {cleanNotificationText(n.message)}
                        </p>
                      </div>

                      {/* Khối đơn hàng rút gọn nếu là thông báo đơn */}
                      {isOrder && (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60 space-y-2 mb-3 text-xs">
                          <div className="flex items-center justify-between font-mono font-bold text-[11px]">
                            <span className="text-slate-800 dark:text-slate-200">
                              #{orderCode || sellerOrderId?.slice(0, 8) || 'Đơn hàng'}
                            </span>
                            {isPending ? (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                                Chờ xác nhận
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                                Đã xác nhận
                              </span>
                            )}
                          </div>

                          {(receiverName !== 'Khách nhận' || fullAddress) && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{receiverName}</span>
                              {fullAddress && <span> · {fullAddress}</span>}
                            </div>
                          )}

                          {total && (
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-zinc-700/50 text-[11px]">
                              <span className="text-slate-400">Tổng tiền:</span>
                              <span className="font-mono font-black text-[#003B2B] dark:text-emerald-400">
                                {Number(total).toLocaleString('vi-VN')} ₫
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Footer Actions của Thẻ trong Grid */}
                      <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 mt-auto">
                        {/* Nút Xem Chi Tiết Modal */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(n)}
                          className="px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>Chi tiết</span>
                          <span className="material-symbols-outlined text-xs">open_in_new</span>
                        </button>

                        {/* Nút Xác Nhận Đơn Nhanh với Animation chạy ngang */}
                        {isSeller && isOrder && isPending && canConfirmOrders && (
                          <button
                            type="button"
                            onClick={() => handleConfirmSingleOrderWithAnimation(n, sellerOrderId, orderCode)}
                            className="px-3 py-1.2 rounded-xl bg-[#003B2B] hover:bg-[#00281D] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                            title="Xác nhận đơn ngay (Thẻ sẽ trượt ngang qua và nhường chỗ cho thẻ tiếp theo)"
                          >
                            <span className="material-symbols-outlined text-xs">check_circle</span>
                            <span>Xác nhận đơn</span>
                          </button>
                        )}

                        {/* Nếu không có quyền duyệt đơn */}
                        {isSeller && isOrder && isPending && !canConfirmOrders && (
                          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium italic flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">lock</span>
                            <span>Cần quyền duyệt</span>
                          </span>
                        )}

                        {/* Nếu đã xác nhận rồi */}
                        {isOrder && !isPending && (
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">verified</span>
                            <span>Đã xong</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ===================================================================== */}
      {/* 4. MODAL XEM CHI TIẾT THÔNG BÁO (HỖ TRỢ 1 THẺ & 2 THẺ SONG SONG)      */}
      {/* SỬA LỖI SLIDING WINDOW LẶP THẺ #3 & TRÙNG LẶP NÚT ACTION              */}
      {/* ===================================================================== */}
      {isMounted && viewingIndex !== null && modalNotifications[viewingIndex] && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in font-sans"
          onClick={handleCloseModal}
        >
          <div
            className={`bg-white dark:bg-zinc-900 w-full transition-all duration-300 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 text-slate-900 dark:text-slate-100 relative z-[101] ${
              isDualView ? 'max-w-5xl xl:max-w-6xl' : 'max-w-xl'
            }`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header Modal với bộ điều hướng Trước/Sau và Nút Chế Độ Xem Đôi */}
            <div className="p-3.5 sm:px-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/90 dark:bg-zinc-850 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-[#003B2B] dark:text-emerald-400 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[17px]">
                    notifications_active
                  </span>
                </div>
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Chi tiết thông báo
                </span>
              </div>

              {/* Bộ điều hướng Trước / Sau */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800/80 px-2 py-1 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!canGoPrev}
                  className="px-2 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-0.5 cursor-pointer"
                  title="Thông báo trước (Phím ←)"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span className="hidden sm:inline">Trước</span>
                </button>

                <span className="text-[11px] font-mono font-bold px-1.5 text-emerald-800 dark:text-emerald-400 min-w-[65px] text-center">
                  {isDualView
                    ? `${viewingIndex + 1}-${Math.min(viewingIndex + 2, modalNotifications.length)} / ${modalNotifications.length}`
                    : `${viewingIndex + 1} / ${modalNotifications.length}`}
                </span>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="px-2 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-0.5 cursor-pointer"
                  title="Thông báo sau (Phím →)"
                >
                  <span className="hidden sm:inline">Sau</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>

              {/* Nút Chuyển Xem 2 Thông Báo Song Song & Chuyển sang Lưới & Đóng Modal */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDualView(!isDualView)}
                  className={`px-2.5 py-1.2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    isDualView
                      ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                      : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                  }`}
                  title={isDualView ? 'Chuyển về xem 1 thông báo' : 'Xem song song 2 thông báo để tiện đối chiếu'}
                >
                  <span className="material-symbols-outlined text-sm">
                    {isDualView ? 'view_agenda' : 'view_column'}
                  </span>
                  <span className="hidden md:inline">
                    {isDualView ? 'Xem 1 thẻ' : 'Xem song song 2 thẻ'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleCloseModal();
                    setIsDrawerOpen(false);
                    setIsGridOpen(true);
                  }}
                  className="px-2.5 py-1.2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                  title="Mở sang chế độ lưới xử lý nhanh"
                >
                  <span className="material-symbols-outlined text-sm">grid_view</span>
                  <span className="hidden sm:inline">Lưới</span>
                </button>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
                  title="Đóng (ESC)"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>

            {/* Nội dung thông báo: Xem 1 hoặc Xem 2 Song Song */}
            {(() => {
              const notif1 = modalNotifications[viewingIndex];
              const notif2 = isDualView ? (modalNotifications[viewingIndex + 1] || null) : null;

              const renderNotifCard = (n: RealtimeNotification, orderIdx: number) => {
                const isPending = isPendingOrderNotif(n);

                return (
                  <div key={n.id} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Meta header */}
                      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-600 dark:text-slate-400">
                            {getSenderName(n.senderType, n.senderName)}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400">
                            {n.type}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            #{orderIdx}
                          </span>
                        </div>
                        <span className="text-slate-400 text-[11px]">
                          {n.createdAt ? new Date(n.createdAt).toLocaleString('vi-VN') : ''}
                        </span>
                      </div>

                      {/* Tiêu đề & Nội dung */}
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                          {cleanNotificationText(n.title)}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
                          {cleanNotificationText(n.message)}
                        </p>
                      </div>

                      {/* Thẻ Đơn Hàng Tích Hợp */}
                      <NotificationOrderCard
                        key={n.id}
                        notification={n}
                        variant={variant}
                        canConfirmOrders={canConfirmOrders}
                        onCloseModal={() => {
                          handleCloseModal();
                          setIsDrawerOpen(false);
                        }}
                      />

                      {/* Ảnh đính kèm nếu có */}
                      {n.imageUrl && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 max-h-56">
                          <img
                            src={n.imageUrl}
                            alt="Đính kèm"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {/* Footer của mỗi thông báo (Dọn dẹp nút trùng lặp) */}
                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs mt-3">
                      <span className="text-[11px] font-semibold flex items-center gap-1">
                        {isPending ? (
                          <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            <span>Đang chờ duyệt đơn</span>
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            <span>Đã xử lý</span>
                          </span>
                        )}
                      </span>

                      {n.actionUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            const url = n.actionUrl!;
                            handleCloseModal();
                            setIsDrawerOpen(false);
                            router.push(url);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-[#003B2B] hover:bg-[#00281D] text-white text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>Xem chi tiết trang</span>
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              };

              return (
                <div
                  className={`overflow-y-auto flex-1 ${
                    isDualView
                      ? 'grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-zinc-800'
                      : 'flex flex-col'
                  }`}
                >
                  {renderNotifCard(notif1, viewingIndex + 1)}

                  {isDualView && (
                    notif2 ? (
                      renderNotifCard(notif2, viewingIndex + 2)
                    ) : (
                      <div className="p-8 flex flex-col items-center justify-center text-center text-slate-400 space-y-2.5 bg-slate-50/50 dark:bg-zinc-850/50">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                          <span className="material-symbols-outlined text-2xl text-slate-400">check_circle</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                          Đã đến thông báo cuối cùng
                        </h4>
                        <p className="text-xs text-slate-400 max-w-xs">
                          Không còn thông báo tiếp theo trong danh sách để đối chiếu song song.
                        </p>
                      </div>
                    )
                  )}
                </div>
              );
            })()}

            {/* Footer Modal Tổng */}
            <div className="p-3 px-4 bg-slate-50 dark:bg-zinc-850 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
              <span className="flex items-center gap-1 text-[11px]">
                <span className="material-symbols-outlined text-sm text-emerald-600">keyboard</span>
                <span>Dùng phím mũi tên <strong>←</strong> / <strong>→</strong> để lướt nhanh, <strong>ESC</strong> để đóng</span>
              </span>

              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// --------------------------------------------------------------------------
// SUBCOMPONENT: THẺ ĐƠN HÀNG TÍCH HỢP TRONG THÔNG BÁO (NOTIFICATION ORDER CARD)
// HIỂN THỊ ĐẦY ĐỦ CHI TIẾT + KIỂM TRA PHÂN QUYỀN TRƯỚC KHI CHO PHÉP XÁC NHẬN
// --------------------------------------------------------------------------
interface NotificationOrderCardProps {
  notification: RealtimeNotification;
  variant: string;
  canConfirmOrders: boolean;
  onCloseModal?: () => void;
}

function NotificationOrderCard({
  notification,
  variant,
  canConfirmOrders,
  onCloseModal,
}: NotificationOrderCardProps) {
  const router = useRouter();
  const payload = (notification.payload || {}) as Record<string, any>;

  // Trích xuất mã đơn hàng
  const orderCode = useMemo(() => {
    if (payload.orderCode) return String(payload.orderCode).replace(/^#/, '');
    const titleMatch = notification.title?.match(/#(ORD-[A-Za-z0-9-]+)/i) || notification.title?.match(/(ORD-[A-Za-z0-9-]+)/i);
    if (titleMatch) return titleMatch[1];
    const msgMatch = notification.message?.match(/#(ORD-[A-Za-z0-9-]+)/i) || notification.message?.match(/(ORD-[A-Za-z0-9-]+)/i);
    if (msgMatch) return msgMatch[1];
    return null;
  }, [payload, notification]);

  // Trích xuất sellerOrderId (UUID)
  const sellerOrderId = useMemo(() => {
    if (payload.sellerOrderId && typeof payload.sellerOrderId === 'string') return payload.sellerOrderId;
    if (Array.isArray(payload.sellerOrders) && payload.sellerOrders[0]?.sellerOrderId) {
      return payload.sellerOrders[0].sellerOrderId;
    }
    const match = notification.actionUrl?.match(/\/seller\/orders\/([0-9a-fA-F-]+)/);
    if (match) return match[1];
    return null;
  }, [payload, notification]);

  const [orderDetail, setOrderDetail] = useState<SellerOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmedStatus, setConfirmedStatus] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    async function fetchOrderInfo() {
      if (variant !== 'seller') return;
      if (sellerOrderId) {
        setIsLoading(true);
        try {
          const res = await orderApi.getSellerOrderDetail(sellerOrderId);
          if (!isCancelled && res.success && res.data) {
            setOrderDetail(res.data);
            setConfirmedStatus(res.data.status);
          }
        } catch {
          // ignore
        } finally {
          if (!isCancelled) setIsLoading(false);
        }
      } else if (orderCode) {
        setIsLoading(true);
        try {
          const res = await orderApi.getSellerOrders({ search: orderCode, limit: 1 });
          if (!isCancelled && res.success && res.data?.items?.[0]) {
            setOrderDetail(res.data.items[0]);
            setConfirmedStatus(res.data.items[0].status);
          }
        } catch {
          // ignore
        } finally {
          if (!isCancelled) setIsLoading(false);
        }
      }
    }
    fetchOrderInfo();
    return () => {
      isCancelled = true;
    };
  }, [sellerOrderId, orderCode, variant]);

  if (!orderCode && !sellerOrderId && !notification.type?.includes('ORDER')) {
    return null;
  }

  // Thao tác Xác Nhận Đơn Hàng Ngay Lập Tức
  const handleConfirmOrder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canConfirmOrders) {
      setConfirmError('Bạn không có quyền ORDER_PROCESS để xác nhận đơn hàng!');
      return;
    }

    const targetId = sellerOrderId || orderDetail?.id;
    if (!targetId) return;

    setIsConfirming(true);
    setConfirmError(null);
    try {
      const res = await orderApi.confirmOrder(targetId);
      if (res.success) {
        setConfirmedStatus('CONFIRMED');
        soundEffects.playOrderChime();
        if (orderDetail) {
          setOrderDetail({ ...orderDetail, status: 'CONFIRMED' });
        }
      } else {
        setConfirmError((res as any)?.message || 'Không thể xác nhận đơn hàng');
      }
    } catch (err: any) {
      setConfirmError(err?.message || 'Lỗi kết nối khi xác nhận đơn');
    } finally {
      setIsConfirming(false);
    }
  };

  const currentStatus = confirmedStatus || orderDetail?.status || 'PENDING_CONFIRMATION';
  const isPending = currentStatus === 'PENDING_CONFIRMATION';
  const isConfirmed = currentStatus === 'CONFIRMED';

  const shippingAddress = orderDetail?.order?.shippingAddress || payload.shippingAddress;
  const receiverName =
    shippingAddress?.receiverName || shippingAddress?.recipientName || shippingAddress?.fullName || 'Khách nhận';
  const receiverPhone = shippingAddress?.receiverPhone || shippingAddress?.phone || '';
  const fullAddress =
    shippingAddress?.fullAddress ||
    [shippingAddress?.address, shippingAddress?.ward, shippingAddress?.district, shippingAddress?.province]
      .filter(Boolean)
      .join(', ');

  const items = orderDetail?.items || [];
  const grandTotal = orderDetail?.grandTotal || payload.total || payload.totalAmount || 0;
  const paymentMethod = orderDetail?.order?.paymentMethod || payload.paymentMethod || 'COD';

  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'CONFIRMED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">check_circle</span>
            <span>Đã xác nhận</span>
          </span>
        );
      case 'PREPARING':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">inventory_2</span>
            <span>Đang chuẩn bị</span>
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">local_shipping</span>
            <span>Đang giao</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">verified</span>
            <span>Hoàn tất</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">cancel</span>
            <span>Đã hủy</span>
          </span>
        );
      case 'PENDING_CONFIRMATION':
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">schedule</span>
            <span>Chờ xác nhận</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl p-3.5 space-y-3">
      {/* Header Thẻ đơn */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-zinc-700/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-[#003B2B] dark:text-emerald-400 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Đơn hàng
            </div>
            <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
              #{orderCode || sellerOrderId?.slice(0, 8) || 'Đơn hàng'}
            </span>
          </div>
        </div>

        <div>{getStatusBadge()}</div>
      </div>

      {isLoading && (
        <div className="py-2 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <span className="material-symbols-outlined text-sm animate-spin text-emerald-600">progress_activity</span>
          <span>Đang nạp thông tin đơn hàng...</span>
        </div>
      )}

      {/* Thông tin người nhận */}
      {(receiverName || receiverPhone || fullAddress) && (
        <div className="text-xs space-y-1 bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-zinc-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-emerald-700 dark:text-emerald-400">person</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{receiverName}</span>
              {receiverPhone && <span className="font-mono text-slate-400">({receiverPhone})</span>}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
              {paymentMethod}
            </span>
          </div>

          {fullAddress && (
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2 flex items-start gap-1">
              <span className="material-symbols-outlined text-xs text-slate-400 mt-0.5 shrink-0">location_on</span>
              <span>{fullAddress}</span>
            </p>
          )}
        </div>
      )}

      {/* Sản phẩm trong đơn */}
      {items.length > 0 && (
        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                {item.coverImage || item.coverUrl ? (
                  <img
                    src={item.coverImage || item.coverUrl}
                    alt={item.title}
                    className="w-7 h-9 rounded object-cover shrink-0 border border-slate-200 dark:border-zinc-700"
                  />
                ) : (
                  <div className="w-7 h-9 rounded bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-slate-400">
                    <span className="material-symbols-outlined text-xs">book</span>
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-[11px] text-slate-900 dark:text-white truncate max-w-[170px] sm:max-w-[220px]">
                    {item.title}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <span className="px-1 rounded bg-slate-100 dark:bg-zinc-800 text-[9px] font-semibold">
                      {item.format === 'DIGITAL' ? 'Ebook' : 'Sách giấy'}
                    </span>
                    <span>x{item.quantity}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-mono font-bold text-[11px] text-[#00875A] dark:text-emerald-400">
                  {((item.price || 0) * (item.quantity || 1)).toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tổng tiền thanh toán */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-semibold">Tổng tiền đơn:</span>
        <span className="font-mono font-black text-sm text-[#003B2B] dark:text-emerald-400">
          {grandTotal ? `${Number(grandTotal).toLocaleString('vi-VN')} ₫` : 'Theo đơn hàng'}
        </span>
      </div>

      {confirmError && (
        <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] font-medium flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{confirmError}</span>
        </div>
      )}

      {/* Hành động: Xác nhận đơn ngay & Mở xem đơn */}
      <div className="flex items-center gap-2 pt-1">
        {variant === 'seller' && (sellerOrderId || orderDetail?.id) && isPending && canConfirmOrders && (
          <button
            type="button"
            onClick={handleConfirmOrder}
            disabled={isConfirming}
            className="flex-1 py-2 px-3 rounded-xl bg-[#003B2B] hover:bg-[#00281D] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isConfirming ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                <span>Đang xác nhận...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>Xác nhận đơn ngay</span>
              </>
            )}
          </button>
        )}

        {variant === 'seller' && isPending && !canConfirmOrders && (
          <div className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500 text-xs font-medium flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-xs">lock</span>
            <span>Chỉ nhân sự ORDER_PROCESS mới được duyệt</span>
          </div>
        )}

        {variant === 'seller' && isConfirmed && (
          <div className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-sm">verified</span>
            <span>Đã xác nhận đơn hàng ✔</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            onCloseModal?.();
            const target =
              variant === 'seller'
                ? `/seller/orders?search=${encodeURIComponent(orderCode || sellerOrderId || '')}`
                : `/orders/${orderCode || ''}`;
            router.push(target);
          }}
          className="py-2 px-3 rounded-xl border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
        >
          <span>Mở chi tiết</span>
          <span className="material-symbols-outlined text-xs">open_in_new</span>
        </button>
      </div>
    </div>
  );
}
