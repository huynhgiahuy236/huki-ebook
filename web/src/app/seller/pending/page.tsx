"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { businessApi, BusinessData } from '@/ui/api/businessApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';

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

  // Check if any cluster is flagged
  const hasFlaggedClusters =
    clusterAudit.legal?.passed === false ||
    clusterAudit.representative?.passed === false ||
    clusterAudit.copyright?.passed === false ||
    clusterAudit.operation?.passed === false;

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
              <div className="text-xs font-bold text-[#003B2B] leading-tight">2. Thẩm Định 4 Cụm</div>
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
              <div className="text-xs font-semibold text-slate-800 leading-tight">4. Vận Hành Mở Bán</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Kế tiếp</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột Trái: 4 Cụm Thẩm Định Tinh Gọn (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Box Cảnh báo nếu có Cụm bị đánh dấu */}
          {hasFlaggedClusters && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 text-xl shrink-0 mt-0.5">warning</span>
              <div className="text-xs text-amber-900 leading-relaxed">
                <div className="font-bold">Ban Thẩm Định yêu cầu chỉnh sửa hoặc bổ sung hồ sơ</div>
                <p className="mt-0.5">
                  Vui lòng xem chi tiết ghi chú tại các cụm báo đỏ bên dưới và nhấn nút &ldquo;Sửa cụm này&rdquo; để cập nhật lại thông tin.
                </p>
              </div>
            </div>
          )}

          {/* 4 Thẻ Cụm Thẩm Định Tinh Gọn */}
          <div className="space-y-3.5">
            {/* Cụm 1: Pháp Lý & Mã Số Thuế */}
            <div className={`bg-white border rounded-xl p-4 shadow-2xs transition-all ${
              clusterAudit.legal?.passed === false
                ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-300'
                : 'border-slate-200/80 hover:border-slate-300'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    clusterAudit.legal?.passed === false
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    <span className="material-symbols-outlined text-[20px]">apartment</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>Cụm 1: Pháp Lý &amp; Mã Số Thuế</span>
                      <span className="text-[10px] text-slate-400 font-normal">• MST &amp; GPKD</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      MST: <strong className="font-mono text-slate-900">{taxCodeDisplay}</strong> — Đơn vị: <span className="font-medium text-slate-800">{companyNameDisplay}</span>
                    </p>
                    {clusterAudit.legal?.passed === false && clusterAudit.legal.note && (
                      <div className="mt-2 text-xs font-medium text-amber-800 bg-amber-100/60 p-2 rounded-lg border border-amber-200">
                        <strong>Yêu cầu chỉnh sửa:</strong> {clusterAudit.legal.note}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {clusterAudit.legal?.passed === false ? (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                        Cần Bổ Sung
                      </span>
                      <Link
                        href="/seller/register"
                        className="text-[11px] font-semibold text-[#003B2B] hover:underline flex items-center gap-0.5"
                      >
                        <span>Sửa cụm này</span>
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                      </Link>
                    </>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      ✓ Đã Xác Thực
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Cụm 2: Người Đại Diện Pháp Luật */}
            <div className={`bg-white border rounded-xl p-4 shadow-2xs transition-all ${
              clusterAudit.representative?.passed === false
                ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-300'
                : 'border-slate-200/80 hover:border-slate-300'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    clusterAudit.representative?.passed === false
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    <span className="material-symbols-outlined text-[20px]">badge</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>Cụm 2: Người Đại Diện Pháp Luật</span>
                      <span className="text-[10px] text-slate-400 font-normal">• e-KYC CCCD</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Đại diện: <strong className="text-slate-800">{cachedProfile?.rep_full_name || 'Chủ hộ / Đại diện pháp nhân'}</strong> — Đã nộp ảnh CCCD 2 mặt
                    </p>
                    {clusterAudit.representative?.passed === false && clusterAudit.representative.note && (
                      <div className="mt-2 text-xs font-medium text-amber-800 bg-amber-100/60 p-2 rounded-lg border border-amber-200">
                        <strong>Yêu cầu chỉnh sửa:</strong> {clusterAudit.representative.note}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {clusterAudit.representative?.passed === false ? (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                        Cần Bổ Sung
                      </span>
                      <Link
                        href="/seller/register"
                        className="text-[11px] font-semibold text-[#003B2B] hover:underline flex items-center gap-0.5"
                      >
                        <span>Sửa cụm này</span>
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                      </Link>
                    </>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      ✓ Hợp Lệ
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Cụm 3: Tiêu Chuẩn Sách & Bản Quyền */}
            <div className={`bg-white border rounded-xl p-4 shadow-2xs transition-all ${
              clusterAudit.copyright?.passed === false
                ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-300'
                : 'border-slate-200/80 hover:border-slate-300'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    clusterAudit.copyright?.passed === false
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    <span className="material-symbols-outlined text-[20px]">menu_book</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>Cụm 3: Tiêu Chuẩn Sách &amp; Bản Quyền</span>
                      <span className="text-[10px] text-slate-400 font-normal">• Giấy phép &amp; DRM</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Cam kết 100% sách thật, nguồn gốc xuất bản hợp pháp &amp; chữ ký số bản quyền DRM
                    </p>
                    {clusterAudit.copyright?.passed === false && clusterAudit.copyright.note && (
                      <div className="mt-2 text-xs font-medium text-amber-800 bg-amber-100/60 p-2 rounded-lg border border-amber-200">
                        <strong>Yêu cầu chỉnh sửa:</strong> {clusterAudit.copyright.note}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {clusterAudit.copyright?.passed === false ? (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                        Cần Bổ Sung
                      </span>
                      <Link
                        href="/seller/register"
                        className="text-[11px] font-semibold text-[#003B2B] hover:underline flex items-center gap-0.5"
                      >
                        <span>Sửa cụm này</span>
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                      </Link>
                    </>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      Đang Thẩm Định
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Cụm 4: Kho Hàng & Tài Khoản Ngân Hàng */}
            <div className={`bg-white border rounded-xl p-4 shadow-2xs transition-all ${
              clusterAudit.operation?.passed === false
                ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-300'
                : 'border-slate-200/80 hover:border-slate-300'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    clusterAudit.operation?.passed === false
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>Cụm 4: Kho Hàng &amp; Tài Khoản Ngân Hàng</span>
                      <span className="text-[10px] text-slate-400 font-normal">• Vận hành &amp; Đối soát</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Kho lấy hàng: <span className="font-medium text-slate-800">{addressDisplay}</span>
                    </p>
                    {clusterAudit.operation?.passed === false && clusterAudit.operation.note && (
                      <div className="mt-2 text-xs font-medium text-amber-800 bg-amber-100/60 p-2 rounded-lg border border-amber-200">
                        <strong>Yêu cầu chỉnh sửa:</strong> {clusterAudit.operation.note}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {clusterAudit.operation?.passed === false ? (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                        Cần Bổ Sung
                      </span>
                      <Link
                        href="/seller/register"
                        className="text-[11px] font-semibold text-[#003B2B] hover:underline flex items-center gap-0.5"
                      >
                        <span>Sửa cụm này</span>
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                      </Link>
                    </>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      Đang Đối Soát
                    </span>
                  )}
                </div>
              </div>
            </div>
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
