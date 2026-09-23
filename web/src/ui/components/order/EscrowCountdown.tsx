'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface EscrowCountdownProps {
  orderId?: string;
  subOrderId?: string;
  storeName?: string;
  amount?: number;
  initialSeconds?: number;
  startTime?: string | number | Date;
  isFrozen?: boolean;
  isEbook?: boolean;
  hideConfirmButton?: boolean;
  onReleaseEscrow?: (params: { subOrderId?: string; orderId?: string; auto: boolean }) => void;
  onDispute?: (params: { subOrderId?: string; orderId?: string }) => void;
  className?: string;
}

/**
 * HUKI EBOOK - Escrow Countdown Timer Component (2-Minute Dispute Window)
 * Handles live countdown synchronized with persistent timestamps, escrow freeze upon dispute, and instant settlement release.
 */
export default function EscrowCountdown({
  orderId,
  subOrderId,
  storeName = 'Gian Hàng',
  amount = 0,
  initialSeconds = 120,
  startTime,
  isFrozen = false,
  isEbook = false,
  hideConfirmButton = false,
  onReleaseEscrow,
  onDispute,
  className = '',
}: EscrowCountdownProps) {
  const router = useRouter();

  const calculateRemainingSeconds = useCallback(() => {
    const totalDuration = initialSeconds || 120;

    let startTimestamp: number | null = null;
    if (startTime) {
      const parsed = new Date(startTime).getTime();
      if (!isNaN(parsed) && parsed > 0) {
        startTimestamp = parsed;
      }
    }

    // LocalStorage fallback based on orderId/subOrderId to preserve countdown on page reload
    const storageKey = `huki_escrow_timer_${orderId || ''}_${subOrderId || ''}`;
    if (!startTimestamp && typeof window !== 'undefined' && (orderId || subOrderId)) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = Number(stored);
        if (!isNaN(parsed) && parsed > 0) {
          startTimestamp = parsed;
        }
      } else {
        startTimestamp = Date.now();
        localStorage.setItem(storageKey, String(startTimestamp));
      }
    }

    if (!startTimestamp) {
      return totalDuration;
    }

    const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
    return Math.max(0, totalDuration - elapsed);
  }, [startTime, initialSeconds, orderId, subOrderId]);

  const [secondsLeft, setSecondsLeft] = useState<number>(120);
  const [isCompleted, setIsCompleted] = useState(false);
  const [frozen, setFrozen] = useState(isFrozen);
  const hasTriggeredReleaseRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize remaining seconds on client mount
  useEffect(() => {
    const initial = calculateRemainingSeconds();
    setSecondsLeft(initial);
    if (initial <= 0) {
      setIsCompleted(true);
    }
  }, [calculateRemainingSeconds]);

  useEffect(() => {
    setFrozen(isFrozen);
  }, [isFrozen]);

  useEffect(() => {
    if (frozen || isCompleted || secondsLeft <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [frozen, isCompleted, secondsLeft]);

  // When countdown finishes, mark as completed (disables returns) without auto-releasing funds to allow Admin manual handover
  useEffect(() => {
    if (secondsLeft <= 0 && !isCompleted && !frozen) {
      setIsCompleted(true);
    }
  }, [secondsLeft, isCompleted, frozen]);

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
    if (!hasTriggeredReleaseRef.current) {
      hasTriggeredReleaseRef.current = true;
      if (onReleaseEscrow) onReleaseEscrow({ subOrderId, orderId, auto: false });
    }
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
      <div className={`p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[24px] text-emerald-600 dark:text-emerald-400">
            verified
          </span>
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Hết Hạn Đổi Trả (Dispute Window Closed)
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Thời hạn kiểm tra và đổi trả 2 phút đã kết thúc. Tiền ký quỹ ({Number(amount).toLocaleString('vi-VN')}₫) đang được Sàn xử lý bàn giao cho {storeName}.
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
          {isEbook || hideConfirmButton || subOrderId?.includes('_ebook') ? (
            <>Trong thời gian <strong>{formatTime(secondsLeft)}</strong>, tiền được giữ an toàn tại Sàn (quý khách có thể gửi Yêu Cầu Đổi Trả nếu sách có vấn đề).</>
          ) : (
            <>Trong thời gian <strong>{formatTime(secondsLeft)}</strong>, quý khách có thể xác nhận nhận hàng hoặc gửi Yêu Cầu Đổi Trả.</>
          )}
        </span>

        {!(isEbook || hideConfirmButton || subOrderId?.includes('_ebook')) && (
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleInstantConfirm}
              className="px-4 py-1.5 rounded-xl bg-[var(--theme-primary,#003B2B)] text-white text-xs font-bold hover:opacity-95 shadow-xs transition-all cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">check_circle</span>
              <span>Đã Nhận Đủ Hàng</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
