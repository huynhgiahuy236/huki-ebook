'use client';

import React, { useState } from 'react';
import UserAvatar from '@/ui/components/common/UserAvatar';
import VerifiedPurchaseBadge from './VerifiedPurchaseBadge';
import { reviewApi, ReviewItemData } from '@/ui/api/reviewApi';
import { useToast } from '@/ui/context/ToastContext';

export interface ReviewCardProps {
  review: ReviewItemData | {
    id: string | number;
    author: { id?: string; fullName: string; avatar?: string };
    rating: number;
    title: string;
    content: string;
    verifiedPurchase?: boolean;
    format?: 'PHYSICAL' | 'DIGITAL' | string;
    images?: Array<{ url: string; thumbnail?: string }> | string[];
    helpfulCount?: number;
    isHelpful?: boolean;
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
  onReplySuccess?: (reply: { id: string; content: string; business: { id: string; name: string }; createdAt: string }) => void;
  className?: string;
}

export default function ReviewCard({
  review,
  onHelpfulChange,
  canReply = false,
  onReplySuccess,
  className = '',
}: ReviewCardProps) {
  const { showToast } = useToast();
  const [isHelpful, setIsHelpful] = useState(Boolean(review.isHelpful));
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount || 0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [replies, setReplies] = useState(review.replies || []);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

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
        if (nextState) {
          await reviewApi.markHelpful(review.id);
        } else {
          await reviewApi.unmarkHelpful(review.id);
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
        const newReply = {
          id: res.data.id,
          content: res.data.content,
          business: res.data.business,
          createdAt: res.data.createdAt,
        };
        setReplies((prev) => [...prev, newReply]);
        setReplyText('');
        setIsReplying(false);
        showToast('Đã gửi phản hồi thành công!', 'success');
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

  return (
    <div
      className={`bg-theme-surface rounded-2xl border border-theme-border p-5 sm:p-6 shadow-2xs space-y-4 hover:border-theme-border-hover transition-colors ${className}`}
    >
      {/* Header: Author & Badges */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserAvatar
            src={review.author?.avatar}
            name={review.author?.fullName || 'Độc giả HUKI'}
            size="w-10 h-10"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-on-surface">
                {review.author?.fullName || 'Độc giả HUKI'}
              </span>
              {review.verifiedPurchase && (
                <VerifiedPurchaseBadge
                  variant="pill"
                  format={review.format}
                />
              )}
            </div>
            <div className="text-[11px] text-[#6b7280] flex items-center gap-2 mt-0.5">
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

        {/* Rating Stars */}
        <div className="flex items-center gap-0.5 text-[#fea619] shrink-0">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`material-symbols-outlined text-sm sm:text-base ${
                star <= review.rating ? 'fill-current text-[#fea619]' : 'text-gray-300'
              }`}
            >
              star
            </span>
          ))}
        </div>
      </div>

      {/* Review Title & Content */}
      <div className="space-y-1.5">
        {review.title && (
          <h4 className="font-bold text-xs sm:text-sm text-on-surface leading-snug">
            {review.title}
          </h4>
        )}
        <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
          {review.content}
        </p>
      </div>

      {/* Images Gallery */}
      {imageList.length > 0 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1">
          {imageList.map((img, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedImage(img)}
              className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-theme-border shadow-2xs shrink-0 cursor-pointer hover:opacity-90 hover:scale-[1.03] transition-all"
            >
              <img
                src={img}
                alt="Ảnh chụp thực tế từ độc giả"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Seller Replies */}
      {replies && replies.length > 0 && (
        <div className="space-y-2 pt-2">
          {replies.map((reply) => (
            <div
              key={reply.id}
              className="p-3.5 rounded-xl bg-theme-secondary-subtle border border-theme-border text-xs space-y-1"
            >
              <div className="flex items-center justify-between font-bold text-theme-primary">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">storefront</span>
                  Phản hồi từ {reply.business?.name || 'Nhà bán hàng'}
                </span>
                <span className="text-[10px] text-[#6b7280] font-normal">
                  {new Date(reply.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <p className="text-on-surface-variant leading-relaxed">{reply.content}</p>
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
              className="flex items-center gap-1.5 text-xs text-theme-primary font-bold hover:underline cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">reply</span>
              Phản hồi đánh giá này
            </button>
          ) : (
            <div className="p-3.5 rounded-xl bg-theme-bg border border-theme-border space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-on-surface">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-theme-primary">storefront</span>
                  Phản hồi từ gian hàng
                </span>
                <span className={`text-[11px] font-normal ${replyText.length > 2000 ? 'text-red-500 font-bold' : 'text-[#6b7280]'}`}>
                  {replyText.length}/2.000 ký tự
                </span>
              </div>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Nhập nội dung phản hồi khách hàng..."
                rows={3}
                disabled={isSubmittingReply}
                className="w-full text-xs p-2.5 bg-theme-surface border border-theme-border rounded-lg text-on-surface placeholder:text-gray-400 focus:outline-none focus:border-theme-primary transition-colors resize-y"
              />
              <div className="flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyText('');
                  }}
                  disabled={isSubmittingReply}
                  className="px-3 py-1.5 rounded-lg border border-theme-border text-on-surface-variant hover:bg-theme-surface cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={isSubmittingReply || !replyText.trim() || replyText.length > 2000}
                  className="px-3 py-1.5 rounded-lg bg-theme-primary text-white font-bold hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
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
      <div className="flex items-center justify-between pt-2 border-t border-theme-border text-xs">
        <button
          type="button"
          onClick={handleToggleHelpful}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
            isHelpful
              ? 'bg-[#006953]/10 text-[#006953] border-[#006953]/30 font-bold'
              : 'bg-theme-bg text-[#6b7280] border-theme-border hover:text-on-surface'
          }`}
        >
          <span
            className={`material-symbols-outlined text-sm ${
              isHelpful ? 'text-[#006953]' : ''
            }`}
          >
            thumb_up
          </span>
          <span>{helpfulCount > 0 ? `Hữu ích (${helpfulCount})` : 'Hữu ích'}</span>
        </button>

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
    </div>
  );
}
