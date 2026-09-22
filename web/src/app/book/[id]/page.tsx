"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '@/ui/context/CartContext';
import { useToast } from '@/ui/context/ToastContext';
import { useAuth } from '@/ui/context/AuthContext';
import { booksData } from '@/ui/data/mockData';
import { catalogApi } from '@/ui/api/catalogApi';
import { businessApi } from '@/ui/api/businessApi';
import { flashSaleApi } from '@/ui/api/flashSaleApi';
import { discountApi, BookDiscount } from '@/ui/api/discountApi';
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
  const { user, isLoggedIn } = useAuth();

  const [selectedFormat, setSelectedFormat] = useState<'ebook' | 'physical' | 'hybrid' | string>('ebook');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('intro');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isFollowingStore, setIsFollowingStore] = useState(false);
  const [isFollowDropdownOpen, setIsFollowDropdownOpen] = useState(false);
  const [isUnfollowModalOpen, setIsUnfollowModalOpen] = useState(false);
  const [unfollowCountdown, setUnfollowCountdown] = useState(5);
  const [isUnfollowing, setIsUnfollowing] = useState(false);
  const followDropdownRef = useRef<HTMLDivElement>(null);
  const [realBook, setRealBook] = useState<any>(null);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [flashSaleInfo, setFlashSaleInfo] = useState<any>(null);
  const [bookDiscount, setBookDiscount] = useState<BookDiscount | null>(null);
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
    const targetBusinessId = realBook?.businessId || realBook?.storeId || realBook?.business?.id;
    if (targetBusinessId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetBusinessId);
      const fetchPromise = isUuid ? businessApi.getBusinessById(targetBusinessId) : businessApi.getBusinessBySlug(targetBusinessId);
      fetchPromise
        .then((res) => {
          if (res?.success && res.data) {
            setStoreInfo(res.data);
          } else {
            const fallback = isUuid ? businessApi.getBusinessBySlug(targetBusinessId) : businessApi.getBusinessById(targetBusinessId);
            fallback
              .then((fallbackRes) => {
                if (fallbackRes?.success && fallbackRes.data) setStoreInfo(fallbackRes.data);
              })
              .catch(() => {});
          }
        })
        .catch(() => {
          const fallback = isUuid ? businessApi.getBusinessBySlug(targetBusinessId) : businessApi.getBusinessById(targetBusinessId);
          fallback
            .then((fallbackRes) => {
              if (fallbackRes?.success && fallbackRes.data) setStoreInfo(fallbackRes.data);
            })
            .catch(() => {});
        });
    } else if (realBook?.publisher) {
      const pubName = typeof realBook.publisher === 'object' ? (realBook.publisher.slug || realBook.publisher.name) : realBook.publisher;
      if (pubName) {
        businessApi
          .getBusinessBySlug(pubName)
          .then((res) => {
            if (res?.success && res.data) setStoreInfo(res.data);
          })
          .catch(() => {});
      }
    }
    if (realBook?.id) {
      flashSaleApi
        .getBookPrice(realBook.id)
        .then((res) => {
          if (res?.success && res.data && res.data.salePrice) setFlashSaleInfo(res.data);
          else setFlashSaleInfo(null);
        })
        .catch(() => setFlashSaleInfo(null));

      discountApi
        .getDiscountByBookId(realBook.id)
        .then((res) => {
          if (res?.success && res.data && res.data.status === 'ACTIVE' && res.data.isCurrentlyActive) {
            setBookDiscount(res.data);
          } else {
            setBookDiscount(null);
          }
        })
        .catch(() => setBookDiscount(null));
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

  useEffect(() => {
    if (isLoggedIn && (storeInfo?.id || realBook?.businessId)) {
      const targetBizId = storeInfo?.id || realBook?.businessId;
      businessApi
        .getMyFollowedBusinessIds()
        .then((res) => {
          if (res?.success && Array.isArray(res.data)) {
            setIsFollowingStore(res.data.includes(targetBizId));
          }
        })
        .catch(() => {});
    }
  }, [isLoggedIn, storeInfo?.id, realBook?.businessId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (followDropdownRef.current && !followDropdownRef.current.contains(e.target as Node)) {
        setIsFollowDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isUnfollowModalOpen) {
      setUnfollowCountdown(5);
      return undefined;
    }
    setUnfollowCountdown(5);
    const timer = window.setInterval(() => {
      setUnfollowCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isUnfollowModalOpen]);

  const handleFollowStore = async () => {
    if (!isLoggedIn) {
      showToast('Vui lòng đăng nhập để theo dõi gian hàng!', 'warning');
      return;
    }
    const targetBizId = publisherProfile.id || storeInfo?.id || realBook?.businessId;
    if (!targetBizId) return;

    try {
      const res = await businessApi.followBusiness(targetBizId);
      if (res?.success) {
        setIsFollowingStore(true);
        showToast(`Đã theo dõi gian hàng ${publisherProfile.name}!`, 'success');
      } else {
        showToast(res?.error?.message || 'Không thể theo dõi gian hàng', 'error');
      }
    } catch {
      showToast('Có lỗi xảy ra khi theo dõi gian hàng', 'error');
    }
  };

  const handleConfirmUnfollow = async () => {
    if (unfollowCountdown > 0) return;
    const targetBizId = publisherProfile.id || storeInfo?.id || realBook?.businessId;
    if (!targetBizId) return;

    setIsUnfollowing(true);
    try {
      const res = await businessApi.unfollowBusiness(targetBizId);
      if (res?.success) {
        setIsFollowingStore(false);
        setIsFollowDropdownOpen(false);
        setIsUnfollowModalOpen(false);
        showToast(`Đã hủy theo dõi gian hàng ${publisherProfile.name}!`, 'info');
      } else {
        showToast(res?.error?.message || 'Không thể hủy theo dõi', 'error');
      }
    } catch {
      showToast('Có lỗi xảy ra khi hủy theo dõi', 'error');
    } finally {
      setIsUnfollowing(false);
    }
  };

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
      const originalPriceVal =
        typeof realBook.originalPrice === 'number' && realBook.originalPrice > priceVal
          ? realBook.originalPrice
          : realBook.originalPrice;
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
        isbn: realBook.isbn || undefined,
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
        pages: realBook.physicalDetails?.pages || realBook.physicalDetails?.pageCount || realBook.pageCount || undefined,
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
    const defaultName = book.publisher || realBook?.publisher?.name || realBook?.publisher || 'Gian Hàng HUKI';
    const storeLogo =
      storeInfo?.logo ||
      storeInfo?.stores?.[0]?.logo ||
      storeInfo?.avatar ||
      realBook?.business?.logo ||
      realBook?.business?.stores?.[0]?.logo ||
      realBook?.business?.avatar ||
      null;

    if (storeInfo) {
      return {
        id: storeInfo.id,
        name: storeInfo.name || defaultName,
        slug: storeInfo.slug || storeInfo.stores?.[0]?.slug || storeInfo.id,
        logo: storeLogo,
        description: storeInfo.description || storeInfo.stores?.[0]?.description || 'Gian hàng và Nhà xuất bản chính thức được chứng nhận bản quyền bởi HUKI Platform.',
        address: storeInfo.address || 'Hà Nội & TP. Hồ Chí Minh, Việt Nam',
        rating: 4.9,
        reviewsCount: '2.8k',
        responseRate: '99%',
        isVerified: true,
      };
    }
    if (realBook?.business) {
      return {
        id: realBook.business.id || 'alpha-books',
        name: realBook.business.displayName || realBook.business.name || defaultName,
        slug: realBook.business.slug || realBook.business.stores?.[0]?.slug || realBook.business.id || 'alpha-books',
        logo: storeLogo,
        description: realBook.business.description || realBook.business.stores?.[0]?.description || 'Nhà xuất bản và phát hành sách bản quyền chính thức trên hệ thống HUKI Platform.',
        address: realBook.business.address || 'Hà Nội & TP. Hồ Chí Minh, Việt Nam',
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
      logo: storeLogo,
      description: 'Nhà xuất bản và phát hành sách bản quyền chính thức trên hệ thống HUKI Platform.',
      address: 'Hà Nội & TP. Hồ Chí Minh, Việt Nam',
      rating: 4.9,
      reviewsCount: '2.8k',
      responseRate: '99%',
      isVerified: true,
    };
  }, [storeInfo, book.publisher, realBook]);

  const formatPricing = useMemo(() => {
    const bookFormat = realBook?.format || book.format || 'BOTH';

    // Determine true original base price (e.g. 110.000)
    const originalBasePrice =
      book.originalPrice && Number(book.originalPrice) > 0
        ? Number(book.originalPrice)
        : Number(book.price) || 0;

    let salePrice = Number(book.price) || 0;

    let discountPercentValue = 0;
    let discountFixedValue = 0;

    if (bookDiscount && bookDiscount.status === 'ACTIVE' && bookDiscount.isCurrentlyActive) {
      if (bookDiscount.type === 'PERCENTAGE') {
        discountPercentValue = Number(bookDiscount.value);
        const discountAmt = Math.round(originalBasePrice * (discountPercentValue / 100));
        salePrice = Math.max(0, originalBasePrice - discountAmt);
      } else if (bookDiscount.type === 'FIXED_AMOUNT') {
        discountFixedValue = Number(bookDiscount.value);
        const discountAmt = Math.min(originalBasePrice, discountFixedValue);
        salePrice = Math.max(0, originalBasePrice - discountAmt);
      }
    } else if (book.originalPrice && Number(book.originalPrice) > Number(book.price)) {
      salePrice = Number(book.price);
      discountPercentValue = Math.round(((originalBasePrice - salePrice) / originalBasePrice) * 100);
    } else {
      salePrice = originalBasePrice;
    }

    // Helper to calculate discounted price for any base price
    const calcSalePrice = (base: number) => {
      if (discountPercentValue > 0) {
        return Math.max(0, Math.round(base * (1 - discountPercentValue / 100)));
      }
      if (discountFixedValue > 0 && originalBasePrice > 0) {
        const discountRatio = discountFixedValue / originalBasePrice;
        return Math.max(0, Math.round(base * (1 - discountRatio)));
      }
      return base;
    };

    // 1. SÁCH GIẤY (PHYSICAL ONLY) -> Chỉ hiển thị 1 lựa chọn: Mua sách giấy
    if (bookFormat === 'PHYSICAL') {
      return {
        physical: {
          type: 'physical',
          title: 'Sách Giấy Bìa Mềm',
          subtitle: 'Giấy xốp ngà chống lóa',
          price: salePrice,
          originalPrice: originalBasePrice,
          badge: 'GIAO TẬN NƠI',
          icon: 'local_shipping',
          delivery: 'Giao trong 2-3 ngày làm việc',
          note: 'Tặng kèm bookmark độc quyền',
        },
      };
    }

    // 2. EBOOK (DIGITAL ONLY) -> Chỉ hiển thị 1 lựa chọn: Mua Ebook
    if (bookFormat === 'DIGITAL') {
      return {
        ebook: {
          type: 'ebook',
          title: 'Ebook Bản Quyền',
          subtitle: 'Đọc tức thì trên App & Web',
          price: salePrice,
          originalPrice: originalBasePrice,
          badge: 'ĐỌC NGAY',
          icon: 'bolt',
          delivery: 'Kích hoạt ngay vào Tủ Sách cá nhân',
          note: 'Hỗ trợ DRM đọc trên 5 thiết bị',
        },
      };
    }

    // 3. COMBO HYBRID (BOTH) -> Hiển thị cả 3 lựa chọn: Sách giấy, Ebook, Combo
    const comboOriginalPrice = originalBasePrice;
    const comboSalePrice = salePrice;

    const physicalOriginalPrice =
      Number(realBook?.pricePaper || (realBook as any)?.physicalPrice) || Math.round(comboOriginalPrice * 0.75);
    const physicalSalePrice = calcSalePrice(physicalOriginalPrice);

    const ebookOriginalPrice =
      Number(realBook?.priceEbook || (realBook as any)?.ebookPrice) || Math.round(comboOriginalPrice * 0.45);
    const ebookSalePrice = calcSalePrice(ebookOriginalPrice);

    return {
      physical: {
        type: 'physical',
        title: 'Sách Giấy Bìa Mềm',
        subtitle: 'Bản in truyền thống',
        price: physicalSalePrice,
        originalPrice: physicalOriginalPrice,
        badge: 'GIAO TẬN NƠI',
        icon: 'local_shipping',
        delivery: 'Giao trong 2-3 ngày làm việc',
        note: 'Tặng kèm bookmark độc quyền',
      },
      ebook: {
        type: 'ebook',
        title: 'Ebook Bản Quyền',
        subtitle: 'Đọc tức thì trên App & Web',
        price: ebookSalePrice,
        originalPrice: ebookOriginalPrice,
        badge: 'ĐỌC NGAY',
        icon: 'bolt',
        delivery: 'Kích hoạt ngay vào Tủ Sách cá nhân',
        note: 'Hỗ trợ DRM đọc trên 5 thiết bị',
      },
      hybrid: {
        type: 'hybrid',
        title: 'Combo Giấy + Ebook',
        subtitle: 'Tiết kiệm nhất',
        price: comboSalePrice,
        originalPrice: comboOriginalPrice,
        badge: 'TIẾT KIỆM',
        icon: 'auto_awesome',
        delivery: 'Đọc Ebook ngay + Giao Sách Giấy',
        note: 'Trọn bộ giải pháp đọc kép tiện lợi',
      },
    };
  }, [book, bookDiscount, realBook]);

  // Ensure selectedFormat is always valid for the available options
  useEffect(() => {
    const availableKeys = Object.keys(formatPricing);
    if (availableKeys.length > 0 && !availableKeys.includes(selectedFormat)) {
      setSelectedFormat(availableKeys[0]);
    }
  }, [formatPricing, selectedFormat]);

  const currentPrice =
    (formatPricing as any)[selectedFormat] || Object.values(formatPricing)[0] || {
      type: 'physical',
      title: 'Sách Giấy Bìa Mềm',
      price: book.price || 0,
      originalPrice: book.originalPrice || book.price || 0,
    };
  const discountPercent =
    flashSaleInfo?.discountPercent ||
    (bookDiscount && bookDiscount.type === 'PERCENTAGE'
      ? Number(bookDiscount.value)
      : currentPrice && currentPrice.originalPrice > currentPrice.price
      ? Math.round(((currentPrice.originalPrice - currentPrice.price) / currentPrice.originalPrice) * 100)
      : 0);
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
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                {book.category && (
                  <span className="bg-[#006953]/10 text-[#006953] text-[11px] font-bold px-2.5 py-0.5 rounded-full">{book.category}</span>
                )}
                {book.isbn && (
                  <>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500 font-medium">ISBN: {book.isbn}</span>
                  </>
                )}
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
              <div className="bg-white p-2.5 rounded-xl border border-[#e8e5df]"><span className="block text-gray-400 text-[10px]">Số trang</span><strong className="text-sm text-[#17201f]">{book.pages ? `${book.pages} trang` : 'Chuẩn DRM'}</strong></div>
              <div className="bg-white p-2.5 rounded-xl border border-[#e8e5df]"><span className="block text-gray-400 text-[10px]">Ngôn ngữ</span><strong className="text-sm text-[#17201f]">Tiếng Việt</strong></div>
              <div className="bg-white p-2.5 rounded-xl border border-[#e8e5df]"><span className="block text-gray-400 text-[10px]">Định dạng</span><strong className="text-sm text-[#006953]">PDF / EPUB</strong></div>
              <div className="bg-white p-2.5 rounded-xl border border-[#e8e5df]"><span className="block text-gray-400 text-[10px]">Đọc thử</span><strong className="text-sm text-[#17201f]">Miễn phí</strong></div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#e8e5df] text-xs text-gray-600 leading-relaxed">
              <p className="line-clamp-3">{book.description || 'Chưa có mô tả cho tác phẩm này.'}</p>
            </div>

            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Chọn hình thức mua:</span>
              <div className="grid grid-cols-1 gap-2.5">
                {Object.values(formatPricing).map((fmt) => {
                  const isSelected = selectedFormat === fmt.type;
                  const isDiscounted = fmt.originalPrice > fmt.price;
                  return (
                    <div
                      key={fmt.type}
                      onClick={() => setSelectedFormat(fmt.type)}
                      className={`p-3.5 rounded-xl cursor-pointer transition-all border relative flex items-center justify-between gap-4 ${
                        isSelected
                          ? 'border-2 border-[#006953] bg-[#006953]/5 shadow-sm'
                          : isDiscounted
                          ? 'border-rose-200 bg-rose-50/20 hover:border-rose-300'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {isSelected ? (
                        <span className="absolute -top-2.5 right-3 bg-[#006953] text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                          ĐANG CHỌN
                        </span>
                      ) : isDiscounted ? (
                        <span className="absolute -top-2.5 right-3 bg-rose-500 text-white text-[8px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                          ƯU ĐÃI
                        </span>
                      ) : null}

                      {/* Cột trái: Tên gói & Mô tả */}
                      <div className="flex-1 min-w-0 pr-2">
                        <span className={`text-sm font-bold block truncate ${isSelected ? 'text-[#006953]' : 'text-[#17201f]'}`}>
                          {fmt.title}
                        </span>
                        <span className="text-xs text-gray-500 block mt-0.5">
                          {fmt.subtitle}
                        </span>
                      </div>

                      {/* Cột phải: Giá giảm & Giá gốc bị gạch ở dưới */}
                      <div className="flex flex-col items-end text-right flex-shrink-0">
                        <span className="text-sm sm:text-base font-bold text-[#006953] leading-tight">
                          {fmt.price.toLocaleString('vi-VN')}₫
                        </span>
                        {isDiscounted && (
                          <span className="text-xs text-gray-400 line-through mt-0.5 leading-tight">
                            {fmt.originalPrice.toLocaleString('vi-VN')}₫
                          </span>
                        )}
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
                  <span className={`text-2xl font-bold ${flashSaleInfo || discountPercent > 0 ? 'text-rose-600' : 'text-[#006953]'}`}>
                    {((flashSaleInfo ? flashSaleInfo.salePrice : currentPrice.price) * quantity).toLocaleString('vi-VN')}đ
                  </span>
                  {(flashSaleInfo || currentPrice.originalPrice > currentPrice.price) && (
                    <span className="text-xs text-gray-400 line-through">
                      {((flashSaleInfo ? flashSaleInfo.originalPrice : currentPrice.originalPrice) * quantity).toLocaleString('vi-VN')}đ
                    </span>
                  )}
                </div>
                {(flashSaleInfo || discountPercent > 0) && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="bg-red-50 text-red-600 text-[11px] font-bold px-1.5 py-0.5 rounded">
                      {flashSaleInfo ? `FLASH SALE -${flashSaleInfo.discountPercent}%` : `Tiết kiệm ${discountPercent}%`}
                    </span>
                  </div>
                )}
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
            {!isFollowingStore ? (
              <button
                onClick={handleFollowStore}
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl border border-[#006953] text-[#006953] hover:bg-[#006953]/5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">person_add</span>
                <span>Theo dõi gian hàng</span>
              </button>
            ) : (
              <div className="relative flex-1 md:flex-initial" ref={followDropdownRef}>
                <button
                  onClick={() => setIsFollowDropdownOpen(!isFollowDropdownOpen)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">check</span>
                  <span>Đang theo dõi</span>
                  <span className="material-symbols-outlined text-xs">expand_more</span>
                </button>

                {isFollowDropdownOpen && (
                  <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                    {/* Option 1: Nhắn tin (disabled) */}
                    <div
                      className="w-full px-3 py-2 rounded-lg text-xs font-medium text-gray-400 flex items-center justify-between cursor-not-allowed select-none bg-gray-50/50 mb-1"
                      title="Chức năng nhắn tin đang được phát triển"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-gray-400">chat</span>
                        <span>Nhắn tin</span>
                      </div>
                      <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold">
                        Sắp ra mắt
                      </span>
                    </div>

                    {/* Option 2: Hủy theo dõi */}
                    <button
                      onClick={() => {
                        setIsFollowDropdownOpen(false);
                        setIsUnfollowModalOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer text-left"
                    >
                      <span className="material-symbols-outlined text-sm text-rose-600">person_remove</span>
                      <span>Hủy theo dõi</span>
                    </button>
                  </div>
                )}
              </div>
            )}
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
            <button onClick={() => setActiveTab('preview')} className={`py-4 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${activeTab === 'preview' ? 'border-[#006953] text-[#006953] font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}><span className="material-symbols-outlined text-base">chrome_reader_mode</span>Đọc Thử Mẫu</button>
            <button onClick={() => setActiveTab('reviews')} className={`py-4 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${activeTab === 'reviews' ? 'border-[#006953] text-[#006953] font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}><span className="material-symbols-outlined text-base">star</span>Đánh Giá ({(book.reviewCount || 1240).toLocaleString('vi-VN')})</button>
          </div>

          {activeTab === 'intro' && (
            <div className="p-6 sm:p-8 space-y-6">
              {/* Mô tả sách có Xem thêm / Thu gọn */}
              <div className="space-y-3">
                <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                  <p className={!isDescriptionExpanded ? 'line-clamp-2' : ''}>
                    {book.description || 'Chưa có thông tin mô tả chi tiết cho cuốn sách này.'}
                  </p>
                </div>
                {book.description && book.description.length > 120 && (
                  <button
                    type="button"
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#006953] hover:underline cursor-pointer pt-1"
                  >
                    <span>{isDescriptionExpanded ? 'Thu gọn' : 'Xem thêm'}</span>
                    <span className="material-symbols-outlined text-sm">
                      {isDescriptionExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                )}
              </div>

              {/* Thông tin chi tiết & pháp lý xuất bản thật từ database */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="font-bold text-sm text-[#17201f] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006953] text-base">info</span>
                  Thông Tin Chi Tiết &amp; Pháp Lý Xuất Bản
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Nhà xuất bản / Đơn vị phát hành:</span>
                    <Link href={`/shop/${publisherProfile.slug || publisherProfile.id}`} className="font-semibold text-[#006953] hover:underline">
                      {book.publisher}
                    </Link>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Tác giả / Dịch giả:</span>
                    <span className="font-semibold text-gray-800">{book.author}</span>
                  </div>
                  {book.isbn && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Mã chuẩn quốc tế (ISBN):</span>
                      <span className="font-mono font-semibold text-gray-800">{book.isbn}</span>
                    </div>
                  )}
                  {book.category && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Thể loại phân mục:</span>
                      <span className="font-semibold text-gray-800">{book.category}</span>
                    </div>
                  )}
                  {(realBook?.physicalDetails?.pageCount || (!realBook && book.pages)) && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Số trang sách in:</span>
                      <span className="font-semibold text-gray-800">{realBook?.physicalDetails?.pageCount || book.pages} trang</span>
                    </div>
                  )}
                  {(realBook?.physicalDetails?.weight || realBook?.physicalDetails?.dimensions) && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Trọng lượng &amp; Quy cách:</span>
                      <span className="font-semibold text-gray-800">
                        {realBook.physicalDetails.weight ? `${realBook.physicalDetails.weight}g` : ''}
                        {realBook.physicalDetails.dimensions ? ` (${realBook.physicalDetails.dimensions})` : ''}
                      </span>
                    </div>
                  )}
                </div>
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

      {/* Modal Popup Xác Nhận Hủy Theo Dõi (Đếm ngược 5s) */}
      {isUnfollowModalOpen && (
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 relative animate-in fade-in zoom-in-95 duration-150">
            {/* Icon Warning */}
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <span className="material-symbols-outlined text-2xl">person_remove</span>
            </div>

            {/* Title & Body */}
            <h3 className="font-bold text-center text-gray-900 text-lg mb-2">
              Xác Nhận Hủy Theo Dõi Gian Hàng
            </h3>
            <p className="text-xs sm:text-sm text-center text-gray-600 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn hủy theo dõi gian hàng{' '}
              <strong className="text-gray-900">{publisherProfile.name}</strong> không? Bạn sẽ không còn nhận được các thông báo cập nhật sách mới và ưu đãi độc quyền từ gian hàng này.
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsUnfollowModalOpen(false)}
                disabled={isUnfollowing}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Đóng / Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmUnfollow}
                disabled={unfollowCountdown > 0 || isUnfollowing}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                  unfollowCountdown > 0 || isUnfollowing
                    ? 'bg-gray-400 cursor-not-allowed opacity-80'
                    : 'bg-rose-600 hover:bg-rose-700 cursor-pointer'
                }`}
              >
                {isUnfollowing ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Đang xử lý...</span>
                  </>
                ) : unfollowCountdown > 0 ? (
                  <>
                    <span className="material-symbols-outlined text-sm">timer</span>
                    <span>Xác nhận ({unfollowCountdown}s)</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">check</span>
                    <span>Xác nhận hủy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
