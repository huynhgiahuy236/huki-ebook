import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { resetPassword, login, pendingResetTarget } = useAuth();
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [logoutAllDevices, setLogoutAllDevices] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const criteria = [
    { label: 'Tối thiểu 8 ký tự', met: password.length >= 8 },
    { label: 'Có ít nhất 1 chữ in hoa (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'Có ít nhất 1 chữ số (0-9)', met: /[0-9]/.test(password) },
    { label: 'Có ký tự đặc biệt (!@#$...)', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      showToast('Mật khẩu phải có tối thiểu 6 ký tự!', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Mật khẩu xác nhận không trùng khớp!', 'error');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = resetPassword(password);
      setIsLoading(false);
      if (res.success) {
        setIsSuccess(true);
        showToast('Đặt lại mật khẩu thành công! Mật khẩu mới đã được cập nhật.', 'success');
      } else {
        showToast(res.message, 'error');
      }
    }, 600);
  };

  const handleInstantLogin = () => {
    login(pendingResetTarget || 'nguyenvanan@huki.vn', password);
    showToast('Đã đăng nhập tự động vào tài khoản HUKI!', 'success');
    navigate('/');
  };

  return (
    <div id="main-content" tabIndex="-1" className="min-h-dvh w-full bg-white outline-none">
      <div className="grid min-h-dvh w-full grid-cols-1 overflow-hidden bg-white lg:grid-cols-12">
        
        {/* Left Column: Brand & Security Standards (5 cols) */}
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
                  Bảo Mật Cấp Doanh Nghiệp
                </span>
              </div>
            </Link>

            <div className="w-14 h-14 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 mb-4">
              <span className="material-symbols-outlined text-3xl text-[#94f5d6]">key</span>
            </div>

            <h1 className="font-editorial text-2xl sm:text-3xl font-bold leading-snug mb-3">
              Thiết lập mật khẩu mới <span className="text-[#94f5d6] italic">vững chắc &amp; an toàn</span>.
            </h1>
            <p className="text-white/80 text-xs sm:text-sm leading-relaxed font-light mb-6">
              Mật khẩu mạnh kết hợp chữ hoa, chữ số và ký tự đặc biệt giúp tài khoản của bạn miễn nhiễm trước các hình thức tấn công dò quét tự động.
            </p>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <div className="font-bold text-[#94f5d6] mb-1">Quyền lợi bảo vệ:</div>
              <p className="text-white/80 text-[11px] leading-relaxed">
                Tự động đồng bộ mật khẩu mới và hủy các phiên đăng nhập lạ nếu bạn chọn tùy chọn đăng xuất toàn bộ thiết bị.
              </p>
            </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-white/15 text-xs text-white/70 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#94f5d6] text-sm">verified_user</span>
              <span>Mã hóa AES-256</span>
            </span>
            <span className="font-semibold text-white/90">HUKI Vault</span>
          </div>
        </div>

        {/* Right Column: Password Form or Success (7 cols) */}
        <div className="flex min-h-dvh flex-col justify-between bg-white px-5 py-8 sm:px-10 sm:py-10 lg:col-span-7 lg:px-14 lg:py-12 xl:px-20 2xl:px-28">
          <div>
            {!isSuccess ? (
              <div>
                <div className="flex items-start justify-between mb-6 pb-4 border-b border-[#e8e5df]">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold font-editorial text-[#17201f]">
                      Đặt Lại Mật Khẩu
                    </h2>
                    <p className="text-xs sm:text-sm text-[#6b7280] mt-1">
                      Nhập mật khẩu mới và xác nhận để hoàn tất
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-bold text-[#17201f] mb-1.5">
                      Mật khẩu mới <span className="text-[#ac2c19]">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-[#6b7280] text-lg pointer-events-none">
                        lock
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Nhập mật khẩu mới..."
                        className="w-full bg-[#fbf9f4] border border-[#e8e5df] rounded-2xl pl-10 pr-11 py-2.5 text-sm text-[#17201f] focus:bg-white focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 text-[#6b7280] hover:text-[#17201f]"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-xs font-bold text-[#17201f] mb-1.5">
                      Xác nhận lại mật khẩu mới <span className="text-[#ac2c19]">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-[#6b7280] text-lg pointer-events-none">
                        verified_user
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại chính xác mật khẩu..."
                        className="w-full bg-[#fbf9f4] border border-[#e8e5df] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[#17201f] focus:bg-white focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15 outline-none transition-all"
                      />
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-[11px] text-[#ac2c19] font-semibold mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">error</span>
                        Mật khẩu xác nhận chưa khớp!
                      </p>
                    )}
                  </div>

                  {/* Criteria Checklist */}
                  <div className="p-3.5 bg-[#f8f6f1] rounded-2xl border border-[#e8e5df] space-y-1.5">
                    <div className="text-[11px] font-bold text-[#17201f] mb-1">Tiêu chuẩn mật khẩu an toàn:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {criteria.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span
                            className={`material-symbols-outlined text-sm ${
                              c.met ? 'text-[#006953]' : 'text-gray-400'
                            }`}
                          >
                            {c.met ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          <span className={c.met ? 'text-[#006953] font-semibold' : 'text-[#6b7280]'}>
                            {c.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Security Option */}
                  <div className="pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#17201f]">
                      <input
                        type="checkbox"
                        checked={logoutAllDevices}
                        onChange={(e) => setLogoutAllDevices(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-[#003b2b] focus:ring-[#003b2b] border-[#e8e5df]"
                      />
                      <span>
                        Đăng xuất khỏi tất cả các thiết bị DRM khác để bảo mật tuyệt đối.
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading || !password || password !== confirmPassword}
                    className="w-full bg-[#003b2b] text-white py-3.5 rounded-2xl text-sm font-bold hover:bg-[#00523c] active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Đang cập nhật mật khẩu...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">save</span>
                        <span>Lưu Mật Khẩu Mới &amp; Hoàn Tất</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* Success View */
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#94f5d6]/30 text-[#006953] flex items-center justify-center mx-auto ring-8 ring-[#94f5d6]/10">
                  <span className="material-symbols-outlined text-4xl">check</span>
                </div>

                <div>
                  <h3 className="font-editorial text-2xl font-bold text-[#17201f]">
                    Đổi Mật Khẩu Thành Công!
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6b7280] mt-1 max-w-sm mx-auto">
                    Mật khẩu mới đã được cập nhật thành công cho tài khoản HUKI Ebook của bạn.
                  </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleInstantLogin}
                    className="flex-1 bg-[#003b2b] text-white py-3.5 rounded-2xl text-xs sm:text-sm font-bold hover:bg-[#00523c] transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">auto_stories</span>
                    Vào Đọc Sách Ngay
                  </button>
                  <Link
                    to="/login"
                    className="flex-1 bg-[#fbf9f4] border border-[#e8e5df] text-[#17201f] py-3.5 rounded-2xl text-xs sm:text-sm font-bold hover:bg-white transition-all flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">login</span>
                    Trang Đăng Nhập
                  </Link>
                </div>
              </div>
            )}
          </div>

          {!isSuccess && (
            <div className="mt-8 pt-4 border-t border-[#e8e5df] text-center text-xs">
              <Link to="/login" className="font-bold text-[#ac2c19] hover:underline">
                Hủy &amp; Quay lại Đăng nhập
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
