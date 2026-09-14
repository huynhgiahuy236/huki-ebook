import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { registerSchema } from '../../utils/authValidation';
import { formatAuthError } from '../../api/authApi';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: true,
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Đánh giá độ mạnh mật khẩu trực quan
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-transparent', text: '' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: 'Yếu', color: 'bg-rose-500', text: 'text-rose-500' };
      case 2:
        return { score: 50, label: 'Trung bình', color: 'bg-amber-500', text: 'text-amber-500' };
      case 3:
        return { score: 75, label: 'Khá', color: 'bg-sky-500', text: 'text-sky-600' };
      case 4:
        return { score: 100, label: 'Rất mạnh', color: 'bg-emerald-600', text: 'text-emerald-700' };
      default:
        return { score: 15, label: 'Ngắn', color: 'bg-rose-400', text: 'text-rose-400' };
    }
  };

  const strength = getPasswordStrength(formData.password);

  const validateSingleField = (field, value, allData = formData) => {
    try {
      const dataToValidate = { ...allData, [field]: value };
      registerSchema.parse(dataToValidate);
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        if (field === 'password' || field === 'confirmPassword') {
          delete next.confirmPassword;
        }
        return next;
      });
    } catch (err) {
      const issues = err?.issues || err?.errors || [];
      const fieldError = issues.find((e) => e.path[0] === field);
      if (fieldError) {
        setFieldErrors((prev) => ({
          ...prev,
          [field]: fieldError.message,
        }));
      } else {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (fieldErrors[field]) {
        validateSingleField(field, value, updated);
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationResult = registerSchema.safeParse(formData);

    if (!validationResult.success) {
      const errors = {};
      const issues = validationResult.error?.issues || validationResult.error?.errors || [];
      issues.forEach((err) => {
        const field = err.path[0];
        if (field && !errors[field]) {
          errors[field] = err.message;
        }
      });
      setFieldErrors(errors);
      showToast({
        title: 'Thông tin chưa hợp lệ',
        message: 'Vui lòng kiểm tra lại các trường được báo đỏ bên dưới.',
        type: 'error',
      });
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    const regRes = await register({
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      password: formData.password,
      phone: formData.phone.trim(),
    });

    setIsLoading(false);

    if (regRes.success) {
      showToast({
        title: 'Đăng ký thành công',
        message: 'Mã OTP đã được gửi đến email của bạn.',
        type: 'success',
      });
      navigate(`/verify-otp?email=${encodeURIComponent(formData.email.trim())}`);
    } else {
      const vietnameseError = formatAuthError(regRes.error);
      showToast({
        title: 'Đăng ký thất bại',
        message: vietnameseError,
        type: 'error',
      });
    }
  };

  return (
    <main id="main-content" tabIndex="-1" className="min-h-dvh w-full bg-white outline-none">
      <div className="grid min-h-dvh w-full grid-cols-1 overflow-hidden bg-white lg:grid-cols-12">
        {/* Left Column: Brand & Value Proposition (5 cols) */}
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

          {/* Top: Brand Identity */}
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
                  Khởi Nguồn Tri Thức
                </span>
              </div>
            </Link>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-[#94f5d6] text-xs font-semibold mb-6 backdrop-blur-xs">
              <span className="material-symbols-outlined text-sm">verified_user</span>
              <span>Bản Quyền &amp; DRM Chuẩn Quốc Tế</span>
            </div>

            <h1 className="font-editorial text-3xl xl:text-4xl font-bold leading-tight mb-4 text-white">
              Khám phá thế giới <br />
              <span className="text-[#94f5d6] italic">sách thật &amp; sách số</span>.
            </h1>
            <p className="text-white/80 text-sm leading-relaxed font-light max-w-md mb-8">
              Tạo tài khoản để đồng bộ tủ sách, tiến độ đọc và lưu trữ ghi chú thông minh trên mọi thiết bị.
            </p>

            <div className="space-y-3.5 pt-1">
              <div className="flex items-center gap-3 text-xs sm:text-sm text-white/90">
                <div className="w-6 h-6 rounded-full bg-[#94f5d6]/20 flex items-center justify-center text-[#94f5d6] shrink-0">
                  <span className="material-symbols-outlined text-sm">check</span>
                </div>
                <span>Sách giấy giao nhanh &amp; Ebook đọc ngay</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-white/90">
                <div className="w-6 h-6 rounded-full bg-[#94f5d6]/20 flex items-center justify-center text-[#94f5d6] shrink-0">
                  <span className="material-symbols-outlined text-sm">check</span>
                </div>
                <span>Đồng bộ đa thiết bị: Máy đọc sách, Web, Mobile</span>
              </div>
            </div>
          </div>

          {/* Bottom: Stat & Version */}
          <div className="relative z-10 pt-6 border-t border-white/15 text-xs text-white/70 flex items-center justify-between">
            <span>Hơn 45.000+ độc giả tin dùng</span>
            <span className="font-semibold text-white/90">HUKI v2.4</span>
          </div>
        </section>

        {/* Right Column: Registration Form (7 cols) */}
        <section className="flex min-h-dvh flex-col justify-between bg-white px-6 py-8 sm:px-12 sm:py-10 lg:col-span-7 lg:px-14 xl:px-20 2xl:px-28">
          <div className="max-w-xl mx-auto w-full my-auto py-2">
            {/* Header: Title + Switch to Login */}
            <div className="flex items-start justify-between mb-6 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold font-editorial text-slate-900 tracking-tight">
                  Tạo Tài Khoản Mới
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Đăng ký nhanh chóng với thông tin bảo mật chuẩn xác
                </p>
              </div>
              <Link
                to="/login"
                className="text-xs font-semibold text-[#003b2b] hover:text-[#00523c] hover:underline shrink-0 pt-1 flex items-center gap-1 transition-colors"
              >
                <span>Đã có tài khoản?</span>
                <span className="font-bold">Đăng nhập</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-xs font-bold text-slate-800 mb-1.5">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  autoComplete="name"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  onBlur={(e) => validateSingleField('fullName', e.target.value)}
                  placeholder="Nguyễn Văn An"
                  className={`w-full h-12 bg-white border rounded-xl px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                    fieldErrors.fullName
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/15 bg-red-50/10'
                      : 'border-slate-200 hover:border-slate-300 focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15'
                  }`}
                />
                {fieldErrors.fullName && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.fullName}</p>
                )}
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-slate-800 mb-1.5">
                    Địa chỉ Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={(e) => validateSingleField('email', e.target.value)}
                    placeholder="seller1@gmail.com"
                    className={`w-full h-12 bg-white border rounded-xl px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                      fieldErrors.email
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/15 bg-red-50/10'
                        : 'border-slate-200 hover:border-slate-300 focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15'
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-xs font-bold text-slate-800 mb-1.5">
                    Số điện thoại Việt Nam <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    onBlur={(e) => validateSingleField('phone', e.target.value)}
                    placeholder="0912345678"
                    className={`w-full h-12 bg-white border rounded-xl px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                      fieldErrors.phone
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/15 bg-red-50/10'
                        : 'border-slate-200 hover:border-slate-300 focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15'
                    }`}
                  />
                  {fieldErrors.phone && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.phone}</p>
                  )}
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-bold text-slate-800 mb-1.5">
                  Mật khẩu bảo mật <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    onBlur={(e) => validateSingleField('password', e.target.value)}
                    placeholder="Tối thiểu 8 ký tự, 1 hoa, 1 số, 1 ký tự đặc biệt"
                    className={`w-full h-12 bg-white border rounded-xl pl-4 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                      fieldErrors.password
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/15 bg-red-50/10'
                        : 'border-slate-200 hover:border-slate-300 focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.password}</p>
                )}

                {/* Password strength */}
                {formData.password && strength.label && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-500">
                        Độ mạnh mật khẩu — <span className={`font-bold ${strength.text}`}>{strength.label}</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: `${strength.score}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-800 mb-1.5">
                  Xác nhận lại mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    onBlur={(e) => validateSingleField('confirmPassword', e.target.value)}
                    placeholder="Nhập lại mật khẩu..."
                    className={`w-full h-12 bg-white border rounded-xl pl-4 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                      fieldErrors.confirmPassword
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/15 bg-red-50/10'
                        : 'border-slate-200 hover:border-slate-300 focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              {/* Terms Checkbox */}
              <div className="pt-1.5">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 select-none">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={(e) => handleChange('agreeTerms', e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-[#003b2b] focus:ring-[#003b2b] border-slate-300 accent-[#003b2b]"
                  />
                  <span>
                    Tôi đồng ý với{' '}
                    <Link to="/terms" className="text-slate-900 font-bold underline hover:text-[#003b2b]">
                      Điều khoản dịch vụ
                    </Link>{' '}
                    và{' '}
                    <Link to="/privacy" className="text-slate-900 font-bold underline hover:text-[#003b2b]">
                      Chính sách bảo mật
                    </Link>{' '}
                    của HUKI.
                  </span>
                </label>
                {fieldErrors.agreeTerms && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.agreeTerms}</p>
                )}
              </div>

              {/* Submit Button (CTA in Sentence Case) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#003B2B] hover:bg-[#00281d] active:scale-[0.99] text-white rounded-xl text-sm font-semibold tracking-wide transition-all shadow-md shadow-[#003B2B]/15 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Đang xử lý đăng ký...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">person_add</span>
                      <span>Đăng ký &amp; nhận mã OTP</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Social Divider & Google Button */}
            <div className="mt-6">
              <div className="relative flex items-center justify-center mb-3.5">
                <div className="border-t border-slate-200 w-full"></div>
                <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 absolute">
                  Hoặc đăng ký nhanh với
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  showToast({
                    title: 'Google OAuth',
                    message: 'Tính năng Đăng ký bằng Google đang sẵn sàng kết nối.',
                    type: 'info',
                  });
                }}
                className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all cursor-pointer shadow-2xs active:scale-[0.99]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Đăng ký bằng tài khoản Google</span>
              </button>
            </div>
          </div>

          {/* Footer: Bottom Links */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Đã có tài khoản?{' '}
              <Link to="/login" className="font-bold text-[#003b2b] hover:underline">
                Đăng nhập ngay
              </Link>
            </div>
            <Link
              to="/seller/register"
              className="font-bold text-[#ac2c19] hover:underline inline-flex items-center gap-1.5"
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
