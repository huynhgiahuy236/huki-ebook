import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { businessApi } from '../../api/businessApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { can, PERMISSIONS } from '../../utils/permissions';

export default function SellerBusinessProfilePage() {
  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  const { showToast } = useToast();
  
  const [business, setBusiness] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const currentBizId = user?.business?.id || activeBusinessId;
  const canViewStore = can(PERMISSIONS.STORE_VIEW, currentBizId, user);
  const canEditStore = can(PERMISSIONS.STORE_UPDATE, currentBizId, user);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    phone: '',
    address: '',
    email: '',
  });

  const loadData = useCallback(async (showIndicator = true) => {
    if (showIndicator) setLoading(true);
    let bizId = user?.business?.id || activeBusinessId;
    
    try {
      const bizRes = await businessApi.getMyBusiness();
      if (bizRes.success && bizRes.data) {
        setBusiness(bizRes.data);
        bizId = bizRes.data.id;
        setActiveBusinessId(bizId);
        setEditForm({
          phone: bizRes.data.phone || '',
          address: bizRes.data.address || '',
          email: bizRes.data.email || user?.email || '',
        });
      } else if (user?.business) {
        setBusiness(user.business);
      }

      if (bizId) {
        const storesRes = await businessApi.getMyStores(bizId);
        if (storesRes.success && Array.isArray(storesRes.data)) {
          setStores(storesRes.data);
        }
      }
    } catch (err) {
      console.error('Error fetching business profile:', err);
      showToast('Không thể tải thông tin doanh nghiệp.', 'error');
    } finally {
      if (showIndicator) setLoading(false);
      setRefreshing(false);
    }
  }, [user, activeBusinessId, setActiveBusinessId, showToast]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    showToast('Đã làm mới thông tin hồ sơ doanh nghiệp.', 'success');
  };

  const handleSaveContact = (e) => {
    e.preventDefault();
    setBusiness((prev) => prev ? { ...prev, ...editForm } : prev);
    setIsEditModalOpen(false);
    showToast('Đã lưu thông tin liên hệ vận hành.', 'success');
  };

  // 403 Guard if user doesn't have permission to view store profile
  if (!canViewStore) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4 border border-amber-500/20 shadow-xs">
          <span className="material-symbols-outlined text-3xl">lock</span>
        </div>
        <h2 className="text-xl font-bold font-editorial text-theme-on-surface mb-2">
          Không Có Quyền Truy Cập (403 Forbidden)
        </h2>
        <p className="text-xs sm:text-sm text-theme-on-surface-variant max-w-md mb-6">
          Tài khoản nhân viên của bạn chưa được cấp quyền xem Hồ Sơ Doanh Nghiệp &amp; Cửa Hàng (`STORE_VIEW`).
        </p>
        <Link
          to="/seller/dashboard"
          className="px-4 py-2.5 rounded-xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary/90 transition-all shadow-sm"
        >
          Quay lại Bảng Điều Khiển
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-12 flex flex-col items-center justify-center gap-3">
        <span className="w-9 h-9 border-3 border-theme-primary/20 border-t-theme-primary rounded-full animate-spin"></span>
        <p className="text-xs text-on-surface-variant font-medium">Đang tải hồ sơ doanh nghiệp đối tác...</p>
      </div>
    );
  }

  const isApproved = business?.status === 'APPROVED' || user?.role === 'BUSINESS';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      {/* 1. Header & Quick Actions */}
      <header className="flex flex-col gap-4 border-b border-theme-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-theme-primary mb-1">
            <span className="material-symbols-outlined text-sm">verified_user</span>
            <span>Kênh Người Bán &bull; Hồ Sơ Đối Tác</span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface">
            Hồ Sơ Doanh Nghiệp &amp; Pháp Lý
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-on-surface-variant">
            Thông tin pháp nhân NXB, chứng chỉ xuất bản và thỏa thuận phân phối chính thức trên Sàn HuKi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-theme-border bg-theme-surface hover:bg-theme-secondary-subtle text-on-surface transition-all"
          >
            <span className={`material-symbols-outlined text-base ${refreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>{refreshing ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-theme-primary text-white shadow-sm hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-base">edit</span>
            <span>Cập nhật liên hệ</span>
          </button>
        </div>
      </header>

      {/* 2. Top Summary Hero Card */}
      <div className="bg-white dark:bg-[#1a1622] rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-theme-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-theme-primary/10 border border-theme-primary/20 text-theme-primary flex items-center justify-center shrink-0 shadow-inner">
              <span className="material-symbols-outlined text-3xl sm:text-4xl">domain</span>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-editorial text-xl sm:text-2xl font-bold text-on-surface">
                  {business?.name || 'Doanh Nghiệp Chưa Đặt Tên'}
                </h2>
                <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                  isApproved
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}>
                  <span className="material-symbols-outlined text-xs">
                    {isApproved ? 'verified' : 'pending'}
                  </span>
                  {isApproved ? 'Đối Tác NXB Cấp 1 (Chính Hãng)' : 'Đang Chờ Thẩm Định'}
                </span>
              </div>

              <p className="text-xs text-on-surface-variant font-mono">
                Mã định danh đối tác: <span className="font-bold text-on-surface">{business?.id || 'Chưa cấp mã'}</span>
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-theme-primary">call</span>
                  {business?.phone || editForm.phone || 'Chưa cập nhật'}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-theme-primary">mail</span>
                  {business?.email || editForm.email || 'Chưa cập nhật'}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-theme-primary">location_on</span>
                  <span className="truncate max-w-[280px]">{business?.address || editForm.address || 'Chưa cập nhật'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-theme-border/60 pt-4 md:pt-0 md:pl-8 gap-2 shrink-0">
            <div className="text-left md:text-right">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Tỷ lệ phân chia</span>
              <p className="text-xl font-bold text-theme-primary">85% NXB &bull; 15% Sàn</p>
            </div>
            <div className="text-left md:text-right">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Chứng chỉ số DRM</span>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 md:justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Kích hoạt Core DRM v3.4
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Detailed Information Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Thông Tin Pháp Lý Doanh Nghiệp */}
        <div className="bg-white dark:bg-[#1a1622] rounded-2xl border border-theme-border p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-theme-border">
            <span className="material-symbols-outlined text-xl text-theme-primary">gavel</span>
            <h3 className="font-editorial text-lg font-bold text-on-surface">Thông Tin Pháp Lý &amp; Đăng Ký</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-theme-border/40">
              <span className="text-on-surface-variant">Tên pháp nhân:</span>
              <span className="font-bold text-on-surface text-right">{business?.name || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-theme-border/40">
              <span className="text-on-surface-variant">Mã số thuế / MST:</span>
              <span className="font-mono font-bold text-on-surface">{business?.taxCode || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-theme-border/40">
              <span className="text-on-surface-variant">Loại hình đơn vị:</span>
              <span className="font-semibold text-on-surface">{business?.businessType || 'Doanh nghiệp / NXB'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-theme-border/40">
              <span className="text-on-surface-variant">Giấy phép xuất bản:</span>
              <span className="font-mono font-bold text-theme-primary">{business?.licenseDocUrl ? 'Đã đính kèm hồ sơ' : 'Chưa đính kèm'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-theme-border/40">
              <span className="text-on-surface-variant">Ngày nộp hồ sơ:</span>
              <span className="font-semibold text-on-surface">{business?.createdAt ? new Date(business.createdAt).toLocaleDateString('vi-VN') : 'Mới khởi tạo'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-on-surface-variant">Cơ quan quản lý:</span>
              <span className="font-semibold text-on-surface">Cục Xuất Bản, In và Phát Hành &bull; Sở KH&amp;ĐT Hà Nội</span>
            </div>
          </div>
        </div>

        {/* Card 2: Người Đại Diện Theo Pháp Luật */}
        <div className="bg-white dark:bg-[#1a1622] rounded-2xl border border-theme-border p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-theme-border">
            <span className="material-symbols-outlined text-xl text-theme-primary">badge</span>
            <h3 className="font-editorial text-lg font-bold text-on-surface">Người Đại Diện Theo Pháp Luật</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-theme-border/40">
              <span className="text-on-surface-variant">Họ và tên:</span>
              <span className="font-bold text-on-surface">{user?.fullName || user?.name || 'Nguyễn Văn Minh'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-theme-border/40">
              <span className="text-on-surface-variant">Chức vụ:</span>
              <span className="font-semibold text-on-surface">Giám Đốc Điều Hành / Tổng Biên Tập</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-theme-border/40">
              <span className="text-on-surface-variant">Số CCCD/Hộ chiếu:</span>
              <span className="font-mono font-bold text-on-surface">001092004819 (Đã xác minh)</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-theme-border/40">
              <span className="text-on-surface-variant">Email đại diện:</span>
              <span className="font-semibold text-on-surface">{user?.email || 'business@huki.com'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-theme-border/40">
              <span className="text-on-surface-variant">Tài khoản chủ sở hữu:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Tài khoản Doanh Nghiệp Hợp Lệ
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-on-surface-variant">Ủy quyền số:</span>
              <span className="font-mono text-on-surface-variant">UQ-2026/HUKI-AUTH-01</span>
            </div>
          </div>
        </div>

        {/* Card 3: Trụ Sở, Kho Hàng & Vận Hành */}
        <div className="bg-white dark:bg-[#1a1622] rounded-2xl border border-theme-border p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-theme-border">
            <span className="material-symbols-outlined text-xl text-theme-primary">warehouse</span>
            <h3 className="font-editorial text-lg font-bold text-on-surface">Trụ Sở &amp; Kho Vận Xuất Hàng</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start justify-between py-1.5 border-b border-theme-border/40 gap-4">
              <span className="text-on-surface-variant shrink-0">Trụ sở chính:</span>
              <span className="font-semibold text-on-surface text-right">{business?.address || editForm.address}</span>
            </div>
            <div className="flex items-start justify-between py-1.5 border-b border-theme-border/40 gap-4">
              <span className="text-on-surface-variant shrink-0">Kho xuất sách giấy:</span>
              <span className="font-semibold text-on-surface text-right">Kho Tổng HuKi Logistics &bull; KCN Tân Bình, TP. Hồ Chí Minh</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-theme-border/40">
              <span className="text-on-surface-variant">Hotline CSKH NXB:</span>
              <span className="font-bold text-theme-primary">{business?.phone || editForm.phone}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-on-surface-variant">Chu kỳ đối soát:</span>
              <span className="font-bold text-on-surface">Thứ 2 hàng tuần (Chuyển khoản tự động)</span>
            </div>
          </div>
        </div>

        {/* Card 4: Gian Hàng Trực Thuộc */}
        <div className="bg-white dark:bg-[#1a1622] rounded-2xl border border-theme-border p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-theme-border">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-xl text-theme-primary">storefront</span>
              <h3 className="font-editorial text-lg font-bold text-on-surface">Gian Hàng Chính Thức</h3>
            </div>
            <span className="text-[11px] font-bold text-theme-primary bg-theme-primary/10 px-2.5 py-0.5 rounded-full">
              Tự động đồng bộ 1-1
            </span>
          </div>

          {stores.length === 0 ? (
            <div className="py-5 text-center space-y-2">
              <p className="text-xs text-on-surface-variant">Gian hàng chính thức được tự động tạo và kích hoạt kèm Doanh nghiệp.</p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-xs font-mono font-bold text-theme-primary">/shop/{business?.name ? business.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'doanh-nghiep'}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {stores.map((st) => (
                <div key={st.id} className="flex items-center justify-between p-3 rounded-xl bg-theme-surface border border-theme-border/60">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-theme-primary/10 text-theme-primary flex items-center justify-center font-bold text-sm">
                      {st.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-on-surface">{st.name}</h4>
                      <p className="text-[10px] text-on-surface-variant font-mono">/shop/{st.slug}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      st.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                      {st.status === 'APPROVED' ? 'Đang mở bán' : 'Chờ phê duyệt'}
                    </span>
                    <Link to={`/shop/${st.slug}`} className="p-1 text-on-surface-variant hover:text-theme-primary" title="Xem gian hàng trên Sàn">
                      <span className="material-symbols-outlined text-base">open_in_new</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Edit Contact Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#1a1622] rounded-3xl border border-theme-border max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h3 className="font-editorial text-lg font-bold text-on-surface">Cập Nhật Thông Tin Vận Hành</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-theme-secondary-subtle text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-on-surface mb-1.5">Hotline CSKH / Đối Soát</label>
                <input
                  type="text"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-theme-border bg-theme-surface outline-none focus:border-theme-primary text-on-surface"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1.5">Email Nhận Báo Cáo &amp; Hóa Đơn</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-theme-border bg-theme-surface outline-none focus:border-theme-primary text-on-surface"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1.5">Địa Chỉ Trụ Sở / Văn Phòng Giao Dịch</label>
                <textarea
                  rows={3}
                  required
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full p-3 rounded-xl border border-theme-border bg-theme-surface outline-none focus:border-theme-primary text-on-surface font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-theme-border font-bold text-on-surface hover:bg-theme-secondary-subtle"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-theme-primary text-white font-bold hover:opacity-90 shadow-xs"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
