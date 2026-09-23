'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { orderApi, ReturnRequestData } from '@/ui/api/orderApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất Cả' },
  { key: 'FORWARDED_TO_SELLER', label: 'Cần Xử Lý' },
  { key: 'SELLER_ACCEPTED', label: 'Đã Đồng Ý' },
  { key: 'SELLER_DISPUTED', label: 'Đã Phản Biện' },
  { key: 'RESOLVED', label: 'Đã Giải Quyết' },
];

function TruncatedCell({ text, max = 10 }: { text: string; max?: number }) {
  const isTruncated = text.length > max;
  const displayText = isTruncated ? `${text.slice(0, max)}...` : text;

  return (
    <div className="relative group inline-block max-w-full">
      <span className="cursor-default font-medium text-slate-800 dark:text-slate-200">
        {displayText}
      </span>
      {isTruncated && (
        <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block z-50 pointer-events-none">
          <div className="bg-slate-900 text-white text-xs rounded-lg py-1.5 px-2.5 shadow-xl whitespace-normal max-w-xs border border-slate-700">
            {text}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SellerReturnsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [returns, setReturns] = useState<ReturnRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await orderApi.getSellerReturnRequests({
        status: activeTab !== 'ALL' && activeTab !== 'RESOLVED' ? activeTab : undefined,
        search: searchQuery || undefined,
      });

      if (res.success && Array.isArray(res.data)) {
        setReturns(res.data);
      } else {
        setReturns([]);
      }
    } catch {
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const filteredReturns = useMemo(() => {
    return returns.filter((it) => {
      if (activeTab === 'RESOLVED') {
        return (
          it.status === 'COMPLETED' ||
          it.status === 'ARBITRATED_BUYER_WINS' ||
          it.status === 'ARBITRATED_SELLER_WINS'
        );
      }
      if (activeTab !== 'ALL' && it.status !== activeTab) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const code = (it.order?.code || it.orderId || '').toLowerCase();
      const title = (it.orderItem?.title || '').toLowerCase();
      const customer = (it.user?.fullName || it.user?.name || '').toLowerCase();

      return code.includes(q) || title.includes(q) || customer.includes(q);
    });
  }, [returns, activeTab, searchQuery]);

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'NOT_AS_DESCRIBED':
        return 'Hàng không đúng mô tả';
      case 'DAMAGED_TORN':
        return 'Hàng bị hỏng rách';
      case 'OTHER':
        return 'Lý do khác';
      default:
        return reason;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FORWARDED_TO_SELLER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Cần phản hồi
          </span>
        );
      case 'SELLER_ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Shop đã đồng ý
          </span>
        );
      case 'SELLER_DISPUTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Đang phản biện
          </span>
        );
      case 'ARBITRATED_BUYER_WINS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Trọng tài: Khách thắng
          </span>
        );
      case 'ARBITRATED_SELLER_WINS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            Trọng tài: Shop thắng
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            Đã hoàn tất
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">assignment_return</span>
            </span>
            <span>Yêu Cầu Đổi Trả Từ Khách Hàng</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Xem và xử lý các yêu cầu đổi trả hoặc khiếu nại sản phẩm từ người mua hàng
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReturns}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          <span>Làm Mới</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <span className="material-symbols-outlined text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 text-sm">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm mã đơn, tên sách, người mua..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Table - Single Horizontal Line */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                <th className="py-3 px-4 text-center">STT</th>
                <th className="py-3 px-4">Mã Đơn Hàng</th>
                <th className="py-3 px-4">Mã Sản Phẩm</th>
                <th className="py-3 px-4">Tên Sản Phẩm</th>
                <th className="py-3 px-4">Người Mua</th>
                <th className="py-3 px-4 text-center">Hình Thức</th>
                <th className="py-3 px-4">Lý Do Đổi Trả</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                      <span>Đang tải danh sách yêu cầu đổi trả...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">
                        inbox
                      </span>
                      <p className="font-medium">Không có yêu cầu đổi trả nào trong mục này.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReturns.map((item, idx) => {
                  const orderCode = item.order?.code || item.orderId;
                  const bookTitle = item.orderItem?.title || 'Sản phẩm';
                  const userName = item.user?.fullName || item.user?.name || item.userId;
                  const reasonLabel = getReasonLabel(item.reason);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-colors whitespace-nowrap"
                    >
                      {/* 1. STT */}
                      <td className="py-3 px-4 text-center font-bold text-slate-500">
                        {idx + 1}
                      </td>

                      {/* 2. Mã đơn hàng */}
                      <td className="py-3 px-4 font-mono font-bold text-amber-700 dark:text-amber-400">
                        #{orderCode}
                      </td>

                      {/* 3. Mã sản phẩm */}
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {item.orderItemId.slice(0, 10)}...
                      </td>

                      {/* 4. Tên sản phẩm */}
                      <td className="py-3 px-4">
                        <TruncatedCell text={bookTitle} max={12} />
                      </td>

                      {/* 5. Người mua */}
                      <td className="py-3 px-4">
                        <TruncatedCell text={userName} max={10} />
                      </td>

                      {/* 6. Hình thức */}
                      <td className="py-3 px-4 text-center">
                        {item.type === 'REFUND' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="material-symbols-outlined text-[13px]">payments</span>
                            <span>Hoàn tiền</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <span className="material-symbols-outlined text-[13px]">sync_alt</span>
                            <span>Đổi hàng</span>
                          </span>
                        )}
                      </td>

                      {/* 7. Lý do */}
                      <td className="py-3 px-4">
                        <TruncatedCell text={item.reasonDetail ? `${reasonLabel}: ${item.reasonDetail}` : reasonLabel} max={15} />
                      </td>

                      {/* 8. Trạng thái */}
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* 9. Thao tác */}
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/seller/returns/${item.id}`}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-2xs transition-all inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[15px]">visibility</span>
                          <span>Chi Tiết</span>
                        </Link>
                      </td>
                    </tr>
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
