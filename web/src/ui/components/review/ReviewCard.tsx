'use client';

import React, { useState, useEffect } from 'react';
import UserAvatar from '@/ui/components/common/UserAvatar';
import VerifiedPurchaseBadge from './VerifiedPurchaseBadge';
import { reviewApi, ReviewItemData, ReviewReplyItem } from '@/ui/api/reviewApi';
import { useToast } from '@/ui/context/ToastContext';

export interface ReviewCardProps {
  review: ReviewItemData | {
    id: string | number;
    targetId?: string;
    author: { id?: string; fullName: string; avatar?: string };
    rating: number;
    title: string;
    content: string;
    verifiedPurchase?: boolean;
    format?: 'PHYSICAL' | 'DIGITAL' | string;
    images?: Array<{ url: string; thumbnail?: string }> | string[];
    helpfulCount?: number;
    isHelpful?: boolean;
    status?: 'PENDING_REVIEW' | 'PUBLISHED' | 'HIDDEN' | 'DELETED' | 'FLAGGED';
    isReported?: boolean;
    reportCount?: number;
    reportReason?: string;
    moderationNote?: string;
    replies?: Array<{
      id: string;
      content: string;
      business: { id: string; name: string };
      createdAt: string;
    }>;
    createdAt?: string;
  };
  onHelpfulChange?: (reviewId: string, helpful: boolean) => void;
  canReply?: boolean;
  onReplySuccess?: (reply: ReviewReplyItem) => void;
  className?: string;
  isOwner?: boolean;
  onEdit?: () => void;
}

export default function ReviewCard({
  review,
  onHelpfulChange,
  canReply = false,
  onReplySuccess,
  className = '',
  isOwner = false,
  onEdit,
}: ReviewCardProps) {
  const { showToast } = useToast();
  const [isHelpful, setIsHelpful] = useState(Boolean(review.isHelpful));
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount || 0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [replies, setReplies] = useState(review.replies || []);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  useEffect(() => {
    setReplies(review.replies || []);
  }, [review.replies]);

  useEffect(() => {
    setIsHelpful(Boolean(review.isHelpful));
    setHelpfulCount(review.helpfulCount || 0);
  }, [review.isHelpful, review.helpfulCount]);

  // Report review states (BUG-MOD06-13)
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState<'SPAM' | 'HARASSMENT' | 'OFFENSIVE' | 'MISINFORMATION' | 'COPYRIGHT' | 'OTHER'>('SPAM');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!review.id) return;

    setIsSubmittingReport(true);
    try {
      const res = await reviewApi.reportReview(String(review.id), {
        reason: reportReason,
        description: reportDescription.trim() || undefined,
      });

      if (res?.success) {
        showToast('Đã gửi báo cáo vi phạm. Đội ngũ kiểm duyệt HUKI sẽ xử lý trong 24h!', 'success');
        setIsReporting(false);
        setReportDescription('');
      } else {
        showToast((res as any)?.error?.message || 'Không thể gửi báo cáo vi phạm lúc này.', 'error');
      }
    } catch {
      showToast('Đã có lỗi xảy ra khi gửi báo cáo vi phạm.', 'error');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const formattedDate = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    : 'Gần đây';

  const imageList: string[] = Array.isArray(review.images)
    ? review.images.map((img) => (typeof img === 'string' ? img : img.url))
    : [];

  const handleToggleHelpful = async () => {
    const nextState = !isHelpful;
    setIsHelpful(nextState);
    setHelpfulCount((prev) => Math.max(0, prev + (nextState ? 1 : -1)));

    try {
      if (typeof review.id === 'string' && review.id.length === 24) {
        const res = nextState
          ? await reviewApi.markHelpful(review.id)
          : await reviewApi.unmarkHelpful(review.id);

        if (!res?.success) {
          setIsHelpful(!nextState);
          setHelpfulCount((prev) => Math.max(0, prev + (nextState ? -1 : 1)));
          if (res?.error?.statusCode === 401) {
            showToast('Vui lòng đăng nhập để đánh dấu đánh giá hữu ích.', 'warning');
          } else {
            showToast(res?.error?.message || 'Không thể cập nhật phản hồi lúc này.', 'error');
          }
          return;
        }

        if (res.data) {
          setHelpfulCount(res.data.helpfulCount);
          setIsHelpful(res.data.isHelpful);
        }
      }
      showToast(
        nextState ? 'Cảm ơn bạn đã phản hồi đánh giá hữu ích!' : 'Đã bỏ ghi nhận hữu ích',
        'success'
      );
      if (onHelpfulChange) {
        onHelpfulChange(String(review.id), nextState);
      }
    } catch {
      // Revert on error
      setIsHelpful(!nextState);
      setHelpfulCount((prev) => Math.max(0, prev + (nextState ? -1 : 1)));
      showToast('Không thể cập nhật phản hồi lúc này.', 'error');
    }
  };

  const handleSendReply = async () => {
    const trimmed = replyText.trim();
    if (trimmed.length < 2) {
      showToast('Nội dung phản hồi tối thiểu 2 ký tự.', 'error');
      return;
    }
    if (trimmed.length > 2000) {
      showToast('Nội dung phản hồi không được vượt quá 2.000 ký tự.', 'error');
      return;
    }
    setIsSubmittingReply(true);
    try {
      const res = await reviewApi.replyReview(String(review.id), { content: trimmed });
      if (res.data) {
        const newReply: ReviewReplyItem = {
          id: res.data.id,
          content: res.data.content,
          business: res.data.business,
          responderId: 'seller',
          createdAt: res.data.createdAt,
          updatedAt: new Date().toISOString(),
        };
        setReplies((prev) =>
          prev.some((r) => String(r.id) === String(newReply.id)) ? prev : [...prev, newReply]
        );
        setReplyText('');
        setIsReplying(false);
        showToast('Đã gửi phản hồi thành công!', 'success');
        window.dispatchEvent(
          new CustomEvent('huki_review_reply_created', {
            detail: { reviewId: String(review.id), targetId: review.targetId, reply: newReply },
          })
        );
        try {
          localStorage.setItem('huki_review_sync', String(Date.now()));
        } catch { }
        if (onReplySuccess) onReplySuccess(newReply);
      } else if (res.error?.code === 'REVIEW_ALREADY_EXISTS') {
        showToast('Gian hàng đã gửi phản hồi cho đánh giá này.', 'error');
      } else if (res.error?.code === 'AUTHZ_ROLE_INSUFFICIENT' || res.error?.code === 'AUTHZ_NOT_OWNER') {
        showToast('Bạn không có quyền phản hồi cho đánh giá này.', 'error');
      } else {
        showToast(res.error?.message || 'Không thể gửi phản hồi.', 'error');
      }
    } catch {
      showToast('Có lỗi xảy ra khi gửi phản hồi.', 'error');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const isFlaggedHiddenFromPublic =
    review.status === 'FLAGGED' && !isOwner && !canReply;

  return (
    <div
      className={`bg-gradient-to-b from-white to-[#faf9f6]/40 dark:from-zinc-900 dark:to-zinc-900/60 rounded-3xl border border-slate-100 dark:border-zinc-800/80 p-5 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.07)] hover:border-emerald-500/20 transition-all duration-300 space-y-4 relative group ${className}`}
    >
      {/* Header: Author & Badges & Stars */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0 ring-2 ring-emerald-500/10 rounded-full p-0.5">
            <UserAvatar
              src={review.author?.avatar || (review as any).authorAvatar}
              name={review.author?.fullName || 'Độc giả HUKI'}
              size="w-10 h-10 sm:w-11 sm:h-11"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-zinc-100 truncate">
                {review.author?.fullName || 'Độc giả HUKI'}
              </span>
              {isOwner && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#006953] dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/60 dark:border-emerald-800/50 shadow-2xs">
                  Đánh giá của bạn
                </span>
              )}
              {review.verifiedPurchase && (
                <VerifiedPurchaseBadge
                  variant="pill"
                  format={review.format}
                />
              )}
              {(isOwner || canReply) && (review.isReported || review.status === 'FLAGGED') && (
                <span
                  className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[11px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                  title="Đánh giá đang được Admin xem xét báo cáo và vẫn hiển thị cho tới khi có quyết định."
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Đang bị báo cáo (Chờ duyệt)
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-zinc-400 flex items-center gap-2 mt-0.5">
              <span>{formattedDate}</span>
              {review.format && (
                <>
                  <span>•</span>
                  <span>Định dạng: {review.format === 'PHYSICAL' ? 'Sách In' : 'Ebook'}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Rating Stars & Action on Right */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-zinc-800/60">
          <div className="flex items-center gap-0.5 bg-amber-50/70 dark:bg-amber-950/20 px-2.5 py-1 rounded-full border border-amber-200/50 dark:border-amber-900/40 shadow-2xs">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`material-symbols-outlined text-[15px] sm:text-base ${star <= review.rating ? 'text-amber-500' : 'text-slate-200 dark:text-zinc-700'
                  }`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
            ))}
          </div>

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-300/80 bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-700/60 text-[#006953] dark:text-emerald-300 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
              title="Chỉnh sửa đánh giá của bạn"
            >
              <span className="material-symbols-outlined text-[14px]">edit_note</span>
              <span>Sửa đánh giá</span>
            </button>
          )}
        </div>
      </div>

      {/* Review Title & Content */}
      {isFlaggedHiddenFromPublic ? (
        <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-base shrink-0">visibility_off</span>
          <span>Nội dung đánh giá này đang được đội ngũ kiểm duyệt xem xét và tạm hạn chế hiển thị.</span>
        </div>
      ) : (() => {
        const text = review.content || review.title || '';
        const isLongText = text.length > 180 || text.split('\n').length > 3;
        return (
          <div className="pt-0.5 space-y-1">
            <p
              className={`text-xs sm:text-sm text-slate-700 dark:text-zinc-200 leading-relaxed whitespace-pre-line font-normal ${
                !isContentExpanded && isLongText ? 'line-clamp-3' : ''
              }`}
            >
              {text}
            </p>
            {isLongText && (
              <button
                type="button"
                onClick={() => setIsContentExpanded((prev) => !prev)}
                className="text-[11px] font-semibold text-[#006953] hover:underline cursor-pointer"
              >
                {isContentExpanded ? 'Thu gọn' : 'Xem thêm'}
              </button>
            )}
          </div>
        );
      })()}

      {/* Images Gallery with safe fallback against 403 / broken links */}
      {imageList.length > 0 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          {imageList.map((img, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedImage(img)}
              className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-zinc-700/80 shadow-2xs shrink-0 cursor-pointer hover:opacity-95 hover:scale-[1.04] transition-all bg-slate-50 dark:bg-zinc-800 group/img"
            >
              <img
                src={img}
                referrerPolicy="no-referrer"
                alt="Ảnh chụp thực tế từ độc giả"
                className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                onError={(e) => {
                  (e.currentTarget.parentElement as HTMLElement)?.remove();
                }}
              />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-sm">zoom_in</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Seller Replies */}
      {replies && replies.length > 0 && (
        <div className="space-y-2.5 pt-2">
          {replies.map((reply) => (
            <div
              key={reply.id}
              className="relative p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 text-xs space-y-1"
            >
              <span className="absolute -top-1.5 left-5 w-2.5 h-2.5 bg-slate-50 dark:bg-zinc-800/60 border-l border-t border-slate-200/80 dark:border-zinc-700 rotate-45" />
              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-zinc-100">
                <span>Phản hồi từ {reply.business?.name || 'Gian hàng'}</span>
                <span className="text-[11px] font-normal text-slate-400">
                  {reply.createdAt ? new Date(reply.createdAt).toLocaleDateString('vi-VN') : ''}
                </span>
              </div>
              <p className="text-slate-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                {reply.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Seller Reply Form (Only if canReply is true and no existing active reply) */}
      {canReply && replies.length === 0 && (
        <div className="pt-2">
          {!isReplying ? (
            <button
              type="button"
              onClick={() => setIsReplying(true)}
              className="flex items-center gap-1.5 text-xs text-[#006953] hover:text-[#00523c] dark:text-emerald-400 font-bold hover:underline cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">reply</span>
              Phản hồi đánh giá này
            </button>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-zinc-100">
                <span className="flex items-center gap-1 text-[#006953] dark:text-emerald-400">
                  <span className="material-symbols-outlined text-sm">storefront</span>
                  Phản hồi từ gian hàng
                </span>
                <span className={`text-[11px] font-normal ${replyText.length > 2000 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                  {replyText.length}/2.000 ký tự
                </span>
              </div>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Nhập nội dung phản hồi khách hàng..."
                rows={3}
                disabled={isSubmittingReply}
                className="w-full text-xs p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-[#006953] transition-colors resize-y"
              />
              <div className="flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyText('');
                  }}
                  disabled={isSubmittingReply}
                  className="px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={isSubmittingReply || !replyText.trim() || replyText.length > 2000}
                  className="px-4 py-1.5 rounded-full bg-[#003B2B] text-white font-bold hover:bg-[#00281d] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  {isSubmittingReply && <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>}
                  Gửi phản hồi
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer / Reactions */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800/80 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleHelpful}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer active:scale-95 ${isHelpful
              ? 'bg-emerald-500/10 text-[#006953] dark:text-emerald-400 border border-emerald-500/30 font-bold shadow-2xs'
              : 'bg-slate-50 dark:bg-zinc-800/60 text-slate-500 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700/50 hover:bg-slate-100 hover:text-slate-700'
              }`}
          >
            <span
              className={`material-symbols-outlined text-sm ${isHelpful ? 'text-[#006953] dark:text-emerald-400' : ''
                }`}
              style={isHelpful ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              thumb_up
            </span>
            <span>{helpfulCount > 0 ? `Hữu ích (${helpfulCount})` : 'Hữu ích'}</span>
          </button>

          {!isOwner && (
            <button
              type="button"
              onClick={() => setIsReporting(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-transparent text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium transition-colors cursor-pointer"
              title="Báo cáo vi phạm tiêu chuẩn cộng đồng"
            >
              <span className="material-symbols-outlined text-sm">flag</span>
              <span>Báo cáo</span>
            </button>
          )}
        </div>

        <span className="text-[11px] text-[#6b7280]">
          Đánh giá chính thức trên HUKI
        </span>
      </div>

      {/* Image Modal Lightbox */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-theme-surface rounded-2xl overflow-hidden shadow-2xl p-2">
            <img
              src={selectedImage}
              alt="Ảnh phóng to"
              className="max-h-[75vh] w-auto mx-auto object-contain rounded-xl"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-black/60 text-white rounded-full p-1.5 hover:bg-black transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      )}
      {/* Report Modal (BUG-MOD06-13) */}
      {isReporting && (
        <div
          onClick={() => setIsReporting(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <span className="material-symbols-outlined text-lg">flag</span>
                <h3>Báo cáo vi phạm đánh giá</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReporting(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSendReport} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Lý do báo cáo vi phạm <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-[#006953] cursor-pointer"
                >
                  <option value="SPAM">Nội dung rác, quảng cáo, tin spam trùng lặp</option>
                  <option value="OFFENSIVE">Ngôn từ thô tục, xúc phạm, thiếu văn hóa</option>
                  <option value="HARASSMENT">Quấy rối, công kích cá nhân, đe dọa</option>
                  <option value="MISINFORMATION">Thông tin sai lệch, gian lận, lừa đảo</option>
                  <option value="COPYRIGHT">Vi phạm quyền sở hữu trí tuệ hoặc bản quyền</option>
                  <option value="OTHER">Lý do khác vi phạm tiêu chuẩn cộng đồng</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Mô tả chi tiết <span className="text-gray-400 font-normal">(tùy chọn)</span>
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Cung cấp thêm thông tin giúp ban quản trị xác minh vi phạm nhanh hơn..."
                  rows={3}
                  maxLength={500}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#006953] resize-y"
                />
                <div className="text-right text-[10px] text-gray-400 mt-1">
                  {reportDescription.length}/500 ký tự
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsReporting(false)}
                  disabled={isSubmittingReport}
                  className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingReport && <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>}
                  <span>Gửi báo cáo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
