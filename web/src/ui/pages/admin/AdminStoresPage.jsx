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
    label: 'Đang hoạt động',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: 'check_circle',
  },
  REJECTED: {
    label: 'Đã từ chối',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    icon: 'cancel',
  },
  SUSPENDED: {
    label: 'Tạm khóa',
    badge: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: 'block',
  },
  CLOSED: {
    label: 'Đã đóng cửa',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
    icon: 'lock',
  },
};

export default function AdminStoresPage() {
  const { showToast } = useToast();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Drawer / Modal State
  const [selectedStore, setSelectedStore] = useState(null);
  const [rejectModalStore, setRejectModalStore] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getStores({ limit: 100 });
      if (res.success && Array.isArray(res.data)) {
        setStores(res.data);
      } else {
        setStores([]);
      }
    } catch (err) {
      console.warn('Lỗi khi tải danh sách cửa hàng:', err);
      showToast({
        title: 'Lỗi tải dữ liệu',
        message: 'Không thể tải danh sách cửa hàng từ Gateway.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Bộ lọc danh sách
  const filteredStores = useMemo(() => {
    return stores.filter((st) => {
      if (activeTab !== 'ALL' && st.status !== activeTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = st.name?.toLowerCase().includes(q);
        const matchSlug = st.slug?.toLowerCase().includes(q);
        const matchEmail = st.email?.toLowerCase().includes(q);
        const matchPhone = st.phone?.toLowerCase().includes(q);
        return matchName || matchSlug || matchEmail || matchPhone;
      }
      return true;
    });
  }, [stores, activeTab, searchQuery]);

  // Đếm số lượng theo tab
  const counts = useMemo(() => {
    return {
      ALL: stores.length,
      PENDING_APPROVAL: stores.filter((s) => s.status === 'PENDING_APPROVAL').length,
      APPROVED: stores.filter((s) => s.status === 'APPROVED').length,
      REJECTED: stores.filter((s) => s.status === 'REJECTED').length,
    };
  }, [stores]);

  // Xử lý phê duyệt Store
  const handleApprove = async (store) => {
    if (!store || actionLoadingId) return;
    setActionLoadingId(store.id);
    try {
      const res = await adminApi.approveStore(store.id);
      if (res.success) {
        showToast({
          title: 'Phê duyệt Store thành công',
          message: `Cửa hàng "${store.name}" đã được mở bán trên sàn!`,
          type: 'success',
        });
        fetchStores();
        if (selectedStore?.id === store.id) {
          setSelectedStore({ ...selectedStore, status: 'APPROVED' });
        }
      } else {
        showToast({
          title: 'Phê duyệt thất bại',
          message: res.error || 'Vui lòng thử lại sau!',
          type: 'error',
        });
      }
    } catch (err) {
      showToast({
        title: 'Lỗi thao tác',
        message: err?.message || 'Có lỗi khi phê duyệt cửa hàng.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Xử lý từ chối Store
  const handleConfirmReject = async () => {
    if (!rejectModalStore || actionLoadingId) return;
    const finalReason = rejectReason.trim() || 'Cửa hàng chưa đáp ứng quy định nền tảng';
    setActionLoadingId(rejectModalStore.id);
    try {
      const res = await adminApi.rejectStore(rejectModalStore.id, finalReason);
      if (res.success) {
        showToast({
          title: 'Đã từ chối Store',
          message: `Đã từ chối cửa hàng "${rejectModalStore.name}".`,
          type: 'info',
        });
        setRejectModalStore(null);
        setRejectReason('');
        fetchStores();
        if (selectedStore?.id === rejectModalStore.id) {
          setSelectedStore({ ...selectedStore, status: 'REJECTED' });
        }
      } else {
        showToast({
          title: 'Từ chối thất bại',
          message: res.error || 'Không thể từ chối cửa hàng lúc này.',
          type: 'error',
        });
      }
    } catch (err) {
      showToast({
        title: 'Lỗi thao tác',
        message: err?.message || 'Có lỗi xảy ra khi từ chối cửa hàng.',
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
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
              XÉT DUYỆT ĐỐI TÁC
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500 font-medium">Quản lý gian hàng &amp; Cửa hàng</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1 font-editorial">
            Hàng Chờ Xét Duyệt Cửa Hàng (Stores)
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Xem xét và phê duyệt các gian hàng sách trực thuộc doanh nghiệp trước khi phát hành công khai.
          </p>
        </div>

        <button
          onClick={fetchStores}
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
            placeholder="Tìm theo tên Store, slug, email, SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 3. STORES TABLE / LIST */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-gray-400">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            <span className="text-xs font-semibold">Đang tải danh sách cửa hàng...</span>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center text-gray-400">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">store_mall_directory</span>
            <p className="text-sm font-bold text-gray-600">Không tìm thấy cửa hàng nào</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {searchQuery ? 'Thử thay đổi từ khóa tìm kiếm hoặc chọn tab khác.' : 'Hiện không có cửa hàng nào trong danh mục này.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Cửa Hàng (Store)</th>
                  <th className="py-3 px-4">Đường Dẫn (Slug)</th>
                  <th className="py-3 px-4">Thông Tin Liên Hệ</th>
                  <th className="py-3 px-4">Ngày Đăng Ký</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStores.map((st) => {
                  const cfg = STATUS_CONFIG[st.status] || STATUS_CONFIG.PENDING_APPROVAL;
                  const isPending = st.status === 'PENDING_APPROVAL';
                  const isBusy = actionLoadingId === st.id;

                  return (
                    <tr key={st.id} className="hover:bg-gray-50/60 transition-colors">
                      
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-800 font-extrabold text-sm shrink-0">
                            {st.name ? st.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900 block truncate hover:text-[#00875A] cursor-pointer" onClick={() => setSelectedStore(st)}>
                              {st.name}
                            </span>
                            <span className="text-[11px] text-gray-400 block truncate">
                              ID: {st.id.slice(0, 8)}... • Biz: {st.businessId ? st.businessId.slice(0, 8) + '...' : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="py-3.5 px-4 font-mono text-gray-600">
                        /{st.slug}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="text-gray-900 font-medium truncate">{st.email || 'N/A'}</div>
                        <div className="text-[11px] text-gray-500">{st.phone || 'Chưa có SĐT'}</div>
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-gray-500">
                        {st.createdAt ? new Date(st.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
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
                            onClick={() => setSelectedStore(st)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                            title="Xem chi tiết cửa hàng"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>

                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(st)}
                                disabled={isBusy}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-2xs"
                                title="Phê duyệt Store"
                              >
                                <span className="material-symbols-outlined text-[14px]">check</span>
                                <span>Duyệt</span>
                              </button>

                              <button
                                onClick={() => {
                                  setRejectModalStore(st);
                                  setRejectReason('');
                                }}
                                disabled={isBusy}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-[11px] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                title="Từ chối Store"
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
      {selectedStore && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedStore(null)}
          />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl z-10 flex flex-col overflow-hidden animate-slide-left">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  <span className="material-symbols-outlined text-[18px]">storefront</span>
                </span>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Chi Tiết Cửa Hàng</h2>
                  <p className="text-[11px] text-gray-500">Mã: {selectedStore.id}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStore(null)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 text-xs">
              
              {/* Card info */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-900">{selectedStore.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${(STATUS_CONFIG[selectedStore.status] || STATUS_CONFIG.PENDING_APPROVAL).badge}`}>
                    {(STATUS_CONFIG[selectedStore.status] || STATUS_CONFIG.PENDING_APPROVAL).label}
                  </span>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {selectedStore.description || 'Chưa có thông tin mô tả chi tiết cho cửa hàng này.'}
                </p>
              </div>

              {/* Grid info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ĐƯỜNG DẪN (SLUG)</span>
                  <span className="font-mono font-bold text-gray-900 truncate">/{selectedStore.slug}</span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SỐ ĐIỆN THOẠI</span>
                  <span className="font-semibold text-gray-900">{selectedStore.phone || 'N/A'}</span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-1 col-span-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">EMAIL CỬA HÀNG</span>
                  <span className="font-semibold text-gray-900 truncate">{selectedStore.email || 'N/A'}</span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-1 col-span-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ĐỊA CHỈ KHO / CỬA HÀNG</span>
                  <span className="text-gray-700 leading-relaxed">{selectedStore.address || 'Chưa cập nhật địa chỉ kho.'}</span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-1 col-span-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">DOANH NGHIỆP CHỦ QUẢN</span>
                  <span className="font-mono text-gray-700">{selectedStore.businessId || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50/70 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedStore(null)}
                className="px-4 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs transition-colors"
              >
                Đóng
              </button>

              {selectedStore.status === 'PENDING_APPROVAL' && (
                <>
                  <button
                    onClick={() => {
                      setRejectModalStore(selectedStore);
                      setRejectReason('');
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs transition-colors"
                  >
                    Từ chối
                  </button>
                  <button
                    onClick={() => handleApprove(selectedStore)}
                    disabled={actionLoadingId === selectedStore.id}
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

      {/* 5. REJECT STORE MODAL */}
      {rejectModalStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setRejectModalStore(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl z-10 flex flex-col gap-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="material-symbols-outlined text-3xl">cancel</span>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Từ Chối Phê Duyệt Cửa Hàng</h3>
                <p className="text-xs text-gray-500">Cửa hàng: {rejectModalStore.name}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-700">
                Lý do từ chối:
              </label>
              <textarea
                rows={3}
                placeholder="Nhập lý do từ chối để thông báo cho đối tác..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-rose-500 focus:bg-white transition-all resize-none"
              />

              <div className="flex flex-wrap gap-1.5 mt-1">
                {[
                  'Tên cửa hàng vi phạm thương hiệu',
                  'Thông tin địa chỉ kho không hợp lệ',
                  'Trùng lặp đường dẫn (slug)',
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
                onClick={() => setRejectModalStore(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoadingId === rejectModalStore.id}
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
