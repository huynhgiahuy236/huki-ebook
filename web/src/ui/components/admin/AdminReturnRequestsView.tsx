'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import { AdminStatusBadge, AdminFilterTabs, AdminActionButton } from './AdminUI';
import GroupedDataTable, { Column } from '../common/GroupedDataTable';
import { useSmartFormCollapse } from '../../utils/formHooks';

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

  const returnColumns: Column<ReturnItem>[] = useMemo(
    () => [
      {
        key: 'orderProduct',
        title: 'Đơn Hàng & Tác Phẩm',
        render: (_val, item) => {
          const orderCode = item.order?.code || item.orderId;
          const bookTitle = item.orderItem?.title || 'Sản phẩm';
          return (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-12 rounded-lg bg-amber-50 border border-amber-200/80 shrink-0 overflow-hidden flex items-center justify-center">
                {item.orderItem?.coverUrl ? (
                  <img src={item.orderItem.coverUrl} alt={bookTitle} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-amber-700 text-base">menu_book</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-gray-900 text-xs">#{orderCode}</span>
                  {item.type === 'REFUND' ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Hoàn tiền
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Đổi hàng
                    </span>
                  )}
                </div>
                <span className="font-semibold text-gray-800 text-xs truncate block max-w-[240px]" title={bookTitle}>
                  {bookTitle}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'storeCustomer',
        title: 'Gian Hàng & Khách Hàng',
        render: (_val, item) => {
          const storeName = item.store?.name || item.storeId;
          const userName = item.user?.fullName || item.user?.name || item.userId;
          return (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[13px] text-gray-400 shrink-0">storefront</span>
                <span className="font-semibold text-gray-900 text-xs break-words" title={storeName}>
                  {storeName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                <span className="material-symbols-outlined text-[12px] shrink-0">person</span>
                <span className="break-words" title={userName}>{userName}</span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'reason',
        title: 'Lý Do Đổi Trả',
        render: (_val, item) => {
          const reasonLabel = getReasonLabel(item.reason);
          return (
            <div className="flex flex-col gap-0.5 max-w-[220px]">
              <span className="font-bold text-amber-900 text-[11px] inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>{reasonLabel}</span>
              </span>
              {item.reasonDetail && (
                <span className="text-gray-500 text-[10.5px] truncate block" title={item.reasonDetail}>
                  {item.reasonDetail}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'status',
        title: 'Trạng Thái',
        align: 'center',
        render: (_val, item) => (
          <div className="flex flex-col items-center gap-0.5">
            {renderStatusBadge(item.status)}
            <span className="text-[10px] text-gray-400 font-mono">
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : ''}
            </span>
          </div>
        ),
      },
      {
        key: 'actions',
        title: 'Thao Tác',
        align: 'right',
        render: (_val, item) => {
          const isWaitingForward = item.status === 'WAITING_FORWARD';
          return (
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
          );
        },
      },
    ],
    [forwardingId, handleForwardToSeller]
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200">
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

      {/* Main Table Container with GroupedDataTable & Master-Detail Expansion */}
      <GroupedDataTable
        columns={returnColumns}
        data={filteredItems}
        keyField="id"
        loading={loading}
        expandable={true}
        expandedRowRender={(item) => {
          const reasonLabel = getReasonLabel(item.reason);
          const orderCode = item.order?.code || item.orderId;
          const isWaitingForward = item.status === 'WAITING_FORWARD';

          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
              {/* Card 1: Lý do & Bằng chứng */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <span className="material-symbols-outlined text-[16px] text-amber-600">assignment_late</span>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Lý Do &amp; Bằng Chứng</h4>
                </div>
                <div className="text-[11px] space-y-1.5 text-gray-600">
                  <div><span className="text-gray-400">Phân loại:</span> <strong className="text-gray-900 font-semibold">{reasonLabel}</strong></div>
                  <div><span className="text-gray-400">Mô tả của khách:</span> <p className="text-gray-800 italic bg-amber-50/60 p-2 rounded-lg border border-amber-100 mt-1">{item.reasonDetail || 'Không có mô tả chi tiết'}</p></div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-gray-400">Hình ảnh:</span>
                    <span className="font-semibold text-gray-800">{item.evidenceImages?.length || 0} ảnh đính kèm</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Đơn hàng & Đối tác */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <span className="material-symbols-outlined text-[16px] text-[#00875A]">storefront</span>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Gian Hàng &amp; Vận Đơn</h4>
                </div>
                <div className="text-[11px] space-y-1.5 text-gray-600">
                  <div><span className="text-gray-400">Đơn hàng gốc:</span> <strong className="font-mono text-gray-900 font-bold">#{orderCode}</strong></div>
                  <div><span className="text-gray-400">Cửa hàng:</span> <span className="font-semibold text-gray-800">{item.store?.name || item.storeId}</span></div>
                  <div><span className="text-gray-400">Người mua:</span> <span>{item.user?.fullName || item.user?.name || item.userId}</span></div>
                  {item.replacementTrackingCode && (
                    <div><span className="text-gray-400">Mã vận đơn mới:</span> <span className="font-mono font-bold text-blue-700">{item.replacementTrackingCode} ({item.replacementCarrier})</span></div>
                  )}
                </div>
              </div>

              {/* Card 3: Xử lý & Điều phối */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                    <span className="material-symbols-outlined text-[16px] text-blue-600">gavel</span>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Điều Phối Xử Lý</h4>
                  </div>
                  <div className="text-[11px] space-y-1 text-gray-500 mt-1">
                    <div>Ngày tạo: <span className="text-gray-800 font-medium">{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '—'}</span></div>
                    {item.forwardedToSellerAt && (
                      <div>Chuyển shop lúc: <span className="text-gray-800 font-medium">{new Date(item.forwardedToSellerAt).toLocaleString('vi-VN')}</span></div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                    <span>Chi Tiết Hồ Sơ</span>
                  </button>
                  {isWaitingForward && (
                    <button
                      type="button"
                      disabled={forwardingId === item.id}
                      onClick={(e) => handleForwardToSeller(item.id, e)}
                      className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[14px]">send</span>
                      <span>Gửi Shop</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }}
        emptyTitle="Không Có Yêu Cầu Đổi Trả Nào"
        emptyMessage="Không tìm thấy yêu cầu đổi trả phù hợp với bộ lọc hiện tại."
        emptyIcon="inbox"
        pagination={{
          currentPage,
          totalPages,
          totalItems: filteredItems.length,
          pageSize,
          onPageChange: setCurrentPage,
          itemLabel: 'yêu cầu đổi trả',
        }}
      />

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
