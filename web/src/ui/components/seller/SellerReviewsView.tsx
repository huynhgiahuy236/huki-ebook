'use client';

/**
 * HUKI EBOOK - Seller Reviews View (Quản Lý Đánh Giá & Nhận Xét)
 * Quản lý, lọc và phản hồi đánh giá khách hàng (Real Data / No Mock Fallback)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { catalogApi } from '@/ui/api/catalogApi';
import { businessApi } from '@/ui/api/businessApi';
import { reviewApi, ReviewItemData, ReviewReplyItem } from '@/ui/api/reviewApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import {
  SellerTableContainer,
  SellerStatusBadge,
  SellerActionButton,
  SellerFilterTabs,
  SellerPagination,
} from '@/ui/components/seller/SellerUI';
import { VerifiedPurchaseBadge } from '@/ui/components/review/VerifiedPurchaseBadge';
import GroupedDataTable, { Column } from '@/ui/components/common/GroupedDataTable';
import {
  DataTableFilterBar,
  DateFilterValue,
  matchesDateFilter,
  BulkActionGroup,
} from '@/ui/components/common';

const reviewBulkActionGroups: BulkActionGroup[] = [
  {
    groupLabel: 'XUẤT DỮ LIỆU',
    actions: [
      { value: 'EXPORT_CSV', label: 'Xuất danh sách đánh giá (.csv)' },
    ],
  },
];

interface ReviewRowItem extends ReviewItemData {
  bookTitle?: string;
  bookCover?: string;
  bookAuthor?: string;
  storeName?: string;
}

export function SellerReviewsView() {
  const router = useRouter();
  const { user, activeBusinessId } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewRowItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<string>('ALL');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'PHYSICAL' | 'DIGITAL'>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'ALL_TIME' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modal / Detail state
  const [selectedReview, setSelectedReview] = useState<ReviewRowItem | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [sellerBookIds, setSellerBookIds] = useState<Set<string>>(new Set());
  const [sellerStoreIds, setSellerStoreIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    }
    try {
      let bizId = user?.business?.id || activeBusinessId;
      if (!bizId) {
        try {
          const myBiz = await businessApi.getMyBusiness();
          if (myBiz.success && myBiz.data?.id) {
            bizId = myBiz.data.id;
          }
        } catch { /* ignore */ }
      }

      // 1. Fetch seller stores and seller books
      const [storesRes, ownedBooksRes, publicBooksRes] = await Promise.all([
        (bizId ? businessApi.getMyStores(bizId) : businessApi.getPublicStores({ limit: 50 })).catch(() => ({ success: false, data: [] })),
        catalogApi.getSellerBooks({ limit: 100, ...(bizId ? { business: bizId } : {}) }).catch(() => ({ success: false, data: [] })),
        catalogApi.getPublicBooks({ limit: 100, ...(bizId ? { business: bizId } : {}) }).catch(() => ({ success: false, data: [] })),
      ]);

      const stores = (storesRes.success && Array.isArray(storesRes.data)) ? storesRes.data : [];
      
      const extractItems = (resData: any): any[] => {
        if (!resData) return [];
        if (Array.isArray(resData)) return resData;
        if (Array.isArray(resData.items)) return resData.items;
        if (Array.isArray(resData.data)) return resData.data;
        return [];
      };

      const allExtractedBooks = [
        ...extractItems(ownedBooksRes?.data),
        ...extractItems(publicBooksRes?.data),
      ];
      const booksMapById = new Map<string, any>();
      allExtractedBooks.forEach((b: any) => {
        if (b?.id && !booksMapById.has(b.id)) {
          booksMapById.set(b.id, b);
        }
      });
      const books: any[] = Array.from(booksMapById.values());

      const bookIdsSet = new Set<string>();
      const storeIdsSet = new Set<string>();

      stores.forEach((s: any) => {
        if (s.id) {
          storeIdsSet.add(String(s.id).toLowerCase());
          storeIdsSet.add(String(s.id));
        }
      });

      const booksMap = new Map<string, { title: string; cover?: string; author?: string }>();
      books.forEach((b: any) => {
        if (b.id) {
          const authorName = typeof b.author === 'string' ? b.author : b.author?.name || 'Tác giả HUKI';
          const meta = {
            title: b.title,
            cover: b.cover || b.coverImage || b.coverUrl,
            author: authorName,
          };
          bookIdsSet.add(String(b.id).toLowerCase());
          bookIdsSet.add(String(b.id));
          booksMap.set(b.id, meta);
          booksMap.set(String(b.id).toLowerCase(), meta);
          if (b.slug) {
            booksMap.set(b.slug, meta);
            booksMap.set(String(b.slug).toLowerCase(), meta);
          }
        }
      });

      setSellerBookIds(bookIdsSet);
      setSellerStoreIds(storeIdsSet);

      const storesMap = new Map<string, string>();
      stores.forEach((s: any) => {
        storesMap.set(s.id, s.name);
        storesMap.set(String(s.id).toLowerCase(), s.name);
      });

      // 2. Helper to extract review items from varied response wrappers
      const extractReviewList = (res: any): ReviewRowItem[] => {
        if (!res) return [];
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data?.data)) return res.data.data;
        if (Array.isArray(res.data?.items)) return res.data.items;
        if (Array.isArray(res)) return res;
        return [];
      };

      // 3. Fetch real reviews for all books and stores
      const fetchPromises: Promise<any>[] = [];

      // Fetch book reviews
      books.forEach((b: any) => {
        fetchPromises.push(
          reviewApi.getBookReviews(b.id, { limit: 50 }).then((res) => {
            const list = extractReviewList(res);
            return list.map((r: any) => ({
              ...r,
              bookTitle: booksMap.get(b.id)?.title || b.title,
              bookCover: booksMap.get(b.id)?.cover || b.cover || b.coverImage || b.coverUrl,
              bookAuthor: booksMap.get(b.id)?.author || 'Tác giả HUKI',
            }));
          }).catch(() => [])
        );
      });

      // Fetch store reviews
      stores.forEach((s: any) => {
        fetchPromises.push(
          reviewApi.getStoreReviews(s.id, { limit: 50 }).then((res) => {
            const list = extractReviewList(res);
            return list.map((r: any) => ({
              ...r,
              storeName: storesMap.get(s.id) || s.name,
            }));
          }).catch(() => [])
        );
      });

      const results = await Promise.all(fetchPromises);
      const apiReviews: ReviewRowItem[] = results.flat();

      // Deduplicate by ID
      const seenIds = new Set<string>();
      const allReviews: ReviewRowItem[] = [];

      for (const r of apiReviews) {
        if (!seenIds.has(r.id)) {
          seenIds.add(r.id);
          allReviews.push(r);
        }
      }

      // Sort newest first
      allReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setReviews(allReviews);
    } catch (error) {
      console.error('Error loading seller reviews:', error);
      if (!isSilent) {
        showToast('Không thể tải danh sách đánh giá', 'error');
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, [user, activeBusinessId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time synchronization: Auto-refresh interval (10s) & cross-tab events
  useEffect(() => {
    const handleSync = () => {
      loadData(true);
    };

    window.addEventListener('huki_review_created', handleSync);
    window.addEventListener('huki_review_reply_created', handleSync);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'huki_review_sync') {
        loadData(true);
      }
    };
    window.addEventListener('storage', handleStorage);

    // Auto-polling when active tab (silent background update without re-triggering spinner)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadData(true);
      }
    }, 10000);

    return () => {
      window.removeEventListener('huki_review_created', handleSync);
      window.removeEventListener('huki_review_reply_created', handleSync);
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [loadData]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return {
        total: 0,
        averageRating: '0.0',
        positivePercentage: 0,
        repliedCount: 0,
        repliedPercentage: 0,
        starCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        unrepliedCount: 0,
      };
    }

    let ratingSum = 0;
    let positiveCount = 0;
    let repliedCount = 0;
    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    reviews.forEach((r) => {
      ratingSum += r.rating || 0;
      if (r.rating === 5 || r.rating === 4) positiveCount++;
      if (r.replies && r.replies.length > 0) repliedCount++;
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 5))) as 1 | 2 | 3 | 4 | 5;
      starCounts[star] = (starCounts[star] || 0) + 1;
    });

    const averageRating = (ratingSum / total).toFixed(1);
    const positivePercentage = Math.round((positiveCount / total) * 100);
    const repliedPercentage = Math.round((repliedCount / total) * 100);
    const unrepliedCount = total - repliedCount;

    return {
      total,
      averageRating,
      positivePercentage,
      repliedCount,
      repliedPercentage,
      starCounts,
      unrepliedCount,
    };
  }, [reviews]);

  // Filter Tabs definition
  const filterTabs = useMemo(() => [
    { id: 'ALL', label: 'Tất Cả', count: stats.total },
    { id: 'UNREPLIED', label: 'Chưa Phản Hồi', count: stats.unrepliedCount },
    { id: 'REPLIED', label: 'Đã Phản Hồi', count: stats.repliedCount },
    { id: '5_STAR', label: '5 Sao ★', count: stats.starCounts[5] },
    { id: '4_STAR', label: '4 Sao ★', count: stats.starCounts[4] },
    { id: '3_STAR', label: '3 Sao ★', count: stats.starCounts[3] },
    { id: '2_STAR', label: '2 Sao ★', count: stats.starCounts[2] },
    { id: '1_STAR', label: '1 Sao ★', count: stats.starCounts[1] },
  ], [stats]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Tab filter
      if (filterTab === '5_STAR' && r.rating !== 5) return false;
      if (filterTab === '4_STAR' && r.rating !== 4) return false;
      if (filterTab === '3_STAR' && r.rating !== 3) return false;
      if (filterTab === '2_STAR' && r.rating !== 2) return false;
      if (filterTab === '1_STAR' && r.rating !== 1) return false;
      if (filterTab === 'UNREPLIED' && r.replies && r.replies.length > 0) return false;
      if (filterTab === 'REPLIED' && (!r.replies || r.replies.length === 0)) return false;

      // Format filter
      if (formatFilter !== 'ALL' && r.format !== formatFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesBook = r.bookTitle?.toLowerCase().includes(q);
        const matchesAuthor = r.bookAuthor?.toLowerCase().includes(q);
        const matchesCustomer = r.author?.fullName?.toLowerCase().includes(q);
        const matchesTitle = r.title?.toLowerCase().includes(q);
        const matchesContent = r.content?.toLowerCase().includes(q);
        if (!matchesBook && !matchesAuthor && !matchesCustomer && !matchesTitle && !matchesContent) {
          return false;
        }
      }

      // Date filter
      if (!matchesDateFilter(r.createdAt, dateFilter)) return false;

      return true;
    });
  }, [reviews, filterTab, formatFilter, searchQuery, dateFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredReviews.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReviews.map((r) => r.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExecuteBulkAction = async (actionId: string) => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      if (actionId === 'EXPORT_CSV') {
        const selected = reviews.filter((r) => selectedIds.includes(r.id));
        const headers = ['Mã Đánh Giá', 'Sản Phẩm', 'Khách Hàng', 'Số Sao', 'Tiêu Đề', 'Nội Dung', 'Định Dạng', 'Đã Phản Hồi', 'Ngày Đánh Giá'];
        const rows = selected.map((r) => [
          r.id,
          `"${(r.bookTitle || '').replace(/"/g, '""')}"`,
          `"${(r.author?.fullName || 'Khách hàng').replace(/"/g, '""')}"`,
          r.rating || 5,
          `"${(r.title || '').replace(/"/g, '""')}"`,
          `"${(r.content || '').replace(/"/g, '""')}"`,
          r.format === 'DIGITAL' ? 'Ebook' : 'Sách in',
          r.replies && r.replies.length > 0 ? 'CÓ' : 'CHƯA',
          r.createdAt || '',
        ].join(','));
        const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Danh_Sach_Danh_Gia_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showToast({ title: 'Xuất file thành công', message: `Đã xuất ${selected.length} dòng đánh giá.` }, 'success');
      }
    } catch (err: any) {
      showToast({ title: 'Lỗi', message: err.message || 'Thao tác thất bại' }, 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / pageSize));
  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReviews.slice(start, start + pageSize);
  }, [filteredReviews, currentPage, pageSize]);


  const reviewColumns: Column<ReviewRowItem>[] = useMemo(
    () => [
      {
        key: 'product',
        title: 'Sản Phẩm & Phân Loại',
        minWidth: 240,
        render: (_val, rev) => (
          <div className="flex items-start gap-2.5 py-1">
            {rev.bookCover ? (
              <div className="w-9 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-2xs">
                <img src={rev.bookCover} alt={rev.bookTitle || 'Book'} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-9 h-12 rounded-lg bg-emerald-50 text-[#00875A] border border-emerald-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg">storefront</span>
              </div>
            )}
            <div className="min-w-0">
              <span
                className="font-bold text-slate-900 block break-words line-clamp-2 leading-snug text-xs hover:text-[#00875A] transition-colors"
                title={rev.bookTitle || rev.storeName || 'Đánh giá gian hàng'}
              >
                {rev.bookTitle || rev.storeName || 'Đánh giá gian hàng'}
              </span>
              {rev.bookAuthor && (
                <span className="text-[11px] text-slate-400 block truncate mt-0.5" title={rev.bookAuthor}>
                  {rev.bookAuthor}
                </span>
              )}
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                {rev.format === 'DIGITAL' ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-[10px] font-bold">
                    <span className="material-symbols-outlined text-[11px]">bolt</span>
                    Ebook
                  </span>
                ) : rev.format === 'PHYSICAL' ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200/60 text-[10px] font-bold">
                    <span className="material-symbols-outlined text-[11px]">menu_book</span>
                    Sách In
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'author',
        title: 'Khách Hàng & Đánh Giá',
        width: 190,
        render: (_val, rev) => (
          <div className="py-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center font-bold text-slate-600 text-xs">
                {rev.author?.avatar ? (
                  <img src={rev.author.avatar} alt={rev.author.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span>{rev.author?.fullName?.charAt(0)?.toUpperCase() || 'U'}</span>
                )}
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 block truncate text-xs" title={rev.author?.fullName}>
                  {rev.author?.fullName || 'Khách hàng ẩn danh'}
                </span>
                {rev.verifiedPurchase && (
                  <div className="mt-0.5">
                    <VerifiedPurchaseBadge variant="compact" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[#fea619]">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className={`material-symbols-outlined text-[13px] ${
                    i <= (rev.rating || 5) ? 'text-[#fea619]' : 'text-slate-200'
                  }`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
              ))}
              <span className="font-bold text-slate-800 text-[11px] ml-1">{rev.rating} sao</span>
            </div>
          </div>
        ),
      },
      {
        key: 'content',
        title: 'Nội Dung Nhận Xét',
        minWidth: 260,
        render: (_val, rev) => (
          <div className="py-1 text-xs space-y-1">
            {rev.title && (
              <span className="font-bold text-slate-900 block break-words line-clamp-1 text-xs">
                {rev.title}
              </span>
            )}
            <p className="text-slate-600 break-words line-clamp-2 leading-snug font-normal text-xs">
              {rev.content || 'Độc giả không để lại nhận xét chi tiết.'}
            </p>
            {rev.images && rev.images.length > 0 && (
              <div className="flex items-center gap-1 pt-0.5">
                {rev.images.slice(0, 3).map((img: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImage(img.url);
                    }}
                    className="w-7 h-7 rounded border border-slate-200 overflow-hidden shrink-0 cursor-pointer hover:opacity-80"
                  >
                    <img src={img.url} alt="Review attachment" className="w-full h-full object-cover" />
                  </div>
                ))}
                {rev.images.length > 3 && (
                  <span className="text-[10px] text-slate-400 font-bold">+{rev.images.length - 3}</span>
                )}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'reply',
        title: 'Phản Hồi Shop',
        width: 140,
        align: 'center',
        render: (_val, rev) => {
          const hasReplies = rev.replies && rev.replies.length > 0;
          return hasReplies ? (
            <SellerStatusBadge variant="success" icon="check_circle">
              Đã phản hồi
            </SellerStatusBadge>
          ) : (
            <SellerStatusBadge variant="warning" icon="hourglass_empty">
              Chưa phản hồi
            </SellerStatusBadge>
          );
        },
      },
      {
        key: 'actions',
        title: 'Thao Tác',
        width: 130,
        align: 'right',
        render: (_val, rev) => (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setSelectedReview(rev)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">rate_review</span>
              <span>Chi Tiết</span>
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const renderExpandedReviewDetail = (rev: ReviewRowItem) => {
    const hasReplies = rev.replies && rev.replies.length > 0;
    const latestReply = hasReplies ? rev.replies[rev.replies.length - 1] : null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white rounded-xl p-4 border border-emerald-200/70 shadow-xs">
        {/* Card 1: Khách hàng & Đơn mua */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
            <span className="material-symbols-outlined text-[16px] text-amber-600">person</span>
            <span>Khách Hàng &amp; Đơn Hàng</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Khách hàng:</span>
              <span className="font-semibold text-slate-900">{rev.author?.fullName || 'Khách hàng ẩn danh'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Đã mua hàng:</span>
              <span className="font-semibold text-emerald-700">
                {rev.verifiedPurchase ? 'Đã xác thực trên sàn' : 'Chưa xác thực'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ngày gửi:</span>
              <span className="font-mono text-slate-800">
                {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Nội dung nhận xét đầy đủ */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">rate_review</span>
            <span>Nhận Xét Chi Tiết</span>
          </div>
          <div className="space-y-1 text-xs">
            {rev.title && <div className="font-bold text-slate-900">{rev.title}</div>}
            <p className="text-slate-700 break-words leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
              {rev.content || 'Độc giả không để lại nhận xét chi tiết.'}
            </p>
          </div>
        </div>

        {/* Card 3: Phản hồi & Thao tác */}
        <div className="space-y-2 flex flex-col justify-between text-xs">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
              <span className="material-symbols-outlined text-[16px] text-blue-600">chat</span>
              <span>Phản Hồi Gian Hàng</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-2">
              {hasReplies
                ? `Đã trả lời: "${latestReply?.content}"`
                : 'Gian hàng chưa phản hồi nhận xét này. Phản hồi nhanh sẽ gia tăng độ uy tín của shop!'}
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setSelectedReview(rev)}
              className="w-full py-2 px-3 bg-[#00875A] hover:bg-[#003B2B] text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[15px]">rate_review</span>
              <span>{hasReplies ? 'Chỉnh Sửa Phản Hồi' : 'Phản Hồi Độc Giả Ngay'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

    return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-16 font-sans animate-in fade-in duration-200 min-w-0 max-w-full overflow-hidden">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-2xl text-[#00875A]">rate_review</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Đánh Giá &amp; Nhận Xét Độc Giả
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Quản lý toàn bộ đánh giá thực tế từ người mua sách in và ebook bản quyền trên HUKI
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData(false)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
        >
          <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin text-[#00875A]' : ''}`}>
            refresh
          </span>
          <span>Làm Mới</span>
        </button>
      </div>

      {/* 2. Overview Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Tổng đánh giá */}
        <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Tổng Đánh Giá
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {stats.total.toLocaleString('vi-VN')}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Đã xác thực POL-13</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#00875A] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">verified_user</span>
          </div>
        </div>

        {/* Card 2: Điểm trung bình */}
        <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Điểm Trung Bình
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {stats.averageRating}
              </span>
              <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
            </div>
            <div className="flex items-center gap-0.5 text-[#fea619] mt-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className={`material-symbols-outlined text-[13px] ${
                    i <= Math.round(Number(stats.averageRating)) && Number(stats.averageRating) > 0
                      ? 'text-[#fea619]'
                      : 'text-slate-200'
                  }`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
              ))}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">hotel_class</span>
          </div>
        </div>

        {/* Card 3: Đánh giá tích cực */}
        <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Tỷ Lệ Hài Lòng
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">
              {stats.positivePercentage}%
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {stats.starCounts[5] + stats.starCounts[4]} đánh giá 4★ &amp; 5★
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">thumb_up</span>
          </div>
        </div>

        {/* Card 4: Tỷ lệ phản hồi */}
        <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Tỷ Lệ Phản Hồi
            </span>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600">
              {stats.repliedPercentage}%
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {stats.repliedCount}/{stats.total} đã trả lời
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">forum</span>
          </div>
        </div>
      </div>

      {/* 3. Controls & Filter Bar with Split Date Filter and Integrated Bulk Actions */}
      <DataTableFilterBar
        searchPlaceholder="Tìm theo tên sách, tác giả, khách hàng, nội dung..."
        searchQuery={searchQuery}
        onSearchChange={(v: string) => {
          setSearchQuery(v);
          setCurrentPage(1);
        }}
        className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs"
        tabs={filterTabs.map((t) => ({ key: t.id, label: t.label, count: t.count }))}
        activeTab={filterTab}
        onTabChange={(tab: string) => {
          setFilterTab(tab);
          setCurrentPage(1);
        }}
        extraFilters={
          <select
            value={formatFilter}
            onChange={(e) => {
              setFormatFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="h-9 px-3 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="ALL">Tất Cả Định Dạng</option>
            <option value="PHYSICAL">Sách In</option>
            <option value="DIGITAL">Ebook</option>
          </select>
        }
        dateFilter={dateFilter}
        onDateFilterChange={(v: DateFilterValue) => {
          setDateFilter(v);
          setCurrentPage(1);
        }}
        bulkActionGroups={reviewBulkActionGroups}
        selectedCount={selectedIds.length}
        totalCount={filteredReviews.length}
        onExecuteBulkAction={handleExecuteBulkAction}
        onClearSelection={() => setSelectedIds([])}
        bulkLoading={bulkLoading}
        itemName="đánh giá"
      />

      {/* 4. Grouped Data Table Standardized */}
      <GroupedDataTable<ReviewRowItem>
        columns={reviewColumns}
        data={paginatedReviews}
        keyField="id"
        loading={loading}
        selectable={true}
        selectedRowKeys={selectedIds}
        onSelectionChange={(keys) => setSelectedIds(keys as string[])}
        expandable={true}
        expandedRowRender={renderExpandedReviewDetail}
        emptyTitle="Chưa có đánh giá nào"
        emptyMessage={
          searchQuery
            ? `Không tìm thấy đánh giá khớp với từ khóa "${searchQuery}"`
            : 'Gian hàng hiện chưa có đánh giá nào từ độc giả.'
        }
        emptyIcon="rate_review"
        pagination={{
          currentPage,
          totalPages,
          totalItems: filteredReviews.length,
          pageSize: 10,
          onPageChange: setCurrentPage,
          itemLabel: 'đánh giá',
        }}
        className="w-full"
      />

      {/* 6. Review Detail & Reply Modal */}
      {selectedReview && (
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative my-8 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#00875A] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-lg">rate_review</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Chi Tiết Đánh Giá</h3>
                  <span className="text-[11px] text-slate-400">Mã ID: {selectedReview.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="overflow-y-auto custom-scrollbar flex-1 py-4 space-y-5 pr-1">
              {/* Product Info Banner */}
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                {selectedReview.bookCover ? (
                  <img
                    src={selectedReview.bookCover}
                    alt={selectedReview.bookTitle}
                    className="w-12 h-16 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-16 rounded-lg bg-emerald-100/50 text-[#00875A] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl">menu_book</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Sản phẩm được đánh giá
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {selectedReview.bookTitle || selectedReview.storeName || 'Sách'}
                  </h4>
                  {selectedReview.bookAuthor && (
                    <span className="text-xs text-slate-500 block truncate">
                      {selectedReview.bookAuthor}
                    </span>
                  )}
                </div>
                {selectedReview.targetId && (
                  <Link
                    href={`/book/${selectedReview.targetId}`}
                    target="_blank"
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors inline-flex items-center gap-1 shrink-0"
                  >
                    <span>Xem Sách</span>
                    <span className="material-symbols-outlined text-xs">open_in_new</span>
                  </Link>
                )}
              </div>

              {/* Customer Review Card */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm">
                      {selectedReview.author?.avatar ? (
                        <img
                          src={selectedReview.author.avatar}
                          alt={selectedReview.author.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{selectedReview.author?.fullName?.charAt(0)?.toUpperCase() || 'U'}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {selectedReview.author?.fullName || 'Khách hàng'}
                        </span>
                        {selectedReview.verifiedPurchase && <VerifiedPurchaseBadge variant="compact" />}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(selectedReview.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className="flex text-[#fea619]">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span
                          key={i}
                          className={`material-symbols-outlined text-base ${
                            i <= (selectedReview.rating || 5) ? 'text-[#fea619]' : 'text-slate-200'
                          }`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-700 mt-0.5">
                      {selectedReview.rating} / 5.0 sao
                    </span>
                  </div>
                </div>

                {selectedReview.title && (
                  <h5 className="font-bold text-sm text-slate-900 pt-1">
                    {selectedReview.title}
                  </h5>
                )}

                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedReview.content || 'Độc giả không để lại nhận xét nội dung.'}
                </p>

                {/* Review Images */}
                {selectedReview.images && selectedReview.images.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Hình ảnh độc giả đính kèm:
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedReview.images.map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => setPreviewImage(img.url)}
                          className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer hover:opacity-90 hover:scale-105 transition-all shadow-2xs"
                        >
                          <img
                            src={img.url}
                            alt="Attachment"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Existing Replies Thread */}
              {selectedReview.replies && selectedReview.replies.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-[#00875A]">forum</span>
                    Lịch Sử Phản Hồi Từ Gian Hàng ({selectedReview.replies.length}):
                  </span>
                  <div className="space-y-2.5">
                    {selectedReview.replies.map((rep) => (
                      <div
                        key={rep.id}
                        className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#00875A]">
                            <span className="material-symbols-outlined text-sm">storefront</span>
                            <span>{rep.business?.name || user?.business?.name || 'Gian Hàng Chính Thức'}</span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9.5px] font-black uppercase">
                              Shop Phản Hồi
                            </span>
                          </div>
                          <span className="text-[10.5px] text-slate-400">
                            {new Date(rep.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-line">
                          {rep.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Guidance to reply directly on book detail page */}
              {selectedReview.targetId ? (
                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 space-y-3">
                  <div className="flex items-center gap-2 text-[#00875A] font-bold text-xs">
                    <span className="material-symbols-outlined text-base">forum</span>
                    <span>Phản Hồi Trực Tiếp Trên Trang Chi Tiết Sách</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Để đảm bảo tính xác thực và hiển thị nhất quán trên hệ thống, bạn có thể xem đầy đủ và gửi phản hồi công khai đến độc giả tại trang chi tiết cuốn sách này.
                  </p>
                  <Link
                    href={`/book/${selectedReview.targetId}#reviews`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00704A] text-white text-xs font-bold transition-all shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    <span>Đến Trang Chi Tiết Sách Để Phản Hồi</span>
                  </Link>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 text-xs">
                  Đánh giá không gắn với sách cụ thể.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              {selectedReview.targetId && (
                <Link
                  href={`/book/${selectedReview.targetId}#reviews`}
                  className="px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00704A] text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Đến Trang Sách Để Phản Hồi</span>
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </Link>
              )}
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Image Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 w-screen h-screen z-[100000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh]">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/20"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center font-bold shadow-lg hover:scale-110 transition-transform cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
