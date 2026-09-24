"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import { AdminStatusBadge, AdminFilterTabs, AdminPagination, AdminTableContainer } from './AdminUI';

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
  escrowStatus: 'HOLDING' | 'FROZEN' | 'RELEASED' | 'REFUNDED';
  releasedAt?: string | null;
  refundedAt?: string | null;
  frozenReason?: string | null;
  returnRequestStatus?: string | null;
}

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất Cả' },
  { key: 'HOLDING', label: 'Đang Giữ Dòng Tiền' },
  { key: 'FROZEN', label: 'Đóng Băng Dòng Tiền' },
  { key: 'RELEASED', label: 'Đã Chuyển Cho Cửa Hàng' },
  { key: 'REFUNDED', label: 'Đã Hoàn Trả Khách' },
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



export function AdminEscrowView() {
  const { showToast } = useToast();
  const [items, setItems] = useState<EscrowTableItem[]>(INITIAL_MOCK_ITEMS);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);
  const [nowTime, setNowTime] = useState<number>(0);

  // Mount effect to initialize client-side time
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

  // Phân trang đơn hàng (10 đơn / trang)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.ceil(groupedOrders.length / pageSize) || 1;
  const paginatedOrders = groupedOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setCurrentPage(1);
  };

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
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* 1. Tiêu đề Trang & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#00875A] rounded-full inline-block"></span>
            <span>Ký Quỹ Sàn &amp; Tài Khoản Trung Gian</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kiểm soát dòng tiền giữ hộ, thời hạn đổi trả 2 phút và điều phối bàn giao doanh thu cho người bán
          </p>
        </div>

        <button
          type="button"
          onClick={fetchEscrowItems}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto active:scale-[0.98]"
        >
          <span className={`material-symbols-outlined text-[16px] text-slate-500 ${loading ? 'animate-spin text-[#00875A]' : ''}`}>
            refresh
          </span>
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* 2. Thẻ Thống Kê Tổng Quan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Đang Giữ */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Đang Giữ Ký Quỹ</p>
            <h3 className="text-xl font-bold text-amber-600 mt-1 font-mono tracking-tight">
              {stats.totalHolding.toLocaleString('vi-VN')} đ
            </h3>
            <p className="text-[11.5px] text-slate-500 mt-1 font-medium">{stats.holdingCount} món hàng đang giữ tiền</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50/80 border border-amber-100 text-amber-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">lock_clock</span>
          </div>
        </div>

        {/* Đã Bàn Giao */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Đã Bàn Giao Cho Shop</p>
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
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Đóng Băng Tranh Chấp</p>
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
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
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
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm mã đơn, SĐT, tên sách..."
            className="w-full pl-9 pr-7 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Bảng Dữ Liệu Ký Quỹ Đơn Hàng */}
      <AdminTableContainer>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[1360px]">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3.5 pl-5 pr-4 w-[38%] min-w-[360px]">Sản Phẩm &amp; Phân Loại</th>
                <th className="py-3.5 px-3 w-[7%] text-center">Số Lượng</th>
                <th className="py-3.5 px-4 w-[11%] text-right">Đơn Giá</th>
                <th className="py-3.5 px-4 w-[13%] text-right">Thành Tiền</th>
                <th className="py-3.5 px-4 w-[14%] text-center">Trạng Thái Dòng Tiền</th>
                <th className="py-3.5 px-4 w-[14%] text-center">Thời Hạn Đổi Trả</th>
                <th className="py-3.5 pl-4 pr-5 w-[13%] text-center">Thao Tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-3xl text-slate-300">
                        inbox
                      </span>
                      <p className="font-semibold text-slate-700">Không Tìm Thấy Dữ Liệu Ký Quỹ Phù Hợp</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((group, groupIndex) => {
                  const firstItem = group.items[0];

                  return (
                    <React.Fragment key={group.orderCode}>
                      {/* Header bar cho từng Đơn hàng */}
                      <tr className="bg-slate-50/70 text-slate-700 border-t-2 border-b border-slate-200/80">
                        <td colSpan={7} className="py-2.5 pl-5 pr-5">
                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5">
                              {/* Order Code */}
                              <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200/90 shadow-2xs">
                                <span className="material-symbols-outlined text-[#00875A] text-[15px]">
                                  shopping_bag
                                </span>
                                <span className="font-mono text-[12px]">#{group.orderCode}</span>
                              </span>

                              {/* Order Time */}
                              <span
                                suppressHydrationWarning
                                className="text-slate-500 font-normal text-[11.5px] flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px] text-slate-400">schedule</span>
                                <span>{formatVietnamDateTime(group.orderCreatedAt)}</span>
                              </span>

                              {firstItem && (
                                <>
                                  <span className="text-slate-300 hidden md:inline">•</span>
                                  {/* Store */}
                                  <span className="text-slate-700 flex items-center gap-1.5 text-[12px]">
                                    <span className="material-symbols-outlined text-[15px] text-slate-400">storefront</span>
                                    <span className="font-medium text-slate-800">{firstItem.storeName}</span>
                                    <span className="font-mono text-[10.5px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                                      {firstItem.storeId}
                                    </span>
                                  </span>

                                  <span className="text-slate-300 hidden md:inline">•</span>
                                  {/* Customer */}
                                  <span className="text-slate-600 flex items-center gap-1.5 text-[12px]">
                                    <span className="material-symbols-outlined text-[15px] text-slate-400">person</span>
                                    <span className="font-medium text-slate-800">{firstItem.customerName}</span>
                                    <span className="font-mono text-[11px] text-slate-400">({firstItem.customerPhone})</span>
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Item count */}
                            <span className="text-slate-500 font-medium text-[11px] bg-white px-2 py-0.5 rounded-md border border-slate-200">
                              {group.items.length} món hàng
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Các dòng sản phẩm của đơn hàng */}
                      {group.items.map((item, itIdx) => {
                        const isReleased = item.escrowStatus === 'RELEASED';
                        const isRefunded = item.escrowStatus === 'REFUNDED';
                        const isFrozen = item.escrowStatus === 'FROZEN';
                        const isHolding = item.escrowStatus === 'HOLDING';
                        const returnInfo = getReturnStatusInfo(item);
                        const canRefund =
                          item.returnRequestStatus === 'SELLER_ACCEPTED' ||
                          item.returnRequestStatus === 'ARBITRATED_BUYER_WINS' ||
                          isFrozen;

                        return (
                          <tr
                            key={item.id}
                            className="bg-white hover:bg-slate-50/70 transition-colors"
                          >
                            {/* 1. Tên sản phẩm & Định dạng */}
                            <td className="py-3.5 pl-5 pr-4 min-w-[360px]">
                              <div className="flex items-start gap-2.5">
                                {item.format === 'DIGITAL' || item.bookTitle.toLowerCase().includes('ebook') ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0 mt-0.5 tracking-wide">
                                    EBOOK
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60 shrink-0 mt-0.5 tracking-wide">
                                    SÁCH IN
                                  </span>
                                )}
                                <div className="flex flex-col min-w-0">
                                  <span className="font-medium text-slate-900 text-[13px] leading-snug">
                                    {item.bookTitle}
                                  </span>
                                  <span className="font-mono text-[10.5px] text-slate-400 mt-0.5">
                                    Mã SP: {item.bookId}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* 2. Số lượng */}
                            <td className="py-3.5 px-3 text-center font-semibold text-slate-700 text-xs">
                              {item.quantity}
                            </td>

                            {/* 3. Đơn giá */}
                            <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600 whitespace-nowrap">
                              {item.unitPrice.toLocaleString('vi-VN')} đ
                            </td>

                            {/* 4. Thành tiền */}
                            <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                              {item.subtotal.toLocaleString('vi-VN')} đ
                            </td>

                            {/* 5. Trạng thái dòng tiền */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
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
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200"
                                  title="Đã hoàn tiền cho người mua"
                                >
                                  <span className="material-symbols-outlined text-[14px] text-slate-400">replay</span>
                                  <span>Đã hoàn tiền</span>
                                </span>
                              ) : returnInfo.type === 'WAITING_DELIVERY' ? (
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200"
                                  title="Sách giấy đang giao, chưa kích hoạt thời hạn đổi trả 2 phút"
                                >
                                  <span className="material-symbols-outlined text-[14px] text-slate-400">local_shipping</span>
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
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200"
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

                            {/* 7. Thao tác */}
                            <td className="py-3.5 pl-4 pr-5 text-center whitespace-nowrap relative escrow-dropdown-container">
                              {isReleased ? (
                                <span className="text-[11.5px] text-slate-400 font-medium italic">
                                  Đã bàn giao
                                </span>
                              ) : isRefunded ? (
                                <span className="text-[11.5px] text-slate-400 font-medium italic">
                                  Đã hoàn tiền
                                </span>
                              ) : (
                                /* Dropdown thao tác: Đang giữ, Đóng băng, Bàn giao, Hoàn trả */
                                <div className="relative inline-block text-left">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdownId(openDropdownId === item.id ? null : item.id);
                                    }}
                                    className={`inline-flex items-center justify-between gap-1.5 px-3 py-1.5 text-[11.5px] font-medium rounded-xl border transition-all cursor-pointer shadow-2xs active:scale-[0.96] ${
                                      isHolding
                                        ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                                        : isFrozen
                                        ? 'bg-rose-50/80 hover:bg-rose-100 text-rose-800 border-rose-200/80'
                                        : 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border-emerald-200/80'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`w-2 h-2 rounded-full ${
                                          isHolding
                                            ? 'bg-amber-500'
                                            : isFrozen
                                            ? 'bg-rose-500'
                                            : 'bg-emerald-500'
                                        }`}
                                      ></span>
                                      <span>
                                        {isHolding ? 'Đang giữ' : isFrozen ? 'Đóng băng' : 'Bàn giao'}
                                      </span>
                                    </div>
                                    <span className="material-symbols-outlined text-[15px] text-slate-400">expand_more</span>
                                  </button>

                                  {/* Menu Dropdown 4 lựa chọn */}
                                  {openDropdownId === item.id && (
                                    <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 py-1.5 divide-y divide-slate-100 text-left animate-in fade-in zoom-in-95 duration-150">
                                      {/* Lựa chọn 1: Đang giữ */}
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(item.id, 'HOLDING')}
                                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-amber-50/60 hover:text-amber-800 transition-colors cursor-pointer"
                                      >
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                        <span>Đang giữ tiền</span>
                                      </button>

                                      {/* Lựa chọn 2: Đóng băng */}
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(item.id, 'FROZEN')}
                                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-rose-50/60 hover:text-rose-800 transition-colors cursor-pointer"
                                      >
                                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                        <span>Đóng băng dòng tiền</span>
                                      </button>

                                      {/* Lựa chọn 3: Bàn giao */}
                                      {returnInfo.canRelease ? (
                                        <button
                                          type="button"
                                          onClick={() => handleStatusChange(item.id, 'RELEASED')}
                                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50/60 hover:text-emerald-800 transition-colors cursor-pointer"
                                        >
                                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                          <span>Bàn giao cho Shop</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled
                                          className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-slate-400 opacity-60 cursor-not-allowed select-none bg-slate-50/60"
                                          title={returnInfo.reason}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                            <span>Bàn giao (Chưa đủ ĐK)</span>
                                          </div>
                                          <span className="material-symbols-outlined text-[13px]">lock</span>
                                        </button>
                                      )}

                                      {/* Lựa chọn 4: Hoàn trả (Blue button) */}
                                      {canRefund ? (
                                        <button
                                          type="button"
                                          onClick={() => handleStatusChange(item.id, 'REFUNDED')}
                                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-sky-50/60 hover:text-sky-800 transition-colors cursor-pointer"
                                        >
                                          <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                          <span>Hoàn trả Khách hàng</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled
                                          className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-slate-400 opacity-60 cursor-not-allowed select-none bg-slate-50/60"
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
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={groupedOrders.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="đơn hàng ký quỹ"
        />
      </AdminTableContainer>
    </div>
  );
}
export default AdminEscrowView;

