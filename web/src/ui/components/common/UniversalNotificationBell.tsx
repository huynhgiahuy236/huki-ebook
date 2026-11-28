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
import { adminNotificationService, AdminBroadcastNotification } from '@/ui/services/adminNotificationService';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';

export interface UniversalNotificationBellProps {
  variant?: 'user' | 'seller' | 'shipper' | 'admin' | 'affiliate';
  fullPageRoute?: string;
  className?: string;
}

// Bộ lọc danh mục
type FilterCategory =
  | 'ALL'
  | 'PENDING_ORDER'
  | 'ORDER'
  | 'AFFILIATE'
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
    | 'AFFILIATE'
    | 'REVIEW'
    | 'SHIPPING'
    | 'FINANCE'
    | 'SYSTEM';
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  content?: string;
  actionUrl?: string;
  actionLabel?: string;
  authorName?: string;
  severity?: string;

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
  // Modal xem chi tiết thông báo hệ thống / quản trị sàn
  const [activeModalNotif, setActiveModalNotif] = useState<UnifiedCard | null>(null);

  // Animation trượt ngang khi duyệt đơn và danh sách đơn đã xử lý
  const [animatingOutIds, setAnimatingOutIds] = useState<Set<string>>(new Set());
  const [processedOrderIds, setProcessedOrderIds] = useState<Set<string>>(new Set());

  const isSeller = variant === 'seller';
  const isAdmin = variant === 'admin';
  const isShipper = variant === 'shipper';
  const isAffiliate = variant === 'affiliate';

  // Cache thông tin đơn hàng đầy đủ từ backend
  const [orderCache, setOrderCache] = useState<Map<string, SellerOrder>>(new Map());
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Broadcast announcements from admin / system
  const [adminNotifs, setAdminNotifs] = useState<AdminBroadcastNotification[]>([]);

  // Trạng thái đánh dấu thẻ đã kiểm tra (tránh nhìn nhầm khi đóng gói / soạn sách)
  const [markedCardIds, setMarkedCardIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('huki_marked_order_cards');
        if (stored) return new Set(JSON.parse(stored));
      } catch {}
    }
    return new Set();
  });

  // Bộ lọc: Chỉ hiện đơn chưa đánh dấu
  const [onlyUnmarked, setOnlyUnmarked] = useState(false);

  const toggleMarkCard = useCallback((id: string) => {
    setMarkedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('huki_marked_order_cards', JSON.stringify(Array.from(next)));
        } catch {}
      }
      return next;
    });
  }, []);

  const clearAllMarks = useCallback(() => {
    setMarkedCardIds(new Set());
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('huki_marked_order_cards');
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!isSeller) return;
    const currentBizId = user?.business?.id || undefined;
    const sellerCreatedAt = user?.business?.createdAt || user?.createdAt || undefined;

    const loadAdminNotifs = () => {
      const list = adminNotificationService.getForSeller(currentBizId, true, sellerCreatedAt);
      setAdminNotifs(list);
    };

    loadAdminNotifs();
    window.addEventListener('huki_admin_notifications_updated', loadAdminNotifs);
    const unsub = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'ADMIN_NOTIFICATIONS_UPDATED' || msg.type === 'FEATURE_FLAGS_UPDATED') {
        loadAdminNotifs();
      }
    });

    return () => {
      window.removeEventListener('huki_admin_notifications_updated', loadAdminNotifs);
      unsub();
    };
  }, [isSeller, user]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // -------------------------------------------------------------------------
  // 1. PHÂN QUYỀN CHUẨN CHỈNH
  // -------------------------------------------------------------------------
  const canConfirmOrders = useMemo(() => {
    // Chỉ có người bán (BUSINESS) hoặc nhân viên có quyền ORDER_PROCESS mới được xác nhận đơn của shop
    // Quản trị viên sàn giám sát tuân thủ, tuyệt đối không xác nhận hay đóng gói đơn thay cho người bán
    if (!isSeller) return false;
    if (!user) return false;
    if (user.role === 'BUSINESS') return true;
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
      case 'affiliate':
        return 'USER' as const;
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

  const effectiveUnreadCount = useMemo(() => {
    if (!isSeller && !isAdmin) {
      return unreadCount;
    }
    const currentBiz = user?.business?.id || 'default_seller';
    const unreadAdminCount = adminNotifs.filter(
      (an) => !an.readByBusinessIds?.includes(currentBiz)
    ).length;
    return unreadCount + unreadAdminCount;
  }, [unreadCount, adminNotifs, user, isSeller, isAdmin]);

  const handleMarkAllAsReadUnified = useCallback(() => {
    markAllAsRead();
    if (isSeller) {
      adminNotificationService.markAllAsRead(user?.business?.id);
    }
  }, [markAllAsRead, isSeller, user]);

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

      // Kiểm tra có phải thông báo Vận chuyển (ưu tiên kiểm tra trước đơn hàng)
      const isShippingNotif =
        n.type === 'SHIPPING_UPDATE' ||
        lowerTitle.includes('vận chuyển') ||
        lowerMsg.includes('vận chuyển') ||
        lowerTitle.includes('giao hàng') ||
        lowerMsg.includes('giao hàng');

      // Kiểm tra Tin nhắn Chat mới TRƯỚC khi bắt từ khóa Vận chuyển / Đơn hàng
      if (n.type === 'NEW_MESSAGE') {
        const convId = payload.conversationId ? String(payload.conversationId) : '';
        const defaultChatAction = isSeller
          ? (convId ? `/seller/chat?conversationId=${encodeURIComponent(convId)}` : '/seller/chat')
          : (convId ? `/account/messages?conversationId=${encodeURIComponent(convId)}` : '/account/messages');
        list.push({
          id: n.id,
          notifId: n.id,
          category: 'SYSTEM',
          title: n.title || 'Tin nhắn mới từ khách hàng',
          message: n.message,
          content: n.message,
          actionUrl: n.actionUrl || defaultChatAction,
          actionLabel: 'Trả lời ngay',
          createdAt: n.createdAt,
          isRead: n.isRead,
        });
        return;
      }

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
          actionUrl: payload.orderCode ? `/orders/${payload.orderCode}` : '/account/orders',
          actionLabel: 'Theo dõi đơn hàng',
        });
        return;
      }

      // Kiểm tra có phải thông báo Đơn hàng thật (theo type hoặc mã ORD-, tránh bắt nhầm thông báo Flash Sale / Hệ thống)
      const hasOrderCodeInText = Boolean(
        payload.orderCode ||
        n.title?.match(/(ORD-[A-Za-z0-9-]+)/i) ||
        n.message?.match(/(ORD-[A-Za-z0-9-]+)/i)
      );
      const isFlashSaleOrSystemText =
        lowerTitle.includes('flash sale') ||
        lowerMsg.includes('flash sale') ||
        lowerTitle.includes('bảo trì') ||
        lowerTitle.includes('sao quả tạ');

      const isOrderNotif =
        !isFlashSaleOrSystemText &&
        (n.type === 'ORDER_STATUS' ||
          n.type === 'ORDER_CREATED' ||
          n.type === 'ORDER_MESSAGE' ||
          hasOrderCodeInText);

      if (isOrderNotif) {
        const rawCode =
          payload.orderCode ||
          n.title?.match(/(ORD-[A-Za-z0-9-]+)/i)?.[1] ||
          n.message?.match(/(ORD-[A-Za-z0-9-]+)/i)?.[1] ||
          '';
        const cleanCode = rawCode ? String(rawCode).replace(/-S\d+$/, '') : '';

        // ĐỐI VỚI ADMIN: Admin là ban quản trị sàn, không phải seller lên đơn.
        // Tuyệt đối không hiển thị "Chờ xác nhận", không hiển thị "Xác nhận đơn ngay"
        if (isAdmin) {
          const isSlaAlert =
            n.type === 'WATCHDOG_ALERT' ||
            n.category === 'AUTO_WATCHDOG' ||
            lowerTitle.includes('sla') ||
            lowerMsg.includes('sau 24h') ||
            lowerMsg.includes('chưa xử lý đơn') ||
            lowerMsg.includes('chậm tiến độ') ||
            Boolean(payload.isSlaViolation);

          const targetStoreId = payload.storeId || '';

          if (isSlaAlert) {
            list.push({
              id: n.id,
              notifId: n.id,
              category: 'SYSTEM',
              title: n.title?.includes('[Giám sát SLA]')
                ? n.title
                : `[Giám sát SLA] Đơn trễ hạn > 24h (${cleanCode ? '#' + cleanCode : 'Cảnh báo vi phạm'})`,
              message: n.message,
              content: n.message,
              createdAt: n.createdAt,
              isRead: n.isRead,
              actionUrl: targetStoreId
                ? `/admin/penalty-arbitration?storeId=${encodeURIComponent(targetStoreId)}`
                : '/admin/penalty-arbitration',
              actionLabel: 'Xem Trọng Tài Sao Quả Tạ',
              authorName: 'Giám Sát SLA Sàn',
              severity: 'WARNING',
            });
            return;
          }

          // Thông báo đơn hàng chung trên sàn cho Admin: xem tổng quan, không lên đơn
          list.push({
            id: n.id,
            notifId: n.id,
            category: 'SYSTEM',
            title: n.title || 'Cập nhật đơn hàng trên sàn',
            message: n.message,
            content: n.message,
            createdAt: n.createdAt,
            isRead: n.isRead,
            actionUrl: '/admin/orders',
            actionLabel: 'Xem đơn hàng sàn',
          });
          return;
        }

        // ĐỐI VỚI SELLER (variant === 'seller'): Đưa vào danh sách xử lý đơn hàng người bán
        if (isSeller) {
          if (cleanCode) seenOrderCodes.add(cleanCode);

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
          if (!cached && cleanCode) {
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
            : payload.status === 'PENDING_CONFIRMATION';

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

        // ĐỐI VỚI BUYER / KHÁCH HÀNG (variant === 'store' hoặc người mua cá nhân):
        // Giữ nguyên tiêu đề và nội dung thông báo đơn mua, tuyệt đối không đổi thành "Có đơn hàng mới chờ xác nhận"
        if (cleanCode) seenOrderCodes.add(cleanCode);
        list.push({
          id: n.id,
          notifId: n.id,
          category: 'ORDER_OTHER',
          title: n.title || (cleanCode ? `Đơn hàng #${cleanCode}` : 'Cập nhật đơn hàng'),
          message: n.message,
          content: n.message,
          createdAt: n.createdAt,
          isRead: n.isRead,
          orderCode: cleanCode || rawCode,
          cleanCode: cleanCode || rawCode,
          actionUrl: cleanCode ? `/orders/${cleanCode}` : '/orders',
          actionLabel: 'Xem chi tiết đơn mua',
        });
        return;
      }

      // Kiểm tra có phải thông báo Hoa hồng / Tiếp thị liên kết (Affiliate)
      const isAffiliateNotif =
        n.type?.startsWith('AFFILIATE_') ||
        n.type?.startsWith('COMMISSION_') ||
        lowerTitle.includes('hoa hồng') ||
        lowerMsg.includes('hoa hồng') ||
        lowerTitle.includes('tiếp thị') ||
        lowerMsg.includes('tiếp thị') ||
        lowerTitle.includes('affiliate') ||
        lowerMsg.includes('affiliate');

      if (isAffiliateNotif) {
        list.push({
          id: n.id,
          notifId: n.id,
          category: 'AFFILIATE',
          title: n.title || 'Hoa hồng & Tiếp thị liên kết',
          message: n.message,
          createdAt: n.createdAt,
          isRead: n.isRead,
          actionUrl: n.actionUrl || '/affiliate/dashboard',
          actionLabel: 'Xem chi tiết hoa hồng',
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

        const reviewId = String(payload.reviewId || '').trim();
        const defaultReviewAction = isSeller
          ? (reviewId ? `/seller/reviews?reviewId=${encodeURIComponent(reviewId)}` : '/seller/reviews')
          : (payload.bookId || payload.targetId
              ? `/book/${encodeURIComponent(String(payload.bookId || payload.targetId))}#reviews`
              : undefined);

        list.push({
          id: n.id,
          notifId: n.id,
          category: 'REVIEW',
          title: n.title || 'Đánh giá sản phẩm mới',
          message: n.message,
          createdAt: n.createdAt,
          isRead: n.isRead,
          actionUrl: n.actionUrl || defaultReviewAction,
          rating,
          reviewerName,
          comment,
          bookTitle,
        });
        return;
      }


      // Kiểm tra có phải thông báo Tin nhắn Chat mới
      if (n.type === 'NEW_MESSAGE') {
        const convId = payload.conversationId ? String(payload.conversationId) : '';
        const defaultChatAction = isSeller
          ? (convId ? `/seller/chat?conversationId=${encodeURIComponent(convId)}` : '/seller/chat')
          : (convId ? `/account/messages?conversationId=${encodeURIComponent(convId)}` : '/account/messages');
        list.push({
          id: n.id,
          notifId: n.id,
          category: 'SYSTEM',
          title: n.title || 'Tin nhắn mới từ khách hàng',
          message: n.message,
          content: n.message,
          actionUrl: n.actionUrl || defaultChatAction,
          actionLabel: 'Trả lời ngay',
          createdAt: n.createdAt,
          isRead: n.isRead,
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
        content: n.message,
        actionUrl: n.actionUrl || undefined,
        createdAt: n.createdAt,
        isRead: n.isRead,
      });
    });

    // 1.5 Bổ sung các thông báo hệ thống / bảo trì / mở lại từ Ban Quản Trị Hệ Thống (chỉ cho Seller hoặc Admin)
    if (isSeller || isAdmin) {
      const currentBiz = user?.business?.id || 'default_seller';
      adminNotifs.forEach((an) => {
        const isRead = Boolean(an.readByBusinessIds?.includes(currentBiz));
        list.push({
          id: an.id,
          notifId: an.id,
          category: 'SYSTEM',
          title: an.title,
          message: an.summary || an.content,
          content: an.content || an.summary,
          actionUrl: an.actionUrl || undefined,
          actionLabel: an.actionLabel || undefined,
          authorName: an.authorName || 'Ban Quản Trị HUKI',
          severity: an.severity,
          createdAt: an.createdAt,
          isRead,
        });
      });
    }

    // 2. Bổ sung các đơn hàng Chờ xác nhận trong orderCache nếu chưa có thông báo tương ứng (Chỉ dành cho SELLER)
    if (isSeller) {
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
    }

    // Deduplicate repetitive SYSTEM notifications by title & prioritize actionable Seller tasks first
    const seenSystemTitles = new Set<string>();
    const deduped = list.filter((item) => {
      if (item.category === 'SYSTEM') {
        const key = (item.title || '').trim().toLowerCase();
        if (seenSystemTitles.has(key)) return false;
        seenSystemTitles.add(key);
      }
      return true;
    });

    const priorityRank: Record<string, number> = {
      ORDER_PENDING: 0,
      ORDER_OTHER: 1,
      SHIPPING: 2,
      REVIEW: 3,
      AFFILIATE: 4,
      FINANCE: 5,
      SYSTEM: 6,
    };

    return deduped.sort((a, b) => {
      const ra = priorityRank[a.category] ?? 9;
      const rb = priorityRank[b.category] ?? 9;
      if (ra !== rb) return ra - rb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notifications, orderCache, adminNotifs, user, normalizeItemsList]);

  // -------------------------------------------------------------------------
  // 6. TÍNH TOÁN SỐ LƯỢNG CHO TỪNG BỘ LỌC
  // -------------------------------------------------------------------------
  const counts = useMemo(() => {
    let pending = 0;
    let order = 0;
    let affiliate = 0;
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
      } else if (c.category === 'AFFILIATE') {
        affiliate++;
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

    return { total, pending, order, affiliate, review, shipping, system };
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
        case 'AFFILIATE':
          return c.category === 'AFFILIATE';
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

  // Danh sách thẻ hiển thị sau khi áp dụng bộ lọc đánh dấu
  const displayedCards = useMemo((): UnifiedCard[] => {
    if (onlyUnmarked) {
      return filteredCards.filter((c) => !markedCardIds.has(c.id));
    }
    return filteredCards;
  }, [filteredCards, onlyUnmarked, markedCardIds]);

  // Số lượng đơn đã đánh dấu trong tab hiện tại
  const currentTabMarkedCount = useMemo(() => {
    return filteredCards.filter((c) => markedCardIds.has(c.id)).length;
  }, [filteredCards, markedCardIds]);

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

  const handleMarkCardAsRead = useCallback(
    async (card: UnifiedCard) => {
      if (card.notifId) {
        await markAsRead(card.notifId);
      }
      const currentBiz = user?.business?.id || 'default_seller';
      if (card.category === 'SYSTEM' && card.id) {
        adminNotificationService.markAsRead(card.id, currentBiz);
      }
    },
    [markAsRead, user?.business?.id]
  );

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

  // Danh sách các Tab lọc (Được tùy biến thông minh theo vai trò Admin / Seller / Shipper)
  const filterTabs = useMemo(() => {
    if (isAdmin) {
      return [
        {
          id: 'ALL' as const,
          label: 'Tất cả',
          count: counts.total,
          icon: 'notifications',
        },
        {
          id: 'SYSTEM' as const,
          label: 'Giám sát SLA & Cảnh báo',
          count: counts.system,
          icon: 'gavel',
        },
      ];
    }

    if (variant === 'user') {
      return [
        {
          id: 'ALL' as const,
          label: 'Tất cả',
          count: counts.total,
          icon: 'notifications',
        },
        {
          id: 'ORDER' as const,
          label: 'Đơn mua',
          count: counts.order,
          icon: 'shopping_bag',
        },
        {
          id: 'AFFILIATE' as const,
          label: 'Tiếp thị & Hoa hồng',
          count: counts.affiliate,
          icon: 'monetization_on',
          highlight: counts.affiliate > 0,
        },
        {
          id: 'SHIPPING' as const,
          label: 'Vận chuyển',
          count: counts.shipping,
          icon: 'local_shipping',
        },
        {
          id: 'SYSTEM' as const,
          label: 'Khuyến mãi & Hệ thống',
          count: counts.system,
          icon: 'campaign',
        },
      ];
    }

    if (variant === 'shipper') {
      return [
        {
          id: 'ALL' as const,
          label: 'Tất cả',
          count: counts.total,
          icon: 'notifications',
        },
        {
          id: 'SHIPPING' as const,
          label: 'Đơn giao hàng',
          count: counts.shipping + counts.order,
          icon: 'local_shipping',
        },
        {
          id: 'SYSTEM' as const,
          label: 'Ví & Đối soát COD',
          count: counts.system,
          icon: 'account_balance_wallet',
        },
      ];
    }

    // Default: Seller
    return [
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
  }, [isAdmin, variant, counts]);

  return (
    <>
      {/* ===================================================================== */}
      {/* 1. NÚT CHUÔNG TRÊN HEADER */}
      {/* ===================================================================== */}
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => {
            if (!user) {
              if (typeof window !== 'undefined') {
                router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
              }
              return;
            }
            setIsDrawerOpen(true);
            refresh();
          }}
          className="relative flex items-center justify-center w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:text-[#00875A] transition-all cursor-pointer active:scale-90"
          title="Thông báo & Lên đơn"
          aria-label="Thông báo"
        >
          <span className="material-symbols-outlined text-[20px] text-slate-700 dark:text-slate-200">
            notifications
          </span>

          {effectiveUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-zinc-900 pointer-events-none animate-pulse">
              {effectiveUnreadCount > 99 ? '99+' : effectiveUnreadCount}
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
                    <span>
                      {isAdmin
                        ? 'Thông báo quản trị sàn'
                        : isSeller
                        ? 'Thông báo gian hàng'
                        : isShipper
                        ? 'Thông báo giao vận'
                        : 'Thông báo của bạn'}
                    </span>
                    {isSeller && counts.pending > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                        {counts.pending} đơn chờ duyệt
                      </span>
                    )}
                    {isAdmin && effectiveUnreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                        {effectiveUnreadCount} tin mới
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isAdmin
                      ? 'Giám sát vận hành sàn, cảnh báo SLA & khiếu nại'
                      : isSeller
                      ? 'Quản lý thông báo, đơn hàng & đánh giá'
                      : 'Cập nhật tin tức và thông báo hệ thống'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {isAdmin && (
                    <Link
                      href="/admin/notifications"
                      onClick={() => setIsDrawerOpen(false)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      <span>Xem tất cả</span>
                    </Link>
                  )}

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
                          if (isSeller && card.cleanCode) {
                            setActiveModalOrder(card);
                          } else if (card.actionUrl) {
                            router.push(card.actionUrl);
                          } else {
                            setActiveModalNotif(card);
                          }
                          if (!card.isRead) {
                            handleMarkCardAsRead(card);
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isUnread
                            ? 'bg-emerald-50/40 border-emerald-200/80 dark:bg-emerald-950/20 dark:border-zinc-800'
                            : 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800/80 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 min-w-0 flex-1 truncate mr-2">
                            {markedCardIds.has(card.id) && (
                              <span className="px-1.5 py-0.2 rounded bg-[#003B2B] text-emerald-300 font-bold text-[10px] flex items-center gap-0.5 shrink-0">
                                <span className="material-symbols-outlined text-[12px]">done</span>
                                <span>Đã kiểm</span>
                              </span>
                            )}
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
                            ) : card.category === 'AFFILIATE' ? (
                              <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold text-[10px]">
                                🪙 Hoa hồng
                              </span>
                            ) : card.category === 'SHIPPING' ? (
                              <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold text-[10px]">
                                🚚 Vận chuyển
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 dark:bg-zinc-800 text-[10px]">
                                Hệ thống
                              </span>
                            )}
                            <span className="truncate max-w-[200px]">{card.title}</span>
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] whitespace-nowrap">
                              {formatFriendlyTime(card.createdAt)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMarkCard(card.id);
                              }}
                              className={`w-5 h-5 rounded flex items-center justify-center transition-colors cursor-pointer ${
                                markedCardIds.has(card.id)
                                  ? 'text-emerald-600 hover:text-emerald-700'
                                  : 'text-slate-300 hover:text-slate-500'
                              }`}
                              title={markedCardIds.has(card.id) ? 'Bỏ đánh dấu' : 'Đánh dấu đã kiểm tra'}
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                {markedCardIds.has(card.id) ? 'check_box' : 'check_box_outline_blank'}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Thân thông báo */}
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                          {card.message}
                        </p>

                        {/* Nếu là Đơn hàng của Seller: hiển thị tóm tắt tựa sách & nút duyệt nhanh */}
                        {isSeller && card.cleanCode && (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                            <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                              #{card.cleanCode}
                            </span>
                            {isOrderPending && canConfirmOrders && (
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

                        {/* Nút hành động cho thẻ có actionUrl (Admin hoặc thông báo hệ thống/SLA) */}
                        {card.actionUrl && (!isSeller || !card.cleanCode) && (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!card.isRead) {
                                  handleMarkCardAsRead(card);
                                }
                                if (card.actionUrl) {
                                  setIsDrawerOpen(false);
                                  router.push(card.actionUrl);
                                } else {
                                  setActiveModalNotif(card);
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                            >
                              <span>{card.actionLabel || 'Xem chi tiết'}</span>
                              <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer Drawer */}
              <div className="p-3 bg-slate-50 dark:bg-zinc-850 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                {effectiveUnreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={handleMarkAllAsReadUnified}
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
