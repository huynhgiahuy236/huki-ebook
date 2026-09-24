'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import { useSmartFormCollapse } from '../../utils/formHooks';
import { AdminStatusBadge, AdminFilterTabs, AdminPagination, AdminTableContainer, AdminActionButton } from './AdminUI';

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

export default function AdminReturnRequestsView() {
  const { showToast } = useToast();
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [forwardingId, setForwardingId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState<ReturnItem | null>(null);

  const returnPanelRef = useSmartFormCollapse({
    isOpen: Boolean(selectedItem),
    onClose: () => setSelectedItem(null),
    isDirty: false,
  });

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

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: items.length,
      waiting: items.filter((i) => i.status === 'WAITING_FORWARD').length,
      forwarded: items.filter((i) => i.status === 'FORWARDED_TO_SELLER').length,
      accepted: items.filter((i) => i.status === 'SELLER_ACCEPTED').length,
      disputed: items.filter((i) => i.status === 'SELLER_DISPUTED').length,
      resolved: items.filter(
        (i) =>
          i.status === 'COMPLETED' ||
          i.status === 'ARBITRATED_BUYER_WINS' ||
          i.status === 'ARBITRATED_SELLER_WINS'
      ).length,
    };
  }, [items]);

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'NOT_AS_DESCRIBED':
        return 'Không đúng mô tả';
      case 'DAMAGED_TORN':
        return 'Hàng bị hỏng rách';
      case 'OTHER':
        return 'Lý do khác';
      default:
        return reason;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'WAITING_FORWARD':
        return <AdminStatusBadge status="warning" label="Chờ gửi Shop" icon="hourglass_top" />;
      case 'FORWARDED_TO_SELLER':
        return <AdminStatusBadge status="purple" label="Đã gửi Shop" icon="send" />;
      case 'SELLER_ACCEPTED':
        return <AdminStatusBadge status="success" label="Shop đồng ý" icon="check_circle" />;
      case 'SELLER_DISPUTED':
        return <AdminStatusBadge status="danger" label="Shop phản biện" icon="gavel" />;
      case 'ARBITRATED_BUYER_WINS':
        return <AdminStatusBadge status="info" label="Khách thắng" icon="verified" />;
      case 'ARBITRATED_SELLER_WINS':
        return <AdminStatusBadge status="neutral" label="Shop thắng" icon="store" />;
      case 'COMPLETED':
        return <AdminStatusBadge status="success" label="Hoàn tất" icon="task_alt" />;
      default:
        return <AdminStatusBadge status="neutral" label={status} />;
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-gray-900 flex items-center gap-2.5 tracking-tight">
            <span>Quản Lý Yêu Cầu Đổi Trả</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Theo dõi và giải quyết yêu cầu hoàn tiền, đổi hàng từ người mua</p>
        </div>

        <button
          type="button"
          onClick={fetchReturnRequests}
          className="px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          <span>Làm Mới</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <AdminFilterTabs
          tabs={[
            { key: 'ALL', label: 'Tất Cả', count: tabCounts.all },
            { key: 'WAITING_FORWARD', label: 'Chờ Gửi Shop', count: tabCounts.waiting },
            { key: 'FORWARDED_TO_SELLER', label: 'Đã Gửi Shop', count: tabCounts.forwarded },
            { key: 'SELLER_ACCEPTED', label: 'Shop Đồng Ý', count: tabCounts.accepted },
            { key: 'SELLER_DISPUTED', label: 'Shop Phản Biện', count: tabCounts.disputed },
            { key: 'RESOLVED', label: 'Đã Giải Quyết', count: tabCounts.resolved },
          ]}
          activeTab={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            setCurrentPage(1);
          }}
        />

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm mã đơn, tên sách, shop..."
            className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#00875A] focus:bg-white text-gray-800 placeholder:text-gray-400 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <AdminTableContainer>
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-xl"></div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-gray-500 text-xs">
            <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">inbox</span>
            </div>
            <div>
              <p className="font-bold text-gray-900">Không Có Yêu Cầu Đổi Trả Nào</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Không tìm thấy yêu cầu đổi trả phù hợp với bộ lọc hiện tại.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1350px]">
              <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap w-12 text-center">STT</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Mã Đơn Hàng</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Tên Sản Phẩm</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Cửa Hàng / Shop</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Khách Hàng</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">Hình Thức</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Lý Do Đổi Trả</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">Trạng Thái</th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedItems.map((item, idx) => {
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                  const isWaitingForward = item.status === 'WAITING_FORWARD';
                  const orderCode = item.order?.code || item.orderId;
                  const bookTitle = item.orderItem?.title || 'Sản phẩm';
                  const storeName = item.store?.name || item.storeId;
                  const userName = item.user?.fullName || item.user?.name || item.userId;
                  const reasonLabel = getReasonLabel(item.reason);

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'} hover:bg-emerald-50/40`}
                    >
                      {/* 1. STT */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center font-mono text-[11px] text-gray-400">
                        {itemIndex}
                      </td>

                      {/* 2. Mã đơn hàng */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono font-bold text-gray-900">
                        #{orderCode}
                      </td>

                      {/* 3. Tên sản phẩm */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-semibold text-gray-900 max-w-[240px] truncate" title={bookTitle}>
                        {bookTitle}
                      </td>

                      {/* 4. Cửa hàng */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-gray-700 font-medium max-w-[180px] truncate" title={storeName}>
                        {storeName}
                      </td>

                      {/* 5. Khách hàng */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-gray-700 font-mono text-[11px] max-w-[150px] truncate" title={userName}>
                        {userName}
                      </td>

                      {/* 6. Hình thức */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        {item.type === 'REFUND' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="material-symbols-outlined text-[13px]">payments</span>
                            <span>Hoàn tiền</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <span className="material-symbols-outlined text-[13px]">sync_alt</span>
                            <span>Đổi hàng</span>
                          </span>
                        )}
                      </td>

                      {/* 7. Lý do */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-gray-600 text-[11px] max-w-[200px] truncate" title={item.reasonDetail ? `${reasonLabel}: ${item.reasonDetail}` : reasonLabel}>
                        {item.reasonDetail ? `${reasonLabel}: ${item.reasonDetail}` : reasonLabel}
                      </td>

                      {/* 8. Trạng thái */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        {renderStatusBadge(item.status)}
                      </td>

                      {/* 9. Thao tác */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <AdminActionButton
                            variant="view"
                            icon="visibility"
                            label="Chi tiết"
                            size="sm"
                            onClick={() => setSelectedItem(item)}
                            title="Xem chi tiết yêu cầu"
                          />

                          {isWaitingForward && (
                            <AdminActionButton
                              variant="success"
                              icon="send"
                              label="Gửi Shop"
                              size="sm"
                              disabled={forwardingId === item.id}
                              loading={forwardingId === item.id}
                              onClick={(e) => handleForwardToSeller(item.id, e)}
                              title="Chuyển tiếp yêu cầu sang cho Shop xử lý"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredItems.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="yêu cầu đổi trả"
        />
      </AdminTableContainer>

      {/* Detail In-Page Collapsible Panel */}
      {selectedItem && (
        <div ref={returnPanelRef} className="mt-4 bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Header */}
          <div className="pb-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold border border-amber-200">
                <span className="material-symbols-outlined text-[18px]">assignment_return</span>
              </span>
              <div>
                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  Chi Tiết Yêu Cầu Đổi Trả #{selectedItem.id.slice(0, 8)}
                </h3>
                <p className="text-xs text-gray-500">
                  Đơn hàng #{selectedItem.order?.code || selectedItem.orderId}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Đóng bảng
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4 text-xs">
            {/* Product Info */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center gap-3">
              <div className="w-12 h-16 rounded-xl bg-amber-50 overflow-hidden shrink-0 flex items-center justify-center border border-amber-200">
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
                <h4 className="font-bold text-sm text-gray-900">
                  {selectedItem.orderItem?.title || 'Sản phẩm'}
                </h4>
                <p className="text-gray-500 mt-1">
                  Số lượng: <b>{selectedItem.orderItem?.quantity || 1}</b> • Đơn giá:{' '}
                  <b className="text-[#00875A]">
                    {Number(selectedItem.orderItem?.price || 0).toLocaleString('vi-VN')}đ
                  </b>
                </p>
                <p className="text-gray-500">
                  Cửa hàng: <b>{selectedItem.store?.name || selectedItem.storeId}</b> • Khách:{' '}
                  <b>{selectedItem.user?.fullName || selectedItem.user?.name || selectedItem.userId}</b>
                </p>
              </div>
            </div>

            {/* Status and Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-gray-400 text-[10.5px] block uppercase font-bold">Hình thức</span>
                <span className="font-bold text-gray-800 mt-0.5 block">
                  {selectedItem.type === 'REFUND' ? 'Hoàn tiền 100%' : 'Đổi hàng mới (0đ)'}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-gray-400 text-[10.5px] block uppercase font-bold">Trạng thái</span>
                <div className="mt-1">{renderStatusBadge(selectedItem.status)}</div>
              </div>
            </div>

            {/* Buyer Reason & Details */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                <span className="material-symbols-outlined text-base">info</span>
                <span>Lý do từ Khách hàng: {getReasonLabel(selectedItem.reason)}</span>
              </div>
              {selectedItem.reasonDetail && (
                <p className="text-gray-700 bg-white p-3 rounded-xl border border-amber-100">
                  {selectedItem.reasonDetail}
                </p>
              )}

              {/* Evidence Media */}
              {(selectedItem.evidenceImages?.length > 0 || selectedItem.evidenceVideos?.length > 0) && (
                <div className="pt-2">
                  <span className="text-[10.5px] font-bold text-gray-500 uppercase block mb-2">
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
              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                  <span className="material-symbols-outlined text-base">gavel</span>
                  <span>Phản biện từ Cửa hàng</span>
                </div>
                {selectedItem.sellerDisputeReason && (
                  <p className="text-gray-700 bg-white p-3 rounded-xl border border-rose-100">
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

          {/* Footer */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="px-4 py-2 rounded-xl border border-gray-200 font-bold text-gray-700 hover:bg-gray-50 text-xs cursor-pointer"
            >
              Đóng
            </button>

            {selectedItem.status === 'WAITING_FORWARD' && (
              <button
                type="button"
                disabled={forwardingId === selectedItem.id}
                onClick={() => handleForwardToSeller(selectedItem.id)}
                className="px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {forwardingId === selectedItem.id ? (
                  <span className="material-symbols-outlined animate-spin text-[15px]">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[15px]">send</span>
                )}
                <span>Gửi Đến Cửa Hàng</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
