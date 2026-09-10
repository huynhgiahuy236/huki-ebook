import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export default function OrderReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const orderId = id || 'HUKI-8892401';

  const [rating, setRating] = useState(5);
  const [packagingRating, setPackagingRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const book = {
    title: 'Combo Hybrid: Atomic Habits - Thay Đổi Tí Hon (Sách In + Ebook)',
    author: 'James Clear • NXB Thế Giới & Alpha Books',
    cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300'
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reviewTitle.trim() || !reviewContent.trim()) {
      showToast('Vui lòng nhập tiêu đề và nội dung cảm nhận!', 'error');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      showToast('Đã gửi đánh giá thành công! Bạn nhận được +50 HUKI Xu thưởng.', 'success');
      navigate('/community/reviews');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-theme-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#6b7280] mb-6">
          <Link to="/orders" className="hover:text-theme-primary font-medium transition-colors">Lịch Sử Đơn Hàng</Link>
          <span>/</span>
          <Link to={`/orders/${orderId}`} className="hover:text-theme-primary font-medium transition-colors">Đơn #{orderId}</Link>
          <span>/</span>
          <span className="text-on-surface font-semibold">Đánh Giá Sản Phẩm</span>
        </div>

        {/* Review Form Card */}
        <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-10 shadow-xs">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-theme-border mb-6">
            <div>
              <h1 className="font-editorial text-2xl font-bold text-on-surface">
                Đánh Giá Đơn Hàng #{orderId}
              </h1>
              <p className="text-xs text-[#6b7280] mt-0.5">
                Chia sẻ cảm nhận chân thực để giúp đỡ cộng đồng độc giả HUKI
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-[#684000] bg-[#fea619]/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-[#fea619]">monetization_on</span>
                +50 Xu Thưởng
              </span>
            </div>
          </div>

          {/* Purchased Book Banner */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-theme-secondary-subtle border border-theme-border mb-6">
            <img
              src={book.cover}
              alt={book.title}
              className="w-12 h-16 object-cover rounded-lg shadow-2xs shrink-0"
            />
            <div>
              <div className="font-bold text-xs sm:text-sm text-on-surface leading-snug">{book.title}</div>
              <div className="text-[11px] text-[#6b7280] mt-0.5">{book.author}</div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Overall Rating */}
            <div>
              <label className="block text-xs font-bold text-on-surface mb-2 text-center">
                Mức độ hài lòng chung:
              </label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <span
                      className={`material-symbols-outlined text-3xl sm:text-4xl ${
                        star <= rating ? 'text-[#fea619] fill-current' : 'text-gray-300'
                      }`}
                    >
                      star
                    </span>
                  </button>
                ))}
              </div>
              <div className="text-center text-xs font-bold text-theme-primary mt-1">
                {rating === 5 && 'Tuyệt vời, cực kỳ hài lòng!'}
                {rating === 4 && 'Rất tốt, đúng như kỳ vọng.'}
                {rating === 3 && 'Bình thường, tạm ổn.'}
                {rating === 2 && 'Chưa hài lòng.'}
                {rating === 1 && 'Rất tệ, cần cải thiện.'}
              </div>
            </div>

            {/* Sub-ratings */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-theme-secondary-subtle border border-theme-border text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#6b7280]">Đóng gói sách:</span>
                <div className="flex gap-0.5 text-[#fea619]">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      onClick={() => setPackagingRating(s)}
                      className={`material-symbols-outlined text-sm cursor-pointer ${s <= packagingRating ? 'text-[#fea619]' : 'text-gray-300'}`}
                    >
                      star
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#6b7280]">Giao hàng nhanh:</span>
                <div className="flex gap-0.5 text-[#fea619]">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      onClick={() => setDeliveryRating(s)}
                      className={`material-symbols-outlined text-sm cursor-pointer ${s <= deliveryRating ? 'text-[#fea619]' : 'text-gray-300'}`}
                    >
                      star
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Review Title */}
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">
                Tiêu đề ngắn gọn về cảm nhận *
              </label>
              <input
                type="text"
                required
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Ví dụ: Cuốn sách hay nhất năm, chất lượng in bìa cứng rất sắc nét!"
                className="w-full bg-theme-bg border border-theme-border rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-on-surface focus:bg-theme-surface focus:border-theme-primary outline-none transition-colors"
              />
            </div>

            {/* Review Content */}
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">
                Chi tiết đánh giá nội dung &amp; trải nghiệm đọc *
              </label>
              <textarea
                rows={4}
                required
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                placeholder="Chia sẻ bài học sâu sắc nhất bạn rút ra từ cuốn sách này..."
                className="w-full bg-theme-bg border border-theme-border rounded-2xl p-4 text-xs sm:text-sm text-on-surface focus:bg-theme-surface focus:border-theme-primary outline-none transition-colors"
              ></textarea>
            </div>

            {/* Anonymous option */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 rounded accent-theme-primary"
                />
                <span>Đánh giá ẩn danh (Ẩn tên trên diễn đàn cộng đồng)</span>
              </label>
            </div>

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-theme-primary text-white py-3.5 rounded-2xl text-sm font-bold hover:opacity-90 active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Đang gửi đánh giá...</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">send</span>
                    <span>Hoàn Tất &amp; Nhận 50 HUKI Xu</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
}
