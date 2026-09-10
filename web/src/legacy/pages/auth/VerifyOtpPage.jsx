import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const { verifyOtp, pendingResetTarget } = useAuth();
  const { showToast } = useToast();

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
      showToast('Đã tự động điền mã OTP!', 'info');
    }
  };

  const handleFillDemoCode = () => {
    setOtp(['1', '2', '3', '4', '5', '6']);
    inputRefs.current[5]?.focus();
    showToast('Đã điền mã OTP mẫu 123456', 'info');
  };

  const handleResendOtp = () => {
    if (!canResend) return;
    setCountdown(60);
    setCanResend(false);
    showToast(`Đã gửi lại mã OTP tới ${pendingResetTarget || 'thiết bị của bạn'}!`, 'success');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      showToast('Vui lòng nhập đầy đủ 6 chữ số mã OTP!', 'error');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = verifyOtp(otpCode);
      setIsLoading(false);
      if (res.success) {
        showToast('Xác thực OTP thành công! Vui lòng đặt mật khẩu mới.', 'success');
        navigate('/reset-password');
      } else {
        showToast(res.message, 'error');
      }
    }, 600);
  };

  const maskTarget = (target) => {
    if (!target) return 'ng***@huki.vn';
    if (target.includes('@')) {
      const [name, domain] = target.split('@');
      return `${name.slice(0, 2)}***@${domain}`;
    }
    return `${target.slice(0, 3)} *** ${target.slice(-3)}`;
  };

  return (
    <div id="main-content" tabIndex="-1" className="min-h-dvh w-full bg-white outline-none">
      <div className="grid min-h-dvh w-full grid-cols-1 overflow-hidden bg-white lg:grid-cols-12">
        
        {/* Left Column: Brand & Info (5 cols) */}
        <div
          className="relative hidden min-h-dvh flex-col justify-between overflow-hidden p-10 text-white lg:col-span-5 lg:flex xl:p-14 2xl:p-20"
          style={{ background: 'linear-gradient(to bottom right, var(--theme-hero-from, #003B2B), var(--theme-hero-via, #002f22), var(--theme-hero-to, #001f17))' }}
        >
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#94f5d6]/10 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-[#ac2c19]/15 blur-3xl pointer-events-none"></div>

          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-3 group mb-8">
              <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 group-hover:scale-105 transition-transform shadow-inner">
                <span className="material-symbols-outlined text-2xl text-[#94f5d6]">menu_book</span>
              </div>
              <div>
                <span className="font-editorial text-2xl font-bold tracking-tight text-white block">
                  HUKI EBOOK
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[#94f5d6] font-bold">
                  Bảo Mật 2 Lớp (2FA)
                </span>
              </div>
            </Link>

            <div className="w-14 h-14 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 mb-4">
              <span className="material-symbols-outlined text-3xl text-[#94f5d6]">mark_email_read</span>
            </div>

            <h1 className="font-editorial text-2xl sm:text-3xl font-bold leading-snug mb-3">
              Xác thực danh tính <span className="text-[#94f5d6] italic">an toàn tuyệt đối</span>.
            </h1>
            <p className="text-white/80 text-xs sm:text-sm leading-relaxed font-light mb-6">
              Mã OTP giúp ngăn chặn các truy cập trái phép và bảo vệ toàn vẹn tài sản sách điện tử cũng như số dư HUKI Xu trong ví của bạn.
            </p>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <div className="font-bold text-[#94f5d6] mb-1">Địa chỉ nhận mã:</div>
              <div className="font-mono text-sm text-white font-semibold">{maskTarget(pendingResetTarget)}</div>
            </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-white/15 text-xs text-white/70 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#94f5d6] text-sm">lock_clock</span>
              <span>Thời hạn OTP: 60 giây</span>
            </span>
            <span className="font-semibold text-white/90">HUKI 2FA</span>
          </div>
        </div>

        {/* Right Column: OTP Input Form (7 cols) */}
        <div className="flex min-h-dvh flex-col justify-between bg-white px-5 py-8 sm:px-10 sm:py-10 lg:col-span-7 lg:px-14 lg:py-12 xl:px-20 2xl:px-28">
          <div>
            <div className="flex items-start justify-between mb-6 pb-4 border-b border-[#e8e5df]">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold font-editorial text-[#17201f]">
                  Nhập Mã OTP 6 Số
                </h2>
                <p className="text-xs sm:text-sm text-[#6b7280] mt-1">
                  Vui lòng kiểm tra hộp thư hoặc tin nhắn điện thoại của bạn
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-center text-xs font-bold text-[#17201f] mb-4">
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
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold text-[#003b2b] bg-[#fbf9f4] border-2 border-[#e8e5df] rounded-2xl focus:border-[#003b2b] focus:bg-white focus:ring-4 focus:ring-[#003b2b]/15 outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* Resend & Demo OTP Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs pt-2">
                <button
                  type="button"
                  onClick={handleFillDemoCode}
                  className="text-[11px] font-bold text-[#684000] bg-[#f8f6f1] px-3 py-1.5 rounded-xl border border-[#e8e5df] hover:bg-[#fea619]/20 transition-all flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm text-[#fea619]">bolt</span>
                  Điền nhanh mã mẫu (123456)
                </button>

                <div className="text-right">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="font-bold text-[#ac2c19] hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">refresh</span>
                      Gửi lại mã mới
                    </button>
                  ) : (
                    <span className="text-[#6b7280]">
                      Gửi lại sau <span className="font-bold text-[#003b2b]">{countdown}s</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || otp.join('').length < 6}
                className="w-full bg-[#003b2b] text-white py-3.5 rounded-2xl text-sm font-bold hover:bg-[#00523c] active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Đang xác thực mã OTP...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">verified</span>
                    <span>Xác Nhận &amp; Tiếp Tục</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 pt-4 border-t border-[#e8e5df] text-center text-xs">
            <Link to="/forgot-password" className="font-bold text-[#6b7280] hover:text-[#003b2b] flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Thay đổi địa chỉ Email / SĐT nhận mã
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
