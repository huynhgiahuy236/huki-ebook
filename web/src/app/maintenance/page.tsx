"use client";

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { maintenanceService, SystemMaintenanceConfig, DEFAULT_MAINTENANCE_CONFIG } from '@/ui/services/maintenanceService';

export default function MaintenancePage() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [config, setConfig] = useState<SystemMaintenanceConfig>(maintenanceService.getConfig());
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 1,
    minutes: 45,
    seconds: 0,
  });

  // Admin Escape Hatch Modal State
  const [showAdminBypassModal, setShowAdminBypassModal] = useState(false);
  const [bypassInputKey, setBypassInputKey] = useState('');
  const [bypassError, setBypassError] = useState('');
  const [bypassSuccess, setBypassSuccess] = useState(false);

  // 1. Synchronize maintenance config changes in real-time
  useEffect(() => {
    const handleMaintenanceChange = (e: Event) => {
      const customEvent = e as CustomEvent<SystemMaintenanceConfig>;
      if (customEvent.detail) {
        setConfig(customEvent.detail);
        if (!customEvent.detail.isActive) {
          // Maintenance turned off! Return user back to home
          startTransition(() => {
            router.replace('/');
          });
        }
      }
    };

    window.addEventListener('huki_system_maintenance_changed', handleMaintenanceChange);
    return () => {
      window.removeEventListener('huki_system_maintenance_changed', handleMaintenanceChange);
    };
  }, [router]);

  // 2. Countdown timer to scheduled completion
  useEffect(() => {
    const targetTime = config.scheduledEndTime
      ? new Date(config.scheduledEndTime).getTime()
      : Date.now() + 2 * 3600 * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, targetTime - now);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [config.scheduledEndTime]);

  // 3. STRICT ANTI-BYPASS NAVIGATION LOCK (Yêu cầu khắt khe từ người dùng)
  // Prevents Browser Back Button, Alt + Left Arrow, Alt + Up Arrow, and Backspace navigation
  useEffect(() => {
    // A. Intercept browser popstate (Back / Forward button)
    // Push the current state twice to ensure user stays on /maintenance
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
    };

    // B. Intercept keyboard shortcuts (Alt + ArrowLeft, Alt + ArrowUp, Backspace)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in input or textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Block Alt + ArrowLeft (Browser Back)
      if (e.altKey && (e.key === 'ArrowLeft' || e.code === 'ArrowLeft')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Alt + ArrowUp (Navigate Up/Back)
      if (e.altKey && (e.key === 'ArrowUp' || e.code === 'ArrowUp')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Backspace outside text input
      if (e.key === 'Backspace' && !isInput) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Quick shortcut to open Admin Escape Hatch (Ctrl + Shift + M)
      if (e.ctrlKey && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
        e.preventDefault();
        setShowAdminBypassModal(true);
      }
    };

    // C. Prevent beforeunload warnings / ensure staying on maintenance
    const handleBeforeUnload = () => {
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleVerifyBypassKey = (e: React.FormEvent) => {
    e.preventDefault();
    setBypassError('');

    if (!bypassInputKey.trim()) {
      setBypassError('Vui lòng nhập Master Bypass Key.');
      return;
    }

    const isValid = maintenanceService.verifyAndSaveBypassKey(bypassInputKey.trim());
    if (isValid) {
      setBypassSuccess(true);
      setTimeout(() => {
        router.push('/admin/maintenance');
      }, 700);
    } else {
      setBypassError('Mã khóa kỹ thuật không chính xác. Quyền truy cập bị từ chối.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#031510] text-emerald-50 flex flex-col justify-between selection:bg-emerald-500 selection:text-black font-sans relative overflow-hidden">
      {/* Background Ambient Glows & Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/25 via-emerald-950/10 to-[#031510] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#10b981 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-900/50">
            <span className="material-symbols-outlined text-white text-2xl">auto_stories</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-editorial text-xl font-black tracking-wider text-white">HUKI EBOOK</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest">
                SYSTEM UPGRADE
              </span>
            </div>
            <p className="text-[11px] text-emerald-400/70 font-medium">Trung Tâm Vận Hành & Hạ Tầng Kỹ Thuật</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-xs text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="font-semibold">Bảo Trì Hệ Thống Toàn Diện</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-8 flex-1 flex flex-col items-center justify-center text-center">
        {/* Animated Tech Gear Server Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-950 via-emerald-900/60 to-emerald-800/30 border border-emerald-500/30 flex items-center justify-center shadow-2xl shadow-emerald-950/80 backdrop-blur-md">
            <span className="material-symbols-outlined text-emerald-400 text-5xl animate-[spin_10s_linear_infinite]">
              settings
            </span>
          </div>
          <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center backdrop-blur-sm">
            <span className="material-symbols-outlined text-amber-300 text-lg">construction</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
          Hệ Thống Đang Trong Quá Trình <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-200 bg-clip-text text-transparent">
            Nâng Cấp Kỹ Thuật & Bảo Trì Định Kỳ
          </span>
        </h1>

        {/* Reason Statement Card */}
        <div className="w-full bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-5 mb-8 backdrop-blur-sm shadow-xl text-left">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-base">info</span>
            <span>Thông Điệp Từ Ban Quản Trị Kỹ Thuật HuKi</span>
          </div>
          <p className="text-sm text-emerald-100/90 leading-relaxed">
            {config.reason || DEFAULT_MAINTENANCE_CONFIG.reason}
          </p>
        </div>

        {/* Countdown Board */}
        <div className="w-full max-w-md mb-8">
          <p className="text-xs uppercase font-bold tracking-widest text-emerald-400/80 mb-3">
            Dự Kiến Hoàn Tất Sau
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-b from-emerald-900/40 to-emerald-950/80 border border-emerald-700/30 rounded-2xl p-4 shadow-lg">
              <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="block text-[11px] font-semibold text-emerald-400/80 uppercase mt-1">Giờ</span>
            </div>
            <div className="bg-gradient-to-b from-emerald-900/40 to-emerald-950/80 border border-emerald-700/30 rounded-2xl p-4 shadow-lg">
              <span className="text-3xl sm:text-4xl font-black text-amber-300 font-mono">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="block text-[11px] font-semibold text-emerald-400/80 uppercase mt-1">Phút</span>
            </div>
            <div className="bg-gradient-to-b from-emerald-900/40 to-emerald-950/80 border border-emerald-700/30 rounded-2xl p-4 shadow-lg">
              <span className="text-3xl sm:text-4xl font-black text-teal-300 font-mono">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="block text-[11px] font-semibold text-emerald-400/80 uppercase mt-1">Giây</span>
            </div>
          </div>
        </div>

        {/* User Assurance Feature Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left text-xs mb-8">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/20">
            <span className="material-symbols-outlined text-emerald-400 text-xl mt-0.5">verified_user</span>
            <div>
              <p className="font-bold text-white">An Toàn Tài Khoản</p>
              <p className="text-emerald-300/70 text-[11px]">Dữ liệu, số dư ví và giao dịch thanh toán được mã hóa an toàn 100%.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/20">
            <span className="material-symbols-outlined text-teal-400 text-xl mt-0.5">local_shipping</span>
            <div>
              <p className="font-bold text-white">Bưu Tá HuKi Express</p>
              <p className="text-emerald-300/70 text-[11px]">Các đơn hàng đang trong hành trình giao vẫn được thực hiện theo lộ trình.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/20">
            <span className="material-symbols-outlined text-amber-400 text-xl mt-0.5">menu_book</span>
            <div>
              <p className="font-bold text-white">Đọc Sách Offline</p>
              <p className="text-emerald-300/70 text-[11px]">Bạn vẫn có thể tiếp tục mở các ấn phẩm Ebook DRM đã tải trong bộ nhớ đệm.</p>
            </div>
          </div>
        </div>

        {/* Support & Hotline */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-emerald-300/80">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-emerald-400 text-sm">call</span>
            <span>Hotline khẩn:</span>
            <a href={`tel:${config.supportHotline || '19006868'}`} className="font-bold text-emerald-300 hover:text-white underline">
              {config.supportHotline || '1900 6868'}
            </a>
          </div>
          <span className="text-emerald-800">•</span>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-emerald-400 text-sm">mail</span>
            <span>Hỗ trợ:</span>
            <a href={`mailto:${config.supportEmail || 'hotro@huki.vn'}`} className="font-bold text-emerald-300 hover:text-white underline">
              {config.supportEmail || 'hotro@huki.vn'}
            </a>
          </div>
        </div>
      </main>

      {/* Footer & Secret Admin Escape Hatch */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 border-t border-emerald-900/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-400/60">
        <p>© 2026 HUKI EBOOK Platform. Mọi quyền được bảo lưu.</p>

        {/* Discreet technician escape hatch button */}
        <button
          type="button"
          onClick={() => setShowAdminBypassModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/30 hover:border-emerald-600/50 text-emerald-300 transition-colors"
          title="Cổng thoát hiểm khẩn cấp cho Quản trị viên (Ctrl+Shift+M)"
        >
          <span className="material-symbols-outlined text-sm">vpn_key</span>
          <span className="text-[11px] font-semibold">Cổng Kỹ Thuật Admin</span>
        </button>
      </footer>

      {/* Admin Bypass Escape Hatch Modal */}
      {showAdminBypassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[#0a231b] border border-emerald-600/40 rounded-2xl p-6 shadow-2xl relative text-left">
            <button
              type="button"
              onClick={() => {
                setShowAdminBypassModal(false);
                setBypassError('');
              }}
              className="absolute top-4 right-4 text-emerald-400 hover:text-white p-1 rounded-lg"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Cổng Thoát Hiểm Kỹ Thuật</h3>
                <p className="text-xs text-emerald-300/70">Xác thực quyền Quản trị viên tối cao (DevOps / Admin)</p>
              </div>
            </div>

            <p className="text-xs text-emerald-200/80 mb-4 leading-relaxed">
              Nhập <strong className="text-white">Master Bypass Key</strong> hoặc mã bảo mật kỹ thuật để mở khóa phiên làm việc và vào thẳng Bảng điều khiển bảo trì.
            </p>

            <form onSubmit={handleVerifyBypassKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-emerald-300 mb-1.5">
                  Master Bypass Key
                </label>
                <input
                  type="password"
                  value={bypassInputKey}
                  onChange={(e) => setBypassInputKey(e.target.value)}
                  placeholder="Nhập mã khóa thoát hiểm..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-950/70 border border-emerald-700/50 text-white placeholder-emerald-600/60 text-sm focus:outline-none focus:border-emerald-400 font-mono"
                  autoFocus
                />
              </div>

              {bypassError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-700/40 text-xs text-rose-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  <span>{bypassError}</span>
                </div>
              )}

              {bypassSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>Mã khóa hợp lệ! Đang chuyển hướng vào Bảng Quản Trị...</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminBypassModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:bg-emerald-900/40 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-emerald-950 flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-950"
                >
                  <span className="material-symbols-outlined text-sm">lock_open</span>
                  <span>Mở Khóa Phiên Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
