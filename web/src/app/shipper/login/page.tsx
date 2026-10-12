"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { playChatChimeSound } from '@/ui/utils/chatSound';

export default function ShipperLoginPage() {
  const router = useRouter();
  const { user, isLoggedIn, login, logout, isLoading } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isShipper = Boolean(
    user?.role === 'DELIVERY_STAFF' ||
    user?.role === 'SHIPPER' ||
    (user as any)?.role === 'DELIVERY_STAFF' ||
    (user as any)?.role === 'SHIPPER' ||
    user?.role === 'PLATFORM_ADMIN'
  );

  // Auto redirect if already logged in as shipper
  useEffect(() => {
    if (!isLoading && isLoggedIn && isShipper) {
      router.replace('/shipper');
    }
  }, [isLoading, isLoggedIn, isShipper, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ Email và Mật khẩu bưu tá');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await login(email.trim(), password.trim());

      if (res.success && res.user) {
        const role = String(res.user.role || '').toUpperCase();
        const validShipper =
          role === 'DELIVERY_STAFF' ||
          role === 'SHIPPER' ||
          role === 'PLATFORM_ADMIN';

        if (validShipper) {
          playChatChimeSound();
          showToast({
            title: 'Vào ca thành công!',
            message: `Chào mừng ${res.user.fullName || res.user.name || 'Bưu tá'} đã bắt đầu ca làm việc.`,
            type: 'success',
            duration: 4000,
          });
          router.replace('/shipper');
        } else {
          setErrorMessage(
            `Tài khoản này (${res.user.email}) có vai trò là [${role}], không thuộc đội ngũ Bưu tá HuKi Express.`
          );
          showToast({
            title: 'Quyền truy cập bị từ chối',
            message: 'Tài khoản không phải là Bưu tá HuKi Express (Cách A)',
            type: 'warning',
            duration: 5000,
          });
        }
      } else {
        setErrorMessage(res.error || 'Email hoặc Mật khẩu không chính xác');
        showToast(res.error || 'Đăng nhập không thành công', 'error');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi kết nối máy chủ xác thực');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = () => {
    setEmail('shipper@huki.vn');
    setPassword('Password123!');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c1815] via-[#102420] to-[#091412] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden selection:bg-[#003B2B] selection:text-white">
      {/* Background Graphic Effects */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#00875A]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 max-w-5xl mx-auto w-full flex items-center justify-between pb-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#003B2B] to-[#00875A] border border-emerald-400/30 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[24px] text-white">electric_moped</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-editorial text-xl font-black tracking-tight text-white leading-none">
                HUKI EXPRESS
              </span>
              <span className="bg-amber-400 text-zinc-950 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider shadow-xs">
                3PL PARTNER
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-widest text-emerald-400 font-bold mt-0.5">
              Cổng Vận Hành Giao Hàng Bưu Tá
            </span>
          </div>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white hover:bg-white/5 px-3 py-1.5 rounded-full border border-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">home</span>
          <span className="hidden sm:inline">Về Sàn HuKi</span>
        </Link>
      </header>

      {/* Main Form Center */}
      <main className="relative z-10 max-w-md mx-auto w-full my-8">
        {/* If logged in with non-shipper account */}
        {isLoggedIn && !isShipper && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs flex flex-col gap-2.5 shadow-xl">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <span>Đang đăng nhập bằng tài khoản không phù hợp</span>
            </div>
            <p className="text-white/80 leading-relaxed">
              Bạn đang đăng nhập bằng tài khoản <strong>{user?.email}</strong> (Vai trò: <em>{user?.role}</em>). Cổng này chỉ dành riêng cho Bưu tá HuKi Express (Cách A).
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => logout()}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Đăng Xuất Để Đổi Tài Khoản
              </button>
              <Link
                href="/"
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg text-xs transition-colors"
              >
                Về Trang Mua Sách
              </Link>
            </div>
          </div>
        )}

        <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#003B2B] to-[#00875A] border border-emerald-400/40 shadow-xl mb-3">
              <span className="material-symbols-outlined text-[32px] text-emerald-200">badge</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Đăng Nhập Ca Làm Việc</h1>
            <p className="text-xs text-white/60 mt-1">
              Nhập tài khoản Bưu tá HuKi Express được Sàn cấp để nhận đơn và giao sách
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-rose-400 shrink-0">error</span>
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                Email Bưu Tá
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-[18px]">
                  mail
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="shipper@huki.vn"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
                Mật Khẩu
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-[18px]">
                  key
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#00875A] to-[#005a3c] hover:from-[#00a36d] hover:to-[#00704b] text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-950/50 hover:shadow-emerald-900/80 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang Xác Thực Ca...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[19px]">login</span>
                  <span>Vào Ca Giao Hàng</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Button (Cách A) */}
          <div className="mt-5 pt-5 border-t border-white/10 text-center">
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-[11px] text-amber-300 hover:text-amber-200 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 px-3.5 py-1.5 rounded-full transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
              <span>Điền tài khoản mẫu Admin cấp: shipper@huki.vn</span>
            </button>
          </div>
        </div>

        {/* Operating policy notice (Cách A) */}
        <div className="mt-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-white/60 leading-relaxed flex items-start gap-2.5">
          <span className="material-symbols-outlined text-emerald-400 text-[18px] shrink-0 mt-0.5">verified_user</span>
          <p>
            <strong>Chính Sách Cấp Tài Khoản Bưu Tá (Cách A):</strong> Tài khoản Bưu tá HuKi Express được tạo và gán trực tiếp bởi Ban Quản Trị Hệ Thống Sàn. Bưu tá nhận thông tin ca làm việc để đối soát nợ COD và tiền công.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-5xl mx-auto w-full text-center text-xs text-white/40 pt-4 border-t border-white/5">
        &copy; {new Date().getFullYear()} HuKi Express Logistics &bull; Nền tảng giao nhận sách chuyên nghiệp &bull; Hotline điều phối: 1900 6868
      </footer>
    </div>
  );
}
