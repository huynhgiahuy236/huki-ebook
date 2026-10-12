import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { soundEffects } from '@/ui/utils/soundEffects';
import { useChatSocket } from '@/ui/hooks/useChatSocket';
import { chatService } from '@/ui/services/chatService';
import { playChatChimeSound } from '@/ui/utils/chatSound';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';

import SellerNotificationBell from '../seller/SellerNotificationBell';

export interface SellerHeaderProps {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
}

export default function SellerHeader({ isSidebarCollapsed, toggleSidebar, toggleMobileSidebar }: SellerHeaderProps) {
  const pathname = usePathname() || '';
  const { user } = useAuth();
  const { showToast } = useToast();
  const sellerName = user?.business?.name || user?.fullName || user?.name || "NXB Doanh Nghiệp";
  const storeId = user?.business?.id || user?.id;

  const [isMuted, setIsMuted] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    setIsMuted(soundEffects.getIsMuted());
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (!storeId) return;
    try {
      const res = await chatService.listConversations(storeId);
      if (res.success && Array.isArray(res.data)) {
        const total = res.data.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setUnreadChatCount(total);
      }
    } catch {
      // ignore
    }
  }, [storeId]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useChatSocket({
    storeId,
    onMessageReceived: (msg: any) => {
      const senderId = String(msg?.senderId || '');
      const myId = String(user?.id || (user as any)?._id || (user as any)?.sub || '');
      if (senderId && senderId === myId) return;

      if (!soundEffects.getIsMuted()) {
        playChatChimeSound();
      }

      setUnreadChatCount((prev) => prev + 1);

      if (!pathname.startsWith('/seller/chat')) {
        const senderName = msg?.senderName || 'Khách hàng';
        const rawContent = msg?.content || '';
        const snippet = typeof rawContent === 'string' && rawContent.trim()
          ? (rawContent.length > 60 ? rawContent.slice(0, 60) + '...' : rawContent)
          : (msg?.messageType === 'IMAGE' ? '[Đã gửi một hình ảnh]' : 'Bạn có một tin nhắn mới');

        showToast({
          title: `💬 Tin nhắn từ ${senderName}`,
          message: snippet,
          type: 'info',
          actionUrl: '/seller/chat',
          actionLabel: 'Trả lời ngay',
          duration: 5000,
          playSound: false,
        });
      }
    },
    onMessageRead: () => {
      fetchUnreadCount();
    },
  });

  useEffect(() => {
    const unsub = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'CHAT_UNREAD_COUNT_CHANGED') {
        fetchUnreadCount();
      }
    });
    return () => unsub();
  }, [fetchUnreadCount]);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] pl-0 pr-3.5 sm:pr-5 lg:pr-6 flex items-center justify-between shadow-2xs min-h-[54px] h-[54px] gap-2 sm:gap-3">
      {/* Left: Sidebar Toggle & Brand Identity */}
      <div className="flex items-center min-w-0">
        {/* Hamburger / Sidebar Toggle Container - exactly w-[60px] to align with collapsed sidebar */}
        <div className="w-[60px] flex items-center justify-center shrink-0">
          {/* Desktop Sidebar Collapse Toggle Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden lg:flex w-9 h-9 items-center justify-center rounded-xl text-gray-500 hover:text-[#003B2B] hover:bg-gray-100 transition-all cursor-pointer border border-[#E2E8F0] hover:border-[#003B2B]/30 shadow-2xs active:scale-95"
            title={isSidebarCollapsed ? 'Mở rộng thanh menu (Sidebar)' : 'Thu gọn thanh menu (Sidebar)'}
            aria-label="Toggle Sidebar"
          >
            <span className="material-symbols-outlined text-[20px] text-[#003B2B] transition-transform duration-300">
              {isSidebarCollapsed ? 'menu' : 'menu_open'}
            </span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={toggleMobileSidebar}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 border border-[#E2E8F0] cursor-pointer active:scale-95"
            title="Mở menu"
            aria-label="Open Mobile Menu"
          >
            <span className="material-symbols-outlined text-[20px] text-[#003B2B]">menu</span>
          </button>
        </div>

        {/* Brand - Chuẩn nhận diện Home & Admin (Không icon thừa) */}
        <Link href="/seller/dashboard" className="flex flex-col group select-none pl-1 pr-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="font-editorial text-base sm:text-lg font-black tracking-tight text-[#003B2B] leading-none">
              HUKI EBOOK
            </span>
            <span className="bg-[#003B2B] text-white text-[7.5px] sm:text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider">
              SELLER
            </span>
          </div>
          <span className="text-[7.5px] sm:text-[8px] uppercase tracking-widest text-[#006953] font-bold mt-0.5">
            Kênh NXB &amp; Tác Giả
          </span>
        </Link>

        {/* Shop Badge (Auto-truncated) */}
        <div className="hidden lg:flex items-center gap-1.5 bg-theme-secondary-subtle/60 px-2.5 py-1 rounded-full border border-theme-border max-w-[200px] xl:max-w-[260px] 2xl:max-w-[320px] min-w-0 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" aria-hidden="true"></span>
          <span className="text-xs font-bold text-on-surface truncate" title={sellerName}>{sellerName}</span>
          <span className="text-[9px] bg-theme-primary/10 text-theme-primary px-1.5 py-0.2 rounded-full font-bold shrink-0 whitespace-nowrap">Đối tác</span>
        </div>
      </div>

      {/* Center Search */}
      <div className="hidden md:flex items-center bg-surface-container-low/80 border border-theme-border rounded-full px-3 py-1 w-40 lg:w-52 xl:w-64 text-xs text-on-surface-variant focus-within:border-theme-primary focus-within:ring-2 focus-within:ring-theme-primary/10 transition-all shrink-0">
        <span className="material-symbols-outlined text-[15px] mr-1.5 text-on-surface-variant shrink-0">search</span>
        <input
          type="text"
          placeholder="Tìm mã đơn, SKU, tựa sách..."
          className="bg-transparent border-none outline-none w-full text-xs text-on-surface placeholder:text-on-surface-variant/70 min-w-0"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Chuông Thông Báo Realtime & Bản Tin Sàn */}
        <SellerNotificationBell />

        {/* Nút Bật/Tắt Âm Thanh Thông Báo & Nổ Đơn */}
        <button
          type="button"
          onClick={() => {
            const newMuted = soundEffects.toggleMute();
            setIsMuted(newMuted);
          }}
          className="flex items-center justify-center w-8 sm:w-9 h-8 sm:h-9 rounded-xl border border-theme-border text-on-surface hover:text-[#003B2B] hover:bg-theme-secondary-subtle transition-all cursor-pointer shadow-2xs active:scale-95"
          title={isMuted ? "Bật âm thanh chuông thông báo & đơn hàng" : "Tắt âm thanh chuông thông báo & đơn hàng"}
          aria-label="Bật/Tắt âm thanh"
        >
          <span className="material-symbols-outlined text-[19px] text-[#003B2B]">
            {isMuted ? 'volume_off' : 'volume_up'}
          </span>
        </button>

        {/* Messenger / Chat Hộp Thư Khách Hàng */}
        <Link
          href="/seller/chat"
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border border-theme-border text-on-surface hover:text-[#003B2B] hover:bg-theme-secondary-subtle transition-colors shrink-0 group"
          title="Mở cửa sổ Chat & Tin nhắn chăm sóc khách hàng"
          aria-label="Tin nhắn"
        >
          <span className="material-symbols-outlined text-[17px] text-[#003B2B]">chat</span>
          <span className="hidden sm:inline text-xs font-semibold whitespace-nowrap group-hover:text-[#003B2B]">Tin nhắn</span>
          {unreadChatCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#dc2626] text-white text-[10px] font-bold min-w-4.5 h-4.5 px-1 rounded-full flex items-center justify-center shadow-xs">
              {unreadChatCount > 99 ? '99+' : unreadChatCount}
            </span>
          )}
        </Link>

        <Link
          href="/seller/product/create-hybrid"
          className="flex items-center gap-1.5 bg-theme-primary text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-sm shrink-0 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[15px]">add_circle</span>
          <span className="hidden sm:inline">Thêm Sản Phẩm</span>
          <span className="sm:hidden">Thêm</span>
        </Link>

        <div className="h-4 w-px bg-theme-border shrink-0"></div>

        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-semibold text-theme-primary hover:bg-theme-secondary-subtle px-2 sm:px-2.5 py-1.5 rounded-xl border border-theme-border transition-colors shrink-0 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[15px]">open_in_new</span>
          <span className="hidden sm:inline">Về Sàn</span>
        </Link>
      </div>
    </header>
  );
}
