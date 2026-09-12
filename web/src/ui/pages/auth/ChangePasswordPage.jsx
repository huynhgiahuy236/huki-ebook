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
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [touched, setTouched] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const validateCurrent = (val) => {
    if (!val) return 'Vui lòng nhập mật khẩu hiện tại.';
    return '';
  };

  const validateNew = (val) => {
    if (!val) return 'Vui lòng nhập mật khẩu mới.';
    if (val.length < 8) return 'Mật khẩu mới phải từ 8 ký tự trở lên.';
    return '';
  };

  const validateConfirm = (conf, pwd) => {
    if (!conf) return 'Vui lòng xác nhận lại mật khẩu mới.';
    if (conf !== pwd) return 'Mật khẩu xác nhận không khớp.';
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
    const res = await changePassword(currentPassword, newPassword);
    setIsLoading(false);

    if (res.success) {
      showToast('Đổi mật khẩu thành công! Bạn có thể bắt đầu làm việc.', 'success');
      if (user?.role === 'BUSINESS') {
        navigate('/seller/dashboard');
      } else if (user?.role === 'PLATFORM_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } else {
      setServerError(res.error?.message || 'Đổi mật khẩu không thành công.');
      showToast(res.error?.message || 'Lỗi đổi mật khẩu', 'error');
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
              ? 'Tài khoản của bạn vừa được cấp mới. Vui lòng đổi mật khẩu để tiếp tục.'
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
              Mật khẩu hiện tại <span className="text-[#ac2c19]">*</span>
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setTouched((prev) => ({ ...prev, currentPassword: true }));
              }}
              onBlur={() => handleBlur('currentPassword')}
              placeholder="Nhập mật khẩu hiện tại..."
              className={`w-full bg-[#fbf9f4] border ${
                touched.currentPassword && errors.currentPassword
                  ? 'border-[#ac2c19] ring-2 ring-[#ac2c19]/15 bg-red-50/20'
                  : 'border-[#e8e5df]'
              } rounded-xl px-3.5 py-2.5 text-sm text-[#17201f] focus:outline-none focus:border-[#003b2b]`}
            />
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
            <input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setTouched((prev) => ({ ...prev, newPassword: true }));
              }}
              onBlur={() => handleBlur('newPassword')}
              placeholder="Tối thiểu 8 ký tự (hoa, thường, số, đặc biệt)..."
              className={`w-full bg-[#fbf9f4] border ${
                touched.newPassword && errors.newPassword
                  ? 'border-[#ac2c19] ring-2 ring-[#ac2c19]/15 bg-red-50/20'
                  : 'border-[#e8e5df]'
              } rounded-xl px-3.5 py-2.5 text-sm text-[#17201f] focus:outline-none focus:border-[#003b2b]`}
            />
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
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setTouched((prev) => ({ ...prev, confirmPassword: true }));
              }}
              onBlur={() => handleBlur('confirmPassword')}
              placeholder="Nhập lại mật khẩu mới..."
              className={`w-full bg-[#fbf9f4] border ${
                touched.confirmPassword && errors.confirmPassword
                  ? 'border-[#ac2c19] ring-2 ring-[#ac2c19]/15 bg-red-50/20'
                  : 'border-[#e8e5df]'
              } rounded-xl px-3.5 py-2.5 text-sm text-[#17201f] focus:outline-none focus:border-[#003b2b]`}
            />
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
            className="w-full bg-[#003b2b] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#00523c] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
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
