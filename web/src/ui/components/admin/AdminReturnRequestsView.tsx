'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';

interface ReturnItem {
  id: string;
  orderId: string;
  orderItemId: string;
  sellerOrderId?: string | null;
  userId: string;
  storeId: string;
  type: 'REFUND' | 'REPLACEMENT';
  reason: 'NOT_AS_DESCRIBED' | 'DAMAGED_TORN' | 'OTHER';
  reasonDetail?: string | null;
  evidenceImages: string[];
  evidenceVideos: string[];
  sellerEvidenceImages?: string[];
  sellerEvidenceVideos?: string[];
  sellerDisputeReason?: string | null;
  status:
    | 'WAITING_FORWARD'
    | 'FORWARDED_TO_SELLER'
    | 'SELLER_ACCEPTED'
    | 'SELLER_DISPUTED'
    | 'ARBITRATED_BUYER_WINS'
    | 'ARBITRATED_SELLER_WINS'
    | 'COMPLETED';
  forwardedToSellerAt?: string | null;
  sellerRespondedAt?: string | null;
  replacementTrackingCode?: string | null;
  replacementCarrier?: string | null;
  createdAt: string;
  updatedAt: string;
  orderItem?: {
    id: string;
    title: string;
    price: number;
    quantity: number;
    coverUrl?: string;
    format?: string;
  };
  order?: {
    code: string;
    createdAt: string;
    shippingAddress?: any;
  };
  store?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  };
}

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất Cả' },
  { key: 'WAITING_FORWARD', label: 'Chờ Gửi Cửa Hàng' },
  { key: 'FORWARDED_TO_SELLER', label: 'Đã Gửi Cửa Hàng' },
  { key: 'SELLER_ACCEPTED', label: 'Cửa Hàng Đồng Ý' },
  { key: 'SELLER_DISPUTED', label: 'Cửa Hàng Phản Biện' },
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

export default function AdminReturnRequestsView() {
  const { showToast } = useToast();
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [forwardingId, setForwardingId] = useState<string | null>(null);

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState<ReturnItem | null>(null);

  const fetchReturnRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getReturnRequests({
        status: activeTab !== 'ALL' && activeTab !== 'RESOLVED' ? activeTab : undefined,
        search: searchQuery || undefined,
      });

      if (res.success && Array.isArray(res.data)) {
        setItems(res.data);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    fetchReturnRequests();
  }, [fetchReturnRequests]);

  const handleForwardToSeller = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setForwardingId(id);
      const res = await adminApi.forwardReturnRequestToSeller(id);
      if (res.success) {
        showToast(
          {
            title: 'Chuyển tiếp thành công',
            message: 'Đã gửi yêu cầu đổi trả đến cửa hàng để phản hồi trong 24 giờ.',
          },
          'success'
        );
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, status: 'FORWARDED_TO_SELLER' } : it))
        );
        if (selectedItem?.id === id) {
          setSelectedItem((prev) => (prev ? { ...prev, status: 'FORWARDED_TO_SELLER' } : null));
        }
      } else {
        showToast(
          {
            title: 'Thao tác thất bại',
            message: res.error?.message || 'Không thể chuyển tiếp yêu cầu đến cửa hàng.',
          },
          'error'
        );
      }
    } catch (err: any) {
      showToast({ title: 'Lỗi', message: err.message || 'Lỗi kết nối máy chủ' }, 'error');
    } finally {
      setForwardingId(null);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
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
      const orderCode = (it.order?.code || it.orderId || '').toLowerCase();
      const storeName = (it.store?.name || '').toLowerCase();
      const userName = (it.user?.name || it.user?.fullName || '').toLowerCase();
      const bookTitle = (it.orderItem?.title || '').toLowerCase();

      return (
        orderCode.includes(q) ||
        storeName.includes(q) ||
        userName.includes(q) ||
        bookTitle.includes(q)
      );
    });
  }, [items, activeTab, searchQuery]);

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
      case 'WAITING_FORWARD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Chờ gửi Shop
          </span>
        );
      case 'FORWARDED_TO_SELLER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            Đã gửi Shop
          </span>
        );
      case 'SELLER_ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Shop đồng ý
          </span>
        );
      case 'SELLER_DISPUTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Shop phản biện
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
            Hoàn tất
          </span>
        );
      default:
        return <span className="text-xs">{status}</span>;
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
            <span>Quản Lý Yêu Cầu Đổi Trả</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tiếp nhận, kiểm tra hồ sơ và chuyển tiếp yêu cầu đổi trả từ khách hàng đến các cửa hàng
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReturnRequests}
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
            placeholder="Tìm mã đơn, tên sách, shop, khách..."
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

      {/* Table - Single Horizontal Line per Row */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                <th className="py-3 px-4 text-center">STT</th>
                <th className="py-3 px-4">Mã Đơn Hàng</th>
                <th className="py-3 px-4">Mã Sản Phẩm</th>
                <th className="py-3 px-4">Tên Sản Phẩm</th>
                <th className="py-3 px-4">Tên Cửa Hàng</th>
                <th className="py-3 px-4">Khách Hàng</th>
                <th className="py-3 px-4 text-center">Hình Thức</th>
                <th className="py-3 px-4">Lý Do Đổi Trả</th>
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
                      <span>Đang tải danh sách yêu cầu đổi trả...</span>
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
                      <p className="font-medium">Không có yêu cầu đổi trả nào trong mục này.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isWaitingForward = item.status === 'WAITING_FORWARD';
                  const orderCode = item.order?.code || item.orderId;
                  const bookTitle = item.orderItem?.title || 'Sản phẩm';
                  const storeName = item.store?.name || item.storeId;
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

                      {/* 5. Tên cửa hàng */}
                      <td className="py-3 px-4">
                        <TruncatedCell text={storeName} max={10} />
                      </td>

                      {/* 6. Khách hàng */}
                      <td className="py-3 px-4">
                        <TruncatedCell text={userName} max={10} />
                      </td>

                      {/* 7. Hình thức */}
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

                      {/* 8. Lý do */}
                      <td className="py-3 px-4">
                        <TruncatedCell text={item.reasonDetail ? `${reasonLabel}: ${item.reasonDetail}` : reasonLabel} max={15} />
                      </td>

                      {/* 9. Trạng thái */}
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* 10. Thao tác */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedItem(item)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[15px]">visibility</span>
                            <span>Chi tiết</span>
                          </button>

                          {isWaitingForward ? (
                            <button
                              type="button"
                              disabled={forwardingId === item.id}
                              onClick={(e) => handleForwardToSeller(item.id, e)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              {forwardingId === item.id ? (
                                <span className="material-symbols-outlined animate-spin text-[15px]">progress_activity</span>
                              ) : (
                                <span className="material-symbols-outlined text-[15px]">send</span>
                              )}
                              <span>Gửi Shop</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 text-xs font-bold border border-slate-200 dark:border-slate-800 cursor-not-allowed select-none inline-flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[15px]">check</span>
                              <span>Đã gửi</span>
                            </button>
                          )}
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

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">assignment_return</span>
                </span>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Chi Tiết Yêu Cầu Đổi Trả #{selectedItem.id.slice(0, 8)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Đơn hàng #{selectedItem.order?.code || selectedItem.orderId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-6 space-y-5 text-xs">
              {/* Product Info */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <div className="w-12 h-16 rounded-lg bg-amber-100 dark:bg-amber-950/50 overflow-hidden shrink-0 flex items-center justify-center border border-amber-200">
                  {selectedItem.orderItem?.coverUrl ? (
                    <img
                      src={selectedItem.orderItem.coverUrl}
                      alt={selectedItem.orderItem.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-amber-600 text-xl">menu_book</span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedItem.orderItem?.title || 'Sản phẩm'}
                  </h4>
                  <p className="text-slate-500 mt-1">
                    Số lượng: <b>{selectedItem.orderItem?.quantity || 1}</b> • Đơn giá:{' '}
                    <b className="text-amber-600">
                      {Number(selectedItem.orderItem?.price || 0).toLocaleString('vi-VN')}đ
                    </b>
                  </p>
                  <p className="text-slate-500">
                    Cửa hàng: <b>{selectedItem.store?.name || selectedItem.storeId}</b> • Khách:{' '}
                    <b>{selectedItem.user?.fullName || selectedItem.user?.name || selectedItem.userId}</b>
                  </p>
                </div>
              </div>

              {/* Status and Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 text-[11px] block uppercase font-bold">Hình thức</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {selectedItem.type === 'REFUND' ? 'Hoàn tiền 100%' : 'Đổi hàng mới (0đ)'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 text-[11px] block uppercase font-bold">Trạng thái</span>
                  <div className="mt-1">{getStatusBadge(selectedItem.status)}</div>
                </div>
              </div>

              {/* Buyer Reason & Details */}
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold">
                  <span className="material-symbols-outlined text-base">info</span>
                  <span>Lý do từ Khách hàng: {getReasonLabel(selectedItem.reason)}</span>
                </div>
                {selectedItem.reasonDetail && (
                  <p className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
                    {selectedItem.reasonDetail}
                  </p>
                )}

                {/* Evidence Media */}
                {(selectedItem.evidenceImages?.length > 0 || selectedItem.evidenceVideos?.length > 0) && (
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block mb-2">
                      Minh chứng từ Khách hàng
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {selectedItem.evidenceImages?.map((img, i) => (
                        <a
                          key={`b-img-${i}`}
                          href={img}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative aspect-square rounded-xl overflow-hidden border border-amber-200 bg-black/5"
                        >
                          <img src={img} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                      {selectedItem.evidenceVideos?.map((vid, i) => (
                        <div
                          key={`b-vid-${i}`}
                          className="relative aspect-square rounded-xl overflow-hidden border border-amber-200 bg-black"
                        >
                          <video src={vid} className="w-full h-full object-cover" controls />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Seller Evidence (If Disputed) */}
              {selectedItem.status === 'SELLER_DISPUTED' && (
                <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-bold">
                    <span className="material-symbols-outlined text-base">gavel</span>
                    <span>Phản biện từ Cửa hàng</span>
                  </div>
                  {selectedItem.sellerDisputeReason && (
                    <p className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30">
                      {selectedItem.sellerDisputeReason}
                    </p>
                  )}
                  {(selectedItem.sellerEvidenceImages?.length || 0) > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                      {selectedItem.sellerEvidenceImages?.map((img, i) => (
                        <a
                          key={`s-img-${i}`}
                          href={img}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative aspect-square rounded-xl overflow-hidden border border-rose-200 bg-black/5"
                        >
                          <img src={img} alt={`Seller Evidence ${i + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                Đóng
              </button>

              {selectedItem.status === 'WAITING_FORWARD' && (
                <button
                  type="button"
                  disabled={forwardingId === selectedItem.id}
                  onClick={() => handleForwardToSeller(selectedItem.id)}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {forwardingId === selectedItem.id ? (
                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  )}
                  <span>Gửi Đến Cửa Hàng</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
