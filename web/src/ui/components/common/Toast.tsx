'use client';

import React from 'react';
import Link from 'next/link';
import { useToast, ToastMessageState } from '../../context/ToastContext';

interface ToastTheme {
  icon: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  badgeLabel: string;
  progressBarColor: string;
}

const THEMES: Record<string, ToastTheme> = {
  order: {
    icon: 'local_mall',
    iconBg: 'bg-emerald-50 border-emerald-200 text-[#00875A]',
    iconColor: 'text-[#00875A]',
    borderColor: 'border-emerald-200',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeText: 'text-emerald-700',
    badgeLabel: 'Đơn hàng mới',
    progressBarColor: 'bg-[#00875A]',
  },
  system: {
    icon: 'campaign',
    iconBg: 'bg-indigo-50 border-indigo-200 text-indigo-600',
    iconColor: 'text-indigo-600',
    borderColor: 'border-indigo-200',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    badgeText: 'text-indigo-700',
    badgeLabel: 'Thông báo sàn',
    progressBarColor: 'bg-indigo-600',
  },
  finance: {
    icon: 'account_balance_wallet',
    iconBg: 'bg-amber-50 border-amber-200 text-amber-600',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-200',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeText: 'text-amber-700',
    badgeLabel: 'Tài chính',
    progressBarColor: 'bg-amber-500',
  },
  warning: {
    icon: 'warning',
    iconBg: 'bg-amber-50 border-amber-200 text-amber-600',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-200',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeText: 'text-amber-700',
    badgeLabel: 'Cảnh báo',
    progressBarColor: 'bg-amber-500',
  },
  error: {
    icon: 'error',
    iconBg: 'bg-rose-50 border-rose-200 text-rose-600',
    iconColor: 'text-rose-600',
    borderColor: 'border-rose-200',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeText: 'text-rose-700',
    badgeLabel: 'Lỗi',
    progressBarColor: 'bg-rose-500',
  },
  success: {
    icon: 'check_circle',
    iconBg: 'bg-emerald-50 border-emerald-200 text-[#00875A]',
    iconColor: 'text-[#00875A]',
    borderColor: 'border-emerald-200',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeText: 'text-emerald-700',
    badgeLabel: 'Thành công',
    progressBarColor: 'bg-[#00875A]',
  },
  info: {
    icon: 'info',
    iconBg: 'bg-sky-50 border-sky-200 text-sky-600',
    iconColor: 'text-sky-600',
    borderColor: 'border-sky-200',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
    badgeText: 'text-sky-700',
    badgeLabel: 'Thông tin',
    progressBarColor: 'bg-sky-500',
  },
};

function ToastCard({ toast, onDismiss }: { toast: ToastMessageState; onDismiss: (id: string) => void }) {
  const theme = THEMES[toast.type] || THEMES.info;
  const durationSec = (toast.duration || 5000) / 1000;

  return (
    <div
      className={`relative w-full max-w-[380px] bg-white border border-slate-200 rounded-xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.12),0_2px_6px_-1px_rgba(0,0,0,0.06)] p-3.5 overflow-hidden transition-all duration-300 pointer-events-auto hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.16)] ${
        toast.isExiting
          ? 'opacity-0 translate-x-8 scale-95'
          : 'animate-in fade-in-0 slide-in-from-right-6 duration-300'
      }`}
      role="status"
    >
      <div className="flex items-start gap-3">
        {/* Crisp Solid Icon Badge */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${theme.iconBg}`}>
          <span className="material-symbols-outlined text-[18px]">{theme.icon}</span>
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-[13px] font-bold text-slate-900 tracking-tight leading-snug">
              {toast.title || theme.badgeLabel}
            </h4>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="w-5 h-5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0 -mt-0.5 -mr-1"
              aria-label="Đóng thông báo"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          <p className="text-[12px] text-slate-600 leading-relaxed break-words line-clamp-3 mt-0.5 font-normal">
            {toast.message}
          </p>

          {toast.actionUrl && (
            <div className="mt-2">
              <Link
                href={toast.actionUrl.startsWith('/') ? toast.actionUrl : '/seller/notifications'}
                onClick={() => onDismiss(toast.id)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00875A] hover:text-[#006644] hover:underline"
              >
                <span>{toast.actionLabel || 'Xem chi tiết ngay'}</span>
                <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar Countdown Line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-slate-100 overflow-hidden">
        <div
          className={`h-full ${theme.progressBarColor} origin-left`}
          style={{
            animation: `toastProgress ${durationSec}s linear forwards`,
          }}
        />
      </div>

      <style jsx>{`
        @keyframes toastProgress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

export default function Toast() {
  const { toasts, dismissToast } = useToast();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
