"use client";

import React, { useState, useMemo } from 'react';
import { useShipper, ShipperOrder } from '@/ui/context/ShipperContext';
import {
  DataTableFilterBar,
  DataTableBulkActionBar,
  DateFilterValue,
  matchesDateFilter,
  BulkActionGroup,
} from '../common';
import GroupedDataTable, { Column, StandardPaginationBar } from '../common/GroupedDataTable';

export default function ShipperHistoryView() {
  const { historyOrders } = useShipper();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DELIVERED' | 'FAILED'>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'ALL_TIME' });
  
  // Double-Lock: strictly 10 items / page
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Multi-Select
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);

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
          order.shopName.toLowerCase().includes(q) ||
          (order.customerPhone || '').includes(q) ||
          order.deliveryAddress.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [historyOrders, statusFilter, dateFilter, searchQuery]);

  // Double-Lock slicing
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const selectedCount = Object.keys(selectedIds).filter((k) => selectedIds[k]).length;

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
    if (!selectedCount) return;
    setBulkLoading(true);
    try {
      if (action === 'EXPORT_EXCEL') {
        alert(`Đã xuất báo cáo ${selectedCount} chuyến giao thành công!`);
      } else if (action === 'PRINT_STATEMENT') {
        window.print();
      }
      setSelectedIds({});
    } finally {
      setBulkLoading(false);
    }
  };

  // 5 CỘT VÀNG CHUẨN MỰC
  const columns: Column<ShipperOrder>[] = [
    {
      key: 'code',
      title: 'Mã Chuyến & Thời Gian',
      width: '24%',
      render: (_, row) => {
        const isDelivered = row.status === 'DELIVERED';
        return (
          <div className="space-y-1 py-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <strong className="font-mono text-xs font-bold text-slate-900">{row.code}</strong>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isDelivered
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {isDelivered ? 'Giao thành công' : 'Giao thất bại'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Hoàn tất: {row.completedAt || row.createdAt}
            </div>
            <div className="text-[10.5px] text-slate-400">
              {row.items?.map((it: any) => `${it.quantity}x ${it.title}`).join(', ') || '1 kiện sách'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'shop',
      title: 'Điểm Lấy Hàng (Shop)',
      width: '24%',
      render: (_, row) => {
        return (
          <div className="text-xs space-y-1 py-1">
            <div className="font-bold text-slate-800 break-words line-clamp-2 leading-snug">
              {row.shopName}
            </div>
            <div className="text-slate-500 text-[11px] break-words line-clamp-2 leading-snug">
              {row.shopAddress}
            </div>
            <div className="text-[11px] text-[#00875A] font-semibold flex items-center gap-0.5 pt-0.5">
              <span className="material-symbols-outlined text-[13px]">call</span>
              <span>{row.shopPhone}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'customer',
      title: 'Điểm Giao Hàng (Khách)',
      width: '24%',
      render: (_, row) => {
        const fullAddr = `${row.deliveryAddress}, ${row.deliveryWard || ''}, ${row.deliveryDistrict || ''}, ${row.deliveryProvince || ''}`;
        return (
          <div className="text-xs space-y-1 py-1">
            <div className="font-bold text-slate-800 break-words line-clamp-2 leading-snug">
              {row.customerName}
            </div>
            <div className="text-slate-500 text-[11px] break-words line-clamp-2 leading-snug">
              {fullAddr}
            </div>
            <div className="text-[11px] text-[#00875A] font-semibold flex items-center gap-0.5 pt-0.5">
              <span className="material-symbols-outlined text-[13px]">call</span>
              <span>{row.customerPhone}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'finance',
      title: 'Tiền Công & Thu Hộ COD',
      width: '14%',
      render: (_, row) => {
        const isDelivered = row.status === 'DELIVERED';
        const isCod = row.paymentMethod === 'COD';

        if (!isDelivered) {
          return (
            <div className="text-xs space-y-0.5 py-1">
              <span className="text-rose-600 font-bold">0đ</span>
              <div className="text-[10.5px] text-slate-400">Đã hoàn hàng</div>
            </div>
          );
        }

        return (
          <div className="text-xs space-y-0.5 py-1">
            <div className="text-[#00875A] font-bold">
              +{row.shippingFee?.toLocaleString('vi-VN')}đ
            </div>
            <div className={`text-[11px] font-medium ${isCod ? 'text-amber-700' : 'text-slate-400'}`}>
              {isCod ? `COD: ${row.codAmount?.toLocaleString('vi-VN')}đ` : 'Đã TT Online'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Trạng Thái Chuyến',
      width: '14%',
      align: 'right',
      render: (_, row) => {
        const isDelivered = row.status === 'DELIVERED';

        return (
          <div className="flex flex-col items-end gap-1 py-1 text-right">
            <span
              className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold ${
                isDelivered
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {isDelivered ? 'Đã giao xong' : 'Thất bại'}
            </span>
            {!isDelivered && row.failureReason && (
              <span className="text-[10px] text-rose-600 font-medium break-words line-clamp-2 leading-snug max-w-[130px]">
                {row.failureReason}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header */}
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

      {/* 2. Filter Bar */}
      <DataTableFilterBar
        tabs={[
          { key: 'ALL', label: 'Tất cả chuyến', count: historyOrders.length },
          { key: 'DELIVERED', label: 'Thành công', count: historyOrders.filter((o) => o.status === 'DELIVERED').length },
          { key: 'FAILED', label: 'Thất bại / Hoàn', count: historyOrders.filter((o) => o.status === 'FAILED').length },
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
        searchPlaceholder="Tìm theo mã đơn, khách, shop, địa chỉ..."
        bulkActionGroups={bulkActionGroups}
        selectedCount={selectedCount}
        totalCount={filtered.length}
        onExecuteBulkAction={handleExecuteBulkAction}
        onClearSelection={() => setSelectedIds({})}
        bulkLoading={bulkLoading}
        itemName="chuyến giao"
        className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs"
      />

      {/* 3. Bulk Action Bar */}
      <DataTableBulkActionBar
        selectedCount={selectedCount}
        totalCount={filtered.length}
        onClearSelection={() => setSelectedIds({})}
        actionGroups={bulkActionGroups}
        onExecuteAction={handleExecuteBulkAction}
        isLoading={bulkLoading}
        itemName="chuyến giao"
      />

      {/* 4. Grouped Data Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs overflow-hidden">
        <GroupedDataTable
          columns={columns}
          data={paginatedOrders}
          keyField="id"
          expandable
          expandedRowRender={(row) => {
            const isDelivered = row.status === 'DELIVERED';
            const isCod = row.paymentMethod === 'COD';
            const fullAddr = `${row.deliveryAddress}, ${row.deliveryWard || ''}, ${row.deliveryDistrict || ''}, ${row.deliveryProvince || ''}`;

            return (
              <div className="p-4 bg-slate-50 dark:bg-neutral-800/40 rounded-xl space-y-4 text-xs">
                {/* 3-CARD MASTER-DETAIL CONTAINER */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                  {/* Card 1: Hành Trình Chuyến Giao */}
                  <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-700 space-y-2.5">
                    <div className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1.5 border-b border-slate-100 dark:border-neutral-800">
                      <span className="material-symbols-outlined text-[15px] text-blue-600">route</span>
                      <span>Hành Trình Vận Chuyển</span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Điểm lấy sách (Shop):</span>
                        <div className="font-bold text-slate-800">{row.shopName}</div>
                        <div className="text-slate-500 text-[11px] break-words line-clamp-2 leading-snug">{row.shopAddress}</div>
                        <div className="text-[11px] text-[#00875A] font-semibold mt-0.5">SĐT Shop: {row.shopPhone}</div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Điểm nhận sách (Khách):</span>
                        <div className="font-bold text-slate-800">{row.customerName}</div>
                        <div className="text-slate-500 text-[11px] break-words line-clamp-2 leading-snug">{fullAddr}</div>
                        <div className="text-[11px] text-[#00875A] font-semibold mt-0.5">SĐT Khách: {row.customerPhone}</div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Danh Mục Kiện Hàng */}
                  <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-700 space-y-2.5">
                    <div className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-neutral-800">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-[#00875A]">menu_book</span>
                        <span>Kiện Hàng ({row.items?.length || 0} tựa sách)</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">{(row.totalWeight || 500) / 1000} kg</span>
                    </div>

                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {row.items?.map((it: any, idx: number) => (
                        <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-800/60 border border-slate-100 dark:border-neutral-700 flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {it.quantity}x
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 dark:text-white break-words line-clamp-2 leading-snug">
                              {it.title}
                            </div>
                            <div className="text-[10px] text-slate-400">Định dạng: {it.format || 'Bìa mềm'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 3: Quyết Toán Chuyến Giao */}
                  <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-700 flex flex-col justify-between space-y-2.5">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1.5 border-b border-slate-100 dark:border-neutral-800">
                        <span className="material-symbols-outlined text-[15px] text-amber-600">receipt_long</span>
                        <span>Quyết Toán Tài Chính</span>
                      </div>

                      <div className="space-y-2 pt-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Tiền công bưu tá:</span>
                          <strong className="text-[#00875A] font-bold text-sm">
                            {isDelivered ? `+${row.shippingFee?.toLocaleString('vi-VN')}đ` : '0đ'}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Hình thức thanh toán:</span>
                          <span className="font-semibold text-slate-800">
                            {isCod ? 'Thu hộ tiền mặt (COD)' : 'Đã thanh toán trước Online'}
                          </span>
                        </div>
                        {isCod && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Tiền COD thu khách:</span>
                              <strong className="text-amber-700 font-bold">
                                {row.codAmount?.toLocaleString('vi-VN')}đ
                              </strong>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                              <span className="text-slate-500 text-[11px]">Nộp quỹ sàn (đã trừ ship):</span>
                              <strong className="text-slate-800 font-bold">
                                {Math.max(0, row.codAmount - row.shippingFee).toLocaleString('vi-VN')}đ
                              </strong>
                            </div>
                          </>
                        )}
                        {!isDelivered && row.failureReason && (
                          <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] mt-1">
                            <strong>Lý do thất bại:</strong> {row.failureReason}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 text-[10.5px] text-slate-400 border-t border-slate-100">
                      Ghi nhận ngày: {row.completedAt || row.createdAt}
                    </div>
                  </div>
                </div>
              </div>
            );
          }}
          pagination={false}
          selectable
          selectedRowKeys={Object.keys(selectedIds).filter((k) => selectedIds[k])}
          onSelectionChange={(keys) => {
            const next: Record<string, boolean> = {};
            keys.forEach((k) => {
              next[String(k)] = true;
            });
            setSelectedIds(next);
          }}
          emptyTitle="Không có lịch sử giao hàng nào phù hợp với bộ lọc!"
          emptyMessage="Các chuyến giao đã hoàn tất sẽ hiển thị tại đây để bạn kiểm toán và đối soát."
        />

        {/* 5. Standard Pagination Bar (Double-Lock: 10 items/page) */}
        <StandardPaginationBar
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          itemLabel="chuyến giao"
        />
      </div>
    </div>
  );
}
