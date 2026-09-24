"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useToast } from '../../context/ToastContext';
import { businessApi } from '../../api/businessApi';
import { useSmartFormCollapse } from '../../utils/formHooks';
import { AdminStatusBadge, AdminPagination, AdminTableContainer, AdminActionButton } from './AdminUI';

export function AdminPublisherLeadsView() {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const isLeadDirty = Boolean(rejectReason.trim());
  const leadPanelRef = useSmartFormCollapse({
    isOpen: Boolean(selectedLead),
    onClose: () => {
      setSelectedLead(null);
      setIsRejecting(false);
      setRejectReason('');
      setRejectReasonError('');
    },
    isDirty: isLeadDirty,
  });

  // Danh sách hồ sơ đăng ký chờ duyệt từ Database
  const [leadsList, setLeadsList] = useState<any[]>([]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const res = await businessApi.getAllBusinesses();
      if (res.success && Array.isArray(res.data)) {
        // Lọc tất cả các hồ sơ đang ở trạng thái PENDING_APPROVAL
        const pendingBusinesses = res.data
          .filter(b => b.status === 'PENDING_APPROVAL')
          .map(b => ({
            id: b.id,
            name: b.name,
            code: b.name.split(' ').map((w: string) => w[0]).join('').substring(0, 4).toUpperCase() || 'NXB',
            license: b.taxCode ? `MST: ${b.taxCode}` : 'Chưa cấp MST',
            taxCode: b.taxCode || 'Chưa cung cấp',
            rep: b.phone ? `Hotline: ${b.phone}` : (b.email || 'Người đại diện'),
            email: b.email || 'Chưa cập nhật',
            phone: b.phone || '',
            address: b.address || 'Chưa cập nhật địa chỉ trụ sở',
            status: b.status,
            joinedDate: b.createdAt ? new Date(b.createdAt).toLocaleDateString('vi-VN') : 'Hôm nay',
            rawDate: b.createdAt ? new Date(b.createdAt) : new Date()
          }));
        setLeadsList(pendingBusinesses);
      } else {
        setLeadsList([]);
      }
    } catch {
      setLeadsList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Xử lý Phê duyệt hồ sơ NXB
  const handleApprove = async (id: any, name: any) => {
    setActionLoadingId(id);
    try {
      const res = await businessApi.approveBusiness(id);
      setActionLoadingId(null);
      if (res.success || res.data) {
        showToast?.(`Đã phê duyệt thành công ${name}! Đơn vị đã được cấp quyền Official Mall.`, 'success');
        setLeadsList(prev => prev.filter(item => item.id !== id));
        if (selectedLead && selectedLead.id === id) {
          setSelectedLead(null);
        }
      } else {
        showToast?.(res.error?.message || `Có lỗi khi phê duyệt hồ sơ ${name}.`, 'error');
      }
    } catch {
      setActionLoadingId(null);
      showToast?.(`Không thể kết nối API duyệt hồ sơ.`, 'error');
    }
  };

  // Xử lý Từ chối hồ sơ NXB
  const handleReject = async (id: any, name: any) => {
    if (!rejectReason.trim()) {
      setRejectReasonError('Vui lòng nhập lý do từ chối hồ sơ đăng ký');
      return;
    }
    setActionLoadingId(id);
    try {
      const reason = rejectReason.trim();
      await businessApi.rejectBusiness(id, reason);
      setActionLoadingId(null);
      setIsRejecting(false);
      setRejectReason('');
      setRejectReasonError('');
      setLeadsList(prev => prev.filter(item => item.id !== id));
      showToast?.(`Đã từ chối đơn đăng ký của ${name}.`, 'info');
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead(null);
      }
    } catch {
      setActionLoadingId(null);
      showToast?.(`Có lỗi khi từ chối hồ sơ.`, 'error');
    }
  };

  const filteredLeads = useMemo(() => {
    return leadsList.filter(item => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.taxCode.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q)
      );
    });
  }, [leadsList, searchQuery]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-fade-in-up">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-editorial">
            Duyệt Đăng Ký NXB Mới
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/admin/publishers"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px] text-emerald-700">domain</span>
            <span>Quản Lý Nhà Xuất Bản</span>
          </Link>

          <button
            onClick={fetchLeads}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[16px] ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
            <span>Làm Mới Hàng Chờ</span>
          </button>
        </div>
      </div>

      {/* 2. STATS PILL ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200/90 shadow-2xs">
          <span className="text-xs text-amber-800 font-bold uppercase tracking-wider">Hồ Sơ Cần Duyệt Gấp</span>
          <div className="text-2xl font-bold text-amber-900 mt-1 flex items-center gap-2">
            <span>{leadsList.length} hồ sơ</span>
          </div>
          <span className="text-[11px] text-amber-700 font-medium block mt-0.5">Thời gian cam kết: xử lý trong 24h</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Chính Sách Hoa Hồng</span>
          <div className="text-xl font-bold text-emerald-800 mt-1">85% NXB - 15% Sàn</div>
          <span className="text-[11px] text-gray-500 font-medium block mt-0.5">Áp dụng chuẩn toàn hệ thống</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Tiêu Chuẩn Thẩm Định</span>
          <div className="text-xl font-bold text-gray-900 mt-1">ĐKKD + MST Hợp Lệ</div>
          <span className="text-[11px] text-[#00875A] font-medium block mt-0.5">Xác thực bản quyền số DRM</span>
        </div>
      </div>

      {/* 3. TABLE FILTER & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#00875A]">how_to_reg</span>
          <span className="text-xs font-bold text-gray-800">Danh Sách Đơn Đăng Ký Đang Chờ Xét Duyệt ({filteredLeads.length})</span>
        </div>

        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
          <input
            type="text"
            placeholder="Tìm theo tên NXB, MST, email người nộp..."
            value={searchQuery}
            onChange={(e: any) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 4. LEADS TABLE */}
      <AdminTableContainer>
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <span className="w-8 h-8 border-3 border-[#00875A]/30 border-t-[#00875A] rounded-full animate-spin"></span>
            <p className="text-xs text-gray-500 font-medium">Đang tải hồ sơ đăng ký mới...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <span className="material-symbols-outlined text-4xl text-emerald-600 mb-2 block">task_alt</span>
            <p className="font-bold text-sm text-gray-800">Tuyệt vời! Không có hồ sơ nào đang chờ duyệt</p>
            <p className="text-xs text-gray-400 mt-1">Khi có NXB nộp đơn qua /seller/register, hồ sơ sẽ hiển thị ngay tại đây.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-900 border-collapse min-w-[1300px]">
              <thead className="bg-[#F8FAFC] text-[10.5px] uppercase font-bold text-gray-500 border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap w-12 text-center">STT</th>
                  <th className="py-3 px-3.5 whitespace-nowrap min-w-[280px]">Đơn Vị / NXB Đăng Ký</th>
                  <th className="py-3 px-3.5 whitespace-nowrap min-w-[140px]">Mã Số Thuế</th>
                  <th className="py-3 px-3.5 whitespace-nowrap min-w-[180px]">Email Liên Hệ</th>
                  <th className="py-3 px-3.5 whitespace-nowrap min-w-[130px]">Số Điện Thoại</th>
                  <th className="py-3 px-3.5 whitespace-nowrap min-w-[220px]">Địa Chỉ Trụ Sở</th>
                  <th className="py-3 px-3.5 whitespace-nowrap min-w-[120px]">Ngày Nộp</th>
                  <th className="py-3 px-3.5 whitespace-nowrap min-w-[140px] text-center">Trạng Thái</th>
                  <th className="py-3 px-3.5 whitespace-nowrap min-w-[180px] text-right">Thao Tác Thẩm Định</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {paginatedLeads.map((lead, idx) => {
                  const isActionLoading = actionLoadingId === lead.id;
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr
                      key={lead.id}
                      className={`transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'} hover:bg-emerald-50/40`}
                    >
                      {/* STT */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center text-[11px] font-mono text-gray-400 font-semibold">
                        {itemIndex}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-200">
                            {lead.code}
                          </div>
                          <div className="min-w-0 max-w-[240px]">
                            <div
                              onClick={() => setSelectedLead(lead)}
                              className="font-bold text-gray-900 leading-snug truncate hover:text-[#00875A] cursor-pointer"
                              title={lead.name}
                            >
                              {lead.name}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono truncate">
                              ID: {lead.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tax code */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono font-semibold text-gray-800 text-[11px]">
                        {lead.taxCode}
                      </td>

                      {/* Email */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-gray-700">
                        {lead.email || <span className="text-gray-400 italic">Chưa có</span>}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-gray-700 font-mono">
                        {lead.phone || <span className="text-gray-400 font-sans italic text-[11px]">Chưa có</span>}
                      </td>

                      {/* Address */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-gray-600 text-[11px]" title={lead.address}>
                        <div className="truncate max-w-[220px]">{lead.address}</div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                        {lead.joinedDate}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        <AdminStatusBadge variant="warning" label="Chờ Thẩm Định" />
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <AdminActionButton
                            variant="view"
                            icon="visibility"
                            label="Chi tiết"
                            size="sm"
                            onClick={() => setSelectedLead(lead)}
                            title="Xem chi tiết hồ sơ thẩm định"
                          />

                          <AdminActionButton
                            variant="success"
                            icon="check"
                            label="Phê Duyệt"
                            size="sm"
                            disabled={isActionLoading}
                            loading={isActionLoading}
                            onClick={() => handleApprove(lead.id, lead.name)}
                            title="Phê duyệt đối tác xuất bản"
                          />
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
          totalItems={filteredLeads.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="đơn đăng ký"
        />
      </AdminTableContainer>

      {/* 5. IN-PAGE COLLAPSIBLE FORM PANEL XEM CHI TIẾT HỒ SƠ PHÁP LÝ & THẨM ĐỊNH */}
      {selectedLead && (
        <div ref={leadPanelRef} className="mt-6 bg-white rounded-3xl border-2 border-amber-500/20 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 font-bold text-sm flex items-center justify-center border border-amber-200">
                {selectedLead.code}
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  {selectedLead.name}
                </h3>
                <span className="text-xs text-gray-500 font-mono">MST: {selectedLead.taxCode}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedLead(null);
                setIsRejecting(false);
                setRejectReason('');
                setRejectReasonError('');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              ✕ Đóng bảng
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8FAFC] p-5 rounded-2xl border border-[#E2E8F0]">
              <div>
                <span className="text-gray-500">Người đại diện pháp luật:</span>
                <p className="font-bold text-sm text-gray-900 mt-0.5">{selectedLead.rep}</p>
              </div>
              <div>
                <span className="text-gray-500">Mã số thuế / MSDN:</span>
                <p className="font-mono font-bold text-sm text-gray-900 mt-0.5">{selectedLead.taxCode}</p>
              </div>
              <div>
                <span className="text-gray-500">Email giao dịch:</span>
                <p className="font-bold text-gray-900 mt-0.5">{selectedLead.email}</p>
              </div>
              <div>
                <span className="text-gray-500">Hotline liên hệ:</span>
                <p className="font-bold text-gray-900 mt-0.5">{selectedLead.phone || 'Chưa cập nhật'}</p>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <span className="text-gray-500">Địa chỉ trụ sở chính:</span>
                <p className="font-bold text-gray-900 mt-0.5">{selectedLead.address}</p>
              </div>
            </div>

            {isRejecting ? (
              <div className="p-5 bg-red-50/70 rounded-2xl border border-red-200 space-y-3">
                <label className="block text-xs font-bold text-red-900">
                  Nhập lý do từ chối hồ sơ này <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e: any) => {
                    setRejectReason(e.target.value);
                    if (rejectReasonError) setRejectReasonError('');
                  }}
                  placeholder="Ví dụ: Thiếu bản scan giấy phép kinh doanh xuất bản, sai MST..."
                  className={`w-full p-3 rounded-xl bg-white border text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all ${
                    rejectReasonError ? 'border-red-500 ring-1 ring-red-500' : 'border-red-200'
                  }`}
                />
                {rejectReasonError && (
                  <p className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium animate-in fade-in">
                    <span>⚠️</span> {rejectReasonError}
                  </p>
                )}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRejecting(false);
                      setRejectReasonError('');
                    }}
                    className="px-3.5 py-2 text-xs text-gray-600 font-semibold hover:bg-white rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(selectedLead.id, selectedLead.name)}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  >
                    Xác Nhận Từ Chối
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#00875A] font-bold">
                  <span className="material-symbols-outlined text-lg">verified</span>
                  <span>Quyền lợi đối tác: HUKI DRM &amp; Tỷ lệ 85/15</span>
                </div>
                <span className="text-xs font-bold text-emerald-800">Đủ điều kiện</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedLead(null);
                setIsRejecting(false);
                setRejectReason('');
                setRejectReasonError('');
              }}
              className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-gray-700 font-bold text-xs hover:bg-gray-50 cursor-pointer"
            >
              Đóng lại
            </button>

            {!isRejecting && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoadingId === selectedLead.id}
                  onClick={() => setIsRejecting(true)}
                  className="px-4 py-2.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  Từ Chối Đơn
                </button>
                <button
                  type="button"
                  disabled={actionLoadingId === selectedLead.id}
                  onClick={() => handleApprove(selectedLead.id, selectedLead.name)}
                  className="px-5 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">check</span>
                  <span>Phê Duyệt &amp; Cấp Quyền NXB</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPublisherLeadsView;
