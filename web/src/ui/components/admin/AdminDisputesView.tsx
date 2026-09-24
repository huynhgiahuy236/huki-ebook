"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi, type DisputeItem, type DisputeDetailData, type ArbitrationRuling } from '@/ui/api/adminApi';
import { useToast } from '@/ui/context/ToastContext';
import { useSmartFormCollapse } from '@/ui/utils/formHooks';
import { AdminStatusBadge, AdminFilterTabs, AdminPagination, AdminTableContainer } from './AdminUI';

const DISPUTE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  NOT_AS_DESCRIBED: { label: 'Sai mô tả', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  DAMAGED: { label: 'Hư hỏng / Rách vỡ', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  WRONG_PRODUCT: { label: 'Giao sai sản phẩm', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  NOT_RECEIVED: { label: 'Chưa nhận được hàng', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  COUNTERFEIT: { label: 'Nghi vấn sách giả', color: 'bg-red-100 text-red-800 border-red-200' },
  OTHER: { label: 'Khác', color: 'bg-gray-100 text-gray-800 border-gray-200' },
};

const RULING_LABELS: Record<string, { label: string; badge: string; desc: string }> = {
  BUYER_WINS: {
    label: 'Người mua thắng (Hoàn tiền 100%)',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    desc: 'Chấp nhận yêu cầu khiếu nại. Sàn giải ngân 100% Escrow hoàn tiền cho người mua.',
  },
  SELLER_WINS: {
    label: 'Người bán thắng (Bác khiếu nại)',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    desc: 'Bác yêu cầu khiếu nại của người mua. Sàn kích hoạt giải ngân Escrow cho người bán.',
  },
  PARTIAL_SETTLEMENT: {
    label: 'Hòa giải / Hoàn tiền một phần',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    desc: 'Chia tiền Escrow theo tỷ lệ phán quyết (khách nhận % hoàn, phần còn lại chuyển cho người bán).',
  },
  CARRIER_AT_FAULT: {
    label: 'Lỗi đơn vị vận chuyển',
    badge: 'bg-orange-100 text-orange-800 border-orange-300',
    desc: 'Hàng hóa bị tổn thất trong quá trình vận chuyển. Kích hoạt bồi thường bảo hiểm vận chuyển.',
  },
  REQUEST_MORE_INFO: {
    label: 'Yêu cầu thêm chứng cứ đối chất',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    desc: 'Yêu cầu người mua hoặc người bán bổ sung thêm video mở hộp hoặc chứng từ trong 72h.',
  },
};

export function AdminDisputesView() {
  const { showToast } = useToast();
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<DisputeDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Arbitration form state
  const [selectedRuling, setSelectedRuling] = useState<ArbitrationRuling>('BUYER_WINS');
  const [rulingNotes, setRulingNotes] = useState('');
  const [rulingNotesError, setRulingNotesError] = useState('');
  const [refundPercentage, setRefundPercentage] = useState<number>(50);
  const [submittingRuling, setSubmittingRuling] = useState(false);

  const isRulingDirty = Boolean(rulingNotes.trim());
  const disputePanelRef = useSmartFormCollapse({
    isOpen: Boolean(selectedDispute),
    onClose: () => {
      setSelectedDispute(null);
      setRulingNotes('');
      setRulingNotesError('');
    },
    isDirty: isRulingDirty,
  });

  const fetchDisputes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getDisputes({
        status: filterStatus === 'ALL' ? undefined : filterStatus,
        type: filterType === 'ALL' ? undefined : filterType,
        search: searchQuery.trim() || undefined,
      });

      if (res && res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data as any).data || [];
        setDisputes(list);
      } else {
        setDisputes([]);
      }
    } catch (err: any) {
      showToast(err?.message || 'Không thể tải danh sách tranh chấp', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, searchQuery, showToast]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const handleOpenDetail = async (disputeId: string) => {
    try {
      setLoadingDetail(true);
      setSelectedDispute(null);
      setRulingNotes('');
      setSelectedRuling('BUYER_WINS');
      setRefundPercentage(50);

      const res = await adminApi.getDisputeDetail(disputeId);
      if (res && res.success && res.data) {
        setSelectedDispute(res.data);
      } else {
        showToast('Không thể tải chi tiết hồ sơ tranh chấp', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi tải chi tiết hồ sơ', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleArbitrate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) return;

    if (!rulingNotes.trim()) {
      setRulingNotesError('Vui lòng nhập căn cứ pháp lý & ghi chú thẩm định đối soát.');
      return;
    }

    if (rulingNotes.trim().length < 10) {
      setRulingNotesError('Căn cứ phán quyết phải có tối thiểu 10 ký tự giải trình.');
      return;
    }

    if (selectedRuling === 'PARTIAL_SETTLEMENT') {
      if (refundPercentage <= 0 || refundPercentage >= 100) {
        showToast('Tỷ lệ hoàn tiền phải nằm trong khoảng từ 1% đến 99%', 'error');
        return;
      }
    }

    try {
      setSubmittingRuling(true);
      const res = await adminApi.arbitrateDispute(selectedDispute.disputeId, {
        ruling: selectedRuling,
        notes: rulingNotes.trim(),
        refundPercentage: selectedRuling === 'PARTIAL_SETTLEMENT' ? refundPercentage : undefined,
        targetSellerOrderId: selectedDispute.sellerOrderId || undefined,
      });

      if (res && res.success) {
        showToast('Ban hành phán quyết trọng tài thành công!', 'success');
        setRulingNotesError('');
        await handleOpenDetail(selectedDispute.disputeId);
        fetchDisputes();
      } else {
        showToast((res as any)?.message || 'Không thể ghi nhận phán quyết', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi ban hành phán quyết trọng tài', 'error');
    } finally {
      setSubmittingRuling(false);
    }
  };

  // Metrics
  const totalCount = disputes.length;
  const pendingCount = useMemo(() => disputes.filter((d) => d.status === 'DISPUTE_OPENED' || d.status === 'UNDER_PLATFORM_REVIEW').length, [disputes]);
  const buyerWinsCount = useMemo(() => disputes.filter((d) => d.status === 'RULING_BUYER_WINS' || d.ruling === 'BUYER_WINS').length, [disputes]);
  const sellerWinsCount = useMemo(() => disputes.filter((d) => d.status === 'RULING_SELLER_WINS' || d.ruling === 'SELLER_WINS').length, [disputes]);

  const totalPages = Math.ceil(disputes.length / pageSize) || 1;
  const paginatedDisputes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return disputes.slice(start, start + pageSize);
  }, [disputes, currentPage, pageSize]);

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-editorial">
              Trọng Tài Khiếu Nại &amp; Tranh Chấp
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Thẩm định chứng cứ, ban hành phán quyết trọng tài và giải ngân Escrow</p>
        </div>
        <button
          onClick={fetchDisputes}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs cursor-pointer"
        >
          <span className={`material-symbols-outlined text-[15px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          <span>Làm Mới</span>
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs">
          <div className="text-xs font-semibold text-gray-500">Tổng Hồ Sơ</div>
          <div className="text-xl font-extrabold text-gray-900 mt-1">{totalCount}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Tất cả khiếu nại đã mở</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs">
          <div className="text-xs font-semibold text-amber-700">Chờ Sàn Phân Xử</div>
          <div className="text-xl font-extrabold text-amber-600 mt-1">{pendingCount}</div>
          <div className="text-[11px] text-amber-700 mt-0.5">Thời hạn SLA: 48h làm việc</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs">
          <div className="text-xs font-semibold text-emerald-700">Người Mua Thắng</div>
          <div className="text-xl font-extrabold text-[#00875A] mt-1">{buyerWinsCount}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Đã ra lệnh hoàn tiền</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs">
          <div className="text-xs font-semibold text-blue-700">Người Bán Thắng</div>
          <div className="text-xl font-extrabold text-blue-600 mt-1">{sellerWinsCount}</div>
          <div className="text-[11px] text-blue-600 mt-0.5">Đã giải ngân Escrow</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <AdminFilterTabs
          tabs={[
            { key: 'ALL', label: 'Tất cả', count: totalCount },
            { key: 'DISPUTE_OPENED', label: 'Chờ xử lý', count: pendingCount },
            { key: 'RULING_BUYER_WINS', label: 'Khách thắng', count: buyerWinsCount },
            { key: 'RULING_SELLER_WINS', label: 'Shop thắng', count: sellerWinsCount },
          ]}
          activeTab={filterStatus}
          onChange={(tab) => {
            setFilterStatus(tab);
            setCurrentPage(1);
          }}
        />

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1.5 focus:border-[#00875A] focus:outline-none text-gray-700"
          >
            <option value="ALL">Tất cả phân loại</option>
            <option value="DAMAGED">Hư hỏng / Rách vỡ</option>
            <option value="WRONG_PRODUCT">Giao sai sản phẩm</option>
            <option value="NOT_AS_DESCRIBED">Sai mô tả</option>
            <option value="NOT_RECEIVED">Chưa nhận hàng</option>
            <option value="COUNTERFEIT">Nghi vấn sách giả</option>
            <option value="OTHER">Khác</option>
          </select>

          <div className="relative w-full md:w-60">
            <span className="material-symbols-outlined text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px]">search</span>
            <input
              type="text"
              placeholder="Mã đơn, ID tranh chấp..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-8 pr-3 py-1.5 focus:border-[#00875A] focus:outline-none text-gray-800 placeholder:text-gray-400 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Dispute Table Container */}
      <AdminTableContainer>
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-xl"></div>
            ))}
          </div>
        ) : disputes.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-gray-500 text-xs">
            <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">gavel</span>
            </div>
            <div>
              <p className="font-bold text-gray-900">Không Có Hồ Sơ Khiếu Nại Nào</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Không tìm thấy khiếu nại phù hợp với bộ lọc hiện tại.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1450px]">
              <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap w-12 text-center">STT</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Mã Đơn Hàng</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Tên Sản Phẩm</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Cửa Hàng / Shop</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Khách Hàng</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-right">Giá Trị Đơn</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">Phân Loại</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Mô Tả Vấn Đề</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">Giải Pháp</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">Bằng Chứng</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">Trạng Thái / Phán Quyết</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Ngày Mở</th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedDisputes.map((item, idx) => {
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                  const typeMeta = DISPUTE_TYPE_LABELS[item.type] || DISPUTE_TYPE_LABELS.OTHER;
                  const isPending = item.status === 'DISPUTE_OPENED' || item.status === 'UNDER_PLATFORM_REVIEW';
                  const rulingKey = item.ruling || item.status.replace('RULING_', '');
                  const rulingMeta = RULING_LABELS[rulingKey];

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'} hover:bg-emerald-50/40`}
                    >
                      {/* 1. STT */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center font-mono text-[11px] text-gray-400">
                        {itemIndex}
                      </td>

                      {/* 2. Mã Đơn Hàng */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono font-bold text-gray-900">
                        #{item.orderCode}
                      </td>

                      {/* 3. Tên Sản Phẩm */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-semibold text-gray-900 max-w-[200px] truncate" title={item.bookTitle || ''}>
                        {item.bookTitle ? `📚 ${item.bookTitle}` : '—'}
                      </td>

                      {/* 4. Cửa Hàng */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-gray-700 font-medium max-w-[150px] truncate" title={item.storeName || ''}>
                        {item.storeName || 'Shop'}
                      </td>

                      {/* 5. Khách Hàng */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-gray-700 font-mono text-[11px] max-w-[140px] truncate" title={item.customerName || ''}>
                        {item.customerName || 'Khách'}
                      </td>

                      {/* 6. Giá Trị Đơn */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-right font-bold text-[#00875A] font-mono">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.grandTotal)}
                      </td>

                      {/* 7. Phân Loại */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeMeta.color}`}>
                          {typeMeta.label}
                        </span>
                      </td>

                      {/* 8. Mô Tả Vấn Đề */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-gray-600 text-[11px] max-w-[180px] truncate" title={item.description}>
                        {item.description}
                      </td>

                      {/* 9. Giải Pháp Mong Muốn */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center font-bold text-gray-800 text-[11px]">
                        {item.resolution === 'REFUND' ? 'Hoàn tiền' : item.resolution === 'REPLACE' ? 'Đổi hàng' : 'Hoàn 1 phần'}
                      </td>

                      {/* 10. Bằng Chứng */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10.5px] font-bold">
                          <span className="material-symbols-outlined text-[13px]">attach_file</span>
                          <span>{item.evidence?.length || 0} tệp</span>
                        </div>
                      </td>

                      {/* 11. Trạng Thái / Phán Quyết */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        {isPending ? (
                          <AdminStatusBadge status="warning" label="Chờ Sàn Phân Xử" icon="hourglass_top" />
                        ) : rulingMeta ? (
                          <AdminStatusBadge
                            status={
                              rulingKey === 'BUYER_WINS'
                                ? 'success'
                                : rulingKey === 'SELLER_WINS'
                                ? 'info'
                                : rulingKey === 'PARTIAL_SETTLEMENT'
                                ? 'purple'
                                : 'warning'
                            }
                            label={rulingMeta.label.split('(')[0].trim()}
                          />
                        ) : (
                          <AdminStatusBadge status="neutral" label={item.status} />
                        )}
                      </td>

                      {/* 12. Ngày Mở */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-gray-500 text-[11px]">
                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                      </td>

                      {/* 13. Thao Tác */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleOpenDetail(item.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#00875A] hover:bg-[#00734c] text-white rounded-lg text-[11px] font-bold transition shadow-2xs cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[13px]">visibility</span>
                          <span>Thẩm định</span>
                        </button>
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
          totalItems={disputes.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="hồ sơ khiếu nại"
        />
      </AdminTableContainer>

      {/* Dispute Detail & Arbitration In-Page Panel */}
      {(selectedDispute || loadingDetail) && (
        <div
          ref={disputePanelRef}
          className="mt-4 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300"
        >
          {/* Panel Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#00875A] flex items-center justify-center font-bold border border-emerald-200">
                <span className="material-symbols-outlined text-[18px]">balance</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Hồ Sơ Trọng Tài Khiếu Nại — {selectedDispute?.orderCode || '...'}
                </h2>
                <p className="text-xs text-gray-500">Mã tranh chấp: #{selectedDispute?.disputeId}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedDispute(null);
                setRulingNotes('');
                setRulingNotesError('');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
            >
              Đóng bảng
            </button>
          </div>

          {/* Panel Body */}
          <div className="p-6 space-y-5">
            {loadingDetail ? (
              <div className="py-16 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#00875A] border-t-transparent"></div>
                <p className="text-xs text-gray-500 mt-2">Đang tải chi tiết hồ sơ đối soát...</p>
              </div>
            ) : selectedDispute ? (
              <>
                {/* Status Banner */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  selectedDispute.isFinalized
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/80 border-amber-200 text-amber-900'
                }`}>
                  <span className="material-symbols-outlined text-xl shrink-0 mt-0.5">
                    {selectedDispute.isFinalized ? 'verified' : 'hourglass_top'}
                  </span>
                  <div>
                    <div className="font-bold text-xs">
                      {selectedDispute.isFinalized
                        ? `ĐÃ CÓ PHÁN QUYẾT TRỌNG TÀI: ${RULING_LABELS[selectedDispute.ruling || '']?.label || selectedDispute.currentStatus}`
                        : 'ĐANG CHỜ PHÁN QUYẾT TRỌNG TÀI CỦA SÀN (POL-12)'}
                    </div>
                    <p className="text-[11px] mt-0.5 opacity-90">
                      {selectedDispute.isFinalized
                        ? `Phán quyết đã ban hành lúc ${new Date(selectedDispute.resolvedAt || '').toLocaleString('vi-VN')} bởi ${selectedDispute.adminEmail || 'Platform Admin'}.`
                        : 'Căn cứ vào video mở hộp và chứng từ giao nhận, Platform Admin có toàn quyền quyết định phân bổ nguồn tiền Escrow theo điều lệ DSP-002.'}
                    </p>
                    {selectedDispute.rulingNotes && (
                      <div className="mt-2 p-2.5 bg-white/80 rounded-lg text-xs font-mono border border-emerald-200/50">
                        <strong>Căn cứ phán quyết:</strong> {selectedDispute.rulingNotes}
                        {selectedDispute.refundPercentage && (
                          <div className="mt-1 font-semibold text-purple-700">
                            Tỷ lệ hoàn tiền: {selectedDispute.refundPercentage}% cho người mua / {100 - selectedDispute.refundPercentage}% cho người bán
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Product & Store info */}
                {(selectedDispute.bookTitle || selectedDispute.storeName) && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
                    <div className="flex items-center gap-3">
                      {selectedDispute.bookCoverUrl ? (
                        <img
                          src={selectedDispute.bookCoverUrl}
                          alt={selectedDispute.bookTitle || 'Book cover'}
                          className="w-12 h-16 object-cover rounded-lg border border-gray-200 shadow-2xs"
                        />
                      ) : (
                        <div className="w-12 h-16 bg-emerald-50 rounded-lg flex items-center justify-center text-[#00875A]">
                          <span className="material-symbols-outlined text-2xl">menu_book</span>
                        </div>
                      )}
                      <div>
                        <div className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">Sản Phẩm Tranh Chấp</div>
                        <div className="text-sm font-bold text-gray-900">{selectedDispute.bookTitle || 'Sách'}</div>
                        <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-2">
                          <span>Gian hàng: <strong className="text-gray-700">{selectedDispute.storeName || selectedDispute.targetSellerOrder?.storeId || 'Shop'}</strong></span>
                          <span>•</span>
                          <span>Khách hàng: <strong className="text-gray-700">{selectedDispute.customerName || selectedDispute.buyerId || 'N/A'}</strong></span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white text-gray-800 border border-gray-200 shadow-2xs">
                        {selectedDispute.resolution === 'REFUND' ? 'Hình thức: Hoàn tiền 100%' : 'Hình thức: Đổi hàng mới (0đ)'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Arbitration form if not finalized */}
                {!selectedDispute.isFinalized && (
                  <form onSubmit={handleArbitrate} className="space-y-4 pt-2 border-t border-gray-200">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-900 block">
                        Chọn Phán Quyết Trọng Tài <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {Object.entries(RULING_LABELS).map(([key, meta]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedRuling(key as ArbitrationRuling)}
                            className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                              selectedRuling === key
                                ? 'border-[#00875A] bg-emerald-50/60 ring-2 ring-[#00875A] font-bold text-gray-900'
                                : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <div className="font-bold text-xs">{meta.label}</div>
                            <div className="text-[10.5px] text-gray-500 mt-0.5 font-normal">{meta.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedRuling === 'PARTIAL_SETTLEMENT' && (
                      <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-2 text-xs">
                        <label className="font-bold text-purple-900 block">
                          Tỷ lệ hoàn tiền cho người mua: {refundPercentage}% (Người bán nhận {100 - refundPercentage}%)
                        </label>
                        <input
                          type="range"
                          min={1}
                          max={99}
                          value={refundPercentage}
                          onChange={(e) => setRefundPercentage(Number(e.target.value))}
                          className="w-full accent-purple-600"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 block">
                        Căn Cứ Pháp Lý &amp; Ghi Chú Thẩm Định <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={rulingNotes}
                        onChange={(e) => {
                          setRulingNotes(e.target.value);
                          if (rulingNotesError) setRulingNotesError('');
                        }}
                        placeholder="Nhập căn cứ chứng cứ, đối soát video unbox hoặc kết luận thẩm định..."
                        className={`w-full p-3 rounded-xl border text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none transition-all ${
                          rulingNotesError ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30' : 'border-gray-300 focus:border-[#00875A]'
                        }`}
                      />
                      {rulingNotesError && (
                        <p className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium animate-in fade-in">
                          <span className="material-symbols-outlined text-[14px]">error</span>
                          <span>{rulingNotesError}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDispute(null)}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-xs cursor-pointer"
                      >
                        Hủy Bỏ
                      </button>
                      <button
                        type="submit"
                        disabled={submittingRuling}
                        className="px-5 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {submittingRuling ? 'Đang Xử Lý...' : 'Ban Hành Phán Quyết'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
