"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { orderApi } from '@/ui/api/orderApi';
import { useAuth } from '@/ui/context/AuthContext';

export default function OrdersPage() {
  const { user, isLoggedIn } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState<any>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await orderApi.getBuyerOrders({
        page: currentPage,
        limit: pageSize,
      });

      if (res.success && res.data) {
        const rawData: any = res.data;
        const items = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData.data)
          ? rawData.data
          : Array.isArray(rawData.items)
          ? rawData.items
          : [];

        setOrders(items);
        if (rawData.pagination) {
          setPaginationMeta(rawData.pagination);
        } else {
          setPaginationMeta({
            page: currentPage,
            limit: pageSize,
            total: items.length,
            totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
          });
        }
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Vietnamese Status Translator & Badge Styling (Đồng bộ 100% với trang chi tiết /orders/[id])
  const getStatusBadge = (orderOrStatus: any) => {
    let statusStr = '';
    if (typeof orderOrStatus === 'string') {
      statusStr = orderOrStatus;
    } else if (orderOrStatus && typeof orderOrStatus === 'object') {
      const primarySo = orderOrStatus.sellerOrders?.[0];
      statusStr = primarySo?.status || orderOrStatus.status || 'PENDING_CONFIRMATION';
    }

    const s = (statusStr || '').toUpperCase();

    if (s === 'CANCELLED') {
      return {
        text: 'Đã hủy',
        icon: 'cancel',
        className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
      };
    }
    if (s === 'COMPLETED' || s === 'DELIVERED') {
      return {
        text: 'Đã hoàn tất',
        icon: 'check_circle',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
      };
    }
    if (s === 'SHIPPED') {
      return {
        text: 'Đang vận chuyển',
        icon: 'local_shipping',
        className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900',
      };
    }
    if (s === 'CONFIRMED' || s === 'PREPARING' || s === 'PROCESSING') {
      return {
        text: 'Đang chuẩn bị hàng',
        icon: 'inventory_2',
        className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
      };
    }
    if (s === 'PENDING_PAYMENT') {
      return {
        text: 'Chờ thanh toán',
        icon: 'pending',
        className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
      };
    }
    // Default: PENDING_CONFIRMATION / PENDING
    return {
      text: 'Chờ xác nhận',
      icon: 'hourglass_top',
      className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    };
  };

  // Filter Orders based on activeTab and searchQuery
  const filteredOrders = useMemo(() => {
    return orders.filter((ord: any) => {
      // 1. Search Query Filter
      const search = searchQuery.toLowerCase().trim();
      const matchCode = ord.code?.toLowerCase().includes(search);
      const matchItems = ord.sellerOrders?.some((so: any) =>
        so.items?.some((it: any) => (it.bookTitle || it.title)?.toLowerCase().includes(search))
      );
      if (search && !matchCode && !matchItems) {
        return false;
      }

      // 2. Status Tab Filter
      if (activeTab === 'ALL') return true;
      const effectiveStatus = (ord.sellerOrders?.[0]?.status || ord.status || '').toUpperCase();

      if (activeTab === 'PENDING') {
        return (
          effectiveStatus === 'PENDING_CONFIRMATION' ||
          effectiveStatus === 'PENDING_PAYMENT' ||
          effectiveStatus === 'PENDING'
        );
      }
      if (activeTab === 'PREPARING') {
        return (
          effectiveStatus === 'CONFIRMED' ||
          effectiveStatus === 'PREPARING' ||
          effectiveStatus === 'PROCESSING'
        );
      }
      if (activeTab === 'SHIPPED') {
        return effectiveStatus === 'SHIPPED';
      }
      if (activeTab === 'COMPLETED') {
        return effectiveStatus === 'COMPLETED' || effectiveStatus === 'DELIVERED';
      }
      if (activeTab === 'CANCELLED') {
        return effectiveStatus === 'CANCELLED';
      }

      return true;
    });
  }, [orders, activeTab, searchQuery]);

  return (
    <div className="w-full min-h-screen flex flex-col font-sans text-on-surface bg-theme-bg py-6 md:py-8">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-medium text-on-surface-variant mb-6">
          <Link href="/" className="hover:text-theme-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">home</span>
            <span>Trang chủ</span>
          </Link>
          <span>/</span>
          <Link href="/profile" className="hover:text-theme-primary transition-colors">
            Tài khoản
          </Link>
          <span>/</span>
          <span className="text-on-surface font-bold">Lịch sử đơn hàng</span>
        </nav>

        {/* Header Title & CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-on-surface tracking-tight">
              Đơn Hàng Của Bạn
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
              Theo dõi tiến trình vận chuyển, kiểm tra biên nhận và quản lý toàn bộ ấn phẩm đã đặt.
            </p>
          </div>
          <Link
            href="/books"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-theme-primary text-white font-bold text-xs hover:bg-theme-primary-hover transition-all shadow-xs w-fit"
          >
            <span className="material-symbols-outlined text-base">shopping_bag</span>
            <span>Khám Phá Sách Mới</span>
          </Link>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="bg-theme-surface rounded-2xl border border-theme-border p-4 mb-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {[
              { id: 'ALL', label: 'Tất cả', icon: 'receipt_long' },
              { id: 'PENDING', label: 'Chờ xác nhận', icon: 'hourglass_top' },
              { id: 'PREPARING', label: 'Đang chuẩn bị', icon: 'inventory_2' },
              { id: 'SHIPPED', label: 'Đang vận chuyển', icon: 'local_shipping' },
              { id: 'COMPLETED', label: 'Đã hoàn tất', icon: 'check_circle' },
              { id: 'CANCELLED', label: 'Đã hủy', icon: 'cancel' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-theme-primary text-white shadow-xs'
                    : 'bg-theme-surface-subtle text-on-surface-variant hover:text-on-surface border border-theme-border'
                }`}
              >
                <span className="material-symbols-outlined text-base">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã đơn hoặc tên sách..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-theme-surface border border-theme-border text-on-surface text-xs placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ORDER LIST CONTENT */}
        {isLoading ? (
          /* Loading Skeleton */
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-theme-surface rounded-2xl border border-theme-border p-6 shadow-2xs">
                <div className="flex justify-between items-center pb-4 border-b border-theme-border mb-4">
                  <div className="h-4 bg-theme-surface-subtle rounded w-40"></div>
                  <div className="h-6 bg-theme-surface-subtle rounded-full w-28"></div>
                </div>
                <div className="flex gap-4">
                  <div className="w-16 h-20 bg-theme-surface-subtle rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-theme-surface-subtle rounded w-3/4"></div>
                    <div className="h-3 bg-theme-surface-subtle rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          /* Empty State */
          <div className="bg-theme-surface rounded-3xl border border-theme-border p-12 sm:p-16 text-center shadow-xs">
            <div className="w-16 h-16 rounded-full bg-theme-primary/10 text-theme-primary flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">receipt_long</span>
            </div>
            <h3 className="font-editorial text-xl font-bold text-on-surface mb-2">
              {searchQuery || activeTab !== 'ALL'
                ? 'Không Tìm Thấy Đơn Hàng Phù Hợp'
                : 'Bạn Chưa Có Đơn Hàng Nào'}
            </h3>
            <p className="text-xs text-on-surface-variant max-w-md mx-auto mb-6">
              {searchQuery || activeTab !== 'ALL'
                ? 'Hãy thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm để tra cứu lại.'
                : 'Khám phá hàng ngàn tựa sách hay bản quyền trên HUKI Ebook và đặt mua ngay hôm nay.'}
            </p>
            <Link
              href="/books"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-theme-primary text-white font-bold text-xs hover:bg-theme-primary-hover transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-base">explore</span>
              <span>Khám Phá Sách Ngay</span>
            </Link>
          </div>
        ) : (
          /* Orders Cards List */
          <div className="space-y-4">
            {filteredOrders.map((ord: any) => {
              const badge = getStatusBadge(ord);
              const totalItems =
                ord.sellerOrders?.reduce((sum: number, so: any) => sum + (so.items?.length || 0), 0) || 0;

              return (
                <div
                  key={ord.id}
                  className="bg-theme-surface rounded-2xl border border-theme-border shadow-2xs hover:shadow-xs transition-all overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-4 sm:p-5 bg-theme-surface-subtle/50 border-b border-theme-border flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-xs font-bold text-on-surface bg-theme-surface px-2.5 py-1 rounded-lg border border-theme-border">
                        #{ord.code}
                      </span>
                      <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">calendar_today</span>
                        {new Date(ord.createdAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.className}`}
                      >
                        <span className="material-symbols-outlined text-xs">{badge.icon}</span>
                        <span>{badge.text}</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Body: Items List */}
                  <div className="p-4 sm:p-5 divide-y divide-theme-border/60">
                    {ord.sellerOrders?.flatMap((so: any) =>
                      (so.items || []).map((item: any) => (
                        <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-4">
                          {/* Book Cover */}
                          <div className="w-14 h-18 sm:w-16 sm:h-20 rounded-lg bg-theme-surface-subtle border border-theme-border overflow-hidden shrink-0 flex items-center justify-center">
                            {item.bookCoverUrl || item.coverUrl ? (
                              <img
                                src={item.bookCoverUrl || item.coverUrl}
                                alt={item.bookTitle}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="material-symbols-outlined text-2xl text-theme-primary/40">
                                auto_stories
                              </span>
                            )}
                          </div>

                          {/* Book Information */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-editorial text-xs sm:text-sm font-bold text-on-surface truncate">
                              {item.bookTitle}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-theme-surface-subtle text-on-surface-variant border border-theme-border">
                                {item.format === 'DIGITAL' ? 'Sách Điện Tử (Ebook)' : 'Sách In Bìa Cứng'}
                              </span>
                              <span className="text-xs text-on-surface-variant">
                                SL: <b className="text-on-surface">{item.quantity}</b>
                              </span>
                            </div>
                          </div>

                          {/* Item Price */}
                          <div className="text-right shrink-0">
                            <div className="font-bold text-xs sm:text-sm text-theme-primary">
                              {Number(item.subtotal || item.unitPrice * item.quantity).toLocaleString(
                                'vi-VN'
                              )}
                              đ
                            </div>
                            {item.quantity > 1 && (
                              <div className="text-[10px] text-on-surface-variant">
                                {Number(item.unitPrice).toLocaleString('vi-VN')}đ/cuốn
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Card Footer: Summary & CTA */}
                  <div className="p-4 sm:p-5 bg-theme-surface-subtle/30 border-t border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-on-surface-variant">
                        Tổng thanh toán ({totalItems} món):
                      </span>
                      <span className="font-bold text-base text-theme-primary">
                        {Number(ord.grandTotal).toLocaleString('vi-VN')}đ
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium">
                        {ord.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : ord.paymentMethod}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Link
                        href="/books"
                        className="px-4 py-2 rounded-xl bg-theme-surface hover:bg-theme-bg border border-theme-border text-on-surface text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                      >
                        Mua Lại
                      </Link>
                      <Link
                        href={`/orders/${ord.id}`}
                        className="px-4 py-2 rounded-xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary-hover transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Chi Tiết & Tiến Trình</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {paginationMeta.totalPages > 1 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-theme-surface border border-theme-border text-xs text-on-surface-variant">
            <div>
              Hiển thị <b className="text-on-surface">{filteredOrders.length}</b> trên tổng số{' '}
              <b className="text-on-surface">{paginationMeta.total}</b> đơn hàng
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-bg disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all"
              >
                Trước
              </button>

              <span className="px-3 py-1.5 rounded-lg bg-theme-primary text-white font-bold">
                {currentPage} / {paginationMeta.totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(paginationMeta.totalPages, p + 1))}
                disabled={currentPage >= paginationMeta.totalPages}
                className="px-3 py-1.5 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-bg disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
