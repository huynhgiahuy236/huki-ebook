"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { adminApi, type DisputeItem, type DisputeDetailData, type ArbitrationRuling } from '@/ui/api/adminApi';
import { useToast } from '@/ui/context/ToastContext';

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

  // Arbitration form state
  const [selectedRuling, setSelectedRuling] = useState<ArbitrationRuling>('BUYER_WINS');
  const [rulingNotes, setRulingNotes] = useState('');
  const [refundPercentage, setRefundPercentage] = useState<number>(50);
  const [submittingRuling, setSubmittingRuling] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

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

    if (!rulingNotes.trim() || rulingNotes.trim().length < 10) {
      showToast('Vui lòng nhập căn cứ phán quyết chi tiết (tối thiểu 10 ký tự)', 'error');
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
  const pendingCount = disputes.filter((d) => d.status === 'DISPUTE_OPENED' || d.status === 'UNDER_PLATFORM_REVIEW').length;
  const buyerWinsCount = disputes.filter((d) => d.status === 'RULING_BUYER_WINS' || d.ruling === 'BUYER_WINS').length;
  const sellerWinsCount = disputes.filter((d) => d.status === 'RULING_SELLER_WINS' || d.ruling === 'SELLER_WINS').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-3xl">gavel</span>
            <h1 className="text-2xl font-bold text-gray-900">Trọng Tài Khiếu Nại & Tranh Chấp</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Cổng thẩm định chứng cứ đối chất và ban hành phán quyết trọng tài Escrow theo chính sách POL-12
          </p>
        </div>
        <button
          onClick={fetchDisputes}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm"
        >
          <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          Làm mới
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tổng Hồ Sơ</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</div>
          <div className="text-xs text-gray-400 mt-0.5">Tất cả khiếu nại đã mở</div>
        </div>
        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">Chờ Sàn Phân Xử</div>
          <div className="text-2xl font-bold text-amber-800 mt-1">{pendingCount}</div>
          <div className="text-xs text-amber-600 mt-0.5">Thời hạn SLA: 48h làm việc</div>
        </div>
        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Người Mua Thắng</div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{buyerWinsCount}</div>
          <div className="text-xs text-emerald-600 mt-0.5">Đã ra lệnh hoàn tiền</div>
        </div>
        <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-700">Người Bán Thắng</div>
          <div className="text-2xl font-bold text-blue-800 mt-1">{sellerWinsCount}</div>
          <div className="text-xs text-blue-600 mt-0.5">Đã giải ngân Escrow</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Trạng thái</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DISPUTE_OPENED">Chờ xử lý (Mới mở)</option>
              <option value="RULING_BUYER_WINS">Người mua thắng (Buyer Wins)</option>
              <option value="RULING_SELLER_WINS">Người bán thắng (Seller Wins)</option>
              <option value="RULING_PARTIAL_SETTLEMENT">Hòa giải / Một phần</option>
              <option value="RULING_CARRIER_AT_FAULT">Lỗi vận chuyển</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Loại khiếu nại</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="ALL">Tất cả phân loại</option>
              <option value="DAMAGED">Hư hỏng / Rách vỡ</option>
              <option value="WRONG_PRODUCT">Giao sai sản phẩm</option>
              <option value="NOT_AS_DESCRIBED">Sai mô tả</option>
              <option value="NOT_RECEIVED">Chưa nhận hàng</option>
              <option value="COUNTERFEIT">Nghi vấn sách giả</option>
              <option value="OTHER">Khác</option>
            </select>
          </div>
        </div>

        <div className="w-full md:w-80">
          <label className="text-xs font-medium text-gray-500 block mb-1">Tìm kiếm</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Mã đơn, ID tranh chấp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm bg-gray-50 border border-gray-300 rounded-lg pl-9 pr-3 py-1.5 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <span className="material-symbols-outlined text-gray-400 absolute left-2.5 top-2 text-[18px]">search</span>
          </div>
        </div>
      </div>

      {/* Dispute Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
            <p className="text-sm text-gray-500 mt-2">Đang tải hồ sơ khiếu nại...</p>
          </div>
        ) : disputes.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-gray-300 text-5xl">task_alt</span>
            <p className="text-base font-medium text-gray-700 mt-2">Không có hồ sơ khiếu nại nào</p>
            <p className="text-sm text-gray-400 mt-0.5">Không tìm thấy khiếu nại phù hợp với bộ lọc hiện tại</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700 min-w-[1000px]">
              <thead className="bg-gray-50/80 text-xs font-semibold uppercase text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap text-left">Mã Khiếu Nại / Đơn Hàng</th>
                  <th className="px-6 py-4 whitespace-nowrap text-left">Phân Loại</th>
                  <th className="px-6 py-4 whitespace-nowrap text-left">Mô Tả Vấn Đề</th>
                  <th className="px-6 py-4 whitespace-nowrap text-left">Giải Pháp Mong Muốn</th>
                  <th className="px-6 py-4 whitespace-nowrap text-center">Bằng Chứng</th>
                  <th className="px-6 py-4 whitespace-nowrap text-center">Trạng Thái / Phán Quyết</th>
                  <th className="px-6 py-4 whitespace-nowrap text-left">Ngày Mở</th>
                  <th className="px-6 py-4 whitespace-nowrap text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {disputes.map((item) => {
                  const typeMeta = DISPUTE_TYPE_LABELS[item.type] || DISPUTE_TYPE_LABELS.OTHER;
                  const isPending = item.status === 'DISPUTE_OPENED' || item.status === 'UNDER_PLATFORM_REVIEW';
                  const rulingKey = item.ruling || item.status.replace('RULING_', '');
                  const rulingMeta = RULING_LABELS[rulingKey];

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition group">
                      {/* Cột 1: Mã Khiếu Nại / Đơn Hàng - Cho phép xuống dòng */}
                      <td className="px-6 py-4 align-top">
                        <div className="font-semibold text-gray-900 font-mono text-sm">{item.orderCode}</div>
                        {item.bookTitle && (
                          <div className="text-xs font-medium text-emerald-700 truncate max-w-[220px] mt-0.5" title={item.bookTitle}>
                            📚 {item.bookTitle}
                          </div>
                        )}
                        <div className="text-xs text-gray-600 mt-1 font-semibold">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.grandTotal)}
                        </div>
                        {(item.storeName || item.customerName) && (
                          <div className="text-[11px] text-gray-400 mt-1 flex flex-wrap items-center gap-1.5">
                            {item.storeName && <span>Shop: <strong className="text-gray-600">{item.storeName}</strong></span>}
                            {item.customerName && <span>• Khách: <strong className="text-gray-600">{item.customerName}</strong></span>}
                          </div>
                        )}
                      </td>

                      {/* Cột 2: Phân Loại - không xuống dòng */}
                      <td className="px-6 py-4 whitespace-nowrap align-middle">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${typeMeta.color}`}>
                          {typeMeta.label}
                        </span>
                      </td>

                      {/* Cột 3: Mô Tả Vấn Đề - không xuống dòng */}
                      <td className="px-6 py-4 whitespace-nowrap max-w-sm truncate align-middle text-gray-700 text-sm" title={item.description}>
                        {item.description}
                      </td>

                      {/* Cột 4: Giải Pháp Mong Muốn - không xuống dòng */}
                      <td className="px-6 py-4 whitespace-nowrap align-middle">
                        <span className="font-medium text-gray-900">
                          {item.resolution === 'REFUND' ? 'Hoàn tiền' : item.resolution === 'REPLACE' ? 'Đổi hàng' : 'Hoàn 1 phần'}
                        </span>
                      </td>

                      {/* Cột 5: Bằng Chứng - không xuống dòng */}
                      <td className="px-6 py-4 whitespace-nowrap align-middle text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                          <span className="material-symbols-outlined text-[15px]">attach_file</span>
                          <span>{item.evidence?.length || 0} tệp</span>
                        </div>
                      </td>

                      {/* Cột 6: Trạng Thái / Phán Quyết - không xuống dòng */}
                      <td className="px-6 py-4 whitespace-nowrap align-middle text-center">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Chờ Sàn Phân Xử
                          </span>
                        ) : rulingMeta ? (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${rulingMeta.badge}`}>
                            {rulingMeta.label.split('(')[0].trim()}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {item.status}
                          </span>
                        )}
                      </td>

                      {/* Cột 7: Ngày Mở - không xuống dòng */}
                      <td className="px-6 py-4 whitespace-nowrap align-middle text-xs text-gray-500 font-medium">
                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                      </td>

                      {/* Cột 8: Thao Tác - không xuống dòng */}
                      <td className="px-6 py-4 whitespace-nowrap align-middle text-right">
                        <button
                          onClick={() => handleOpenDetail(item.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition shadow-sm hover:shadow active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          Thẩm định
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dispute Detail & Arbitration Modal */}
      {(selectedDispute || loadingDetail) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined">balance</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Hồ Sơ Trọng Tài Khiếu Nại — {selectedDispute?.orderCode || '...'}
                  </h2>
                  <p className="text-xs text-gray-500">Mã tranh chấp: {selectedDispute?.disputeId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDispute(null)}
                className="w-8 h-8 rounded-full bg-gray-200/70 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingDetail ? (
                <div className="py-20 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
                  <p className="text-sm text-gray-500 mt-2">Đang tải chi tiết hồ sơ đối soát...</p>
                </div>
              ) : selectedDispute ? (
                <>
                  {/* Status Banner */}
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                    selectedDispute.isFinalized
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50/80 border-amber-200 text-amber-900'
                  }`}>
                    <span className="material-symbols-outlined text-2xl shrink-0 mt-0.5">
                      {selectedDispute.isFinalized ? 'verified' : 'hourglass_top'}
                    </span>
                    <div>
                      <div className="font-bold text-sm">
                        {selectedDispute.isFinalized
                          ? `ĐÃ CÓ PHÁN QUYẾT TRỌNG TÀI: ${RULING_LABELS[selectedDispute.ruling || '']?.label || selectedDispute.currentStatus}`
                          : 'ĐANG CHỜ PHÁN QUYẾT TRỌNG TÀI CỦA SÀN (POL-12)'}
                      </div>
                      <p className="text-xs mt-1 opacity-90">
                        {selectedDispute.isFinalized
                          ? `Phán quyết đã ban hành lúc ${new Date(selectedDispute.resolvedAt || '').toLocaleString('vi-VN')} bởi ${selectedDispute.adminEmail || 'Platform Admin'}.`
                          : 'Căn cứ vào video mở hộp và chứng từ giao nhận, Platform Admin có toàn quyền quyết định phân bổ nguồn tiền Escrow theo điều lệ DSP-002.'}
                      </p>
                      {selectedDispute.rulingNotes && (
                        <div className="mt-2.5 p-2.5 bg-white/80 rounded-lg text-xs font-mono border border-emerald-200/50">
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

                  {/* Product & Store info (Flow Return v1 Support) */}
                  {(selectedDispute.bookTitle || selectedDispute.storeName) && (
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                      <div className="flex items-center gap-3">
                        {selectedDispute.bookCoverUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={selectedDispute.bookCoverUrl}
                            alt={selectedDispute.bookTitle || 'Book cover'}
                            className="w-12 h-16 object-cover rounded-lg border border-emerald-300 shadow-xs"
                          />
                        ) : (
                          <div className="w-12 h-16 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700">
                            <span className="material-symbols-outlined text-2xl">menu_book</span>
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Sản Phẩm Tranh Chấp</div>
                          <div className="text-base font-bold text-gray-900">{selectedDispute.bookTitle || 'Sách'}</div>
                          <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-3">
                            <span>Gian hàng: <strong className="text-gray-700">{selectedDispute.storeName || selectedDispute.targetSellerOrder?.storeId || 'Shop'}</strong></span>
                            <span>•</span>
                            <span>Khách hàng: <strong className="text-gray-700">{selectedDispute.customerName || selectedDispute.buyerId || 'N/A'}</strong></span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white text-emerald-800 border border-emerald-300 shadow-xs">
                          {selectedDispute.resolution === 'REFUND' ? 'Hình thức: Hoàn tiền 100%' : 'Hình thức: Đổi hàng mới (0đ)'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 2-Column Grid: Buyer Claim & Seller Counter-Evidence */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Buyer Claim */}
                    <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/80 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-900 border-b border-amber-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-amber-700">person</span>
                          Chứng Cứ Từ Người Mua
                        </div>
                        <span className="text-[11px] font-normal text-amber-700">
                          {selectedDispute.customerName ? `Khách: ${selectedDispute.customerName}` : ''}
                        </span>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-500">Lý do khiếu nại</div>
                        <div className="text-sm font-bold text-gray-900 mt-0.5">
                          {DISPUTE_TYPE_LABELS[selectedDispute.type]?.label || selectedDispute.type}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">Nội dung chi tiết từ khách hàng</div>
                        <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-amber-200/60 mt-1 whitespace-pre-wrap min-h-[60px]">
                          {selectedDispute.description || 'Không có mô tả chi tiết'}
                        </p>
                      </div>

                      {/* Customer Evidence (Images & Videos) */}
                      <div className="space-y-2 pt-1">
                        <div className="text-xs font-semibold text-gray-700">
                          Hình ảnh minh chứng của Khách ({selectedDispute.customerEvidence?.images?.length || selectedDispute.evidence?.length || 0})
                        </div>
                        {((selectedDispute.customerEvidence?.images && selectedDispute.customerEvidence.images.length > 0) || (selectedDispute.evidence && selectedDispute.evidence.length > 0)) ? (
                          <div className="grid grid-cols-3 gap-2">
                            {(selectedDispute.customerEvidence?.images || selectedDispute.evidence || []).map((url, idx) => (
                              <div
                                key={idx}
                                className="group relative rounded-lg border border-gray-200 overflow-hidden bg-gray-100 aspect-video flex items-center justify-center shadow-xs"
                              >
                                <button
                                  type="button"
                                  onClick={() => setZoomImage(url)}
                                  className="w-full h-full cursor-zoom-in"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={url}
                                    alt={`Buyer evidence ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                  />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic bg-white/60 p-2 rounded border border-gray-200">
                            Không có hình ảnh đính kèm
                          </div>
                        )}

                        {/* Customer Videos if any */}
                        {selectedDispute.customerEvidence?.videos && selectedDispute.customerEvidence.videos.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <div className="text-xs font-semibold text-gray-700">Video của Khách:</div>
                            <div className="space-y-1">
                              {selectedDispute.customerEvidence.videos.map((vidUrl, vIdx) => (
                                <video
                                  key={vIdx}
                                  controls
                                  className="w-full max-h-40 rounded-lg border border-gray-200 bg-black"
                                >
                                  <source src={vidUrl} />
                                  Trình duyệt không hỗ trợ xem video trực tiếp.
                                </video>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Seller Counter-Evidence */}
                    <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-200/80 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-blue-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-blue-700">storefront</span>
                          Chứng Cứ Phản Biện Từ Cửa Hàng
                        </div>
                        <span className="text-[11px] font-normal text-blue-700">
                          {selectedDispute.storeName ? `Shop: ${selectedDispute.storeName}` : ''}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">Mã đơn / Gói hàng</div>
                        <div className="text-sm font-semibold text-gray-800 font-mono mt-0.5">
                          {selectedDispute.targetSellerOrder?.code || selectedDispute.orderCode}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">Lý do phản biện & đối chất của Shop</div>
                        <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-blue-200/60 mt-1 whitespace-pre-wrap min-h-[60px]">
                          {selectedDispute.sellerEvidence?.note || 'Shop chưa gửi thêm ghi chú phản biện'}
                        </p>
                      </div>

                      {/* Seller Evidence (Images & Videos) */}
                      <div className="space-y-2 pt-1">
                        <div className="text-xs font-semibold text-gray-700">
                          Hình ảnh đối chất của Shop ({selectedDispute.sellerEvidence?.images?.length || 0})
                        </div>
                        {selectedDispute.sellerEvidence?.images && selectedDispute.sellerEvidence.images.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {selectedDispute.sellerEvidence.images.map((url, idx) => (
                              <div
                                key={idx}
                                className="group relative rounded-lg border border-gray-200 overflow-hidden bg-gray-100 aspect-video flex items-center justify-center shadow-xs"
                              >
                                <button
                                  type="button"
                                  onClick={() => setZoomImage(url)}
                                  className="w-full h-full cursor-zoom-in"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={url}
                                    alt={`Seller evidence ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                  />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic bg-white/60 p-2 rounded border border-gray-200">
                            Shop không đính kèm hình ảnh
                          </div>
                        )}

                        {/* Seller Videos if any */}
                        {selectedDispute.sellerEvidence?.videos && selectedDispute.sellerEvidence.videos.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <div className="text-xs font-semibold text-gray-700">Video đối chất của Shop:</div>
                            <div className="space-y-1">
                              {selectedDispute.sellerEvidence.videos.map((vidUrl, vIdx) => (
                                <video
                                  key={vIdx}
                                  controls
                                  className="w-full max-h-40 rounded-lg border border-gray-200 bg-black"
                                >
                                  <source src={vidUrl} />
                                  Trình duyệt không hỗ trợ xem video trực tiếp.
                                </video>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* History Timeline */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-purple-600">history</span>
                      Nhật Ký Thẩm Định & Lịch Sử Trạng Thái (Audit Trail)
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 max-h-40 overflow-y-auto space-y-2">
                      {selectedDispute.timeline?.map((ev) => (
                        <div key={ev.id} className="text-xs flex items-start justify-between border-b border-gray-100 pb-1.5 last:border-0 last:pb-0">
                          <div>
                            <span className="font-semibold text-gray-800">{ev.title}</span>
                            {ev.description && <span className="text-gray-500 ml-1.5">— {ev.description}</span>}
                            <span className="text-gray-400 ml-1 text-[11px]">({ev.actorType})</span>
                          </div>
                          <div className="text-[11px] text-gray-400 whitespace-nowrap ml-2">
                            {new Date(ev.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}{' '}
                            {new Date(ev.createdAt).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Arbitration Ruling Decision Form */}
                  {!selectedDispute.isFinalized && (
                    <form onSubmit={handleArbitrate} className="bg-emerald-50/50 border-2 border-emerald-200 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-700 text-xl">gavel</span>
                        <h3 className="text-base font-bold text-gray-900">Ban Hành Phán Quyết Trọng Tài (Binding Ruling)</h3>
                      </div>

                      {/* Ruling Selector */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {Object.entries(RULING_LABELS).map(([key, info]) => {
                          const isSelected = selectedRuling === key;
                          return (
                            <label
                              key={key}
                              className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                                isSelected
                                  ? 'bg-emerald-100/80 border-emerald-500 shadow-xs'
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name="ruling"
                                value={key}
                                checked={isSelected}
                                onChange={() => setSelectedRuling(key as ArbitrationRuling)}
                                className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                              />
                              <div>
                                <div className="text-xs font-bold text-gray-900">{info.label}</div>
                                <div className="text-[11px] text-gray-500 mt-0.5">{info.desc}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      {/* Partial refund slider if PARTIAL_SETTLEMENT selected */}
                      {selectedRuling === 'PARTIAL_SETTLEMENT' && (
                        <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-2">
                          <div className="flex justify-between items-center text-xs font-semibold text-purple-900">
                            <span>Tỷ lệ hoàn tiền cho Người mua:</span>
                            <span className="text-sm font-bold text-purple-700">{refundPercentage}%</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={99}
                            value={refundPercentage}
                            onChange={(e) => setRefundPercentage(Number(e.target.value))}
                            className="w-full accent-purple-600 cursor-pointer"
                          />
                          <div className="flex justify-between text-[11px] text-gray-500">
                            <span>1% (Tối thiểu)</span>
                            <span>Người bán nhận: {100 - refundPercentage}%</span>
                            <span>99% (Tối đa)</span>
                          </div>
                        </div>
                      )}

                      {/* Ruling notes */}
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">
                          Căn cứ pháp lý & ghi chú thẩm định đối soát (Bắt buộc, tối thiểu 10 ký tự) *
                        </label>
                        <textarea
                          rows={3}
                          value={rulingNotes}
                          onChange={(e) => setRulingNotes(e.target.value)}
                          placeholder="Ví dụ: Đã đối soát video mở hộp của người mua: kiện hàng còn nguyên niêm phong nhưng sách bên trong bị rách bìa. Chấp thuận yêu cầu hoàn tiền 100%."
                          className="w-full text-sm bg-white border border-gray-300 rounded-xl p-3 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDispute(null)}
                          className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          type="submit"
                          disabled={submittingRuling}
                          className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition shadow-md disabled:opacity-50"
                        >
                          {submittingRuling ? (
                            <>
                              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                              Đang ghi nhận phán quyết...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[18px]">gavel</span>
                              Xác Nhận Ban Hành Phán Quyết
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoomImage} alt="Zoomed Evidence" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" />
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
