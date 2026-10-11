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
    iconBg: 'bg-emerald-500/10 text-emerald-600',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-500/30 hover:border-emerald-500/50',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeText: 'text-emerald-700',
    badgeLabel: 'ĐƠN HÀNG MỚI',
    progressBarColor: 'bg-emerald-500',
  },
  system: {
    icon: 'campaign',
    iconBg: 'bg-indigo-500/10 text-indigo-600',
    iconColor: 'text-indigo-600',
    borderColor: 'border-indigo-500/30 hover:border-indigo-500/50',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    badgeText: 'text-indigo-700',
    badgeLabel: 'THÔNG BÁO SÀN',
    progressBarColor: 'bg-indigo-500',
  },
  finance: {
    icon: 'account_balance_wallet',
    iconBg: 'bg-amber-500/10 text-amber-600',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-500/30 hover:border-amber-500/50',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeText: 'text-amber-700',
    badgeLabel: 'TÀI CHÍNH',
    progressBarColor: 'bg-amber-500',
  },
  warning: {
    icon: 'warning',
    iconBg: 'bg-amber-500/10 text-amber-600',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-500/30 hover:border-amber-500/50',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeText: 'text-amber-700',
    badgeLabel: 'CẢNH BÁO',
    progressBarColor: 'bg-amber-500',
  },
  error: {
    icon: 'error',
    iconBg: 'bg-rose-500/10 text-rose-600',
    iconColor: 'text-rose-600',
    borderColor: 'border-rose-500/30 hover:border-rose-500/50',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeText: 'text-rose-700',
    badgeLabel: 'LỖI HỆ THỐNG',
    progressBarColor: 'bg-rose-500',
  },
  success: {
    icon: 'check_circle',
    iconBg: 'bg-emerald-500/10 text-emerald-600',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-500/30 hover:border-emerald-500/50',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeText: 'text-emerald-700',
    badgeLabel: 'THÀNH CÔNG',
    progressBarColor: 'bg-emerald-500',
  },
  info: {
    icon: 'info',
    iconBg: 'bg-sky-500/10 text-sky-600',
    iconColor: 'text-sky-600',
    borderColor: 'border-sky-500/30 hover:border-sky-500/50',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
    badgeText: 'text-sky-700',
    badgeLabel: 'THÔNG TIN',
    progressBarColor: 'bg-sky-500',
  },
};

function ToastCard({ toast, onDismiss }: { toast: ToastMessageState; onDismiss: (id: string) => void }) {
  const theme = THEMES[toast.type] || THEMES.info;
  const durationSec = (toast.duration || 5000) / 1000;

  return (
    <div
      className={`relative w-full max-w-[370px] bg-white/95 backdrop-blur-xl border rounded-2xl shadow-2xl shadow-slate-900/15 p-4 overflow-hidden transition-all duration-300 pointer-events-auto ${
        theme.borderColor
      } ${
        toast.isExiting
          ? 'opacity-0 translate-x-8 scale-95'
          : 'animate-in fade-in-0 slide-in-from-right-8 duration-300'
      }`}
      role="status"
    >
      {/* Top Header inside toast: Badge & Close Button */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${theme.badgeBg}`}
        >
          <span className="material-symbols-outlined text-[12px]">{theme.icon}</span>
          {theme.badgeLabel}
        </span>

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Đóng thông báo"
        >
          <span className="material-symbols-outlined text-[15px]">close</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${theme.iconBg}`}>
          <span className="material-symbols-outlined text-[20px]">{theme.icon}</span>
        </div>

        <div className="flex-1 min-w-0 pr-1">
          {toast.title && (
            <h4 className="text-[13px] font-bold text-slate-900 tracking-tight leading-snug mb-0.5">
              {toast.title}
            </h4>
          )}
          <p className="text-[12px] text-slate-600 leading-relaxed break-words line-clamp-3">
            {toast.message}
          </p>

          {toast.actionUrl && (
            <div className="mt-2.5">
              <Link
                href={toast.actionUrl}
                onClick={() => onDismiss(toast.id)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00875A] hover:text-[#006644] hover:underline"
              >
                <span>{toast.actionLabel || 'Xem chi tiết ngay'}</span>
                <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar countdown line at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-100 overflow-hidden">
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
