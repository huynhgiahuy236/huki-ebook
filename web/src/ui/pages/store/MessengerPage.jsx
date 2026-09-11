import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

export default function MessengerPage() {
  const { showToast } = useToast();
  const { addItem } = useCart();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const initialShop = searchParams.get('shop') || searchParams.get('contact') || 'alpha-books';

  const [activeChannel, setActiveChannel] = useState(initialShop);
  const [activeTabFilter, setActiveTabFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Collapse controls for Left & Right sidebars
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Accordion states in Right panel (Facebook Messenger style)
  const [expandedSection, setExpandedSection] = useState({
    storeInfo: true,
    media: true,
    privacy: false
  });

  const [messageInput, setMessageInput] = useState('');
  const [savedVouchers, setSavedVouchers] = useState({});
  const [activeCallModal, setActiveCallModal] = useState(null); // 'voice' | 'video' | null
  const [callTimer, setCallTimer] = useState('00:24');

  const toggleSection = (section) => {
    setExpandedSection(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Channels Database
  const channels = [
    {
      id: 'alpha-books',
      name: 'Alpha Books Official',
      type: 'store',
      typeLabel: 'Mall',
      verified: true,
      avatar: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=200&q=80',
      isOnline: true,
      lastMsg: 'Dạ đơn #HUKI-8892401 đã được gửi sáng nay kèm bookmark mạ vàng ạ.',
      lastTime: '09:36',
      unread: 1,
      rating: '4.9/5',
      reviewCount: '18.4k',
      responseTime: '< 5p',
      pinnedBook: {
        id: 'atomic-habits',
        title: 'Atomic Habits - Thay Đổi Tí Hon',
        author: 'James Clear',
        format: 'Combo Hybrid',
        price: 189000,
        originalPrice: 270000,
        discount: '-30%',
        cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=200&q=80'
      },
      orderInfo: {
        id: 'HUKI-8892401',
        status: 'Đang vận chuyển',
        carrier: 'GHN Express',
        total: '189.000 ₫'
      }
    },
    {
      id: 'nha-nam',
      name: 'Nhã Nam Books',
      type: 'store',
      typeLabel: 'NXB',
      verified: true,
      avatar: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=200&q=80',
      isOnline: true,
      lastMsg: 'Voucher giảm 20% bộ Văn học kinh điển đã sẵn sàng!',
      lastTime: '10:15',
      unread: 0,
      rating: '4.9/5',
      reviewCount: '24.1k',
      responseTime: '< 10p',
      pinnedBook: {
        id: 'nha-gia-kim',
        title: 'Nhà Giả Kim (The Alchemist)',
        author: 'Paulo Coelho',
        format: 'Sách In Bìa Cứng',
        price: 64000,
        originalPrice: 80000,
        discount: '-20%',
        cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=200&q=80'
      }
    },
    {
      id: 'huki-support',
      name: 'HUKI Support 24/7',
      type: 'support',
      typeLabel: 'Chăm sóc',
      verified: true,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      isOnline: true,
      lastMsg: 'Yêu cầu đồng bộ thiết bị Web Reader DRM đã hoàn tất.',
      lastTime: '08:20',
      unread: 0,
      rating: '5.0/5',
      reviewCount: 'CSKH',
      responseTime: 'Tức thì'
    },
    {
      id: 'thu-trang',
      name: 'Lê Thu Trang',
      type: 'reader',
      typeLabel: 'Độc Giả',
      verified: false,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      isOnline: true,
      lastMsg: 'Bạn có tham gia thử thách đọc 20 cuốn sách 2026 không?',
      lastTime: 'Hôm qua',
      unread: 0,
      rating: 'VIP Gold',
      reviewCount: 'CLB Đọc',
      responseTime: 'Đang đọc'
    },
    {
      id: 'james-clear',
      name: 'James Clear',
      type: 'author',
      typeLabel: 'Tác Giả',
      verified: true,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
      isOnline: false,
      lastMsg: 'Weekly Newsletter: 3 Ideas on Habit Loops in 2026',
      lastTime: 'T2',
      unread: 0,
      rating: 'Bestseller',
      reviewCount: 'Alpha',
      responseTime: 'Tự động'
    }
  ];

  // Messages State
  const [messagesMap, setMessagesMap] = useState({
    'alpha-books': [
      {
        id: 1,
        sender: 'other',
        text: 'Chào bạn! Alpha Books hân hạnh được hỗ trợ bạn về ấn phẩm và đơn hàng.',
        time: '09:30',
        status: 'read'
      },
      {
        id: 2,
        sender: 'user',
        text: 'Shop ơi combo Hybrid cuốn Atomic Habits có còn kèm bookmark mạ vàng không ạ?',
        time: '09:32',
        status: 'read'
      },
      {
        id: 3,
        sender: 'other',
        text: 'Dạ chào bạn! Ấn bản 2026 vẫn có đính kèm bookmark mạ vàng và mã kích hoạt Ebook DRM đọc thử bạn nhé.',
        time: '09:34',
        status: 'read'
      },
      {
        id: 4,
        sender: 'other',
        type: 'voucher',
        voucherCode: 'ALPHA50K',
        discountText: 'GIẢM 50.000 ₫',
        minSpend: 'Đơn từ 180.000 ₫',
        expiry: 'HSD: 30/09/2026',
        time: '09:34',
        status: 'read'
      },
      {
        id: 5,
        sender: 'user',
        text: 'Tuyệt quá, mình vừa đặt combo trong đơn #HUKI-8892401 rồi, shop bọc chống sốc kỹ giúp mình nhé.',
        time: '09:35',
        status: 'read'
      },
      {
        id: 6,
        sender: 'other',
        type: 'order_status',
        orderId: 'HUKI-8892401',
        statusText: 'Đang vận chuyển (GHN Express)',
        productName: 'Atomic Habits (Combo In + DRM)',
        time: '09:36',
        status: 'delivered'
      }
    ],
    'nha-nam': [
      {
        id: 1,
        sender: 'other',
        text: 'Nhã Nam Books mến chào bạn! Hội sách mùa thu đang có ưu đãi 20% các tác phẩm kinh điển.',
        time: '10:00',
        status: 'read'
      }
    ],
    'huki-support': [
      {
        id: 1,
        sender: 'other',
        text: 'Xin chào! Tôi là trợ lý kỹ thuật HUKI DRM. Tôi có thể hỗ trợ bạn kích hoạt Ebook hoặc quản lý 5 thiết bị đọc.',
        time: '08:15',
        status: 'read'
      }
    ],
    'thu-trang': [
      {
        id: 1,
        sender: 'other',
        text: 'Chào bạn! Mình rất thích bài review sách của bạn trên diễn đàn.',
        time: 'Hôm qua',
        status: 'read'
      }
    ],
    'james-clear': [
      {
        id: 1,
        sender: 'other',
        text: 'Welcome to the 3-2-1 Newsletter! 3 short ideas from me, 2 quotes from others, and 1 question for you to ponder this week.',
        time: 'T2',
        status: 'read'
      }
    ]
  });

  const activeChannelData = channels.find(c => c.id === activeChannel) || channels[0];
  const activeMessages = messagesMap[activeChannel] || [];

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!messageInput.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: 'user',
      text: messageInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    setMessagesMap(prev => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), newMsg]
    }));

    setMessageInput('');

    setTimeout(() => {
      const replyMsg = {
        id: Date.now() + 1,
        sender: 'other',
        text: 'Cảm ơn bạn đã nhắn tin! Tư vấn viên của shop đã nhận được tin nhắn và sẽ phản hồi chi tiết ngay ạ.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read'
      };
      setMessagesMap(prev => ({
        ...prev,
        [activeChannel]: [...(prev[activeChannel] || []), replyMsg]
      }));
    }, 1200);
  };

  const handleSaveVoucher = (code) => {
    setSavedVouchers(prev => ({ ...prev, [code]: true }));
    showToast(`Đã lưu mã [${code}] vào kho Voucher của bạn!`, 'success');
  };

  // Filter channels
  const filteredChannels = channels.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTabFilter === 'stores') return matchesSearch && (c.type === 'store' || c.type === 'author');
    if (activeTabFilter === 'readers') return matchesSearch && c.type === 'reader';
    if (activeTabFilter === 'support') return matchesSearch && c.type === 'support';
    return matchesSearch;
  });

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-white select-none font-sans">
      {/* ================= TOP APP HEADER: BRAND & QUICK ACTIONS ================= */}
      <header className="h-14 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#003B2B] to-[#006B50] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]">chat</span>
            </div>
            <div className="flex flex-col">
              <span className="font-editorial text-base font-bold tracking-tight text-[#003B2B] leading-none">
                HUKI Chat
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7280]">
                Tin Nhắn & Tư Vấn Đọc Sách
              </span>
            </div>
          </Link>

          <div className="h-4 w-px bg-gray-200 mx-2 hidden sm:block"></div>

          <Link
            to="/"
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[#003B2B] px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Về Sàn Sách</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/books"
            className="text-xs font-semibold text-gray-600 hover:text-[#003B2B] px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors hidden md:inline-flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            <span>Khám phá sách</span>
          </Link>
          <Link
            to="/cart"
            className="text-xs font-semibold text-gray-600 hover:text-[#003B2B] px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors inline-flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
            <span>Giỏ hàng</span>
          </Link>
          <Link
            to="/profile"
            className="text-xs font-semibold text-gray-600 hover:text-[#003B2B] px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors inline-flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">account_circle</span>
            <span>Tài khoản</span>
          </Link>
        </div>
      </header>

      {/* ================= 3-COLUMN MESSENGER BODY ================= */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* ================= 1. LEFT COLUMN: CONVERSATION LIST (COLLAPSIBLE) ================= */}
        <aside
          className={`border-r border-gray-200 bg-white flex flex-col shrink-0 transition-all duration-300 relative ${
            isLeftCollapsed ? 'w-[72px]' : 'w-[280px] lg:w-[320px]'
          }`}
        >
          {/* Left Header */}
          <div className="p-3.5 border-b border-gray-100 flex items-center justify-between shrink-0">
            {!isLeftCollapsed && (
              <div className="flex items-center gap-2">
                <h2 className="font-editorial text-xl font-bold text-gray-900 tracking-tight">Đoạn chat</h2>
              </div>
            )}

          {/* Toggle Collapse Left Button */}
          <button
            onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
            className={`p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors ${
              isLeftCollapsed ? 'mx-auto' : ''
            }`}
            title={isLeftCollapsed ? 'Mở rộng danh sách chat' : 'Thu gọn danh sách chat'}
          >
            <span className="material-symbols-outlined text-lg">
              {isLeftCollapsed ? 'chevron_right' : 'menu_open'}
            </span>
          </button>
        </div>

        {/* Search & Tabs (Visible only when expanded) */}
        {!isLeftCollapsed && (
          <div className="p-3 space-y-2.5 border-b border-gray-100 shrink-0">
            {/* Search Bar */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2 text-gray-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Tìm kiếm trên Messenger..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-100/80 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#006953] transition-all"
              />
            </div>

            {/* Filter Pills (Facebook Messenger style) */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'stores', label: 'Shop & NXB' },
                { id: 'readers', label: 'Bạn đọc' },
                { id: 'support', label: 'Hỗ trợ' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabFilter(tab.id)}
                  className={`px-3 py-1 rounded-full font-semibold transition-all whitespace-nowrap text-xs ${
                    activeTabFilter === tab.id
                      ? 'bg-[#006953] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Channel Items List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredChannels.map((c) => {
            const isActive = activeChannel === c.id;

            return (
              <div
                key={c.id}
                onClick={() => setActiveChannel(c.id)}
                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[#006953]/10 text-[#006953]'
                    : 'hover:bg-gray-100 text-gray-800'
                } ${isLeftCollapsed ? 'justify-center p-2' : ''}`}
                title={isLeftCollapsed ? c.name : undefined}
              >
                {/* Avatar with Online Badge */}
                <div className="relative shrink-0">
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="w-12 h-12 rounded-full object-cover border border-gray-200"
                  />
                  {c.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  )}
                </div>

                {/* Info Text (only when expanded) */}
                {!isLeftCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className={`font-bold text-xs sm:text-sm truncate ${isActive ? 'text-[#006953]' : 'text-gray-900'}`}>
                          {c.name}
                        </span>
                        {c.verified && (
                          <span className="material-symbols-outlined text-xs text-[#006953] shrink-0">verified</span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{c.lastTime}</span>
                    </div>

                    <p className="text-xs text-gray-500 truncate leading-tight">
                      {c.lastMsg}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ================= 2. MIDDLE COLUMN: SPACIOUS CHAT THREAD ================= */}
      <main className="flex-1 flex flex-col min-w-0 h-full bg-[#f6f8f7] relative">
        
        {/* Chat Thread Top Header Bar */}
        <div className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between shrink-0 shadow-2xs z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={activeChannelData.avatar}
                alt={activeChannelData.name}
                className="w-10 h-10 rounded-full object-cover border border-gray-200"
              />
              {activeChannelData.isOnline && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
              )}
            </div>

            <div className="min-w-0 truncate">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-gray-900 truncate">{activeChannelData.name}</h3>
                {activeChannelData.verified && (
                  <span className="material-symbols-outlined text-sm text-[#006953]">verified</span>
                )}
                <span className="px-1.5 py-0.2 rounded bg-[#006953]/10 text-[#006953] text-[10px] font-bold">
                  {activeChannelData.typeLabel}
                </span>
              </div>
              <p className="text-[11px] text-emerald-600 font-medium truncate">
                {activeChannelData.isOnline ? 'Đang hoạt động' : 'Không hoạt động'}
              </p>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setActiveCallModal('voice')}
              className="p-2 text-gray-500 hover:text-[#006953] hover:bg-gray-100 rounded-full transition-colors"
              title="Bắt đầu gọi thoại"
            >
              <span className="material-symbols-outlined text-xl">call</span>
            </button>

            <button
              onClick={() => setActiveCallModal('video')}
              className="p-2 text-gray-500 hover:text-[#006953] hover:bg-gray-100 rounded-full transition-colors"
              title="Bắt đầu gọi video"
            >
              <span className="material-symbols-outlined text-xl">videocam</span>
            </button>

            {/* Toggle Right Info Panel Button (Facebook Messenger Style) */}
            <button
              onClick={() => setShowRightPanel(!showRightPanel)}
              className={`p-2 rounded-full transition-colors ${
                showRightPanel
                  ? 'bg-[#006953] text-white shadow-xs'
                  : 'text-gray-500 hover:text-[#006953] hover:bg-gray-100'
              }`}
              title={showRightPanel ? 'Đóng bảng thông tin bên phải' : 'Mở bảng thông tin bên phải'}
            >
              <span className="material-symbols-outlined text-xl">info</span>
            </button>
          </div>
        </div>

        {/* Pinned Book Banner (if available) */}
        {activeChannelData.pinnedBook && (
          <div className="px-6 py-2.5 bg-white/90 backdrop-blur-sm border-b border-gray-200 flex items-center justify-between text-xs z-10 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={activeChannelData.pinnedBook.cover}
                alt={activeChannelData.pinnedBook.title}
                className="w-8 h-11 object-cover rounded shadow-2xs border shrink-0"
              />
              <div className="min-w-0 truncate">
                <span className="text-[10px] text-gray-400 block font-medium">Sản phẩm đang quan tâm:</span>
                <strong className="text-gray-900 font-bold truncate block">{activeChannelData.pinnedBook.title}</strong>
                <span className="font-bold text-[#006953]">{activeChannelData.pinnedBook.price.toLocaleString('vi-VN')} ₫</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={`/book/${activeChannelData.pinnedBook.id}`}
                className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors"
              >
                Xem Sách
              </Link>
              <button
                onClick={() => {
                  addItem({
                    id: activeChannelData.pinnedBook.id,
                    title: activeChannelData.pinnedBook.title,
                    price: activeChannelData.pinnedBook.price,
                    cover: activeChannelData.pinnedBook.cover,
                    quantity: 1
                  });
                  showToast('Đã thêm sách vào giỏ hàng!', 'success');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#006953] hover:bg-[#00523c] text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">shopping_cart</span>
                Thêm Giỏ
              </button>
            </div>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {activeMessages.map((msg) => {
            const isMe = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <img
                    src={activeChannelData.avatar}
                    alt={activeChannelData.name}
                    className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
                  />
                )}

                <div className="max-w-md lg:max-w-xl space-y-1">
                  {/* Normal Text Message */}
                  {msg.text && (
                    <div
                      className={`px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                        isMe
                          ? 'bg-[#006953] text-white rounded-2xl rounded-tr-xs'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-tl-xs'
                      }`}
                    >
                      <p>{msg.text}</p>
                      <div
                        className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1 ${
                          isMe ? 'text-emerald-100/70' : 'text-gray-400'
                        }`}
                      >
                        <span>{msg.time}</span>
                        {isMe && <span className="material-symbols-outlined text-xs">done_all</span>}
                      </div>
                    </div>
                  )}

                  {/* Voucher Card Message */}
                  {msg.type === 'voucher' && (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 shadow-sm space-y-2.5 max-w-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded">
                          Voucher Độc Quyền
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium">{msg.expiry}</span>
                      </div>

                      <div>
                        <span className="text-xl font-black text-emerald-900 block">{msg.discountText}</span>
                        <span className="text-xs text-gray-600 font-medium">{msg.minSpend}</span>
                      </div>

                      <button
                        onClick={() => handleSaveVoucher(msg.voucherCode)}
                        disabled={savedVouchers[msg.voucherCode]}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          savedVouchers[msg.voucherCode]
                            ? 'bg-emerald-200 text-emerald-800 cursor-default'
                            : 'bg-[#006953] hover:bg-[#00523c] text-white shadow-sm'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {savedVouchers[msg.voucherCode] ? 'check_circle' : 'bookmark_add'}
                        </span>
                        {savedVouchers[msg.voucherCode] ? 'ĐÃ LƯU VOUCHER' : `LƯU MÃ [${msg.voucherCode}]`}
                      </button>
                    </div>
                  )}

                  {/* Order Status Message */}
                  {msg.type === 'order_status' && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-2 max-w-sm">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-gray-800">Đơn #{msg.orderId}</span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[11px]">
                          {msg.statusText}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600">{msg.productName}</p>

                      <Link
                        to={`/orders/${msg.orderId}`}
                        className="block w-full py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-center text-xs font-bold text-gray-800 transition-colors"
                      >
                        Tra Cứu Lộ Trình Đơn Hàng →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-6 py-2 bg-white/80 border-t border-gray-200 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs shrink-0">
          <span className="text-[11px] text-gray-400 shrink-0 font-medium">Gợi ý:</span>
          {[
            'Sách còn hàng sẵn không shop?',
            'Thời gian giao hàng về TP.HCM?',
            'Ebook DRM đọc offline như thế nào?',
            'Tư vấn mua Combo tiết kiệm'
          ].map((chip, idx) => (
            <button
              key={idx}
              onClick={() => setMessageInput(chip)}
              className="px-3 py-1 rounded-full bg-white border border-gray-200 hover:border-[#006953] hover:text-[#006953] text-gray-600 transition-colors whitespace-nowrap text-xs shadow-2xs font-medium"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Bottom Chat Input Form */}
        <form
          onSubmit={handleSendMessage}
          className="p-3.5 bg-white border-t border-gray-200 flex items-center gap-2.5 shrink-0"
        >
          <button
            type="button"
            onClick={() => showToast('Mở công cụ đính kèm file ảnh & tài liệu', 'info')}
            className="p-2 text-gray-400 hover:text-[#006953] hover:bg-gray-100 rounded-full transition-colors"
            title="Đính kèm tệp"
          >
            <span className="material-symbols-outlined text-xl">add_circle</span>
          </button>

          <button
            type="button"
            onClick={() => setMessageInput(prev => prev + ' 😊')}
            className="p-2 text-gray-400 hover:text-[#006953] hover:bg-gray-100 rounded-full transition-colors"
            title="Biểu tượng cảm xúc"
          >
            <span className="material-symbols-outlined text-xl">mood</span>
          </button>

          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Nhập nội dung tin nhắn... (Nhấn Enter để gửi)"
            className="flex-1 px-4 py-2.5 bg-gray-100 border border-transparent rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-[#006953] focus:bg-white transition-all text-gray-900"
          />

          <button
            type="submit"
            disabled={!messageInput.trim()}
            className="px-4 py-2.5 bg-[#006953] hover:bg-[#00523c] text-white rounded-2xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-30 disabled:hover:bg-[#006953]"
          >
            <span>Gửi</span>
            <span className="material-symbols-outlined text-base">send</span>
          </button>
        </form>
      </main>

      {/* ================= 3. RIGHT COLUMN: FACEBOOK MESSENGER STYLE PROFILE & ACCORDION ================= */}
      {showRightPanel && (
        <aside className="w-[300px] lg:w-[340px] border-l border-gray-200 bg-white flex flex-col shrink-0 overflow-y-auto custom-scrollbar animate-fade-in">
          
          {/* Profile Header (Facebook Messenger style) */}
          <div className="p-6 text-center border-b border-gray-100 flex flex-col items-center">
            <div className="relative mb-3">
              <img
                src={activeChannelData.avatar}
                alt={activeChannelData.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 shadow-sm"
              />
              {activeChannelData.verified && (
                <span className="absolute bottom-0 right-0 p-1 bg-[#006953] text-white rounded-full text-xs flex items-center justify-center">
                  <span className="material-symbols-outlined text-[13px]">verified</span>
                </span>
              )}
            </div>

            <h4 className="font-bold text-base text-gray-900">{activeChannelData.name}</h4>
            <span className="mt-1 px-2.5 py-0.5 rounded-full bg-[#006953]/10 text-[#006953] font-bold text-[11px]">
              {activeChannelData.typeLabel} Chính Hãng
            </span>

            {/* Quick Action Icons */}
            <div className="flex items-center justify-center gap-6 mt-4 pt-2">
              <Link
                to={`/shop/${activeChannelData.id}`}
                className="flex flex-col items-center gap-1 text-gray-600 hover:text-[#006953] group"
              >
                <div className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-[#006953]/10 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-lg">storefront</span>
                </div>
                <span className="text-[11px] font-medium">Gian hàng</span>
              </Link>

              <button
                onClick={() => showToast('Đã tắt thông báo đoạn chat này trong 8 giờ', 'info')}
                className="flex flex-col items-center gap-1 text-gray-600 hover:text-[#006953] group"
              >
                <div className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-[#006953]/10 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-lg">notifications_off</span>
                </div>
                <span className="text-[11px] font-medium">Tắt báo</span>
              </button>

              <button
                onClick={() => showToast('Mở tìm kiếm từ khóa trong hội thoại', 'info')}
                className="flex flex-col items-center gap-1 text-gray-600 hover:text-[#006953] group"
              >
                <div className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-[#006953]/10 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-lg">search</span>
                </div>
                <span className="text-[11px] font-medium">Tìm kiếm</span>
              </button>
            </div>
          </div>

          {/* Accordion Sections (Facebook Messenger style) */}
          <div className="divide-y divide-gray-100 text-xs">
            
            {/* Section 1: Thông tin shop & Đơn hàng */}
            <div className="p-3">
              <button
                onClick={() => toggleSection('storeInfo')}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 font-bold text-gray-800 transition-colors"
              >
                <span>Thông tin &amp; Đơn hàng</span>
                <span className="material-symbols-outlined text-lg text-gray-400 transition-transform">
                  {expandedSection.storeInfo ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {expandedSection.storeInfo && (
                <div className="pt-2 px-2 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                      <span className="text-gray-400 text-[10px] block">Đánh giá</span>
                      <strong className="text-gray-900 font-bold">★ {activeChannelData.rating}</strong>
                    </div>

                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                      <span className="text-gray-400 text-[10px] block">Phản hồi</span>
                      <strong className="text-emerald-700 font-bold">{activeChannelData.responseTime}</strong>
                    </div>
                  </div>

                  {activeChannelData.orderInfo && (
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900">Đơn Gần Nhất</span>
                        <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-1.5 rounded">
                          {activeChannelData.orderInfo.status}
                        </span>
                      </div>
                      <p className="text-gray-600 font-mono text-[11px]">#{activeChannelData.orderInfo.id}</p>
                      <Link
                        to={`/orders/${activeChannelData.orderInfo.id}`}
                        className="block w-full py-1 bg-white border border-emerald-300 text-emerald-800 font-bold rounded text-center text-[11px] hover:bg-emerald-100 transition-colors"
                      >
                        Chi tiết đơn →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 2: File phương tiện và file (Media & Files) */}
            <div className="p-3">
              <button
                onClick={() => toggleSection('media')}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 font-bold text-gray-800 transition-colors"
              >
                <span>File phương tiện và file</span>
                <span className="material-symbols-outlined text-lg text-gray-400 transition-transform">
                  {expandedSection.media ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {expandedSection.media && (
                <div className="pt-2 px-2 space-y-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=200&q=80',
                      'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=200&q=80',
                      'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?auto=format&fit=crop&w=200&q=80'
                    ].map((imgUrl, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden border border-gray-200 group cursor-pointer">
                        <img src={imgUrl} alt="Shared" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Quyền riêng tư và hỗ trợ */}
            <div className="p-3">
              <button
                onClick={() => toggleSection('privacy')}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 font-bold text-gray-800 transition-colors"
              >
                <span>Quyền riêng tư và hỗ trợ</span>
                <span className="material-symbols-outlined text-lg text-gray-400 transition-transform">
                  {expandedSection.privacy ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {expandedSection.privacy && (
                <div className="pt-2 px-2 space-y-1">
                  <button
                    onClick={() => showToast('Đã gửi báo cáo đoạn chat tới bộ phận kiểm duyệt.', 'info')}
                    className="w-full text-left p-2 rounded hover:bg-red-50 text-red-600 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">report</span>
                    <span>Báo cáo sự cố / vi phạm</span>
                  </button>
                  <button
                    onClick={() => showToast('Đã chuyển tiếp tới bộ phận CSKH HUKI 24/7', 'info')}
                    className="w-full text-left p-2 rounded hover:bg-gray-100 text-gray-700 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">help</span>
                    <span>Trung tâm trợ giúp HUKI</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>
      )}
      </div>

      {/* Voice / Video Call Modal */}
      {activeCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-[#18181b] text-white rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl border border-zinc-700">
            <div className="relative mx-auto w-24 h-24">
              <img
                src={activeChannelData.avatar}
                alt={activeChannelData.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500 shadow-xl"
              />
              <span className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-ping opacity-25"></span>
            </div>

            <div>
              <h3 className="font-bold text-lg text-white">{activeChannelData.name}</h3>
              <p className="text-xs text-emerald-400 font-mono mt-1">
                {activeCallModal === 'voice' ? 'Cuộc gọi thoại HUKI' : 'Cuộc gọi Video HD'} • {callTimer}
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={() => showToast('Đã bật/tắt Micro', 'info')}
                className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-xl">mic</span>
              </button>

              <button
                onClick={() => setActiveCallModal(null)}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
              >
                <span className="material-symbols-outlined text-2xl">call_end</span>
              </button>

              <button
                onClick={() => showToast('Đã bật/tắt Camera', 'info')}
                className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-xl">videocam</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
