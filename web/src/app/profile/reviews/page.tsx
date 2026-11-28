'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import AccountLayout from '@/ui/components/layout/AccountLayout';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { orderApi } from '@/ui/api/orderApi';
import { reviewApi, ReviewItemData } from '@/ui/api/reviewApi';
import VerifiedPurchaseBadge from '@/ui/components/review/VerifiedPurchaseBadge';
import ReviewFormModal from '@/ui/components/review/ReviewFormModal';
import CountdownConfirmModal from '@/ui/components/common/CountdownConfirmModal';
import { StandardPaginationBar } from '@/ui/components/common/GroupedDataTable';

export default function MyReviewsPage() {
  const { user, isLoggedIn } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'REVIEWED' | 'PENDING'>('REVIEWED');
  const [starFilter, setStarFilter] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currentReviewedPage, setCurrentReviewedPage] = useState(1);
  const [currentPendingPage, setCurrentPendingPage] = useState(1);
  const pageSize = 10;

  const [reviewedList, setReviewedList] = useState<ReviewItemData[]>([]);
  const [pendingOrdersList, setPendingOrdersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editingReview, setEditingReview] = useState<ReviewItemData | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const isSellerOrAdmin = Boolean(
    isLoggedIn && (
      user?.role === 'BUSINESS' ||
      user?.role === 'PLATFORM_ADMIN' ||
      (user as any)?.role === 'SELLER' ||
      Boolean((user as any)?.business)
    )
  );

  const handleDeleteReview = (reviewId: string) => {
    setConfirmDeleteId(reviewId);
  };

  const executeDeleteReview = async () => {
    if (!confirmDeleteId) return;
    setIsDeleting(true);
    try {
      const res = await reviewApi.deleteReview(confirmDeleteId);
      if (res?.success) {
        showToast('Đã xóa đánh giá thành công.', 'success');
        setConfirmDeleteId(null);
        loadReviewsData();
      } else {
        showToast(res?.error?.message || 'Không thể xóa đánh giá.', 'error');
      }
    } catch {
      showToast('Có lỗi xảy ra khi xóa đánh giá.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendSellerReply = async (reviewId: string) => {
    if (!replyContent.trim()) {
      showToast('Vui lòng nhập nội dung phản hồi.', 'warning');
      return;
    }
    setIsSubmittingReply(true);
    try {
      const res = await reviewApi.replyReview(reviewId, { content: replyContent.trim() });
      if (res?.success) {
        showToast('Đã gửi phản hồi đánh giá thành công!', 'success');
        setReplyingReviewId(null);
        setReplyContent('');
        window.dispatchEvent(
          new CustomEvent('huki_review_reply_created', {
            detail: { reviewId, reply: res.data },
          })
        );
        try {
          localStorage.setItem('huki_review_sync', String(Date.now()));
        } catch {}
        loadReviewsData();
      } else {
        showToast(res?.error?.message || 'Không thể gửi phản hồi.', 'error');
      }
    } catch {
      showToast('Có lỗi xảy ra khi gửi phản hồi.', 'error');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Load reviews from local storage & API
  const loadReviewsData = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      reviewApi.getMyReviews({ limit: 100 }),
      orderApi.getBuyerOrders({ page: 1, limit: 50 }),
    ])
      .then(([reviewsRes, ordersRes]) => {
        const userReviews = reviewsRes?.data || [];
        setReviewedList(userReviews);

        if (ordersRes?.success && ordersRes.data) {
          const rawData: any = ordersRes.data;
          const orders = Array.isArray(rawData) ? rawData : (rawData.items || rawData.data || []);
          
          // Extract items from completed/delivered orders
          const pendingItems: any[] = [];
          const reviewedTargetIds = new Set(userReviews.map((r) => String(r.targetId || (r as any).bookId)));

          orders.forEach((ord: any) => {
            const isEligible = ord.status === 'COMPLETED' || ord.status === 'DELIVERED';
            if (!isEligible) return;

            const sellerOrders = ord.sellerOrders || [];
            sellerOrders.forEach((so: any) => {
              const items = so.items || [];
              items.forEach((item: any) => {
                const bId = String(item.bookId || item.id);
                if (!reviewedTargetIds.has(bId)) {
                  pendingItems.push({
                    orderId: ord.id,
                    orderCode: ord.code,
                    sellerOrderId: so.id,
                    storeName: so.storeName || 'Gian Hàng Chính Thức',
                    bookId: bId,
                    title: item.bookTitle || item.title || 'Sách Bản Quyền HUKI',
                    coverUrl: item.bookCoverUrl || item.coverImage || item.coverUrl || '/images/book-placeholder.png',
                    format: item.format || 'PHYSICAL',
                    deliveredAt: ord.updatedAt || ord.createdAt,
                  });
                }
              });
            });
          });

          setPendingOrdersList(pendingItems);
        }
      })
      .catch((err) => {
        console.error('Failed to load user reviews:', err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadReviewsData();
  }, [loadReviewsData]);

  // Real-time listener: refresh when review is created
  useEffect(() => {
    const handleSync = () => loadReviewsData();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'huki_review_sync') loadReviewsData();
    };

    window.addEventListener('huki_review_created', handleSync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('huki_review_created', handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadReviewsData]);

  // Filter reviewed items
  const filteredReviewed = useMemo(() => {
    return reviewedList.filter((item) => {
      if (starFilter !== 'ALL' && Math.round(item.rating) !== starFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchContent = (item.content || '').toLowerCase().includes(q);
        return matchTitle || matchContent;
      }
      return true;
    });
  }, [reviewedList, starFilter, searchQuery]);

  const paginatedReviewed = useMemo(() => {
    const start = (currentReviewedPage - 1) * pageSize;
    return filteredReviewed.slice(start, start + pageSize);
  }, [filteredReviewed, currentReviewedPage, pageSize]);

  const paginatedPending = useMemo(() => {
    const start = (currentPendingPage - 1) * pageSize;
    return pendingOrdersList.slice(start, start + pageSize);
  }, [pendingOrdersList, currentPendingPage, pageSize]);

  return (
    <AccountLayout>
      <div className="space-y-6 w-full min-w-0 max-w-full overflow-hidden">
        {/* ================= 1. HEADER & KPI CARDS ================= */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-2xs w-full max-w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-editorial text-gray-900">
                Đánh Giá Của Tôi
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Quản lý lịch sử nhận xét, điểm sao và các đơn hàng chờ đánh giá.
              </p>
            </div>
          </div>

          {/* 3 Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-5 text-xs">
            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/70">
              <span className="text-gray-500 font-medium block">Đã đánh giá</span>
              <span className="text-2xl font-black text-gray-900 mt-0.5 block">
                {reviewedList.length}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/70">
              <span className="text-gray-500 font-medium block">Chờ đánh giá</span>
              <span className="text-2xl font-black text-amber-600 mt-0.5 block">
                {pendingOrdersList.length}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/70">
              <span className="text-gray-500 font-medium block">Điểm trung bình</span>
              <span className="text-2xl font-black text-[#006953] mt-0.5 block">
                {reviewedList.length > 0
                  ? `${(reviewedList.reduce((s, r) => s + Number(r.rating || 0), 0) / reviewedList.length).toFixed(1)} ★`
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* ================= 2. 1-ROW TABS, CENTER SEARCH & CONTROLS ================= */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs w-full max-w-full overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Left: Tabs */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('REVIEWED');
                  setStarFilter('ALL');
                  setCurrentReviewedPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'REVIEWED'
                    ? 'bg-[#003B2B] text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Đã Đánh Giá</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10.5px] font-bold ${activeTab === 'REVIEWED' ? 'bg-white/20 text-white' : 'bg-white text-slate-700'}`}>
                  {reviewedList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('PENDING');
                  setCurrentPendingPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'PENDING'
                    ? 'bg-[#003B2B] text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Chưa Đánh Giá</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10.5px] font-bold ${activeTab === 'PENDING' ? 'bg-white/20 text-white' : 'bg-white text-slate-700'}`}>
                  {pendingOrdersList.length}
                </span>
              </button>
            </div>

            {/* Center: Search Box */}
            <div className="relative flex-1 min-w-0">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentReviewedPage(1);
                }}
                placeholder="Tìm theo tên sách, tác giả, nội dung đánh giá..."
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50/80 border border-slate-200/80 focus:border-[#00875A] rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00875A]/15 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentReviewedPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>

            {/* Right: Star Filter + Count */}
            <div className="flex items-center justify-between lg:justify-end gap-2.5 shrink-0">
              {activeTab === 'REVIEWED' && (
                <select
                  value={String(starFilter)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStarFilter(val === 'ALL' ? 'ALL' : Number(val));
                    setCurrentReviewedPage(1);
                  }}
                  aria-label="Lọc theo số sao"
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#003B2B] cursor-pointer"
                >
                  <option value="ALL">Tất cả số sao ({reviewedList.length})</option>
                  {[5, 4, 3, 2, 1].map((star) => (
                    <option key={star} value={star}>
                      {star} Sao ({reviewedList.filter((r) => r.rating === star).length})
                    </option>
                  ))}
                </select>
              )}
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                Hiển thị <strong className="text-slate-800">{activeTab === 'REVIEWED' ? filteredReviewed.length : pendingOrdersList.length}</strong> mục
              </span>
            </div>
          </div>
        </div>

        {/* ================= 3. CONTENT (LIST) ================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {activeTab === 'REVIEWED' && (
            <div className="p-4 sm:p-6 space-y-4">

              {/* Reviewed List */}
              {isLoading ? (
                <div className="py-12 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-3xl animate-spin text-[#006953]">sync</span>
                  <span>Đang tải lịch sử đánh giá của bạn...</span>
                </div>
              ) : filteredReviewed.length === 0 ? (
                <div className="py-16 text-center text-gray-400 max-w-sm mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-3xl">rate_review</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-700 mb-1">Chưa có đánh giá nào</h4>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">
                    {searchQuery || starFilter !== 'ALL'
                      ? 'Không tìm thấy đánh giá nào phù hợp với bộ lọc.'
                      : 'Bạn chưa gửi đánh giá nào cho sản phẩm đã mua. Hãy chuyển sang tab "Chưa Đánh Giá" để chia sẻ cảm nhận!'}
                  </p>
                  {pendingOrdersList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('PENDING')}
                      className="px-4 py-2 rounded-xl bg-[#006953] text-white font-bold text-xs hover:bg-[#00523c] transition-colors cursor-pointer"
                    >
                      Xem {pendingOrdersList.length} đơn chờ đánh giá
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {paginatedReviewed.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 sm:p-5 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 transition-all space-y-3.5 shadow-2xs"
                    >
                      {/* Top: Target Book Info + Actions */}
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="text-[11px] text-gray-500">
                            Định dạng: <strong>{rev.format === 'DIGITAL' ? 'Ebook' : 'Sách In'}</strong>
                          </span>
                          <span className="text-gray-300">•</span>
                          <VerifiedPurchaseBadge variant="compact" />
                          {rev.status === 'HIDDEN' ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[11px] font-semibold inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Đã bị ẩn
                            </span>
                          ) : (rev.isReported || rev.status === 'FLAGGED') ? (
                            <span
                              className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-semibold inline-flex items-center gap-1.5"
                              title="Đánh giá vẫn hiển thị bình thường cho tới khi Admin quyết định"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Đang bị báo cáo
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingReview(rev)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-[#006953] text-[#006953] text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Chỉnh sửa đánh giá này"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(rev.id)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-rose-300 hover:text-rose-600 text-slate-600 text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Xóa đánh giá này"
                          >
                            Xóa
                          </button>
                          {rev.targetId && (
                            <Link
                              href={`/book/${rev.targetId}`}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition-colors shrink-0"
                            >
                              Xem sách
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Middle: Rating Stars & Content */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <span
                                key={s}
                                className={`material-symbols-outlined text-base ${
                                   s <= (rev.rating || 5) ? 'text-[#fea619]' : 'text-slate-200'
                                }`}
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                star
                              </span>
                            ))}
                          </div>
                          <span className="text-xs font-bold text-gray-800">{rev.rating} sao</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-[11px] text-gray-400">
                            {new Date(rev.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {rev.content}
                        </p>

                        {/* Review Attached Photos */}
                        {rev.images && rev.images.length > 0 && (
                          <div className="flex items-center gap-2 pt-2 flex-wrap">
                            {rev.images.map((img, idx) => (
                              <div
                                key={idx}
                                onClick={() => setPreviewImage(img.url)}
                                className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer hover:opacity-85 transition-opacity"
                              >
                                <img
                                  src={img.url}
                                  alt="Attached evidence"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Seller Replies Section */}
                      {rev.replies && rev.replies.length > 0 ? (
                        <div className="relative mt-2.5 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs space-y-1">
                          <span className="absolute -top-1.5 left-5 w-2.5 h-2.5 bg-slate-50 border-l border-t border-slate-200/80 rotate-45" />
                          <div className="flex items-center justify-between text-slate-800 font-semibold">
                            <span>Phản hồi từ {rev.replies[rev.replies.length - 1].business?.name || 'Gian Hàng'}</span>
                            <span className="text-[11px] font-normal text-slate-400">
                              {new Date(rev.replies[rev.replies.length - 1].createdAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">
                            {rev.replies[rev.replies.length - 1].content}
                          </p>
                        </div>
                      ) : isSellerOrAdmin ? (
                        <div className="pt-1">
                          {replyingReviewId === rev.id ? (
                            <div className="p-3.5 bg-gray-50/90 rounded-xl border border-gray-200 space-y-2.5">
                              <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-sm text-[#006953]">storefront</span>
                                  <span>Phản hồi của Gian Hàng</span>
                                </span>
                                <span className="text-[10px] text-gray-400">{replyContent.length}/2000 ký tự</span>
                              </div>
                              <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="Nhập nội dung phản hồi đánh giá của khách hàng..."
                                rows={3}
                                disabled={isSubmittingReply}
                                className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#006953] transition-colors resize-y"
                              />
                              <div className="flex items-center justify-end gap-2 text-xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingReviewId(null);
                                    setReplyContent('');
                                  }}
                                  disabled={isSubmittingReply}
                                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 cursor-pointer"
                                >
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendSellerReply(rev.id)}
                                  disabled={isSubmittingReply || !replyContent.trim()}
                                  className="px-3 py-1.5 rounded-lg bg-[#006953] text-white font-bold hover:bg-[#00523c] disabled:opacity-50 cursor-pointer flex items-center gap-1"
                                >
                                  {isSubmittingReply && <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>}
                                  <span>Gửi phản hồi</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingReviewId(rev.id);
                                setReplyContent('');
                              }}
                              className="inline-flex items-center gap-1 text-xs text-[#006953] font-bold hover:underline cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">reply</span>
                              <span>Phản hồi với tư cách Người Bán</span>
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ))}

                  {filteredReviewed.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <StandardPaginationBar
                        currentPage={currentReviewedPage}
                        totalItems={filteredReviewed.length}
                        pageSize={pageSize}
                        onPageChange={(p) => setCurrentReviewedPage(p)}
                        itemLabel="đánh giá"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: CHƯA ĐÁNH GIÁ (PENDING ORDERS) ================= */}
          {activeTab === 'PENDING' && (
            <div className="p-4 sm:p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Chia sẻ nhận xét thực tế về sách đã nhận để giúp cộng đồng độc giả HuKi lựa chọn phù hợp hơn.
              </p>

              {isLoading ? (
                <div className="py-12 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-3xl animate-spin text-[#006953]">sync</span>
                  <span>Đang tải danh sách đơn hàng đủ điều kiện đánh giá...</span>
                </div>
              ) : pendingOrdersList.length === 0 ? (
                <div className="py-16 text-center text-gray-400 max-w-sm mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#006953] flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-3xl">task_alt</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-700 mb-1">Tuyệt vời! Bạn đã đánh giá tất cả</h4>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">
                    Hiện không có đơn hàng nào cần đánh giá. Khi bạn mua thêm sách mới và nhận hàng thành công, sản phẩm sẽ hiển thị tại đây.
                  </p>
                  <Link
                    href="/books"
                    className="px-4 py-2 rounded-xl bg-[#006953] text-white font-bold text-xs hover:bg-[#00523c] transition-colors inline-block"
                  >
                    Khám Phá Sách Mới
                  </Link>
                </div>
              ) : (
                <>
                <div className="space-y-3.5">
                  {paginatedPending.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-gray-200 bg-white hover:border-[#006953]/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-14 h-18 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shrink-0 shadow-2xs">
                          <img
                            src={item.coverUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-mono text-[11px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded">
                              #{item.orderCode}
                            </span>
                            <span className="text-xs text-gray-500">
                              Gian hàng: <strong className="text-gray-800">{item.storeName}</strong>
                            </span>
                          </div>
                          <h4 className="font-bold text-xs sm:text-sm text-gray-900 break-words line-clamp-2 leading-snug">
                            {item.title}
                          </h4>
                          <span className="text-[11px] text-gray-500 block mt-0.5">
                            Phân loại: {item.format === 'DIGITAL' ? 'Sách Điện Tử (Ebook)' : 'Sách In'}
                          </span>
                        </div>
                      </div>

                      <div className="self-end sm:self-center shrink-0">
                        <Link
                          href={`/orders/${item.orderId}/review`}
                          className="px-4 py-2 rounded-xl bg-[#006953] hover:bg-[#00523c] text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">rate_review</span>
                          <span>Đánh Giá Ngay</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {pendingOrdersList.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <StandardPaginationBar
                      currentPage={currentPendingPage}
                      totalItems={pendingOrdersList.length}
                      pageSize={pageSize}
                      onPageChange={(p) => setCurrentPendingPage(p)}
                      itemLabel="đơn chờ đánh giá"
                    />
                  </div>
                )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= 3. IMAGE PREVIEW MODAL ================= */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="relative max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden bg-black">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors z-10 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-full object-contain max-h-[80vh]"
            />
          </div>
        </div>
      )}

      {/* ================= 4. EDIT REVIEW MODAL ================= */}
      {editingReview && (
        <ReviewFormModal
          isOpen={Boolean(editingReview)}
          onClose={() => setEditingReview(null)}
          onSuccess={() => {
            setEditingReview(null);
            loadReviewsData();
          }}
          bookId={editingReview.targetId}
          bookTitle={editingReview.title}
          initialReview={editingReview}
        />
      )}

      {/* ================= 5. CONFIRM DELETE MODAL (5s Countdown) ================= */}
      <CountdownConfirmModal
        isOpen={Boolean(confirmDeleteId)}
        title="Xác nhận xóa đánh giá"
        description="Bạn có chắc chắn muốn xóa bài đánh giá này? Sau khi xóa, đơn hàng sẽ quay lại mục Chưa Đánh Giá để bạn có thể gửi đánh giá mới."
        countdownSeconds={5}
        confirmLabel="Xóa đánh giá"
        loading={isDeleting}
        onCancel={() => !isDeleting && setConfirmDeleteId(null)}
        onConfirm={executeDeleteReview}
      />
    </AccountLayout>
  );
}
