"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { businessApi } from '../../api/businessApi';
import { useToast } from '../../context/ToastContext';
import { useSmartFormCollapse } from '../../utils/formHooks';
import { AdminStatusBadge, AdminFilterTabs, AdminPagination, AdminTableContainer } from './AdminUI';

const STATUS_CONFIG = {
  PENDING: {
    label: 'Chờ duyệt',
    badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    icon: 'hourglass_top',
  },
  APPROVED: {
    label: 'Đã phê duyệt',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    icon: 'check_circle',
  },
  REJECTED: {
    label: 'Đã từ chối',
    badge: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    icon: 'cancel',
  },
};

export function AdminBusinessUpdateRequestsView() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);;
  const [loading, setLoading] = useState(true);
  const [activeStatusTab, setActiveStatusTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Read tracking state for Admin
  const [readMap, setReadMap] = useState<Record<string, any>>({});

  // Review State (Before vs After)
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Reject State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');

  const isRejectDirty = Boolean(rejectReason.trim());
  const rejectFormRef = useSmartFormCollapse({
    isOpen: isRejectModalOpen,
    onClose: () => {
      setIsRejectModalOpen(false);
      setRejectReason('');
      setRejectReasonError('');
    },
    isDirty: isRejectDirty,
  });

  const detailPanelRef = useSmartFormCollapse({
    isOpen: Boolean(selectedRequest && !isRejectModalOpen),
    onClose: () => setSelectedRequest(null),
    isDirty: false,
  });

  // Load readMap from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('huki_admin_read_update_requests') || '{}');
      setReadMap(stored);
    } catch {
      // ignore
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await businessApi.getAllUpdateRequests({ limit: 100 });
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : res.data.data || [];
        setRequests(list);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.warn('Lỗi khi tải danh sách yêu cầu cập nhật:', err);
      showToast?.('Không thể kết nối đến máy chủ quản trị.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Đánh dấu 1 yêu cầu là đã đọc / đã xem
  const markAsRead = useCallback((reqId: any) => {
    if (!reqId || readMap[reqId]) return;
    const updated = { ...readMap, [reqId]: true };
    setReadMap(updated);
    localStorage.setItem('huki_admin_read_update_requests', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('huki_admin_noti_updated'));
  }, [readMap]);

  // Đánh dấu tất cả yêu cầu PENDING là đã xem
  const markAllAsRead = () => {
    const pendingList = requests.filter((r) => r.status === 'PENDING');
    if (pendingList.length === 0) return;
    const updated = { ...readMap };
    pendingList.forEach((r) => {
      updated[r.id] = true;
    });
    setReadMap(updated);
    localStorage.setItem('huki_admin_read_update_requests', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('huki_admin_noti_updated'));
    showToast?.('Đã đánh dấu tất cả yêu cầu là đã xem.', 'success');
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((req: any) => {
      if (activeStatusTab !== 'ALL' && req.status !== activeStatusTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const bizName = req.business?.name?.toLowerCase() || '';
        const reqName = req.requestedData?.name?.toLowerCase() || '';
        const tax = req.business?.taxCode?.toLowerCase() || req.requestedData?.taxCode?.toLowerCase() || '';
        return bizName.includes(q) || reqName.includes(q) || tax.includes(q);
      }
      return true;
    });
  }, [requests, activeStatusTab, searchQuery]);

  const counts = useMemo(() => {
    return {
      ALL: requests.length,
      PENDING: requests.filter((r) => r.status === 'PENDING').length,
      APPROVED: requests.filter((r) => r.status === 'APPROVED').length,
      REJECTED: requests.filter((r) => r.status === 'REJECTED').length,
      UNREAD_PENDING: requests.filter((r) => r.status === 'PENDING' && !readMap[r.id]).length,
    };
  }, [requests, readMap]);

  // Mở modal so sánh và đánh dấu đã xem
  const handleOpenDetail = (req: any) => {
    markAsRead(req.id);
    setSelectedRequest(req);
  };

  // Phê duyệt yêu cầu cập nhật
  const handleApprove = async (reqId: any) => {
    markAsRead(reqId);
    setActionLoading(true);
    try {
      const res = await businessApi.approveUpdateRequest(reqId);
      if (res.success) {
        showToast?.((res as any)?.message || 'Đã phê duyệt và cập nhật thông tin doanh nghiệp vào Database thành công!', 'success');
        setSelectedRequest(null);
        await fetchRequests();
      } else {
        showToast?.(res.error?.message || 'Không thể phê duyệt yêu cầu.', 'error');
      }
    } catch (err) {
      console.error('Approve failed:', err);
      showToast?.((err as any)?.message || 'Có lỗi xảy ra khi phê duyệt.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Mở modal nhập lý do từ chối
  const handleOpenReject = (req: any) => {
    markAsRead(req.id);
    setSelectedRequest(req);
    setRejectReason('');
    setRejectReasonError('');
    setIsRejectModalOpen(true);
  };

  // Xác nhận từ chối
  const handleConfirmReject = async (e: any) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setRejectReasonError('Vui lòng nhập lý do từ chối cụ thể để thông báo cho Seller.');
      return;
    }

    if (selectedRequest?.id) {
      markAsRead(selectedRequest.id);
    }

    setActionLoading(true);
    try {
      const res = await businessApi.rejectUpdateRequest(selectedRequest.id, rejectReason.trim());
      if (res.success) {
        showToast?.('Đã từ chối yêu cầu cập nhật và gửi lý do phản hồi cho Seller.', 'info');
        setIsRejectModalOpen(false);
        setSelectedRequest(null);
        setRejectReason('');
        setRejectReasonError('');
        await fetchRequests();
      } else {
        showToast?.(res.error?.message || 'Không thể từ chối yêu cầu.', 'error');
      }
    } catch (err) {
      console.error('Reject failed:', err);
      showToast?.((err as any)?.message || 'Có lỗi xảy ra khi từ chối.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Phân trang 10 mục / trang
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleTabChange = (tabId: string) => {
    setActiveStatusTab(tabId);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-fade-in font-sans">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-gray-900 flex items-center gap-3">
            <span>Yêu Cầu Chỉnh Sửa Thông Tin Doanh Nghiệp</span>
            {counts.UNREAD_PENDING > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold shadow-xs animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white"></span>
                <span>{counts.UNREAD_PENDING} Yêu cầu mới</span>
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {counts.UNREAD_PENDING > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-theme-primary border border-theme-primary/30 hover:bg-theme-primary/10 transition-all cursor-pointer bg-white shadow-2xs"
            >
              <span className="material-symbols-outlined text-base">done_all</span>
              <span>Đánh dấu tất cả đã xem</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchRequests}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 shadow-2xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Tabs & Search */}
      <div className="bg-white rounded-2xl border border-gray-200 p-3.5 sm:p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        {/* Status Tabs chuẩn AdminFilterTabs */}
        <AdminFilterTabs
          tabs={[
            { id: 'ALL', label: 'Tất Cả', count: counts.ALL },
            { id: 'PENDING', label: 'Chờ Xét Duyệt', count: counts.PENDING },
            { id: 'APPROVED', label: 'Đã Phê Duyệt', count: counts.APPROVED },
            { id: 'REJECTED', label: 'Đã Từ Chối', count: counts.REJECTED },
          ]}
          activeTab={activeStatusTab}
          onChange={handleTabChange}
        />

        {/* Search Input */}
        <div className="relative min-w-[240px] sm:min-w-[280px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e: any) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên doanh nghiệp, MST..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:border-[#00875A] outline-hidden text-gray-900"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 3. Requests Table - Tách cột riêng, không rớt dòng, cuộn ngang, zebra striping */}
      <AdminTableContainer>
        {loading ? (
          <div className="py-20 text-center text-gray-500">
            <span className="material-symbols-outlined text-4xl text-[#00875A] animate-spin mb-2">
              progress_activity
            </span>
            <p className="text-xs font-semibold">Đang tải danh sách yêu cầu chỉnh sửa...</p>
          </div>
        ) : paginatedRequests.length === 0 ? (
          <div className="py-16 text-center text-gray-500 space-y-2">
            <span className="material-symbols-outlined text-5xl text-gray-300">fact_check</span>
            <h3 className="font-bold text-xs text-gray-700">Không có yêu cầu chỉnh sửa nào phù hợp</h3>
            <p className="text-[11px] text-gray-400">
              {activeStatusTab === 'PENDING'
                ? 'Hiện không có yêu cầu cập nhật nào đang chờ duyệt.'
                : 'Thử tìm kiếm với từ khóa khác hoặc chuyển tab bộ lọc.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
            <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">Thời Gian Gửi</th>
                <th className="py-3 px-3 whitespace-nowrap">Tên Doanh Nghiệp (Hiện Tại)</th>
                <th className="py-3 px-3 whitespace-nowrap">Mã Số Thuế</th>
                <th className="py-3 px-3 whitespace-nowrap">Tên Đề Xuất Mới</th>
                <th className="py-3 px-3 whitespace-nowrap">Trụ Sở / Chi Nhánh Mới</th>
                <th className="py-3 px-3 whitespace-nowrap text-center">Trạng Thái</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedRequests.map((req: any, idx: number) => {
                const data = req.requestedData || {};
                const isPending = req.status === 'PENDING';
                const isUnread = isPending && !readMap[req.id];

                return (
                  <tr
                    key={req.id}
                    onClick={() => handleOpenDetail(req)}
                    className={`transition-colors cursor-pointer group ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'
                    } hover:bg-emerald-50/40 ${isUnread ? 'border-l-4 border-l-rose-500' : ''}`}
                  >
                    {/* Thời Gian Gửi */}
                    <td className="py-3 px-4 font-mono text-gray-500 text-[11px] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 animate-pulse"></span>
                        )}
                        <span>{new Date(req.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                    </td>

                    {/* Tên Doanh Nghiệp (Hiện Tại) */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 group-hover:text-[#00875A] transition-colors">
                          {req.business?.name || 'Chưa đặt tên'}
                        </span>
                        {isUnread && (
                          <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-extrabold animate-pulse shrink-0">
                            MỚI
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Mã Số Thuế */}
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-gray-600 font-semibold">
                      {req.business?.taxCode || 'N/A'}
                    </td>

                    {/* Tên Đề Xuất Mới */}
                    <td className="py-3 px-3 whitespace-nowrap font-semibold text-[#00875A]">
                      {data.name || req.business?.name || '-'}
                    </td>

                    {/* Trụ Sở / Chi Nhánh Mới */}
                    <td className="py-3 px-3 whitespace-nowrap text-gray-600 text-[11px]">
                      {Array.isArray(data.headquarters)
                        ? `${data.headquarters.length} Trụ sở / chi nhánh`
                        : data.address || 'Không đổi địa chỉ'}
                    </td>

                    {/* Trạng Thái */}
                    <td className="py-3 px-3 whitespace-nowrap text-center">
                      <AdminStatusBadge
                        variant={
                          req.status === 'APPROVED' ? 'success' :
                          req.status === 'PENDING' ? 'warning' :
                          req.status === 'REJECTED' ? 'danger' : 'neutral'
                        }
                        label={
                          req.status === 'APPROVED' ? 'Đã phê duyệt' :
                          req.status === 'PENDING' ? 'Chờ xét duyệt' :
                          req.status === 'REJECTED' ? 'Đã từ chối' : req.status
                        }
                      />
                    </td>

                    {/* Thao Tác */}
                    <td className="py-3 px-4 whitespace-nowrap text-right" onClick={(e: any) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(req)}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Xem so sánh
                        </button>

                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(req.id)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 rounded-lg bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                            >
                              Duyệt
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenReject(req)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer border border-rose-200"
                            >
                              Từ chối
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Luôn hiển thị thanh phân trang mặc định */}
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredRequests.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="yêu cầu chỉnh sửa"
        />
      </AdminTableContainer>

      {/* =========================================================================
            IN-PAGE PANEL: SO SÁNH TRỰC QUAN BEFORE VS AFTER
        ========================================================================= */}
      {selectedRequest && !isRejectModalOpen && (
        <div
          ref={detailPanelRef}
          className="mt-6 bg-white rounded-3xl border-2 border-slate-300 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-4 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#003b2b] text-2xl">compare</span>
                <h3 className="font-editorial text-xl font-bold text-gray-900">
                  Đối Chiếu Yêu Cầu Cập Nhật Hồ Sơ
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Mã yêu cầu: #{selectedRequest.id} &bull; Gửi lúc: {new Date(selectedRequest.createdAt).toLocaleString('vi-VN')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedRequest(null)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Panel Body: 2 Cột So sánh */}
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CỘT 1: THÔNG TIN HIỆN TẠI TRONG DB */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                <h4 className="font-bold text-sm text-gray-700 pb-2 border-b border-gray-200 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-gray-500">history</span>
                  1. Dữ liệu Hiện Tại (Trong DB)
                </h4>

                <div className="space-y-2">
                  <div>
                    <span className="text-gray-500 font-medium">Tên pháp nhân:</span>
                    <p className="font-bold text-gray-900 mt-0.5">{selectedRequest.business?.name || 'N/A'}</p>
                  </div>

                  <div>
                    <span className="text-gray-500 font-medium">Mã số thuế:</span>
                    <p className="font-mono font-bold text-gray-900 mt-0.5">{selectedRequest.business?.taxCode || 'N/A'}</p>
                  </div>

                  <div>
                    <span className="text-gray-500 font-medium">Loại hình:</span>
                    <p className="font-semibold text-gray-900 mt-0.5">{selectedRequest.business?.businessType || 'N/A'}</p>
                  </div>

                  <div>
                    <span className="text-gray-500 font-medium">Hotline &amp; Email:</span>
                    <p className="text-gray-800 mt-0.5">
                      {selectedRequest.business?.phone || 'Chưa có SĐT'} &bull; {selectedRequest.business?.email}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-500 font-medium">Địa chỉ trụ sở hiện tại:</span>
                    <p className="text-gray-800 mt-0.5 leading-relaxed bg-white p-2.5 rounded-lg border border-gray-200">
                      {selectedRequest.business?.address || 'Chưa cập nhật'}
                    </p>
                  </div>
                </div>
              </div>

              {/* CỘT 2: THÔNG TIN YÊU CẦU CẬP NHẬT (MỚI) */}
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-300 space-y-3">
                <h4 className="font-bold text-sm text-amber-900 pb-2 border-b border-amber-200 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-amber-600">new_releases</span>
                  2. Đề Xuất Cập Nhật Mới
                </h4>

                <div className="space-y-2">
                  <div>
                    <span className="text-gray-500 font-medium">Tên pháp nhân mới:</span>
                    <p className="font-bold text-[#003b2b] mt-0.5 text-sm bg-white p-1.5 rounded-md border border-amber-200">
                      {selectedRequest.requestedData?.name || selectedRequest.business?.name}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-500 font-medium">Mã số thuế:</span>
                    <p className="font-mono font-bold text-gray-900 mt-0.5">
                      {selectedRequest.requestedData?.taxCode || selectedRequest.business?.taxCode}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-500 font-medium">Loại hình mới:</span>
                    <p className="font-semibold text-gray-900 mt-0.5">
                      {selectedRequest.requestedData?.businessType || selectedRequest.business?.businessType}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-500 font-medium">Hotline &amp; Email mới:</span>
                    <p className="text-gray-800 mt-0.5">
                      {selectedRequest.requestedData?.phone} &bull; {selectedRequest.requestedData?.email}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-500 font-bold">Danh sách Trụ sở &amp; Chi nhánh mới:</span>
                    <div className="space-y-1.5 mt-1">
                      {Array.isArray(selectedRequest.requestedData?.headquarters) ? (
                        selectedRequest.requestedData.headquarters.map((hq: any, idx: any) => (
                          <div
                            key={idx}
                            className="p-2 rounded-lg bg-white border border-amber-200 text-gray-900 flex items-start gap-2"
                          >
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] shrink-0">
                              Trụ sở {idx + 1}
                            </span>
                            <span className="font-medium leading-relaxed">{hq}</span>
                          </div>
                        ))
                      ) : (
                        <p className="p-2 rounded bg-white border border-amber-200">
                          {selectedRequest.requestedData?.address || 'N/A'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Thông tin phản hồi nếu đã bị từ chối */}
            {selectedRequest.status === 'REJECTED' && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">cancel</span>
                  Lý do đã từ chối yêu cầu này:
                </p>
                <p className="italic text-xs font-medium">"{selectedRequest.rejectionReason}"</p>
              </div>
            )}
          </div>

          {/* Panel Footer */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => setSelectedRequest(null)}
              className="px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Đóng
            </button>

            {selectedRequest.status === 'PENDING' && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenReject(selectedRequest)}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer border border-rose-300"
                >
                  Từ chối yêu cầu
                </button>

                <button
                  type="button"
                  onClick={() => handleApprove(selectedRequest.id)}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">check</span>
                  <span>Chấp nhận &amp; Cập nhật DB</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
            IN-PAGE FORM: NHẬP LÝ DO TỪ CHỐI
        ========================================================================= */}
      {isRejectModalOpen && selectedRequest && (
        <div
          ref={rejectFormRef}
          className="mt-6 bg-white rounded-3xl border-2 border-rose-300 max-w-2xl w-full p-6 sm:p-8 shadow-sm space-y-5 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-center justify-between border-b border-rose-100 pb-3">
            <div className="flex items-center gap-2.5 text-rose-700">
              <span className="material-symbols-outlined text-2xl">cancel</span>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Từ Chối Yêu Cầu Chỉnh Sửa
                </h3>
                <p className="text-xs text-gray-500">Doanh nghiệp: {selectedRequest.business?.name}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsRejectModalOpen(false);
                setRejectReason('');
                setRejectReasonError('');
              }}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-900 mb-1.5">
                Lý do từ chối <span className="text-rose-500">*</span>:
              </label>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e: any) => {
                  setRejectReason(e.target.value);
                  if (rejectReasonError) setRejectReasonError('');
                }}
                placeholder="Nhập lý do cụ thể (VD: Tên pháp nhân không trùng khớp với Giấy phép ĐKKD, vui lòng gửi lại bản chụp rõ nét hơn...)"
                className={`w-full p-3.5 rounded-xl border bg-slate-50 focus:bg-white focus:outline-none transition-all text-gray-900 font-sans ${
                  rejectReasonError ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30' : 'border-gray-300 focus:border-rose-500'
                }`}
              />
              {rejectReasonError && (
                <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1 font-medium animate-in fade-in">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  <span>{rejectReasonError}</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectReason('');
                  setRejectReasonError('');
                }}
                className="px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer text-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 shadow-xs cursor-pointer disabled:opacity-50 text-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">cancel</span>
                <span>{actionLoading ? 'Đang xử lý...' : 'Xác Nhận Từ Chối'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default AdminBusinessUpdateRequestsView;
