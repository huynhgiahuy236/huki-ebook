"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';

function ShipperLoginForm() {
  const router = useRouter();
  const { login, user, isLoggedIn } = useAuth();
  const { showToast } = useToast();

  const [identifier, setIdentifier] = useState('shipper@huki.vn');
  const [password, setPassword] = useState('Password123!@#');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isLoggedIn && (user?.role === 'DELIVERY_STAFF' || user?.role === 'SHIPPER' || user?.role === 'PLATFORM_ADMIN')) {
      router.replace('/shipper');
    }
  }, [isLoggedIn, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg('Vui lòng nhập Mã bưu tá hoặc Số điện thoại/Email.');
      return;
    }
    if (!password) {
      setErrorMsg('Vui lòng nhập mật khẩu ca trực.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Map shipper staff code shorthand if entered like NV-01 or SH-01
      let loginIdentifier = identifier.trim();
      if (loginIdentifier.toUpperCase().startsWith('NV-') || loginIdentifier.toUpperCase().startsWith('SH-')) {
        loginIdentifier = 'shipper@huki.vn';
      }

      await login(loginIdentifier, password);
      showToast?.('Đăng nhập cổng bưu tá HUKI Express thành công!', 'success');
      router.replace('/shipper');
    } catch (err: any) {
      const msg = err?.message || 'Thông tin đăng nhập bưu tá không chính xác.';
      setErrorMsg(msg);
      showToast?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F7F4] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#CCE4DB] shadow-lg p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-2 mb-1">
            <div className="w-11 h-11 rounded-2xl bg-[#003B2B] text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-2xl">local_shipping</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="font-editorial text-2xl font-black tracking-tight text-[#003B2B]">
              HUKI EBOOK
            </span>
            <span className="bg-[#00875A] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
              EXPRESS
            </span>
          </div>
          <h1 className="text-base font-bold text-gray-900">
            Cổng Đăng Nhập Bưu Tá Giao Sách
          </h1>
          <p className="text-xs text-gray-500">
            Dành riêng cho Đội ngũ giao vận &amp; Điều phối viên thực địa
          </p>
        </div>

        {/* Warning Banner */}
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <span className="material-symbols-outlined text-base text-amber-600 mt-0.5 shrink-0">info</span>
          <div className="leading-relaxed">
            <strong>Khu vực hạn chế:</strong> Cổng này chỉ dành cho tài khoản <code>DELIVERY_STAFF</code>. Độc giả mua sách vui lòng đăng nhập tại <Link href="/auth/login" className="underline font-bold text-[#003B2B]">Cổng Độc Giả</Link>.
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Mã Bưu Tá / SĐT / Email Tài Xế:
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                badge
              </span>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="VD: SH-8824, 0912345678, shipper@huki.vn"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#00875A] text-xs font-medium text-gray-900 bg-gray-50/50 focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Mật Khẩu Ca Trực:
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#00875A] text-xs font-medium text-gray-900 bg-gray-50/50 focus:bg-white transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Demo Fill Buttons */}
          <div className="pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Tài khoản bưu tá kiểm thử mẫu:
            </span>
            <button
              type="button"
              onClick={() => {
                setIdentifier('shipper@huki.vn');
                setPassword('Password123!@#');
              }}
              className="text-[11px] font-mono font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer w-full text-left flex items-center justify-between"
            >
              <span>🚚 Nguyễn Văn Vận (shipper@huki.vn)</span>
              <span className="text-[10px] text-emerald-600 font-sans">Chọn mẫu</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-[#003B2B] hover:bg-[#00281D] text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-lg">login</span>
            <span>{loading ? 'Đang xác thực ca trực...' : 'Bắt Đầu Ca Giao Hàng'}</span>
          </button>
        </form>

        <div className="text-center pt-2 border-t border-gray-100 text-xs text-gray-500">
          Cần hỗ trợ kỹ thuật thực địa? Hotline điều phối: <strong className="text-gray-900">1900 6868</strong>
        </div>
      </div>
    </div>
  );
}

export default function ShipperLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-gray-400">Đang tải...</div>}>
      <ShipperLoginForm />
    </Suspense>
  );
}
