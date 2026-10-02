"use client";

import React, { useState } from 'react';
import CustomModal from '@/ui/components/common/CustomModal';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { useRouter } from 'next/navigation';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTarget?: string;
}

const PRESET_GOOGLE_ACCOUNTS = [
  {
    email: 'huynhgiahuy@gmail.com',
    name: 'Huỳnh Gia Huy',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    type: 'Tài khoản cá nhân',
  },
  {
    email: 'reader.huki@gmail.com',
    name: 'Độc Giả Tri Thức HUKI',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
    type: 'Tài khoản độc giả',
  },
];

export default function GoogleAuthModal({ isOpen, onClose, redirectTarget = '/' }: GoogleAuthModalProps) {
  const { loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [isCustomEmail, setIsCustomEmail] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);

  const handleSelectAccount = async (account: { email: string; name: string; avatar?: string }) => {
    setLoadingEmail(account.email);
    try {
      const res = await loginWithGoogle({
        email: account.email,
        fullName: account.name,
        avatar: account.avatar,
      });

      if (res.success && res.user) {
        showToast({
          title: 'Đăng nhập Google thành công',
          message: `Chào mừng ${account.name} đến với HUKI EBOOK!`,
          type: 'success',
        });
        onClose();

        const rawTarget = redirectTarget || '/';
        if (res.user.role === 'PLATFORM_ADMIN') {
          router.push('/admin');
        } else if (res.user.role === 'BUSINESS') {
          router.push('/seller/dashboard');
        } else if (!res.user.hasCompletedOnboarding) {
          router.push('/onboarding');
        } else {
          router.push(rawTarget);
        }
      } else {
        showToast({
          title: 'Đăng nhập Google thất bại',
          message: res.error || 'Vui lòng thử lại sau.',
          type: 'error',
        });
      }
    } catch (err: any) {
      showToast({
        title: 'Lỗi xác thực Google',
        message: err?.message || 'Có lỗi xảy ra trong quá trình xác thực.',
        type: 'error',
      });
    } finally {
      setLoadingEmail(null);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customEmail.includes('@')) {
      showToast({
        title: 'Email không hợp lệ',
        message: 'Vui lòng nhập địa chỉ email Google hợp lệ (@gmail.com).',
        type: 'error',
      });
      return;
    }
    const name = customName.trim() || customEmail.split('@')[0];
    handleSelectAccount({
      email: customEmail.trim(),
      name,
    });
  };

  return (
    <CustomModal isOpen={isOpen} onClose={onClose} size="md" title="">
      <div className="p-6 flex flex-col items-center text-center">
        {/* Google Logo Header */}
        <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 shadow-2xs">
          <svg className="w-6 h-6" viewBox="0 0 24 24">
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
        </div>

        <h3 className="text-base font-bold text-slate-900 tracking-tight">Đăng nhập bằng tài khoản Google</h3>
        <p className="text-xs text-slate-500 mt-1 mb-5">
          để tiếp tục truy cập sàn sách điện tử <strong>HUKI EBOOK</strong>
        </p>

        {!isCustomEmail ? (
          <div className="w-full flex flex-col gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-left px-1">
              Chọn tài khoản của bạn:
            </span>

            {PRESET_GOOGLE_ACCOUNTS.map((acc) => {
              const isSelected = loadingEmail === acc.email;
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectAccount(acc)}
                  disabled={Boolean(loadingEmail)}
                  className="w-full p-3 rounded-2xl border border-slate-200 hover:border-[#003B2B] hover:bg-emerald-50/30 flex items-center justify-between gap-3 transition-all cursor-pointer group text-left disabled:opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <img src={acc.avatar} alt={acc.name} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#003B2B] transition-colors">
                        {acc.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{acc.email}</div>
                    </div>
                  </div>

                  {isSelected ? (
                    <span className="inline-block w-4 h-4 border-2 border-[#003B2B]/30 border-t-[#003B2B] rounded-full animate-spin shrink-0"></span>
                  ) : (
                    <span className="text-[10px] text-slate-400 group-hover:text-[#003B2B] font-semibold">
                      {acc.type}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Custom Account Button */}
            <button
              type="button"
              onClick={() => setIsCustomEmail(true)}
              className="w-full p-3 rounded-2xl border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 flex items-center gap-3 text-left transition-colors cursor-pointer mt-1"
            >
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <span className="material-symbols-outlined text-[18px]">person_add</span>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Sử dụng một tài khoản khác</div>
                <div className="text-[11px] text-slate-400">Nhập email Google của bạn</div>
              </div>
            </button>
          </div>
        ) : (
          <form onSubmit={handleCustomSubmit} className="w-full flex flex-col gap-3 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Địa chỉ Gmail Google:
              </label>
              <input
                type="email"
                required
                placeholder="vidu@gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:outline-none focus:border-[#003B2B] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Họ và tên hiển thị:
              </label>
              <input
                type="text"
                placeholder="Tên của bạn..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:outline-none focus:border-[#003B2B] focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setIsCustomEmail(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                ← Quay lại danh sách
              </button>

              <button
                type="submit"
                disabled={Boolean(loadingEmail)}
                className="px-5 py-2 rounded-xl bg-[#003B2B] hover:bg-[#00281d] text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {loadingEmail ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Đang đăng nhập...</span>
                  </>
                ) : (
                  <span>Tiếp tục đăng nhập</span>
                )}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-3 border-t border-slate-100 text-[10.5px] text-slate-400">
          Khi tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của HUKI EBOOK.
        </div>
      </div>
    </CustomModal>
  );
}
