import React from 'react';
import { useToast } from '../../context/ToastContext';

export default function Toast() {
  const { toastMessage, dismissToast } = useToast();

  if (!toastMessage) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium flex items-center gap-2 animate-toast-fade-in-up ${toastMessage.type === 'error' ? 'bg-[#ac2c19]' : 'bg-[#17201f]'}`}
      role={toastMessage.type === 'error' ? 'alert' : 'status'}
      aria-live={toastMessage.type === 'error' ? 'assertive' : 'polite'}
    >
      <span className="material-symbols-outlined text-base text-[#94f5d6]" aria-hidden="true">
        {toastMessage.type === 'error' ? 'error' : toastMessage.type === 'success' ? 'check_circle' : 'info'}
      </span>
      <span>{toastMessage.message}</span>
      <button type="button" onClick={dismissToast} className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10" aria-label="Đóng thông báo">
        <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
      </button>
    </div>
  );
}
