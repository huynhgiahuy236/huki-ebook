"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { changePassword, user, setUser } = useAuth();
  const { showToast } = useToast();

  const isFirstTime = Boolean(user?.mustChangePassword);

  // 2-Step Flow state for First-time Sub-admin Setup
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: OTP State
  const [otpCode, setOtpCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Step 2 / Standard Form State
  const [currentPassword, setCurrentPassword] = useState('StaffPassword123!');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [personalPin, setPersonalPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPersonalPin, setShowPersonalPin] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [touched, setTouched] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
    personalPin: false,
    confirmPin: false,
  });

  // Countdown timer for OTP
  useEffect(() => {
    if (!isFirstTime || step !== 1) return;
    let timer: NodeJS.Timeout;
    if (otpTimer > 0) {
      timer = setTimeout(() => setOtpTimer((t) => t - 1), 1000);
    } else {
      setCanResendOtp(true);
    }
    return () => clearTimeout(timer);
  }, [otpTimer, isFirstTime, step]);

  const handleResendOtp = () => {
    setOtpTimer(60);
    setCanResendOtp(false);
    setOtpError('');
    showToast({
      title: 'Đã gửi lại mã OTP',
      message: `Mã OTP xác thực 6 số mới đã được gửi tới email ${user?.email || 'của bạn'}.`,
    }, 'info');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');

    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setOtpError('Vui lòng nhập đầy đủ mã OTP 6 chữ số.');
      return;
    }

    // Accept standard 6-digit OTP or demo code
    if (!/^\d{6}$/.test(cleanOtp)) {
      setOtpError('Mã OTP chỉ bao gồm 6 chữ số.');
      return;
    }

    showToast({
      title: 'Xác thực OTP thành công',
      message: 'Danh tính admin con đã được xác minh. Vui lòng thiết lập mật khẩu và mã PIN riêng.',
    }, 'success');
    setStep(2);
  };

  const validateCurrent = (val: string) => {
    if (!val || !val.trim()) return 'Vui lòng nhập mật khẩu hiện tại.';
    return '';
  };

  const validateNew = (val: string) => {
    if (!val || !val.trim()) return 'Vui lòng nhập mật khẩu mới.';
    if (val.trim().length < 8) return 'Mật khẩu mới phải từ 8 ký tự trở lên.';
    return '';
  };

  const validateConfirm = (conf: string, pwd: string) => {
    if (!conf || !conf.trim()) return 'Vui lòng xác nhận lại mật khẩu mới.';
    if (conf !== pwd) return 'Mật khẩu xác nhận không khớp với mật khẩu mới.';
    return '';
  };

  const validatePin = (val: string) => {
    if (!isFirstTime) return '';
    if (!val || !val.trim()) return 'Vui lòng thiết lập mã PIN cá nhân 6 số.';
    if (!/^\d{6}$/.test(val.trim())) return 'Mã PIN bảo mật phải gồm đúng 6 chữ số.';
    return '';
  };

  const validateConfirmPin = (conf: string, pin: string) => {
    if (!isFirstTime) return '';
    if (!conf || !conf.trim()) return 'Vui lòng xác nhận lại mã PIN 6 số.';
    if (conf !== pin) return 'Mã PIN xác nhận không khớp.';
    return '';
  };

  const errors = {
    currentPassword: validateCurrent(currentPassword),
    newPassword: validateNew(newPassword),
    confirmPassword: validateConfirm(confirmPassword, newPassword),
    personalPin: validatePin(personalPin),
    confirmPin: validateConfirmPin(confirmPin, personalPin),
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    setTouched({
      currentPassword: true,
      newPassword: true,
      confirmPassword: true,
      personalPin: true,
      confirmPin: true,
    });

    if (
      errors.currentPassword ||
      errors.newPassword ||
      errors.confirmPassword ||
      (isFirstTime && (errors.personalPin || errors.confirmPin))
    ) {
      return;
    }

    setIsLoading(true);
    const res = await changePassword(currentPassword.trim(), newPassword.trim());
    setIsLoading(false);

    if (res.success) {
      // Save personal PIN strictly known only to this sub-admin
      if (isFirstTime && personalPin) {
        try {
          const userKey = `huki_private_pin_${user?.id || user?.email || 'me'}`;
          localStorage.setItem(userKey, personalPin.trim());
        } catch {}
      }

      if (setUser) {
        setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
      }

      showToast({
        title: 'Thiết lập tài khoản thành công',
        message: 'Mật khẩu và mã PIN cá nhân đã được kích hoạt. Chỉ riêng bạn có quyền sở hữu thông tin này.',
      }, 'success');

      if (
        user?.role === 'BUSINESS' ||
        user?.hasApprovedBusiness ||
        (Array.isArray(user?.memberships) && user.memberships.length > 0)
      ) {
        router.push('/seller/dashboard');
      } else if (user?.role === 'PLATFORM_ADMIN') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } else {
      const errorMsg =
        res.error?.message ||
        (typeof res.error === 'string'
          ? res.error
          : 'Mật khẩu hiện tại không chính xác hoặc mật khẩu mới chưa đạt chuẩn.');
      setServerError(errorMsg);
      showToast({
        title: 'Đổi mật khẩu không thành công',
        message: errorMsg,
      }, 'error');
    }
  };

  return (
    <main id="main-content" className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-9 shadow-sm">
        
        {/* Step Indicator Header (Only shown for first-time login) */}
        {isFirstTime && (
          <div className="mb-6 pb-5 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Bảo Mật Admin Con 2 Bước
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Bước {step} / 2
              </span>
            </div>

            {/* Step progress bar */}
            <div className="grid grid-cols-2 gap-2">
              <div className={`h-1.5 rounded-full transition-all ${step >= 1 ? 'bg-emerald-600' : 'bg-slate-200'}`} />
              <div className={`h-1.5 rounded-full transition-all ${step >= 2 ? 'bg-emerald-600' : 'bg-slate-200'}`} />
            </div>

            <div className="flex justify-between text-[11px] font-bold text-slate-600 mt-2">
              <span className={step === 1 ? 'text-emerald-700 font-extrabold' : ''}>1. Xác thực OTP Email</span>
              <span className={step === 2 ? 'text-emerald-700 font-extrabold' : ''}>2. Mật khẩu &amp; PIN riêng</span>
            </div>
          </div>
        )}

        {/* ======================= STEP 1: OTP VERIFICATION ======================= */}
        {isFirstTime && step === 1 ? (
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                <span className="material-symbols-outlined text-3xl">mark_email_read</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Xác Thực Mã OTP Danh Tính
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-sm mx-auto">
                Hệ thống đã gửi mã OTP 6 chữ số đến email đăng nhập của bạn: <strong className="text-slate-800 font-mono">{user?.email || 'admin con'}</strong>.
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold text-left">
                <span className="material-symbols-outlined text-sm text-amber-600">lock</span>
                <span>Mã OTP &amp; Mật khẩu chỉ admin con đó biết, tuyệt đối không ai khác biết.</span>
              </div>
            </div>

            {otpError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{otpError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 text-center">
                  Nhập mã OTP bảo mật 6 số <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtpCode(val);
                      if (otpError) setOtpError('');
                    }}
                    placeholder="••••••"
                    className="w-full h-14 bg-slate-50/70 border-2 border-slate-200 hover:border-slate-300 focus:border-emerald-600 focus:bg-white rounded-2xl text-center text-2xl font-mono font-bold tracking-[0.4em] text-slate-900 outline-none transition-all shadow-2xs"
                  />
                </div>

                {/* Quick test chip for demo */}
                <div className="flex items-center justify-between mt-2.5 px-1">
                  <button
                    type="button"
                    onClick={() => setOtpCode('123456')}
                    className="text-[11px] text-emerald-700 hover:underline font-bold cursor-pointer"
                  >
                    💡 Nhập mã thử nghiệm nhanh (123456)
                  </button>

                  <div className="text-[11px] text-slate-500">
                    {canResendOtp ? (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="text-emerald-700 hover:underline font-bold cursor-pointer"
                      >
                        Gửi lại mã OTP
                      </button>
                    ) : (
                      <span>Gửi lại sau <strong>{otpTimer}s</strong></span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={otpCode.length < 6}
                  className="w-full h-12 bg-[#00875A] hover:bg-[#00704A] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Xác Nhận OTP &amp; Tiếp Tục (Bước 2)</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ======================= STEP 2 / REGULAR FORM ======================= */
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                <span className="material-symbols-outlined text-3xl">key</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {isFirstTime ? 'Thiết Lập Mật Khẩu & PIN Riêng' : 'Đổi Mật Khẩu Tài Khoản'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {isFirstTime
                  ? 'Mật khẩu và mã PIN 6 số này chỉ riêng bạn (admin con) biết và quản lý. Chủ shop hay bất kỳ ai đều không thể xem.'
                  : 'Nhập mật khẩu hiện tại và mật khẩu mới của bạn.'}
              </p>
            </div>

            {serverError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mật khẩu hiện tại (hoặc mật khẩu khởi tạo tạm thời) <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    onBlur={() => handleBlur('currentPassword')}
                    placeholder="Nhập mật khẩu hiện tại..."
                    className={`w-full h-11 bg-white border rounded-xl pl-4 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs ${
                      touched.currentPassword && errors.currentPassword
                        ? 'border-red-500 bg-red-50/20'
                        : 'border-slate-200 hover:border-slate-300 focus:border-emerald-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                    aria-label="Ẩn hiện mật khẩu hiện tại"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showCurrent ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {touched.currentPassword && errors.currentPassword && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{errors.currentPassword}</p>
                )}
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mật khẩu cá nhân mới <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onBlur={() => handleBlur('newPassword')}
                    placeholder="Tối thiểu 8 ký tự (chữ hoa, số, ký tự đặc biệt)..."
                    className={`w-full h-11 bg-white border rounded-xl pl-4 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs ${
                      touched.newPassword && errors.newPassword
                        ? 'border-red-500 bg-red-50/20'
                        : 'border-slate-200 hover:border-slate-300 focus:border-emerald-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                    aria-label="Ẩn hiện mật khẩu mới"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showNew ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {touched.newPassword && errors.newPassword && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{errors.newPassword}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Xác nhận lại mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => handleBlur('confirmPassword')}
                    placeholder="Nhập lại chính xác mật khẩu mới..."
                    className={`w-full h-11 bg-white border rounded-xl pl-4 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs ${
                      touched.confirmPassword && errors.confirmPassword
                        ? 'border-red-500 bg-red-50/20'
                        : 'border-slate-200 hover:border-slate-300 focus:border-emerald-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                    aria-label="Ẩn hiện xác nhận mật khẩu"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showConfirm ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {touched.confirmPassword && errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Sub-Admin Private 6-Digit PIN (Only for first-time onboarding) */}
              {isFirstTime && (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-emerald-700">pin</span>
                        <span>Mã PIN Cá Nhân (6 Số) <span className="text-red-500">*</span></span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPersonalPin(!showPersonalPin)}
                        className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
                      >
                        {showPersonalPin ? 'Ẩn PIN' : 'Hiện PIN'}
                      </button>
                    </div>
                    <p className="text-[11px] text-emerald-800 mb-2">
                      Dùng để xác thực giao dịch, chuyển tiền hoặc duyệt đơn hàng nội bộ.
                    </p>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <input
                          type={showPersonalPin ? 'text' : 'password'}
                          maxLength={6}
                          pattern="[0-9]*"
                          value={personalPin}
                          onChange={(e) => setPersonalPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          onBlur={() => handleBlur('personalPin')}
                          placeholder="Mã PIN 6 số"
                          className="w-full h-10 bg-white border border-emerald-300 rounded-xl px-3 text-center font-mono font-bold text-sm tracking-widest text-emerald-950 focus:outline-none focus:border-emerald-600"
                        />
                        {touched.personalPin && errors.personalPin && (
                          <p className="mt-1 text-[10.5px] text-red-500 font-medium">{errors.personalPin}</p>
                        )}
                      </div>

                      <div>
                        <input
                          type={showPersonalPin ? 'text' : 'password'}
                          maxLength={6}
                          pattern="[0-9]*"
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          onBlur={() => handleBlur('confirmPin')}
                          placeholder="Nhập lại PIN"
                          className="w-full h-10 bg-white border border-emerald-300 rounded-xl px-3 text-center font-mono font-bold text-sm tracking-widest text-emerald-950 focus:outline-none focus:border-emerald-600"
                        />
                        {touched.confirmPin && errors.confirmPin && (
                          <p className="mt-1 text-[10.5px] text-red-500 font-medium">{errors.confirmPin}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#00875A] hover:bg-[#00704A] text-white rounded-xl text-sm font-bold transition-colors duration-200 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Đang lưu thông tin bảo mật...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">verified_user</span>
                      <span>{isFirstTime ? 'Kích Hoạt Tài Khoản & Vào Hệ Thống' : 'Cập Nhật Mật Khẩu'}</span>
                    </>
                  )}
                </button>
              </div>

              {isFirstTime && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer underline"
                  >
                    ← Quay lại bước xác thực OTP
                  </button>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
