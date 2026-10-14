'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminNotificationService, AdminBroadcastNotification } from '@/ui/services/adminNotificationService';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import { useAuth } from '@/ui/context/AuthContext';

export default function SellerTopNoticeBar() {
  const { user, activeBusinessId } = useAuth();
  const currentBizId = user?.business?.id || activeBusinessId || undefined;

  const [notices, setNotices] = useState<AdminBroadcastNotification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const sellerCreatedAt = user?.business?.createdAt || user?.createdAt || undefined;

  useEffect(() => {
    const loadNotices = () => {
      const active = adminNotificationService.getTopNoticeForSeller(currentBizId, true, sellerCreatedAt);
      setNotices(active);
      if (currentIndex >= active.length) {
        setCurrentIndex(0);
      }
    };

    loadNotices();
    window.addEventListener('huki_admin_notifications_updated', loadNotices);
    const unsubscribe = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'ADMIN_NOTIFICATIONS_UPDATED' || msg.type === 'FEATURE_FLAGS_UPDATED') {
        loadNotices();
      }
    });

    return () => {
      window.removeEventListener('huki_admin_notifications_updated', loadNotices);
      unsubscribe();
    };
  }, [currentBizId, currentIndex]);

  if (notices.length === 0) {
    return null;
  }

  const currentNotice = notices[currentIndex];

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    adminNotificationService.dismissTopNotice(currentNotice.id, currentBizId);
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          wrapper: 'bg-rose-50/95 border-rose-200 text-rose-950',
          badge: 'bg-rose-600 text-white',
          icon: 'emergency',
          iconColor: 'text-rose-600',
          btn: 'bg-rose-600 hover:bg-rose-700 text-white',
        };
      case 'WARNING':
        return {
          wrapper: 'bg-amber-50/95 border-amber-200 text-amber-950',
          badge: 'bg-amber-600 text-white',
          icon: 'warning',
          iconColor: 'text-amber-600',
          btn: 'bg-amber-600 hover:bg-amber-700 text-white',
        };
      case 'INFO':
      default:
        return {
          wrapper: 'bg-emerald-50/95 border-emerald-200 text-emerald-950',
          badge: 'bg-[#00875A] text-white',
          icon: 'campaign',
          iconColor: 'text-[#00875A]',
          btn: 'bg-[#00875A] hover:bg-[#00704A] text-white',
        };
    }
  };

  const style = getSeverityStyle(currentNotice.severity);

  return (
    <aside aria-label="Thông báo quản trị sàn" className={`w-full border-b backdrop-blur-xs px-3.5 sm:px-6 py-2 transition-all select-none ${style.wrapper}`}>
      <div className="max-w-7xl mx-auto flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 text-xs">
        {/* Left: Icon & Title & Summary */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className={`material-symbols-outlined text-[19px] shrink-0 ${style.iconColor}`}>
            {style.icon}
          </span>

          <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0 tracking-wider ${style.badge}`}>
            {currentNotice.category === 'MAINTENANCE'
              ? 'Bảo Trì'
              : currentNotice.category === 'FINANCE'
              ? 'Quyết Toán'
              : currentNotice.category === 'POLICY'
              ? 'Chính Sách'
              : 'Thông Báo Sàn'}
          </span>

          <div className="min-w-0 flex-1 flex flex-wrap sm:flex-nowrap items-baseline gap-1.5 truncate">
            <span className="font-bold truncate text-[12.5px]">{currentNotice.title}</span>
            <span className="hidden md:inline text-slate-600 font-normal truncate max-w-xl">
              — {currentNotice.summary}
            </span>
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {/* Multiple notices pagination indicator */}
          {notices.length > 1 && (
            <div className="flex items-center gap-1 bg-white/70 px-1.5 py-0.5 rounded-lg border border-slate-200/60 text-[10px] font-bold text-slate-700">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : notices.length - 1))}
                className="hover:text-black cursor-pointer px-0.5"
                title="Tin trước"
              >
                ‹
              </button>
              <span>{currentIndex + 1}/{notices.length}</span>
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => (prev < notices.length - 1 ? prev + 1 : 0))}
                className="hover:text-black cursor-pointer px-0.5"
                title="Tin kế tiếp"
              >
                ›
              </button>
            </div>
          )}

          {/* Action Link */}
          <Link
            href={currentNotice.actionUrl || `/seller/notifications?id=${currentNotice.id}`}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-2xs whitespace-nowrap ${style.btn}`}
          >
            {currentNotice.actionLabel || 'Xem Chi Tiết'}
          </Link>

          {/* Dismiss button */}
          {currentNotice.isDismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              className="w-6 h-6 rounded-lg hover:bg-black/10 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="Đóng thông báo này"
            >
              <span className="material-symbols-outlined text-[15px]">close</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
