'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { soundEffects } from '../../utils/soundEffects';
import {
  useRealtimeNotifications,
  RealtimeNotification,
} from '../../hooks/useRealtimeNotifications';
import { orderApi, SellerOrder } from '../../api/orderApi';

export interface UniversalNotificationBellProps {
  variant?: 'user' | 'seller' | 'shipper' | 'admin';
  fullPageRoute?: string;
  className?: string;
}

// Bộ lọc danh mục
type FilterCategory =
  | 'ALL'
  | 'PENDING_ORDER'
  | 'ORDER'
  | 'REVIEW'
  | 'SHIPPING'
  | 'SYSTEM';

// Chế độ cột hiển thị trong Lưới Kiosk
type GridColsMode = 'auto' | '2' | '4' | '6';

// Dữ liệu sách chuẩn hóa để người bán nhìn rõ tựa sách và đóng gói
interface NormalizedBookItem {
  id: string;
  title: string;
  cover: string;
  quantity: number;
  price: number;
  format: 'Sách giấy' | 'Ebook';
}

// Cấu trúc thẻ thống nhất hiển thị cho người bán (thân thiện, không code kỹ thuật)
interface UnifiedCard {
  id: string;
  notifId?: string;
  category:
    | 'ORDER_PENDING'
    | 'ORDER_OTHER'
    | 'REVIEW'
    | 'SHIPPING'
    | 'FINANCE'
    | 'SYSTEM';
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;

  // Dành riêng cho Đơn hàng
  orderCode?: string;
  cleanCode?: string;
  sellerOrderId?: string | null;
  isPendingOrder?: boolean;
  grandTotal?: number;
  paymentMethod?: string;
  recipientName?: string;
  phone?: string;
  address?: string;
  items?: NormalizedBookItem[];

  // Dành riêng cho Đánh giá
  rating?: number;
  reviewerName?: string;
  comment?: string;
  bookTitle?: string;

  // Dành riêng cho Vận chuyển
  carrier?: string;
  trackingCode?: string;
}

export default function UniversalNotificationBell({
  variant = 'seller',
  fullPageRoute,
  className = '',
}: UniversalNotificationBellProps) {
  const router = useRouter();
  const { user, hasPermission, can } = useAuth();
  const { showToast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isGridOpen, setIsGridOpen] = useState(false);

  // Tab lọc được chọn
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('ALL');

  // Chế độ cột lưới
  const [colsMode, setColsMode] = useState<GridColsMode>('auto');

  // Chế độ chọn nhiều (Facebook / Shopee style)
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal xem chi tiết đơn hàng
  const [activeModalOrder, setActiveModalOrder] = useState<UnifiedCard | null>(null);

  // Animation trượt ngang khi duyệt đơn và danh sách đơn đã xử lý
  const [animatingOutIds, setAnimatingOutIds] = useState<Set<string>>(new Set());
  const [processedOrderIds, setProcessedOrderIds] = useState<Set<string>>(new Set());

  // Cache thông tin đơn hàng đầy đủ từ backend
  const [orderCache, setOrderCache] = useState<Map<string, SellerOrder>>(new Map());
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // -------------------------------------------------------------------------
  // 1. PHÂN QUYỀN CHUẨN CHỈNH
  // -------------------------------------------------------------------------
  const isSeller = variant === 'seller';
  const canConfirmOrders = useMemo(() => {
    if (!isSeller) return false;
    if (!user) return false;
    // Chủ gian hàng (BUSINESS) hoặc Quản trị viên sàn (PLATFORM_ADMIN) có toàn quyền
    if (user.role === 'PLATFORM_ADMIN' || user.role === 'BUSINESS') return true;
    // Nhân viên cần quyền ORDER_PROCESS
    return can('ORDER_PROCESS') || hasPermission('ORDER_PROCESS');
  }, [isSeller, user, can, hasPermission]);

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
  // -------------------------------------------------------------------------
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    bulkMarkAsRead,
    bulkDelete,
    refresh,
  } = useRealtimeNotifications({
    recipientType,
    limit: 50,
  });

  // -------------------------------------------------------------------------
  // 3. NẠP TOÀN BỘ ĐƠN HÀNG THỰC TẾ & MAP VÀO CACHE CHI TIẾT
  // -------------------------------------------------------------------------
  const fetchAllSellerOrders = useCallback(async () => {
    if (!isSeller) return;
    setIsLoadingOrders(true);
    try {
      const res = await orderApi.getSellerOrders({ limit: 100 });
      const rawList: any[] = Array.isArray(res.data)
        ? res.data
        : (res.data as any)?.items || (res.data as any)?.data || [];

      if (res.success && rawList.length > 0) {
        const newMap = new Map<string, SellerOrder>();
        rawList.forEach((o) => {
          if (o.id) newMap.set(o.id, o);
          if (o.code) {
            newMap.set(o.code, o);
            const baseCode = o.code.replace(/-S\d+$/, '');
            newMap.set(baseCode, o);
          }
          if (o.order?.code) {
            newMap.set(o.order.code, o);
          }
        });
        setOrderCache(newMap);
      }
    } catch (err) {
      console.warn('Lỗi nạp đơn hàng:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [isSeller]);

  // Nạp ngay khi component mount và khi mở Drawer / Grid
  useEffect(() => {
    if (isSeller) {
      fetchAllSellerOrders();
    }
  }, [isSeller, fetchAllSellerOrders]);

  useEffect(() => {
    if ((isGridOpen || isDrawerOpen) && isSeller) {
      fetchAllSellerOrders();
    }
  }, [isGridOpen, isDrawerOpen, isSeller, fetchAllSellerOrders]);

  // Tìm kiếm đơn lẻ ngay lập tức nếu gặp mã đơn chưa kịp nạp vào cache
  const missingOrdersSearched = useRef<Set<string>>(new Set());
  const searchMissingOrder = useCallback(async (code: string) => {
    if (!code || missingOrdersSearched.current.has(code)) return;
    missingOrdersSearched.current.add(code);
    try {
      const res = await orderApi.getSellerOrders({ search: code, limit: 1 });
      const rawList: any[] = Array.isArray(res.data)
        ? res.data
        : (res.data as any)?.items || (res.data as any)?.data || [];
      if (rawList.length > 0) {
        const o = rawList[0];
        setOrderCache((prev) => {
          const next = new Map(prev);
          if (o.id) next.set(o.id, o);
          if (o.code) {
            next.set(o.code, o);
            next.set(o.code.replace(/-S\d+$/, ''), o);
          }
          if (o.order?.code) next.set(o.order.code, o);
          return next;
        });
      }
    } catch {}
  }, []);

  // -------------------------------------------------------------------------
  // 4. CHUẨN HÓA DỮ LIỆU SÁCH VÀ ĐƠN HÀNG
  // -------------------------------------------------------------------------
  const normalizeItemsList = useCallback((rawItems?: any[]): NormalizedBookItem[] => {
    if (!Array.isArray(rawItems) || rawItems.length === 0) return [];
    return rawItems.map((item, idx) => ({
      id: item.id || String(idx),
      title: item.bookTitle || item.title || item.name || 'Sách theo đơn hàng',
      cover:
        item.bookCoverUrl ||
        item.coverImage ||
        item.coverUrl ||
        item.imageUrl ||
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80',
      quantity: Number(item.quantity || 1),
      price: Number(item.unitPrice || item.price || 0),
      format: item.format === 'DIGITAL' ? 'Ebook' : 'Sách giấy',
    }));
  }, []);

  // -------------------------------------------------------------------------
  // 5. TỔNG HỢP TOÀN BỘ THÔNG BÁO (ĐƠN HÀNG, ĐÁNH GIÁ, VẬN CHUYỂN, HỆ THỐNG)
  // -------------------------------------------------------------------------
  const unifiedCards = useMemo((): UnifiedCard[] => {
    const list: UnifiedCard[] = [];
    const seenOrderCodes = new Set<string>();

    // 1. Duyệt qua tất cả thông báo thời gian thực
    notifications.forEach((n) => {
      const payload = (n.payload || {}) as Record<string, any>;
      const lowerTitle = (n.title || '').toLowerCase();
      const lowerMsg = (n.message || '').toLowerCase();

      // Kiểm tra có phải thông báo Đơn hàng
      const isOrderNotif =
        n.type === 'ORDER_STATUS' ||
        n.type === 'ORDER_CREATED' ||
        n.type === 'ORDER_MESSAGE' ||
        lowerTitle.includes('đơn hàng') ||
        lowerMsg.includes('đơn hàng') ||
        Boolean(payload.orderCode);

      if (isOrderNotif) {
        const rawCode =
          payload.orderCode ||
          n.title?.match(/(ORD-[A-Za-z0-9-]+)/i)?.[1] ||
          n.message?.match(/(ORD-[A-Za-z0-9-]+)/i)?.[1] ||
          '';
        const cleanCode = rawCode ? String(rawCode).replace(/-S\d+$/, '') : '';
        if (cleanCode) seenOrderCodes.add(cleanCode);

        // Tra cứu trong cache đơn hàng thật (tìm chính xác, tìm theo rawCode, và tìm gần đúng)
        let cached = cleanCode ? orderCache.get(cleanCode) : undefined;
        if (!cached && rawCode) {
          cached = orderCache.get(rawCode);
        }
        if (!cached && cleanCode) {
          for (const [k, v] of orderCache.entries()) {
            if (k.includes(cleanCode) || cleanCode.includes(k)) {
              cached = v;
              break;
            }
          }
        }
        if (!cached && cleanCode && isSeller) {
          searchMissingOrder(cleanCode);
        }

        const buyer = cached?.order;
        const addr = buyer?.shippingAddress || payload.shippingAddress;

        const recipientName =
          addr?.recipientName || addr?.receiverName || addr?.fullName || 'Khách nhận';
        const phone = addr?.phone || addr?.receiverPhone || '';
        const address =
          addr?.fullAddress ||
          [addr?.line1 || addr?.address, addr?.ward, addr?.district, addr?.province]
            .filter(Boolean)
            .join(', ') ||
          'Theo thông tin đặt hàng';

        const items = cached
          ? normalizeItemsList(cached.items)
          : normalizeItemsList(payload.items);

        const isPending = cached
          ? cached.status === 'PENDING_CONFIRMATION'
          : !payload.status || payload.status === 'PENDING_CONFIRMATION';

        const sellerOrderId =
          cached?.id ||
          payload.sellerOrderId ||
          payload.sellerOrders?.[0]?.sellerOrderId ||
          null;

        const grandTotal = Number(
          cached?.grandTotal ?? payload.total ?? payload.grandTotal ?? 0
        );

        list.push({
          id: n.id,
          notifId: n.id,
          category: isPending ? 'ORDER_PENDING' : 'ORDER_OTHER',
          title: isPending ? 'Có đơn hàng mới chờ xác nhận' : n.title || 'Cập nhật đơn hàng',
          message: n.message,
          createdAt: n.createdAt,
          isRead: n.isRead,
          orderCode: cleanCode || rawCode,
          cleanCode: cleanCode || rawCode,
          sellerOrderId,
          isPendingOrder: isPending,
          grandTotal,
          paymentMethod: buyer?.paymentMethod || payload.paymentMethod || 'COD',
          recipientName,
          phone,
          address,
          items,
        });
        return;
      }

      // Kiểm tra có phải thông báo Đánh giá
      const isReviewNotif =
        n.type === 'NEW_REVIEW' ||
        n.type === 'NEW_REPLY' ||
        lowerTitle.includes('đánh giá') ||
        lowerMsg.includes('đánh giá');

      if (isReviewNotif) {
        const rating = Number(payload.rating || 5);
        const reviewerName = String(
          payload.reviewerName || payload.userName || n.senderName || 'Khách hàng'
        );
        const comment = String(
          payload.comment || payload.content || n.message || 'Khách hàng vừa để lại đánh giá về sản phẩm.'
        );
        const bookTitle = String(payload.bookTitle || payload.title || '');

        list.push({
          id: n.id,
          notifId: n.id,
          category: 'REVIEW',
          title: n.title || 'Đánh giá sản phẩm mới',
          message: n.message,
          createdAt: n.createdAt,
          isRead: n.isRead,
          rating,
          reviewerName,
          comment,
          bookTitle,
        });
        return;
      }

      // Kiểm tra có phải thông báo Vận chuyển
      const isShippingNotif =
        n.type === 'SHIPPING_UPDATE' ||
        lowerTitle.includes('vận chuyển') ||
        lowerMsg.includes('vận chuyển') ||
        lowerTitle.includes('giao hàng') ||
        lowerMsg.includes('giao hàng');

      if (isShippingNotif) {
        list.push({
          id: n.id,
          notifId: n.id,
          category: 'SHIPPING',
          title: n.title || 'Cập nhật vận chuyển',
          message: n.message,
          createdAt: n.createdAt,
          isRead: n.isRead,
          carrier: String(payload.carrier || 'HUKI Express'),
          trackingCode: String(payload.trackingCode || ''),
        });
        return;
      }

      // Kiểm tra có phải thông báo Tài chính / Ví
      const isFinanceNotif =
        n.type === 'PAYMENT_SUCCESS' ||
        n.type === 'PAYMENT_FAILED' ||
        lowerTitle.includes('thanh toán') ||
        lowerMsg.includes('thanh toán') ||
        lowerTitle.includes('ví') ||
        lowerMsg.includes('tiền về ví') ||
        n.type?.includes('VOUCHER');

      if (isFinanceNotif) {
        list.push({
          id: n.id,
          notifId: n.id,
          category: 'FINANCE',
          title: n.title || 'Biến động số dư & Thanh toán',
          message: n.message,
          createdAt: n.createdAt,
          isRead: n.isRead,
        });
        return;
      }

      // Các thông báo Hệ thống khác
      list.push({
        id: n.id,
        notifId: n.id,
        category: 'SYSTEM',
        title: n.title || 'Thông báo từ hệ thống sàn',
        message: n.message,
        createdAt: n.createdAt,
        isRead: n.isRead,
      });
    });

    // 2. Bổ sung các đơn hàng Chờ xác nhận trong orderCache nếu chưa có thông báo tương ứng
    orderCache.forEach((order) => {
      if (order.status !== 'PENDING_CONFIRMATION') return;
      const cleanCode = order.code.replace(/-S\d+$/, '');
      if (seenOrderCodes.has(cleanCode)) return;
      seenOrderCodes.add(cleanCode);

      const items = normalizeItemsList(order.items);
      const buyer = order.order;
      const addr = buyer?.shippingAddress;

      const recipientName = addr?.recipientName || addr?.fullName || 'Khách nhận';
      const phone = addr?.phone || '';
      const address =
        addr?.fullAddress ||
        [addr?.line1, addr?.ward, addr?.district, addr?.province]
          .filter(Boolean)
          .join(', ') ||
        'Theo thông tin đặt hàng';

      list.unshift({
        id: `order-${order.id}`,
        category: 'ORDER_PENDING',
        title: 'Có đơn hàng mới chờ xác nhận',
        message: `Đơn hàng #${cleanCode} đang chờ gian hàng bạn xác nhận và đóng gói.`,
        createdAt: order.createdAt,
        isRead: false,
        orderCode: cleanCode,
        cleanCode,
        sellerOrderId: order.id,
        isPendingOrder: true,
        grandTotal: Number(order.grandTotal || 0),
        paymentMethod: buyer?.paymentMethod || 'COD',
        recipientName,
        phone,
        address,
        items,
      });
    });

    return list;
  }, [notifications, orderCache, normalizeItemsList]);

  // -------------------------------------------------------------------------
  // 6. TÍNH TOÁN SỐ LƯỢNG CHO TỪNG BỘ LỌC
  // -------------------------------------------------------------------------
  const counts = useMemo(() => {
    let pending = 0;
    let order = 0;
    let review = 0;
    let shipping = 0;
    let system = 0;

    unifiedCards.forEach((c) => {
      const isProcessed =
        processedOrderIds.has(c.id) ||
        (c.cleanCode && processedOrderIds.has(c.cleanCode)) ||
        (c.sellerOrderId && processedOrderIds.has(c.sellerOrderId));
      if (isProcessed) return;

      if (c.category === 'ORDER_PENDING') {
        pending++;
        order++;
      } else if (c.category === 'ORDER_OTHER') {
        order++;
      } else if (c.category === 'REVIEW') {
        review++;
      } else if (c.category === 'SHIPPING') {
        shipping++;
      } else if (c.category === 'FINANCE' || c.category === 'SYSTEM') {
        system++;
      }
    });

    const total = unifiedCards.filter((c) => {
      return (
        !processedOrderIds.has(c.id) &&
        (!c.cleanCode || !processedOrderIds.has(c.cleanCode)) &&
        (!c.sellerOrderId || !processedOrderIds.has(c.sellerOrderId))
      );
    }).length;

    return { total, pending, order, review, shipping, system };
  }, [unifiedCards, processedOrderIds]);

  // Lọc theo Tab được chọn
  const filteredCards = useMemo(() => {
    return unifiedCards.filter((c) => {
      const isProcessed =
        processedOrderIds.has(c.id) ||
        (c.cleanCode && processedOrderIds.has(c.cleanCode)) ||
        (c.sellerOrderId && processedOrderIds.has(c.sellerOrderId));
      if (isProcessed) return false;

      switch (activeFilter) {
        case 'PENDING_ORDER':
          return c.category === 'ORDER_PENDING';
        case 'ORDER':
          return c.category === 'ORDER_PENDING' || c.category === 'ORDER_OTHER';
        case 'REVIEW':
          return c.category === 'REVIEW';
        case 'SHIPPING':
          return c.category === 'SHIPPING';
        case 'SYSTEM':
          return c.category === 'FINANCE' || c.category === 'SYSTEM';
        case 'ALL':
        default:
          return true;
      }
    });
  }, [unifiedCards, activeFilter, processedOrderIds]);

  // -------------------------------------------------------------------------
  // 7. THAO TÁC XÁC NHẬN ĐƠN HÀNG VỚI ANIMATION TRƯỢT NGANG (SLIDE-OUT)
  // -------------------------------------------------------------------------
  const handleConfirmOrder = useCallback(
    async (card: UnifiedCard) => {
      if (!canConfirmOrders) {
        showToast({
          title: 'Chưa có quyền',
          message: 'Bạn cần quyền ORDER_PROCESS để xác nhận đơn hàng!',
          type: 'error',
        });
        return;
      }

      const orderKey = card.cleanCode || card.id;

      try {
        // 1. Bật animation trượt sang phải
        setAnimatingOutIds((prev) => new Set([...prev, orderKey]));
        soundEffects.playOrderChime();

        // 2. Tìm ID đơn hàng để xác nhận
        let targetId = card.sellerOrderId;
        if (!targetId && card.cleanCode) {
          const searchRes = await orderApi.getSellerOrders({
            search: card.cleanCode,
            limit: 1,
          });
          targetId = searchRes.data?.items?.[0]?.id || null;
        }

        if (targetId) {
          await orderApi.confirmOrder(targetId);
        } else {
          throw new Error('Không tìm thấy thông tin đơn hàng trên hệ thống');
        }

        // Đánh dấu đã đọc thông báo nếu có
        if (card.notifId) {
          markAsRead(card.notifId);
        }

        showToast({
          title: 'Đã xác nhận đơn hàng!',
          message: `Đơn hàng #${card.cleanCode || ''} đã sẵn sàng đóng gói.`,
          type: 'order',
        });

        // Sau 450ms hoàn tất animation: gỡ bỏ thẻ để thẻ tiếp theo trượt vào
        setTimeout(() => {
          setProcessedOrderIds((prev) => {
            const next = new Set(prev);
            next.add(orderKey);
            if (targetId) next.add(targetId);
            return next;
          });

          setAnimatingOutIds((prev) => {
            const next = new Set(prev);
            next.delete(orderKey);
            return next;
          });
        }, 450);
      } catch (err: any) {
        setAnimatingOutIds((prev) => {
          const next = new Set(prev);
          next.delete(orderKey);
          return next;
        });
        showToast({
          title: 'Lỗi xác nhận đơn',
          message: err?.message || 'Không thể xác nhận đơn hàng.',
          type: 'error',
        });
      }
    },
    [canConfirmOrders, markAsRead, showToast]
  );

  // -------------------------------------------------------------------------
  // 8. CHỌN NHIỀU & THAO TÁC HÀNG LOẠT (FACEBOOK-STYLE)
  // -------------------------------------------------------------------------
  const toggleSelectCard = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCards.map((c) => c.id)));
    }
  };

  const handleBulkMarkRead = async () => {
    const ids = Array.from(selectedIds).filter((id) => !id.startsWith('order-'));
    if (ids.length > 0) {
      await bulkMarkAsRead(ids);
      showToast({
        title: 'Thành công',
        message: `Đã đánh dấu đã đọc ${ids.length} thông báo`,
        type: 'success',
      });
    }
    setSelectedIds(new Set());
    setIsMultiSelect(false);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds).filter((id) => !id.startsWith('order-'));
    if (ids.length > 0) {
      await bulkDelete(ids);
      showToast({
        title: 'Thành công',
        message: `Đã xóa ${ids.length} thông báo`,
        type: 'success',
      });
    }
    setSelectedIds(new Set());
    setIsMultiSelect(false);
  };

  // Định dạng thời gian tự nhiên (thân thiện với người bán)
  const formatFriendlyTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Vừa xong';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
    if (diffSec < 172800) {
      const timeStr = date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `Hôm qua lúc ${timeStr}`;
    }
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

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

  // Danh sách các Tab lọc
  const filterTabs = [
    {
      id: 'ALL' as const,
      label: 'Tất cả',
      count: counts.total,
      icon: 'notifications',
    },
    {
      id: 'PENDING_ORDER' as const,
      label: 'Chờ xác nhận',
      count: counts.pending,
      icon: 'pending_actions',
      highlight: counts.pending > 0,
    },
    {
      id: 'ORDER' as const,
      label: 'Đơn hàng',
      count: counts.order,
      icon: 'shopping_bag',
    },
    {
      id: 'REVIEW' as const,
      label: 'Đánh giá',
      count: counts.review,
      icon: 'star',
    },
    {
      id: 'SHIPPING' as const,
      label: 'Vận chuyển',
      count: counts.shipping,
      icon: 'local_shipping',
    },
    {
      id: 'SYSTEM' as const,
      label: 'Hệ thống & Ví',
      count: counts.system,
      icon: 'account_balance_wallet',
    },
  ];

  return (
    <>
      {/* ===================================================================== */}
      {/* 1. NÚT CHUÔNG TRÊN HEADER */}
      {/* ===================================================================== */}
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => {
            setIsDrawerOpen(true);
            refresh();
          }}
          className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-theme-border text-on-surface hover:text-[#003B2B] hover:bg-theme-secondary-subtle transition-all cursor-pointer shadow-2xs active:scale-95"
          title="Thông báo & Lên đơn"
          aria-label="Thông báo"
        >
          <span className="material-symbols-outlined text-[20px] text-slate-700 dark:text-slate-200">
            notifications
          </span>

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-zinc-900 pointer-events-none animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 2. DRAWER THÔNG BÁO TIỆN ÍCH (GỌN GÀNG, ĐỦ BỘ LỌC) */}
      {/* ===================================================================== */}
      {isMounted && isDrawerOpen && createPortal(
        <div className="fixed inset-0 z-[80] overflow-hidden font-sans">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[80]">
            <div className="w-screen max-w-[440px] bg-white dark:bg-zinc-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-zinc-800 animate-in slide-in-from-right duration-200">
              
              {/* Header Drawer */}
              <div className="p-4 bg-slate-50 dark:bg-zinc-850 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Thông báo gian hàng</span>
                    {counts.pending > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                        {counts.pending} đơn chờ duyệt
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Quản lý thông báo, đơn hàng & đánh giá
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Nút mở sang chế độ lưới */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      setIsGridOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-[#003B2B] hover:bg-[#00281D] text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                    title="Mở chế độ Lưới để lên đơn nhanh"
                  >
                    <span className="material-symbols-outlined text-sm">grid_view</span>
                    <span>Lưới lên đơn</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
              </div>

              {/* Bộ lọc Tab trong Drawer */}
              <div className="flex items-center gap-1 p-2 bg-slate-100/60 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800 overflow-x-auto scrollbar-none">
                {filterTabs.map((tab) => {
                  const isActive = activeFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                        isActive
                          ? 'bg-white dark:bg-zinc-900 text-[#003B2B] dark:text-emerald-400 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1 py-0.2 rounded-full ${
                          tab.highlight
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold'
                            : 'bg-slate-200/80 dark:bg-zinc-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Danh sách thông báo */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredCards.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs">
                    <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-zinc-600 block mb-1">
                      inbox
                    </span>
                    Không có thông báo nào trong mục này
                  </div>
                ) : (
                  filteredCards.map((card) => {
                    const isUnread = !card.isRead;
                    const isOrderPending = card.category === 'ORDER_PENDING';
                    const isOrderOther = card.category === 'ORDER_OTHER';
                    const isReview = card.category === 'REVIEW';

                    return (
                      <div
                        key={card.id}
                        onClick={() => {
                          if (card.cleanCode) {
                            setActiveModalOrder(card);
                          }
                          if (card.notifId && isUnread) {
                            markAsRead(card.notifId);
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isUnread
                            ? 'bg-emerald-50/40 border-emerald-200/80 dark:bg-emerald-950/20 dark:border-zinc-800'
                            : 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800/80 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            {isOrderPending ? (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px]">
                                Chờ duyệt
                              </span>
                            ) : isOrderOther ? (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                                Đơn hàng
                              </span>
                            ) : isReview ? (
                              <span className="px-1.5 py-0.2 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 font-bold text-[10px]">
                                ⭐ Đánh giá
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 dark:bg-zinc-800 text-[10px]">
                                Hệ thống
                              </span>
                            )}
                            <span className="truncate max-w-[200px]">{card.title}</span>
                          </span>
                          <span className="text-[10px] whitespace-nowrap">
                            {formatFriendlyTime(card.createdAt)}
                          </span>
                        </div>

                        {/* Thân thông báo */}
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                          {card.message}
                        </p>

                        {/* Nếu là Đơn hàng: hiển thị tóm tắt tựa sách & nút duyệt nhanh */}
                        {card.cleanCode && (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                            <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                              #{card.cleanCode}
                            </span>
                            {isOrderPending && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmOrder(card);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#003B2B] hover:bg-[#00281D] text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                              >
                                Xác nhận đơn ngay
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer Drawer */}
              <div className="p-3 bg-slate-50 dark:bg-zinc-850 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-xs font-semibold text-slate-500 hover:text-[#003B2B] cursor-pointer"
                  >
                    Đánh dấu đã đọc tất cả
                  </button>
                ) : (
                  <span className="text-slate-400 text-xs">Đã đọc hết</span>
                )}

                <Link
                  href={defaultFullPage}
                  onClick={() => setIsDrawerOpen(false)}
                  className="font-bold text-[#003B2B] dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Xem tất cả thông báo</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ===================================================================== */}
      {/* 3. TRUNG TÂM LÊN ĐƠN & XỬ LÝ NHANH DẠNG LƯỚI (CHUẨN UX NGƯỜI BÁN THỰC TẾ) */}
      {/* ===================================================================== */}
      {isMounted && isGridOpen && createPortal(
        <div className="fixed inset-0 z-[95] bg-slate-900/40 backdrop-blur-xs flex flex-col font-sans animate-in fade-in duration-150">
          
          {/* Header Kiosk: Đầy đủ tùy chọn cột, chọn nhiều & đóng */}
          <div className="px-4 sm:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-[#003B2B] dark:text-emerald-400">
                grid_view
              </span>
              <div>
                <h2 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Trung Tâm Xử Lý Thông Báo &amp; Đơn Hàng</span>
                  {counts.pending > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold animate-pulse">
                      {counts.pending} đơn chờ xác nhận
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  Hiển thị đầy đủ thông báo gian hàng, tựa sách cần đóng gói và xác nhận đơn tốc độ cao
                </p>
              </div>
            </div>

            {/* Các công cụ điều khiển bên phải */}
            <div className="flex items-center gap-2">
              {/* Tùy chọn cột responsive (8 - 4 - 2) */}
              <div className="hidden md:flex items-center bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span className="px-2 text-[11px] text-slate-400">Lưới:</span>
                <button
                  type="button"
                  onClick={() => setColsMode('auto')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    colsMode === 'auto'
                      ? 'bg-white dark:bg-zinc-900 text-[#003B2B] dark:text-emerald-400 font-bold shadow-2xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Tự động (8-4-2)
                </button>
                <button
                  type="button"
                  onClick={() => setColsMode('2')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    colsMode === '2'
                      ? 'bg-white dark:bg-zinc-900 text-[#003B2B] dark:text-emerald-400 font-bold shadow-2xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  2 cột
                </button>
                <button
                  type="button"
                  onClick={() => setColsMode('4')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    colsMode === '4'
                      ? 'bg-white dark:bg-zinc-900 text-[#003B2B] dark:text-emerald-400 font-bold shadow-2xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  4 cột
                </button>
                <button
                  type="button"
                  onClick={() => setColsMode('6')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    colsMode === '6'
                      ? 'bg-white dark:bg-zinc-900 text-[#003B2B] dark:text-emerald-400 font-bold shadow-2xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  6 cột
                </button>
              </div>

              {/* Nút Chọn nhiều (Facebook-style) */}
              <button
                type="button"
                onClick={() => {
                  setIsMultiSelect(!isMultiSelect);
                  setSelectedIds(new Set());
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isMultiSelect
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-500'
                    : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="material-symbols-outlined text-sm">checklist</span>
                <span>{isMultiSelect ? 'Đang chọn' : 'Chọn nhiều'}</span>
              </button>

              {/* Nút đóng */}
              <button
                type="button"
                onClick={() => {
                  setIsGridOpen(false);
                  setIsMultiSelect(false);
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
                title="Đóng (ESC)"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>

          {/* Thanh phân loại Tab Lọc */}
          <div className="px-4 sm:px-6 py-2 bg-slate-50 dark:bg-zinc-850 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none shrink-0">
            <div className="flex items-center gap-2">
              {filterTabs.map((tab) => {
                const isActive = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      isActive
                        ? 'bg-[#003B2B] text-white shadow-xs'
                        : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200/80 dark:border-zinc-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : tab.highlight
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Trạng thái số lượng */}
            <div className="text-xs text-slate-400 whitespace-nowrap hidden lg:block">
              Hiển thị {filteredCards.length} mục
            </div>
          </div>

          {/* Thanh tác vụ hàng loạt khi bật Chọn nhiều (Facebook-style floating bar) */}
          {isMultiSelect && (
            <div className="px-6 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between shrink-0 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="font-bold text-[#003B2B] dark:text-emerald-300 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-base">
                    {selectedIds.size === filteredCards.length
                      ? 'check_box'
                      : 'check_box_outline_blank'}
                  </span>
                  <span>
                    {selectedIds.size === filteredCards.length
                      ? 'Bỏ chọn tất cả'
                      : 'Chọn tất cả'}
                  </span>
                </button>
                <span className="text-slate-600 dark:text-slate-300">
                  Đã chọn: <strong className="text-[#003B2B]">{selectedIds.size}</strong> mục
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={selectedIds.size === 0}
                  onClick={handleBulkMarkRead}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  Đánh dấu đã đọc
                </button>
                <button
                  type="button"
                  disabled={selectedIds.size === 0}
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  Xóa đã chọn
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMultiSelect(false);
                    setSelectedIds(new Set());
                  }}
                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          {/* Vùng Lưới Thẻ Thông Báo & Lên Đơn */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 dark:bg-zinc-950">
            {filteredCards.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#003B2B] dark:text-emerald-400 flex items-center justify-center mb-3 shadow-xs">
                  <span className="material-symbols-outlined text-3xl">check_circle</span>
                </div>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white mb-1">
                  Đã xử lý sạch sẽ!
                </h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  {activeFilter === 'PENDING_ORDER'
                    ? 'Tuyệt vời! Không còn đơn hàng nào đang chờ gian hàng bạn xác nhận.'
                    : 'Không có thông báo nào trong danh mục này.'}
                </p>
              </div>
            ) : (
              <div
                className={`grid gap-4 ${
                  colsMode === '2'
                    ? 'grid-cols-1 md:grid-cols-2'
                    : colsMode === '4'
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                    : colsMode === '6'
                    ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4'
                }`}
              >
                {filteredCards.map((card) => {
                  const orderKey = card.cleanCode || card.id;
                  const isAnimating = animatingOutIds.has(orderKey);
                  const isSelected = selectedIds.has(card.id);

                  const isOrderPending = card.category === 'ORDER_PENDING';
                  const isOrderOther = card.category === 'ORDER_OTHER';
                  const isReview = card.category === 'REVIEW';
                  const isShipping = card.category === 'SHIPPING';
                  const isFinance = card.category === 'FINANCE';

                  return (
                    <div
                      key={card.id}
                      className={`relative bg-white dark:bg-zinc-900 rounded-2xl border p-4.5 shadow-xs hover:shadow-md flex flex-col justify-between transition-all duration-500 ease-out transform ${
                        isAnimating
                          ? 'translate-x-full opacity-0 scale-95 pointer-events-none'
                          : 'translate-x-0 opacity-100 scale-100'
                      } ${
                        isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                          : 'border-slate-200/90 dark:border-zinc-800'
                      }`}
                    >
                      {/* Checkbox chọn nhiều */}
                      {isMultiSelect && (
                        <div
                          className="absolute top-3 right-3 z-10 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectCard(card.id);
                          }}
                        >
                          <span
                            className={`material-symbols-outlined text-xl ${
                              isSelected
                                ? 'text-emerald-600'
                                : 'text-slate-300 hover:text-slate-500'
                            }`}
                          >
                            {isSelected ? 'check_box' : 'check_box_outline_blank'}
                          </span>
                        </div>
                      )}

                      <div>
                        {/* -------------------------------------------------- */}
                        {/* HÀNG 1: HEADER THẺ - LOẠI THÔNG BÁO & TRẠNG THÁI */}
                        {/* -------------------------------------------------- */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2.5 mb-3">
                          <div className="flex items-center gap-1.5">
                            {isOrderPending ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                <span className="material-symbols-outlined text-xs">pending_actions</span>
                                <span>Chờ xác nhận</span>
                              </span>
                            ) : isOrderOther ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                <span>Đã xác nhận</span>
                              </span>
                            ) : isReview ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
                                <span className="material-symbols-outlined text-xs">star</span>
                                <span>Đánh giá mới</span>
                              </span>
                            ) : isShipping ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                <span className="material-symbols-outlined text-xs">local_shipping</span>
                                <span>Vận chuyển</span>
                              </span>
                            ) : isFinance ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                <span className="material-symbols-outlined text-xs">account_balance_wallet</span>
                                <span>Tài chính / Ví</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-slate-300">
                                <span className="material-symbols-outlined text-xs">info</span>
                                <span>Hệ thống</span>
                              </span>
                            )}

                            {card.cleanCode && (
                              <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                                #{card.cleanCode}
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-slate-400">
                            {formatFriendlyTime(card.createdAt)}
                          </span>
                        </div>

                        {/* -------------------------------------------------- */}
                        {/* HÀNG 2: NỘI DUNG CHÍNH (ĐƠN HÀNG / ĐÁNH GIÁ / KHÁC) */}
                        {/* -------------------------------------------------- */}

                        {/* TRƯỜNG HỢP A: THẺ ĐƠN HÀNG (Có tựa sách, bìa sách, địa chỉ nhận) */}
                        {(isOrderPending || isOrderOther) && (
                          <div className="space-y-2.5 mb-3">
                            {/* Hộp Sách Cần Đóng Gói */}
                            <div className="space-y-1.5">
                              {card.items && card.items.length > 0 ? (
                                card.items.slice(0, 2).map((book) => (
                                  <div
                                    key={book.id}
                                    className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800"
                                  >
                                    <img
                                      src={book.cover}
                                      alt={book.title}
                                      className="w-11 h-15 rounded-lg object-cover shadow-2xs border border-slate-200 dark:border-zinc-700 shrink-0"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80';
                                      }}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <h5 className="font-bold text-xs text-slate-900 dark:text-white leading-snug line-clamp-2">
                                        {book.title}
                                      </h5>
                                      <div className="flex items-center gap-2 mt-1 text-xs">
                                        <span className="font-bold text-[#003B2B] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                                          SL: {book.quantity} cuốn
                                        </span>
                                        <span className="text-slate-400 text-[11px]">
                                          {book.format}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
                                  <img
                                    src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80"
                                    alt="Kiện sách"
                                    className="w-11 h-15 rounded-lg object-cover shadow-2xs border border-slate-200 dark:border-zinc-700 shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <h5 className="font-bold text-xs text-slate-900 dark:text-white leading-snug line-clamp-2">
                                      {card.title || `Tác phẩm theo đơn #${card.cleanCode}`}
                                    </h5>
                                    <div className="flex items-center gap-2 mt-1 text-xs">
                                      <span className="font-bold text-[#003B2B] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                                        SL: 1 cuốn
                                      </span>
                                      <span className="text-slate-400 text-[11px]">Sách giấy</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {card.items && card.items.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => setActiveModalOrder(card)}
                                  className="w-full text-center text-[11px] font-bold text-[#003B2B] dark:text-emerald-400 hover:underline py-1"
                                >
                                  +{card.items.length - 2} cuốn sách khác (Xem toàn bộ)
                                </button>
                              )}
                            </div>

                            {/* Thông tin người nhận & Địa chỉ giao */}
                            <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                              <div className="flex items-center justify-between font-semibold">
                                <span className="text-slate-900 dark:text-white truncate">
                                  {card.recipientName} {card.phone && `· ${card.phone}`}
                                </span>
                                <span className="text-[10px] font-bold uppercase text-slate-500">
                                  {card.paymentMethod}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                {card.address}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* TRƯỜNG HỢP B: THẺ ĐÁNH GIÁ (Sao vàng, nhận xét từ độc giả) */}
                        {isReview && (
                          <div className="p-3 rounded-xl bg-yellow-50/50 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-900/30 mb-3 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {card.reviewerName || 'Khách hàng'}
                              </span>
                              <div className="flex text-amber-500 text-xs">
                                {'★'.repeat(card.rating || 5)}
                              </div>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 italic line-clamp-3">
                              "{card.comment}"
                            </p>
                            {card.bookTitle && (
                              <p className="text-[11px] text-slate-400 font-medium">
                                Sách: {card.bookTitle}
                              </p>
                            )}
                          </div>
                        )}

                        {/* TRƯỜNG HỢP C: VẬN CHUYỂN HOẶC HỆ THỐNG */}
                        {!isOrderPending && !isOrderOther && !isReview && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 mb-3">
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white mb-1">
                              {card.title}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              {card.message}
                            </p>
                            {card.trackingCode && (
                              <div className="mt-2 text-[11px] font-mono text-blue-600 dark:text-blue-400">
                                Mã vận đơn: {card.trackingCode} ({card.carrier})
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* -------------------------------------------------- */}
                      {/* HÀNG 3: CHÂN THẺ - TIỀN THU & NÚT THAO TÁC RÕ RÀNG */}
                      {/* -------------------------------------------------- */}
                      <div className="pt-2.5 border-t border-slate-100 dark:border-zinc-800 mt-auto">
                        {isOrderPending ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 font-medium">Tiền thu:</span>
                              <span className="font-mono font-black text-sm text-[#003B2B] dark:text-emerald-400">
                                {(card.grandTotal || 0).toLocaleString('vi-VN')} ₫
                              </span>
                            </div>

                            {canConfirmOrders ? (
                              <button
                                type="button"
                                onClick={() => handleConfirmOrder(card)}
                                className="w-full py-2.5 px-3 rounded-xl bg-[#003B2B] hover:bg-[#00281D] text-white text-xs font-bold shadow-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <span>Xác nhận đơn ngay</span>
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                              </button>
                            ) : (
                              <div className="w-full py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 text-xs text-center font-medium">
                                🔒 Cần quyền ORDER_PROCESS để duyệt
                              </div>
                            )}
                          </div>
                        ) : isOrderOther ? (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">
                              Tổng: {(card.grandTotal || 0).toLocaleString('vi-VN')} ₫
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveModalOrder(card)}
                              className="font-bold text-[#003B2B] dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>Xem chi tiết</span>
                              <span className="material-symbols-outlined text-sm">open_in_new</span>
                            </button>
                          </div>
                        ) : isReview ? (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Độc giả HUKI</span>
                            <Link
                              href="/seller/reviews"
                              onClick={() => setIsGridOpen(false)}
                              className="font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                            >
                              <span>Xem đánh giá</span>
                              <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </Link>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">HUKI Kênh bán</span>
                            <span className="text-xs text-slate-500 font-medium">
                              Đã ghi nhận
                            </span>
                          </div>
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
      {/* 4. MODAL CHI TIẾT ĐƠN HÀNG (KHI XEM TỪ DANH SÁCH HOẶC BẤM XEM THÊM SÁCH) */}
      {/* ===================================================================== */}
      {isMounted && activeModalOrder && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setActiveModalOrder(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-sm text-[#003B2B] dark:text-emerald-400">
                  #{activeModalOrder.cleanCode || activeModalOrder.orderCode}
                </span>
                <span className="ml-2 text-xs text-slate-400">Chi tiết đơn hàng &amp; danh sách sách</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalOrder(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Nội dung sách */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Sách cần đóng gói ({activeModalOrder.items?.length || 1}):
              </div>

              {activeModalOrder.items && activeModalOrder.items.length > 0 ? (
                activeModalOrder.items.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700"
                  >
                    <img
                      src={b.cover}
                      alt={b.title}
                      className="w-12 h-16 rounded object-cover shadow-xs border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                        {b.title}
                      </h5>
                      <div className="text-xs text-slate-500 mt-1">
                        Số lượng: <strong className="text-[#003B2B]">{b.quantity} cuốn</strong> ({b.format})
                      </div>
                    </div>
                    <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {(b.price * b.quantity).toLocaleString('vi-VN')} ₫
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700">
                  <img
                    src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80"
                    alt="Gói ấn phẩm"
                    className="w-12 h-16 rounded object-cover shadow-xs border border-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                      Gói sách theo đơn #{activeModalOrder.cleanCode}
                    </h5>
                    <div className="text-xs text-slate-500 mt-1">
                      Số lượng: <strong className="text-[#003B2B]">1 kiện</strong> (Sách giấy)
                    </div>
                  </div>
                  <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                    {(activeModalOrder.grandTotal || 0).toLocaleString('vi-VN')} ₫
                  </div>
                </div>
              )}

              {/* Thông tin giao hàng */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 text-xs space-y-1 mt-3">
                <div className="font-bold text-slate-900 dark:text-white">
                  Người nhận: {activeModalOrder.recipientName} ({activeModalOrder.phone})
                </div>
                <div className="text-slate-500">
                  Địa chỉ: {activeModalOrder.address}
                </div>
                <div className="text-slate-500">
                  Thanh toán: {activeModalOrder.paymentMethod}
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">Tổng tiền thu: </span>
                <span className="font-mono font-bold text-sm text-[#003B2B] dark:text-emerald-400">
                  {(activeModalOrder.grandTotal || 0).toLocaleString('vi-VN')} ₫
                </span>
              </div>

              {activeModalOrder.isPendingOrder && (
                <button
                  type="button"
                  onClick={() => {
                    handleConfirmOrder(activeModalOrder);
                    setActiveModalOrder(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#003B2B] hover:bg-[#00281D] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  Xác nhận đơn ngay
                </button>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
