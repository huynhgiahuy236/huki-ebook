import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, login } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'Chưa nhập', color: 'bg-gray-200' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: 'Yếu', color: 'bg-red-500' };
      case 2:
        return { score: 50, label: 'Trung bình', color: 'bg-yellow-500' };
      case 3:
        return { score: 75, label: 'Khá mạnh', color: 'bg-blue-500' };
      case 4:
        return { score: 100, label: 'Rất an toàn', color: 'bg-[#006953]' };
      default:
        return { score: 15, label: 'Quá ngắn', color: 'bg-red-400' };
    }
  };

  const strength = getPasswordStrength(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsLoading(true);
    const regRes = await register({
      fullName: formData.name.trim() || 'Người Dùng HuKi',
      email: formData.email.trim(),
      password: formData.password,
      phone: formData.phone.trim() || undefined,
    });

    if (regRes.success) {
      showToast('Đăng ký tài khoản thành công! Đang tự động đăng nhập...', 'success');
      // Auto-login immediately into the session
      const loginRes = await login(formData.email.trim(), formData.password);
      setIsLoading(false);

      if (loginRes.success) {
        navigate('/onboarding/preferences');
      } else {
        navigate('/login');
      }
    } else {
      setIsLoading(false);
      showToast(regRes.error || 'Đăng ký không thành công.', 'error');
    }
  };

  return (
    <div id="main-content" tabIndex="-1" className="min-h-dvh w-full bg-white outline-none">
      <div className="grid min-h-dvh w-full grid-cols-1 overflow-hidden bg-white lg:grid-cols-12">
        
        {/* Left Column: Brand & Value Proposition (5 cols) */}
        <div
          className="relative hidden min-h-dvh flex-col justify-between overflow-hidden p-10 text-white lg:col-span-5 lg:flex xl:p-14 2xl:p-20"
          style={{ background: 'linear-gradient(to bottom right, var(--theme-hero-from, #003B2B), var(--theme-hero-via, #002f22), var(--theme-hero-to, #001f17))' }}
        >
          {/* Background Ambient Blur */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#94f5d6]/10 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-[#ac2c19]/15 blur-3xl pointer-events-none"></div>

          {/* Top: Logo & Title */}
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-3 group mb-6">
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

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ac2c19]/20 border border-[#ac2c19]/40 text-[#ffa394] text-xs font-bold mb-4">
              <span className="material-symbols-outlined text-sm text-[#fea619]">card_giftcard</span>
              <span>Gói Quà Chào Mừng 150.000đ</span>
            </div>

            <h1 className="font-editorial text-2xl sm:text-3xl font-bold leading-snug mb-3">
              Gia nhập cộng đồng <span className="text-[#94f5d6] italic">độc giả tinh hoa</span> HUKI.
            </h1>
            <p className="text-white/80 text-xs sm:text-sm leading-relaxed font-light mb-8">
              Đọc sách bản quyền không giới hạn, đồng bộ đa thiết bị và tích lũy HUKI Xu đổi quà giá trị.
            </p>

            {/* Perks Overview */}
            <div className="space-y-3 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#94f5d6] mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">stars</span>
                <span>Quyền Lợi Độc Quyền Thành Viên</span>
              </div>
              {[
                { icon: 'redeem', title: 'Voucher 50.000đ', desc: 'Áp dụng cho đơn hàng đầu tiên' },
                { icon: 'savings', title: 'Tặng 100 HuKi Xu', desc: 'Tích lũy chiết khấu khi mua sách' },
                { icon: 'devices', title: 'Bảo mật DRM 5 thiết bị', desc: 'Đồng bộ tiến độ đọc tức thì' },
              ].map((perk, pIdx) => (
                <div key={pIdx} className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-lg bg-[#006953] text-[#94f5d6] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-sm">{perk.icon}</span>
                  </div>
                  <div>
                    <div className="font-bold text-white leading-tight">{perk.title}</div>
                    <div className="text-[10px] text-white/60">{perk.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Left: Trust Badges */}
          <div className="relative z-10 pt-6 border-t border-white/15 text-xs text-white/70 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#94f5d6] text-sm">verified_user</span>
              <span>Bảo vệ quyền tác giả DRM</span>
            </span>
            <span className="font-semibold text-white/90">Miễn Phí 100%</span>
          </div>
        </div>

        {/* Right Column: 1-Step Registration Form (7 cols) */}
        <div className="flex min-h-dvh flex-col justify-between bg-white px-5 py-8 sm:px-10 sm:py-10 lg:col-span-7 lg:px-14 lg:py-12 xl:px-20 2xl:px-28">
          <div>
            
            {/* Header: Title & Switch to Login */}
            <div className="flex items-start justify-between mb-6 pb-4 border-b border-[#e8e5df]">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold font-editorial text-[#17201f]">
                  Đăng Ký Tài Khoản
                </h2>
                <p className="text-xs sm:text-sm text-[#6b7280] mt-1">
                  Tạo tài khoản đọc sách bản quyền HUKI chỉ với 1 phút
                </p>
              </div>
              <Link
                to="/login"
                className="text-xs font-bold text-[#ac2c19] hover:text-[#8e1404] hover:underline shrink-0 pt-1"
              >
                Đã có tài khoản?
              </Link>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#17201f] mb-1">
                    Họ và tên của bạn <span className="text-[#ac2c19]">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-[#6b7280] text-lg pointer-events-none">
                      person
                    </span>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nguyễn Văn An"
                      className="w-full bg-[#fbf9f4] border border-[#e8e5df] rounded-2xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-[#17201f] focus:bg-white focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#17201f] mb-1">
                    Số điện thoại
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-[#6b7280] text-lg pointer-events-none">
                      call
                    </span>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0912 345 678"
                      className="w-full bg-[#fbf9f4] border border-[#e8e5df] rounded-2xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-[#17201f] focus:bg-white focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17201f] mb-1">
                  Địa chỉ Email <span className="text-[#ac2c19]">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-[#6b7280] text-lg pointer-events-none">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nguyenvanan@gmail.com"
                    className="w-full bg-[#fbf9f4] border border-[#e8e5df] rounded-2xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-[#17201f] focus:bg-white focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#17201f] mb-1">
                    Mật khẩu <span className="text-[#ac2c19]">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-[#6b7280] text-lg pointer-events-none">
                      lock
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Tối thiểu 6 ký tự..."
                      className="w-full bg-[#fbf9f4] border border-[#e8e5df] rounded-2xl pl-9 pr-9 py-2.5 text-xs sm:text-sm text-[#17201f] focus:bg-white focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-[#6b7280] hover:text-[#17201f]"
                    >
                      <span className="material-symbols-outlined text-base">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#17201f] mb-1">
                    Xác nhận mật khẩu <span className="text-[#ac2c19]">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-[#6b7280] text-lg pointer-events-none">
                      verified_user
                    </span>
                    <input
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Nhập lại mật khẩu..."
                      className="w-full bg-[#fbf9f4] border border-[#e8e5df] rounded-2xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-[#17201f] focus:bg-white focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Password strength meter */}
              {formData.password && (
                <div className="p-2.5 rounded-xl bg-[#f8f6f1] border border-[#e8e5df]">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-[#6b7280]">Độ an toàn mật khẩu:</span>
                    <span className="font-bold text-[#17201f]">{strength.label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all duration-300`}
                      style={{ width: `${strength.score}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer text-xs text-[#17201f]">
                  <input
                    type="checkbox"
                    checked={formData.agreeTerms}
                    onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded text-[#003b2b] focus:ring-[#003b2b] border-[#e8e5df]"
                  />
                  <span>
                    Tôi đồng ý với <a href="#" className="underline text-[#003b2b] font-semibold">Điều khoản sử dụng</a> và <a href="#" className="underline text-[#003b2b] font-semibold">Chính sách bảo mật DRM</a> của HUKI.
                  </span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#003b2b] text-white py-3.5 rounded-2xl text-xs sm:text-sm font-bold hover:bg-[#00523c] active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Đang tạo tài khoản &amp; đăng nhập...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">person_add</span>
                      <span>Tạo Tài Khoản &amp; Đăng Nhập Ngay</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Social Sign up footer */}
          <div className="mt-6 pt-4 border-t border-[#e8e5df]">
            <div className="text-center text-[11px] text-[#6b7280] mb-3">
              Hoặc đăng ký nhanh bằng tài khoản mạng xã hội
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  register({ name: 'Độc giả Google', email: 'google.user@gmail.com' });
                  showToast('Đăng ký tài khoản bằng Google thành công!', 'success');
                  navigate('/');
                }}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#e8e5df] hover:bg-[#fbf9f4] text-xs font-semibold text-[#17201f]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  register({ name: 'Độc giả Apple', email: 'apple.user@icloud.com' });
                  showToast('Đăng ký tài khoản bằng Apple ID thành công!', 'success');
                  navigate('/');
                }}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#e8e5df] hover:bg-[#fbf9f4] text-xs font-semibold text-[#17201f]"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.58.66-1.09 1.74-.95 2.76.99.08 2.05-.51 2.68-1.26z" />
                </svg>
                <span>Apple ID</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  register({ name: 'Độc giả Facebook', email: 'fb.user@facebook.com' });
                  showToast('Đăng ký tài khoản bằng Facebook thành công!', 'success');
                  navigate('/');
                }}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#e8e5df] hover:bg-[#fbf9f4] text-xs font-semibold text-[#17201f]"
              >
                <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Facebook</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
