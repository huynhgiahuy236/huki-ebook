"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { businessApi, BusinessData } from '@/ui/api/businessApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import {
  COMPLIANCE_33_FIELDS,
  COMPLIANCE_FIELD_MAP,
  SingleFieldAuditReview,
  BusinessFieldAuditMap,
} from '@/ui/services/taxRegistryService';

export interface ClusterStatus {
  passed: boolean;
  note?: string;
}

export interface ClusterAuditState {
  legal?: ClusterStatus;
  representative?: ClusterStatus;
  copyright?: ClusterStatus;
  operation?: ClusterStatus;
}

export default function SellerPendingPage() {
  const router = useRouter();
  const { refreshBusiness } = useAuth();
  const { showToast } = useToast();

  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [cachedProfile, setCachedProfile] = useState<any>(null);
  const [clusterAudit, setClusterAudit] = useState<ClusterAuditState>({});
  const [fieldAudit, setFieldAudit] = useState<BusinessFieldAuditMap>({});
  const [localCorrections, setLocalCorrections] = useState<Record<string, string>>({});
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);
  const [showValidAccordion, setShowValidAccordion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingApproval, setCheckingApproval] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const isRedirectingRef = React.useRef(false);
  const pollTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const loadClusterAudit = useCallback((bizId?: string, taxCode?: string) => {
    if (typeof window === 'undefined') return;
    try {
      const raw = (bizId && localStorage.getItem(`huki_business_cluster_audit_${bizId}`)) ||
        (taxCode && localStorage.getItem(`huki_business_cluster_audit_${taxCode}`));
      if (raw) {
        setClusterAudit(JSON.parse(raw));
      }
    } catch {
      // ignore
    }

    try {
      const rawFields = (bizId && localStorage.getItem(`huki_business_field_audit_${bizId}`)) ||
        (taxCode && localStorage.getItem(`huki_business_field_audit_${taxCode}`));
      if (rawFields) {
        setFieldAudit(JSON.parse(rawFields));
      }
    } catch {
      // ignore
    }
  }, []);

  const loadBusiness = useCallback(async (isSilent = false) => {
    if (isRedirectingRef.current) return;
    try {
      const res = await businessApi.getMyBusiness();
      if (res.success && res.data) {
        const b = (res.data as any)?.data || res.data;
        setBusiness(b);
        loadClusterAudit(b.id, b.taxCode);

        // Try reading cached full profile from registration
        if (typeof window !== 'undefined') {
          try {
            const tax = b.taxCode || '';
            const raw1 = tax ? localStorage.getItem(`huki_enterprise_profile_${tax}`) : null;
            const raw2 = b.id ? localStorage.getItem(`huki_enterprise_profile_${b.id}`) : null;
            const found = raw2 ? JSON.parse(raw2) : raw1 ? JSON.parse(raw1) : null;
            if (found) setCachedProfile(found);
          } catch {
            // ignore
          }
        }

        // Nếu đã được duyệt → tự động chuyển sang trang Setup / Dashboard
        if (b.status === 'APPROVED') {
          if (isRedirectingRef.current) return;
          isRedirectingRef.current = true;

          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }

          await refreshBusiness?.();

          const isCompleted = typeof window !== 'undefined' && b.id && localStorage.getItem(`huki_store_setup_completed_${b.id}`) === 'true';

          showToast({
            title: 'Hồ sơ đã được phê duyệt',
            message: isCompleted
              ? 'Chào mừng đối tác trở lại! Đang chuyển đến Bảng điều khiển người bán...'
              : 'Ban Quản Trị HuKi đã phê duyệt hồ sơ đối tác! Đang chuyển đến bước thiết lập gian hàng...',
            type: 'success',
          });

          router.replace(isCompleted ? '/seller/dashboard' : '/seller/stores/setup');
          return;
        }
      }
    } catch (err) {
      if (!isSilent) console.error('Error loading business:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [router, showToast, refreshBusiness, loadClusterAudit]);

  useEffect(() => {
    loadBusiness();

    // 1. Silent Background Auto-Polling (3s)
    pollTimerRef.current = setInterval(() => {
      if (!isRedirectingRef.current) {
        loadBusiness(true);
      }
    }, 3000);

    // 2. Realtime Bus Subscriber
    const unsub = realtimeSyncBus.subscribe((msg: any) => {
      if (msg.type === 'BUSINESS_APPROVED' || msg.type === 'BUSINESS_STATUS_UPDATED') {
        loadBusiness(true);
      }
      if (msg.type === 'BUSINESS_CLUSTER_AUDIT_UPDATED') {
        if (msg.clusters) {
          setClusterAudit(msg.clusters);
        }
      }
      if (msg.type === 'BUSINESS_FIELD_AUDIT_UPDATED') {
        if (msg.payload?.fields) {
          setFieldAudit(msg.payload.fields);
        }
        if (msg.payload?.clusters) {
          setClusterAudit(msg.payload.clusters);
        }
      }
    });

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      unsub();
    };
  }, [loadBusiness]);

  const handleCheckApproval = async () => {
    setCheckingApproval(true);
    try {
      await refreshBusiness?.();
      await loadBusiness();
      if (business?.status === 'APPROVED') {
        showToast({
          title: 'Hồ sơ đã được duyệt',
          message: 'Đang chuyển bạn sang giao diện thiết lập gian hàng...',
          type: 'success',
        });
        router.push('/seller/stores/setup');
      } else {
        showToast({
          title: 'Đang trong quá trình thẩm định',
          message: 'Hồ sơ đối tác đang được Ban Thẩm Định xử lý theo đúng quy trình chuẩn.',
          type: 'info',
        });
      }
    } finally {
      setCheckingApproval(false);
    }
  };

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const currentStatus = business?.status || 'PENDING_APPROVAL';
  const taxCodeDisplay = business?.taxCode || cachedProfile?.tax_code || '0318926410';
  const dossierCode = `HK-APP-${taxCodeDisplay}`;
  const storeNameDisplay = business?.stores?.[0]?.name || business?.name || cachedProfile?.store_name || cachedProfile?.company_name || 'Gian Hàng Sách';
  const companyNameDisplay = business?.name || cachedProfile?.company_name || 'Đơn Vị Đăng Ký Đối Tác';
  const addressDisplay = business?.address || cachedProfile?.registered_street || 'Đang cập nhật tuyến kho lấy hàng';

  // Granular Field Audit Lists
  const flaggedItems = COMPLIANCE_33_FIELDS.filter((f) => fieldAudit[f.key]?.status === 'FLAGGED').map((f) => ({
    ...f,
    review: fieldAudit[f.key],
  }));

  const validItems = COMPLIANCE_33_FIELDS.filter((f) => fieldAudit[f.key]?.status !== 'FLAGGED').map((f) => ({
    ...f,
    review: fieldAudit[f.key],
  }));

  const hasFlaggedItems = flaggedItems.length > 0;

  // Check if any cluster is flagged
  const hasFlaggedClusters =
    hasFlaggedItems ||
    clusterAudit.legal?.passed === false ||
    clusterAudit.representative?.passed === false ||
    clusterAudit.copyright?.passed === false;

  const handleFieldCorrectionChange = (key: string, val: string) => {
    setLocalCorrections((prev) => ({ ...prev, [key]: val }));
  };

  const handleDocumentReplace = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          handleFieldCorrectionChange(key, reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitRevision = async () => {
    if (!business) return;
    setIsSubmittingRevision(true);
    try {
      const storageKey = `huki_enterprise_profile_${business.taxCode || business.id}`;
      const currentProfile = cachedProfile || {};
      const updatedProfile = { ...currentProfile, ...localCorrections };

      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(updatedProfile));
        if (business.id) localStorage.setItem(`huki_enterprise_profile_${business.id}`, JSON.stringify(updatedProfile));
        if (business.taxCode) localStorage.setItem(`huki_enterprise_profile_${business.taxCode}`, JSON.stringify(updatedProfile));
      }
      setCachedProfile(updatedProfile);

      // Update fieldAudit state: mark corrected items as pending re-audit
      const updatedAudit = { ...fieldAudit };
      Object.keys(localCorrections).forEach((k) => {
        if (updatedAudit[k]) {
          updatedAudit[k] = {
            status: 'VALID',
            note: 'Đối tác đã cập nhật thông tin mới',
            updatedAt: new Date().toISOString(),
          };
        }
      });
      setFieldAudit(updatedAudit);

      if (typeof window !== 'undefined') {
        if (business.id) localStorage.setItem(`huki_business_field_audit_${business.id}`, JSON.stringify(updatedAudit));
        if (business.taxCode) localStorage.setItem(`huki_business_field_audit_${business.taxCode}`, JSON.stringify(updatedAudit));
      }

      realtimeSyncBus.publish({
        type: 'BUSINESS_REVISION_SUBMITTED',
        payload: {
          businessId: business.id,
          taxCode: business.taxCode,
          updatedFields: localCorrections,
        },
      });

      showToast({
        title: 'Đã gửi lại hồ sơ bổ sung',
        message: `Đã gửi lại ${Object.keys(localCorrections).length} mục chỉnh sửa cho Ban Thẩm Định HuKi.`,
        type: 'success',
      });
      setLocalCorrections({});
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-[#003B2B]/20 border-t-[#003B2B] rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Đang tải trạng thái thẩm định hồ sơ...</p>
      </div>
    );
  }

  return (
    <div className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto antialiased">
      {/* 1. Header & Mã tiếp nhận */}
      <div className="mb-6">
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Link href="/seller" className="hover:text-[#003B2B] transition-colors">Kênh Nhà Bán Hàng</Link>
          <span className="text-slate-300">/</span>
          <Link href="/seller/register" className="hover:text-[#003B2B] transition-colors">Đăng ký đối tác</Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-medium">Tiến trình thẩm định</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900 tracking-tight">
                Hồ Sơ Đăng Ký Đối Tác Kinh Doanh
              </h1>

              {currentStatus === 'APPROVED' ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-800">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Đã Phê Duyệt
                </span>
              ) : hasFlaggedClusters ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-900">
                  <span className="material-symbols-outlined text-[14px]">edit_note</span>
                  Cần Bổ Sung Thông Tin
                </span>
              ) : currentStatus === 'REJECTED' ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-rose-300 bg-rose-50 text-rose-800">
                  <span className="material-symbols-outlined text-[14px]">cancel</span>
                  Từ Chối Hồ Sơ
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-900">
                  <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                  Đang Thẩm Định Theo Cụm
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
              <div className="flex items-center gap-1">
                <span>Mã tiếp nhận:</span>
                <span className="font-mono font-semibold text-slate-800">{dossierCode}</span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(dossierCode)}
                  className="text-slate-400 hover:text-[#003B2B] transition-colors cursor-pointer ml-0.5"
                  title="Sao chép mã hồ sơ"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {isCopied ? 'done' : 'content_copy'}
                  </span>
                </button>
              </div>
              <span className="text-slate-300">|</span>
              <span>Thời gian tiếp nhận: {business?.createdAt ? new Date(business.createdAt).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}</span>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="hidden sm:inline text-[#006953] font-medium">SLA xử lý cam kết: 24h</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleCheckApproval}
              disabled={checkingApproval}
              className="h-8 sm:h-9 px-3.5 bg-[#003B2B] hover:bg-[#002b1f] text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-[16px] ${checkingApproval ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>{checkingApproval ? 'Đang kiểm tra...' : 'Làm mới trạng thái'}</span>
            </button>

            <Link
              href="/"
              className="h-8 sm:h-9 px-3 border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">home</span>
              <span className="hidden sm:inline">Về trang chủ</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Stepper Tinh Gọn 4 Bước */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 mb-6 shadow-2xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 text-xs font-bold border border-emerald-300">
              <span className="material-symbols-outlined text-[16px]">check</span>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900 leading-tight">1. Nộp Hồ Sơ Online</div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Hoàn tất</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-[#003B2B] text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs ring-4 ring-[#003B2B]/10">
              2
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#003B2B] leading-tight">2. Thẩm Định Hồ Sơ Đối Tác</div>
              <div className="text-[11px] text-amber-800 font-semibold mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Đang xử lý
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 opacity-60">
            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 text-xs font-semibold border border-slate-200">
              3
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-800 leading-tight">3. Ký Số Hợp Đồng</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Sau khi duyệt</div>
            </div>
          </div>

          <div className="flex items-start gap-3 opacity-60">
            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 text-xs font-semibold border border-slate-200">
              4
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-800 leading-tight">4. Thiết Lập Ngân Hàng & Mở Bán</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Sau khi duyệt</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột Trái: Mục Cần Bổ Sung Chuẩn Chỉ & Checklist (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* 1. KHỐI CÁC MỤC CẦN BỔ SUNG (NẾU CÓ MỤC BỊ BÁO LỖI) */}
          {hasFlaggedItems && (
            <div className="bg-white border-2 border-amber-300 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h2 className="text-sm font-bold text-slate-900">
                      Mục Cần Bổ Sung Theo Ban Thẩm Định ({flaggedItems.length} mục)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Vui lòng xem lý do và cập nhật trực tiếp tại từng mục dưới đây, sau đó bấm &ldquo;Gửi lại hồ sơ&rdquo;.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#FEF3E2] text-amber-900 border border-amber-200 self-start sm:self-auto">
                  Cần Chỉnh Sửa
                </span>
              </div>

              {/* Grid các mục bị lỗi */}
              <div className="space-y-3.5">
                {flaggedItems.map((item) => {
                  const currentValue = localCorrections[item.key] ?? (cachedProfile?.[item.key] || '');
                  const isCorrected = Boolean(localCorrections[item.key]);

                  return (
                    <div
                      key={item.key}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5 hover:border-[#003B2B]/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <span>{item.label}</span>
                            <span className="text-[10px] font-medium text-slate-500">• {item.clusterTitle}</span>
                          </div>
                          {item.review?.note && (
                            <div className="mt-1.5 p-2.5 rounded-lg bg-[#FEF3E2] border border-amber-200 text-xs text-amber-950 font-medium leading-relaxed">
                              Lời nhắn từ Ban Thẩm Định: {item.review.note}
                            </div>
                          )}
                        </div>

                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            isCorrected
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {isCorrected ? 'Đã sửa' : 'Chưa sửa'}
                        </span>
                      </div>

                      {/* Controls sửa trực tiếp */}
                      {item.isDocument ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2 border-t border-slate-200">
                          {currentValue && (
                            <img
                              src={currentValue}
                              alt={item.label}
                              className="w-20 h-16 object-cover rounded-lg border border-slate-200"
                            />
                          )}
                          <div className="flex flex-col gap-1">
                            <label className="px-3.5 py-1.5 rounded-lg bg-[#003B2B] hover:bg-[#00281d] text-white font-semibold text-xs transition-colors cursor-pointer inline-block self-start">
                              <span>Chọn ảnh mới thay thế</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleDocumentReplace(item.key, e)}
                              />
                            </label>
                            <span className="text-[11px] text-slate-500">
                              Định dạng JPG, PNG hoặc PDF. Tối đa 5MB.
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-slate-200">
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                            Nhập thông tin điều chỉnh:
                          </label>
                          <input
                            type="text"
                            value={currentValue}
                            onChange={(e) => handleFieldCorrectionChange(item.key, e.target.value)}
                            placeholder={`Nhập lại ${item.label}...`}
                            className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:border-[#003B2B] focus:ring-1 focus:ring-[#003B2B] outline-none"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Button: Gửi lại hồ sơ */}
              <div className="pt-3 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-slate-600">
                  Đã cập nhật: <strong className="text-slate-900">{Object.keys(localCorrections).length} / {flaggedItems.length} mục</strong>
                </span>

                <button
                  type="button"
                  onClick={handleSubmitRevision}
                  disabled={isSubmittingRevision || Object.keys(localCorrections).length === 0}
                  className="px-6 py-2.5 rounded-xl bg-[#003B2B] hover:bg-[#00281d] text-white font-bold text-xs transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingRevision ? 'Đang gửi...' : 'Gửi Lại Hồ Sơ Đã Bổ Sung'}
                </button>
              </div>
            </div>
          )}

          {/* 2. CHECKLIST DANH SÁCH MỤC ĐÃ HỢP LỆ (TRANSPARENCY ACCORDION) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
            <div
              onClick={() => setShowValidAccordion(!showValidAccordion)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00875A]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Danh Sách Mục Đã Thẩm Định Hợp Lệ ({validItems.length}/33 mục)
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-semibold hover:text-[#003B2B]">
                {showValidAccordion ? 'Thu gọn ▲' : 'Xem chi tiết ▼'}
              </span>
            </div>

            {showValidAccordion && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-4 mt-3 border-t border-slate-100">
                {validItems.map((item) => {
                  const val = cachedProfile?.[item.key];
                  return (
                    <div
                      key={item.key}
                      className="p-2.5 rounded-lg bg-emerald-50/30 border border-emerald-100 flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <span className="text-[#00875A] font-bold">✓</span>
                          <span className="truncate">{item.label}</span>
                        </div>
                        {val && typeof val === 'string' && !item.isDocument && (
                          <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5 ml-4">
                            {val}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                        Hợp lệ
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tóm tắt bản sao hồ sơ đối tác (4 Khối Ngắn Gọn) */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Tóm Tắt Dữ Liệu Hồ Sơ Đã Nộp
              </h2>
              <Link
                href="/seller/register"
                className="text-xs font-semibold text-[#003B2B] hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
                <span>Chỉnh sửa hồ sơ</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-medium block text-[11px]">Đơn vị &amp; Gian hàng</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{companyNameDisplay}</span>
                <span className="text-slate-600 text-[11px]">Gian hàng: {storeNameDisplay}</span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-medium block text-[11px]">Mã số thuế &amp; Pháp nhân</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block">{taxCodeDisplay}</span>
                <span className="text-slate-600 text-[11px]">
                  {(business as any)?.businessType === 'CORPORATION' || (business as any)?.businessType === 'LLC'
                    ? 'Doanh Nghiệp / Nhà Xuất Bản'
                    : 'Hộ Kinh Doanh Cá Thể'}
                </span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100 sm:col-span-2">
                <span className="text-slate-500 font-medium block text-[11px]">Kho hàng lấy hàng HuKi Express</span>
                <span className="text-slate-800 font-medium mt-0.5 block">{addressDisplay}</span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100 sm:col-span-2">
                <span className="text-slate-500 font-medium block text-[11px]">Tài khoản thụ hưởng doanh thu</span>
                <span className="text-slate-800 font-medium mt-0.5 block">
                  {business?.bankName ? (
                    <>
                      <strong>{business.bankName}</strong> — STK: <span className="font-mono">{business.bankAccountNumber}</span> ({business.bankAccountHolderName || 'Chủ tài khoản'})
                    </>
                  ) : (
                    'Đã đăng ký theo hồ sơ trực tuyến (Đang đối soát liên ngân hàng)'
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cột Phải: Trạng Thái Realtime & Hỗ Trợ Tinh Gọn (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Box 1: Trạng thái Realtime & Thao tác */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-2xs p-4 sm:p-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Đồng Bộ Trực Tiếp (Realtime)
            </h3>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-lg mb-4 text-xs">
              <div className="flex items-center gap-2 font-semibold text-[#003B2B] mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Realtime Active</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Tự động mở cửa hàng ngay khi Admin phê duyệt. Không cần tải lại trang.
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCheckApproval}
                disabled={checkingApproval}
                className="w-full h-9 bg-[#003B2B] hover:bg-[#002b1f] text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-2xs"
              >
                <span className={`material-symbols-outlined text-[15px] ${checkingApproval ? 'animate-spin' : ''}`}>
                  sync
                </span>
                <span>{checkingApproval ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái ngay'}</span>
              </button>

              <Link
                href="/seller/register"
                className="w-full h-9 border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">edit_note</span>
                <span>Bổ sung / Chỉnh sửa hồ sơ</span>
              </Link>
            </div>
          </div>

          {/* Box 2: Hỗ trợ đối tác vắn tắt */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-2xs p-4 sm:p-5 text-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Hỗ Trợ Thẩm Định
            </h3>

            <div className="space-y-2.5 text-slate-700">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-[16px]">call</span>
                <span>Hotline: <strong className="text-slate-900">1900 1234</strong> (Phím 2)</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-[16px]">mail</span>
                <span>Email: <a href="mailto:appraisal@hukiebook.vn" className="text-[#003B2B] font-semibold hover:underline">appraisal@hukiebook.vn</a></span>
              </div>

              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-[16px]">schedule</span>
                <span className="text-slate-600">Làm việc: 08:00 – 18:00 (T2 – T7)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
