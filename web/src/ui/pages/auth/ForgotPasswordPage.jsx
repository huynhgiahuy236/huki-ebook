import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPassword, setPendingResetTarget } = useAuth();
  const { showToast } = useToast();

  const [channel, setChannel] = useState('email'); // 'email' | 'phone'
  const [inputValue, setInputValue] = useState('nguyenvanan@huki.vn');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) {
      showToast('Vui lòng nhập địa chỉ Email hoặc Số điện thoại!', 'error');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      forgotPassword(inputValue);
      setPendingResetTarget(inputValue);
      setIsLoading(false);
      showToast(`Mã xác thực OTP đã được gửi tới ${inputValue}!`, 'success');
      navigate('/verify-otp');
    }, 600);
  };

  return (
    <div id="main-content" tabIndex="-1" className="min-h-dvh w-full bg-white outline-none">
      <div className="grid min-h-dvh w-full grid-cols-1 overflow-hidden bg-white lg:grid-cols-12">
        
        {/* Left Column: Brand & Security Guarantee (5 cols) */}
        <div
          className="relative hidden min-h-dvh flex-col justify-between overflow-hidden p-10 text-white lg:col-span-5 lg:flex xl:p-14 2xl:p-20"
          style={{ background: 'linear-gradient(to bottom right, var(--theme-hero-from, #003B2B), var(--theme-hero-via, #002f22), var(--theme-hero-to, #001f17))' }}
        >
          <div className="pointer-events-none absolute -right-32 top-24 h-96 w-96 rounded-full border border-[#94f5d6]/20" />
          <div className="pointer-events-none absolute -right-20 top-36 h-72 w-72 rounded-full border border-[#94f5d6]/15" />
          <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-[#ac2c19]/25 blur-3xl" />
          <div className="pointer-events-none absolute inset-y-0 right-16 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />

          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center justify-between">
              <Link to="/" className="group inline-flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/20 bg-white/10 text-[#94f5d6] backdrop-blur-md transition-transform duration-200 group-hover:-rotate-6">
                  <span className="material-symbols-outlined text-2xl" aria-hidden="true">menu_book</span>
                </div>
                <div>
                  <span className="block font-editorial text-2xl font-bold tracking-tight text-white">HUKI EBOOK</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#94f5d6]">Identity recovery</span>
                </div>
              </Link>
              <span className="font-editorial text-6xl font-bold text-white/[0.07] xl:text-8xl" aria-hidden="true">01</span>
            </div>

            <div className="my-auto py-10">
              <div className="relative mb-10 h-48" aria-hidden="true">
                <div className="absolute left-3 top-8 h-36 w-24 -rotate-12 rounded-r-2xl border border-[#94f5d6]/30 bg-[#94f5d6]/10 shadow-2xl backdrop-blur-sm">
                  <span className="absolute left-4 top-5 h-1 w-12 rounded-full bg-[#94f5d6]/60" />
                  <span className="absolute left-4 top-9 h-1 w-8 rounded-full bg-white/30" />
                  <span className="material-symbols-outlined absolute bottom-4 right-4 text-3xl text-[#94f5d6]">auto_stories</span>
                </div>
                <div className="absolute left-24 top-2 flex h-40 w-28 rotate-6 flex-col justify-between rounded-r-2xl border border-white/20 bg-white/[0.08] p-4 shadow-2xl backdrop-blur-md">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#94f5d6]">Your library</span>
                  <span className="font-editorial text-4xl font-bold text-white">•••</span>
                </div>
                <div className="absolute left-48 top-20 flex h-20 w-20 rotate-12 items-center justify-center rounded-[26px] bg-[#fea619] text-[#003b2b] shadow-2xl xl:left-56">
                  <span className="material-symbols-outlined text-4xl">lock_reset</span>
                </div>
                <div className="absolute left-[17rem] top-5 hidden rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/80 xl:block">
                  Secure · Recover · Read
                </div>
              </div>

              <div className="max-w-xl">
                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#94f5d6]/30 bg-[#94f5d6]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#94f5d6]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#94f5d6]" /> Khôi phục an toàn
                </span>
                <h1 className="font-editorial text-4xl font-bold leading-[1.02] tracking-tight text-white xl:text-5xl 2xl:text-6xl">
                  Lạc mật khẩu,<br />
                  <span className="italic text-[#94f5d6]">không lạc mất</span><br />
                  hành trình đọc.
                </h1>
                <p className="mt-5 max-w-md text-sm leading-6 text-white/70">
                  Một mã OTP, ba mươi giây — tủ sách bản quyền và tài sản HUKI Xu sẽ trở lại đúng với bạn.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] items-end gap-6 border-t border-white/15 pt-6">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold text-[#94f5d6]">
                  <span className="material-symbols-outlined text-base" aria-hidden="true">support_agent</span>
                  Cần xác minh thủ công?
                </p>
                <p className="mt-1 text-xs leading-5 text-white/60">Hotline 24/7 · <strong className="text-white">1900 8866</strong></p>
              </div>
              <div className="text-right">
                <span className="material-symbols-outlined text-xl text-[#94f5d6]" aria-hidden="true">verified_user</span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">HUKI Shield</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Form (7 cols) */}
        <div className="flex min-h-dvh flex-col justify-between bg-white px-5 py-8 sm:px-10 sm:py-10 lg:col-span-7 lg:px-14 lg:py-12 xl:px-20 2xl:px-28">
          <div>
            <div className="flex items-start justify-between mb-6 pb-4 border-b border-[#e8e5df]">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold font-editorial text-[#17201f]">
                  Quên Mật Khẩu
                </h2>
                <p className="text-xs sm:text-sm text-[#6b7280] mt-1">
                  Nhập địa chỉ Email hoặc Số điện thoại để nhận mã khôi phục
                </p>
              </div>
              <Link
                to="/login"
                className="text-xs font-bold text-[#003b2b] hover:underline shrink-0 pt-1"
              >
                Nhớ mật khẩu?
              </Link>
            </div>

            {/* Channel selector */}
            <div className="flex items-center p-1 bg-[#f2fbf9] rounded-2xl border border-[#e8e5df] mb-6">
              <button
                type="button"
                onClick={() => {
                  setChannel('email');
                  setInputValue('nguyenvanan@huki.vn');
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  channel === 'email'
                    ? 'bg-white text-[#003b2b] shadow-xs border border-[#e8e5df]'
                    : 'text-[#6b7280] hover:text-[#17201f]'
                }`}
              >
                <span className="material-symbols-outlined text-base">mail</span>
                Nhận qua Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setChannel('phone');
                  setInputValue('0912 345 678');
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  channel === 'phone'
                    ? 'bg-white text-[#003b2b] shadow-xs border border-[#e8e5df]'
                    : 'text-[#6b7280] hover:text-[#17201f]'
                }`}
              >
                <span className="material-symbols-outlined text-base">sms</span>
                Nhận qua SMS / Zalo
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#17201f] mb-1.5">
                  {channel === 'email' ? 'Địa chỉ Email đã đăng ký' : 'Số điện thoại nhận tin nhắn OTP'}
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[#6b7280] text-lg pointer-events-none">
                    {channel === 'email' ? 'alternate_email' : 'phone_iphone'}
                  </span>
                  <input
                    type={channel === 'email' ? 'email' : 'tel'}
                    required
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={channel === 'email' ? 'nguyenvanan@huki.vn' : '0912 345 678'}
                    className="w-full bg-[#fbf9f4] border border-[#e8e5df] rounded-2xl pl-10 pr-4 py-3 text-sm text-[#17201f] focus:bg-white focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Security Notice Box */}
              <div className="p-4 bg-[#f8f6f1] rounded-2xl border border-[#e8e5df] text-xs text-[#684000]">
                <div className="flex items-center gap-1.5 font-bold mb-1.5 text-[#ac2c19]">
                  <span className="material-symbols-outlined text-base">shield</span>
                  <span>Nguyên tắc bảo vệ tài khoản:</span>
                </div>
                <ul className="text-[11px] text-[#17201f]/80 space-y-1 list-disc list-inside">
                  <li>Mã OTP có hiệu lực trong vòng 60 giây và chỉ dùng được 1 lần.</li>
                  <li>Nhân viên HUKI không bao giờ gọi điện yêu cầu cung cấp mã OTP của bạn.</li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#003b2b] text-white py-3.5 rounded-2xl text-sm font-bold hover:bg-[#00523c] active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Đang gửi mã xác thực...</span>
                  </>
                ) : (
                  <>
                    <span>Gửi Mã Xác Thực OTP</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 pt-4 border-t border-[#e8e5df] flex items-center justify-between text-xs">
            <Link to="/login" className="font-bold text-[#003b2b] hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Quay lại Đăng nhập
            </Link>
            <Link to="/register" className="text-[#ac2c19] font-bold hover:underline">
              Tạo tài khoản mới
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
