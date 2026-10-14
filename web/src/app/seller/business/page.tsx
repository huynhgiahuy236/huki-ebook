"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { businessApi } from '@/ui/api/businessApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { can, PERMISSIONS, PermissionKey } from '@/ui/utils/permissions';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';

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
  requestedData?: any;
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

  // Form State đầy đủ cho cả Doanh Nghiệp (Company) và Hộ Kinh Doanh Cá Thể
  const [formData, setFormData] = useState({
    // Thông tin chung & Pháp lý cơ bản
    name: initialBiz?.name || 'CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT',
    taxCode: initialBiz?.taxCode || '0318926412',
    businessType: (initialBiz?.businessType || 'CORPORATION') as 'INDIVIDUAL' | 'LLC' | 'CORPORATION' | 'PARTNERSHIP',
    email: initialBiz?.email || user?.email || 'seller2@gmail.com',
    phone: initialBiz?.phone || user?.phone || '19008866',
    headquarters: initialHq,

    // Dành riêng cho Doanh nghiệp / Công ty (Company)
    internationalName: '',
    shortName: '',
    businessLicenseNumber: initialBiz?.registryNumber || '0318926412',
    issueDate: '2022-06-15',
    issuePlace: 'Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh',
    ecommerceIndustryCodes: '4791',
    website: 'https://trituevietbooks.vn',

    // Người đại diện pháp luật / Chủ hộ kinh doanh
    repName: user?.fullName || user?.name || 'Trần Minh Hoàng',
    repPosition: initialBiz?.businessType === 'INDIVIDUAL' ? 'Chủ hộ kinh doanh' : 'Tổng Giám Đốc',
    repIdCardNumber: '079094002381',
    repIdCardIssueDate: '2021-04-20',
    repIdCardIssuePlace: 'Cục Cảnh sát QLHC về TTXH',

    // Người vận hành gian hàng
    operatorName: user?.fullName || user?.name || 'Trần Minh Hoàng',
    operatorPhone: user?.phone || '0908123456',
    operatorEmail: user?.email || 'seller2@gmail.com',

    // Thông tin tài khoản ngân hàng KYC (Quyết toán & Nhận doanh thu)
    bankName: initialBiz?.bankName || 'Ngân hàng TMCP Quân Đội (MB Bank)',
    bankAccountNumber: initialBiz?.bankAccountNumber || '888899996688',
    bankAccountHolderName: initialBiz?.bankAccountHolderName || initialBiz?.name || 'CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT',
    bankBranch: initialBiz?.bankBranch || 'Chi nhánh Sở Giao Dịch TP. HCM',

    // Gian hàng trực thuộc
    storeName: initialBiz?.stores?.[0]?.name || initialBiz?.name || 'Trí Tuệ Việt Books Official',
    storeDescription: initialBiz?.stores?.[0]?.description || 'Gian hàng chính hãng phân phối sách của CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT',
  });

  const isHousehold = formData.businessType === 'INDIVIDUAL';
  const isCompany = !isHousehold;

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

      // Tải lịch sử yêu cầu cập nhật & cooldown
      let latestReqData: any = null;
      const reqRes = await businessApi.getMyUpdateRequests();
      if (reqRes && reqRes.success && reqRes.data) {
        const list: UpdateRequestItem[] = Array.isArray(reqRes.data) ? reqRes.data : (reqRes.data as any).data || [];
        setUpdateRequests(list);
        if ((reqRes.data as any).cooldownRemaining) {
          setCooldownSeconds((reqRes.data as any).cooldownRemaining);
        }

        if (list.length > 0 && list[0]?.requestedData) {
          latestReqData = list[0].requestedData;
        }

        if (typeof window !== 'undefined' && bizId) {
          const unreadKey = `huki_read_req_noti_${bizId}`;
          const deletedKey = `huki_deleted_req_noti_${bizId}`;
          const readMap = JSON.parse(localStorage.getItem(unreadKey) || '{}');
          const deletedMap = JSON.parse(localStorage.getItem(deletedKey) || '{}');
          const unreadCount = list.filter((r) => !deletedMap[r.id] && !readMap[r.id]).length;
          setUnreadNotiCount(unreadCount);
        }
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

        const bType = (latestReqData?.businessType || b.businessType || 'CORPORATION') as any;
        const bIsHousehold = bType === 'INDIVIDUAL';

        setFormData((prev) => ({
          ...prev,
          name: latestReqData?.name || b.name || prev.name,
          taxCode: latestReqData?.taxCode || b.taxCode || prev.taxCode,
          businessType: bType,
          email: latestReqData?.email || b.email || user?.email || prev.email,
          phone: latestReqData?.phone || b.phone || user?.phone || prev.phone,
          headquarters: (latestReqData?.headquarters && Array.isArray(latestReqData.headquarters) && latestReqData.headquarters.length > 0)
            ? latestReqData.headquarters
            : (parsedHq.length > 0 ? parsedHq : prev.headquarters),

          // Company fields
          internationalName: latestReqData?.internationalName || prev.internationalName || (bIsHousehold ? '' : 'VIET INTELLECTUAL PUBLISHING CO., LTD'),
          shortName: latestReqData?.shortName || prev.shortName || (bIsHousehold ? '' : 'VIP BOOKS'),
          businessLicenseNumber: latestReqData?.businessLicenseNumber || latestReqData?.registryNumber || b.registryNumber || prev.businessLicenseNumber,
          issueDate: latestReqData?.issueDate || prev.issueDate,
          issuePlace: latestReqData?.issuePlace || (bIsHousehold ? 'Ủy ban nhân dân Quận 1, TP. Hồ Chí Minh' : prev.issuePlace),
          ecommerceIndustryCodes: latestReqData?.ecommerceIndustryCodes || prev.ecommerceIndustryCodes,
          website: latestReqData?.website || prev.website,

          // Rep & Operator
          repName: latestReqData?.repName || prev.repName || user?.fullName || user?.name || 'Trần Minh Hoàng',
          repPosition: bIsHousehold ? 'Chủ hộ kinh doanh' : (latestReqData?.repPosition || prev.repPosition || 'Tổng Giám Đốc'),
          repIdCardNumber: latestReqData?.repIdCardNumber || prev.repIdCardNumber,
          repIdCardIssueDate: latestReqData?.repIdCardIssueDate || prev.repIdCardIssueDate,
          repIdCardIssuePlace: latestReqData?.repIdCardIssuePlace || prev.repIdCardIssuePlace,
          operatorName: latestReqData?.operatorName || user?.fullName || prev.operatorName,
          operatorPhone: latestReqData?.operatorPhone || user?.phone || prev.operatorPhone,
          operatorEmail: latestReqData?.operatorEmail || user?.email || prev.operatorEmail,

          // Bank KYC
          bankName: latestReqData?.bankName || b.bankName || prev.bankName,
          bankAccountNumber: latestReqData?.bankAccountNumber || b.bankAccountNumber || prev.bankAccountNumber,
          bankAccountHolderName: latestReqData?.bankAccountHolderName || b.bankAccountHolderName || b.name || prev.bankAccountHolderName,
          bankBranch: latestReqData?.bankBranch || b.bankBranch || prev.bankBranch,

          // Store
          storeName: latestReqData?.storeName || primaryStore?.name || prev.storeName || b.name,
          storeDescription: latestReqData?.storeDescription || primaryStore?.description || prev.storeDescription || '',
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

  // Realtime Sync Bus & Background Auto-Polling (Zero-F5 Realtime)
  useEffect(() => {
    const currentBiz = user?.business?.id || activeBusinessId;
    if (!currentBiz) return;

    // Silent polling every 3.5 seconds
    const pollTimer = setInterval(() => {
      loadData(false);
    }, 3500);

    const unsubscribe = realtimeSyncBus.subscribe((msg) => {
      const payload = msg.payload as any;
      const isTarget = !payload?.businessId || payload.businessId === currentBiz;

      if ((msg.type === 'BUSINESS_STATUS_UPDATED' || msg.type === 'BUSINESS_APPROVED') && isTarget) {
        loadData(false);
        if (payload?.status === 'APPROVED') {
          showToast?.('🎉 Yêu cầu cập nhật hồ sơ doanh nghiệp của bạn vừa được Admin phê duyệt thành công!', 'success');
        } else if (payload?.status === 'REJECTED') {
          showToast?.(`Yêu cầu cập nhật hồ sơ bị từ chối: ${payload?.reason || 'Chưa đạt yêu cầu'}.`, 'error');
        }
      }
    });

    return () => {
      clearInterval(pollTimer);
      unsubscribe();
    };
  }, [user, activeBusinessId, loadData, showToast]);

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

  const handleBusinessTypeChange = (newType: 'INDIVIDUAL' | 'LLC' | 'CORPORATION' | 'PARTNERSHIP') => {
    setFormData((prev) => {
      const next = { ...prev, businessType: newType };
      if (newType === 'INDIVIDUAL') {
        next.repPosition = 'Chủ hộ kinh doanh';
        if (prev.bankAccountHolderName === prev.name) {
          next.bankAccountHolderName = prev.repName || user?.fullName || '';
        }
      } else {
        if (prev.repPosition === 'Chủ hộ kinh doanh') {
          next.repPosition = 'Tổng Giám Đốc';
        }
        if (!next.bankAccountHolderName || next.bankAccountHolderName === prev.repName) {
          next.bankAccountHolderName = prev.name;
        }
      }
      return next;
    });
  };

  const handleSubmitUpdateRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cooldownSeconds > 0) {
      showToast?.(`Vui lòng chờ ${cooldownSeconds}s trước khi gửi yêu cầu tiếp theo.`, 'warning');
      return;
    }

    if (!formData.name.trim()) {
      showToast?.(isHousehold ? 'Tên Hộ kinh doanh không được để trống.' : 'Tên doanh nghiệp không được để trống.', 'error');
      return;
    }
    if (!formData.taxCode.trim()) {
      showToast?.('Mã số thuế không được để trống.', 'error');
      return;
    }
    if (!formData.repName.trim()) {
      showToast?.(isHousehold ? 'Họ và tên Chủ hộ không được để trống.' : 'Họ và tên Người đại diện pháp luật không được để trống.', 'error');
      return;
    }
    if (!formData.repIdCardNumber.trim()) {
      showToast?.('Số CCCD không được để trống.', 'error');
      return;
    }

    const cleanHq = formData.headquarters.filter((h) => h.trim().length > 0);
    if (cleanHq.length === 0) {
      showToast?.('Vui lòng nhập ít nhất 1 địa chỉ cơ sở/trụ sở kinh doanh.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        taxCode: formData.taxCode.trim(),
        businessType: formData.businessType,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        headquarters: cleanHq,
        storeName: formData.storeName.trim() || formData.name.trim(),
        storeDescription: formData.storeDescription.trim(),

        // Giấy phép ĐKKD
        businessLicenseNumber: formData.businessLicenseNumber.trim(),
        issueDate: formData.issueDate.trim(),
        issuePlace: formData.issuePlace.trim(),

        // Đại diện & Vận hành
        repName: formData.repName.trim(),
        repPosition: isHousehold ? 'Chủ hộ kinh doanh' : formData.repPosition.trim(),
        repIdCardNumber: formData.repIdCardNumber.trim(),
        repIdCardIssueDate: formData.repIdCardIssueDate.trim(),
        repIdCardIssuePlace: formData.repIdCardIssuePlace.trim(),
        operatorName: formData.operatorName.trim(),
        operatorPhone: formData.operatorPhone.trim(),
        operatorEmail: formData.operatorEmail.trim(),

        // Tài khoản Ngân Hàng KYC
        bankName: formData.bankName.trim(),
        bankAccountNumber: formData.bankAccountNumber.trim(),
        bankAccountHolderName: formData.bankAccountHolderName.trim(),
        bankBranch: formData.bankBranch.trim(),
      };

      // Bổ sung các trường chuyên biệt chỉ dành riêng cho Doanh Nghiệp (Company)
      if (isCompany) {
        payload.internationalName = formData.internationalName.trim();
        payload.shortName = formData.shortName.trim();
        payload.ecommerceIndustryCodes = formData.ecommerceIndustryCodes.trim();
        payload.website = formData.website.trim();
      }

      const res = await businessApi.submitUpdateRequest(payload);
      if (res.success) {
        showToast?.((res as any).message || (res.data as any)?.message || 'Đã gửi yêu cầu cập nhật hồ sơ thành công!', 'success');
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
        <p className="text-sm text-on-surface-variant font-medium">Đang tải hồ sơ đối tác...</p>
      </div>
    );
  }

  const isApproved = business?.status === 'APPROVED' || user?.role === 'BUSINESS';

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto font-sans animate-in fade-in duration-200">
      {/* 1. Header & Quick Actions */}
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className={`w-2.5 h-6 rounded-full inline-block ${isHousehold ? 'bg-emerald-600' : 'bg-[#00875A]'}`}></span>
            <span>
              {isHousehold ? 'Hồ Sơ Cửa Hàng & Hộ Kinh Doanh Cá Thể' : 'Hồ Sơ Doanh Nghiệp & Cửa Hàng NXB'}
            </span>
          </h1>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            {isHousehold
              ? 'Quản lý thông tin pháp lý Hộ kinh doanh cá thể, CCCD chủ hộ, tài khoản nhận tiền và gửi yêu cầu cập nhật lên Admin Sàn.'
              : 'Quản lý thông tin pháp nhân công ty / NXB, danh sách trụ sở chi nhánh và gửi yêu cầu cập nhật lên Admin Sàn.'}
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
            <p className="font-bold text-base text-amber-950 dark:text-amber-100">
              Đang ở chế độ chỉnh sửa thông tin {isHousehold ? 'Hộ Kinh Doanh' : 'Doanh Nghiệp / NXB'}
            </p>
            <p className="text-on-surface-variant leading-relaxed">
              Bạn có thể cập nhật các trường thông tin phù hợp với mô hình kinh doanh của mình. Nếu là <strong>Doanh nghiệp</strong>, hệ thống sẽ mở đầy đủ trường pháp nhân (Tên quốc tế, MST, ĐKKD, Website, CCCD Đại diện, TK Doanh nghiệp). Nếu là <strong>Hộ kinh doanh cá thể</strong>, hệ thống tự động tối giản chỉ gồm thông tin Hộ KD và CCCD/TK của Chủ hộ.
            </p>
          </div>
        </div>
      )}

      {/* 2. Top Summary Hero Card */}
      <div className="bg-white dark:bg-[#1a1622] rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-theme-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-5">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner ${
              isHousehold 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' 
                : 'bg-theme-primary/10 border-theme-primary/20 text-theme-primary'
            }`}>
              <span className="material-symbols-outlined text-3xl sm:text-4xl">
                {isHousehold ? 'storefront' : 'domain'}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface">
                  {business?.name || formData.name}
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
                  {isApproved
                    ? isHousehold ? 'Hộ Kinh Doanh Cá Thể (Đã Xác Thực)' : 'Đối Tác NXB / Doanh Nghiệp Cấp 1 (Chính Hãng)'
                    : 'Đang Chờ Thẩm Định'}
                </span>
                
                <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold border ${
                  isHousehold 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}>
                  {isHousehold ? '🏪 Hộ kinh doanh cá thể' : `🏢 ${formData.businessType === 'CORPORATION' ? 'Công ty Cổ phần' : formData.businessType === 'PARTNERSHIP' ? 'Công ty Hợp danh' : 'Công ty TNHH'}`}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-on-surface-variant font-mono">
                Mã định danh đối tác: <span className="font-bold text-on-surface">{business?.id || activeBusinessId || '675f747f-a2a8-4ff7-8f57-d6598a0c8163'}</span>
              </p>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs sm:text-sm text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-theme-primary">call</span>
                  <span className="font-semibold text-on-surface">{business?.phone || formData.phone}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-theme-primary">mail</span>
                  <span className="font-semibold text-on-surface">{business?.email || formData.email}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-theme-primary">location_on</span>
                  <span className="truncate max-w-[340px] font-medium text-on-surface">
                    {formData.headquarters[0] || business?.address}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center border-t lg:border-t-0 lg:border-l border-theme-border/60 pt-5 lg:pt-0 lg:pl-8 gap-4 shrink-0">
            <div className="text-left lg:text-right">
              <span className="text-[11px] uppercase font-bold text-on-surface-variant tracking-wider">Tỷ lệ phân chia doanh thu</span>
              <p className="text-xl sm:text-2xl font-bold text-theme-primary">85% Đối tác &bull; 15% Sàn</p>
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
        {/* Bộ chuyển đổi Mô hình kinh doanh (Chỉ hiện khi ở chế độ chỉnh sửa) */}
        {isEditMode && (
          <div className="bg-white dark:bg-[#1a1622] rounded-3xl border border-theme-border p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-editorial text-base sm:text-lg font-bold text-on-surface">
                  Lựa Chọn Loại Hình Đối Tác
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Giao diện và trường nhập liệu sẽ tự động điều chỉnh theo từng loại hình
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
                Tự động thích ứng form
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Option 1: Hộ Kinh Doanh Cá Thể */}
              <button
                type="button"
                onClick={() => handleBusinessTypeChange('INDIVIDUAL')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                  isHousehold
                    ? 'bg-emerald-50/70 border-emerald-600 ring-2 ring-emerald-600/20 shadow-sm'
                    : 'bg-white dark:bg-white/5 border-slate-200 dark:border-gray-800 hover:border-slate-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isHousehold ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500'
                }`}>
                  <span className="material-symbols-outlined text-2xl">storefront</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Hộ Kinh Doanh Cá Thể</span>
                    {isHousehold && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white">Đang chọn</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Dành cho hiệu sách tư nhân, tiệm truyện tranh, hộ kinh doanh. Chỉ cần CCCD và số GCN Hộ KD, thủ tục tinh gọn.
                  </p>
                </div>
              </button>

              {/* Option 2: Doanh Nghiệp / Công Ty / NXB */}
              <button
                type="button"
                onClick={() => {
                  if (isHousehold) handleBusinessTypeChange('LLC');
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                  isCompany
                    ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-600/20 shadow-sm'
                    : 'bg-white dark:bg-white/5 border-slate-200 dark:border-gray-800 hover:border-slate-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isCompany ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500'
                }`}>
                  <span className="material-symbols-outlined text-2xl">apartment</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Doanh Nghiệp / Nhà Xuất Bản</span>
                    {isCompany && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white">Đang chọn</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Dành cho Công ty TNHH, Công ty Cổ phần, NXB. Cần đầy đủ Tên quốc tế, Số ĐKKD, Website và TK Ngân hàng doanh nghiệp.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 2 Cột: Thông tin pháp lý & Người đại diện */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Card 1: THÔNG TIN PHÁP LÝ & ĐĂNG KÝ */}
          <div className="bg-white dark:bg-[#1a1622] rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-theme-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">
                    {isHousehold ? 'description' : 'gavel'}
                  </span>
                </div>
                <div>
                  <h3 className="font-editorial text-lg sm:text-xl font-bold text-on-surface">
                    {isHousehold ? '1. Thông Tin Pháp Lý Hộ Kinh Doanh' : '1. Thông Tin Pháp Lý Doanh Nghiệp & NXB'}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {isHousehold ? 'Giấy chứng nhận đăng ký hộ kinh doanh cá thể' : 'Giấy phép ĐKKD và thông tin pháp nhân công ty'}
                  </p>
                </div>
              </div>

              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                isHousehold ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {isHousehold ? 'Hộ Kinh Doanh' : 'Doanh Nghiệp'}
              </span>
            </div>

            <div className="space-y-5 flex-1">
              {/* Tên theo ĐKKD */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  {isHousehold ? 'Tên Hộ kinh doanh theo Giấy ĐKKD' : 'Tên đầy đủ theo ĐKKD công ty'} <span className="text-rose-500">*</span>
                </label>
                {isEditMode ? (
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm font-semibold text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                    placeholder={isHousehold ? 'VD: HỘ KINH DOANH NHÀ SÁCH TRI THỨC TRẺ' : 'VD: CÔNG TY CỔ PHẦN PHÁT HÀNH SÁCH FAHASA'}
                  />
                ) : (
                  <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center font-bold text-sm sm:text-base text-on-surface">
                    {business?.name || formData.name}
                  </div>
                )}
              </div>

              {/* Company Only: Tên quốc tế & Tên viết tắt */}
              {isCompany && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                      Tên giao dịch quốc tế (International Name)
                    </label>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={formData.internationalName}
                        onChange={(e) => setFormData({ ...formData, internationalName: e.target.value })}
                        className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm font-medium text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                        placeholder="VD: FAHASA CORPORATION"
                      />
                    ) : (
                      <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center font-medium text-sm text-on-surface">
                        {formData.internationalName || '(Chưa cập nhật tên quốc tế)'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                      Tên viết tắt (Short Name)
                    </label>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={formData.shortName}
                        onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                        className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm font-medium text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                        placeholder="VD: FAHASA"
                      />
                    ) : (
                      <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center font-medium text-sm text-on-surface">
                        {formData.shortName || '(Chưa có tên viết tắt)'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MST & Mô hình pháp lý */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    {isHousehold ? 'Mã số thuế Hộ KD / MST Chủ hộ' : 'Mã số thuế / Mã số doanh nghiệp'} <span className="text-rose-500">*</span>
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
                      {business?.taxCode || formData.taxCode}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Mô hình tổ chức
                  </label>
                  {isEditMode ? (
                    isHousehold ? (
                      <div className="h-12 px-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-gray-700 flex items-center text-sm font-semibold text-emerald-800 dark:text-emerald-300 cursor-not-allowed">
                        Hộ Kinh Doanh Cá Thể
                      </div>
                    ) : (
                      <select
                        value={formData.businessType}
                        onChange={(e) => handleBusinessTypeChange(e.target.value as any)}
                        className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm font-medium text-on-surface cursor-pointer outline-none shadow-xs"
                      >
                        <option value="LLC">Công Ty TNHH (Trách nhiệm hữu hạn)</option>
                        <option value="CORPORATION">Công Ty Cổ Phần (Joint Stock)</option>
                        <option value="PARTNERSHIP">Công Ty Hợp Danh</option>
                      </select>
                    )
                  ) : (
                    <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center font-medium text-sm text-on-surface">
                      {isHousehold
                        ? 'Hộ Kinh Doanh Cá Thể'
                        : formData.businessType === 'CORPORATION'
                        ? 'Công Ty Cổ Phần'
                        : formData.businessType === 'PARTNERSHIP'
                        ? 'Công Ty Hợp Danh'
                        : 'Công Ty TNHH'}
                    </div>
                  )}
                </div>
              </div>

              {/* Số Giấy phép, Ngày cấp & Nơi cấp */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    {isHousehold ? 'Số Giấy phép Hộ KD' : 'Số Giấy phép ĐKKD'}
                  </label>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={formData.businessLicenseNumber}
                      onChange={(e) => setFormData({ ...formData, businessLicenseNumber: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                      placeholder={isHousehold ? '41A8012345' : '0318926410'}
                    />
                  ) : (
                    <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center text-sm font-mono text-on-surface">
                      {formData.businessLicenseNumber || '(Chưa cập nhật)'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Ngày cấp
                  </label>
                  {isEditMode ? (
                    <input
                      type="date"
                      value={formData.issueDate}
                      onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm text-on-surface outline-none shadow-xs"
                    />
                  ) : (
                    <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center text-sm text-on-surface">
                      {formData.issueDate || '(Chưa cập nhật)'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    {isHousehold ? 'Cơ quan cấp (UBND)' : 'Nơi cấp (Sở KH&ĐT)'}
                  </label>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={formData.issuePlace}
                      onChange={(e) => setFormData({ ...formData, issuePlace: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                      placeholder={isHousehold ? 'UBND Quận 1' : 'Sở KH&ĐT TP. HCM'}
                    />
                  ) : (
                    <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center text-sm text-on-surface truncate">
                      {formData.issuePlace || '(Chưa cập nhật)'}
                    </div>
                  )}
                </div>
              </div>

              {/* Company Only: Mã ngành TMĐT & Website */}
              {isCompany && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                      Mã ngành TMĐT (Nghị định 52 &amp; 85)
                    </label>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={formData.ecommerceIndustryCodes}
                        onChange={(e) => setFormData({ ...formData, ecommerceIndustryCodes: e.target.value })}
                        className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                        placeholder="4791 (Bán lẻ qua TMĐT), 5811"
                      />
                    ) : (
                      <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center text-sm text-on-surface">
                        {formData.ecommerceIndustryCodes || '4791'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                      Website chính thức công ty
                    </label>
                    {isEditMode ? (
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                        placeholder="https://company.vn"
                      />
                    ) : (
                      <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center text-sm text-theme-primary truncate">
                        {formData.website ? (
                          <a href={formData.website} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                            <span>{formData.website}</span>
                            <span className="material-symbols-outlined text-xs">open_in_new</span>
                          </a>
                        ) : (
                          '(Chưa cập nhật website)'
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hotline & Email liên hệ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Hotline CSKH / Vận hành <span className="text-rose-500">*</span>
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
                      {business?.phone || formData.phone}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Email nhận thông báo <span className="text-rose-500">*</span>
                  </label>
                  {isEditMode ? (
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm font-medium text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                      placeholder={isHousehold ? 'tiemsach@gmail.com' : 'contact@company.vn'}
                    />
                  ) : (
                    <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center font-medium text-sm text-on-surface truncate">
                      {business?.email || formData.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: NGƯỜI ĐẠI DIỆN & VẬN HÀNH */}
          <div className="bg-white dark:bg-[#1a1622] rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-theme-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">badge</span>
                </div>
                <div>
                  <h3 className="font-editorial text-lg sm:text-xl font-bold text-on-surface">
                    {isHousehold ? '2. Chủ Hộ Kinh Doanh & Vận Hành' : '2. Người Đại Diện Theo Pháp Luật'}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {isHousehold ? 'Thông tin nhân thân chủ hộ và quản lý gian hàng' : 'Thông tin định danh người đại diện pháp luật & e-KYC'}
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                e-KYC
              </span>
            </div>

            <div className="space-y-4 flex-1">
              {/* Họ tên đại diện */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  {isHousehold ? 'Họ và tên Chủ Hộ Kinh Doanh' : 'Họ và tên người đại diện pháp luật'} <span className="text-rose-500">*</span>
                </label>
                {isEditMode ? (
                  <input
                    type="text"
                    required
                    value={formData.repName}
                    onChange={(e) => setFormData({ ...formData, repName: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm font-bold text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                    placeholder="TRẦN MINH HOÀNG"
                  />
                ) : (
                  <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center font-bold text-base text-on-surface gap-2">
                    <span className="material-symbols-outlined text-theme-primary text-xl">person</span>
                    <span>{formData.repName}</span>
                  </div>
                )}
              </div>

              {/* Chức vụ & CCCD */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Chức danh / Vị trí
                  </label>
                  {isEditMode ? (
                    isHousehold ? (
                      <div className="h-12 px-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-gray-700 flex items-center text-sm font-semibold text-emerald-800 dark:text-emerald-300 cursor-not-allowed">
                        Chủ hộ kinh doanh (Mặc định)
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={formData.repPosition}
                        onChange={(e) => setFormData({ ...formData, repPosition: e.target.value })}
                        className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                        placeholder="Tổng Giám Đốc, Giám Đốc..."
                      />
                    )
                  ) : (
                    <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center font-semibold text-sm text-on-surface">
                      {isHousehold ? 'Chủ hộ kinh doanh' : formData.repPosition}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    {isHousehold ? 'Số CCCD của Chủ hộ' : 'Số CCCD / Hộ chiếu đại diện'} <span className="text-rose-500">*</span>
                  </label>
                  {isEditMode ? (
                    <input
                      type="text"
                      required
                      value={formData.repIdCardNumber}
                      onChange={(e) => setFormData({ ...formData, repIdCardNumber: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm font-mono text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                      placeholder="079094002381"
                    />
                  ) : (
                    <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center font-mono font-bold text-sm text-on-surface">
                      {formData.repIdCardNumber}
                    </div>
                  )}
                </div>
              </div>

              {/* Ngày cấp & Nơi cấp CCCD */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Ngày cấp CCCD
                  </label>
                  {isEditMode ? (
                    <input
                      type="date"
                      value={formData.repIdCardIssueDate}
                      onChange={(e) => setFormData({ ...formData, repIdCardIssueDate: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm text-on-surface outline-none shadow-xs"
                    />
                  ) : (
                    <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center text-sm text-on-surface">
                      {formData.repIdCardIssueDate}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Nơi cấp CCCD
                  </label>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={formData.repIdCardIssuePlace}
                      onChange={(e) => setFormData({ ...formData, repIdCardIssuePlace: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                      placeholder="Cục Cảnh sát QLHC về TTXH"
                    />
                  ) : (
                    <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center text-sm text-on-surface truncate">
                      {formData.repIdCardIssuePlace}
                    </div>
                  )}
                </div>
              </div>

              {/* Người phụ trách vận hành gian hàng */}
              <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/70 dark:border-gray-800 space-y-3">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                  {isHousehold ? 'Người phụ trách bán hàng trực tiếp' : 'Người phụ trách vận hành gian hàng (Admin Master)'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Họ tên</label>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={formData.operatorName}
                        onChange={(e) => setFormData({ ...formData, operatorName: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] text-xs font-semibold text-on-surface outline-none"
                      />
                    ) : (
                      <p className="font-bold text-xs text-on-surface truncate">{formData.operatorName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Số điện thoại</label>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={formData.operatorPhone}
                        onChange={(e) => setFormData({ ...formData, operatorPhone: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] text-xs font-mono text-on-surface outline-none"
                      />
                    ) : (
                      <p className="font-medium text-xs text-on-surface truncate">{formData.operatorPhone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Email nhận đơn</label>
                    {isEditMode ? (
                      <input
                        type="email"
                        value={formData.operatorEmail}
                        onChange={(e) => setFormData({ ...formData, operatorEmail: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] text-xs font-mono text-on-surface outline-none"
                      />
                    ) : (
                      <p className="font-medium text-xs text-theme-primary truncate">{formData.operatorEmail}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: TÀI KHOẢN NGÂN HÀNG & ĐỐI SOÁT DOANH THU (KYC) */}
        <div className="bg-white dark:bg-[#1a1622] rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-theme-border flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">account_balance</span>
              </div>
              <div>
                <h3 className="font-editorial text-lg sm:text-xl font-bold text-on-surface">
                  3. Tài Khoản Ngân Hàng Nhận Quyết Toán &amp; Đối Soát Doanh Thu
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {isHousehold
                    ? 'Tài khoản ngân hàng cá nhân của Chủ hộ kinh doanh để rút tiền bán sách và nhận đối soát tự động'
                    : 'Tài khoản ngân hàng của pháp nhân doanh nghiệp theo hợp đồng phân phối sàn HUKI'}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">verified</span>
              <span>Đối Soát Chu Kỳ 24h</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Tên Ngân Hàng <span className="text-rose-500">*</span>
              </label>
              {isEditMode ? (
                <input
                  type="text"
                  required
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm font-semibold text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                  placeholder="MB Bank, Vietcombank..."
                />
              ) : (
                <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center font-bold text-sm text-on-surface">
                  {formData.bankName}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Số Tài Khoản (STK) <span className="text-rose-500">*</span>
              </label>
              {isEditMode ? (
                <input
                  type="text"
                  required
                  value={formData.bankAccountNumber}
                  onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm font-mono font-bold text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                  placeholder="888899996688"
                />
              ) : (
                <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center font-mono font-bold text-sm text-theme-primary">
                  {formData.bankAccountNumber}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                {isHousehold ? 'Chủ tài khoản (Trùng tên Chủ hộ)' : 'Chủ tài khoản (Tên công ty)'} <span className="text-rose-500">*</span>
              </label>
              {isEditMode ? (
                <input
                  type="text"
                  required
                  value={formData.bankAccountHolderName}
                  onChange={(e) => setFormData({ ...formData, bankAccountHolderName: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm font-bold text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                  placeholder={isHousehold ? 'TRẦN MINH HOÀNG' : 'CÔNG TY TNHH PHÁT HÀNH SÁCH TRÍ TUỆ VIỆT'}
                />
              ) : (
                <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center font-bold text-sm text-on-surface uppercase truncate">
                  {formData.bankAccountHolderName}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Chi Nhánh Ngân Hàng
              </label>
              {isEditMode ? (
                <input
                  type="text"
                  value={formData.bankBranch}
                  onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm text-on-surface placeholder:text-gray-400 outline-none shadow-xs"
                  placeholder="Chi nhánh TP. HCM"
                />
              ) : (
                <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center text-sm text-on-surface truncate">
                  {formData.bankBranch || '(Chưa cập nhật)'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: TRỤ SỞ & CHI NHÁNH / KHO LẤY HÀNG */}
        <div className="bg-white dark:bg-[#1a1622] rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-theme-border flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">warehouse</span>
              </div>
              <div>
                <h3 className="font-editorial text-lg sm:text-xl font-bold text-on-surface">
                  {isHousehold ? '4. Địa Chỉ Cơ Sở Kinh Doanh & Điểm Gửi Hàng' : '4. Danh Sách Trụ Sở & Chi Nhánh Văn Phòng / Kho Hàng'}
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {isHousehold 
                    ? 'Địa chỉ cửa hàng/kho sách thực tế để đơn vị vận chuyển ghé lấy sách khi có đơn hàng mới' 
                    : 'Địa chỉ kho hàng, văn phòng giao dịch và điểm lấy sách của đơn vị vận chuyển'}
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
                <span>+ Thêm địa chỉ {formData.headquarters.length + 1}</span>
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
                    <span>
                      {idx === 0 
                        ? (isHousehold ? 'Cơ sở kinh doanh chính (Kho sách 1)' : 'Trụ sở chính (Kho hàng 1)') 
                        : `Chi nhánh ${idx + 1} (Kho phụ)`}
                    </span>
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
                      placeholder={`Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố...`}
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

        {/* Card 5: GIAN HÀNG TRỰC THUỘC (HIỂN THỊ CÔNG KHAI TRÊN SÀN) */}
        <div className="bg-white dark:bg-[#1a1622] rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-theme-border flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">storefront</span>
              </div>
              <div>
                <h3 className="font-editorial text-lg sm:text-xl font-bold text-on-surface">
                  5. Gian Hàng Trực Thuộc (Hiển Thị Công Khai)
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Tên Shop và phần giới thiệu mà độc giả nhìn thấy trên sàn HUKI
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-theme-primary bg-theme-primary/10 border border-theme-primary/20 px-3.5 py-1.5 rounded-full">
              Đồng bộ 1 Seller - 1 Store
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
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1a29] focus:border-theme-primary focus:ring-4 focus:ring-theme-primary/10 transition-all text-sm font-semibold text-emerald-800 dark:text-emerald-300 placeholder:text-gray-400 outline-none shadow-xs"
                  placeholder={isHousehold ? 'VD: Hiệu Sách Tri Thức Trẻ' : 'VD: FAHASA Official Store'}
                />
              ) : (
                <div className="min-h-12 px-4 py-3 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 flex items-center font-bold text-sm sm:text-base text-emerald-800 dark:text-emerald-300">
                  {stores[0]?.name || formData.storeName || business?.name}
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
                  placeholder="Giới thiệu về gian hàng, dòng sách phát hành chủ đạo, cam kết chất lượng sách in và ebook bản quyền..."
                />
              ) : (
                <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/80 dark:border-gray-800 text-sm text-on-surface-variant leading-relaxed min-h-[90px]">
                  {stores[0]?.description || formData.storeDescription || 'Gian hàng chính hãng phân phối sách uy tín trên sàn HUKI.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
