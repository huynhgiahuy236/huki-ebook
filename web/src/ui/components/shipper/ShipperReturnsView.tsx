"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useShipper, ShipperOrder } from '@/ui/context/ShipperContext';
import {
  DataTableFilterBar,
  DataTableBulkActionBar,
  DateFilterValue,
  matchesDateFilter,
  BulkActionGroup,
} from '../common';
import GroupedDataTable, { Column, StandardPaginationBar } from '../common/GroupedDataTable';
import QuickDispatchNotificationModal from '../common/QuickDispatchNotificationModal';

export default function ShipperReturnsView() {
  const { activeDeliveries, confirmPickup, completeDelivery } = useShipper();

  // Chỉ lấy các đơn hoàn hàng (RETURN)
  const returnOrders = useMemo(() => {
    return activeDeliveries.filter((o) => o.orderType === 'RETURN');
  }, [activeDeliveries]);

  const [activeTab, setActiveTab] = useState<'ALL' | 'STEP_1' | 'STEP_2'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'ALL_TIME' });
  
  // Double-Lock: strictly 10 items / page
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Multi-Select
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);

  // Quick Dispatch Notification Modal
  const [dispatchModal, setDispatchModal] = useState<{
    open: boolean;
    targetRole: 'SELLER' | 'USER';
    targetId: string;
    targetName: string;
    orderCode: string;
    orderId?: string;
  }>({
    open: false,
    targetRole: 'USER',
    targetId: '',
    targetName: '',
    orderCode: '',
  });

  // Lọc dữ liệu
  const filteredOrders = useMemo(() => {
    return returnOrders.filter((order) => {
      if (activeTab === 'STEP_1' && order.status !== 'PICKING_UP') return false;
      if (activeTab === 'STEP_2' && order.status !== 'IN_TRANSIT') return false;
      if (!matchesDateFilter(order.createdAt, dateFilter)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = order.code.toLowerCase().includes(q);
        const matchTracking = (order.returnTrackingCode || '').toLowerCase().includes(q);
        const matchCustomer = order.customerName.toLowerCase().includes(q);
        const matchPhone = (order.customerPhone || '').includes(q);
        const matchShop = order.shopName.toLowerCase().includes(q);
        const matchAddr = order.deliveryAddress.toLowerCase().includes(q);
        return matchCode || matchTracking || matchCustomer || matchPhone || matchShop || matchAddr;
      }
      return true;
    });
  }, [returnOrders, activeTab, dateFilter, searchQuery]);

  // Double-Lock slicing
  const pagedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const selectedCount = Object.keys(selectedIds).filter((k) => selectedIds[k]).length;

  const handleBulkPickup = async () => {
    const pickingList = filteredOrders.filter((o) => selectedIds[o.id] && o.status === 'PICKING_UP');
    if (pickingList.length === 0) return;
    setBulkLoading(true);
    try {
      for (const ord of pickingList) {
        await confirmPickup(ord.id);
      }
      setSelectedIds({});
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkComplete = async () => {
    const transitList = filteredOrders.filter((o) => selectedIds[o.id] && o.status === 'IN_TRANSIT');
    if (transitList.length === 0) return;
    setBulkLoading(true);
    try {
      for (const ord of transitList) {
        await completeDelivery(ord.id);
      }
      setSelectedIds({});
    } finally {
      setBulkLoading(false);
    }
  };

  const returnBulkGroups: BulkActionGroup[] = useMemo(
    () => [
      {
        groupLabel: 'Xử lý hoàn hàng loạt',
        actions: [
          {
            value: 'BULK_RETURN_PICKUP',
            label: 'Đã nhận sách từ khách hàng loạt',
            confirmMessage: 'Xác nhận đã nhận các kiện sách hoàn từ người mua?',
          },
          {
            value: 'BULK_RETURN_DELIVER',
            label: 'Đã bàn giao về kho Shop hàng loạt',
            confirmMessage: 'Đánh dấu đã hoàn tất bàn giao các kiện sách về kho Shop?',
          },
        ],
      },
    ],
    []
  );

  const handleExecuteBulkAction = async (val: string) => {
    if (val === 'BULK_RETURN_PICKUP') {
      await handleBulkPickup();
    } else if (val === 'BULK_RETURN_DELIVER') {
      await handleBulkComplete();
    }
  };

  // 5 CỘT VÀNG CHUẨN MỰC
  const columns: Column<ShipperOrder>[] = [
    {
      key: 'code',
      title: 'Mã Hoàn & Kiện Sách',
      width: '24%',
      render: (_, row) => {
        const isStep1 = row.status === 'PICKING_UP';
        const displayCode = row.returnTrackingCode || row.code;

        return (
          <div className="space-y-1 py-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <strong className="font-mono text-xs font-bold text-slate-900">{displayCode}</strong>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isStep1
                    ? 'bg-purple-100 text-purple-900'
                    : 'bg-blue-100 text-blue-900'
                }`}
              >
                {isStep1 ? 'B1: Lấy từ khách' : 'B2: Trả về kho Shop'}
              </span>
            </div>
            <div className="text-[11.5px] text-slate-600 break-words line-clamp-2 leading-snug">
              {row.items?.map((it: any) => `${it.quantity}x ${it.title}`).join(', ') || '1 kiện sách hoàn'}
            </div>
            {row.returnReason && (
              <div className="text-[10.5px] text-rose-600 break-words line-clamp-2 leading-snug font-medium">
                Lý do: {row.returnReason}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'customer',
      title: 'Điểm Lấy Hàng (Khách)',
      width: '24%',
      render: (_, row) => {
        const fullAddr = `${row.deliveryAddress}, ${row.deliveryWard || ''}, ${row.deliveryDistrict || ''}, ${row.deliveryProvince || ''}`;
        const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddr)}`;

        return (
          <div className="text-xs space-y-1 py-1">
            <div className="font-bold text-slate-800 break-words line-clamp-2 leading-snug" title={row.customerName}>
              {row.customerName}
            </div>
            <div className="text-slate-500 text-[11px] break-words line-clamp-2 leading-snug" title={fullAddr}>
              {row.deliveryAddress}, {row.deliveryWard}
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <a
                href={`tel:${row.customerPhone}`}
                className="text-[#00875A] font-semibold text-[11px] hover:underline flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[13px]">call</span>
                <span>{row.customerPhone}</span>
              </a>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-slate-800 font-semibold text-[11px] flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[13px]">navigation</span>
                <span>Chỉ đường</span>
              </a>
            </div>
          </div>
        );
      },
    },
    {
      key: 'shop',
      title: 'Điểm Trả Sách (Kho Shop)',
      width: '24%',
      render: (_, row) => {
        const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(row.shopAddress)}`;

        return (
          <div className="text-xs space-y-1 py-1">
            <div className="font-bold text-slate-800 break-words line-clamp-2 leading-snug" title={row.shopName}>
              {row.shopName}
            </div>
            <div className="text-slate-500 text-[11px] break-words line-clamp-2 leading-snug" title={row.shopAddress}>
              {row.shopAddress}
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <a
                href={`tel:${row.shopPhone}`}
                className="text-[#00875A] font-semibold text-[11px] hover:underline flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[13px]">call</span>
                <span>{row.shopPhone}</span>
              </a>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-slate-800 font-semibold text-[11px] flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[13px]">navigation</span>
                <span>Chỉ đường</span>
              </a>
            </div>
          </div>
        );
      },
    },
    {
      key: 'finance',
      title: 'Cước Thu Hồi & COD',
      width: '14%',
      render: (_, row) => {
        return (
          <div className="text-xs space-y-0.5 py-1">
            <div className="text-[#00875A] font-bold">
              +{row.shippingFee?.toLocaleString('vi-VN')}đ
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              0đ COD (Hàng hoàn)
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Trạng Thái & Thao Tác',
      width: '14%',
      align: 'right',
      render: (_, row) => {
        const isStep1 = row.status === 'PICKING_UP';
        const isStep2 = row.status === 'IN_TRANSIT';

        return (
          <div className="flex flex-col items-end gap-1.5 py-1">
            {isStep1 ? (
              <button
                type="button"
                onClick={() => confirmPickup(row.id)}
                className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                title="Bấm sau khi đã nhận sách từ người mua"
              >
                <span className="material-symbols-outlined text-[13px]">done</span>
                <span>Đã lấy từ khách</span>
              </button>
            ) : isStep2 ? (
              <button
                type="button"
                onClick={() => completeDelivery(row.id)}
                className="px-2.5 py-1 rounded-lg bg-[#003B2B] hover:bg-emerald-950 text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                title="Bàn giao xong kiện hàng về kho của Shop"
              >
                <span className="material-symbols-outlined text-[13px]">task_alt</span>
                <span>Bàn giao kho</span>
              </button>
            ) : null}

            {/* Quick Dispatch Notification Button */}
            <button
              type="button"
              onClick={() =>
                setDispatchModal({
                  open: true,
                  targetRole: isStep1 ? 'USER' : 'SELLER',
                  targetId: isStep1 ? row.customerPhone : row.shopName,
                  targetName: isStep1 ? row.customerName : row.shopName,
                  orderCode: row.returnTrackingCode || row.code,
                  orderId: row.id,
                })
              }
              className="text-[10.5px] text-slate-500 hover:text-slate-800 flex items-center gap-0.5 cursor-pointer"
              title="Phát thông báo nhanh cho Khách hoặc Kho Shop"
            >
              <span className="material-symbols-outlined text-[12px]">notifications_active</span>
              <span>Báo tin</span>
            </button>
          </div>
        );
      },
    },
  ];

  const step1Count = returnOrders.filter((o) => o.status === 'PICKING_UP').length;
  const step2Count = returnOrders.filter((o) => o.status === 'IN_TRANSIT').length;
  const totalReturnEarnings = returnOrders.reduce((sum, o) => sum + o.shippingFee, 0);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--theme-border,#e8e5df)] pb-3.5">
        <div>
          <h1 className="font-editorial text-xl sm:text-2xl font-bold text-[var(--theme-text,#1c1b1f)] flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">assignment_return</span>
            </span>
            <span>Thu Hồi &amp; Hoàn Trả Sách ({returnOrders.length})</span>
          </h1>
          <p className="text-xs text-[var(--theme-text-muted,#49454f)] mt-0.5">
            Quy trình 2 bước: Đến nhà khách thu hồi sách hoàn &bull; Bàn giao về kho Shop/Nhà xuất bản.
          </p>
        </div>

        <Link
          href="/shipper/active-deliveries"
          className="px-4 py-2 rounded-xl bg-[var(--theme-surface,#ffffff)] border border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003B2B)] text-xs font-bold text-[var(--theme-text,#1c1b1f)] flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
        >
          <span className="material-symbols-outlined text-[16px] text-emerald-600">route</span>
          <span>Xem đơn giao đi</span>
        </Link>
      </div>

      {/* 2. Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-purple-200 dark:border-purple-900/40 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Bước 1: Thu hồi sách từ khách
            </span>
            <div className="text-2xl font-black text-purple-900 dark:text-purple-200 mt-0.5">
              {step1Count} kiện
            </div>
            <span className="text-xs text-slate-500">Cần đến nhà người nhận lấy sách</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
            1
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-blue-200 dark:border-blue-900/40 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Bước 2: Trả hàng về kho Shop
            </span>
            <div className="text-2xl font-black text-blue-900 dark:text-blue-200 mt-0.5">
              {step2Count} kiện
            </div>
            <span className="text-xs text-slate-500">Đã lấy từ khách, đang chuyển về kho</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
            2
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Tổng tiền công thu hồi
            </span>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
              +{totalReturnEarnings.toLocaleString('vi-VN')}đ
            </div>
            <span className="text-xs text-slate-500">Cộng ngay vào ví khi trả kho xong</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <DataTableFilterBar
        tabs={[
          { key: 'ALL', label: 'Tất cả đơn hoàn', count: returnOrders.length },
          { key: 'STEP_1', label: '1. Thu hồi từ khách', count: step1Count },
          { key: 'STEP_2', label: '2. Trả về kho Shop', count: step2Count },
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab as any);
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
        searchPlaceholder="Tìm mã hoàn HUKI-RET, tên khách, số điện thoại, kho shop..."
        bulkActionGroups={returnBulkGroups}
        selectedCount={selectedCount}
        totalCount={filteredOrders.length}
        onExecuteBulkAction={handleExecuteBulkAction}
        onClearSelection={() => setSelectedIds({})}
        bulkLoading={bulkLoading}
        itemName="kiện hàng hoàn"
        className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs"
      />

      {/* 4. Bulk Action Bar */}
      <DataTableBulkActionBar
        selectedCount={selectedCount}
        totalCount={filteredOrders.length}
        onClearSelection={() => setSelectedIds({})}
        actionGroups={returnBulkGroups}
        onExecuteAction={handleExecuteBulkAction}
        isLoading={bulkLoading}
        itemName="kiện hàng hoàn"
      />

      {/* 5. Grouped Data Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs overflow-hidden">
        <GroupedDataTable
          columns={columns}
          data={pagedOrders}
          keyField="id"
          expandable
          expandedRowRender={(row) => {
            const isStep1 = row.status === 'PICKING_UP';
            const fullAddr = `${row.deliveryAddress}, ${row.deliveryWard || ''}, ${row.deliveryDistrict || ''}, ${row.deliveryProvince || ''}`;
            const customerMapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddr)}`;
            const shopMapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(row.shopAddress)}`;

            return (
              <div className="p-4 bg-slate-50 dark:bg-neutral-800/40 rounded-xl space-y-4 text-xs">
                {/* 3-CARD MASTER-DETAIL CONTAINER */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                  {/* Card 1: Tuyến Đường Thu Hồi & Trả Hàng */}
                  <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-700 space-y-2.5">
                    <div className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1.5 border-b border-slate-100 dark:border-neutral-800">
                      <span className="material-symbols-outlined text-[15px] text-purple-700">swap_calls</span>
                      <span>Hành Trình Thu Hồi &amp; Bàn Giao</span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] font-bold text-purple-700 uppercase block">1. Điểm lấy sách (Nhà khách):</span>
                        <div className="font-bold text-slate-800">{row.customerName}</div>
                        <div className="text-slate-500 text-[11px] break-words line-clamp-2 leading-snug">{fullAddr}</div>
                        <div className="flex items-center gap-3 pt-1">
                          <a href={`tel:${row.customerPhone}`} className="text-[#00875A] font-semibold text-[11px] hover:underline flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px]">call</span>
                            <span>{row.customerPhone}</span>
                          </a>
                          <a href={customerMapUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-800 font-semibold text-[11px] flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px]">navigation</span>
                            <span>Chỉ đường tới Khách</span>
                          </a>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
                        <span className="text-[10px] font-bold text-[#00875A] uppercase block">2. Điểm trả sách (Kho Shop):</span>
                        <div className="font-bold text-slate-800">{row.shopName}</div>
                        <div className="text-slate-500 text-[11px] break-words line-clamp-2 leading-snug">{row.shopAddress}</div>
                        <div className="flex items-center gap-3 pt-1">
                          <a href={`tel:${row.shopPhone}`} className="text-[#00875A] font-semibold text-[11px] hover:underline flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px]">call</span>
                            <span>{row.shopPhone}</span>
                          </a>
                          <a href={shopMapUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-800 font-semibold text-[11px] flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px]">navigation</span>
                            <span>Chỉ đường tới Kho</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Kiện Sách Thu Hồi */}
                  <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-700 space-y-2.5">
                    <div className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-neutral-800">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-purple-700">inventory_2</span>
                        <span>Kiện Hàng Hoàn ({row.items?.length || 0} sản phẩm)</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">{(row.totalWeight || 500) / 1000} kg</span>
                    </div>

                    {row.returnReason && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                        <strong>Lý do hoàn:</strong> {row.returnReason}
                      </div>
                    )}

                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {row.items?.map((it: any, idx: number) => (
                        <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-800/60 border border-slate-100 dark:border-neutral-700 flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-purple-100 text-purple-900 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {it.quantity}x
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 dark:text-white break-words line-clamp-2 leading-snug">
                              {it.title}
                            </div>
                            <div className="text-[10px] text-slate-400">Định dạng: {it.format || 'Sách giấy'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 3: Tiền Công & Tác Vụ */}
                  <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-700 flex flex-col justify-between space-y-2.5">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1.5 border-b border-slate-100 dark:border-neutral-800">
                        <span className="material-symbols-outlined text-[15px] text-[#00875A]">payments</span>
                        <span>Chi Phí Vận Chuyển Thu Hồi</span>
                      </div>

                      <div className="space-y-2 pt-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Tiền công thu hồi:</span>
                          <strong className="text-[#00875A] font-bold text-sm">
                            +{row.shippingFee?.toLocaleString('vi-VN')}đ
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Thu tiền khách:</span>
                          <span className="font-semibold text-slate-600">0đ (Không thu COD)</span>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px] leading-relaxed">
                          Sau khi bàn giao sách hoàn về kho Shop thành công, hệ thống tự động cộng +{row.shippingFee?.toLocaleString('vi-VN')}đ vào ví thu nhập của bạn.
                        </div>
                      </div>
                    </div>

                    {/* Action buttons inside drawer */}
                    <div className="pt-2 flex items-center gap-2">
                      {isStep1 ? (
                        <button
                          type="button"
                          onClick={() => confirmPickup(row.id)}
                          className="w-full py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">done</span>
                          <span>Đã Nhận Sách Hoàn Từ Khách</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => completeDelivery(row.id)}
                          className="w-full py-2 bg-[#003B2B] hover:bg-emerald-950 text-white text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">task_alt</span>
                          <span>Đã Bàn Giao Về Kho Của Shop</span>
                        </button>
                      )}
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
          emptyTitle="Hiện tại không có kiện hàng hoàn nào cần xử lý!"
          emptyMessage="Mọi yêu cầu trả hàng từ người mua đã được thu hồi và bàn giao hoàn tất."
        />

        {/* 6. Standard Pagination Bar (Double-Lock: 10 items/page) */}
        <StandardPaginationBar
          currentPage={currentPage}
          totalItems={filteredOrders.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          itemLabel="kiện hàng hoàn"
        />
      </div>

      {/* Quick Dispatch Modal */}
      {dispatchModal.open && (
        <QuickDispatchNotificationModal
          isOpen={dispatchModal.open}
          onClose={() => setDispatchModal((prev) => ({ ...prev, open: false }))}
          senderRole="SHIPPER"
          targetRole={dispatchModal.targetRole}
          targetId={dispatchModal.targetId}
          targetName={dispatchModal.targetName}
          orderCode={dispatchModal.orderCode}
          orderId={dispatchModal.orderId}
        />
      )}
    </div>
  );
}
