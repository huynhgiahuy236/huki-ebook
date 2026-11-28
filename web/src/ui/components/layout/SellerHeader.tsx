import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { soundEffects } from '@/ui/utils/soundEffects';
import { useChatSocket } from '@/ui/hooks/useChatSocket';
import { chatService } from '@/ui/services/chatService';
import { playChatChimeSound } from '@/ui/utils/chatSound';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import UniversalNotificationBell from '../common/UniversalNotificationBell';
import { HukiLogo } from '@/components/brand/HukiLogo';

export interface SellerHeaderProps {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
}

export default function SellerHeader({ isSidebarCollapsed, toggleSidebar, toggleMobileSidebar }: SellerHeaderProps) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { user, activeBusinessId } = useAuth();
  const { showToast } = useToast();
  const sellerName = user?.business?.name || user?.fullName || user?.name || "NXB Doanh Nghiệp";
  const storeId = React.useMemo(() => {
    const ids = new Set<string>();
    if (activeBusinessId) ids.add(activeBusinessId);
    const biz = user?.business as any;
    if (biz?.id) ids.add(biz.id);
    if (biz?.slug) ids.add(biz.slug);
    if (biz?.taxCode) ids.add(biz.taxCode);
    if (Array.isArray(user?.memberships)) {
      user.memberships.forEach((m: any) => {
        if (m?.businessId) ids.add(m.businessId);
      });
    }
    if (Array.isArray(biz?.stores)) {
      biz.stores.forEach((s: any) => {
        if (s?.id) ids.add(s.id);
        if (s?.slug) ids.add(s.slug);
      });
    }
    if (user?.id) ids.add(user.id);
    const OFFICIAL_ALIASES = [
      '77777777-0000-4000-8000-000000000001',
      '88888888-0000-4000-8000-000000000001',
      '99999999-0000-4000-8000-000000000001',
      '3094e54e-2549-42cc-92fb-14a8f8589277',
      '1079fc76-a467-48a9-8034-b072aaa5afea',
      'nha-sach-huki-official',
      'huki-official',
    ];
    if (Array.from(ids).some((id) => OFFICIAL_ALIASES.includes(id))) {
      OFFICIAL_ALIASES.forEach((alias) => ids.add(alias));
    }
    return Array.from(ids).filter(Boolean).join(',');
  }, [user, activeBusinessId]);

  const [isMuted, setIsMuted] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // BUG-020: Search Header Routing (Mã đơn -> /seller/orders; Sách/SKU -> /seller/products)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    if (/^#?ORD-/i.test(q)) {
      const cleanCode = q.replace(/^#/, '');
      router.push(`/seller/orders?search=${encodeURIComponent(cleanCode)}`);
    } else {
      router.push(`/seller/products?search=${encodeURIComponent(q)}`);
    }
  };

  useEffect(() => {
    setIsMuted(soundEffects.getIsMuted());
  }, []);

  // BUG-02-001: Rate limit & Exponential Backoff protection against HTTP 429
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  const fetchUnreadCount = useCallback(async (force = false) => {
    if (!storeId) return;
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current < 15000) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;
    try {
      const res = await chatService.listConversations(storeId);
      if (res.success && Array.isArray(res.data)) {
        const total = res.data.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setUnreadChatCount(total);
      }
    } catch (err: any) {
      if (err?.statusCode === 429 || err?.status === 429) {
        lastFetchTimeRef.current = Date.now() + 45000;
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [storeId]);

  useEffect(() => {
    fetchUnreadCount(true);
    // Periodic gentle refresh every 45s only when tab is active
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchUnreadCount();
      }
    }, 45000);
    return () => clearInterval(timer);
  }, [fetchUnreadCount]);

  useChatSocket({
    storeId,
    onMessageReceived: (msg: any) => {
      const senderId = String(msg?.senderId || '');
      const myId = String(user?.id || (user as any)?._id || (user as any)?.sub || '');
      const storeIds = storeId ? storeId.split(',') : [];
      if ((senderId && senderId === myId) || msg?.senderType === 'BUSINESS' || storeIds.includes(senderId)) return;

      if (pathname.startsWith('/seller/chat')) {
        return;
      }

      if (!soundEffects.getIsMuted()) {
        playChatChimeSound();
      }

      setUnreadChatCount((prev) => prev + 1);

      const senderName = msg?.senderName || 'Khách hàng';
      const rawContent = msg?.content || '';
      const snippet = typeof rawContent === 'string' && rawContent.trim()
        ? (rawContent.length > 60 ? rawContent.slice(0, 60) + '...' : rawContent)
        : (msg?.messageType === 'IMAGE' ? '[Đã gửi một hình ảnh]' : 'Bạn có một tin nhắn mới');

      showToast({
        id: msg?.id ? `chat_msg_${msg.id}` : undefined,
        title: `Tin nhắn từ ${senderName}`,
        message: snippet,
        type: 'info',
        actionUrl: msg?.conversationId ? `/seller/chat?conversationId=${msg.conversationId}` : '/seller/chat',
        actionLabel: 'Trả lời ngay',
        duration: 5000,
        playSound: false,
      });
    },
    onMessageRead: () => {
      fetchUnreadCount(true);
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
        {/* Hamburger / Sidebar Toggle Container */}
        <div className="w-10 sm:w-[60px] flex items-center justify-center shrink-0">
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
            className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 border border-[#E2E8F0] cursor-pointer active:scale-95"
            title="Mở menu"
            aria-label="Open Mobile Menu"
          >
            <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-[#003B2B]">menu</span>
          </button>
        </div>

        {/* Brand - Chuẩn nhận diện Home & Admin (Không icon thừa) */}
        <Link href="/seller/dashboard" className="flex flex-col group select-none pl-1 pr-2 sm:pr-3 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <HukiLogo variant="dark" className="h-5 sm:h-[22px] w-auto" priority />
            <span className="bg-[#003B2B] text-white text-[7px] sm:text-[8px] font-black uppercase px-1 sm:px-1.5 py-0.5 rounded tracking-wider">
              SELLER
            </span>
          </div>
          <span className="text-[7px] sm:text-[8px] uppercase tracking-widest text-[#006953] font-bold mt-0.5 whitespace-nowrap">
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

      {/* Center Search - Tinh tế & đồng bộ chuẩn HuKi */}
      <form
        onSubmit={handleSearch}
        className="hidden md:flex items-center gap-2 bg-[#F8FAFC] hover:bg-[#F1F5F9] focus-within:bg-white border border-[#E2E8F0] focus-within:border-[#00875A] focus-within:ring-2 focus-within:ring-[#00875A]/15 rounded-full px-3.5 h-9 w-48 lg:w-64 xl:w-80 text-xs text-slate-800 transition-all shadow-2xs focus-within:shadow-xs shrink-0"
      >
        <span className="material-symbols-outlined text-[17px] text-slate-400 shrink-0">search</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm mã đơn, SKU, tựa sách..."
          className="bg-transparent border-none outline-none w-full text-xs font-medium text-slate-800 placeholder:text-slate-400 min-w-0"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
            aria-label="Xóa tìm kiếm"
          >
            <span className="material-symbols-outlined text-[14px] block">close</span>
          </button>
        )}
      </form>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3 shrink-0">
        {/* Chuông Thông Báo Realtime Toàn Diện */}
        <UniversalNotificationBell variant="seller" />

        {/* Nút Bật/Tắt Âm Thanh Thông Báo & Nổ Đơn (Ẩn trên mobile để thoáng header) */}
        <button
          type="button"
          onClick={() => {
            const newMuted = soundEffects.toggleMute();
            setIsMuted(newMuted);
          }}
          className="hidden sm:flex items-center justify-center w-8 sm:w-9 h-8 sm:h-9 rounded-xl border border-theme-border text-on-surface hover:text-[#003B2B] hover:bg-theme-secondary-subtle transition-all cursor-pointer shadow-2xs active:scale-95"
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
          target={pathname.startsWith('/seller/chat') ? '_self' : '_blank'}
          rel="noopener noreferrer"
          className={`relative flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border transition-colors shrink-0 group ${
            pathname.startsWith('/seller/chat')
              ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
              : 'border-theme-border text-on-surface hover:text-[#003B2B] hover:bg-theme-secondary-subtle'
          }`}
          title="Mở cửa sổ Chat & Tin nhắn chăm sóc khách hàng"
          aria-label="Tin nhắn"
        >
          <span className="material-symbols-outlined text-[16px] sm:text-[17px] text-[#003B2B]">chat</span>
          <span className="hidden sm:inline text-xs font-semibold whitespace-nowrap group-hover:text-[#003B2B]">Tin nhắn</span>
          {unreadChatCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#dc2626] text-white text-[9px] sm:text-[10px] font-bold min-w-4 sm:min-w-4.5 h-4 sm:h-4.5 px-1 rounded-full flex items-center justify-center shadow-xs">
              {unreadChatCount > 99 ? '99+' : unreadChatCount}
            </span>
          )}
        </Link>

        <Link
          href="/seller/product/create-hybrid"
          className="flex items-center gap-1 bg-theme-primary text-white px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-sm shrink-0 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[15px]">add_circle</span>
          <span className="hidden sm:inline">Thêm Sản Phẩm</span>
          <span className="sm:hidden text-[11px]">Thêm</span>
        </Link>

        <div className="hidden sm:block h-4 w-px bg-theme-border shrink-0"></div>

        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1 text-xs font-semibold text-theme-primary hover:bg-theme-secondary-subtle px-2 sm:px-2.5 py-1.5 rounded-xl border border-theme-border transition-colors shrink-0 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[15px]">open_in_new</span>
          <span className="hidden sm:inline">Về Sàn</span>
        </Link>
      </div>
    </header>
  );
}
