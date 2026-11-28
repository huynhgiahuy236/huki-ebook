"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/ui/context/ToastContext';
import { authApi, formatAuthError } from '@/ui/api/authApi';
import { resetPasswordSchema } from '@/ui/utils/authValidation';
import { AuthEditorialPanel } from '@/components/auth/AuthEditorialPanel';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const targetEmail = searchParams.get('email') || '';
  const initialOtp = searchParams.get('otp') || '';

  const [formData, setFormData] = useState({
    otp: initialOtp,
    newPassword: '',
    confirmNewPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOtpField, setShowOtpField] = useState(!initialOtp);
  const [isLoading, setIsLoading] = useState(false);

  const validateSingleField = (field: string, value: string) => {
    try {
      const dataToValidate = { ...formData, [field]: value };
      resetPasswordSchema.parse(dataToValidate);
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        if (field === 'newPassword' || field === 'confirmNewPassword') {
          delete next.confirmNewPassword;
        }
        return next;
      });
    } catch (err: any) {
      const issues = err?.issues || err?.errors || [];
      const fieldError = issues.find((e: any) => e.path[0] === field);
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

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (fieldErrors[field]) {
        validateSingleField(field, value);
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationResult = resetPasswordSchema.safeParse(formData);

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

    const res = await authApi.resetPassword(formData.otp.trim(), formData.newPassword);
    setIsLoading(false);

    if (res.success) {
      showToast({
        title: 'Đặt lại mật khẩu thành công',
        message: 'Mật khẩu mới đã được cập nhật. Vui lòng đăng nhập lại.',
        type: 'success',
      });
      router.push('/auth/login');
    } else {
      const vietnameseError = formatAuthError(res.error);
      showToast({
        title: 'Đặt lại mật khẩu thất bại',
        message: vietnameseError,
        type: 'error',
      });
    }
  };

  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh w-full bg-white outline-none">
      <div className="grid min-h-dvh w-full grid-cols-1 overflow-hidden bg-white lg:grid-cols-12">
        {/* Left Column: Brand & Security Standards (5 cols) */}
        <AuthEditorialPanel
          eyebrow="Bảo mật chuẩn Bcrypt"
          titleLine1="Thiết lập mật khẩu"
          titleAccent="bảo mật tối đa."
          description="Mật khẩu mới cần đáp ứng các tiêu chuẩn bảo mật an toàn để bảo vệ tối đa tủ sách và quyền lợi độc giả của bạn."
          highlights={[
            'Mã hóa mật khẩu chuẩn Bcrypt an toàn cao',
            'Tự động đồng bộ bảo mật trên toàn bộ thiết bị',
          ]}
        />

        {/* Right Column: Reset Form (7 cols) */}
        <section className="flex min-h-dvh flex-col justify-between bg-white px-6 py-8 sm:px-12 sm:py-10 lg:col-span-7 lg:px-14 xl:px-20 2xl:px-28">
          <div className="max-w-xl mx-auto w-full my-auto py-2">
            {/* Header */}
            <div className="flex items-start justify-between mb-6 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold font-editorial text-slate-900 tracking-tight">
                  Tạo Mật Khẩu Mới
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {targetEmail ? `Tài khoản: ${targetEmail}` : 'Nhập mật khẩu mới cho tài khoản của bạn'}
                </p>
              </div>
              <Link
                href="/auth/login"
                className="text-xs font-semibold text-[#003b2b] hover:text-[#00523c] hover:underline shrink-0 pt-1 flex items-center gap-1 transition-colors"
              >
                <span>Đăng nhập</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* OTP Confirmation Pill / Input */}
              {formData.otp && !showOtpField ? (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-emerald-600">verified</span>
                    <span className="text-slate-700">
                      Mã xác thực OTP: <strong className="font-mono font-bold text-emerald-800">{formData.otp}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOtpField(true)}
                    className="text-xs font-semibold text-[#003b2b] hover:underline cursor-pointer"
                  >
                    Thay đổi
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mã xác thực OTP (6 số) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="otp"
                    maxLength={6}
                    value={formData.otp}
                    onChange={(e) => handleChange('otp', e.target.value)}
                    onBlur={(e) => validateSingleField('otp', e.target.value)}
                    placeholder="123456"
                    className={`w-full h-12 bg-white border rounded-xl px-4 text-sm font-mono tracking-widest text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs ${
                      fieldErrors.otp
                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                        : 'border-slate-200 hover:border-slate-300 focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15'
                    }`}
                  />
                  {fieldErrors.otp && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.otp}</p>
                  )}
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="newPassword"
                    value={formData.newPassword}
                    onChange={(e) => handleChange('newPassword', e.target.value)}
                    onBlur={(e) => validateSingleField('newPassword', e.target.value)}
                    placeholder="Tối thiểu 8 ký tự (hoa, thường, số, ký tự đặc biệt)..."
                    className={`w-full h-12 bg-white border rounded-xl pl-4 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs ${
                      fieldErrors.newPassword
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
                {fieldErrors.newPassword && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.newPassword}</p>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmNewPassword"
                    value={formData.confirmNewPassword}
                    onChange={(e) => handleChange('confirmNewPassword', e.target.value)}
                    onBlur={(e) => validateSingleField('confirmNewPassword', e.target.value)}
                    placeholder="Nhập lại mật khẩu mới..."
                    className={`w-full h-12 bg-white border rounded-xl pl-4 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs ${
                      fieldErrors.confirmNewPassword
                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                        : 'border-slate-200 hover:border-slate-300 focus:border-[#003b2b] focus:ring-2 focus:ring-[#003b2b]/15'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
                    aria-label="Ẩn hiện mật khẩu xác nhận"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {fieldErrors.confirmNewPassword && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.confirmNewPassword}</p>
                )}
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
                      <span>Đang cập nhật mật khẩu...</span>
                    </>
                  ) : (
                    <span>Lưu mật khẩu mới &amp; Đăng nhập</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Chưa nhận được mã OTP?{' '}
              <Link href="/auth/forgot-password" className="font-semibold text-slate-900 hover:text-[#003b2b] hover:underline">
                Gửi lại mã mới
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <span className="inline-block w-8 h-8 border-3 border-[#003b2b]/20 border-t-[#003b2b] rounded-full animate-spin"></span>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
