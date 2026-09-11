import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

export default function AudiobooksPage() {
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [activeCategory, setActiveCategory] = useState('all');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState({
    title: 'Atomic Habits – Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ (Chương 1)',
    author: 'James Clear',
    narrator: 'NSƯT Minh Đức',
    duration: '32:15',
    progress: 35,
    playbackRate: '1.0x'
  });
  const [showMiniPlayer, setShowMiniPlayer] = useState(true);

  const togglePlay = (track) => {
    if (track) {
      setCurrentTrack(track);
      setIsPlaying(true);
      setShowMiniPlayer(true);
      showToast(`Đang phát: ${track.title}`, 'info');
    } else {
      setIsPlaying(prev => !prev);
    }
  };

  const audiobooks = [
    {
      id: 'audio-atomic-habits',
      title: 'Atomic Habits – Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ',
      author: 'James Clear',
      narrator: 'NSƯT Minh Đức',
      duration: '7h 42m',
      category: 'phat-trien-ban-than',
      rating: 4.98,
      listens: '2.4k',
      price: 89000,
      originalPrice: 139000,
      bitrate: 'Studio HD 320k',
      tag: 'Bán chạy nhất',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAjTLa-EsuM3rAWCh7QLNIibiUWD653rBXryru_Jm_EF0wZW4y-iu_MEhVPSofjLC51Q-mcpY6LK9ZFs5uMtEB0CFUp-uJycDwy6uYh4tlaXcIvZXN-K54DVKnrOpk767ZNWT6ifu0fqPVQ8L2bs9tl6LERKtNGUpUsbOX0jig_DPsfwPYYhcf6KivlIei79lVB2OH3MF9WtjhEoxYGMJQILVOWMGuMuuuvutHrRyYYwlR6EJ1732DOkg'
    },
    {
      id: 'audio-deep-work',
      title: 'Deep Work – Làm Ra Làm, Chơi Ra Chơi',
      author: 'Cal Newport',
      narrator: 'Hoàng Nam',
      duration: '5h 18m',
      category: 'kinh-doanh',
      rating: 4.9,
      listens: '1.2k',
      price: 69000,
      originalPrice: 99000,
      bitrate: 'Studio HD 320k',
      tag: 'Năng suất cao',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5Qy_jq_nTeEAlowe5Yq67a4jizNkR2tK0Jb9gKftyB_o8RAM2SH3tKsvEgFp7YxALvMCMKCtxTCzyPxmMRGVA2oLySVZ4ExHT0nplRAD4OSpfRkhFuaDn7UqDNYTfXEFeI5bIo9aFjSOOe618eyRMmphG4FyrpB7GjQuxtJmG_juI_V7k3w_KPb4_oV5YY6kUBMJsbJ2X-p8h4AzIoKOoUK7wlg5btLaWje0XXTQaswWlfBMCD0tpkw'
    },
    {
      id: 'audio-psychology-money',
      title: 'Tâm Lý Học Về Tiền',
      author: 'Morgan Housel',
      narrator: 'NSƯT Minh Đức',
      duration: '6h 45m',
      category: 'kinh-doanh',
      rating: 4.95,
      listens: '3.1k',
      price: 79000,
      originalPrice: 119000,
      bitrate: 'Dolby Atmos',
      tag: 'HOT 2026',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAfPcZQOy99sYmQid19kBN-5H8oQu98pJ8K5_j5qeLqHVBuXlAeyzsjyYiySe5dwUbi8pncXhM8XLcQAAPdj2zBdaLEMIXYfvKh8zNGRmGRpe0OSl7HQOu-bxaCZ2yQL-AZ4bpD9-5mLuUkETRRospOoKJJleUNsSCDfWqj2rohUsPNEYArdCBYovjVaHZwZVokMQY1c0XlrWUK7CYca6aleBJ2JmBqSjH1CexDL2f2TqW7xpVv1JhlPA'
    },
    {
      id: 'audio-courage-disliked',
      title: 'Can Đảm Để Bị Ghét',
      author: 'Kishimi & Koga',
      narrator: 'Thu Uyên',
      duration: '6h 10m',
      category: 'chua-lanh',
      rating: 4.88,
      listens: '1.9k',
      price: 75000,
      originalPrice: 105000,
      bitrate: 'Studio HD 320k',
      tag: 'Chữa lành',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA6z4RRX8HMlIcOvy2R0r2l59OBusqbAGxZMmlR78cuCyeDC8gGZns6bdxsLLTKhbllY6ipqLiDdY75myavSumNiw42XGt15k-jDiJpYDQPKDrkSF1w7YIIXJidh7ufUJ_vFBZtyyMiDY3oaMvyA5Egf0W9ek9yxT90H9l8M9eKSe3wAdjf0JpJcGlYPmYIve2otBzZaejypLqysxWf0ZDdUdYkqdJZuucX46VRZsUu7meEJrfU1dCVVw'
    },
    {
      id: 'audio-sapiens',
      title: 'Sapiens – Lược Sử Loài Người (Trọn Bộ 4 Phần)',
      author: 'Yuval Noah Harari',
      narrator: 'Hoàng Nam',
      duration: '14h 20m',
      category: 'van-hoc',
      rating: 4.96,
      listens: '4.8k',
      price: 119000,
      originalPrice: 180000,
      bitrate: 'Dolby Atmos',
      tag: 'Tuyệt tác',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAb1VMwfLl35x4YbZFd0QOWxofcjBQocxdoY2hWnjG6Xt8SfQ61I65hZJIkQpBTdjk_UGArsbo0NmoZqcfZJ7fPXmRUej1ioeeoovkJdzpTRJjdtMzlGWipRNt6asQQCeYM424wzu0f3Y_z0EvIfWFjFhoTjZSmgtAV_MAP2n3ruznkObdskgicFtqqRzvXJyplsHgDdKH16w-V9eWrWkwKd3o7oIPHjwl0Ygr69Vwq-EM5rQhkCGKIaw'
    },
    {
      id: 'audio-thinking-fast-slow',
      title: 'Tư Duy Nhanh Và Chậm (Thinking, Fast and Slow)',
      author: 'Daniel Kahneman',
      narrator: 'NSƯT Minh Đức',
      duration: '12h 40m',
      category: 'tam-ly',
      rating: 4.91,
      listens: '2.7k',
      price: 99000,
      originalPrice: 159000,
      bitrate: 'Studio HD 320k',
      tag: 'Khai phóng',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANH9QImz-ucfcn9uv_MlbqtxToG_dytIK3a8VA3WhDMJxtc7C7nGB3P4THS39VcuT2OdgWu_eGDaTUI8j1aBQd9YjObATDkleR2X6wUk023tz5x5l0XYGbT8s-eLIGufFcL4aRX3zc_qLlav8X4ZhfgFjrtLdWa3cdUfuPPmARFsOJnMDclYDZhaEFkNzE9zo16on8sZQNc-K3QwPJDkP5As62z9yINTaSyFZzuO50mMkGPL_R5Vz0Pw'
    }
  ];

  const filteredAudiobooks = audiobooks.filter(a => {
    if (activeCategory === 'all') return true;
    return a.category === activeCategory;
  });

  return (
    <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 font-body-md">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-body-sm text-on-surface-variant mb-6 flex-wrap">
        <Link to="/" className="hover:text-[#ac2c19] transition-colors">Trang chủ</Link>
        <span>/</span>
        <Link to="/books" className="hover:text-[#ac2c19] transition-colors">Sàn TMĐT</Link>
        <span>/</span>
        <span className="text-theme-primary font-semibold">Sách Nói & Podcasts Bản Quyền (Huki Audio Studio)</span>
      </nav>

      {/* Featured Audiobook Spotlight Hero Banner */}
      <section
        className="rounded-3xl p-6 sm:p-10 text-white shadow-xl mb-10 relative overflow-hidden border border-white/15"
        style={{ background: 'linear-gradient(to right, var(--theme-hero-from, #003B2B), var(--theme-hero-via, #004D38), var(--theme-hero-to, #00271E))' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          <div className="lg:col-span-7 flex flex-col justify-center space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-white/15 text-[var(--theme-header-top-accent,#94F5D6)] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                🎧 SÁCH NÓI ĐỘC QUYỀN HUKI AUDIO 2026
              </span>
              <span className="text-xs text-gray-300 font-medium">Studio Master 320kbps — Chuẩn Dolby Atmos</span>
            </div>

            <h1 className="font-editorial text-2xl sm:text-3xl md:text-4xl font-bold leading-tight text-white">
              Atomic Habits – Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ (Bản Đọc Âm Thanh Trọn Vẹn)
            </h1>

            <div className="text-xs sm:text-sm text-gray-200 space-y-1">
              <p>
                <strong className="text-white">Tác giả:</strong> James Clear | <strong className="text-white">Giọng đọc:</strong> NSƯT Minh Đức (Ấm áp, truyền cảm) | <strong className="text-white">Thời lượng:</strong> 7 giờ 42 phút (Trọn vẹn 20 chương)
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="text-[#fea619] font-bold">⭐️ 4.98/5.0</span>
                <span className="text-gray-400">(2.400 lượt nghe & đánh giá)</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => togglePlay({
                  title: 'Atomic Habits (Chương 1: Sức Mạnh Bất Ngờ Của 1%)',
                  author: 'James Clear',
                  narrator: 'NSƯT Minh Đức',
                  duration: '32:15',
                  progress: 25,
                  playbackRate: '1.0x'
                })}
                className="bg-[var(--theme-header-top-accent,#94F5D6)] hover:bg-white text-theme-primary px-6 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">play_arrow</span>
                Nghe Thử Miễn Phí Chương 1 (32 phút)
              </button>

              <button
                onClick={() => {
                  addToCart({
                    id: 'audio-atomic-habits',
                    title: 'Atomic Habits (Bản Sách Nói Audio)',
                    price: 89000,
                    format: 'audio',
                    cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAjTLa-EsuM3rAWCh7QLNIibiUWD653rBXryru_Jm_EF0wZW4y-iu_MEhVPSofjLC51Q-mcpY6LK9ZFs5uMtEB0CFUp-uJycDwy6uYh4tlaXcIvZXN-K54DVKnrOpk767ZNWT6ifu0fqPVQ8L2bs9tl6LERKtNGUpUsbOX0jig_DPsfwPYYhcf6KivlIei79lVB2OH3MF9WtjhEoxYGMJQILVOWMGuMuuuvutHrRyYYwlR6EJ1732DOkg',
                    publisher: 'Huki Audio Studio'
                  });
                  showToast('Đã thêm Sách Nói vào giỏ hàng!', 'success');
                }}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/25 px-5 py-3 rounded-xl font-semibold text-xs sm:text-sm backdrop-blur-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                Mua Bản Quyền Âm Thanh: 89.000đ
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center items-center">
            <div
              onClick={() => togglePlay()}
              className="w-56 h-56 sm:w-64 sm:h-64 rounded-3xl shadow-2xl ring-4 ring-white/20 overflow-hidden relative group cursor-pointer"
            >
              <img
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjTLa-EsuM3rAWCh7QLNIibiUWD653rBXryru_Jm_EF0wZW4y-iu_MEhVPSofjLC51Q-mcpY6LK9ZFs5uMtEB0CFUp-uJycDwy6uYh4tlaXcIvZXN-K54DVKnrOpk767ZNWT6ifu0fqPVQ8L2bs9tl6LERKtNGUpUsbOX0jig_DPsfwPYYhcf6KivlIei79lVB2OH3MF9WtjhEoxYGMJQILVOWMGuMuuuvutHrRyYYwlR6EJ1732DOkg"
                alt="Atomic Habits Audio"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-theme-secondary text-white flex items-center justify-center shadow-lg transform scale-95 group-hover:scale-100 transition-transform">
                  <span className="material-symbols-outlined text-3xl">play_arrow</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Category Pills */}
      <div className="mb-8 flex items-center gap-2.5 overflow-x-auto scrollbar-none pb-2">
        {[
          { id: 'all', label: `Tất Cả Sách Nói (${audiobooks.length})` },
          { id: 'phat-trien-ban-than', label: 'Phát Triển Bản Thân' },
          { id: 'kinh-doanh', label: 'Kinh Doanh & Lãnh Đạo' },
          { id: 'van-hoc', label: 'Văn Học & Tiểu Thuyết' },
          { id: 'chua-lanh', label: 'Tâm Lý & Thiền Chữa Lành' },
          { id: 'tam-ly', label: 'Khoa Học Hành Vi' }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeCategory === cat.id
                ? 'bg-theme-primary text-white shadow-sm'
                : 'bg-theme-surface border border-theme-border text-on-surface hover:bg-theme-bg'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 4-Column Audiobook Catalog Grid */}
      <section className="mb-12">
        <h2 className="font-editorial text-2xl font-bold mb-6 text-on-surface">
          Sách Nói Bản Quyền Được Yêu Thích Nhất
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredAudiobooks.map(audio => (
            <div
              key={audio.id}
              className="bg-theme-surface border border-theme-border rounded-3xl p-4 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-4 bg-slate-100">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    src={audio.cover}
                    alt={audio.title}
                  />
                  <span className="absolute top-2 right-2 bg-black/75 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md font-mono">
                    {audio.duration}
                  </span>
                  <span className="absolute bottom-2 left-2 text-[10px] bg-theme-primary/90 text-white px-2 py-0.5 rounded font-bold">
                    {audio.bitrate}
                  </span>
                </div>

                <h3 className="font-semibold text-sm text-on-surface line-clamp-1 mb-1 group-hover:text-theme-secondary transition-colors">
                  {audio.title}
                </h3>
                <p className="text-xs text-on-surface-variant mb-2">{audio.author} · Giọng đọc: {audio.narrator}</p>

                <div className="flex items-center gap-1.5 text-xs mb-3">
                  <span className="text-[#fea619] font-bold">⭐️ {audio.rating}</span>
                  <span className="text-on-surface-variant">({audio.listens} lượt nghe)</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-theme-border">
                <div>
                  <span className="font-bold text-[#ac2c19] text-sm">{audio.price.toLocaleString('vi-VN')}đ</span>
                  <span className="text-[11px] text-slate-400 line-through ml-1">{audio.originalPrice.toLocaleString('vi-VN')}đ</span>
                </div>
                <button
                  onClick={() => togglePlay({
                    title: audio.title,
                    author: audio.author,
                    narrator: audio.narrator,
                    duration: audio.duration,
                    progress: 10,
                    playbackRate: '1.0x'
                  })}
                  className="bg-theme-secondary-subtle text-theme-secondary px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-theme-secondary hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">play_arrow</span>
                  Nghe Thử
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Floating Mini Audio Player Bar */}
      {showMiniPlayer && (
        <div className="fixed bottom-4 left-4 right-4 md:left-[90px] md:right-8 z-40 bg-theme-surface/95 backdrop-blur-md border border-theme-border rounded-3xl p-3.5 sm:p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-12 h-12 rounded-xl bg-theme-primary text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">headphones</span>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-xs sm:text-sm text-on-surface truncate">{currentTrack.title}</h4>
              <p className="text-[11px] text-on-surface-variant">{currentTrack.author} • Giọng đọc: {currentTrack.narrator}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Speed toggle */}
            <button
              onClick={() => showToast('Chế độ tăng tốc: 1.25x (Giọng nói rõ ràng)', 'info')}
              className="px-2.5 py-1 bg-theme-secondary-subtle hover:bg-theme-border rounded-lg text-xs font-bold text-on-surface cursor-pointer transition-colors"
            >
              1.25x
            </button>

            {/* Play/Pause */}
            <button
              onClick={() => togglePlay()}
              className="w-10 h-10 rounded-full bg-theme-secondary hover:opacity-90 text-white flex items-center justify-center shadow-sm cursor-pointer transition-opacity"
            >
              <span className="material-symbols-outlined text-xl">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>

            {/* Sleep timer */}
            <button
              onClick={() => showToast('Đã hẹn giờ tắt sau 30 phút ngủ!', 'success')}
              className="p-2 hover:bg-theme-bg rounded-xl text-on-surface-variant cursor-pointer transition-colors"
              title="Hẹn giờ tắt"
            >
              <span className="material-symbols-outlined text-lg">bedtime</span>
            </button>

            {/* Close */}
            <button
              onClick={() => setShowMiniPlayer(false)}
              className="p-2 hover:bg-theme-bg rounded-xl text-slate-400 cursor-pointer transition-colors"
              title="Ẩn trình phát"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
