'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface CountdownConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  countdownSeconds?: number;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Custom confirmation modal requiring a reverse countdown (default 5s -> 0s)
 * before the destructive confirm action becomes clickable (replaces window.confirm).
 */
export default function CountdownConfirmModal({
  isOpen,
  title,
  description,
  countdownSeconds = 5,
  confirmLabel = 'Xác nhận xóa',
  cancelLabel = 'Hủy bỏ',
  loading = false,
  onConfirm,
  onCancel,
}: CountdownConfirmModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(countdownSeconds);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(countdownSeconds);
      return;
    }

    setSecondsLeft(countdownSeconds);
    if (countdownSeconds <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, countdownSeconds]);

  if (!isOpen || !mounted) return null;

  const isDisabled = secondsLeft > 0 || loading;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="countdown-confirm-title"
    >
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3
                id="countdown-confirm-title"
                className="text-base font-bold text-slate-900 leading-snug"
              >
                {title}
              </h3>
              <div className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                {description}
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Đóng"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <div className="px-3.5 py-2.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 flex items-center justify-between gap-3 text-xs">
            <span className="text-amber-900 font-medium flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-amber-600">
                hourglass_top
              </span>
              <span>
                {secondsLeft > 0
                  ? 'Vui lòng đọc kỹ cảnh báo trước khi xác nhận:'
                  : 'Đã hết thời gian chờ, bạn có thể bấm xác nhận ngay.'}
              </span>
            </span>
            <span
              className={`font-mono font-black px-2 py-0.5 rounded-lg border shrink-0 ${
                secondsLeft > 0
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              {secondsLeft > 0 ? `${secondsLeft}s` : 'Sẵn sàng'}
            </span>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDisabled}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              isDisabled
                ? 'bg-rose-200 text-rose-700 cursor-not-allowed opacity-80'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer active:scale-[0.98]'
            }`}
          >
            <span
              className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}
            >
              {loading ? 'progress_activity' : secondsLeft > 0 ? 'lock_clock' : 'delete_forever'}
            </span>
            <span>
              {loading
                ? 'Đang xử lý...'
                : secondsLeft > 0
                  ? `${confirmLabel} (${secondsLeft}s)`
                  : confirmLabel}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
