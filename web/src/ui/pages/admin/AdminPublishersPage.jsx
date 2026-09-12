import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { businessApi } from '../../api/businessApi';

export default function AdminPublishersPage() {
  const { showToast } = useToast();
  const location = useLocation();
  const entityType = location.pathname.includes('/stores') ? 'stores' : 'businesses';
  const entityLabel = entityType === 'stores' ? 'Gian Hàng' : 'Doanh Nghiệp';
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');

      const response = entityType === 'stores'
        ? await businessApi.getAllStores({ page: 1, limit: 50, search: searchQuery.trim() || undefined })
        : await businessApi.getAllBusinesses({ page: 1, limit: 50, search: searchQuery.trim() || undefined });

      if (!active) return;
      if (!response.success) {
        setPublishers([]);
        setError(response.error?.message || `Không thể tải danh sách ${entityLabel.toLowerCase()}.`);
      } else {
        setPublishers((response.data || []).map((item) => toAdminRow(item, entityType)));
      }
      setLoading(false);
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [entityLabel, entityType, refreshKey, searchQuery]);

  const handleReview = async (publisher, decision) => {
    setActionId(publisher.id);
    const isStore = entityType === 'stores';
    const response = decision === 'approve'
      ? (isStore ? await businessApi.approveStore(publisher.id) : await businessApi.approveBusiness(publisher.id))
      : (isStore ? await businessApi.rejectStore(publisher.id) : await businessApi.rejectBusiness(publisher.id, 'Hồ sơ chưa đáp ứng điều kiện phê duyệt'));

    if (response.success) {
      showToast(`${decision === 'approve' ? 'Đã duyệt' : 'Đã từ chối'} ${publisher.name}.`, 'success');
      setRefreshKey((value) => value + 1);
    } else {
      showToast(response.error?.message || 'Không thể cập nhật trạng thái hồ sơ.', 'error');
    }
    setActionId('');
  };
  const filteredPublishers = publishers.filter(p => {
    if (activeTab === 'mall' && p.status !== 'active') return false;
    if (activeTab === 'pending' && p.status !== 'pending') return false;
    if (searchQuery.trim() && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  const approvedCount = publishers.filter((publisher) => publisher.status === 'active').length;
  const pendingCount = publishers.filter((publisher) => publisher.status === 'pending').length;
  const rejectedCount = publishers.filter((publisher) => publisher.status === 'rejected').length;

  return (
    <div className="flex flex-col gap-6 max-w-[1480px] mx-auto">
      
      {/* 1. HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Quản Lý Đối Tác B2B</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">{publishers.length} {entityLabel}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5 font-editorial">
            Quản Lý {entityLabel}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Thẩm định, phê duyệt hoặc từ chối hồ sơ {entityLabel.toLowerCase()} theo quy trình Phase 3.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled
            title="Xuất Excel thuộc phase sau"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-gray-500 font-semibold text-xs shadow-2xs cursor-not-allowed opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            disabled
            title="Cấp quyền đặc cách thuộc phase sau"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00875A] text-white font-bold text-xs shadow-sm cursor-not-allowed opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]">add_business</span>
            <span>+ Cấp Quyền Mới</span>
          </button>
        </div>
      </div>

      {/* 2. STATS PILL ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-gray-500 font-semibold">Tổng Hồ Sơ</span>
          <div className="text-xl font-bold text-gray-900 mt-1">{publishers.length} hồ sơ</div>
          <span className="text-[11px] text-[#00875A] font-medium block mt-0.5">Dữ liệu trực tiếp từ HUKI Platform</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-gray-500 font-semibold">Đã Phê Duyệt</span>
          <div className="text-xl font-bold text-emerald-800 mt-1">{approvedCount} hồ sơ</div>
          <span className="text-[11px] text-gray-400 font-medium block mt-0.5">Đủ điều kiện hoạt động</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-gray-500 font-semibold">Hồ Sơ Chờ Thẩm Định</span>
          <div className="text-xl font-bold text-amber-600 mt-1">{pendingCount} hồ sơ mới</div>
          <span className="text-[11px] text-amber-600 font-medium block mt-0.5">Cần duyệt trong 24h</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-gray-500 font-semibold">Đã Từ Chối</span>
          <div className="text-xl font-bold text-red-700 mt-1">{rejectedCount} hồ sơ</div>
          <span className="text-[11px] text-gray-400 font-medium block mt-0.5">Có thể đăng ký lại sau khi bổ sung</span>
        </div>
      </div>

      {/* 3. TABLE FILTER & SEARCH */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFBFD]">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'all', label: `Tất cả (${publishers.length})` },
              { id: 'mall', label: `Đã phê duyệt (${approvedCount})` },
              { id: 'pending', label: `Chờ thẩm định (${pendingCount})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#00875A] text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder={`Tìm tên ${entityLabel.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-[#E2E8F0] text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A]"
            />
          </div>
        </div>

        {/* 4. PUBLISHER LIST TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#F8FAFC] text-[11px] uppercase font-bold text-gray-400 border-b border-[#F1F5F9]">
              <tr>
                <th className="py-3 px-4">{entityLabel}</th>
                <th className="py-3 px-4">Mã Hồ Sơ</th>
                <th className="py-3 px-4">Quy Mô Phát Hành</th>
                <th className="py-3 px-4">Doanh Thu Tháng</th>
                <th className="py-3 px-4">Tỷ Lệ Chia Sẻ</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading && <AdminTableMessage colSpan={7} icon="progress_activity" message="Đang tải dữ liệu..." spinning />}
              {!loading && error && <AdminTableMessage colSpan={7} icon="cloud_off" message={error} tone="error" />}
              {!loading && !error && filteredPublishers.length === 0 && <AdminTableMessage colSpan={7} icon="inbox" message="Không có hồ sơ phù hợp." />}
              {filteredPublishers.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#EBF7F2] text-[#00875A] font-bold text-xs flex items-center justify-center shrink-0 border border-[#BDE6D7]">
                        {p.code.substring(0, 3)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 hover:text-[#00875A] transition-colors">{p.name}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                          <span>{p.rep}</span>
                          <span>•</span>
                          <span>{p.phone}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600">
                    <div>{p.license}</div>
                    <span className="text-[10px] text-gray-400">Gia nhập: {p.joinedDate}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-gray-800">{p.bookCount}</div>
                    <span className="text-[10px] text-[#00875A] font-medium">{p.ebookDrmCount} DRM</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-900 text-[13px]">
                    {p.revenue}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-gray-600">
                    {p.split}
                  </td>
                  <td className="py-3.5 px-4">
                    {p.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        {p.badge}
                      </span>
                    ) : p.status === 'rejected' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-[10.5px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                        {p.badge}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10.5px] font-bold animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                        {p.badge}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {p.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            disabled={actionId === p.id}
                            onClick={() => handleReview(p, 'approve')}
                            className="px-3 py-1.5 rounded-lg bg-[#00875A] text-white text-xs font-bold hover:bg-[#00734c] transition-all cursor-pointer disabled:opacity-50"
                          >
                            {actionId === p.id ? 'Đang xử lý...' : 'Duyệt'}
                          </button>
                          <button
                            type="button"
                            disabled={actionId === p.id}
                            onClick={() => handleReview(p, 'reject')}
                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-all cursor-pointer disabled:opacity-50"
                          >
                            Từ chối
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title="Trang hồ sơ chi tiết thuộc phase sau"
                          className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-semibold cursor-not-allowed opacity-60"
                        >
                          Xem hồ sơ
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function toAdminRow(item, entityType) {
  const statusMap = {
    APPROVED: { status: 'active', badge: 'Đã phê duyệt' },
    PENDING_APPROVAL: { status: 'pending', badge: 'Chờ thẩm định' },
    REJECTED: { status: 'rejected', badge: 'Đã từ chối' },
    SUSPENDED: { status: 'rejected', badge: 'Tạm đình chỉ' },
    CLOSED: { status: 'rejected', badge: 'Đã đóng' }
  };
  const mappedStatus = statusMap[item.status] || statusMap.PENDING_APPROVAL;
  const isStore = entityType === 'stores';
  const code = item.name
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'HUKI';

  return {
    id: item.id,
    name: item.name,
    code,
    badge: mappedStatus.badge,
    license: isStore ? `/${item.slug}` : (item.taxCode || item.id),
    rep: item.email || 'Chưa cập nhật email',
    email: item.email || '',
    phone: item.phone || 'Chưa cập nhật SĐT',
    revenue: '—',
    bookCount: isStore ? 'Danh mục riêng' : 'Quản lý gian hàng',
    ebookDrmCount: 'Dữ liệu Phase 3',
    split: '—',
    status: mappedStatus.status,
    statusLabel: mappedStatus.badge,
    joinedDate: item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—'
  };
}

function AdminTableMessage({ colSpan, icon, message, tone = 'neutral', spinning = false }) {
  return (
    <tr>
      <td colSpan={colSpan} className={`px-4 py-12 text-center ${tone === 'error' ? 'text-red-700' : 'text-gray-500'}`} role={tone === 'error' ? 'alert' : 'status'}>
        <span className={`material-symbols-outlined block text-3xl ${spinning ? 'animate-spin' : ''}`} aria-hidden="true">{icon}</span>
        <span className="mt-2 block text-sm font-semibold">{message}</span>
      </td>
    </tr>
  );
}
