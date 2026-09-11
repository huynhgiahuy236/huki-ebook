import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

export default function BookPreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { showToast } = useToast();

  const [theme, setTheme] = useState('paper'); // 'paper' | 'dark' | 'sepia'
  const [fontSize, setFontSize] = useState(18); // 16, 18, 20, 22
  const [currentChapter, setCurrentChapter] = useState(1);
  const [showToc, setShowToc] = useState(false);

  const book = {
    id: id || 'atomic-habits',
    title: 'Atomic Habits - Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ',
    author: 'James Clear',
    translator: 'Alpha Books Dịch',
    publisher: 'NXB Thế Giới & Alpha Books',
    cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600',
    ebookPrice: 79000,
    physicalPrice: 159000,
    hybridPrice: 199000,
    totalPages: 320,
    samplePages: 25,
  };

  const chapters = [
    { num: 1, title: 'Lời mở đầu: Hành trình từ biến cố đến phương pháp', pages: 'Trang 1 - 12' },
    { num: 2, title: 'Chương 1: Sức mạnh bất ngờ của 1% mỗi ngày', pages: 'Trang 13 - 25' },
    { num: 3, title: 'Chương 2: Thói quen định hình danh tính của bạn', pages: 'Đọc tiếp ở bản đầy đủ (Khóa)' },
    { num: 4, title: 'Chương 3: 4 Bước đơn giản để xây dựng thói quen tốt', pages: 'Khóa' },
    { num: 5, title: 'Chương 4: Quy luật 1 - Khiến nó trở nên rõ ràng', pages: 'Khóa' },
  ];

  const handleBuyEbook = () => {
    addItem({
      id: `${book.id}-ebook`,
      title: book.title,
      price: book.ebookPrice,
      format: 'ebook',
      cover: book.cover
    });
    showToast('Đã thêm Bản quyền Ebook vào giỏ hàng!', 'success');
    navigate('/cart');
  };

  const handleBuyHybrid = () => {
    addItem({
      id: `${book.id}-hybrid`,
      title: `${book.title} (Combo Hybrid)`,
      price: book.hybridPrice,
      format: 'hybrid',
      cover: book.cover
    });
    showToast('Đã thêm Combo Hybrid (Sách In + Ebook) vào giỏ hàng!', 'success');
    navigate('/cart');
  };

  const themeStyles = {
    paper: 'bg-[#fcfbf7] text-[#2c2724] border-[#e8e4dc]',
    sepia: 'bg-[#f4ecd8] text-[#433422] border-[#d8cbb2]',
    dark: 'bg-[#181a1b] text-[#dcd6cd] border-[#2f3437]'
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${themeStyles[theme]}`}>
      {/* Top Floating Control Bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#e8e5df] px-4 md:px-8 py-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to={`/book/${book.id}`}
            className="p-1.5 rounded-xl hover:bg-black/5 text-[#17201f] transition-colors flex items-center gap-1 text-xs font-bold"
            title="Quay lại chi tiết sách"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span className="hidden sm:inline">Chi tiết sách</span>
          </Link>
          <div className="h-4 w-[1px] bg-[#e8e5df] hidden sm:block"></div>
          <div>
            <h1 className="font-editorial text-sm sm:text-base font-bold text-[#17201f] truncate max-w-xs sm:max-w-md">
              {book.title}
            </h1>
            <p className="text-[11px] text-[#6b7280]">Đang đọc thử 25 trang đầu miễn phí</p>
          </div>
        </div>

        {/* Reader Controls */}
        <div className="flex items-center gap-2">
          {/* Table of Contents button */}
          <button
            onClick={() => setShowToc(!showToc)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-theme-secondary-subtle text-theme-primary border border-theme-border hover:bg-theme-primary hover:text-white transition-all flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-base">format_list_bulleted</span>
            <span className="hidden md:inline">Mục Lục</span>
          </button>

          {/* Theme Switcher */}
          <div className="flex items-center bg-[#f8f6f1] p-0.5 rounded-xl border border-[#e8e5df]">
            <button
              onClick={() => setTheme('paper')}
              className={`px-2 py-1 rounded-lg text-xs font-medium ${theme === 'paper' ? 'bg-white text-[#17201f] shadow-xs' : 'text-[#6b7280]'}`}
              title="Chế độ trang giấy"
            >
              Giấy
            </button>
            <button
              onClick={() => setTheme('sepia')}
              className={`px-2 py-1 rounded-lg text-xs font-medium ${theme === 'sepia' ? 'bg-[#f4ecd8] text-[#433422] shadow-xs' : 'text-[#6b7280]'}`}
              title="Chế độ cổ điển Sepia"
            >
              Sepia
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-2 py-1 rounded-lg text-xs font-medium ${theme === 'dark' ? 'bg-[#181a1b] text-white shadow-xs' : 'text-[#6b7280]'}`}
              title="Chế độ ban đêm"
            >
              Đêm
            </button>
          </div>

          {/* Font Size */}
          <div className="hidden sm:flex items-center bg-[#f8f6f1] p-0.5 rounded-xl border border-[#e8e5df]">
            <button
              onClick={() => setFontSize(Math.max(14, fontSize - 2))}
              className="p-1 rounded-lg text-xs text-[#17201f] hover:bg-white"
              title="Giảm cỡ chữ"
            >
              A-
            </button>
            <span className="px-1.5 text-xs font-bold text-[#17201f]">{fontSize}px</span>
            <button
              onClick={() => setFontSize(Math.min(26, fontSize + 2))}
              className="p-1 rounded-lg text-xs text-[#17201f] hover:bg-white"
              title="Tăng cỡ chữ"
            >
              A+
            </button>
          </div>
        </div>
      </header>

      {/* Main Reading Container */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-6 sm:px-12 py-10 lg:py-16">
        
        {/* Book Cover Header in Sample */}
        <div className="text-center mb-12 pb-8 border-b border-current/15">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#ac2c19] bg-[#ac2c19]/10 px-3 py-1 rounded-full">
            Bản Đọc Thử Miễn Phí (Sample Preview)
          </span>
          <h2 className="font-editorial text-3xl sm:text-4xl font-bold mt-4 mb-2">
            {book.title}
          </h2>
          <p className="text-sm opacity-80">
            Tác giả: <span className="font-semibold">{book.author}</span> • {book.publisher}
          </p>
        </div>

        {/* Reading Body Content */}
        <article
          className="font-editorial leading-relaxed transition-all duration-200 space-y-6"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}
        >
          <div className="text-center font-bold text-lg mb-6 uppercase tracking-wider text-[#006953]">
            {currentChapter === 1 ? 'Lời Mở Đầu: Biến Cố Định Hình Thói Quen' : 'Chương 1: Sức Mạnh Bất Ngờ Của 1%'}
          </div>

          <p className="first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:text-[#ac2c19] first-letter:leading-none">
            Vào ngày cuối cùng của năm thứ hai trung học, tôi bị một chiếc gậy bóng chày đập thẳng vào mặt. Khi người bạn cùng lớp vung gậy hết lực, chiếc gậy tuột khỏi tay và bay thẳng về phía tôi, va mạnh vào giữa hai mắt. Ký ức về khoảnh khắc đó hoàn toàn biến mất.
          </p>

          <p>
            Cú va chạm làm vỡ xương mũi, rách mô mềm bên trong và nứt hộp sọ. Tôi được trực thăng chuyển thẳng đến bệnh viện nhi lớn nhất khu vực tại Cincinnati. Những ngày sau đó là chuỗi điều trị phục hồi chức năng đầy đau đớn và bế tắc. Để có thể trở lại cuộc sống bình thường, tôi buộc phải bắt đầu lại từ những việc nhỏ nhất: đi bộ 5 phút mỗi ngày, đi ngủ đúng giờ, dọn dẹp bàn học ngăn nắp.
          </p>

          <p>
            Tôi không hề nhận ra rằng, chính những thay đổi tí hon, tưởng chừng như vô nghĩa hàng ngày đó lại là khởi đầu cho phương pháp <strong className="text-[#006953]">Atomic Habits</strong> – việc cải thiện 1% mỗi ngày tích lũy qua năm tháng sẽ tạo nên sự bứt phá phi thường.
          </p>

          <div className="my-8 p-6 rounded-2xl bg-black/5 border-l-4 border-[#006953] italic">
            "Nếu bạn có thể trở nên tốt hơn 1% mỗi ngày trong một năm, bạn sẽ kết thúc năm đó với kết quả tốt hơn gấp 37 lần so với lúc bắt đầu."
          </div>

          <p>
            Thói quen là lãi kép của sự tự hoàn thiện. Giống như tiền bạc sinh sôi nhờ lãi suất kép, những tác động của thói quen sẽ nhân lên khi bạn lặp lại chúng. Chúng dường như không tạo ra nhiều khác biệt vào bất kỳ ngày cụ thể nào, nhưng tác động qua nhiều tháng và nhiều năm là vô cùng to lớn.
          </p>

          <p>
            Nhưng đáng tiếc, tốc độ chuyển biến chậm chạp cũng khiến việc từ bỏ thói quen xấu trở nên dễ dàng. Nếu bạn ăn một bữa ăn không lành mạnh hôm nay, chiếc cân hầu như không nhúc nhích. Một quyết định sai lầm đơn lẻ dễ bị bỏ qua. Nhưng khi chúng ta lặp lại 1% sai sót ngày này qua ngày khác, sự tích lũy của những lựa chọn tồi tệ sẽ biến thành tai họa.
          </p>
        </article>

        {/* Locked Overlay CTA at End of Sample */}
        <div
          className="mt-14 p-8 rounded-3xl text-white shadow-2xl border border-white/10 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(to bottom right, var(--theme-hero-from, #003B2B), var(--theme-hero-to, #001A12))' }}
        >
          <div className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto mb-3 ring-8 ring-white/10">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>

          <h3 className="font-editorial text-2xl font-bold mb-2">
            Bạn đã đọc hết 25 trang đọc thử miễn phí!
          </h3>
          <p className="text-white/80 text-xs sm:text-sm max-w-md mx-auto mb-6">
            Mở khóa trọn bộ 320 trang để nắm vững 4 Quy Luật Thay Đổi Hành Vi và nhận bản quyền đọc trên 5 thiết bị.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleBuyEbook}
              className="w-full sm:w-auto bg-white text-theme-primary px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm hover:bg-white/90 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">tablet_mac</span>
              <span>Mua Bản Ebook DRM (79.000đ)</span>
            </button>

            <button
              onClick={handleBuyHybrid}
              className="w-full sm:w-auto bg-[#ac2c19] text-white px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm hover:bg-[#8e1404] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">auto_stories</span>
              <span>Combo Hybrid: Sách In + Ebook (199.000đ)</span>
            </button>
          </div>
        </div>

      </div>

      {/* Table of Contents Drawer Modal */}
      {showToc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end" onClick={() => setShowToc(false)}>
          <div className="w-full max-w-md bg-white text-[#17201f] h-full p-6 shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-[#e8e5df] mb-4">
              <h4 className="font-editorial text-xl font-bold text-theme-primary">Mục Lục Cuốn Sách</h4>
              <button onClick={() => setShowToc(false)} className="p-1 text-[#6b7280] hover:text-[#17201f]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-2">
              {chapters.map((c) => (
                <button
                  key={c.num}
                  disabled={c.pages.includes('Khóa')}
                  onClick={() => {
                    setCurrentChapter(c.num);
                    setShowToc(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-start justify-between gap-3 ${
                    currentChapter === c.num
                      ? 'bg-theme-primary text-white font-bold'
                      : c.pages.includes('Khóa')
                      ? 'opacity-50 cursor-not-allowed bg-gray-50'
                      : 'hover:bg-theme-secondary-subtle text-[#17201f]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold">{c.title}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{c.pages}</div>
                  </div>
                  {c.pages.includes('Khóa') && (
                    <span className="material-symbols-outlined text-sm text-[#ac2c19]">lock</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
