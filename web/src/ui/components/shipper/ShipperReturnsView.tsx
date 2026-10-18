"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useShipper, ShipperOrder } from '@/ui/context/ShipperContext';
import {
  DataTableFilterBar,
  DateFilterValue,
  matchesDateFilter,
} from '../common';
import { StandardPaginationBar } from '../common/GroupedDataTable';
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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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
      // Tab filter
      if (activeTab === 'STEP_1' && order.status !== 'PICKING_UP') return false;
      if (activeTab === 'STEP_2' && order.status !== 'IN_TRANSIT') return false;

      // Date filter
      if (!matchesDateFilter(order.createdAt, dateFilter)) return false;

      // Search query
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

  const pagedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

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
        totalCount={filteredOrders.length}
        itemName="kiện hàng hoàn"
        className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs"
      />

      {/* 4. Danh sách kiện hàng hoàn trả */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 p-12 text-center text-xs text-slate-400 space-y-3 shadow-2xs">
          <span className="material-symbols-outlined text-[42px] text-neutral-300">task_alt</span>
          <p className="font-bold text-sm sm:text-base text-slate-800 dark:text-white">
            Hiện tại không có kiện hàng hoàn nào cần xử lý!
          </p>
          <p>Mọi yêu cầu trả hàng từ người mua đã được thu hồi và bàn giao hoàn tất.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pagedOrders.map((order) => {
            const isStep1 = order.status === 'PICKING_UP';
            const isStep2 = order.status === 'IN_TRANSIT';

            const customerMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${order.deliveryAddress}, ${order.deliveryWard}, ${order.deliveryDistrict}, ${order.deliveryProvince}`
            )}`;
            const shopMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              order.shopAddress
            )}`;

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-neutral-900 rounded-2xl border-2 border-purple-200 dark:border-purple-900/60 p-5 shadow-xs space-y-4 transition-all ring-1 ring-purple-500/10"
              >
                {/* Header card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-neutral-800 gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-black text-sm sm:text-base text-purple-950 dark:text-purple-200">
                      {order.code}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1 bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-300">
                      <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                      <span>
                        {isStep1
                          ? '• BƯỚC 1: ĐẾN NHÀ KHÁCH THU HỒI SÁCH'
                          : '• BƯỚC 2: BÀN GIAO SÁCH VỀ KHO SHOP'}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500">
                      Cước công ship: <strong className="text-emerald-700 font-bold">+{order.shippingFee.toLocaleString('vi-VN')}đ</strong>
                    </span>
                    <span className="text-slate-300 dark:text-neutral-700">&bull;</span>
                    <span className="text-slate-500">
                      COD: <strong className="text-slate-700 font-bold">0đ (Miễn phí khách)</strong>
                    </span>
                  </div>
                </div>

                {/* Reason Banner */}
                {order.returnReason && (
                  <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-200 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-purple-600 shrink-0">info</span>
                    <div>
                      <span className="font-bold">Lý do khách hoàn hàng: </span>
                      <span>{order.returnReason}</span>
                    </div>
                  </div>
                )}

                {/* 2-Step Locations Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Điểm 1: Nhà khách */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    isStep1
                      ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800 ring-2 ring-purple-500/10'
                      : 'bg-slate-50/50 dark:bg-neutral-800/40 border-slate-200 dark:border-neutral-800 opacity-80'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-purple-900 dark:text-purple-300 flex items-center gap-1.5 uppercase">
                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">
                          1
                        </span>
                        <span>Điểm 1: Thu hồi sách (Nhà khách)</span>
                      </span>
                      {isStep1 && (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                          Đang thực hiện
                        </span>
                      )}
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {order.customerName}
                      </div>
                      <div className="text-slate-600 dark:text-neutral-300">
                        {order.deliveryAddress}, {order.deliveryWard}, {order.deliveryDistrict}, {order.deliveryProvince}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Liên hệ SĐT Khách: <strong className="text-slate-800 dark:text-white">{order.customerPhone}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-purple-200/60 dark:border-purple-800/40">
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 text-xs font-bold flex items-center gap-1 hover:bg-slate-100"
                      >
                        <span className="material-symbols-outlined text-[14px]">call</span>
                        <span>Gọi Khách</span>
                      </a>
                      <a
                        href={customerMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 text-xs font-bold flex items-center gap-1 hover:bg-slate-100"
                      >
                        <span className="material-symbols-outlined text-[14px]">navigation</span>
                        <span>Chỉ đường</span>
                      </a>

                      {isStep1 && (
                        <button
                          type="button"
                          onClick={() => confirmPickup(order.id)}
                          className="ml-auto px-3.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px]">done</span>
                          <span>Đã Nhận Sách Hoàn Từ Khách</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Điểm 2: Kho Shop */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    isStep2
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800 ring-2 ring-blue-500/10'
                      : 'bg-slate-50/50 dark:bg-neutral-800/40 border-slate-200 dark:border-neutral-800 opacity-80'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-blue-900 dark:text-blue-300 flex items-center gap-1.5 uppercase">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                          2
                        </span>
                        <span>Điểm 2: Trả hàng về kho (Shop/NXB)</span>
                      </span>
                      {isStep2 && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                          Đang vận chuyển trả
                        </span>
                      )}
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {order.shopName}
                      </div>
                      <div className="text-slate-600 dark:text-neutral-300">
                        {order.shopAddress}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Liên hệ Hotline Shop: <strong className="text-slate-800 dark:text-white">{order.shopPhone}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-blue-200/60 dark:border-blue-800/40">
                      <a
                        href={`tel:${order.shopPhone}`}
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 text-xs font-bold flex items-center gap-1 hover:bg-slate-100"
                      >
                        <span className="material-symbols-outlined text-[14px]">call</span>
                        <span>Gọi Shop</span>
                      </a>
                      <a
                        href={shopMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 text-xs font-bold flex items-center gap-1 hover:bg-slate-100"
                      >
                        <span className="material-symbols-outlined text-[14px]">navigation</span>
                        <span>Chỉ đường</span>
                      </a>

                      {isStep2 && (
                        <button
                          type="button"
                          onClick={() => completeDelivery(order.id)}
                          className="ml-auto px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px]">inventory_2</span>
                          <span>Bàn Giao Kho Thành Công</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items in parcel */}
                <div className="p-3 bg-slate-50 dark:bg-neutral-800/40 rounded-xl border border-slate-200/80 dark:border-neutral-800 text-xs">
                  <span className="font-bold text-slate-700 dark:text-neutral-300 text-[11px] uppercase tracking-wide block mb-1.5">
                    Chi tiết sách hoàn cần bàn giao về kho:
                  </span>
                  <div className="space-y-1">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-slate-800 dark:text-neutral-200">
                        <span className="material-symbols-outlined text-[16px] text-purple-600">book</span>
                        <span>{it.quantity}x [TRẢ HÀNG] <strong>{it.title}</strong> ({it.format})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {/* 5. Standard Pagination Bar matching Screenshot 2 */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-neutral-800 shadow-2xs">
            <StandardPaginationBar
              currentPage={currentPage}
              totalItems={filteredOrders.length}
              pageSize={pageSize}
              onPageChange={(p) => setCurrentPage(p)}
              itemLabel="kiện hoàn trả"
            />
          </div>
        </div>
      )}

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
