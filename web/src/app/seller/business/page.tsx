"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { businessApi } from '@/ui/api/businessApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { can, PERMISSIONS, PermissionKey } from '@/ui/utils/permissions';

interface BusinessStoreItem {
  id?: string;
  name?: string;
  description?: string;
  slug?: string;
}

interface UpdateRequestItem {
  id: string;
  status?: string;
  createdAt?: string;
  data?: any;
}

export default function SellerBusinessProfilePage() {
  const router = useRouter();
  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  const { showToast } = useToast();

  const [business, setBusiness] = useState<any>(null);
  const [stores, setStores] = useState<BusinessStoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Inline Edit Mode State
  const [isEditMode, setIsEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Notification Requests State & Unread Badge
  const [updateRequests, setUpdateRequests] = useState<UpdateRequestItem[]>([]);
  const [unreadNotiCount, setUnreadNotiCount] = useState(0);

  // Rate-limit 2 minutes Cooldown State
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const currentBizId = user?.business?.id || activeBusinessId || undefined;
  const canViewStore = can(PERMISSIONS.STORE_VIEW as PermissionKey, currentBizId, user);

  // Helper để trích xuất danh sách trụ sở từ address
  const parseAddressToHq = (addr: any): string[] => {
    if (!addr) return ['Tầng 6, Tòa nhà Văn phòng Tri Thức, 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh'];
    try {
      const arr = typeof addr === 'string' ? JSON.parse(addr) : addr;
      if (Array.isArray(arr) && arr.length > 0) return arr.filter(Boolean);
      return [String(addr)];
    } catch {
      return [String(addr)];
    }
  };

  const initialBiz: any = user?.business || null;
  const initialHq = parseAddressToHq(initialBiz?.address);

  // Form State
  const [formData, setFormData] = useState({
    name: initialBiz?.name || 'CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT',
    taxCode: initialBiz?.taxCode || '0318926412',
    businessType: initialBiz?.businessType || 'CORPORATION',
    email: initialBiz?.email || user?.email || 'seller2@gmail.com',
    phone: initialBiz?.phone || user?.phone || '19008866',
    headquarters: initialHq,
    storeName: initialBiz?.stores?.[0]?.name || initialBiz?.name || 'CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT',
    storeDescription: initialBiz?.stores?.[0]?.description || 'Gian hàng chính hãng phân phối sách của CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT',
  });

  // Tải thông tin Doanh nghiệp & Cửa hàng & Lịch sử Yêu cầu
  const loadData = useCallback(async (showIndicator = true) => {
    if (showIndicator) setLoading(true);
    let bizId = user?.business?.id || activeBusinessId || undefined;

    try {
      const bizRes = await businessApi.getMyBusiness();
      let b: any = null;
      if (bizRes && bizRes.success && bizRes.data) {
        b = (bizRes.data as any)?.data || bizRes.data;
      }
      if (!b && user?.business) {
        b = user.business;
      }

      if (b && typeof b === 'object') {
        setBusiness(b);
        bizId = b.id || bizId;
        if (b.id) setActiveBusinessId(b.id);

        const parsedHq = parseAddressToHq(b.address);
        const primaryStore = Array.isArray(b.stores) && b.stores.length > 0 ? b.stores[0] : null;
        if (b.stores && Array.isArray(b.stores) && b.stores.length > 0) {
          setStores(b.stores);
        }

        setFormData((prev) => ({
          ...prev,
          name: b.name || prev.name || 'CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT',
          taxCode: b.taxCode || prev.taxCode || '0318926412',
          businessType: b.businessType || prev.businessType || 'CORPORATION',
          email: b.email || user?.email || prev.email || 'seller2@gmail.com',
          phone: b.phone || user?.phone || prev.phone || '19008866',
          headquarters: parsedHq.length > 0 ? parsedHq : prev.headquarters,
          storeName: primaryStore?.name || prev.storeName || b.name,
          storeDescription: primaryStore?.description || prev.storeDescription || '',
        }));
      }

      if (bizId) {
        const storesRes = await businessApi.getMyStores(bizId);
        if (storesRes && storesRes.success && storesRes.data) {
          const stList = Array.isArray(storesRes.data) ? storesRes.data : (storesRes.data as any)?.data || [];
          if (stList.length > 0) {
            setStores(stList);
            const st = stList[0];
            setFormData((prev) => ({
              ...prev,
              storeName: st.name || prev.storeName,
              storeDescription: st.description || prev.storeDescription,
            }));
          }
        }
      }

      // Tải lịch sử yêu cầu cập nhật & cooldown
      const reqRes = await businessApi.getMyUpdateRequests();
      if (reqRes && reqRes.success && reqRes.data) {
        const list: UpdateRequestItem[] = Array.isArray(reqRes.data) ? reqRes.data : (reqRes.data as any).data || [];
        setUpdateRequests(list);
        if ((reqRes.data as any).cooldownRemaining) {
          setCooldownSeconds((reqRes.data as any).cooldownRemaining);
        }

        if (typeof window !== 'undefined') {
          const unreadKey = `huki_read_req_noti_${bizId}`;
          const deletedKey = `huki_deleted_req_noti_${bizId}`;
          const readMap = JSON.parse(localStorage.getItem(unreadKey) || '{}');
          const deletedMap = JSON.parse(localStorage.getItem(deletedKey) || '{}');
          const unreadCount = list.filter((r) => !deletedMap[r.id] && !readMap[r.id]).length;
          setUnreadNotiCount(unreadCount);
        }
      }
    } catch (err) {
      console.error('Error fetching business profile:', err);
    } finally {
      if (showIndicator) setLoading(false);
      setRefreshing(false);
    }
  }, [user, activeBusinessId, setActiveBusinessId]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Sync notification badge
  useEffect(() => {
    const handleNotiSync = () => {
      const bizId = user?.business?.id || activeBusinessId;
      if (!bizId || typeof window === 'undefined') return;
      try {
        const unreadKey = `huki_read_req_noti_${bizId}`;
        const deletedKey = `huki_deleted_req_noti_${bizId}`;
        const readMap = JSON.parse(localStorage.getItem(unreadKey) || '{}');
        const deletedMap = JSON.parse(localStorage.getItem(deletedKey) || '{}');
        const count = updateRequests.filter((r) => !deletedMap[r.id] && !readMap[r.id]).length;
        setUnreadNotiCount(count);
      } catch {
        // ignore
      }
    };

    window.addEventListener('huki_noti_updated', handleNotiSync);
    window.addEventListener('storage', handleNotiSync);
    return () => {
      window.removeEventListener('huki_noti_updated', handleNotiSync);
      window.removeEventListener('storage', handleNotiSync);
    };
  }, [user, activeBusinessId, updateRequests]);

  // Countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    showToast?.('Đã làm mới thông tin hồ sơ doanh nghiệp.', 'success');
  };

  const handleAddHeadquarter = () => {
    setFormData((prev) => ({
      ...prev,
      headquarters: [...prev.headquarters, ''],
    }));
  };

  const handleRemoveHeadquarter = (index: number) => {
    if (formData.headquarters.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      headquarters: prev.headquarters.filter((_, idx) => idx !== index),
    }));
  };

  const handleHqChange = (index: number, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.headquarters];
      updated[index] = value;
      return { ...prev, headquarters: updated };
    });
  };

  const handleSubmitUpdateRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cooldownSeconds > 0) {
      showToast?.(`Vui lòng chờ ${cooldownSeconds}s trước khi gửi yêu cầu tiếp theo.`, 'warning');
      return;
    }

    if (!formData.name.trim()) {
      showToast?.('Tên doanh nghiệp không được để trống.', 'error');
      return;
    }
    const cleanHq = formData.headquarters.filter((h) => h.trim().length > 0);
    if (cleanHq.length === 0) {
      showToast?.('Vui lòng nhập ít nhất 1 địa chỉ trụ sở.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        taxCode: formData.taxCode.trim(),
        businessType: formData.businessType,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        headquarters: cleanHq,
        storeName: formData.storeName.trim() || formData.name.trim(),
        storeDescription: formData.storeDescription.trim(),
      };

      const res = await businessApi.submitUpdateRequest(payload);
      if (res.success) {
        showToast?.((res as any).message || (res.data as any)?.message || 'Đã gửi yêu cầu cập nhật thông tin thành công!', 'success');
        setIsEditMode(false);
        setCooldownSeconds(120);
        await loadData(false);
      } else {
        showToast?.(res.error?.message || 'Không thể gửi yêu cầu cập nhật.', 'error');
      }
    } catch (err: any) {
      console.error('Submit update request failed:', err);
      showToast?.(err?.message || 'Có lỗi xảy ra khi gửi yêu cầu.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenNotification = () => {
    router.push('/seller/business/notifications');
  };

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
          Tài khoản nhân viên của bạn chưa được cấp quyền xem Hồ Sơ Doanh Nghiệp &amp; Cửa Hàng.
        </p>
        <Link
          href="/seller/dashboard"
          className="px-4 py-2.5 rounded-xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary/90 transition-all shadow-sm"
        >
          Quay lại Bảng Điều Khiển
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-20 flex flex-col items-center justify-center gap-3">
        <span className="w-10 h-10 border-3 border-theme-primary/20 border-t-theme-primary rounded-full animate-spin"></span>
        <p className="text-sm text-on-surface-variant font-medium">Đang tải hồ sơ doanh nghiệp đối tác...</p>
      </div>
    );
  }

  const isApproved = business?.status === 'APPROVED' || user?.role === 'BUSINESS';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-in relative pb-24">
      {/* 1. Header & Quick Actions */}
      <header className="flex flex-col gap-4 border-b border-theme-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-theme-primary">
            <span className="material-symbols-outlined text-base">verified_user</span>
            <span>Kênh Người Bán &bull; Hồ Sơ Đối Tác</span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface">
            Hồ Sơ Doanh Nghiệp &amp; Cửa Hàng
          </h1>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Quản lý thông tin pháp nhân NXB, danh sách trụ sở chi nhánh và gửi yêu cầu cập nhật lên Admin Sàn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Nút Chuông Thông Báo */}
          <button
            type="button"
            onClick={handleOpenNotification}
            className="relative p-2.5 rounded-xl border border-theme-border bg-white dark:bg-[#1a1622] hover:bg-theme-secondary-subtle text-on-surface transition-all cursor-pointer shadow-xs hover:border-theme-primary/40 flex items-center justify-center"
            title="Xem tất cả thông báo phản hồi từ Ban quản trị sàn"
          >
            <span className="material-symbols-outlined text-2xl text-theme-primary">notifications</span>
            {unreadNotiCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-rose-600 text-white text-[11px] font-extrabold rounded-full flex items-center justify-center animate-pulse shadow-sm">
                {unreadNotiCount}
              </span>
            )}
          </button>

          {/* Nút Làm Mới */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-theme-border bg-white dark:bg-[#1a1622] hover:bg-theme-secondary-subtle text-on-surface transition-all cursor-pointer shadow-xs"
          >
            <span className={`material-symbols-outlined text-lg ${refreshing ? 'animate-spin text-theme-primary' : 'text-on-surface-variant'}`}>
              refresh
            </span>
            <span>{refreshing ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          {/* Nút Cập Nhật Thông Tin / Gửi Yêu Cầu */}
          {!isEditMode ? (
            <button
              type="button"
              onClick={() => setIsEditMode(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-theme-primary text-white shadow-md hover:bg-theme-primary/90 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">edit_document</span>
              <span>Cập nhật thông tin</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsEditMode(false)}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-theme-border text-xs sm:text-sm font-bold text-on-surface hover:bg-theme-secondary-subtle transition-all cursor-pointer bg-white dark:bg-[#1a1622]"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleSubmitUpdateRequest}
                disabled={submitting || cooldownSeconds > 0}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md transition-all cursor-pointer ${
                  cooldownSeconds > 0
                    ? 'bg-gray-400 cursor-not-allowed opacity-80'
                    : 'bg-theme-primary hover:bg-theme-primary/90'
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {submitting ? 'sync' : 'send'}
                </span>
                <span>
                  {submitting
                    ? 'Đang gửi...'
                    : cooldownSeconds > 0
                    ? `Đợi ${cooldownSeconds}s`
                    : 'Gửi yêu cầu'}
                </span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Banner thông báo chế độ chỉnh sửa */}
      {isEditMode && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3.5 shadow-xs">
          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl shrink-0 mt-0.5">info</span>
          <div className="text-xs sm:text-sm space-y-1">
            <p className="font-bold text-base text-amber-950 dark:text-amber-100">Đang ở chế độ chỉnh sửa thông tin doanh nghiệp</p>
            <p className="text-on-surface-variant leading-relaxed">
              Bạn có thể nhập lại tất cả thông tin và thêm nhiều trụ sở chi nhánh. Sau khi nhấn <strong>Gửi yêu cầu</strong>, hồ sơ sẽ được gửi đến Ban quản trị sàn để thẩm định và phê duyệt trước khi cập nhật chính thức vào hệ thống.
            </p>
          </div>
        </div>
      )}

      {/* 2. Top Summary Hero Card */}
      <div className="bg-white dark:bg-[#1a1622] rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-theme-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-theme-primary/10 border border-theme-primary/20 text-theme-primary flex items-center justify-center shrink-0 shadow-inner">
              <span className="material-symbols-outlined text-3xl sm:text-4xl">domain</span>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface">
                  {business?.name || formData.name || 'CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT'}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full font-bold shadow-2xs ${
                    isApproved
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {isApproved ? 'verified' : 'pending'}
                  </span>
                  {isApproved ? 'Đối Tác NXB Cấp 1 (Chính Hãng)' : 'Đang Chờ Thẩm Định'}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-on-surface-variant font-mono">
                Mã định danh đối tác: <span className="font-bold text-on-surface">{business?.id || activeBusinessId || '675f747f-a2a8-4ff7-8f57-d6598a0c8163'}</span>
              </p>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs sm:text-sm text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-theme-primary">call</span>
                  <span className="font-semibold text-on-surface">{business?.phone || formData.phone || '19008866'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-theme-primary">mail</span>
                  <span className="font-semibold text-on-surface">{business?.email || formData.email || 'seller2@gmail.com'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-theme-primary">location_on</span>
                  <span className="truncate max-w-[340px] font-medium text-on-surface">
                    {formData.headquarters[0] || business?.address || 'Tầng 6, Tòa nhà Văn phòng Tri Thức, 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center border-t lg:border-t-0 lg:border-l border-theme-border/60 pt-5 lg:pt-0 lg:pl-8 gap-4 shrink-0">
            <div className="text-left lg:text-right">
              <span className="text-[11px] uppercase font-bold text-on-surface-variant tracking-wider">Tỷ lệ phân chia doanh thu</span>
              <p className="text-xl sm:text-2xl font-bold text-theme-primary">85% NXB &bull; 15% Sàn</p>
            </div>
            <div className="text-left lg:text-right">
              <span className="text-[11px] uppercase font-bold text-on-surface-variant tracking-wider">Bảo vệ bản quyền số</span>
              <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 lg:justify-end mt-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Kích hoạt Core DRM v3.4
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Detailed Information Form Grids */}
      <form onSubmit={handleSubmitUpdateRequest} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Card 1: Thông Tin Pháp Lý Doanh Nghiệp */}
          <div className="bg-white dark:bg-[#1a1622] rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-theme-border">
              <div className="w-10 h-10 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">gavel</span>
              </div>
              <div>
                <h3 className="font-editorial text-lg sm:text-xl font-bold text-on-surface">Thông Tin Pháp Lý &amp; Đăng Ký</h3>
                <p className="text-xs text-on-surface-variant">Giấy phép kinh doanh và thông tin pháp nhân NXB</p>
              </div>
            </div>

            <div className="space-y-6 flex-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Tên pháp nhân công ty <span className="text-rose-500">*</span>
                </label>
                {isEditMode ? (
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm font-semibold text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                    placeholder="VD: Công ty TNHH Xuất Bản Tri Thức"
                  />
                ) : (
                  <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center font-bold text-sm sm:text-base text-on-surface">
                    {business?.name || formData.name || 'CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT'}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Mã số thuế / MST <span className="text-rose-500">*</span>
                  </label>
                  {isEditMode ? (
                    <input
                      type="text"
                      required
                      value={formData.taxCode}
                      onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm font-mono font-bold text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                      placeholder="VD: 0318926410"
                    />
                  ) : (
                    <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center font-mono font-bold text-sm text-on-surface">
                      {business?.taxCode || formData.taxCode || '0318926412'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Loại hình đơn vị
                  </label>
                  {isEditMode ? (
                    <select
                      value={formData.businessType}
                      onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm font-medium text-on-surface cursor-pointer outline-none shadow-xs"
                    >
                      <option value="LLC">Công Ty TNHH</option>
                      <option value="CORPORATION">Công Ty Cổ Phần</option>
                      <option value="INDIVIDUAL">Hộ Kinh Doanh Cá Thể</option>
                      <option value="PARTNERSHIP">Công Ty Hợp Danh</option>
                    </select>
                  ) : (
                    <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center font-medium text-sm text-on-surface">
                      {(business?.businessType || formData.businessType) === 'CORPORATION'
                        ? 'Công Ty Cổ Phần'
                        : (business?.businessType || formData.businessType) === 'INDIVIDUAL'
                        ? 'Hộ Kinh Doanh Cá Thể'
                        : (business?.businessType || formData.businessType) === 'PARTNERSHIP'
                        ? 'Công Ty Hợp Danh'
                        : 'Công Ty TNHH'}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Hotline CSKH / Vận hành
                  </label>
                  {isEditMode ? (
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm font-semibold text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                      placeholder="VD: 0908123456"
                    />
                  ) : (
                    <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center font-bold text-sm text-theme-primary">
                      {business?.phone || formData.phone || '19008866'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Email nhận thông báo
                  </label>
                  {isEditMode ? (
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm font-medium text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                      placeholder="VD: contact@nxb.vn"
                    />
                  ) : (
                    <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center font-medium text-sm text-on-surface truncate">
                      {business?.email || formData.email || 'seller2@gmail.com'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Người Đại Diện Theo Pháp Luật */}
          <div className="bg-white dark:bg-[#1a1622] rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-theme-border">
              <div className="w-10 h-10 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">badge</span>
              </div>
              <div>
                <h3 className="font-editorial text-lg sm:text-xl font-bold text-on-surface">Người Đại Diện Theo Pháp Luật</h3>
                <p className="text-xs text-on-surface-variant">Thông tin định danh chủ sở hữu tài khoản quản trị</p>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/70 dark:border-gray-800 space-y-1">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Họ và tên đại diện</span>
                <p className="font-bold text-base text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-theme-primary text-xl">person</span>
                  <span>{user?.fullName || user?.name || 'seller2'}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/70 dark:border-gray-800 space-y-1">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Chức vụ</span>
                  <p className="font-semibold text-sm text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-theme-primary text-lg">work</span>
                    <span>Chủ Sở Hữu / Giám Đốc</span>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/70 dark:border-gray-800 space-y-1">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tài khoản quản trị</span>
                  <p className="font-mono font-bold text-sm text-theme-primary flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-theme-primary text-lg">alternate_email</span>
                    <span className="truncate">{user?.email || 'seller2@gmail.com'}</span>
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Trạng thái xác thực</span>
                  <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <span className="material-symbols-outlined text-base">verified</span>
                    Đã xác thực hồ sơ KYC hợp lệ
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-emerald-600 text-white rounded-full shadow-2xs shrink-0">
                  ACTIVE
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/70 dark:border-gray-800 space-y-1">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quyền hạn hệ thống</span>
                <p className="font-semibold text-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-theme-primary text-lg">admin_panel_settings</span>
                  <span>Toàn quyền Quản lý Doanh nghiệp (OWNER Master)</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: TRỤ SỞ & CHI NHÁNH */}
        <div className="bg-white dark:bg-[#1a1622] rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-theme-border flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">warehouse</span>
              </div>
              <div>
                <h3 className="font-editorial text-lg sm:text-xl font-bold text-on-surface">
                  Danh Sách Trụ Sở &amp; Chi Nhánh Văn Phòng
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Địa chỉ kho hàng, văn phòng giao dịch và điểm lấy sách của đơn vị vận chuyển
                </p>
              </div>
            </div>

            {isEditMode && (
              <button
                type="button"
                onClick={handleAddHeadquarter}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-theme-primary text-white hover:bg-theme-primary/90 transition-all cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">add_location_alt</span>
                <span>+ Thêm trụ sở {formData.headquarters.length + 1}</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {formData.headquarters.map((hq, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02] space-y-3 transition-all hover:border-theme-primary/40 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 ${
                      idx === 0
                        ? 'bg-theme-primary text-white shadow-2xs'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {idx === 0 ? 'home_pin' : 'location_city'}
                    </span>
                    <span>{idx === 0 ? 'Trụ sở chính (Kho hàng 1)' : `Trụ sở ${idx + 1} (Chi nhánh / Kho phụ)`}</span>
                  </span>

                  {isEditMode && formData.headquarters.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveHeadquarter(idx)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-xs font-semibold transition-all cursor-pointer"
                      title={`Xóa Trụ sở ${idx + 1}`}
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                      <span>Xóa</span>
                    </button>
                  )}
                </div>

                <div>
                  {isEditMode ? (
                    <input
                      type="text"
                      required
                      value={hq}
                      onChange={(e) => handleHqChange(idx, e.target.value)}
                      placeholder={`Nhập địa chỉ chi tiết cho Trụ sở ${idx + 1}...`}
                      className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm font-medium text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                    />
                  ) : (
                    <div className="min-h-12 px-4 py-3 rounded-xl bg-white dark:bg-[#1a1622] border border-gray-200/80 dark:border-gray-800 flex items-center text-sm font-medium text-on-surface leading-relaxed">
                      {hq || '(Chưa cập nhật địa chỉ chi tiết)'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 4: GIAN HÀNG CHÍNH THỨC */}
        <div className="bg-white dark:bg-[#1a1622] rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-theme-border flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">storefront</span>
              </div>
              <div>
                <h3 className="font-editorial text-lg sm:text-xl font-bold text-on-surface">Gian Hàng Trực Thuộc</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">Thông tin hiển thị công khai trên Sàn Huki Ebook</p>
              </div>
            </div>
            <span className="text-xs font-bold text-theme-primary bg-theme-primary/10 border border-theme-primary/20 px-3.5 py-1.5 rounded-full">
              Tự động đồng bộ 1-1
            </span>
          </div>

          <div className="space-y-6 text-sm">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Tên gian hàng hiển thị trên Sàn <span className="text-rose-500">*</span>
              </label>
              {isEditMode ? (
                <input
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm font-semibold text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                  placeholder="VD: Gian hàng Nhà Xuất Bản Tri Thức"
                />
              ) : (
                <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center font-bold text-sm sm:text-base text-on-surface">
                  {stores[0]?.name || formData.storeName || business?.name || 'CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Mô tả giới thiệu gian hàng
              </label>
              {isEditMode ? (
                <textarea
                  rows={4}
                  value={formData.storeDescription}
                  onChange={(e) => setFormData({ ...formData, storeDescription: e.target.value })}
                  className="w-full p-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm font-sans text-on-surface placeholder:text-gray-400 outline-none leading-relaxed shadow-xs min-h-[120px]"
                  placeholder="Giới thiệu về gian hàng, dòng sách phát hành chủ đạo, cam kết chất lượng..."
                />
              ) : (
                <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 text-sm text-on-surface-variant leading-relaxed min-h-[90px]">
                  {stores[0]?.description || formData.storeDescription || 'Gian hàng chính hãng phân phối sách của CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT'}
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
