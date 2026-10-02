"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import { AdminFilterTabs } from './AdminUI';
import GroupedDataTable, { Column } from '../common/GroupedDataTable';

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
  returnRequestStatus?: string | null;
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
  const fetchEscrowItems = useCallback(async () => {
    setLoading(true);
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
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEscrowItems();
  }, [fetchEscrowItems]);

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
      if (activeTab !== 'ALL' && it.escrowStatus !== activeTab) {
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
  }, [items, activeTab, searchQuery]);

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

  // Thống kê tài chính
  const stats = useMemo(() => {
    const totalHolding = items
      .filter((it) => it.escrowStatus === 'HOLDING')
      .reduce((sum, it) => sum + (it.effectiveSubtotal !== undefined ? it.effectiveSubtotal : it.subtotal), 0);

    const totalReleased = items
      .filter((it) => it.escrowStatus === 'RELEASED')
      .reduce((sum, it) => sum + (it.effectiveSubtotal !== undefined ? it.effectiveSubtotal : it.subtotal), 0);

    const totalFrozen = items
      .filter((it) => it.escrowStatus === 'FROZEN')
      .reduce((sum, it) => sum + (it.effectiveSubtotal !== undefined ? it.effectiveSubtotal : it.subtotal), 0);

    return {
      totalHolding,
      totalReleased,
      totalFrozen,
      totalCount: items.length,
      holdingCount: items.filter((it) => it.escrowStatus === 'HOLDING').length,
      frozenCount: items.filter((it) => it.escrowStatus === 'FROZEN').length,
      releasedCount: items.filter((it) => it.escrowStatus === 'RELEASED').length,
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
          <div className="flex items-center justify-between border-b border-theme-border/70 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00875A] text-[18px]">
                inventory_2
              </span>
              <h4 className="text-xs font-bold text-theme-text uppercase tracking-wide">
                Danh sách sản phẩm trong đơn #{order.orderCode} ({order.items.length} món)
              </h4>
            </div>

            {order.remittanceInfo && (
              <div className="text-[11.5px] text-theme-text-muted flex items-center gap-2">
                <span>Bưu tá nộp COD: <strong className="text-theme-text">{order.remittanceInfo.shipperName}</strong> ({order.remittanceInfo.shipperCode})</span>
                <span>•</span>
                <span>Mã GD: <strong className="font-mono text-theme-text">{order.remittanceInfo.txCode}</strong></span>
              </div>
            )}
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
                        <div className="flex items-start gap-2.5">
                          {isDigital ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0 mt-0.5 tracking-wide">
                              EBOOK
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60 shrink-0 mt-0.5 tracking-wide">
                              SÁCH IN
                            </span>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-theme-text text-[13px] leading-snug">
                              {item.bookTitle}
                            </span>
                            <span className="font-mono text-[10.5px] text-theme-text-muted mt-0.5">
                              Mã SP: {item.bookId}
                            </span>
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
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
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
                                    onClick={() => handleStatusChange(item.id, 'REFUNDED')}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-theme-text hover:bg-sky-50/60 hover:text-sky-800 transition-colors cursor-pointer"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                    <span>Hoàn trả Khách hàng</span>
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
            <span>Ký Quỹ Sàn &amp; Tài Khoản Trung Gian</span>
          </h1>
          <p className="text-xs text-theme-text-muted mt-1">
            Kiểm soát dòng tiền giữ hộ, thời hạn đổi trả 2 phút và điều phối bàn giao doanh thu cho người bán
          </p>
        </div>

        <button
          type="button"
          onClick={fetchEscrowItems}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl border border-theme-border bg-theme-surface hover:bg-theme-surface-subtle text-theme-text font-medium text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto active:scale-[0.98]"
        >
          <span className={`material-symbols-outlined text-[16px] text-theme-text-muted ${loading ? 'animate-spin text-[#00875A]' : ''}`}>
            refresh
          </span>
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* 2. Thẻ Thống Kê Tổng Quan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Đang Giữ */}
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-4.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-theme-text-muted uppercase tracking-wider">Đang Giữ Ký Quỹ</p>
            <h3 className="text-xl font-bold text-amber-600 mt-1 font-mono tracking-tight">
              {stats.totalHolding.toLocaleString('vi-VN')} đ
            </h3>
            <p className="text-[11.5px] text-theme-text-muted mt-1 font-medium">{stats.holdingCount} món hàng đang giữ tiền</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50/80 border border-amber-100 text-amber-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">lock_clock</span>
          </div>
        </div>

        {/* Đã Bàn Giao */}
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-4.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-theme-text-muted uppercase tracking-wider">Đã Bàn Giao Cho Shop</p>
            <h3 className="text-xl font-bold text-[#00875A] mt-1 font-mono tracking-tight">
              {stats.totalReleased.toLocaleString('vi-VN')} đ
            </h3>
            <p className="text-[11.5px] text-emerald-600 mt-1 font-medium">{stats.releasedCount} món hàng hoàn tất</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50/80 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">verified</span>
          </div>
        </div>

        {/* Đóng Băng Tranh Chấp */}
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-4.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-theme-text-muted uppercase tracking-wider">Đóng Băng Tranh Chấp</p>
            <h3 className="text-xl font-bold text-rose-600 mt-1 font-mono tracking-tight">
              {stats.totalFrozen.toLocaleString('vi-VN')} đ
            </h3>
            <p className="text-[11.5px] text-rose-600 mt-1 font-medium">{stats.frozenCount} món hàng đang khiếu nại</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50/80 border border-rose-100 text-rose-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">gavel</span>
          </div>
        </div>
      </div>

      {/* 3. Thanh Bộ Lọc & Tìm Kiếm */}
      <div className="bg-theme-surface rounded-2xl p-3 border border-theme-border shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Tabs Trạng Thái */}
        <AdminFilterTabs
          tabs={[
            { id: 'ALL', label: 'Tất Cả', count: stats.totalCount },
            { id: 'HOLDING', label: 'Đang Giữ Tiền', count: stats.holdingCount },
            { id: 'FROZEN', label: 'Đóng Băng', count: stats.frozenCount },
            { id: 'RELEASED', label: 'Đã Chuyển Tiền', count: stats.releasedCount },
          ]}
          activeTab={activeTab}
          onChange={handleTabChange}
        />

        {/* Ô Tìm Kiếm */}
        <div className="relative w-full md:w-72 shrink-0">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted text-[16px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm mã đơn, SĐT, tên sách..."
            className="w-full pl-9 pr-7 py-2 bg-theme-surface-subtle border border-theme-border rounded-xl text-xs text-theme-text placeholder:text-theme-text-muted focus:outline-none focus:border-[#00875A] focus:bg-theme-surface transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text p-0.5"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Grouped Data Table: Bảng Rộng Dài Kèm Thanh Kéo Ngang, Click Hàng Tự Động Xổ Xuống */}
      <GroupedDataTable
        columns={orderColumns}
        data={groupedOrders}
        keyField="id"
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
    </div>
  );
}

export default AdminEscrowView;
