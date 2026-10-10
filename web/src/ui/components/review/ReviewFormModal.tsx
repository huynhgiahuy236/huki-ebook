'use client';

import React, { useState, useEffect } from 'react';
import { reviewApi, ReviewItemData } from '@/ui/api/reviewApi';
import { orderApi } from '@/ui/api/orderApi';
import { useToast } from '@/ui/context/ToastContext';
import { useAuth } from '@/ui/context/AuthContext';

export interface ReviewFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  bookId: string;
  bookTitle?: string;
  bookCover?: string;
  bookAuthor?: string;
  defaultFormat?: 'PHYSICAL' | 'DIGITAL' | string;
  orderId?: string;
  initialReview?: ReviewItemData | null;
}

/**
 * Compact, Streamlined In-Page Review Form (Supports Create & Edit Mode)
 */
export default function ReviewFormModal({
  isOpen,
  onClose,
  onSuccess,
  bookId,
  defaultFormat = 'PHYSICAL',
  orderId,
  initialReview,
}: ReviewFormModalProps) {
  const { showToast } = useToast();
  const { user, isLoggedIn } = useAuth();

  const [rating, setRating] = useState(initialReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<'PHYSICAL' | 'DIGITAL'>(
    initialReview?.format === 'DIGITAL' || defaultFormat === 'DIGITAL' ? 'DIGITAL' : 'PHYSICAL'
  );
  const [content, setContent] = useState(initialReview?.content || '');
  const [images, setImages] = useState<string[]>(
    initialReview?.images ? initialReview.images.map((img: any) => typeof img === 'string' ? img : img.url) : []
  );
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialReview) {
      setRating(initialReview.rating || 5);
      setContent(initialReview.content || '');
      setSelectedFormat(initialReview.format === 'DIGITAL' ? 'DIGITAL' : 'PHYSICAL');
      setImages(initialReview.images ? initialReview.images.map((img: any) => typeof img === 'string' ? img : img.url) : []);
    } else {
      setRating(5);
      setContent('');
      setSelectedFormat(defaultFormat === 'DIGITAL' ? 'DIGITAL' : 'PHYSICAL');
      setImages([]);
    }
  }, [initialReview, defaultFormat, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      showToast('Tối đa 5 hình ảnh cho mỗi đánh giá.', 'warning');
      return;
    }

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        showToast(`Tệp ${file.name} vượt quá dung lượng (5MB).`, 'error');
        continue;
      }

      if (orderId) {
        try {
          const res = await orderApi.uploadDisputeEvidence(orderId, file);
          if (res?.success && res.data?.url) {
            uploadedUrls.push(res.data.url);
            continue;
          }
        } catch { /* ignore */ }
      }

      const url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
      uploadedUrls.push(url);
    }

    setImages((prev) => [...prev, ...uploadedUrls].slice(0, 5));
    setIsUploading(false);
    e.target.value = '';
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) {
      showToast('Vui lòng đăng nhập để gửi đánh giá theo chính sách POL-13.', 'warning');
      return;
    }

    if (!content.trim() || content.trim().length < 10) {
      showToast('Nội dung đánh giá cần tối thiểu 10 ký tự.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const autoTitle = content.trim().slice(0, 60).replace(/\n/g, ' ');

      if (initialReview?.id) {
        // Edit existing review
        const res = await reviewApi.updateReview(String(initialReview.id), {
          rating,
          title: autoTitle,
          content: content.trim(),
          images: images.length > 0 ? images : undefined,
        });

        if (res?.success) {
          showToast('Đã cập nhật đánh giá thành công!', 'success');
          onSuccess?.();
          onClose();
        } else if (res?.error?.statusCode === 401) {
          showToast('Vui lòng đăng nhập để cập nhật đánh giá.', 'warning');
        } else {
          showToast(res?.error?.message || 'Không thể cập nhật đánh giá. Vui lòng thử lại sau.', 'error');
        }
      } else {
        // Create new review
        const res = await reviewApi.createBookReview(bookId, {
          rating,
          title: autoTitle,
          content: content.trim(),
          format: selectedFormat,
          images: images.length > 0 ? images : undefined,
        });

        if (res?.success) {
          showToast('Đã gửi đánh giá thành công! Đánh giá đã được lưu vào hệ thống.', 'success');
          onSuccess?.();
          onClose();
        } else if (res?.error?.code === 'REVIEW_ALREADY_EXISTS') {
          showToast('Bạn đã gửi đánh giá cho sản phẩm này rồi.', 'info');
          onClose();
        } else if (res?.error?.code === 'REVIEW_PURCHASE_REQUIRED') {
          showToast('Chỉ khách hàng đã mua và nhận sản phẩm này mới có thể đánh giá (theo chính sách POL-13).', 'error');
        } else if (res?.error?.statusCode === 401) {
          showToast('Vui lòng đăng nhập để gửi đánh giá.', 'warning');
        } else {
          showToast(res?.error?.message || 'Không thể gửi đánh giá. Vui lòng thử lại sau.', 'error');
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Có lỗi xảy ra khi xử lý đánh giá.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeRating = hoverRating !== null ? hoverRating : rating;

  const ratingDescriptions: Record<number, string> = {
    5: 'Cực kỳ hài lòng (5/5)',
    4: 'Hài lòng (4/5)',
    3: 'Bình thường (3/5)',
    2: 'Không hài lòng (2/5)',
    1: 'Rất tệ (1/5)',
  };

  return (
    <div className="w-full bg-[#faf9f6] border border-gray-200/90 rounded-2xl p-4 sm:p-5 mb-5 shadow-2xs animate-in fade-in duration-150">
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        {/* Row 1: Stars Rating + Format Selector + Close */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/80">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-gray-800 text-xs shrink-0">Đánh giá chung:</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  onClick={() => setRating(star)}
                  className="p-0.5 hover:scale-125 transition-transform cursor-pointer"
                >
                  <span
                    className={`material-symbols-outlined text-2xl transition-colors ${
                      star <= activeRating ? 'text-[#fea619]' : 'text-slate-200'
                    }`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold text-[#006953]">
              {ratingDescriptions[activeRating]}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Compact Format Toggle */}
            <div className="inline-flex p-0.5 rounded-lg bg-gray-200/70 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setSelectedFormat('PHYSICAL')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  selectedFormat === 'PHYSICAL'
                    ? 'bg-white text-gray-900 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sách In
              </button>
              <button
                type="button"
                onClick={() => setSelectedFormat('DIGITAL')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  selectedFormat === 'DIGITAL'
                    ? 'bg-white text-gray-900 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Ebook
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        {/* Content Textarea */}
        <div className="relative">
          <textarea
            rows={3}
            required
            minLength={10}
            maxLength={2000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Chia sẻ cảm nhận, trải nghiệm đọc hoặc trích dẫn tâm đắc của bạn về cuốn sách này..."
            className="w-full bg-white border border-gray-200 focus:border-[#006953] rounded-xl p-3 pb-6 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#006953] transition-all resize-none"
          />
          <span
            className={`absolute bottom-2 right-3 text-[10.5px] ${
              content.length < 10
                ? 'text-rose-500'
                : content.length >= 50
                ? 'text-[#006953] font-bold'
                : 'text-gray-400'
            }`}
          >
            {content.length}/2.000 ký tự (tối thiểu 10)
          </span>
        </div>

        {/* Row 4: Photo Gallery + Anonymous + Submit Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Photos & Anonymous */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Image Thumbnails & Upload button */}
            <div className="flex items-center gap-1.5">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shadow-2xs group shrink-0"
                >
                  <img src={img} alt="Upload" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </div>
              ))}

              {images.length < 5 && (
                <label className="h-8 px-2.5 rounded-lg border border-dashed border-gray-300 hover:border-[#006953] bg-white hover:bg-emerald-50/50 text-gray-500 hover:text-[#006953] flex items-center gap-1 cursor-pointer transition-all text-[11px] font-semibold shrink-0">
                  <span className="material-symbols-outlined text-sm">
                    {isUploading ? 'progress_activity' : 'add_photo_alternate'}
                  </span>
                  <span>{isUploading ? 'Tải...' : 'Thêm ảnh'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    disabled={isUploading}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Anonymous Toggle */}
            <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-[#006953] cursor-pointer"
              />
              <span>Ẩn danh</span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-xs font-semibold text-gray-600 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-4 py-1.5 rounded-xl bg-[#006953] hover:bg-[#00523c] text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">
                    {initialReview ? 'save' : 'send'}
                  </span>
                  <span>{initialReview ? 'Lưu Thay Đổi' : 'Gửi Đánh Giá'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
