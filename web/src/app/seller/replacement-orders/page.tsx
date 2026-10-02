'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { orderApi, ReturnRequestData } from '@/ui/api/orderApi';
import { useToast } from '@/ui/context/ToastContext';
import {
  SellerTableContainer,
  SellerStatusBadge,
  SellerActionButton,
  SellerPagination,
} from '@/ui/components/seller/SellerUI';

export default function SellerReplacementOrdersPage() {
  const { showToast } = useToast();
  const [replacements, setReplacements] = useState<ReturnRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // In-Page Shipping Form State (NO POPUP)
  const [shippingTarget, setShippingTarget] = useState<ReturnRequestData | null>(null);
  const [carrier, setCarrier] = useState('Viettel Post');
  const [trackingCode, setTrackingCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReplacements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await orderApi.getSellerReplacements();
      if (res.success && Array.isArray(res.data)) {
        setReplacements(res.data);
      } else {
        setReplacements([]);
      }
    } catch {
      setReplacements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReplacements();
  }, [fetchReplacements]);

  const handleOpenShipForm = (item: ReturnRequestData) => {
    setCarrier(item.replacementCarrier || 'Viettel Post');
    setTrackingCode(item.replacementTrackingCode || '');
    setShippingTarget(item);
  };

  const handleShipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingTarget || !trackingCode.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await orderApi.sellerShipReplacement(shippingTarget.id, {
        carrier,
        trackingCode: trackingCode.trim(),
      });

      if (res.success) {
        showToast(
          {
            title: 'Cập nhật thành công',
            message: `Đã cập nhật mã vận đơn ${trackingCode} cho kiện hàng đổi.`,
          },
          'success'
        );
        fetchReplacements();
        setShippingTarget(null);
      } else {
        showToast({ title: 'Lỗi', message: res.error?.message || 'Không thể cập nhật mã vận đơn' }, 'error');
      }
    } catch (err: any) {
      showToast({ title: 'Lỗi', message: err.message || 'Lỗi kết nối máy chủ' }, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = useMemo(() => {
    return replacements.filter((it) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const code = (it.order?.code || it.orderId || '').toLowerCase();
      const title = (it.orderItem?.title || '').toLowerCase();
      const customer = (it.user?.fullName || it.user?.name || '').toLowerCase();
      const track = (it.replacementTrackingCode || '').toLowerCase();
      return code.includes(q) || title.includes(q) || customer.includes(q) || track.includes(q);
    });
  }, [replacements, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto font-sans animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#00875A] rounded-full inline-block"></span>
            <span>Đơn Hàng Đổi Mới</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý các ấn phẩm đổi hàng mới 0đ theo thỏa thuận bảo hành với người mua
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReplacements}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto active:scale-[0.98]"
        >
          <span className={`material-symbols-outlined text-[16px] text-slate-500 ${loading ? 'animate-spin text-[#00875A]' : ''}`}>
            refresh
          </span>
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* In-Page Action Box for Shipping (NO POPUP) */}
      {shippingTarget && (
        <div className="p-5 rounded-2xl bg-white border-2 border-emerald-300 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center gap-2 text-emerald-800">
              <span className="material-symbols-outlined text-lg">local_shipping</span>
              <h3 className="font-bold text-sm text-slate-900">
                Giao Hàng Đổi Mới · Đơn gốc #{shippingTarget.order?.code || shippingTarget.orderId}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShippingTarget(null)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          <form onSubmit={handleShipSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-14 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                {shippingTarget.orderItem?.coverUrl ? (
                  <img
                    src={shippingTarget.orderItem.coverUrl}
                    alt={shippingTarget.orderItem.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-base">menu_book</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-800 truncate">{shippingTarget.orderItem?.title || 'Sách đổi'}</p>
                <p className="text-slate-500 text-[11px]">Người nhận: {shippingTarget.user?.fullName || shippingTarget.user?.name || 'Khách hàng'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Đơn vị vận chuyển <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="VD: Viettel Post, GHTK, GHN..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#00875A]"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Mã vận đơn giao kiện đổi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="VD: VT123456789..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-mono focus:outline-none focus:border-[#00875A]"
                  required
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <SellerActionButton
                type="button"
                variant="neutral"
                size="sm"
                onClick={() => setShippingTarget(null)}
              >
                Hủy
              </SellerActionButton>
              <button
                type="submit"
                disabled={isSubmitting || !trackingCode.trim()}
                className="px-4 py-2 bg-[#00875A] hover:bg-[#003B2B] text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                <span>{isSubmitting ? 'Đang gửi...' : 'Lưu & Gửi Khách Hàng'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm mã đơn gốc, mã vận đơn, tên sách, khách hàng..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#00875A] text-slate-900"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          )}
        </div>
        <span className="text-xs text-slate-500 self-center">
          Tổng: <b className="text-[#00875A]">{filteredItems.length}</b> kiện hàng đổi
        </span>
      </div>

      {/* Table Container */}
      <SellerTableContainer>
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin text-xl text-[#00875A]">progress_activity</span>
              <span className="text-xs">Đang tải danh sách đơn hàng đổi mới...</span>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <div className="flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-4xl text-slate-300">sync_alt</span>
              <p className="font-medium text-slate-600">Chưa có đơn hàng đổi mới nào.</p>
            </div>
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <th className="py-3.5 pl-4 pr-2 w-[24%]">Mã Đơn / Yêu Cầu</th>
                  <th className="py-3.5 px-3 w-[28%]">Sản Phẩm Đổi</th>
                  <th className="py-3.5 px-3 w-[24%]">Khách Hàng &amp; Vận Đơn</th>
                  <th className="py-3.5 px-3 w-[12%] text-center">Trạng Thái</th>
                  <th className="py-3.5 pl-2 pr-4 w-[12%] text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.map((item) => {
                  const isExpanded = !!expandedIds[item.id];
                  const orderCode = item.order?.code || item.orderId;
                  const bookTitle = item.orderItem?.title || 'Sách đổi';
                  const userName = item.user?.fullName || item.user?.name || item.userId;

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

                        {/* 2. Tên sách đổi */}
                        <td className="py-3 px-3 align-middle">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-slate-900 text-xs line-clamp-1" title={bookTitle}>
                              {bookTitle}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                <span className="material-symbols-outlined text-[11px]">sync_alt</span>
                                <span>Hàng Đổi 0đ</span>
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Khách hàng & Vận đơn */}
                        <td className="py-3 px-3 align-middle">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-800 text-xs truncate">
                              {userName}
                            </span>
                            {item.replacementTrackingCode ? (
                              <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                                <span className="text-slate-400">{item.replacementCarrier}:</span>
                                <b className="text-emerald-700 font-bold">{item.replacementTrackingCode}</b>
                              </div>
                            ) : (
                              <span className="text-amber-600 font-medium text-[11px] flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">pending</span>
                                <span>Chưa gửi mã vận đơn</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Trạng thái */}
                        <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                          {item.replacementTrackingCode ? (
                            <SellerStatusBadge variant="info" dot text="Đang giao hàng đổi" />
                          ) : (
                            <SellerStatusBadge variant="warning" dot text="Chờ gửi hàng" />
                          )}
                        </td>

                        {/* 5. Thao tác */}
                        <td className="py-3 pl-2 pr-4 align-middle text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <SellerActionButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              icon="local_shipping"
                              onClick={() => handleOpenShipForm(item)}
                            >
                              {item.replacementTrackingCode ? 'Sửa Vận Đơn' : 'Giao Hàng'}
                            </SellerActionButton>

                            <Link href={`/seller/returns/${item.id}`}>
                              <SellerActionButton
                                type="button"
                                variant="ghost"
                                size="sm"
                                icon="visibility"
                              >
                                Chi Tiết
                              </SellerActionButton>
                            </Link>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Subcards Detail Panel */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={5} className="p-4 border-t border-b border-emerald-100/70">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white rounded-xl p-4 border border-emerald-200/70 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
                              {/* Card 1: Thông tin đơn hàng & sản phẩm */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
                                  <span className="material-symbols-outlined text-[16px] text-[#00875A]">sync_alt</span>
                                  <span>Đơn Hàng Gốc &amp; Sản Phẩm</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Mã đơn gốc:</span>
                                    <Link href={`/seller/orders/${item.orderId}`} className="font-mono font-bold text-emerald-700 hover:underline">
                                      #{orderCode}
                                    </Link>
                                  </div>
                                  <div className="flex justify-between items-start gap-2">
                                    <span className="text-slate-500 shrink-0">Tên ấn phẩm:</span>
                                    <span className="font-medium text-slate-900 text-right text-[11.5px]">{bookTitle}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Giá trị đơn đổi:</span>
                                    <span className="font-bold text-emerald-600">0đ (Thỏa thuận đổi trả)</span>
                                  </div>
                                </div>
                              </div>

                              {/* Card 2: Thông tin vận chuyển kiện đổi */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
                                  <span className="material-symbols-outlined text-[16px] text-[#00875A]">local_shipping</span>
                                  <span>Vận Chuyển Kiện Hàng Đổi</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Đơn vị vận chuyển:</span>
                                    <span className="font-semibold text-slate-800">{item.replacementCarrier || 'Chưa cập nhật'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Mã vận đơn:</span>
                                    <span className="font-mono font-bold text-slate-900">
                                      {item.replacementTrackingCode || 'Chưa có mã'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Trạng thái phát:</span>
                                    <span className="font-medium text-slate-700">
                                      {item.replacementTrackingCode ? 'Đang trên đường gửi tới khách' : 'Chờ nhà bán đóng gói & gửi'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Card 3: Khách hàng & Thao tác nhanh */}
                              <div className="space-y-2 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
                                    <span className="material-symbols-outlined text-[16px] text-emerald-600">person</span>
                                    <span>Khách Hàng &amp; Xử Lý</span>
                                  </div>
                                  <div className="space-y-1.5 text-xs mt-2">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Người nhận:</span>
                                      <span className="font-bold text-slate-900">{userName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Yêu cầu ID:</span>
                                      <span className="font-mono text-slate-500 text-[11px]">{item.id.slice(0, 12)}...</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="pt-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenShipForm(item);
                                    }}
                                    className="w-full py-2 px-3 bg-[#00875A] hover:bg-[#003B2B] text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">local_shipping</span>
                                    <span>{item.replacementTrackingCode ? 'Chỉnh Sửa Vận Đơn' : 'Gửi Mã Vận Đơn Ngay'}</span>
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
      {!loading && filteredItems.length > 0 && (
        <SellerPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
