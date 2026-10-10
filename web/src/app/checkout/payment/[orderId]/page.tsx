'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { orderApi, BuyerOrder } from '@/ui/api/orderApi';
import { paymentApi, PaymentView } from '@/ui/api/paymentApi';
import { useToast } from '@/ui/context/ToastContext';
import { useAuth } from '@/ui/context/AuthContext';

export default function PayOSPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const orderId = params?.orderId as string;

  const [order, setOrder] = useState<BuyerOrder | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(15 * 60);

  // 1. Fetch order details & initiate PayOS payment link
  const loadOrderAndPayment = useCallback(async () => {
    if (!orderId) return;
    setIsLoadingOrder(true);
    try {
      const orderRes = await orderApi.getBuyerOrderDetail(orderId);
      if (orderRes.success && orderRes.data) {
        const orderData = orderRes.data;
        setOrder(orderData);

        // If already paid or completed, redirect to success page
        if (
          orderData.paymentStatus === 'SUCCEEDED' ||
          orderData.paymentStatus === 'PAID' ||
          orderData.status === 'PROCESSING' ||
          orderData.status === 'CONFIRMED'
        ) {
          router.replace(`/order-success?orderId=${orderData.id}&code=${orderData.code}&paymentMethod=ONLINE_PAYMENT`);
          return;
        }

        // Initiate / retrieve PayOS payment link
        try {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          const initRes = await paymentApi.initiatePayment(orderId, {
            returnUrl: `${origin}/order-success?orderId=${orderData.id}&code=${orderData.code}&paymentMethod=ONLINE_PAYMENT`,
            cancelUrl: `${origin}/checkout/payment/${orderId}`,
          });

          if (initRes.success && initRes.data) {
            setPaymentData(initRes.data);
          } else {
            // Check status directly
            const statusRes = await paymentApi.getOrderPayment(orderId);
            if (statusRes.success && statusRes.data?.payments?.[0]) {
              setPaymentData(statusRes.data.payments[0]);
            }
          }
        } catch (err) {
          console.warn('Could not initiate PayOS payment:', err);
        }
      } else {
        showToast('Không tìm thấy thông tin đơn hàng.', 'error');
        router.push('/orders');
      }
    } catch (err) {
      console.error('Error loading order for payment:', err);
      showToast('Lỗi khi tải thông tin đơn hàng.', 'error');
    } finally {
      setIsLoadingOrder(false);
    }
  }, [orderId, router, showToast]);

  useEffect(() => {
    loadOrderAndPayment();
  }, [loadOrderAndPayment]);

  // 2. Countdown timer (15 minutes)
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = useMemo(() => {
    const m = Math.floor(timeLeftSeconds / 60);
    const s = timeLeftSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [timeLeftSeconds]);

  // 3. Auto-poll status every 4 seconds to detect real webhook payments
  useEffect(() => {
    if (!orderId || !order) return;
    const pollInterval = setInterval(async () => {
      try {
        const res = await paymentApi.getOrderPayment(orderId);
        if (res.success && res.data) {
          const isPaid =
            res.data.paymentStatus === 'SUCCEEDED' ||
            res.data.paymentStatus === 'PAID' ||
            res.data.payments?.some((p) => p.status === 'SUCCEEDED');
          if (isPaid) {
            clearInterval(pollInterval);
            showToast('Thanh toán thành công! Đang chuyển hướng...', 'success');
            router.replace(`/order-success?orderId=${order.id}&code=${order.code}&paymentMethod=ONLINE_PAYMENT`);
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [orderId, order, router, showToast]);

  // 4. Copy to clipboard helper
  const handleCopy = (text: string, fieldName: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      showToast(`Đã sao chép ${fieldName}`, 'success');
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // 5. Action 1: Simulate Payment Success (Fast flow & Escrow test)
  const handleSimulateSuccess = async () => {
    if (!orderId || !order) return;
    setIsSimulating(true);
    try {
      const res = await paymentApi.simulateSuccess(orderId);
      if (res.success) {
        showToast('Xác nhận thanh toán thành công! Dòng tiền đã được ghi nhận.', 'success');
        setTimeout(() => {
          router.replace(`/order-success?orderId=${order.id}&code=${order.code}&paymentMethod=ONLINE_PAYMENT`);
        }, 600);
      } else {
        showToast(res.error?.message || 'Không thể mô phỏng thanh toán.', 'error');
        setIsSimulating(false);
      }
    } catch (err: any) {
      console.error('Error simulating payment:', err);
      showToast(err?.message || 'Lỗi khi mô phỏng thanh toán.', 'error');
      setIsSimulating(false);
    }
  };

  // 6. Action 2: Cancel Payment & Cancel Order cleanly (Prevents clutter on Seller dashboard)
  const handleCancelPayment = async () => {
    if (!orderId || !order) return;
    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn hủy thanh toán và hủy đơn hàng này không?\nĐơn hàng sẽ được hủy để giải phóng sản phẩm trong kho.'
    );
    if (!confirmed) return;

    setIsCancelling(true);
    try {
      const res = await orderApi.cancelBuyerOrder(orderId, {
        reason: 'Khách hàng hủy thanh toán trực tuyến PayOS',
      });
      if (res.success) {
        showToast('Đã hủy giao dịch và đơn hàng thành công.', 'info');
        router.replace('/cart');
      } else {
        showToast(res.error?.message || 'Không thể hủy đơn hàng.', 'error');
        setIsCancelling(false);
      }
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      showToast(err?.message || 'Lỗi khi hủy đơn hàng.', 'error');
      setIsCancelling(false);
    }
  };

  if (isLoadingOrder) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 font-medium text-sm">Đang tải cổng thanh toán PayOS...</p>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const grandTotal = Number(order.grandTotal) || 0;
  const transferContent = order.code || `HUKI-${order.id.slice(0, 8).toUpperCase()}`;
  const bankName = paymentData?.accountName ? 'Ngân Hàng MB Bank' : 'Cổng Thanh Toán PayOS (VietQR)';
  const accountNumber = paymentData?.accountNumber || '0372212378';
  const accountHolder = paymentData?.accountName || 'CÔNG TY CỔ PHẦN PHÁT HÀNH SÁCH HUKI';

  // Build VietQR image URL
  const qrCodeUrl =
    paymentData?.qrCode ||
    `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=https://payos.vn/web/qr?orderCode=${encodeURIComponent(
      order.code
    )}&amount=${grandTotal}&desc=${encodeURIComponent(transferContent)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/60 pb-16">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-editorial text-2xl font-bold text-[#00875A] tracking-tight">HUKI</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-[#00875A] font-bold border border-emerald-200/60">
              Cổng Thanh Toán PayOS
            </span>
          </Link>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="material-symbols-outlined text-emerald-600 text-sm">lock</span>
            <span className="font-medium hidden sm:inline">Mã hóa kết nối SSL 256-bit an toàn</span>
          </div>
        </div>
      </header>

      {/* Stepper progress */}
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
          <span className="text-emerald-700 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">check_circle</span> 1. Đặt hàng
          </span>
          <span className="text-emerald-700 font-bold flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
            2. Thanh toán PayOS VietQR
          </span>
          <span className="text-slate-400 flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px]">3</span>
            3. Hoàn tất
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-600 w-2/3 transition-all duration-300" />
        </div>
      </div>

      {/* Main Content Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: VietQR Frame & Banking Information (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
            {/* Timer Banner */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-amber-600 text-xl animate-spin">timelapse</span>
                <div>
                  <p className="text-xs font-bold text-amber-900">Giao dịch hết hạn sau:</p>
                  <p className="text-[11px] text-amber-700">Vui lòng hoàn tất thanh toán trước khi hết giờ</p>
                </div>
              </div>
              <div className="px-3 py-1 rounded-lg bg-white border border-amber-300 font-mono text-base font-bold text-amber-800 shadow-2xs">
                {formatTimer}
              </div>
            </div>

            {/* QR Code Frame */}
            <div className="text-center space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                Quét mã VietQR bằng bất kỳ App Ngân Hàng hoặc Ví
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Hỗ trợ hơn 40+ ứng dụng ngân hàng (Vietcombank, MB Bank, Techcombank, BIDV, MoMo, ZaloPay...)
              </p>

              <div className="relative inline-block p-4 rounded-2xl bg-gradient-to-b from-white to-slate-50 border-2 border-emerald-500/80 shadow-md">
                <div className="w-64 h-64 mx-auto bg-white p-2 rounded-xl flex items-center justify-center border border-slate-200 overflow-hidden">
                  <img
                    src={qrCodeUrl}
                    alt="VietQR PayOS"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="mt-2 text-center">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Cổng đối soát tự động 24/7 PayOS
                  </span>
                </div>
              </div>
            </div>

            {/* Banking Details Box */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 pb-2 border-b border-slate-200">
                <span className="material-symbols-outlined text-base text-slate-600">account_balance</span>
                Thông tin tài khoản chuyển khoản
              </h3>

              {/* Ngân hàng */}
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Ngân hàng:</span>
                <span className="font-bold text-slate-800">{bankName}</span>
              </div>

              {/* Chủ tài khoản */}
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Chủ tài khoản:</span>
                <span className="font-bold text-slate-800">{accountHolder}</span>
              </div>

              {/* Số tài khoản */}
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Số tài khoản:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 text-sm">{accountNumber}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(accountNumber, 'Số tài khoản')}
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-semibold text-slate-700 transition-colors"
                  >
                    {copiedField === 'Số tài khoản' ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                </div>
              </div>

              {/* Số tiền */}
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Số tiền:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#00875A] text-sm">{grandTotal.toLocaleString('vi-VN')} đ</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(String(grandTotal), 'Số tiền')}
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-semibold text-slate-700 transition-colors"
                  >
                    {copiedField === 'Số tiền' ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                </div>
              </div>

              {/* Nội dung chuyển khoản */}
              <div className="flex items-center justify-between py-1 bg-amber-50/60 p-2 rounded-lg border border-amber-200/60">
                <span className="text-amber-900 font-medium">Nội dung chuyển khoản (bắt buộc):</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-950 text-sm">{transferContent}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(transferContent, 'Nội dung chuyển khoản')}
                    className="px-2 py-0.5 rounded bg-white hover:bg-amber-100 border border-amber-300 text-[11px] font-semibold text-amber-900 transition-colors"
                  >
                    {copiedField === 'Nội dung chuyển khoản' ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Action Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Order Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Mã đơn hàng</p>
                  <p className="font-bold text-slate-900 text-sm">#{order.code}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Tổng tiền</p>
                  <p className="font-bold text-[#00875A] text-base">{grandTotal.toLocaleString('vi-VN')} đ</p>
                </div>
              </div>

              {/* Order Items Preview */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {order.sellerOrders?.flatMap((so) => so.items || []).map((item, idx) => (
                  <div key={item.id || idx} className="flex items-center gap-3 text-xs py-1.5 border-b border-slate-100 last:border-0">
                    <div className="w-10 h-13 rounded bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-slate-400">
                      {item.coverUrl || item.coverImage ? (
                        <img src={item.coverUrl || item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-sm">menu_book</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{item.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {item.format === 'DIGITAL' ? 'Ebook' : 'Sách In'} • SL: {item.quantity}
                      </p>
                    </div>
                    <span className="font-medium text-slate-700 shrink-0">
                      {(Number(item.price || 0) * (item.quantity || 1)).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ))}
              </div>

              {/* Cost summary */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Tiền hàng:</span>
                  <span>{Number(order.itemSubtotal || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span>{Number(order.shippingFee || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                {Number(order.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Giảm giá:</span>
                    <span>-{Number(order.discountAmount).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                  <span>Thực thanh toán:</span>
                  <span className="text-[#00875A]">{grandTotal.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS (Mô Phỏng & Hủy) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-emerald-600">tune</span>
                Thao tác kiểm thử & dòng tiền
              </h4>

              {/* Nút 1: Xác Nhận Đã Thanh Toán Thành Công (Test Nhanh Dòng Tiền) */}
              <button
                type="button"
                onClick={handleSimulateSuccess}
                disabled={isSimulating || isCancelling}
                className="w-full py-3.5 px-4 rounded-xl bg-[#00875A] hover:bg-[#00704a] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50"
              >
                {isSimulating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang cập nhật dòng tiền PayOS...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    <span>Xác Nhận Thanh Toán Thành Công (Test Nhanh)</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-500 text-center">
                Bấm nút trên để mô phỏng webhook PayOS: tiền chuyển vào Escrow gian hàng và đơn hàng sang trạng thái tiếp nhận.
              </p>

              {/* Nút 2: Hủy Thanh Toán (Xóa/Hủy Đơn, Không Rác Seller) */}
              <button
                type="button"
                onClick={handleCancelPayment}
                disabled={isSimulating || isCancelling}
                className="w-full py-2.5 px-4 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isCancelling ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                    <span>Đang hủy giao dịch...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">close</span>
                    <span>Hủy Thanh Toán & Bỏ Đơn Hàng</span>
                  </>
                )}
              </button>

              {/* Nút 3: Mở Link PayOS Trực Tiếp (nếu có checkoutUrl) */}
              {paymentData?.checkoutUrl && (
                <a
                  href={paymentData.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <span>Mở Trang Cổng PayOS Chính Thức</span>
                  <span className="material-symbols-outlined text-xs">open_in_new</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
