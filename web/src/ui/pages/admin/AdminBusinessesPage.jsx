import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất Cả' },
  { key: 'PENDING_APPROVAL', label: 'Chờ Xét Duyệt' },
  { key: 'APPROVED', label: 'Đã Phê Duyệt' },
  { key: 'REJECTED', label: 'Đã Từ Chối' },
];

const STATUS_CONFIG = {
  PENDING_APPROVAL: {
    label: 'Chờ xét duyệt',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: 'hourglass_top',
  },
  APPROVED: {
    label: 'Đã phê duyệt',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: 'check_circle',
  },
  REJECTED: {
    label: 'Đã từ chối',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    icon: 'cancel',
  },
  SUSPENDED: {
    label: 'Tạm ngưng',
    badge: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: 'block',
  },
};

export default function AdminBusinessesPage() {
  const { showToast } = useToast();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Drawer / Modal State
  const [selectedBiz, setSelectedBiz] = useState(null);
  const [rejectModalBiz, setRejectModalBiz] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getBusinesses({ limit: 100 });
      if (res.success && Array.isArray(res.data)) {
        setBusinesses(res.data);
      } else {
        setBusinesses([]);
      }
    } catch (err) {
      console.warn('Lỗi khi tải danh sách doanh nghiệp:', err);
      showToast({
        title: 'Lỗi tải dữ liệu',
        message: 'Không thể kết nối đến máy chủ quản trị. Vui lòng thử lại!',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  // Bộ lọc danh sách
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((biz) => {
      if (activeTab !== 'ALL' && biz.status !== activeTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = biz.name?.toLowerCase().includes(q);
        const matchTax = biz.taxCode?.toLowerCase().includes(q);
        const matchEmail = biz.email?.toLowerCase().includes(q);
        const matchPhone = biz.phone?.toLowerCase().includes(q);
        return matchName || matchTax || matchEmail || matchPhone;
      }
      return true;
    });
  }, [businesses, activeTab, searchQuery]);

  // Đếm số lượng theo tab
  const counts = useMemo(() => {
    return {
      ALL: businesses.length,
      PENDING_APPROVAL: businesses.filter((b) => b.status === 'PENDING_APPROVAL').length,
      APPROVED: businesses.filter((b) => b.status === 'APPROVED').length,
      REJECTED: businesses.filter((b) => b.status === 'REJECTED').length,
    };
  }, [businesses]);

  // Xử lý phê duyệt
  const handleApprove = async (biz) => {
    if (!biz || actionLoadingId) return;
    setActionLoadingId(biz.id);
    try {
      const res = await adminApi.approveBusiness(biz.id);
      if (res.success) {
        showToast({
          title: 'Phê duyệt thành công',
          message: `Doanh nghiệp "${biz.name}" đã được cấp quyền hoạt động trên sàn!`,
          type: 'success',
        });
        fetchBusinesses();
        if (selectedBiz?.id === biz.id) {
          setSelectedBiz({ ...selectedBiz, status: 'APPROVED' });
        }
      } else {
        showToast({
          title: 'Phê duyệt thất bại',
          message: res.error || 'Vui lòng kiểm tra lại trạng thái hồ sơ!',
          type: 'error',
        });
      }
    } catch (err) {
      showToast({
        title: 'Lỗi thao tác',
        message: err?.message || 'Không thể thực hiện phê duyệt lúc này.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Xử lý từ chối
  const handleConfirmReject = async () => {
    if (!rejectModalBiz || actionLoadingId) return;
    const finalReason = rejectReason.trim() || 'Hồ sơ chưa đáp ứng tiêu chuẩn nền tảng';
    setActionLoadingId(rejectModalBiz.id);
    try {
      const res = await adminApi.rejectBusiness(rejectModalBiz.id, finalReason);
      if (res.success) {
        showToast({
          title: 'Đã từ chối hồ sơ',
          message: `Đã từ chối doanh nghiệp "${rejectModalBiz.name}" kèm lý do.`,
          type: 'info',
        });
        setRejectModalBiz(null);
        setRejectReason('');
        fetchBusinesses();
        if (selectedBiz?.id === rejectModalBiz.id) {
          setSelectedBiz({ ...selectedBiz, status: 'REJECTED' });
        }
      } else {
        showToast({
          title: 'Thao tác thất bại',
          message: res.error || 'Không thể từ chối hồ sơ này.',
          type: 'error',
        });
      }
    } catch (err) {
      showToast({
        title: 'Lỗi thao tác',
        message: err?.message || 'Có lỗi xảy ra khi từ chối hồ sơ.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      
      {/* 1. TOP HEADER & SUMMARY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
              XÉT DUYỆT ĐỐI TÁC
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500 font-medium">Quản lý pháp lý &amp; Doanh nghiệp</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1 font-editorial">
            Hàng Chờ Xét Duyệt Doanh Nghiệp
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Xem xét, phê duyệt hoặc từ chối hồ sơ đăng ký phát hành sách của các đơn vị đối tác.
          </p>
        </div>

        <button
          onClick={fetchBusinesses}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto disabled:opacity-60"
        >
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin text-emerald-600' : 'text-gray-500'}`}>
            refresh
          </span>
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* 2. TABS & SEARCH BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
        
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {STATUS_TABS.map((tab) => {
            const isSelected = activeTab === tab.key;
            const count = counts[tab.key] || 0;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-[#00875A] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : tab.key === 'PENDING_APPROVAL' && count > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên DN, MST, email, SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 3. BUSINESSES TABLE / LIST */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-gray-400">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            <span className="text-xs font-semibold">Đang tải danh sách doanh nghiệp...</span>
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center text-gray-400">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">domain_disabled</span>
            <p className="text-sm font-bold text-gray-600">Không tìm thấy doanh nghiệp nào</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {searchQuery ? 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.' : 'Hiện không có hồ sơ nào trong danh mục này.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Doanh Nghiệp</th>
                  <th className="py-3 px-4">Mã Số Thuế</th>
                  <th className="py-3 px-4">Thông Tin Liên Hệ</th>
                  <th className="py-3 px-4">Ngày Đăng Ký</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBusinesses.map((biz) => {
                  const cfg = STATUS_CONFIG[biz.status] || STATUS_CONFIG.PENDING_APPROVAL;
                  const isPending = biz.status === 'PENDING_APPROVAL';
                  const isBusy = actionLoadingId === biz.id;

                  return (
                    <tr key={biz.id} className="hover:bg-gray-50/60 transition-colors">
                      
                      {/* Name & Slug */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center text-gray-700 font-extrabold text-sm shrink-0">
                            {biz.name ? biz.name.charAt(0).toUpperCase() : 'B'}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900 block truncate hover:text-[#00875A] cursor-pointer" onClick={() => setSelectedBiz(biz)}>
                              {biz.name}
                            </span>
                            <span className="text-[11px] text-gray-400 block truncate">
                              ID: {biz.id.slice(0, 8)}... • Slug: /{biz.slug || 'n-a'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Tax code */}
                      <td className="py-3.5 px-4 font-mono font-medium text-gray-700">
                        {biz.taxCode || <span className="text-gray-400 font-sans italic">Chưa cung cấp</span>}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="text-gray-900 font-medium truncate">{biz.email || 'N/A'}</div>
                        <div className="text-[11px] text-gray-500">{biz.phone || 'Chưa có SĐT'}</div>
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-gray-500">
                        {biz.createdAt ? new Date(biz.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.badge}`}>
                          <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedBiz(biz)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                            title="Xem chi tiết hồ sơ"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>

                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(biz)}
                                disabled={isBusy}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-2xs"
                                title="Phê duyệt doanh nghiệp"
                              >
                                <span className="material-symbols-outlined text-[14px]">check</span>
                                <span>Duyệt</span>
                              </button>

                              <button
                                onClick={() => {
                                  setRejectModalBiz(biz);
                                  setRejectReason('');
                                }}
                                disabled={isBusy}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-[11px] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                title="Từ chối hồ sơ"
                              >
                                <span className="material-symbols-outlined text-[14px]">close</span>
                                <span>Từ chối</span>
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
          </div>
        )}
      </div>

      {/* 4. DETAIL SIDE DRAWER */}
      {selectedBiz && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedBiz(null)}
          />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl z-10 flex flex-col overflow-hidden animate-slide-left">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[#00875A] text-white flex items-center justify-center font-bold text-sm">
                  <span className="material-symbols-outlined text-[18px]">domain</span>
                </span>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Chi Tiết Hồ Sơ Doanh Nghiệp</h2>
                  <p className="text-[11px] text-gray-500">Mã: {selectedBiz.id}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedBiz(null)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 text-xs">
              
              {/* Profile Card */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-900">{selectedBiz.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${(STATUS_CONFIG[selectedBiz.status] || STATUS_CONFIG.PENDING_APPROVAL).badge}`}>
                    {(STATUS_CONFIG[selectedBiz.status] || STATUS_CONFIG.PENDING_APPROVAL).label}
                  </span>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {selectedBiz.description || 'Chưa có mô tả chi tiết cho doanh nghiệp này.'}
                </p>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">MÃ SỐ THUẾ</span>
                  <span className="font-mono font-bold text-gray-900">{selectedBiz.taxCode || 'N/A'}</span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SỐ ĐIỆN THOẠI</span>
                  <span className="font-semibold text-gray-900">{selectedBiz.phone || 'N/A'}</span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-1 col-span-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">EMAIL LIÊN HỆ</span>
                  <span className="font-semibold text-gray-900 truncate">{selectedBiz.email || 'N/A'}</span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-1 col-span-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ĐỊA CHỈ TRỤ SỞ / KHO HÀNG</span>
                  <span className="text-gray-700 leading-relaxed">{selectedBiz.address || 'Chưa có thông tin địa chỉ.'}</span>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-gray-200 bg-gray-50/70 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedBiz(null)}
                className="px-4 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs transition-colors"
              >
                Đóng
              </button>

              {selectedBiz.status === 'PENDING_APPROVAL' && (
                <>
                  <button
                    onClick={() => {
                      setRejectModalBiz(selectedBiz);
                      setRejectReason('');
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs transition-colors"
                  >
                    Từ chối
                  </button>
                  <button
                    onClick={() => handleApprove(selectedBiz)}
                    disabled={actionLoadingId === selectedBiz.id}
                    className="px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00704A] text-white font-bold text-xs transition-all shadow-xs"
                  >
                    Phê duyệt ngay
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. REJECT MODAL / DIALOG */}
      {rejectModalBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setRejectModalBiz(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl z-10 flex flex-col gap-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="material-symbols-outlined text-3xl">cancel</span>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Từ Chối Hồ Sơ Doanh Nghiệp</h3>
                <p className="text-xs text-gray-500">Doanh nghiệp: {rejectModalBiz.name}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-700">
                Lý do từ chối <span className="text-rose-500">*</span>:
              </label>
              <textarea
                rows={3}
                placeholder="Nhập lý do từ chối để thông báo cho doanh nghiệp chỉnh sửa lại..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-rose-500 focus:bg-white transition-all resize-none"
              />

              {/* Quick Preset Reasons */}
              <div className="flex flex-wrap gap-1.5 mt-1">
                {[
                  'Mã số thuế không hợp lệ',
                  'Thiếu giấy phép kinh doanh',
                  'Thông tin liên hệ không chính xác',
                  'Trùng lặp hồ sơ doanh nghiệp',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectReason(preset)}
                    className="text-[10px] px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setRejectModalBiz(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoadingId === rejectModalBiz.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-xs"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
