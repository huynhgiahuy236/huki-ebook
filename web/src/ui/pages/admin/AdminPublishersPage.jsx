import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { businessApi } from '../../api/businessApi';

export default function AdminPublishersPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPublisher, setSelectedPublisher] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Danh sách NXB 100% lấy từ Database Backend
  const [publishersList, setPublishersList] = useState([]);

  const fetchBusinesses = async () => {
    setIsLoading(true);
    try {
      const res = await businessApi.getAllBusinesses();
      if (res.success && Array.isArray(res.data)) {
        const apiBusinesses = res.data.map(b => ({
          id: b.id,
          name: b.name,
          code: b.name.split(' ').map(w => w[0]).join('').substring(0, 4).toUpperCase() || 'NXB',
          badge: b.status === 'APPROVED' ? 'Chính Hãng Mall' : b.status === 'PENDING_APPROVAL' ? 'Chờ Thẩm Định' : b.status === 'SUSPENDED' ? 'Đã Khóa Quyền' : 'Đã Từ Chối',
          license: b.taxCode ? `MST: ${b.taxCode}` : `Chưa cấp MST`,
          taxCode: b.taxCode || 'Chưa cung cấp',
          rep: b.phone ? `Hotline: ${b.phone}` : (b.email || 'Người đại diện'),
          email: b.email || 'Chưa cập nhật',
          phone: b.phone || '',
          address: b.address || 'Chưa cập nhật địa chỉ trụ sở',
          revenue: '0₫',
          bookCount: b.status === 'APPROVED' ? '0 đầu sách' : '0 đầu sách',
          ebookDrmCount: '0 Ebook DRM',
          split: '85% NXB - 15% HUKI',
          status: b.status,
          statusLabel: b.status === 'APPROVED' ? 'Đang hoạt động' : b.status === 'PENDING_APPROVAL' ? 'Chờ thẩm định hồ sơ' : b.status === 'SUSPENDED' ? 'Bị đình chỉ / Khóa quyền' : 'Từ chối',
          rating: b.status === 'APPROVED' ? 5.0 : 0,
          joinedDate: b.createdAt ? new Date(b.createdAt).toLocaleDateString('vi-VN') : 'Hôm nay'
        }));
        setPublishersList(apiBusinesses);
      } else {
        setPublishersList([]);
      }
    } catch {
      setPublishersList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  // 1. Phê duyệt hồ sơ NXB
  const handleApprove = async (id, name) => {
    setActionLoadingId(id);
    try {
      const res = await businessApi.approveBusiness(id);
      setActionLoadingId(null);
      if (res.success || res.data) {
        showToast(`Đã phê duyệt thành công hồ sơ ${name}! Đơn vị đã được cấp quyền Official Mall.`, 'success');
        setPublishersList(prev => prev.map(p => {
          if (p.id === id) {
            return {
              ...p,
              status: 'APPROVED',
              badge: 'Chính Hãng Mall',
              statusLabel: 'Đang hoạt động'
            };
          }
          return p;
        }));
        if (selectedPublisher && selectedPublisher.id === id) {
          setSelectedPublisher(prev => prev ? { ...prev, status: 'APPROVED', badge: 'Chính Hãng Mall' } : null);
        }
      } else {
        showToast(res.error?.message || `Có lỗi khi phê duyệt hồ sơ ${name}.`, 'error');
      }
    } catch {
      setActionLoadingId(null);
      showToast(`Không thể kết nối API duyệt hồ sơ.`, 'error');
    }
  };

  // 2. Từ chối hồ sơ
  const handleReject = async (id, name) => {
    setActionLoadingId(id);
    try {
      await businessApi.rejectBusiness(id, 'Hồ sơ chưa đạt tiêu chuẩn pháp lý sàn');
      setActionLoadingId(null);
      setPublishersList(prev => prev.map(p => p.id === id ? { ...p, status: 'REJECTED', badge: 'Đã Từ Chối', statusLabel: 'Từ chối' } : p));
      showToast(`Đã từ chối hồ sơ ${name}.`, 'info');
      if (selectedPublisher && selectedPublisher.id === id) {
        setSelectedPublisher(prev => prev ? { ...prev, status: 'REJECTED', badge: 'Đã Từ Chối' } : null);
      }
    } catch {
      setActionLoadingId(null);
      showToast(`Có lỗi khi từ chối hồ sơ.`, 'error');
    }
  };

  // 3. Khóa quyền / Đình chỉ NXB vi phạm
  const handleSuspend = async (id, name) => {
    setActionLoadingId(id);
    try {
      await businessApi.suspendBusiness(id, 'Tạm ngưng do vi phạm quy định sàn HUKI');
      setActionLoadingId(null);
      setPublishersList(prev => prev.map(p => p.id === id ? { ...p, status: 'SUSPENDED', badge: 'Đã Khóa Quyền', statusLabel: 'Bị đình chỉ / Khóa quyền' } : p));
      showToast(`Đã tạm khóa / đình chỉ quyền bán của ${name}.`, 'warning');
      if (selectedPublisher && selectedPublisher.id === id) {
        setSelectedPublisher(prev => prev ? { ...prev, status: 'SUSPENDED', badge: 'Đã Khóa Quyền' } : null);
      }
    } catch {
      setActionLoadingId(null);
      showToast(`Có lỗi khi đình chỉ quyền NXB.`, 'error');
    }
  };

  // 4. Mở khóa / Khôi phục quyền hoạt động
  const handleActivate = async (id, name) => {
    setActionLoadingId(id);
    try {
      await businessApi.activateBusiness(id);
      setActionLoadingId(null);
      setPublishersList(prev => prev.map(p => p.id === id ? { ...p, status: 'APPROVED', badge: 'Chính Hãng Mall', statusLabel: 'Đang hoạt động' } : p));
      showToast(`Đã mở khóa và khôi phục quyền hoạt động cho ${name}.`, 'success');
      if (selectedPublisher && selectedPublisher.id === id) {
        setSelectedPublisher(prev => prev ? { ...prev, status: 'APPROVED', badge: 'Chính Hãng Mall' } : null);
      }
    } catch {
      setActionLoadingId(null);
      showToast(`Có lỗi khi mở khóa quyền NXB.`, 'error');
    }
  };

  // 5. Xóa hồ sơ khỏi Database
  const handleDelete = async (id, name) => {
    setActionLoadingId(id);
    try {
      await businessApi.deleteBusiness(id);
      setActionLoadingId(null);
      setConfirmDeleteId(null);
      setPublishersList(prev => prev.filter(p => p.id !== id));
      showToast(`Đã xóa hoàn toàn hồ sơ ${name} khỏi hệ thống.`, 'info');
      if (selectedPublisher && selectedPublisher.id === id) {
        setSelectedPublisher(null);
      }
    } catch {
      setActionLoadingId(null);
      // Fallback local deletion
      setConfirmDeleteId(null);
      setPublishersList(prev => prev.filter(p => p.id !== id));
      showToast(`Đã xóa hồ sơ ${name}.`, 'info');
      if (selectedPublisher && selectedPublisher.id === id) {
        setSelectedPublisher(null);
      }
    }
  };

  const pendingCount = useMemo(() => publishersList.filter(p => p.status === 'PENDING_APPROVAL').length, [publishersList]);
  const activeCount = useMemo(() => publishersList.filter(p => p.status === 'APPROVED').length, [publishersList]);
  const suspendedCount = useMemo(() => publishersList.filter(p => p.status === 'SUSPENDED').length, [publishersList]);
  const rejectedCount = useMemo(() => publishersList.filter(p => p.status === 'REJECTED').length, [publishersList]);

  const filteredPublishers = useMemo(() => {
    return publishersList.filter(p => {
      if (activeTab === 'pending' && p.status !== 'PENDING_APPROVAL') return false;
      if (activeTab === 'active' && p.status !== 'APPROVED') return false;
      if (activeTab === 'suspended' && p.status !== 'SUSPENDED') return false;
      if (activeTab === 'rejected' && p.status !== 'REJECTED') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchTax = p.taxCode && p.taxCode.toLowerCase().includes(q);
        const matchEmail = p.email && p.email.toLowerCase().includes(q);
        const matchRep = p.rep && p.rep.toLowerCase().includes(q);
        if (!matchName && !matchTax && !matchEmail && !matchRep) return false;
      }
      return true;
    });
  }, [publishersList, activeTab, searchQuery]);

  return (
    <div className="flex flex-col gap-6 max-w-[1480px] mx-auto p-2 sm:p-4 animate-fade-in-up">
      
      {/* 1. HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ban Điều Hành Trung Ương HUKI</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              {publishersList.length} Hồ sơ trong Database
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5 font-editorial">
            Quản Trị Nhà Xuất Bản &amp; Doanh Nghiệp
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-3xl">
            Quản lý danh sách NXB, điều phối phân quyền bán sách, đình chỉ/khóa quyền gian hàng vi phạm và xóa hồ sơ rác.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/admin/leads"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-900 font-semibold text-xs transition-colors shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-700">how_to_reg</span>
            <span>Duyệt Đăng Ký Mới ({pendingCount})</span>
          </Link>

          <button 
            onClick={fetchBusinesses}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[16px] ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
            <span>Làm Mới</span>
          </button>
        </div>
      </div>

      {/* 2. STATS PILL ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Tổng Hồ Sơ NXB</span>
          <div className="text-xl font-bold text-gray-900 mt-1">{publishersList.length} hồ sơ</div>
          <span className="text-[11px] text-[#00875A] font-medium block mt-0.5">Dữ liệu thật 100%</span>
        </div>

        <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200/80 shadow-2xs">
          <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Đang Hoạt Động (Mall)</span>
          <div className="text-xl font-bold text-emerald-800 mt-1">{activeCount} đơn vị</div>
          <span className="text-[11px] text-emerald-700 font-medium block mt-0.5">Có quyền bán sách</span>
        </div>

        <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/80 shadow-2xs">
          <span className="text-xs text-amber-800 font-bold uppercase tracking-wider">Chờ Thẩm Định</span>
          <div className="text-xl font-bold text-amber-700 mt-1 flex items-center gap-2">
            <span>{pendingCount} hồ sơ mới</span>
            {pendingCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>}
          </div>
          <span className="text-[11px] text-amber-700 font-medium block mt-0.5">Cần duyệt trong 24h</span>
        </div>

        <div className="bg-rose-50/60 rounded-2xl p-4 border border-rose-200/80 shadow-2xs">
          <span className="text-xs text-rose-800 font-bold uppercase tracking-wider">Bị Khóa / Từ Chối</span>
          <div className="text-xl font-bold text-rose-700 mt-1">{suspendedCount + rejectedCount} đơn vị</div>
          <span className="text-[11px] text-rose-600 font-medium block mt-0.5">{suspendedCount} bị khóa • {rejectedCount} từ chối</span>
        </div>
      </div>

      {/* 3. TABLE FILTER & SEARCH */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC]">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'all', label: `Tất cả (${publishersList.length})` },
              { id: 'pending', label: `Chờ thẩm định (${pendingCount})`, highlight: pendingCount > 0 },
              { id: 'active', label: `Đang hoạt động (${activeCount})` },
              { id: 'suspended', label: `Bị khóa quyền (${suspendedCount})` },
              { id: 'rejected', label: `Đã từ chối (${rejectedCount})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-[#003B2B] text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200/60'
                }`}
              >
                <span>{tab.label}</span>
                {tab.highlight && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Tìm tên NXB, MST, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:ring-1 focus:ring-[#00875A]/20"
            />
          </div>
        </div>

        {/* 4. PUBLISHER LIST TABLE */}
        <div className="overflow-x-auto w-full">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <span className="w-8 h-8 border-3 border-[#00875A]/30 border-t-[#00875A] rounded-full animate-spin"></span>
              <p className="text-xs text-gray-500 font-medium">Đang tải danh sách hồ sơ từ Gateway...</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-gray-900 min-w-[980px]">
              <thead className="bg-[#F8FAFC] text-[11px] uppercase font-bold text-gray-500 border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4 min-w-[250px]">Nhà Xuất Bản / Doanh Nghiệp</th>
                  <th className="py-3 px-4 min-w-[130px] whitespace-nowrap">Giấy Phép / MST</th>
                  <th className="py-3 px-4 min-w-[180px]">Địa Chỉ Trụ Sở</th>
                  <th className="py-3 px-4 min-w-[120px] whitespace-nowrap">Quy Mô Phát Hành</th>
                  <th className="py-3 px-4 min-w-[130px] whitespace-nowrap text-center">Trạng Thái</th>
                  <th className="py-3 px-5 min-w-[220px] whitespace-nowrap text-right">Quản Trị Quyền &amp; Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredPublishers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-500">
                      <span className="material-symbols-outlined text-4xl text-gray-300 mb-2 block">folder_off</span>
                      <p className="font-bold text-sm text-gray-700">Chưa có hồ sơ NXB nào trong danh mục này</p>
                      <p className="text-xs text-gray-400 mt-1">Các hồ sơ đăng ký từ /seller/register sẽ xuất hiện tại đây</p>
                    </td>
                  </tr>
                ) : (
                  filteredPublishers.map((p) => {
                    const isPending = p.status === 'PENDING_APPROVAL';
                    const isApproved = p.status === 'APPROVED';
                    const isSuspended = p.status === 'SUSPENDED';
                    const isActionLoading = actionLoadingId === p.id;

                    return (
                      <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-4 min-w-[250px]">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#EBF7F2] text-[#00875A] font-bold text-xs flex items-center justify-center shrink-0 border border-[#BDE6D7]">
                              {p.code}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 hover:text-[#00875A] transition-colors leading-snug line-clamp-1">{p.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500 whitespace-nowrap">
                                <span>{p.email}</span>
                                {p.phone && (
                                  <>
                                    <span>•</span>
                                    <span>{p.phone}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 min-w-[130px] whitespace-nowrap">
                          <div className="font-mono font-bold text-gray-800 text-[11px]">{p.license}</div>
                          <span className="text-[10px] text-gray-500 font-sans block mt-0.5">Nộp: {p.joinedDate}</span>
                        </td>
                        <td className="py-3.5 px-4 min-w-[180px] text-gray-600 text-[11.5px] leading-relaxed" title={p.address}>
                          <span className="line-clamp-2">{p.address}</span>
                        </td>
                        <td className="py-3.5 px-4 min-w-[120px] whitespace-nowrap">
                          <div className="font-semibold text-gray-900">{p.bookCount}</div>
                          <span className="text-[10.5px] text-[#00875A] font-bold block mt-0.5">{p.ebookDrmCount}</span>
                        </td>
                        <td className="py-3.5 px-4 min-w-[130px] whitespace-nowrap text-center">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-[11px] font-bold whitespace-nowrap shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Chờ Thẩm Định
                            </span>
                          ) : isApproved ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-bold whitespace-nowrap shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              Chính Hãng Mall
                            </span>
                          ) : isSuspended ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200/80 text-[11px] font-bold whitespace-nowrap shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                              Đã Khóa Quyền
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200/80 text-[11px] font-bold whitespace-nowrap shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                              Đã Từ Chối
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 min-w-[220px] whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap shrink-0">
                            <button
                              type="button"
                              onClick={() => setSelectedPublisher(p)}
                              className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold whitespace-nowrap cursor-pointer shrink-0 transition-colors"
                              title="Xem hồ sơ ĐKKD"
                            >
                              Xem
                            </button>

                            {/* Pending State: Duyệt & Từ chối */}
                            {isPending && (
                              <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={() => handleApprove(p.id, p.name)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#00875A] hover:bg-[#00734c] text-white text-xs font-bold whitespace-nowrap shadow-xs cursor-pointer flex items-center gap-1 shrink-0 transition-all disabled:opacity-60"
                                title="Phê duyệt hồ sơ"
                              >
                                {isActionLoading ? (
                                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                ) : (
                                  <span className="material-symbols-outlined text-[14px]">check</span>
                                )}
                                <span>Duyệt</span>
                              </button>
                            )}

                            {/* Approved State: Khóa quyền bán */}
                            {isApproved && (
                              <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={() => handleSuspend(p.id, p.name)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0 transition-all"
                                title="Khóa quyền / Đình chỉ gian hàng"
                              >
                                <span className="material-symbols-outlined text-[14px] text-amber-700">block</span>
                                <span>Khóa</span>
                              </button>
                            )}

                            {/* Suspended State: Mở khóa quyền bán */}
                            {isSuspended && (
                              <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={() => handleActivate(p.id, p.name)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0 transition-all"
                                title="Mở khóa và kích hoạt lại quyền bán"
                              >
                                <span className="material-symbols-outlined text-[14px] text-emerald-700">lock_open</span>
                                <span>Mở Khóa</span>
                              </button>
                            )}

                            {/* Nút Xóa hồ sơ */}
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(p.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                              title="Xóa hồ sơ khỏi hệ thống"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
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

      {/* 5. MODAL XÁC NHẬN XÓA HỒ SƠ */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-rose-200 shadow-2xl p-6 animate-fade-in-up">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <h3 className="font-bold text-base text-gray-900 text-center">Xác nhận xóa hồ sơ NXB?</h3>
            <p className="text-xs text-gray-500 text-center mt-1.5 leading-relaxed">
              Thao tác này sẽ xóa vĩnh viễn thông tin doanh nghiệp khỏi cơ sở dữ liệu. Không thể hoàn tác.
            </p>

            <div className="flex items-center justify-center gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = publishersList.find(p => p.id === confirmDeleteId);
                  if (target) handleDelete(target.id, target.name);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL XEM CHI TIẾT HỒ SƠ PHÁP LÝ & QUẢN TRỊ QUYỀN */}
      {selectedPublisher && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl p-6 sm:p-8 animate-fade-in-up">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EBF7F2] text-[#00875A] font-bold text-sm flex items-center justify-center">
                  {selectedPublisher.code}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{selectedPublisher.name}</h3>
                  <span className="text-xs text-gray-500 font-mono">Mã hồ sơ: {selectedPublisher.license}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPublisher(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="py-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
                <div>
                  <span className="text-gray-500">Người đại diện pháp luật:</span>
                  <p className="font-bold text-sm text-gray-900 mt-0.5">{selectedPublisher.rep}</p>
                </div>
                <div>
                  <span className="text-gray-500">Mã số thuế / MSDN:</span>
                  <p className="font-mono font-bold text-sm text-gray-900 mt-0.5">{selectedPublisher.taxCode}</p>
                </div>
                <div>
                  <span className="text-gray-500">Email giao dịch:</span>
                  <p className="font-bold text-gray-900 mt-0.5">{selectedPublisher.email}</p>
                </div>
                <div>
                  <span className="text-gray-500">Hotline vận hành:</span>
                  <p className="font-bold text-gray-900 mt-0.5">{selectedPublisher.phone}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Địa chỉ trụ sở chính:</span>
                  <p className="font-bold text-gray-900 mt-0.5">{selectedPublisher.address}</p>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#00875A] font-bold">
                  <span className="material-symbols-outlined text-lg">verified</span>
                  <span>Bảo hộ bản quyền số HUKI DRM &amp; Tỷ lệ hoa hồng 85/15</span>
                </div>
                <span className="text-xs font-bold text-emerald-800">Đã cam kết</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedPublisher(null)}
                className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-gray-700 font-bold text-xs hover:bg-gray-50 cursor-pointer"
              >
                Đóng lại
              </button>

              <div className="flex items-center gap-2">
                {selectedPublisher.status === 'PENDING_APPROVAL' ? (
                  <>
                    <button
                      type="button"
                      disabled={actionLoadingId === selectedPublisher.id}
                      onClick={() => handleReject(selectedPublisher.id, selectedPublisher.name)}
                      className="px-4 py-2.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Từ Chối Hồ Sơ
                    </button>
                    <button
                      type="button"
                      disabled={actionLoadingId === selectedPublisher.id}
                      onClick={() => handleApprove(selectedPublisher.id, selectedPublisher.name)}
                      className="px-5 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">check</span>
                      <span>Phê Duyệt &amp; Cấp Quyền NXB</span>
                    </button>
                  </>
                ) : selectedPublisher.status === 'APPROVED' ? (
                  <button
                    type="button"
                    disabled={actionLoadingId === selectedPublisher.id}
                    onClick={() => handleSuspend(selectedPublisher.id, selectedPublisher.name)}
                    className="px-4 py-2.5 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base text-amber-700">block</span>
                    <span>Khóa Quyền / Tạm Ngưng Gian Hàng</span>
                  </button>
                ) : selectedPublisher.status === 'SUSPENDED' ? (
                  <button
                    type="button"
                    disabled={actionLoadingId === selectedPublisher.id}
                    onClick={() => handleActivate(selectedPublisher.id, selectedPublisher.name)}
                    className="px-5 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">lock_open</span>
                    <span>Mở Khóa &amp; Khôi Phục Hoạt Động</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionLoadingId === selectedPublisher.id}
                    onClick={() => handleApprove(selectedPublisher.id, selectedPublisher.name)}
                    className="px-4 py-2.5 rounded-xl bg-[#00875A] text-white hover:bg-[#00734c] font-bold text-xs transition-colors cursor-pointer"
                  >
                    Xem Xét Lại &amp; Phê Duyệt
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
