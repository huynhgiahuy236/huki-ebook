"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '@/ui/context/CartContext';
import { useToast } from '@/ui/context/ToastContext';
import { booksData } from '@/ui/data/mockData';
import { catalogApi } from '@/ui/api/catalogApi';
import { businessApi } from '@/ui/api/businessApi';
import { flashSaleApi } from '@/ui/api/flashSaleApi';
import { reviewApi, ReviewItemData, ReviewSummaryData } from '@/ui/api/reviewApi';
import ReviewCard from '@/ui/components/review/ReviewCard';
import VerifiedPurchaseBadge from '@/ui/components/review/VerifiedPurchaseBadge';
import ReviewFormModal from '@/ui/components/review/ReviewFormModal';

export interface TableOfContentItem {
  id: number | string;
  title: string;
  page?: number;
}

export interface BookDetailData {
  id: string;
  slug?: string;
  title: string;
  author: string;
  publisher: string;
  category?: string;
  isbn?: string;
  cover: string;
  coverImage?: string;
  description?: string;
  price?: number;
  priceEbook?: number;
  pricePaper?: number;
  priceCombo?: number;
  originalPrice?: number;
  originalPriceEbook?: number;
  originalPricePaper?: number;
  originalPriceCombo?: number;
  rating?: number;
  reviewCount?: number;
  readCount?: number;
  pages?: number;
  stock?: number;
  reserved?: number;
  available?: number;
  format?: string;
  isBestseller?: boolean;
  isReal?: boolean;
  toc?: TableOfContentItem[];
  hasEbook?: boolean;
  hasPaper?: boolean;
}

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';
  const { addItem, cartItems } = useCart();
  const { showToast } = useToast();

  const [selectedFormat, setSelectedFormat] = useState<'ebook' | 'physical' | 'hybrid' | string>('ebook');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('intro');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isFollowingStore, setIsFollowingStore] = useState(false);
  const [realBook, setRealBook] = useState<any>(null);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [flashSaleInfo, setFlashSaleInfo] = useState<any>(null);
  const [flashSaleSecondsLeft, setFlashSaleSecondsLeft] = useState(0);
  const [reviewsList, setReviewsList] = useState<ReviewItemData[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummaryData | null>(null);
  const [reviewsFilterRating, setReviewsFilterRating] = useState<number | undefined>(undefined);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const fetchPromise = isUuid ? catalogApi.getBookById(id) : catalogApi.getBookBySlug(id);
    fetchPromise
      .then((res) => {
        const bookData = (res?.data as any)?.data || res?.data;
        if (bookData && (bookData.id || bookData.title)) {
          setRealBook(bookData);
          if (bookData.format === 'PHYSICAL') setSelectedFormat('physical');
          else if (bookData.format === 'DIGITAL') setSelectedFormat('ebook');
          else if (bookData.format === 'BOTH') setSelectedFormat('hybrid');
        }
      })
      .catch(() => {
        const fallback = isUuid ? catalogApi.getBookBySlug(id) : catalogApi.getBookById(id);
        fallback
          .then((res) => {
            const bookData = (res?.data as any)?.data || res?.data;
            if (bookData && (bookData.id || bookData.title)) {
              setRealBook(bookData);
              if (bookData.format === 'PHYSICAL') setSelectedFormat('physical');
              else if (bookData.format === 'DIGITAL') setSelectedFormat('ebook');
              else if (bookData.format === 'BOTH') setSelectedFormat('hybrid');
            }
          })
          .catch((err) => console.warn('Could not fetch book detail:', err));
      });
  }, [id]);

  useEffect(() => {
    if (realBook?.businessId) {
      businessApi
        .getBusinessById(realBook.businessId)
        .then((res) => {
          if (res?.success && res.data) setStoreInfo(res.data);
        })
        .catch((err) => console.warn('Could not fetch business info:', err));
    } else if (realBook?.storeId) {
      businessApi
        .getStoreById(realBook.storeId)
        .then((res) => {
          if (res?.success && res.data) setStoreInfo(res.data);
        })
        .catch((err) => console.warn('Could not fetch store info:', err));
    }
    if (realBook?.id) {
      flashSaleApi
        .getBookPrice(realBook.id)
        .then((res) => {
          if (res?.success && res.data && res.data.salePrice) setFlashSaleInfo(res.data);
          else setFlashSaleInfo(null);
        })
        .catch(() => setFlashSaleInfo(null));
    }
  }, [realBook]);

  useEffect(() => {
    if (!flashSaleInfo?.endsAt) {
      setFlashSaleSecondsLeft(0);
      return undefined;
    }
    const updateCountdown = () => {
      const seconds = Math.max(0, Math.ceil((new Date(flashSaleInfo.endsAt).getTime() - Date.now()) / 1000));
      setFlashSaleSecondsLeft(seconds);
      if (seconds === 0) setFlashSaleInfo(null);
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [flashSaleInfo?.endsAt]);

  useEffect(() => {
    const bookTargetId = realBook?.id || id;
    if (!bookTargetId) return;

    setIsLoadingReviews(true);
    reviewApi
      .getBookReviews(bookTargetId, {
        rating: reviewsFilterRating,
        limit: 20,
      })
      .then((res) => {
        if (res?.success && res.data) {
          setReviewsList(res.data.data || []);
          if (res.data.summary) {
            setReviewSummary(res.data.summary);
          }
        }
      })
      .catch((err) => {
        console.warn('Could not fetch book reviews:', err);
      })
      .finally(() => {
        setIsLoadingReviews(false);
      });
  }, [realBook?.id, id, reviewsFilterRating]);

  const flashSaleCountdown = useMemo(() => {
    const hours = Math.floor(flashSaleSecondsLeft / 3600);
    const minutes = Math.floor((flashSaleSecondsLeft % 3600) / 60);
    const seconds = flashSaleSecondsLeft % 60;
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
  }, [flashSaleSecondsLeft]);

  const book = useMemo<BookDetailData>(() => {
    if (realBook) {
      const authorName = typeof realBook.author === 'object' ? realBook.author?.name : realBook.author || 'Tác giả HUKI';
      const publisherName =
        typeof realBook.publisher === 'object'
          ? realBook.publisher?.name
          : realBook.publisher || realBook.business?.displayName || realBook.business?.name || storeInfo?.name || 'Gian Hàng HUKI';
      const categoryName = typeof realBook.category === 'object' ? realBook.category?.name : realBook.category || 'Công nghệ & Đổi mới';
      const priceVal = typeof realBook.price === 'number' ? realBook.price : 150000;
      const originalPriceVal = typeof realBook.originalPrice === 'number' ? realBook.originalPrice : Math.round(priceVal * 1.25);
      const stockVal = typeof realBook.stock === 'number' ? realBook.stock : (realBook.physicalDetails?.stock ?? 0);
      const reservedVal = typeof realBook.reserved === 'number' ? realBook.reserved : (realBook.physicalDetails?.reserved ?? 0);
      const availableVal = typeof realBook.available === 'number' ? realBook.available : Math.max(0, stockVal - reservedVal);
      return {
        id: realBook.id,
        slug: realBook.slug,
        title: realBook.title || 'Sách Tuyển Chọn',
        author: authorName || 'Tác giả HUKI',
        publisher: publisherName || 'Gian Hàng HUKI',
        category: categoryName || 'Công nghệ & Đổi mới',
        isbn: realBook.isbn || '978-604-58-9123-4',
        cover: realBook.coverUrl || realBook.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600',
        coverImage: realBook.coverUrl || realBook.coverImage,
        description: realBook.description || 'Cuốn sách được xuất bản chính thức trên hệ thống HUKI.',
        price: priceVal,
        priceEbook: realBook.format === 'DIGITAL' || realBook.format === 'BOTH' ? priceVal : Math.round(priceVal * 0.6),
        pricePaper: realBook.format === 'PHYSICAL' || realBook.format === 'BOTH' ? priceVal : priceVal,
        priceCombo: Math.round(priceVal * 1.3),
        originalPrice: originalPriceVal,
        rating: 5.0,
        reviewCount: 120,
        readCount: 850,
        pages: realBook.physicalDetails?.pages || realBook.pageCount || 250,
        stock: stockVal,
        reserved: reservedVal,
        available: availableVal,
        format: realBook.format || 'BOTH',
        isBestseller: Boolean(realBook.isBestseller),
        isReal: true,
      };
    }
    const found = booksData.find((b: any) => b.id === id);
    const baseBook = (found || booksData[0]) as any;
    return {
      ...baseBook,
      author: typeof baseBook.author === 'object' ? baseBook.author?.name : baseBook.author || 'Tác giả HUKI',
      publisher: typeof baseBook.publisher === 'object' ? baseBook.publisher?.name : baseBook.publisher || 'Gian Hàng HUKI',
      stock: baseBook?.stock ?? 0,
      reserved: 0,
      available: baseBook?.stock ?? 0,
      isBestseller: Boolean(baseBook?.isBestseller),
      toc: baseBook?.toc,
    };
  }, [id, realBook, storeInfo]);

  const publisherProfile = useMemo(() => {
    const defaultName = book.publisher || 'Gian Hàng HUKI';
    if (storeInfo) {
      return {
        id: storeInfo.id,
        name: storeInfo.name || defaultName,
        slug: storeInfo.slug || storeInfo.id,
        logo: storeInfo.logo || null,
        description: storeInfo.description || 'Gian hàng và Nhà xuất bản chính thức được chứng nhận bản quyền bởi HUKI Platform.',
        address: storeInfo.address || 'Hà Nội & TP. Hồ Chí Minh, Việt Nam',
        rating: 4.9,
        reviewsCount: '2.8k',
        responseRate: '99%',
        isVerified: true,
      };
    }
    return {
      id: 'alpha-books',
      name: defaultName,
      slug: 'alpha-books',
      logo: null,
      description: 'Nhà xuất bản và phát hành sách bản quyền chính thức trên hệ thống HUKI Platform.',
      address: 'Hà Nội & TP. Hồ Chí Minh, Việt Nam',
      rating: 4.9,
      reviewsCount: '2.8k',
      responseRate: '99%',
      isVerified: true,
    };
  }, [storeInfo, book.publisher]);

  const formatPricing = useMemo(() => {
    const ebookPrice = book.priceEbook || (book.format === 'DIGITAL' || book.format === 'BOTH' ? book.price : 79000) || 79000;
    const physicalPrice = book.pricePaper || (book.format === 'PHYSICAL' || book.format === 'BOTH' ? book.price : 149000) || 149000;
    const hybridPrice = book.priceCombo || Math.round((book.price || 150000) * 1.3) || 199000;
    return {
      ebook: {
        type: 'ebook',
        title: 'Ebook Bản Quyền',
        subtitle: 'Đọc tức thì trên App & Web',
        price: ebookPrice,
        originalPrice: book.originalPriceEbook || Math.round(ebookPrice * 1.3) || 149000,
        badge: 'ĐỌC NGAY',
        icon: 'bolt',
        delivery: 'Kích hoạt ngay vào Tủ Sách cá nhân',
        note: 'Hỗ trợ DRM đọc trên 5 thiết bị',
      },
      physical: {
        type: 'physical',
        title: 'Sách Giấy Bìa Mềm',
        subtitle: 'Giấy xốp ngà chống lóa',
        price: physicalPrice,
        originalPrice: book.originalPricePaper || Math.round(physicalPrice * 1.25) || 189000,
        badge: 'GIAO TẬN NƠI',
        icon: 'local_shipping',
        delivery: 'Giao trong 2-3 ngày làm việc',
        note: 'Tặng kèm bookmark độc quyền',
      },
      hybrid: {
        type: 'hybrid',
        title: 'Combo Giấy + Ebook',
        subtitle: 'Tiết kiệm nhất (-45%)',
        price: hybridPrice,
        originalPrice: book.originalPriceCombo || Math.round(hybridPrice * 1.45) || 338000,
        badge: 'TIẾT KIỆM 45%',
        icon: 'auto_awesome',
        delivery: 'Đọc Ebook ngay + Giao Sách Giấy',
        note: 'Trọn bộ giải pháp đọc kép tiện lợi',
      },
    };
  }, [book]);

  const currentPrice =
    (formatPricing as any)[selectedFormat] || formatPricing.ebook || formatPricing.physical;
  const discountPercent =
    currentPrice && currentPrice.originalPrice && currentPrice.originalPrice > currentPrice.price
      ? Math.round(((currentPrice.originalPrice - currentPrice.price) / currentPrice.originalPrice) * 100)
      : 0;
  const isPhysicalSelected = selectedFormat === 'physical' || selectedFormat === 'hybrid';
  const physicalAvailable =
    book.available !== undefined
      ? Number(book.available)
      : book.stock !== undefined
      ? Math.max(0, Number(book.stock) - Number(book.reserved || 0))
      : null;
  const isOutOfStock = isPhysicalSelected && physicalAvailable !== null && physicalAvailable <= 0;
  const isLowStock = isPhysicalSelected && physicalAvailable !== null && physicalAvailable > 0 && physicalAvailable <= 5;

  const handleAddToCart = () => {
    if (isOutOfStock) {
      showToast('Sách giấy hiện đang tạm hết hàng!', 'error');
      return;
    }
    if (flashSaleInfo && quantity > (flashSaleInfo.maxPerUser || 1)) {
      showToast(`Flash Sale giới hạn tối đa ${flashSaleInfo.maxPerUser || 1} cuốn/khách`, 'warning');
      return;
    }
    addItem({
      id: `${book.id}-${selectedFormat}`,
      bookId: book.id,
      title: book.title,
      author: book.author,
      publisher: book.publisher || storeInfo?.name || publisherProfile?.name,
      storeId: realBook?.businessId || realBook?.storeId || storeInfo?.id || publisherProfile?.id,
      price: flashSaleInfo ? flashSaleInfo.salePrice : currentPrice.price,
      originalPrice: flashSaleInfo ? flashSaleInfo.originalPrice : currentPrice.originalPrice,
      format: currentPrice.title,
      cover: book.cover,
      quantity: quantity,
    });
    showToast(`Đã thêm "${book.title} (${currentPrice.title})" vào giỏ hàng!`, 'success');
  };

  const handleBuyNow = () => {
    if (isOutOfStock) {
      showToast('Sách giấy hiện đang tạm hết hàng!', 'error');
      return;
    }
    const existing = cartItems?.find((i) => i.bookId === book.id || i.id === `${book.id}-${selectedFormat}`);
    if (!existing) handleAddToCart();
    router.push('/checkout');
  };

  return (
    <div className="w-full bg-[#f8f6f1] text-[#17201f] min-h-screen font-sans pb-16">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-4 pb-2">
        <nav className="flex items-center gap-1.5 text-xs text-[#6b7280]">
          <Link href="/" className="hover:text-[#006953] transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">home</span>Trang chủ
          </Link>
          <span className="material-symbols-outlined text-xs text-gray-400">chevron_right</span>
          <Link href="/books" className="hover:text-[#006953] transition-colors">Tủ Sách</Link>
          <span className="material-symbols-outlined text-xs text-gray-400">chevron_right</span>
          <span className="text-[#17201f] font-medium truncate max-w-[240px] sm:max-w-md">{book.title}</span>
        </nav>
      </div>

      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-2 pb-6">
        <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="col-span-12 lg:col-span-4 flex flex-col items-center">
            <div className="w-full max-w-[340px] bg-white rounded-2xl p-6 border border-[#e8e5df] shadow-sm flex flex-col items-center group">
              <div className="relative w-[210px] sm:w-[230px] aspect-[2/3] rounded-xl overflow-hidden shadow-xl transition-transform duration-300 group-hover:scale-[1.02]">
                <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                {book.isBestseller && (
                  <div className="absolute top-2 left-2 bg-[#fea619] text-black text-[10px] font-black px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">local_fire_department</span>BÁN CHẠY
                  </div>
                )}
              </div>
              <Link href={`/library/${book.id}`} className="w-full mt-6 py-3 px-4 rounded-xl bg-[#006953] hover:bg-[#00523c] text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg">chrome_reader_mode</span>Đọc Thử Bản Trực Tuyến
              </Link>
              <div className="grid grid-cols-2 gap-2 w-full mt-3">
                <button onClick={() => { setIsWishlisted(!isWishlisted); showToast(!isWishlisted ? 'Đã lưu vào Yêu thích!' : 'Đã bỏ yêu thích', 'info'); }} className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${isWishlisted ? 'border-red-200 bg-red-50 text-red-600' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
                  <span className="material-symbols-outlined text-base">{isWishlisted ? 'favorite' : 'favorite_border'}</span>{isWishlisted ? 'Đã thích' : 'Yêu thích'}
                </button>
                <button onClick={() => { if (typeof window !== 'undefined') { navigator.clipboard?.writeText(window.location.href); showToast('Đã sao chép liên kết sách!', 'success'); } }} className="py-2 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                  <span className="material-symbols-outlined text-base">share</span>Chia sẻ
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-[#006953] font-medium bg-[#006953]/10 px-3.5 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-sm">verified_user</span>Bản quyền chính thức • Bảo vệ bởi HUKI DRM
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="bg-[#006953]/10 text-[#006953] text-[11px] font-bold px-2.5 py-0.5 rounded-full">{book.category || 'Công nghệ & Đổi mới'}</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500 font-medium">ISBN: {book.isbn || '978-604-58-9123-4'}</span>
              </div>
              <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#17201f] leading-snug">{book.title}</h1>
              <div className="flex items-center gap-3 mt-2 text-xs text-[#6b7280]">
                <span>Tác giả: <strong className="text-[#17201f]">{book.author}</strong></span>
                <span>•</span>
                <span>NXB: <Link href={`/shop/${publisherProfile.slug || publisherProfile.id}`} className="text-[#006953] font-bold hover:underline">{book.publisher}</Link></span>
              </div>
            </div>

            <div className="flex items-center gap-4 py-2 border-y border-[#e8e5df] text-xs">
              <div className="flex items-center gap-1 text-[#fea619]">
                <span className="material-symbols-outlined text-base fill">star</span>
                <span className="font-bold text-[#17201f] text-sm">{book.rating || 5.0}</span>
                <span className="text-gray-400">({(book.reviewCount || 1240).toLocaleString('vi-VN')} đánh giá)</span>
              </div>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">Đã bán <strong className="text-[#17201f]">{(book.readCount || 8500).toLocaleString('vi-VN')}</strong> bản</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-center">
              <div className="bg-white p-2.5 rounded-xl border border-[#e8e5df]"><span className="block text-gray-400 text-[10px]">Số trang</span><strong className="text-sm text-[#17201f]">{book.pages || 166}</strong></div>
              <div className="bg-white p-2.5 rounded-xl border border-[#e8e5df]"><span className="block text-gray-400 text-[10px]">Ngôn ngữ</span><strong className="text-sm text-[#17201f]">Tiếng Việt</strong></div>
              <div className="bg-white p-2.5 rounded-xl border border-[#e8e5df]"><span className="block text-gray-400 text-[10px]">Định dạng</span><strong className="text-sm text-[#006953]">PDF / EPUB</strong></div>
              <div className="bg-white p-2.5 rounded-xl border border-[#e8e5df]"><span className="block text-gray-400 text-[10px]">Thiết bị</span><strong className="text-sm text-[#17201f]">5 Máy</strong></div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#e8e5df] text-xs text-gray-600 leading-relaxed">
              <p>{book.description || 'Tác phẩm cung cấp cái nhìn sâu sắc và toàn diện về những chuyển dịch công nghệ và phương pháp tư duy đột phá.'}</p>
            </div>

            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Chọn hình thức mua:</span>
              <div className="grid grid-cols-3 gap-2.5">
                {Object.values(formatPricing).map((fmt) => {
                  const isSelected = selectedFormat === fmt.type;
                  const isHybrid = fmt.type === 'hybrid';
                  return (
                    <div key={fmt.type} onClick={() => setSelectedFormat(fmt.type)} className={`p-3 rounded-xl cursor-pointer transition-all border relative flex flex-col justify-between ${isSelected ? 'border-2 border-[#006953] bg-[#006953]/5 shadow-sm' : isHybrid ? 'border-amber-300 bg-amber-50/40 hover:border-amber-400' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                      {isSelected ? <span className="absolute -top-2 right-2 bg-[#006953] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">ĐANG CHỌN</span> : isHybrid ? <span className="absolute -top-2 right-2 bg-amber-500 text-white text-[8px] font-extrabold px-1.5 py-0.2 rounded-full shadow-xs">🔥 TIẾT KIỆM 45%</span> : null}
                      <div>
                        <span className={`text-xs font-bold block ${isSelected ? 'text-[#006953]' : 'text-[#17201f]'}`}>{fmt.title}</span>
                        <span className="text-[10px] text-gray-500 block mt-0.5">{fmt.subtitle}</span>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-baseline justify-between">
                        <span className="text-sm font-bold text-[#006953]">{fmt.price.toLocaleString('vi-VN')}đ</span>
                        <span className="text-[10px] text-gray-400 line-through">{Math.round(fmt.originalPrice / 1000)}k</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-3">
            <div className="sticky top-[96px] bg-white border border-[#e8e5df] rounded-2xl p-5 shadow-sm space-y-4">
              {flashSaleInfo && (
                <div className="p-3 bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1 text-rose-600 font-extrabold text-xs"><span className="material-symbols-outlined text-sm animate-pulse">bolt</span><span>FLASH SALE GIỜ VÀNG -{flashSaleInfo.discountPercent}%</span></div>
                  <div className="text-[11px] text-rose-700 font-medium">Giá sốc: <strong className="text-sm font-black text-rose-600">{Number(flashSaleInfo.salePrice).toLocaleString('vi-VN')}₫</strong> (Tối đa {flashSaleInfo.maxPerUser || 1} cuốn)</div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700"><span className="material-symbols-outlined text-sm">timer</span>Kết thúc sau {flashSaleCountdown}</div>
                </div>
              )}

              <div className="border-b border-gray-100 pb-3">
                <span className="text-xs text-gray-500 block mb-0.5">Tạm tính ({currentPrice.title}):</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${flashSaleInfo ? 'text-rose-600' : 'text-[#006953]'}`}>{((flashSaleInfo ? flashSaleInfo.salePrice : currentPrice.price) * quantity).toLocaleString('vi-VN')}đ</span>
                  <span className="text-xs text-gray-400 line-through">{((flashSaleInfo ? flashSaleInfo.originalPrice : currentPrice.originalPrice) * quantity).toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="bg-red-50 text-red-600 text-[11px] font-bold px-1.5 py-0.5 rounded">Tiết kiệm {flashSaleInfo ? flashSaleInfo.discountPercent : discountPercent}%</span>
                  <span className="text-[11px] text-gray-500">Tích 5% HukiXu</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 font-medium">Số lượng:</span>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"><span className="material-symbols-outlined text-sm">remove</span></button>
                  <span className="w-8 text-center font-bold text-xs">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} disabled={Boolean(flashSaleInfo && quantity >= (flashSaleInfo.maxPerUser || 1))} className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"><span className="material-symbols-outlined text-sm">add</span></button>
                </div>
              </div>

              <div className="pt-1">
                {isOutOfStock ? (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                    <span className="material-symbols-outlined text-base">error</span>
                    <span>Tạm hết hàng ({physicalAvailable} cuốn khả dụng)</span>
                  </div>
                ) : isLowStock ? (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold animate-pulse">
                    <span className="material-symbols-outlined text-base">warning</span>
                    <span>Chỉ còn {physicalAvailable} cuốn trong kho!</span>
                  </div>
                ) : isPhysicalSelected && physicalAvailable !== null ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
                    <span>Còn hàng ({physicalAvailable} cuốn có sẵn)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    <span className="material-symbols-outlined text-base text-emerald-600">bolt</span>
                    <span>Kích hoạt ngay (Không giới hạn)</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-1">
                <button onClick={handleBuyNow} disabled={isOutOfStock} className={`w-full h-11 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${isOutOfStock ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#006953] hover:bg-[#00523c] text-white cursor-pointer'}`}>
                  <span className="material-symbols-outlined text-lg">shopping_cart_checkout</span>{isOutOfStock ? 'Tạm Hết Hàng' : 'Mua Ngay'}
                </button>
                <button onClick={handleAddToCart} disabled={isOutOfStock} className={`w-full h-10 border rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${isOutOfStock ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-[#006953] text-[#006953] hover:bg-[#006953]/5 cursor-pointer'}`}>
                  <span className="material-symbols-outlined text-base">add_shopping_cart</span>Thêm Vào Giỏ Hàng
                </button>
              </div>

              <Link href={`/shop/${publisherProfile.slug || publisherProfile.id}`} className="pt-3 border-t border-gray-100 flex items-center gap-2.5 group hover:opacity-90 transition-opacity">
                <div className="w-8 h-8 rounded-full bg-[#006953] text-white font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                  {publisherProfile.logo ? <img src={publisherProfile.logo} alt={publisherProfile.name} className="w-full h-full object-cover" /> : publisherProfile.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-gray-800 block truncate group-hover:text-[#006953] transition-colors">{publisherProfile.name}</span>
                  <span className="text-[10px] text-[#006953] flex items-center gap-0.5 font-medium"><span className="material-symbols-outlined text-[12px]">verified</span>Gian hàng chính hãng</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 mb-6">
        <div className="bg-white rounded-2xl border border-[#e8e5df] p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link href={`/shop/${publisherProfile.slug || publisherProfile.id}`} className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#006953]/15 to-[#006953]/5 border border-[#006953]/20 flex items-center justify-center shrink-0 overflow-hidden group shadow-sm hover:border-[#006953] transition-colors">
              {publisherProfile.logo ? <img src={publisherProfile.logo} alt={publisherProfile.name} className="w-full h-full object-cover" /> : <span className="text-[#006953] font-black text-xl sm:text-2xl font-editorial">{publisherProfile.name.charAt(0).toUpperCase()}</span>}
              <div className="absolute bottom-0 inset-x-0 bg-[#006953] text-white text-[8px] font-bold text-center py-0.5 uppercase tracking-wider">Official</div>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link href={`/shop/${publisherProfile.slug || publisherProfile.id}`} className="font-bold text-sm sm:text-base text-[#17201f] hover:text-[#006953] transition-colors truncate">{publisherProfile.name}</Link>
                <span className="inline-flex items-center gap-0.5 bg-[#006953]/10 text-[#006953] text-[10px] font-bold px-2 py-0.5 rounded-full"><span className="material-symbols-outlined text-xs">verified</span>NXB Chính Hãng</span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{publisherProfile.description}</p>
              <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-1 text-[#fea619] font-bold"><span className="material-symbols-outlined text-sm fill">star</span>{publisherProfile.rating} <span className="text-gray-400 font-normal">({publisherProfile.reviewsCount})</span></span>
                <span className="text-gray-300">•</span><span>Phản hồi: <strong className="text-gray-800">{publisherProfile.responseRate}</strong></span>
                <span className="text-gray-300">•</span><span>Bảo hộ: <strong className="text-[#006953]">HUKI DRM</strong></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center w-full md:w-auto">
            <button onClick={() => { setIsFollowingStore(!isFollowingStore); showToast(!isFollowingStore ? `Đã theo dõi ${publisherProfile.name}!` : 'Đã hủy theo dõi', 'info'); }} className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${isFollowingStore ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'border border-[#006953] text-[#006953] hover:bg-[#006953]/5'}`}>
              <span className="material-symbols-outlined text-sm">{isFollowingStore ? 'check' : 'person_add'}</span>{isFollowingStore ? 'Đang theo dõi' : 'Theo dõi NXB'}
            </button>
            <Link href={`/shop/${publisherProfile.slug || publisherProfile.id}`} className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-[#006953] hover:bg-[#00523c] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm">
              <span className="material-symbols-outlined text-sm">storefront</span>Xem Gian Hàng
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-[#e8e5df] shadow-sm overflow-hidden mb-6">
          <div className="flex items-center border-b border-gray-200 px-4 sm:px-6 gap-6 sm:gap-8 overflow-x-auto text-xs sm:text-sm font-semibold">
            <button onClick={() => setActiveTab('intro')} className={`py-4 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${activeTab === 'intro' ? 'border-[#006953] text-[#006953] font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}><span className="material-symbols-outlined text-base">menu_book</span>Giới Thiệu</button>
            <button onClick={() => setActiveTab('toc')} className={`py-4 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${activeTab === 'toc' ? 'border-[#006953] text-[#006953] font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}><span className="material-symbols-outlined text-base">format_list_bulleted</span>Mục Lục ({book.toc?.length || 8} Chương)</button>
            <button onClick={() => setActiveTab('preview')} className={`py-4 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${activeTab === 'preview' ? 'border-[#006953] text-[#006953] font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}><span className="material-symbols-outlined text-base">chrome_reader_mode</span>Đọc Thử Mẫu</button>
            <button onClick={() => setActiveTab('reviews')} className={`py-4 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${activeTab === 'reviews' ? 'border-[#006953] text-[#006953] font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}><span className="material-symbols-outlined text-base">star</span>Đánh Giá ({(book.reviewCount || 1240).toLocaleString('vi-VN')})</button>
          </div>

          {activeTab === 'intro' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="prose max-w-none text-sm text-gray-700 leading-relaxed space-y-4">
                <p className="text-base font-medium text-gray-900">{book.description || 'Cuốn sách mang đến những góc nhìn mới mẻ và bài học giá trị cho độc giả trong kỷ nguyên số.'}</p>
                <p>Thông qua những phân tích thực tế và câu chuyện truyền cảm hứng, tác giả làm sáng tỏ cách các hệ thống vận hành và phương pháp để mỗi cá nhân có thể thích nghi, bứt phá và đạt được những thành tựu vượt bậc.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-[#f8f6f1] border border-[#e8e5df]"><span className="material-symbols-outlined text-2xl text-[#006953] mb-2">lightbulb</span><h4 className="font-bold text-xs text-gray-900 mb-1">Tư duy hệ thống</h4><p className="text-xs text-gray-600">Xây dựng quy trình bền vững thay vì chỉ phụ thuộc vào cảm hứng nhất thời.</p></div>
                <div className="p-4 rounded-xl bg-[#f8f6f1] border border-[#e8e5df]"><span className="material-symbols-outlined text-2xl text-[#006953] mb-2">trending_up</span><h4 className="font-bold text-xs text-gray-900 mb-1">Tích lũy giá trị</h4><p className="text-xs text-gray-600">Cải thiện nhỏ mỗi ngày tạo nên kết quả vượt trội theo thời gian.</p></div>
                <div className="p-4 rounded-xl bg-[#f8f6f1] border border-[#e8e5df]"><span className="material-symbols-outlined text-2xl text-[#006953] mb-2">verified</span><h4 className="font-bold text-xs text-gray-900 mb-1">Ứng dụng thực tiễn</h4><p className="text-xs text-gray-600">Các phương pháp đã được kiểm chứng và dễ dàng áp dụng ngay.</p></div>
              </div>
              <div className="border-t border-gray-100 pt-6">
                <h3 className="font-bold text-sm text-[#17201f] mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-[#006953] text-base">info</span>Thông Tin Chi Tiết & Pháp Lý Xuất Bản</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Nhà xuất bản / Đơn vị phát hành:</span><Link href={`/shop/${publisherProfile.slug || publisherProfile.id}`} className="font-semibold text-[#006953] hover:underline">{book.publisher}</Link></div>
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Tác giả / Dịch giả:</span><span className="font-semibold text-gray-800">{book.author}</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Mã chuẩn quốc tế (ISBN):</span><span className="font-mono font-semibold text-gray-800">{book.isbn || '978-604-58-9123-4'}</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Thể loại phân mục:</span><span className="font-semibold text-gray-800">{book.category}</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Số trang sách in:</span><span className="font-semibold text-gray-800">{book.pages || 250} trang</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Trọng lượng & Quy cách:</span><span className="font-semibold text-gray-800">{realBook?.physicalDetails?.weight || 350}g ({realBook?.physicalDetails?.length || 20} x {realBook?.physicalDetails?.width || 14} x {realBook?.physicalDetails?.height || 2} cm)</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Bản quyền số & Thiết bị:</span><span className="font-semibold text-[#006953]">Hỗ trợ đọc 5 thiết bị đồng bộ (HUKI DRM Vault)</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Chính sách bảo hành / đổi trả:</span><span className="font-semibold text-gray-800">Đổi mới trong 7 ngày nếu lỗi in ấn hoặc giao sai</span></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'toc' && (
            <div className="p-6 sm:p-8 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  book.toc || [
                    { id: 1, title: 'Phần I: Khởi đầu và nguyên lý căn bản', page: 1 },
                    { id: 2, title: 'Phần II: Các quy luật và phương pháp thực thi', page: 24 },
                    { id: 3, title: 'Phần III: Xây dựng hệ thống hiệu quả', page: 68 },
                    { id: 4, title: 'Phần IV: Vượt qua rào cản và duy trì kỷ luật', page: 112 },
                    { id: 5, title: 'Phần V: Kết luận và con đường phía trước', page: 150 },
                  ]
                ).map((chap: TableOfContentItem) => (
                  <Link key={chap.id} href={`/library/${book.id}?page=${chap.page || 1}`} className="p-3.5 rounded-xl border border-gray-200 hover:border-[#006953] hover:bg-[#006953]/5 transition-all flex items-center justify-between text-xs group">
                    <div className="flex items-center gap-2.5"><span className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-[#006953] group-hover:text-white font-bold text-[11px] flex items-center justify-center transition-colors">{chap.id}</span><span className="font-semibold text-gray-800 group-hover:text-[#006953] transition-colors">{chap.title}</span></div>
                    <span className="text-gray-400 font-mono text-[11px]">Trang {chap.page || 1} →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#006953]/10 text-[#006953] flex items-center justify-center"><span className="material-symbols-outlined text-3xl">auto_stories</span></div>
              <div className="max-w-md">
                <h3 className="font-bold text-base text-gray-900 mb-1">Trải nghiệm đọc thử trực tuyến</h3>
                <p className="text-xs text-gray-600">Mở trình đọc sách toàn màn hình với đầy đủ công cụ ghi chú, bút dạ quang highlight và chế độ đọc ban đêm.</p>
              </div>
              <Link href={`/library/${book.id}`} className="px-6 py-3 rounded-xl bg-[#006953] hover:bg-[#00523c] text-white font-bold text-sm shadow-sm transition-all inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">chrome_reader_mode</span>Mở Trình Đọc PDF / Ebook
              </Link>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="p-6 sm:p-8 space-y-6">
              {/* Header: Rating Breakdown Summary */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-6">
                  <div className="text-center md:text-left">
                    <div className="flex items-baseline gap-1.5 justify-center md:justify-start">
                      <span className="text-4xl sm:text-5xl font-extrabold text-gray-900 font-editorial">
                        {reviewSummary?.averageRating || book.rating || 5.0}
                      </span>
                      <span className="text-sm text-gray-400 font-bold">/ 5.0</span>
                    </div>
                    <div className="flex text-[#fea619] justify-center md:justify-start mt-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className="material-symbols-outlined text-lg fill">
                          star
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {(reviewSummary?.totalReviews || reviewsList.length || book.reviewCount || 1240).toLocaleString('vi-VN')} đánh giá đã xác thực
                    </div>
                  </div>

                  {/* Rating distribution progress bars */}
                  <div className="hidden sm:flex flex-col gap-1.5 border-l border-gray-200 pl-6 text-xs text-gray-600">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = reviewSummary?.ratingDistribution?.[String(stars)] ?? (stars === 5 ? 85 : stars === 4 ? 12 : 3);
                      const total = reviewSummary?.totalReviews || 100;
                      const pct = Math.min(100, Math.round((count / (total || 1)) * 100));
                      return (
                        <div key={stars} className="flex items-center gap-2">
                          <span className="w-8 font-medium">{stars} sao</span>
                          <div className="w-32 sm:w-44 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-[#fea619] h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                          <span className="w-10 text-right text-[11px] text-gray-400">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex items-center gap-1 bg-theme-bg p-1 rounded-xl border border-theme-border">
                    <button
                      onClick={() => setReviewsFilterRating(undefined)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        reviewsFilterRating === undefined
                          ? 'bg-[#006953] text-white shadow-2xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Tất cả
                    </button>
                    {[5, 4, 3].map((r) => (
                      <button
                        key={r}
                        onClick={() => setReviewsFilterRating(r)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          reviewsFilterRating === r
                            ? 'bg-[#006953] text-white shadow-2xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {r}★
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#006953] hover:bg-[#00523c] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">rate_review</span>
                    <span>Viết Đánh Giá</span>
                  </button>
                </div>
              </div>

              {/* Review Form Modal */}
              <ReviewFormModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                onSuccess={() => {
                  const bookTargetId = realBook?.id || id;
                  if (bookTargetId) {
                    reviewApi
                      .getBookReviews(bookTargetId, {
                        rating: reviewsFilterRating,
                        limit: 20,
                      })
                      .then((res) => {
                        if (res?.success && res.data) {
                          setReviewsList(res.data.data || []);
                          if (res.data.summary) setReviewSummary(res.data.summary);
                        }
                      })
                      .catch(() => {});
                  }
                }}
                bookId={realBook?.id || id}
                bookTitle={book.title}
                bookCover={book.cover}
                bookAuthor={book.author}
                defaultFormat={selectedFormat === 'ebook' ? 'DIGITAL' : 'PHYSICAL'}
              />

              {/* Verified Purchase Info Banner */}
              <div className="flex items-center gap-2 p-3 bg-[#006953]/5 border border-[#006953]/15 rounded-xl text-xs text-[#006953]">
                <span className="material-symbols-outlined text-base font-bold">verified_user</span>
                <span className="leading-snug font-medium">
                  <strong>Cam kết minh bạch:</strong> Tất cả đánh giá có huy hiệu <VerifiedPurchaseBadge variant="compact" /> được xác thực từ khách hàng đã mua và hoàn tất đơn hàng trên HUKI theo chính sách POL-13.
                </span>
              </div>

              {/* Reviews List */}
              <div className="space-y-4 pt-2">
                {isLoadingReviews ? (
                  <div className="text-center py-10 text-xs text-gray-500 flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-2xl text-[#006953]">
                      progress_activity
                    </span>
                    <span>Đang tải đánh giá độc giả...</span>
                  </div>
                ) : reviewsList.length > 0 ? (
                  reviewsList.map((rev) => (
                    <ReviewCard key={rev.id} review={rev} />
                  ))
                ) : (
                  /* Canonical mock verified reviews fallback */
                  [
                    {
                      id: 'mock-rev-1',
                      author: {
                        fullName: 'Nguyễn Văn An',
                        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
                      },
                      rating: 5,
                      title: 'Cuốn sách tuyệt vời, chất lượng in và bản quyền DRM rất an tâm',
                      content: 'Sách rất hay và truyền cảm hứng thực sự. Đọc thử trực tuyến trên Web Reader rất mượt, giao diện chống mỏi mắt. Khi nhận sách in giấy xốp ngà cầm rất nhẹ tay, đóng gói cẩn thận chống sốc.',
                      verifiedPurchase: true,
                      format: 'PHYSICAL',
                      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
                      helpfulCount: 24,
                      isHelpful: false,
                      images: [
                        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300',
                      ],
                      replies: [
                        {
                          id: 'rep-1',
                          content: 'Cảm ơn quý độc giả đã tin tưởng và ủng hộ ấn phẩm chính thức từ NXB. Chúc bạn có những phút giây đọc sách ý nghĩa!',
                          business: { id: publisherProfile.id, name: publisherProfile.name },
                          createdAt: new Date(Date.now() - 86400000).toISOString(),
                        },
                      ],
                    },
                    {
                      id: 'mock-rev-2',
                      author: {
                        fullName: 'Trần Thị Mai',
                        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
                      },
                      rating: 5,
                      title: 'Ebook tải về ứng dụng đọc liền, font chữ tiếng Việt rõ nét',
                      content: 'Định dạng DRM đồng bộ nhanh chóng sang máy tính bảng. Tính năng highlight trích dẫn lưu lại vào sổ tay điện tử rất tiện để ôn tập kiến thức.',
                      verifiedPurchase: true,
                      format: 'DIGITAL',
                      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
                      helpfulCount: 18,
                      isHelpful: true,
                      images: [],
                    },
                  ].map((rev) => (
                    <ReviewCard key={rev.id} review={rev as any} />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
