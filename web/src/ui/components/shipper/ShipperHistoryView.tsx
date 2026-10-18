"use client";

import React, { useState, useMemo } from 'react';
import { useShipper } from '@/ui/context/ShipperContext';
import {
  DataTableFilterBar,
  DateFilterValue,
  matchesDateFilter,
  BulkActionGroup,
  StandardPaginationBar,
} from '../common';

export default function ShipperHistoryView() {
  const { historyOrders } = useShipper();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DELIVERED' | 'FAILED'>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'ALL_TIME' });
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    return historyOrders.filter((order) => {
      if (statusFilter === 'DELIVERED' && order.status !== 'DELIVERED') return false;
      if (statusFilter === 'FAILED' && order.status !== 'FAILED') return false;
      if (!matchesDateFilter(order.completedAt || order.createdAt, dateFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          order.code.toLowerCase().includes(q) ||
          order.customerName.toLowerCase().includes(q) ||
          order.shopName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [historyOrders, statusFilter, dateFilter, searchQuery]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedOrders = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const bulkActionGroups: BulkActionGroup[] = useMemo(
    () => [
      {
        groupLabel: 'Xuất dữ liệu & Báo cáo',
        actions: [
          {
            value: 'EXPORT_EXCEL',
            label: 'Xuất bảng kê lịch sử cuốc giao (Excel/CSV)',
          },
          {
            value: 'PRINT_STATEMENT',
            label: 'In sao kê các chuyến đã chọn',
          },
        ],
      },
    ],
    []
  );

  const handleExecuteBulkAction = async (action: string) => {
    if (!selectedOrderIds.length) return;
    setBulkLoading(true);
    try {
      if (action === 'EXPORT_EXCEL') {
        alert(`Đã xuất báo cáo ${selectedOrderIds.length} chuyến giao thành công!`);
      } else if (action === 'PRINT_STATEMENT') {
        window.print();
      }
      setSelectedOrderIds([]);
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--theme-border,#e8e5df)] pb-3.5">
        <div>
          <h1 className="font-editorial text-xl sm:text-2xl font-bold text-[var(--theme-text,#1c1b1f)] flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">history</span>
            </span>
            <span>Lịch Sử Giao Hàng ({historyOrders.length})</span>
          </h1>
          <p className="text-xs text-[var(--theme-text-muted,#49454f)] mt-0.5">
            Xem lại toàn bộ các chuyến giao sách đã hoàn tất hoặc giao không thành công.
          </p>
        </div>
      </div>

      {/* Standard DataTableFilterBar with 2 split date dropdowns + inline popover bulk actions */}
      <DataTableFilterBar
        tabs={[
          { key: 'ALL', label: 'Tất cả chuyến', count: historyOrders.length },
          { key: 'DELIVERED', label: 'Thành công', count: historyOrders.filter(o => o.status === 'DELIVERED').length },
          { key: 'FAILED', label: 'Thất bại / Hoàn', count: historyOrders.filter(o => o.status === 'FAILED').length },
        ]}
        activeTab={statusFilter}
        onTabChange={(tab) => {
          setStatusFilter(tab as any);
          setCurrentPage(1);
        }}
        dateFilter={dateFilter}
        onDateFilterChange={(df) => {
          setDateFilter(df);
          setCurrentPage(1);
        }}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder="Tìm theo mã đơn, khách, shop..."
        bulkActionGroups={bulkActionGroups}
        selectedCount={selectedOrderIds.length}
        totalCount={filtered.length}
        onExecuteBulkAction={handleExecuteBulkAction}
        onClearSelection={() => setSelectedOrderIds([])}
        bulkLoading={bulkLoading}
        itemName="chuyến giao"
        className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs"
      />

      {/* Orders List */}
      {filtered.length === 0 ? (
        <div className="bg-[var(--theme-surface,#ffffff)] rounded-2xl border border-[var(--theme-border,#e8e5df)] p-12 text-center text-xs text-[var(--theme-text-muted,#49454f)] shadow-2xs">
          Không có lịch sử giao hàng nào phù hợp với bộ lọc.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[var(--theme-surface,#ffffff)] rounded-2xl border border-[var(--theme-border,#e8e5df)] shadow-2xs overflow-hidden divide-y divide-[var(--theme-border,#e8e5df)]/60">
            {paginatedOrders.map((order) => {
              const isDelivered = order.status === 'DELIVERED';

              return (
                <div key={order.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(order.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.checked) {
                          setSelectedOrderIds(prev => [...prev, order.id]);
                        } else {
                          setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-[var(--theme-primary,#003B2B)] focus:ring-[var(--theme-primary,#003B2B)] cursor-pointer mt-0.5 shrink-0"
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <strong className="font-black text-sm text-[var(--theme-text,#1c1b1f)]">
                          {order.code}
                        </strong>
                      <span
                        className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                          isDelivered
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}
                      >
                        {isDelivered ? 'Giao thành công' : 'Giao thất bại'}
                      </span>
                      <span className="text-[11px] text-[var(--theme-text-muted,#49454f)]">
                        {order.completedAt || order.createdAt}
                      </span>
                    </div>

                    <p className="text-[var(--theme-text-muted,#49454f)] truncate">
                      Shop: <strong className="text-[var(--theme-text,#1c1b1f)]">{order.shopName}</strong> ➔ Khách:{' '}
                      <strong className="text-[var(--theme-text,#1c1b1f)]">{order.customerName}</strong> ({order.deliveryAddress})
                    </p>

                    {!isDelivered && order.failureReason && (
                      <p className="text-rose-600 font-medium">Lý do hoàn: {order.failureReason}</p>
                    )}
                  </div>
                </div>

                  <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--theme-border,#e8e5df)]/40 space-y-1">
                    {isDelivered ? (
                      <>
                        <div className="flex items-center justify-start sm:justify-end gap-1.5">
                          <span className="text-[11px] text-gray-500 font-medium">Tiền công bưu tá:</span>
                          <strong className="font-black text-sm text-[#00875A]">
                            +{order.shippingFee.toLocaleString('vi-VN')}đ
                          </strong>
                        </div>

                        {order.codAmount > 0 ? (
                          <div className="text-[11px] space-y-0.5">
                            <div className="text-gray-600">
                              Thu khách: <strong className="text-gray-900">{order.codAmount.toLocaleString('vi-VN')}đ</strong>
                            </div>
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                              <span>COD nộp Sàn (đã trừ cước):</span>
                              <span className="text-amber-950 font-black">
                                {Math.max(0, order.codAmount - order.shippingFee).toLocaleString('vi-VN')}đ
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                            Đơn Online (0đ COD)
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-rose-600 font-bold block">0đ (Đã hoàn về Shop)</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Standard Pagination Toolbar */}
          <div className="bg-white rounded-2xl border border-[var(--theme-border,#e8e5df)] shadow-2xs overflow-hidden">
            <StandardPaginationBar
              totalItems={filtered.length}
              pageSize={pageSize}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              itemLabel="chuyến giao"
            />
          </div>
        </div>
      )}
    </div>
  );
}
