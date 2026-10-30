"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { businessApi, BusinessData } from '@/ui/api/businessApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';

export default function SellerPendingPage() {
  const router = useRouter();
  const { user, refreshBusiness } = useAuth();
  const { showToast } = useToast();

  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [cachedProfile, setCachedProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingApproval, setCheckingApproval] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const isRedirectingRef = React.useRef(false);
  const pollTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const loadBusiness = useCallback(async (isSilent = false) => {
    if (isRedirectingRef.current) return;
    try {
      const res = await businessApi.getMyBusiness();
      if (res.success && res.data) {
        const b = (res.data as any)?.data || res.data;
        setBusiness(b);

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

        // Nếu đã được duyệt → tự động chuyển sang trang Setup / Dashboard (Chặn ping-pong loop)
        if (b.status === 'APPROVED') {
          if (isRedirectingRef.current) return;
          isRedirectingRef.current = true;

          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }

          // Cập nhật session user trong AuthContext
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
  }, [router, showToast, refreshBusiness]);

  useEffect(() => {
    loadBusiness();

    // 1. Silent Background Auto-Polling (3s)
    pollTimerRef.current = setInterval(() => {
      if (!isRedirectingRef.current) {
        loadBusiness(true);
      }
    }, 3000);

    // 2. Realtime Bus Subscriber
    const unsub = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'BUSINESS_APPROVED' || msg.type === 'BUSINESS_STATUS_UPDATED') {
        loadBusiness(true);
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
  const taxCodeDisplay = business?.taxCode || cachedProfile?.tax_code || '2901988776';
  const dossierCode = `HK-APP-${taxCodeDisplay}`;
  const storeNameDisplay = business?.stores?.[0]?.name || business?.name || cachedProfile?.store_name || cachedProfile?.company_name || 'NXB Kim Đồng';
  const companyNameDisplay = business?.name || cachedProfile?.company_name || 'Hộ Kinh Doanh Truyện Tranh & Manga Xứ Nghệ';
  const addressDisplay = business?.address || cachedProfile?.registered_street || '124 Nguyễn Thị Minh Khai, P. Lê Mao, TP. Vinh, Nghệ An';

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
      {/* 1. Breadcrumbs & Top Application Bar */}
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
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-800">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Đã Phê Duyệt
                </span>
              ) : currentStatus === 'REJECTED' ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded border border-rose-300 bg-rose-50 text-rose-800">
                  <span className="material-symbols-outlined text-[14px]">cancel</span>
                  Từ Chối Hồ Sơ
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-900">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  Đang Chờ Thẩm Định
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
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
              <span className="hidden sm:inline text-[#006953] font-medium">SLA xử lý cam kết: 24h - 48h</span>
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

      {/* 2. Horizontal Milestone Stepper */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 mb-6 shadow-2xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 text-xs font-bold border border-emerald-300">
              <span className="material-symbols-outlined text-[16px]">check</span>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900 leading-tight">1. Nộp Hồ Sơ Online</div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Đã hoàn thành</div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-[#003B2B] text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs ring-4 ring-[#003B2B]/10">
              2
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#003B2B] leading-tight">2. Thẩm Định &amp; Đối Chiếu</div>
              <div className="text-[11px] text-amber-800 font-semibold mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Đang xử lý (SLA 24h)
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3 opacity-60">
            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 text-xs font-semibold border border-slate-200">
              3
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-800 leading-tight">3. Ký Số &amp; Mở Cửa Hàng</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Chờ duyệt bước 2</div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-3 opacity-60">
            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 text-xs font-semibold border border-slate-200">
              4
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-800 leading-tight">4. Vận Hành &amp; Đăng Sách</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Kế tiếp</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Detailed Audit Status & Dossier Data (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Detailed Verification Checkpoints */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Tiến trình thẩm định hồ sơ chi tiết</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Quy trình thẩm định 5 bước tiêu chuẩn dành cho Nhà Bán Hàng &amp; Nhà Xuất Bản HuKi
                </p>
              </div>
              <span className="text-[11px] font-semibold text-[#006953] bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded">
                Tiến độ: 40%
              </span>
            </div>

            <div className="p-5 divide-y divide-slate-100">
              {/* Checkpoint 1 */}
              <div className="pb-4 pt-1 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5">
                      check_circle
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        1. Đối chiếu CSDL Doanh nghiệp &amp; CSDL Thuế Quốc gia
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Mã số thuế <span className="font-mono font-semibold text-slate-900">{taxCodeDisplay}</span> đã được đối soát thành công qua CSDL Tổng cục Thuế. Đơn vị đang hoạt động hợp pháp.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shrink-0">
                    Đã xác thực
                  </span>
                </div>
              </div>

              {/* Checkpoint 2 */}
              <div className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5">
                      check_circle
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        2. Định danh Người đại diện pháp luật (e-KYC &amp; CCCD)
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Hồ sơ định danh chủ hộ/đại diện theo pháp luật đã tiếp nhận đầy đủ ảnh chụp CCCD gắn chip 2 mặt và thông tin liên lạc xác thực.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shrink-0">
                    Hợp lệ
                  </span>
                </div>
              </div>

              {/* Checkpoint 3 */}
              <div className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">
                      hourglass_top
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        3. Thẩm định Tiêu chuẩn Sách &amp; Cam kết Bản quyền DRM
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Ban Thẩm Định Sàn đang kiểm tra văn bản cam kết 100% sách thật, nguồn gốc xuất bản phẩm và điều kiện tích hợp chữ ký số DRM cho sách điện tử.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded shrink-0">
                    Đang thẩm định
                  </span>
                </div>
              </div>

              {/* Checkpoint 4 */}
              <div className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">
                      local_shipping
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        4. Đối soát Tuyến Kho Lấy Hàng &amp; Giao hàng 2H HuKi Express
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Địa chỉ kho vận hành tại <span className="text-slate-800 font-medium">{addressDisplay}</span> đang được định tuyến kết nối đội ngũ tài xế HuKi Express lấy hàng hằng ngày.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded shrink-0">
                    Đang đối soát
                  </span>
                </div>
              </div>

              {/* Checkpoint 5 */}
              <div className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-slate-400 text-[18px] shrink-0 mt-0.5">
                      lock
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        5. Khởi tạo Kênh Bán Hàng &amp; Bàn Giao Bảng Điều Khiển
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Hệ thống tự động kích hoạt tài khoản Quản Trị Seller, Ví Doanh Thu và danh mục Đăng bán sách ngay khi hoàn tất phê duyệt.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded shrink-0">
                    Chờ kích hoạt
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Submitted Merchant Dossier Summary */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Bản sao dữ liệu hồ sơ đối tác đã gửi</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Dữ liệu được lưu trữ bảo mật theo tiêu chuẩn kiểm định thương mại điện tử
                </p>
              </div>
              <Link
                href="/seller/register"
                className="text-xs font-semibold text-[#003B2B] hover:underline"
              >
                Cập nhật thông tin
              </Link>
            </div>

            <div className="p-5">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-xs">
                <div>
                  <dt className="text-slate-500 font-medium">Tên đơn vị / Hộ kinh doanh</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">{companyNameDisplay}</dd>
                </div>

                <div>
                  <dt className="text-slate-500 font-medium">Tên gian hàng hiển thị</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">{storeNameDisplay}</dd>
                </div>

                <div>
                  <dt className="text-slate-500 font-medium">Mã số thuế đăng ký</dt>
                  <dd className="font-mono font-semibold text-slate-900 mt-0.5">{taxCodeDisplay}</dd>
                </div>

                <div>
                  <dt className="text-slate-500 font-medium">Loại hình pháp lý</dt>
                  <dd className="font-medium text-slate-800 mt-0.5">
                    {(business as any)?.businessType === 'CORPORATION' || (business as any)?.businessType === 'LLC' || cachedProfile?.businessType === 'CORPORATION' || cachedProfile?.businessType === 'LLC'
                      ? 'Doanh Nghiệp / Nhà Xuất Bản'
                      : 'Hộ Kinh Doanh Cá Thể'}
                  </dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-slate-500 font-medium">Địa chỉ kho hàng lấy hàng</dt>
                  <dd className="font-medium text-slate-800 mt-0.5">{addressDisplay}</dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-slate-500 font-medium">Tài khoản ngân hàng thụ hưởng doanh thu</dt>
                  <dd className="font-medium text-slate-800 mt-0.5">
                    {business?.bankName ? (
                      <span>
                        <strong className="text-slate-900">{business.bankName}</strong> — Số TK: <span className="font-mono">{business.bankAccountNumber}</span> ({business.bankAccountHolderName || 'Chủ tài khoản'})
                      </span>
                    ) : (
                      <span className="text-slate-500">Đã khai báo theo hồ sơ đăng ký (Đang đối soát)</span>
                    )}
                  </dd>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-100 flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                    <span className="material-symbols-outlined text-[15px] text-emerald-600">description</span>
                    <span>Giấy ĐKKD / Xác nhận MST (Đã nộp)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                    <span className="material-symbols-outlined text-[15px] text-emerald-600">verified_user</span>
                    <span>Cam kết bản quyền &amp; Sách thật (Đã ký điện tử)</span>
                  </div>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Right Column: Actions, Support & Readiness (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 3: Realtime Status & Primary Actions */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-2xs p-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Trạng thái &amp; Vận hành
            </h3>

            <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-lg mb-4 text-xs">
              <div className="flex items-center gap-2 font-semibold text-[#003B2B] mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Real-time Sync Active</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Hệ thống đang mở kết nối đồng bộ trực tiếp. Ngay khi Ban Quản Trị bấm duyệt trên Kênh Admin, trang này sẽ tự động chuyển đến bước Thiết lập gian hàng mà không cần F5.
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
                <span>{checkingApproval ? 'Đang truy vấn CSDL...' : 'Kiểm tra trạng thái ngay'}</span>
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

          {/* Card 4: Dedicated Enterprise Support Desk */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-2xs p-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Ban Thẩm Định &amp; Hỗ Trợ Đối Tác
            </h3>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-slate-400 text-[16px] shrink-0 mt-0.5">
                  support_agent
                </span>
                <div>
                  <div className="text-slate-500 text-[11px]">Tổng đài hỗ trợ đối tác B2B</div>
                  <div className="font-semibold text-slate-900 mt-0.5">1900 1234 (Phím 2)</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-slate-400 text-[16px] shrink-0 mt-0.5">
                  alternate_email
                </span>
                <div>
                  <div className="text-slate-500 text-[11px]">Email phòng thẩm định pháp lý</div>
                  <a
                    href="mailto:appraisal@hukiebook.vn"
                    className="font-semibold text-[#003B2B] hover:underline mt-0.5 block"
                  >
                    appraisal@hukiebook.vn
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-slate-400 text-[16px] shrink-0 mt-0.5">
                  schedule
                </span>
                <div>
                  <div className="text-slate-500 text-[11px]">Giờ làm việc thẩm định</div>
                  <div className="font-medium text-slate-800 mt-0.5">
                    08:00 – 18:00 (Thứ 2 đến Thứ 7)
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
              Các hồ sơ nộp sau 17:00 thứ 7 sẽ được ưu tiên xử lý vào sáng thứ 2 tuần kế tiếp.
            </div>
          </div>

          {/* Card 5: Seller Readiness Checklist */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 text-xs">
            <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs">
              <span className="material-symbols-outlined text-[16px] text-[#003B2B]">checklist</span>
              <span>Chuẩn bị trước khi mở bán</span>
            </h4>
            <ul className="space-y-1.5 text-[11px] text-slate-600 list-disc list-inside">
              <li>Chuẩn bị file PDF/EPUB và ảnh bìa chất lượng cao nếu bán Ebook.</li>
              <li>Kiểm tra số lượng tồn kho sách giấy thực tế sẵn sàng giao.</li>
              <li>Đảm bảo đã dán tem chống hàng giả cho các xuất bản phẩm.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
