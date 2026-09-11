import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export default function BookQuotesPage() {
  const { showToast } = useToast();
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [copiedId, setCopiedId] = useState(null);

  const quotes = [
    {
      id: 1,
      quote: 'Bạn không vươn lên tới tầm cao của mục tiêu. Bạn tụt xuống ngang bằng với trình độ của các hệ thống bạn xây dựng.',
      author: 'James Clear',
      book: 'Atomic Habits',
      bookId: 'atomic-habits',
      topic: 'discipline',
      gradient: 'from-[var(--theme-hero-from,#003b2b)] to-[var(--theme-hero-via,#00523c)]',
      textColor: 'text-[var(--theme-header-top-accent,#94f5d6)]',
      likes: 342,
      saved: 89
    },
    {
      id: 2,
      quote: 'Tiêu tiền để cho mọi người thấy bạn có nhiều tiền là cách nhanh nhất để có ít tiền hơn.',
      author: 'Morgan Housel',
      book: 'Tâm Lý Học Về Tiền',
      bookId: 'tam-ly-hoc-ve-tien',
      topic: 'wealth',
      gradient: 'from-[#ac2c19] to-[#8e1404]',
      textColor: 'text-[#fea619]',
      likes: 290,
      saved: 120
    },
    {
      id: 3,
      quote: 'Người biết đủ là người giàu có nhất, bởi vì sự thanh thản là tài sản tự nhiên của tâm hồn.',
      author: 'Marcus Aurelius',
      book: 'Suy Tưởng (Meditations)',
      bookId: 'suy-tuong',
      topic: 'philosophy',
      gradient: 'from-[#17201f] to-[#2b3937]',
      textColor: 'text-[var(--theme-header-top-accent,#94f5d6)]',
      likes: 410,
      saved: 185
    },
    {
      id: 4,
      quote: 'Một cuộc sống chưa được suy xét là một cuộc sống không đáng sống.',
      author: 'Socrates',
      book: 'Biện Hộ Của Socrates',
      bookId: 'bien-ho-socrates',
      topic: 'philosophy',
      gradient: 'from-[var(--theme-hero-via,#002f22)] to-[var(--theme-hero-to,#004834)]',
      textColor: 'text-white',
      likes: 180,
      saved: 54
    },
    {
      id: 5,
      quote: 'Cách tốt nhất để dự đoán tương lai là tự mình tạo ra nó.',
      author: 'Peter Drucker',
      book: 'Thực Hành Quản Trị',
      bookId: 'thuc-hanh-quan-tri',
      topic: 'business',
      gradient: 'from-[#684000] to-[#996500]',
      textColor: 'text-[#fea619]',
      likes: 220,
      saved: 73
    }
  ];

  const handleCopyQuote = (q) => {
    const text = `"${q.quote}" — ${q.author} (${q.book})`;
    navigator.clipboard.writeText(text);
    setCopiedId(q.id);
    showToast('Đã sao chép trích dẫn vào bộ nhớ tạm!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredQuotes = quotes.filter((q) => {
    if (selectedTopic === 'all') return true;
    return q.topic === selectedTopic;
  });

  return (
    <div className="min-h-screen bg-theme-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Hero */}
        <div
          className="text-white p-8 sm:p-10 rounded-3xl shadow-lg mb-8 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6"
          style={{ background: 'linear-gradient(to right, var(--theme-hero-from, #003b2b), var(--theme-hero-via, #004D38), var(--theme-hero-to, #00271E))' }}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[var(--theme-header-top-accent,#94f5d6)] text-xs font-bold uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-base">format_quote</span>
              <span>Góc Nhìn &amp; Danh Ngôn Sách</span>
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl font-bold mb-2">
              Kho Trích Dẫn Tinh Hoa
            </h1>
            <p className="text-white/80 text-xs sm:text-sm max-w-xl font-light">
              Những câu nói truyền cảm hứng, đúc kết tư duy và chiêm nghiệm sâu sắc từ hàng ngàn tác phẩm kinh điển trên HUKI Ebook.
            </p>
          </div>

          <div className="relative z-10">
            <button
              onClick={() => showToast('Tính năng Tự tạo thiệp trích dẫn nghệ thuật sắp ra mắt!', 'info')}
              className="bg-[var(--theme-header-top-accent,#94f5d6)] text-theme-primary px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm hover:bg-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">palette</span>
              Tạo Thiệp Trích Dẫn
            </button>
          </div>
        </div>

        {/* Topics Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6">
          {[
            { id: 'all', label: 'Tất cả trích dẫn' },
            { id: 'discipline', label: '🎯 Thói quen & Kỷ luật' },
            { id: 'wealth', label: '💰 Tài chính & Tiền bạc' },
            { id: 'philosophy', label: '🏛️ Triết học & Lẽ sống' },
            { id: 'business', label: '🚀 Kinh doanh & Lãnh đạo' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTopic(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedTopic === t.id
                  ? 'bg-theme-primary text-white shadow-xs'
                  : 'bg-theme-surface text-on-surface-variant hover:text-on-surface border border-theme-border'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Quotes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredQuotes.map((q) => (
            <div
              key={q.id}
              className={`bg-gradient-to-br ${q.gradient} text-white rounded-3xl p-8 shadow-md border border-white/10 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.01] transition-transform`}
            >
              <span className="material-symbols-outlined absolute top-4 right-4 text-white/10 text-8xl pointer-events-none select-none">
                format_quote
              </span>

              <div>
                <p className="font-editorial text-xl sm:text-2xl font-bold leading-relaxed mb-6 relative z-10">
                  “{q.quote}”
                </p>
              </div>

              <div className="pt-4 border-t border-white/15 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className={`font-bold text-sm ${q.textColor}`}>{q.author}</div>
                  <Link
                    to={`/book/${q.bookId}`}
                    className="text-xs text-white/80 hover:text-white underline inline-flex items-center gap-1 mt-0.5"
                  >
                    <span>Trích từ: {q.book}</span>
                    <span className="material-symbols-outlined text-xs">open_in_new</span>
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyQuote(q)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold transition-colors flex items-center gap-1"
                    title="Sao chép trích dẫn"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {copiedId === q.id ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedId === q.id ? 'Đã chép' : 'Sao chép'}</span>
                  </button>

                  <button
                    onClick={() => showToast('Đã lưu trích dẫn vào tủ sách cá nhân!', 'success')}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"
                    title="Lưu trích dẫn yêu thích"
                  >
                    <span className="material-symbols-outlined text-base">bookmark</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
