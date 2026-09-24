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

  return (
    <div className="space-y-5 w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200/60">
              <span className="material-symbols-outlined text-[20px]">sync_alt</span>
            </span>
            <span>Đơn Hàng Đổi Mới</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý các ấn phẩm đổi hàng mới 0đ theo thỏa thuận bảo hành với người mua
          </p>
        </div>

        <SellerActionButton
          type="button"
          variant="secondary"
          size="sm"
          icon="refresh"
          onClick={fetchReplacements}
        >
          Làm Mới
        </SellerActionButton>
      </div>

      {/* In-Page Action Box for Shipping (NO POPUP) */}
      {shippingTarget && (
        <div className="p-5 rounded-2xl bg-white border-2 border-sky-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between border-b border-sky-100 pb-3">
            <div className="flex items-center gap-2 text-sky-700">
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
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-sky-500"
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
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-mono focus:outline-none focus:border-sky-500"
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
              <SellerActionButton
                type="submit"
                variant="primary"
                size="sm"
                loading={isSubmitting}
                disabled={!trackingCode.trim()}
                icon="local_shipping"
              >
                Lưu & Gửi Khách Hàng
              </SellerActionButton>
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
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-slate-900"
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
        <span className="text-xs text-slate-400 self-center">
          Tổng: <b className="text-slate-700">{filteredItems.length}</b> kiện hàng đổi
        </span>
      </div>

      {/* Table Container */}
      <SellerTableContainer minWidth="min-w-[1280px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200/80 whitespace-nowrap">
              <th className="py-3.5 px-4 text-center w-12">STT</th>
              <th className="py-3.5 px-4">Mã Đơn Gốc</th>
              <th className="py-3.5 px-4">Tên Sách Đổi</th>
              <th className="py-3.5 px-4">Khách Hàng</th>
              <th className="py-3.5 px-4 text-center">Loại Đơn</th>
              <th className="py-3.5 px-4 text-center">Thanh Toán</th>
              <th className="py-3.5 px-4">Vận Đơn Giao Đổi</th>
              <th className="py-3.5 px-4 text-center">Trạng Thái</th>
              <th className="py-3.5 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-xl text-slate-400">progress_activity</span>
                    <span className="text-xs">Đang tải danh sách đơn hàng đổi mới...</span>
                  </div>
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-4xl text-slate-300">sync_alt</span>
                    <p className="font-medium text-slate-600">Chưa có đơn hàng đổi mới nào.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item, idx) => {
                const orderCode = item.order?.code || item.orderId;
                const bookTitle = item.orderItem?.title || 'Sách đổi';
                const userName = item.user?.fullName || item.user?.name || item.userId;
                const globalIdx = (currentPage - 1) * pageSize + idx + 1;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 transition-colors whitespace-nowrap group"
                  >
                    {/* STT */}
                    <td className="py-3.5 px-4 text-center text-slate-400 font-mono">
                      {globalIdx}
                    </td>

                    {/* Mã đơn gốc */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      <Link href={`/seller/orders/${item.orderId}`} className="hover:text-blue-600 transition-colors">
                        #{orderCode}
                      </Link>
                    </td>

                    {/* Tên sách đổi */}
                    <td className="py-3.5 px-4 max-w-[260px] truncate font-medium text-slate-800" title={bookTitle}>
                      {bookTitle}
                    </td>

                    {/* Khách hàng */}
                    <td className="py-3.5 px-4 text-slate-700">
                      {userName}
                    </td>

                    {/* Loại đơn: HÀNG ĐỔI (0đ) */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                        <span className="material-symbols-outlined text-[13px]">sync_alt</span>
                        <span>Hàng Đổi (0đ)</span>
                      </span>
                    </td>

                    {/* Thanh toán: 0đ */}
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                      0đ (Đơn gốc)
                    </td>

                    {/* Vận đơn giao đổi */}
                    <td className="py-3.5 px-4">
                      {item.replacementTrackingCode ? (
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-slate-400">{item.replacementCarrier}:</span>
                          <b className="text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">{item.replacementTrackingCode}</b>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Chưa có mã vận đơn</span>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4 text-center">
                      {item.replacementTrackingCode ? (
                        <SellerStatusBadge variant="info" dot text="Đang giao hàng đổi" />
                      ) : (
                        <SellerStatusBadge variant="warning" dot text="Chờ gửi hàng" />
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
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
                );
              })
            )}
          </tbody>
        </table>
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
