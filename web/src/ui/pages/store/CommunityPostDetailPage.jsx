import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import UserAvatar from '../../components/common/UserAvatar';
import { useToast } from '../../context/ToastContext';

export default function CommunityPostDetailPage() {
  const { id } = useParams();
  const { showToast } = useToast();

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(245);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([
    {
      id: 1,
      user: {
        name: 'Hoàng Bích Phương',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
        badge: 'Độc giả VIP'
      },
      time: '3 giờ trước',
      content: 'Hoàn toàn đồng ý với góc nhìn của bạn! Mình cũng từng bị mắc bẫy đặt mục tiêu quá lớn rồi bỏ cuộc giữa chừng. Từ khi chia nhỏ mục tiêu đọc 1 trang/ngày thì lại đọc được hơn 30 cuốn một năm.',
      likes: 18
    },
    {
      id: 2,
      user: {
        name: 'Đặng Tuấn Kiệt',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200',
        badge: 'Thành viên Tích Cực'
      },
      time: '5 giờ trước',
      content: 'Chương về thiết kế môi trường sống là chương đắt giá nhất. Giấu điện thoại vào ngăn kéo khi làm việc đã cứu rỗi sự tập trung của mình!',
      likes: 12
    }
  ]);

  const handleToggleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
    showToast(isLiked ? 'Đã bỏ thích bài viết' : 'Đã thích bài viết!', 'success');
  };

  const handleToggleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    showToast(isBookmarked ? 'Đã xóa khỏi danh sách lưu' : 'Đã lưu bài viết vào mục Đã Lưu!', 'success');
  };

  const handleToggleFollow = () => {
    setIsFollowing(!isFollowing);
    showToast(isFollowing ? 'Đã bỏ theo dõi tác giả bài viết' : 'Đang theo dõi tác giả bài viết!', 'success');
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const item = {
      id: Date.now(),
      user: {
        name: 'Nguyễn Văn An (Bạn)',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        badge: 'Độc giả Gold'
      },
      time: 'Vừa xong',
      content: newComment.trim(),
      likes: 0
    };

    setComments([item, ...comments]);
    setNewComment('');
    showToast('Đã đăng bình luận thành công!', 'success');
  };

  return (
    <div className="min-h-screen bg-theme-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-[#6b7280] mb-6">
          <Link to="/community" className="hover:text-theme-primary font-medium transition-colors">Diễn Đàn Cộng Đồng</Link>
          <span>/</span>
          <Link to="/community?tab=reviews" className="hover:text-theme-primary font-medium transition-colors">Bài Viết Phân Tích</Link>
          <span>/</span>
          <span className="text-on-surface font-semibold truncate max-w-xs">Atomic Habits &amp; Thiết Kế Thói Quen</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Article & Comments (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Post Card */}
            <article className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-10 shadow-xs">
              
              {/* Author Header */}
              <div className="flex items-center justify-between pb-6 border-b border-theme-border mb-6">
                <div className="flex items-center gap-3.5">
                  <UserAvatar
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
                    name="Nguyễn Minh Anh"
                    size="w-12 h-12"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-on-surface">Nguyễn Minh Anh</span>
                      <span className="text-[10px] bg-theme-secondary-subtle text-theme-secondary font-bold px-2 py-0.5 rounded-full">
                        Top 1% Reviewer
                      </span>
                    </div>
                    <div className="text-xs text-[#6b7280] flex items-center gap-2 mt-0.5">
                      <span>Đăng 12 giờ trước</span>
                      <span>•</span>
                      <span>5 phút đọc</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleToggleFollow}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isFollowing
                      ? 'bg-theme-secondary-subtle text-theme-secondary border border-theme-border'
                      : 'bg-theme-primary text-white hover:opacity-90'
                  }`}
                >
                  {isFollowing ? 'Đang Theo Dõi' : '+ Theo Dõi'}
                </button>
              </div>

              {/* Title & Body */}
              <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface leading-snug mb-4">
                Vì sao 90% chúng ta thất bại khi đặt mục tiêu đầu năm và cách "Atomic Habits" giải quyết tận gốc vấn đề?
              </h1>

              <div className="prose max-w-none text-sm text-on-surface-variant leading-relaxed space-y-4">
                <p>
                  Mỗi dịp đầu năm, chúng ta đều tràn trề khí thế lập danh sách những mục tiêu vĩ đại: giảm 10kg, đọc 50 cuốn sách, thức dậy lúc 5 giờ sáng, học thêm ngoại ngữ mới. Nhưng đến tháng 3, có tới 90% danh sách đó bị lãng quên trong cuốn sổ tay cũ.
                </p>

                <p>
                  Lý do không phải vì bạn thiếu ý chí hay lười biếng. Vấn đề cốt lõi nằm ở chỗ: <strong>Chúng ta tập trung quá nhiều vào "Kết Quả" (Goals) thay vì xây dựng "Hệ Thống" (Systems) và "Danh Tính" (Identity).</strong>
                </p>

                {/* Featured Quote in post */}
                <div className="my-6 p-5 rounded-2xl bg-theme-secondary-subtle border-l-4 border-theme-secondary text-theme-primary">
                  <p className="font-editorial text-base italic font-bold">
                    "Mục tiêu chỉ giúp bạn định hình phương hướng, nhưng chính hệ thống mới là thứ tạo ra tiến bộ thực sự."
                  </p>
                  <div className="text-xs font-semibold mt-2 text-theme-secondary">— James Clear</div>
                </div>

                <h3 className="font-editorial text-lg font-bold text-on-surface pt-2">
                  3 Bài học đắt giá tôi rút ra sau 6 tháng áp dụng:
                </h3>
                <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm">
                  <li><strong>Quy tắc 2 phút:</strong> Khi bắt đầu một thói quen mới, hãy thu nhỏ nó lại sao cho bạn chỉ mất chưa đầy 2 phút để hoàn thành (ví dụ: mở sách ra đọc 1 trang).</li>
                  <li><strong>Thiết kế môi trường:</strong> Đặt cuốn sách lên gối nằm vào buổi sáng, bạn sẽ cầm sách đọc thay vì với lấy chiếc điện thoại.</li>
                  <li><strong>Theo dõi thói quen trực quan:</strong> Đánh dấu X vào lịch mỗi ngày để kích hoạt dopamine thị giác.</li>
                </ul>
              </div>

              {/* Post Action Buttons */}
              <div className="flex items-center justify-between pt-6 mt-8 border-t border-theme-border">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleToggleLike}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                      isLiked
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : 'bg-theme-bg text-[#6b7280] border-theme-border hover:text-on-surface'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-lg ${isLiked ? 'text-rose-500 fill-current' : ''}`}>
                      favorite
                    </span>
                    <span>{likesCount} Yêu thích</span>
                  </button>

                  <button
                    onClick={handleToggleBookmark}
                    className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                      isBookmarked
                        ? 'bg-theme-primary text-white border-theme-primary'
                        : 'bg-theme-bg text-[#6b7280] border-theme-border hover:text-on-surface'
                    }`}
                    title="Lưu bài viết"
                  >
                    <span className="material-symbols-outlined text-lg">bookmark</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                  <span className="material-symbols-outlined text-base">visibility</span>
                  <span>1.420 lượt đọc</span>
                </div>
              </div>

            </article>

            {/* Comments Section */}
            <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-10 shadow-xs">
              <h3 className="font-editorial text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
                <span>Bình luận &amp; Thảo luận ({comments.length})</span>
              </h3>

              {/* Input Box */}
              <form onSubmit={handleAddComment} className="mb-6">
                <div className="flex items-start gap-3">
                  <UserAvatar
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
                    name="Bạn"
                    size="w-9 h-9"
                  />
                  <div className="flex-1">
                    <textarea
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Chia sẻ suy nghĩ hoặc câu hỏi của bạn về tác phẩm này..."
                      className="w-full bg-theme-bg border border-theme-border rounded-2xl p-3 text-xs sm:text-sm text-on-surface focus:bg-theme-surface focus:border-theme-primary outline-none transition-all"
                    ></textarea>
                    <div className="flex justify-end mt-2">
                      <button
                        type="submit"
                        disabled={!newComment.trim()}
                        className="bg-theme-primary text-white px-5 py-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        Gửi bình luận
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.map((c) => (
                  <div key={c.id} className="p-4 rounded-2xl bg-theme-secondary-subtle border border-theme-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <UserAvatar src={c.user.avatar} name={c.user.name} size="w-7 h-7" />
                        <span className="font-bold text-xs text-on-surface">{c.user.name}</span>
                        <span className="text-[10px] bg-theme-surface text-[#6b7280] px-2 py-0.5 rounded border border-theme-border">
                          {c.user.badge}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#6b7280]">{c.time}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed pl-9">{c.content}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Sidebar: Linked Book & Related Posts (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Book Info Card */}
            <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-[#ac2c19] tracking-wider mb-3">
                Tác phẩm đang thảo luận
              </div>
              <div className="flex gap-4 mb-4">
                <img
                  src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300"
                  alt="Atomic Habits"
                  className="w-20 h-28 object-cover rounded-xl shadow-xs shrink-0"
                />
                <div>
                  <h4 className="font-editorial text-base font-bold text-on-surface leading-snug">
                    Atomic Habits - Thay Đổi Tí Hon
                  </h4>
                  <p className="text-xs text-[#6b7280] mt-1">James Clear</p>
                  <div className="text-xs font-bold text-theme-secondary mt-2">79.000đ (Ebook DRM)</div>
                </div>
              </div>

              <div className="space-y-2">
                <Link
                  to="/book/atomic-habits"
                  className="w-full bg-theme-primary text-white py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span className="material-symbols-outlined text-base">shopping_bag</span>
                  <span>Mua Sách Ngay</span>
                </Link>
                <Link
                  to="/book/atomic-habits/preview"
                  className="w-full bg-theme-bg border border-theme-border text-on-surface py-2.5 rounded-xl text-xs font-bold hover:bg-theme-secondary-subtle transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">chrome_reader_mode</span>
                  <span>Đọc Thử Miễn Phí</span>
                </Link>
              </div>
            </div>

            {/* Related Community Topics */}
            <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 shadow-xs">
              <h4 className="font-editorial text-base font-bold text-on-surface mb-4">
                Chủ đề liên quan
              </h4>
              <div className="space-y-3">
                {[
                  { title: 'Tổng hợp 10 bài học từ sách Tâm Lý Học Về Tiền', author: 'Lê Hoàng', views: '2.1k' },
                  { title: 'Trải nghiệm đọc Ebook trên Kobo Clara vs HUKI App', author: 'Minh Tuấn', views: '1.8k' },
                  { title: 'Cách ghi chú Smart Notes với phương pháp Zettelkasten', author: 'Thanh Hà', views: '3.4k' },
                ].map((item, idx) => (
                  <Link
                    key={idx}
                    to="/community"
                    className="block p-3 rounded-2xl bg-theme-bg hover:bg-theme-secondary-subtle border border-theme-border transition-colors"
                  >
                    <div className="text-xs font-bold text-on-surface hover:text-theme-primary line-clamp-2">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-[#6b7280] flex items-center justify-between mt-2">
                      <span>{item.author}</span>
                      <span>{item.views} đọc</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
