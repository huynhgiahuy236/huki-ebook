"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';

export interface EscrowTableItem {
  id: string; // order item id
  orderId: string;
  orderCode: string;
  orderCreatedAt: string;
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

const INITIAL_MOCK_ITEMS: EscrowTableItem[] = [
  {
    id: 'item-001',
    orderId: 'ord-1001',
    orderCode: 'DH-2026-9812',
    orderCreatedAt: '2026-09-22T10:15:00.000Z',
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
    orderCreatedAt: '2026-09-22T10:15:00.000Z',
    storeId: 'STR-KIEN-02',
    storeName: 'CÔNG TY TNHH KIEN SELLER 2',
    customerName: 'Nguyễn Văn Hoàng',
    customerPhone: '0912345678',
    bookId: 'BOOK-GK-02',
    bookTitle: 'Nhà Giả Kim (Tái Bản Kỷ Niệm 25 Năm)',
    quantity: 2,
    unitPrice: 85000,
    subtotal: 170000,
    escrowStatus: 'HOLDING',
  },
  {
    id: 'item-003',
    orderId: 'ord-1002',
    orderCode: 'DH-2026-9815',
    orderCreatedAt: '2026-09-22T09:40:00.000Z',
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
    storeId: 'STR-FAHASA',
    storeName: 'CÔNG TY CỔ PHẦN PHÁT HÀNH SÁCH FAHASA',
    customerName: 'Lê Minh Quân',
    customerPhone: '0903112233',
    bookId: 'BOOK-KD-05',
    bookTitle: 'Thám Tử Lừng Danh Conan - Tập 104',
    quantity: 3,
    unitPrice: 35000,
    subtotal: 105000,
    escrowStatus: 'RELEASED',
    releasedAt: '2026-09-22 08:00',
  },
];

/**
 * Format chuỗi thời gian sang chuẩn Việt Nam (GMT+7: DD/MM/YYYY HH:mm)
 * Xử lý chính xác múi giờ cả với định dạng ISO UTC (kết thúc bằng Z) lẫn chuỗi ngày thông thường.
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
 * Helper hàm rút gọn chuỗi tối đa 10 ký tự, nếu vượt quá thì cắt và thêm "..."
 */
function truncate10(str: string): { text: string; isTruncated: boolean } {
  if (!str) return { text: '', isTruncated: false };
  if (str.length <= 10) {
    return { text: str, isTruncated: false };
  }
  return {
    text: `${str.slice(0, 10)}...`,
    isTruncated: true,
  };
}

/**
 * Component hiển thị text tối đa 10 ký tự, nếu quá dài thì có "..."
 * và khi hover vào sẽ hiển thị tooltip đầy đủ nội dung bên dưới
 */
function TruncatedCellWithTooltip({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  if (text === 'Đang cập nhật') {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-md ${className}`}>
        <span className="material-symbols-outlined text-xs animate-spin">sync</span>
        <span>Đang cập nhật</span>
      </span>
    );
  }

  const { text: displayText, isTruncated } = truncate10(text);

  return (
    <div className={`group relative inline-flex items-center ${className}`}>
      <span className="cursor-default font-medium text-slate-800 dark:text-slate-100 select-none">
        {displayText}
      </span>
      {isTruncated && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover:flex flex-col items-center z-50 pointer-events-none transition-all duration-200">
          <div className="w-2 h-2 bg-slate-900 rotate-45 -mb-1 shadow-sm"></div>
          <div className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-md shadow-xl border border-slate-700 whitespace-nowrap max-w-xs break-words text-center font-normal">
            {text}
          </div>
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

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.escrow-dropdown-container')) {
        setOpenDropdownId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Fetch dữ liệu từ API và map chính xác Tên Cửa Hàng từ CSDL thật
  const fetchEscrowItems = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Lấy danh sách Store & Business thật từ Database
      const storeMap = new Map<string, string>();
      try {
        const [storeRes, bizRes] = await Promise.all([
          adminApi.getStores({ limit: 500 }),
          adminApi.getBusinesses({ limit: 500 }),
        ]);

        const rawStores = Array.isArray(storeRes?.data)
          ? storeRes.data
          : Array.isArray((storeRes?.data as any)?.data)
          ? (storeRes?.data as any).data
          : [];

        rawStores.forEach((st: any) => {
          if (st.id && st.name) {
            storeMap.set(st.id, st.name);
          }
          if (st.businessId && st.name) {
            storeMap.set(st.businessId, st.name);
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
            // Tìm tên cửa hàng thật từ storeId hoặc storeName
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

            // Nếu không tìm thấy hoặc bị lỗi ID thì hiển thị "Đang cập nhật"
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

    // Nếu đã chuyển cho cửa hàng thì không cho phép đổi lại
    if (targetItem.escrowStatus === 'RELEASED') {
      showToast?.({
        title: 'Thao tác không khả dụng',
        message: 'Món hàng này đã được bàn giao cho cửa hàng, không thể thay đổi trạng thái.',
        type: 'warning',
      });
      return;
    }

    // Cập nhật State trong RAM ngay lập tức
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

    // Bắn Toast thông báo theo đúng trạng thái
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

    // Gọi API cập nhật backend
    try {
      if (adminApi && (adminApi as any).updateEscrowItemStatus) {
        await (adminApi as any).updateEscrowItemStatus(itemId, { status: newStatus });
      }
    } catch (err) {
      console.warn('Lỗi gọi API cập nhật trạng thái ký quỹ:', err);
    }
  };

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

  // Gom nhóm các sản phẩm theo đơn hàng để hiển thị dòng phân cách & chung màu nền
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

  // Thống kê tài chính theo trạng thái
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
    <div className="space-y-5 pb-12">
      {/* 1. Header Trang & Thao tác làm mới */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-28">
              account_balance_wallet
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Tài Khoản Trung Gian & Quản Lý Dòng Tiền
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Nơi tạm giữ dòng tiền chuyển khoản trực tuyến từ khách hàng và kiểm soát giải ngân độc lập cho từng món hàng.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchEscrowItems();
              showToast?.({
                title: 'Đã làm mới',
                message: 'Dữ liệu tài khoản trung gian đã được cập nhật.',
                type: 'info',
              });
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            <span className={`material-symbols-outlined text-18 ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Thẻ Thống Kê Tổng Quan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Đang giữ */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Đang Giữ Dòng Tiền
            </span>
            <span className="material-symbols-outlined text-amber-500 text-20">hourglass_empty</span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-900 dark:text-amber-200">
            {stats.totalHolding.toLocaleString('vi-VN')} đ
          </div>
          <div className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">
            {stats.holdingCount} món hàng đang trong quỹ tạm
          </div>
        </div>

        {/* Đóng băng */}
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Đóng Băng Dòng Tiền
            </span>
            <span className="material-symbols-outlined text-rose-500 text-20">lock_clock</span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-900 dark:text-rose-200">
            {stats.totalFrozen.toLocaleString('vi-VN')} đ
          </div>
          <div className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-1">
            {stats.frozenCount} món hàng đang tạm khóa xử lý
          </div>
        </div>

        {/* Đã chuyển cho cửa hàng */}
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Đã Chuyển Cửa Hàng
            </span>
            <span className="material-symbols-outlined text-emerald-500 text-20">verified</span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-900 dark:text-emerald-200">
            {stats.totalReleased.toLocaleString('vi-VN')} đ
          </div>
          <div className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1">
            {stats.releasedCount} món hàng đã hoàn tất bàn giao
          </div>
        </div>

        {/* Tổng món trong sàn */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Tổng Món Ký Quỹ
            </span>
            <span className="material-symbols-outlined text-slate-500 text-20">receipt_long</span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {stats.totalCount} món
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Trên toàn bộ đơn thanh toán online
          </div>
        </div>
      </div>

      {/* 3. BỘ LỌC ĐIỀU KIỆN & TÌM KIẾM NGAY NGẮN TRÊN 1 HÀNG */}
      <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Tabs Điều Kiện Lọc Trạng Thái Ngay Ngắn */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-x-auto no-scrollbar shrink-0">
            {STATUS_TABS.map((tab) => {
              const count =
                tab.key === 'ALL'
                  ? stats.totalCount
                  : tab.key === 'HOLDING'
                  ? stats.holdingCount
                  : tab.key === 'FROZEN'
                  ? stats.frozenCount
                  : stats.releasedCount;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-all select-none ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
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

          {/* Ô Tìm Kiếm Nằm Cùng Hàng */}
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

      {/* 4. Bảng Dữ Liệu 12 Cột */}
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
                <th className="py-3 px-3 text-center">Trạng Thái</th>
                <th className="py-3 px-3 text-center">Thao Tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {groupedOrders.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
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
                  // Xen kẽ màu nền cho từng nhóm đơn hàng
                  const groupBgClass =
                    groupIndex % 2 === 0
                      ? 'bg-white dark:bg-slate-800'
                      : 'bg-slate-50/80 dark:bg-slate-850/50';

                  return (
                    <React.Fragment key={group.orderCode}>
                      {/* Dòng phân cách đơn hàng: Mã đơn - Ngày giờ tạo chuẩn Việt Nam GMT+7 */}
                      <tr className="bg-slate-200/80 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border-y border-slate-300 dark:border-slate-700">
                        <td colSpan={12} className="py-2 px-3.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-16">
                                shopping_bag
                              </span>
                              <span>ĐƠN HÀNG: #{group.orderCode}</span>
                              <span className="text-slate-400 font-normal">|</span>
                              <span className="text-slate-600 dark:text-slate-400 font-normal">
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

                            {/* 8. Tên sản phẩm (Tối đa 10 ký tự + Hover Tooltip) */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <TruncatedCellWithTooltip text={item.bookTitle} />
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

                            {/* 12. Thao tác (Dropdown 3 màu & Khóa Disable khi Bàn giao) */}
                            <td className="py-3 px-3 text-center whitespace-nowrap relative escrow-dropdown-container">
                              {isReleased ? (
                                /* Khi đã chuyển tiền cho cửa hàng: Nút Bị DISABLE hoàn toàn */
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
                                /* Nút dropdown tương tác 3 lựa chọn */
                                <div className="relative inline-block text-left">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdownId(openDropdownId === item.id ? null : item.id);
                                    }}
                                    className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg shadow-xs transition-colors ${
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
                                    <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-1 divide-y divide-slate-100 dark:divide-slate-700 text-left">
                                      {/* Lựa chọn 1: Đang giữ */}
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(item.id, 'HOLDING')}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                                      >
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                        <span>Đang giữ</span>
                                      </button>

                                      {/* Lựa chọn 2: Đóng băng */}
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(item.id, 'FROZEN')}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                      >
                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                                        <span>Đóng băng</span>
                                      </button>

                                      {/* Lựa chọn 3: Bàn giao */}
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(item.id, 'RELEASED')}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                                      >
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                                        <span>Bàn giao</span>
                                      </button>
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
