import React from 'react';
import { useToast } from '../../context/ToastContext';

export default function Toast() {
  const { toastMessage, dismissToast } = useToast();

  if (!toastMessage) return null;

  const typeConfig = {
    error: {
      bg: 'bg-[#801404]/95 text-[#ffdad6] border-[#ffb4ab]/30 shadow-red-950/30',
      icon: 'error',
      iconColor: 'text-[#ffb4ab]',
      title: 'Lỗi',
    },
    success: {
      bg: 'bg-[#003b2b]/95 text-[#94f5d6] border-[#94f5d6]/30 shadow-emerald-950/30',
      icon: 'check_circle',
      iconColor: 'text-[#94f5d6]',
      title: 'Thành công',
    },
    warning: {
      bg: 'bg-[#4d3300]/95 text-[#ffe085] border-[#fea619]/40 shadow-amber-950/30',
      icon: 'warning',
      iconColor: 'text-[#fea619]',
      title: 'Cảnh báo',
    },
    info: {
      bg: 'bg-[#17201f]/95 text-white border-white/20 shadow-black/40',
      icon: 'info',
      iconColor: 'text-[#94f5d6]',
      title: 'Thông báo',
    },
  };

  const currentConfig = typeConfig[toastMessage.type] || typeConfig.info;

  return (
    <div
      className="fixed top-5 right-5 z-[100] max-w-sm sm:max-w-md w-[calc(100vw-2.5rem)] sm:w-auto pointer-events-auto"
      role={toastMessage.type === 'error' ? 'alert' : 'status'}
      aria-live={toastMessage.type === 'error' ? 'assertive' : 'polite'}
    >
      <div
        className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300 ${
          currentConfig.bg
        } ${toastMessage.isExiting ? 'animate-toast-out' : 'animate-toast-in'}`}
      >
        <span
          className={`material-symbols-outlined text-xl shrink-0 mt-0.5 ${currentConfig.iconColor}`}
          aria-hidden="true"
        >
          {currentConfig.icon}
        </span>
        <div className="flex-1 min-w-0 pr-1">
          <p className="text-xs sm:text-sm font-medium leading-relaxed break-words text-white/95">
            {toastMessage.message}
          </p>
        </div>
        <button
          type="button"
          onClick={dismissToast}
          className="shrink-0 p-1 -mr-1 -mt-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Đóng thông báo"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            close
          </span>
        </button>
      </div>
    </div>
  );
}

