'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { orderApi, ReturnRequestData } from '@/ui/api/orderApi';
import { useToast } from '@/ui/context/ToastContext';

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

export default function SellerReplacementOrdersPage() {
  const { showToast } = useToast();
  const [replacements, setReplacements] = useState<ReturnRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Shipping Modal State
  const [shippingModal, setShippingModal] = useState<{ open: boolean; item: ReturnRequestData | null }>({
    open: false,
    item: null,
  });
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

  const handleOpenShipModal = (item: ReturnRequestData) => {
    setCarrier(item.replacementCarrier || 'Viettel Post');
    setTrackingCode(item.replacementTrackingCode || '');
    setShippingModal({ open: true, item });
  };

  const handleShipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingModal.item || !trackingCode.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await orderApi.sellerShipReplacement(shippingModal.item.id, {
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
        setShippingModal({ open: false, item: null });
      } else {
        showToast({ title: 'Lỗi', message: res.error?.message || 'Không thể cập nhật mã vận đơn' }, 'error');
      }
    } catch (err: any) {
      showToast({ title: 'Lỗi', message: err.message || 'Lỗi kết nối máy chủ' }, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = replacements.filter((it) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const code = (it.order?.code || it.orderId || '').toLowerCase();
    const title = (it.orderItem?.title || '').toLowerCase();
    const customer = (it.user?.fullName || it.user?.name || '').toLowerCase();
    const track = (it.replacementTrackingCode || '').toLowerCase();
    return code.includes(q) || title.includes(q) || customer.includes(q) || track.includes(q);
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">sync_alt</span>
            </span>
            <span>Đơn Hàng Đổi Mới (Replacement Orders)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản lý các ấn phẩm đổi hàng mới 0đ theo thỏa thuận đổi trả với người mua
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReplacements}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          <span>Làm Mới</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
        <div className="relative min-w-[280px]">
          <span className="material-symbols-outlined text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 text-sm">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm mã đơn gốc, mã vận đơn, tên sách..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
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
                <th className="py-3 px-4">Mã Đơn Gốc</th>
                <th className="py-3 px-4">Mã Sản Phẩm</th>
                <th className="py-3 px-4">Tên Sách Đổi</th>
                <th className="py-3 px-4">Khách Hàng</th>
                <th className="py-3 px-4 text-center">Tổng Tiền</th>
                <th className="py-3 px-4 text-center">Thanh Toán</th>
                <th className="py-3 px-4">Vận Đơn Giao Đổi</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                      <span>Đang tải danh sách đơn hàng đổi mới...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">
                        inbox
                      </span>
                      <p className="font-medium">Chưa có đơn hàng đổi mới nào.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const orderCode = item.order?.code || item.orderId;
                  const bookTitle = item.orderItem?.title || 'Sách đổi';
                  const userName = item.user?.fullName || item.user?.name || item.userId;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors whitespace-nowrap"
                    >
                      {/* 1. STT */}
                      <td className="py-3 px-4 text-center font-bold text-slate-500">
                        {idx + 1}
                      </td>

                      {/* 2. Mã đơn gốc */}
                      <td className="py-3 px-4 font-mono font-bold text-blue-700 dark:text-blue-400">
                        #{orderCode}
                      </td>

                      {/* 3. Mã sản phẩm */}
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {item.orderItemId.slice(0, 10)}...
                      </td>

                      {/* 4. Tên sách đổi */}
                      <td className="py-3 px-4">
                        <TruncatedCell text={bookTitle} max={12} />
                      </td>

                      {/* 5. Khách hàng */}
                      <td className="py-3 px-4">
                        <TruncatedCell text={userName} max={10} />
                      </td>

                      {/* 6. Tổng tiền: HÀNG ĐỔI (0đ) */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300">
                          <span className="material-symbols-outlined text-[12px]">sync_alt</span>
                          <span>HÀNG ĐỔI (0đ)</span>
                        </span>
                      </td>

                      {/* 7. Thanh toán: 0đ */}
                      <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        0đ (Đơn gốc)
                      </td>

                      {/* 8. Vận đơn giao đổi */}
                      <td className="py-3 px-4">
                        {item.replacementTrackingCode ? (
                          <div className="flex items-center gap-1 font-mono text-xs">
                            <span className="text-slate-500">{item.replacementCarrier}:</span>
                            <b className="text-blue-600">{item.replacementTrackingCode}</b>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa có mã vận đơn</span>
                        )}
                      </td>

                      {/* 9. Trạng thái */}
                      <td className="py-3 px-4 text-center">
                        {item.replacementTrackingCode ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Đang giao hàng đổi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Chờ gửi hàng
                          </span>
                        )}
                      </td>

                      {/* 10. Thao tác */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenShipModal(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-all inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">local_shipping</span>
                            <span>{item.replacementTrackingCode ? 'Sửa Vận Đơn' : 'Giao Hàng'}</span>
                          </button>

                          <Link
                            href={`/seller/returns/${item.id}`}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all inline-flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[15px]">visibility</span>
                            <span>Chi Tiết</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shipping Modal */}
      {shippingModal.open && shippingModal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">local_shipping</span>
                <span>Nhập Mã Vận Đơn Giao Đổi</span>
              </h3>
              <button
                type="button"
                onClick={() => setShippingModal({ open: false, item: null })}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleShipSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Đơn vị vận chuyển <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="VD: Viettel Post, GHTK..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Mã vận đơn giao hàng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="VD: VT123456789..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShippingModal({ open: false, item: null })}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !trackingCode.trim()}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  )}
                  <span>Lưu & Gửi Khách Hàng</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
