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

  const [expandedReturnIds, setExpandedReturnIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedReturnIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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
            <span className="w-2.5 h-6 bg-[#00875A] rounded-full inline-block"></span>
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
          <span className={`material-symbols-outlined text-[16px] text-slate-500 ${loading ? 'animate-spin text-[#00875A]' : ''}`}>
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
            <div className="w-9 h-9 border-3 border-[#00875A] border-t-transparent rounded-full animate-spin mx-auto"></div>
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
          <div className="w-full overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <th className="py-3.5 pl-4 pr-2 w-[24%]">Mã Đơn / Yêu Cầu</th>
                  <th className="py-3.5 px-3 w-[30%]">Sản Phẩm &amp; Phân Loại</th>
                  <th className="py-3.5 px-3 w-[22%]">Khách Hàng &amp; Lý Do</th>
                  <th className="py-3.5 px-3 w-[12%] text-center">Trạng Thái</th>
                  <th className="py-3.5 pl-2 pr-4 w-[12%] text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedReturns.map((item) => {
                  const isExpanded = !!expandedReturnIds[item.id];
                  const orderCode = item.order?.code || item.orderId;
                  const bookTitle = item.orderItem?.title || 'Sản phẩm';
                  const userName = item.user?.fullName || item.user?.name || item.userId;
                  const reasonLabel = getReasonLabel(item.reason);

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        onClick={() => toggleExpand(item.id)}
                        className={`hover:bg-emerald-50/30 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-emerald-50/40' : 'bg-white'
                        }`}
                      >
                        {/* 1. Mã đơn / Yêu cầu */}
                        <td className="py-3 pl-4 pr-2 align-middle">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(item.id);
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
                            <div className="min-w-0">
                              <span className="font-mono font-bold text-slate-900 block truncate">
                                #{orderCode}
                              </span>
                              <span className="font-mono text-[10.5px] text-slate-400 block truncate">
                                Req: {item.id.slice(0, 10)}...
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Sản phẩm & Phân loại */}
                        <td className="py-3 px-3 align-middle">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-slate-900 text-xs line-clamp-1" title={bookTitle}>
                              {bookTitle}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {item.type === 'REFUND' ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <span className="material-symbols-outlined text-[11px]">payments</span>
                                  <span>Hoàn tiền</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                                  <span className="material-symbols-outlined text-[11px]">sync_alt</span>
                                  <span>Đổi hàng</span>
                                </span>
                              )}
                              <span className="font-mono text-[10px] text-slate-400">
                                Item: {item.orderItemId.slice(0, 8)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Khách hàng & Lý do */}
                        <td className="py-3 px-3 align-middle">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-800 text-xs truncate">
                              {userName}
                            </span>
                            <span className="text-[11px] text-slate-500 line-clamp-1" title={item.reasonDetail || reasonLabel}>
                              {reasonLabel}
                            </span>
                          </div>
                        </td>

                        {/* 4. Trạng thái */}
                        <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                          <SellerStatusBadge status={item.status} />
                        </td>

                        {/* 5. Thao tác */}
                        <td className="py-3 pl-2 pr-4 align-middle text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Link href={`/seller/returns/${item.id}`}>
                              <SellerActionButton
                                variant="view"
                                label="Chi tiết"
                                icon="visibility"
                                size="sm"
                              />
                            </Link>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Subcards Detail Panel */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={5} className="p-4 border-t border-b border-emerald-100/70">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white rounded-xl p-4 border border-emerald-200/70 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
                              {/* Card 1: Thông tin yêu cầu & đơn hàng */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
                                  <span className="material-symbols-outlined text-[16px] text-[#00875A]">inventory_2</span>
                                  <span>Thông Tin Đơn &amp; Sản Phẩm</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Mã đơn hàng:</span>
                                    <span className="font-mono font-semibold text-slate-900">#{orderCode}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Mã yêu cầu:</span>
                                    <span className="font-mono text-slate-700 text-[11px]">{item.id}</span>
                                  </div>
                                  <div className="flex justify-between items-start gap-2">
                                    <span className="text-slate-500 shrink-0">Sản phẩm:</span>
                                    <span className="font-medium text-slate-900 text-right text-[11.5px]">{bookTitle}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Hình thức:</span>
                                    <span className="font-semibold text-slate-800">
                                      {item.type === 'REFUND' ? 'Hoàn tiền lại' : 'Đổi sản phẩm mới'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Card 2: Khách hàng & Lý do chi tiết */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
                                  <span className="material-symbols-outlined text-[16px] text-amber-600">contact_support</span>
                                  <span>Khách Hàng &amp; Lý Do</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Người mua:</span>
                                    <span className="font-semibold text-slate-900">{userName}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Lý do chính:</span>
                                    <span className="font-medium text-slate-800">{reasonLabel}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 block mb-0.5">Mô tả từ khách hàng:</span>
                                    <p className="bg-slate-50 p-2 rounded-lg text-slate-700 text-[11.5px] border border-slate-100">
                                      {item.reasonDetail || 'Không có mô tả chi tiết thêm.'}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Card 3: Trạng thái & Hành động xử lý */}
                              <div className="space-y-2 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
                                    <span className="material-symbols-outlined text-[16px] text-emerald-600">gavel</span>
                                    <span>Trạng Thái &amp; Xử Lý</span>
                                  </div>
                                  <div className="space-y-1.5 text-xs mt-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-500">Trạng thái hiện tại:</span>
                                      <SellerStatusBadge status={item.status} />
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-2">
                                      Xem trang chi tiết để phản hồi đồng ý hoặc khiếu nại yêu cầu này của khách hàng.
                                    </p>
                                  </div>
                                </div>
                                <div className="pt-2">
                                  <Link href={`/seller/returns/${item.id}`} className="w-full block">
                                    <button
                                      type="button"
                                      className="w-full py-2 px-3 bg-[#00875A] hover:bg-[#003B2B] text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                                    >
                                      <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                                      <span>Mở Trang Xử Lý Yêu Cầu</span>
                                    </button>
                                  </Link>
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
