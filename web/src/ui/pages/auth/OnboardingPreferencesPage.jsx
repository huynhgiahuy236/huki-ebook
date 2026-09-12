import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const GENRES = [
  { id: 'self-dev', label: 'Phát triển bản thân', icon: 'psychology', count: '1.2k cuốn' },
  { id: 'business', label: 'Kinh tế & Khởi nghiệp', icon: 'trending_up', count: '980 cuốn' },
  { id: 'psychology', label: 'Tâm lý & Hành vi', icon: 'favorite', count: '650 cuốn' },
  { id: 'literature', label: 'Văn học & Tiểu thuyết', icon: 'auto_stories', count: '2.4k cuốn' },
  { id: 'tech-ai', label: 'Công nghệ & AI', icon: 'memory', count: '420 cuốn' },
  { id: 'science', label: 'Khoa học & Vũ trụ', icon: 'science', count: '310 cuốn' },
  { id: 'history', label: 'Lịch sử & Triết học', icon: 'history_edu', count: '540 cuốn' },
  { id: 'audio', label: 'Sách nói & Audiobooks', icon: 'headphones', count: '890 bài' },
  { id: 'finance', label: 'Đầu tư & Tài chính', icon: 'account_balance', count: '760 cuốn' },
  { id: 'children', label: 'Thiếu nhi & Gia đình', icon: 'child_care', count: '1.1k cuốn' },
];

export default function OnboardingPreferencesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedGenres, setSelectedGenres] = useState(['self-dev', 'business', 'tech-ai']);
  const [isSaving, setIsSaving] = useState(false);

  const toggleGenre = (genreId) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((id) => id !== genreId) : [...prev, genreId]
    );
  };

  const handleFinish = () => {
    if (selectedGenres.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 thể loại sách yêu thích!', 'warning');
      return;
    }

    setIsSaving(true);
    showToast('Đã lưu sở thích đọc sách & kích hoạt gói quà chào mừng 50.000đ!', 'success');
    setTimeout(() => {
      navigate('/');
    }, 600);
  };

  return (
    <main className="min-h-screen w-full bg-[#fbf9f4] flex flex-col justify-between p-4 sm:p-8 font-sans antialiased text-[#17201f]">
      <div className="max-w-3xl mx-auto w-full py-6 sm:py-10 space-y-8 animate-fade-in">
        
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#006953]/10 text-[#006953] text-xs font-bold border border-[#006953]/20">
            <span className="material-symbols-outlined text-sm text-[#fea619]">card_giftcard</span>
            <span>Chào mừng độc giả mới &bull; Nhận gói quà 50.000đ</span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#17201f]">
            Sở Thích Đọc Sách Của Bạn
          </h1>
          <p className="text-xs sm:text-sm text-[#6b7280] max-w-md mx-auto">
            Xin chào <strong>{user?.fullName || user?.name || 'Độc giả'}</strong>! Hãy chọn các thể loại bạn quan tâm để HuKi cá nhân hóa trang chủ và gợi ý các cuốn sách phù hợp nhất.
          </p>
        </div>

        {/* Welcome Perks Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#003b2b] to-[#00523c] text-white shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#94f5d6]">Voucher Tân Thủ</div>
            <div className="font-editorial text-2xl font-bold my-1 text-[#94f5d6]">50.000đ</div>
            <div className="text-[11px] text-white/80">Giảm ngay đơn hàng đầu tiên</div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#ac2c19] to-[#8e1404] text-white shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#fea619]">HuKi Xu Thưởng</div>
            <div className="font-editorial text-2xl font-bold my-1 text-[#fea619]">+100 Xu</div>
            <div className="text-[11px] text-white/80">Tích lũy trong ví cá nhân</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#94f5d6] text-[#003b2b] shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#006953]">Ebook Tặng Sẵn</div>
            <div className="font-editorial text-xl font-bold my-1 text-[#003b2b]">1 Ebook Free</div>
            <div className="text-[11px] text-[#6b7280]">Tự động thêm vào tủ sách</div>
          </div>
        </div>

        {/* Genre Selection Grid */}
        <div className="bg-white rounded-3xl border border-[#e8e5df] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#e8e5df] pb-4">
            <div>
              <h2 className="text-sm font-bold text-[#17201f]">Chọn Thể Loại Bạn Yêu Thích</h2>
              <p className="text-xs text-[#6b7280]">Bạn có thể thay đổi lại trong phần Cài đặt bất kỳ lúc nào</p>
            </div>
            <span className="text-xs font-bold text-[#006953] bg-[#f2fbf9] px-3 py-1 rounded-full border border-[#94f5d6]">
              Đã chọn {selectedGenres.length} thể loại
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {GENRES.map((g) => {
              const isSelected = selectedGenres.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGenre(g.id)}
                  className={`p-4 rounded-2xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#003b2b] text-white border-[#003b2b] shadow-sm'
                      : 'bg-[#fbf9f4] text-[#17201f] border-[#e8e5df] hover:border-[#003b2b]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`material-symbols-outlined text-2xl ${isSelected ? 'text-[#94f5d6]' : 'text-[#006953]'}`}>
                      {g.icon}
                    </span>
                    <span className={`material-symbols-outlined text-base ${isSelected ? 'text-[#94f5d6]' : 'text-gray-300'}`}>
                      {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm leading-tight mb-0.5">{g.label}</div>
                    <div className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-[#6b7280]'}`}>{g.count}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#e8e5df] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-xs font-semibold text-[#6b7280] hover:text-[#17201f] py-2 px-3 order-2 sm:order-1"
            >
              Bỏ qua bước này &rarr;
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleFinish}
              className="w-full sm:w-auto bg-[#003b2b] text-white px-8 py-3.5 rounded-2xl text-xs sm:text-sm font-bold hover:bg-[#00523c] active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-base">explore</span>
              <span>{isSaving ? 'Đang lưu sở thích...' : 'Bắt Đầu Khám Phá HuKi Ngay'}</span>
            </button>
          </div>
        </div>
      </div>

      <footer className="text-center text-[11px] text-[#6b7280] py-4">
        HuKi Ebook &bull; Nền Tảng Phân Phối Sách Thật &amp; Sách Số Bản Quyền DRM
      </footer>
    </main>
  );
}
