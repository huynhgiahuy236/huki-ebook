'use client';

import React from 'react';
import { useToast } from '../../context/ToastContext';

export default function Toast() {
  const { toastMessage, dismissToast } = useToast();

  if (!toastMessage) return null;

  const isError = toastMessage.type === 'error';
  const isSuccess = toastMessage.type === 'success';
  const isWarning = toastMessage.type === 'warning';

  let defaultTitle = 'Thông báo';
  let borderAccent = 'border-slate-200/80';

  if (isError) {
    defaultTitle = 'Thông tin chưa hợp lệ';
    borderAccent = 'border-rose-200/80';
  } else if (isSuccess) {
    defaultTitle = 'Thành công';
    borderAccent = 'border-emerald-200/80';
  } else if (isWarning) {
    defaultTitle = 'Cảnh báo';
    borderAccent = 'border-amber-200/80';
  } else {
    defaultTitle = 'Thông tin';
    borderAccent = 'border-slate-200';
  }

  const displayTitle = toastMessage.title || (toastMessage.message && toastMessage.title !== '' ? defaultTitle : '');

  return (
    <div
      className="fixed top-5 right-5 z-[9999] max-w-sm w-[calc(100vw-2.5rem)] pointer-events-auto transition-all duration-300"
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <div
        className={`flex items-start justify-between gap-3 px-4 py-3 rounded-xl bg-white/95 backdrop-blur-md border shadow-lg shadow-slate-900/5 transition-all duration-300 ${borderAccent} ${
          toastMessage.isExiting ? 'animate-toast-out opacity-0 scale-95' : 'animate-toast-in opacity-100 scale-100'
        }`}
      >
        <div className="flex-1 min-w-0">
          {displayTitle && (
            <h4 className="text-xs font-bold text-slate-900 tracking-tight mb-0.5">
              {displayTitle}
            </h4>
          )}
          <p className="text-xs font-normal text-slate-600 leading-relaxed break-words">
            {toastMessage.message}
          </p>
        </div>

        <button
          type="button"
          onClick={dismissToast}
          className="shrink-0 w-6 h-6 -mr-1 -mt-0.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Đóng thông báo"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">
            close
          </span>
        </button>
      </div>
    </div>
  );
}
