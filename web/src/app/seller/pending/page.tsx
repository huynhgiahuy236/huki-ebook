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
  const [loading, setLoading] = useState(true);
  const [checkingApproval, setCheckingApproval] = useState(false);

  const loadBusiness = useCallback(async (isSilent = false) => {
    try {
      const res = await businessApi.getMyBusiness();
      if (res.success && res.data) {
        const b = (res.data as any)?.data || res.data;
        setBusiness(b);

        // Nếu đã được duyệt → tự động chuyển sang trang Setup ngay lập tức (Real-time Zero-F5)
        if (b.status === 'APPROVED') {
          showToast('Hồ sơ đối tác đã được Admin phê duyệt thành công! Đang chuyển đến bước thiết lập gian hàng...', 'success');
          router.replace('/seller/stores/setup');
          return;
        }
      }
    } catch (err) {
      if (!isSilent) console.error('Error loading business:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    loadBusiness();

    // 1. Silent Background Auto-Polling (2.5s) - Tự động nhận diện khi Admin bấm duyệt
    const pollTimer = setInterval(() => {
      loadBusiness(true);
    }, 2500);

    // 2. Realtime Bus Subscriber - Lập tức phản hồi khi Admin bấm Duyệt trên bất kỳ tab nào
    const unsub = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'BUSINESS_APPROVED' || msg.type === 'BUSINESS_STATUS_UPDATED') {
        loadBusiness(true);
      }
    });

    return () => {
      clearInterval(pollTimer);
      unsub();
    };
  }, [loadBusiness]);

  // Kiểm tra trạng thái duyệt thủ công
  const handleCheckApproval = async () => {
    setCheckingApproval(true);
    await refreshBusiness?.();
    await loadBusiness();
    setCheckingApproval(false);

    if (business?.status === 'APPROVED') {
      showToast('Hồ sơ đã được duyệt! Đang chuyển sang thiết lập cửa hàng...', 'success');
      router.push('/seller/stores/setup');
    } else {
      showToast('Hồ sơ vẫn đang trong quá trình thẩm định. Vui lòng chờ thêm.', 'info');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-[#003B2B]/20 border-t-[#003B2B] rounded-full animate-spin"></div>
        <p className="text-sm text-slate-600 font-medium">Đang tải trạng thái hồ sơ...</p>
      </div>
    );
  }

  const statusInfo = {
    PENDING_APPROVAL: {
      icon: 'hourglass_empty',
      color: 'amber',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800',
      title: 'Hồ Sơ Đang Chờ Thẩm Định',
      subtitle: 'Đang trong quá trình kiểm tra bởi Ban quản trị sàn HUKI',
    },
    APPROVED: {
      icon: 'verified',
      color: 'emerald',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-800',
      title: 'Hồ Sơ Đã Được Phê Duyệt',
      subtitle: 'Chúc mừng! Đang chuyển sang thiết lập cửa hàng...',
    },
    REJECTED: {
      icon: 'cancel',
      color: 'rose',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      textColor: 'text-rose-800',
      title: 'Hồ Sơ Bị Từ Chối',
      subtitle: 'Vui lòng xem lý do và liên hệ hỗ trợ',
    },
    SUSPENDED: {
      icon: 'gavel',
      color: 'rose',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      textColor: 'text-rose-800',
      title: 'Hồ Sơ Bị Đình Chỉ',
      subtitle: 'Tài khoản đối tác đang bị tạm khóa',
    },
  };

  const currentStatus = business?.status || 'PENDING_APPROVAL';
  const info = statusInfo[currentStatus as keyof typeof statusInfo] || statusInfo.PENDING_APPROVAL;

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-[#FAF8F5] text-slate-900 py-8 antialiased">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Back link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-[#003B2B] transition-colors"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span>Về trang chủ</span>
          </Link>
        </div>

        {/* Main Card */}
        <div className={`${info.bgColor} border ${info.borderColor} rounded-3xl p-8 sm:p-10 text-center shadow-sm`}>

          {/* Icon */}
          <div className={`w-20 h-20 mx-auto rounded-full bg-${info.color}-100 flex items-center justify-center mb-6`}>
            <span className={`material-symbols-outlined text-5xl text-${info.color}-600`}>
              {info.icon}
            </span>
          </div>

          {/* Title */}
          <h1 className={`text-2xl sm:text-3xl font-bold font-editorial ${info.textColor} mb-3`}>
            {info.title}
          </h1>
          <p className={`text-sm ${info.textColor.replace('800', '700')} mb-8 max-w-lg mx-auto`}>
            {info.subtitle}
          </p>

          {/* Business Info */}
          {business && (
            <div className="bg-white/80 rounded-2xl p-6 mb-8 text-left max-w-md mx-auto shadow-inner">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Thông tin hồ sơ</h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-base text-slate-400 shrink-0">domain</span>
                  <div>
                    <span className="text-slate-500 block">Tên doanh nghiệp</span>
                    <span className="font-semibold text-slate-900">{business.name || '—'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-base text-slate-400 shrink-0">pin</span>
                  <div>
                    <span className="text-slate-500 block">Mã số thuế</span>
                    <span className="font-mono font-semibold text-slate-900">{business.taxCode || '—'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-base text-slate-400 shrink-0">storefront</span>
                  <div>
                    <span className="text-slate-500 block">Tên cửa hàng</span>
                    <span className="font-semibold text-slate-900">
                      {business.stores?.[0]?.name || business.name || '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-base text-slate-400 shrink-0">schedule</span>
                  <div>
                    <span className="text-slate-500 block">Ngày gửi hồ sơ</span>
                    <span className="font-semibold text-slate-900">
                      {business.createdAt ? new Date(business.createdAt).toLocaleString('vi-VN') : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-current/20 mb-8">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span className={`text-sm font-bold uppercase tracking-wider ${info.textColor}`}>
              {currentStatus === 'PENDING_APPROVAL' ? 'Đang xử lý' : currentStatus}
            </span>
          </div>

          {/* Timeline Info */}
          <div className="bg-white/60 rounded-xl p-4 mb-8 max-w-md mx-auto">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl text-amber-600">info</span>
              </div>
              <div className="text-left">
                <h4 className="font-bold text-sm text-slate-900 mb-1">Thời gian xử lý dự kiến</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Hồ sơ đối tác sẽ được Ban thẩm định HUKI kiểm tra trong <strong>24h - 48h</strong> làm việc.
                  Bạn sẽ nhận thông báo qua email khi có kết quả.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleCheckApproval}
              disabled={checkingApproval}
              className="h-12 px-8 bg-[#003B2B] hover:bg-[#00281d] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {checkingApproval ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Đang kiểm tra...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">refresh</span>
                  <span>Kiểm tra kết quả duyệt</span>
                </>
              )}
            </button>

            <Link
              href="/"
              className="h-12 px-6 border border-slate-300 hover:bg-white text-slate-700 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">home</span>
              <span>Về trang chủ</span>
            </Link>
          </div>

          {/* Contact Support */}
          <div className="mt-8 pt-6 border-t border-slate-200/50">
            <p className="text-xs text-slate-500">
              Nếu cần hỗ trợ, vui lòng liên hệ{' '}
              <a href="mailto:support@hukiebook.vn" className="text-[#003B2B] font-semibold hover:underline">
                support@hukiebook.vn
              </a>{' '}
              hoặc hotline <span className="font-semibold">1900 1234</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
