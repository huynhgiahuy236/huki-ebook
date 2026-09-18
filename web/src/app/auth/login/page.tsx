"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { loginSchema } from '@/ui/utils/authValidation';
import { formatAuthError } from '@/ui/api/authApi';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateField = (field: string, value: string) => {
    try {
      if (field === 'emailOrPhone') {
        loginSchema.pick({ emailOrPhone: true }).parse({ emailOrPhone: value });
      } else if (field === 'password') {
        loginSchema.pick({ password: true }).parse({ password: value });
      }
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } catch (err: any) {
      const issues = err?.issues || err?.errors || [];
      if (issues[0]?.message) {
        setFieldErrors((prev) => ({
          ...prev,
          [field]: issues[0].message,
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationResult = loginSchema.safeParse({
      emailOrPhone: emailOrPhone.trim(),
      password,
      rememberMe,
    });

    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      const issues = validationResult.error?.issues || [];
      issues.forEach((err: any) => {
        const field = err.path[0];
        if (field && !errors[field]) {
          errors[field] = err.message;
        }
      });
      setFieldErrors(errors);
      showToast({
        title: 'Thông tin chưa hợp lệ',
        message: 'Vui lòng kiểm tra lại các trường được báo đỏ.',
        type: 'error',
      });
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    const res = await login(emailOrPhone.trim(), password);
    setIsLoading(false);

    if (res.success && res.user) {
      showToast({
        title: 'Đăng nhập thành công',
        message: `Chào mừng trở lại, ${res.user.fullName || res.user.email}!`,
        type: 'success',
      });

      const rawTarget = searchParams.get('redirect') || searchParams.get('from') || '/';

      if (res.user.mustChangePassword) {
        router.push('/auth/change-password');
      } else if (res.user.role === 'PLATFORM_ADMIN') {
        router.push(rawTarget.startsWith('/admin') ? rawTarget : '/admin');
      } else if (res.user.role === 'BUSINESS' || res.user.hasApprovedBusiness) {
        router.push(rawTarget.startsWith('/seller') ? rawTarget : '/seller/dashboard');
      } else {
        const isRestricted = rawTarget.startsWith('/seller') || rawTarget.startsWith('/admin');
        router.push(isRestricted ? '/' : rawTarget);
      }
    } else {
      const vietnameseError = formatAuthError(res.error);
      showToast({
        title: 'Đăng nhập thất bại',
        message: vietnameseError,
        type: 'error',
      });
    }
  };

  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh w-full bg-white outline-none">
      <div className="grid min-h-dvh w-full grid-cols-1 overflow-hidden bg-white lg:grid-cols-12">
        {/* Left Column: Brand & Editorial Identity */}
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
            <Link href="/" className="inline-flex items-center gap-3.5 group mb-10">
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
              <span className="material-symbols-outlined text-sm">verified</span>
              <span>Bảo vệ bản quyền DRM Tiêu chuẩn</span>
            </div>

            <h1 className="font-editorial text-3xl xl:text-4xl font-bold leading-tight mb-4 text-white">
              Chào mừng bạn <br />
              <span className="text-[#94f5d6] italic">trở lại với HUKI</span>.
            </h1>
            <p className="text-white/80 text-sm leading-relaxed font-light max-w-md mb-8">
              Đăng nhập để tiếp tục khám phá tri thức, đọc sách và quản lý các đơn hàng của bạn.
            </p>

            <div className="space-y-3.5 pt-1">
              <div className="flex items-center gap-3 text-xs sm:text-sm text-white/90">
                <div className="w-6 h-6 rounded-full bg-[#94f5d6]/20 flex items-center justify-center text-[#94f5d6] shrink-0">
                  <span className="material-symbols-outlined text-sm">check</span>
                </div>
                <span>Tủ sách cá nhân &amp; đồng bộ đa thiết bị</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-white/90">
                <div className="w-6 h-6 rounded-full bg-[#94f5d6]/20 flex items-center justify-center text-[#94f5d6] shrink-0">
                  <span className="material-symbols-outlined text-sm">check</span>
                </div>
                <span>Ưu đãi hội viên &amp; tích điểm độc quyền</span>
              </div>
            </div>
          </div>

          {/* Bottom: Stat & Version */}
          <div className="relative z-10 pt-6 border-t border-white/15 text-xs text-white/70 flex items-center justify-between">
            <span>Hơn 45.000+ độc giả tin dùng</span>
            <span className="font-semibold text-white/90">HUKI v2.4</span>
          </div>
        </section>

        {/* Right Column: Authentication Form */}
        <section className="flex min-h-dvh flex-col justify-between bg-white px-6 py-8 sm:px-12 sm:py-10 lg:col-span-7 lg:px-14 xl:px-20 2xl:px-28">
          <div className="max-w-xl mx-auto w-full my-auto py-2">
            {/* Header */}
            <div className="flex items-start justify-between mb-6 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold font-editorial text-slate-900 tracking-tight">
                  Đăng Nhập
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Nhập thông tin tài khoản để tiếp tục
                </p>
              </div>
              <Link
                href="/auth/register"
                className="text-xs font-semibold text-[#003b2b] hover:text-[#00523c] hover:underline shrink-0 pt-1 flex items-center gap-1 transition-colors"
              >
                <span>Chưa có tài khoản?</span>
                <span className="font-bold">Đăng ký</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Email / Phone Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email hoặc Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="emailOrPhone"
                  value={emailOrPhone}
                  onChange={(e) => {
                    setEmailOrPhone(e.target.value);
                    if (fieldErrors.emailOrPhone) validateField('emailOrPhone', e.target.value);
                  }}
                  onBlur={(e) => validateField('emailOrPhone', e.target.value)}
                  placeholder="name@gmail.com hoặc 0912345678"
                  className={`w-full h-12 bg-white border rounded-xl px-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs ${
                    fieldErrors.emailOrPhone
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                      : 'border-slate-200 hover:border-slate-300 focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15'
                  }`}
                />
                {fieldErrors.emailOrPhone && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.emailOrPhone}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs font-semibold text-[#ac2c19] hover:underline"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) validateField('password', e.target.value);
                    }}
                    onBlur={(e) => validateField('password', e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className={`w-full h-12 bg-white border rounded-xl pl-4 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs ${
                      fieldErrors.password
                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                        : 'border-slate-200 hover:border-slate-300 focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
                    aria-label="Ẩn hiện mật khẩu"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.password}</p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#003b2b] focus:ring-[#003b2b] border-slate-300"
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#003B2B] hover:bg-[#00281d] text-white rounded-xl text-sm font-semibold transition-colors duration-200 shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Đang xác thực...</span>
                    </>
                  ) : (
                    <span>Đăng nhập</span>
                  )}
                </button>
              </div>
            </form>

            {/* Social Divider & Google Button */}
            <div className="mt-6">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="shrink-0 mx-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Hoặc đăng nhập với
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <button
                type="button"
                onClick={() => {
                  showToast({
                    title: 'Google OAuth',
                    message: 'Đăng nhập bằng Google đang sẵn sàng.',
                    type: 'info',
                  });
                }}
                className="w-full h-12 flex items-center justify-center gap-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
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
                <span>Đăng nhập bằng tài khoản Google</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Chưa có tài khoản?{' '}
              <Link href="/auth/register" className="font-semibold text-slate-900 hover:text-[#003b2b] hover:underline">
                Đăng ký ngay
              </Link>
            </div>
            <Link
              href="/seller/register"
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <span className="inline-block w-8 h-8 border-3 border-[#003b2b]/20 border-t-[#003b2b] rounded-full animate-spin"></span>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
