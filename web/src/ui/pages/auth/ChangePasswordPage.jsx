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
      showToast({
        title: 'Đổi mật khẩu thành công',
        message: 'Mật khẩu mới của bạn đã được cập nhật thành công và sẵn sàng sử dụng.',
        type: 'success',
      });
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
      showToast({
        title: 'Đổi mật khẩu không thành công',
        message: errorMsg,
        type: 'error',
      });
    }
  };

  return (
    <main id="main-content" className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#003b2b]/10 text-[#003b2b] flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-2xl">lock_reset</span>
          </div>
          <h1 className="text-2xl font-bold font-editorial text-slate-900 tracking-tight">
            {user?.mustChangePassword ? 'Đổi Mật Khẩu Lần Đầu' : 'Đổi Mật Khẩu Tài Khoản'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {user?.mustChangePassword
              ? 'Tài khoản của bạn vừa được cấp mới. Vui lòng thiết lập mật khẩu riêng để tiếp tục.'
              : 'Nhập mật khẩu hiện tại và mật khẩu mới của bạn.'}
          </p>
        </div>

        {serverError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mật khẩu hiện tại (hoặc mật khẩu tạm thời) <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                onBlur={() => handleBlur('currentPassword')}
                placeholder="Nhập mật khẩu hiện tại..."
                className={`w-full h-12 bg-white border rounded-xl pl-4 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs ${
                  touched.currentPassword && errors.currentPassword
                    ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                    : 'border-slate-200 hover:border-slate-300 focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3.5 text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mật khẩu mới <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onBlur={() => handleBlur('newPassword')}
                placeholder="Tối thiểu 8 ký tự..."
                className={`w-full h-12 bg-white border rounded-xl pl-4 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs ${
                  touched.newPassword && errors.newPassword
                    ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                    : 'border-slate-200 hover:border-slate-300 focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3.5 text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Xác nhận mật khẩu mới <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => handleBlur('confirmPassword')}
                placeholder="Nhập lại mật khẩu mới..."
                className={`w-full h-12 bg-white border rounded-xl pl-4 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs ${
                  touched.confirmPassword && errors.confirmPassword
                    ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                    : 'border-slate-200 hover:border-slate-300 focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3.5 text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#003B2B] hover:bg-[#00281d] text-white rounded-xl text-sm font-semibold transition-colors duration-200 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Đang cập nhật...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">published_with_changes</span>
                  <span>Cập nhật mật khẩu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
