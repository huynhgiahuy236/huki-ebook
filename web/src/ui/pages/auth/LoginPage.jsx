import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, authError } = useAuth();
  const { showToast } = useToast();

  const [loginMethod, setLoginMethod] = useState('password'); // 'password' | 'otp' | 'passkey'
  const [emailOrPhone, setEmailOrPhone] = useState(process.env.NODE_ENV === 'development' ? 'user@huki.com' : '');
  const [password, setPassword] = useState(process.env.NODE_ENV === 'development' ? 'User123!' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const redirectPath = location.state?.from || '/';

  const fillCredentials = (email, pass) => {
    setEmailOrPhone(email);
    setPassword(pass);
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!emailOrPhone.trim()) {
      const msg = 'Vui lòng nhập Email hợp lệ!';
      setErrorMessage(msg);
      showToast(msg, 'error');
      return;
    }
    if (loginMethod === 'password' && !password.trim()) {
      const msg = 'Vui lòng nhập mật khẩu tài khoản!';
      setErrorMessage(msg);
      showToast(msg, 'error');
      return;
    }

    setIsSubmitting(true);
    const res = await login(emailOrPhone.trim(), password);
    setIsSubmitting(false);

    if (res.success && res.user) {
      showToast(`Đăng nhập thành công! Chào mừng trở lại, ${res.user.fullName || res.user.email}.`, 'success');
      if (res.user.mustChangePassword) {
        navigate('/change-password');
      } else if (res.user.role === 'PLATFORM_ADMIN') {
        navigate('/admin');
      } else if (res.user.role === 'BUSINESS') {
        navigate(location.state?.from || '/seller/dashboard');
      } else {
        navigate(redirectPath);
      }
    } else {
      const errorMsg = res.error || authError || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      setErrorMessage(errorMsg);
      showToast(errorMsg, 'error');
    }
  };

  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh w-full bg-white outline-none">
      <div className="grid min-h-dvh w-full grid-cols-1 overflow-hidden bg-white lg:grid-cols-12">
        
        {/* Left Column: Brand & Editorial Identity */}
        <section
          className="relative hidden min-h-dvh flex-col justify-between overflow-hidden p-10 text-white lg:col-span-5 lg:flex xl:p-14 2xl:p-20"
          style={{ background: 'linear-gradient(to bottom right, var(--theme-hero-from, #003B2B), var(--theme-hero-via, #002f22), var(--theme-hero-to, #001f17))' }}
        >
          {/* Background Decorative Patterns */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#94f5d6]/10 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-[#ac2c19]/15 blur-3xl pointer-events-none"></div>
          
          {/* Top: Logo & Slogan */}
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
                  Khởi Nguồn Tri Thức Mới
                </span>
              </div>
            </Link>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[#94f5d6] text-xs font-semibold mb-5 backdrop-blur-sm">
              <span className="material-symbols-outlined text-sm">verified_user</span>
              <span>Bảo vệ bản quyền DRM Tiêu chuẩn Quốc Tế</span>
            </div>

            <h1 className="font-editorial text-3xl sm:text-4xl font-bold leading-tight mb-4">
              Khám phá kho tàng <span className="text-[#94f5d6] italic">sách thật &amp; sách số</span> tinh hoa.
            </h1>
            <p className="text-white/80 text-sm leading-relaxed font-light">
              Đồng bộ tủ sách, tiến độ đọc và ghi chú highlight thông minh trên mọi thiết bị máy đọc sách, điện thoại và máy tính.
            </p>
          </div>

          {/* Bottom: Book Quote & Community Stats */}
          <div className="relative z-10 pt-8 border-t border-white/15">
            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 mb-4">
              <p className="text-xs italic text-white/90 leading-relaxed font-editorial">
                "Một cuốn sách hay là một người bạn tốt, một hành trình mở lối tương lai."
              </p>
              <div className="flex items-center justify-between mt-3 text-[11px] text-white/60">
                <span>— James Clear (Tác giả Atomic Habits)</span>
                <div className="flex items-center text-[#fea619]">
                  <span className="material-symbols-outlined text-xs">star</span>
                  <span className="material-symbols-outlined text-xs">star</span>
                  <span className="material-symbols-outlined text-xs">star</span>
                  <span className="material-symbols-outlined text-xs">star</span>
                  <span className="material-symbols-outlined text-xs">star</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-white/70">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#94f5d6] animate-pulse"></span>
                <span>Hơn 45.000+ độc giả hoạt động</span>
              </span>
              <span className="font-semibold text-white/90">v2.4 Live</span>
            </div>
          </div>
        </section>

        {/* Right Column: Authentication Form */}
        <section className="flex min-h-dvh flex-col justify-between bg-white px-5 py-8 sm:px-10 sm:py-10 lg:col-span-7 lg:px-14 lg:py-12 xl:px-20 2xl:px-28">
          <div>
            {/* Header: Title & Switch to Register */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold font-editorial text-[#17201f]">
                  Đăng Nhập Tài Khoản
                </h2>
                <p className="text-xs sm:text-sm text-[#6b7280] mt-1">
                  Chọn phương thức đăng nhập để tiếp tục hành trình đọc sách
                </p>
              </div>
              <Link
                to="/register"
                className="text-xs font-bold text-[#ac2c19] hover:text-[#8e1404] hover:underline shrink-0 pt-1"
              >
                Chưa có tài khoản?
              </Link>
            </div>

            {/* Login Method Tabs */}
            <div className="flex items-center p-1 bg-[#f2fbf9] rounded-2xl border border-[#e8e5df] mb-6">
              <button
                type="button"
                onClick={() => setLoginMethod('password')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  loginMethod === 'password'
                    ? 'bg-white text-[#003b2b] shadow-xs border border-[#e8e5df]'
                    : 'text-[#6b7280] hover:text-[#17201f]'
                }`}
              >
                <span className="material-symbols-outlined text-base">lock</span>
                Mật Khẩu
              </button>
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="Tạm khóa — đăng nhập OTP không thuộc happy case hiện tại"
                className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 text-[#6b7280] opacity-40 cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-base">sms</span>
                Mã OTP SMS
              </button>
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="Tạm khóa — Passkey không thuộc happy case hiện tại"
                className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 text-[#6b7280] opacity-40 cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-base">fingerprint</span>
                Passkey
              </button>
            </div>

            {/* Quick Test Credentials bar (Dev mode) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-5 p-3 bg-[#f8f6f1] rounded-2xl border border-[#e8e5df]">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#684000] mb-2">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-[#fea619]">bolt</span>
                    Chọn tài khoản mẫu Backend để test:
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => fillCredentials('user@huki.com', 'User123!')}
                    className="px-2 py-1.5 rounded-xl bg-white hover:bg-[#003b2b] hover:text-white text-[#003b2b] border border-[#e8e5df] text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <span>User/Buyer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials('business@huki.com', 'Business123!')}
                    className="px-2 py-1.5 rounded-xl bg-white hover:bg-[#ac2c19] hover:text-white text-[#ac2c19] border border-[#e8e5df] text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <span>Business</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials('admin@huki.com', 'Admin123!')}
                    className="px-2 py-1.5 rounded-xl bg-white hover:bg-[#4338ca] hover:text-white text-[#4338ca] border border-[#e8e5df] text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <span>Admin HUKI</span>
                  </button>
                </div>
              </div>
            )}

            {/* Error Message Box */}
            {errorMessage && (
              <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-red-600">error</span>
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email / Phone Field */}
              <div>
                <label className="block text-xs font-bold text-[#17201f] mb-1.5">
                  Email tài khoản
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[#6b7280] text-lg pointer-events-none">
                    mail
                  </span>
                  <input
                    type="text"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    placeholder="user@huki.com hoặc email đăng ký..."
                    className="w-full bg-[#fbf9f4] border border-[#e8e5df] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[#17201f] placeholder-[#9ca3af] focus:bg-white focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Field (when method == password) */}
              {loginMethod === 'password' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#17201f]">
                      Mật khẩu bảo mật
                    </label>
                    <span
                      className="text-xs font-semibold text-[#6b7280] opacity-50 cursor-not-allowed"
                      aria-disabled="true"
                      title="Tạm khóa — khôi phục mật khẩu nâng cao ngoài happy case hiện tại"
                    >
                      Quên mật khẩu? · Tạm khóa
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-[#6b7280] text-lg pointer-events-none">
                      lock
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu..."
                      className="w-full bg-[#fbf9f4] border border-[#e8e5df] rounded-2xl pl-10 pr-11 py-2.5 text-sm text-[#17201f] placeholder-[#9ca3af] focus:bg-white focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-[#6b7280] hover:text-[#17201f] p-1"
                      aria-label="Ẩn hiện mật khẩu"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Remember Me & Terms */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#17201f]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#003b2b] focus:ring-[#003b2b] border-[#e8e5df]"
                  />
                  <span>Duy trì đăng nhập trên thiết bị này</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#003b2b] text-white py-3 rounded-2xl text-sm font-bold hover:bg-[#00523c] active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Đang kết nối Máy chủ API Gateway...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">login</span>
                    <span>Đăng Nhập HUKI</span>
                  </>
                )}
              </button>
            </form>

            {/* Social Logins */}
            <div className="mt-6">
              <div className="relative flex items-center justify-center mb-4">
                <div className="border-t border-[#e8e5df] w-full"></div>
                <span className="bg-white px-3 text-[11px] text-[#6b7280] uppercase tracking-wider font-semibold absolute">
                  Hoặc đăng nhập với
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {/* Google */}
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Tạm khóa — đăng nhập mạng xã hội ngoài happy case hiện tại"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border border-[#e8e5df] text-xs font-semibold text-[#6b7280] opacity-40 cursor-not-allowed"
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
                  <span>Google</span>
                </button>

                {/* Apple */}
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Tạm khóa — đăng nhập mạng xã hội ngoài happy case hiện tại"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border border-[#e8e5df] text-xs font-semibold text-[#6b7280] opacity-40 cursor-not-allowed"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.58.66-1.09 1.74-.95 2.76.99.08 2.05-.51 2.68-1.26z" />
                  </svg>
                  <span>Apple ID</span>
                </button>

                {/* Facebook */}
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Tạm khóa — đăng nhập mạng xã hội ngoài happy case hiện tại"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border border-[#e8e5df] text-xs font-semibold text-[#6b7280] opacity-40 cursor-not-allowed"
                >
                  <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer Terms & Seller link */}
          <div className="mt-8 pt-4 border-t border-[#e8e5df] text-center sm:flex sm:items-center sm:justify-between text-[11px] text-[#6b7280]">
            <p>
              Bằng việc đăng nhập, bạn đồng ý với{' '}
              <a href="#" className="underline text-[#003b2b] font-semibold">Điều khoản HUKI</a>
            </p>
            <Link
              to="/seller/register"
              className="mt-2 sm:mt-0 font-bold text-[#ac2c19] hover:underline flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">storefront</span>
              Đăng ký Nhà Bán Hàng
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
}
