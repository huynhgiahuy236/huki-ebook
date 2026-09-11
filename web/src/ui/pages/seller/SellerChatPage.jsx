import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export default function SellerChatPage() {
  const { showToast } = useToast();

  const [activeCustomer, setActiveCustomer] = useState('cust-1');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: 'customer',
      text: 'Shop ơi cuốn Atomic Habits bản in bìa mềm có còn ấn bản kèm bookmark chữ ký tác giả không ạ?',
      time: '09:32',
      status: 'read'
    },
    {
      id: 2,
      sender: 'seller',
      text: 'Dạ chào bạn Minh Trí! Ấn bản bìa mềm đợt xuất bản mới 2026 của Alpha Books bên em vẫn có đính kèm bookmark mạ vàng và mã kích hoạt Ebook DRM đọc thử bạn nhé.',
      time: '09:34',
      status: 'read'
    },
    {
      id: 3,
      sender: 'customer',
      text: 'Tuyệt quá, mình vừa đặt combo Hybrid trong đơn #HUKI-8892401 rồi, shop bọc chống sốc kỹ giúp mình nha.',
      time: '09:35',
      status: 'read'
    },
    {
      id: 4,
      sender: 'seller',
      text: 'Dạ NXB đã nhận đơn hàng #HUKI-8892401 và đang tiến hành đóng hộp carton 3 lớp kèm túi khí chống sốc chuyên dụng gửi bạn trong sáng nay ạ!',
      time: '09:36',
      status: 'delivered'
    }
  ]);

  const customers = [
    {
      id: 'cust-1',
      name: 'Nguyễn Minh Trí',
      tier: 'VIP Gold',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB66Vs3T1qKYDqHJH9T1YbF1U4F-iJmD5-ZtisJSZ_Rq5BWICkEw6cXnhsSYKwRtS5mj3YjqpAeCNSyzqeojzgLJKa1W2iElPm2MbYIdj1cEIRBaV1oxpeDtuwQmgQXIhneczrAaZmcIwDH-tVC2RSJfPrc1j_-WslD8Erf38EA2VLPQI5m8R_4MNUhqHLx3so4YhtcJvoRM2dLxgd7QNEXoq7X0AEMb2fldw1N2S9BH2BCpuGCf9-vLg',
      isOnline: true,
      lastMsg: 'Tuyệt quá, mình vừa đặt combo...',
      lastTime: '09:36',
      product: 'Atomic Habits (Combo)',
      productCover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBldhgYiC5r8pQXi4qeHSTCtWbbqbNG3on0MvhA1aDlNqhPWUc0vxDN66WP08gQOhujNyn9ioDRAdk0WMZ2kusBW1UaNz_drE-pr1z6kDX__xWCUYXEou-HgS4oTKLU_PdZUYQU71wmsMrkWVQ2QQQ9TpzYAwBodRXxIwHfqU3BdZALmt5R3bfLCpA0TV9C5YDY7LX8yfeFuJj3ZWernvxTjnpvNMG56GL6j2j-E-XC_WY454GWEaLicw',
      unread: 0,
      hasOrder: true,
      isVip: true,
      orderCount: 6,
      totalSpent: '1.850.000 ₫',
      orderId: 'HUKI-8892401',
      orderStatus: 'Đang vận chuyển'
    },
    {
      id: 'cust-2',
      name: 'Lê Thu Trang',
      tier: 'VIP Bạc',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvuLfGBqC2eCGItcHyomrcsFnLsXIVIF0qADKLeXJE7UJ6PPQbFsoLKheDBJWWrbnoXxroA7jQwO5QNeHdHuTpr-lNiVvPR-_lEqG07T5EHhcj9UqGqJZ1gZDHp-PYZDkxfFEuwDysVNr6yyoDgJ705PbrwGp6m93iXnzUusjpbUOAqo_MjIvjyXU2jgasaYoEaDRuqcq9BIdraZLWdu7Au3hT-y1iYWnY14HNzKi7stkdmMcaAkkbyA',
      isOnline: false,
      lastMsg: 'Em vừa nhận Ebook trên Web Reader rồi ạ...',
      lastTime: '10:15',
      product: 'Tâm Lý Học Về Tiền',
      productCover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB8jItzbAJIC3KVerOwstn03tRIb9-Ua-_Ayd_gJXO9Ljzl9MhNj9E0jAA-NsUZdlcrAYh-V2ydL0x4auN0rpQFmfG80dSCVsSRl5SygWjzwm7BSaLIqLpTnnqyIIR4e97uyqE1XtnC_P81L9aQbRcwNPrYEr2gurkLh4by197FvJhU0Rc1dzF-Bm0K87BOLnRHSI9EHxRG7plWfXbgyqj6v_e9exxMoCv0Rj7YRvJgy89bi5tRX8Gg5Q',
      unread: 1,
      hasOrder: true,
      isVip: false,
      orderCount: 3,
      totalSpent: '520.000 ₫',
      orderId: 'HUKI-8874102',
      orderStatus: 'Đã hoàn tất'
    },
    {
      id: 'cust-3',
      name: 'Trần Đức Kiên',
      tier: 'Khách mới',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBg_cN5aJIOUQ2qSbhdl2i4scTc1NloqDQjftD7FSLc9uyj1JfPDhD92m8FGhTRl4Ks7CLRukUa4A6PZqa0ZIvYHN6BUWuqDk4kc2i8XphW2bhjpJIv4LqaEBtRzFsV9JCJFnuCKG3AOIJQsN4pcbhMSswho7T8cncPvhdAlILvBdJfn9tqpsu3F-Ig_FjBMf2wbnh1erqUZQKHOBmk9e5YJJpXySN0E6-XuKbUSIkPljKRR0BsM1JGKg',
      isOnline: true,
      lastMsg: 'Shop nhớ bọc chống sốc giúp mình nhé...',
      lastTime: '09:40',
      product: 'Sapiens: Lược Sử Loài Người',
      productCover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC2H3l5c7_JP2T-qUtp7DCY42wLc1tMDdyQtRiGNH8LsvYEqbyEo-qNhVf3Y-KZ7Q487upiQuJrXSnZxfwkuBjlnOUhC1ckdcF1tq3pOW3BN48BgA7QIETZbXRTXLru6om1zQx1itIhe8B9R80sk9RnkV5_68mjjA7MX-1fEj0FAiAaHcySuAI3OFkRnGBT7ggCfz9PSVO64-R_x7QgsvkfhnbJvxNjkHVXfNnXcJ0fyKqOB3TYw8ZYHQ',
      unread: 0,
      hasOrder: true,
      isVip: false,
      orderCount: 1,
      totalSpent: '215.000 ₫',
      orderId: 'HUKI-8899201',
      orderStatus: 'Chờ giao hàng'
    },
    {
      id: 'cust-4',
      name: 'Võ Hoàng Nam',
      tier: 'VIP Platinum',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpTUISg-tnfY2rrFojWmbuCx5z779iKnlLgbGz_GLAahWWB8eXP59pYu32VuchN8TAUY2t9FFU636fN99eX09aUYBV7b6QmulGn_6VlfW6R2AZMukgt2emUGXS1AtVlTbpptOBW26u9Jn8STRX4LVTj7ztimGDT-59XVaEH1_8M_qJYFji6Jbp9VnE5CS-fKcM02gS5paQmBxB6SqTKyBbyxLQiEGLIS50Z_MTn9u9Gj0HWMnrBpOetw',
      isOnline: true,
      lastMsg: 'Cảm ơn shop, Ebook DRM đọc rất mượt!',
      lastTime: 'Hôm qua',
      product: 'Deep Work',
      productCover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB06UJjwmySkWO-lcfIpp-tQX2isyHgJfCNHFeVGqet945k-QEyOGtoBJmOY5mkW4OO0_fqjb2L8ZhZHezfPSJFZeluYgaOYIVJoLOWpi5X2Gqos_sc2M5ByrCMUK2PtGJD4BttxIBcmlvNhw_LflzwFjhtZ7uDkAd5d9LQ_7OZzMZEFUN7GmHdxAq5tAn-Dhpsn-QIx2iYBDYtJhNS0pomV2jRyIDclpVgHqvuJ1t2E0dSgSeMI8lWyQ',
      unread: 0,
      hasOrder: true,
      isVip: true,
      orderCount: 14,
      totalSpent: '4.290.000 ₫',
      orderId: 'HUKI-8860293',
      orderStatus: 'Đã hoàn tất'
    }
  ];

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: 'seller',
      text: messageInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    setChatMessages(prev => [...prev, newMsg]);
    setMessageInput('');
  };

  const sendQuickReply = (text) => {
    const newMsg = {
      id: Date.now(),
      sender: 'seller',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };
    setChatMessages(prev => [...prev, newMsg]);
    showToast('Đã gửi tin nhắn mẫu!', 'success');
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.product.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === 'unread') return c.unread > 0;
    if (activeFilter === 'orders') return c.hasOrder;
    if (activeFilter === 'vip') return c.isVip;
    return true;
  });

  const currentCustomer = customers.find(c => c.id === activeCustomer) || customers[0];

  return (
    <div className="w-full h-full bg-background text-on-surface font-body-md flex flex-col overflow-hidden select-none">
      
      {/* 3-Column Messenger Grid */}
      <div className="flex-1 min-h-0 flex overflow-hidden h-full">

        {/* 1. Left Sidebar: Conversations List (~280px) */}
        <div className="w-72 lg:w-[280px] border-r border-theme-border flex flex-col h-full bg-surface-container-lowest shrink-0 overflow-hidden">
          
          {/* Header Bar */}
          <div className="p-3 border-b border-theme-border/70 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-xl font-bold">forum</span>
                <h1 className="text-xs font-bold text-on-surface">Hộp Thư Khách Hàng</h1>
              </div>
              <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                {customers.length} khách
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-on-surface-variant text-sm">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm khách hàng..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-surface-container-low rounded-lg border border-theme-border/60 text-xs text-on-surface focus:outline-none focus:border-primary transition-all placeholder:text-on-surface-variant/60"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto text-[10.5px] font-semibold scrollbar-none">
              {[
                { id: 'all', label: 'Tất Cả' },
                { id: 'unread', label: 'Chưa Đọc' },
                { id: 'orders', label: 'Có Đơn' },
                { id: 'vip', label: 'VIP' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-2 py-0.5 rounded-md shrink-0 transition-all cursor-pointer ${
                    activeFilter === f.id
                      ? 'bg-primary text-white shadow-2xs font-bold'
                      : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Threads List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-0.5 custom-scroll">
            {filteredCustomers.map(cust => {
              const isSelected = activeCustomer === cust.id;
              return (
                <div
                  key={cust.id}
                  onClick={() => setActiveCustomer(cust.id)}
                  className={`p-2 rounded-xl flex items-start gap-2.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/10 border border-primary/25 shadow-2xs'
                      : 'hover:bg-surface-container-low border border-transparent'
                  }`}
                >
                  <div className="relative shrink-0 mt-0.5">
                    <img className="w-8 h-8 rounded-full object-cover shadow-2xs border border-theme-border bg-white" src={cust.avatar} alt={cust.name} />
                    {cust.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-0.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`font-bold text-xs truncate ${isSelected ? 'text-primary' : 'text-on-surface'}`}>{cust.name}</span>
                      <span className="text-[9.5px] text-on-surface-variant shrink-0">{cust.lastTime}</span>
                    </div>
                    <div className="text-[10px] font-semibold text-primary truncate mb-0.5">
                      📖 {cust.product}
                    </div>
                    <p className="text-[11px] text-on-surface-variant truncate">{cust.lastMsg}</p>
                  </div>
                  {cust.unread > 0 && (
                    <span className="w-3.5 h-3.5 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center shrink-0 shadow-2xs mt-1">
                      {cust.unread}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Store Status Bottom Footnote */}
          <div className="p-2 border-t border-theme-border/60 flex items-center justify-between text-[10.5px] text-on-surface-variant bg-surface-container-low/40 shrink-0">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Gian hàng Trực Tuyến</span>
            </span>
            <span className="font-semibold text-primary">Alpha Books</span>
          </div>
        </div>

        {/* 2. Middle Column: Active Chat Stream (Flex-1) */}
        <div className="flex-1 flex flex-col h-full bg-surface-container-low/20 border-r border-theme-border overflow-hidden min-w-0">
          
          {/* Active Chat Header */}
          <div className="h-13 px-3 sm:px-4 bg-surface-container-lowest border-b border-theme-border/70 flex items-center justify-between shrink-0 shadow-2xs z-10">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img className="w-7 h-7 rounded-full object-cover border border-theme-border bg-white" src={currentCustomer.avatar} alt={currentCustomer.name} />
                <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-1 ring-white ${
                  currentCustomer.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                }`}></span>
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-on-surface flex items-center gap-1.5 truncate">
                  <span className="truncate">{currentCustomer.name}</span>
                  <span className="bg-amber-100 text-amber-900 text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0">
                    {currentCustomer.tier}
                  </span>
                </div>
                <div className="text-[10px] text-on-surface-variant flex items-center gap-1">
                  <span className={currentCustomer.isOnline ? 'text-emerald-600 font-semibold' : 'text-on-surface-variant'}>
                    {currentCustomer.isOnline ? '● Trực tuyến' : 'Ngoại tuyến'}
                  </span>
                  <span>•</span>
                  <span>Đang hỏi: <strong className="text-on-surface truncate">{currentCustomer.product}</strong></span>
                </div>
              </div>
            </div>

            {/* Header Right Quick Action Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <Link
                to={`/orders/${currentCustomer.orderId}`}
                className="hidden sm:inline-flex items-center gap-1 text-[10.5px] text-primary font-semibold bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors"
                title="Xem đơn hàng"
              >
                <span className="material-symbols-outlined text-xs">receipt_long</span>
                <span>#{currentCustomer.orderId}</span>
              </Link>
              
              <button
                type="button"
                onClick={() => setShowRightPanel(!showRightPanel)}
                className={`w-7 h-7 rounded-lg border border-theme-border transition-all flex items-center justify-center cursor-pointer shadow-2xs ${
                  showRightPanel ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
                }`}
                title={showRightPanel ? "Thu gọn hồ sơ" : "Mở hồ sơ"}
              >
                <span className="material-symbols-outlined text-base">info</span>
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 custom-scroll">
            
            {/* Timestamp Badge */}
            <div className="text-center my-1">
              <span className="text-[9.5px] bg-surface-container text-on-surface-variant px-2.5 py-0.5 rounded-full font-bold shadow-2xs border border-theme-border/50">
                Hôm nay, 08/09/2026
              </span>
            </div>

            {/* Product Reference Card */}
            <div className="max-w-sm mx-auto p-2 rounded-xl bg-surface-container-lowest border border-theme-border/80 shadow-2xs flex items-center gap-2.5 my-1.5">
              <div className="w-8 aspect-[3/4] rounded overflow-hidden border border-theme-border shrink-0 bg-surface-container">
                <img className="w-full h-full object-cover" alt={currentCustomer.product} src={currentCustomer.productCover} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[8.5px] font-bold uppercase text-primary px-1 py-0.2 bg-primary/10 rounded">Sản phẩm khách xem</span>
                <h4 className="font-bold text-[11px] text-on-surface truncate mt-0.5">{currentCustomer.product}</h4>
                <div className="text-[10px] font-bold text-primary">Combo Sách In &amp; DRM</div>
              </div>
              <button
                onClick={() => sendQuickReply(`Dạ tác phẩm "${currentCustomer.product}" đang có sẵn và được freeship ạ!`)}
                className="px-2 py-1 rounded-md bg-primary text-white text-[10px] font-bold hover:opacity-90 transition-all shrink-0 cursor-pointer shadow-2xs"
              >
                Tư vấn nhanh
              </button>
            </div>

            {/* Message Bubbles */}
            {chatMessages.map(msg => {
              const isSeller = msg.sender === 'seller';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isSeller ? 'justify-end' : 'justify-start'} items-end gap-1.5 group`}
                >
                  {!isSeller && (
                    <img className="w-6 h-6 rounded-full object-cover shrink-0 border border-theme-border shadow-2xs mb-0.5 bg-white" src={currentCustomer.avatar} alt="Avatar" />
                  )}
                  <div className={`max-w-[80%] sm:max-w-[65%] py-2 px-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                    isSeller
                      ? 'bg-primary text-white rounded-br-xs'
                      : 'bg-surface-container-lowest text-on-surface border border-theme-border/80 rounded-bl-xs'
                  }`}>
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <div className={`flex items-center justify-end gap-1 text-[9px] mt-1 ${isSeller ? 'text-white/80' : 'text-on-surface-variant'}`}>
                      <span>{msg.time}</span>
                      {isSeller && (
                        <span className="material-symbols-outlined text-[11px]">
                          {msg.status === 'read' ? 'done_all' : 'done'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Reply Suggestions Bar */}
          <div className="px-3 py-1.5 bg-surface-container-lowest border-t border-theme-border/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs shrink-0">
            <span className="text-on-surface-variant font-bold shrink-0 text-[10px] flex items-center gap-0.5">
              <span className="material-symbols-outlined text-xs text-primary">bolt</span> Gợi ý:
            </span>
            {[
              'Dạ bên em còn ấn bản kèm bookmark ạ!',
              'Ebook DRM đã kích hoạt trên Web Reader rồi ạ!',
              'Gửi voucher 15% cho khách VIP',
              'Đơn hàng đang đóng gói chống sốc 3 lớp ạ!'
            ].map((chip, i) => (
              <button
                key={i}
                onClick={() => sendQuickReply(chip)}
                className="px-2 py-0.5 bg-surface-container-low hover:bg-primary hover:text-white rounded-full text-[10px] font-medium text-on-surface whitespace-nowrap transition-all border border-theme-border/50 cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Message Input Bar */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-surface-container-lowest border-t border-theme-border/70 flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => showToast('Mở bộ sưu tập ảnh đính kèm', 'info')}
              className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary rounded-lg transition-colors cursor-pointer"
              title="Đính kèm hình ảnh"
            >
              <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
            </button>
            <button
              type="button"
              onClick={() => showToast('Mở danh sách voucher gửi khách', 'info')}
              className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary rounded-lg transition-colors cursor-pointer"
              title="Gửi voucher"
            >
              <span className="material-symbols-outlined text-lg">loyalty</span>
            </button>
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Nhập nội dung tư vấn... (Nhấn Enter để gửi)"
              className="flex-1 px-3 py-1.5 bg-surface-container-low rounded-lg border border-theme-border/70 text-xs text-on-surface focus:outline-none focus:border-primary transition-all placeholder:text-on-surface-variant/60"
            />
            <button
              type="submit"
              disabled={!messageInput.trim()}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-all shrink-0 cursor-pointer ${
                messageInput.trim()
                  ? 'bg-primary text-white hover:opacity-95 shadow-xs'
                  : 'bg-surface-container text-on-surface-variant cursor-not-allowed opacity-60'
              }`}
            >
              <span className="material-symbols-outlined text-sm">send</span>
              <span>Gửi</span>
            </button>
          </form>
        </div>

        {/* 3. Right Sidebar: Compact Customer CRM (~240px) */}
        {showRightPanel && (
          <div className="w-60 lg:w-[250px] flex flex-col h-full bg-surface-container-lowest shrink-0 border-l border-theme-border/60 overflow-hidden">
            
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 custom-scroll">
              
              {/* Customer Profile Card */}
              <div className="text-center pb-2.5 border-b border-theme-border/70 space-y-1.5">
                <div className="relative inline-block mx-auto">
                  <img className="w-11 h-11 rounded-full object-cover ring-2 ring-primary/10 shadow-2xs border border-theme-border bg-white" src={currentCustomer.avatar} alt={currentCustomer.name} />
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-1 ring-white ${
                    currentCustomer.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}></span>
                </div>
                <div>
                  <h3 className="font-bold text-xs text-on-surface">{currentCustomer.name}</h3>
                  <span className="inline-block bg-amber-100 text-amber-900 text-[9px] font-bold px-2 py-0.2 rounded-full mt-0.5">
                    {currentCustomer.tier}
                  </span>
                </div>
              </div>

              {/* CRM Statistics */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center p-2 bg-surface-container-low/70 rounded-lg border border-theme-border/60">
                  <span className="text-on-surface-variant">Đơn thành công:</span>
                  <span className="font-bold text-on-surface">{currentCustomer.orderCount} đơn</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-surface-container-low/70 rounded-lg border border-theme-border/60">
                  <span className="text-on-surface-variant">Tổng chi tiêu:</span>
                  <span className="font-bold text-primary">{currentCustomer.totalSpent}</span>
                </div>
              </div>

              {/* Active Order Card */}
              <div className="p-2.5 bg-surface-container-low/50 rounded-xl border border-theme-border/80 space-y-1.5 text-xs shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary">ĐƠN GẦN NHẤT</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900">
                    {currentCustomer.orderStatus}
                  </span>
                </div>
                <div className="font-bold text-[11px] text-on-surface">#{currentCustomer.orderId}</div>
                <div className="flex items-center gap-2 p-1.5 bg-surface-container-lowest rounded-lg border border-theme-border/60">
                  <div className="w-7 aspect-[3/4] rounded overflow-hidden border border-theme-border shrink-0 bg-surface-container">
                    <img className="w-full h-full object-cover" alt="Product" src={currentCustomer.productCover} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[10.5px] text-on-surface truncate">{currentCustomer.product}</div>
                    <div className="text-[9.5px] text-on-surface-variant">Sách In + Ebook DRM</div>
                  </div>
                </div>

                <Link
                  to={`/orders/${currentCustomer.orderId}`}
                  className="block text-center py-1 bg-surface-container-lowest hover:bg-surface-container border border-theme-border text-on-surface font-semibold rounded-lg text-[10px] transition-all"
                >
                  Xem Chi Tiết Đơn Hàng
                </Link>
              </div>
            </div>

            {/* Action Buttons Pinned at Bottom */}
            <div className="p-2.5 bg-surface-container-lowest border-t border-theme-border/70 space-y-1.5 shrink-0">
              <button
                onClick={() => showToast('Đã gửi tặng Voucher 20k tới khách hàng!', 'success')}
                className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg text-[11px] transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>🎁</span>
                <span>Tặng Voucher Độc Quyền</span>
              </button>
              <button
                onClick={() => showToast('Đã chuyển cuộc trò chuyện sang kỹ thuật DRM HUKI', 'info')}
                className="w-full py-1.5 bg-surface-container-lowest border border-theme-border hover:bg-surface-container text-on-surface font-semibold rounded-lg text-[10.5px] transition-all cursor-pointer"
              >
                Chuyển Kỹ Thuật DRM
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
