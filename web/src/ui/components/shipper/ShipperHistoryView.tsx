"use client";

import React, { useState } from 'react';
import { useShipper } from '@/ui/context/ShipperContext';

export default function ShipperHistoryView() {
  const { historyOrders } = useShipper();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DELIVERED' | 'FAILED'>('ALL');

  const filtered = historyOrders.filter((order) => {
    if (statusFilter === 'DELIVERED' && order.status !== 'DELIVERED') return false;
    if (statusFilter === 'FAILED' && order.status !== 'FAILED') return false;
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

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--theme-surface,#ffffff)] p-3 rounded-2xl border border-[var(--theme-border,#e8e5df)] shadow-2xs">
        <div className="relative flex-1 max-w-md flex items-center bg-[var(--theme-background,#F2FBF9)]/80 rounded-xl px-3 border border-[var(--theme-border,#e8e5df)]">
          <span className="material-symbols-outlined text-[18px] text-[var(--theme-text-muted,#49454f)] mr-2">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã đơn, khách, shop..."
            className="w-full bg-transparent text-xs py-2 text-[var(--theme-text,#1c1b1f)] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-[var(--theme-primary,#003B2B)] text-white shadow-2xs'
                : 'bg-neutral-100 text-[var(--theme-text-muted,#49454f)] hover:bg-neutral-200'
            }`}
          >
            Tất cả ({historyOrders.length})
          </button>
          <button
            onClick={() => setStatusFilter('DELIVERED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'DELIVERED'
                ? 'bg-[var(--theme-primary,#003B2B)] text-white shadow-2xs'
                : 'bg-neutral-100 text-[var(--theme-text-muted,#49454f)] hover:bg-neutral-200'
            }`}
          >
            Thành công
          </button>
          <button
            onClick={() => setStatusFilter('FAILED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'FAILED'
                ? 'bg-[var(--theme-primary,#003B2B)] text-white shadow-2xs'
                : 'bg-neutral-100 text-[var(--theme-text-muted,#49454f)] hover:bg-neutral-200'
            }`}
          >
            Thất bại / Hoàn
          </button>
        </div>
      </div>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <div className="bg-[var(--theme-surface,#ffffff)] rounded-2xl border border-[var(--theme-border,#e8e5df)] p-12 text-center text-xs text-[var(--theme-text-muted,#49454f)] shadow-2xs">
          Không có lịch sử giao hàng nào phù hợp với bộ lọc.
        </div>
      ) : (
        <div className="bg-[var(--theme-surface,#ffffff)] rounded-2xl border border-[var(--theme-border,#e8e5df)] shadow-2xs overflow-hidden divide-y divide-[var(--theme-border,#e8e5df)]/60">
          {filtered.map((order) => {
            const isDelivered = order.status === 'DELIVERED';

            return (
              <div key={order.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
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

                <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--theme-border,#e8e5df)]/40">
                  {isDelivered ? (
                    <>
                      <span className="font-black text-sm text-[#00875A] block">
                        +{order.shippingFee.toLocaleString('vi-VN')}đ cước
                      </span>
                      <span className="text-[11px] text-amber-700 font-semibold block">
                        {order.codAmount > 0 ? `Đã thu COD: ${order.codAmount.toLocaleString('vi-VN')}đ` : 'Đơn Online (0đ COD)'}
                      </span>
                    </>
                  ) : (
                    <span className="text-rose-600 font-bold block">0đ (Đã hoàn về Shop)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
