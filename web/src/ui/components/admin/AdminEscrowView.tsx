"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';

export interface EscrowTableItem {
  id: string; // order item id
  orderId: string;
  orderCode: string;
  orderCreatedAt: string;
  orderStatus?: string; // 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'COMPLETED'
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
  escrowStatus: 'HOLDING' | 'FROZEN' | 'RELEASED';
  releasedAt?: string | null;
  frozenReason?: string | null;
}

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất Cả' },
  { key: 'HOLDING', label: 'Đang Giữ Dòng Tiền' },
  { key: 'FROZEN', label: 'Đóng Băng Dòng Tiền' },
  { key: 'RELEASED', label: 'Đã Chuyển Cho Cửa Hàng' },
];

// Dữ liệu mẫu ban đầu static để SSR không bị lệch thời gian
const INITIAL_MOCK_ITEMS: EscrowTableItem[] = [
  {
    id: 'item-001',
    orderId: 'ord-1001',
    orderCode: 'DH-2026-9812',
    orderCreatedAt: '2026-09-23T10:00:00.000Z',
    orderStatus: 'SHIPPING', // Sách giấy đang giao -> Chờ giao hàng
    format: 'PHYSICAL',
    deliveredAt: null,
    storeId: 'STR-KIEN-02',
    storeName: 'CÔNG TY TNHH KIEN SELLER 2',
    customerName: 'Nguyễn Văn Hoàng',
    customerPhone: '0912345678',
    bookId: 'BOOK-DN-01',
    bookTitle: 'Đắc Nhân Tâm (Bản Đặc Biệt Bìa Cứng)',
    quantity: 1,
    unitPrice: 120000,
    subtotal: 120000,
    escrowStatus: 'HOLDING',
  },
  {
    id: 'item-002',
    orderId: 'ord-1001',
    orderCode: 'DH-2026-9812',
    orderCreatedAt: '2026-09-23T10:00:00.000Z',
    orderStatus: 'CONFIRMED', // Ebook -> Kích hoạt đếm ngược ngay sau thanh toán
    format: 'DIGITAL',
    deliveredAt: null,
    storeId: 'STR-KIEN-02',
    storeName: 'CÔNG TY TNHH KIEN SELLER 2',
    customerName: 'Nguyễn Văn Hoàng',
    customerPhone: '0912345678',
    bookId: 'BOOK-GK-02',
    bookTitle: 'Nhà Giả Kim (Ebook Bản Quyền)',
    quantity: 1,
    unitPrice: 85000,
    subtotal: 85000,
    escrowStatus: 'HOLDING',
  },
  {
    id: 'item-003',
    orderId: 'ord-1002',
    orderCode: 'DH-2026-9815',
    orderCreatedAt: '2026-09-23T09:40:00.000Z',
    orderStatus: 'DELIVERED', // Sách giấy đã giao -> Kích hoạt đếm ngược từ lúc giao
    format: 'PHYSICAL',
    deliveredAt: '2026-09-23T09:40:00.000Z',
    storeId: 'STR-ALPHA',
    storeName: 'CÔNG TY CỔ PHẦN SÁCH ALPHA',
    customerName: 'Trần Thị Mai Anh',
    customerPhone: '0987654321',
    bookId: 'BOOK-TL-03',
    bookTitle: 'Tâm Lý Học Về Tiền & Đầu Tư Cá Nhân',
    quantity: 1,
    unitPrice: 189000,
    subtotal: 189000,
    escrowStatus: 'FROZEN',
    frozenReason: 'Khách hàng yêu cầu đổi sách do lỗi rách gáy',
  },
  {
    id: 'item-004',
    orderId: 'ord-1002',
    orderCode: 'DH-2026-9815',
    orderCreatedAt: '2026-09-22T09:40:00.000Z',
    orderStatus: 'DELIVERED',
    format: 'PHYSICAL',
    deliveredAt: '2026-09-22T10:00:00.000Z',
    storeId: 'STR-ALPHA',
    storeName: 'CÔNG TY CỔ PHẦN SÁCH ALPHA',
    customerName: 'Trần Thị Mai Anh',
    customerPhone: '0987654321',
    bookId: 'BOOK-TT-04',
    bookTitle: 'Tư Duy Nhanh Và Chậm (Ấn Bản 2026)',
    quantity: 1,
    unitPrice: 210000,
    subtotal: 210000,
    escrowStatus: 'RELEASED',
    releasedAt: '2026-09-22 11:30',
  },
  {
    id: 'item-005',
    orderId: 'ord-1003',
    orderCode: 'DH-2026-9820',
    orderCreatedAt: '2026-09-21T16:20:00.000Z',
    orderStatus: 'COMPLETED',
    format: 'DIGITAL',
    deliveredAt: '2026-09-21T16:20:00.000Z',
    storeId: 'STR-FAHASA',
    storeName: 'CÔNG TY CỔ PHẦN PHÁT HÀNH SÁCH FAHASA',
    customerName: 'Lê Minh Quân',
    customerPhone: '0903112233',
    bookId: 'BOOK-KD-05',
    bookTitle: 'Thám Tử Lừng Danh Conan - Ebook Tập 104',
    quantity: 3,
    unitPrice: 35000,
    subtotal: 105000,
    escrowStatus: 'HOLDING', // Đã hết hạn đổi trả -> Sẵn sàng Bàn giao
  },
];

/**
 * Format chuỗi thời gian sang chuẩn Việt Nam (GMT+7: DD/MM/YYYY HH:mm)
 */
function formatVietnamDateTime(dateStr: string): string {
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
  } catch (e) {
    return dateStr;
  }
}

/**
 * Component hiển thị chữ giới hạn 10 ký tự, khi rê chuột sẽ hiện Popup đầy đủ
 */
function TruncatedCellWithTooltip({ text, maxLen = 10 }: { text?: string | null; maxLen?: number }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const str = text || '—';
  const isTruncated = str.length > maxLen;
  const displayStr = isTruncated ? `${str.slice(0, maxLen)}...` : str;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => isTruncated && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className={`cursor-default ${isTruncated ? 'border-b border-dotted border-slate-400' : ''}`}>
        {displayStr}
      </span>

      {showTooltip && (
        <div className="absolute left-0 bottom-full mb-1 z-50 px-2.5 py-1.5 text-xs text-white bg-slate-900 rounded-md shadow-lg whitespace-normal max-w-xs pointer-events-none transition-opacity duration-150">
          {str}
          <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}

export function AdminEscrowView() {
  const { showToast } = useToast();
  const [items, setItems] = useState<EscrowTableItem[]>(INITIAL_MOCK_ITEMS);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);
  const [nowTime, setNowTime] = useState<number>(0);

  // Mount effect to initialize client-side time and mock timers
  useEffect(() => {
    setMounted(true);
    setNowTime(Date.now());

    // Khởi tạo mốc đếm ngược demo sinh động khi Client mount
    setItems((prev) =>
      prev.map((it) => {
        // item-002: Ebook vừa mua 40 giây trước -> Đang đếm ngược còn ~80s
        if (it.id === 'item-002') {
          return {
            ...it,
            orderCreatedAt: new Date(Date.now() - 40 * 1000).toISOString(),
          };
        }
        // item-003: Sách giấy đã giao 80 giây trước -> Đang đếm ngược còn ~40s
        if (it.id === 'item-003') {
          return {
            ...it,
            deliveredAt: new Date(Date.now() - 80 * 1000).toISOString(),
          };
        }
        return it;
      }),
    );

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
    newStatus: 'HOLDING' | 'FROZEN' | 'RELEASED',
  ) => {
    setOpenDropdownId(null);

    const targetItem = items.find((it) => it.id === itemId);
    if (!targetItem) return;

    if (targetItem.escrowStatus === 'RELEASED') {
      showToast?.({
        title: 'Thao tác không khả dụng',
        message: 'Món hàng này đã được bàn giao cho cửa hàng, không thể thay đổi trạng thái.',
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

      const isDigital =
        item.format === 'DIGITAL' ||
        item.bookTitle.toLowerCase().includes('ebook') ||
        item.bookTitle.toLowerCase().includes('digital');
      const isPhysical = !isDigital;
      const isDelivered =
        item.orderStatus === 'DELIVERED' ||
        item.orderStatus === 'COMPLETED' ||
        Boolean(item.deliveredAt);

      // Sách giấy chưa giao hàng -> Chưa kích hoạt đếm ngược
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
        const matchStore = it.storeName.toLowerCase().includes(q) || it.storeId.toLowerCase().includes(q);
        const matchCustomer = it.customerName.toLowerCase().includes(q) || it.customerPhone.includes(q);
        const matchOrder = it.orderCode.toLowerCase().includes(q);
        const matchBook = it.bookTitle.toLowerCase().includes(q) || it.bookId.toLowerCase().includes(q);
        return matchStore || matchCustomer || matchOrder || matchBook;
      }
      return true;
    });
  }, [items, activeTab, searchQuery]);

  // Gom nhóm các sản phẩm theo đơn hàng
  const groupedOrders = useMemo(() => {
    const map = new Map<string, { orderCode: string; orderCreatedAt: string; items: EscrowTableItem[] }>();

    filteredItems.forEach((it) => {
      if (!map.has(it.orderCode)) {
        map.set(it.orderCode, {
          orderCode: it.orderCode,
          orderCreatedAt: it.orderCreatedAt,
          items: [],
        });
      }
      map.get(it.orderCode)!.items.push(it);
    });

    return Array.from(map.values());
  }, [filteredItems]);

  // Thống kê tài chính
  const stats = useMemo(() => {
    const totalHolding = items
      .filter((it) => it.escrowStatus === 'HOLDING')
      .reduce((sum, it) => sum + it.subtotal, 0);

    const totalReleased = items
      .filter((it) => it.escrowStatus === 'RELEASED')
      .reduce((sum, it) => sum + it.subtotal, 0);

    const totalFrozen = items
      .filter((it) => it.escrowStatus === 'FROZEN')
      .reduce((sum, it) => sum + it.subtotal, 0);

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

  return (
    <div className="space-y-6">
      {/* 1. Tiêu đề Trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="material-symbols-outlined text-emerald-600 text-32">
              account_balance
            </span>
            <span>Ký Quỹ Sàn (Escrow Holding)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản lý dòng tiền tạm giữ của các đơn hàng. Tự động bảo vệ quyền lợi người mua và giải ngân an toàn cho người bán.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchEscrowItems}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-60 cursor-pointer self-start sm:self-auto"
        >
          <span className={`material-symbols-outlined text-16 ${loading ? 'animate-spin' : ''}`}>
            refresh
          </span>
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* 2. Thẻ Thống Kê Tổng Quan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Đang Giữ */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Đang Giữ Ký Quỹ
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {stats.totalHolding.toLocaleString('vi-VN')} đ
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
              {stats.holdingCount} món hàng đang giữ
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-24">lock_clock</span>
          </div>
        </div>

        {/* Đã Bàn Giao */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Đã Bàn Giao Cho Shop
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.totalReleased.toLocaleString('vi-VN')} đ
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
              {stats.releasedCount} món hàng đã hoàn tất
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-24">verified</span>
          </div>
        </div>

        {/* Đóng Băng Tranh Chấp */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Đóng Băng Tranh Chấp
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {stats.totalFrozen.toLocaleString('vi-VN')} đ
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
              {stats.frozenCount} món hàng khiếu nại
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-24">gavel</span>
          </div>
        </div>
      </div>

      {/* 3. Thanh Bộ Lọc & Tìm Kiếm */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Tabs Trạng Thái */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              let count = stats.totalCount;
              if (tab.key === 'HOLDING') count = stats.holdingCount;
              if (tab.key === 'FROZEN') count = stats.frozenCount;
              if (tab.key === 'RELEASED') count = stats.releasedCount;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Ô Tìm Kiếm */}
          <div className="relative w-full lg:w-72 shrink-0">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-18">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã đơn, SĐT, tên sách, shop..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <span className="material-symbols-outlined text-14">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Bảng Dữ Liệu 13 Cột */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-3">Mã Cửa Hàng</th>
                <th className="py-3 px-3">Tên Cửa Hàng</th>
                <th className="py-3 px-3">Khách Hàng</th>
                <th className="py-3 px-3">SĐT Khách</th>
                <th className="py-3 px-3">Mã Đơn Hàng</th>
                <th className="py-3 px-3">Mã Sản Phẩm</th>
                <th className="py-3 px-3 text-center">Số Lượng</th>
                <th className="py-3 px-3">Tên Sản Phẩm</th>
                <th className="py-3 px-3 text-right">Đơn Giá</th>
                <th className="py-3 px-3 text-right">Thành Tiền</th>
                <th className="py-3 px-3 text-center">Trạng Thái Dòng Tiền</th>
                <th className="py-3 px-3 text-center">Thời Hạn Đổi Trả</th>
                <th className="py-3 px-3 text-center">Thao Tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {groupedOrders.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-48 text-slate-300 dark:text-slate-600">
                        inbox
                      </span>
                      <p className="text-sm font-medium">Không tìm thấy dữ liệu món hàng nào phù hợp.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                groupedOrders.map((group, groupIndex) => {
                  const groupBgClass =
                    groupIndex % 2 === 0
                      ? 'bg-white dark:bg-slate-800'
                      : 'bg-slate-50/80 dark:bg-slate-850/50';

                  return (
                    <React.Fragment key={group.orderCode}>
                      {/* Dòng phân cách đơn hàng: Mã đơn - Ngày giờ tạo chuẩn Việt Nam GMT+7 */}
                      <tr className="bg-slate-200/80 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border-y border-slate-300 dark:border-slate-700">
                        <td colSpan={13} className="py-2 px-3.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-16">
                                shopping_bag
                              </span>
                              <span>ĐƠN HÀNG: #{group.orderCode}</span>
                              <span className="text-slate-400 font-normal">|</span>
                              <span
                                suppressHydrationWarning
                                className="text-slate-600 dark:text-slate-400 font-normal"
                              >
                                Ngày tạo: {formatVietnamDateTime(group.orderCreatedAt)}
                              </span>
                            </div>
                            <span className="text-slate-500 dark:text-slate-400 font-normal text-[11px]">
                              {group.items.length} món hàng trong đơn
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Các dòng sản phẩm của đơn hàng */}
                      {group.items.map((item) => {
                        const isReleased = item.escrowStatus === 'RELEASED';
                        const isFrozen = item.escrowStatus === 'FROZEN';
                        const isHolding = item.escrowStatus === 'HOLDING';
                        const returnInfo = getReturnStatusInfo(item);

                        return (
                          <tr
                            key={item.id}
                            className={`${groupBgClass} hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-colors`}
                          >
                            {/* 1. Mã cửa hàng */}
                            <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {item.storeId}
                            </td>

                            {/* 2. Tên cửa hàng (Tối đa 10 ký tự + Hover Tooltip) */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <TruncatedCellWithTooltip text={item.storeName} />
                            </td>

                            {/* 3. Khách hàng thanh toán (Tối đa 10 ký tự + Hover Tooltip) */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <TruncatedCellWithTooltip text={item.customerName} />
                            </td>

                            {/* 4. Số điện thoại khách */}
                            <td className="py-3 px-3 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {item.customerPhone}
                            </td>

                            {/* 5. Mã đơn hàng */}
                            <td className="py-3 px-3 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                              {item.orderCode}
                            </td>

                            {/* 6. Mã sản phẩm */}
                            <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {item.bookId}
                            </td>

                            {/* 7. Số lượng */}
                            <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-100">
                              {item.quantity}
                            </td>

                            {/* 8. Tên sản phẩm kèm Định dạng (Sách giấy / Ebook) */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {item.format === 'DIGITAL' || item.bookTitle.toLowerCase().includes('ebook') ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                                    EBOOK
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                                    SÁCH GIẤY
                                  </span>
                                )}
                                <TruncatedCellWithTooltip text={item.bookTitle} />
                              </div>
                            </td>

                            {/* 9. Đơn giá */}
                            <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {item.unitPrice.toLocaleString('vi-VN')} đ
                            </td>

                            {/* 10. Thành tiền */}
                            <td className="py-3 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                              {item.subtotal.toLocaleString('vi-VN')} đ
                            </td>

                            {/* 11. Trạng thái dòng tiền */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {isHolding && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  Đang giữ dòng tiền
                                </span>
                              )}
                              {isFrozen && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                  Đóng băng dòng tiền
                                </span>
                              )}
                              {isReleased && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                  Đã chuyển cho cửa hàng
                                </span>
                              )}
                            </td>

                            {/* 12. Thời Hạn Đổi Trả (Quy tắc Sách Giấy & Ebook) */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {returnInfo.type === 'WAITING_DELIVERY' ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                  title="Sách giấy đang giao, chưa kích hoạt thời hạn đổi trả 2 phút"
                                >
                                  <span className="material-symbols-outlined text-[14px] text-amber-600">local_shipping</span>
                                  <span>Chờ giao hàng</span>
                                </span>
                              ) : returnInfo.type === 'COUNTDOWN' ? (
                                <span
                                  suppressHydrationWarning
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-mono"
                                  title="Đang trong thời hạn kiểm tra và đổi trả 2 phút"
                                >
                                  <span className="material-symbols-outlined text-[14px] text-rose-600 animate-spin">timer</span>
                                  <span>Còn {returnInfo.formattedTime}</span>
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  title="Đã qua thời hạn 2 phút đổi trả hoặc đã bàn giao hoàn tất"
                                >
                                  <span className="material-symbols-outlined text-[14px] text-emerald-600">verified</span>
                                  <span>Hết hạn đổi trả</span>
                                </span>
                              )}
                            </td>

                            {/* 13. Thao tác (Đang giữ & Đóng băng luôn hoạt động; Bàn giao chỉ mở khi đủ điều kiện) */}
                            <td className="py-3 px-3 text-center whitespace-nowrap relative escrow-dropdown-container">
                              {isReleased ? (
                                /* Đã bàn giao hoàn tất */
                                <button
                                  type="button"
                                  disabled
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg shadow-xs opacity-60 cursor-not-allowed select-none"
                                  title="Đã bàn giao tiền cho cửa hàng, không thể thay đổi trạng thái"
                                >
                                  <span className="material-symbols-outlined text-14">check_circle</span>
                                  <span>Bàn giao</span>
                                </button>
                              ) : (
                                /* Dropdown thao tác: Đang giữ & Đóng băng luôn dùng được, Bàn giao kiểm tra điều kiện */
                                <div className="relative inline-block text-left">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdownId(openDropdownId === item.id ? null : item.id);
                                    }}
                                    className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer ${
                                      isHolding
                                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-900'
                                        : isFrozen
                                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    }`}
                                  >
                                    <span>
                                      {isHolding ? 'Đang giữ' : isFrozen ? 'Đóng băng' : 'Bàn giao'}
                                    </span>
                                    <span className="material-symbols-outlined text-14">arrow_drop_down</span>
                                  </button>

                                  {/* Menu Dropdown 3 lựa chọn */}
                                  {openDropdownId === item.id && (
                                    <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-1 divide-y divide-slate-100 dark:divide-slate-700 text-left">
                                      {/* Lựa chọn 1: Đang giữ (Luôn khả dụng) */}
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(item.id, 'HOLDING')}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                                      >
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                        <span>Đang giữ</span>
                                      </button>

                                      {/* Lựa chọn 2: Đóng băng (Luôn khả dụng) */}
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(item.id, 'FROZEN')}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                      >
                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                                        <span>Đóng băng</span>
                                      </button>

                                      {/* Lựa chọn 3: Bàn giao (Disable nếu chưa giao hoặc còn hạn đổi trả) */}
                                      {returnInfo.canRelease ? (
                                        <button
                                          type="button"
                                          onClick={() => handleStatusChange(item.id, 'RELEASED')}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                                        >
                                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                                          <span>Bàn giao (Đủ điều kiện)</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled
                                          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 dark:text-slate-500 opacity-60 cursor-not-allowed select-none bg-slate-50/50 dark:bg-slate-900/30"
                                          title={returnInfo.reason}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                                            <span>Bàn giao (Khóa)</span>
                                          </div>
                                          <span className="material-symbols-outlined text-14">lock</span>
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
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
export default AdminEscrowView;
