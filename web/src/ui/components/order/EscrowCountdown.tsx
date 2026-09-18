'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export interface EscrowCountdownProps {
  orderId?: string;
  subOrderId?: string;
  storeName?: string;
  amount?: number;
  initialSeconds?: number;
  isFrozen?: boolean;
  onReleaseEscrow?: (params: { subOrderId?: string; orderId?: string; auto: boolean }) => void;
  onDispute?: (params: { subOrderId?: string; orderId?: string }) => void;
  className?: string;
}

/**
 * HUKI EBOOK - Escrow Countdown Timer Component (2-Minute Dispute Window)
 * Handles live countdown, escrow freeze upon dispute, and instant settlement release.
 */
export default function EscrowCountdown({
  orderId,
  subOrderId,
  storeName = 'Gian Hàng',
  amount = 0,
  initialSeconds = 120,
  isFrozen = false,
  onReleaseEscrow,
  onDispute,
  className = '',
}: EscrowCountdownProps) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isCompleted, setIsCompleted] = useState(false);
  const [frozen, setFrozen] = useState(isFrozen);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (frozen || isCompleted) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsCompleted(true);
          if (onReleaseEscrow) onReleaseEscrow({ subOrderId, orderId, auto: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [frozen, isCompleted, onReleaseEscrow, subOrderId, orderId]);

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const percent = Math.max(0, Math.min(100, (secondsLeft / 120) * 100));

  const handleInstantConfirm = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsCompleted(true);
    setSecondsLeft(0);
    if (onReleaseEscrow) onReleaseEscrow({ subOrderId, orderId, auto: false });
  };

  const handleDisputeClick = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setFrozen(true);
    if (onDispute) {
      onDispute({ subOrderId, orderId });
    } else {
      router.push(`/returns?orderId=${orderId}&subOrderId=${subOrderId}`);
    }
  };

  if (isCompleted || secondsLeft <= 0) {
    return (
      <div className={`p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[24px] text-emerald-600 dark:text-emerald-400">
            verified
          </span>
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Ký Quỹ Hoàn Tất (Escrow Settled)
            </div>
            <div className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
              Tiền thanh toán ({Number(amount).toLocaleString('vi-VN')}₫) đã được giải ngân vào Ví của {storeName}.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (frozen) {
    return (
      <div className={`p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[24px] text-amber-600 dark:text-amber-400 animate-pulse">
            pause_circle
          </span>
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Ký Quỹ Tạm Khóa (Dispute Frozen)
            </div>
            <div className="text-xs text-amber-800/80 dark:text-amber-300/80">
              Đơn hàng đang trong quy trình khiếu nại đổi trả. Tiền ký quỹ ({Number(amount).toLocaleString('vi-VN')}₫) được giữ an toàn.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/returns?orderId=${orderId}&subOrderId=${subOrderId}`)}
          className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-all shrink-0 cursor-pointer"
        >
          Xem Tiến Trình
        </button>
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface,#ffffff)] border-2 border-[var(--theme-primary,#003B2B)]/30 shadow-sm flex flex-col gap-3.5 ${className}`}>
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[22px] text-[var(--theme-primary,#003B2B)] animate-spin">
            progress_activity
          </span>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-[var(--theme-primary,#003B2B)]">
              Ký Quỹ Đổi Trả 2 Phút (HUKI Escrow Holding)
            </span>
            <p className="text-[11px] text-[var(--theme-text-muted,#49454f)]">
              Tiền của gian hàng <strong className="text-[var(--theme-text,#1c1b1f)]">{storeName}</strong> được bảo vệ tại Sàn trong thời gian quý khách kiểm tra sách.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-center px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-mono font-black text-sm shrink-0">
          <span className="material-symbols-outlined text-[16px]">timer</span>
          <span>{formatTime(secondsLeft)}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--theme-primary,#003B2B)] to-emerald-500 transition-all duration-1000 ease-linear rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <span className="text-[11px] text-[var(--theme-text-muted,#49454f)]">
          Sau <strong>{formatTime(secondsLeft)}</strong>, tiền sẽ tự động chuyển vào Ví Khả Dụng của Shop.
        </span>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleDisputeClick}
            className="px-3.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
          >
            Yêu Cầu Đổi Trả
          </button>

          <button
            type="button"
            onClick={handleInstantConfirm}
            className="px-4 py-1.5 rounded-xl bg-[var(--theme-primary,#003B2B)] text-white text-xs font-bold hover:opacity-95 shadow-xs transition-all cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">check_circle</span>
            <span>Đã Nhận Đủ Hàng</span>
          </button>
        </div>
      </div>
    </div>
  );
}
