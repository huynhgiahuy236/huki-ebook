'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/ui/context/ToastContext';
import { useAuth } from '@/ui/context/AuthContext';
import { orderApi, BuyerOrder, OrderItem } from '@/ui/api/orderApi';
import { reviewApi, ReviewItemData } from '@/ui/api/reviewApi';
import VerifiedPurchaseBadge from '@/ui/components/review/VerifiedPurchaseBadge';

interface DisplayReviewItem {
  bookId: string;
  title: string;
  author?: string;
  coverImage?: string;
  coverUrl?: string;
  format: 'PHYSICAL' | 'DIGITAL' | string;
  storeName?: string;
  status?: string;
}

export default function OrderReviewPage() {
  const params = useParams();
  const rawId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();

  const orderId = rawId || 'HUKI-8892401';

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [packagingRating, setPackagingRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [orderDetail, setOrderDetail] = useState<BuyerOrder | null>(null);
  const [selectedBookIndex, setSelectedBookIndex] = useState(0);

  useEffect(() => {
    if (!rawId) return;
    orderApi
      .getBuyerOrderDetail(rawId)
      .then((res) => {
        if (res?.success && res.data) {
          setOrderDetail(res.data);
        } else {
          // Fallback: search in user's orders
          orderApi.getBuyerOrders({ page: 1, limit: 50 }).then((listRes) => {
            if (listRes?.success && listRes.data) {
              const rawData: any = listRes.data;
              const items = Array.isArray(rawData) ? rawData : (rawData.items || rawData.data || []);
              const matched = items.find(
                (o: any) => o.id === rawId || o.code === rawId || o.code?.toLowerCase() === rawId?.toLowerCase()
              );
              if (matched) setOrderDetail(matched);
            }
          }).catch(() => {});
        }
      })
      .catch(() => {
        orderApi.getBuyerOrders({ page: 1, limit: 50 }).then((listRes) => {
          if (listRes?.success && listRes.data) {
            const rawData: any = listRes.data;
            const items = Array.isArray(rawData) ? rawData : (rawData.items || rawData.data || []);
            const matched = items.find(
              (o: any) => o.id === rawId || o.code === rawId || o.code?.toLowerCase() === rawId?.toLowerCase()
            );
            if (matched) setOrderDetail(matched);
          }
        }).catch(() => {});
      });
  }, [rawId]);

  // Extract purchased items from seller orders or flat order items
  const purchasedItems: DisplayReviewItem[] = useMemo(() => {
    if (!orderDetail) return [];

    if (orderDetail.sellerOrders && orderDetail.sellerOrders.length > 0) {
      const items = orderDetail.sellerOrders.flatMap((so: any) =>
        (so.items || []).map((item: any) => {
          const isUuid = item.title && /^[0-9a-fA-F-]{32,36}$/.test(item.title);
          const displayTitle = isUuid ? 'Tác Phẩm Sách HUKI' : (item.bookTitle || item.title || 'Sách Bản Quyền HUKI');
          return {
            bookId: item.bookId || item.id,
            title: displayTitle,
            author: item.author || (item as any).bookAuthor || 'Tác giả HUKI',
            coverImage: item.bookCoverUrl || item.coverImage || item.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300',
            format: item.format || 'PHYSICAL',
            storeName: so.storeName || so.shopName || so.storeId || 'Gian Hàng Chính Thức',
            status: so.status || orderDetail.status,
          };
        })
      );
      if (items.length > 0) return items;
    }

    const directItems = (orderDetail as any).items || (orderDetail as any).orderItems || [];
    if (directItems.length > 0) {
      return directItems.map((item: any) => {
        const isUuid = item.title && /^[0-9a-fA-F-]{32,36}$/.test(item.title);
        const displayTitle = isUuid ? 'Tác Phẩm Sách HUKI' : (item.bookTitle || item.title || 'Sách Bản Quyền HUKI');
        return {
          bookId: item.bookId || item.id,
          title: displayTitle,
          author: item.author || (item as any).bookAuthor || 'Tác giả HUKI',
          coverImage: item.bookCoverUrl || item.coverImage || item.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300',
          format: item.format || 'PHYSICAL',
          storeName: (orderDetail as any).storeName || 'Gian Hàng Chính Thức',
          status: orderDetail.status,
        };
      });
    }

    return [];
  }, [orderDetail]);

  const currentItem: DisplayReviewItem = purchasedItems[selectedBookIndex] || {
    bookId: (orderDetail as any)?.items?.[0]?.bookId || (orderDetail as any)?.bookId || rawId || 'book-huki-1',
    title: (orderDetail as any)?.items?.[0]?.title || (orderDetail as any)?.items?.[0]?.bookTitle || 'Sách Bản Quyền & Ấn Phẩm HUKI',
    author: 'Đơn vị phát hành chính thức',
    coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300',
    format: 'PHYSICAL',
    storeName: 'Gian Hàng HUKI',
    status: orderDetail?.status || 'COMPLETED',
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      showToast('Tối đa 5 hình ảnh thực tế cho mỗi đánh giá.', 'warning');
      return;
    }

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        showToast(`Tệp ${file.name} vượt quá dung lượng cho phép (5MB).`, 'error');
        continue;
      }

      if (rawId) {
        try {
          const res = await orderApi.uploadDisputeEvidence(rawId, file);
          if (res?.success && res.data?.url) {
            uploadedUrls.push(res.data.url);
            continue;
          }
        } catch {
          // Fallback to local DataURL
        }
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

    if (!reviewContent.trim() || reviewContent.trim().length < 10) {
      showToast('Nội dung đánh giá cần tối thiểu 10 ký tự.', 'warning');
      return;
    }

    setIsLoading(true);

    try {
      const bookId = currentItem.bookId || rawId;
      const format = (currentItem.format === 'DIGITAL' ? 'DIGITAL' : 'PHYSICAL') as 'PHYSICAL' | 'DIGITAL';
      const autoTitle = reviewContent.trim().slice(0, 60).replace(/\n/g, ' ');

      const res = await reviewApi.createBookReview(bookId, {
        rating,
        title: autoTitle,
        content: reviewContent.trim(),
        format,
        images: images.length > 0 ? images : undefined,
      });

      if (res?.success) {
        showToast('Đã gửi đánh giá thành công! Bạn nhận được +50 HUKI Xu thưởng.', 'success');
        router.push(`/orders/${orderId}`);
      } else if (res?.error?.code === 'REVIEW_ALREADY_EXISTS') {
        showToast('Bạn đã gửi đánh giá cho sản phẩm này rồi.', 'info');
        router.push(`/orders/${orderId}`);
      } else if (res?.error?.code === 'REVIEW_PURCHASE_REQUIRED') {
        showToast('Hệ thống chỉ cho phép đánh giá khi đơn hàng đã hoàn tất hoặc giao thành công (POL-13).', 'error');
      } else if (res?.error?.statusCode === 401) {
        showToast('Vui lòng đăng nhập để gửi đánh giá.', 'warning');
      } else {
        showToast(res?.error?.message || 'Không thể gửi đánh giá.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Có lỗi xảy ra khi gửi đánh giá.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const activeRating = hoverRating !== null ? hoverRating : rating;

  const ratingDescriptions: Record<number, string> = {
    5: 'Tuyệt vời, cực kỳ hài lòng! (5/5 sao)',
    4: 'Rất tốt, đúng như kỳ vọng. (4/5 sao)',
    3: 'Bình thường, tạm ổn. (3/5 sao)',
    2: 'Chưa hài lòng. (2/5 sao)',
    1: 'Rất tệ, cần cải thiện. (1/5 sao)',
  };

  return (
    <div className="min-h-screen bg-[#f8f6f1] py-6 sm:py-10 px-4 sm:px-6 lg:px-8 text-gray-900 font-sans">
      <div className="max-w-[1240px] mx-auto space-y-6">
        {/* 1. Navigation Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500">
          <Link href="/orders" className="hover:text-[#006953] transition-colors flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-sm">receipt_long</span>
            Lịch Sử Đơn Hàng
          </Link>
          <span className="material-symbols-outlined text-xs text-gray-400">chevron_right</span>
          <Link href={`/orders/${orderId}`} className="hover:text-[#006953] transition-colors font-medium">
            Đơn #{orderId}
          </Link>
          <span className="material-symbols-outlined text-xs text-gray-400">chevron_right</span>
          <span className="text-gray-900 font-bold">Đánh Giá Sản Phẩm</span>
        </nav>

        {/* 2. Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#e8e5df] shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-2xl text-[#006953]">rate_review</span>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Đánh Giá Đơn Hàng #{orderId}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Chia sẻ cảm nhận chân thực để nhận ngay HUKI Xu thưởng và giúp đỡ cộng đồng độc giả
            </p>
          </div>

          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-xl text-amber-800 shrink-0 self-start sm:self-auto">
            <span className="material-symbols-outlined text-xl text-amber-600">monetization_on</span>
            <div>
              <span className="text-xs font-bold block leading-none">+50 HUKI Xu</span>
              <span className="text-[10px] text-amber-700/80">Thưởng khi đánh giá</span>
            </div>
          </div>
        </div>

        {/* 3. Main Two-Column Layout */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Left Column: Product Information & Multi-item Picker */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            {/* Multi-item Tabs (If order has multiple products) */}
            {purchasedItems.length > 1 && (
              <div className="bg-white p-4 rounded-2xl border border-[#e8e5df] shadow-xs">
                <label className="block text-xs font-bold text-gray-800 mb-2.5">
                  Chọn sản phẩm cần đánh giá ({purchasedItems.length} món):
                </label>
                <div className="space-y-2">
                  {purchasedItems.map((item: DisplayReviewItem, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedBookIndex(idx)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        selectedBookIndex === idx
                          ? 'border-[#006953] bg-[#006953]/5 shadow-2xs'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <img
                        src={item.coverImage}
                        alt={item.title}
                        className="w-10 h-14 object-cover rounded-md border border-gray-100 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className={`text-xs font-bold block truncate ${selectedBookIndex === idx ? 'text-[#006953]' : 'text-gray-900'}`}>
                          {item.title}
                        </span>
                        <span className="text-[11px] text-gray-500 block truncate mt-0.5">
                          {item.format === 'DIGITAL' ? 'Ebook DRM' : 'Sách In Bìa Cứng'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Current Product Card */}
            <div className="bg-white p-5 rounded-2xl border border-[#e8e5df] shadow-xs space-y-4">
              <div className="flex gap-4">
                <img
                  src={currentItem.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300'}
                  alt={currentItem.title}
                  className="w-20 h-28 object-cover rounded-xl border border-gray-200 shadow-xs shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#006953] bg-[#006953]/10 px-2 py-0.5 rounded-md inline-block">
                    {currentItem.format === 'DIGITAL' ? 'Ebook DRM' : 'Sách In'}
                  </span>
                  <h3 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2 pt-0.5">
                    {currentItem.title}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">
                    {currentItem.author || 'Tác giả HUKI'}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    Cung cấp bởi: <strong>{currentItem.storeName}</strong>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <VerifiedPurchaseBadge variant="pill" format={currentItem.format} label="Đơn hàng hợp lệ" />
                <span className="text-[11px] text-gray-400">Chính sách POL-13</span>
              </div>
            </div>

            {/* Quality Checklist Tips */}
            <div className="bg-[#f2efe9]/70 p-4.5 rounded-2xl border border-[#e8e5df] text-xs text-gray-600 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-gray-900">
                <span className="material-symbols-outlined text-base text-[#006953]">lightbulb</span>
                <span>Mẹo viết đánh giá hữu ích</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11.5px] text-gray-600 leading-relaxed">
                <li>Nhận xét về chất lượng giấy in, dịch thuật hoặc font chữ ebook.</li>
                <li>Đính kèm hình ảnh chụp thực tế để nhận trọn vẹn <strong>+50 HUKI Xu</strong>.</li>
                <li>Tránh sử dụng từ ngữ xúc phạm hoặc thông tin cá nhân.</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Review Submission Form */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#e8e5df] shadow-xs">
              <form onSubmit={handleSubmit} className="space-y-6 text-xs">
                {/* 1. Star Rating */}
                <div className="p-5 rounded-2xl bg-[#faf9f6] border border-gray-200 text-center space-y-2">
                  <span className="block font-bold text-sm text-gray-800">
                    Mức độ hài lòng của bạn về cuốn sách này:
                  </span>
                  <div className="flex items-center justify-center gap-2 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-125 transition-transform cursor-pointer"
                      >
                        <span
                          className={`material-symbols-outlined text-4xl sm:text-5xl transition-colors ${
                            star <= activeRating ? 'text-[#fea619]' : 'text-slate-200'
                          }`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#006953]">
                    {ratingDescriptions[activeRating] || 'Đánh giá sản phẩm'}
                  </div>
                </div>

                {/* 2. Sub-ratings (Packaging & Delivery) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Đóng gói &amp; Bìa sách:</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span
                          key={s}
                          onClick={() => setPackagingRating(s)}
                          className={`material-symbols-outlined text-lg cursor-pointer transition-colors ${
                            s <= packagingRating ? 'text-[#fea619]' : 'text-slate-200'
                          }`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Tốc độ giao hàng:</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span
                          key={s}
                          onClick={() => setDeliveryRating(s)}
                          className={`material-symbols-outlined text-lg cursor-pointer transition-colors ${
                            s <= deliveryRating ? 'text-[#fea619]' : 'text-slate-200'
                          }`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Review Content Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-xs sm:text-sm text-gray-800">
                      Cảm nhận &amp; bài học rút ra từ tác phẩm *
                    </label>
                    <span
                      className={`text-[11px] ${
                        reviewContent.length < 10
                          ? 'text-rose-500'
                          : reviewContent.length >= 50 && images.length > 0
                          ? 'text-[#006953] font-bold'
                          : 'text-gray-400'
                      }`}
                    >
                      {reviewContent.length}/2.000 ký tự (≥50 ký tự + 1 ảnh nhận +50 Xu)
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    required
                    minLength={10}
                    maxLength={2000}
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    placeholder="Hãy chia sẻ góc nhìn chi tiết của bạn về tác phẩm, đoạn trích yêu thích hoặc lý do bạn khuyên mọi người nên đọc cuốn sách này..."
                    className="w-full bg-white border border-gray-200 focus:border-[#006953] rounded-2xl p-4 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006953]/20 transition-all resize-none leading-relaxed"
                  />
                </div>

                {/* 4. Photo Upload Section */}
                <div>
                  <label className="block font-bold text-xs sm:text-sm text-gray-800 mb-2">
                    Hình ảnh thực tế khi nhận sách (Tối đa 5 ảnh, ≤5MB):
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative w-20 h-20 rounded-2xl overflow-hidden border border-gray-200 shadow-2xs group shrink-0"
                      >
                        <img src={img} alt="Upload" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    ))}

                    {images.length < 5 && (
                      <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#006953] bg-[#faf9f6] hover:bg-emerald-50/50 flex flex-col items-center justify-center text-gray-400 hover:text-[#006953] cursor-pointer transition-all shrink-0">
                        <span className="material-symbols-outlined text-2xl">
                          {isUploading ? 'progress_activity' : 'add_photo_alternate'}
                        </span>
                        <span className="text-[10px] font-bold mt-1">
                          {isUploading ? 'Đang tải' : 'Thêm ảnh'}
                        </span>
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
                </div>

                {/* 5. Anonymous Option */}
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 select-none">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#006953] cursor-pointer"
                    />
                    <span>Đánh giá ẩn danh (Chỉ hiển thị ký tự đầu của tên bạn trên diễn đàn độc giả)</span>
                  </label>
                </div>

                {/* 6. Action Buttons */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/orders/${orderId}`)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-xs font-semibold text-gray-600 transition-colors cursor-pointer"
                  >
                    Quay Lại
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || isUploading}
                    className="px-8 py-3 rounded-xl bg-[#006953] hover:bg-[#00523c] text-white text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
      </div>
    </div>
  );
}
