import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { businessApi } from '../../api/businessApi';

export default function AdminPublisherLeadsPage() {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Danh sách hồ sơ đăng ký chờ duyệt từ Database
  const [leadsList, setLeadsList] = useState([]);

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
            code: b.name.split(' ').map(w => w[0]).join('').substring(0, 4).toUpperCase() || 'NXB',
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
  const handleApprove = async (id, name) => {
    setActionLoadingId(id);
    try {
      const res = await businessApi.approveBusiness(id);
      setActionLoadingId(null);
      if (res.success || res.data) {
        showToast(`Đã phê duyệt thành công ${name}! Đơn vị đã được cấp quyền Official Mall.`, 'success');
        setLeadsList(prev => prev.filter(item => item.id !== id));
        if (selectedLead && selectedLead.id === id) {
          setSelectedLead(null);
        }
      } else {
        showToast(res.error?.message || `Có lỗi khi phê duyệt hồ sơ ${name}.`, 'error');
      }
    } catch {
      setActionLoadingId(null);
      showToast(`Không thể kết nối API duyệt hồ sơ.`, 'error');
    }
  };

  // Xử lý Từ chối hồ sơ NXB
  const handleReject = async (id, name) => {
    setActionLoadingId(id);
    try {
      const reason = rejectReason || 'Hồ sơ thiếu bản scan ĐKKD công chứng hoặc thông tin MST không khớp';
      await businessApi.rejectBusiness(id, reason);
      setActionLoadingId(null);
      setIsRejecting(false);
      setRejectReason('');
      setLeadsList(prev => prev.filter(item => item.id !== id));
      showToast(`Đã từ chối đơn đăng ký của ${name}.`, 'info');
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead(null);
      }
    } catch {
      setActionLoadingId(null);
      showToast(`Có lỗi khi từ chối hồ sơ.`, 'error');
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

  return (
    <div className="flex flex-col gap-6 max-w-[1480px] mx-auto p-2 sm:p-4 animate-fade-in-up">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ban Điều Hành Trung Ương HUKI</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
              {leadsList.length} Hồ sơ chờ thẩm định
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5 font-editorial">
            Duyệt Đăng Ký NXB Mới
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-3xl">
            Hàng chờ thẩm định hồ sơ pháp lý ĐKKD, kiểm tra mã số thuế và xét duyệt cấp quyền gian hàng xuất bản chính hãng cho người bán mới.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/admin/publishers"
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
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC]">
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:ring-1 focus:ring-[#00875A]/20"
            />
          </div>
        </div>

        {/* 4. LEADS TABLE */}
        <div className="overflow-x-auto w-full">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <span className="w-8 h-8 border-3 border-[#00875A]/30 border-t-[#00875A] rounded-full animate-spin"></span>
              <p className="text-xs text-gray-500 font-medium">Đang tải hồ sơ đăng ký mới...</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-gray-900 min-w-[940px]">
              <thead className="bg-[#F8FAFC] text-[11px] uppercase font-bold text-gray-500 border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4 min-w-[260px]">Đơn Vị / NXB Đăng Ký</th>
                  <th className="py-3 px-4 min-w-[140px] whitespace-nowrap">Mã Số Thuế / MST</th>
                  <th className="py-3 px-4 min-w-[180px]">Địa Chỉ Trụ Sở</th>
                  <th className="py-3 px-4 min-w-[130px] whitespace-nowrap">Ngày Nộp Hồ Sơ</th>
                  <th className="py-3 px-4 min-w-[130px] whitespace-nowrap text-center">Trạng Thái</th>
                  <th className="py-3 px-5 min-w-[180px] whitespace-nowrap text-right">Thao Tác Thẩm Định</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-500">
                      <span className="material-symbols-outlined text-4xl text-emerald-600 mb-2 block">task_alt</span>
                      <p className="font-bold text-sm text-gray-800">Tuyệt vời! Không có hồ sơ nào đang chờ duyệt</p>
                      <p className="text-xs text-gray-400 mt-1">Khi có NXB nộp đơn qua /seller/register, hồ sơ sẽ hiển thị ngay tại đây.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const isActionLoading = actionLoadingId === lead.id;

                    return (
                      <tr key={lead.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-4 min-w-[260px]">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-200">
                              {lead.code}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 leading-snug line-clamp-1">{lead.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500 whitespace-nowrap">
                                <span>{lead.email}</span>
                                {lead.phone && (
                                  <>
                                    <span>•</span>
                                    <span>{lead.phone}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 min-w-[140px] whitespace-nowrap">
                          <div className="font-mono font-bold text-gray-800 text-xs">{lead.taxCode}</div>
                          <span className="text-[10px] text-gray-400 block mt-0.5">Giấy phép ĐKKD</span>
                        </td>

                        <td className="py-3.5 px-4 min-w-[180px] text-gray-600 text-[11.5px] leading-relaxed" title={lead.address}>
                          <span className="line-clamp-2">{lead.address}</span>
                        </td>

                        <td className="py-3.5 px-4 min-w-[130px] whitespace-nowrap text-gray-600 font-medium">
                          {lead.joinedDate}
                        </td>

                        <td className="py-3.5 px-4 min-w-[130px] whitespace-nowrap text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-[11px] font-bold whitespace-nowrap shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Chờ Thẩm Định
                          </span>
                        </td>

                        <td className="py-3.5 px-5 min-w-[180px] whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap shrink-0">
                            <button
                              type="button"
                              onClick={() => setSelectedLead(lead)}
                              className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold whitespace-nowrap cursor-pointer shrink-0 transition-colors"
                            >
                              Chi tiết
                            </button>

                            <button
                              type="button"
                              disabled={isActionLoading}
                              onClick={() => handleApprove(lead.id, lead.name)}
                              className="px-3 py-1.5 rounded-lg bg-[#00875A] hover:bg-[#00734c] text-white text-xs font-bold whitespace-nowrap shadow-xs cursor-pointer flex items-center gap-1 shrink-0 transition-all disabled:opacity-60"
                            >
                              {isActionLoading ? (
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              ) : (
                                <span className="material-symbols-outlined text-[14px]">check</span>
                              )}
                              <span>Phê Duyệt</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 5. MODAL XEM CHI TIẾT HỒ SƠ PHÁP LÝ & THẨM ĐỊNH */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl p-6 sm:p-8 animate-fade-in-up">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 font-bold text-sm flex items-center justify-center">
                  {selectedLead.code}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{selectedLead.name}</h3>
                  <span className="text-xs text-gray-500 font-mono">MST: {selectedLead.taxCode}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedLead(null);
                  setIsRejecting(false);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="py-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
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
                <div className="col-span-2">
                  <span className="text-gray-500">Địa chỉ trụ sở chính:</span>
                  <p className="font-bold text-gray-900 mt-0.5">{selectedLead.address}</p>
                </div>
              </div>

              {isRejecting ? (
                <div className="p-4 bg-red-50 rounded-2xl border border-red-200 space-y-2">
                  <label className="block text-xs font-bold text-red-900">Nhập lý do từ chối hồ sơ này:</label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Ví dụ: Thiếu bản scan giấy phép kinh doanh xuất bản..."
                    className="w-full p-2.5 rounded-xl bg-white border border-red-300 text-xs focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsRejecting(false)}
                      className="px-3 py-1.5 text-xs text-gray-600 font-semibold"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(selectedLead.id, selectedLead.name)}
                      className="px-4 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold"
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
        </div>
      )}
    </div>
  );
}
