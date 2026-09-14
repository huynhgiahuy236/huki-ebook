import React from 'react';
import { useToast } from '../../context/ToastContext';

export default function Toast() {
  const { toastMessage, dismissToast } = useToast();

  if (!toastMessage) return null;

  const isError = toastMessage.type === 'error';
  const isSuccess = toastMessage.type === 'success';
  const isWarning = toastMessage.type === 'warning';
  const isInfo = toastMessage.type === 'info' || !toastMessage.type;

  // Cấu hình style và màu sắc
  let iconName = 'info';
  let iconColorClass = 'text-theme-secondary';
  let defaultTitle = 'Thông báo';
  let cardClass = '';

  if (isError) {
    iconName = 'error';
    iconColorClass = 'text-red-400';
    defaultTitle = 'Có lỗi phát sinh';
    cardClass = 'bg-[#7f1d1d]/95 text-white border-red-500/40 shadow-red-950/40';
  } else if (isSuccess) {
    iconName = 'check_circle';
    iconColorClass = 'text-emerald-400';
    defaultTitle = 'Thành công';
    cardClass = 'bg-[#064e3b]/95 text-white border-emerald-500/40 shadow-emerald-950/40';
  } else if (isWarning) {
    iconName = 'warning';
    iconColorClass = 'text-amber-300';
    defaultTitle = 'Cảnh báo';
    cardClass = 'bg-[#78350f]/95 text-amber-50 border-amber-500/40 shadow-amber-950/30';
  } else {
    iconName = 'info';
    iconColorClass = 'text-cyan-300';
    defaultTitle = 'Thông tin';
    cardClass = 'bg-[#0f172a]/95 text-slate-100 border-slate-700/60 shadow-black/40';
  }

  const displayTitle = toastMessage.title || (toastMessage.message && toastMessage.title !== '' ? defaultTitle : '');

  return (
    <div
      className="fixed top-5 right-5 z-[9999] max-w-sm sm:max-w-md w-[calc(100vw-2.5rem)] sm:w-auto pointer-events-auto transition-all duration-300"
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <div
        className={`flex items-start gap-3.5 px-4.5 py-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 ${cardClass} ${
          toastMessage.isExiting ? 'animate-toast-out opacity-0 scale-95' : 'animate-toast-in opacity-100 scale-100'
        }`}
      >
        <span
          className={`material-symbols-outlined text-[22px] shrink-0 mt-0.5 ${iconColorClass}`}
          aria-hidden="true"
        >
          {iconName}
        </span>
        <div className="flex-1 min-w-0 pr-1">
          {displayTitle && (
            <h4 className="text-xs sm:text-[13px] font-bold tracking-wide uppercase mb-0.5 opacity-90">
              {displayTitle}
            </h4>
          )}
          <p className="text-xs sm:text-sm font-medium leading-relaxed break-words text-white/95">
            {toastMessage.message}
          </p>
        </div>
        <button
          type="button"
          onClick={dismissToast}
          className="shrink-0 p-1 -mr-1 -mt-1 rounded-lg text-white/60 hover:text-white hover:bg-white/15 transition-all"
          aria-label="Đóng thông báo"
        >
          <span className="material-symbols-outlined text-lg" aria-hidden="true">
            close
          </span>
        </button>
      </div>
    </div>
  );
}


