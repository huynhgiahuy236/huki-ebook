"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/ui/context/CartContext';
import { useAuth } from '@/ui/context/AuthContext';
import { useTheme } from '@/ui/context/ThemeContext';
import { useToast } from '@/ui/context/ToastContext';
import { useChatSocket } from '@/ui/hooks/useChatSocket';
import { chatService } from '@/ui/services/chatService';
import { playChatChimeSound } from '@/ui/utils/chatSound';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import { catalogApi, BookData } from '@/ui/api/catalogApi';
import { personalizationService } from '@/ui/services/personalizationService';
import { useDebounce } from '@/ui/utils/useDebounce';
import UserAvatar from '@/ui/components/common/UserAvatar';
import UniversalNotificationBell from '@/ui/components/common/UniversalNotificationBell';

interface StoreHeaderProps {
  onToggleSidebar?: () => void;
  onToggleMobileSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export default function StoreHeader({
  onToggleSidebar,
  onToggleMobileSidebar,
  isSidebarCollapsed = true,
}: StoreHeaderProps) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { totalItemsCount } = useCart();
  const { user, isLoggedIn, logout, hasRole } = useAuth();
  const { theme, setTheme, isDarkMode, toggleDarkMode, palettes, currentPalette } = useTheme();
  const { showToast } = useToast();
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 250);
  const [apiSearchResults, setApiSearchResults] = useState<BookData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const isAdmin = Boolean(
    user?.role === 'PLATFORM_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    (user as any)?.role === 'ADMIN_CON' ||
    hasRole('PLATFORM_ADMIN') ||
    hasRole('admin')
  );

  const isSeller = !isAdmin && Boolean(
    user?.role === 'BUSINESS' ||
    user?.hasApprovedBusiness ||
    user?.business ||
    (Array.isArray(user?.memberships) && user.memberships.length > 0)
  );
  const chatUrl = isSeller ? '/seller/chat' : '/account/messages';

  // Lấy tổng số lượng tin nhắn chưa đọc của người dùng
  const fetchUnreadCount = useCallback(async () => {
    if (!isLoggedIn) {
      setUnreadChatCount(0);
      return;
    }
    try {
      const res = await chatService.listConversations();
      if (res.success && Array.isArray(res.data)) {
        const total = res.data.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setUnreadChatCount(total);
      }
    } catch {
      // ignore
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Lắng nghe tin nhắn mới qua WebSocket để phát chuông, hiện Toast và cộng dồn số lượng
  useChatSocket({
    onMessageReceived: (msg: any) => {
      const senderId = String(msg?.senderId || '');
      const myId = String(user?.id || (user as any)?._id || (user as any)?.sub || '');
      if (senderId && senderId === myId) return;

      // 1. Phát tiếng chuông báo tin nhắn đến
      playChatChimeSound();

      // 2. Tăng số đếm tin nhắn chưa đọc
      setUnreadChatCount((prev) => prev + 1);

      // 3. Hiển thị Toast thông báo nếu người dùng không ở trang chat
      const isChatPage = pathname.startsWith('/account/messages') || pathname.startsWith('/seller/chat');
      if (!isChatPage) {
        const senderName = msg?.senderName || 'Người bán';
        const rawContent = msg?.content || '';
        const snippet = typeof rawContent === 'string' && rawContent.trim()
          ? (rawContent.length > 60 ? rawContent.slice(0, 60) + '...' : rawContent)
          : (msg?.messageType === 'IMAGE' ? '[Đã gửi một hình ảnh]' : 'Bạn có một tin nhắn mới');

        showToast({
          title: `Tin nhắn từ ${senderName}`,
          message: snippet,
          type: 'info',
          actionUrl: chatUrl,
          actionLabel: 'Xem ngay',
          duration: 5000,
          playSound: false,
        });
      }
    },
    onMessageRead: () => {
      fetchUnreadCount();
    },
  });

  // Lắng nghe sự kiện đồng bộ realtime cross-tab
  useEffect(() => {
    const unsub = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'CHAT_UNREAD_COUNT_CHANGED') {
        fetchUnreadCount();
      }
    });
    return () => unsub();
  }, [fetchUnreadCount]);

  // Load search history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('huki_search_history');
      if (saved) {
        setSearchHistory(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveToHistory = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    try {
      personalizationService.recordSearch(clean);
      const updated = [clean, ...searchHistory.filter((h) => h.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
      setSearchHistory(updated);
    } catch {
      // ignore
    }
  };

  const removeFromHistory = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = searchHistory.filter((h) => h !== term);
    setSearchHistory(updated);
    try {
      localStorage.setItem('huki_search_history', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const clearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory([]);
    try {
      localStorage.removeItem('huki_search_history');
    } catch {
      // ignore
    }
  };

  // Fetch real search results from backend catalogApi
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setApiSearchResults([]);
      setIsSearching(false);
      return;
    }
    let isCancelled = false;
    setIsSearching(true);
    catalogApi
      .getPublicBooks({ search: debouncedQuery.trim(), limit: 6 })
      .then((res) => {
        if (!isCancelled && res && res.success && res.data) {
          const items = Array.isArray(res.data) ? res.data : (res.data as any).data || [];
          setApiSearchResults(items);
        }
      })
      .catch((err) => {
        console.warn('Search autocomplete error', err);
      })
      .finally(() => {
        if (!isCancelled) setIsSearching(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery]);

  // Derived user display properties
  const userDisplayName = useMemo(() => {
    if (!user) return 'Khách';
    return (
      (user as any).username ||
      user.fullName ||
      user.name ||
      (user as any).profile?.fullName ||
      (user.role === 'PLATFORM_ADMIN'
        ? 'Super Admin'
        : user.role === 'BUSINESS'
        ? 'Chủ Doanh Nghiệp'
        : user.email
        ? user.email.split('@')[0]
        : 'Khách Hàng')
    );
  }, [user]);

  const roleLabel = useMemo(() => {
    if (!user) return '';
    if (isAdmin) return 'Super Admin';
    if (user.role === 'BUSINESS') return 'Chủ Doanh Nghiệp';
    if (user.role === 'DELIVERY_STAFF' || user.role === 'SHIPPER') return 'Bưu Tá HuKi';
    if (user.role === 'USER') return 'Độc Giả HUKI';
    return user.role || 'Hội viên';
  }, [user, isAdmin]);

  // Từ khóa phổ biến động lấy trực tiếp từ CSDL thật (PostgreSQL)
  const [trendingKeywords, setTrendingKeywords] = useState<string[]>([
    'Đắc Nhân Tâm',
    'Nhà Giả Kim',
    'Dế Mèn Phiêu Lưu Ký',
    'Thám Tử Lừng Danh Conan',
    'Tâm Lý Học Về Tiền',
    'One Piece',
    'Cha Giàu Cha Nghèo',
    'Hoàng Tử Bé',
  ]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);

  // Fetch từ khóa phổ biến từ DB thật qua catalogApi
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingTrending(true);

    catalogApi
      .getPublicBooks({ limit: 20, sortBy: 'publishedAt', order: 'DESC' })
      .then((res) => {
        if (isCancelled || !res || !res.success || !res.data) return;
        const items = Array.isArray(res.data) ? res.data : (res.data as any).data || [];
        if (items.length > 0) {
          const list: string[] = [];
          for (const item of items) {
            if (!item.title) continue;
            // Rút gọn tiêu đề sách (loại bỏ phụ đề dài dòng nếu có)
            const clean = item.title.split(/–|-|\(/)[0].trim();
            if (clean && clean.length >= 3 && clean.length <= 28 && !list.includes(clean)) {
              list.push(clean);
            }
            if (list.length >= 7) break;
          }
          if (list.length > 0) {
            // Thêm từ khóa Manga/Văn Học nếu chưa có
            if (!list.includes('Manga')) list.push('Manga');
            setTrendingKeywords(list.slice(0, 8));
          }
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải từ khóa phổ biến từ DB:', err);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingTrending(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleSelectKeyword = (keyword: string) => {
    setSearchQuery(keyword);
    saveToHistory(keyword);
    setShowSearchSuggestions(false);
    router.push(`/books?q=${encodeURIComponent(keyword)}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveToHistory(searchQuery.trim());
      setShowSearchSuggestions(false);
      router.push(`/books?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    router.push('/auth/login');
  };

  // Đóng Search Suggestions và User Menu khi click ra ngoài hoặc nhấn phím ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setShowSearchSuggestions(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSearchSuggestions(false);
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[var(--theme-surface,#ffffff)] border-b border-[var(--theme-border,#e8e5df)] shadow-2xs shrink-0 transition-colors duration-200">
      {/* Top Utility Bar (h-[28px]) */}
      <div className="h-[28px] bg-[var(--theme-header-top,#003b2b)] text-[var(--theme-header-top-text,#ffffff)] text-[10.5px] px-4 md:px-6 flex items-center justify-between font-medium shrink-0 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-[var(--theme-header-top-accent,#94f5d6)]">verified_user</span>
            <span className="hidden sm:inline">Hệ sinh thái đọc Sách Thật &amp; Bản quyền số HUKI</span>
            <span className="sm:hidden font-semibold">HUKI EBOOK</span>
          </span>
          <span className="hidden sm:inline-block opacity-40">|</span>
          <span className="hidden md:flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-[var(--theme-header-top-accent,#94f5d6)]">support_agent</span>
            Hotline: 1900 8866 (8:00 - 21:00)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/vouchers"
            className="hover:text-[var(--theme-header-top-accent,#94f5d6)] transition-colors flex items-center gap-1 font-semibold text-emerald-200"
          >
            <span className="material-symbols-outlined text-[13px]">confirmation_number</span>
            <span>Mã Giảm Giá</span>
          </Link>
          <span className="opacity-40">|</span>
          <Link
            href="/flash-sale"
            className="hover:text-amber-300 transition-colors flex items-center gap-1 font-extrabold text-amber-300 animate-pulse"
          >
            <span className="material-symbols-outlined text-[13px]">bolt</span>
            <span>⚡ Flash Sale</span>
          </Link>
          {isAdmin ? (
            <Link
              href="/admin"
              className="hover:text-amber-200 transition-all flex items-center gap-1.5 font-bold text-amber-300 bg-white/10 hover:bg-white/20 px-2.5 py-0.5 rounded-full border border-amber-400/40 text-[11px] shadow-xs"
              title="Mở Bảng Điều Hành Quản Trị Hệ Thống HuKi"
            >
              <span className="material-symbols-outlined text-[13px] text-amber-300">admin_panel_settings</span>
              <span>Bảng Quản Trị Sàn</span>
            </Link>
          ) : (
            <Link
              href={isSeller ? '/seller/dashboard' : '/seller/register'}
              className="hover:text-[var(--theme-header-top-accent,#94f5d6)] transition-colors flex items-center gap-1 font-semibold"
            >
              <span className="material-symbols-outlined text-[13px]">storefront</span>
              <span>Kênh Người Bán</span>
            </Link>
          )}
          <span className="opacity-40">|</span>
          <div className="opacity-40 cursor-not-allowed pointer-events-none select-none hidden sm:flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">download</span>
            <span>Tải App (Sắp ra mắt)</span>
          </div>
          <span className="opacity-40 hidden sm:inline">|</span>
          <span className="text-[var(--theme-header-top-accent,#94f5d6)] font-semibold">VN</span>
        </div>
      </div>

      {/* Main Header Bar (h-[52px]) */}
      <div className="h-[52px] w-full flex items-center justify-between pr-3 md:pr-6 pl-0 shrink-0">
        {/* Left: Sidebar Toggle & Brand Typography */}
        <div className="flex items-center">
          {/* Hamburger / Sidebar Toggle Container - exactly w-[60px] to align with sidebar column */}
          <div className="w-[60px] flex items-center justify-center shrink-0">
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  if (onToggleMobileSidebar) onToggleMobileSidebar();
                } else {
                  if (onToggleSidebar) onToggleSidebar();
                }
              }}
              className="w-9 h-9 rounded-xl border border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003b2b)] flex items-center justify-center text-on-surface hover:text-[var(--theme-primary,#003b2b)] hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] active:scale-95 transition-all cursor-pointer shadow-2xs"
              title="Menu điều hướng"
              aria-label="Toggle Sidebar Navigation"
            >
              <span className="material-symbols-outlined text-[20px] text-[var(--theme-primary,#003b2b)]">
                menu
              </span>
            </button>
          </div>

          <Link href="/" className="flex flex-col group pl-1.5 pr-2 select-none">
            <span className="font-editorial text-lg md:text-xl font-black tracking-tight text-[var(--theme-primary,#003b2b)] leading-none">
              HUKI EBOOK
            </span>
            <span className="text-[7.5px] md:text-[8px] uppercase tracking-widest text-[#006953] font-bold mt-0.5">
              Sách Số &amp; Sách In
            </span>
          </Link>
        </div>

        {/* Global Semantic Search Bar */}
        <div ref={searchContainerRef} className="flex-1 max-w-xl mx-2 lg:mx-4 relative hidden md:block">
          <form onSubmit={handleSearch}>
            <div className="flex items-center bg-[var(--theme-surface-subtle,#f8f6f1)] border border-[var(--theme-border,#e8e5df)] rounded-lg px-2.5 py-1 focus-within:border-[var(--theme-primary,#003b2b)] focus-within:bg-[var(--theme-surface,#ffffff)] focus-within:ring-1 focus-within:ring-[var(--theme-primary,#003b2b)]/20 transition-all shadow-2xs">
              <span className="material-symbols-outlined text-[var(--theme-text-muted,#6b7280)] text-sm mr-1.5 shrink-0">search</span>
              <input
                type="text"
                placeholder="Tìm tác phẩm, tác giả, ISBN, chủ đề..."
                value={searchQuery}
                onFocus={() => setShowSearchSuggestions(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchSuggestions(true);
                }}
                className="w-full bg-transparent border-none outline-none text-[11.5px] text-[var(--theme-text,#17201f)] placeholder-[var(--theme-text-muted,#6b7280)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-700 p-0.5 mr-1 cursor-pointer"
                  title="Xóa từ khóa"
                >
                  <span className="material-symbols-outlined text-[14px] block">close</span>
                </button>
              )}
              <button
                type="submit"
                className="bg-[#003b2b] text-white px-2.5 py-0.5 rounded-md text-[11px] font-semibold hover:bg-[#00281d] transition-colors ml-1 shrink-0 cursor-pointer shadow-2xs"
              >
                Tìm
              </button>
            </div>
          </form>

          {/* Live Search Autocomplete Popover */}
          {showSearchSuggestions && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-[var(--theme-surface,#ffffff)] rounded-2xl shadow-2xl border border-[var(--theme-border,#e8e5df)] p-3 z-50 animate-fade-in-up text-xs overflow-hidden max-h-[460px] overflow-y-auto">
              {/* Header popover có nút đóng rõ ràng */}
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-emerald-600">travel_explore</span>
                  <span>Gợi Ý Tìm Kiếm HuKi</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowSearchSuggestions(false)}
                  className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                  title="Đóng bảng gợi ý (ESC hoặc click ra ngoài)"
                >
                  <span>Đóng</span>
                  <span className="material-symbols-outlined text-[13px]">close</span>
                </button>
              </div>

              {/* Case 1: Search Query is Empty -> Show Search History & Trending */}
              {!searchQuery.trim() ? (
                <div className="flex flex-col gap-3">
                  {/* Search History */}
                  {searchHistory.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between px-1 mb-1.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">history</span>
                          <span>Lịch sử tìm kiếm</span>
                        </span>
                        <button
                          type="button"
                          onClick={clearAllHistory}
                          className="text-[10.5px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          Xóa tất cả
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {searchHistory.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleSelectKeyword(item)}
                            className="group/item flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                          >
                            <span>{item}</span>
                            <button
                              type="button"
                              onClick={(e) => removeFromHistory(item, e)}
                              className="text-slate-400 hover:text-rose-600 rounded-full p-0.5"
                              title="Xóa khỏi lịch sử"
                            >
                              <span className="material-symbols-outlined text-[13px] block">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending Keywords from Real DB */}
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-amber-500">trending_up</span>
                        <span>Từ khóa phổ biến</span>
                      </span>
                      {isLoadingTrending && (
                        <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                          <span className="material-symbols-outlined text-[11px] animate-spin text-emerald-600">sync</span>
                          <span>Đang tải từ CSDL...</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {trendingKeywords.map((kw, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectKeyword(kw)}
                          className="px-2.5 py-1 bg-emerald-50/70 hover:bg-emerald-100 text-[#003b2b] border border-emerald-200/70 hover:border-emerald-300 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:scale-102 flex items-center gap-1 shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-[11px] text-emerald-600">search</span>
                          <span>{kw}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Case 2: Search Query is typed -> Show Live Books Autocomplete */
                <div>
                  <div className="text-[10px] font-bold text-[var(--theme-text-muted,#6b7280)] uppercase tracking-wider px-1 py-0.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      {isSearching ? (
                        <span className="material-symbols-outlined animate-spin text-[13px] text-[#003b2b]">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-[13px]">auto_stories</span>
                      )}
                      <span>Gợi ý tác phẩm</span>
                    </span>
                    <span>{apiSearchResults.length} kết quả</span>
                  </div>

                  {isSearching && apiSearchResults.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                      <span>Đang tìm kiếm...</span>
                    </div>
                  ) : apiSearchResults.length > 0 ? (
                    <div className="divide-y divide-slate-100 mt-1">
                      {apiSearchResults.map((b) => {
                        const coverSrc = b.coverImage || b.coverUrl || b.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=300&q=80';
                        const authorName = typeof b.author === 'string' ? b.author : (b.author as any)?.name || 'Nhiều tác giả';
                        const categoryName = typeof b.category === 'string' ? b.category : (b.category as any)?.name || 'Văn học & Tri thức';

                        return (
                          <Link
                            key={b.id}
                            href={`/book/${b.id}`}
                            onClick={() => {
                              saveToHistory(b.title);
                              setShowSearchSuggestions(false);
                            }}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-emerald-50/50 transition-colors group"
                          >
                            <img
                              src={coverSrc}
                              alt={b.title}
                              className="w-9 h-12 rounded-md object-cover border border-black/10 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-900 group-hover:text-[#003b2b] transition-colors line-clamp-1">
                                {b.title}
                              </p>
                              <p className="text-[11px] text-slate-500 line-clamp-1">
                                Tác giả: {authorName} • <span className="text-[#00875A] font-semibold">{categoryName}</span>
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-[#003b2b] block">
                                {(b.price || 89000).toLocaleString('vi-VN')}đ
                              </span>
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                {b.format === 'DIGITAL' ? 'Ebook' : b.format === 'PHYSICAL' ? 'Sách Giấy' : 'Ebook + Giấy'}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-400">
                      Không tìm thấy sách nào khớp với "{searchQuery}"
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSearch}
                    className="w-full mt-2 py-2 rounded-xl bg-slate-50 hover:bg-[#003b2b] hover:text-white text-[#003b2b] font-bold text-center transition-colors text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Xem tất cả kết quả cho "{searchQuery}"</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Action Icons & User Account */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Cart Icon */}
          <Link
            href="/cart"
            className="w-9 h-9 rounded-xl border border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003b2b)] flex items-center justify-center text-[var(--theme-text,#17201f)] hover:text-[var(--theme-primary,#003b2b)] hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] transition-all relative"
            title="Giỏ hàng HUKI"
          >
            <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
            {totalItemsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#003b2b] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {totalItemsCount > 99 ? '99+' : totalItemsCount}
              </span>
            )}
          </Link>

          {/* Universal Notification Bell */}
          {isLoggedIn && (
            <UniversalNotificationBell variant="user" />
          )}

          {/* Chat / Tin Nhắn - Opens in New Tab */}
          {isLoggedIn && (
            <Link
              href={chatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003b2b)] bg-white dark:bg-zinc-900 text-[var(--theme-text,#17201f)] hover:text-[var(--theme-primary,#003b2b)] hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] transition-all cursor-pointer shadow-2xs group shrink-0"
              title={isSeller ? "Hộp thư Chat Kênh Người Bán (Mở tab mới)" : "Tin nhắn của bạn (Mở tab mới)"}
              aria-label="Tin nhắn"
            >
              <span className="material-symbols-outlined text-[19px] text-[var(--theme-primary,#003b2b)]">
                chat
              </span>
              <span className="hidden sm:inline-block text-xs font-semibold whitespace-nowrap text-[var(--theme-text,#17201f)] group-hover:text-[var(--theme-primary,#003b2b)] transition-colors">
                Tin nhắn
              </span>
              {unreadChatCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#dc2626] text-white text-[10px] font-bold min-w-4.5 h-4.5 px-1 rounded-full flex items-center justify-center shadow-xs">
                  {unreadChatCount > 99 ? '99+' : unreadChatCount}
                </span>
              )}
            </Link>
          )}

          {/* User Account / Auth Buttons */}
          {isLoggedIn ? (
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 pl-1.5 pr-2.5 rounded-full border border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003b2b)] hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] transition-all cursor-pointer shadow-2xs group"
                title="Tài khoản cá nhân"
              >
                <UserAvatar user={user} size="sm" />
                <span className="hidden sm:inline-block text-xs font-bold text-[var(--theme-text,#17201f)] group-hover:text-[var(--theme-primary,#003b2b)] max-w-[130px] truncate transition-colors">
                  {userDisplayName}
                </span>
                <span className="material-symbols-outlined text-base text-[var(--theme-text-muted,#6b7280)] group-hover:text-[var(--theme-primary,#003b2b)] transition-colors">
                  arrow_drop_down
                </span>
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-[var(--theme-surface,#ffffff)] rounded-2xl shadow-xl border border-[var(--theme-border,#e8e5df)] p-2 z-50 animate-fade-in-up text-xs">
                  <div className="p-2 border-b border-[var(--theme-border,#e8e5df)]">
                    <p className="font-bold text-[var(--theme-text,#17201f)] text-sm">{userDisplayName}</p>
                    <p className="text-[11px] text-[var(--theme-text-muted,#6b7280)]">{user?.email}</p>
                    <span className="inline-block mt-1 bg-[var(--theme-secondary-subtle,#e6f4f0)] text-[var(--theme-primary,#003b2b)] px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {roleLabel}
                    </span>
                  </div>

                  {/* Super Admin Top Showcase Card */}
                  {isAdmin && (
                    <div className="p-2.5 mx-1 mt-1.5 mb-1.5 rounded-xl bg-gradient-to-br from-[#003B2B] to-[#06291f] border border-emerald-500/30 text-white shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-amber-300">admin_panel_settings</span>
                          HỆ THỐNG QUẢN TRỊ
                        </span>
                        <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-zinc-950 font-sans tracking-wide">
                          SUPER ADMIN
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-200/80 mb-2 leading-tight">
                        Tài khoản toàn quyền quản trị và vận hành sàn thương mại.
                      </p>
                      <Link
                        href="/admin"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs transition-colors shadow-xs"
                      >
                        <span className="material-symbols-outlined text-sm">dashboard</span>
                        <span>Mở Bảng Điều Hành Admin</span>
                      </Link>
                    </div>
                  )}

                  <div className="py-1 space-y-0.5">
                    <Link
                      href="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] text-[var(--theme-text,#17201f)] font-semibold transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base text-[var(--theme-primary,#003b2b)]">person</span>
                        <span>Trang Cá Nhân &amp; Tài Khoản</span>
                      </div>
                      <span className="material-symbols-outlined text-sm text-[var(--theme-text-muted,#6b7280)]">chevron_right</span>
                    </Link>

                    <Link
                      href="/library"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] text-[var(--theme-text,#17201f)] font-semibold transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base text-[var(--theme-primary,#003b2b)]">auto_stories</span>
                        <span>Tủ Sách Cá Nhân</span>
                      </div>
                      <span className="material-symbols-outlined text-sm text-[var(--theme-text-muted,#6b7280)]">chevron_right</span>
                    </Link>

                    <Link
                      href="/orders"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] text-[var(--theme-text,#17201f)] font-semibold transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base text-[var(--theme-primary,#003b2b)]">local_shipping</span>
                        <span>Đơn Mua Của Tôi</span>
                      </div>
                      <span className="material-symbols-outlined text-sm text-[var(--theme-text-muted,#6b7280)]">chevron_right</span>
                    </Link>

                    <Link
                      href="/vouchers?tab=wallet"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] text-[var(--theme-text,#17201f)] font-semibold transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base text-[var(--theme-primary,#003b2b)]">confirmation_number</span>
                        <span>Ví Voucher Của Tôi</span>
                      </div>
                      <span className="material-symbols-outlined text-sm text-[var(--theme-text-muted,#6b7280)]">chevron_right</span>
                    </Link>

                    <Link
                      href={chatUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] text-[var(--theme-text,#17201f)] font-semibold transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base text-[var(--theme-primary,#003b2b)]">chat</span>
                        <span>{isSeller ? 'Chat Kênh Người Bán' : 'Tin Nhắn & Chat'}</span>
                      </div>
                      <span className="material-symbols-outlined text-sm text-[var(--theme-text-muted,#6b7280)]">open_in_new</span>
                    </Link>

                    <Link
                      href="/profile/addresses"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] text-[var(--theme-text,#17201f)] font-semibold transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base text-[var(--theme-primary,#003b2b)]">location_on</span>
                        <span>Sổ Địa Chỉ Giao Hàng</span>
                      </div>
                      <span className="material-symbols-outlined text-sm text-[var(--theme-text-muted,#6b7280)]">chevron_right</span>
                    </Link>

                    <div className="pt-1">
                      {isAdmin ? (
                        <div className="space-y-1">
                          <Link
                            href="/admin/businesses"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold border border-emerald-200/80 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="material-symbols-outlined text-base text-[#003B2B]">corporate_fare</span>
                              <span>Quản Trị Doanh Nghiệp NXB</span>
                            </div>
                            <span className="material-symbols-outlined text-sm text-[#003B2B]">chevron_right</span>
                          </Link>
                          <Link
                            href="/admin/maintenance"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold border border-slate-200 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="material-symbols-outlined text-base text-slate-700">build</span>
                              <span>Bảo Trì &amp; Vận Hành Sàn</span>
                            </div>
                            <span className="material-symbols-outlined text-sm text-slate-500">chevron_right</span>
                          </Link>
                        </div>
                      ) : user?.business?.status === 'PENDING_APPROVAL' ? (
                        <Link
                          href="/seller/pending"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold border border-amber-200/80 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-base text-amber-700">hourglass_top</span>
                            <span>Kiểm Tra Hồ Sơ NXB</span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full">
                            Chờ duyệt
                          </span>
                        </Link>
                      ) : user?.business?.status === 'APPROVED' && user?.role !== 'BUSINESS' ? (
                        <Link
                          href="/seller/stores/setup"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold border border-emerald-200/80 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-base text-[#003B2B]">storefront</span>
                            <span>Thiết Lập Gian Hàng</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded-full">
                            Đã duyệt
                          </span>
                        </Link>
                      ) : user?.role === 'BUSINESS' || user?.hasApprovedBusiness ? (
                        <Link
                          href="/seller/dashboard"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold border border-emerald-200/80 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-base text-[#003B2B]">dashboard</span>
                            <span>Kênh Quản Trị Người Bán</span>
                          </div>
                          <span className="material-symbols-outlined text-sm text-[#003B2B]">chevron_right</span>
                        </Link>
                      ) : (
                        <Link
                          href="/seller/register"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold border border-emerald-200/80 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-base text-[#003b2b]">store</span>
                            <span>Đăng Ký Trở Thành NXB</span>
                          </div>
                          <span className="material-symbols-outlined text-sm text-[#003b2b]">chevron_right</span>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Dark Mode Toggle */}
                  <div className="border-t border-[var(--theme-border,#e8e5df)] my-1.5 pt-1.5">
                    <div className="flex items-center justify-between px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--theme-text,#17201f)]">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-[var(--theme-text-muted,#6b7280)]">
                          {isDarkMode ? 'dark_mode' : 'light_mode'}
                        </span>
                        <span>Chế độ ban đêm</span>
                      </div>
                      <button
                        type="button"
                        onClick={toggleDarkMode}
                        className={`w-8 h-5 rounded-full p-0.5 flex items-center transition-colors cursor-pointer ${
                          isDarkMode ? 'bg-[#003b2b]' : 'bg-gray-300'
                        }`}
                        aria-label="Chuyển đổi Dark mode"
                      >
                        <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-3.5' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-[var(--theme-border,#e8e5df)] my-1.5"></div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-emerald-50 text-[#003b2b] font-bold text-left transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">logout</span>
                    <span>Đăng Xuất Tài Khoản</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--theme-primary,#003b2b)] border border-[var(--theme-primary,#003b2b)]/30 hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">login</span>
                <span>Đăng Nhập</span>
              </Link>
              <Link
                href="/auth/register"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#003b2b] hover:bg-[#00281d] transition-all shadow-xs flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                <span className="hidden sm:inline">Đăng Ký</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
