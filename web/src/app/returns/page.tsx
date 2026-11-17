'use client';

import React, { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { orderApi, ReturnRequestData } from '@/ui/api/orderApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';

function ReturnProgressContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  const orderId = searchParams.get('orderId') || '';
  const returnId = searchParams.get('returnId') || searchParams.get('id') || '';

  const [loading, setLoading] = useState(true);
  const [returnReq, setReturnReq] = useState<ReturnRequestData | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fetchReturnDetail = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch buyer return requests
      let res = await orderApi.getBuyerReturnRequests(orderId ? { orderId } : undefined);
      // Fallback: if queried with orderId but got empty (e.g. order code vs uuid), fetch all buyer returns
      if ((!res.success || !Array.isArray(res.data) || res.data.length === 0) && orderId) {
        res = await orderApi.getBuyerReturnRequests();
      }

      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        // If returnId is provided, find exact match; otherwise take the newest for this order
        let target = res.data[0];
        if (returnId) {
          const found = res.data.find((r) => r.id === returnId);
          if (found) target = found;
        } else if (orderId) {
          const matched = res.data.find((r) => r.orderId === orderId || r.order?.code === orderId);
          if (matched) target = matched;
        }
        setReturnReq(target);
      } else {
        setReturnReq(null);
      }
    } catch (err) {
      console.error('Error fetching return detail:', err);
      setReturnReq(null);
    } finally {
      setLoading(false);
    }
  }, [orderId, returnId]);

  useEffect(() => {
    fetchReturnDetail();
  }, [fetchReturnDetail]);

  // Realtime updates listener
  useEffect(() => {
    const unsub = realtimeSyncBus.subscribe((msg) => {
      if (
        msg.type === 'RETURN_SELLER_ACCEPTED' ||
        msg.type === 'RETURN_SELLER_DISPUTED' ||
        msg.type === 'DISPUTE_ARBITRATED' ||
        msg.type === 'RETURN_PICKED_UP' ||
        msg.type === 'RETURN_DELIVERED_TO_STORE' ||
        msg.type === 'RETURN_COMPLETED' ||
        msg.type === 'ESCROW_REFUNDED'
      ) {
        fetchReturnDetail();
      }
    });
    return () => unsub();
  }, [fetchReturnDetail]);

  const status = returnReq?.status || 'FORWARDED_TO_SELLER';
  const isRefund = returnReq?.type === 'REFUND';

  // Stepper calculations
  const stepperData = useMemo(() => {
    let currentStep = 1;
    if (status === 'FORWARDED_TO_SELLER' || status === 'PENDING_REVIEW') {
      currentStep = 2; // Waiting for seller
    } else if (
      status === 'SELLER_ACCEPTED' ||
      status === 'SELLER_DISPUTED' ||
      returnReq?.replacementStatus === 'RETURNING'
    ) {
      currentStep = 3; // Logistics pickup or Arbitration in progress
    } else if (
      status === 'REFUNDED' ||
      status === 'REPLACED' ||
      status === 'COMPLETED' ||
      status === 'ARBITRATED_BUYER_WINS' ||
      status === 'ARBITRATED_SELLER_WINS'
    ) {
      currentStep = 4; // Resolved
    }

    const steps = [
      {
        id: 1,
        title: 'Nộp Yêu Cầu',
        sub: 'Đã gửi bằng chứng',
        icon: 'assignment_turned_in',
        status: currentStep >= 1 ? 'completed' : 'upcoming',
        time: returnReq?.createdAt ? new Date(returnReq.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—',
      },
      {
        id: 2,
        title: 'Shop Tiếp Nhận',
        sub: status === 'FORWARDED_TO_SELLER' ? 'Đang chờ xem xét' : status === 'SELLER_DISPUTED' ? 'Shop đã phản biện' : 'Shop đã đồng ý',
        icon: 'storefront',
        status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'current' : 'upcoming',
        time: currentStep >= 2 ? 'Tối đa 24h' : 'Chờ xử lý',
      },
      {
        id: 3,
        title: status === 'SELLER_DISPUTED' ? 'Trọng Tài Sàn' : 'Thu Hồi Hàng',
        sub: status === 'SELLER_DISPUTED' ? 'Phân xử bằng chứng' : 'Bưu tá đến lấy sách',
        icon: status === 'SELLER_DISPUTED' ? 'gavel' : 'local_shipping',
        status: currentStep > 3 ? 'completed' : currentStep === 3 ? 'current' : 'upcoming',
        time: currentStep >= 3 ? 'Đang thực hiện' : 'Theo lịch hẹn',
      },
      {
        id: 4,
        title: isRefund ? 'Hoàn Tiền Ví/STK' : 'Giao Sách Mới',
        sub: status === 'REFUNDED' || status === 'ARBITRATED_BUYER_WINS' ? 'Đã chuyển tiền' : status === 'ARBITRATED_SELLER_WINS' ? 'Từ chối đổi trả' : 'Hoàn tất quy trình',
        icon: isRefund ? 'payments' : 'verified',
        status: currentStep === 4 ? 'completed' : 'upcoming',
        time: currentStep === 4 ? 'Hoàn tất' : 'Dự kiến 24h',
      },
    ];

    const lineWidthPercent =
      currentStep === 1 ? '15%' : currentStep === 2 ? '45%' : currentStep === 3 ? '78%' : '100%';

    return { steps, currentStep, lineWidthPercent };
  }, [status, returnReq, isRefund]);

  // Status configuration banner
  const statusConfig = useMemo(() => {
    switch (status) {
      case 'FORWARDED_TO_SELLER':
      case 'PENDING_REVIEW':
        return {
          title: 'Đang Chờ Shop Phản Hồi',
          badge: 'Chờ Shop Xử Lý',
          color: 'amber',
          bgClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: 'pending_actions',
          desc: 'Yêu cầu đổi trả của bạn đã được chuyển thẳng tới Shop. Người bán có tối đa 24 giờ để xem xét bằng chứng và phản hồi (Đồng ý đổi trả hoặc Gửi phản biện). Tiền ký quỹ của bạn đang được Sàn tạm khóa an toàn 100%.',
        };
      case 'SELLER_ACCEPTED':
        return {
          title: 'Người Bán Đã Đồng Ý Đổi Trả',
          badge: 'Shop Đã Chấp Thuận',
          color: 'emerald',
          bgClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: 'check_circle',
          desc: 'Shop đã đồng ý yêu cầu đổi trả của bạn. Bưu tá HuKi Express (Sticky Shipper) sẽ đến tận địa chỉ của bạn để nhận lại ấn phẩm và hoàn về kho Shop hoàn toàn miễn phí.',
        };
      case 'SELLER_DISPUTED':
        return {
          title: 'Shop Đã Gửi Phản Biện - Ban Trọng Tài Đang Thụ Lý',
          badge: 'Trọng Tài Thụ Lý',
          color: 'indigo',
          bgClass: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80 text-indigo-900 dark:text-indigo-200',
          badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
          icon: 'gavel',
          desc: 'Người bán không đồng ý với yêu cầu đổi trả và đã cung cấp hình ảnh / video đóng gói đối chiếu. Ban Trọng tài Sàn HUKI đang thẩm định bằng chứng của cả hai bên để ban hành phán quyết công bằng.',
        };
      case 'ARBITRATED_BUYER_WINS':
      case 'REFUNDED':
        return {
          title: 'Đã Hoàn Tất - Hoàn Tiền Thành Công',
          badge: 'Hoàn Tiền 100%',
          color: 'emerald',
          bgClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: 'verified',
          desc: 'Yêu cầu đổi trả đã được giải quyết trọn vẹn. Số tiền ký quỹ được hoàn trả 100% về tài khoản ngân hàng của bạn.',
        };
      case 'ARBITRATED_SELLER_WINS':
        return {
          title: 'Ban Trọng Tài Bác Bỏ Yêu Cầu Đổi Trả',
          badge: 'Khiếu Nại Không Hợp Lệ',
          color: 'rose',
          bgClass: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
          icon: 'cancel',
          desc: 'Sau khi đối chiếu video niêm phong đóng gói của Shop và hiện trạng sản phẩm, Ban Trọng tài xác định sản phẩm đạt chuẩn xuất bản khi bàn giao. Yêu cầu đổi trả bị từ chối và tiền được giải ngân cho Shop.',
        };
      default:
        return {
          title: 'Đang Xử Lý Yêu Cầu',
          badge: status,
          color: 'slate',
          bgClass: 'bg-slate-50 border-slate-200 text-slate-800',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: 'info',
          desc: 'Yêu cầu đổi trả đang được hệ sinh thái HUKI xử lý theo đúng quy trình.',
        };
    }
  }, [status]);

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[450px]">
        <span className="material-symbols-outlined text-4xl text-[#003B2B] animate-spin mb-3">
          progress_activity
        </span>
        <p className="text-sm font-bold text-slate-700">Đang tải chi tiết tiến trình đổi trả...</p>
        <p className="text-xs text-slate-400 mt-1">Đồng bộ dữ liệu thời gian thực từ mạng lưới đối soát ký quỹ</p>
      </div>
    );
  }

  if (!returnReq) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-3xl">search_off</span>
        </div>
        <h2 className="text-lg font-bold text-slate-800">Không tìm thấy yêu cầu đổi trả</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          Đơn hàng này hiện chưa có hồ sơ đổi trả hoặc bạn không có quyền truy cập. Vui lòng kiểm tra lại mã đơn hàng.
        </p>
        <div className="pt-2">
          <button
            onClick={() => router.push(orderId ? `/orders/${orderId}` : '/orders')}
            className="px-5 py-2.5 rounded-xl bg-[#003B2B] text-white text-xs font-bold shadow-xs hover:bg-[#00241A] transition-colors inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Quay Lại Đơn Hàng</span>
          </button>
        </div>
      </div>
    );
  }

  const evidenceImages: string[] =
    returnReq.evidenceImages || (returnReq as any).customerEvidence?.images || (returnReq as any).images || [];
  const bankAccount =
    returnReq.bankAccount || (returnReq as any).customerEvidence?.bankAccount;
  const sellerEvidence: any =
    (returnReq as any).sellerEvidence || {
      images: returnReq.sellerEvidenceImages || [],
      note: returnReq.sellerDisputeReason || '',
    };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6 animate-in fade-in duration-150">
      {/* 1. TOP BREADCRUMB NAVIGATION */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
        <Link href="/" className="hover:text-[#003B2B] transition-colors">
          Trang chủ
        </Link>
        <span>/</span>
        <Link href="/orders" className="hover:text-[#003B2B] transition-colors">
          Đơn hàng của tôi
        </Link>
        <span>/</span>
        <Link href={`/orders/${returnReq.orderId}`} className="hover:text-[#003B2B] transition-colors">
          Đơn #{returnReq.order?.code || returnReq.orderId?.slice(0, 8)}
        </Link>
        <span>/</span>
        <span className="text-[#003B2B] font-bold">Tiến Trình Đổi Trả &amp; Khiếu Nại</span>
      </nav>

      {/* 2. HEADER TITLE CARD */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
              #HUKI-RET-{returnReq.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#003B2B]/10 text-[#003B2B]">
              <span className="material-symbols-outlined text-[13px]">storefront</span>
              <span>{returnReq.store?.name || returnReq.storeName || 'Nhà Sách HUKI'}</span>
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusConfig.badgeClass}`}>
              <span className="material-symbols-outlined text-[12px]">{statusConfig.icon}</span>
              <span>{statusConfig.badge}</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900">
            Hành Trình Đổi Trả &amp; Phán Quyết Khiếu Nại
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quy trình minh bạch theo thời gian thực được bảo hộ bởi Hệ Thống Ký Quỹ Độc Giả HUKI Escrow
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href={`/orders/${returnReq.orderId}`}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">visibility</span>
            <span>Xem Đơn Hàng</span>
          </Link>
          <Link
            href={`/account/chat`}
            className="px-4 py-2 rounded-xl bg-[#003B2B] hover:bg-[#00241A] text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-sm">chat</span>
            <span>Chat Với Shop</span>
          </Link>
        </div>
      </div>

      {/* 3. HERO STATUS BANNER */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-xs flex items-start gap-4 ${statusConfig.bgClass}`}>
        <div className="w-12 h-12 rounded-2xl bg-white/90 dark:bg-slate-900/80 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
          <span className="material-symbols-outlined text-2xl text-[#003B2B]">
            {statusConfig.icon}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
            {statusConfig.title}
          </h3>
          <p className="text-xs sm:text-sm mt-1 leading-relaxed opacity-90">
            {statusConfig.desc}
          </p>
        </div>
      </div>

      {/* 4. VISUAL 4-STEP PROGRESS STEPPER (Shopee / TikTok Shop Architecture) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#003B2B] text-xl">conversion_path</span>
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
              Tiến Độ Xử Lý Trực Tuyến
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Tự động cập nhật không cần tải lại trang
          </span>
        </div>

        {/* Stepper Bar */}
        <div className="relative flex flex-col md:flex-row items-center justify-between w-full gap-6 md:gap-0 px-2 sm:px-6">
          {/* Horizontal Background Line */}
          <div className="hidden md:block absolute left-12 right-12 top-5 h-1 bg-slate-100 -z-0"></div>
          {/* Horizontal Active Line */}
          <div
            className="hidden md:block absolute left-12 top-5 h-1 bg-[#003B2B] -z-0 transition-all duration-700"
            style={{ width: stepperData.lineWidthPercent }}
          ></div>

          {stepperData.steps.map((st) => {
            const isCompleted = st.status === 'completed';
            const isCurrent = st.status === 'current';
            return (
              <div
                key={st.id}
                className="relative z-10 flex flex-row md:flex-col items-center text-left md:text-center gap-3 md:gap-2 max-w-[170px] w-full md:w-auto"
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-xs ring-4 ring-white transition-all ${
                    isCompleted
                      ? 'bg-[#003B2B] text-white'
                      : isCurrent
                      ? 'bg-amber-500 text-white ring-amber-100 animate-pulse'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[19px]">
                    {isCompleted ? 'check' : st.icon}
                  </span>
                </div>
                <div>
                  <span
                    className={`text-xs font-bold block ${
                      isCurrent
                        ? 'text-amber-700'
                        : isCompleted
                        ? 'text-slate-900'
                        : 'text-slate-400'
                    }`}
                  >
                    {st.title}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">{st.sub}</span>
                  <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{st.time}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. MAIN 2-COLUMN DETAIL LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: PRODUCT INFO & EVIDENCE & RULING (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          {/* CARD 1: PRODUCT & AMOUNT DETAILS */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-xs uppercase tracking-wider text-slate-800">
              <span className="material-symbols-outlined text-base text-[#003B2B]">inventory_2</span>
              <span>Sản Phẩm &amp; Số Tiền Ký Quỹ</span>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-16 h-24 relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                {returnReq.orderItem?.coverUrl || returnReq.bookCoverUrl ? (
                  <img
                    src={returnReq.orderItem?.coverUrl || returnReq.bookCoverUrl || ''}
                    alt={returnReq.orderItem?.title || returnReq.bookTitle || ''}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <span className="material-symbols-outlined text-2xl">book</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <h4 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                  {returnReq.orderItem?.title || returnReq.bookTitle || 'Ấn phẩm sách HUKI'}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Số lượng: <b className="text-slate-800">{returnReq.quantity || 1}</b></span>
                  <span>•</span>
                  <span>Đơn giá: <b className="text-slate-800">{Number(returnReq.amount || 0).toLocaleString('vi-VN')}₫</b></span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {isRefund ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="material-symbols-outlined text-xs">payments</span>
                      <span>Hoàn Tiền 100%</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                      <span className="material-symbols-outlined text-xs">sync_alt</span>
                      <span>Đổi Ấn Phẩm Mới</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <span className="material-symbols-outlined text-xs">lock_clock</span>
                    <span>Ký Quỹ Đang Đóng Băng</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Escrow highlight block */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-900">
                <span className="material-symbols-outlined text-xl text-amber-600">account_balance_wallet</span>
                <span>Số tiền Sàn đang bảo vệ cho bạn:</span>
              </div>
              <span className="font-mono font-bold text-base text-[#003B2B]">
                {Number(returnReq.amount || 0).toLocaleString('vi-VN')}₫
              </span>
            </div>
          </div>

          {/* CARD 2: BANK ACCOUNT INFO (FOR REFUNDS) */}
          {isRefund && bankAccount && (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-xs uppercase tracking-wider text-slate-800">
                <span className="material-symbols-outlined text-base text-blue-600">credit_card</span>
                <span>Tài Khoản Thụ Hưởng Nhận Tiền Hoàn</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Ngân hàng</span>
                  <span className="font-bold text-slate-800 block">{bankAccount.bankName || 'Ngân hàng thụ hưởng'}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Số tài khoản</span>
                  <span className="font-mono font-black text-sm text-emerald-700 block tracking-wider">
                    {bankAccount.accountNumber || '—'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Chủ tài khoản</span>
                  <span className="font-bold text-slate-800 block uppercase">
                    {bankAccount.accountHolderName || returnReq.customerName || '—'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CARD 3: BUYER'S SUBMITTED EVIDENCE */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-800">
                <span className="material-symbols-outlined text-base text-amber-600">photo_library</span>
                <span>Bằng Chứng Bạn Đã Cung Cấp</span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Lý do: <b>{returnReq.reason === 'NOT_AS_DESCRIBED' ? 'Hàng không đúng mô tả' : returnReq.reason === 'DAMAGED_TORN' ? 'Hàng bị hỏng / rách' : 'Lý do khác'}</b>
              </span>
            </div>

            {returnReq.reasonDetail && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs text-slate-700 leading-relaxed">
                <span className="font-semibold text-slate-900 block mb-1">Mô tả cụ thể từ bạn:</span>
                <p>{returnReq.reasonDetail}</p>
              </div>
            )}

            {/* Gallery of images */}
            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-2">
                Ảnh chụp hiện trạng sản phẩm ({evidenceImages.length} ảnh):
              </span>
              {evidenceImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {evidenceImages.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => setLightboxImage(img)}
                      className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer shadow-2xs hover:shadow-md transition-all"
                    >
                      <img
                        src={img}
                        alt={`Bằng chứng ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-2xl">zoom_in</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Không có hình ảnh đính kèm.</p>
              )}
            </div>
          </div>

          {/* CARD 4: SELLER'S COUNTER EVIDENCE (IF DISPUTED) */}
          {status === 'SELLER_DISPUTED' && (
            <div className="bg-rose-50/50 rounded-3xl border-2 border-rose-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-rose-200/60 font-bold text-xs uppercase tracking-wider text-rose-800">
                <span className="material-symbols-outlined text-base text-rose-600">gavel</span>
                <span>Bằng Chứng Phản Biện Của Người Bán</span>
              </div>

              {sellerEvidence.note && (
                <div className="p-3.5 rounded-2xl bg-white border border-rose-200 text-xs text-rose-950 leading-relaxed">
                  <span className="font-bold text-rose-900 block mb-1">Lý do từ chối từ Shop:</span>
                  <p>{sellerEvidence.note}</p>
                </div>
              )}

              {Array.isArray(sellerEvidence.images) && sellerEvidence.images.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-rose-900 block mb-2">
                    Ảnh đối chiếu từ phía Shop:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {sellerEvidence.images.map((img: string, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => setLightboxImage(img)}
                        className="group relative aspect-square rounded-2xl overflow-hidden border border-rose-200 bg-white cursor-pointer shadow-2xs hover:shadow-md transition-all"
                      >
                        <img
                          src={img}
                          alt={`Shop Bằng chứng ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <span className="material-symbols-outlined text-2xl">zoom_in</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CARD 5: ARBITRATION RULING (IF ARBITRATED) */}
          {(status === 'ARBITRATED_BUYER_WINS' || status === 'ARBITRATED_SELLER_WINS') && (
            <div className="bg-white rounded-3xl border-2 border-[#003B2B]/40 p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-xs uppercase tracking-wider text-[#003B2B]">
                <span className="material-symbols-outlined text-base">balance</span>
                <span>Phán Quyết Ban Trọng Tài Sàn HUKI</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Kết luận trọng tài:</span>
                  <span className="font-bold uppercase text-[#003B2B]">
                    {returnReq.arbitrationRuling === 'BUYER_WINS' ? 'Người Mua Thắng Kiện' : 'Người Bán Thắng Kiện'}
                  </span>
                </div>
                {returnReq.arbitratedBy && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Thẩm tra viên:</span>
                    <span className="font-mono text-slate-700">{returnReq.arbitratedBy}</span>
                  </div>
                )}
                {returnReq.arbitrationNotes && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-900 block mb-0.5">Căn cứ phán quyết:</span>
                    <p className="text-slate-600 leading-relaxed">{returnReq.arbitrationNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: AUDIT TRAIL LOG / TIMELINE (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          {/* TIMELINE CARD */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-xs uppercase tracking-wider text-slate-800">
              <span className="material-symbols-outlined text-base text-[#003B2B]">history</span>
              <span>Nhật Ký Tiến Trình Sổ Cái</span>
            </div>

            <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {/* Event 1 */}
              <div className="relative">
                <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#003B2B] ring-4 ring-[#003B2B]/20" />
                <h5 className="font-bold text-xs text-slate-900">Khách hàng nộp yêu cầu đổi trả</h5>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Đã tải lên {evidenceImages.length} ảnh bằng chứng và chọn phương thức {isRefund ? 'Hoàn tiền' : 'Đổi hàng'}.
                </p>
                <span className="text-[10px] font-mono text-slate-400 block mt-1">
                  {returnReq.createdAt ? new Date(returnReq.createdAt).toLocaleString('vi-VN') : '—'}
                </span>
              </div>

              {/* Event 2 */}
              <div className="relative">
                <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                <h5 className="font-bold text-xs text-slate-900">Kích hoạt Đóng băng Ký quỹ</h5>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Sàn HUKI tự động tạm dừng giải ngân số tiền {Number(returnReq.amount || 0).toLocaleString('vi-VN')}₫ để bảo vệ quyền lợi.
                </p>
                <span className="text-[10px] font-mono text-slate-400 block mt-1">
                  {returnReq.createdAt ? new Date(returnReq.createdAt).toLocaleString('vi-VN') : '—'}
                </span>
              </div>

              {/* Event 3 */}
              <div className="relative">
                <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full ${status !== 'PENDING_REVIEW' ? 'bg-[#003B2B] ring-4 ring-[#003B2B]/20' : 'bg-slate-300'}`} />
                <h5 className="font-bold text-xs text-slate-900">Hồ sơ gửi đến Shop</h5>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Shop nhận được thông báo nổ đơn khiếu nại để đối chiếu kho.
                </p>
                <span className="text-[10px] font-mono text-slate-400 block mt-1">
                  {returnReq.updatedAt ? new Date(returnReq.updatedAt).toLocaleString('vi-VN') : '—'}
                </span>
              </div>

              {/* Event 4 (If Action Taken) */}
              {status === 'SELLER_ACCEPTED' && (
                <div className="relative">
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                  <h5 className="font-bold text-xs text-emerald-800">Shop đồng ý đổi trả</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Hệ thống điều động bưu tá HUKI Express đến thu hồi sách.
                  </p>
                </div>
              )}

              {status === 'SELLER_DISPUTED' && (
                <div className="relative">
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-indigo-100" />
                  <h5 className="font-bold text-xs text-indigo-800">Shop gửi phản biện lên Sàn</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Hồ sơ chuyển giao cho Ban Trọng Tài giải quyết.
                  </p>
                </div>
              )}

              {(status === 'REFUNDED' || status === 'ARBITRATED_BUYER_WINS') && (
                <div className="relative">
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                  <h5 className="font-bold text-xs text-emerald-800">Hoàn tất hoàn tiền 100%</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Tiền ký quỹ đã được chuyển hoàn vào tài khoản của bạn.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* POLICY ASSURANCE BOX */}
          <div className="p-5 rounded-3xl bg-[#003B2B]/5 border border-[#003B2B]/20 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#003B2B]">
              <span className="material-symbols-outlined text-lg">verified_user</span>
              <span>Bảo Hiểm Độc Giả HUKI 100%</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11.5px]">
              Tiền ký quỹ của bạn luôn được Sàn HUKI lưu giữ độc lập trong suốt quá trình xử lý đổi trả. Tiền chỉ giải ngân cho Shop khi bạn hài lòng hoặc trọng tài ra phán quyết minh bạch.
            </p>
            <div className="pt-1">
              <Link
                href="/policy/returns"
                target="_blank"
                className="text-[11px] font-bold text-[#003B2B] hover:underline flex items-center gap-1"
              >
                <span>Xem Quy chuẩn Bảo hộ Độc giả</span>
                <span className="material-symbols-outlined text-[13px]">open_in_new</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 6. LIGHTBOX MODAL FOR IMAGES */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 cursor-zoom-out"
        >
          <div className="relative max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl bg-black">
            <img
              src={lightboxImage}
              alt="Phóng to bằng chứng"
              className="w-full h-full max-h-[85vh] object-contain"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReturnProgressPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl animate-spin text-[#003B2B]">
            progress_activity
          </span>
        </div>
      }
    >
      <ReturnProgressContent />
    </Suspense>
  );
}
