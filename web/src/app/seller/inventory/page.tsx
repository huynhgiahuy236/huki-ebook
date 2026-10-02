"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { catalogApi, InventoryReason, BookFormat } from '@/ui/api/catalogApi';
import { businessApi } from '@/ui/api/businessApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import {
  SellerTableContainer,
  SellerStatusBadge,
  SellerActionButton,
  SellerFilterTabs,
  SellerPagination,
} from '@/ui/components/seller/SellerUI';

interface InventoryBook {
  id: string;
  title: string;
  isbn?: string;
  format?: BookFormat | string;
  author?: { name?: string } | string;
  coverUrl?: string;
  coverImage?: string;
  cover?: string;
  stock?: number;
  reserved?: number;
  physicalDetails?: {
    stock?: number;
    reserved?: number;
  };
}

interface InventoryLogItem {
  id: string;
  change?: number;
  reason?: InventoryReason | string;
  createdAt?: string;
  note?: string;
  previousStock?: number;
  newStock?: number;
}

interface AdjustState {
  book: InventoryBook | null;
  operation: 'ADD' | 'SUBTRACT' | 'SET';
  quantity: number;
  reason: InventoryReason;
  note: string;
  submitting: boolean;
}

export default function SellerInventoryPage() {
  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  const { showToast } = useToast();
  const [books, setBooks] = useState<InventoryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // In-Page Adjust State (NO POPUP)
  const [adjustState, setAdjustState] = useState<AdjustState | null>(null);

  // In-Page Logs State (NO POPUP)
  const [logBook, setLogBook] = useState<InventoryBook | null>(null);
  const [logs, setLogs] = useState<InventoryLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      let bizId = user?.business?.id || activeBusinessId || undefined;
      if (!bizId) {
        try {
          const myBiz = await businessApi.getMyBusiness();
          if (myBiz.success && myBiz.data?.id) {
            bizId = myBiz.data.id;
            setActiveBusinessId(bizId);
          }
        } catch { /* ignore */ }
      }

      let bookList: InventoryBook[] = [];
      try {
        const res = await catalogApi.getSellerBooks({ limit: 100, ...(bizId ? { business: bizId } : {}) });
        if (res.data) {
          bookList = Array.isArray(res.data) ? res.data : (res.data as any).data || (res.data as any).items || [];
        }
      } catch {
        const pubRes = await catalogApi.getPublicBooks({ limit: 100 });
        if (pubRes.data) {
          bookList = Array.isArray(pubRes.data) ? pubRes.data : (pubRes.data as any).data || (pubRes.data as any).items || [];
        }
      }

      const physicalBooks = bookList.filter(
        (b) => b.format === 'PHYSICAL' || b.format === 'BOTH'
      );
      setBooks(physicalBooks);
    } catch (err) {
      console.error('Failed to fetch books for inventory', err);
      showToast?.('Không thể tải danh sách tồn kho', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, activeBusinessId, setActiveBusinessId, showToast]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Compute Metrics
  const metrics = useMemo(() => {
    let totalTitles = books.length;
    let totalOnHand = 0;
    let totalReserved = 0;
    let totalAvailable = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;

    books.forEach((b) => {
      const stock = Number(b.stock ?? b.physicalDetails?.stock ?? 0);
      const reserved = Number(b.reserved ?? b.physicalDetails?.reserved ?? 0);
      const available = Math.max(0, stock - reserved);

      totalOnHand += stock;
      totalReserved += reserved;
      totalAvailable += available;

      if (available === 0) outOfStockCount++;
      else if (available <= 5) lowStockCount++;
    });

    return {
      totalTitles,
      totalOnHand,
      totalReserved,
      totalAvailable,
      outOfStockCount,
      lowStockCount,
    };
  }, [books]);

  // Filtered Books
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const titleMatch = (b.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.isbn || '').toLowerCase().includes(search.toLowerCase());
      if (!titleMatch) return false;

      const stock = Number(b.stock ?? b.physicalDetails?.stock ?? 0);
      const reserved = Number(b.reserved ?? b.physicalDetails?.reserved ?? 0);
      const available = Math.max(0, stock - reserved);

      if (filterStatus === 'OUT_OF_STOCK') return available === 0;
      if (filterStatus === 'LOW_STOCK') return available > 0 && available <= 5;
      if (filterStatus === 'IN_STOCK') return available > 5;
      return true;
    });
  }, [books, search, filterStatus]);

  const totalPages = Math.ceil(filteredBooks.length / pageSize) || 1;
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBooks.slice(start, start + pageSize);
  }, [filteredBooks, currentPage, pageSize]);

  const handleOpenAdjust = (book: InventoryBook, operation: 'ADD' | 'SUBTRACT' | 'SET' = 'ADD') => {
    setLogBook(null); // Close log if open
    setAdjustState({
      book,
      operation,
      quantity: operation === 'ADD' ? 10 : 1,
      reason: operation === 'ADD' ? ('RESTOCK' as any) : ('MANUAL_ADJUSTMENT' as any),
      note: '',
      submitting: false,
    });
  };

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustState?.book) return;

    try {
      setAdjustState((prev) => (prev ? { ...prev, submitting: true } : null));
      await catalogApi.updateInventory(adjustState.book.id, {
        operation: adjustState.operation,
        quantity: Number(adjustState.quantity),
        reason: adjustState.reason,
        note: adjustState.note,
      });

      showToast?.(
        `Đã cập nhật tồn kho cho "${adjustState.book.title}" thành công!`,
        'success'
      );
      setAdjustState(null);
      await fetchInventory();
    } catch (err: any) {
      console.error('Failed to update inventory', err);
      showToast?.(err?.message || 'Cập nhật tồn kho thất bại', 'error');
      setAdjustState((prev) => (prev ? { ...prev, submitting: false } : null));
    }
  };

  // Fetch In-Page History Logs
  const fetchLogs = async (book: InventoryBook, pageNum = 1) => {
    setAdjustState(null); // Close adjust form if open
    setLogBook(book);
    try {
      setLoadingLogs(true);
      const res = await catalogApi.getInventoryLogs(book.id, { page: pageNum, limit: 8 });
      if (res) {
        const payload = (res.data as any)?.data || (res.data as any)?.items || res.data || [];
        const logList = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
        const meta = (res.data as any)?.meta || (res as any).meta || {};
        setLogs(Array.isArray(logList) ? logList : []);
        setLogPage(meta.page || pageNum);
        setLogTotalPages(meta.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load inventory logs', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const tabs = [
    { key: 'ALL', label: 'Tất cả', count: metrics.totalTitles },
    { key: 'IN_STOCK', label: 'Còn hàng', count: metrics.totalTitles - metrics.outOfStockCount - metrics.lowStockCount },
    { key: 'LOW_STOCK', label: 'Sắp hết (≤ 5)', count: metrics.lowStockCount },
    { key: 'OUT_OF_STOCK', label: 'Hết hàng (0)', count: metrics.outOfStockCount },
  ];

  const [expandedBookIds, setExpandedBookIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedBookIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto font-sans animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#00875A] rounded-full inline-block"></span>
            <span>Quản Lý Tồn Kho &amp; Sách Giấy</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kiểm soát Tồn thực tế (On-Hand), Tạm giữ (Reserved) và Khả dụng (Available) với cơ chế khóa nguyên tử
          </p>
        </div>
        <button
          type="button"
          onClick={fetchInventory}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto active:scale-[0.98]"
        >
          <span className={`material-symbols-outlined text-[16px] text-slate-500 ${loading ? 'animate-spin text-[#00875A]' : ''}`}>
            refresh
          </span>
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">Đầu Sách Vật Lý</span>
            <span className="material-symbols-outlined text-slate-500 bg-slate-100 p-1.5 rounded-lg text-base">
              menu_book
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900">{metrics.totalTitles}</div>
          <span className="text-[11px] text-slate-400">Ấn bản sách giấy</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">Tồn Thực (On-Hand)</span>
            <span className="material-symbols-outlined text-indigo-600 bg-indigo-50 p-1.5 rounded-lg text-base">
              warehouse
            </span>
          </div>
          <div className="text-xl font-bold text-indigo-600">{metrics.totalOnHand}</div>
          <span className="text-[11px] text-slate-400">Hiện có trong kho</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">Tạm Giữ (Reserved)</span>
            <span className="material-symbols-outlined text-amber-600 bg-amber-50 p-1.5 rounded-lg text-base">
              lock_clock
            </span>
          </div>
          <div className="text-xl font-bold text-amber-600">{metrics.totalReserved}</div>
          <span className="text-[11px] text-slate-400">Đơn chờ thanh toán</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">Khả Dụng (Available)</span>
            <span className="material-symbols-outlined text-emerald-600 bg-emerald-50 p-1.5 rounded-lg text-base">
              check_circle
            </span>
          </div>
          <div className="text-xl font-bold text-emerald-600">{metrics.totalAvailable}</div>
          <span className="text-[11px] text-slate-400">Người mua có thể đặt</span>
        </div>
      </div>

      {/* In-Page Collapsible Adjust Box (NO POPUP) */}
      {adjustState?.book && (
        <div className="p-5 rounded-2xl bg-white border-2 border-indigo-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2 text-indigo-700">
              <span className="material-symbols-outlined text-lg">
                {adjustState.operation === 'ADD' ? 'add_box' : 'tune'}
              </span>
              <h3 className="font-bold text-sm text-slate-900">
                {adjustState.operation === 'ADD' ? 'Nhập Thêm Tồn Kho' : 'Điều Chỉnh / Kiểm Kê Tồn Kho'} · {adjustState.book.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setAdjustState(null)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          <form onSubmit={handleSaveAdjust} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Phương thức thay đổi:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'ADD', label: '+ Thêm' },
                    { id: 'SUBTRACT', label: '- Trừ' },
                    { id: 'SET', label: '= Đặt lại' },
                  ].map((op) => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() =>
                        setAdjustState((p) =>
                          p
                            ? {
                                ...p,
                                operation: op.id as any,
                                reason: (op.id === 'ADD' ? 'RESTOCK' : op.id === 'SUBTRACT' ? 'DAMAGED' : 'MANUAL_ADJUSTMENT') as any,
                              }
                            : null
                        )
                      }
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        adjustState.operation === op.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {adjustState.operation === 'SET' ? 'Tồn mới sau kiểm kê:' : 'Số lượng thay đổi:'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustState.quantity}
                  onChange={(e) => setAdjustState((p) => p ? { ...p, quantity: Math.max(0, parseInt(e.target.value) || 0) } : null)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Lý do điều chỉnh:</label>
                <select
                  value={adjustState.reason}
                  onChange={(e) => setAdjustState((p) => p ? { ...p, reason: e.target.value as any } : null)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="RESTOCK">Nhập thêm hàng từ NXB (RESTOCK)</option>
                  <option value="MANUAL_ADJUSTMENT">Kiểm kê định kỳ (MANUAL_ADJUSTMENT)</option>
                  <option value="DAMAGED">Hàng lỗi / rách hỏng (DAMAGED)</option>
                  <option value="RETURNED">Khách trả hàng (RETURNED)</option>
                  <option value="CORRECTION">Sửa sai lệch số liệu (CORRECTION)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú (Tùy chọn):</label>
              <input
                type="text"
                placeholder="Ví dụ: Nhập 50 cuốn từ đợt in mới..."
                value={adjustState.note}
                onChange={(e) => setAdjustState((p) => p ? { ...p, note: e.target.value } : null)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <SellerActionButton
                type="button"
                variant="neutral"
                size="sm"
                onClick={() => setAdjustState(null)}
              >
                Hủy
              </SellerActionButton>
              <SellerActionButton
                type="submit"
                variant="primary"
                size="sm"
                loading={adjustState.submitting}
                icon="check"
              >
                Xác Nhận Cập Nhật
              </SellerActionButton>
            </div>
          </form>
        </div>
      )}

      {/* In-Page Collapsible History Log Box (NO POPUP) */}
      {logBook && (
        <div className="p-5 rounded-2xl bg-white border-2 border-slate-300 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-slate-800">
              <span className="material-symbols-outlined text-lg text-emerald-600">history</span>
              <h3 className="font-bold text-sm text-slate-900">
                Lịch Sử Biến Động Tồn Kho · {logBook.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setLogBook(null)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          {loadingLogs ? (
            <div className="py-8 text-center text-slate-400">
              <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
              <p className="text-xs mt-1">Đang tải lịch sử...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              Chưa có ghi nhận biến động nào cho đầu sách này.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold text-[11px] border-b border-slate-100">
                    <th className="py-2 px-3">Thời Gian</th>
                    <th className="py-2 px-3">Lý Do</th>
                    <th className="py-2 px-3 text-center">Biến Động</th>
                    <th className="py-2 px-3 text-center">Tồn Trước</th>
                    <th className="py-2 px-3 text-center">Tồn Sau</th>
                    <th className="py-2 px-3">Ghi Chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => {
                    const changeNum = Number(log.change || 0);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '—'}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-700">
                          {log.reason || 'Điều chỉnh'}
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          <span className={changeNum > 0 ? 'text-emerald-600' : changeNum < 0 ? 'text-rose-600' : 'text-slate-600'}>
                            {changeNum > 0 ? `+${changeNum}` : changeNum}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center text-slate-500 font-mono">
                          {log.previousStock ?? '—'}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800 font-mono">
                          {log.newStock ?? '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-500 max-w-[200px] truncate">
                          {log.note || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {logTotalPages > 1 && (
                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    disabled={logPage <= 1}
                    onClick={() => fetchLogs(logBook, logPage - 1)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs disabled:opacity-40"
                  >
                    Trang trước
                  </button>
                  <span className="text-xs text-slate-500">{logPage} / {logTotalPages}</span>
                  <button
                    disabled={logPage >= logTotalPages}
                    onClick={() => fetchLogs(logBook, logPage + 1)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs disabled:opacity-40"
                  >
                    Trang sau
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <SellerFilterTabs
          tabs={tabs}
          activeTab={filterStatus}
          onChange={(key) => {
            setFilterStatus(key as any);
            setCurrentPage(1);
          }}
        />

        <div className="relative min-w-[200px] sm:min-w-[260px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên sách hoặc ISBN..."
            className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Inventory Table Container */}
      <SellerTableContainer>
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin text-xl text-[#00875A]">progress_activity</span>
              <span className="text-xs">Đang tải dữ liệu kho...</span>
            </div>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
              <span className="material-symbols-outlined text-4xl text-slate-300">inventory_2</span>
              <p className="font-medium text-slate-600">Không tìm thấy sách nào phù hợp.</p>
            </div>
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <th className="py-3.5 pl-4 pr-2 w-[34%]">Sách &amp; Phân Loại</th>
                  <th className="py-3.5 px-3 w-[22%]">Tồn Thực &amp; Tạm Giữ</th>
                  <th className="py-3.5 px-3 w-[16%] text-center">Khả Dụng</th>
                  <th className="py-3.5 px-3 w-[14%] text-center">Trạng Thái</th>
                  <th className="py-3.5 pl-2 pr-4 w-[14%] text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedBooks.map((book) => {
                  const isExpanded = !!expandedBookIds[book.id];
                  const stock = Number(book.stock ?? book.physicalDetails?.stock ?? 0);
                  const reserved = Number(book.reserved ?? book.physicalDetails?.reserved ?? 0);
                  const available = Math.max(0, stock - reserved);
                  const authorName = typeof book.author === 'object' ? book.author?.name : book.author || 'N/A';

                  return (
                    <React.Fragment key={book.id}>
                      <tr
                        onClick={() => toggleExpand(book.id)}
                        className={`hover:bg-emerald-50/30 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-emerald-50/40' : 'bg-white'
                        }`}
                      >
                        {/* 1. Sách & Phân loại */}
                        <td className="py-3 pl-4 pr-2 align-middle">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(book.id);
                              }}
                              className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-100/50 transition-colors shrink-0"
                            >
                              <span
                                className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${
                                  isExpanded ? 'rotate-90 text-emerald-700' : ''
                                }`}
                              >
                                chevron_right
                              </span>
                            </button>
                            <div className="w-8 h-11 rounded bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                              <img
                                src={book.coverUrl || book.coverImage || book.cover || '/banners/hero-library.jpg'}
                                alt={book.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate" title={book.title}>
                                {book.title}
                              </span>
                              <span className="text-[11px] text-slate-400 block truncate">
                                ISBN: {book.isbn || 'Chưa cập nhật'} • Tác giả: {authorName}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Tồn thực & Tạm giữ */}
                        <td className="py-3 px-3 align-middle">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-slate-500">Tồn thực:</span>
                              <span className="font-bold text-slate-900">{stock}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-slate-400">Tạm giữ:</span>
                              <span className={`font-semibold ${reserved > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                {reserved}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Khả dụng */}
                        <td className="py-3 px-3 align-middle text-center">
                          <span
                            className={`font-bold text-sm ${
                              available === 0
                                ? 'text-rose-600'
                                : available <= 5
                                ? 'text-amber-600'
                                : 'text-[#00875A]'
                            }`}
                          >
                            {available}
                          </span>
                        </td>

                        {/* 4. Trạng thái */}
                        <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                          {available === 0 ? (
                            <SellerStatusBadge variant="danger" dot text="Hết hàng (0)" />
                          ) : available <= 5 ? (
                            <SellerStatusBadge variant="warning" dot text={`Sắp hết (${available})`} />
                          ) : (
                            <SellerStatusBadge variant="success" dot text="Còn hàng" />
                          )}
                        </td>

                        {/* 5. Thao tác */}
                        <td className="py-3 pl-2 pr-4 align-middle text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <SellerActionButton
                              type="button"
                              variant="primary"
                              size="sm"
                              icon="add_box"
                              onClick={() => handleOpenAdjust(book, 'ADD')}
                            >
                              Nhập
                            </SellerActionButton>

                            <SellerActionButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              icon="tune"
                              onClick={() => handleOpenAdjust(book, 'SET')}
                            >
                              Kiểm Kê
                            </SellerActionButton>

                            <SellerActionButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              icon="history"
                              onClick={() => fetchLogs(book, 1)}
                            />
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Subcards Detail Panel */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={5} className="p-4 border-t border-b border-emerald-100/70">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white rounded-xl p-4 border border-emerald-200/70 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
                              {/* Card 1: Số liệu chi tiết kho */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
                                  <span className="material-symbols-outlined text-[16px] text-[#00875A]">inventory_2</span>
                                  <span>Chi Tiết Kho Vật Lý</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Tồn thực tế trong kho:</span>
                                    <span className="font-bold text-slate-900">{stock} cuốn</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Tạm giữ chờ thanh toán:</span>
                                    <span className="font-bold text-amber-600">{reserved} cuốn</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Khả dụng giao dịch:</span>
                                    <span className="font-bold text-[#00875A]">{available} cuốn</span>
                                  </div>
                                </div>
                              </div>

                              {/* Card 2: Thông tin ấn bản & ISBN */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
                                  <span className="material-symbols-outlined text-[16px] text-amber-600">book</span>
                                  <span>Thông Tin Ấn Bản</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Mã ISBN:</span>
                                    <span className="font-mono font-semibold text-slate-800">{book.isbn || 'Chưa cập nhật'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Tác giả:</span>
                                    <span className="font-medium text-slate-800">{authorName}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Cảnh báo tồn:</span>
                                    <span className="font-semibold text-slate-800">
                                      {available === 0 ? 'Hết sạch hàng' : available <= 5 ? 'Cần bổ sung gấp' : 'Ổn định'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Card 3: Thao tác kho nhanh */}
                              <div className="space-y-2 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
                                    <span className="material-symbols-outlined text-[16px] text-emerald-600">tune</span>
                                    <span>Hành Động Nhanh</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-2">
                                    Thực hiện nhập thêm số lượng tồn hoặc mở bảng kiểm kê để cập nhật số thực tế.
                                  </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenAdjust(book, 'ADD');
                                    }}
                                    className="py-1.5 px-2 bg-[#00875A] hover:bg-[#003B2B] text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">add_box</span>
                                    <span>Nhập Thêm</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenAdjust(book, 'SET');
                                    }}
                                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">tune</span>
                                    <span>Kiểm Kê</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SellerTableContainer>

      {/* Pagination */}
      {!loading && filteredBooks.length > 0 && (
        <SellerPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
