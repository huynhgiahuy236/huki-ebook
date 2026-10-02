"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi, type DisputeItem, type DisputeDetailData, type ArbitrationRuling } from '@/ui/api/adminApi';
import { useToast } from '@/ui/context/ToastContext';
import { useSmartFormCollapse } from '@/ui/utils/formHooks';
import GroupedDataTable, { Column } from '../common/GroupedDataTable';
import AuditHistoryTimeline, { AuditLogItem } from '../common/AuditHistoryTimeline';
import { AdminStatusBadge, AdminFilterTabs } from './AdminUI';

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
  const [detailTab, setDetailTab] = useState<'evidence' | 'timeline' | 'governance'>('evidence');

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
      setDetailTab('evidence');

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

  // Map Governance Audit Logs from actual Dispute Data
  const disputeAuditLogs: AuditLogItem[] = useMemo(() => {
    if (!selectedDispute || !selectedDispute.isFinalized) return [];
    return [
      {
        id: `AUDIT-DSP-${selectedDispute.disputeId}`,
        actorId: selectedDispute.adminEmail || 'admin-01',
        actorRole: 'PLATFORM_ADMIN',
        action: 'ARBITRATE',
        resource: 'DISPUTE',
        resourceId: selectedDispute.disputeId,
        timestamp: selectedDispute.resolvedAt || new Date().toISOString(),
        storeId: selectedDispute.targetSellerOrder?.storeId,
        metadata: {
          ruling: selectedDispute.ruling,
          notes: selectedDispute.rulingNotes,
          refundPercentage: selectedDispute.refundPercentage,
          adminEmail: selectedDispute.adminEmail,
        },
        changedFields: ['status', 'ruling'],
        stateBefore: {
          status: 'UNDER_PLATFORM_REVIEW',
          ruling: null,
        },
        stateAfter: {
          status: selectedDispute.currentStatus,
          ruling: selectedDispute.ruling,
        },
      },
    ];
  }, [selectedDispute]);

  // Columns for GroupedDataTable
  const columns: Column<DisputeItem>[] = useMemo(
    () => [
      {
        key: 'index',
        title: 'STT',
        align: 'center',
        className: 'w-10 font-mono text-[11px] text-gray-400',
        render: (_val, _item, index) => (currentPage - 1) * pageSize + index + 1,
      },
      {
        key: 'orderInfo',
        title: 'Đơn Hàng & Tác Phẩm',
        minWidth: 260,
        sortable: true,
        render: (_val, item) => (
          <div className="flex flex-col gap-0.5 py-1">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#00875A] text-[15px]">shopping_bag</span>
              <span className="font-mono font-bold text-gray-900 text-xs">#{item.orderCode}</span>
              <span className="text-[10px] font-mono text-gray-400">ID: {item.id}</span>
            </div>
            <span className="text-gray-600 text-[11.5px] break-words" title={item.bookTitle}>
              {item.bookTitle ? `📚 ${item.bookTitle}` : '—'}
            </span>
          </div>
        ),
      },
      {
        key: 'parties',
        title: 'Gian Hàng & Khách Hàng',
        render: (_val, item) => (
          <div className="flex flex-col gap-0.5 py-1">
            <span className="font-semibold text-emerald-900 dark:text-emerald-300 text-xs flex items-center gap-1 break-words" title={item.storeName}>
              <span className="material-symbols-outlined text-[14px] text-emerald-600 shrink-0">storefront</span>
              <span>{item.storeName || 'Shop HUKI'}</span>
            </span>
            <span className="text-gray-500 font-mono text-[11px] flex items-center gap-1 break-words">
              <span className="material-symbols-outlined text-[13px] text-gray-400 shrink-0">person</span>
              <span>{item.customerName || 'Khách hàng'}</span>
            </span>
          </div>
        ),
      },
      {
        key: 'amountAndType',
        title: 'Giá Trị & Phân Loại',
        minWidth: 190,
        render: (_val, item) => {
          const typeMeta = DISPUTE_TYPE_LABELS[item.type] || DISPUTE_TYPE_LABELS.OTHER;
          return (
            <div className="flex flex-col gap-1 py-1">
              <span className="font-bold text-[#00875A] font-mono text-[13px]">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.grandTotal || 0)}
              </span>
              <span className={`inline-block px-2 py-0.2 rounded-full text-[9.5px] font-bold border w-fit ${typeMeta.color}`}>
                {typeMeta.label}
              </span>
            </div>
          );
        },
      },
      {
        key: 'status',
        title: 'Trạng Thái / Phán Quyết',
        width: 170,
        align: 'center',
        render: (_val, item) => {
          const isPending = item.status === 'DISPUTE_OPENED' || item.status === 'UNDER_PLATFORM_REVIEW';
          const rulingKey = item.ruling || item.status?.replace('RULING_', '');
          const rulingMeta = RULING_LABELS[rulingKey];

          if (isPending) {
            return <AdminStatusBadge status="warning" label="Chờ Sàn Phân Xử" icon="hourglass_top" />;
          }
          if (rulingMeta) {
            return (
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
            );
          }
          return <AdminStatusBadge status="neutral" label={item.status} />;
        },
      },
      {
        key: 'actions',
        title: 'Thao Tác',
        width: 110,
        align: 'right',
        render: (_val, item) => (
          <button
            onClick={() => handleOpenDetail(item.id)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#00875A] hover:bg-[#00734c] text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[14px]">gavel</span>
            <span>Xử lý</span>
          </button>
        ),
      },
    ],
    [currentPage, pageSize]
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200">
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

      {/* GroupedDataTable Container */}
      <GroupedDataTable<DisputeItem>
        data={paginatedDisputes}
        columns={columns}
        keyField="id"
        loading={loading}
        expandable={true}
        expandedRowRender={(item: DisputeItem) => {
          const typeMeta = DISPUTE_TYPE_LABELS[item.type] || DISPUTE_TYPE_LABELS.OTHER;
          const rulingKey = item.ruling || item.status?.replace('RULING_', '');
          const rulingMeta = RULING_LABELS[rulingKey];

          return (
            <div className="flex flex-col gap-3.5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Card 1: Khiếu nại từ khách */}
                <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-200/80 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800 text-[11px] uppercase tracking-wider border-b border-gray-200/60 pb-1">
                    <span className="material-symbols-outlined text-[15px] text-amber-600">report_problem</span>
                    <span>Mô Tả Khiếu Nại &amp; Bằng Chứng</span>
                  </div>
                  <p className="text-gray-700 text-[11.5px] leading-relaxed italic bg-white p-2 rounded-lg border border-gray-100">
                    "{item.description || 'Không có mô tả chi tiết'}"
                  </p>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-gray-500">Giải pháp yêu cầu:</span>
                    <span className="font-bold text-gray-900">
                      {item.resolution === 'REFUND' ? 'Hoàn tiền 100%' : item.resolution === 'REPLACE' ? 'Đổi hàng mới' : 'Thỏa thuận'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500">Tệp đính kèm:</span>
                    <span className="font-medium text-emerald-800 flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[13px]">attach_file</span>
                      <span>{item.evidence?.length || 0} minh chứng</span>
                    </span>
                  </div>
                </div>

                {/* Card 2: Phán quyết trọng tài */}
                <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-200/80 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800 text-[11px] uppercase tracking-wider border-b border-gray-200/60 pb-1">
                    <span className="material-symbols-outlined text-[15px] text-[#00875A]">gavel</span>
                    <span>Phán Quyết Trọng Tài Sàn</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Trạng thái:</span>
                      <span className="font-bold text-gray-900">{rulingMeta ? rulingMeta.label.split('(')[0] : 'Đang điều tra'}</span>
                    </div>
                    {item.rulingNotes && (
                      <div className="flex flex-col bg-white p-1.5 rounded border border-gray-100 mt-1">
                        <span className="text-[10px] text-gray-400 font-medium">Ghi chú phân xử:</span>
                        <span className="text-gray-700 text-[11px] leading-tight">{item.rulingNotes}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1">
                      <span className="text-gray-500">Ngày tạo hồ sơ:</span>
                      <span className="font-mono text-gray-700">{new Date(item.createdAt).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Tài chính Escrow */}
                <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-200/80 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800 text-[11px] uppercase tracking-wider border-b border-gray-200/60 pb-1">
                    <span className="material-symbols-outlined text-[15px] text-blue-600">account_balance_wallet</span>
                    <span>Dòng Tiền Ký Quỹ Escrow</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Giá trị đơn:</span>
                      <span className="font-mono font-bold text-gray-900">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.grandTotal || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Trạng thái Escrow:</span>
                      <span className="font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                        Đang đóng băng
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phân loại lỗi:</span>
                      <span className="font-semibold text-gray-800">{typeMeta.label}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-gray-200/60 bg-gray-50/50 p-2 rounded-xl">
                <span className="text-[11px] text-gray-500">
                  Mã tranh chấp: <strong className="font-mono text-gray-700">#{item.id}</strong> • Mã đơn hàng: <strong className="font-mono text-gray-700">#{item.orderCode}</strong>
                </span>

                <button
                  type="button"
                  onClick={() => handleOpenDetail(item.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00875A] hover:bg-[#00734c] text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-[15px]">balance</span>
                  <span>Mở Hồ Sơ Đối Chất &amp; Ban Hành Phán Quyết</span>
                </button>
              </div>
            </div>
          );
        }}
        emptyTitle="Không Có Hồ Sơ Khiếu Nại Nào"
        emptyMessage="Không tìm thấy khiếu nại phù hợp với bộ lọc hiện tại."
        pagination={{
          currentPage,
          totalPages,
          totalItems: disputes.length,
          pageSize,
          onPageChange: setCurrentPage,
        }}
      />

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

          {/* Inspection Sub-Tabs */}
          <div className="flex items-center gap-2 px-6 pt-3 border-b border-gray-100">
            <button
              type="button"
              onClick={() => setDetailTab('evidence')}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                detailTab === 'evidence'
                  ? 'border-[#00875A] text-[#00875A]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Chứng Cứ &amp; Thẩm Định
            </button>
            <button
              type="button"
              onClick={() => setDetailTab('timeline')}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                detailTab === 'timeline'
                  ? 'border-[#00875A] text-[#00875A]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Tiến Trình Đơn Hàng (Domain)
            </button>
            <button
              type="button"
              onClick={() => setDetailTab('governance')}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                detailTab === 'governance'
                  ? 'border-[#00875A] text-[#00875A]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Lịch Sử Trọng Tài &amp; Quản Trị
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

                {/* TAB 1: EVIDENCE & ARBITRATION FORM */}
                {detailTab === 'evidence' && (
                  <div className="space-y-4">
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
                  </div>
                )}

                {/* TAB 2: DOMAIN TIMELINE */}
                {detailTab === 'timeline' && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Tiến Trình Xử Lý Đơn Hàng &amp; Khiếu Nại</h4>
                    <div className="space-y-2 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-gray-800">Trạng Thái Khiếu Nại:</span>{' '}
                          <span className="font-mono text-emerald-700 font-bold">{selectedDispute.currentStatus}</span>
                        </div>
                        <span className="text-[11px] text-gray-400">{selectedDispute.resolvedAt ? new Date(selectedDispute.resolvedAt).toLocaleString('vi-VN') : 'Đang xử lý'}</span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-gray-800">Mã Đơn Hàng:</span>{' '}
                          <span className="font-mono text-gray-900 font-bold">#{selectedDispute.orderCode}</span>
                        </div>
                        <span className="text-[11px] text-gray-500">Mã Seller Order: {selectedDispute.sellerOrderId || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: GOVERNANCE AUDIT TIMELINE */}
                {detailTab === 'governance' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Lịch Sử Phán Quyết &amp; Quản Trị Trọng Tài</h4>
                    <AuditHistoryTimeline
                      items={disputeAuditLogs}
                      title="Nhật Ký Trọng Tài Sàn (Arbitration Audit Log)"
                      emptyMessage="Chưa có bản ghi lịch sử trọng tài nào cho hồ sơ này."
                    />
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDisputesView;
