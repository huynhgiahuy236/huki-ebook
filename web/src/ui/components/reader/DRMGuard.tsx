'use client';

import React, { useEffect, useState, ReactNode, useCallback } from 'react';
import Link from 'next/link';
import { AntiTamperService } from '@/utils/antiTamper';

export interface DRMGuardProps {
  children: ReactNode;
  enabled?: boolean;
  bookTitle?: string;
}

export default function DRMGuard({
  children,
  enabled = true,
  bookTitle = 'Sách điện tử'
}: DRMGuardProps) {
  const [isTamperDetected, setIsTamperDetected] = useState<boolean>(false);
  const [antiTamper] = useState<AntiTamperService>(() => new AntiTamperService());

  const handleDevToolsOpen = useCallback(() => {
    if (enabled) {
      setIsTamperDetected(true);
      console.warn('[HUKI DRM] DevTools tampering attempt detected and logged.');
    }
  }, [enabled]);

  const handleDevToolsClose = useCallback(() => {
    setIsTamperDetected(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const unbindOpen = antiTamper.onDevToolsOpen(handleDevToolsOpen);
    const unbindClose = antiTamper.onDevToolsClose(handleDevToolsClose);
    const cleanupListeners = antiTamper.setupEventListeners();

    // Initial check
    if (antiTamper.checkDevTools()) {
      setIsTamperDetected(true);
    }

    return () => {
      unbindOpen();
      unbindClose();
      cleanupListeners();
    };
  }, [enabled, antiTamper, handleDevToolsOpen, handleDevToolsClose]);

  const handleResume = () => {
    const stillOpen = antiTamper.checkDevTools();
    if (!stillOpen) {
      setIsTamperDetected(false);
    } else {
      // Keep detected if still open
      setIsTamperDetected(true);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Protected Reader Content */}
      <div
        className={`w-full h-full transition-opacity duration-200 ${
          isTamperDetected ? 'opacity-0 pointer-events-none select-none blur-xl' : 'opacity-100'
        }`}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
      >
        {children}
      </div>

      {/* DRM Deterrence Screen when DevTools is Open */}
      {isTamperDetected && (
        <div
          className="fixed inset-0 z-[9999] bg-[#0d0d0e]/95 backdrop-blur-md flex items-center justify-center p-4 text-white select-none animate-fade-in"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="drm-warning-title"
        >
          <div className="max-w-lg w-full bg-[#18181b] border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
            {/* Warning Shield Badge */}
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
              <span className="material-symbols-outlined text-4xl">shield_lock</span>
            </div>

            {/* Title & Info */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                DRM Protection Active
              </span>
              <h2 id="drm-warning-title" className="text-xl sm:text-2xl font-bold text-white pt-2">
                Phát Hiện Công Cụ Trình Duyệt
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-sm mx-auto">
                Hệ thống phát hiện Developer Tools hoặc thao tác can thiệp mã nguồn. Để bảo vệ bản quyền số của tác phẩm <strong className="text-white">"{bookTitle}"</strong> theo chính sách <span className="text-amber-300 font-mono">POL-04</span>, nội dung đọc tạm thời bị ẩn.
              </p>
            </div>

            {/* Instruction Callout */}
            <div className="p-3.5 rounded-xl bg-[#27272a]/80 border border-zinc-700/80 text-left text-xs text-zinc-300 space-y-1.5">
              <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                <span className="material-symbols-outlined text-sm text-amber-400">info</span>
                Hướng dẫn mở khóa:
              </div>
              <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-1">
                <li>Đóng cửa sổ Developer Tools / Inspect Element (F12).</li>
                <li>Bấm nút <strong>"Tiếp tục đọc sách"</strong> bên dưới để tiếp tục.</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={handleResume}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all shadow-lg hover:shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Tôi Đã Đóng DevTools — Tiếp Tục Đọc
              </button>
              <Link
                href="/library"
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">auto_stories</span>
                Về Tủ Sách
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
