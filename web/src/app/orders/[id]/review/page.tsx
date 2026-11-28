'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/ui/context/ToastContext';
import { useAuth } from '@/ui/context/AuthContext';
import { orderApi, BuyerOrder, OrderItem } from '@/ui/api/orderApi';
import { reviewApi, ReviewItemData } from '@/ui/api/reviewApi';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import VerifiedPurchaseBadge from '@/ui/components/review/VerifiedPurchaseBadge';
import { reviewStorage } from '@/ui/lib/reviewStorage';

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
  const [myReviews, setMyReviews] = useState<ReviewItemData[]>([]);
  const [selectedBookIndex, setSelectedBookIndex] = useState(0);

  useEffect(() => {
    const fetchMine = () => {
      reviewApi
        .getMyReviews({ limit: 100 })
        .then((res) => {
          if (res?.success && Array.isArray(res.data)) {
            setMyReviews(res.data);
          }
        })
        .catch(() => {});
    };
    fetchMine();
    const unsubscribe = realtimeSyncBus.subscribe((evt) => {
      if (evt.type === 'NOTIFICATIONS_UPDATED') {
        fetchMine();
      }
    });
    return () => unsubscribe();
  }, [rawId, user?.id]);

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
            coverImage: item.bookCoverUrl || item.coverImage || item.coverUrl || '/images/book-placeholder.png',
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
          coverImage: item.bookCoverUrl || item.coverImage || item.coverUrl || '/images/book-placeholder.png',
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
    coverImage: '/images/book-placeholder.png',
    format: 'PHYSICAL',
    storeName: 'Gian Hàng HUKI',
    status: orderDetail?.status || 'COMPLETED',
  };

  const existingReview = useMemo(() => {
    if (!currentItem?.bookId) return null;
    const fromBackend = myReviews.find(
      (r) =>
        (r.targetId === currentItem.bookId || (rawId && r.orderId === rawId)) &&
        r.status !== 'DELETED',
    );
    return fromBackend || null;
  }, [currentItem?.bookId, myReviews, rawId]);

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

      let uploadedUrl: string | null = null;
      if (rawId) {
        try {
          const res = await orderApi.uploadDisputeEvidence(rawId, file);
          if (res?.success && res.data?.url && !res.data.url.includes('storage.huki.vn')) {
            uploadedUrl = res.data.url.startsWith('/')
              ? `${window.location.origin}${res.data.url}`
              : res.data.url;
          }
        } catch {
          // Upload service unavailable
        }
      }

      if (!uploadedUrl) {
        uploadedUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const img = new Image();
            img.onload = () => {
              const maxDim = 900;
              let { width, height } = img;
              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
                } else {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
                }
              }
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.78));
            };
            img.onerror = () => resolve(String(reader.result || ''));
            img.src = String(reader.result || '');
          };
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.readAsDataURL(file);
        });
      }
      if (uploadedUrl) {
        uploadedUrls.push(uploadedUrl);
      }
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
        showToast('Đã gửi đánh giá thành công! Cảm ơn chia sẻ của bạn.', 'success');
        reviewStorage.saveReview({
          id: res?.data?.id || `rev-${Date.now()}`,
          targetId: bookId,
          targetType: 'BOOK',
          author: {
            id: user?.id || 'me',
            fullName: user?.fullName || 'Độc giả HuKi',
            avatar: user?.avatar ?? undefined,
          },
          rating,
          title: autoTitle,
          content: reviewContent.trim(),
          images: images.map((u) => ({ url: u })),
          format,
          verifiedPurchase: true,
          orderId,
          replies: [],
          status: 'PUBLISHED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          helpfulCount: 0,
          isHelpful: false,
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('huki_review_created', { detail: { bookId, orderId } }));
          localStorage.setItem('huki_review_sync', String(Date.now()));
        }
        realtimeSyncBus.publish('NOTIFICATIONS_UPDATED', { bookId, orderId });
        router.push(`/orders/${orderId}`);
      } else if (res?.error?.code === 'REVIEW_ALREADY_EXISTS') {
        showToast('Bạn đã gửi đánh giá cho sản phẩm này rồi.', 'info');
        reviewStorage.saveReview({
          id: `rev-existing-${bookId}`,
          targetId: bookId,
          targetType: 'BOOK',
          author: {
            id: user?.id || 'me',
            fullName: user?.fullName || 'Độc giả HuKi',
            avatar: user?.avatar ?? undefined,
          },
          rating: 5,
          title: autoTitle,
          content: reviewContent.trim(),
          images: images.map((u) => ({ url: u })),
          format,
          verifiedPurchase: true,
          orderId,
          replies: [],
          status: 'PUBLISHED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          helpfulCount: 0,
          isHelpful: false,
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('huki_review_created', { detail: { bookId, orderId } }));
        }
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
              Chia sẻ cảm nhận chân thực để giúp đỡ cộng đồng độc giả HuKi
            </p>
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
                  src={currentItem.coverImage || '/images/book-placeholder.png'}
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
                <li>Đính kèm hình ảnh chụp thực tế để giúp độc giả khác có cái nhìn trực quan hơn.</li>
                <li>Tránh sử dụng từ ngữ xúc phạm hoặc thông tin cá nhân.</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Review Submission Form or Existing Review View */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#e8e5df] shadow-xs">
              {existingReview ? (
                <div className="space-y-6">
                  {existingReview.status === 'HIDDEN' ? (
                    <div className="p-5 rounded-2xl bg-rose-50/80 border border-rose-200 text-center space-y-2">
                      <span className="material-symbols-outlined text-4xl text-rose-600">visibility_off</span>
                      <h3 className="font-bold text-base text-rose-900">
                        Đánh giá của bạn đã bị Quản trị viên ẩn
                      </h3>
                      <p className="text-xs text-rose-700 leading-relaxed">
                        {existingReview.moderationNote
                          ? `Lý do: ${existingReview.moderationNote}. `
                          : ''}
                        Đánh giá này hiện không còn hiển thị công khai trên trang sản phẩm theo quyết định kiểm duyệt của HUKI.
                      </p>
                    </div>
                  ) : (existingReview.isReported || existingReview.status === 'FLAGGED') ? (
                    <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 text-center space-y-2">
                      <span className="material-symbols-outlined text-4xl text-amber-600">flag</span>
                      <h3 className="font-bold text-base text-amber-900">
                        Đánh giá đang bị báo cáo • Chờ Quản trị viên kiểm duyệt
                      </h3>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Đánh giá của bạn vừa nhận một báo cáo vi phạm
                        {existingReview.reportReason ? ` (${existingReview.reportReason})` : ''}.
                        {' '}Bài đánh giá <strong>vẫn đang hiển thị bình thường</strong> trên trang sách và chỉ bị ẩn nếu Quản trị viên xác nhận vi phạm.
                      </p>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center space-y-2">
                      <span className="material-symbols-outlined text-4xl text-emerald-600">verified</span>
                      <h3 className="font-bold text-base text-emerald-900">
                        Bạn đã gửi đánh giá cho ấn phẩm này
                      </h3>
                      <p className="text-xs text-emerald-700">
                        Cảm ơn bạn đã đóng góp đánh giá hữu ích cho cộng đồng độc giả HuKi!
                      </p>
                    </div>
                  )}

                  <div className="p-5 rounded-2xl bg-[#faf9f6] border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[#fea619]">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span
                            key={s}
                            className={`material-symbols-outlined text-xl ${
                              s <= existingReview.rating ? 'text-[#fea619]' : 'text-gray-300'
                            }`}
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">
                        {existingReview.createdAt ? new Date(existingReview.createdAt).toLocaleDateString('vi-VN') : 'Đã gửi'}
                      </span>
                    </div>

                    {existingReview.title &&
                      existingReview.title.trim() !== (existingReview.content || '').trim() && (
                        <h4 className="font-bold text-sm text-gray-900">{existingReview.title}</h4>
                      )}
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                      {existingReview.content}
                    </p>

                    {(() => {
                      const validImgs = (existingReview.images || [])
                        .map((img) => (typeof img === 'string' ? img : (img as any)?.url || ''))
                        .filter((url) => url && !url.includes('storage.huki.vn'));
                      if (validImgs.length === 0) return null;
                      return (
                        <div className="flex gap-2 flex-wrap pt-2">
                          {validImgs.slice(0, 5).map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt=""
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                              className="w-16 h-16 rounded-xl object-cover border border-gray-200"
                            />
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Link
                      href={`/orders/${orderId}`}
                      className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">arrow_back</span>
                      <span>Quay lại chi tiết đơn hàng</span>
                    </Link>

                    <Link
                      href={`/book/${currentItem.bookId}`}
                      className="px-5 py-2.5 rounded-xl bg-[#006953] text-white hover:bg-[#005442] text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <span>Xem sách tại gian hàng</span>
                      <span className="material-symbols-outlined text-base">menu_book</span>
                    </Link>
                  </div>
                </div>
              ) : (
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
                        <span>Gửi Đánh Giá</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
