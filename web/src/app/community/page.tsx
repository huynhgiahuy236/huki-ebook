'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import UserAvatar from '@/ui/components/common/UserAvatar';

interface PostComment {
  id: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

interface CommunityPost {
  id: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  content: string;
  createdAt: string;
  likes: number;
  isLiked?: boolean;
  bookAttachment?: {
    id: string;
    title: string;
    coverUrl?: string;
    author?: string;
    price?: number;
  };
  comments: PostComment[];
}

const INITIAL_POSTS: CommunityPost[] = [
  {
    id: 'post-1',
    authorName: 'Hoàng Minh Thư',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    authorRole: 'Độc giả kim cương',
    content: 'Vừa hoàn thành 3 chương đầu của "Nhà Giả Kim" trên Web Reader của HuKi. Bản dịch chỉn chu, chế độ đọc ban đêm dịu mắt cực kỳ! Ai cũng nên đọc qua cuốn này ít nhất một lần trong đời 📖✨',
    createdAt: '15 phút trước',
    likes: 24,
    isLiked: false,
    bookAttachment: {
      id: 'book-the-alchemist',
      title: 'Nhà Giả Kim (The Alchemist)',
      coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80',
      author: 'Paulo Coelho',
      price: 51000,
    },
    comments: [
      {
        id: 'c-1',
        authorName: 'Trần Văn Bảo',
        content: 'Cuốn này đoạn cậu bé chăn cừu gặp vua xứ Salem truyền cảm hứng thật sự!',
        createdAt: '10 phút trước',
      },
    ],
  },
  {
    id: 'post-2',
    authorName: 'Nguyễn Đăng Khoa',
    authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    authorRole: 'Reviewer công nghệ',
    content: 'Review nhanh "Sapiens: Lược Sử Loài Người": Góc nhìn vĩ mô về quá trình tiến hóa và nhận thức của nhân loại. Ebook DRM trên HuKi đọc rất mượt, font chữ tùy biến chuẩn typography sách in!',
    createdAt: '1 giờ trước',
    likes: 42,
    isLiked: false,
    bookAttachment: {
      id: 'book-sapiens',
      title: 'Sapiens: Lược Sử Loài Người',
      coverUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=300&auto=format&fit=crop&q=80',
      author: 'Yuval Noah Harari',
      price: 135000,
    },
    comments: [],
  },
];

function CommunityFeedContent() {
  const searchParams = useSearchParams();
  const { user, isLoggedIn } = useAuth();
  const { showToast } = useToast();

  const [posts, setPosts] = useState<CommunityPost[]>(INITIAL_POSTS);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ORDERS' | 'REVIEWS'>('ALL');

  // Post composer state
  const [postContent, setPostContent] = useState('');
  const [attachedBook, setAttachedBook] = useState<{
    id: string;
    title: string;
    coverUrl?: string;
  } | null>(null);

  // Comments state per post: { [postId]: string }
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [openCommentPostIds, setOpenCommentPostIds] = useState<Record<string, boolean>>({
    'post-1': true,
  });

  // BT-002: Active menu for post options (more_horiz)
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);

  const handleCopyPostLink = (postId: string) => {
    setActiveMenuPostId(null);
    const url = typeof window !== 'undefined' ? `${window.location.origin}/community#${postId}` : '';
    if (typeof navigator !== 'undefined' && navigator.clipboard && url) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('Đã sao chép liên kết bài viết vào bộ nhớ tạm!', 'success');
      }).catch(() => {
        showToast('Đã sao chép liên kết bài viết!', 'success');
      });
    } else {
      showToast('Đã sao chép liên kết bài viết!', 'success');
    }
  };

  const handleReportPost = (postId: string) => {
    setActiveMenuPostId(null);
    showToast('Cảm ơn bạn đã phản hồi. Ban quản trị HuKi sẽ kiểm duyệt bài viết này trong thời gian sớm nhất.', 'info');
  };

  const handleDeletePost = (postId: string) => {
    setActiveMenuPostId(null);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    showToast('Đã xóa bài viết thành công.', 'success');
  };

  // CA-003: Auto-prepopulate post from order-success
  useEffect(() => {
    const action = searchParams.get('action');
    const bookTitle = searchParams.get('bookTitle');
    const bookId = searchParams.get('bookId');
    const cover = searchParams.get('cover');

    if (action === 'share_order' || bookTitle) {
      const cleanTitle = bookTitle || 'Ấn phẩm sách mới';
      setPostContent(
        `Mình vừa sở hữu thành công ấn phẩm "${cleanTitle}" trên HuKi Ebook, háo hức bắt đầu đọc và chia sẻ cảm nhận cùng cộng đồng! 📚🎉`
      );
      if (bookId || bookTitle) {
        setAttachedBook({
          id: bookId || 'shared-book',
          title: cleanTitle,
          coverUrl: cover || undefined,
        });
      }
      showToast('Đã tạo bài viết chia sẻ đơn hàng mới của bạn!', 'info');
    }
  }, [searchParams, showToast]);

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) {
      showToast('Vui lòng nhập nội dung bài viết trước khi đăng.', 'warning');
      return;
    }

    const newPost: CommunityPost = {
      id: `post-${Date.now()}`,
      authorName: user?.fullName || user?.name || 'Độc giả HuKi',
      authorAvatar: user?.avatar || undefined,
      authorRole: 'Thành viên mới',
      content: postContent.trim(),
      createdAt: 'Vừa xong',
      likes: 1,
      isLiked: true,
      bookAttachment: attachedBook ? { ...attachedBook } : undefined,
      comments: [],
    };

    setPosts([newPost, ...posts]);
    setPostContent('');
    setAttachedBook(null);
    showToast('Đã đăng bài viết lên Bảng tin cộng đồng HuKi!', 'success');
  };

  const handleToggleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const newIsLiked = !p.isLiked;
        return {
          ...p,
          isLiked: newIsLiked,
          likes: newIsLiked ? p.likes + 1 : Math.max(0, p.likes - 1),
        };
      })
    );
  };

  const handleToggleComments = (postId: string) => {
    setOpenCommentPostIds((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  // CA-004: Submit comment with strict validation
  const handleSubmitComment = (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    const commentText = (commentInputs[postId] || '').trim();

    // Prevent submission and UI flickering on empty comment
    if (!commentText) return;

    const newComment: PostComment = {
      id: `comment-${Date.now()}`,
      authorName: user?.fullName || user?.name || 'Độc giả HuKi',
      authorAvatar: user?.avatar || undefined,
      content: commentText,
      createdAt: 'Vừa xong',
    };

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p))
    );

    setCommentInputs((prev) => ({
      ...prev,
      [postId]: '',
    }));

    showToast('Đã gửi bình luận thành công!', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16">
      {/* Community Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white py-10 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
              <span className="material-symbols-outlined text-[16px]">forum</span>
              <span>Mạng Xã Hội Tri Thức & Sách</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Cộng Đồng Độc Giả HuKi
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Nơi giao lưu, chia sẻ cảm nhận sách, lan tỏa văn hóa đọc và thảo luận các tác phẩm cùng hàng ngàn độc giả trên toàn quốc.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/books"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">explore</span>
              <span>Khám phá sách</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Post Composer Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <UserAvatar
                src={user?.avatar}
                name={user?.fullName || user?.name || 'Độc giả'}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs text-slate-900 block truncate">
                  {user?.fullName || user?.name || 'Độc giả HuKi'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {isLoggedIn ? 'Chia sẻ cảm nhận hoặc cuốn sách tâm đắc' : 'Đăng bài ẩn danh'}
                </span>
              </div>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Bạn đang đọc cuốn sách nào? Cùng chia sẻ góc nhìn hoặc trích dẫn yêu thích nhé..."
                rows={3}
                className="w-full p-3 rounded-2xl border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all resize-none"
              />

              {/* Attached Book Preview (From Order Success) */}
              {attachedBook && (
                <div className="p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-14 rounded-lg overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                      {attachedBook.coverUrl ? (
                        <img
                          src={attachedBook.coverUrl}
                          alt={attachedBook.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined text-sm">book</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block tracking-wider">
                        Sách vừa sở hữu
                      </span>
                      <p className="font-bold text-xs text-slate-900 truncate">
                        {attachedBook.title}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedBook(null)}
                    className="w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                    title="Gỡ sách đính kèm"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <span className="material-symbols-outlined text-emerald-700 text-base">public</span>
                  <span className="text-[11px] text-slate-500">Chế độ công khai</span>
                </div>
                <button
                  type="submit"
                  disabled={!postContent.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Đăng Lên Bảng Tin</span>
                </button>
              </div>
            </form>
          </div>

          {/* Feed Filter Tabs */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs text-xs font-semibold">
            {[
              { id: 'ALL', label: 'Tất cả bài viết' },
              { id: 'ORDERS', label: 'Sách mới sở hữu' },
              { id: 'REVIEWS', label: 'Cảm nhận & Đánh giá' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Posts List */}
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3"
              >
                {/* Author Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar src={post.authorAvatar} name={post.authorName} size="md" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">{post.authorName}</span>
                        {post.authorRole && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {post.authorRole}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block">{post.createdAt}</span>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer transition-colors"
                      title="Tùy chọn bài viết"
                    >
                      <span className="material-symbols-outlined text-base">more_horiz</span>
                    </button>

                    {activeMenuPostId === post.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-20 animate-in fade-in zoom-in-95 duration-100">
                        <button
                          type="button"
                          onClick={() => handleCopyPostLink(post.id)}
                          className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px] text-slate-500">content_copy</span>
                          <span>Sao chép liên kết</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReportPost(post.id)}
                          className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px] text-amber-500">flag</span>
                          <span>Báo cáo bài viết</span>
                        </button>
                        {(post.authorName === (user?.fullName || user?.name) || (user as any)?.role === 'ADMIN') && (
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            className="w-full px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100 mt-1 pt-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px] text-rose-500">delete</span>
                            <span>Xóa bài viết</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>

                {/* Attached Book Card */}
                {post.bookAttachment && (
                  <Link
                    href={`/book/${post.bookAttachment.id}`}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 transition-all flex items-center gap-3 group"
                  >
                    <div className="w-12 h-16 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200 shadow-2xs">
                      {post.bookAttachment.coverUrl ? (
                        <img
                          src={post.bookAttachment.coverUrl}
                          alt={post.bookAttachment.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined text-lg">book</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Tác phẩm liên quan
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 truncate group-hover:text-emerald-800 transition-colors">
                        {post.bookAttachment.title}
                      </h4>
                      {post.bookAttachment.author && (
                        <p className="text-[11px] text-slate-500 truncate">
                          {post.bookAttachment.author}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-emerald-700 shrink-0 group-hover:translate-x-0.5 transition-transform">
                      Xem sách →
                    </span>
                  </Link>
                )}

                {/* Actions Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleToggleLike(post.id)}
                      className={`flex items-center gap-1.5 font-bold transition-colors cursor-pointer ${
                        post.isLiked ? 'text-rose-600' : 'text-slate-500 hover:text-rose-600'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {post.isLiked ? 'favorite' : 'favorite_border'}
                      </span>
                      <span>{post.likes}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleComments(post.id)}
                      className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-700 font-bold transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span>
                      <span>{post.comments.length} bình luận</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(window.location.href);
                        showToast('Đã sao chép liên kết bài viết!', 'success');
                      }
                    }}
                    className="flex items-center gap-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">share</span>
                    <span>Chia sẻ</span>
                  </button>
                </div>

                {/* Comment Section */}
                {openCommentPostIds[post.id] && (
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    {/* Existing Comments */}
                    {post.comments.length > 0 && (
                      <div className="space-y-2">
                        {post.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="p-2.5 rounded-2xl bg-slate-50 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">
                                {comment.authorName}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {comment.createdAt}
                              </span>
                            </div>
                            <p className="text-slate-700">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* CA-004: Comment Input with strict validation & no flicker */}
                    <form
                      onSubmit={(e) => handleSubmitComment(post.id, e)}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                        placeholder="Viết cảm nhận của bạn..."
                        className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-200"
                      />
                      <button
                        type="submit"
                        disabled={!(commentInputs[post.id] || '').trim()}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Gửi
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Info Column */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-700 text-lg">local_fire_department</span>
              Chủ Đề Nổi Bật
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {[
                '#NhaGiaKim',
                '#Sapiens',
                '#KinhDoanh2026',
                '#DocSachMoiNgay',
                '#EbookDRM',
                '#ReviewSachHay',
              ].map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-600 transition-colors cursor-pointer"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-5 border border-emerald-200 space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-700 text-lg">military_tech</span>
              Độc Giả Tích Cực
            </h3>
            <p className="text-[11px] text-slate-600">
              Chia sẻ cảm nhận sách trên Bảng tin HuKi để tích lũy Xu thưởng và mở khóa huy hiệu độc giả kim cương!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-2 text-emerald-800">
            <span className="w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold">Đang tải Bảng tin Cộng đồng...</p>
          </div>
        </div>
      }
    >
      <CommunityFeedContent />
    </Suspense>
  );
}
