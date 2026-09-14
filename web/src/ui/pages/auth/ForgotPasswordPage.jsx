import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { authApi, formatAuthError } from '../../api/authApi';
import { forgotPasswordSchema } from '../../utils/authValidation';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [step, setStep] = useState('EMAIL'); // 'EMAIL' | 'OTP'

  // OTP State
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const otpInputRefs = useRef([]);

  // Countdown timer when step is OTP
  useEffect(() => {
    let timer;
    if (step === 'OTP' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const validateEmail = (value) => {
    try {
      forgotPasswordSchema.parse({ email: value });
      setFieldError('');
    } catch (err) {
      const issues = err?.issues || err?.errors || [];
      if (issues[0]?.message) {
        setFieldError(issues[0].message);
      }
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (index, value) => {
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (otpError) setOtpError('');

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      const digits = pasteData.split('');
      setOtp(digits);
      otpInputRefs.current[5]?.focus();
      if (otpError) setOtpError('');
      showToast({
        title: 'Đã tự động điền mã',
        message: 'Mã xác thực OTP đã được điền tự động.',
        type: 'info',
      });
    }
  };

  const handleFillDemoCode = () => {
    setOtp(['1', '2', '3', '4', '5', '6']);
    if (otpError) setOtpError('');
    otpInputRefs.current[5]?.focus();
    showToast({
      title: 'Mã OTP thử nghiệm',
      message: 'Đã điền mã xác thực mẫu 123456.',
      type: 'info',
    });
  };

  // Step 1: Send OTP to email
  const handleSendEmail = async (e) => {
    e?.preventDefault();

    const validationResult = forgotPasswordSchema.safeParse({ email: email.trim() });
    if (!validationResult.success) {
      const issues = validationResult.error?.issues || validationResult.error?.errors || [];
      setFieldError(issues[0]?.message || 'Email không hợp lệ.');
      showToast({
        title: 'Thông tin chưa hợp lệ',
        message: 'Vui lòng nhập địa chỉ email hợp lệ để nhận mã OTP.',
        type: 'error',
      });
      return;
    }

    setFieldError('');
    setIsSendingEmail(true);

    const res = await authApi.forgotPassword(email.trim());
    setIsSendingEmail(false);

    if (res.success) {
      showToast({
        title: 'Đã gửi mã OTP',
        message: 'Mã xác thực 6 số đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
        type: 'success',
      });
      setStep('OTP');
      setCountdown(60);
      setCanResend(false);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } else {
      const vietnameseError = formatAuthError(res.error);
      showToast({
        title: 'Gửi mã thất bại',
        message: vietnameseError,
        type: 'error',
      });
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    setCountdown(60);
    setCanResend(false);
    const res = await authApi.forgotPassword(email.trim());
    if (res.success) {
      showToast({
        title: 'Đã gửi lại mã OTP',
        message: `Mã xác thực mới đã được gửi tới ${email.trim()}. Vui lòng kiểm tra hộp thư.`,
        type: 'success',
      });
    } else {
      showToast({
        title: 'Gửi lại mã thất bại',
        message: formatAuthError(res.error),
        type: 'error',
      });
    }
  };

  // Step 2: Submit OTP & Navigate to Reset Password
  const handleVerifyOtpSubmit = (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setOtpError('Vui lòng nhập đầy đủ 6 chữ số mã xác thực.');
      showToast({
        title: 'Chưa đủ 6 số OTP',
        message: 'Vui lòng nhập đầy đủ 6 chữ số mã xác thực để tiếp tục.',
        type: 'error',
      });
      return;
    }

    setOtpError('');
    setIsVerifyingOtp(true);

    showToast({
      title: 'Xác thực OTP hợp lệ',
      message: 'Đang chuyển đến màn hình thiết lập mật khẩu mới...',
      type: 'success',
    });

    navigate(`/reset-password?email=${encodeURIComponent(email.trim())}&otp=${encodeURIComponent(otpCode)}`, {
      state: { email: email.trim(), otp: otpCode },
    });
  };

  const handleEditEmail = () => {
    setStep('EMAIL');
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
  };

  return (
    <main id="main-content" tabIndex="-1" className="min-h-dvh w-full bg-white outline-none">
      <div className="grid min-h-dvh w-full grid-cols-1 overflow-hidden bg-white lg:grid-cols-12">
        {/* Left Column: Brand & Security Guarantee (5 cols) */}
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
                  Khôi Phục Tài Khoản
                </span>
              </div>
            </Link>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-[#94f5d6] text-xs font-semibold mb-6 backdrop-blur-xs">
              <span className="material-symbols-outlined text-sm">shield</span>
              <span>Bảo Vệ Độc Quyền &amp; 2FA</span>
            </div>

            <h1 className="font-editorial text-3xl xl:text-4xl font-bold leading-tight mb-4 text-white">
              Khôi phục quyền truy cập <br />
              <span className="text-[#94f5d6] italic">an toàn &amp; nhanh chóng</span>.
            </h1>
            <p className="text-white/80 text-sm leading-relaxed font-light max-w-md mb-8">
              Chỉ cần cung cấp email đã đăng ký, hệ thống sẽ gửi mã OTP bảo mật 6 số để bạn thiết lập mật khẩu mới ngay lập tức.
            </p>

            <div className="space-y-3.5 pt-1">
              <div className="flex items-center gap-3 text-xs sm:text-sm text-white/90">
                <div className="w-6 h-6 rounded-full bg-[#94f5d6]/20 flex items-center justify-center text-[#94f5d6] shrink-0">
                  <span className="material-symbols-outlined text-sm">check</span>
                </div>
                <span>Mã xác thực OTP gửi trực tiếp tới hòm thư cá nhân</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-white/90">
                <div className="w-6 h-6 rounded-full bg-[#94f5d6]/20 flex items-center justify-center text-[#94f5d6] shrink-0">
                  <span className="material-symbols-outlined text-sm">check</span>
                </div>
                <span>Bảo toàn toàn bộ sách và tiến độ đọc sau khi đổi mật khẩu</span>
              </div>
            </div>
          </div>

          {/* Bottom: Stat & Version */}
          <div className="relative z-10 pt-6 border-t border-white/15 text-xs text-white/70 flex items-center justify-between">
            <span>Hơn 45.000+ độc giả tin dùng</span>
            <span className="font-semibold text-white/90">HUKI v2.4</span>
          </div>
        </section>

        {/* Right Column: Recovery Form (7 cols) */}
        <section className="flex min-h-dvh flex-col justify-between bg-white px-6 py-8 sm:px-12 sm:py-10 lg:col-span-7 lg:px-14 xl:px-20 2xl:px-28">
          <div className="max-w-xl mx-auto w-full my-auto py-2">
            {/* Header */}
            <div className="flex items-start justify-between mb-6 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold font-editorial text-slate-900 tracking-tight">
                  Quên Mật Khẩu
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {step === 'EMAIL'
                    ? 'Nhập email đăng ký để nhận mã OTP khôi phục mật khẩu'
                    : 'Nhập mã xác thực OTP 6 số đã được gửi tới email của bạn'}
                </p>
              </div>
              <Link
                to="/login"
                className="text-xs font-semibold text-[#003b2b] hover:text-[#00523c] hover:underline shrink-0 pt-1 flex items-center gap-1 transition-colors"
              >
                <span>Quay lại đăng nhập</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>

            {/* Form Step 1: EMAIL */}
            {step === 'EMAIL' ? (
              <form onSubmit={handleSendEmail} noValidate className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Địa chỉ email đăng ký <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="recoveryEmail"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldError) validateEmail(e.target.value);
                    }}
                    onBlur={(e) => validateEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={`w-full h-12 bg-white border rounded-xl px-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs ${
                      fieldError
                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                        : 'border-slate-200 hover:border-slate-300 focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15'
                    }`}
                  />
                  {fieldError && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{fieldError}</p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSendingEmail}
                    className="w-full h-12 bg-[#003B2B] hover:bg-[#00281d] text-white rounded-xl text-sm font-semibold transition-colors duration-200 shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {isSendingEmail ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Đang gửi mã OTP...</span>
                      </>
                    ) : (
                      <span>Gửi mã OTP xác thực</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Form Step 2: OTP (Xuất hiện ngay phía dưới email) */
              <form onSubmit={handleVerifyOtpSubmit} className="space-y-5 animate-fade-in">
                {/* Read-only Email Field with Change Action */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Email nhận mã OTP
                    </label>
                    <button
                      type="button"
                      onClick={handleEditEmail}
                      className="text-xs font-semibold text-[#003b2b] hover:underline cursor-pointer"
                    >
                      Đổi email khác
                    </button>
                  </div>
                  <div className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm text-slate-700 flex items-center justify-between">
                    <span className="font-medium">{email}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-xs">check</span>
                      <span>Đã gửi mã</span>
                    </span>
                  </div>
                </div>

                {/* 6-Digit OTP Input */}
                <div className="pt-1">
                  <label className="block text-center text-xs font-semibold text-slate-700 mb-3">
                    Nhập 6 chữ số mã xác thực OTP <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold text-slate-900 bg-white border rounded-xl outline-none transition-all shadow-2xs ${
                          otpError
                            ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                            : 'border-slate-200 hover:border-slate-300 focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15'
                        }`}
                      />
                    ))}
                  </div>
                  {otpError && (
                    <p className="mt-2 text-center text-xs text-red-500 font-medium">{otpError}</p>
                  )}
                </div>

                {/* Resend & Demo Button */}
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
                    disabled={isVerifyingOtp || otp.join('').length < 6}
                    className="w-full h-12 bg-[#003B2B] hover:bg-[#00281d] text-white rounded-xl text-sm font-semibold transition-colors duration-200 shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    <span>Tiếp tục đặt lại mật khẩu</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Chưa có tài khoản?{' '}
              <Link to="/register" className="font-semibold text-slate-900 hover:text-[#003b2b] hover:underline">
                Đăng ký ngay
              </Link>
            </div>
            <Link
              to="/seller/register"
              className="font-semibold text-[#ac2c19] hover:underline inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">storefront</span>
              Trở thành Nhà Bán Hàng HUKI
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
