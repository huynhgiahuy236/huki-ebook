import React, { useState, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { paymentApi } from '../../api/paymentApi';
import { orderApi } from '../../api/orderApi';
import { useToast } from '../../context/ToastContext';

const VIETNAM_BANKS_BIN_MAP = {
  '970416': 'ACB (Ngân hàng TMCP Á Châu)',
  '970422': 'MBBank (Ngân Hàng Quân Đội)',
  '970415': 'VietinBank (Ngân Hàng Công Thương)',
  '970436': 'Vietcombank (Ngân Hàng Ngoại Thương)',
  '970407': 'Techcombank (Kỹ Thương Việt Nam)',
  '970418': 'BIDV (Đầu Tư và Phát Triển VN)',
  '970423': 'TPBank (Tiên Phong Bank)',
  '970405': 'Agribank (Nông Nghiệp và PTNT)',
  '970448': 'OCB (Phương Đông)',
  '970425': 'ABBANK (An Bình)',
  '970432': 'VPBank (Việt Nam Thịnh Vượng)',
  '970454': 'BVBank (Bản Việt)',
  '970441': 'VIB (Quốc Tế Việt Nam)',
  '970437': 'HDBank (Phát Triển TP.HCM)',
  '970443': 'SHB (Sài Gòn - Hà Nội)',
  '970403': 'Sacombank (Sài Gòn Thương Tín)',
  '970428': 'Nam A Bank (Nam Á)',
  '970431': 'Eximbank (Xuất Nhập Khẩu)',
  '970426': 'MSB (Hàng Hải Việt Nam)',
  '970449': 'LPBank (Lộc Phát Việt Nam)',
  '970452': 'KienlongBank (Kiên Long)',
  '970429': 'SCB (Sài Gòn)',
  '970414': 'OceanBank (Đại Dương)',
  '970412': 'PVcomBank (Đại Chúng Việt Nam)',
  '970419': 'NCB (Quốc Dân)',
  '970440': 'SeABank (Đông Nam Á)',
};

export default function PaymentCountdownModal({
  isOpen,
  onClose,
  orderId,
  orderCode,
  grandTotal = 0,
  paymentData = null,
  onSuccess,
}) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes (120 seconds) default
  const [isExpired, setIsExpired] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [currentPayment, setCurrentPayment] = useState(paymentData);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update currentPayment if paymentData prop changes
  useEffect(() => {
    if (paymentData) {
      setCurrentPayment(paymentData);
    }
  }, [paymentData]);

  // Calculate remaining seconds from expiresAt if provided
  useEffect(() => {
    if (!isOpen) return;

    if (currentPayment?.expiresAt) {
      const diff = Math.max(0, Math.floor((new Date(currentPayment.expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(diff > 0 ? diff : 0);
      if (diff <= 0) {
        setIsExpired(true);
      }
    } else {
      setTimeLeft(120);
      setIsExpired(false);
    }
  }, [isOpen, currentPayment?.expiresAt]);

  // 1-second interval timer
  useEffect(() => {
    if (!isOpen || isExpired || isSuccess) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isExpired, isSuccess]);

  // Status Polling every 2s
  useEffect(() => {
    if (!isOpen || !orderId || isSuccess || String(orderId).startsWith('ord-') || String(orderId).startsWith('fallback')) return;

    const pollInterval = setInterval(async () => {
      try {
        // 1. Call payment API: triggers backend to check PayOS status actively
        const payRes = await paymentApi.getOrderPayment(orderId);
        if (payRes.success && payRes.data) {
          const isPaid =
            payRes.data.paymentStatus === 'SUCCEEDED' ||
            payRes.data.payments?.some((p) => p.status === 'SUCCEEDED');
          if (isPaid) {
            setIsSuccess(true);
            clearInterval(pollInterval);
            showToast(
              {
                title: 'Thanh toán thành công!',
                message: `Đơn hàng #${orderCode} đã được thanh toán thành công và chuyển sang xử lý.`,
              },
              'success'
            );
            setTimeout(() => {
              if (onSuccess) {
                onSuccess({ id: orderId, code: orderCode });
              } else {
                navigate(`/order-success?orderId=${orderId}&code=${orderCode}&paymentMethod=ONLINE_PAYMENT`);
              }
            }, 1200);
            return;
          }
        }

        // 2. Also check Buyer Order Detail
        const res = await orderApi.getBuyerOrderDetail(orderId);
        if (res.success && res.data) {
          const o = res.data;
          if (o.paymentStatus === 'SUCCEEDED' || o.status === 'PROCESSING' || o.status === 'CONFIRMED' || o.status === 'COMPLETED') {
            setIsSuccess(true);
            clearInterval(pollInterval);
            showToast({
              title: 'Thanh toán thành công!',
              message: `Đơn hàng #${orderCode || o.code} đã được thanh toán thành công và chuyển sang xử lý.`,
            }, 'success');
            setTimeout(() => {
              if (onSuccess) {
                onSuccess(o);
              } else {
                navigate(`/order-success?orderId=${orderId}&code=${orderCode || o.code}&paymentMethod=ONLINE_PAYMENT`);
              }
            }, 1200);
          } else if (o.status === 'CANCELLED' || o.paymentStatus === 'EXPIRED') {
            setIsExpired(true);
            clearInterval(pollInterval);
          }
        }
      } catch {
        // Ignore background polling errors
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [isOpen, orderId, orderCode, isSuccess, onSuccess, navigate, showToast]);

  const handleCopy = (text, fieldName) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      showToast({
        title: 'Đã sao chép',
        message: `Đã sao chép ${fieldName} vào bộ nhớ tạm.`,
      }, 'info');
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  if (!mounted || !isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isUrgent = timeLeft <= 60 && !isExpired;

  const rawQr = currentPayment?.qrCode;
  const qrImageUrl =
    rawQr && (rawQr.startsWith('http') || rawQr.startsWith('data:image'))
      ? rawQr
      : rawQr
      ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(rawQr)}`
      : `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(`2|99|0988123456|${currentPayment?.accountName || 'HUKI EBOOK'}|${currentPayment?.accountNumber || '970422920268888'}|0|0|${grandTotal || currentPayment?.amount || 0}|${currentPayment?.description || `HUKI ${String(orderCode || orderId || '').slice(-10)}`}|transfer_myqr`)}`;

  const transferContent = currentPayment?.description || `HUKI ${String(orderCode || orderId || '').slice(-10)}`.toUpperCase();
  const binKey = String(currentPayment?.bin || '');
  const bankName =
    currentPayment?.bankName ||
    (binKey && VIETNAM_BANKS_BIN_MAP[binKey]) ||
    (binKey ? `Ngân Hàng (BIN ${binKey})` : 'Ngân hàng liên kết PayOS');
  const accountNo = currentPayment?.accountNumber || '970422920268888';
  const accountName = currentPayment?.accountName || 'HUKI EBOOK PLATFORM';
  const displayAmount = grandTotal || currentPayment?.amount || 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[var(--theme-surface,#ffffff)] text-[var(--theme-text,#1c1b1f)] rounded-3xl shadow-2xl border border-[var(--theme-border,#e8e5df)] overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title & Live Timer Badge */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[var(--theme-primary,#003B2B)] to-[#005c44] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <span className="material-symbols-outlined text-[24px]">qr_code_scanner</span>
            </span>
            <div>
              <h3 className="font-editorial text-lg sm:text-xl font-bold tracking-tight">Thanh Toán PayOS (VietQR)</h3>
              <p className="text-xs text-emerald-100 opacity-90">Mã đơn hàng: <strong className="font-mono text-white">#{orderCode || orderId?.slice(0, 8)}</strong></p>
            </div>
          </div>

          {/* Countdown Clock Badge */}
          <div
            className={`px-3 py-1.5 rounded-2xl border flex items-center gap-1.5 shadow-sm transition-all duration-300 ${
              isExpired
                ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
                : isUrgent
                ? 'bg-rose-500 text-white border-rose-300 animate-pulse font-black'
                : 'bg-white/20 text-white border-white/30 font-bold'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isExpired ? 'timer_off' : 'timer'}
            </span>
            <span className="font-mono text-sm tracking-wider font-bold">
              {isExpired ? '00:00' : formattedTime}
            </span>
          </div>
        </div>

        {/* Warning Alert when <= 60s */}
        {isUrgent && !isExpired && (
          <div className="bg-rose-500/15 border-b border-rose-500/30 px-4 py-2.5 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
            <span className="material-symbols-outlined text-[18px] text-rose-600 animate-bounce">warning</span>
            <span>Đơn hàng sắp hết hạn trong <strong>{timeLeft} giây</strong>! Vui lòng quét mã hoàn tất.</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* QR Code Section */}
          <div className="relative flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--theme-background,#F2FBF9)]/60 border border-[var(--theme-border,#e8e5df)]">
            <div className={`relative p-3 rounded-2xl bg-white shadow-md transition-all ${isExpired ? 'grayscale opacity-30 blur-[1px]' : ''}`}>
              <img
                src={qrImageUrl}
                alt="PayOS VietQR Code"
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
              />
              <div className="absolute inset-x-0 bottom-1 flex items-center justify-center">
                <span className="text-[10px] font-bold text-emerald-800 bg-white/90 px-2 py-0.5 rounded shadow-2xs">
                  VietQR · PayOS 24/7
                </span>
              </div>
            </div>

            {/* Expired Overlay on QR */}
            {isExpired && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-neutral-900/80 rounded-2xl text-white text-center animate-in fade-in">
                <span className="material-symbols-outlined text-4xl text-rose-400 mb-1">timer_off</span>
                <p className="font-bold text-base text-rose-300">Mã QR Đã Hết Hạn (2 phút)</p>
                <p className="text-xs text-neutral-300 mt-1 max-w-xs leading-relaxed">
                  Đơn hàng đã được hệ thống tự động hủy và giải phóng tồn kho về trạng thái ban đầu.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    navigate('/cart');
                  }}
                  className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-md cursor-pointer transition-all"
                >
                  Tạo lại đơn hàng mới
                </button>
              </div>
            )}

            {!isExpired && (
              <p className="text-xs text-[var(--theme-text-muted,#49454f)] mt-3 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">smartphone</span>
                Mở App Ngân hàng hoặc Ví điện tử bất kỳ để quét mã
              </p>
            )}
          </div>

          {/* Bank Transfer Details Table */}
          <div className="rounded-2xl border border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)] divide-y divide-[var(--theme-border,#e8e5df)] text-xs sm:text-sm">
            <div className="p-3 flex items-center justify-between">
              <span className="text-[var(--theme-text-muted,#49454f)] font-medium">Số tiền thanh toán:</span>
              <span className="font-bold text-base sm:text-lg text-[var(--theme-primary,#003B2B)]">
                {displayAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <span className="text-[var(--theme-text-muted,#49454f)] font-medium">Ngân hàng:</span>
              <strong className="font-bold text-[var(--theme-text,#1c1b1f)]">{bankName}</strong>
            </div>

            <div className="p-3 flex items-center justify-between">
              <span className="text-[var(--theme-text-muted,#49454f)] font-medium">Số tài khoản:</span>
              <div className="flex items-center gap-2">
                <strong className="font-mono font-bold text-sm sm:text-base text-[var(--theme-text,#1c1b1f)]">{accountNo}</strong>
                <button
                  onClick={() => handleCopy(accountNo, 'Số tài khoản')}
                  className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-[var(--theme-primary,#003B2B)]/10 hover:text-[var(--theme-primary,#003B2B)] text-[11px] font-semibold cursor-pointer transition-all"
                >
                  {copiedField === 'Số tài khoản' ? '✓ Đã chép' : 'Sao chép'}
                </button>
              </div>
            </div>

            <div className="p-3 flex items-center justify-between">
              <span className="text-[var(--theme-text-muted,#49454f)] font-medium">Chủ tài khoản:</span>
              <strong className="font-bold text-[var(--theme-text,#1c1b1f)]">{accountName}</strong>
            </div>

            <div className="p-3 flex items-center justify-between bg-[var(--theme-background,#F2FBF9)]/40">
              <span className="text-[var(--theme-text-muted,#49454f)] font-medium">Nội dung chuyển:</span>
              <div className="flex items-center gap-2">
                <strong className="font-mono font-bold text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">{transferContent}</strong>
                <button
                  onClick={() => handleCopy(transferContent, 'Nội dung')}
                  className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-[var(--theme-primary,#003B2B)]/10 hover:text-[var(--theme-primary,#003B2B)] text-[11px] font-semibold cursor-pointer transition-all"
                >
                  {copiedField === 'Nội dung' ? '✓ Đã chép' : 'Sao chép'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-[var(--theme-background,#F2FBF9)]/60 border-t border-[var(--theme-border,#e8e5df)] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] text-xs sm:text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all"
          >
            {isExpired ? 'Đóng' : 'Để sau (Hủy)'}
          </button>

          {!isExpired ? (
            <div className="flex items-center gap-3">
              {currentPayment?.checkoutUrl && (
                <a
                  href={currentPayment.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <span>Mở cổng PayOS</span>
                  <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                </a>
              )}
              <div className="flex items-center gap-2 text-xs text-[var(--theme-text-muted,#49454f)]">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Đang chờ chuyển khoản...</span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/orders/${orderId}`);
              }}
              className="px-4 py-2.5 rounded-xl bg-[var(--theme-primary,#003B2B)] text-white text-xs sm:text-sm font-bold hover:opacity-90 shadow-md cursor-pointer transition-all"
            >
              Xem chi tiết đơn
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
