import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import UserAvatar from '../../components/common/UserAvatar';
import { useToast } from '../../context/ToastContext';

export default function BookClubsDirectoryPage() {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [joinedClubs, setJoinedClubs] = useState({ 'lean-growth': true });

  const clubs = [
    {
      id: 'lean-growth',
      name: 'CLB Tư Duy Tinh Gọn & Phát Triển Bản Thân',
      category: 'self-dev',
      description: 'Cộng đồng dành cho các bạn trẻ đam mê xây dựng thói quen tốt, quản trị thời gian và ứng dụng triết lý Kaizen trong công việc hàng ngày.',
      cover: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=600',
      membersCount: 14250,
      activeDiscussions: 184,
      currentBook: {
        title: 'Atomic Habits',
        author: 'James Clear',
        cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=200'
      },
      host: {
        name: 'Trần Minh Tiến',
        role: 'Host CLB • Tác giả',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'
      }
    },
    {
      id: 'value-investing',
      name: 'Hội Đọc Sách Đầu Tư Giá Trị & Tài Chính Thông Minh',
      category: 'finance',
      description: 'Nghiên cứu các trường phái đầu tư của Warren Buffett, Benjamin Graham và Charlie Munger. Thảo luận báo cáo tài chính và phân tích doanh nghiệp.',
      cover: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=600',
      membersCount: 9820,
      activeDiscussions: 96,
      currentBook: {
        title: 'Tâm Lý Học Về Tiền',
        author: 'Morgan Housel',
        cover: 'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?auto=format&fit=crop&q=80&w=200'
      },
      host: {
        name: 'Nguyễn Hồng Đăng',
        role: 'Chuyên gia tài chính',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'
      }
    },
    {
      id: 'classic-literature',
      name: 'Góc Văn Học Cổ Điển & Triết Lý Nhân Sinh',
      category: 'literature',
      description: 'Nơi đắm chìm vào những áng văn kinh điển thế giới: Dostoevsky, Tolstoy, Franz Kafka, Victor Hugo, và các tác phẩm đạt giải Nobel Văn học.',
      cover: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&q=80&w=600',
      membersCount: 7640,
      activeDiscussions: 142,
      currentBook: {
        title: 'Tội Ác Và Trừng Phạt',
        author: 'Fyodor Dostoevsky',
        cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=200'
      },
      host: {
        name: 'Đặng Mai Lan',
        role: 'Biên tập viên NXB',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200'
      }
    },
    {
      id: 'tech-ai-innovators',
      name: 'Câu Lạc Bộ Sách Công Nghệ, Khởi Nghiệp & AI',
      category: 'technology',
      description: 'Cập nhật những cuốn sách mới nhất về Trí tuệ nhân tạo, Chuyển đổi số, Phương pháp Agile/Scrum và văn hóa đổi mới sáng tạo thung lũng Silicon.',
      cover: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=600',
      membersCount: 11300,
      activeDiscussions: 210,
      currentBook: {
        title: 'Zero to One',
        author: 'Peter Thiel',
        cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=200'
      },
      host: {
        name: 'Lê Quang Vinh',
        role: 'Founder Tech Startup',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'
      }
    }
  ];

  const handleToggleJoin = (clubId, clubName) => {
    setJoinedClubs((prev) => {
      const isJoined = !prev[clubId];
      if (isJoined) {
        showToast(`Chúc mừng! Bạn đã gia nhập ${clubName}.`, 'success');
      } else {
        showToast(`Đã rời khỏi ${clubName}.`, 'info');
      }
      return { ...prev, [clubId]: isJoined };
    });
  };

  const filteredClubs = clubs.filter((c) => {
    if (selectedCategory !== 'all' && c.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.currentBook.title.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-theme-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Hero Banner */}
        <div
          className="text-white p-8 sm:p-10 rounded-3xl shadow-lg mb-8 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6"
          style={{ background: 'linear-gradient(to right, var(--theme-hero-from, #003b2b), var(--theme-hero-via, #003325), var(--theme-hero-to, #001f17))' }}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[var(--theme-header-top-accent,#94f5d6)] text-xs font-bold uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-base">diversity_3</span>
              <span>Hệ Thống Câu Lạc Bộ Đọc Sách</span>
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl font-bold mb-2">
              Khám Phá Các Book Clubs
            </h1>
            <p className="text-white/80 text-xs sm:text-sm max-w-xl font-light">
              Gia nhập cùng hơn 48.000+ thành viên đọc sách mỗi tuần, tham gia thử thách đọc chung, thảo luận trực tuyến và gặp gỡ các tác giả khách mời.
            </p>
          </div>

          <div className="relative z-10">
            <button
              onClick={() => showToast('Đang mở form đăng ký thành lập CLB Sách mới...', 'info')}
              className="bg-[var(--theme-header-top-accent,#94f5d6)] text-theme-primary px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm hover:bg-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              Thành Lập CLB Mới
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-theme-surface p-4 rounded-2xl border border-theme-border shadow-xs mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-[#6b7280] text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm câu lạc bộ, chủ đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-theme-bg border border-theme-border rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-on-surface focus:bg-theme-surface focus:border-theme-primary outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'Tất cả CLB' },
              { id: 'self-dev', label: 'Phát triển bản thân' },
              { id: 'finance', label: 'Tài chính & Đầu tư' },
              { id: 'literature', label: 'Văn học cổ điển' },
              { id: 'technology', label: 'Công nghệ & AI' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-theme-primary text-white shadow-xs'
                    : 'bg-theme-secondary-subtle text-[#6b7280] hover:text-on-surface border border-theme-border'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Clubs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredClubs.map((club) => {
            const isJoined = joinedClubs[club.id];
            return (
              <div
                key={club.id}
                className="bg-theme-surface rounded-3xl border border-theme-border overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Cover Header */}
                  <div className="relative h-44 w-full overflow-hidden">
                    <img
                      src={club.cover}
                      alt={club.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                    <div className="absolute top-3 left-3">
                      <span className="bg-theme-primary/90 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-xs border border-white/20">
                        {club.membersCount.toLocaleString()} Thành Viên
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h3 className="font-editorial text-lg sm:text-xl font-bold leading-tight">
                        {club.name}
                      </h3>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-6">
                    <p className="text-xs text-on-surface-variant leading-relaxed mb-4 line-clamp-2">
                      {club.description}
                    </p>

                    {/* Currently Reading Book Tag */}
                    <div className="p-3 rounded-2xl bg-theme-secondary-subtle border border-theme-border flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={club.currentBook.cover}
                          alt={club.currentBook.title}
                          className="w-8 h-11 object-cover rounded shadow-2xs shrink-0"
                        />
                        <div>
                          <div className="text-[10px] uppercase font-bold text-theme-secondary">Sách đang đọc tháng này</div>
                          <div className="text-xs font-bold text-on-surface truncate max-w-[200px]">
                            {club.currentBook.title}
                          </div>
                          <div className="text-[10px] text-[#6b7280]">{club.currentBook.author}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-[#ac2c19] bg-[#ac2c19]/10 px-2 py-0.5 rounded-full shrink-0">
                        🔥 42 bình luận
                      </span>
                    </div>

                    {/* Host Profile */}
                    <div className="flex items-center gap-2.5">
                      <UserAvatar src={club.host.avatar} name={club.host.name} size="w-8 h-8" />
                      <div>
                        <div className="text-xs font-bold text-on-surface">{club.host.name}</div>
                        <div className="text-[10px] text-[#6b7280]">{club.host.role}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="px-6 pb-6 pt-2 flex items-center justify-between gap-3 border-t border-theme-border">
                  <Link
                    to={`/community/club/${club.id}`}
                    className="flex-1 py-2.5 rounded-2xl bg-theme-bg hover:bg-theme-secondary-subtle border border-theme-border text-xs font-bold text-theme-primary flex items-center justify-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">forum</span>
                    <span>Vào Phòng Thảo Luận</span>
                  </Link>

                  <button
                    onClick={() => handleToggleJoin(club.id, club.name)}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      isJoined
                        ? 'bg-theme-primary text-white'
                        : 'bg-[#ac2c19] text-white hover:bg-[#8e1404]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {isJoined ? 'check' : 'group_add'}
                    </span>
                    <span>{isJoined ? 'Đã Tham Gia' : 'Gia Nhập'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
