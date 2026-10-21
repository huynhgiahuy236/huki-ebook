'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import AccountLayout from '@/ui/components/layout/AccountLayout';
import { useToast } from '@/ui/context/ToastContext';
import { affiliateApi } from '@/lib/affiliate/affiliateApi';

interface AffiliateBookItem {
  bookId: string;
  id: string;
  title: string;
  slug: string;
  cover: string | null;
  coverImage: string | null;
  coverUrl: string | null;
  price: number;
  format: string;
  storeId: string;
  effectiveRate: number;
  estimatedCommissionAmount: number;
  existingShortUrl: string | null;
}

export default function AffiliateMarketplacePage() {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [books, setBooks] = useState<AffiliateBookItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [format, setFormat] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  // Link & QR Modal State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [generatingBookId, setGeneratingBookId] = useState<string | null>(null);
  const [qrModalData, setQrModalData] = useState<{
    url: string;
    shortCode: string;
    originalUrl?: string;
    title?: string;
  } | null>(null);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await affiliateApi.getAffiliateCatalog({
        search: search.trim() || undefined,
        format: format !== 'ALL' ? format : undefined,
        page,
        limit: 12,
        sortBy,
      });

      if (res.success && res.data) {
        setBooks(res.data.items || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      } else {
        setBooks([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch {
      showToast('Không thể tải kho sách tiếp thị. Vui lòng thử lại sau.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, format, page, sortBy, showToast]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleCopy = (text: string, key: string, label: string = 'liên kết') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Đã sao chép ${label} vào bộ nhớ tạm!`, 'success');
    setTimeout(() => {
      setCopiedKey(null);
    }, 2500);
  };

  const handleCreateBookLink = async (book: AffiliateBookItem) => {
    setGeneratingBookId(book.id);
    const targetUrl = `/book/${book.slug || book.id}`;

    try {
      const res = await affiliateApi.createAffiliateLink({
        targetUrl,
        targetBookId: book.id,
        campaignName: `Book_${book.title.slice(0, 15)}`,
      });

      if (res.success && res.data) {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3100';
        const fullShortUrl = `${origin}${res.data.shortUrl}`;

        // 1. Copy to clipboard
        handleCopy(fullShortUrl, `book_${book.id}`, `link tiếp thị cho sách "${book.title}"`);

        // 2. Open QR & Test Link Modal
        setQrModalData({
          url: fullShortUrl,
          shortCode: res.data?.shortCode || '',
          originalUrl: targetUrl,
          title: book.title,
        });

        // 3. Update existing shortUrl in local state
        setBooks((prev) =>
          prev.map((b) =>
            b.id === book.id ? { ...b, existingShortUrl: res.data?.shortUrl || null } : b
          )
        );
      } else {
        showToast(res.error?.message || 'Không thể tạo liên kết cho cuốn sách này.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi tạo liên kết tiếp thị.', 'error');
    } finally {
      setGeneratingBookId(null);
    }
  };

  return (
    <AccountLayout>
      <div className="w-full space-y-6 font-sans p-2 sm:p-4">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Link
                href="/account/affiliate/application"
                className="text-xs text-gray-500 hover:text-emerald-700 font-semibold flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Hub Đối Tác</span>
              </Link>
              <span className="text-gray-300">/</span>
              <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Kho Sách Tiếp Thị
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-700 text-[26px]">storefront</span>
              <span>Kho Sách Tiếp Thị &amp; Mức Hoa Hồng Thực Tế</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Danh mục các đầu sách từ những gian hàng <strong>đang mở chương trình tiếp thị liên kết</strong>. Bấm &quot;Lấy Link Tiếp Thị&quot; để tạo link rút gọn và chia sẻ nhận hoa hồng.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/account/affiliate/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">dashboard</span>
              <span>Bảng Điều Khiển</span>
            </Link>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="md:col-span-5 flex items-center gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm tựa sách..."
                  className="w-full h-10 pl-9 pr-3 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 transition-all"
                />
              </div>
              <button
                type="submit"
                className="h-10 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
              >
                Tìm kiếm
              </button>
            </form>

            {/* Format Filter */}
            <div className="md:col-span-4 flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-600 shrink-0">Định dạng:</label>
              <select
                value={format}
                onChange={(e) => {
                  setFormat(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 cursor-pointer"
              >
                <option value="ALL">Tất cả định dạng sách</option>
                <option value="PHYSICAL">Sách in giấy (Physical)</option>
                <option value="DIGITAL">Sách điện tử (Ebook)</option>
                <option value="BOTH">Sách kết hợp (Cả giấy &amp; số)</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="md:col-span-3 flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-600 shrink-0">Sắp xếp:</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 cursor-pointer"
              >
                <option value="newest">Mới cập nhật nhất</option>
                <option value="price_asc">Giá bán thấp đến cao</option>
                <option value="price_desc">Giá bán cao đến thấp</option>
                <option value="oldest">Cũ nhất</option>
              </select>
            </div>
          </div>

          {/* Active Filter Indicators */}
          {(search || format !== 'ALL') && (
            <div className="flex items-center gap-2 pt-1 border-t border-gray-100 text-xs">
              <span className="text-gray-400">Đang lọc theo:</span>
              {search && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-medium border border-emerald-200">
                  Từ khóa: &quot;{search}&quot;
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setSearchInput('');
                      setPage(1);
                    }}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}
              {format !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-medium border border-emerald-200">
                  {format === 'PHYSICAL'
                    ? 'Sách in giấy'
                    : format === 'DIGITAL'
                    ? 'Sách điện tử'
                    : 'Sách kết hợp'}
                  <button
                    type="button"
                    onClick={() => {
                      setFormat('ALL');
                      setPage(1);
                    }}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                  setFormat('ALL');
                  setPage(1);
                }}
                className="text-xs text-gray-500 hover:text-red-600 underline ml-2 cursor-pointer"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          )}
        </div>

        {/* Books Catalog Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span>
              Tìm thấy <strong className="text-gray-900 font-bold">{total}</strong> cuốn sách đủ điều kiện tiếp thị
            </span>
            <span>
              Trang {page} / {totalPages}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3 animate-pulse"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-24 rounded-lg bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-4 bg-gray-200 rounded w-4/5" />
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-8 bg-gray-100 rounded-lg" />
                  <div className="h-10 bg-gray-200 rounded-xl" />
                </div>
              ))}
            </div>
          ) : books.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-gray-200 space-y-3">
              <span className="material-symbols-outlined text-[42px] text-gray-300">menu_book</span>
              <h3 className="text-sm font-bold text-gray-900">Không tìm thấy cuốn sách nào</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Hiện tại không có sách nào phù hợp với bộ lọc tìm kiếm của bạn, hoặc các gian hàng chưa bật chương trình tiếp thị liên kết.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                  setFormat('ALL');
                  setPage(1);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((book) => {
                const cover = book.cover || book.coverUrl || book.coverImage;
                const isGenerating = generatingBookId === book.id;

                return (
                  <div
                    key={book.id}
                    className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-emerald-400 hover:shadow-xs transition-all flex flex-col justify-between space-y-3.5"
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Cover */}
                      <div className="w-16 h-24 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200 shadow-2xs">
                        {cover ? (
                          <img
                            src={cover}
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <span className="material-symbols-outlined text-[24px]">book</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                          {book.format === 'DIGITAL'
                            ? 'SÁCH ĐIỆN TỬ (EBOOK)'
                            : book.format === 'PHYSICAL'
                            ? 'SÁCH IN GIẤY'
                            : 'SÁCH KẾT HỢP'}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 leading-snug" title={book.title}>
                          {book.title}
                        </h3>
                        <span className="text-xs sm:text-sm font-black text-gray-900 block">
                          {(book.price || 0).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>

                    {/* Commission Box */}
                    <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 flex items-center justify-between text-xs">
                      <span className="text-gray-600 text-[11px] font-medium">Hoa hồng:</span>
                      <div className="text-right">
                        <span className="font-extrabold text-emerald-700 text-xs">
                          {book.effectiveRate}%
                        </span>
                        <span className="text-[11px] text-gray-600 font-semibold ml-1">
                          (~{book.estimatedCommissionAmount.toLocaleString('vi-VN')} đ)
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => handleCreateBookLink(book)}
                      className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <span className="material-symbols-outlined text-[16px] animate-spin">
                            progress_activity
                          </span>
                          <span>Đang tạo link...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">share</span>
                          <span>Lấy Link Tiếp Thị</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6 pb-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                <span>Trang trước</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                  let pageNum = idx + 1;
                  if (totalPages > 5 && page > 3) {
                    pageNum = page - 2 + idx;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - idx);
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        page === pageNum
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                <span>Trang sau</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          )}
        </div>

        {/* QR Code Preview & Link Details Modal */}
        {qrModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-emerald-700">qr_code_2</span>
                  <span>Mã QR &amp; Chi Tiết Liên Kết Tiếp Thị</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setQrModalData(null)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center space-y-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    qrModalData.url
                  )}`}
                  alt="QR Code"
                  className="w-44 h-44 rounded-lg bg-white p-2 border border-gray-200 shadow-2xs"
                />
                <span className="font-mono text-[11px] text-gray-700 font-semibold break-all max-w-sm px-2">
                  {qrModalData.url}
                </span>
              </div>

              {/* URL Breakdown & Destination Explanation */}
              <div className="text-left bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-2 text-xs">
                {qrModalData.title && (
                  <div className="border-b border-emerald-100 pb-1.5">
                    <span className="text-gray-500 block text-[10px]">Tựa sách:</span>
                    <strong className="text-gray-900 font-bold block">{qrModalData.title}</strong>
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-gray-500 shrink-0">Mã liên kết:</span>
                  <span className="font-mono font-bold text-emerald-900 break-all text-right">
                    {qrModalData.shortCode}
                  </span>
                </div>
                {qrModalData.originalUrl && (
                  <div className="flex items-start justify-between gap-2 border-t border-emerald-100 pt-1.5">
                    <span className="text-gray-500 shrink-0">Trang đích thực tế:</span>
                    <span className="font-mono text-gray-800 text-[11px] break-all text-right font-medium">
                      {qrModalData.originalUrl}
                    </span>
                  </div>
                )}
                <div className="border-t border-emerald-100 pt-1.5 text-[11px] text-emerald-800 leading-relaxed">
                  💡 <strong>Cách hoạt động:</strong> Khi độc giả click link hoặc quét mã QR này, hệ thống sẽ tự động chuyển hướng độc giả sang trang sách đích trên HuKi và ghi nhận hoa hồng cho bạn trong 30 ngày!
                </div>
              </div>

              <div className="pt-2 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(qrModalData.url, 'qr_url', 'link mã QR')}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">content_copy</span>
                  <span>{copiedKey === 'qr_url' ? 'Đã Chép!' : 'Sao Chép Link'}</span>
                </button>
                <a
                  href={qrModalData.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                  <span>Mở Thử Nghiệm</span>
                </a>
                <button
                  type="button"
                  onClick={() => setQrModalData(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
