'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { orderApi, ReturnRequestData } from '@/ui/api/orderApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import GroupedDataTable, { Column } from '@/ui/components/common/GroupedDataTable';
import { playSellerOrderChimeSound } from '@/ui/utils/chatSound';
import {
  SellerStatusBadge,
  SellerFilterTabs,
  SellerPagination,
  SellerTableContainer,
  SellerActionButton,
} from '@/ui/components/seller/SellerUI';
import {
  DataTableFilterBar,
  DateFilterValue,
  matchesDateFilter,
  BulkActionGroup,
  StatusTab,
} from '@/ui/components/common';

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'ALL_TIME' });
  const [bulkLoading, setBulkLoading] = useState(false);
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

  // Lắng nghe cập nhật khiếu nại & phán quyết trọng tài realtime
  useEffect(() => {
    const unsub = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'RETURN_REQUESTED' || msg.type === 'RETURN_FORWARDED') {
        fetchReturns();
        playSellerOrderChimeSound();
        showToast('Có yêu cầu đổi trả / hoàn tiền mới từ khách hàng!', 'warning');
      } else if (msg.type === 'DISPUTE_ARBITRATED') {
        fetchReturns();
        const payload: any = msg.payload || {};
        const isSellerWin = payload.ruling === 'SELLER_WINS';
        playSellerOrderChimeSound();
        showToast(
          `Phán quyết trọng tài sàn HUKI: ${isSellerWin ? 'Người bán thắng kiện' : 'Người mua thắng kiện'}`,
          isSellerWin ? 'success' : 'error'
        );
      } else if (
        msg.type === 'RETURN_SELLER_ACCEPTED' ||
        msg.type === 'RETURN_SELLER_DISPUTED' ||
        msg.type === 'RETURN_REPLACEMENT_SHIPPED'
      ) {
        fetchReturns();
      }
    }, { role: 'SELLER' });
    return () => unsub();
  }, [fetchReturns, showToast]);

  const filteredReturns = useMemo(() => {
    return returns.filter((it) => {
      if (activeTab === 'RESOLVED') {
        const isResolved =
          it.status === 'COMPLETED' ||
          it.status === 'ARBITRATED_BUYER_WINS' ||
          it.status === 'ARBITRATED_SELLER_WINS';
        if (!isResolved) return false;
      } else if (activeTab !== 'ALL' && it.status !== activeTab) {
        return false;
      }

      // Multi-tier Date filter
      if (!matchesDateFilter(it.createdAt, dateFilter)) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const code = (it.order?.code || it.orderId || '').toLowerCase();
      const title = (it.orderItem?.title || '').toLowerCase();
      const customer = (it.user?.fullName || it.user?.name || '').toLowerCase();

      return code.includes(q) || title.includes(q) || customer.includes(q);
    });
  }, [returns, activeTab, searchQuery, dateFilter]);

  const totalItems = filteredReturns.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);

  const paginatedReturns = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredReturns.slice(start, start + pageSize);
  }, [filteredReturns, validPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, dateFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredReturns.length && filteredReturns.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReturns.map((it) => it.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const returnStatusTabs: StatusTab[] = useMemo(() => {
    const forwardCount = returns.filter((it) => it.status === 'FORWARDED_TO_SELLER').length;
    const acceptedCount = returns.filter((it) => it.status === 'SELLER_ACCEPTED').length;
    const disputedCount = returns.filter((it) => it.status === 'SELLER_DISPUTED').length;
    const resolvedCount = returns.filter(
      (it) =>
        it.status === 'COMPLETED' ||
        it.status === 'ARBITRATED_BUYER_WINS' ||
        it.status === 'ARBITRATED_SELLER_WINS'
    ).length;

    return [
      { key: 'ALL', label: 'Tất Cả', count: returns.length },
      { key: 'FORWARDED_TO_SELLER', label: 'Cần Xử Lý', count: forwardCount },
      { key: 'SELLER_ACCEPTED', label: 'Đã Đồng Ý', count: acceptedCount },
      { key: 'SELLER_DISPUTED', label: 'Đã Phản Biện', count: disputedCount },
      { key: 'RESOLVED', label: 'Đã Giải Quyết', count: resolvedCount },
    ];
  }, [returns]);

  const returnBulkActionGroups: BulkActionGroup[] = [
    {
      groupLabel: 'Tiến trình xử lý',
      actions: [
        {
          value: 'ACCEPT_ALL',
          label: 'Chấp thuận đổi trả hàng loạt',
          confirmMessage: 'Bạn có chắc chắn muốn chấp nhận hàng loạt các yêu cầu đổi trả đã chọn không?',
        },
      ],
    },
    {
      groupLabel: 'In ấn & xuất file',
      actions: [
        { value: 'EXPORT_CSV', label: 'Xuất danh sách yêu cầu (.csv)' },
      ],
    },
  ];

  const handleExecuteBulkAction = async (actionValue: string) => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      if (actionValue === 'ACCEPT_ALL') {
        const actionable = returns.filter(
          (it) => selectedIds.includes(it.id) && it.status === 'FORWARDED_TO_SELLER'
        );
        if (actionable.length === 0) {
          showToast('Không có yêu cầu nào ở trạng thái "Cần Xử Lý" trong danh sách đã chọn.', 'warning');
          return;
        }
        let successCount = 0;
        for (const item of actionable) {
          const res = await orderApi.sellerAcceptReturnRequest(item.id);
          if (res.success) {
            successCount++;
            realtimeSyncBus.publish('RETURN_SELLER_ACCEPTED', { returnId: item.id });
          }
        }

        showToast(`Đã chấp thuận ${successCount}/${actionable.length} yêu cầu đổi trả!`, 'success');
        setSelectedIds([]);
        await fetchReturns();
      } else if (actionValue === 'EXPORT_CSV') {
        const selectedList = returns.filter((it) => selectedIds.includes(it.id));
        const header = ['Mã Yêu Cầu', 'Mã Đơn', 'Trạng Thái', 'Lý Do', 'Sản Phẩm', 'Khách Hàng', 'Ngày Tạo'];
        const rows = selectedList.map((it) => [
          it.id,
          it.order?.code || it.orderId || '',
          it.status,
          it.reason || '',
          it.orderItem?.title || '',
          it.user?.fullName || it.user?.name || '',
          it.createdAt ? new Date(it.createdAt).toLocaleString('vi-VN') : '',
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [header.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `danh_sach_doi_tra_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Đã xuất ${selectedList.length} yêu cầu sang CSV!`, 'success');
      }
    } catch {
      showToast('Lỗi khi thực hiện thao tác hàng loạt', 'error');
    } finally {
      setBulkLoading(false);
    }
  };


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


  const returnColumns: Column<ReturnRequestData>[] = useMemo(
    () => [
      {
        key: 'orderCode',
        title: 'Mã Đơn & Ngày Nộp',
        width: 175,
        render: (_val, item) => (
          <div className="py-1">
            <span className="font-mono font-bold text-slate-900 block text-xs">
              #{item.order?.code || item.orderId}
            </span>
            <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—'}
            </span>
          </div>
        ),
      },
      {
        key: 'product',
        title: 'Sản Phẩm & Phân Loại',
        minWidth: 220,
        render: (_val, item) => {
          const bookTitle = item.orderItem?.title || 'Sản phẩm';
          return (
            <div className="py-1 flex flex-col gap-0.5 text-xs">
              <span className="font-medium text-slate-900 block break-words line-clamp-2 leading-snug" title={bookTitle}>
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
              </div>
            </div>
          );
        },
      },
      {
        key: 'customer',
        title: 'Khách Hàng & Lý Do',
        minWidth: 200,
        render: (_val, item) => {
          const userName = item.user?.fullName || item.user?.name || item.userId;
          const reasonLabel = getReasonLabel(item.reason);
          return (
            <div className="py-1 flex flex-col gap-0.5 text-xs">
              <span className="font-semibold text-slate-800 block break-words line-clamp-1">
                {userName}
              </span>
              <span className="text-[11px] text-slate-500 block break-words line-clamp-2 leading-snug" title={item.reasonDetail || reasonLabel}>
                {reasonLabel}
              </span>
            </div>
          );
        },
      },
      {
        key: 'status',
        title: 'Trạng Thái',
        width: 140,
        align: 'center',
        render: (_val, item) => <SellerStatusBadge status={item.status} />,
      },
      {
        key: 'actions',
        title: 'Thao Tác',
        width: 120,
        align: 'right',
        render: (_val, item) => (
          <div className="flex items-center justify-end gap-1.5">
            <Link href={`/seller/returns/${item.id}`}>
              <SellerActionButton
                variant="view"
                label="Chi tiết"
                icon="visibility"
                size="sm"
              />
            </Link>
          </div>
        ),
      },
    ],
    []
  );

  const renderExpandedReturnDetail = (item: ReturnRequestData) => {
    const orderCode = item.order?.code || item.orderId;
    const bookTitle = item.orderItem?.title || 'Sản phẩm';
    const userName = item.user?.fullName || item.user?.name || item.userId;
    const reasonLabel = getReasonLabel(item.reason);

    return (
      <div className="flex flex-col gap-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Thông Tin Đơn & Sản Phẩm */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#00875A]">inventory_2</span>
              <span>Thông Tin Đơn & Sản Phẩm</span>
            </div>
            <div className="space-y-1.5 text-[11.5px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã đơn hàng:</span>
                <span className="font-mono font-semibold text-slate-900">#{orderCode}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500 shrink-0">Sản phẩm:</span>
                <span className="font-medium text-slate-900 text-right break-words line-clamp-2 leading-snug">{bookTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hình thức yêu cầu:</span>
                <span className="font-semibold text-slate-800">
                  {item.type === 'REFUND' ? 'Hoàn tiền lại' : 'Đổi sản phẩm mới'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Khách Hàng & Lý Do Chi Tiết */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">
              <span className="material-symbols-outlined text-[15px] text-amber-600">contact_support</span>
              <span>Khách Hàng & Lý Do</span>
            </div>
            <div className="space-y-1.5 text-[11.5px]">
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
                <p className="bg-white p-2 rounded-lg text-slate-700 text-[11.5px] border border-slate-200 leading-relaxed">
                  {item.reasonDetail || 'Không có mô tả chi tiết thêm.'}
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Trạng Thái & Xử Lý */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">
                <span className="material-symbols-outlined text-[15px] text-emerald-600">gavel</span>
                <span>Trạng Thái & Xử Lý</span>
              </div>
              <div className="space-y-1.5 text-[11.5px] mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Trạng thái:</span>
                  <SellerStatusBadge status={item.status} />
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Mở trang chi tiết để xem toàn bộ ảnh bằng chứng và đối thoại trực tiếp với khách hàng hoặc trọng tài.
                </p>
              </div>
            </div>
            <div className="pt-2">
              <Link href={`/seller/returns/${item.id}`} className="w-full block">
                <button
                  type="button"
                  className="w-full py-2 px-3 bg-[#00875A] hover:bg-[#00704A] text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                  <span>Mở Trang Xử Lý Yêu Cầu</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
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

      {/* 2. Filter Bar with Status Tabs & Multi-tier Date Filter & Bulk Actions */}
      <DataTableFilterBar
        tabs={returnStatusTabs}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setCurrentPage(1);
        }}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm mã đơn, tên sách, người mua..."
        className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs"
        bulkActionGroups={returnBulkActionGroups}
        selectedCount={selectedIds.length}
        totalCount={filteredReturns.length}
        onExecuteBulkAction={handleExecuteBulkAction}
        onClearSelection={() => setSelectedIds([])}
        bulkLoading={bulkLoading}
        itemName="yêu cầu đổi trả"
      />

      {/* 3. Bảng Dữ Liệu Chuẩn Hóa GroupedDataTable */}
      <GroupedDataTable<ReturnRequestData>
        columns={returnColumns}
        data={paginatedReturns}
        keyField="id"
        loading={loading}
        selectable={true}
        selectedRowKeys={selectedIds}
        onSelectionChange={(keys) => setSelectedIds(keys as string[])}
        expandable={true}
        expandedRowRender={renderExpandedReturnDetail}
        emptyTitle="Không có yêu cầu đổi trả nào"
        emptyMessage={
          searchQuery
            ? `Không tìm thấy yêu cầu nào trùng khớp với từ khóa "${searchQuery}"`
            : 'Tất cả đơn hàng của bạn đang vận hành ổn định.'
        }
        emptyIcon="inbox"
        pagination={{
          currentPage,
          totalPages: Math.max(1, Math.ceil(filteredReturns.length / pageSize)),
          totalItems: filteredReturns.length,
          pageSize: 10,
          onPageChange: setCurrentPage,
          itemLabel: 'yêu cầu đổi trả',
        }}
        className="w-full"
      />
    </div>
  );
}

