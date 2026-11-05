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
import { useRealtimeInventory } from '@/ui/hooks/useRealtimeInventory';
import { realtimeSyncBus, InventoryUpdatePayload } from '@/ui/services/realtimeSyncBus';
import GroupedDataTable, { Column } from '@/ui/components/common/GroupedDataTable';
import {
  DataTableFilterBar,
  DateFilterValue,
  matchesDateFilter,
  BulkActionGroup,
  StatusTab,
} from '@/ui/components/common';

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
  createdAt?: string;
  updatedAt?: string;
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'ALL_TIME' });
  const [bulkLoading, setBulkLoading] = useState(false);
  const pageSize = 10;


  // In-Page Adjust State (NO POPUP)
  const [adjustState, setAdjustState] = useState<AdjustState | null>(null);

  // In-Page Logs State (NO POPUP)
  const [logBook, setLogBook] = useState<InventoryBook | null>(null);
  const [logs, setLogs] = useState<InventoryLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);

  // RT-03: Realtime 3-Tier Inventory hook
  const { highlightedBooks, broadcastUpdate } = useRealtimeInventory({
    onUpdate: (payload: InventoryUpdatePayload) => {
      setBooks((prevBooks) => {
        return prevBooks.map((b) => {
          const isTarget =
            b.id === payload.bookId ||
            (payload.bookTitle && b.title && b.title.trim().toLowerCase() === payload.bookTitle.trim().toLowerCase());

          if (isTarget) {
            const currentStock = Number(b.stock ?? b.physicalDetails?.stock ?? 0);
            const currentReserved = Number(b.reserved ?? b.physicalDetails?.reserved ?? 0);
            const delta = payload.quantityDelta || 0;

            let newStock = payload.totalStock !== undefined ? payload.totalStock : currentStock;
            let newReserved = payload.reservedStock !== undefined ? payload.reservedStock : currentReserved;

            if (payload.action === 'RESERVED' && payload.reservedStock === undefined) {
              newReserved = currentReserved + delta;
            } else if (payload.action === 'RELEASED' && payload.reservedStock === undefined) {
              newReserved = Math.max(0, currentReserved - delta);
            } else if (payload.action === 'COMMITTED' && payload.reservedStock === undefined) {
              newReserved = Math.max(0, currentReserved - delta);
              newStock = Math.max(0, currentStock - delta);
            }

            return {
              ...b,
              stock: newStock,
              reserved: newReserved,
              physicalDetails: {
                ...b.physicalDetails,
                stock: newStock,
                reserved: newReserved,
              },
            };
          }
          return b;
        });
      });

      setTimeout(() => {
        const actionText =
          payload.action === 'RESERVED'
            ? 'vừa được tạm giữ cho đơn hàng mới'
            : payload.action === 'RELEASED'
            ? 'vừa được giải phóng lại kho'
            : payload.action === 'COMMITTED'
            ? 'đã xuất kho thực tế'
            : 'vừa được cập nhật tồn kho';

        showToast?.(`Tồn kho "${payload.bookTitle || 'sách'}" ${actionText}!`, 'info');
      }, 0);
    },
  });

  const fetchInventory = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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

      if (silent) {
        // So sánh ngầm để phát hiện thay đổi từ Server mà không kích hoạt side effect trong render
        const updatesToNotify: Array<{ bookTitle: string; action: 'RESERVED' | 'COMMITTED' | 'RELEASED' }> = [];

        setBooks((prevBooks) => {
          let hasDiff = false;
          const nextBooks = prevBooks.map((pb) => {
            const fresh = physicalBooks.find((fb) => fb.id === pb.id);
            if (!fresh) return pb;

            const prevStock = Number(pb.stock ?? pb.physicalDetails?.stock ?? 0);
            const prevReserved = Number(pb.reserved ?? pb.physicalDetails?.reserved ?? 0);
            const freshStock = Number(fresh.stock ?? fresh.physicalDetails?.stock ?? 0);
            const freshReserved = Number(fresh.reserved ?? fresh.physicalDetails?.reserved ?? 0);

            if (prevStock !== freshStock || prevReserved !== freshReserved) {
              hasDiff = true;
              updatesToNotify.push({
                bookTitle: pb.title,
                action: freshReserved > prevReserved ? 'RESERVED' : freshStock < prevStock ? 'COMMITTED' : 'RELEASED',
              });
              return {
                ...pb,
                stock: freshStock,
                reserved: freshReserved,
                physicalDetails: {
                  ...pb.physicalDetails,
                  stock: freshStock,
                  reserved: freshReserved,
                },
              };
            }
            return pb;
          });
          return hasDiff ? nextBooks : prevBooks;
        });

        // Bắn thông báo ngoài chu kỳ setState
        if (updatesToNotify.length > 0) {
          setTimeout(() => {
            updatesToNotify.forEach((u) => {
              const actionText =
                u.action === 'RESERVED'
                  ? 'vừa được tạm giữ cho đơn hàng mới'
                  : u.action === 'RELEASED'
                  ? 'vừa được giải phóng lại kho'
                  : 'đã xuất kho thực tế';
              showToast?.(`Tồn kho "${u.bookTitle || 'sách'}" ${actionText}!`, 'info');
            });
          }, 0);
        }
      } else {
        setBooks(physicalBooks);
      }
    } catch (err) {
      if (!silent) {
        console.error('Failed to fetch books for inventory', err);
        showToast?.('Không thể tải danh sách tồn kho', 'error');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user, activeBusinessId, setActiveBusinessId, showToast, broadcastUpdate]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Shopee-style: Tự động quét tồn kho server ngầm mỗi 3.5 giây để đồng bộ liên thiết bị
  useEffect(() => {
    const pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchInventory(true);
      }
    }, 3500);

    return () => clearInterval(pollTimer);
  }, [fetchInventory]);

  // Listen to order lifecycle changes to keep inventory synced with backend
  useEffect(() => {
    const unsub = realtimeSyncBus.subscribe((msg) => {
      if (
        msg.type === 'ORDER_CREATED' ||
        msg.type === 'ORDER_PAYMENT_SUCCEEDED' ||
        msg.type === 'ORDER_CANCELLED' ||
        msg.type === 'ORDER_STATUS_CHANGED'
      ) {
        fetchInventory(true);
      }
    });
    return () => unsub();
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

      // Date filter
      if (b.createdAt || b.updatedAt) {
        if (!matchesDateFilter(b.createdAt || b.updatedAt, dateFilter)) return false;
      }

      const stock = Number(b.stock ?? b.physicalDetails?.stock ?? 0);
      const reserved = Number(b.reserved ?? b.physicalDetails?.reserved ?? 0);
      const available = Math.max(0, stock - reserved);

      if (filterStatus === 'OUT_OF_STOCK') return available === 0;
      if (filterStatus === 'LOW_STOCK') return available > 0 && available <= 5;
      if (filterStatus === 'IN_STOCK') return available > 5;
      return true;
    });
  }, [books, search, filterStatus, dateFilter]);

  const totalPages = Math.ceil(filteredBooks.length / pageSize) || 1;
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBooks.slice(start, start + pageSize);
  }, [filteredBooks, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, dateFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredBooks.length && filteredBooks.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredBooks.map((b) => b.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const inventoryStatusTabs: StatusTab[] = useMemo(() => [
    { key: 'ALL', label: 'Tất Cả Sách', count: metrics.totalTitles },
    { key: 'IN_STOCK', label: 'Tồn Ổn Định', count: metrics.totalTitles - metrics.lowStockCount - metrics.outOfStockCount },
    { key: 'LOW_STOCK', label: 'Sắp Hết Hàng', count: metrics.lowStockCount },
    { key: 'OUT_OF_STOCK', label: 'Hết Hàng', count: metrics.outOfStockCount },
  ], [metrics]);


  const inventoryBulkActionGroups: BulkActionGroup[] = [
    {
      groupLabel: 'Điều chỉnh tồn kho',
      actions: [
        { value: 'ADD_STOCK_10', label: 'Nhập thêm +10 cuốn vào kho' },
        {
          value: 'SET_STOCK_0',
          label: 'Đặt hết hàng (Tồn = 0)',
          isDanger: true,
          confirmMessage: 'Bạn có chắc chắn muốn cập nhật số lượng tồn của các sách đã chọn về 0 không?',
        },
      ],
    },
    {
      groupLabel: 'In ấn & xuất file',
      actions: [
        { value: 'EXPORT_CSV', label: 'Xuất bảng kiểm kê tồn kho (.csv)' },
      ],
    },
  ];

  const handleExecuteBulkAction = async (actionValue: string) => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      if (actionValue === 'ADD_STOCK_10') {
        let count = 0;
        for (const id of selectedIds) {
          try {
            await catalogApi.updateInventory(id, {
              operation: 'ADD',
              quantity: 10,
              reason: 'RESTOCK' as any,
              note: 'Nhập kho hàng loạt +10',
            });
            count++;
          } catch { /* ignore individual */ }
        }
        showToast?.(`Đã nhập thêm +10 cuốn cho ${count}/${selectedIds.length} đầu sách!`, 'success');
        setSelectedIds([]);
        await fetchInventory();
      } else if (actionValue === 'SET_STOCK_0') {
        let count = 0;
        for (const id of selectedIds) {
          try {
            await catalogApi.updateInventory(id, {
              operation: 'SET',
              quantity: 0,
              reason: 'AUDIT_CORRECTION' as any,
              note: 'Điều chỉnh hết hàng hàng loạt',
            });
            count++;
          } catch { /* ignore */ }
        }
        showToast?.(`Đã đặt tồn kho về 0 cho ${count}/${selectedIds.length} đầu sách!`, 'warning');
        setSelectedIds([]);
        await fetchInventory();
      } else if (actionValue === 'EXPORT_CSV') {
        const selectedList = books.filter((b) => selectedIds.includes(b.id));
        const header = ['Tên Sách', 'ISBN', 'Tác Giả', 'Tồn Thực', 'Tạm Giữ', 'Khả Dụng'];
        const rows = selectedList.map((b) => {
          const stock = Number(b.stock ?? b.physicalDetails?.stock ?? 0);
          const reserved = Number(b.reserved ?? b.physicalDetails?.reserved ?? 0);
          const available = Math.max(0, stock - reserved);
          const author = typeof b.author === 'object' ? b.author?.name : b.author || '';
          return [b.title, b.isbn || '', author, stock, reserved, available];
        });
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [header.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `kiem_ke_kho_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast?.(`Đã xuất ${selectedList.length} đầu sách sang CSV kiểm kê!`, 'success');
      }
    } catch {
      showToast?.('Không thể thực hiện thao tác hàng loạt', 'error');
    } finally {
      setBulkLoading(false);
    }
  };


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

    const currentReserved = Number(adjustState.book.reserved ?? adjustState.book.physicalDetails?.reserved ?? 0);
    const prevStock = Number(adjustState.book.stock ?? adjustState.book.physicalDetails?.stock ?? 0);
    const currentAvailable = Math.max(0, prevStock - currentReserved);

    if (adjustState.operation === 'SUBTRACT' && adjustState.quantity > currentAvailable) {
      showToast?.(`Không thể trừ ${adjustState.quantity} cuốn vì vượt quá số lượng khả dụng (${currentAvailable} cuốn). Số còn lại đang tạm giữ cho khách!`, 'error');
      return;
    }

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

      // RT-03: Broadcast realtime inventory update for other tabs / buyers
      const newStock =
        adjustState.operation === 'ADD'
          ? prevStock + Number(adjustState.quantity)
          : adjustState.operation === 'SUBTRACT'
          ? Math.max(0, prevStock - Number(adjustState.quantity))
          : Number(adjustState.quantity);

      const newAvailable = Math.max(0, newStock - currentReserved);

      broadcastUpdate({
        bookId: adjustState.book.id,
        action: 'MANUAL_ADJUST',
        totalStock: newStock,
        reservedStock: currentReserved,
        availableStock: newAvailable,
        quantityDelta: Number(adjustState.quantity),
        bookTitle: adjustState.book.title,
        updatedAt: new Date().toISOString(),
      });

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
        const total = meta.total ?? (res.data as any)?.total ?? (res as any)?.total ?? logList.length;
        const limit = meta.limit ?? 8;
        const computedTotalPages = meta.totalPages || Math.ceil(total / limit) || 1;
        setLogs(Array.isArray(logList) ? logList : []);
        setLogPage(meta.page || pageNum);
        setLogTotalPages(computedTotalPages);
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


  const inventoryColumns: Column<InventoryBook>[] = useMemo(
    () => [
      {
        key: 'book',
        title: 'Sách & Phân Loại',
        minWidth: 260,
        render: (_val, book) => {
          const authorName = typeof book.author === 'object' ? book.author?.name : book.author || 'N/A';
          const highlightInfo = highlightedBooks[book.id];
          return (
            <div className="flex items-center gap-2.5 py-1">
              <div className="w-8 h-11 rounded bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                <img
                  src={book.coverUrl || book.coverImage || book.cover || '/banners/hero-library.jpg'}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-slate-900 block break-words line-clamp-2 leading-snug text-xs" title={book.title}>
                    {book.title}
                  </span>
                  {highlightInfo && (
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      highlightInfo.action === 'RESERVED'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      <span className="material-symbols-outlined text-[11px]">bolt</span>
                      <span>{highlightInfo.action === 'RESERVED' ? 'Giữ chỗ' : 'Vừa cập nhật'}</span>
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 block break-words line-clamp-1 mt-0.5">
                  ISBN: {book.isbn || 'Chưa cập nhật'} • Tác giả: {authorName}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'stock',
        title: 'Tồn Thực & Tạm Giữ',
        width: 180,
        render: (_val, book) => {
          const stock = Number(book.stock ?? book.physicalDetails?.stock ?? 0);
          const reserved = Number(book.reserved ?? book.physicalDetails?.reserved ?? 0);
          return (
            <div className="py-1 flex flex-col gap-0.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Tồn thực:</span>
                <span className="font-bold text-slate-900 font-mono">{stock}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-400">Tạm giữ:</span>
                <span className={`font-semibold font-mono ${reserved > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {reserved}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'available',
        title: 'Khả Dụng Bán',
        width: 140,
        align: 'center',
        render: (_val, book) => {
          const stock = Number(book.stock ?? book.physicalDetails?.stock ?? 0);
          const reserved = Number(book.reserved ?? book.physicalDetails?.reserved ?? 0);
          const available = Math.max(0, stock - reserved);
          return (
            <div className="py-1">
              <span
                className={`font-bold text-sm font-mono ${
                  available === 0
                    ? 'text-rose-600'
                    : available <= 5
                    ? 'text-amber-600'
                    : 'text-[#00875A]'
                }`}
              >
                {available}
              </span>
            </div>
          );
        },
      },
      {
        key: 'status',
        title: 'Trạng Thái',
        width: 150,
        align: 'center',
        render: (_val, book) => {
          const stock = Number(book.stock ?? book.physicalDetails?.stock ?? 0);
          const reserved = Number(book.reserved ?? book.physicalDetails?.reserved ?? 0);
          const available = Math.max(0, stock - reserved);
          return available === 0 ? (
            <SellerStatusBadge variant="danger" dot text="Hết hàng (0)" />
          ) : available <= 5 ? (
            <SellerStatusBadge variant="warning" dot text={`Sắp hết (${available})`} />
          ) : (
            <SellerStatusBadge variant="success" dot text="Còn hàng" />
          );
        },
      },
      {
        key: 'actions',
        title: 'Thao Tác',
        width: 220,
        align: 'right',
        render: (_val, book) => (
          <div className="flex items-center justify-end gap-1.5 flex-wrap">
            <SellerActionButton
              type="button"
              variant="primary"
              size="sm"
              icon="add_box"
              label="Nhập"
              onClick={() => handleOpenAdjust(book, 'ADD')}
            />
            <SellerActionButton
              type="button"
              variant="secondary"
              size="sm"
              icon="remove_circle_outline"
              label="Xuất"
              onClick={() => handleOpenAdjust(book, 'SUBTRACT')}
            />
            <SellerActionButton
              type="button"
              variant="ghost"
              size="sm"
              icon="history"
              label="Lịch sử"
              onClick={() => fetchLogs(book, 1)}
            />
          </div>
        ),
      },
    ],
    [highlightedBooks]
  );

  const renderExpandedInventoryDetail = (book: InventoryBook) => {
    const stock = Number(book.stock ?? book.physicalDetails?.stock ?? 0);
    const reserved = Number(book.reserved ?? book.physicalDetails?.reserved ?? 0);
    const available = Math.max(0, stock - reserved);
    const authorName = typeof book.author === 'object' ? book.author?.name : book.author || 'N/A';

    return (
      <div className="flex flex-col gap-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Số liệu chi tiết kho */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#00875A]">inventory_2</span>
              <span>Chi Tiết Kho Vật Lý</span>
            </div>
            <div className="space-y-1.5 text-[11.5px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Tồn thực tế trong kho:</span>
                <span className="font-bold text-slate-900 font-mono">{stock} cuốn</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tạm giữ chờ thanh toán:</span>
                <span className="font-bold text-amber-600 font-mono">{reserved} cuốn</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Khả dụng giao dịch:</span>
                <span className="font-bold text-[#00875A] font-mono">{available} cuốn</span>
              </div>
            </div>
          </div>

          {/* Card 2: Thông tin ấn bản & ISBN */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">
              <span className="material-symbols-outlined text-[15px] text-amber-600">book</span>
              <span>Thông Tin Ấn Bản</span>
            </div>
            <div className="space-y-1.5 text-[11.5px]">
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
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">
                <span className="material-symbols-outlined text-[15px] text-emerald-600">tune</span>
                <span>Hành Động Nhanh</span>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-2 leading-relaxed">
                Thực hiện nhập thêm số lượng tồn hoặc mở bảng kiểm kê để cập nhật số thực tế.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleOpenAdjust(book, 'ADD')}
                className="py-1.5 px-2 bg-[#00875A] hover:bg-[#00704A] text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[14px]">add_box</span>
                <span>Nhập Thêm</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAdjust(book, 'SET')}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">tune</span>
                <span>Kiểm Kê</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
          onClick={() => fetchInventory(false)}
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
      {adjustState?.book && (() => {
        const curStock = Number(adjustState.book.stock ?? adjustState.book.physicalDetails?.stock ?? 0);
        const curReserved = Number(adjustState.book.reserved ?? adjustState.book.physicalDetails?.reserved ?? 0);
        const curAvailable = Math.max(0, curStock - curReserved);

        let projectedStock = curStock;
        if (adjustState.operation === 'ADD') {
          projectedStock = curStock + Number(adjustState.quantity);
        } else if (adjustState.operation === 'SUBTRACT') {
          projectedStock = Math.max(0, curStock - Number(adjustState.quantity));
        } else {
          projectedStock = Number(adjustState.quantity);
        }
        const projectedAvailable = Math.max(0, projectedStock - curReserved);
        const isSubOverLimit = adjustState.operation === 'SUBTRACT' && adjustState.quantity > curAvailable;

        return (
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/50 border-2 border-indigo-200 shadow-md space-y-5 animate-in fade-in slide-in-from-top-3 duration-200">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-lg">
                    {adjustState.operation === 'ADD' ? 'add_box' : adjustState.operation === 'SUBTRACT' ? 'indeterminate_check_box' : 'tune'}
                  </span>
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    {adjustState.operation === 'ADD' ? 'Nhập Thêm Tồn Kho' : adjustState.operation === 'SUBTRACT' ? 'Trừ / Xuất Hủy Tồn Kho' : 'Kiểm Kê / Đặt Lại Tồn Kho'}
                    <span className="text-xs font-medium text-slate-500">· {adjustState.book.title}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ISBN: {adjustState.book.isbn || 'Chưa cập nhật'} · Thao tác cập nhật sẽ đồng bộ tức thì cho Khách Mua hàng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustState(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Đóng form điều chỉnh"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveAdjust} className="space-y-5 text-xs">
              {/* Row 1: Phương thức & Lý do */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">1. Phương thức điều chỉnh:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'ADD', label: '+ Thêm kho', desc: 'Nhập hàng', icon: 'add' },
                      { id: 'SUBTRACT', label: '- Trừ kho', desc: 'Xuất / Hỏng', icon: 'remove' },
                      { id: 'SET', label: '= Đặt lại', desc: 'Kiểm kê', icon: 'restart_alt' },
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
                                  quantity: op.id === 'ADD' ? 10 : 1,
                                  reason: (op.id === 'ADD' ? 'RESTOCK' : op.id === 'SUBTRACT' ? 'DAMAGED' : 'MANUAL_ADJUSTMENT') as any,
                                }
                              : null
                          )
                        }
                        className={`py-2 px-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                          adjustState.operation === op.id
                            ? 'border-indigo-600 bg-white ring-2 ring-indigo-500/20 text-indigo-700 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-bold text-xs flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">{op.icon}</span>
                          {op.label}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">{op.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">2. Lý do điều chỉnh:</label>
                  <select
                    value={adjustState.reason}
                    onChange={(e) => setAdjustState((p) => p ? { ...p, reason: e.target.value as any } : null)}
                    className="w-full h-11 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs font-medium"
                  >
                    <option value="RESTOCK">Nhập thêm hàng từ Nhà Xuất Bản / Đối tác (RESTOCK)</option>
                    <option value="MANUAL_ADJUSTMENT">Kiểm kê định kỳ thực tế (MANUAL_ADJUSTMENT)</option>
                    <option value="DAMAGED">Hàng lỗi, rách hỏng trong kho (DAMAGED)</option>
                    <option value="RETURNED">Khách đổi trả hàng vào lại kho (RETURNED)</option>
                    <option value="CORRECTION">Sửa sai lệch số liệu kho (CORRECTION)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Bộ chọn số lượng tiện lợi (Stepper + Quick Chips) */}
              <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-800">
                    3. {adjustState.operation === 'SET' ? 'Số lượng tồn mới sau kiểm kê:' : 'Số lượng thay đổi:'}
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Bấm nhanh các mốc bên dưới hoặc gõ trực tiếp
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Stepper controls */}
                  <div className="flex items-center border-2 border-indigo-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setAdjustState((p) => p ? { ...p, quantity: Math.max(1, p.quantity - 1) } : null)}
                      className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer border-r border-indigo-100"
                      title="Giảm 1"
                    >
                      <span className="material-symbols-outlined text-base">remove</span>
                    </button>
                    <input
                      type="number"
                      min="1"
                      required
                      value={adjustState.quantity}
                      onChange={(e) =>
                        setAdjustState((p) =>
                          p ? { ...p, quantity: Math.max(0, parseInt(e.target.value) || 0) } : null
                        )
                      }
                      className="w-20 sm:w-28 h-10 text-center text-sm font-extrabold text-indigo-900 bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setAdjustState((p) => p ? { ...p, quantity: p.quantity + 1 } : null)}
                      className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer border-l border-indigo-100"
                      title="Tăng 1"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                    </button>
                  </div>

                  {/* Quick Preset Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 flex-1">
                    {adjustState.operation === 'ADD' ? (
                      [1, 5, 10, 20, 50, 100].map((step) => (
                        <button
                          key={step}
                          type="button"
                          onClick={() => setAdjustState((p) => p ? { ...p, quantity: step } : null)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            adjustState.quantity === step
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                          }`}
                        >
                          +{step}
                        </button>
                      ))
                    ) : adjustState.operation === 'SUBTRACT' ? (
                      <>
                        {[1, 2, 5, 10, 20].map((step) => (
                          <button
                            key={step}
                            type="button"
                            onClick={() => setAdjustState((p) => p ? { ...p, quantity: step } : null)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              adjustState.quantity === step
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            }`}
                          >
                            -{step}
                          </button>
                        ))}
                        {curAvailable > 0 && (
                          <button
                            type="button"
                            onClick={() => setAdjustState((p) => p ? { ...p, quantity: curAvailable } : null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer"
                          >
                            Tối đa khả dụng ({curAvailable})
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        {[0, 10, 20, 50, 100].map((target) => (
                          <button
                            key={target}
                            type="button"
                            onClick={() => setAdjustState((p) => p ? { ...p, quantity: target } : null)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              adjustState.quantity === target
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            ={target}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setAdjustState((p) => p ? { ...p, quantity: curStock } : null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          Giữ như cũ ({curStock})
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 3: Live Preview & Invariant Protection Banner */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-indigo-600">analytics</span>
                    Dự kiến tồn kho sau khi lưu:
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600">
                      Tồn thực: <strong className="text-slate-900">{curStock}</strong> &rarr; <strong className="text-indigo-700">{projectedStock}</strong>
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-amber-700">
                      Tạm giữ: <strong>{curReserved}</strong> (giữ nguyên đơn hàng)
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-emerald-700">
                      Khả dụng: <strong className="text-slate-900">{curAvailable}</strong> &rarr; <strong className="text-emerald-700">{projectedAvailable}</strong>
                    </span>
                  </div>
                </div>

                {isSubOverLimit && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                    <span className="material-symbols-outlined text-base shrink-0">warning</span>
                    <span>
                      Cảnh báo: Bạn đang trừ <strong>{adjustState.quantity}</strong> cuốn, nhưng chỉ còn <strong>{curAvailable}</strong> cuốn khả dụng ({curReserved} cuốn đang bị khách tạm giữ). Vui lòng giảm số lượng trừ!
                    </span>
                  </div>
                )}
              </div>

              {/* Row 4: Ghi chú */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">4. Ghi chú (Tùy chọn):</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nhập 50 cuốn từ đợt in mới NXB Kim Đồng..."
                  value={adjustState.note}
                  onChange={(e) => setAdjustState((p) => p ? { ...p, note: e.target.value } : null)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-indigo-100 flex items-center justify-end gap-2.5">
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
                  disabled={isSubOverLimit || adjustState.quantity <= 0}
                  icon="check"
                >
                  Xác Nhận Cập Nhật
                </SellerActionButton>
              </div>
            </form>
          </div>
        );
      })()}

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

      {/* Filter Bar with Status Tabs & Multi-tier Date Filter & Bulk Actions */}
      <DataTableFilterBar
        tabs={inventoryStatusTabs}
        activeTab={filterStatus}
        onTabChange={(key) => {
          setFilterStatus(key as any);
          setCurrentPage(1);
        }}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm theo tên sách hoặc ISBN..."
        className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs"
        bulkActionGroups={inventoryBulkActionGroups}
        selectedCount={selectedIds.length}
        totalCount={filteredBooks.length}
        onExecuteBulkAction={handleExecuteBulkAction}
        onClearSelection={() => setSelectedIds([])}
        bulkLoading={bulkLoading}
        itemName="sản phẩm kho"
      />

      {/* Inventory Table Container Chuẩn Hóa GroupedDataTable */}
      <GroupedDataTable<InventoryBook>
        columns={inventoryColumns}
        data={paginatedBooks}
        keyField="id"
        loading={loading}
        selectable={true}
        selectedRowKeys={selectedIds}
        onSelectionChange={(keys) => setSelectedIds(keys as string[])}
        expandable={true}
        expandedRowRender={renderExpandedInventoryDetail}
        emptyTitle="Không tìm thấy sách nào phù hợp"
        emptyMessage={
          search
            ? `Không tìm thấy sách nào khớp với từ khóa "${search}"`
            : 'Hiện tại gian hàng chưa có dữ liệu tồn kho trong bộ lọc này.'
        }
        emptyIcon="inventory_2"
        pagination={{
          currentPage,
          totalPages,
          totalItems: filteredBooks.length,
          pageSize: 10,
          onPageChange: setCurrentPage,
          itemLabel: 'sản phẩm kho',
        }}
        className="w-full"
      />
    </div>
  );
}

