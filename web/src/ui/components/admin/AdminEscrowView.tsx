"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '../../api/adminApi';
import { orderApi } from '../../api/orderApi';
import { useToast } from '../../context/ToastContext';
import { AdminFilterTabs } from './AdminUI';
import GroupedDataTable, { Column } from '../common/GroupedDataTable';
import {
  DataTableFilterBar,
  DateFilterValue,
  matchesDateFilter,
  BulkActionGroup,
} from '../common';
import { realtimeSyncBus, type SyncMessage } from '../../services/realtimeSyncBus';
import { playAdminAlertSound } from '@/ui/utils/chatSound';

export interface EscrowTableItem {
  id: string; // order item id
  orderId: string;
  orderCode: string;
  orderCreatedAt: string;
  orderStatus?: string; // 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'COMPLETED'
  paymentMethod?: string;
  paymentStatus?: string;
  format?: 'PHYSICAL' | 'DIGITAL' | 'BOTH';
  deliveredAt?: string | null;
  storeId: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  bookId: string;
  bookTitle: string;
  coverUrl?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  storeVoucherDiscount?: number;
  effectiveSubtotal?: number;
  voucherInfo?: {
    code: string;
    name?: string;
    discount: number;
    scope: 'STORE' | 'PLATFORM';
  } | null;
  orderGrandTotal?: number;
  platformVoucherDiscount?: number;
  platformFee?: number;
  sellerNet?: number;
  escrowStatus: 'HOLDING' | 'FROZEN' | 'RELEASED' | 'REFUNDED' | 'PENDING_PAYMENT';
  releasedAt?: string | null;
  refundedAt?: string | null;
  frozenReason?: string | null;
  returnRequestId?: string | null;
  returnRequestStatus?: string | null;
  returnReason?: string | null;
  reverseTrackingCode?: string | null;
  reverseStatus?: string | null;
  buyerBankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
  } | null;
  remittanceInfo?: {
    isRemitted: boolean;
    remittedAt: string;
    method: string;
    txCode: string;
    shipperName: string;
    shipperCode: string;
  } | null;
}

export interface EscrowOrderGroup {
  id: string; // orderCode
  orderCode: string;
  orderGrandTotal?: number;
  orderCreatedAt: string;
  storeName: string;
  storeId: string;
  customerName: string;
  customerPhone: string;
  paymentMethod?: string;
  paymentStatus?: string;
  remittanceInfo?: {
    isRemitted: boolean;
    remittedAt: string;
    method: string;
    txCode: string;
    shipperName: string;
    shipperCode: string;
  } | null;
  totalAmount: number;
  itemsCount: number;
  items: EscrowTableItem[];
}

/**
 * Format chuỗi thời gian sang chuẩn Việt Nam (GMT+7: DD/MM/YYYY HH:mm)
 */
function formatVietnamDateTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const formatter = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const day = getPart('day');
    const month = getPart('month');
    const year = getPart('year');
    const hour = getPart('hour');
    const minute = getPart('minute');

    return `${day}/${month}/${year} ${hour}:${minute}`;
  } catch {
    return dateStr;
  }
}

export function AdminEscrowView() {
  const { showToast } = useToast();
  const [items, setItems] = useState<EscrowTableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'ALL_TIME' });
  const [selectedOrderCodes, setSelectedOrderCodes] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);
  const [nowTime, setNowTime] = useState<number>(0);
  const [expandedKeys, setExpandedKeys] = useState<(string | number)[]>([]);

  // Mount effect to initialize client-side time ticker
  useEffect(() => {
    setMounted(true);
    setNowTime(Date.now());

    const ticker = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);

    return () => clearInterval(ticker);
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.escrow-dropdown-container')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Lấy dữ liệu Escrow Items và danh sách Cửa Hàng thực tế
  const fetchEscrowItems = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const storeMap = new Map<string, string>();

      // 1. Tải Store & Business để map ID sang tên hiển thị
      try {
        const [storesRes, bizRes] = await Promise.all([
          (adminApi as any).getStores?.().catch(() => null),
          (adminApi as any).getBusinesses?.().catch(() => null),
        ]);

        const rawStores = Array.isArray(storesRes?.data)
          ? storesRes.data
          : Array.isArray((storesRes?.data as any)?.data)
          ? (storesRes?.data as any).data
          : [];

        rawStores.forEach((st: any) => {
          if (st.id && st.name) {
            storeMap.set(st.id, st.name);
          }
          if (st.slug && st.name) {
            storeMap.set(st.slug, st.name);
          }
        });

        const rawBusinesses = Array.isArray(bizRes?.data)
          ? bizRes.data
          : Array.isArray((bizRes?.data as any)?.data)
          ? (bizRes?.data as any).data
          : [];

        rawBusinesses.forEach((bz: any) => {
          if (bz.id && bz.name && !storeMap.has(bz.id)) {
            storeMap.set(bz.id, bz.name);
          }
          if (bz.slug && bz.name && !storeMap.has(bz.slug)) {
            storeMap.set(bz.slug, bz.name);
          }
        });
      } catch (e) {
        console.warn('Không thể tải danh mục Store / Business:', e);
      }

      // 2. Lấy dữ liệu Escrow Items
      if (adminApi && (adminApi as any).getEscrowItems) {
        const res = await (adminApi as any).getEscrowItems();
        if (res?.success && Array.isArray(res.data)) {
          const isUuid = (val?: string) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val || '');

          const mappedItems: EscrowTableItem[] = res.data.map((it: any) => {
            let resolvedStoreName: string | undefined;

            if (it.storeId && storeMap.has(it.storeId)) {
              resolvedStoreName = storeMap.get(it.storeId);
            } else if (it.storeName && storeMap.has(it.storeName)) {
              resolvedStoreName = storeMap.get(it.storeName);
            } else if (
              it.storeName &&
              !isUuid(it.storeName) &&
              !it.storeName.startsWith('Gian Hàng ') &&
              !it.storeName.startsWith('Gian hàng #') &&
              it.storeName.length > 3
            ) {
              resolvedStoreName = it.storeName;
            }

            if (!resolvedStoreName || isUuid(resolvedStoreName)) {
              resolvedStoreName = 'Đang cập nhật';
            }

            return {
              ...it,
              storeName: resolvedStoreName,
            };
          });
          setItems(mappedItems);
          return;
        }
      }
    } catch (err) {
      console.warn('Sử dụng dữ liệu tạm ký quỹ:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const [refundTargetItem, setRefundTargetItem] = useState<EscrowTableItem | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);

  // Sổ cái kế toán & Nhật ký đối soát chi tiết
  const [selectedLedgerOrder, setSelectedLedgerOrder] = useState<EscrowOrderGroup | null>(null);
  const [ledgerHistory, setLedgerHistory] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const handleOpenLedger = async (orderGroup: EscrowOrderGroup) => {
    setSelectedLedgerOrder(orderGroup);
    setLoadingLedger(true);
    setLedgerHistory([]);
    try {
      const orderId = orderGroup.items[0]?.orderId || orderGroup.id;
      const res = await orderApi.getOrderHistory(orderId);
      if (res.success && Array.isArray(res.data)) {
        setLedgerHistory(res.data);
      } else if (res.success && Array.isArray((res.data as any)?.timeline)) {
        setLedgerHistory((res.data as any).timeline);
      } else {
        const trackRes = await orderApi.getOrderTracking(orderId);
        if (trackRes.success && Array.isArray(trackRes.data?.timeline)) {
          setLedgerHistory(trackRes.data.timeline);
        }
      }
    } catch (e) {
      console.warn('Lỗi lấy sổ cái đơn hàng:', e);
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    fetchEscrowItems();

    // Silent background auto-polling every 3.5s for zero-F5 live sync
    const pollTimer = setInterval(() => {
      fetchEscrowItems(true);
    }, 3500);

    // Realtime event subscription
    const unsubscribe = realtimeSyncBus.subscribe((msg: SyncMessage<any>) => {
      const type = msg.type as string;
      const data = (msg.payload as any) || (msg as any).data || {};

      if (
        type === 'RETURN_REQUESTED' ||
        type === 'RETURN_CREATED' ||
        type === 'DISPUTE_RAISED'
      ) {
        playAdminAlertSound();
        showToast?.({
          title: 'Yêu cầu hoàn trả - Ký quỹ Đóng băng',
          message: data.orderCode
            ? `Đơn hàng #${data.orderCode} vừa phát sinh khiếu nại hoàn trả. Ký quỹ đã tự động ĐÓNG BĂNG!`
            : 'Đã nhận yêu cầu đổi trả mới. Dòng tiền tương ứng đã bị đóng băng!',
          type: 'warning',
        });
        fetchEscrowItems(true);
      } else if (type === 'ESCROW_FROZEN') {
        playAdminAlertSound();
        showToast?.({
          title: 'Dòng tiền bị đóng băng',
          message: data.message || 'Một giao dịch ký quỹ đã chuyển sang trạng thái ĐÓNG BĂNG để chờ đối soát.',
          type: 'warning',
        });
        fetchEscrowItems(true);
      } else if (type === 'RETURN_COMPLETED') {
        playAdminAlertSound();
        showToast?.({
          title: 'Bưu tá đã hoàn hàng về Shop',
          message: `Đơn vận hoàn #${data.reverseTrackingCode || ''} đã bàn giao về Shop! Sàn đã có thể hoàn tiền cho khách.`,
          type: 'info',
        });
        fetchEscrowItems(true);
      } else if (
        type === 'ORDER_CREATED' ||
        type === 'ORDER_PAYMENT_SUCCEEDED' ||
        type === 'ORDER_STATUS_CHANGED' ||
        type === 'SHIPPER_ORDER_CLAIMED' ||
        type === 'SHIPPER_CLAIMED' ||
        type === 'SHIPPER_PICKED_UP' ||
        type === 'SHIPPER_DELIVERED' ||
        type === 'ORDER_DELIVERED' ||
        type === 'SHIPPER_COD_REMITTED' ||
        type === 'WALLET_BALANCE_UPDATED' ||
        type === 'ESCROW_UPDATED' ||
        type === 'ESCROW_RELEASED' ||
        type === 'ESCROW_UNFROZEN' ||
        type === 'PAYOUT_REQUESTED' ||
        type === 'PAYOUT_APPROVED' ||
        type === 'PAYOUT_DISBURSED'
      ) {
        fetchEscrowItems(true);
      }
    }, { role: 'ADMIN' });

    return () => {
      clearInterval(pollTimer);
      unsubscribe();
    };
  }, [fetchEscrowItems, showToast]);

  // Xử lý thay đổi trạng thái của từng dòng sản phẩm
  const handleStatusChange = async (
    itemId: string,
    newStatus: 'HOLDING' | 'FROZEN' | 'RELEASED' | 'REFUNDED',
  ) => {
    setOpenDropdownId(null);

    const targetItem = items.find((it) => it.id === itemId);
    if (!targetItem) return;

    if (targetItem.escrowStatus === 'RELEASED' || targetItem.escrowStatus === 'REFUNDED') {
      showToast?.({
        title: 'Thao tác không khả dụng',
        message: 'Món hàng này đã kết thúc xử lý dòng tiền, không thể thay đổi trạng thái.',
        type: 'warning',
      });
      return;
    }

    setItems((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          return {
            ...it,
            escrowStatus: newStatus,
            releasedAt: newStatus === 'RELEASED' ? new Date().toLocaleString('vi-VN') : it.releasedAt,
            refundedAt: newStatus === 'REFUNDED' ? new Date().toLocaleString('vi-VN') : it.refundedAt,
          };
        }
        return it;
      }),
    );

    if (newStatus === 'HOLDING') {
      showToast?.({
        title: 'Đang giữ dòng tiền',
        message: `Đã cập nhật trạng thái món "${targetItem.bookTitle.slice(0, 15)}..." sang Đang giữ.`,
        type: 'info',
      });
    } else if (newStatus === 'FROZEN') {
      showToast?.({
        title: 'Đã đóng băng dòng tiền',
        message: `Đã đóng băng số tiền ${targetItem.subtotal.toLocaleString('vi-VN')} đ của món "${targetItem.bookTitle.slice(0, 15)}...".`,
        type: 'warning',
      });
    } else if (newStatus === 'RELEASED') {
      showToast?.({
        title: 'Bàn giao thành công',
        message: `Đã chuyển ${targetItem.subtotal.toLocaleString('vi-VN')} đ cho gian hàng "${targetItem.storeName}". Nút thao tác đã bị khóa.`,
        type: 'success',
      });
    } else if (newStatus === 'REFUNDED') {
      showToast?.({
        title: 'Hoàn tiền thành công',
        message: `Đã hoàn lại ${targetItem.subtotal.toLocaleString('vi-VN')} đ cho khách hàng "${targetItem.customerName}". Nút thao tác đã bị khóa.`,
        type: 'success',
      });
    }

    try {
      if (adminApi && (adminApi as any).updateEscrowItemStatus) {
        await (adminApi as any).updateEscrowItemStatus(itemId, { status: newStatus });
      }
    } catch (err) {
      console.warn('Lỗi gọi API cập nhật trạng thái ký quỹ:', err);
    }
  };

  /**
   * Tính toán trạng thái đổi trả và điều kiện bàn giao theo đúng nghiệp vụ:
   * 1. Sách giấy: Phải đợi giao hàng thành công (DELIVERED/COMPLETED) mới kích hoạt đếm ngược 2 phút.
   * 2. Ebook: Kích hoạt đếm ngược 2 phút ngay sau khi thanh toán.
   * 3. Ràng buộc: Khi chưa giao hoặc còn trong hạn đổi trả -> Nút Bàn giao bị disable, Đang giữ & Đóng băng vẫn hoạt động.
   */
  const getReturnStatusInfo = useCallback(
    (item: EscrowTableItem) => {
      if (!mounted) {
        return {
          type: 'EXPIRED',
          isExpired: true,
          canRelease: false,
          remainingSec: 0,
          formattedTime: '00:00',
          text: 'Hết hạn đổi trả',
          reason: '',
        };
      }

      const isDigital =
        item.format === 'DIGITAL' ||
        item.bookTitle.toLowerCase().includes('ebook') ||
        item.bookTitle.toLowerCase().includes('digital');
      const isPhysical = !isDigital;
      const isDelivered =
        item.orderStatus === 'DELIVERED' ||
        Boolean(item.deliveredAt);

      const isCod = item.paymentMethod === 'COD';
      const isRemitted = Boolean(item.remittanceInfo?.isRemitted || item.paymentStatus === 'SUCCEEDED');

      // Sách giấy chưa giao hàng -> Luôn là Chờ giao hàng, không được giải ngân
      if (isPhysical && !isDelivered) {
        return {
          type: 'WAITING_DELIVERY',
          isExpired: false,
          canRelease: false,
          remainingSec: 0,
          formattedTime: '--:--',
          text: 'Chờ giao hàng thành công',
          reason: 'Sách giấy chưa giao hàng thành công đến tay người mua',
        };
      }

      // Đã giao hàng nhưng là đơn COD mà shipper CHƯA nộp tiền về sàn -> Chờ bưu tá nộp COD
      if (isPhysical && isDelivered && isCod && !isRemitted) {
        return {
          type: 'WAITING_COD_REMITTANCE',
          isExpired: false,
          canRelease: false,
          remainingSec: 0,
          formattedTime: '--:--',
          text: 'Chờ bưu tá nộp quỹ COD',
          reason: 'Đã giao khách, đang chờ bưu tá nộp tiền mặt COD về sàn để kích hoạt hạn đổi trả',
        };
      }

      if (item.escrowStatus === 'RELEASED') {
        return {
          type: 'RELEASED',
          isExpired: true,
          canRelease: false,
          remainingSec: 0,
          formattedTime: '00:00',
          text: 'Đã hoàn tất bàn giao',
          reason: 'Đã bàn giao tiền cho cửa hàng',
        };
      }

      if (item.escrowStatus === 'REFUNDED') {
        return {
          type: 'REFUNDED',
          isExpired: true,
          canRelease: false,
          remainingSec: 0,
          formattedTime: '00:00',
          text: 'Đã hoàn tiền cho khách',
          reason: 'Đã hoàn trả tiền cho người mua',
        };
      }

      if (item.escrowStatus === 'FROZEN') {
        return {
          type: 'FROZEN',
          isExpired: false,
          canRelease: false,
          remainingSec: 0,
          formattedTime: '--:--',
          text: 'Đang khiếu nại (Đóng băng)',
          reason: 'Dòng tiền đang bị đóng băng do có khiếu nại đổi trả',
        };
      }

      // Ebook kích hoạt từ orderCreatedAt (thanh toán); Sách giấy đã giao kích hoạt từ deliveredAt
      let startMs = 0;
      if (isDigital) {
        startMs = new Date(item.orderCreatedAt).getTime();
      } else {
        startMs = item.deliveredAt ? new Date(item.deliveredAt).getTime() : new Date(item.orderCreatedAt).getTime();
      }

      if (isNaN(startMs) || startMs <= 0) {
        return {
          type: 'EXPIRED',
          isExpired: true,
          canRelease: true,
          remainingSec: 0,
          formattedTime: '00:00',
          text: 'Hết hạn đổi trả',
          reason: '',
        };
      }

      const currentTime = nowTime || Date.now();
      const elapsed = Math.floor((currentTime - startMs) / 1000);
      const totalDuration = 120; // 2 Phút Ký Quỹ Đổi Trả
      const remainingSec = Math.max(0, totalDuration - elapsed);
      const isExpired = remainingSec <= 0;

      const m = Math.floor(remainingSec / 60);
      const s = remainingSec % 60;
      const formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

      return {
        type: isExpired ? 'EXPIRED' : 'COUNTDOWN',
        isExpired,
        canRelease: isExpired,
        remainingSec,
        formattedTime: formatted,
        text: isExpired ? 'Hết hạn đổi trả' : `Còn ${formatted}`,
        reason: isExpired ? '' : `Đang trong hạn đổi trả 2 phút (${formatted} còn lại)`,
      };
    },
    [mounted, nowTime],
  );

  // Lọc danh sách theo Tab và Ô tìm kiếm
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const isCodUnremitted = it.paymentMethod === 'COD' && !it.remittanceInfo?.isRemitted && it.paymentStatus !== 'SUCCEEDED';

      if (activeTab !== 'ALL') {
        if (activeTab === 'HOLDING') {
          // Chỉ lấy đơn sàn THỰC TẾ giữ tiền trong tài khoản (PayOS hoặc COD đã nộp quỹ)
          if (it.escrowStatus === 'RELEASED' || it.escrowStatus === 'REFUNDED' || it.escrowStatus === 'FROZEN' || isCodUnremitted) return false;
        } else if (activeTab === 'COD_PENDING') {
          // Chỉ lấy đơn COD chưa nộp tiền về quỹ sàn
          if (!isCodUnremitted || it.escrowStatus === 'RELEASED' || it.escrowStatus === 'REFUNDED' || it.escrowStatus === 'FROZEN') return false;
        } else if (activeTab === 'FROZEN') {
          if (it.escrowStatus !== 'FROZEN') return false;
        } else if (activeTab === 'REFUNDED') {
          if (it.escrowStatus !== 'REFUNDED') return false;
        } else if (activeTab === 'RELEASED') {
          if (it.escrowStatus !== 'RELEASED') return false;
        }
      }
      if (!matchesDateFilter(it.orderCreatedAt, dateFilter)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchStore = (it.storeName || '').toLowerCase().includes(q) || (it.storeId || '').toLowerCase().includes(q);
        const matchCustomer = (it.customerName || '').toLowerCase().includes(q) || (it.customerPhone || '').includes(q);
        const matchOrder = (it.orderCode || '').toLowerCase().includes(q);
        const matchBook = (it.bookTitle || '').toLowerCase().includes(q) || (it.bookId || '').toLowerCase().includes(q);
        return matchStore || matchCustomer || matchOrder || matchBook;
      }
      return true;
    });
  }, [items, activeTab, dateFilter, searchQuery]);

  const escrowBulkActionGroups: BulkActionGroup[] = useMemo(
    () => [
      {
        groupLabel: 'Quản trị ký quỹ',
        actions: [
          {
            label: 'Đóng băng các đơn đã chọn',
            value: 'FREEZE_ORDERS',
            icon: 'ac_unit',
            variant: 'danger',
            confirmMessage: 'Bạn có chắc chắn muốn đóng băng dòng tiền ký quỹ của các đơn hàng đã chọn? Tiền sẽ tạm giữ cho đến khi có kết luận trọng tài.',
          },
          {
            label: 'Bàn giao tiền cho gian hàng (Hết hạn đổi trả)',
            value: 'RELEASE_ORDERS',
            icon: 'payments',
            variant: 'primary',
          },
        ],
      },
    ],
    []
  );

  const handleExecuteEscrowBulkAction = async (actionValue: string) => {
    if (selectedOrderCodes.length === 0) return;
    setBulkLoading(true);
    try {
      if (actionValue === 'FREEZE_ORDERS') {
        const targetItems = items.filter(it => selectedOrderCodes.includes(it.orderCode) && it.escrowStatus !== 'RELEASED' && it.escrowStatus !== 'REFUNDED');
        if (targetItems.length === 0) {
          showToast?.({ title: 'Không có mục hợp lệ', message: 'Các đơn đã chọn đã được bàn giao hoặc hoàn tiền.', type: 'info' });
          return;
        }
        await Promise.all(targetItems.map(it => handleStatusChange(it.id, 'FROZEN')));
        showToast?.({ title: 'Đóng băng thành công', message: `Đã đóng băng ${targetItems.length} sản phẩm thuộc các đơn đã chọn.`, type: 'warning' });
        setSelectedOrderCodes([]);
      } else if (actionValue === 'RELEASE_ORDERS') {
        const targetItems = items.filter(it => selectedOrderCodes.includes(it.orderCode) && it.escrowStatus === 'HOLDING');
        if (targetItems.length === 0) {
          showToast?.({ title: 'Không có mục hợp lệ', message: 'Không có đơn nào ở trạng thái Đang giữ để giải ngân.', type: 'info' });
          return;
        }
        await Promise.all(targetItems.map(it => handleStatusChange(it.id, 'RELEASED')));
        showToast?.({ title: 'Bàn giao thành công', message: `Đã giải ngân ${targetItems.length} sản phẩm cho gian hàng.`, type: 'success' });
        setSelectedOrderCodes([]);
      }
    } finally {
      setBulkLoading(false);
    }
  };

  // Gom nhóm các sản phẩm theo đơn hàng
  const groupedOrders = useMemo<EscrowOrderGroup[]>(() => {
    const map = new Map<string, EscrowOrderGroup>();

    filteredItems.forEach((it) => {
      if (!map.has(it.orderCode)) {
        map.set(it.orderCode, {
          id: it.orderCode,
          orderCode: it.orderCode,
          orderGrandTotal: (it as any).orderGrandTotal,
          orderCreatedAt: it.orderCreatedAt,
          storeName: it.storeName,
          storeId: it.storeId,
          customerName: it.customerName,
          customerPhone: it.customerPhone,
          paymentMethod: it.paymentMethod,
          paymentStatus: it.paymentStatus,
          remittanceInfo: it.remittanceInfo,
          totalAmount: 0,
          itemsCount: 0,
          items: [],
        });
      }
      const group = map.get(it.orderCode)!;
      group.items.push(it);
      group.totalAmount += (it.effectiveSubtotal !== undefined ? it.effectiveSubtotal : it.subtotal);
      group.itemsCount += it.quantity;
      if ((it as any).orderGrandTotal && !group.orderGrandTotal) {
        group.orderGrandTotal = (it as any).orderGrandTotal;
      }
    });

    return Array.from(map.values());
  }, [filteredItems]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const toggleExpandOrder = useCallback((orderCode: string) => {
    setExpandedKeys((prev) =>
      prev.includes(orderCode) ? prev.filter((k) => k !== orderCode) : [...prev, orderCode]
    );
  }, []);

  // Thống kê tài chính phân định rõ: Tiền Sàn Thực Cầm vs COD Bưu Tá Đang Giao/Chưa Nộp Quỹ vs Hoàn Tiền
  const stats = useMemo(() => {
    let actualEscrowHolding = 0;
    let actualEscrowCount = 0;

    let codPendingRemittance = 0;
    let codPendingCount = 0;

    let totalReleased = 0;
    let releasedCount = 0;

    let totalFrozen = 0;
    let frozenCount = 0;

    let totalRefunded = 0;
    let refundedCount = 0;

    items.forEach((it) => {
      const itemAmount = (it.effectiveSubtotal !== undefined ? it.effectiveSubtotal : it.subtotal) || 0;
      const isCodUnremitted = it.paymentMethod === 'COD' && !it.remittanceInfo?.isRemitted && it.paymentStatus !== 'SUCCEEDED';

      if (it.escrowStatus === 'RELEASED') {
        totalReleased += itemAmount;
        releasedCount += 1;
      } else if (it.escrowStatus === 'REFUNDED') {
        totalRefunded += itemAmount;
        refundedCount += 1;
      } else if (it.escrowStatus === 'FROZEN') {
        totalFrozen += itemAmount;
        frozenCount += 1;
      } else if (isCodUnremitted) {
        // COD chưa nộp tiền về sàn (tiền mặt đang trong tay khách hoặc bưu tá đang thu)
        codPendingRemittance += itemAmount;
        codPendingCount += 1;
      } else {
        // Tiền thực tế đã vào tài khoản sàn (PayOS đã thanh toán hoặc COD bưu tá ĐÃ nộp quỹ)
        actualEscrowHolding += itemAmount;
        actualEscrowCount += 1;
      }
    });

    return {
      actualEscrowHolding,
      actualEscrowCount,
      codPendingRemittance,
      codPendingCount,
      totalReleased,
      releasedCount,
      totalFrozen,
      frozenCount,
      totalRefunded,
      refundedCount,
      totalCount: items.length,
    };
  }, [items]);

  // Định nghĩa các cột hiển thị của bảng Đơn Hàng Chính (5 cột tinh gọn, vừa khít 100% màn hình)
  const orderColumns = useMemo<Column<EscrowOrderGroup>[]>(
    () => [
      {
        key: 'orderCode',
        title: 'Mã Đơn & Ngày Đặt',
        render: (_, row) => (
          <div className="flex flex-col gap-1 py-1">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#00875A] text-[16px]">
                shopping_bag
              </span>
              <span className="font-mono font-bold text-theme-text text-[13px]">
                #{row.orderCode}
              </span>
            </div>
            <span
              suppressHydrationWarning
              className="text-theme-text-muted font-normal text-[11px] flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[13px]">schedule</span>
              <span>{formatVietnamDateTime(row.orderCreatedAt)}</span>
            </span>
          </div>
        ),
      },
      {
        key: 'storeAndCustomer',
        title: 'Gian Hàng & Khách Hàng',
        render: (_, row) => {
          const uniqueStores = Array.from(new Set(row.items.map((it) => it.storeName || it.storeId).filter(Boolean)));
          const isMultiStore = uniqueStores.length > 1;

          return (
            <div className="flex flex-col gap-1 py-1">
              {isMultiStore ? (
                <span className="font-semibold text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">storefront</span>
                  <span>Đa gian hàng ({uniqueStores.length} Shop)</span>
                </span>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-theme-text">
                  <span className="material-symbols-outlined text-[14px] text-emerald-600">storefront</span>
                  <span className="truncate max-w-[200px]" title={row.storeName}>{row.storeName}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[11px] text-theme-text-muted">
                <span className="material-symbols-outlined text-[13px]">person</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{row.customerName}</span>
                <span>•</span>
                <span className="font-mono">{row.customerPhone}</span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'paymentAndItems',
        title: 'Thanh Toán & Số Món',
        render: (_, row) => {
          let paymentBadge = null;
          if (row.paymentMethod === 'COD') {
            if (row.remittanceInfo?.isRemitted) {
              paymentBadge = (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="material-symbols-outlined text-[13px] text-emerald-600">verified</span>
                  <span>COD Đã Nộp Quỹ</span>
                </span>
              );
            } else {
              paymentBadge = (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <span className="material-symbols-outlined text-[13px] text-amber-600">local_shipping</span>
                  <span>COD Chờ Nộp</span>
                </span>
              );
            }
          } else {
            paymentBadge = (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                <span className="material-symbols-outlined text-[13px] text-blue-600">account_balance</span>
                <span>Cổng Quỹ PayOS</span>
              </span>
            );
          }

          return (
            <div className="flex flex-col gap-1 py-1">
              <div className="flex items-center gap-2">
                {paymentBadge}
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-theme-surface-subtle border border-theme-border text-theme-text">
                  {row.itemsCount} món
                </span>
              </div>
              {row.remittanceInfo?.shipperName && (
                <span className="text-[10px] text-slate-500 truncate max-w-[200px]">
                  Bưu tá: {row.remittanceInfo.shipperName}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'totalAmount',
        title: 'Tổng Giá Trị Đơn',
        align: 'right',
        render: (_, row) => {
          const totalOrderItemsSubtotal = row.items.reduce((sum, it) => sum + it.subtotal, 0);
          const totalStoreDiscount = row.items.reduce((sum, it) => sum + (it.storeVoucherDiscount || 0), 0);
          const totalPlatformDiscount = row.items.reduce((sum, it) => sum + (it.platformVoucherDiscount || 0), 0);
          const grandTotal = row.orderGrandTotal || Math.max(0, totalOrderItemsSubtotal - totalStoreDiscount - totalPlatformDiscount);

          return (
            <div className="flex flex-col items-end">
              <span className="font-mono text-[13px] font-bold text-theme-text">
                {grandTotal.toLocaleString('vi-VN')} đ
              </span>
              <div className="flex flex-col items-end text-[9.5px] font-medium leading-tight mt-0.5">
                {totalStoreDiscount > 0 && (
                  <span className="text-rose-600">
                    (-{totalStoreDiscount.toLocaleString('vi-VN')}đ Voucher Shop)
                  </span>
                )}
                {totalPlatformDiscount > 0 && (
                  <span className="text-teal-600">
                    (-{totalPlatformDiscount.toLocaleString('vi-VN')}đ Voucher Sàn)
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: 'overallStatus',
        title: 'Trạng Thái Dòng Tiền',
        align: 'center',
        render: (_, row) => {
          const allReleased = row.items.every((i) => i.escrowStatus === 'RELEASED');
          const anyFrozen = row.items.some((i) => i.escrowStatus === 'FROZEN');
          const anyPending = row.items.some((i) => i.escrowStatus === 'PENDING_PAYMENT');
          const anyRefunded = row.items.some((i) => i.escrowStatus === 'REFUNDED');

          return (
            <div className="flex justify-center">
              {anyFrozen ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <span>Đóng băng</span>
                </span>
              ) : allReleased ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Đã bàn giao</span>
                </span>
              ) : anyRefunded ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                  <span>Đã hoàn tiền</span>
                </span>
              ) : anyPending ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  <span>Chờ thu COD</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span>Đang giữ</span>
                </span>
              )}
            </div>
          );
        },
      },
    ],
    [],
  );

  // Render phần chi tiết sản phẩm khi bấm xổ xuống
  const renderOrderItemsDetail = useCallback(
    (order: EscrowOrderGroup) => {
      return (
        <div className="flex flex-col gap-3 p-1">
          <div className="flex items-center justify-between border-b border-theme-border/70 pb-2.5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00875A] text-[18px]">
                inventory_2
              </span>
              <h4 className="text-xs font-bold text-theme-text uppercase tracking-wide">
                Danh sách sản phẩm trong đơn #{order.orderCode} ({order.items.length} món)
              </h4>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenLedger(order);
                }}
                className="px-2.5 py-1 rounded-xl bg-theme-surface-subtle hover:bg-emerald-50 hover:text-emerald-800 border border-theme-border text-theme-text text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-[0.96]"
                title="Xem toàn bộ nhật ký đối soát dòng tiền và lịch sử giao dịch của đơn hàng"
              >
                <span className="material-symbols-outlined text-[15px] text-emerald-600">receipt_long</span>
                <span>Sổ Cái Đối Soát</span>
              </button>

              {order.remittanceInfo && (
                <div className="text-[11px] text-theme-text-muted flex items-center gap-2">
                  <span>Bưu tá: <strong className="text-theme-text">{order.remittanceInfo.shipperName}</strong></span>
                  <span>• Mã GD: <strong className="font-mono text-theme-text">{order.remittanceInfo.txCode}</strong></span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-theme-border/80 bg-theme-surface overflow-hidden">
            <table className="w-full text-left text-xs divide-y divide-theme-border/60">
              <thead className="bg-theme-surface-subtle text-[10.5px] uppercase font-bold text-theme-text-muted tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 w-[35%]">Sản Phẩm &amp; Phân Loại</th>
                  <th className="py-2.5 px-3 text-center w-[8%]">Số Lượng</th>
                  <th className="py-2.5 px-4 text-right w-[12%]">Đơn Giá</th>
                  <th className="py-2.5 px-4 text-right w-[13%]">Thành Tiền</th>
                  <th className="py-2.5 px-4 text-center w-[14%]">Trạng Thái Dòng Tiền</th>
                  <th className="py-2.5 px-4 text-center w-[14%]">Thời Hạn Đổi Trả</th>
                  <th className="py-2.5 px-4 text-center w-[12%]">Thao Tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-theme-border/40 bg-theme-surface">
                {order.items.map((item) => {
                  const isReleased = item.escrowStatus === 'RELEASED';
                  const isRefunded = item.escrowStatus === 'REFUNDED';
                  const isFrozen = item.escrowStatus === 'FROZEN';
                  const isHolding = item.escrowStatus === 'HOLDING';
                  const isPendingPayment = item.escrowStatus === 'PENDING_PAYMENT';
                  const returnInfo = getReturnStatusInfo(item);
                  const isDigital = item.format === 'DIGITAL' || item.bookTitle.toLowerCase().includes('ebook');
                  const canRefund =
                    item.returnRequestStatus === 'SELLER_ACCEPTED' ||
                    item.returnRequestStatus === 'ARBITRATED_BUYER_WINS' ||
                    isFrozen;

                  return (
                    <tr key={item.id} className="hover:bg-theme-surface-subtle/40 transition-colors">
                      {/* 1. Tên Sản Phẩm */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {item.coverUrl ? (
                            <img
                              src={item.coverUrl}
                              alt={item.bookTitle}
                              className="w-8 h-11 object-cover rounded border border-slate-200 shrink-0 shadow-2xs"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-11 bg-slate-100 rounded border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                              <span className="material-symbols-outlined text-sm">menu_book</span>
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isDigital ? (
                                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0 tracking-wide">
                                  EBOOK
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60 shrink-0 tracking-wide">
                                  SÁCH IN
                                </span>
                              )}
                              <span className="font-semibold text-theme-text text-[12.5px] leading-snug line-clamp-1" title={item.bookTitle}>
                                {item.bookTitle}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-theme-text-muted mt-0.5">
                              Mã SP: {item.bookId}
                            </span>

                            {/* Thông Tin Đổi Trả & Tài Khoản Ngân Hàng Hoàn Tiền */}
                            {(item.returnRequestId || item.buyerBankAccount || item.reverseTrackingCode) && (
                              <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] flex flex-col gap-1.5 text-amber-950 dark:text-amber-200">
                                <div className="flex items-center gap-1.5 font-bold flex-wrap">
                                  <span className="material-symbols-outlined text-[15px] text-amber-600">assignment_return</span>
                                  <span>Mã Vận Đơn Hoàn:</span>
                                  <span className="font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200">
                                    #{item.reverseTrackingCode || 'HUKI-RET-CHƯA-TẠO'}
                                  </span>
                                  {item.reverseStatus && (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                      item.reverseStatus === 'RETURNED_TO_STORE'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                    }`}>
                                      {item.reverseStatus === 'RETURNED_TO_STORE' ? 'Đã giao về kho Shop' : 'Bưu tá đang thu hồi'}
                                    </span>
                                  )}
                                </div>

                                {item.buyerBankAccount && (
                                  <div className="flex items-center gap-1.5 text-[11px] bg-white/70 dark:bg-slate-900/60 p-1.5 rounded-lg border border-amber-200/60 dark:border-amber-800/40">
                                    <span className="material-symbols-outlined text-[14px] text-blue-600">account_balance</span>
                                    <span className="text-slate-600 dark:text-slate-400">Ngân hàng:</span>
                                    <strong className="text-theme-text font-bold">{item.buyerBankAccount.bankName}</strong>
                                    <span>• STK:</span>
                                    <strong className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">{item.buyerBankAccount.accountNumber}</strong>
                                    <span>• Chủ TK:</span>
                                    <strong className="text-theme-text uppercase">{item.buyerBankAccount.accountHolderName}</strong>
                                  </div>
                                )}

                                {item.returnReason && (
                                  <div className="text-[10.5px] text-slate-600 dark:text-slate-400 italic">
                                    Lý do hoàn trả: &ldquo;{item.returnReason}&rdquo;
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Số Lượng */}
                      <td className="py-3.5 px-3 text-center font-bold text-theme-text text-xs">
                        {item.quantity}
                      </td>

                      {/* 3. Đơn Giá */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-theme-text-muted whitespace-nowrap">
                        {item.unitPrice.toLocaleString('vi-VN')} đ
                      </td>

                      {/* 4. Thành Tiền */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-xs font-bold text-theme-text">
                            {(item.effectiveSubtotal !== undefined ? item.effectiveSubtotal : item.subtotal).toLocaleString('vi-VN')} đ
                          </span>
                          {item.storeVoucherDiscount && item.storeVoucherDiscount > 0 ? (
                            <span className="text-[10px] text-rose-600 font-medium">
                              (Gốc: {item.subtotal.toLocaleString('vi-VN')}đ - Voucher Shop {item.storeVoucherDiscount.toLocaleString('vi-VN')}đ)
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* 5. Trạng Thái Dòng Tiền */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isPendingPayment && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            <span>Chờ thu tiền COD</span>
                          </span>
                        )}
                        {isHolding && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>Đang giữ dòng tiền</span>
                          </span>
                        )}
                        {isFrozen && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                            <span>Đóng băng dòng tiền</span>
                          </span>
                        )}
                        {isReleased && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>Đã chuyển cho shop</span>
                          </span>
                        )}
                        {isRefunded && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-sky-50 text-sky-800 border border-sky-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                            <span>Đã hoàn trả khách</span>
                          </span>
                        )}
                      </td>

                      {/* 6. Thời Hạn Đổi Trả */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {returnInfo.type === 'FROZEN' ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-rose-50/60 text-rose-700 border border-rose-200/60"
                            title="Đơn hàng đang có khiếu nại, thời hạn đổi trả tạm dừng"
                          >
                            <span className="material-symbols-outlined text-[14px] text-rose-500 animate-pulse">pause_circle</span>
                            <span>Đang khiếu nại</span>
                          </span>
                        ) : returnInfo.type === 'REFUNDED' ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-theme-surface-subtle text-theme-text-muted border border-theme-border"
                            title="Đã hoàn tiền cho người mua"
                          >
                            <span className="material-symbols-outlined text-[14px] text-theme-text-muted">replay</span>
                            <span>Đã hoàn tiền</span>
                          </span>
                        ) : returnInfo.type === 'WAITING_DELIVERY' ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-theme-text-muted bg-theme-surface-subtle border border-theme-border"
                            title="Sách giấy đang giao, chưa kích hoạt thời hạn đổi trả 2 phút"
                          >
                            <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                            <span>Chờ giao hàng</span>
                          </span>
                        ) : returnInfo.type === 'COUNTDOWN' ? (
                          <span
                            suppressHydrationWarning
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50/80 text-amber-800 border border-amber-200/80 font-mono shadow-2xs"
                            title="Đang trong thời hạn kiểm tra và đổi trả 2 phút"
                          >
                            <span className="material-symbols-outlined text-[14px] text-amber-600 animate-spin">timer</span>
                            <span>Còn {returnInfo.formattedTime}</span>
                          </span>
                        ) : returnInfo.type === 'RELEASED' ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-theme-text-muted bg-theme-surface-subtle border border-theme-border"
                            title="Đã hoàn tất chuyển tiền cho shop"
                          >
                            <span className="material-symbols-outlined text-[14px] text-emerald-600">verified</span>
                            <span>Đã hoàn tất bàn giao</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-emerald-700 bg-emerald-50/50 border border-emerald-200/50"
                            title="Đã qua thời hạn 2 phút đổi trả, sẵn sàng bàn giao cho cửa hàng"
                          >
                            <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                            <span>Hết hạn đổi trả</span>
                          </span>
                        )}
                      </td>

                      {/* 7. Thao Tác Chi Tiết */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap relative escrow-dropdown-container">
                        {isReleased ? (
                          <span className="text-[11.5px] text-theme-text-muted font-medium italic">
                            Đã bàn giao
                          </span>
                        ) : isRefunded ? (
                          <span className="text-[11.5px] text-theme-text-muted font-medium italic">
                            Đã hoàn tiền
                          </span>
                        ) : (
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(openDropdownId === item.id ? null : item.id);
                              }}
                              className={`inline-flex items-center justify-between gap-1.5 px-3 py-1.5 text-[11.5px] font-medium rounded-xl border transition-all cursor-pointer shadow-2xs active:scale-[0.96] ${
                                isHolding
                                  ? 'bg-theme-surface hover:bg-theme-surface-subtle text-theme-text border-theme-border'
                                  : isFrozen
                                  ? 'bg-rose-50/80 hover:bg-rose-100 text-rose-800 border-rose-200/80'
                                  : 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border-emerald-200/80'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isHolding ? 'bg-amber-500' : isFrozen ? 'bg-rose-500' : 'bg-emerald-500'
                                  }`}
                                ></span>
                                <span>{isHolding ? 'Đang giữ' : isFrozen ? 'Đóng băng' : 'Bàn giao'}</span>
                              </div>
                              <span className="material-symbols-outlined text-[15px] text-theme-text-muted">expand_more</span>
                            </button>

                            {openDropdownId === item.id && (
                              <div className="absolute right-0 mt-1.5 w-52 bg-theme-surface rounded-2xl shadow-xl border border-theme-border z-50 py-1.5 divide-y divide-theme-border text-left animate-in fade-in zoom-in-95 duration-150">
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(item.id, 'HOLDING')}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-theme-text hover:bg-amber-50/60 hover:text-amber-800 transition-colors cursor-pointer"
                                >
                                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                  <span>Đang giữ tiền</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(item.id, 'FROZEN')}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-theme-text hover:bg-rose-50/60 hover:text-rose-800 transition-colors cursor-pointer"
                                >
                                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                  <span>Đóng băng dòng tiền</span>
                                </button>

                                {returnInfo.canRelease ? (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(item.id, 'RELEASED')}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-theme-text hover:bg-emerald-50/60 hover:text-emerald-800 transition-colors cursor-pointer"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <span>Bàn giao cho Shop</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled
                                    className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-theme-text-muted opacity-60 cursor-not-allowed select-none bg-theme-surface-subtle"
                                    title={returnInfo.reason}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                      <span>Bàn giao (Chưa đủ ĐK)</span>
                                    </div>
                                    <span className="material-symbols-outlined text-[13px]">lock</span>
                                  </button>
                                )}

                                {canRefund ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      setRefundTargetItem(item);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-theme-text hover:bg-sky-50/60 hover:text-sky-800 transition-colors cursor-pointer"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                    <span>Hoàn trả Khách hàng...</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled
                                    className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-theme-text-muted opacity-60 cursor-not-allowed select-none bg-theme-surface-subtle"
                                    title="Chỉ khả dụng khi Shop đồng ý hoặc Trọng tài xử Khách thắng"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                      <span>Hoàn tiền (Khóa)</span>
                                    </div>
                                    <span className="material-symbols-outlined text-[13px]">lock</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    },
    [getReturnStatusInfo, handleStatusChange, openDropdownId],
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* 1. Tiêu đề Trang & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-theme-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-theme-text tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#00875A] rounded-full inline-block"></span>
            <span>Ký Quỹ Sàn &amp; Tài Khoản Trung Gian (Escrow Ledger)</span>
          </h1>
          <p className="text-xs text-theme-text-muted mt-1">
            Kiểm soát dòng tiền giữ hộ, thời hạn đổi trả 2 phút, đóng băng khiếu nại và điều phối hoàn tiền / giải ngân
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchEscrowItems(false)}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl border border-theme-border bg-theme-surface hover:bg-theme-surface-subtle text-theme-text font-medium text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto active:scale-[0.98]"
        >
          <span className={`material-symbols-outlined text-[16px] text-theme-text-muted ${loading ? 'animate-spin text-[#00875A]' : ''}`}>
            refresh
          </span>
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* 2. Thẻ Thống Kê Tổng Quan (5 Thẻ phân định rõ ràng các trạng thái dòng tiền) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Đang Giữ Ký Quỹ Thực Tế */}
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-theme-text-muted uppercase tracking-wider">Đang Giữ (Sàn Cầm)</p>
            <h3 className="text-lg font-bold text-amber-600 mt-1 font-mono tracking-tight">
              {stats.actualEscrowHolding.toLocaleString('vi-VN')} đ
            </h3>
            <p className="text-[11px] text-theme-text-muted mt-1 font-medium">{stats.actualEscrowCount} món thực thu sàn</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50/80 border border-amber-100 text-amber-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">lock_clock</span>
          </div>
        </div>

        {/* COD Đang Giao / Chờ Nộp Quỹ */}
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-theme-text-muted uppercase tracking-wider">COD Chờ Nộp Quỹ</p>
            <h3 className="text-lg font-bold text-blue-600 mt-1 font-mono tracking-tight">
              {stats.codPendingRemittance.toLocaleString('vi-VN')} đ
            </h3>
            <p className="text-[11px] text-blue-600 mt-1 font-medium">{stats.codPendingCount} món chờ bưu tá</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50/80 border border-blue-100 text-blue-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">local_shipping</span>
          </div>
        </div>

        {/* Đóng Băng Tranh Chấp */}
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-theme-text-muted uppercase tracking-wider">Đóng Băng Đổi Trả</p>
            <h3 className="text-lg font-bold text-rose-600 mt-1 font-mono tracking-tight">
              {stats.totalFrozen.toLocaleString('vi-VN')} đ
            </h3>
            <p className="text-[11px] text-rose-600 mt-1 font-medium">{stats.frozenCount} món khiếu nại</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50/80 border border-rose-100 text-rose-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">gavel</span>
          </div>
        </div>

        {/* Đã Hoàn Trả Khách Hàng */}
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-theme-text-muted uppercase tracking-wider">Đã Hoàn Trả Khách</p>
            <h3 className="text-lg font-bold text-sky-600 mt-1 font-mono tracking-tight">
              {stats.totalRefunded.toLocaleString('vi-VN')} đ
            </h3>
            <p className="text-[11px] text-sky-600 mt-1 font-medium">{stats.refundedCount} món hoàn trả</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50/80 border border-sky-100 text-sky-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">replay</span>
          </div>
        </div>

        {/* Đã Bàn Giao Cho Shop */}
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-theme-text-muted uppercase tracking-wider">Đã Bàn Giao Shop</p>
            <h3 className="text-lg font-bold text-[#00875A] mt-1 font-mono tracking-tight">
              {stats.totalReleased.toLocaleString('vi-VN')} đ
            </h3>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">{stats.releasedCount} món hoàn tất</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50/80 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">verified</span>
          </div>
        </div>
      </div>

      {/* 3. Thanh Bộ Lọc & Tìm Kiếm, Multi-Tier Date & Thao Tác Hàng Loạt */}
      <DataTableFilterBar
        className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs"
        searchPlaceholder="Tìm mã đơn, SĐT, tên sách..."
        searchQuery={searchQuery}
        onSearchChange={(val) => setSearchQuery(val)}
        tabs={[
          { key: 'ALL', label: 'Tất Cả', count: stats.totalCount },
          { key: 'HOLDING', label: 'Đang Giữ Ký Quỹ', count: stats.actualEscrowCount },
          { key: 'COD_PENDING', label: 'COD Chờ Nộp Quỹ', count: stats.codPendingCount },
          { key: 'FROZEN', label: 'Đóng Băng', count: stats.frozenCount },
          { key: 'REFUNDED', label: 'Đã Hoàn Trả', count: stats.refundedCount },
          { key: 'RELEASED', label: 'Đã Bàn Giao', count: stats.releasedCount },
        ]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        dateFilter={dateFilter}
        onDateFilterChange={(df) => setDateFilter(df)}
        selectedCount={selectedOrderCodes.length}
        bulkLoading={bulkLoading}
        bulkActionGroups={escrowBulkActionGroups}
        onExecuteBulkAction={handleExecuteEscrowBulkAction}
      />

      {/* 4. Grouped Data Table */}
      <GroupedDataTable
        columns={orderColumns}
        data={groupedOrders}
        keyField="id"
        selectable={true}
        selectedRowKeys={selectedOrderCodes}
        onSelectionChange={(keys) => setSelectedOrderCodes(keys as string[])}
        expandable={true}
        expandedRowRender={renderOrderItemsDetail}
        expandedRowKeys={expandedKeys}
        onExpandedRowsChange={setExpandedKeys}
        onRowClick={(row) => toggleExpandOrder(row.id)}
        loading={loading}
        onRetry={fetchEscrowItems}
        emptyTitle="Không tìm thấy đơn hàng ký quỹ"
        emptyMessage={
          searchQuery
            ? `Không có kết quả khớp với từ khóa "${searchQuery}"`
            : activeTab !== 'ALL'
            ? 'Không có đơn hàng nào trong trạng thái đã chọn.'
            : 'Hiện chưa có đơn hàng nào trong hệ thống ký quỹ.'
        }
        emptyIcon="lock_clock"
        pagination={true}
        className="min-w-[1500px]"
      />

      {/* 5. Modal Xác Nhận Hoàn Tiền Cho Khách Hàng (Đối Soát STK & Mã Vận Đơn) */}
      {refundTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-theme-surface border border-theme-border rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 text-theme-text animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <div className="flex items-center gap-2 text-sky-600">
                <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
                <h3 className="font-bold text-base">Xác Nhận Hoàn Tiền Cho Khách</h3>
              </div>
              <button
                type="button"
                onClick={() => setRefundTargetItem(null)}
                className="text-theme-text-muted hover:text-theme-text p-1 rounded-lg hover:bg-theme-surface-subtle"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800/40 flex items-center justify-between">
                <div>
                  <span className="text-theme-text-muted text-[11px]">Số tiền cần hoàn trả:</span>
                  <div className="font-mono text-xl font-black text-sky-700 dark:text-sky-300 mt-0.5">
                    {((refundTargetItem.effectiveSubtotal !== undefined ? refundTargetItem.effectiveSubtotal : refundTargetItem.subtotal) || 0).toLocaleString('vi-VN')} đ
                  </div>
                </div>
                <span className="material-symbols-outlined text-3xl text-sky-500">payments</span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-theme-surface-subtle rounded-2xl border border-theme-border/60">
                <div>
                  <span className="text-theme-text-muted text-[10.5px]">Mã đơn hàng:</span>
                  <div className="font-mono font-bold mt-0.5">#{refundTargetItem.orderCode}</div>
                </div>
                <div>
                  <span className="text-theme-text-muted text-[10.5px]">Khách hàng:</span>
                  <div className="font-semibold mt-0.5">{refundTargetItem.customerName} ({refundTargetItem.customerPhone})</div>
                </div>
                <div className="col-span-2 mt-1">
                  <span className="text-theme-text-muted text-[10.5px]">Sản phẩm hoàn trả:</span>
                  <div className="font-medium mt-0.5">{refundTargetItem.bookTitle} (x{refundTargetItem.quantity})</div>
                </div>
              </div>

              {/* Thông tin thẻ ngân hàng của Buyer */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                  <span className="material-symbols-outlined text-base">credit_card</span>
                  <span>Tài Khoản Ngân Hàng Thụ Hưởng Của Khách:</span>
                </div>
                {refundTargetItem.buyerBankAccount ? (
                  <div className="flex flex-col gap-1 pl-1 text-[11.5px]">
                    <div>Ngân hàng: <strong className="text-theme-text">{refundTargetItem.buyerBankAccount.bankName}</strong></div>
                    <div className="flex items-center gap-2">
                      <span>Số tài khoản:</span>
                      <strong className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-400">
                        {refundTargetItem.buyerBankAccount.accountNumber}
                      </strong>
                    </div>
                    <div>Chủ tài khoản: <strong className="text-theme-text uppercase">{refundTargetItem.buyerBankAccount.accountHolderName}</strong></div>
                  </div>
                ) : (
                  <div className="text-rose-600 text-[11px] italic">
                    Khách hàng chưa cập nhật số tài khoản ngân hàng. Vui lòng liên hệ khách để bổ sung trước khi hoàn tiền.
                  </div>
                )}
              </div>

              {/* Thông tin vận đơn hoàn hàng */}
              {refundTargetItem.reverseTrackingCode && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-[11px] flex items-center justify-between">
                  <div>
                    <span className="text-amber-800 dark:text-amber-300 font-semibold">Mã vận đơn chiều về:</span>
                    <span className="font-mono font-bold text-theme-text ml-1.5">#{refundTargetItem.reverseTrackingCode}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-200/80 text-amber-900">
                    {refundTargetItem.reverseStatus === 'RETURNED_TO_STORE' ? 'Đã về kho shop' : 'Đang vận chuyển'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-theme-border">
              <button
                type="button"
                onClick={() => setRefundTargetItem(null)}
                disabled={isRefunding}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-theme-text hover:bg-theme-surface-subtle border border-theme-border cursor-pointer transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={isRefunding}
                onClick={async () => {
                  if (!refundTargetItem) return;
                  setIsRefunding(true);
                  try {
                    await handleStatusChange(refundTargetItem.id, 'REFUNDED');
                    playAdminAlertSound();
                    setRefundTargetItem(null);
                  } finally {
                    setIsRefunding(false);
                  }
                }}
                className="px-4.5 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-md flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-all"
              >
                {isRefunding ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>Xác Nhận Đã Hoàn Tiền</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Sổ Cái Kế Toán & Nhật Ký Đối Soát Chi Tiết Cho Admin */}
      {selectedLedgerOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-theme-surface border border-theme-border rounded-3xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 text-theme-text max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-theme-border pb-3 shrink-0">
              <div className="flex items-center gap-2.5 text-[#00875A]">
                <span className="material-symbols-outlined text-2xl">receipt_long</span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-theme-text">
                    Sổ Cái Minh Bạch &amp; Nhật Ký Đối Soát Ký Quỹ
                  </h3>
                  <p className="text-[11px] text-theme-text-muted">
                    Đơn hàng #{selectedLedgerOrder.orderCode} · Khách hàng: {selectedLedgerOrder.customerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLedgerOrder(null)}
                className="text-theme-text-muted hover:text-theme-text p-1 rounded-lg hover:bg-theme-surface-subtle"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto pr-1 space-y-4 text-xs">
              {loadingLedger ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-theme-text-muted">
                  <span className="material-symbols-outlined text-3xl animate-spin text-[#00875A]">progress_activity</span>
                  <span>Đang tải dữ liệu sổ cái...</span>
                </div>
              ) : ledgerHistory.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-theme-text-muted">
                  <span className="material-symbols-outlined text-3xl opacity-40">history_toggle_off</span>
                  <span>Chưa có bản ghi biến động nào trong sổ cái.</span>
                </div>
              ) : (
                <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-theme-border">
                  {ledgerHistory.map((item: any, idx: number) => {
                    const isRefund = item.toStatus === 'ESCROW_REFUNDED' || item.title?.includes('hoàn trả tiền') || item.title?.includes('Hoàn tiền');
                    const isFrozen = item.toStatus === 'ESCROW_FROZEN' || item.title?.includes('Đóng băng');
                    const isReturnPickup = item.toStatus === 'RETURN_PICKED_UP' || item.title?.includes('lấy hàng');
                    const isReturnDelivered = item.toStatus === 'RETURN_DELIVERED_TO_STORE' || item.title?.includes('kho Shop');
                    const isShipper = item.actorType === 'SHIPPER' || item.actorType === 'SHIPPER_COD_REMITTANCE';
                    const isBuyer = item.actorType === 'BUYER' || item.actorType === 'USER';
                    const isAdmin = item.actorType === 'ADMIN';

                    const dotBg = isRefund
                      ? 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/60'
                      : isFrozen
                      ? 'bg-rose-500 ring-4 ring-rose-100 dark:ring-rose-950/60'
                      : isReturnPickup
                      ? 'bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-950/60'
                      : isReturnDelivered
                      ? 'bg-indigo-500 ring-4 ring-indigo-100 dark:ring-indigo-950/60'
                      : idx === ledgerHistory.length - 1
                      ? 'bg-[#00875A] ring-4 ring-emerald-100'
                      : 'bg-slate-400';

                    const meta = (item.metadata as any) || {};

                    return (
                      <div key={item.id || idx} className="relative">
                        <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-theme-surface ${dotBg}`} />

                        <div className="p-3.5 rounded-2xl bg-theme-surface-subtle border border-theme-border/70 flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h5 className="font-bold text-xs text-theme-text flex items-center gap-1.5">
                              {isRefund && <span className="material-symbols-outlined text-[15px] text-emerald-600">verified</span>}
                              {isFrozen && <span className="material-symbols-outlined text-[15px] text-rose-600">lock_clock</span>}
                              {isReturnPickup && <span className="material-symbols-outlined text-[15px] text-amber-600">local_shipping</span>}
                              {isReturnDelivered && <span className="material-symbols-outlined text-[15px] text-indigo-600">warehouse</span>}
                              <span>{item.title || item.toStatus}</span>
                            </h5>
                            <span className="text-[11px] font-mono text-theme-text-muted">
                              {new Date(item.createdAt).toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          </div>

                          {item.description && (
                            <p className="text-[11.5px] text-theme-text-muted leading-relaxed">
                              {item.description}
                            </p>
                          )}

                          {/* Chi tiết tài khoản ngân hàng & mã vận đơn đối soát */}
                          {(meta.buyerBankAccount || meta.reverseTrackingCode || meta.refundAmount || meta.subtotal) && (
                            <div className="mt-1 p-2 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-theme-border text-[11px] flex flex-col gap-1.5">
                              {meta.reverseTrackingCode && (
                                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                                  <span className="material-symbols-outlined text-[14px] text-amber-600">assignment_return</span>
                                  <span>Mã vận đơn hoàn: </span>
                                  <span className="font-mono text-amber-900 dark:text-amber-100">#{meta.reverseTrackingCode}</span>
                                </div>
                              )}
                              {meta.buyerBankAccount && (
                                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 flex-wrap">
                                  <span className="material-symbols-outlined text-[14px] text-blue-600">credit_card</span>
                                  <span>Tài khoản nhận tiền:</span>
                                  <strong className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">{meta.buyerBankAccount.accountNumber}</strong>
                                  <span>({meta.buyerBankAccount.bankName} - {meta.buyerBankAccount.accountHolderName})</span>
                                </div>
                              )}
                              {(meta.refundAmount || meta.subtotal) && (
                                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                                  <span className="material-symbols-outlined text-[14px]">payments</span>
                                  <span>Số tiền ghi nhận: {Number(meta.refundAmount || meta.subtotal).toLocaleString('vi-VN')} đ</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              isAdmin
                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
                                : isShipper
                                ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                                : isBuyer
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                                : 'bg-theme-surface-subtle text-theme-text-muted border-theme-border'
                            }`}>
                              <span className="material-symbols-outlined text-[12px]">
                                {isAdmin ? 'shield_person' : isShipper ? 'two_wheeler' : isBuyer ? 'person' : 'storefront'}
                              </span>
                              <span>
                                {isAdmin ? 'Ban Quản Trị Sàn' : isShipper ? 'Bưu Tá HuKi Express' : isBuyer ? 'Người Mua' : 'Gian Hàng Shop'}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-theme-border shrink-0">
              <button
                type="button"
                onClick={() => setSelectedLedgerOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-theme-text hover:bg-theme-surface-subtle border border-theme-border cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminEscrowView;
