'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { orderApi, ReturnRequestData } from '@/ui/api/orderApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import {
  SellerStatusBadge,
  SellerFilterTabs,
  SellerPagination,
  SellerTableContainer,
  SellerActionButton,
} from '@/ui/components/seller/SellerUI';

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất Cả' },
  { key: 'FORWARDED_TO_SELLER', label: 'Cần Xử Lý' },
  { key: 'SELLER_ACCEPTED', label: 'Đã Đồng Ý' },
  { key: 'SELLER_DISPUTED', label: 'Đã Phản Biện' },
  { key: 'RESOLVED', label: 'Đã Giải Quyết' },
];

export default function SellerReturnsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [returns, setReturns] = useState<ReturnRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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

  const totalItems = filteredReturns.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);

  const paginatedReturns = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredReturns.slice(start, start + pageSize);
  }, [filteredReturns, validPage, pageSize]);

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

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-amber-500 rounded-full inline-block"></span>
            <span>Yêu Cầu Đổi Trả &amp; Khiếu Nại</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Xem và xử lý các yêu cầu đổi trả hoặc khiếu nại sản phẩm từ người mua hàng
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReturns}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto active:scale-[0.98]"
        >
          <span className={`material-symbols-outlined text-[16px] text-slate-500 ${loading ? 'animate-spin text-amber-600' : ''}`}>
            refresh
          </span>
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* 2. Filter Tabs & Search */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <SellerFilterTabs
          tabs={STATUS_TABS.map(t => ({ id: t.key, label: t.label }))}
          activeTab={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            setCurrentPage(1);
          }}
        />

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
            placeholder="Tìm mã đơn, tên sách, người mua..."
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

      {/* 3. Table */}
      <SellerTableContainer>
        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <div className="w-9 h-9 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="font-medium text-xs mt-2.5">Đang tải danh sách yêu cầu đổi trả...</p>
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-3xl text-slate-300">
                inbox
              </span>
              <p className="font-semibold text-slate-700">Không có yêu cầu đổi trả nào</p>
              <p className="text-[11.5px] text-slate-400">Tất cả đơn hàng của bạn đang vận hành ổn định.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[1280px]">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <th className="py-3.5 pl-5 pr-2 w-12 text-center">STT</th>
                  <th className="py-3.5 px-4 w-36">Mã Đơn Hàng</th>
                  <th className="py-3.5 px-4 min-w-[300px]">Sản Phẩm Đổi Trả</th>
                  <th className="py-3.5 px-4 w-44">Người Mua</th>
                  <th className="py-3.5 px-4 w-32 text-center">Hình Thức</th>
                  <th className="py-3.5 px-4 w-52">Lý Do Đổi Trả</th>
                  <th className="py-3.5 px-4 w-40 text-center">Trạng Thái</th>
                  <th className="py-3.5 pl-4 pr-5 w-36 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedReturns.map((item, idx) => {
                  const orderCode = item.order?.code || item.orderId;
                  const bookTitle = item.orderItem?.title || 'Sản phẩm';
                  const userName = item.user?.fullName || item.user?.name || item.userId;
                  const reasonLabel = getReasonLabel(item.reason);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors bg-white"
                    >
                      {/* STT */}
                      <td className="py-3.5 pl-5 pr-2 text-center font-mono text-slate-400">
                        {(validPage - 1) * pageSize + idx + 1}
                      </td>

                      {/* Mã đơn hàng */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        #{orderCode}
                      </td>

                      {/* Tên sản phẩm */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-900 text-[12.5px] line-clamp-1" title={bookTitle}>
                          {bookTitle}
                        </span>
                        <span className="font-mono text-[10.5px] text-slate-400 block mt-0.5">
                          ID: {item.orderItemId.slice(0, 14)}...
                        </span>
                      </td>

                      {/* Người mua */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800 text-[12.5px]">
                        {userName}
                      </td>

                      {/* Hình thức */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {item.type === 'REFUND' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="material-symbols-outlined text-[13px]">payments</span>
                            <span>Hoàn tiền</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                            <span className="material-symbols-outlined text-[13px]">sync_alt</span>
                            <span>Đổi hàng</span>
                          </span>
                        )}
                      </td>

                      {/* Lý do */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="line-clamp-1 text-xs" title={item.reasonDetail ? `${reasonLabel}: ${item.reasonDetail}` : reasonLabel}>
                          {item.reasonDetail ? `${reasonLabel}: ${item.reasonDetail}` : reasonLabel}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <SellerStatusBadge status={item.status} />
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 pl-4 pr-5 text-center whitespace-nowrap">
                        <Link href={`/seller/returns/${item.id}`}>
                          <SellerActionButton
                            variant="view"
                            label="Chi tiết"
                            icon="visibility"
                            size="sm"
                          />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <SellerPagination
          currentPage={validPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="yêu cầu đổi trả"
        />
      </SellerTableContainer>
    </div>
  );
}
