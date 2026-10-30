'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { orderApi, ReturnRequestData } from '@/ui/api/orderApi';
import { useToast } from '@/ui/context/ToastContext';
import GroupedDataTable, { Column } from '@/ui/components/common/GroupedDataTable';
import {
  SellerTableContainer,
  SellerStatusBadge,
  SellerActionButton,
  SellerPagination,
} from '@/ui/components/seller/SellerUI';
import {
  DataTableFilterBar,
  DateFilterValue,
  matchesDateFilter,
  BulkActionGroup,
  StatusTab,
} from '@/ui/components/common';

export default function SellerReplacementOrdersPage() {
  const { showToast } = useToast();
  const [replacements, setReplacements] = useState<ReturnRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'ALL_TIME' });
  const [activeTab, setActiveTab] = useState('ALL');
  const [bulkLoading, setBulkLoading] = useState(false);
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
      // Tab filter
      if (activeTab === 'WAITING_SHIP' && it.replacementTrackingCode) return false;
      if (activeTab === 'SHIPPED' && !it.replacementTrackingCode) return false;

      // Date filter
      if (!matchesDateFilter(it.createdAt, dateFilter)) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const code = (it.order?.code || it.orderId || '').toLowerCase();
        const title = (it.orderItem?.title || '').toLowerCase();
        const customer = (it.user?.fullName || it.user?.name || '').toLowerCase();
        const track = (it.replacementTrackingCode || '').toLowerCase();
        if (!code.includes(q) && !title.includes(q) && !customer.includes(q) && !track.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [replacements, searchQuery, activeTab, dateFilter]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, dateFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((it) => it.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const replacementStatusTabs: StatusTab[] = useMemo(() => {
    const waitingCount = replacements.filter((it) => !it.replacementTrackingCode).length;
    const shippedCount = replacements.filter((it) => !!it.replacementTrackingCode).length;
    return [
      { key: 'ALL', label: 'Tất Cả', count: replacements.length },
      { key: 'WAITING_SHIP', label: 'Chờ Giao Kiện Đổi', count: waitingCount },
      { key: 'SHIPPED', label: 'Đã Bàn Giao', count: shippedCount },
    ];
  }, [replacements]);

  const replacementBulkActionGroups: BulkActionGroup[] = [
    {
      groupLabel: 'In ấn & xuất file',
      actions: [
        { value: 'PRINT_LABELS', label: 'In phiếu đổi hàng (A4/A5)' },
        { value: 'EXPORT_CSV', label: 'Xuất danh sách kiện đổi (.csv)' },
      ],
    },
  ];

  const handleExecuteBulkAction = async (actionValue: string) => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      if (actionValue === 'PRINT_LABELS') {
        showToast({ title: 'In ấn', message: `Đang mở trình in cho ${selectedIds.length} kiện đổi mới...` }, 'info');
        if (typeof window !== 'undefined') {
          window.print();
        }
      } else if (actionValue === 'EXPORT_CSV') {
        const selectedList = replacements.filter((it) => selectedIds.includes(it.id));
        const header = ['Mã Yêu Cầu', 'Mã Đơn Gốc', 'Sản Phẩm Đổi', 'Khách Hàng', 'Đơn Vị Vận Chuyển', 'Mã Vận Đơn', 'Ngày Tạo'];
        const rows = selectedList.map((it) => [
          it.id,
          it.order?.code || it.orderId || '',
          it.orderItem?.title || '',
          it.user?.fullName || it.user?.name || '',
          it.replacementCarrier || '',
          it.replacementTrackingCode || '',
          it.createdAt ? new Date(it.createdAt).toLocaleString('vi-VN') : '',
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [header.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `danh_sach_doi_moi_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast({ title: 'Thành công', message: `Đã xuất ${selectedList.length} kiện đổi hàng sang CSV!`, type: 'success' });
      }
    } catch {
      showToast({ title: 'Lỗi', message: 'Không thể thực thi thao tác hàng loạt', type: 'error' });
    } finally {
      setBulkLoading(false);
    }
  };

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };



  const replacementColumns: Column<ReturnRequestData>[] = useMemo(
    () => [
      {
        key: 'orderCode',
        title: 'Mã Đơn & Ngày Tạo',
        width: 175,
        render: (_val, item) => (
          <div className="py-1">
            <Link
              href={`/seller/orders/${item.orderId}`}
              className="font-mono text-xs font-bold text-slate-900 hover:text-[#00875A] transition-colors block"
            >
              #{item.order?.code || item.orderId}
            </Link>
            <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—'}
            </span>
          </div>
        ),
      },
      {
        key: 'product',
        title: 'Sản Phẩm Đổi',
        minWidth: 220,
        render: (_val, item) => {
          const bookTitle = item.orderItem?.title || 'Sách đổi bù';
          return (
            <div className="py-1 flex flex-col gap-0.5 text-xs">
              <span className="font-medium text-slate-900 block break-words line-clamp-2 leading-snug" title={bookTitle}>
                {bookTitle}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                  <span className="material-symbols-outlined text-[11px]">sync_alt</span>
                  <span>Hàng Đổi 0đ</span>
                </span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'customer',
        title: 'Khách Hàng & Vận Đơn',
        minWidth: 200,
        render: (_val, item) => {
          const userName = item.user?.fullName || item.user?.name || item.userId;
          return (
            <div className="py-1 flex flex-col gap-0.5 text-xs">
              <span className="font-semibold text-slate-800 block break-words line-clamp-1">
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
          );
        },
      },
      {
        key: 'status',
        title: 'Trạng Thái',
        width: 160,
        align: 'center',
        render: (_val, item) =>
          item.replacementTrackingCode ? (
            <SellerStatusBadge variant="info" dot text="Đang giao hàng đổi" />
          ) : (
            <SellerStatusBadge variant="warning" dot text="Chờ gửi hàng" />
          ),
      },
      {
        key: 'actions',
        title: 'Thao Tác',
        width: 170,
        align: 'right',
        render: (_val, item) => (
          <div className="flex items-center justify-end gap-1.5 flex-wrap">
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
        ),
      },
    ],
    []
  );

  const renderExpandedReplacementDetail = (item: ReturnRequestData) => {
    const orderCode = item.order?.code || item.orderId;
    const bookTitle = item.orderItem?.title || 'Sách đổi';
    const userName = item.user?.fullName || item.user?.name || item.userId;

    return (
      <div className="flex flex-col gap-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Thông tin đơn hàng & sản phẩm */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
              <span className="material-symbols-outlined text-[16px] text-[#00875A]">sync_alt</span>
              <span>Đơn Hàng Gốc & Sản Phẩm</span>
            </div>
            <div className="space-y-1.5 text-[11.5px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã đơn gốc:</span>
                <Link href={`/seller/orders/${item.orderId}`} className="font-mono font-bold text-emerald-700 hover:underline">
                  #{orderCode}
                </Link>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500 shrink-0">Tên ấn phẩm:</span>
                <span className="font-medium text-slate-900 text-right break-words line-clamp-2 leading-snug">{bookTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Giá trị đơn đổi:</span>
                <span className="font-bold text-emerald-600">0đ (Thỏa thuận đổi trả)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Thông tin vận chuyển kiện đổi */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
              <span className="material-symbols-outlined text-[16px] text-[#00875A]">local_shipping</span>
              <span>Vận Chuyển Kiện Hàng Đổi</span>
            </div>
            <div className="space-y-1.5 text-[11.5px]">
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
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">person</span>
                <span>Khách Hàng & Người Nhận</span>
              </div>
              <div className="space-y-1.5 text-[11.5px] mt-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Người nhận:</span>
                  <span className="font-bold text-slate-900">{userName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Thời gian tạo:</span>
                  <span className="font-mono text-slate-600">{item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—'}</span>
                </div>
              </div>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleOpenShipForm(item)}
                className="w-full py-2 px-3 bg-[#00875A] hover:bg-[#00704A] text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[15px]">local_shipping</span>
                <span>{item.replacementTrackingCode ? 'Chỉnh Sửa Vận Đơn' : 'Gửi Mã Vận Đơn Ngay'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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

      {/* Filter Bar with Status Tabs & Multi-tier Date Filter & Bulk Actions */}
      <DataTableFilterBar
        tabs={replacementStatusTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm mã đơn gốc, mã vận đơn, tên sách, khách hàng..."
        className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs"
        bulkActionGroups={replacementBulkActionGroups}
        selectedCount={selectedIds.length}
        totalCount={filteredItems.length}
        onExecuteBulkAction={handleExecuteBulkAction}
        onClearSelection={() => setSelectedIds([])}
        bulkLoading={bulkLoading}
        itemName="kiện đổi mới"
      />

      {/* Bảng Dữ Liệu Chuẩn Hóa GroupedDataTable */}
      <GroupedDataTable<ReturnRequestData>
        columns={replacementColumns}
        data={paginatedItems}
        keyField="id"
        loading={loading}
        selectable={true}
        selectedRowKeys={selectedIds}
        onSelectionChange={(keys) => setSelectedIds(keys as string[])}
        expandable={true}
        expandedRowRender={renderExpandedReplacementDetail}
        emptyTitle="Chưa có đơn hàng đổi mới nào"
        emptyMessage={
          searchQuery
            ? `Không tìm thấy đơn đổi nào trùng khớp với từ khóa "${searchQuery}"`
            : 'Hiện không có yêu cầu đổi hàng bù nào đang xử lý.'
        }
        emptyIcon="sync_alt"
        pagination={{
          currentPage,
          totalPages: Math.max(1, Math.ceil(filteredItems.length / pageSize)),
          totalItems: filteredItems.length,
          pageSize: 10,
          onPageChange: setCurrentPage,
          itemLabel: 'kiện đổi mới',
        }}
        className="w-full"
      />

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
