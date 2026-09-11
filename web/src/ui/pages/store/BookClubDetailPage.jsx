import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useCart } from '../../context/CartContext';

export default function BookClubDetailPage() {
  const { id = 'lean-growth' } = useParams();
  const { showToast } = useToast();
  const { addToCart } = useCart();

  const [isJoined, setIsJoined] = useState(true);
  const [activeTab, setActiveTab] = useState('discussions');
  const [newPostText, setNewPostText] = useState('');
  const [rsvpd, setRsvpd] = useState(false);

  const handleToggleJoin = () => {
    setIsJoined(prev => {
      const next = !prev;
      showToast(next ? 'Đã tham gia CLB Tư Duy Tinh Gọn & Khởi Nghiệp!' : 'Đã rời khỏi câu lạc bộ.', next ? 'success' : 'info');
      return next;
    });
  };

  const handleCreatePost = (e) => {
    e.preventDefault();
    if (!newPostText.trim()) {
      showToast('Vui lòng nhập nội dung bài thảo luận!', 'error');
      return;
    }
    showToast('Đã đăng bài thảo luận lên diễn đàn CLB!', 'success');
    setNewPostText('');
  };

  const handleRsvp = () => {
    setRsvpd(prev => {
      const next = !prev;
      showToast(next ? 'Đã đăng ký tham gia buổi Salon Online ngày 15/09!' : 'Đã hủy đăng ký sự kiện.', next ? 'success' : 'info');
      return next;
    });
  };

  const clubDiscussions = [
    {
      id: 'post-1',
      author: 'Trần Hoàng Nam (Host CLB)',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvXzMEpZQRPmFc3qYoIed6VOzd9YfMe8fur6LVd0ksGHWRZx4oTdQGc3QIIg-c3fLjx_Oln3iOqL-3OE9UogJw-aZswE21JoepkvkE9TbuOnlJ0-uwinrCoBaRAH7ef_GId1IpPw_bMPnaN40pKVqFfJ_3t4KfWWdpxb4LyrGwQktvg8x1-5r5_xVIsatX5dzoB9CHbu7vMF9sASg0GMVDB9ws2r227llvQz2nRdiqkcAzkc0h6hzJBg',
      badge: 'Chủ Tịch CLB',
      time: '2 giờ trước',
      title: 'Phân tích Thiên lệch nhận thức Hệ thống 1 & Hệ thống 2 trong "Tư Duy Nhanh Và Chậm"',
      content: 'Chào cả nhà, trong chương 3 Daniel Kahneman phân tích rất kỹ về hiện tượng cạn kiệt bản ngã (ego depletion). Mọi người áp dụng bài học này thế nào khi quản lý năng lượng làm việc mỗi ngày?',
      likes: 48,
      comments: 19,
      pinned: true
    },
    {
      id: 'post-2',
      author: 'Lê Thu Trang',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvuLfGBqC2eCGItcHyomrcsFnLsXIVIF0qADKLeXJE7UJ6PPQbFsoLKheDBJWWrbnoXxroA7jQwO5QNeHdHuTpr-lNiVvPR-_lEqG07T5EHhcj9UqGqJZ1gZDHp-PYZDkxfFEuwDysVNr6yyoDgJ705PbrwGp6m93iXnzUusjpbUOAqo_MjIvjyXU2jgasaYoEaDRuqcq9BIdraZLWdu7Au3hT-y1iYWnY14HNzKi7stkdmMcaAkkbyA',
      badge: 'Thành Viên Tích Cực',
      time: '5 giờ trước',
      title: 'Tóm tắt Mindmap Chương 1-5 cuốn sách của tháng đã sẵn sàng!',
      content: 'Mình vừa hoàn thành bản sơ đồ tư duy PDF chất lượng cao, các bạn thành viên VIP có thể tải trực tiếp trong tab Tài Liệu nhé.',
      likes: 85,
      comments: 32,
      pinned: false
    }
  ];

  return (
    <div className="w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 font-body-md">
      {/* Breadcrumbs */}
      <nav className="text-body-sm text-on-surface-variant mb-6 flex items-center gap-2 flex-wrap">
        <Link to="/" className="hover:text-[#ac2c19] transition-colors">Trang chủ</Link>
        <span>/</span>
        <Link to="/community" className="hover:text-[#ac2c19] transition-colors">Mạng Xã Hội Độc Giả</Link>
        <span>/</span>
        <span className="text-theme-primary font-semibold">CLB Tư Duy Tinh Gọn & Khởi Nghiệp (Lean & Growth)</span>
      </nav>

      {/* Club Hero Cover & Community Showcase Card */}
      <div className="bg-theme-surface rounded-3xl border border-theme-border overflow-hidden shadow-sm mb-8">
        {/* Panoramic Salon Meetup Banner */}
        <div
          className="relative h-56 sm:h-64 bg-cover bg-center flex items-center px-6 sm:px-12"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCHEmoN557ivagLcB_68FSJfolScezycjd8LTKwzvDLbBeksMoRJwpOEE5m0pFHETqzAy9wkD_1zJjI8PpyGPNqTrt0xcwUNChbIt7UOdgk3-uAURGBEEo1ydhr5qBZTidQyw6Q1rC_7hQYEBgIce3zWX3XT-IEiv4_LaudwUjVxAm8hJoEaSjUy_60BxeDRp5M_7xQOlw4An0LHloc7bxgJnFDEV85SCc9sNhXcLKCWRwL4VeTk29e6A')`
          }}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"></div>
          <div className="relative z-10 max-w-3xl text-white">
            <span className="inline-block px-3 py-1 bg-[#fea619]/20 text-[#fea619] text-xs font-bold rounded-full mb-3 uppercase tracking-wider border border-[#fea619]/30">
              Salon Văn Hóa & Tri Thức HUKI
            </span>
            <h2 className="font-editorial text-xl sm:text-2xl md:text-3xl font-bold italic leading-snug">
              “Chia sẻ tri thức, đồng hành cùng 14.200 độc giả tinh hoa trên hành trình tự học và khai phóng tư duy.”
            </h2>
          </div>
        </div>

        {/* Profile Bar */}
        <div className="p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 -mt-14 sm:-mt-18 ring-4 ring-white shadow-xl bg-[#00427A] text-white flex items-center justify-center font-bold text-2xl sm:text-3xl shrink-0 relative rounded-2xl">
              💡 LG
              <span className="absolute -bottom-1 -right-1 bg-theme-secondary text-white p-1 rounded-full ring-2 ring-white flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              </span>
            </div>
            <div className="space-y-1">
              <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface">
                CLB Đọc Sách Tư Duy Tinh Gọn & Khởi Nghiệp
              </h1>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-on-surface-variant">
                <span className="px-3 py-0.5 bg-[#fea619]/15 text-[#855300] font-bold rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">military_tech</span> CLB Xuất Sắc 2026
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-theme-secondary font-bold">
                  <span className="material-symbols-outlined text-xs">groups</span> 14.200 Thành viên
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-[#ac2c19]">forum</span> 50+ Thảo luận mỗi tuần
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleToggleJoin}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                isJoined
                  ? 'bg-theme-secondary-subtle text-theme-secondary border border-theme-border hover:bg-theme-border'
                  : 'bg-theme-secondary hover:opacity-90 text-white shadow-sm'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {isJoined ? 'check_circle' : 'add'}
              </span>
              {isJoined ? 'Đã Tham Gia (Thành Viên)' : 'Tham Gia CLB'}
            </button>
            <button
              onClick={() => {
                document.getElementById('post-composer')?.scrollIntoView({ behavior: 'smooth' });
                document.getElementById('post-input')?.focus();
              }}
              className="bg-theme-primary hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add</span>
              + Viết Bài Thảo Luận
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                showToast('Đã sao chép liên kết CLB!', 'success');
              }}
              className="border border-theme-border text-on-surface hover:bg-theme-bg p-2.5 rounded-xl text-xs transition-all cursor-pointer"
              title="Chia sẻ CLB"
            >
              <span className="material-symbols-outlined text-base">share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Book of the Month Spotlight */}
      <div className="bg-theme-secondary-subtle border border-theme-border rounded-3xl p-6 sm:p-8 mb-8 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 w-full lg:w-auto">
          <div className="w-24 h-36 sm:w-28 sm:h-40 rounded-xl overflow-hidden shadow-md shrink-0 bg-theme-surface relative border border-theme-border">
            <img
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAb1VMwfLl35x4YbZFd0QOWxofcjBQocxdoY2hWnjG6Xt8SfQ61I65hZJIkQpBTdjk_UGArsbo0NmoZqcfZJ7fPXmRUej1ioeeoovkJdzpTRJjdtMzlGWipRNt6asQQCeYM424wzu0f3Y_z0EvIfWFjFhoTjZSmgtAV_MAP2n3ruznkObdskgicFtqqRzvXJyplsHgDdKH16w-V9eWrWkwKd3o7oIPHjwl0Ygr69Vwq-EM5rQhkCGKIaw"
              alt="Thinking Fast and Slow"
            />
          </div>
          <div className="space-y-2 text-center sm:text-left">
            <span className="inline-block text-[11px] font-bold text-theme-secondary uppercase tracking-wider bg-theme-surface px-3 py-1 rounded-full border border-theme-border shadow-2xs">
              📖 CUỐN SÁCH CỦA THÁNG 09/2026 — ĐANG ĐỌC CÙNG CLB
            </span>
            <h3 className="font-editorial text-xl sm:text-2xl font-bold text-on-surface">
              Tư Duy Nhanh Và Chậm (Thinking, Fast and Slow)
            </h3>
            <p className="text-xs text-on-surface-variant max-w-xl">
              Tác giả: Daniel Kahneman • Dịch giả: Tùng Lê • NXB Thế Giới & Alpha Books
            </p>
            <div className="pt-2">
              <div className="flex justify-between text-xs font-semibold text-on-surface mb-1">
                <span>68% Thành viên CLB đã đọc xong</span>
                <span className="text-theme-secondary">Chương 12/28</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-theme-secondary rounded-full" style={{ width: '68%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0">
          <Link
            to="/reader"
            className="px-6 py-3 bg-theme-primary hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">chrome_reader_mode</span>
            Vào Phòng Đọc Chung
          </Link>
          <button
            onClick={() => {
              addToCart({
                id: 'thinking-fast-slow',
                title: 'Tư Duy Nhanh Và Chậm',
                price: 159000,
                format: 'hybrid',
                cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANH9QImz-ucfcn9uv_MlbqtxToG_dytIK3a8VA3WhDMJxtc7C7nGB3P4THS39VcuT2OdgWu_eGDaTUI8j1aBQd9YjObATDkleR2X6wUk023tz5x5l0XYGbT8s-eLIGufFcL4aRX3zc_qLlav8X4ZhfgFjrtLdWa3cdUfuPPmARFsOJnMDclYDZhaEFkNzE9zo16on8sZQNc-K3QwPJDkP5As62z9yINTaSyFZzuO50mMkGPL_R5Vz0Pw',
                publisher: 'Alpha Books'
              });
              showToast('Đã thêm ấn bản CLB giảm giá 20% vào giỏ hàng!', 'success');
            }}
            className="px-5 py-2.5 bg-theme-surface border border-theme-border hover:border-theme-primary text-on-surface rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
          >
            Mua Sách Hưởng Ưu Đãi CLB (-20%)
          </button>
        </div>
      </div>

      {/* 2-Column Split: Discussions & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (8/12): Feed & Tabs */}
        <div className="lg:col-span-8 space-y-6">
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-theme-border pb-3 overflow-x-auto scrollbar-none">
            {[
              { id: 'discussions', label: 'Thảo Luận Nổi Bật' },
              { id: 'reviews', label: 'Bài Cảm Nhận & Review' },
              { id: 'events', label: 'Lịch Họp Salon Offline' },
              { id: 'documents', label: 'Tài Liệu & Sơ Đồ Tư Duy' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-theme-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-theme-secondary-subtle'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Post Composer */}
          <div id="post-composer" className="bg-theme-surface rounded-3xl border border-theme-border p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <img
                className="w-10 h-10 rounded-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAU4Zl9qwphLn44hVDzoJED1FLifTdMlQyElgM0QiGi6OiRCchg3pUOSisYd8wwSAwnbUEU4VTy08j5JDEfRV6zv2xFiQ_h04yivUljlZZpXNKDzArBvDP26iW-IcIoKvZp4CYM_CQzVLJSt-_dt3tpD9KLVBmWgVAMn_WMaFb6_bSLKefUZZNaN2IBOZzt8UW-lIYgWyUbSpYYCkq80qHFHL0bkQhNUgTl2EoBR-REzjlChI6X_go7qQ"
                alt="Minh Trí"
              />
              <span className="font-bold text-sm text-on-surface">Minh Trí (VIP Kim Cương)</span>
            </div>
            <textarea
              id="post-input"
              rows={3}
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              placeholder="Chia sẻ góc nhìn, bài học hoặc đặt câu hỏi thảo luận cùng các độc giả CLB..."
              className="w-full p-3.5 rounded-2xl border border-theme-border text-xs sm:text-sm focus:outline-none focus:border-theme-primary bg-theme-bg text-on-surface"
            ></textarea>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <button type="button" className="p-2 hover:bg-theme-bg rounded-xl cursor-pointer" title="Thêm ảnh">
                  <span className="material-symbols-outlined text-lg">image</span>
                </button>
                <button type="button" className="p-2 hover:bg-theme-bg rounded-xl cursor-pointer" title="Trích dẫn sách">
                  <span className="material-symbols-outlined text-lg">format_quote</span>
                </button>
              </div>
              <button
                onClick={handleCreatePost}
                className="px-6 py-2.5 bg-theme-secondary hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Đăng Bài
              </button>
            </div>
          </div>

          {/* Posts Feed */}
          <div className="space-y-4">
            {clubDiscussions.map(post => (
              <div key={post.id} className="bg-theme-surface rounded-3xl border border-theme-border p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img className="w-10 h-10 rounded-full object-cover" src={post.avatar} alt={post.author} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-on-surface">{post.author}</span>
                        <span className="bg-theme-secondary-subtle text-theme-secondary text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {post.badge}
                        </span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant">{post.time}</span>
                    </div>
                  </div>
                  {post.pinned && (
                    <span className="text-xs font-bold text-[#ac2c19] flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">push_pin</span> Đã ghim
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-sm sm:text-base text-on-surface">{post.title}</h4>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">{post.content}</p>

                <div className="flex items-center gap-6 pt-3 border-t border-theme-border text-xs font-semibold text-on-surface-variant">
                  <button
                    onClick={() => showToast('Đã thả tim bài viết!', 'success')}
                    className="flex items-center gap-1.5 hover:text-[#ac2c19] transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">favorite</span>
                    <span>{post.likes} Thích</span>
                  </button>
                  <button className="flex items-center gap-1.5 hover:text-theme-secondary transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-base">mode_comment</span>
                    <span>{post.comments} Bình luận</span>
                  </button>
                  <button
                    onClick={() => showToast('Đã sao chép liên kết bài viết!', 'success')}
                    className="flex items-center gap-1.5 hover:text-theme-primary transition-colors ml-auto cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">share</span>
                    <span>Chia sẻ</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (4/12): Upcoming Meetup & Rules */}
        <div className="lg:col-span-4 space-y-6">
          {/* Upcoming Event Card */}
          <div
            className="text-white p-6 rounded-3xl shadow-md space-y-4"
            style={{ background: 'linear-gradient(to bottom right, var(--theme-hero-from, #003B2B), var(--theme-hero-to, #00271E))' }}
          >
            <span className="text-xs font-bold uppercase tracking-wider text-[#fea619] bg-white/10 px-3 py-1 rounded-full inline-block">
              Sự Kiện Salon Kế Tiếp
            </span>
            <h3 className="font-editorial text-xl font-bold text-white">
              Tọa Đàm Trực Tuyến: Ứng Dụng Tư Duy Tinh Gọn 2026
            </h3>
            <div className="space-y-2 text-xs text-white/90">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#fea619]">event</span>
                <span>Chủ Nhật, 15/09/2026 • 19:30 - 21:00</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#fea619]">videocam</span>
                <span>Phòng Zoom VIP CLB & Huki Audio Live</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#fea619]">person</span>
                <span>Diễn giả: Trần Hoàng Nam & Khách mời Alpha Books</span>
              </div>
            </div>

            <button
              onClick={handleRsvp}
              className={`w-full py-3 rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer ${
                rsvpd
                  ? 'bg-theme-secondary-subtle text-theme-secondary'
                  : 'bg-[#fea619] hover:bg-[#ffb95f] text-[#2a1700]'
              }`}
            >
              {rsvpd ? '✓ Đã Nhận Vé Mời Tham Dự' : 'Đăng Ký Tham Gia Miễn Phí'}
            </button>
          </div>

          {/* Club Rules */}
          <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 shadow-sm space-y-3">
            <h4 className="font-bold text-sm text-on-surface">Quy Ước Văn Hóa CLB</h4>
            <ul className="space-y-2 text-xs text-on-surface-variant leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-theme-secondary text-base shrink-0">check</span>
                <span>Tôn trọng mọi góc nhìn phản biện, thảo luận dựa trên dẫn chứng sách.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-theme-secondary text-base shrink-0">check</span>
                <span>Không chia sẻ tài liệu vi phạm bản quyền hoặc sách lậu.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-theme-secondary text-base shrink-0">check</span>
                <span>Khuyến khích tóm tắt bằng sơ đồ tư duy và viết cảm nhận thực tế.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
