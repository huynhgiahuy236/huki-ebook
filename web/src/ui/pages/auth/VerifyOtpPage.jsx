import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail, resendVerification, pendingResetTarget } = useAuth();
  const { showToast } = useToast();

  const targetEmail = location.state?.email || pendingResetTarget || 'user@huki.com';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const inputRefs = useRef([]);

  // Countdown timer
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Handle single digit input
  const handleChange = (index, value) => {
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle key navigation (Backspace)
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste full 6-digit code
  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      const digits = pasteData.split('');
      setOtp(digits);
      inputRefs.current[5]?.focus();
      showToast({
        title: 'Đã tự động điền mã',
        message: 'Mã xác thực OTP đã được điền tự động.',
        type: 'info',
      });
    }
  };

  const handleFillDemoCode = () => {
    setOtp(['1', '2', '3', '4', '5', '6']);
    inputRefs.current[5]?.focus();
    showToast({
      title: 'Mã OTP thử nghiệm',
      message: 'Đã điền mã xác thực mẫu 123456.',
      type: 'info',
    });
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setCountdown(60);
    setCanResend(false);
    const res = await resendVerification(targetEmail);
    if (res.success) {
      showToast({
        title: 'Đã gửi lại mã OTP',
        message: `Mã xác thực mới đã được gửi tới ${targetEmail}. Vui lòng kiểm tra hộp thư.`,
        type: 'success',
      });
    } else {
      showToast({
        title: 'Gửi lại mã thất bại',
        message: res.error || 'Chưa thể gửi lại mã OTP vào lúc này. Vui lòng thử lại sau giây lát.',
        type: 'error',
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      showToast({
        title: 'Chưa đủ 6 số OTP',
        message: 'Vui lòng nhập đầy đủ 6 chữ số mã xác thực để tiếp tục.',
        type: 'error',
      });
      return;
    }

    setIsLoading(true);
    const res = await verifyEmail(otpCode);
    setIsLoading(false);
    if (res.success) {
      showToast({
        title: 'Xác thực thành công',
        message: 'Tài khoản của bạn đã được kích hoạt thành công! Đang chuyển đến trang đăng nhập...',
        type: 'success',
      });
      navigate('/login');
    } else {
      showToast({
        title: 'Xác thực không thành công',
        message: res.error || 'Mã OTP không chính xác hoặc đã hết hiệu lực.',
        type: 'error',
      });
    }
  };

  const maskTarget = (target) => {
    if (!target) return 'user@huki.vn';
    if (target.includes('@')) {
      const [name, domain] = target.split('@');
      return `${name.slice(0, 2)}***@${domain}`;
    }
    return `${target.slice(0, 3)} *** ${target.slice(-3)}`;
  };

  return (
    <main id="main-content" tabIndex="-1" className="min-h-dvh w-full bg-white outline-none">
      <div className="grid min-h-dvh w-full grid-cols-1 overflow-hidden bg-white lg:grid-cols-12">
        {/* Left Column: Brand & Info (5 cols) */}
        <section
          className="relative hidden min-h-dvh flex-col justify-between overflow-hidden p-12 text-white lg:col-span-5 lg:flex xl:p-16 2xl:p-20"
          style={{
            background:
              'linear-gradient(to bottom right, var(--theme-hero-from, #003B2B), var(--theme-hero-via, #002f22), var(--theme-hero-to, #001f17))',
          }}
        >
          {/* Background Ambient Blur */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-[#94f5d6]/10 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-[#ac2c19]/15 blur-3xl pointer-events-none"></div>

          {/* Center Brand Identity */}
          <div className="relative z-10 my-auto py-8">
            <Link to="/" className="inline-flex items-center gap-3.5 group mb-10">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 group-hover:scale-105 transition-transform shadow-inner">
                <span className="material-symbols-outlined text-2xl text-[#94f5d6]">menu_book</span>
              </div>
              <div>
                <span className="font-editorial text-2xl font-bold tracking-tight text-white block">
                  HUKI EBOOK
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[#94f5d6] font-semibold">
                  Bảo Mật 2 Lớp (2FA)
                </span>
              </div>
            </Link>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-[#94f5d6] text-xs font-semibold mb-6 backdrop-blur-xs">
              <span className="material-symbols-outlined text-sm">mark_email_read</span>
              <span>Xác Thực Email Chính Chủ</span>
            </div>

            <h1 className="font-editorial text-3xl xl:text-4xl font-bold leading-tight mb-4 text-white">
              Xác thực danh tính <br />
              <span className="text-[#94f5d6] italic">an toàn tuyệt đối</span>.
            </h1>
            <p className="text-white/80 text-sm leading-relaxed font-light max-w-md mb-8">
              Mã OTP giúp ngăn chặn truy cập trái phép và bảo vệ toàn vẹn tài sản sách điện tử cũng như quyền lợi của bạn.
            </p>

            <div className="p-4 rounded-xl bg-white/10 border border-white/15 text-xs backdrop-blur-xs max-w-md">
              <div className="font-semibold text-[#94f5d6] mb-1">Địa chỉ nhận mã OTP:</div>
              <div className="font-mono text-sm text-white font-semibold">{maskTarget(targetEmail)}</div>
            </div>
          </div>

          {/* Bottom: Stat & Version */}
          <div className="relative z-10 pt-6 border-t border-white/15 text-xs text-white/70 flex items-center justify-between">
            <span>Thời hạn OTP: 60 giây</span>
            <span className="font-semibold text-white/90">HUKI 2FA</span>
          </div>
        </section>

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
                to="/login"
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
                <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (inputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-xl focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15 outline-none transition-all shadow-2xs"
                    />
                  ))}
                </div>
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
              to="/forgot-password"
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
