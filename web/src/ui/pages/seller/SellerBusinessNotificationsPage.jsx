import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { businessApi } from '../../api/businessApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function SellerBusinessNotificationsPage() {
  const navigate = useNavigate();
  const { user, activeBusinessId } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'APPROVED' | 'REJECTED' | 'PENDING'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Selection state for deletion
  const [selectedIds, setSelectedIds] = useState([]);

  // Local storage state for Read & Deleted tracking
  const [readMap, setReadMap] = useState({});
  const [deletedMap, setDeletedMap] = useState({});

  const bizId = user?.business?.id || activeBusinessId;

  // Load read & deleted maps from localStorage
  useEffect(() => {
    if (!bizId) return;
    try {
      const storedRead = JSON.parse(localStorage.getItem(`huki_read_req_noti_${bizId}`) || '{}');
      const storedDeleted = JSON.parse(localStorage.getItem(`huki_deleted_req_noti_${bizId}`) || '{}');
      setReadMap(storedRead);
      setDeletedMap(storedDeleted);
    } catch {
      // ignore
    }
  }, [bizId]);

  // Tải danh sách yêu cầu cập nhật hồ sơ & phản hồi từ Admin
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await businessApi.getMyUpdateRequests();
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : res.data.data || [];
        setRequests(list);
      }
    } catch (err) {
      console.error('Failed to load business update notifications:', err);
      showToast('Không thể tải danh sách thông báo.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Listen for storage / custom sync event
  useEffect(() => {
    const handleSync = () => {
      if (!bizId) return;
      try {
        const storedRead = JSON.parse(localStorage.getItem(`huki_read_req_noti_${bizId}`) || '{}');
        const storedDeleted = JSON.parse(localStorage.getItem(`huki_deleted_req_noti_${bizId}`) || '{}');
        setReadMap(storedRead);
        setDeletedMap(storedDeleted);
      } catch {
        // ignore
      }
    };
    window.addEventListener('huki_noti_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('huki_noti_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [bizId]);

  // Danh sách thông báo chưa bị xóa
  const nonDeletedRequests = useMemo(() => {
    return requests.filter((req) => !deletedMap[req.id]);
  }, [requests, deletedMap]);

  // Bộ lọc dữ liệu theo trạng thái & từ khóa tìm kiếm
  const filteredRequests = useMemo(() => {
    return nonDeletedRequests.filter((req) => {
      const matchStatus = activeTab === 'ALL' || req.status === activeTab;
      const matchSearch =
        !searchTerm.trim() ||
        req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.requestedData?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.rejectionReason?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [nonDeletedRequests, activeTab, searchTerm]);

  // Thống kê số lượng theo trạng thái
  const counts = useMemo(() => {
    return {
      all: nonDeletedRequests.length,
      approved: nonDeletedRequests.filter((r) => r.status === 'APPROVED').length,
      rejected: nonDeletedRequests.filter((r) => r.status === 'REJECTED').length,
      pending: nonDeletedRequests.filter((r) => r.status === 'PENDING').length,
      unread: nonDeletedRequests.filter((r) => !readMap[r.id]).length,
    };
  }, [nonDeletedRequests, readMap]);

  // Đánh dấu 1 thông báo đã đọc
  const markAsRead = (reqId) => {
    if (!bizId || readMap[reqId]) return;
    const updated = { ...readMap, [reqId]: true };
    setReadMap(updated);
    localStorage.setItem(`huki_read_req_noti_${bizId}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('huki_noti_updated'));
  };

  // Đánh dấu tất cả thông báo hiện tại là đã đọc
  const markAllAsRead = () => {
    if (!bizId || nonDeletedRequests.length === 0) return;
    const updated = { ...readMap };
    nonDeletedRequests.forEach((r) => {
      updated[r.id] = true;
    });
    setReadMap(updated);
    localStorage.setItem(`huki_read_req_noti_${bizId}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('huki_noti_updated'));
    showToast('Đã đánh dấu tất cả thông báo là đã đọc.', 'success');
  };

  // Xóa 1 thông báo
  const handleDeleteOne = (reqId, e) => {
    e?.stopPropagation?.();
    if (!bizId) return;
    const updated = { ...deletedMap, [reqId]: true };
    setDeletedMap(updated);
    localStorage.setItem(`huki_deleted_req_noti_${bizId}`, JSON.stringify(updated));
    setSelectedIds((prev) => prev.filter((id) => id !== reqId));
    window.dispatchEvent(new CustomEvent('huki_noti_updated'));
    showToast('Đã xóa 1 thông báo.', 'success');
  };

  // Xóa nhiều thông báo đã chọn
  const handleBulkDelete = () => {
    if (!bizId || selectedIds.length === 0) return;
    const updated = { ...deletedMap };
    selectedIds.forEach((id) => {
      updated[id] = true;
    });
    setDeletedMap(updated);
    localStorage.setItem(`huki_deleted_req_noti_${bizId}`, JSON.stringify(updated));
    const count = selectedIds.length;
    setSelectedIds([]);
    window.dispatchEvent(new CustomEvent('huki_noti_updated'));
    showToast(`Đã xóa ${count} thông báo đã chọn thành công.`, 'success');
  };

  // Checkbox Chọn tất cả / Bỏ chọn tất cả
  const isAllSelected =
    filteredRequests.length > 0 &&
    filteredRequests.every((req) => selectedIds.includes(req.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Bỏ chọn tất cả các item trong filteredRequests
      const filteredSet = new Set(filteredRequests.map((r) => r.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      // Thêm tất cả item vào selectedIds
      const newIds = new Set([...selectedIds, ...filteredRequests.map((r) => r.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  // Toggle chọn 1 item
  const handleToggleSelect = (reqId, e) => {
    e?.stopPropagation?.();
    setSelectedIds((prev) =>
      prev.includes(reqId) ? prev.filter((id) => id !== reqId) : [...prev, reqId]
    );
  };

  // Bấm vào card -> Đánh dấu đã đọc + Mở modal chi tiết
  const handleCardClick = (req) => {
    markAsRead(req.id);
    setSelectedRequest(req);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-in pb-24">
      {/* 1. Header & Breadcrumb */}
      <header className="space-y-4 border-b border-theme-border pb-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-theme-primary">
          <Link to="/seller/dashboard" className="hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">dashboard</span>
            <span>Kênh Người Bán</span>
          </Link>
          <span>&bull;</span>
          <Link to="/seller/business" className="hover:underline">
            Hồ Sơ Doanh Nghiệp
          </Link>
          <span>&bull;</span>
          <span className="text-on-surface">Thông Báo Phản Hồi Từ Sàn</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-theme-primary">notifications_active</span>
              <span>Thông Báo Yêu Cầu Chỉnh Sửa Hồ Sơ</span>
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
              Theo dõi lịch sử và kết quả thẩm định cập nhật thông tin doanh nghiệp, trụ sở, gian hàng từ Ban quản trị Huki Ebook.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadNotifications}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-theme-border bg-white dark:bg-[#1a1622] hover:bg-theme-secondary-subtle text-on-surface transition-all cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              <span>Làm mới</span>
            </button>

            <Link
              to="/seller/business"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-theme-primary text-white hover:bg-theme-primary/90 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              <span>Quay lại Hồ Sơ</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'ALL'
                ? 'bg-theme-primary text-white shadow-sm'
                : 'bg-white dark:bg-[#1a1622] border border-theme-border text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Tất cả ({counts.all})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('APPROVED')}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#1a1622] border border-theme-border text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50/50'
            }`}
          >
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>Đã duyệt ({counts.approved})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('REJECTED')}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#1a1622] border border-theme-border text-rose-700 dark:text-rose-400 hover:bg-rose-50/50'
            }`}
          >
            <span className="material-symbols-outlined text-base">cancel</span>
            <span>Bị từ chối ({counts.rejected})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'PENDING'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#1a1622] border border-theme-border text-amber-700 dark:text-amber-400 hover:bg-amber-50/50'
            }`}
          >
            <span className="material-symbols-outlined text-base">hourglass_top</span>
            <span>Đang chờ ({counts.pending})</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã yêu cầu, từ khóa..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1622] text-xs sm:text-sm text-on-surface focus:border-theme-primary focus:ring-3 focus:ring-theme-primary/10 outline-none transition-all shadow-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Bulk Actions Toolbar (Chọn tất cả, Xóa mục đã chọn, Đánh dấu tất cả đã đọc) */}
      {filteredRequests.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#1a1622] border border-theme-border shadow-xs">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-on-surface cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 rounded text-theme-primary border-gray-300 focus:ring-theme-primary cursor-pointer accent-theme-primary"
              />
              <span>Chọn tất cả ({filteredRequests.length} thông báo)</span>
            </label>

            {selectedIds.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-theme-primary/10 text-theme-primary">
                Đã chọn: {selectedIds.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Nút Xóa các mục đã chọn */}
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all cursor-pointer shadow-xs animate-fade-in"
              >
                <span className="material-symbols-outlined text-base">delete_sweep</span>
                <span>Xóa các thông báo đã chọn ({selectedIds.length})</span>
              </button>
            )}

            {/* Nút Đánh dấu tất cả đã đọc */}
            {counts.unread > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-theme-primary border border-theme-primary/30 hover:bg-theme-primary/10 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">mark_email_read</span>
                <span>Đánh dấu tất cả đã đọc</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Notifications Cards List */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <span className="w-10 h-10 border-3 border-theme-primary/20 border-t-theme-primary rounded-full animate-spin inline-block"></span>
          <p className="text-sm text-on-surface-variant font-medium">Đang tải lịch sử thông báo từ hệ thống...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white dark:bg-[#1a1622] rounded-3xl border border-theme-border p-12 text-center space-y-3 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-400 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">notifications_off</span>
          </div>
          <h3 className="font-editorial text-lg font-bold text-on-surface">Không tìm thấy thông báo nào</h3>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto">
            {searchTerm
              ? 'Không có thông báo nào khớp với từ khóa tìm kiếm của bạn.'
              : 'Hiện tại bạn chưa gửi yêu cầu chỉnh sửa hồ sơ nào hoặc các thông báo đã được xóa.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isApproved = req.status === 'APPROVED';
            const isRejected = req.status === 'REJECTED';
            const isUnread = !readMap[req.id];
            const isSelected = selectedIds.includes(req.id);

            return (
              <article
                key={req.id}
                onClick={() => handleCardClick(req)}
                className={`rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 transition-all hover:shadow-md cursor-pointer relative ${
                  isUnread
                    ? 'border-2 border-rose-500 bg-rose-500/[0.03] dark:bg-rose-950/20 ring-4 ring-rose-500/10'
                    : isApproved
                    ? 'border border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-[#1a1622]'
                    : isRejected
                    ? 'border border-rose-200/80 dark:border-rose-900/40 bg-white dark:bg-[#1a1622]'
                    : 'border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-[#1a1622]'
                }`}
              >
                {/* Card Top: Checkbox + Status Tag + New Badge + Timestamp + Single Delete Button */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    {/* Checkbox chọn */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleToggleSelect(req.id, e)}
                      className="w-4 h-4 rounded text-theme-primary border-gray-300 focus:ring-theme-primary cursor-pointer accent-theme-primary"
                    />

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider ${
                        isApproved
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : isRejected
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-amber-600 text-white shadow-2xs'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {isApproved ? 'check_circle' : isRejected ? 'cancel' : 'hourglass_top'}
                      </span>
                      <span>
                        {isApproved
                          ? 'ĐÃ PHÊ DUYỆT'
                          : isRejected
                          ? 'TỪ CHỐI CẬP NHẬT'
                          : 'ĐANG CHỜ THẨM ĐỊNH'}
                      </span>
                    </span>

                    {/* Unread "MỚI" Badge */}
                    {isUnread && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-extrabold shadow-sm animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                        <span>MỚI</span>
                      </span>
                    )}

                    <span className="font-mono text-xs text-on-surface-variant font-semibold">
                      Mã yêu cầu: #{req.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                      <span className="material-symbols-outlined text-sm text-theme-primary">schedule</span>
                      <span>{new Date(req.createdAt).toLocaleString('vi-VN')}</span>
                    </div>

                    {/* Nút Xóa từng thông báo */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteOne(req.id, e)}
                      title="Xóa thông báo này"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>

                {/* Card Body: Title & Details */}
                <div className="space-y-2">
                  <h3 className="font-editorial text-lg sm:text-xl font-bold text-on-surface flex items-center gap-2">
                    {isUnread && <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0"></span>}
                    <span>
                      {isApproved
                        ? 'Yêu cầu cập nhật thông tin hồ sơ doanh nghiệp đã được phê duyệt'
                        : isRejected
                        ? 'Yêu cầu cập nhật thông tin hồ sơ doanh nghiệp bị từ chối'
                        : 'Yêu cầu cập nhật hồ sơ đang được Ban quản trị sàn thẩm định'}
                    </span>
                  </h3>

                  {isApproved && (
                    <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed font-medium">
                      Ban quản trị Huki Ebook đã thẩm định và phê duyệt toàn bộ thông tin doanh nghiệp, danh sách trụ sở và gian hàng của bạn. Dữ liệu mới đã được cập nhật chính thức vào hệ thống sàn.
                    </p>
                  )}

                  {isRejected && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 space-y-2 text-rose-900 dark:text-rose-200">
                      <p className="font-bold flex items-center gap-1.5 text-xs sm:text-sm">
                        <span className="material-symbols-outlined text-lg text-rose-600">error</span>
                        Lý do từ chối từ Ban Quản Trị:
                      </p>
                      <p className="text-xs sm:text-sm italic leading-relaxed font-semibold pl-6">
                        "{req.rejectionReason || 'Thông tin chưa đầy đủ hoặc không trùng khớp với giấy tờ pháp lý'}"
                      </p>
                      <p className="text-xs text-rose-700 dark:text-rose-300 pt-1 pl-6">
                        &bull; Vui lòng kiểm tra lại thông tin và quay lại trang Hồ Sơ để gửi lại yêu cầu mới sau (mỗi yêu cầu cách nhau tối thiểu 2 phút).
                      </p>
                    </div>
                  )}

                  {!isApproved && !isRejected && (
                    <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                      Yêu cầu cập nhật của bạn đã được ghi nhận vào hàng đợi xử lý. Ban quản trị sàn sẽ thẩm định trong vòng 24h làm việc.
                    </p>
                  )}
                </div>

                {/* Card Bottom Actions */}
                <div className="flex flex-wrap items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 gap-3">
                  <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                    <span>
                      Tên gửi duyệt: <strong>{req.requestedData?.name || 'N/A'}</strong>
                    </span>
                    {Array.isArray(req.requestedData?.headquarters) && (
                      <span>
                        Số trụ sở: <strong>{req.requestedData.headquarters.length}</strong>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(req);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-theme-primary hover:bg-theme-primary/10 transition-all cursor-pointer border border-theme-primary/20"
                  >
                    <span>Xem chi tiết nội dung đã gửi</span>
                    <span className="material-symbols-outlined text-base">visibility</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* =========================================================================
            MODAL POPUP CHI TIẾT NỘI DUNG ĐÃ GỬI (CHỈ HIỆN KHI BẤM NÚT XEM)
        ========================================================================= */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#1a1622] rounded-3xl border border-theme-border max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-theme-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">description</span>
                </div>
                <div>
                  <h3 className="font-editorial text-lg sm:text-xl font-bold text-on-surface">
                    Chi Tiết Nội Dung Yêu Cầu Chỉnh Sửa
                  </h3>
                  <p className="text-xs text-on-surface-variant font-mono">
                    Mã hồ sơ: #{selectedRequest.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-theme-secondary-subtle transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[65vh] overflow-y-auto space-y-4 pr-1 text-xs sm:text-sm">
              {/* Status Header Tile */}
              <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-white/5 border border-theme-border flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Trạng thái phê duyệt</span>
                  <p className="font-bold text-sm text-on-surface mt-0.5">
                    {selectedRequest.status === 'APPROVED'
                      ? 'Đã Phê Duyệt'
                      : selectedRequest.status === 'REJECTED'
                      ? 'Bị Từ Chối Cập Nhật'
                      : 'Đang Chờ Thẩm Định'}
                  </p>
                </div>
                <span className="font-mono text-xs text-on-surface-variant">
                  {new Date(selectedRequest.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>

              {/* Legal Info */}
              <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-white/5 border border-theme-border space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-theme-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">gavel</span>
                  <span>Thông Tin Pháp Lý Doanh Nghiệp</span>
                </h4>

                <div className="space-y-2">
                  <div>
                    <span className="text-gray-500 text-[11px]">Tên pháp nhân công ty:</span>
                    <p className="font-bold text-on-surface">{selectedRequest.requestedData?.name || 'N/A'}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-gray-500 text-[11px]">Mã số thuế / MST:</span>
                      <p className="font-mono font-bold text-on-surface">{selectedRequest.requestedData?.taxCode || 'N/A'}</p>
                    </div>

                    <div>
                      <span className="text-gray-500 text-[11px]">Loại hình đơn vị:</span>
                      <p className="font-semibold text-on-surface">
                        {selectedRequest.requestedData?.businessType === 'CORPORATION'
                          ? 'Công Ty Cổ Phần'
                          : selectedRequest.requestedData?.businessType === 'INDIVIDUAL'
                          ? 'Hộ Kinh Doanh Cá Thể'
                          : selectedRequest.requestedData?.businessType === 'PARTNERSHIP'
                          ? 'Công Ty Hợp Danh'
                          : 'Công Ty TNHH'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-gray-500 text-[11px]">Hotline CSKH / Vận hành:</span>
                      <p className="font-semibold text-theme-primary">{selectedRequest.requestedData?.phone || 'N/A'}</p>
                    </div>

                    <div>
                      <span className="text-gray-500 text-[11px]">Email nhận thông báo:</span>
                      <p className="font-semibold text-on-surface">{selectedRequest.requestedData?.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Headquarters List */}
              <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-white/5 border border-theme-border space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-theme-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">warehouse</span>
                  <span>Danh Sách Trụ Sở &amp; Chi Nhánh Đã Đăng Ký</span>
                </h4>

                <div className="space-y-2">
                  {Array.isArray(selectedRequest.requestedData?.headquarters) &&
                  selectedRequest.requestedData.headquarters.length > 0 ? (
                    selectedRequest.requestedData.headquarters.map((hq, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white dark:bg-[#1a1622] border border-gray-200 dark:border-gray-800 flex items-start gap-2.5"
                      >
                        <span className="px-2 py-0.5 rounded-md bg-theme-primary/10 text-theme-primary font-bold text-[11px] shrink-0 mt-0.5">
                          {idx === 0 ? 'Trụ sở 1 (Chính)' : `Trụ sở ${idx + 1}`}
                        </span>
                        <span className="font-medium text-on-surface leading-relaxed">{hq}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-on-surface-variant italic">
                      {selectedRequest.requestedData?.address || 'Chưa cập nhật trụ sở'}
                    </p>
                  )}
                </div>
              </div>

              {/* Store Info */}
              <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-white/5 border border-theme-border space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-theme-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">storefront</span>
                  <span>Thông Tin Gian Hàng Trực Thuộc</span>
                </h4>

                <div>
                  <span className="text-gray-500 text-[11px]">Tên gian hàng hiển thị trên sàn:</span>
                  <p className="font-bold text-on-surface">{selectedRequest.requestedData?.storeName || 'N/A'}</p>
                </div>

                {selectedRequest.requestedData?.storeDescription && (
                  <div className="pt-1">
                    <span className="text-gray-500 text-[11px]">Mô tả giới thiệu:</span>
                    <p className="text-on-surface-variant text-xs leading-relaxed mt-0.5">
                      {selectedRequest.requestedData.storeDescription}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-theme-border flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-6 py-2.5 rounded-xl bg-theme-primary text-white text-xs sm:text-sm font-bold hover:bg-theme-primary/90 transition-all cursor-pointer shadow-md"
              >
                Đóng chi tiết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

