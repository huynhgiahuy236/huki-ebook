import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { changePassword, user } = useAuth();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [touched, setTouched] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const validateCurrent = (val) => {
    if (!val || !val.trim()) return 'Vui lòng nhập mật khẩu hiện tại.';
    return '';
  };

  const validateNew = (val) => {
    if (!val || !val.trim()) return 'Vui lòng nhập mật khẩu mới.';
    if (val.trim().length < 8) return 'Mật khẩu mới phải từ 8 ký tự trở lên.';
    return '';
  };

  const validateConfirm = (conf, pwd) => {
    if (!conf || !conf.trim()) return 'Vui lòng xác nhận lại mật khẩu mới.';
    if (conf !== pwd) return 'Mật khẩu xác nhận không khớp với mật khẩu mới.';
    return '';
  };

  const errors = {
    currentPassword: validateCurrent(currentPassword),
    newPassword: validateNew(newPassword),
    confirmPassword: validateConfirm(confirmPassword, newPassword),
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setTouched({ currentPassword: true, newPassword: true, confirmPassword: true });

    if (errors.currentPassword || errors.newPassword || errors.confirmPassword) {
      return;
    }

    setIsLoading(true);
    const res = await changePassword(currentPassword.trim(), newPassword.trim());
    setIsLoading(false);

    if (res.success) {
      showToast(
        {
          title: 'Đổi mật khẩu thành công',
          message: 'Mật khẩu mới của bạn đã được cập nhật thành công và sẵn sàng sử dụng.',
        },
        'success'
      );
      if (user?.role === 'BUSINESS' || user?.hasApprovedBusiness || (Array.isArray(user?.memberships) && user.memberships.length > 0)) {
        navigate('/seller/dashboard');
      } else if (user?.role === 'PLATFORM_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } else {
      const errorMsg = res.error?.message || res.error || 'Mật khẩu hiện tại không chính xác hoặc mật khẩu mới chưa đạt chuẩn.';
      setServerError(errorMsg);
      showToast(
        {
          title: 'Đổi mật khẩu không thành công',
          message: errorMsg,
        },
        'error'
      );
    }
  };

  return (
    <main id="main-content" className="min-h-screen bg-[#f2fbf9] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#e8e5df] p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-[#ac2c19]/10 text-[#ac2c19] flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-2xl">key</span>
          </div>
          <h1 className="text-xl font-bold font-editorial text-[#17201f]">
            {user?.mustChangePassword ? 'Yêu Cầu Đổi Mật Khẩu Lần Đầu' : 'Đổi Mật Khẩu Tài Khoản'}
          </h1>
          <p className="text-xs text-[#6b7280] mt-1">
            {user?.mustChangePassword
              ? 'Tài khoản của bạn vừa được cấp mới. Vui lòng thiết lập mật khẩu riêng để tiếp tục.'
              : 'Nhập mật khẩu hiện tại và mật khẩu mới của bạn.'}
          </p>
        </div>

        {serverError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-red-600">error</span>
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#17201f] mb-1">
              Mật khẩu hiện tại (hoặc mật khẩu tạm thời) <span className="text-[#ac2c19]">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                onBlur={() => handleBlur('currentPassword')}
                placeholder="Nhập mật khẩu hiện tại..."
                className={`w-full bg-[#fbf9f4] border ${
                  touched.currentPassword && errors.currentPassword
                    ? 'border-[#ac2c19] ring-2 ring-[#ac2c19]/15 bg-red-50/20'
                    : 'border-[#e8e5df]'
                } rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-[#17201f] focus:outline-none focus:border-[#003b2b]`}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                title={showCurrent ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                <span className="material-symbols-outlined text-lg">
                  {showCurrent ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {touched.currentPassword && errors.currentPassword && (
              <p className="text-[11px] text-[#ac2c19] font-medium mt-1 flex items-center gap-1 animate-fade-in-up">
                <span className="material-symbols-outlined text-[13px]">error</span>
                <span>{errors.currentPassword}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#17201f] mb-1">
              Mật khẩu mới <span className="text-[#ac2c19]">*</span>
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onBlur={() => handleBlur('newPassword')}
                placeholder="Tối thiểu 8 ký tự..."
                className={`w-full bg-[#fbf9f4] border ${
                  touched.newPassword && errors.newPassword
                    ? 'border-[#ac2c19] ring-2 ring-[#ac2c19]/15 bg-red-50/20'
                    : 'border-[#e8e5df]'
                } rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-[#17201f] focus:outline-none focus:border-[#003b2b]`}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                title={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                <span className="material-symbols-outlined text-lg">
                  {showNew ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {touched.newPassword && errors.newPassword && (
              <p className="text-[11px] text-[#ac2c19] font-medium mt-1 flex items-center gap-1 animate-fade-in-up">
                <span className="material-symbols-outlined text-[13px]">error</span>
                <span>{errors.newPassword}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#17201f] mb-1">
              Xác nhận mật khẩu mới <span className="text-[#ac2c19]">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => handleBlur('confirmPassword')}
                placeholder="Nhập lại mật khẩu mới..."
                className={`w-full bg-[#fbf9f4] border ${
                  touched.confirmPassword && errors.confirmPassword
                    ? 'border-[#ac2c19] ring-2 ring-[#ac2c19]/15 bg-red-50/20'
                    : 'border-[#e8e5df]'
                } rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-[#17201f] focus:outline-none focus:border-[#003b2b]`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                title={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                <span className="material-symbols-outlined text-lg">
                  {showConfirm ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {touched.confirmPassword && errors.confirmPassword && (
              <p className="text-[11px] text-[#ac2c19] font-medium mt-1 flex items-center gap-1 animate-fade-in-up">
                <span className="material-symbols-outlined text-[13px]">error</span>
                <span>{errors.confirmPassword}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#003b2b] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#00523c] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-6 shadow-xs"
          >
            {isLoading ? (
              <span>Đang cập nhật...</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">published_with_changes</span>
                <span>Cập Nhật Mật Khẩu</span>
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
