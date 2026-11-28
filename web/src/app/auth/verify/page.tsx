"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { AuthEditorialPanel } from '@/components/auth/AuthEditorialPanel';

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyEmail, resendVerification, pendingResetTarget } = useAuth();
  const { showToast } = useToast();

  const targetEmail = searchParams.get('email') || pendingResetTarget || 'user@huki.com';

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Error & Shake & Auto-clear States
  const [hasError, setHasError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const autoClearTimerRef = useRef<NodeJS.Timeout | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cleanup auto-clear timer on unmount
  useEffect(() => {
    return () => {
      if (autoClearTimerRef.current) {
        clearTimeout(autoClearTimerRef.current);
      }
    };
  }, []);

  // Auto-fill OTP from URL query params (nếu người dùng bấm vào link từ email)
  useEffect(() => {
    const tokenParam = searchParams.get('token') || searchParams.get('otp');
    if (tokenParam && /^\d{6}$/.test(tokenParam.trim())) {
      setOtp(tokenParam.trim().split(''));
      setTimeout(() => {
        inputRefs.current[5]?.focus();
      }, 50);
    }
  }, [searchParams]);

  // Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  // Handle single digit input or autofill in onChange
  const handleChange = (index: number, value: string) => {
    const cleanDigits = value.replace(/\D/g, '');

    // Nếu đang có lỗi và người dùng bắt đầu gõ số mới -> Xóa lỗi và reset nhập từ ô 0
    if (hasError) {
      if (autoClearTimerRef.current) {
        clearTimeout(autoClearTimerRef.current);
        autoClearTimerRef.current = null;
      }
      setHasError(false);
      setErrorMessage('');

      if (cleanDigits) {
        const firstDigit = cleanDigits.slice(-1);
        const newOtp = [firstDigit, '', '', '', '', ''];
        setOtp(newOtp);
        setTimeout(() => {
          inputRefs.current[1]?.focus();
          inputRefs.current[1]?.select();
        }, 20);
        return;
      }
    }
    if (!cleanDigits) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    // Trường hợp paste hoặc trình duyệt tự động điền nhiều chữ số
    if (cleanDigits.length > 1) {
      const newOtp = [...otp];
      for (let i = 0; i < cleanDigits.length && index + i < 6; i++) {
        newOtp[index + i] = cleanDigits[i];
      }
      setOtp(newOtp);
      const nextIdx = Math.min(index + cleanDigits.length, 5);
      setTimeout(() => {
        inputRefs.current[nextIdx]?.focus();
        inputRefs.current[nextIdx]?.select();
      }, 20);
      return;
    }

    // Nhập một chữ số đơn
    const newOtp = [...otp];
    newOtp[index] = cleanDigits.slice(-1);
    setOtp(newOtp);

    if (index < 5) {
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus();
        inputRefs.current[index + 1]?.select();
      }, 20);
    }
  };

  // Handle key navigation (Tránh lỗi lặp số với bộ gõ tiếng Việt Unikey / Telex & Tự động nhập lại khi đã lỗi)
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Nếu đang ở trạng thái lỗi và người dùng gõ số mới -> Tự động xóa sạch lỗi và bắt đầu nhập lại từ ô đầu tiên
    if (hasError) {
      if (autoClearTimerRef.current) {
        clearTimeout(autoClearTimerRef.current);
        autoClearTimerRef.current = null;
      }
      setHasError(false);
      setErrorMessage('');

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const newOtp = [e.key, '', '', '', '', ''];
        setOtp(newOtp);
        setTimeout(() => {
          inputRefs.current[1]?.focus();
          inputRefs.current[1]?.select();
        }, 15);
        return;
      }
    }

    // Nếu gõ số 0-9
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const newOtp = [...otp];
      newOtp[index] = e.key;
      setOtp(newOtp);
      if (index < 5) {
        setTimeout(() => {
          inputRefs.current[index + 1]?.focus();
          inputRefs.current[index + 1]?.select();
        }, 15);
      }
      return;
    }

    // Phím Backspace: xóa ô hiện tại, nếu rỗng thì lùi về ô trước
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newOtp = [...otp];
      if (otp[index]) {
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        newOtp[index - 1] = '';
        setOtp(newOtp);
        setTimeout(() => {
          inputRefs.current[index - 1]?.focus();
        }, 15);
      }
      return;
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
      inputRefs.current[index - 1]?.select();
      return;
    }

    if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
      inputRefs.current[index + 1]?.select();
      return;
    }
  };

  // Handle paste full code
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    if (hasError) {
      if (autoClearTimerRef.current) {
        clearTimeout(autoClearTimerRef.current);
        autoClearTimerRef.current = null;
      }
      setHasError(false);
      setErrorMessage('');
    }

    const pasteData = e.clipboardData.getData('text');
    const cleanDigits = pasteData.replace(/\D/g, '');
    if (cleanDigits.length >= 6) {
      const digits = cleanDigits.slice(0, 6).split('');
      setOtp(digits);
      setTimeout(() => {
        inputRefs.current[5]?.focus();
      }, 30);
      showToast({
        title: 'Đã tự động điền mã',
        message: `Mã xác thực ${digits.join('')} đã được điền.`,
        type: 'info',
      });
    } else if (cleanDigits.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < cleanDigits.length && i < 6; i++) {
        newOtp[i] = cleanDigits[i];
      }
      setOtp(newOtp);
    }
  };

  const handleFillDemoCode = () => {
    if (hasError) {
      if (autoClearTimerRef.current) {
        clearTimeout(autoClearTimerRef.current);
        autoClearTimerRef.current = null;
      }
      setHasError(false);
      setErrorMessage('');
    }
    setOtp(['1', '2', '3', '4', '5', '6']);
    setTimeout(() => {
      inputRefs.current[5]?.focus();
    }, 20);
    showToast({
      title: 'Mã OTP thử nghiệm',
      message: 'Đã điền mã xác thực mẫu 123456.',
      type: 'info',
    });
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    if (autoClearTimerRef.current) {
      clearTimeout(autoClearTimerRef.current);
      autoClearTimerRef.current = null;
    }
    setHasError(false);
    setErrorMessage('');
    setOtp(['', '', '', '', '', '']);
    setCountdown(60);
    setCanResend(false);

    const res = await resendVerification(targetEmail);
    if (res.success) {
      showToast({
        title: 'Đã gửi lại mã OTP',
        message: `Mã xác thực mới đã được gửi tới ${targetEmail}. Vui lòng kiểm tra hộp thư.`,
        type: 'success',
      });
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
    } else {
      const errorMsg = res.error?.message || (typeof res.error === 'string' ? res.error : 'Chưa thể gửi lại mã OTP vào lúc này. Vui lòng thử lại sau giây lát.');
      showToast({
        title: 'Gửi lại mã thất bại',
        message: errorMsg,
        type: 'error',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setHasError(true);
      setErrorMessage('Vui lòng nhập đầy đủ 6 chữ số mã xác thực để tiếp tục.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      showToast({
        title: 'Chưa đủ 6 số OTP',
        message: 'Vui lòng nhập đầy đủ 6 chữ số mã xác thực để tiếp tục.',
        type: 'error',
      });
      return;
    }

    setIsLoading(true);
    const res = await verifyEmail(otpCode, targetEmail);
    setIsLoading(false);

    if (res.success) {
      if (autoClearTimerRef.current) {
        clearTimeout(autoClearTimerRef.current);
      }
      setHasError(false);
      setErrorMessage('');

      if (typeof window !== 'undefined') {
        localStorage.removeItem('huki_pending_password');
      }

      showToast({
        title: 'Xác thực thành công',
        message: 'Tài khoản của bạn đã được kích hoạt. Đang chuyển hướng đến trang đăng nhập...',
        type: 'success',
      });
      setTimeout(() => {
        router.push('/auth/login');
      }, 1000);
    } else {
      const rawMsg = res.error?.message || (typeof res.error === 'string' ? res.error : 'Mã OTP không chính xác hoặc đã hết hiệu lực.');
      setHasError(true);
      setErrorMessage(rawMsg);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      showToast({
        title: 'Xác thực không thành công',
        message: rawMsg,
        type: 'error',
      });

      // 5 giây tự động xóa các ô OTP và đưa con trỏ về ô đầu tiên
      if (autoClearTimerRef.current) {
        clearTimeout(autoClearTimerRef.current);
      }
      autoClearTimerRef.current = setTimeout(() => {
        setOtp(['', '', '', '', '', '']);
        setHasError(false);
        setErrorMessage('');
        inputRefs.current[0]?.focus();
      }, 5000);
    }
  };

  const maskTarget = (target?: string | null) => {
    if (!target) return 'user@huki.vn';
    if (target.includes('@')) {
      const [name, domain] = target.split('@');
      return `${name.slice(0, 2)}***@${domain}`;
    }
    return `${target.slice(0, 3)} *** ${target.slice(-3)}`;
  };

  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh w-full bg-white outline-none">
      <div className="grid min-h-dvh w-full grid-cols-1 overflow-hidden bg-white lg:grid-cols-12">
        {/* Left Column: Brand & Info (5 cols) */}
        <AuthEditorialPanel
          eyebrow="Xác thực email chính chủ"
          titleLine1="Xác thực danh tính"
          titleAccent="an toàn tuyệt đối."
          description="Mã OTP giúp ngăn chặn truy cập trái phép và bảo vệ toàn vẹn tài sản sách điện tử cũng như quyền lợi của bạn."
          footerLeft="Thời hạn OTP: 15 phút"
          footerRight="HUKI · 2FA"
          extraContent={
            <div className="rounded-xl border border-white/15 bg-white/[0.06] p-4 text-xs">
              <div className="mb-1 font-medium text-[#A4BDB2]">Địa chỉ nhận mã OTP:</div>
              <div className="font-mono text-sm font-semibold text-[#E6D8BE]">{maskTarget(targetEmail)}</div>
            </div>
          }
        />

        {/* Right Column: OTP Input Form (7 cols) */}
        <section className="flex min-h-dvh flex-col justify-between bg-white px-6 py-8 sm:px-12 sm:py-10 lg:col-span-7 lg:px-14 xl:px-20 2xl:px-28">
          <div className="max-w-xl mx-auto w-full my-auto py-2">
            {/* Header */}
            <div className="flex items-start justify-between mb-6 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold font-editorial text-slate-900 tracking-tight">
                  Nhập Mã OTP 6 Số
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Vui lòng kiểm tra hộp thư email hoặc tin nhắn của bạn
                </p>
              </div>
              <Link
                href="/auth/login"
                className="text-xs font-semibold text-[#003b2b] hover:text-[#00523c] hover:underline shrink-0 pt-1 flex items-center gap-1 transition-colors"
              >
                <span>Đăng nhập</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-center text-xs font-semibold text-slate-700 mb-4">
                  Nhập 6 chữ số xác thực:
                </label>
                <div
                  className={`flex items-center justify-center gap-2 sm:gap-3 transition-transform ${isShaking ? 'animate-otp-shake' : ''}`}
                  onPaste={handlePaste}
                >
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete={idx === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      value={digit}
                      onFocus={(e) => {
                        if (hasError) {
                          if (autoClearTimerRef.current) clearTimeout(autoClearTimerRef.current);
                          setHasError(false);
                        }
                        e.target.select();
                      }}
                      onChange={(e) => handleChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={handlePaste}
                      className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl outline-none transition-all shadow-2xs select-all ${hasError
                          ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-600 ring-2 ring-rose-200 animate-otp-pulse'
                          : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-900 focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15'
                        }`}
                    />
                  ))}
                </div>

                {/* Inline Error Message Banner */}
                {hasError && errorMessage && (
                  <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-200 text-center">
                    <span className="material-symbols-outlined text-base text-rose-600 shrink-0">error</span>
                    <span>{errorMessage}</span>
                  </div>
                )}
                {hasError && (
                  <p className="text-center text-[11px] text-slate-400 mt-1.5 animate-in fade-in">
                    Ô nhập sẽ tự động xóa sau 5 giây hoặc bấm phím số để nhập lại ngay.
                  </p>
                )}
              </div>

              {/* Resend & Demo OTP Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-1">
                <button
                  type="button"
                  onClick={handleFillDemoCode}
                  className="text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm text-amber-600">bolt</span>
                  Điền nhanh mã mẫu (123456)
                </button>

                <div className="text-right">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="font-semibold text-[#ac2c19] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">refresh</span>
                      Gửi lại mã mới
                    </button>
                  ) : (
                    <span className="text-slate-400 text-xs">
                      Gửi lại sau <span className="font-bold text-[#003b2b]">{countdown}s</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || otp.join('').length < 6}
                  className="w-full h-12 bg-[#003B2B] hover:bg-[#00281d] text-white rounded-xl text-sm font-semibold transition-colors duration-200 shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Đang xác thực mã OTP...</span>
                    </>
                  ) : (
                    <span>Xác thực &amp; tiếp tục</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            <Link
              href="/auth/forgot-password"
              className="font-semibold text-slate-600 hover:text-[#003b2b] inline-flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Thay đổi địa chỉ Email nhận mã
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <span className="inline-block w-8 h-8 border-3 border-[#003b2b]/20 border-t-[#003b2b] rounded-full animate-spin"></span>
      </div>
    }>
      <VerifyOtpForm />
    </Suspense>
  );
}
