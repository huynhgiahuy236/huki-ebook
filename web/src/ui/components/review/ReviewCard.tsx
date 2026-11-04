'use client';

import React, { useState } from 'react';
import UserAvatar from '@/ui/components/common/UserAvatar';
import VerifiedPurchaseBadge from './VerifiedPurchaseBadge';
import { reviewApi, ReviewItemData, ReviewReplyItem } from '@/ui/api/reviewApi';
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
        const newReply: ReviewReplyItem = {
          id: res.data.id,
          content: res.data.content,
          business: res.data.business,
          responderId: 'seller',
          createdAt: res.data.createdAt,
          updatedAt: new Date().toISOString(),
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
              {isOwner && (
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                  Đánh giá của bạn
                </span>
              )}
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

        <div className="flex items-center gap-2.5 shrink-0">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
              title="Chỉnh sửa đánh giá của bạn"
            >
              <span className="material-symbols-outlined text-[15px]">edit_note</span>
              <span>Sửa đánh giá</span>
            </button>
          )}
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`material-symbols-outlined text-sm sm:text-base ${
                  star <= review.rating ? 'text-[#fea619]' : 'text-slate-200'
                }`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
            ))}
          </div>
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
        <div className="flex items-center gap-2">
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

          {!isOwner && (
            <button
              type="button"
              onClick={() => setIsReporting(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-transparent text-gray-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
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
